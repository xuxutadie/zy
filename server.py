from __future__ import annotations

import hashlib
import hmac
import csv
import io
import json
import mimetypes
import os
import secrets
import sqlite3
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT_DIR = Path(__file__).resolve().parent
WEB_DIR = ROOT_DIR / "web"
SERVER_DIR = ROOT_DIR / "server"
DB_PATH = SERVER_DIR / "app.db"
SMS_CONFIG_PATH = SERVER_DIR / "sms_config.json"
HOST = "127.0.0.1"
PORT = 8787
SESSION_DAYS = 7
CODE_TTL_SECONDS = 10 * 60
ADMIN_PHONES = {phone.strip() for phone in os.environ.get("GYZK_ADMIN_PHONES", "").split(",") if phone.strip()}


def now_ts() -> int:
    return int(time.time())


def init_db() -> None:
    SERVER_DIR.mkdir(exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              phone TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              password_salt TEXT NOT NULL,
              created_at INTEGER NOT NULL,
              last_login_at INTEGER
            )
            """,
        )
        ensure_column(conn, "users", "role", "TEXT NOT NULL DEFAULT 'parent'")
        ensure_column(conn, "users", "status", "TEXT NOT NULL DEFAULT 'active'")
        ensure_column(conn, "users", "updated_at", "INTEGER")
        for phone in ADMIN_PHONES:
            conn.execute("UPDATE users SET role = 'admin', status = 'active', updated_at = ? WHERE phone = ?", (now_ts(), phone))
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sms_codes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              phone TEXT NOT NULL,
              code_hash TEXT NOT NULL,
              code_salt TEXT NOT NULL,
              expires_at INTEGER NOT NULL,
              used_at INTEGER,
              created_at INTEGER NOT NULL,
              send_ip TEXT
            )
            """,
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sms_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              phone TEXT NOT NULL,
              provider TEXT NOT NULL,
              template_id TEXT,
              success INTEGER NOT NULL DEFAULT 0,
              response_text TEXT,
              error_message TEXT,
              created_at INTEGER NOT NULL,
              client_ip TEXT
            )
            """,
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY,
              user_id INTEGER NOT NULL,
              expires_at INTEGER NOT NULL,
              created_at INTEGER NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """,
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS calculator_submissions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              phone TEXT NOT NULL,
              score REAL NOT NULL,
              region TEXT,
              middle_school TEXT,
              city_rank INTEGER,
              area_rank INTEGER,
              estimated_area_rank INTEGER,
              quota_rank INTEGER,
              has_quota INTEGER NOT NULL DEFAULT 0,
              accept_private INTEGER NOT NULL DEFAULT 0,
              non_score_subjects_json TEXT NOT NULL,
              subject_eligibility_json TEXT NOT NULL,
              result_summary_json TEXT NOT NULL,
              created_at INTEGER NOT NULL,
              client_ip TEXT,
              FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """,
        )
        ensure_column(conn, "calculator_submissions", "follow_status", "TEXT NOT NULL DEFAULT '未联系'")
        ensure_column(conn, "calculator_submissions", "admin_note", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "calculator_submissions", "updated_at", "INTEGER")
        ensure_column(conn, "calculator_submissions", "last_contact_at", "INTEGER")
        ensure_column(conn, "calculator_submissions", "deleted_at", "INTEGER")
        ensure_column(conn, "calculator_submissions", "deleted_by", "INTEGER")
        ensure_column(conn, "calculator_submissions", "delete_reason", "TEXT NOT NULL DEFAULT ''")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS submission_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              submission_id INTEGER NOT NULL,
              admin_user_id INTEGER NOT NULL,
              event_type TEXT NOT NULL,
              before_json TEXT NOT NULL DEFAULT '{}',
              after_json TEXT NOT NULL DEFAULT '{}',
              created_at INTEGER NOT NULL,
              FOREIGN KEY(submission_id) REFERENCES calculator_submissions(id),
              FOREIGN KEY(admin_user_id) REFERENCES users(id)
            )
            """,
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER,
              phone TEXT,
              action TEXT NOT NULL,
              detail_json TEXT NOT NULL DEFAULT '{}',
              created_at INTEGER NOT NULL,
              client_ip TEXT
            )
            """,
        )
        conn.commit()


def ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    if column not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def csv_response(handler: BaseHTTPRequestHandler, filename: str, content: str) -> None:
    body = content.encode("utf-8-sig")
    handler.send_response(200)
    handler.send_header("Content-Type", "text/csv; charset=utf-8")
    handler.send_header("Content-Disposition", f'attachment; filename="{filename}"')
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_json(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length") or "0")
    if length <= 0:
        return {}
    raw = handler.rfile.read(length)
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return {}


def load_sms_config() -> dict:
    default_config = {
        "enabled": False,
        "provider": "spug",
        "template_id": "",
        "ttl_minutes": 10,
        "base_url": "https://push.spug.cc/send",
        "timeout_seconds": 8,
    }
    if not SMS_CONFIG_PATH.exists():
        return default_config
    try:
        with SMS_CONFIG_PATH.open("r", encoding="utf-8") as file:
            custom_config = json.load(file)
    except (OSError, json.JSONDecodeError):
        return default_config
    return {**default_config, **custom_config}


def send_sms_code(phone: str, code: str) -> tuple[bool, str]:
    config = load_sms_config()
    if not config.get("enabled"):
        print(f"[验证码测试] 手机号 {phone} 的验证码是 {code}，10 分钟内有效。")
        return True, "验证码已生成。当前为本地测试模式。"
    if config.get("provider") != "spug":
        return False, "短信服务商配置不支持"
    template_id = str(config.get("template_id") or "").strip()
    if not template_id:
        return False, "短信模板编码未配置"

    url = f"{str(config.get('base_url')).rstrip('/')}/{template_id}"
    timeout = int(config.get("timeout_seconds") or 8)
    body = json.dumps({"code": code, "targets": phone}, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            response_text = response.read().decode("utf-8", errors="replace")
            if response.status >= 400:
                return False, f"短信平台返回异常：{response.status}"
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        print(f"[短信发送失败] HTTP {error.code}: {detail}", flush=True)
        return False, "短信发送失败，请稍后再试"
    except urllib.error.URLError as error:
        print(f"[短信发送失败] {error}", flush=True)
        return False, "短信服务暂时不可用，请稍后再试"
    except TimeoutError:
        return False, "短信发送超时，请稍后再试"

    print(f"[短信发送响应] 手机号 {phone}，平台响应：{response_text[:300]}", flush=True)
    return True, "验证码已发送，请查收短信"


def normalize_phone(phone: str) -> str:
    return "".join(ch for ch in str(phone or "") if ch.isdigit())


def validate_phone(phone: str) -> bool:
    return len(phone) == 11 and phone.startswith("1")


def hash_secret(value: str, salt: str) -> str:
    digest = hashlib.pbkdf2_hmac("sha256", value.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return digest.hex()


def make_password(password: str) -> tuple[str, str]:
    salt = secrets.token_hex(16)
    return hash_secret(password, salt), salt


def verify_hash(value: str, expected_hash: str, salt: str) -> bool:
    return hmac.compare_digest(hash_secret(value, salt), expected_hash)


def get_bearer_token(handler: BaseHTTPRequestHandler) -> str:
    auth = handler.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    query_token = (parse_qs(urlparse(handler.path).query).get("token") or [""])[0].strip()
    if query_token:
        return query_token
    return ""


def current_user(handler: BaseHTTPRequestHandler) -> sqlite3.Row | None:
    token = get_bearer_token(handler)
    if not token:
        return None
    with db() as conn:
        row = conn.execute(
            """
            SELECT users.id, users.phone, users.created_at, users.last_login_at
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ? AND sessions.expires_at > ?
            """,
            (token, now_ts()),
        ).fetchone()
    return row


def require_user(handler: BaseHTTPRequestHandler) -> sqlite3.Row | None:
    user = current_user(handler)
    if not user:
        json_response(handler, 401, {"ok": False, "message": "请先登录"})
    return user


def is_admin_user(user: sqlite3.Row | None) -> bool:
    return bool(user and user["phone"] in ADMIN_PHONES)


def require_admin(handler: BaseHTTPRequestHandler) -> sqlite3.Row | None:
    user = require_user(handler)
    if not user:
        return None
    if not is_admin_user(user):
        json_response(handler, 403, {"ok": False, "message": "无管理员权限"})
        return None
    return user


def user_payload(user: sqlite3.Row) -> dict:
    return {
        "id": user["id"],
        "phone": user["phone"],
        "maskedPhone": f"{user['phone'][:3]}****{user['phone'][-4:]}",
        "role": "admin" if is_admin_user(user) else "parent",
        "isAdmin": is_admin_user(user),
    }


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = now_ts() + SESSION_DAYS * 24 * 60 * 60
    with db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
            (token, user_id, expires_at, now_ts()),
        )
        conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now_ts(), user_id))
        conn.commit()
    return token


def handle_send_code(handler: BaseHTTPRequestHandler) -> None:
    payload = read_json(handler)
    phone = normalize_phone(payload.get("phone", ""))
    if not validate_phone(phone):
        json_response(handler, 400, {"ok": False, "message": "请输入正确的 11 位手机号"})
        return

    code = f"{secrets.randbelow(1_000_000):06d}"
    salt = secrets.token_hex(12)
    with db() as conn:
        recent_count = conn.execute(
            "SELECT COUNT(*) FROM sms_codes WHERE phone = ? AND created_at > ?",
            (phone, now_ts() - 60),
        ).fetchone()[0]
        if recent_count >= 1:
            json_response(handler, 429, {"ok": False, "message": "验证码发送太频繁，请稍后再试"})
            return

    sent, message = send_sms_code(phone, code)
    record_sms_log(handler, phone, sent, message)
    if not sent:
        json_response(handler, 502, {"ok": False, "message": message})
        return

    with db() as conn:
        conn.execute(
            """
            INSERT INTO sms_codes (phone, code_hash, code_salt, expires_at, created_at, send_ip)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                phone,
                hash_secret(code, salt),
                salt,
                now_ts() + CODE_TTL_SECONDS,
                now_ts(),
                handler.client_address[0],
            ),
        )
        conn.commit()

    config = load_sms_config()
    response_payload = {"ok": True, "message": message}
    if not config.get("enabled"):
        response_payload["devCode"] = code
    json_response(handler, 200, response_payload)


