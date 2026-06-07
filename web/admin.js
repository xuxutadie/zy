const AUTH_TOKEN_KEY = "gyzk_auth_token";

const state = {
  user: null,
  items: [],
  activeItem: null,
};

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function authFetch(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const payload = await response.json().catch(() => ({ ok: false, message: "服务响应异常" }));
  if (!response.ok) throw new Error(payload.message || "请求失败");
  return payload;
}

function isAdmin(user = state.user) {
  return Boolean(user?.isAdmin || user?.role === "admin");
}

function maskPhone(phone) {
  const value = String(phone || "");
  return value.length === 11 ? `${value.slice(0, 3)}****${value.slice(-4)}` : value;
}

function formatDateTime(timestamp) {
  if (!timestamp) return "未记录";
  return new Date(Number(timestamp) * 1000).toLocaleString("zh-CN", { hour12: false });
}

function followStatusCode(label) {
  return {
    未联系: "pending",
    已联系: "contacted",
    已预约: "reserved",
    已成交: "converted",
    无效: "invalid",
  }[label] || "pending";
}

function setMessage(message, type = "") {
  const node = document.querySelector("#adminMessage");
  node.textContent = message;
  node.dataset.type = type;
}

function setAdminVisible(visible) {
  document.querySelector("#adminLoginPanel").hidden = visible;
  document.querySelector("#adminContent").hidden = !visible;
  document.querySelector("#adminActions").hidden = !visible;
  document.querySelector("#adminPhone").textContent = visible ? maskPhone(state.user?.phone) : "";
}

function currentFilters() {
  const params = new URLSearchParams();
  const fields = [
    ["phone", "#filterPhone"],
    ["region", "#filterRegion"],
    ["middleSchool", "#filterMiddleSchool"],
    ["followStatus", "#filterFollowStatus"],
    ["scoreMin", "#filterScoreMin"],
    ["scoreMax", "#filterScoreMax"],
  ];
  fields.forEach(([key, selector]) => {
    const value = document.querySelector(selector)?.value.trim();
    if (value) params.set(key, value);
  });
  params.set("limit", "200");
  return params;
}

async function loadCurrentUser() {
  if (!getAuthToken()) return null;
  try {
    const payload = await authFetch("/api/auth/me");
    return payload.user;
  } catch {
    clearAuthToken();
    return null;
  }
}

async function loginAdmin(event) {
  event.preventDefault();
  const phone = document.querySelector("#adminLoginPhone").value.trim();
  const password = document.querySelector("#adminLoginPassword").value;
  setMessage("正在登录后台...");
  try {
    const payload = await authFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
    if (!isAdmin(payload.user)) {
      clearAuthToken();
      setMessage("该账号不是管理员，不能进入后台。", "error");
      return;
    }
    setAuthToken(payload.token);
    state.user = payload.user;
    setAdminVisible(true);
    await loadSubmissions();
  } catch (error) {
    setMessage(error.message, "error");
  }
}

function renderStats(items) {
  const today = new Date();
  const todayKey = today.toLocaleDateString("zh-CN");
  const todayCount = items.filter((item) => new Date(Number(item.createdAt) * 1000).toLocaleDateString("zh-CN") === todayKey).length;
  const scores = items.map((item) => Number(item.score)).filter(Boolean);
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : "-";
  document.querySelector("#totalCount").textContent = String(state.total ?? items.length);
  document.querySelector("#todayCount").textContent = String(todayCount);
  document.querySelector("#averageScore").textContent = String(average);
}

function renderRows(items) {
  const body = document.querySelector("#submissionRows");
  body.innerHTML = items.length
    ? items
        .map((item) => {
          const topSchools = item.resultSummary?.topSchools || [];
          const summary = topSchools.length
            ? topSchools.slice(0, 3).map((school) => `${school.school} ${school.chance}%`).join(" / ")
            : "暂无推荐摘要";
          return `
            <tr>
              <td>${formatDateTime(item.createdAt)}</td>
              <td>${item.maskedPhone}</td>
              <td>${item.score}</td>
              <td>${item.region || "未填"}</td>
              <td>${item.middleSchool || "未填"}</td>
              <td>${item.rank || "未填"} / ${item.areaRank || item.estimatedAreaRank || "未填"}</td>
              <td>${item.hasQuota ? item.quotaRank || "未填" : "未勾选"}</td>
              <td><span class="status-badge">${item.followStatus || "未联系"}</span></td>
              <td>${summary}</td>
              <td>
                <div class="table-actions">
                  <button class="table-action" type="button" data-detail-id="${item.id}">详情</button>
                  <button class="table-action danger-action" type="button" data-delete-id="${item.id}">删除</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="10">暂无记录</td></tr>`;
  body.querySelectorAll("[data-detail-id]").forEach((button) => {
    button.addEventListener("click", () => openDetail(button.dataset.detailId));
  });
  body.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deleteSubmission(button.dataset.deleteId));
  });
}

async function loadSubmissions() {
  if (!isAdmin()) return;
  const payload = await authFetch(`/api/admin/calculator-submissions?${currentFilters().toString()}`);
  state.items = payload.items || [];
  state.total = payload.total ?? state.items.length;
  renderStats(state.items);
  renderRows(state.items);
}

