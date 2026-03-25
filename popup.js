const totalCountEl = document.getElementById("totalCount");
const enabledCountEl = document.getElementById("enabledCount");
const ruleListEl = document.getElementById("ruleList");
const openOptionsButton = document.getElementById("openOptions");
const reloadButton = document.getElementById("reload");

function normalizeRule(rawRule) {
  return {
    id: typeof rawRule?.id === "string" ? rawRule.id.trim() : "",
    password: typeof rawRule?.password === "string" ? rawRule.password : "",
    urls: Array.isArray(rawRule?.urls)
      ? rawRule.urls.map((url) => String(url).trim()).filter(Boolean)
      : [],
    enabled: rawRule?.enabled !== false
  };
}

async function getStoredRules() {
  const result = await chrome.storage.local.get(["authRules"]);
  return Array.isArray(result.authRules) ? result.authRules : [];
}

function renderRules(rules) {
  const normalizedRules = rules.map(normalizeRule);
  const enabledRules = normalizedRules.filter((rule) => rule.enabled);

  totalCountEl.textContent = String(normalizedRules.length);
  enabledCountEl.textContent = String(enabledRules.length);

  ruleListEl.innerHTML = "";

  if (normalizedRules.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "empty";
    emptyEl.textContent = "登録されているルールはありません。";
    ruleListEl.appendChild(emptyEl);
    return;
  }

  normalizedRules.forEach((rule) => {
    const ruleEl = document.createElement("div");
    ruleEl.className = "rule";

    const headerEl = document.createElement("div");
    headerEl.className = "rule-header";

    const idEl = document.createElement("div");
    idEl.className = "rule-id";
    idEl.textContent = rule.id || "(ID未設定)";

    const badgeEl = document.createElement("span");
    badgeEl.className = `badge ${rule.enabled ? "enabled" : "disabled"}`;
    badgeEl.textContent = rule.enabled ? "有効" : "無効";

    headerEl.appendChild(idEl);
    headerEl.appendChild(badgeEl);

    const urlsEl = document.createElement("div");
    urlsEl.className = "urls";

    if (rule.urls.length === 0) {
      urlsEl.textContent = "URL未設定";
    } else {
      rule.urls.forEach((url) => {
        const urlItemEl = document.createElement("div");
        urlItemEl.className = "url-item";
        urlItemEl.textContent = `- ${url}`;
        urlsEl.appendChild(urlItemEl);
      });
    }

    ruleEl.appendChild(headerEl);
    ruleEl.appendChild(urlsEl);
    ruleListEl.appendChild(ruleEl);
  });
}

async function loadPopup() {
  const rules = await getStoredRules();
  renderRules(rules);
}

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

reloadButton.addEventListener("click", () => {
  loadPopup();
});

loadPopup();
