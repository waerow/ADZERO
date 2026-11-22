(() => {
  "use strict";
  if (!/(^|\\.)youtube\\.com$/i.test(location.hostname)) return;

  // Best-effort handling for ads that expose YouTube's native Skip control.
  // This does not claim to remove non-skippable or server-stitched ad streams.
  const SKIP_SELECTORS = [
    ".ytp-ad-skip-button:not([disabled])",
    ".ytp-ad-skip-button-modern:not([disabled])",
    ".ytp-skip-ad-button:not([disabled])",
    ".ytp-ad-skip-button-container button:not([disabled])",
    "#movie_player button[aria-label*='Skip ad']:not([disabled])",
    "#movie_player button[aria-label*='Skip ads']:not([disabled])",
    "#movie_player button[aria-label*='Пропустить']:not([disabled])"
  ].join(",");

  let protectionActive = true;
  let lastButton = null;
  let lastAttemptAt = 0;
  let observer = null;
  let poll = null;

  async function refreshProtection() {
    try {
      const data = await chrome.storage.local.get({ enabled: true, allowlist: [], sitePauses: [] });
      const host = location.hostname.toLowerCase();
      const allowlist = Array.isArray(data.allowlist) ? data.allowlist : [];
      const excepted = allowlist.some(domain => typeof domain === "string" && (host === domain || host.endsWith("." + domain)));
      const paused = (Array.isArray(data.sitePauses) ? data.sitePauses : []).some(item =>
        item && item.domain === host && Number.isFinite(item.expiresAt) && item.expiresAt > Date.now()
      );
      protectionActive = data.enabled !== false && !excepted && !paused;
    } catch (_) {
      protectionActive = false;
    }
  }

  function isVisible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) !== 0;
  }

  function trySkipAd() {
    if (!protectionActive) return;
    const player = document.querySelector("#movie_player");
    if (!player || !(player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting"))) return;

    let buttons;
    try { buttons = player.querySelectorAll(SKIP_SELECTORS); } catch (_) { return; }
    for (const button of buttons) {
      if (!isVisible(button) || button.getAttribute("aria-disabled") === "true") continue;
      const now = Date.now();
      if (button === lastButton && now - lastAttemptAt < 1200) return;
      lastButton = button;
      lastAttemptAt = now;
      try { button.click(); } catch (_) {}
      return;
    }
  }

  function scheduleAttempt() {
    if (!protectionActive) return;
    window.setTimeout(trySkipAd, 80);
  }

  function start() {
    refreshProtection().then(scheduleAttempt);
    if (document.documentElement && !observer) {
      observer = new MutationObserver(scheduleAttempt);
      observer.observe(document.documentElement, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ["class", "disabled", "aria-disabled"]
      });
    }
    if (!poll) poll = window.setInterval(trySkipAd, 350);
    window.addEventListener("yt-navigate-finish", scheduleAttempt, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.enabled || changes.allowlist || changes.sitePauses)) {
      refreshProtection().then(scheduleAttempt);
    }
  });
})();
