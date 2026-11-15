(() => {
  "use strict";

  // ADZERO YouTube scriptlet layer.
  // Runs in MAIN world at document_start. Only ad metadata is pruned;
  // media URLs, streaming formats, captions and playback state are preserved.
  if (!/(^|\.)youtube\.com$/i.test(location.hostname)) return;

  const API_URL = /\/youtubei\/v1\/(?:player|next|browse|search|playlist|reel\/reel_watch_sequence|get_watch|guide)(?:[/?]|$)/i;
  const AD_KEYS = new Set([
    "adPlacements",
    "adSlots",
    "playerAds",
    "adBreakHeartbeatParams",
    "adSlotRenderer",
    "adSlotMetadata",
    "displayAdRenderer",
    "inFeedAdLayoutRenderer",
    "promotedSparklesWebRenderer",
    "promotedSparklesTextSearchRenderer",
    "promotedVideoRenderer",
    "compactPromotedVideoRenderer",
    "searchPyvRenderer",
    "bannerPromoRenderer",
    "statementBannerRenderer",
    "actionCompanionAdRenderer",
    "companionAdRenderer",
    "companionSlotRenderer",
    "videoMastheadAdRenderer",
    "videoMastheadAdV3Renderer",
    "videoMastheadAdPrimaryVideoRenderer"
  ]);

  const AD_MARKERS = /"(?:adPlacements|adSlots|playerAds|adBreakHeartbeatParams|adSlotRenderer|promotedSparklesWebRenderer|promotedVideoRenderer)"/;
  const RESPONSE_KEYS = new Set(["ytInitialPlayerResponse", "ytInitialData", "playerResponse", "ytInitialReelWatchSequenceResponse"]);

  function isAdEntry(value) {
    if (!value || typeof value !== "object") return false;
    if (value.isAd === true) return true;
    if (value.adClientParams && value.adClientParams.isAd === true) return true;
    return false;
  }

  function cleanData(input, seen) {
    if (!input || typeof input !== "object") return input;
    const visited = seen || new WeakMap();
    if (visited.has(input)) return visited.get(input);

    if (Array.isArray(input)) {
      const output = [];
      visited.set(input, output);
      for (const item of input) {
        if (isAdEntry(item)) continue;
        const cleaned = cleanData(item, visited);
        if (cleaned !== undefined) output.push(cleaned);
      }
      return output;
    }

    const output = Object.create(Object.getPrototypeOf(input) === null ? null : Object.prototype);
    visited.set(input, output);
    for (const key of Object.keys(input)) {
      if (AD_KEYS.has(key)) continue;
      // YouTube sometimes marks promoted feed/reel entries on the entry itself.
      const child = input[key];
      if (child && typeof child === "object" && isAdEntry(child)) continue;
      output[key] = cleanData(child, visited);
    }
    return output;
  }

  function cleanJsonText(text) {
    if (typeof text !== "string" || !AD_MARKERS.test(text)) return text;
    try {
      const parsed = JSON.parse(text);
      const cleaned = cleanData(parsed);
      return JSON.stringify(cleaned);
    } catch (_) {
      return text;
    }
  }

  function patchGlobal(name) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(window, name);
      if (descriptor && descriptor.configurable === false) {
        if ("value" in descriptor && descriptor.value && typeof descriptor.value === "object") {
          window[name] = cleanData(descriptor.value);
        }
        return;
      }

      let current = descriptor && "value" in descriptor ? cleanData(descriptor.value) : undefined;
      if (descriptor && typeof descriptor.get === "function") {
        try { current = cleanData(descriptor.get.call(window)); } catch (_) {}
      }

      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: descriptor ? descriptor.enumerable : true,
        get() { return current; },
        set(value) { current = cleanData(value); }
      });
    } catch (_) {
      // Fail open if the page has made a global property non-configurable.
    }
  }

  for (const name of RESPONSE_KEYS) patchGlobal(name);

  // Catch JSON payloads parsed by YouTube's own application code.
  try {
    const nativeParse = JSON.parse;
    JSON.parse = function(text, reviver) {
      const parsed = nativeParse.call(this, text, reviver);
      if (typeof text !== "string" || !AD_MARKERS.test(text)) return parsed;
      try { return cleanData(parsed); } catch (_) { return parsed; }
    };
  } catch (_) {}

  function getUrl(input) {
    try {
      if (typeof Request !== "undefined" && input instanceof Request) return input.url;
      return new URL(String(input), location.href).href;
    } catch (_) {
      return "";
    }
  }

  // Fetch response filtering for Innertube API payloads.
  try {
    const nativeFetch = window.fetch;
    if (typeof nativeFetch === "function") {
      window.fetch = async function(input, init) {
        const response = await nativeFetch.apply(this, arguments);
        if (!API_URL.test(getUrl(input)) || !response.ok || response.type === "opaque") return response;
        const contentType = response.headers.get("content-type") || "";
        if (!/json/i.test(contentType)) return response;

        try {
          const source = await response.clone().text();
          const body = cleanJsonText(source);
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
          for (const key of ["url", "redirected", "type"]) {
            try { Object.defineProperty(replacement, key, { configurable: true, value: response[key] }); } catch (_) {}
          }
          return replacement;
        } catch (_) {
          return response;
        }
      };
    }
  } catch (_) {}

  // XMLHttpRequest filtering is essential for YouTube clients which do not use fetch.
  try {
    const proto = XMLHttpRequest.prototype;
    const nativeOpen = proto.open;
    const urlKey = Symbol("adzeroYouTubeRequestUrl");
    proto.open = function(method, url) {
      try { this[urlKey] = new URL(String(url), location.href).href; } catch (_) { this[urlKey] = String(url || ""); }
      return nativeOpen.apply(this, arguments);
    };

    const responseTextDescriptor = Object.getOwnPropertyDescriptor(proto, "responseText");
    if (responseTextDescriptor && responseTextDescriptor.configurable && responseTextDescriptor.get) {
      Object.defineProperty(proto, "responseText", {
        configurable: true,
        enumerable: responseTextDescriptor.enumerable,
        get() {
          const raw = responseTextDescriptor.get.call(this);
          if (this.readyState !== 4 || !API_URL.test(this[urlKey] || "")) return raw;
          return cleanJsonText(raw);
        }
      });
    }

    const responseDescriptor = Object.getOwnPropertyDescriptor(proto, "response");
    if (responseDescriptor && responseDescriptor.configurable && responseDescriptor.get) {
      Object.defineProperty(proto, "response", {
        configurable: true,
        enumerable: responseDescriptor.enumerable,
        get() {
          const raw = responseDescriptor.get.call(this);
          if (this.readyState !== 4 || !API_URL.test(this[urlKey] || "")) return raw;
          try {
            if (this.responseType === "json") return cleanData(raw);
            if (this.responseType === "" || this.responseType === "text") return cleanJsonText(raw);
          } catch (_) {}
          return raw;
        }
      });
    }
  } catch (_) {
    // Unsupported XHR descriptors are left untouched; fetch and inline pruning remain active.
  }
})();