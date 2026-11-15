(() => {
  "use strict";

  // YouTube-only helper: click the native Skip Ad control once it becomes
  // available. It never blocks media URLs or changes normal video playback.
  if (!/(^|\\.)youtube\\.com$/i.test(location.hostname)) return;

  const SKIP_SELECTORS = [
    ".ytp-ad-skip-button:not([disabled])",
    ".ytp-ad-skip-button-modern:not([disabled])",
    ".ytp-skip-ad-button:not([disabled])",
    ".ytp-ad-skip-button-container button:not([disabled])"
  ].join(",");

  let lastButton = null;
  let lastAttemptAt = 0;

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
    const player = document.querySelector("#movie_player");
    if (!player || !player.classList.contains("ad-showing")) return;

    const buttons = player.querySelectorAll(SKIP_SELECTORS);
    for (const button of buttons) {
      if (!isVisible(button) || button.getAttribute("aria-disabled") === "true") continue;

      const now = Date.now();
      if (button === lastButton && now - lastAttemptAt < 1500) return;

      lastButton = button;
      lastAttemptAt = now;
      button.click();
      return;
    }
  }

  // YouTube is a single-page app; polling re-checks the current player after
  // navigation and after the skip countdown changes the button state.
  const start = () => {
    trySkipAd();
    window.setInterval(trySkipAd, 500);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();