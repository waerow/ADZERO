# ADZERO

**A lightweight Chromium-based ad and tracker filtering extension.**

ADZERO combines network request filtering with cosmetic page-element hiding to help reduce advertising and tracking while browsing.

> **Current release:** 3.1.0  
> **Manifest:** Version 3 (MV3)  
> **Languages:** English and Russian

## Features

- **Global protection** — enable or disable filtering.
- **My Filters** — create, edit, enable, disable and remove custom network block/allow rules for domains and HTTP(S) URL prefixes.
- **Block History** — review available browser-reported rule-match events, search and filter records, inspect rule sources, and allow or re-block URLs.
- **Element Picker** — select page elements and save CSS rules scoped to the current hostname.
- **Site Protection** — pause protection for 5 or 30 minutes with automatic restoration; permanent site exceptions are separate.
- **Statistics** — view available network rule-match events for 24 hours, 7 days and 30 days, separately from the DOM hidden-element counter.
- **Filter Packs** — manage built-in ad and tracker rule sets.
- **Protection Modes** — Standard, Strict and Custom.
- **Import / Export** — transfer supported settings and user-created rules using JSON.
- **Website Problem Report** — generate a diagnostic summary locally for the user to review and copy.
- **Bilingual interface** — English and Russian.

## Install in Microsoft Edge

1. Download the ADZERO 3.1.0 ZIP package from the repository's **Releases** section (when a release asset is available).
2. Extract the ZIP archive to a folder.
3. Open `edge://extensions`.
4. Turn on **Developer mode**.
5. Select **Load unpacked** and choose the extracted ADZERO folder containing `manifest.json`.
6. Refresh open tabs.

## Install in other Chromium-based browsers

The extension uses Manifest V3. In a compatible Chromium-based browser, open its extensions page, enable Developer mode, choose **Load unpacked**, and select the extracted folder containing `manifest.json`. Exact steps may vary by browser.

## Privacy

The 3.1.0 build stores extension settings, custom filters, CSS rules and available blocking-event history in the browser's local extension storage. The build does not implement ADZERO telemetry or automatic upload of browsing history to an ADZERO server. The Website Problem Report is generated locally and is not sent automatically.

Block History is based only on events exposed by the browser's `declarativeNetRequestFeedback` API. It is not a complete record of all network requests or browsing activity.

## Permissions

The manifest requests:

- `declarativeNetRequest` — apply network block and allow rules.
- `storage` — store settings, custom rules and available local history.
- `tabs` — support active-tab and site-specific controls.
- `declarativeNetRequestFeedback` — access browser-exposed rule-match events for history and statistics.
- `alarms` — restore protection after a timed pause.
- HTTP and HTTPS host access — run the content script for cosmetic filtering and Element Picker functionality on websites.

The package requests access to all HTTP and HTTPS websites. This broad host access is intentional in the current build for site-wide filtering and page-element features; it should be reviewed before any browser-store submission.

## Known limitations

- ADZERO does not guarantee that every ad or tracker will be blocked. First-party ads, ads integrated into page content, new ad domains and some video ads (including in-stream and mid-roll ads) may remain.
- Block History and network statistics depend on browser-provided DNR feedback events and may be incomplete.
- The hidden-element counter reports recognized DOM elements, not blocked network requests.
- Popup suppression is best-effort.
- Blocking some analytics domains may affect website functionality. Pause protection or add a site exception if a website does not work as expected.
- Element Picker may not work on browser-internal pages, extension pages or sites where the browser does not inject content scripts.

## Project status

Version 3.1.0 has been user-tested against the main scenarios in Microsoft Edge and Google Chrome. This does not constitute an independent security audit, exhaustive compatibility testing or a guarantee for every website.

## Repository contents

The extension package includes the Manifest V3 service worker, popup and settings interfaces, content script, icons and JSON rule lists. See [CHANGELOG.md](CHANGELOG.md) for version 3.1.0 notes.

## License

No open-source license has been added yet. Unless a license is added, the source is published for inspection but no permission is granted to reuse, modify or redistribute it beyond rights provided by applicable law.