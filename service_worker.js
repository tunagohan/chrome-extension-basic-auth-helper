const MAX_RETRY_PER_REQUEST = 2;
const requestAttempts = new Map();

async function getRules() {
  const result = await chrome.storage.local.get(["authRules"]);
  return Array.isArray(result.authRules) ? result.authRules : [];
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    const pathname =
      parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");

    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch {
    return String(url || "").trim().replace(/\/+$/, "");
  }
}

function matchUrl(ruleUrls, targetUrl) {
  if (!Array.isArray(ruleUrls) || ruleUrls.length === 0) return false;

  const normalizedTarget = normalizeUrl(targetUrl);
  return ruleUrls.some((url) => normalizeUrl(url) === normalizedTarget);
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

    try {
      const rules = await getRules();

      const matchedRule = rules.find((rule) => {
        return (
          rule &&
          rule.enabled !== false &&
          typeof rule.id === "string" &&
          typeof rule.password === "string" &&
          Array.isArray(rule.urls) &&
          matchUrl(rule.urls, details.url)
        );
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
    } catch (error) {
      console.error("onAuthRequired error:", error);
      callback({});
    }
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

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