function renderDetail(item) {
  const subjects = item.nonScoreSubjects || {};
  const eligibility = item.subjectEligibility || {};
  const topSchools = item.resultSummary?.topSchools || [];
  document.querySelector("#detailContent").innerHTML = `
    <div><strong>手机号</strong><span>${item.maskedPhone}</span></div>
    <div><strong>分数</strong><span>${item.score}</span></div>
    <div><strong>区域</strong><span>${item.region || "未填"}</span></div>
    <div><strong>毕业初中</strong><span>${item.middleSchool || "未填"}</span></div>
    <div><strong>全市/区位次</strong><span>${item.rank || "未填"} / ${item.areaRank || item.estimatedAreaRank || "未填"}</span></div>
    <div><strong>配额排位</strong><span>${item.hasQuota ? item.quotaRank || "未填" : "未勾选配额资格"}</span></div>
    <div><strong>非计分科目</strong><span>生物${subjects.biology || "-"}，地理${subjects.geography || "-"}，信息${subjects.informationTechnology || "-"}，音乐${subjects.music || "-"}，美术${subjects.art || "-"}</span></div>
    <div><strong>实验</strong><span>物理${subjects.physicsLab || "-"}，化学${subjects.chemistryLab || "-"}，生物${subjects.biologyLab || "-"}</span></div>
    <div class="wide"><strong>资格判断</strong><span>${eligibility.generalEligible ? "普通高中资格通过" : "普通高中资格存在风险"}；${eligibility.modelHighEligible ? "示范性高中门槛通过" : "示范性高中需核对"}</span></div>
    <div class="wide"><strong>推荐摘要</strong><span>${topSchools.length ? topSchools.map((school) => `${school.school} ${school.chance}%`).join(" / ") : "暂无推荐摘要"}</span></div>
  `;
  document.querySelector("#detailFollowStatus").value = item.followStatus || "未联系";
  document.querySelector("#detailAdminNote").value = item.adminNote || "";
}

async function openDetail(id) {
  try {
    const payload = await authFetch(`/api/admin/calculator-submission?id=${encodeURIComponent(id)}`);
    state.activeItem = payload.item;
    renderDetail(payload.item);
    const dialog = document.querySelector("#detailDialog");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  } catch (error) {
    setMessage(error.message, "error");
  }
}

async function saveDetail() {
  if (!state.activeItem) return;
  try {
    await authFetch("/api/admin/calculator-submission/update", {
      method: "POST",
      body: JSON.stringify({
        id: state.activeItem.id,
        followStatus: followStatusCode(document.querySelector("#detailFollowStatus").value),
        adminNote: document.querySelector("#detailAdminNote").value,
      }),
    });
    setMessage("跟进信息已保存。");
    const dialog = document.querySelector("#detailDialog");
    if (typeof dialog.close === "function") dialog.close();
    await loadSubmissions();
  } catch (error) {
    setMessage(error.message, "error");
  }
}

async function deleteSubmission(id) {
  if (!id) return;
  const confirmed = window.confirm("确认删除这条用户测算表单？删除后后台列表和导出文件将不再显示。");
  if (!confirmed) return;
  try {
    await authFetch("/api/admin/calculator-submission/delete", {
      method: "POST",
      body: JSON.stringify({ id, reason: "管理员后台删除" }),
    });
    setMessage("用户测算表单已删除。");
    await loadSubmissions();
  } catch (error) {
    setMessage(error.message, "error");
  }
}

function exportCsv() {
  const token = getAuthToken();
  const params = currentFilters();
  const url = `/api/admin/calculator-submissions/export?${params.toString()}&token=${encodeURIComponent(token)}`;
  window.open(url, "_blank", "noopener");
}

async function logout() {
  try {
    await authFetch("/api/auth/logout", { method: "POST", body: "{}" });
  } catch {
    // 后台退出以清理浏览器登录态为准。
  }
  clearAuthToken();
  state.user = null;
  state.items = [];
  setAdminVisible(false);
  setMessage("已退出后台。");
}

async function init() {
  document.querySelector("#adminLoginForm").addEventListener("submit", loginAdmin);
  document.querySelector("#filterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    loadSubmissions().catch((error) => setMessage(error.message, "error"));
  });
  document.querySelector("#resetFilterButton").addEventListener("click", () => {
    document.querySelector("#filterForm").reset();
    loadSubmissions().catch((error) => setMessage(error.message, "error"));
  });
  document.querySelector("#refreshButton").addEventListener("click", () => {
    loadSubmissions().catch((error) => setMessage(error.message, "error"));
  });
  document.querySelector("#exportButton").addEventListener("click", exportCsv);
  document.querySelector("#logoutButton").addEventListener("click", logout);
  document.querySelector("#saveDetailButton").addEventListener("click", saveDetail);

  state.user = await loadCurrentUser();
  if (isAdmin()) {
    setAdminVisible(true);
    await loadSubmissions();
  } else {
    setAdminVisible(false);
    if (state.user) setMessage("当前登录账号不是管理员，请使用管理员手机号登录。", "error");
  }
}

init().catch((error) => {
  setAdminVisible(false);
  setMessage(error.message, "error");
});
