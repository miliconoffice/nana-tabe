// ============ Supabase 初始化 ============
let supabase = null;
try {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn("Supabase 初始化失败，使用离线模式", e);
}

// ============ 本地存储工具 ============
const LS = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem("qihao_" + key)) || fallback; }
    catch { return fallback; }
  },
  set(key, val) {
    localStorage.setItem("qihao_" + key, JSON.stringify(val));
  }
};

// ============ 状态 ============
let currentUser = null;
let userPrefs = { 忌口: [], 偏好_tags: {}, 腻了: [] };
let history = [];
let currentFood = null;

// ============ DOM 引用 ============
const $ = id => document.getElementById(id);
const foodCard = $("food-card");
const foodEmoji = $("food-emoji");
const foodName = $("food-name");
const foodTags = $("food-tags");
const periodBadge = $("period-badge");
const historyList = $("history-list");
const settingsPanel = $("settings-panel");
const settingsLoginHint = $("settings-login-hint");
const jikouTags = $("jikou-tags");
const prefTags = $("pref-tags");
const nileTags = $("nile-tags");
const authModal = $("auth-modal");
const emailForm = $("email-form");
const loginBtn = $("login-btn");
const logoutBtn = $("logout-btn");

const entry = $("entry");
const result = $("result");

(async () => {
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        currentUser = data.session.user;
        await loadFromSupabase();
      } else {
        loadFromLocal();
      }
    } catch (e) {
      console.warn("Auth check 失败", e);
      loadFromLocal();
    }
  } else {
    loadFromLocal();
  }
  updateAuthUI();
  renderHistory();
})();

if (supabase) {
  supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    currentUser = session.user;
    // 迁移本地数据到 Supabase
    const localPrefs = LS.get("prefs", null);
    const localHistory = LS.get("history", []);
    if (localPrefs) {
      // 合并忌口和偏好
      const remotePrefs = await loadPrefsFromSupabase();
      const mergedJikou = [...new Set([...(remotePrefs.忌口 || []), ...(localPrefs.忌口 || [])])];
      const mergedTags = { ...(remotePrefs.偏好_tags || {}), ...(localPrefs.偏好_tags || {}) };
      userPrefs.忌口 = mergedJikou;
      userPrefs.偏好_tags = mergedTags;
      userPrefs.腻了 = [...new Set([...(remotePrefs.腻了 || []), ...(localPrefs.腻了 || [])])];
      await savePrefsToSupabase();
      localStorage.removeItem("qihao_prefs");
    }
    if (localHistory.length > 0) {
      for (const h of localHistory.slice(0, 10)) {
        await supabase.from("food_history").insert({
          user_id: currentUser.id,
          food_name: h.food_name,
          action: h.action,
          created_at: h.created_at
        });
      }
      localStorage.removeItem("qihao_history");
    }
    await loadFromSupabase();
  } else {
    currentUser = null;
    loadFromLocal();
  }
  updateAuthUI();
  renderHistory();
  renderSettingsPrefs();
  });
}

// ============ 数据加载 ============
function loadFromLocal() {
  userPrefs = LS.get("prefs", { 忌口: [], 偏好_tags: {}, 腻了: [] });
  history = LS.get("history", []).slice(-10);
  renderHistory();
}

async function loadFromSupabase() {
  await loadPrefsFromSupabase();
  await loadHistoryFromSupabase();
}

async function loadPrefsFromSupabase() {
  const { data } = await supabase.from("preferences").select("*").eq("user_id", currentUser.id).single();
  if (data) {
    userPrefs.忌口 = data.忌口 || [];
    userPrefs.偏好_tags = data.偏好_tags || {};
    userPrefs.腻了 = data.腻了 || [];
  }
  return userPrefs;
}

