const RULESET_ID = "ad_rules";
const ALLOW_BASE = 100000;
const ALLOW_END = 199999;
const USER_FILTER_BASE = 200000;
const USER_FILTER_END = 299999;
const PAUSE_RULE_BASE = 300000;
const PAUSE_RULE_END = 309999;
let hiddenCountQueue = Promise.resolve();

const HISTORY_LIMIT = 500;
const HISTORY_MAX_AGE_DAYS = 30;
const PAUSE_ALARM_PREFIX = "adzero-site-pause:";

function getRuleSource(ruleId) {
  if (ruleId >= USER_FILTER_BASE && ruleId <= USER_FILTER_END) return "my-filter";
  if (ruleId >= ALLOW_BASE && ruleId <= ALLOW_END) return "site-exception";
  if (ruleId >= 1 && ruleId < 100000) return "adzero-filter";
  return "unknown";
}

async function recordBlockedRequest(info) {
  try {
    if (!info || !info.request || typeof info.request.url !== "string") return;
    const source = getRuleSource(info.rule.ruleId);
    // Only record block rules. Allow/exception matches are not blocked requests.
    if (source === "site-exception") return;
    if (source === "my-filter") {
      const { myFilters = [] } = await chrome.storage.local.get({ myFilters: [] });
      const idx = info.rule.ruleId - USER_FILTER_BASE;
      if (!myFilters[idx] || myFilters[idx].action !== "block" || myFilters[idx].enabled === false) return;
    }
    const url = new URL(info.request.url);
    const now = Number.isFinite(info.timeStamp) ? info.timeStamp : Date.now();
    const { blockHistory = [] } = await chrome.storage.local.get({ blockHistory: [] });
    const history = Array.isArray(blockHistory) ? blockHistory : [];
    const key = `${url.href}|${source}|${info.rule.ruleId}`;
    const existing = history.find(item => item.key === key && now - item.lastSeen < 24 * 60 * 60 * 1000);
    if (existing) {
      existing.count = Math.min(1000000000, (existing.count || 0) + 1);
      existing.lastSeen = now;
      existing.status = "blocked";
    } else {
      history.unshift({
        id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
        key, url: url.href, domain: url.hostname, firstSeen: now, lastSeen: now,
        count: 1, category: info.request.type || "other", status: "blocked",
        source, ruleId: info.rule.ruleId, initiator: info.request.initiator || ""
      });
    }
    const cutoff = now - HISTORY_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const trimmed = history.filter(item => Number.isFinite(item.lastSeen) && item.lastSeen >= cutoff)
      .sort((a,b) => b.lastSeen-a.lastSeen).slice(0, HISTORY_LIMIT);
    await chrome.storage.local.set({ blockHistory: trimmed });
  } catch (error) {
    console.warn("ADZERO history recording unavailable:", error);
  }
}


function normalizeDomain(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase().replace(/\.$/, "");
  if (!raw || raw.length > 253 || raw.includes("/") || raw.includes("@") || raw.includes(":")) return null;
  let hostname;
  try {
    hostname = new URL(`http://${raw}`).hostname.toLowerCase().replace(/\.$/, "");
  } catch (_) {
    return null;
  }
  if (!hostname || hostname.length > 253 || hostname.split(".").some(label =>
    !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  )) return null;
  return hostname;
}

async function syncAllowlist() {
  const { allowlist = [], sitePauses = [] } = await chrome.storage.local.get({ allowlist: [], sitePauses: [] });
  const now = Date.now();
  const activePauses = (Array.isArray(sitePauses) ? sitePauses : []).filter(x =>
    x && normalizeDomain(x.domain) && Number.isFinite(x.expiresAt) && x.expiresAt > now
  );
  const permanent = [...new Set((Array.isArray(allowlist) ? allowlist : []).map(normalizeDomain).filter(Boolean))].slice(0, 1000);
  const normalized = permanent;

  // Keep permanent exclusions separate from temporary pauses.
  if (JSON.stringify(permanent) !== JSON.stringify(allowlist)) {
    await chrome.storage.local.set({ allowlist: permanent });
  }

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.filter(rule =>
    (rule.id >= ALLOW_BASE && rule.id <= ALLOW_END) || (rule.id >= PAUSE_RULE_BASE && rule.id <= PAUSE_RULE_END)
  ).map(rule => rule.id);
  const addRules = normalized.map((domain, index) => ({
    id: ALLOW_BASE + index,
    priority: 2,
    action: { type: "allow" },
    condition: {
      initiatorDomains: [domain],
      resourceTypes: ["script", "image", "xmlhttprequest", "sub_frame", "media", "ping", "other"]
    }
  }));

  const pauseRules = activePauses.slice(0, PAUSE_RULE_END - PAUSE_RULE_BASE + 1).map((pause, index) => ({
    id: PAUSE_RULE_BASE + index,
    priority: 5,
    action: { type: "allow" },
    condition: { initiatorDomains: [normalizeDomain(pause.domain)] }
  }));
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: [...addRules, ...pauseRules] });
  // Alarms restore protection even if the browser is restarted during a pause.
  const alarms = await chrome.alarms.getAll();
  for (const alarm of alarms) if (alarm.name.startsWith(PAUSE_ALARM_PREFIX)) await chrome.alarms.clear(alarm.name);
  for (const pause of activePauses) {
    const domain = normalizeDomain(pause.domain);
    chrome.alarms.create(PAUSE_ALARM_PREFIX + domain, { when: pause.expiresAt });
  }
  if (activePauses.length !== (Array.isArray(sitePauses) ? sitePauses.length : 0)) {
    await chrome.storage.local.set({ sitePauses: activePauses });
  }
}


