(() => {
  const selectors = [
    'ins.adsbygoogle', '[data-ad]', '[data-ad-slot]', '[data-ad-client]',
    '[id^="google_ads"]', '[id*="_ad_container"]', '[class*="adsbygoogle"]',
    '[class~="advertisement"]', '[class*="advertisement"]', '[class*="sponsored-content"]',
    '[class*="taboola"]', '[id*="taboola"]', '[class*="outbrain"]', '[id*="outbrain"]',
    'iframe[src*="doubleclick.net"]', 'iframe[src*="googlesyndication.com"]',
    'iframe[src*="adnxs.com"]', '[aria-label="Advertisement"]',
    '[aria-label="Sponsored"]', '[data-testid*="ad-"]',
    // YouTube ad containers and sponsored placements (cosmetic fallback).
    '#player-ads', '.video-ads', '.ytp-ad-module',
    'ytd-ad-slot-renderer', 'ytd-in-feed-ad-layout-renderer',
    'ytd-display-ad-renderer', 'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-sparkles-text-search-renderer', 'ytd-banner-promo-renderer',
    'ytd-action-companion-ad-renderer', 'ytm-ad-slot-renderer',
    'ytm-companion-ad-renderer', 'ytm-promoted-sparkles-web-renderer'
  ];
  const selectorText = selectors.join(",");
  const css = selectorText +
    '{display:none!important;visibility:hidden!important;max-height:0!important;overflow:hidden!important}';

  let style = null;
  let observer = null;
  let pending = 0;
  let timer = null;
  let protectionActive = false;
  let pickerActive = false;
  let pickerOverlay = null;
  let pickerToolbar = null;
  let pickerCandidate = null;
  const counted = new WeakSet();

  function report(count) {
    if (!count) return;
    pending += count;
    if (!timer) {
      timer = setTimeout(() => {
        const countToSend = pending;
        pending = 0;
        timer = null;
        chrome.runtime.sendMessage({ type: "hidden-count", count: countToSend })
          .catch(() => {});
      }, 900);
    }
  }

  function countElement(element) {
    if (!(element instanceof Element) || counted.has(element)) return 0;
    try {
      if (element.matches(selectorText)) {
        counted.add(element);
        return 1;
      }
    } catch (_) {}
    return 0;
  }

  function scan(root) {
    if (!protectionActive || !root) return;
    let found = 0;

    if (root instanceof Element) found += countElement(root);

    if (typeof root.querySelectorAll === "function") {
      try {
        root.querySelectorAll(selectorText).forEach(element => {
          if (!counted.has(element)) {
            counted.add(element);
            found++;
          }
        });
      } catch (_) {}
    }
    report(found);
  }

  async function ensureStyle() {
    if (!protectionActive || !document.documentElement) return;
    if (!style) {
      style = document.createElement("style");
      style.id = "adzero-cosmetic-filters";
      (document.head || document.documentElement).appendChild(style);
    }
    const data = await chrome.storage.local.get({ elementRules: [] });
    const host = location.hostname.toLowerCase();
    const custom = (Array.isArray(data.elementRules) ? data.elementRules : [])
      .filter(rule => rule && rule.enabled !== false && rule.site === host && typeof rule.selector === "string")
      .map(rule => `${rule.selector}{display:none!important;visibility:hidden!important;max-height:0!important;overflow:hidden!important}`)
      .join("\n");
    style.textContent = css + "\n" + custom;
    scan(document);
  }

  function startObserver() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(records => {
      if (!protectionActive) return;
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) scan(node);
        });
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function apply() {
    const settings = await chrome.storage.local.get({ enabled: true, allowlist: [], sitePauses: [] });
    const host = location.hostname.toLowerCase();
    const allowlist = Array.isArray(settings.allowlist) ? settings.allowlist : [];
    const excepted = allowlist.some(domain =>
      typeof domain === "string" &&
      (host === domain || host.endsWith("." + domain))
    );

    const paused = (Array.isArray(settings.sitePauses) ? settings.sitePauses : []).some(x => x && x.domain === host && x.expiresAt > Date.now());
    protectionActive = settings.enabled !== false && !excepted && !paused;
    if (protectionActive) {
      ensureStyle();
      startObserver();
    } else {
      if (style) {
        style.remove();
        style = null;
      }
    }
  }

  // At document_start the document element may not exist yet.
  if (document.documentElement) {
    startObserver();
  } else {
    document.addEventListener("DOMContentLoaded", () => { startObserver(); ensureStyle(); }, { once: true });
  }

  apply().catch(() => {});
  function makeSelector(element) {
    if (!(element instanceof Element)) return null;
    const esc = value => (window.CSS && CSS.escape) ? CSS.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    if (element.id) return `#${esc(element.id)}`;
    const parts = [];
    let node = element;
    while (node && node.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
      let part = node.localName;
      if (node.classList && node.classList.length) part += "." + [...node.classList].slice(0, 2).map(esc).join(".");
      const parent = node.parentElement;
      if (parent) {
        const same = [...parent.children].filter(x => x.localName === node.localName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      const candidate = parts.join(" > ");
      try { if (document.querySelectorAll(candidate).length === 1) return candidate; } catch (_) {}
      node = parent;
    }
    const selector = parts.join(" > ");
    try { document.querySelector(selector); return selector; } catch (_) { return null; }
  }

  function stopPicker() {
    pickerActive = false;
    if (pickerCandidate) pickerCandidate.style.outline = pickerCandidate.dataset.adzeroOldOutline || "";
    if (pickerOverlay) pickerOverlay.remove();
    if (pickerToolbar) pickerToolbar.remove();
    pickerOverlay = pickerToolbar = pickerCandidate = null;
  }

  function startPicker() {
    if (pickerActive) stopPicker();
    pickerActive = true;
    const shade = document.createElement("div");
    shade.textContent = "ADZERO · Наведи на элемент и нажми";
    Object.assign(shade.style, { position:"fixed", top:"12px", left:"50%", transform:"translateX(-50%)", zIndex:"2147483647", padding:"10px 16px", background:"#17232e", color:"#f4e7c8", border:"1px solid #c5a66c", borderRadius:"10px", font:"13px Segoe UI,Arial", boxShadow:"0 5px 25px #0008", pointerEvents:"none" });
    document.documentElement.appendChild(shade); pickerOverlay = shade;
    const onMove = event => {
      if (!pickerActive) return;
      const target = event.target;
      if (!(target instanceof Element) || target === pickerToolbar || pickerToolbar?.contains(target) || target === shade) return;
      if (pickerCandidate) pickerCandidate.style.outline = pickerCandidate.dataset.adzeroOldOutline || "";
      pickerCandidate = target;
      pickerCandidate.dataset.adzeroOldOutline = pickerCandidate.style.outline || "";
      pickerCandidate.style.outline = "3px solid #d8b879";
    };
    const onClick = event => {
      if (!pickerActive || !pickerCandidate || pickerToolbar?.contains(event.target)) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      const selector = makeSelector(pickerCandidate);
      if (!selector) { stopPicker(); return; }
      if (pickerCandidate) pickerCandidate.style.outline = pickerCandidate.dataset.adzeroOldOutline || "";
      pickerToolbar = document.createElement("div");
      Object.assign(pickerToolbar.style, { position:"fixed", right:"16px", bottom:"16px", zIndex:"2147483647", padding:"12px", background:"#17232e", color:"#fff", border:"1px solid #c5a66c", borderRadius:"12px", font:"12px Segoe UI,Arial", boxShadow:"0 5px 25px #0008", maxWidth:"min(360px,90vw)" });
      const label = document.createElement("div"); label.textContent = selector; label.style.cssText = "overflow-wrap:anywhere;margin-bottom:9px;color:#f4e7c8";
      const save = document.createElement("button"); save.textContent = "Сохранить правило";
      const cancel = document.createElement("button"); cancel.textContent = "Отмена";
      for (const button of [save,cancel]) button.style.cssText = "margin-right:7px;padding:7px 10px;border-radius:7px;border:1px solid #9b8358;background:#293844;color:white;cursor:pointer";
      save.addEventListener("click", async () => {
        const data = await chrome.storage.local.get({ elementRules: [] });
        const rules = Array.isArray(data.elementRules) ? data.elementRules : [];
        if (!rules.some(x => x.site === location.hostname && x.selector === selector)) rules.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, site: location.hostname, selector, enabled: true, createdAt: Date.now() });
        await chrome.storage.local.set({ elementRules: rules.slice(-500) });
        stopPicker(); ensureStyle().catch(() => {});
      });
      cancel.addEventListener("click", stopPicker);
      pickerToolbar.append(label,save,cancel); document.documentElement.appendChild(pickerToolbar);
      pickerActive = false;
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
    };
    const onKey = event => { if (event.key === "Escape") { stopPicker(); document.removeEventListener("keydown", onKey, true); } };
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
  }

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === "adzero-start-picker") startPicker();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.enabled || changes.allowlist || changes.sitePauses)) {
      apply().catch(() => {});
    }
    if (area === "local" && changes.elementRules) ensureStyle().catch(() => {});
  });
})();