async function savePrefsToSupabase() {
  await supabase.from("preferences").upsert({
    user_id: currentUser.id,
    忌口: userPrefs.忌口,
    偏好_tags: userPrefs.偏好_tags,
    腻了: userPrefs.腻了,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
}

async function loadHistoryFromSupabase() {
  const { data } = await supabase.from("food_history")
    .select("*").eq("user_id", currentUser.id)
    .order("created_at", { ascending: false }).limit(10);
  history = data || [];
  renderHistory();
}

function savePrefs() {
  if (currentUser) {
    savePrefsToSupabase();
  } else {
    LS.set("prefs", userPrefs);
  }
}

async function addHistory(foodName, action) {
  const entry = { food_name: foodName, action, created_at: new Date().toISOString() };
  if (currentUser) {
    const { data } = await supabase.from("food_history").insert({
      user_id: currentUser.id, food_name: foodName, action, created_at: entry.created_at
    }).select().single();
    if (data) entry.id = data.id;
  }
  history.unshift(entry);
  if (history.length > 10) history.pop();
  if (!currentUser) LS.set("history", history);
  renderHistory();
}

// ============ Auth UI ============
function updateAuthUI() {
  if (currentUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    settingsLoginHint.classList.add("hidden");
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    settingsLoginHint.classList.remove("hidden");
  }
}

// ============ 登录弹窗 ============
loginBtn.addEventListener("click", () => authModal.classList.remove("hidden"));
$("auth-close").addEventListener("click", () => authModal.classList.add("hidden"));
authModal.addEventListener("click", (e) => {
  if (e.target === authModal) authModal.classList.add("hidden");
});
$("settings-login-link").addEventListener("click", (e) => {
  e.preventDefault();
  settingsPanel.classList.add("hidden");
  authModal.classList.remove("hidden");
});

$("login-github-btn").addEventListener("click", async () => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "github" });
  if (error) alert("登录失败: " + error.message);
});

$("login-email-btn").addEventListener("click", () => emailForm.classList.toggle("hidden"));

$("email-submit").addEventListener("click", async () => {
  const email = $("email-input").value.trim();
  if (!email) return alert("请输入邮箱");
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) alert("发送失败: " + error.message);
  else {
    alert("魔法链接已发送！请查收邮件 ✉️");
    authModal.classList.add("hidden");
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
});

// ============ 食物选择逻辑 ============
function pickFood() {
  const period = getPeriod();
  const rules = FOOD_DB.时段规则[period] || { 排除: [], 偏向: [] };
  periodBadge.textContent = period;

  const jikou = new Set([...userPrefs.忌口, ...FOOD_DB.忌口]);
  const nile = new Set(userPrefs.腻了);

  let candidates = FOOD_DB.基础库.filter(f => {
    if (jikou.has(f.name) || nile.has(f.name)) return false;
    if (f.tags.some(t => rules.排除.includes(t))) return false;
    return true;
  });

  if (candidates.length === 0) {
    userPrefs.腻了 = [];
    savePrefs();
    candidates = FOOD_DB.基础库.filter(f => {
      if (jikou.has(f.name)) return false;
      if (f.tags.some(t => rules.排除.includes(t))) return false;
      return true;
    });
  }

  if (candidates.length === 0) {
    currentFood = { name: "七号今天什么都吃不了……", emoji: "😢", tags: [] };
    renderFood();
    return;
  }

  const weights = candidates.map(f => {
    let w = 1;
    for (const t of f.tags) {
      if (rules.偏向.includes(t)) w *= 1.5;
      w *= (userPrefs.偏好_tags[t] || 1);
    }
    return w;
  });

  const totalWeight = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * totalWeight;
  let idx = 0;
  for (; idx < candidates.length; idx++) {
    r -= weights[idx];
    if (r <= 0) break;
  }
  currentFood = candidates[Math.min(idx, candidates.length - 1)];
  renderFood();
}

function renderFood() {
  foodCard.classList.add("rolling");
  setTimeout(() => {
    foodEmoji.textContent = currentFood.emoji;
    foodName.textContent = currentFood.name;
    foodTags.innerHTML = currentFood.tags.map(t => `<span class="tag">${t}</span>`).join("");
    foodCard.classList.remove("rolling");
  }, 200);
}

