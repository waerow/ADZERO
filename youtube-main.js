(() => {
  "use strict";

  // Experimental YouTube response filter. Runs in the page's MAIN world so
  // it can wrap fetch before YouTube's own application scripts initialize.
  if (!/(^|\.)youtube\.com$/i.test(location.hostname)) return;

  const TARGET = /\/youtubei\/v1\/(player|next|browse|reel\/reel_watch_sequence)(?:[/?]|$)/i;
  const DROP_KEYS = new Set([
    "adPlacements",
    "adSlots",
    "playerAds",
    "adBreakHeartbeatParams",
    "adSlotRenderer",
    "promotedSparklesWebRenderer",
    "promotedSparklesTextSearchRenderer",
    "displayAdRenderer",
    "inFeedAdLayoutRenderer",
    "bannerPromoRenderer",
    "actionCompanionAdRenderer",
    "companionAdRenderer"
  ]);

  function clean(value) {
    if (Array.isArray(value)) {
      return value
        .filter(item => !(item && typeof item === "object" &&
          Object.keys(item).some(key => DROP_KEYS.has(key))))
        .map(clean);
    }
    if (!value || typeof value !== "object") return value;

    const result = {};
    for (const [key, child] of Object.entries(value)) {
      if (DROP_KEYS.has(key)) continue;
      result[key] = clean(child);
    }
    return result;
  }

  function requestUrl(input) {
    try {
      return input instanceof Request ? input.url : String(input);
    } catch (_) {
      return "";
    }
  }

  const nativeFetch = window.fetch;
  if (typeof nativeFetch !== "function") return;

  window.fetch = async function(input, init) {
    const response = await nativeFetch.apply(this, arguments);
    const url = requestUrl(input);
    if (!TARGET.test(url) || response.type === "opaque" || !response.ok) {
      return response;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!/json/i.test(contentType)) return response;

    try {
      const source = await response.clone().text();
      const data = JSON.parse(source);
      const filtered = clean(data);
      const body = JSON.stringify(filtered);
      if (body === source) return response;

      const headers = new Headers(response.headers);
      for (const name of ["content-length", "content-encoding", "content-range", "transfer-encoding"]) {
        headers.delete(name);
      }

      const replacement = new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });

      // Preserve the response metadata commonly inspected by page scripts.
      for (const key of ["url", "redirected", "type"]) {
        try {
          Object.defineProperty(replacement, key, { configurable: true, value: response[key] });
        } catch (_) {}
      }
      return replacement;
    } catch (_) {
      // Fail open: if a response is not ordinary JSON, preserve playback.
      return response;
    }
  };
})();