const MAX_RETRY_PER_REQUEST = 2;

// requestIdごとの認証試行回数を保持
const requestAttempts = new Map();

/**
 * 保存データ例:
 * [
 *   {
 *     id: "user1",
 *     password: "pass1",
 *     urlPattern: "^https://(?:(?:(?:feature\\d*|develop)-)?work\\.andpaddev\\.xyz|staging(?:3)?\\.andpaddev\\.xyz)/?$",
 *     enabled: true
 *   }
 * ]
 */

async function getRules() {
  const result = await chrome.storage.local.get(["authRules"]);
  return Array.isArray(result.authRules) ? result.authRules : [];
}

function safeTestRegex(pattern, url) {
  try {
    const re = new RegExp(pattern);
    return re.test(url);
  } catch (e) {
    console.warn("Invalid regex:", pattern, e);
    return false;
  }
}

chrome.webRequest.onAuthRequired.addListener(
  async (details, callback) => {
    const requestId = details.requestId;
    const count = requestAttempts.get(requestId) || 0;

    if (count >= MAX_RETRY_PER_REQUEST) {
      callback({});
      return;
    }

    requestAttempts.set(requestId, count + 1);

    const rules = await getRules();

    const matchedRule = rules.find((rule) => {
      return rule.enabled !== false &&
        typeof rule.id === "string" &&
        typeof rule.password === "string" &&
        typeof rule.urlPattern === "string" &&
        safeTestRegex(rule.urlPattern, details.url);
    });

    if (!matchedRule) {
      callback({});
      return;
    }

    callback({
      authCredentials: {
        username: matchedRule.id,
        password: matchedRule.password
      }
    });
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

// リクエスト完了後に掃除
chrome.webRequest.onCompleted.addListener(
  (details) => {
    requestAttempts.delete(details.requestId);
  },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    requestAttempts.delete(details.requestId);
  },
  { urls: ["<all_urls>"] }
);