def verify_code(conn: sqlite3.Connection, phone: str, code: str) -> tuple[bool, str]:
    row = conn.execute(
        """
        SELECT id, code_hash, code_salt, expires_at, used_at
        FROM sms_codes
        WHERE phone = ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (phone,),
    ).fetchone()
    if not row:
        return False, "请先获取验证码"
    if row["used_at"]:
        return False, "验证码已使用，请重新获取"
    if row["expires_at"] < now_ts():
        return False, "验证码已过期，请重新获取"
    if not verify_hash(code, row["code_hash"], row["code_salt"]):
        return False, "验证码不正确"
    conn.execute("UPDATE sms_codes SET used_at = ? WHERE id = ?", (now_ts(), row["id"]))
    return True, ""


def handle_register(handler: BaseHTTPRequestHandler) -> None:
    payload = read_json(handler)
    phone = normalize_phone(payload.get("phone", ""))
    code = str(payload.get("code", "")).strip()
    password = str(payload.get("password", ""))
    if not validate_phone(phone):
        json_response(handler, 400, {"ok": False, "message": "请输入正确的 11 位手机号"})
        return
    if len(code) != 6 or not code.isdigit():
        json_response(handler, 400, {"ok": False, "message": "请输入 6 位验证码"})
        return
    if len(password) < 8:
        json_response(handler, 400, {"ok": False, "message": "密码至少 8 位"})
        return

    with db() as conn:
        existed = conn.execute("SELECT id FROM users WHERE phone = ?", (phone,)).fetchone()
        if existed:
            json_response(handler, 409, {"ok": False, "message": "该手机号已注册，请直接登录"})
            return
        ok, message = verify_code(conn, phone, code)
        if not ok:
            json_response(handler, 400, {"ok": False, "message": message})
            return
        password_hash, password_salt = make_password(password)
        cursor = conn.execute(
            """
            INSERT INTO users (phone, password_hash, password_salt, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (phone, password_hash, password_salt, now_ts()),
        )
        conn.commit()
        user_id = int(cursor.lastrowid)

    token = create_session(user_id)
    with db() as conn:
        user = conn.execute("SELECT id, phone, created_at, last_login_at FROM users WHERE id = ?", (user_id,)).fetchone()
    json_response(handler, 200, {"ok": True, "message": "注册成功", "token": token, "user": user_payload(user)})


def handle_login(handler: BaseHTTPRequestHandler) -> None:
    payload = read_json(handler)
    phone = normalize_phone(payload.get("phone", ""))
    password = str(payload.get("password", ""))
    if not validate_phone(phone) or not password:
        json_response(handler, 400, {"ok": False, "message": "请输入手机号和密码"})
        return

    with db() as conn:
        user = conn.execute("SELECT * FROM users WHERE phone = ?", (phone,)).fetchone()
    if not user or not verify_hash(password, user["password_hash"], user["password_salt"]):
        json_response(handler, 401, {"ok": False, "message": "手机号或密码错误"})
        return

    token = create_session(int(user["id"]))
    with db() as conn:
        safe_user = conn.execute(
            "SELECT id, phone, created_at, last_login_at FROM users WHERE id = ?",
            (user["id"],),
        ).fetchone()
    json_response(handler, 200, {"ok": True, "message": "登录成功", "token": token, "user": user_payload(safe_user)})


def handle_logout(handler: BaseHTTPRequestHandler) -> None:
    token = get_bearer_token(handler)
    if token:
        with db() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
    json_response(handler, 200, {"ok": True, "message": "已退出登录"})


def handle_me(handler: BaseHTTPRequestHandler) -> None:
    user = require_user(handler)
    if user:
        json_response(handler, 200, {"ok": True, "user": user_payload(user)})


def int_or_none(value) -> int | None:
    try:
        if value in ("", None):
            return None
        return int(float(value))
    except (TypeError, ValueError):
        return None


def float_or_zero(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def compact_json(value) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False, separators=(",", ":"))


def record_sms_log(handler: BaseHTTPRequestHandler, phone: str, success: bool, message: str) -> None:
    config = load_sms_config()
    with db() as conn:
        conn.execute(
            """
            INSERT INTO sms_logs (phone, provider, template_id, success, response_text, error_message, created_at, client_ip)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                phone,
                str(config.get("provider") or ""),
                str(config.get("template_id") or ""),
                1 if success else 0,
                message if success else "",
                "" if success else message,
                now_ts(),
                handler.client_address[0],
            ),
        )
        conn.commit()


def parse_json_object(value: str) -> dict:
    try:
        parsed = json.loads(value or "{}")
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def parse_query_filters(handler: BaseHTTPRequestHandler) -> tuple[str, list]:
    query = parse_qs(urlparse(handler.path).query)
    where = ["deleted_at IS NULL"]
    params = []
    phone = normalize_phone((query.get("phone") or [""])[0])
    if phone:
        where.append("phone LIKE ?")
        params.append(f"%{phone}%")
    region = (query.get("region") or [""])[0].strip()
    if region:
        where.append("region = ?")
        params.append(region)
    middle_school = (query.get("middleSchool") or [""])[0].strip()
    if middle_school:
        where.append("middle_school LIKE ?")
        params.append(f"%{middle_school}%")
    follow_status = (query.get("followStatus") or [""])[0].strip()
    if follow_status:
        where.append("follow_status = ?")
        params.append(follow_status)
    score_min = int_or_none((query.get("scoreMin") or [""])[0])
    if score_min is not None:
        where.append("score >= ?")
        params.append(score_min)
    score_max = int_or_none((query.get("scoreMax") or [""])[0])
    if score_max is not None:
        where.append("score <= ?")
        params.append(score_max)
    where_sql = " WHERE " + " AND ".join(where) if where else ""
    return where_sql, params


def audit_log(conn: sqlite3.Connection, user: sqlite3.Row | None, action: str, detail: dict, handler: BaseHTTPRequestHandler) -> None:
    conn.execute(
        """
        INSERT INTO audit_logs (user_id, phone, action, detail_json, created_at, client_ip)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            user["id"] if user else None,
            user["phone"] if user else None,
            action,
            compact_json(detail),
            now_ts(),
            handler.client_address[0],
        ),
    )


