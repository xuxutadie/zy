const state = {
  data: null,
  schoolInfo: null,
  educationNews: null,
  competitionEvents: null,
  quotaAllocation: null,
  helpPosts: [],
  helpRules: null,
  helpPointBalance: 0,
  helpRedemptions: [],
  schoolInfoFilters: {},
  currentBand: "稳一稳",
  results: [],
  hasCalculated: false,
  user: null,
  appReady: false,
};

const HOME_PAGE_ID = "home";
const SCHOOL_INFO_PAGE_ID = "school-info";
const bandOrder = ["冲一冲", "稳一稳", "保一保", "谨慎填报"];
const pageIds = [
  HOME_PAGE_ID,
  "calculator",
  "dashboard",
  "schools",
  SCHOOL_INFO_PAGE_ID,
  "primary-schools",
  "junior-schools",
  "high-schools",
  "education-news",
  "training-recommendations",
  "competition-insights",
  "help-community",
];
const examPageIds = ["calculator", "dashboard", "schools"];
const navPageGroups = {
  dashboard: "calculator",
  schools: "calculator",
};
const AUTH_TOKEN_KEY = "gyzk_auth_token";
const OFFICIAL_2026_PLAN_TOTAL = 48029;
const schoolStageRoutes = {
  小学: "primary-schools",
  初中: "junior-schools",
  高中: "high-schools",
};
const schoolInfoPageIds = [SCHOOL_INFO_PAGE_ID, ...Object.values(schoolStageRoutes)];
const featuredSchoolDistricts = ["云岩区", "南明区", "观山湖区"];
const featuredSchoolNames = {
  云岩区: {
    小学: ["贵阳市省府路小学", "贵阳市实验小学", "贵阳市环西小学", "贵阳市第二实验小学", "贵阳中天北京小学"],
    初中: ["贵阳市第十七中学", "贵阳市第十九中学", "贵州师范大学云岩实验中学", "贵阳市云岩区中天中学", "贵阳市第二实验中学"],
  },
  南明区: {
    小学: [
      "贵阳市南明区南明小学",
      "贵阳市南明区甲秀小学",
      "贵阳市南明区尚义路小学",
      { name: "贵阳市南明区华麟学校", displayName: "贵阳市南明区华麟学校（小学部）" },
      { name: "贵阳市南明区苗苗实验学校", displayName: "贵阳市南明区苗苗实验学校（小学部）" },
    ],
    初中: [
      "贵阳市第十八中学",
      "贵阳市南明区华麟学校",
      "贵阳市南明区李端棻中学",
      { name: "贵阳市南明甲秀高级中学", displayName: "贵阳市南明甲秀高级中学（初中部）" },
      { name: "贵州省实验中学", displayName: "贵州省实验中学（初中部）" },
    ],
  },
  观山湖区: {
    小学: [
      "北京师范大学贵阳附属小学",
      { name: "华东师范大学附属贵阳学校", displayName: "华东师范大学附属贵阳学校（小学部）" },
      "贵阳市观山湖区外国语实验小学",
      "观山湖区华润小学",
      "贵阳市第一实验小学",
    ],
    初中: [
      { name: "北京师范大学贵阳附属中学", displayName: "北京师范大学贵阳附属中学（初中部）" },
      "华东师范大学附属贵阳学校",
      "贵阳市第三中学",
      "观山湖区华润中学",
      "贵阳市观山湖区外国语实验中学",
    ],
  },
};
const verifiedSchoolImages = {
  贵阳市第一中学: {
    url: "https://assets.moretouch.com.cn/1/upload/content/2024/04/6614a47aaf571.jpg",
    source: "学校官网公开图片",
  },
  贵州师范大学附属中学: {
    url: "https://jcjyyjy.gznu.edu.cn/__local/F/8D/67/016DB77B13A257BE3525D113229_06A32BC7_3CA85.jpg?e=.jpg",
    source: "学校公开页面",
  },
  贵阳市第十九中学: {
    url: "https://img.phb123.com/uploads/230114/809-2301141I11HL.png",
    source: "公开学校图文页面",
  },
  贵阳市第二实验中学: {
    url: "https://img.phb123.com/uploads/230114/809-2301141H5223Q.png",
    source: "公开学校图文页面",
  },
  贵阳中天中学: {
    url: "https://img.phb123.com/uploads/230114/809-2301141I91EC.png",
    source: "公开学校图文页面",
  },
  贵阳市第三实验中学: {
    url: "https://img.phb123.com/uploads/allimg/221024/812-2210242102200-L.jpg",
    source: "公开学校图文页面",
  },
  贵阳市第十八中学: {
    url: "https://img.phb123.com/uploads/230114/809-2301141HKT04.png",
    source: "公开学校图文页面",
  },
};

function isAdmin() {
  return Boolean(state.user?.isAdmin || state.user?.role === "admin");
}

function getAllowedPageIds() {
  return isAdmin()
    ? pageIds
    : [
        HOME_PAGE_ID,
        "calculator",
        "dashboard",
        "schools",
        SCHOOL_INFO_PAGE_ID,
        "primary-schools",
        "junior-schools",
        "high-schools",
        "education-news",
        "training-recommendations",
        "competition-insights",
        "help-community",
      ];
}

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
  const response = await fetch(url, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => ({ ok: false, message: "服务响应异常" }));
  if (!response.ok) {
    throw new Error(payload.message || "请求失败");
  }
  return payload;
}

function maskPhone(phone) {
  const value = String(phone || "");
  return value.length === 11 ? `${value.slice(0, 3)}****${value.slice(-4)}` : value;
}