// ============ 按钮事件 ============
$("btn-start").addEventListener("click", () => {
  entry.classList.add("hidden");
  result.classList.remove("hidden");
  pickFood();
});
$("btn-refresh").addEventListener("click", () => pickFood());

$("btn-nile").addEventListener("click", async () => {
  if (!currentFood || currentFood.name.includes("什么都吃不了")) return;
  userPrefs.腻了.push(currentFood.name);
  if (userPrefs.腻了.length > 10) userPrefs.腻了 = userPrefs.腻了.slice(-10);
  savePrefs();
  await addHistory(currentFood.name, "nile");
  pickFood();
  renderSettingsPrefs();
});

$("btn-keep").addEventListener("click", async () => {
  if (!currentFood || currentFood.name.includes("什么都吃不了")) return;
  await addHistory(currentFood.name, "keep");
  $("btn-keep").style.transform = "scale(1.1)";
  setTimeout(() => $("btn-keep").style.transform = "", 200);
});

// ============ 历史渲染 ============
function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-hint">还没有记录哦～</p>';
    return;
  }
  historyList.innerHTML = history.map(h => {
    const icon = h.action === "keep" ? "✅" : "😮‍💨";
    const time = new Date(h.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    return `<div class="history-item">${icon} ${h.food_name} <span class="time">${time}</span></div>`;
  }).join("");
}

// ============ 设置面板 ============
$("settings-btn").addEventListener("click", () => {
  settingsPanel.classList.remove("hidden");
  updateAuthUI();
  renderSettingsPrefs();
});

$("settings-close").addEventListener("click", () => settingsPanel.classList.add("hidden"));
settingsPanel.addEventListener("click", (e) => {
  if (e.target === settingsPanel) settingsPanel.classList.add("hidden");
});

// 忌口
$("jikou-add").addEventListener("click", addJikou);
$("jikou-input").addEventListener("keydown", (e) => { if (e.key === "Enter") addJikou(); });

async function addJikou() {
  const input = $("jikou-input");
  const val = input.value.trim();
  if (!val) return;
  if (!userPrefs.忌口.includes(val)) {
    userPrefs.忌口.push(val);
    savePrefs();
    renderSettingsPrefs();
  }
  input.value = "";
}

function removeJikou(item) {
  userPrefs.忌口 = userPrefs.忌口.filter(x => x !== item);
  savePrefs();
  renderSettingsPrefs();
}

// 偏好 tags
function renderSettingsPrefs() {
  jikouTags.innerHTML = userPrefs.忌口.map(x =>
    `<span class="tag">${x}<span class="remove" data-jikou="${x}">×</span></span>`
  ).join("");
  jikouTags.querySelectorAll(".remove").forEach(el => {
    el.addEventListener("click", () => removeJikou(el.dataset.jikou));
  });

  prefTags.innerHTML = ALL_TAGS.map(t => {
    const active = (userPrefs.偏好_tags[t] || 0) >= 1.5;
    return `<span class="tag${active ? " selected" : ""}" data-tag="${t}">${t}</span>`;
  }).join("");
  prefTags.querySelectorAll(".tag").forEach(el => {
    el.addEventListener("click", () => {
      const tag = el.dataset.tag;
      if (userPrefs.偏好_tags[tag] && userPrefs.偏好_tags[tag] >= 1.5) {
        delete userPrefs.偏好_tags[tag];
      } else {
        userPrefs.偏好_tags[tag] = 2;
      }
      savePrefs();
      renderSettingsPrefs();
    });
  });

  nileTags.innerHTML = userPrefs.腻了.map(x =>
    `<span class="tag">${x}<span class="remove" data-nile="${x}">×</span></span>`
  ).join("");
  nileTags.querySelectorAll(".remove").forEach(el => {
    el.addEventListener("click", () => {
      userPrefs.腻了 = userPrefs.腻了.filter(f => f !== el.dataset.nile);
      savePrefs();
      renderSettingsPrefs();
    });
  });
}

$("clear-nile").addEventListener("click", () => {
  userPrefs.腻了 = [];
  savePrefs();
  renderSettingsPrefs();
});
