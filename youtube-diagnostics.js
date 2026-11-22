(() => {
  "use strict";
  if (!/(^|\.)youtube\.com$/i.test(location.hostname)) return;

  // Local-only, transition-based diagnostics. No URLs, titles, account data or
  // page text are collected; only coarse ad-surface state and timestamps.
  const surfaces = {
    player: () => {
      const player = document.querySelector("#movie_player");
      return !!(player && (player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting")));
    },
    overlay: () => !!document.querySelector(".ytp-ad-overlay-container, .ytp-ad-player-overlay, .ytp-ad-action-interstitial"),
    feed: () => !!document.querySelector("ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-display-ad-renderer, ytd-promoted-video-renderer, ytd-search-pyv-renderer, ytd-companion-ad-renderer, ytd-video-masthead-ad-renderer"),
    skip: () => {
      const player = document.querySelector("#movie_player");
      return !!(player && player.querySelector(".ytp-ad-skip-button:not([disabled]), .ytp-ad-skip-button-modern:not([disabled]), .ytp-skip-ad-button:not([disabled])"));
    }
  };

  const previous = Object.create(null);
  let queued = false;
  function send(kind, active) {
    try {
      chrome.runtime.sendMessage({ type: "youtube-diagnostic", kind, active, timestamp: Date.now() }).catch(() => {});
    } catch (_) {}
  }
  function sample() {
    queued = false;
    for (const [kind, read] of Object.entries(surfaces)) {
      let active = false;
      try { active = !!read(); } catch (_) {}
      if (previous[kind] !== active) {
        previous[kind] = active;
        if (active) send(kind, true);
      }
    }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    window.setTimeout(sample, 120);
  }

  const observer = new MutationObserver(schedule);
  const start = () => {
    if (document.documentElement) observer.observe(document.documentElement, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["class", "hidden", "aria-hidden", "disabled"]
    });
    sample();
    window.setInterval(sample, 1500);
    window.addEventListener("yt-navigate-finish", schedule, true);
  };
  if (document.documentElement) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