def submission_payload(row: sqlite3.Row, include_detail: bool = False) -> dict:
    result_summary = parse_json_object(row["result_summary_json"])
    item = {
        "id": row["id"],
        "phone": row["phone"],
        "maskedPhone": f"{row['phone'][:3]}****{row['phone'][-4:]}",
        "score": row["score"],
        "region": row["region"],
        "middleSchool": row["middle_school"],
        "rank": row["city_rank"],
        "areaRank": row["area_rank"],
        "estimatedAreaRank": row["estimated_area_rank"],
        "quotaRank": row["quota_rank"],
        "hasQuota": bool(row["has_quota"]),
        "acceptPrivate": bool(row["accept_private"]),
        "followStatus": row["follow_status"],
        "adminNote": row["admin_note"],
        "resultSummary": result_summary,
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "lastContactAt": row["last_contact_at"],
    }
    if include_detail:
        item["nonScoreSubjects"] = parse_json_object(row["non_score_subjects_json"])
        item["subjectEligibility"] = parse_json_object(row["subject_eligibility_json"])
    return item


def normalize_follow_status(value: str) -> str:
    raw = str(value or "").strip()
    aliases = {
        "pending": "未联系",
        "contacted": "已联系",
        "reserved": "已预约",
        "converted": "已成交",
        "invalid": "无效",
    }
    if raw in aliases:
        return aliases[raw]
    allowed_status = {"未联系", "已联系", "已预约", "已成交", "无效"}
    return raw if raw in allowed_status else ""


