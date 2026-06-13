import tempfile
import unittest
from pathlib import Path

import server


class HelpCommunityTests(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.original_db_path = server.DB_PATH
        self.original_backend = server.DB_BACKEND
        self.original_admin_phones = server.ADMIN_PHONES
        server.DB_PATH = Path(self.tmpdir.name) / "test.db"
        server.DB_BACKEND = "sqlite"
        server.ADMIN_PHONES = {"18685442407"}
        server.init_db()

    def tearDown(self):
        server.DB_PATH = self.original_db_path
        server.DB_BACKEND = self.original_backend
        server.ADMIN_PHONES = self.original_admin_phones
        self.tmpdir.cleanup()

    def seed_reply(self):
        now = server.now_ts()
        with server.db() as conn:
            parent_id = server.insert_and_get_id(
                conn,
                """
                INSERT INTO users (phone, password_hash, password_salt, created_at, role, status)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                ("18600000000", "hash", "salt", now, "parent", "active"),
            )
            admin_id = server.insert_and_get_id(
                conn,
                """
                INSERT INTO users (phone, password_hash, password_salt, created_at, role, status)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                ("18685442407", "hash", "salt", now, "admin", "active"),
            )
            post_id = server.insert_and_get_id(
                conn,
                """
                INSERT INTO help_posts (user_id, title, content, anonymous, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (parent_id, "志愿填报怎么选", "想了解统招和配额应该如何排序。", 0, "active", now),
            )
            reply_id = server.insert_and_get_id(
                conn,
                """
                INSERT INTO help_replies (post_id, user_id, content, anonymous, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (post_id, parent_id, "建议先看统招，再看配额风险。", 0, "pending", now),
            )
            conn.commit()
        return parent_id, admin_id, reply_id

    def test_approved_reply_adds_ten_points_once(self):
        parent_id, admin_id, reply_id = self.seed_reply()

        with server.db() as conn:
            first = server.review_help_reply(conn, reply_id, admin_id, "approved")
            second = server.review_help_reply(conn, reply_id, admin_id, "approved")
            balance = server.point_balance(conn, parent_id)
            logs = conn.execute("SELECT points FROM point_logs WHERE source_type = ? AND source_id = ?", ("help_reply", reply_id)).fetchall()

        self.assertEqual(first["pointsAwarded"], 10)
        self.assertEqual(second["pointsAwarded"], 0)
        self.assertEqual(balance, 10)
        self.assertEqual(len(logs), 1)

    def test_rejected_reply_does_not_add_points(self):
        parent_id, admin_id, reply_id = self.seed_reply()

        with server.db() as conn:
            result = server.review_help_reply(conn, reply_id, admin_id, "rejected")
            balance = server.point_balance(conn, parent_id)

        self.assertEqual(result["pointsAwarded"], 0)
        self.assertEqual(balance, 0)


if __name__ == "__main__":
    unittest.main()
