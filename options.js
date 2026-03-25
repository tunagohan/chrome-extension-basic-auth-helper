const rulesContainer = document.getElementById("rules");
const addRuleButton = document.getElementById("addRule");
const saveButton = document.getElementById("save");
const exportRulesButton = document.getElementById("exportRules");
const copyExportedJsonButton = document.getElementById("copyExportedJson");
const importRulesButton = document.getElementById("importRules");
const downloadRulesButton = document.getElementById("downloadRules");
const loadFileButton = document.getElementById("loadFileButton");
const importFileInput = document.getElementById("importFile");
const jsonArea = document.getElementById("jsonArea");
const message = document.getElementById("message");

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "crimson" : "green";
  setTimeout(() => {
    if (message.textContent === text) {
      message.textContent = "";
    }
  }, 3000);
}

function createRuleRow(rule = {}) {
  const row = document.createElement("div");
  row.className = "row";

  const idInput = document.createElement("input");
  idInput.type = "text";
  idInput.placeholder = "ID";
  idInput.value = rule.id || "";

  const passwordInput = document.createElement("input");
  passwordInput.type = "password";
  passwordInput.placeholder = "Password";
  passwordInput.value = rule.password || "";

  const urlPatternInput = document.createElement("input");
  urlPatternInput.type = "text";
  urlPatternInput.placeholder = "^https://example\\.com/?$";
  urlPatternInput.value = rule.urlPattern || "";

  const enabledInput = document.createElement("input");
  enabledInput.type = "checkbox";
  enabledInput.checked = rule.enabled !== false;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "削除";
  deleteButton.addEventListener("click", () => row.remove());

  row.appendChild(idInput);
  row.appendChild(passwordInput);
  row.appendChild(urlPatternInput);
  row.appendChild(enabledInput);
  row.appendChild(deleteButton);

  row.getValue = () => ({
    id: idInput.value.trim(),
    password: passwordInput.value,
    urlPattern: urlPatternInput.value.trim(),
    enabled: enabledInput.checked
  });

  return row;
}

async function getStoredRules() {
  const result = await chrome.storage.local.get(["authRules"]);
  return Array.isArray(result.authRules) ? result.authRules : [];
}

async function loadRules() {
  const rules = await getStoredRules();

  rulesContainer.innerHTML = "";

  if (rules.length === 0) {
    rulesContainer.appendChild(createRuleRow());
    jsonArea.value = "[]";
    return;
  }

  for (const rule of rules) {
    rulesContainer.appendChild(createRuleRow(rule));
  }

  jsonArea.value = JSON.stringify(rules, null, 2);
}

function validateRegex(pattern) {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

function normalizeRule(rawRule) {
  return {
    id: typeof rawRule.id === "string" ? rawRule.id.trim() : "",
    password: typeof rawRule.password === "string" ? rawRule.password : "",
    urlPattern: typeof rawRule.urlPattern === "string" ? rawRule.urlPattern.trim() : "",
    enabled: rawRule.enabled !== false
  };
}

function validateRules(rules) {
  if (!Array.isArray(rules)) {
    throw new Error("JSONは配列である必要があります");
  }

  rules.forEach((rawRule, index) => {
    if (typeof rawRule !== "object" || rawRule === null || Array.isArray(rawRule)) {
      throw new Error(`${index + 1}件目: オブジェクト形式ではありません`);
    }

    const rule = normalizeRule(rawRule);

    if (!rule.id) {
      throw new Error(`${index + 1}件目: id を入力してください`);
    }

    if (!rule.password) {
      throw new Error(`${index + 1}件目: password を入力してください`);
    }

    if (!rule.urlPattern) {
      throw new Error(`${index + 1}件目: urlPattern を入力してください`);
    }

    if (!validateRegex(rule.urlPattern)) {
      throw new Error(`${index + 1}件目: urlPattern の正規表現が不正です`);
    }
  });
}

function collectRulesFromForm() {
  return [...rulesContainer.children]
    .map((row) => row.getValue())
    .filter((rule) => rule.id || rule.password || rule.urlPattern)
    .map(normalizeRule);
}

function renderRules(rules) {
  rulesContainer.innerHTML = "";

  if (rules.length === 0) {
    rulesContainer.appendChild(createRuleRow());
    return;
  }

  for (const rule of rules) {
    rulesContainer.appendChild(createRuleRow(rule));
  }
}

async function saveRules() {
  try {
    const rules = collectRulesFromForm();
    validateRules(rules);
    await chrome.storage.local.set({ authRules: rules });
    jsonArea.value = JSON.stringify(rules, null, 2);
    showMessage("保存しました");
  } catch (error) {
    showMessage(error.message || "保存に失敗しました", true);
  }
}

async function exportRules() {
  try {
    const rules = await getStoredRules();
    jsonArea.value = JSON.stringify(rules, null, 2);
    showMessage("Exportしました");
  } catch (error) {
    showMessage(error.message || "Exportに失敗しました", true);
  }
}

async function copyExportedJson() {
  try {
    const text = jsonArea.value.trim();
    if (!text) {
      throw new Error("コピー対象のJSONがありません");
    }

    await navigator.clipboard.writeText(text);
    showMessage("JSONをコピーしました");
  } catch (error) {
    showMessage(error.message || "コピーに失敗しました", true);
  }
}

async function importRulesFromTextarea() {
  try {
    const text = jsonArea.value.trim();
    if (!text) {
      throw new Error("ImportするJSONを入力してください");
    }

    const parsed = JSON.parse(text);
    validateRules(parsed);

    const normalizedRules = parsed.map(normalizeRule);

    await chrome.storage.local.set({ authRules: normalizedRules });
    renderRules(normalizedRules);
    jsonArea.value = JSON.stringify(normalizedRules, null, 2);
    showMessage("Importしました");
  } catch (error) {
    showMessage(error.message || "Importに失敗しました", true);
  }
}

function downloadRules() {
  try {
    const text = jsonArea.value.trim();
    if (!text) {
      throw new Error("ダウンロードするJSONがありません");
    }

    JSON.parse(text);

    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const filename = `basic-auth-rules-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
    showMessage("JSONをダウンロードしました");
  } catch (error) {
    showMessage(error.message || "ダウンロードに失敗しました", true);
  }
}

function loadJsonFile(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const text = String(reader.result || "");
      const parsed = JSON.parse(text);
      validateRules(parsed);

      const normalizedRules = parsed.map(normalizeRule);
      jsonArea.value = JSON.stringify(normalizedRules, null, 2);
      renderRules(normalizedRules);
      showMessage("JSONファイルを読み込みました。必要なら Import JSONを反映 を押してください");
    } catch (error) {
      showMessage(error.message || "JSONファイルの読み込みに失敗しました", true);
    }
  };

  reader.onerror = () => {
    showMessage("ファイルの読み込みに失敗しました", true);
  };

  reader.readAsText(file, "utf-8");
}

addRuleButton.addEventListener("click", () => {
  rulesContainer.appendChild(createRuleRow());
});

saveButton.addEventListener("click", saveRules);
exportRulesButton.addEventListener("click", exportRules);
copyExportedJsonButton.addEventListener("click", copyExportedJson);
importRulesButton.addEventListener("click", importRulesFromTextarea);
downloadRulesButton.addEventListener("click", downloadRules);

loadFileButton.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  loadJsonFile(file);
  event.target.value = "";
});

loadRules();