def handle_create_calculator_submission(handler: BaseHTTPRequestHandler) -> None:
    user = require_user(handler)
    if not user:
        return
    payload = read_json(handler)
    form = payload.get("form") if isinstance(payload.get("form"), dict) else {}
    result_summary = payload.get("resultSummary") if isinstance(payload.get("resultSummary"), dict) else {}
    non_score_subjects = form.get("nonScoreSubjects") if isinstance(form.get("nonScoreSubjects"), dict) else {}
    subject_eligibility = form.get("subjectEligibility") if isinstance(form.get("subjectEligibility"), dict) else {}
    score = float_or_zero(form.get("score"))

    if score <= 0:
        json_response(handler, 400, {"ok": False, "message": "请先填写有效中考总分"})
        return

    with db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO calculator_submissions (
              user_id, phone, score, region, middle_school, city_rank, area_rank,
              estimated_area_rank, quota_rank, has_quota, accept_private,
              non_score_subjects_json, subject_eligibility_json, result_summary_json,
              created_at, client_ip
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user["id"],
                user["phone"],
                score,
                str(form.get("region") or ""),
                str(form.get("middleSchool") or ""),
                int_or_none(form.get("rank")),
                int_or_none(form.get("areaRank")),
                int_or_none(form.get("estimatedAreaRank")),
                int_or_none(form.get("quotaRank")),
                1 if form.get("hasQuota") else 0,
                1 if form.get("acceptPrivate") else 0,
                compact_json(non_score_subjects),
                compact_json(subject_eligibility),
                compact_json(result_summary),
                now_ts(),
                handler.client_address[0],
            ),
        )
        conn.commit()
        submission_id = int(cursor.lastrowid)

    json_response(handler, 200, {"ok": True, "message": "测算表单已保存", "id": submission_id})