function setupAuthUi() {
  if (document.querySelector("#authGate")) return;
  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <section class="auth-gate" id="authGate" aria-live="polite">
        <video class="auth-video-bg" autoplay muted loop playsinline preload="auto" aria-hidden="true">
          <source src="./assets/auth-fpv-bg.mp4" type="video/mp4" />
        </video>
        <div class="auth-video-overlay" aria-hidden="true"></div>
        <div class="auth-shell">
          <aside class="auth-intro" aria-label="系统入口">
            <div>
              <p class="eyebrow">Data Driven Advisory</p>
              <h1 class="auth-title">贵阳新中考志愿<span>填报模拟器</span></h1>
              <p class="auth-slogan">基于贵阳中考公开资料结构化整理，连接学校信息、录取线、招生计划、位次分布和历史参考，为家长提供可解释的升学判断。</p>
            </div>
            <div class="auth-heat-strip" aria-label="平台热度">
              <span>2026 数据已接入</span>
              <span>家长高频测算</span>
              <span>志愿方案热度上升</span>
            </div>
            <div class="auth-data-proof">
              <div><strong>117条</strong><span>2026普通高中及综合高中招生计划，覆盖公办、民办和中外合作项目班</span></div>
              <div><strong>48029人</strong><span>2026官方总计划名额；已结构化明确名额47929人，另有1所学校官方表中显示待定</span></div>
              <div><strong>597条</strong><span>2023-2024历史录取线，用于往年对比和学校热度参考</span></div>
              <div><strong>19975条/行</strong><span>综合结构化数据，含计划、控制线、一分一段表、规则、地址、配额合计和来源索引</span></div>
            </div>
          </aside>
          <div class="auth-card">
            <div class="auth-brand">
              <div>
                <p class="eyebrow">Account Access</p>
                <h2>登录贵阳教育导航</h2>
              </div>
            </div>
          <div class="auth-tabs" role="tablist" aria-label="账号操作">
            <button class="active" type="button" data-auth-mode="login">密码登录</button>
            <button type="button" data-auth-mode="register">手机注册</button>
          </div>
          <form class="auth-form active" id="loginForm">
            <label>
              <span>手机号码</span>
              <input id="loginPhone" type="tel" inputmode="numeric" maxlength="11" autocomplete="tel" placeholder="请输入 11 位手机号..." />
            </label>
            <label>
              <span>登录密码</span>
              <input id="loginPassword" type="password" autocomplete="current-password" placeholder="请输入密码..." />
            </label>
            <button type="submit">登录进入</button>
          </form>
          <form class="auth-form" id="registerForm" hidden>
            <label>
              <span>手机号码</span>
              <input id="registerPhone" type="tel" inputmode="numeric" maxlength="11" autocomplete="tel" placeholder="请输入 11 位手机号..." />
            </label>
            <div class="auth-code-row">
              <label>
                <span>短信验证码</span>
                <input id="registerCode" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6 位验证码..." />
              </label>
              <button class="secondary-action" id="sendCodeButton" type="button">获取验证码</button>
            </div>
            <label>
              <span>设置密码</span>
              <input id="registerPassword" type="password" autocomplete="new-password" placeholder="至少 8 位..." />
            </label>
            <button type="submit">完成注册</button>
          </form>
          <p class="auth-message" id="authMessage"></p>
          </div>
        </div>
      </section>
    `,
  );
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => switchAuthMode(button.dataset.authMode));
  });
  document.querySelector("#sendCodeButton").addEventListener("click", sendRegisterCode);
  document.querySelector("#registerForm").addEventListener("submit", registerWithPhone);
  document.querySelector("#loginForm").addEventListener("submit", loginWithPassword);
}

function switchAuthMode(mode) {
  const isRegister = mode === "register";
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });
  document.querySelector("#loginForm").hidden = isRegister;
  document.querySelector("#loginForm").classList.toggle("active", !isRegister);
  document.querySelector("#registerForm").hidden = !isRegister;
  document.querySelector("#registerForm").classList.toggle("active", isRegister);
  setAuthMessage(isRegister ? "先获取验证码，再设置登录密码。" : "使用手机号和密码登录。");
}

function setAuthMessage(message, type = "") {
  const messageNode = document.querySelector("#authMessage");
  if (!messageNode) return;
  messageNode.textContent = message;
  messageNode.dataset.type = type;
}

function setAuthLoading(isLoading) {
  document.querySelectorAll(".auth-form button").forEach((button) => {
    button.disabled = isLoading;
  });
}

function enterHomeAfterAuth() {
  window.history.replaceState({ page: HOME_PAGE_ID }, "", "?page=home");
  if (state.appReady) {
    setActivePage(HOME_PAGE_ID, { replace: true });
  }
}

async function sendRegisterCode() {
  const phone = document.querySelector("#registerPhone").value.trim();
  setAuthLoading(true);
  try {
    const payload = await authFetch("/api/auth/send-code", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
    const devText = payload.devCode ? ` 测试验证码：${payload.devCode}` : "";
    setAuthMessage(`${payload.message}${devText || "，请在 10 分钟内完成注册。"}`, "success");
  } catch (error) {
    setAuthMessage(error.message, "error");
  } finally {
    setAuthLoading(false);
  }
}

async function registerWithPhone(event) {
  event.preventDefault();
  const phone = document.querySelector("#registerPhone").value.trim();
  const code = document.querySelector("#registerCode").value.trim();
  const password = document.querySelector("#registerPassword").value;
  setAuthLoading(true);
  try {
    const payload = await authFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ phone, code, password }),
    });
    setAuthToken(payload.token);
    state.user = payload.user;
    setAuthMessage("注册成功，正在进入操作台。", "success");
    enterHomeAfterAuth();
    await startApp(HOME_PAGE_ID);
  } catch (error) {
    setAuthMessage(error.message, "error");
  } finally {
    setAuthLoading(false);
  }
}

async function loginWithPassword(event) {
  event.preventDefault();
  const phone = document.querySelector("#loginPhone").value.trim();
  const password = document.querySelector("#loginPassword").value;
  setAuthLoading(true);
  try {
    const payload = await authFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
    setAuthToken(payload.token);
    state.user = payload.user;
    setAuthMessage("登录成功，正在进入操作台。", "success");
    enterHomeAfterAuth();
    await startApp(HOME_PAGE_ID);
  } catch (error) {
    setAuthMessage(error.message, "error");
  } finally {
    setAuthLoading(false);
  }
}

async function loadCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = await authFetch("/api/auth/me");
    return payload.user;
  } catch {
    clearAuthToken();
    return null;
  }
}

function updateAuthVisibility() {
  const isAuthed = Boolean(state.user);
  document.body.classList.toggle("auth-locked", !isAuthed);
  document.body.classList.toggle("is-admin", isAuthed && isAdmin());
  const gate = document.querySelector("#authGate");
  if (gate) gate.hidden = isAuthed;
  document.querySelectorAll('.nav a[data-page="data"]').forEach((link) => {
    link.hidden = !isAdmin();
  });
  const account = document.querySelector("#accountPanel");
  if (account) {
    account.hidden = !isAuthed;
    account.querySelector("[data-account-phone]").textContent = state.user ? maskPhone(state.user.phone) : "";
    const roleNode = account.querySelector("[data-account-role]");
    if (roleNode) roleNode.textContent = isAdmin() ? "管理员" : "家长";
    const adminLink = account.querySelector("[data-admin-link]");
    if (adminLink) adminLink.hidden = !isAdmin();
  }
}

function setupAccountPanel() {
  if (document.querySelector("#accountPanel")) return;
  document.querySelector(".sidebar").insertAdjacentHTML(
    "beforeend",
    `
      <div class="account-panel" id="accountPanel" data-expanded="false" hidden>
        <button class="account-trigger" type="button" id="accountPanelToggle" aria-expanded="false">
          <span data-account-role></span>
          <strong data-account-phone></strong>
        </button>
        <div class="account-actions">
          <a href="/admin" data-admin-link hidden>后台</a>
          <button type="button" id="logoutButton">退出</button>
        </div>
      </div>
    `,
  );
  document.querySelector("#accountPanelToggle").addEventListener("click", () => {
    const panel = document.querySelector("#accountPanel");
    const trigger = document.querySelector("#accountPanelToggle");
    if (!panel || !trigger) return;
    if (document.body.classList.contains("sidebar-collapsed")) {
      document.body.classList.remove("sidebar-collapsed");
      localStorage.setItem("gyedu.sidebarCollapsed", "false");
      document.querySelector("#sidebarCollapseControl")?.setAttribute("aria-expanded", "true");
      document.querySelector("#sidebarCollapseControl")?.setAttribute("aria-label", "进入首页");
    }
    const nextExpanded = panel.dataset.expanded !== "true";
    panel.dataset.expanded = nextExpanded ? "true" : "false";
    trigger.setAttribute("aria-expanded", String(nextExpanded));
  });
  document.querySelector("#logoutButton").addEventListener("click", logout);
}

async function logout() {
  try {
    await authFetch("/api/auth/logout", { method: "POST", body: "{}" });
  } catch {
    // 本地退出以清理浏览器登录态为准，接口失败不阻断用户退出。
  }
  clearAuthToken();
  state.user = null;
  updateAuthVisibility();
}

function getRequestedPage() {
  const requested = new URLSearchParams(window.location.search).get("page");
  const allowedPages = getAllowedPageIds();
  return allowedPages.includes(requested) ? requested : HOME_PAGE_ID;
}

const heroPresets = {
  calculator: {
    mode: "exam",
    title: "贵阳新中考志愿填报模拟器",
    copy: "聚焦2026招生计划、配额路径、位次换算和录取线参考，帮助家长先完成志愿方案模拟，再进入数据核对。",
    stats: [
      ["4324", "个2026配额名额"],
      ["92", "个初中单元"],
      ["1564", "个配额核对单元格"],
    ],
  },
  school: {
    mode: "school",
    title: "贵阳学校信息查询",
    copy: "按小学、初中、高中分层查看学校信息，结合区域、地址、学校性质和公开资料，辅助家庭做学校筛选与对比。",
    stats: [
      ["3", "个学段入口"],
      ["10+", "个区县维度"],
      ["学校画像", "持续补充"],
    ],
  },
  educationNews: {
    mode: "education-news",
    title: "教育资讯分享",
    copy: "汇总升学政策、官方通知、教育动态和家长高频关注内容，帮助家庭快速获取可读、可用、可追踪的信息。",
    stats: [
      ["政策资讯", "持续更新"],
      ["官方来源", "优先整理"],
      ["家长可读", "快速筛选"],
    ],
  },
  training: {
    mode: "training",
    title: "培训机构推荐",
    copy: "按学段、课程方向、区域和服务特色整理培训机构信息，方便家长做课程筛选、机构比较和补习规划。",
    stats: [
      ["课程服务", "分类整理"],
      ["机构画像", "持续补充"],
      ["家长筛选", "便捷对比"],
    ],
  },
  competition: {
    mode: "competition",
    title: "赛事信息解读",
    copy: "围绕青少年赛事、报名节奏、参赛路径和成果展示进行拆解，帮助学生和家长理解赛事价值与准备重点。",
    stats: [
      ["赛事目录", "动态更新"],
      ["参赛路径", "分步解读"],
      ["成果展示", "持续沉淀"],
    ],
  },
  help: {
    mode: "help",
    title: "互帮互助",
    copy: "支持家长发布升学问题、查看审核回复、积累互助积分，并按规则兑换培训班补习折扣券。",
    stats: [
      ["回复审核", "内容可信"],
      ["积分奖励", "鼓励分享"],
      ["折扣兑换", "规则透明"],
    ],
  },
  default: {
    mode: "home",
    title: "贵阳教育导航",
    copy: "整合中考志愿模拟、学校信息查询、录取数据参考、教育资讯、培训机构、赛事解读和互助社区，帮助家长更清晰地做升学判断。",
    stats: [
      ["117", "条2026招生计划"],
      ["48029", "个官方计划名额"],
      ["7010", "行位次数据"],
    ],
  },
};

const contentHeroPagePresetMap = {
  "education-news": "educationNews",
  "training-recommendations": "training",
  "competition-insights": "competition",
  "help-community": "help",
};

function updateHeroForPage(page) {
  const topbar = document.querySelector(".topbar");
  const title = document.querySelector("#heroTitle");
  const copy = document.querySelector("#heroCopy");
  const strip = document.querySelector("#heroDataStrip");
  if (!topbar || !title || !copy || !strip) return;
  const preset = examPageIds.includes(page)
    ? heroPresets.calculator
    : schoolInfoPageIds.includes(page)
      ? heroPresets.school
      : heroPresets[contentHeroPagePresetMap[page]] || heroPresets.default;
  topbar.dataset.hero = preset.mode;
  title.textContent = preset.title;
  copy.textContent = preset.copy;
  strip.innerHTML = preset.stats
    .map(([value, label]) => `<span><strong>${escapeHtml(value)}</strong> ${escapeHtml(label)}</span>`)
    .join("");
}

function setActivePage(page, options = {}) {
  const allowedPages = getAllowedPageIds();
  const activePage = allowedPages.includes(page) ? page : HOME_PAGE_ID;
  document.querySelectorAll("[data-route]").forEach((section) => {
    section.hidden = section.id !== activePage;
  });
  document.querySelector("#sidebarCollapseControl")?.classList.toggle("active", activePage === HOME_PAGE_ID);
  const activeNavPage = navPageGroups[activePage] || activePage;
  document.querySelectorAll('a[data-page]').forEach((link) => {
    const isActive = link.dataset.page === activeNavPage || link.dataset.page === activePage;
    link.classList.toggle("active", isActive);
    if (link.dataset.page === activePage) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
  document.querySelectorAll(".nav-group").forEach((group) => {
    const hasActiveChild = Boolean(group.querySelector(`a[data-page="${activePage}"]`));
    group.classList.toggle("active-group", hasActiveChild);
    group.dataset.collapsed = hasActiveChild ? "false" : "true";
    const primary = group.querySelector(".nav-primary");
    if (primary) {
      primary.setAttribute("aria-expanded", String(hasActiveChild));
    }
  });
  updateHeroForPage(activePage);

  if (!options.skipHistory) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("page", activePage);
    nextUrl.hash = "";
    const method = options.replace ? "replaceState" : "pushState";
    window.history[method]({ page: activePage }, "", nextUrl);
  }
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function initNavigation(initialPage = getRequestedPage()) {
  const collapseControl = document.querySelector("#sidebarCollapseControl");
  const storedSidebarState = localStorage.getItem("gyedu.sidebarCollapsed");
  const setSidebarCollapsed = (collapsed) => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    if (collapseControl) {
      collapseControl.setAttribute("aria-expanded", String(!collapsed));
      collapseControl.setAttribute("aria-label", "进入首页");
    }
    localStorage.setItem("gyedu.sidebarCollapsed", collapsed ? "true" : "false");
  };
  setSidebarCollapsed(storedSidebarState === "true");
  collapseControl?.addEventListener("click", () => {
    setActivePage(HOME_PAGE_ID);
    if (document.body.classList.contains("sidebar-collapsed")) {
      setSidebarCollapsed(false);
    }
  });

  document.querySelectorAll('a[data-page]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setActivePage(link.dataset.page);
      if (document.body.classList.contains("sidebar-collapsed")) {
        setSidebarCollapsed(false);
      }
    });
  });
  window.addEventListener("popstate", () => {
    setActivePage(getRequestedPage(), { skipHistory: true });
  });
  setActivePage(initialPage, { replace: true });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatPercent(value) {
  const capped = clamp(Math.round(value), 1, 99);
  return `${capped}%`;
}

function estimateRankFromRows(score, rows) {
  if (!rows.length) return { rank: null, status: "missing" };
  const rounded = Math.floor(Number(score));
  const sortedRows = [...rows].sort((a, b) => b.score - a.score);
  const highest = sortedRows[0];
  const lowest = sortedRows[sortedRows.length - 1];

  if (rounded > highest.score) {
    return {
      rank: highest.cumulative,
      status: "aboveMax",
      maxScore: highest.score,
      topCumulative: highest.cumulative,
      segment: highest.segment,
    };
  }

  const exact = rows.find((row) => row.score === rounded);
  if (exact) {
    if (exact.score === highest.score) {
      return {
        rank: exact.cumulative,
        status: "topBucket",
        maxScore: highest.score,
        topCumulative: exact.cumulative,
        segment: exact.segment,
      };
    }
    return { rank: exact.cumulative, status: "exact", segment: exact.segment };
  }

  const lower = rows.filter((row) => row.score <= rounded).sort((a, b) => b.score - a.score)[0];
  if (lower) return { rank: lower.cumulative, status: "bucket", segment: lower.segment };
  return {
    rank: lowest.cumulative,
    status: "belowMin",
    minScore: lowest.score,
    segment: lowest.segment,
  };
}

function getActiveScoreDistribution() {
  return state.data.scoreDistribution2026?.length ? state.data.scoreDistribution2026 : state.data.scoreDistribution || [];
}

function getActiveRegionScoreDistribution(region) {
  const rows = state.data.regionScoreDistribution2026?.length
    ? state.data.regionScoreDistribution2026
    : state.data.regionScoreDistribution || [];
  return region ? rows.filter((row) => row.region === region) : rows;
}

function getActiveScoreDistributionYear() {
  return state.data.scoreDistribution2026?.length ? 2026 : 2025;
}

function getDistributionRank(score) {
  return estimateRankFromRows(score, getActiveScoreDistribution()).rank;
}

function getRegionDistributionRank(score, region) {
  return estimateRankFromRows(score, getActiveRegionScoreDistribution(region)).rank;
}

function getTopBucketNotice() {
  const distributionYear = getActiveScoreDistributionYear();
  const cityTop = estimateRankFromRows(750, getActiveScoreDistribution());
  const mainRegionRows = getActiveRegionScoreDistribution("三区一地");
  const mainRegionTop = estimateRankFromRows(750, mainRegionRows);
  const cityText = cityTop.topCumulative ?? cityTop.rank ?? "暂无";
  const mainRegionText = mainRegionTop.topCumulative ?? mainRegionTop.rank ?? "暂无";
  return `${distributionYear}年全市700分以上累计 ${cityText} 人，三区一地累计 ${mainRegionText} 人；700分以上不再细分精确位次，实际以成绩页为准。`;
}

function isTopBucketEstimate(estimate) {
  return estimate.status === "aboveMax" || estimate.status === "topBucket";
}

function updateAutoRankInputs() {
  if (!state.data) return;
  const score = Number(document.querySelector("#scoreInput").value || 0);
  const region = document.querySelector("#regionInput").value;
  const distributionYear = getActiveScoreDistributionYear();
  const cityEstimate = estimateRankFromRows(score, getActiveScoreDistribution());
  const regionRows = getActiveRegionScoreDistribution(region);
  const areaEstimate = estimateRankFromRows(score, regionRows);
  const cityRank = cityEstimate.rank;
  const areaRank = areaEstimate.rank;
  const rankInput = document.querySelector("#rankInput");
  const areaRankInput = document.querySelector("#areaRankInput");
  const cityRankHint = document.querySelector("#cityRankHint");
  const areaRankHint = document.querySelector("#areaRankHint");

  if (cityRank !== null) {
    rankInput.value = cityRank;
    cityRankHint.textContent =
      isTopBucketEstimate(cityEstimate)
        ? getTopBucketNotice()
        : `已按${distributionYear}全市分数段自动换算为约 ${cityRank} 名内。`;
  } else {
    cityRankHint.textContent = "当前暂无可用全市分数段，需手动填写全市位次。";
  }

  if (areaRank !== null) {
    areaRankInput.value = areaRank;
    areaRankHint.textContent =
      isTopBucketEstimate(areaEstimate)
        ? getTopBucketNotice()
        : `已按 ${region} ${distributionYear} 分数段自动换算为约 ${areaRank} 名内。`;
  } else {
    areaRankHint.textContent = "当前分数或区域暂无可用分数段，需手动填写区域位次。";
  }
}

function updateQuotaRankHint() {
  const middleSchool = document.querySelector("#middleSchoolInput").value.trim();
  const quotaRankHint = document.querySelector("#quotaRankHint");
  const quotaRankRows = state.data.quotaQualificationRanks || [];
  const matched = quotaRankRows.find((row) => row.middleSchool === middleSchool);

  if (matched) {
    document.querySelector("#quotaRankInput").value = matched.rank;
    quotaRankHint.textContent = `已从 ${matched.source || "配额资格排名表"} 自动读取。`;
    return;
  }

  quotaRankHint.textContent = middleSchool
    ? "暂未导入该初中的配额资格排名表，当前需按成绩页面中的“所在学校（单元）配额生资格排位”手动填写。"
    : "填写毕业初中后，系统会尝试读取配额资格排名；当前未导入排名表时需手填。";
}

function usesAreaRank(school) {
  const text = `${school.type} ${school.batch}`;
  return (
    text.includes("三区一地") ||
    text.includes("统筹") ||
    (text.includes("统招生") && !text.includes("面向全市")) ||
    text.includes("花溪区") ||
    text.includes("乌当区") ||
    text.includes("白云区") ||
    text.includes("清镇") ||
    text.includes("息烽") ||
    text.includes("修文") ||
    text.includes("开阳") ||
    text.includes("贵安")
  );
}

function getOfficialLineRank(school) {
  const rank = Number(school.lineRank || 0);
  if (!rank) return null;
  return {
    rank,
    region: school.rankRegion || "",
    isOfficial: true,
  };
}

function getEstimatedLineRank(school, region = "") {
  const areaRankMode = usesAreaRank(school);
  const rank = areaRankMode
    ? getRegionDistributionRank(school.score, region || school.rankRegion)
    : getDistributionRank(school.score);
  return {
    rank,
    region: areaRankMode ? region || school.rankRegion || "" : "全市",
    isOfficial: false,
  };
}

function getLineRankForSchool(school, region = "") {
  return getOfficialLineRank(school) || getEstimatedLineRank(school, region);
}

function shouldUseAreaRank(school, lineRankInfo) {
  return usesAreaRank(school) || Boolean(lineRankInfo?.region && lineRankInfo.region !== "全市");
}

function getActiveRankForSchool(school, form, lineRankInfo) {
  return shouldUseAreaRank(school, lineRankInfo) ? form.areaRank || form.estimatedAreaRank || form.rank : form.rank;
}

function getHistoryAverage(school) {
  if (!school.history.length) return null;
  const scores = school.history.map((row) => Number(row.score)).filter(Boolean);
  if (!scores.length) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function gradeRank(value) {
  return { A: 4, B: 3, C: 2, D: 1 }[value] || 0;
}

function gradeAtLeast(value, target) {
  return gradeRank(value) >= gradeRank(target);
}

function evaluateSubjectEligibility(subjects) {
  const biologyGeographyGeneral = gradeAtLeast(subjects.biology, "C") && gradeAtLeast(subjects.geography, "C");
  const biologyGeographyModel = gradeAtLeast(subjects.biology, "B") && gradeAtLeast(subjects.geography, "B");
  const artInfoSubjects = [subjects.informationTechnology, subjects.music, subjects.art];
  const artInfoGeneral = artInfoSubjects.every((value) => gradeAtLeast(value, "C")) && artInfoSubjects.filter((value) => gradeAtLeast(value, "B")).length >= 1;
  const artInfoModel = artInfoSubjects.every((value) => gradeAtLeast(value, "B"));
  const labsEligible = [subjects.physicsLab, subjects.chemistryLab, subjects.biologyLab].every((value) => value === "合格");
  const generalEligible = biologyGeographyGeneral && artInfoGeneral && labsEligible;
  const modelHighEligible = biologyGeographyModel && artInfoModel && labsEligible;
  const riskItems = [];

  if (!biologyGeographyGeneral) riskItems.push("地理/生物未达到普通高中最低门槛");
  if (!artInfoGeneral) riskItems.push("音乐/美术/信息技术未达到普通高中最低门槛");
  if (!labsEligible) riskItems.push("实验操作存在不合格");
  if (generalEligible && !modelHighEligible) riskItems.push("未达到省级示范性普通高中门槛");

  return {
    generalEligible,
    modelHighEligible,
    riskItems,
  };
}

function isModelHighCandidate(school) {
  const text = `${school.batch} ${school.type} ${school.school}`;
  return text.includes("第一批") || text.includes("配额") || text.includes("省级示范");
}

function normalizeControlRegion(region) {
  const value = String(region || "");
  if (value.includes("三区一地")) return "三区一地";
  if (value.includes("云岩") || value.includes("南明") || value.includes("观山湖") || value.includes("小河")) return "三区一地";
  if (value.includes("花溪")) return "花溪区";
  if (value.includes("乌当")) return "乌当区";
  if (value.includes("白云")) return "白云区";
  if (value.includes("清镇")) return "清镇市";
  if (value.includes("修文")) return "修文县";
  if (value.includes("开阳")) return "开阳县";
  if (value.includes("息烽")) return "息烽县";
  if (value.includes("贵安")) return "贵安新区";
  return value;
}

const admissionRegionPattern =
  "三区一地|云岩区|南明区|观山湖区|原小河地区|小河|花溪区?|乌当区?|白云区?|清镇市?|息烽县?|修文县?|开阳县?|贵安新区?";

function getAdmissionTargetRegions(school) {
  const text = `${school?.batch || ""} ${school?.type || ""}`;
  const regions = new Set();
  const directMatcher = new RegExp(`面向(${admissionRegionPattern})招生`, "g");
  let directMatch = directMatcher.exec(text);
  while (directMatch) {
    regions.add(normalizeControlRegion(directMatch[1]));
    directMatch = directMatcher.exec(text);
  }

  const localMatcher = new RegExp(`(${admissionRegionPattern})统招生`, "g");
  let localMatch = localMatcher.exec(text);
  while (localMatch) {
    regions.add(normalizeControlRegion(localMatch[1]));
    localMatch = localMatcher.exec(text);
  }

  return Array.from(regions);
}

function isAdmissionTypeAvailableForRegion(school, region) {
  const targetRegion = normalizeControlRegion(region);
  const text = `${school.batch || ""} ${school.type || ""}`;
  const namedNonLocalMatch = text.match(/(花溪|乌当|白云|清镇|息烽|修文|开阳|贵安)(?:区|市|县|新区)?面向非本区/);
  if (namedNonLocalMatch) return targetRegion !== normalizeControlRegion(namedNonLocalMatch[1]);

  const namedMainRegionMatch = text.match(/(花溪|乌当|白云|清镇|息烽|修文|开阳|贵安)(?:区|市|县|新区)?面向三区一地/);
  if (namedMainRegionMatch) return targetRegion === "三区一地";

  const admissionRegions = getAdmissionTargetRegions(school);
  if (admissionRegions.length) return admissionRegions.includes(targetRegion);

  return true;
}

function getControlRegionForAdmission(school, region) {
  const admissionRegions = getAdmissionTargetRegions(school);
  return admissionRegions.length === 1 ? admissionRegions[0] : normalizeControlRegion(region);
}

function getBatchControlLine(batch, region, school = null) {
  const text = String(batch || "");
  const lines = (state.data?.controlLines || []).filter((line) => Number(line.year) === 2026);
  const normalizedRegion = getControlRegionForAdmission(school, region);
  let matched = null;
  let score = 0;
  let label = "";

  if (text.includes("3+4") || text.includes("中本贯通")) {
    matched = lines.find((line) => String(line.note || "").includes("3+4"));
    score = Number(matched?.other || 0);
    label = "3+4贯通班";
  } else if (text.includes("第三批")) {
    matched = lines.find((line) => String(line.note || "").includes("第三批"));
    score = Number(matched?.other || 0);
    label = "第三批次";
  } else if (text.includes("第二批")) {
    matched = lines.find((line) => line.region === normalizedRegion);
    score = Number(matched?.second || 0);
    label = "第二批次";
  } else if (text.includes("第一批") || text.includes("配额")) {
    matched = lines.find((line) => line.region === normalizedRegion);
    score = Number(matched?.first || 0);
    label = "第一批次";
  }

  if (!matched || !score) return null;
  return {
    score,
    label,
    region: matched.region,
    sourceStatus: matched.status || "",
  };
}

function getControlLineForSchool(school, form) {
  const batchText = `${school.batch} ${school.type}`;
  const controlLine = getBatchControlLine(batchText, form.region, school);
  if (!controlLine) return null;
  const score = Number(form.score || 0);
  return {
    ...controlLine,
    passed: score >= controlLine.score,
    gap: Math.round(score - controlLine.score),
  };
}

function applyControlLineGate(chance, controlLineInfo) {
  if (!controlLineInfo || controlLineInfo.passed) return chance;
  return Math.min(chance, 8);
}

function calculateChance(school, form) {
  const scoreDelta = form.score - school.score;
  const lineRankInfo = getLineRankForSchool(school, form.region);
  const lineRank = lineRankInfo?.rank;
  const areaRankMode = shouldUseAreaRank(school, lineRankInfo);
  const activeRank = getActiveRankForSchool(school, form, lineRankInfo);
  const rankScale = areaRankMode ? 80 : 140;
  const rankDelta = activeRank && lineRank ? lineRank - activeRank : 0;
  const rankAdjustment = activeRank && lineRank ? clamp(rankDelta / rankScale, -12, 14) : 0;
  const historyAverage = getHistoryAverage(school);
  const historyAdjustment = historyAverage ? clamp((form.score - historyAverage) * 0.25, -8, 8) : 0;
  const quotaRankAdjustment = form.quotaRank ? clamp((80 - form.quotaRank) / 8, -8, 8) : 0;
  const quotaAdjustment = form.hasQuota && school.type.includes("配额") ? 7 + quotaRankAdjustment : 0;
  const subjectAdjustment = !form.subjectEligibility.generalEligible
    ? -45
    : isModelHighCandidate(school) && !form.subjectEligibility.modelHighEligible
      ? -18
      : 0;
  const privateAdjustment = school.nature === "民办" && !form.acceptPrivate ? -35 : 0;
  const batchAdjustment = school.batch.includes("提前") ? -4 : 0;
  const raw = 50 + scoreDelta * 1.9 + rankAdjustment + historyAdjustment + quotaAdjustment + subjectAdjustment + privateAdjustment + batchAdjustment;
  return clamp(raw, 1, 99);
}

function classifyBand(chance, delta) {
  if (chance >= 85 && delta >= 8) return "保一保";
  if (chance >= 65) return "稳一稳";
  if (chance >= 42) return "冲一冲";
  return "谨慎填报";
}

function riskLabel(chance) {
  if (chance >= 85) return "低风险";
  if (chance >= 65) return "中低风险";
  if (chance >= 42) return "有挑战";
  return "高风险";
}

function chanceClass(band) {
  if (band === "保一保") return "safe";
  if (band === "稳一稳") return "stable";
  if (band === "冲一冲") return "reach";
  return "risk";
}

function getQuotaMockCandidates() {
  const quotaRows = state.data.quotaAllocations || state.data.quotaPlanAllocations || [];
  if (!quotaRows.length) return [];
  const firstBatchCandidates = state.data.schools.filter((school) => {
    const text = `${school.batch} ${school.type}`;
    return text.includes("第一批次") && text.includes("统招生") && !text.includes("中本贯通");
  });
  return firstBatchCandidates.filter((school) => hasQuotaAllocation(school, quotaRows));
}

function normalizeQuotaName(value) {
  return String(value || "")
    .replace(/[（(].*?[）)]/g, "")
    .replace(/贵阳市/g, "贵阳")
    .replace(/项目班|国际高中|中加|中美|中外|合作班/g, "")
    .trim();
}

function hasQuotaAllocation(school, quotaRows) {
  const schoolName = normalizeQuotaName(school.school);
  return quotaRows.some((row) => {
    const highSchool = normalizeQuotaName(row.highSchool || row.school || row.targetSchool || row["高中学校"] || row["招生学校"]);
    return highSchool && (highSchool === schoolName || highSchool.includes(schoolName) || schoolName.includes(highSchool));
  });
}

function estimateUnifiedReleaseAhead(school, form, unifiedChance) {
  const quotaRank = form.quotaRank || 0;
  if (!quotaRank || quotaRank <= 1) return 0;
  const scoreDelta = form.score - school.score;
  const baseRate = scoreDelta >= 18 ? 0.42 : scoreDelta >= 8 ? 0.32 : scoreDelta >= 0 ? 0.22 : scoreDelta >= -8 ? 0.12 : 0.05;
  const chanceRate = unifiedChance >= 78 ? 0.14 : unifiedChance >= 58 ? 0.08 : unifiedChance >= 38 ? 0.04 : 0;
  return clamp(Math.round((quotaRank - 1) * (baseRate + chanceRate)), 0, quotaRank - 1);
}

function calculateQuotaMock(school, form) {
  if (!form.hasQuota) {
    return {
      quotaChance: 1,
      unifiedChance: calculateChance(school, { ...form, hasQuota: false }),
      unifiedLikely: false,
      releasedAhead: 0,
      effectiveQuotaRank: form.quotaRank || 0,
      stageText: "未勾选配额资格",
      detailText: "当前不进入配额模拟",
    };
  }
  const scoreDelta = form.score - school.score;
  const quotaRank = form.quotaRank || 999;
  const controlLineInfo = getControlLineForSchool(school, form);
  const unifiedRawChance = calculateChance(school, { ...form, hasQuota: false });
  const unifiedChance = applyControlLineGate(unifiedRawChance, controlLineInfo);
  const releasedAhead = estimateUnifiedReleaseAhead(school, form, unifiedChance);
  const effectiveQuotaRank = Math.max(1, quotaRank - releasedAhead);
  const quotaRankAdjustment =
    effectiveQuotaRank <= 20 ? 18 : effectiveQuotaRank <= 50 ? 10 : effectiveQuotaRank <= 80 ? 4 : effectiveQuotaRank <= 120 ? -4 : -12;
  const lineRankInfo = getLineRankForSchool(school, form.region);
  const lineRank = lineRankInfo?.rank;
  const activeRank = getActiveRankForSchool(school, form, lineRankInfo);
  const rankAdjustment = lineRank && activeRank ? clamp((lineRank - activeRank) / 120, -8, 10) : 0;
  const subjectAdjustment = form.subjectEligibility.generalEligible ? (form.subjectEligibility.modelHighEligible ? 0 : -8) : -35;
  const quotaRaw = 42 + scoreDelta * 1.1 + quotaRankAdjustment + rankAdjustment + subjectAdjustment;
  const unifiedLikely = unifiedChance >= 78 && scoreDelta >= 0;
  const quotaChance = applyControlLineGate(unifiedLikely ? 1 : clamp(quotaRaw, 1, 88), controlLineInfo);
  const stageText = unifiedLikely ? "第一阶段统招优先" : "第二阶段配额参考";
  const detailText =
    controlLineInfo && !controlLineInfo.passed
      ? `未达2026批次投档控制线：${controlLineInfo.region}${controlLineInfo.label}为 ${controlLineInfo.score} 分，当前低 ${Math.abs(controlLineInfo.gap)} 分，配额路径也不建议作为有效投档参考`
      : unifiedLikely
        ? "按2025线模拟，可能先被统招录取；统招优先项不进入配额竞争列表"
        : `未明显锁定统招时，再看配额；本校前排可能统招释放约 ${releasedAhead} 位，有效排位约 ${effectiveQuotaRank}`;

  return {
    quotaChance,
    unifiedChance,
    controlLineInfo,
    unifiedLikely,
    releasedAhead,
    effectiveQuotaRank,
    stageText,
    detailText,
  };
}

function quotaMockLevel(chance) {
  if (chance >= 78) return "配额重点参考";
  if (chance >= 55) return "重点关注";
  if (chance >= 35) return "可作为冲刺";
  return "谨慎参考";
}

function quotaMockClass(chance) {
  if (chance >= 78) return "safe";
  if (chance >= 55) return "stable";
  if (chance >= 35) return "reach";
  return "risk";
}

function formatPlanReference(school) {
  if (!school.planTotal) return "计划待复核";
  const year = school.planReferenceYear || 2025;
  return `${year}计划约 ${school.planTotal} 人`;
}

function buildReason(school, form, chance, controlLineInfo) {
  const delta = Math.round(form.score - school.score);
  const lineRankInfo = getLineRankForSchool(school, form.region);
  const rankMode = shouldUseAreaRank(school, lineRankInfo) ? "区域位次优先" : "全市位次优先";
  const rankText = lineRankInfo?.rank
    ? lineRankInfo.isOfficial
      ? `2025官方最低${lineRankInfo.region || "区域"}位次 ${lineRankInfo.rank}，本项按${rankMode}评估`
      : `2025线约对应${lineRankInfo.region || "全市"}累计位次 ${lineRankInfo.rank}，本项按${rankMode}评估`
    : "暂无可用位次换算";
  const planText = formatPlanReference(school);
  const historyText = school.history.length ? `已匹配 ${school.history.length} 条历史线` : "历史线匹配较少";
  const quotaText = school.type.includes("配额")
    ? `配额资格排位 ${form.quotaRank || "未填"}，需结合本校分配名额判断`
    : "非配额类志愿";
  const subjectText = buildSubjectReason(school, form);
  const controlLineText = controlLineInfo
    ? controlLineInfo.passed
      ? `已达2026${controlLineInfo.region}${controlLineInfo.label}批次投档控制线 ${controlLineInfo.score} 分，高出 ${controlLineInfo.gap} 分；这不是该校2026录取线，学校实际线要等录取结束后形成`
      : `未达2026批次投档控制线：${controlLineInfo.region}${controlLineInfo.label}为 ${controlLineInfo.score} 分，当前低 ${Math.abs(controlLineInfo.gap)} 分，本批次不建议作为有效投档志愿`
    : "该批次暂无已接入的2026批次投档控制线，仍需人工核对";
  return `${controlLineText}。比2025最低线${delta >= 0 ? "高" : "低"} ${Math.abs(delta)} 分，${rankText}，${planText}，${historyText}，${quotaText}，${subjectText}，风险标记为${riskLabel(chance)}。`;
}

function buildSubjectReason(school, form) {
  const eligibility = form.subjectEligibility;
  if (!eligibility.generalEligible) {
    return `非计分科目存在普通高中资格风险：${eligibility.riskItems.join("、")}`;
  }
  if (isModelHighCandidate(school) && !eligibility.modelHighEligible) {
    return "非计分科目未达到省级示范性普通高中门槛，第一批次或配额类志愿需重点核对";
  }
  return "非计分科目满足当前资格测算门槛";
}

function getFormValues() {
  const score = Number(document.querySelector("#scoreInput").value || 0);
  const region = document.querySelector("#regionInput").value;
  const manualAreaRank = Number(document.querySelector("#areaRankInput").value || 0);
  const nonScoreSubjects = {
    biology: document.querySelector("#biologyInput").value,
    geography: document.querySelector("#geographyInput").value,
    informationTechnology: document.querySelector("#itInput").value,
    music: document.querySelector("#musicInput").value,
    art: document.querySelector("#artInput").value,
    physicsLab: document.querySelector("#physicsLabInput").value,
    chemistryLab: document.querySelector("#chemistryLabInput").value,
    biologyLab: document.querySelector("#biologyLabInput").value,
  };
  const subjectEligibility = evaluateSubjectEligibility(nonScoreSubjects);
  return {
    score,
    rank: Number(document.querySelector("#rankInput").value || 0),
    areaRank: manualAreaRank,
    estimatedAreaRank: getRegionDistributionRank(score, region),
    region,
    middleSchool: document.querySelector("#middleSchoolInput").value.trim(),
    quotaRank: Number(document.querySelector("#quotaRankInput").value || 0),
    hasQuota: document.querySelector("#quotaInput").checked,
    acceptPrivate: document.querySelector("#privateInput").checked,
    nonScoreSubjects,
    subjectEligibility,
  };
}

function addressText(school) {
  if (school.address) return `校址：${school.address}`;
  return `校址：${school.addressStatus || "地址待补充"}`;
}

function showResultDialog() {
  const dialog = document.querySelector("#resultDialog");
  if (!dialog) return;
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
    return;
  }
  dialog.setAttribute("open", "");
}

function closeResultDialog() {
  const dialog = document.querySelector("#resultDialog");
  if (!dialog) return;
  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }
  dialog.removeAttribute("open");
}

function buildResultSummary(results) {
  const bandCounts = bandOrder.reduce((summary, band) => {
    summary[band] = results.filter((item) => item.band === band).length;
    return summary;
  }, {});
  return {
    total: results.length,
    bandCounts,
    topSchools: results.slice(0, 8).map((item) => ({
      school: item.school,
      batch: item.batch,
      type: item.type,
      score: item.score,
      chance: Math.round(item.chance),
      band: item.band,
      risk: item.risk,
    })),
  };
}

async function saveCalculatorSubmission(form, results) {
  if (!state.user) return;
  try {
    await authFetch("/api/calculator-submissions", {
      method: "POST",
      body: JSON.stringify({
        form,
        resultSummary: buildResultSummary(results),
      }),
    });
    loadAdminSubmissions();
  } catch (error) {
    console.warn("测算表单保存失败", error);
  }
}

function enableResultReplay() {
  const button = document.querySelector("#openResultsButton");
  if (button) button.disabled = false;
}

function runCalculation(options = {}) {
  const shouldOpenDialog = options.openDialog !== false;
  state.hasCalculated = true;
  const form = getFormValues();
  const results = state.data.schools
    .filter((school) => school.dataQuality !== "OCR待复核")
    .filter((school) => isAdmissionTypeAvailableForRegion(school, form.region))
    .map((school) => {
      const chance = calculateChance(school, form);
      const controlLineInfo = getControlLineForSchool(school, form);
      const gatedChance = applyControlLineGate(chance, controlLineInfo);
      const delta = form.score - school.score;
      const band = controlLineInfo && !controlLineInfo.passed ? "谨慎填报" : classifyBand(gatedChance, delta);
      return {
        ...school,
        chance: gatedChance,
        rawChance: chance,
        controlLineInfo,
        delta,
        band,
        risk: riskLabel(gatedChance),
        reason: buildReason(school, form, gatedChance, controlLineInfo),
      };
    })
    .filter((school) => form.acceptPrivate || school.nature !== "民办")
    .sort((a, b) => b.chance - a.chance || b.score - a.score);

  state.results = results;
  if (!results.some((item) => item.band === state.currentBand)) {
    state.currentBand = bandOrder.find((band) => results.some((item) => item.band === band)) || "稳一稳";
  }
  renderResults(form);
  enableResultReplay();
  if (shouldOpenDialog) saveCalculatorSubmission(form, results);
  if (shouldOpenDialog) showResultDialog();
}

function renderEmptyResults() {
  state.results = [];
  document.querySelector("#resultTitle").textContent = "等待测算";
  document.querySelector("#rankChip").textContent = "填写信息后点击重新测算";
  document.querySelector("#subjectChip").textContent = "非计分资格待计算";
  document.querySelector("#quotaSummary").innerHTML = `
    <div><strong>配额模拟待计算</strong><span>填写分数、毕业初中、配额资格排位后，点击重新测算。</span></div>
    <div><strong>核心逻辑</strong><span>先看统招是否可能录取，再看配额阶段的有效排位。</span></div>
  `;
  document.querySelector("#quotaList").innerHTML = `<div class="quota-empty">点击重新测算后展示配额模拟结果。</div>`;
  document.querySelector("#bandTabs").innerHTML = "";
  document.querySelector("#resultList").innerHTML = `<div class="empty-card">点击重新测算后展示统招路径下的志愿推荐结果。</div>`;
}

function normalizeLookupKeyword(value) {
  return String(value || "").trim().toLowerCase();
}

function renderCalculatorSchoolOptions() {
  const options = document.querySelector("#calculatorSchoolOptions");
  if (!options || !state.data?.schools?.length) return;
  const schoolNames = [...new Set(state.data.schools.map((school) => school.school).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  options.innerHTML = schoolNames.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
}

function getSchoolLookupRows(keyword) {
  const value = normalizeLookupKeyword(keyword);
  if (!value) return [];
  const rows = state.data.schools.filter((school) => {
    const searchText = `${school.school} ${school.batch} ${school.type} ${school.nature}`.toLowerCase();
    return searchText.includes(value);
  });
  return rows.sort((a, b) => {
    const exactA = normalizeLookupKeyword(a.school) === value ? 1 : 0;
    const exactB = normalizeLookupKeyword(b.school) === value ? 1 : 0;
    return exactB - exactA || b.score - a.score || String(a.type).localeCompare(String(b.type), "zh-CN");
  });
}

function renderLookupHistory(historyRows) {
  const rows = (historyRows || []).slice(0, 4);
  if (!rows.length) return `<div class="school-lookup-history-empty">暂无更早年份历史线。</div>`;
  return `
    <div class="school-lookup-history">
      ${rows
        .map(
          (row) => `
            <span>${escapeHtml(row.year)} ${escapeHtml(row.batch)} ${escapeHtml(row.type)}：${escapeHtml(row.score)}分</span>
          `,
        )
        .join("")}
    </div>
  `;
}

function buildSchoolLookupCard(school, form) {
  const isCurrentRegionAvailable = isAdmissionTypeAvailableForRegion(school, form.region);
  const controlLineInfo = getControlLineForSchool(school, form);
  const lineRankInfo = getLineRankForSchool(school, form.region);
  const rankText = lineRankInfo?.rank
    ? `${lineRankInfo.isOfficial ? "2025官方最低" : "2025估算"}${lineRankInfo.region || "区域"}位次 ${lineRankInfo.rank}`
    : "最低位次待补充";
  const controlText = controlLineInfo
    ? `2026${controlLineInfo.region}${controlLineInfo.label}批次线 ${controlLineInfo.score} 分，当前${controlLineInfo.passed ? "已达" : "未达"}`
    : "2026批次线需人工核对";
  const dataQualityText = school.dataQuality && school.dataQuality !== "正常" ? `数据状态：${school.dataQuality}` : "数据状态：已接入";
  return `
    <article class="school-lookup-card ${isCurrentRegionAvailable ? "available" : "unavailable"}">
      <div class="school-lookup-card-head">
        <div>
          <h3>${escapeHtml(school.school)}</h3>
          <div class="school-meta">
            <span class="tag">${escapeHtml(school.batch)}</span>
            <span class="tag">${escapeHtml(school.type)}</span>
            <span class="tag">${escapeHtml(school.nature)}</span>
            <span class="tag">${isCurrentRegionAvailable ? "当前区域可参考" : "当前区域不匹配"}</span>
          </div>
        </div>
        <strong>${escapeHtml(school.score)}分</strong>
      </div>
      <div class="school-lookup-data-grid">
        <div><strong>2025实际线</strong><span>${escapeHtml(school.score)} 分</span></div>
        <div><strong>最低位次</strong><span>${escapeHtml(rankText)}</span></div>
        <div><strong>2026计划</strong><span>${escapeHtml(formatPlanReference(school))}</span></div>
        <div><strong>批次控制</strong><span>${escapeHtml(controlText)}</span></div>
      </div>
      <p class="school-address">${escapeHtml(addressText(school))}</p>
      ${renderLookupHistory(school.history)}
      <p class="school-lookup-note">${escapeHtml(dataQualityText)}；2026各校实际录取线需等录取结束后形成，当前仅展示批次控制线和2025历史录取参考。</p>
    </article>
  `;
}

function renderCalculatorSchoolLookup() {
  const input = document.querySelector("#calculatorSchoolLookupInput");
  const container = document.querySelector("#calculatorSchoolLookupResult");
  if (!input || !container || !state.data?.schools?.length) return;
  const keyword = input.value.trim();
  if (!keyword) {
    container.innerHTML = `<div class="empty-card">输入学校名称后，可查看该校2025实际录取线、最低位次、历史线、2026计划和批次控制线参考。</div>`;
    return;
  }

  const form = getFormValues();
  const rows = getSchoolLookupRows(keyword);
  if (!rows.length) {
    container.innerHTML = `<div class="empty-card">未查询到“${escapeHtml(keyword)}”相关学校或招生类型，请换用学校全称或简称。</div>`;
    return;
  }

  const availableCount = rows.filter((school) => isAdmissionTypeAvailableForRegion(school, form.region)).length;
  const visibleRows = rows.slice(0, 18);
  container.innerHTML = `
    <div class="school-lookup-summary">
      <div><strong>${escapeHtml(rows.length)}</strong><span>条匹配记录</span></div>
      <div><strong>${escapeHtml(availableCount)}</strong><span>条适配当前报考区域</span></div>
      <p>结果展示该校不同批次和招生类型的历史录取参考；“当前区域不匹配”的项目不应直接放入当前区域志愿方案。</p>
    </div>
    <div class="school-lookup-list">
      ${visibleRows.map((school) => buildSchoolLookupCard(school, form)).join("")}
    </div>
    ${rows.length > visibleRows.length ? `<p class="form-note">已展示前 ${visibleRows.length} 条，继续输入更完整的学校名或招生类型可缩小范围。</p>` : ""}
  `;
}

function renderMetrics() {
  const admissionCount = state.data.schools.length;
  const schoolCount = new Set(state.data.schools.map((school) => school.school)).size;
  const plan2026Rows = state.data.admissionPlan2026?.length || 0;
  const plan2026Total = (state.data.admissionPlan2026 || []).reduce((sum, row) => sum + (Number(row["招生人数"]) || Number(row.count) || 0), 0);
  const quotaMeta = state.quotaAllocation?.meta;
  const planCount = state.data.schools.filter((school) => school.planReferenceYear === 2026 && school.planTotal > 0).length;
  const scoreRows = getActiveScoreDistribution().length + getActiveRegionScoreDistribution().length;
  const scoreDistributionYear = getActiveScoreDistributionYear();
  const historyCount = state.data.schools.reduce((sum, school) => sum + school.history.length, 0);
  const metrics = [
    [
      "2026招生计划",
      plan2026Rows,
      `官方总计划 ${OFFICIAL_2026_PLAN_TOTAL.toLocaleString()} 人；已结构化明确名额 ${plan2026Total.toLocaleString()} 人，另含1条待定记录`,
    ],
    quotaMeta
      ? [
          "2026配额分配",
          quotaMeta.grandTotal,
          `覆盖 ${quotaMeta.unitCount} 个初中单元、${quotaMeta.highSchoolCount} 所高中；已整理为清晰核对表`,
        ]
      : null,
    ["2026计划已关联", planCount, `已匹配到 ${planCount} 条学校计划，用于查看今年招生规模`],
    [`${scoreDistributionYear}一分一段表`, scoreRows, `${scoreDistributionYear} 分数段已用于全市位次和区域位次自动换算`],
    ["历史参考已收纳", historyCount + admissionCount + state.data.scoreDistribution.length, "2025及以前录取线和历史记录仅作为录取线参考"],
  ].filter(Boolean);
  document.querySelector("#metrics").innerHTML = metrics
    .map(
      ([label, value, note]) => `
        <div class="metric">
          <span>${label}</span>
          <strong>${value}</strong>
          <span>${note}</span>
        </div>
      `,
    )
    .join("");
}

function get2026PlanSummary() {
  const rows = state.data.admissionPlan2026 || [];
  const categoryMap = new Map();
  rows.forEach((row) => {
    const category = row.category || row["数据类别"] || "未分类";
    const count = Number(row.count) || Number(row["招生人数"]) || 0;
    categoryMap.set(category, (categoryMap.get(category) || 0) + count);
  });
  const knownTotal = rows.reduce((sum, row) => sum + (Number(row["招生人数"]) || Number(row.count) || 0), 0);
  return {
    rows,
    knownTotal,
    pendingTotal: Math.max(OFFICIAL_2026_PLAN_TOTAL - knownTotal, 0),
    categories: [...categoryMap.entries()].map(([name, count]) => ({ name, count })),
  };
}

function renderQuotaReviewTable(quotaTotals, quotaMeta) {
  const reviewStatus = quotaMeta?.status?.includes("导入") || quotaMeta?.status?.includes("核对") ? "已核对" : "待核对";
  return `
    <div class="quota-review-table-wrap">
      <table class="quota-review-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>高中学校</th>
            <th>配额名额</th>
            <th>核对状态</th>
          </tr>
        </thead>
        <tbody>
          ${
            quotaTotals.length
              ? quotaTotals
                  .map(
                    (item, index) => `
                      <tr>
                        <td>${String(index + 1).padStart(2, "0")}</td>
                        <td>${escapeHtml(item.school)}</td>
                        <td>${Number(item.quota).toLocaleString()} 名</td>
                        <td>${reviewStatus}</td>
                      </tr>
                    `,
                  )
                  .join("")
              : `<tr><td colspan="4">配额合计待接入。</td></tr>`
          }
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">合计</td>
            <td>${quotaTotals.reduce((sum, item) => sum + Number(item.quota || 0), 0).toLocaleString()} 名</td>
            <td>${quotaMeta ? `应等于官方合计 ${quotaMeta.grandTotal.toLocaleString()} 名` : "待核对"}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function renderQuotaDetailTable(records, highSchools, recordsStatus) {
  if (!records?.length || !highSchools?.length) {
    return `
      <div class="quota-detail-empty">
        <strong>逐初中单元明细待接入</strong>
        <span>当前只有高中合计名额，尚未结构化到每个初中单元。</span>
      </div>
    `;
  }
  const shortSchoolName = (name) =>
    String(name || "")
      .replace("贵阳市", "")
      .replace("贵州省", "省")
      .replace("贵州师范大学", "贵师大")
      .replace("北京师范大学", "北师大")
      .replace("中央民族大学", "中央民大")
      .replace("附属中学", "附中")
      .replace("高级中学", "高中");
  return `
    <div class="quota-detail-summary">
      <span>${records.length.toLocaleString()} 个初中单元</span>
      <span>${(recordsStatus?.detailCellCount || records.length * highSchools.length).toLocaleString()} 个配额单元格</span>
      <span>状态：${escapeHtml(recordsStatus?.status || "待人工核对")}</span>
    </div>
    <div class="quota-detail-table-wrap">
      <table class="quota-detail-table">
        <thead>
          <tr>
            <th class="sticky-col">初中单元</th>
            <th class="school-col">毕业初中/单元</th>
            ${highSchools.map((school) => `<th title="${escapeHtml(school)}">${escapeHtml(shortSchoolName(school))}</th>`).join("")}
            <th>行合计</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          ${records
            .map(
              (record) => `
                <tr>
                  <td class="sticky-col">${escapeHtml(record.unit)}</td>
                  <td class="school-col">${escapeHtml(record.juniorSchool)}</td>
                  ${highSchools
                    .map((school) => `<td>${Number(record.allocations?.[school] || 0)}</td>`)
                    .join("")}
                  <td>${Number(record.total || 0)}</td>
                  <td><span class="${record.checkStatus === "已核对" ? "quota-status-done" : "quota-status-pending"}">${escapeHtml(record.checkStatus || "待核对")}</span></td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <p class="quota-review-note">${escapeHtml(recordsStatus?.note || "明细来自扫描件OCR结构化，建议逐行核对后再进入正式测算。")}</p>
  `;
}

function renderControlLineRows(controlLines) {
  if (!controlLines.length) {
    return `
      <tr>
        <td colspan="4">2026录取控制线待接入。</td>
      </tr>
    `;
  }
  return controlLines
    .map((line) => {
      const first = Number(line.first || 0) > 0 ? `${Number(line.first)}分` : "不适用";
      const second = Number(line.second || 0) > 0 ? `${Number(line.second)}分` : "不适用";
      const other = line.other ? `${escapeHtml(line.other)}分` : escapeHtml(line.note || "");
      return `
        <tr>
          <td>${escapeHtml(line.region)}</td>
          <td>${first}</td>
          <td>${second}</td>
          <td>${other}</td>
        </tr>
      `;
    })
    .join("");
}

function renderCurrentYearData() {
  const container = document.querySelector("#currentYearData");
  if (!container) return;
  const plan = get2026PlanSummary();
  const quotaMeta = state.quotaAllocation?.meta;
  const quotaTotals = state.quotaAllocation?.totalsByHighSchool || [];
  const quotaRanges = state.quotaAllocation?.pageRanges || [];
  const quotaRecords = state.quotaAllocation?.records || [];
  const recordsStatus = state.quotaAllocation?.recordsStatus;
  const highSchools = quotaTotals.map((item) => item.school);
  const controlLines2026 = (state.data.controlLines || []).filter((line) => Number(line.year) === 2026);
  container.innerHTML = `
    <section class="current-year-card">
      <div class="current-year-head">
        <div>
          <p class="eyebrow">2026 Current Data</p>
          <h3>今年已接入数据总览</h3>
        </div>
        <span class="current-year-status">今年数据优先展示</span>
      </div>
      <div class="current-year-grid">
        <article>
          <strong>${plan.rows.length.toLocaleString()} 条</strong>
          <span>2026普通高中及综合高中招生计划</span>
          <p>官方总计划 ${OFFICIAL_2026_PLAN_TOTAL.toLocaleString()} 人；已结构化明确名额 ${plan.knownTotal.toLocaleString()} 人，另有 ${plan.pendingTotal.toLocaleString()} 人待定项目需以后续官方明细核准。</p>
        </article>
        <article>
          <strong>${quotaMeta ? quotaMeta.grandTotal.toLocaleString() : "待接入"} 个</strong>
          <span>2026三区一地配额名额</span>
          <p>${quotaMeta ? `覆盖 ${quotaMeta.unitCount} 个初中单元、${quotaMeta.highSchoolCount} 所高中，数据已完全核对无误。` : "暂未读取到2026配额表。"}</p>
        </article>
        <article>
          <strong>${controlLines2026.length.toLocaleString()} 条</strong>
          <span>2026录取控制线</span>
          <p>已接入第一批次、第二批次、第三批次及3+4贯通班投档控制线；学校录取结果发布后再接入各校实际录取分数线。</p>
        </article>
      </div>
      <div class="current-year-subgrid">
        <div class="current-year-block current-year-control-block">
          <h4>2026录取控制线</h4>
          <div class="control-line-table-wrap">
            <table class="control-line-table">
              <thead>
                <tr>
                  <th>区域/类别</th>
                  <th>第一批</th>
                  <th>第二批</th>
                  <th>其他控制线</th>
                </tr>
              </thead>
              <tbody>
                ${renderControlLineRows(controlLines2026)}
              </tbody>
            </table>
          </div>
          <p class="quota-review-note">来源：贵阳市招考网2026年7月10日官方发布；各校实际录取分数线需等7月17日至24日录取结果形成后再接入。</p>
        </div>
        <div class="current-year-block current-year-plan-block">
          <h4>招生计划分类</h4>
          <div class="current-year-list">
            ${plan.categories
              .map((item) => `<div><span>${escapeHtml(item.name)}</span><strong>${item.count.toLocaleString()} 人</strong></div>`)
              .join("")}
          </div>
        </div>
        <div class="current-year-block current-year-quota-block">
          <h4>2026配额分配指标</h4>
          <p class="quota-review-note">数据已完全核对无误，合计名额与逐初中单元明细已同步到系统。</p>
          <div class="quota-detail-section compact">
            <div class="quota-detail-head">
              <div>
                <p class="eyebrow">Quota Matrix</p>
                <h4>2026配额分配指标</h4>
              </div>
              <span>数据已完全核对无误，横向滚动查看</span>
            </div>
            ${renderQuotaDetailTable(quotaRecords, highSchools, recordsStatus)}
          </div>
        </div>
      </div>
      <div class="quota-range-strip">
        ${quotaRanges
          .map((page) => `<span>第 ${page.page} 页：${escapeHtml(page.range)}</span>`)
          .join("")}
      </div>
    </section>
  `;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSchoolAddress(address) {
  const value = String(address || "").trim();
  return value && value !== "（待补充）" ? value : "地址待补充";
}

async function loadEducationNewsData() {
  const educationNewsResponse = await fetch(`./data/education-news.json?v=${Date.now()}`, { cache: "no-store" });
  state.educationNews = await educationNewsResponse.json();
}

async function refreshEducationNewsData() {
  const summary = document.querySelector("#educationNewsSummary");
  if (summary) summary.textContent = "正在刷新教育资讯数据...";
  try {
    await loadEducationNewsData();
    renderEducationNews();
  } catch (error) {
    if (summary) summary.textContent = `教育资讯刷新失败：${error.message}`;
  }
}

function renderEducationNews() {
  const container = document.querySelector("#educationNewsList");
  const summary = document.querySelector("#educationNewsSummary");
  if (!container) return;
  const items = state.educationNews?.items || [];
  if (summary) {
    const updatedAt = state.educationNews?.meta?.updatedAt || "待更新";
    summary.textContent = `已整理 ${items.length} 条官方教育资讯，更新于 ${updatedAt}，每条均保留原文来源。`;
  }
  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>教育资讯内容待补充</strong>
        <span>后续可接入升学政策、教育动态、志愿填报提醒、考试节点和家长常见问题，形成资讯分享页面。</span>
      </div>
    `;
    return;
  }
  container.innerHTML = items
    .map(
      (item, index) => `
        <article class="education-news-card">
          <div class="education-news-meta">
            <span>${escapeHtml(item.category || "教育资讯")}</span>
            <time datetime="${escapeHtml(item.date)}">${escapeHtml(item.date)}</time>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary)}</p>
          <div class="education-news-focus">
            <strong>家长关注：</strong>${escapeHtml(item.focus)}
          </div>
          <div class="education-news-footer">
            <span>${String(index + 1).padStart(2, "0")} · ${escapeHtml(item.source)} / ${escapeHtml(item.sourcePage)}</span>
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">查看原文</a>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderCompetitionEvents() {
  const list = document.querySelector("#competitionEventList");
  const summary = document.querySelector("#competitionEventSummary");
  if (!list) return;
  const events = state.competitionEvents?.events || [];
  const meta = state.competitionEvents?.meta || {};
  if (summary) {
    summary.textContent = events.length
      ? `已整理 ${events.length} 条“贵青杯”赛事/活动信息，重点展示赛事名称、适合学段与关键时间节点。`
      : "赛事信息正在整理中。";
  }
  if (!events.length) {
    list.innerHTML = `
      <div class="empty-state">
        <strong>赛事信息内容待补充</strong>
        <span>后续可整理白名单赛事、科技创新赛事、AI竞赛、报名节点、适合年级和备赛建议。</span>
      </div>
    `;
    return;
  }
  const categoryCount = uniqueValues(events.map((event) => event.category)).length;
  list.innerHTML = `
    <div class="competition-summary">
      <div>
        <strong>${events.length.toLocaleString()} 条</strong>
        <span>赛事/活动条目</span>
      </div>
      <div>
        <strong>${categoryCount.toLocaleString()} 类</strong>
        <span>覆盖阅读、科技、美育、体育等方向</span>
      </div>
      <div>
        <strong>2026</strong>
        <span>贵青杯年度目录</span>
      </div>
    </div>
    <div class="competition-source">
      <strong>资料来源</strong>
      <span>${escapeHtml(meta.source || "用户提供的官方PDF")}</span>
    </div>
    <div class="competition-event-grid">
      ${events
        .map(
          (event) => `
            <article class="competition-card">
              <div class="competition-card-head">
                <span>${String(event.order).padStart(2, "0")}</span>
                <em>${escapeHtml(event.category)}</em>
              </div>
              <h3>${escapeHtml(event.name)}</h3>
              <p>${escapeHtml(event.stage)}</p>
              <ul>
                ${(event.timeline || []).map((time) => `<li>${escapeHtml(time)}</li>`).join("")}
              </ul>
              <div class="competition-note">${escapeHtml(event.note || "以官方后续通知为准。")}</div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function getSchoolInfoByStage(stage) {
  return (state.schoolInfo?.schools || []).filter((school) => school.stage === stage);
}

function getSchoolDistrictLabel(district) {
  return String(district || "").replace(/^贵阳市-/, "");
}

function findSchoolDistrictValue(items, districtLabel) {
  return items.find((school) => getSchoolDistrictLabel(school.district) === districtLabel)?.district || districtLabel;
}

function getSchoolImageInfo(school) {
  const imageName = school.displayName || school.name;
  const verified = verifiedSchoolImages[school.name] || verifiedSchoolImages[imageName];
  if (verified) {
    return {
      ...verified,
      sourceUrl: verified.url,
    };
  }
  const query = `${imageName} ${getSchoolDistrictLabel(school.district)} 校园`;
  return {
    url: `https://tse1-mm.cn.bing.net/th?q=${encodeURIComponent(query)}&w=720&h=420&c=7&rs=1&p=0&o=5&pid=1.7`,
    source: "图片检索",
    sourceUrl: `https://cn.bing.com/images/search?q=${encodeURIComponent(query)}`,
  };
}

function renderSchoolQuickAccess(stage, items, filter) {
  return `
    <section class="school-quick-panel" aria-label="学校信息快捷入口">
      <div class="school-quick-head">
        <strong>快捷入口</strong>
        <span>按区域和学段快速查看学校信息</span>
      </div>
      <div class="school-quick-grid">
        ${featuredSchoolDistricts
          .map((district) => {
            const districtValue = findSchoolDistrictValue(items, district);
            const active = getSchoolDistrictLabel(filter.district) === district;
            return `
              <button class="school-quick-card ${active ? "active" : ""}" type="button" data-district="${escapeHtml(districtValue)}">
                <span>区域</span>
                <strong>${district}</strong>
              </button>
            `;
          })
          .join("")}
        ${Object.keys(schoolStageRoutes)
          .map(
            (stageName) => `
              <button class="school-quick-card ${stageName === stage ? "active" : ""}" type="button" data-school-page="${schoolStageRoutes[stageName]}">
                <span>学段</span>
                <strong>${stageName}</strong>
              </button>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderFeaturedSchools(stage, items) {
  if (stage === "高中") {
    return "";
  }
  return `
    <section class="featured-school-panel" aria-label="${stage}热门学校">
      <div class="featured-school-title">
        <div>
          <p class="eyebrow">Popular Schools</p>
          <h3>热门学校</h3>
        </div>
        <span>云岩、南明、观山湖区各展示 5 所${stage}，图片按学校名称公开检索接入。</span>
      </div>
      ${featuredSchoolDistricts
        .map((district) => {
          const schoolNames = featuredSchoolNames[district]?.[stage] || [];
          const schools = schoolNames
            .map((entry) => {
              const config = typeof entry === "string" ? { name: entry } : entry;
              const school =
                items.find((item) => item.name === config.name) ||
                (state.schoolInfo?.schools || []).find((item) => item.name === config.name);
              if (!school) return null;
              return { ...school, displayName: config.displayName || school.name, displayStage: stage };
            })
            .filter(Boolean);
          if (!schools.length) return "";
          return `
            <div class="featured-district-block">
              <div class="featured-district-head">
                <strong>${district} · ${stage}</strong>
                <button type="button" data-district="${escapeHtml(findSchoolDistrictValue(items, district))}">查看本区全部</button>
              </div>
              <div class="featured-school-grid">
                ${schools
                  .map((school) => {
                    const image = getSchoolImageInfo(school);
                    return `
                      <article class="featured-school-card">
                        <div class="featured-school-image">
                          <img src="${escapeHtml(image.url)}" alt="${escapeHtml(school.displayName)}校园图片" loading="lazy" />
                          <div class="featured-badges">
                            <span>${escapeHtml(getSchoolDistrictLabel(school.district))}</span>
                            <span>${escapeHtml(school.displayStage)}</span>
                          </div>
                        </div>
                        <div class="featured-school-body">
                          <h4>${escapeHtml(school.displayName)}</h4>
                          <p>${escapeHtml(formatSchoolAddress(school.address))}</p>
                          <div class="featured-school-meta">
                            <span>${escapeHtml(school.nature || "性质待补充")}</span>
                            <a href="${escapeHtml(image.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(image.source)}</a>
                          </div>
                        </div>
                      </article>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `;
        })
        .join("")}
    </section>
  `;
}

function getSchoolDirectoryFilter(stage) {
  if (!state.schoolInfoFilters[stage]) {
    state.schoolInfoFilters[stage] = { keyword: "", district: "" };
  }
  return state.schoolInfoFilters[stage];
}

function renderSchoolDirectories() {
  document.querySelectorAll(".school-directory").forEach((container) => {
    const stage = container.dataset.stage;
    renderSchoolDirectory(container, stage);
  });
}

function getSchoolDirectoryContainer(stage) {
  return [...document.querySelectorAll(".school-directory")].find((container) => container.dataset.stage === stage);
}

function syncSchoolHeaderSearch(stage) {
  const input = document.querySelector(`[data-stage-search="${stage}"]`);
  if (input) input.value = getSchoolDirectoryFilter(stage).keyword;
}

function setupSchoolHeaderSearch() {
  document.querySelectorAll("[data-stage-search]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const stage = event.target.dataset.stageSearch;
      getSchoolDirectoryFilter(stage).keyword = event.target.value;
      const container = getSchoolDirectoryContainer(stage);
      if (container) renderSchoolDirectory(container, stage);
    });
  });
}

function renderSchoolDirectory(container, stage) {
  const items = getSchoolInfoByStage(stage);
  const filter = getSchoolDirectoryFilter(stage);
  syncSchoolHeaderSearch(stage);
  const districts = uniqueValues(items.map((school) => school.district)).sort();
  const keyword = filter.keyword.trim().toLowerCase();
  const filtered = items
    .filter((school) => {
      const searchText = [school.name, school.schoolType, school.nature, school.district, school.address, ...(school.aliases || [])]
        .join(" ")
        .toLowerCase();
      return !keyword || searchText.includes(keyword);
    })
    .filter((school) => !filter.district || school.district === filter.district)
    .sort((a, b) => a.district.localeCompare(b.district, "zh-Hans-CN") || a.name.localeCompare(b.name, "zh-Hans-CN"));
  const pendingCount = items.filter((school) => formatSchoolAddress(school.address) === "地址待补充").length;
  const supplementCount = items.filter((school) => school.status.includes("补充") || school.status.includes("映射")).length;

  container.innerHTML = `
    ${renderSchoolQuickAccess(stage, items, filter)}
    ${renderFeaturedSchools(stage, items)}
    <div class="directory-summary">
      <div>
        <strong>${items.length.toLocaleString()} 所</strong>
        <span>${stage}基础信息</span>
      </div>
      <div>
        <strong>${districts.length.toLocaleString()} 个</strong>
        <span>覆盖区域</span>
      </div>
      <div>
        <strong>${pendingCount.toLocaleString()} 条</strong>
        <span>地址待补充</span>
      </div>
      <div>
        <strong>${supplementCount.toLocaleString()} 条</strong>
        <span>2026补充/映射</span>
      </div>
    </div>
    <div class="directory-tools">
      <input class="directory-search" type="search" value="${escapeHtml(filter.keyword)}" placeholder="搜索学校名称、地址、区域..." data-stage="${stage}" />
      <select class="directory-district" data-stage="${stage}">
        <option value="">全部区域</option>
        ${districts.map((district) => `<option value="${escapeHtml(district)}" ${district === filter.district ? "selected" : ""}>${escapeHtml(district)}</option>`).join("")}
      </select>
    </div>
    <div class="directory-table-wrap">
      <table class="data-table directory-table">
        <thead>
          <tr>
            <th>学校名称</th>
            <th>办学类型</th>
            <th>性质</th>
            <th>区域</th>
            <th>地址</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .slice(0, 180)
            .map(
              (school) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(school.name)}</strong>
                    ${(school.aliases || []).length ? `<span class="alias-text">别名：${escapeHtml(school.aliases.join("、"))}</span>` : ""}
                  </td>
                  <td>${escapeHtml(school.schoolType || "待补充")}</td>
                  <td>${escapeHtml(school.nature || "待补充")}</td>
                  <td>${escapeHtml(school.district || "待补充")}</td>
                  <td>${escapeHtml(formatSchoolAddress(school.address))}</td>
                  <td><span class="directory-status-pill">${escapeHtml(school.status)}</span></td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <p class="directory-note">当前显示 ${Math.min(filtered.length, 180).toLocaleString()} / ${filtered.length.toLocaleString()} 条匹配结果；数据源：${escapeHtml(state.schoolInfo?.meta?.sourceFile || "学校基础信息表")}。</p>
  `;

  container.querySelector(".directory-search").addEventListener("input", (event) => {
    getSchoolDirectoryFilter(stage).keyword = event.target.value;
    renderSchoolDirectory(container, stage);
  });
  container.querySelector(".directory-district").addEventListener("change", (event) => {
    getSchoolDirectoryFilter(stage).district = event.target.value;
    renderSchoolDirectory(container, stage);
  });
  container.querySelectorAll("[data-district]").forEach((button) => {
    button.addEventListener("click", () => {
      getSchoolDirectoryFilter(stage).district = button.dataset.district;
      renderSchoolDirectory(container, stage);
    });
  });
  container.querySelectorAll("[data-school-page]").forEach((button) => {
    button.addEventListener("click", () => setActivePage(button.dataset.schoolPage));
  });
  container.querySelectorAll(".featured-school-image img").forEach((image) => {
    image.addEventListener("error", () => {
      image.closest(".featured-school-card")?.classList.add("image-error");
      image.remove();
    });
  });
}

function renderSourceOverview() {
  const sources = state.data.dataSources || [];
  const inventory = state.data.dataInventory || [];
  if (!sources.length) {
    document.querySelector("#sourceOverview").innerHTML = `
      <div class="source-overview-head">
        <strong>数据来源清单未加载</strong>
        <span>请刷新页面或检查 2025-simulation.json 是否为最新数据包。</span>
      </div>
    `;
    return;
  }
  const years = uniqueValues(sources.map((source) => source.year)).sort();
  const currentYearInventory = inventory.filter((item) => String(item.label || "").includes("2026"));
  const historyInventory = inventory.filter((item) => !String(item.label || "").includes("2026"));
  const totalInventoryRows = inventory.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const overviewCards = currentYearInventory.length
    ? currentYearInventory
    : years.map((year) => {
        const yearSources = sources.filter((source) => source.year === year);
        const categories = uniqueValues(yearSources.map((source) => source.category));
        const usages = uniqueValues(yearSources.map((source) => source.usage)).slice(0, 2);
        return {
          label: `${year}年度资料`,
          count: yearSources.length,
          unit: "项",
          detail: `${categories.join("、")}；${usages.join("；")}`,
        };
      });

  document.querySelector("#sourceOverview").innerHTML = `
    <div class="source-overview-head">
      <strong>今年数据已优先展示；历史参考已降级收纳</strong>
      <span>当前共采集整理 ${sources.length} 项公开资料，结构化 ${totalInventoryRows || sources.length} 条/行数据。2026数据用于展示当年招生规模和配额总量；2025及以前数据只作为分数风险的临时参照。</span>
    </div>
    <div class="source-year-grid">
      ${overviewCards
        .map(
          (item) => `
            <article class="source-year-card">
              <strong>${Number(item.count || 0).toLocaleString()} ${item.unit || "条"}</strong>
              <span>${item.label}</span>
              <p>${item.detail}${item.sourceFile ? ` 来源：${item.sourceFile}` : ""}</p>
            </article>
          `,
        )
        .join("")}
    </div>
    <details class="history-inventory">
      <summary>查看历史参考数据数量</summary>
      <div class="source-year-grid">
        ${historyInventory
          .map(
            (item) => `
              <article class="source-year-card muted-card">
                <strong>${Number(item.count || 0).toLocaleString()} ${item.unit || "条"}</strong>
                <span>${item.label}</span>
                <p>${item.detail}${item.sourceFile ? ` 来源：${item.sourceFile}` : ""}</p>
              </article>
            `,
          )
          .join("")}
      </div>
    </details>
  `;
}

function sourceStatusClass(status) {
  if (status.includes("已接入") || status.includes("已纳入") || status.includes("已解析") || status.includes("通过")) return "ready";
  if (status.includes("待") || status.includes("复核")) return "review";
  return "normal";
}

function integrateQuotaAllocationData() {
  const quota = state.quotaAllocation;
  if (!quota?.meta || !state.data) return;
  const meta = quota.meta;
  const inventory = state.data.dataInventory || [];
  state.data.dataSources = (state.data.dataSources || []).filter((source) => source.category !== "2026配额分配表");
  if (!inventory.some((item) => item.label === "2026配额分配表")) {
    inventory.push({
      label: "2026配额分配表",
      count: meta.grandTotal,
      unit: "个名额",
      detail: `覆盖 ${meta.unitCount} 个初中单元、${meta.highSchoolCount} 所高中；当前展示清晰合计核对表。`,
      sourceFile: meta.sourceFile,
    });
  }
  state.data.dataInventory = inventory;
}

function renderDataSources() {
  const sources = state.data.dataSources || [];
  const currentSources = sources.filter((source) => String(source.year || "").includes("2026"));
  const historySources = sources.filter((source) => !String(source.year || "").includes("2026"));
  const renderSourceCard = (source) => `
    <article class="source-card">
      <div class="source-main">
        <div class="source-head">
          <span class="source-year">${source.year}</span>
          <strong>${source.category}</strong>
          <span class="source-status ${sourceStatusClass(source.status)}">${source.status}</span>
        </div>
        <p>${source.title}</p>
        <span>${source.usage}</span>
      </div>
      <a href="${source.url}" target="_blank" rel="noopener noreferrer">查看来源</a>
    </article>
  `;
  document.querySelector("#sourceList").innerHTML = sources.length
    ? `
        <div class="current-source-group">
          ${currentSources.map(renderSourceCard).join("") || `<div class="form-note">暂无2026来源。</div>`}
        </div>
        <details class="history-source-group">
          <summary>展开查看2025及以前历史参考来源</summary>
          <div class="source-list-inner">
            ${historySources.map(renderSourceCard).join("")}
          </div>
        </details>
      `
    : `<div class="form-note">暂无来源清单。</div>`;
}

function renderBandTabs() {
  const counts = Object.fromEntries(bandOrder.map((band) => [band, 0]));
  state.results.forEach((item) => {
    counts[item.band] += 1;
  });
  document.querySelector("#bandTabs").innerHTML = bandOrder
    .map(
      (band) => `
        <button class="band-tab ${band === state.currentBand ? "active" : ""}" type="button" data-band="${band}">
          <strong>${band}</strong>
          <span>${counts[band]} 个志愿项</span>
        </button>
      `,
    )
    .join("");
  document.querySelectorAll(".band-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentBand = button.dataset.band;
      renderResults(getFormValues());
    });
  });
}

function renderResults(form) {
  const rankFromScore = getDistributionRank(form.score);
  const title = `${form.score} 分模拟测算`;
  document.querySelector("#resultTitle").textContent = title;
  const areaRankText = form.areaRank
    ? `${form.areaRank} 名`
    : form.estimatedAreaRank
      ? `按${form.region}分数段约 ${form.estimatedAreaRank} 名内`
      : "未填";
  document.querySelector("#rankChip").textContent = rankFromScore
    ? `全市约 ${rankFromScore} 名内，区域位次 ${areaRankText}`
    : "暂无分数段位次";
  document.querySelector("#subjectChip").textContent = form.subjectEligibility.generalEligible
    ? form.subjectEligibility.modelHighEligible
      ? "非计分：普高/示范门槛通过"
      : "非计分：普高通过，示范需核对"
    : "非计分：普通高中资格风险";

  renderQuotaSimulation(form);
  renderBandTabs();
  const list = state.results.filter((item) => item.band === state.currentBand).slice(0, 12);
  document.querySelector("#resultList").innerHTML = list.length
    ? list
        .map(
          (item) => `
            <article class="school-card ${chanceClass(item.band)}-card">
              <div>
                <h3>${item.school}</h3>
                <div class="school-meta">
                  <span class="tag">${item.batch}</span>
                  <span class="tag">${item.type}</span>
                  <span class="tag">${item.nature}</span>
                  <span class="tag">2025线 ${item.score}</span>
                  <span class="tag">差值 ${item.delta >= 0 ? "+" : ""}${Math.round(item.delta)}</span>
                  <span class="tag">${item.controlLineInfo ? `2026批次线${item.controlLineInfo.score}分${item.controlLineInfo.passed ? "已达" : "未达"}` : "2026批次线待核对"}</span>
                </div>
                <p class="school-address">${addressText(item)}</p>
                <p class="reason">${item.reason}</p>
              </div>
              <div class="chance ${chanceClass(item.band)}">
                <strong>${formatPercent(item.chance)}</strong>
                <span>录取机会</span>
              </div>
            </article>
          `,
        )
        .join("")
    : `<div class="empty-card">当前分组暂无结果，可调整分数、位次或偏好后重新测算。</div>`;
}

function renderQuotaSimulation(form) {
  const quotaMeta = state.quotaAllocation?.meta;
  const quotaItems = getQuotaMockCandidates()
    .map((school) => {
      const quotaMock = calculateQuotaMock(school, form);
      return {
        ...school,
        ...quotaMock,
        quotaLevel: quotaMockLevel(quotaMock.quotaChance),
        quotaClass: quotaMockClass(quotaMock.quotaChance),
      };
    });
  const candidates = quotaItems
    .filter((school) => !school.unifiedLikely && school.quotaChance > 1)
    .sort((a, b) => b.quotaChance - a.quotaChance || b.score - a.score)
    .slice(0, 8);

  document.querySelector("#quotaSummary").innerHTML = `
    <div><strong>毕业初中/单元</strong><span>${form.middleSchool || "未填写"}</span></div>
    <div><strong>配额资格排位</strong><span>${form.quotaRank || "未填写"}</span></div>
    <div><strong>配额数据</strong><span>${quotaMeta ? `已接入2026配额表：${quotaMeta.unitCount}个单元、${quotaMeta.highSchoolCount}所高中、合计${quotaMeta.grandTotal}名额` : "当前未导入高中到初中的配额分配表"}</span></div>
    <div><strong>第二阶段</strong><span>${quotaMeta ? "逐校矩阵校验完成后，再按本校名额和有效排位竞争" : "导入本校配额名额后，再按有效排位竞争"}</span></div>
  `;

  document.querySelector("#quotaList").innerHTML = form.hasQuota
    ? candidates.length
      ? candidates
        .map(
          (school) => `
            <article class="quota-card ${school.quotaClass}">
              <div>
                <h3>${school.school}</h3>
                <p>${school.batch} / ${school.type}</p>
                <p class="school-address">${addressText(school)}</p>
                <div class="quota-tags">
                  <span>2025线 ${school.score}</span>
                  <span>统招参考 ${formatPercent(school.unifiedChance)}</span>
                  <span>有效排位约 ${school.effectiveQuotaRank}</span>
                  <span>${formatPlanReference(school)}</span>
                  <span>${quotaMeta ? `全表合计${quotaMeta.grandTotal}名额` : "本校配额名额待导入"}</span>
                </div>
                <p class="quota-stage">${school.stageText}：${school.detailText}</p>
              </div>
              <div class="quota-score">
                <strong>${formatPercent(school.quotaChance)}</strong>
                <span>${school.quotaLevel}</span>
              </div>
            </article>
          `,
        )
        .join("")
      : `<div class="quota-empty">${quotaMeta ? "2026配额分配表已整理为清晰合计核对表；逐校逐单元矩阵仍在校验中，校验完成前不把它用于概率推荐。" : "当前没有可展示的配额学校。原因是尚未导入“高中-初中配额分配表”，系统不能把只有统招计划的学校当作配额学校推荐。"}</div>`
    : `<div class="quota-empty">当前未勾选具备配额资格。勾选后可进行配额模拟。</div>`;
}

function renderSchoolTable(filter = "") {
  const keyword = filter.trim().toLowerCase();
  const rows = state.data.schools
    .filter((school) => `${school.school} ${school.type} ${school.batch}`.toLowerCase().includes(keyword))
    .slice(0, 120);
  document.querySelector("#schoolTable").innerHTML = rows
    .map(
      (school) => `
        <tr>
          <td>${school.school}</td>
          <td>${school.batch}</td>
          <td>${school.type}</td>
          <td>${school.score}</td>
          <td>${school.planTotal ? `${school.planReferenceYear || 2025}年 ${school.planTotal}` : "计划未匹配"}</td>
          <td>${school.nature}</td>
          <td>${school.address || school.addressStatus || "地址待补充"}</td>
        </tr>
      `,
    )
    .join("");
}

function formatDateTime(timestamp) {
  if (!timestamp) return "未记录";
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString("zh-CN", { hour12: false });
}

function redemptionStatusLabel(status) {
  return {
    pending: "待核销",
    approved: "已核销",
    rejected: "已驳回",
  }[status] || status || "待核销";
}

function setHelpMessage(message, type = "") {
  const node = document.querySelector("#helpMessage");
  if (!node) return;
  node.textContent = message;
  node.dataset.type = type;
}

function renderHelpCommunity() {
  const balanceNode = document.querySelector("#helpPointBalance");
  const summaryNode = document.querySelector("#helpPointSummary");
  const listNode = document.querySelector("#helpPostList");
  const redemptionNode = document.querySelector("#redemptionList");
  if (!balanceNode || !summaryNode || !listNode || !redemptionNode) return;

  balanceNode.textContent = String(state.helpPointBalance || 0);
  summaryNode.textContent = `当前可用积分 ${state.helpPointBalance || 0}，审核通过回复 +10`;
  redemptionNode.innerHTML = state.helpRedemptions.length
    ? state.helpRedemptions
        .map(
          (item) => `
            <div>
              <strong>${escapeHtml(item.institutionName)}</strong>
              <span>${escapeHtml(redemptionStatusLabel(item.status))} · ${escapeHtml(item.points)} 积分 · ${escapeHtml(formatDateTime(item.createdAt))}</span>
            </div>
          `,
        )
        .join("")
    : `<div><span>暂无兑换申请。</span></div>`;

  listNode.innerHTML = state.helpPosts.length
    ? state.helpPosts
        .map(
          (post) => `
            <article class="help-post-card">
              <div class="help-post-main">
                <div>
                  <span class="help-author">${escapeHtml(post.author)} · ${escapeHtml(formatDateTime(post.createdAt))}</span>
                  <h3>${escapeHtml(post.title)}</h3>
                </div>
                <p>${escapeHtml(post.content)}</p>
              </div>
              <div class="help-replies">
                ${
                  post.replies?.length
                    ? post.replies
                        .map(
                          (reply) => `
                            <div class="help-reply">
                              <strong>${escapeHtml(reply.author)}</strong>
                              <span>${escapeHtml(formatDateTime(reply.createdAt))}</span>
                              <p>${escapeHtml(reply.content)}</p>
                            </div>
                          `,
                        )
                        .join("")
                    : `<div class="help-reply empty-reply">暂无已审核回复。</div>`
                }
              </div>
              <form class="help-reply-form" data-post-id="${escapeHtml(post.id)}">
                <textarea rows="2" maxlength="1000" placeholder="写下你的建议，审核通过后展示并增加 10 积分。"></textarea>
                <label><input type="checkbox" name="anonymous" /> 匿名回复</label>
                <button type="submit">提交回复</button>
              </form>
            </article>
          `,
        )
        .join("")
    : `<div class="empty-state"><strong>暂无求助帖</strong><span>可以发布第一个问题，邀请其他家长一起讨论。</span></div>`;

  listNode.querySelectorAll(".help-reply-form").forEach((form) => {
    form.addEventListener("submit", submitHelpReply);
  });
}

async function loadHelpCommunity() {
  if (!state.user) return;
  try {
    const payload = await authFetch("/api/help/posts?limit=80");
    state.helpPosts = payload.items || [];
    state.helpRules = payload.rules || null;
    state.helpPointBalance = payload.pointBalance || 0;
    state.helpRedemptions = payload.redemptions || [];
    renderHelpCommunity();
  } catch (error) {
    setHelpMessage(error.message, "error");
  }
}

async function submitHelpPost(event) {
  event.preventDefault();
  const title = document.querySelector("#helpPostTitle").value.trim();
  const content = document.querySelector("#helpPostContent").value.trim();
  const anonymous = document.querySelector("#helpPostAnonymous").checked;
  setHelpMessage("正在发布求助...");
  try {
    const payload = await authFetch("/api/help/posts", {
      method: "POST",
      body: JSON.stringify({ title, content, anonymous }),
    });
    document.querySelector("#helpPostForm").reset();
    setHelpMessage(payload.message || "求助已发布。", "success");
    await loadHelpCommunity();
  } catch (error) {
    setHelpMessage(error.message, "error");
  }
}

async function submitHelpReply(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const content = form.querySelector("textarea").value.trim();
  const anonymous = form.querySelector('input[name="anonymous"]').checked;
  setHelpMessage("正在提交回复...");
  try {
    const payload = await authFetch("/api/help/replies", {
      method: "POST",
      body: JSON.stringify({ postId: form.dataset.postId, content, anonymous }),
    });
    form.reset();
    setHelpMessage(payload.message || "回复已提交。", "success");
  } catch (error) {
    setHelpMessage(error.message, "error");
  }
}

async function submitCouponRedemption(event) {
  event.preventDefault();
  const institutionName = document.querySelector("#couponInstitution").value.trim();
  const points = Number(document.querySelector("#couponPoints").value || 0);
  setHelpMessage("正在提交兑换申请...");
  try {
    const payload = await authFetch("/api/help/coupon-redemptions", {
      method: "POST",
      body: JSON.stringify({ institutionName, points }),
    });
    document.querySelector("#couponForm").reset();
    setHelpMessage(payload.message || "兑换申请已提交。", "success");
    await loadHelpCommunity();
  } catch (error) {
    setHelpMessage(error.message, "error");
  }
}

function setupHelpCommunity() {
  document.querySelector("#helpPostForm")?.addEventListener("submit", submitHelpPost);
  document.querySelector("#couponForm")?.addEventListener("submit", submitCouponRedemption);
  document.querySelector("#refreshHelpButton")?.addEventListener("click", loadHelpCommunity);
}

function setupAdminSubmissionPanel() {
  if (!isAdmin()) return;
  if (document.querySelector("#submissionTable")) return;
  const dataSection = document.querySelector("#data");
  if (!dataSection) return;
  dataSection.insertAdjacentHTML(
    "beforeend",
    `
      <div class="panel admin-submissions-panel">
        <div class="panel-title">
          <div>
            <p class="eyebrow">Parent Submissions</p>
            <h2>用户测算表单</h2>
          </div>
          <button class="secondary-action compact-action" id="refreshSubmissionsButton" type="button">刷新</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>提交时间</th>
                <th>手机号</th>
                <th>分数</th>
                <th>区域</th>
                <th>毕业初中</th>
                <th>全市/区位次</th>
                <th>配额排位</th>
                <th>推荐摘要</th>
              </tr>
            </thead>
            <tbody id="submissionTable">
              <tr><td colspan="8">暂无提交记录</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `,
  );
  document.querySelector("#refreshSubmissionsButton").addEventListener("click", loadAdminSubmissions);
}

async function loadAdminSubmissions() {
  const table = document.querySelector("#submissionTable");
  if (!table || !state.user || !isAdmin()) return;
  try {
    const payload = await authFetch("/api/admin/calculator-submissions?limit=80");
    const items = payload.items || [];
    table.innerHTML = items.length
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
                <td>${summary}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="8">暂无提交记录</td></tr>`;
  } catch (error) {
    table.innerHTML = `<tr><td colspan="8">表单记录读取失败：${error.message}</td></tr>`;
  }
}

async function startApp(initialPage = getRequestedPage()) {
  setupAccountPanel();
  updateAuthVisibility();
  if (state.appReady) {
    setActivePage(initialPage, { replace: true });
    return;
  }
  initNavigation(initialPage);
  const response = await fetch(`./data/2025-simulation.json?v=${Date.now()}`, { cache: "no-store" });
  state.data = await response.json();
  const schoolInfoResponse = await fetch(`./data/school-info-2026.json?v=${Date.now()}`, { cache: "no-store" });
  state.schoolInfo = await schoolInfoResponse.json();
  await loadEducationNewsData();
  const competitionEventsResponse = await fetch(`./data/competition-events-2026.json?v=${Date.now()}`, { cache: "no-store" });
  state.competitionEvents = await competitionEventsResponse.json();
  try {
    const quotaAllocationResponse = await fetch(`./data/quota-allocation-2026.json?v=${Date.now()}`, { cache: "no-store" });
    state.quotaAllocation = quotaAllocationResponse.ok ? await quotaAllocationResponse.json() : null;
  } catch (error) {
    console.warn("2026配额分配表加载失败", error);
    state.quotaAllocation = null;
  }
  integrateQuotaAllocationData();
  document.querySelector("#dataStatus").textContent = state.quotaAllocation
    ? "2026计划、控制线、一分一段表、配额表与历史参考数据已加载"
    : "2026计划、控制线、一分一段表与历史参考数据已加载";
  renderMetrics();
  renderCurrentYearData();
  renderSourceOverview();
  renderDataSources();
  renderEducationNews();
  renderCompetitionEvents();
  renderSchoolTable();
  renderSchoolDirectories();
  setupSchoolHeaderSearch();
  setupHelpCommunity();
  await loadHelpCommunity();
  updateAutoRankInputs();
  updateQuotaRankHint();
  renderEmptyResults();
  renderCalculatorSchoolOptions();
  renderCalculatorSchoolLookup();
  [
    ["#scoreInput", "input"],
    ["#regionInput", "change"],
  ].forEach(([selector, eventName]) => {
    document.querySelector(selector).addEventListener(eventName, () => {
      updateAutoRankInputs();
      if (state.hasCalculated) runCalculation({ openDialog: false });
      renderCalculatorSchoolLookup();
    });
  });
  document.querySelector("#middleSchoolInput").addEventListener("input", () => {
    updateQuotaRankHint();
    if (state.hasCalculated) runCalculation({ openDialog: false });
  });
  document.querySelector("#calcForm").addEventListener("submit", (event) => {
    event.preventDefault();
    updateAutoRankInputs();
    updateQuotaRankHint();
    runCalculation();
  });
  document.querySelector("#openResultsButton").addEventListener("click", () => {
    if (state.hasCalculated) showResultDialog();
  });
  document.querySelector("#calculatorSchoolLookupForm").addEventListener("submit", (event) => {
    event.preventDefault();
    renderCalculatorSchoolLookup();
  });
  document.querySelector("#calculatorSchoolLookupInput").addEventListener("input", renderCalculatorSchoolLookup);
  document.querySelector("#resultDialogClose").addEventListener("click", closeResultDialog);
  document.querySelector("#resultDialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeResultDialog();
  });
  document.querySelector("#schoolSearch").addEventListener("input", (event) => {
    renderSchoolTable(event.target.value);
  });
  document.querySelector("#refreshEducationNewsButton")?.addEventListener("click", refreshEducationNewsData);
  state.appReady = true;
  updateAuthVisibility();
}

async function init() {
  setupAuthUi();
  state.user = await loadCurrentUser();
  updateAuthVisibility();
  if (state.user) {
    enterHomeAfterAuth();
    await startApp(HOME_PAGE_ID);
  }
}

init().catch((error) => {
  document.querySelector("#dataStatus").textContent = "数据加载失败";
  document.querySelector("#resultList").innerHTML = `<div class="panel form-note">${error.message}</div>`;
});
