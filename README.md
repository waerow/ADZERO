# ADZERO

**A lightweight Chromium-based ad and tracker filtering extension.**

ADZERO combines Manifest V3 network request filtering, cosmetic filtering and YouTube-specific response filtering.

> **Development version:** 3.2.0 (experimental)  
> **Manifest:** Version 3 (MV3)  
> **Languages:** English and Russian

## Features

- **Global protection** — enable or disable filtering.
- **My Filters** — local custom network block/allow rules for domains and HTTP(S) URL prefixes.
- **Block History** — available browser-reported rule-match events, search, filters and URL allow/re-block actions.
- **Element Picker** — select page elements and save CSS rules scoped to the current hostname.
- **Site Protection** — temporary pause with automatic restoration and permanent site exceptions.
- **Statistics** — available DNR match events for 24 hours, 7 days and 30 days, separately from the DOM hidden-element counter.
- **Filter Packs** — manage built-in ad and tracker rules.
- **Protection Modes** — Standard, Strict and Custom.
- **Import / Export** — transfer supported settings and user-created rules using JSON.
- **Website Problem Report** — generate a diagnostic summary locally for review and copying.
- **Bilingual interface** — English and Russian.
- **YouTube filtering layer** — early MAIN-world hooks, targeted Innertube JSON pruning, fetch/XHR response filtering and cosmetic selectors.

## Install in Microsoft Edge

1. Download the ZIP for the `release-3.2.0-youtube-hardening` branch from GitHub.
2. Extract the archive to a folder.
3. Open `edge://extensions`.
4. Turn on **Developer mode**.
5. Select **Load unpacked** and choose the extracted ADZERO folder containing `manifest.json`.
6. Refresh YouTube tabs.

This is an experimental development build, not a stable release. Keep another browser profile or a copy of your previous build available for rollback.

## Install in other Chromium-based browsers

The extension uses Manifest V3. In a compatible Chromium-based browser, open its extensions page, enable Developer mode, choose **Load unpacked**, and select the extracted folder containing `manifest.json`. Exact steps may vary by browser.

## Privacy

The extension stores settings, custom filters, CSS rules and available blocking-event history in the browser's local extension storage. This build does not implement ADZERO telemetry or automatic upload of browsing history to an ADZERO server. The Website Problem Report is generated locally and is not sent automatically.

Block History is based only on events exposed by the browser's `declarativeNetRequestFeedback` API. It is not a complete record of all network requests or browsing activity.

## Permissions

The manifest requests:

- `declarativeNetRequest` — apply network block and allow rules.
- `storage` — store settings, custom rules and available local history.
- `tabs` — support active-tab and site-specific controls.
- `declarativeNetRequestFeedback` — access browser-exposed rule-match events for history and statistics.
- `alarms` — restore protection after a timed pause.
- HTTP and HTTPS host access — run content scripts for cosmetic filtering and Element Picker functionality.

The package requests access to all HTTP and HTTPS websites. This broad host access is intentional for site-wide filtering and should be reviewed before any browser-store submission.

## YouTube filtering design

The YouTube layer targets known ad metadata in selected Innertube API responses and initial page data. It preserves media URLs and streaming data rather than broadly blocking `googlevideo.com`. The implementation is best-effort: YouTube can change response formats, and server-side or newly introduced ad delivery paths may bypass it.

## Known limitations

- No extension can guarantee removal of every ad. First-party, server-integrated and newly introduced ad formats may remain.
- YouTube in-stream and mid-roll ad handling requires live testing and may change as YouTube changes its player.
- Block History and network statistics depend on browser-provided DNR feedback events and may be incomplete.
- The hidden-element counter reports recognized DOM elements, not blocked network requests.
- Popup suppression is best-effort.
- Blocking some analytics domains may affect website functionality. Pause protection or add a site exception if a website does not work as expected.
- Element Picker may not work on browser-internal pages, extension pages or sites where the browser does not inject content scripts.

## Project status

Version 3.2.0 is an experimental development build. Static and synthetic checks do not replace real-world testing in Microsoft Edge. It has not undergone an independent security audit or exhaustive compatibility testing.

## License

No open-source license has been added yet. Unless a license is added, the source is published for inspection but no permission is granted to reuse, modify or redistribute it beyond rights provided by applicable law.