def handle_list_calculator_submissions(handler: BaseHTTPRequestHandler) -> None:
    user = require_admin(handler)
    if not user:
        return
    parsed = urlparse(handler.path)
    query = parse_qs(parsed.query)
    limit = int_or_none((query.get("limit") or ["50"])[0]) or 50
    limit = max(1, min(limit, 200))
    where_sql, params = parse_query_filters(handler)
    with db() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM calculator_submissions{where_sql}", params).fetchone()[0]
        rows = conn.execute(
            f"""
            SELECT id, phone, score, region, middle_school, city_rank, area_rank,
              estimated_area_rank, quota_rank, has_quota, accept_private,
              non_score_subjects_json, subject_eligibility_json, result_summary_json,
              follow_status, admin_note, updated_at, last_contact_at, created_at
            FROM calculator_submissions
            {where_sql}
            ORDER BY id DESC
            LIMIT ?
            """,
            (*params, limit),
        ).fetchall()
        audit_log(conn, user, "list_submissions", {"total": total}, handler)
        conn.commit()

    items = [submission_payload(row) for row in rows]
    json_response(handler, 200, {"ok": True, "items": items, "total": total})


def handle_get_calculator_submission(handler: BaseHTTPRequestHandler) -> None:
    user = require_admin(handler)
    if not user:
        return
    query = parse_qs(urlparse(handler.path).query)
    submission_id = int_or_none((query.get("id") or [""])[0])
    if not submission_id:
        json_response(handler, 400, {"ok": False, "message": "缺少记录 ID"})
        return
    with db() as conn:
        row = conn.execute(
            """
            SELECT id, phone, score, region, middle_school, city_rank, area_rank,
              estimated_area_rank, quota_rank, has_quota, accept_private,
              non_score_subjects_json, subject_eligibility_json, result_summary_json,
              follow_status, admin_note, updated_at, last_contact_at, created_at
            FROM calculator_submissions
            WHERE id = ? AND deleted_at IS NULL
            """,
            (submission_id,),
        ).fetchone()
        if not row:
            json_response(handler, 404, {"ok": False, "message": "记录不存在"})
            return
        audit_log(conn, user, "view_submission", {"submissionId": submission_id}, handler)
        conn.commit()
    json_response(handler, 200, {"ok": True, "item": submission_payload(row, include_detail=True)})