function normalizeUserFilter(filter) {
  if (!filter || typeof filter !== "object") return null;
  const action = filter.action === "allow" ? "allow" : filter.action === "block" ? "block" : null;
  if (!action) return null;
  const enabled = filter.enabled !== false;
  const target = typeof filter.target === "string" ? filter.target.trim() : "";
  if (!target || target.length > 2048) return null;

  if (filter.targetType === "url") {
    let parsed;
    try { parsed = new URL(target); } catch (_) { return null; }
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    const normalized = `${parsed.origin}${parsed.pathname}${parsed.search}`;
    return { target: normalized, targetType: "url", action, enabled, ...(Number.isFinite(filter.createdAt) ? { createdAt: filter.createdAt } : {}), ...(Number.isFinite(filter.updatedAt) ? { updatedAt: filter.updatedAt } : {}) };
  }

  const domain = normalizeDomain(target);
  if (!domain) return null;
  return { target: domain, targetType: "domain", action, enabled, ...(Number.isFinite(filter.createdAt) ? { createdAt: filter.createdAt } : {}), ...(Number.isFinite(filter.updatedAt) ? { updatedAt: filter.updatedAt } : {}) };
}

async function syncUserFilters() {
  const { myFilters = [], enabled = true } = await chrome.storage.local.get({ myFilters: [], enabled: true });
  const normalized = [];
  const seen = new Set();
  for (const item of (Array.isArray(myFilters) ? myFilters : []).slice(0, 1000)) {
    const rule = normalizeUserFilter(item);
    if (!rule) continue;
    const key = `${rule.targetType}|${rule.target}|${rule.action}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(rule);
  }
  if (JSON.stringify(normalized) !== JSON.stringify(myFilters)) {
    await chrome.storage.local.set({ myFilters: normalized });
  }

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing
    .filter(rule => rule.id >= USER_FILTER_BASE && rule.id <= USER_FILTER_END)
    .map(rule => rule.id);
  const addRules = normalized.flatMap((rule, index) => {
    if (!enabled || !rule.enabled) return [];
    const escapeUrlFilter = value => value.replace(/[\\*^|]/g, "\\$&");
    const condition = rule.targetType === "domain"
      ? { urlFilter: `||${rule.target}^` }
      : { urlFilter: `|${escapeUrlFilter(rule.target)}` };
    return [{
      id: USER_FILTER_BASE + index,
      priority: rule.action === "allow" ? 4 : 3,
      action: { type: rule.action },
      condition
    }];
  });
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

async function setProtection(enabled) {
  if (typeof enabled !== "boolean") { const state = await chrome.storage.local.get({ enabled: true }); enabled = state.enabled !== false; }
  const { enabledPacks = { ads: true, trackers: true } } = await chrome.storage.local.get({ enabledPacks: { ads: true, trackers: true } });
  const packs = enabledPacks && typeof enabledPacks === "object" ? enabledPacks : {};
  const enableRuleIds = enabled ? [ ...(packs.ads !== false ? ["ad_rules"] : []), ...(packs.trackers !== false ? ["tracker_rules"] : []) ] : [];
  const disableRuleIds = ["ad_rules", "tracker_rules"].filter(id => !enableRuleIds.includes(id));
  await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: enableRuleIds, disableRulesetIds: disableRuleIds });
}

async function initialize() {
  const settings = await chrome.storage.local.get(["enabled", "allowlist", "hiddenCount", "language", "myFilters", "enabledPacks", "protectionMode"]);
  const init = {};
  if (settings.enabled === undefined) init.enabled = true;
  if (!Array.isArray(settings.allowlist)) init.allowlist = [];
  if (!Array.isArray(settings.myFilters)) init.myFilters = [];
  if (!settings.enabledPacks || typeof settings.enabledPacks !== "object") init.enabledPacks = { ads: true, trackers: true };
  if (!["standard", "strict", "custom"].includes(settings.protectionMode)) init.protectionMode = "custom";
  if (!Array.isArray(settings.elementRules)) init.elementRules = [];
  if (!Array.isArray(settings.sitePauses)) init.sitePauses = [];
  if (!Number.isSafeInteger(settings.hiddenCount) || settings.hiddenCount < 0) init.hiddenCount = 0;
  if (!["ru", "en"].includes(settings.language)) init.language = "ru";
  if (Object.keys(init).length) await chrome.storage.local.set(init);

  await syncAllowlist();
  await syncUserFilters();
  await setProtection(settings.enabled !== false);
}

chrome.runtime.onInstalled.addListener(() => {
  initialize().catch(error => console.error("ADZERO initialization failed:", error));
});

chrome.runtime.onStartup.addListener(async () => {
  const { enabled = true } = await chrome.storage.local.get({ enabled: true });
  await setProtection(enabled);
  await syncAllowlist();
  await syncUserFilters();
});

async function recordYoutubeDiagnostic(message) {
  const allowedKinds = new Set(["player", "overlay", "feed", "skip"]);
  if (!message || !allowedKinds.has(message.kind) || message.active !== true) return;
  const timestamp = Number.isFinite(message.timestamp) ? Math.min(Date.now(), message.timestamp) : Date.now();
  try {
    const { youtubeDiagnostics = { counts: {}, events: [] } } = await chrome.storage.local.get({ youtubeDiagnostics: { counts: {}, events: [] } });
    const state = youtubeDiagnostics && typeof youtubeDiagnostics === "object" ? youtubeDiagnostics : { counts: {}, events: [] };
    const counts = state.counts && typeof state.counts === "object" ? state.counts : {};
    const events = Array.isArray(state.events) ? state.events : [];
    counts[message.kind] = Math.min(1000000, (Number(counts[message.kind]) || 0) + 1);
    events.unshift({ kind: message.kind, timestamp });
    await chrome.storage.local.set({
      youtubeDiagnostics: {
        counts,
        events: events.filter(item => item && Number.isFinite(item.timestamp)).slice(0, 100),
        updatedAt: Date.now()
      }
    });
  } catch (error) {
    console.warn("ADZERO YouTube diagnostics unavailable:", error);
  }
}

chrome.runtime.onMessage.addListener(message => {
  if (message?.type === "youtube-diagnostic") {
    recordYoutubeDiagnostic(message);
    return;
  }
  if (message?.type !== "hidden-count" ||
      !Number.isSafeInteger(message.count) || message.count <= 0) return;

  // Serialize read-modify-write operations to avoid losing concurrent increments.
  hiddenCountQueue = hiddenCountQueue.then(async () => {
    const { hiddenCount = 0 } = await chrome.storage.local.get({ hiddenCount: 0 });
    const current = Number.isSafeInteger(hiddenCount) && hiddenCount >= 0 ? hiddenCount : 0;
    const next = Math.min(Number.MAX_SAFE_INTEGER, current + message.count);
    await chrome.storage.local.set({ hiddenCount: next });
  }).catch(error => console.error("ADZERO counter update failed:", error));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.enabled || changes.enabledPacks) {
    setProtection(changes.enabled ? changes.enabled.newValue !== false : undefined)
      .then(() => syncUserFilters())
      .catch(error => console.error("ADZERO protection update failed:", error));
  }
  if (changes.allowlist || changes.sitePauses) {
    syncAllowlist().catch(error => console.error("ADZERO allowlist update failed:", error));
  }
  if (changes.myFilters) {
    syncUserFilters().catch(error => console.error("ADZERO user filters update failed:", error));
  }
});

// DNR match diagnostics are available only when the browser exposes the feedback API.
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(recordBlockedRequest);
}

chrome.alarms.onAlarm.addListener(async alarm => {
  if (!alarm.name.startsWith(PAUSE_ALARM_PREFIX)) return;
  const domain = alarm.name.slice(PAUSE_ALARM_PREFIX.length);
  const { sitePauses = [] } = await chrome.storage.local.get({ sitePauses: [] });
  const remaining = (Array.isArray(sitePauses) ? sitePauses : []).filter(x => x.domain !== domain || x.expiresAt > Date.now());
  await chrome.storage.local.set({ sitePauses: remaining });
  await syncAllowlist();
});
