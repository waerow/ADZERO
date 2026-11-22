# ADZERO — Changelog

## 3.2.0 — Experimental YouTube hardening

### Fixed
- Synchronized YouTube JSON text markers with all ad metadata keys removed by the pruning layer, so payloads containing the previously missed renderer keys also enter cleanup.

### Changed
- Bumped development version to 3.2.0.
- Expanded the targeted YouTube ad-metadata pruning keys and JSON marker detection for additional known renderer and ad-pod metadata.
- Kept filtering scoped to YouTube Innertube response payloads and known ad metadata.
- Preserved media URLs and streaming data; no broad `googlevideo.com` blocking was introduced.
- Updated README to describe the actual experimental build, installation steps, privacy model and known limitations.

### Validation status
- JavaScript syntax and manifest/rule JSON validation are required before packaging.
- Synthetic tests are not equivalent to live YouTube testing in Edge.
- This branch is experimental and is not a stable release.

## 3.1.0 — Release notes

### Added
- **My Filters:** local custom network block/allow rules for domains and HTTP(S) URL prefixes.
- **Block History:** locally stored DNR match events exposed by the browser, with search, filters and URL allow/reblock actions.
- **Element Picker:** select page elements and save hostname-scoped CSS rules.
- **Site Protection:** temporary pause with automatic restoration, separate from permanent site exceptions.
- **Statistics:** summaries of available DNR events for 24 hours, 7 days and 30 days; DOM hidden-element count remains separate.
- **Smart Explanation:** event explanations based on recorded metadata.
- **Filter Packs:** separate built-in ad and tracker rule sets.
- **Protection Modes:** Standard, Strict and Custom.
- **Import / Export:** validated JSON transfer for supported settings, My Filters and Element Picker rules.
- **Website Problem Report:** locally generated diagnostic text; no automatic transmission.
- **Russian and English localization** across popup and settings/report screens.

### Preserved and improved
- Preserved the 3.0.1 / Stage 2 protection foundation, global toggle, site exceptions and cosmetic counter.
- Improved allowlist normalization and counter update serialization.
- Kept custom network rule IDs separate from site-exception rule IDs.
- Kept user data local; no telemetry or automatic browsing-history upload is implemented.

### Known limitations
- Block History and network statistics depend on browser DNR feedback events and are not a complete network log.
- The cosmetic counter counts recognized DOM elements, not network requests.
- Complete ad removal and YouTube in-stream/mid-roll blocking are not guaranteed.
- Popup suppression is best-effort.
- Broad HTTP/HTTPS host permissions remain and should be reviewed before store publication.
- This release has been user-tested in Edge and Chrome, but has not undergone an independent security audit or exhaustive compatibility testing.