def handle_update_calculator_submission(handler: BaseHTTPRequestHandler) -> None:
    user = require_admin(handler)
    if not user:
        return
    payload = read_json(handler)
    submission_id = int_or_none(payload.get("id"))
    follow_status = normalize_follow_status(payload.get("followStatus"))
    admin_note = str(payload.get("adminNote") or "").strip()
    if not submission_id:
        json_response(handler, 400, {"ok": False, "message": "缺少记录 ID"})
        return
    if not follow_status:
        json_response(handler, 400, {"ok": False, "message": "跟进状态不正确"})
        return
    with db() as conn:
        before = conn.execute(
            "SELECT id, follow_status, admin_note FROM calculator_submissions WHERE id = ? AND deleted_at IS NULL",
            (submission_id,),
        ).fetchone()
        if not before:
            json_response(handler, 404, {"ok": False, "message": "记录不存在"})
            return
        last_contact_at = now_ts() if follow_status in {"已联系", "已预约", "已成交"} else None
        conn.execute(
            """
            UPDATE calculator_submissions
            SET follow_status = ?, admin_note = ?, updated_at = ?, last_contact_at = COALESCE(?, last_contact_at)
            WHERE id = ?
            """,
            (follow_status, admin_note, now_ts(), last_contact_at, submission_id),
        )
        conn.execute(
            """
            INSERT INTO submission_events (submission_id, admin_user_id, event_type, before_json, after_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                submission_id,
                user["id"],
                "update_follow",
                compact_json({"followStatus": before["follow_status"], "adminNote": before["admin_note"]}),
                compact_json({"followStatus": follow_status, "adminNote": admin_note}),
                now_ts(),
            ),
        )
        audit_log(conn, user, "update_submission", {"submissionId": submission_id, "followStatus": follow_status}, handler)
        conn.commit()
    json_response(handler, 200, {"ok": True, "message": "已保存跟进信息"})


def handle_delete_calculator_submission(handler: BaseHTTPRequestHandler) -> None:
    user = require_admin(handler)
    if not user:
        return
    payload = read_json(handler)
    submission_id = int_or_none(payload.get("id"))
    delete_reason = str(payload.get("reason") or "").strip()[:200]
    if not submission_id:
        json_response(handler, 400, {"ok": False, "message": "缺少记录 ID"})
        return

    with db() as conn:
        before = conn.execute(
            """
            SELECT id, phone, score, region, middle_school, follow_status, admin_note
            FROM calculator_submissions
            WHERE id = ? AND deleted_at IS NULL
            """,
            (submission_id,),
        ).fetchone()
        if not before:
            json_response(handler, 404, {"ok": False, "message": "记录不存在或已删除"})
            return
        deleted_at = now_ts()
        conn.execute(
            """
            UPDATE calculator_submissions
            SET deleted_at = ?, deleted_by = ?, delete_reason = ?, updated_at = ?
            WHERE id = ? AND deleted_at IS NULL
            """,
            (deleted_at, user["id"], delete_reason, deleted_at, submission_id),
        )
        conn.execute(
            """
            INSERT INTO submission_events (submission_id, admin_user_id, event_type, before_json, after_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                submission_id,
                user["id"],
                "delete_submission",
                compact_json(dict(before)),
                compact_json({"deletedAt": deleted_at, "deletedBy": user["id"], "reason": delete_reason}),
                deleted_at,
            ),
        )
        audit_log(conn, user, "delete_submission", {"submissionId": submission_id, "reason": delete_reason}, handler)
        conn.commit()
    json_response(handler, 200, {"ok": True, "message": "记录已删除"})


def handle_export_calculator_submissions(handler: BaseHTTPRequestHandler) -> None:
    user = require_admin(handler)
    if not user:
        return
    where_sql, params = parse_query_filters(handler)
    with db() as conn:
        rows = conn.execute(
            f"""
            SELECT id, phone, score, region, middle_school, city_rank, area_rank,
              estimated_area_rank, quota_rank, has_quota, accept_private,
              follow_status, admin_note, created_at
            FROM calculator_submissions
            {where_sql}
            ORDER BY id DESC
            LIMIT 1000
            """,
            params,
        ).fetchall()
        audit_log(conn, user, "export_submissions", {"count": len(rows)}, handler)
        conn.commit()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "提交时间", "手机号", "分数", "区域", "毕业初中", "全市位次", "区域位次", "配额排位", "具备配额资格", "接受民办", "跟进状态", "管理员备注"])
    for row in rows:
        writer.writerow(
            [
                row["id"],
                time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(row["created_at"])),
                row["phone"],
                row["score"],
                row["region"],
                row["middle_school"],
                row["city_rank"],
                row["area_rank"] or row["estimated_area_rank"],
                row["quota_rank"],
                "是" if row["has_quota"] else "否",
                "是" if row["accept_private"] else "否",
                row["follow_status"],
                row["admin_note"],
            ],
        )
    csv_response(handler, f"calculator_submissions_{now_ts()}.csv", output.getvalue())


class AppHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/auth/me":
            handle_me(self)
            return
        if parsed.path == "/api/admin/calculator-submissions":
            handle_list_calculator_submissions(self)
            return
        if parsed.path == "/api/admin/calculator-submission":
            handle_get_calculator_submission(self)
            return
        if parsed.path == "/api/admin/calculator-submissions/export":
            handle_export_calculator_submissions(self)
            return
        if parsed.path.startswith("/api/"):
            json_response(self, 404, {"ok": False, "message": "接口不存在"})
            return
        self.serve_static(parsed.path)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        routes = {
            "/api/auth/send-code": handle_send_code,
            "/api/auth/register": handle_register,
            "/api/auth/login": handle_login,
            "/api/auth/logout": handle_logout,
            "/api/calculator-submissions": handle_create_calculator_submission,
            "/api/admin/calculator-submission/update": handle_update_calculator_submission,
            "/api/admin/calculator-submission/delete": handle_delete_calculator_submission,
        }
        handler = routes.get(parsed.path)
        if handler:
            handler(self)
        else:
            json_response(self, 404, {"ok": False, "message": "接口不存在"})

    def serve_static(self, path: str) -> None:
        clean_path = path.split("?", 1)[0]
        if clean_path in ("", "/"):
            target = WEB_DIR / "index.html"
        elif clean_path in ("/admin", "/admin/"):
            target = WEB_DIR / "admin.html"
        else:
            target = (WEB_DIR / clean_path.lstrip("/")).resolve()
            if not str(target).startswith(str(WEB_DIR.resolve())):
                self.send_error(403)
                return
            if not target.exists() and not Path(clean_path).suffix:
                target = WEB_DIR / "index.html"
        if not target.exists() or not target.is_file():
            self.send_error(404)
            return
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        if target.suffix in {".html", ".js", ".css"}:
            self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {self.address_string()} {format % args}")


def main() -> None:
    init_db()
    httpd = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"服务已启动：http://{HOST}:{PORT}/")
    print(f"数据库位置：{DB_PATH}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
