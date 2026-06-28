# Research - StyleCraft

## Executive Summary
StyleCraft is a local-first Chromium MV3 userstyle manager with a visual picker, full CodeMirror editor, Sass/PostCSS save pipeline, UserStyles.world install flow, Stylus/Stylebot import, and early document-start injection. Its strongest shape is a power-user CSS workstation that stays private and self-contained; the highest-value direction is to make that workstation safer and more interoperable before adding novelty. Priority opportunities: unify the duplicated URL/style matching engines, validate and quarantine imports before overwriting storage, harden community-style ingestion against CSS exfiltration and brittle UserStyles.world parsing, add focused Playwright coverage for import/export/update/error flows, reduce broad host-permission trust friction, add accessibility coverage for the popup/options/editor controls, and add computed-style/design-token extraction where StyleCraft can beat plain userstyle managers.

## Product Map
- Core workflows: pick elements and generate selectors; edit and preview custom CSS; install/update community styles; import/export style data; toggle readability/grayscale and per-site style state.
- User personas: power users migrating from Stylus/Stylebot; designers who want CSS Peeper/VisBug-style inspection; browser customizers who value local storage and no telemetry; developers testing CSS against real pages.
- Platforms and distribution: Chromium MV3 extension for Chrome, Edge, Brave, Vivaldi, Opera, and Arc; local unpacked ZIP build via `tools/build-extension.mjs`.
- Key integrations and data flows: `chrome.storage.local` holds `stylecraft_data`, settings, assist key, and backups; `inject-styles.js` reads storage at `document_start`; `background.js` handles UserStyles.world search/install/update, context menus, badges, and backups; editor bundles CodeMirror, Sass, PostCSS, and Autoprefixer locally.

## Competitive Landscape
- Stylus: mature UserCSS manager with raw URL installs, UserCSS metadata and variables, cloud sync, JSON backup, auto-update, and lightweight injection. Learn from its UserCSS source-of-truth, update metadata, and migration compatibility; avoid copying sync complexity without recovery/history guardrails.
- Stylebot: simple visual picker plus manual CSS editor across Chrome/Firefox/Edge. Learn from its low-friction point-and-click workflow and plain-language controls; avoid relying on minimal backup/export flows by making backups/version history more explicit.
- Magic CSS / Live CSS Editor: live CSS/Less/Sass editor with file save, CSS reloader, selector generation, iframe support, and broad browser support. Learn from external-file and live-reload workflows; avoid mixing temporary dev scratchpad behavior with persistent userstyle state without clear persistence boundaries.
- Amino: commercial live CSS editor with cloud sync and account-backed portability. Learn that multi-device continuity is table-stakes for paid competitors; avoid default cloud dependency because StyleCraft's privacy promise is local-first.
- Dark Reader: dynamic theme engine with performance-sensitive injection and custom-rule ordering issues. Learn from its site-specific fallback/cache thinking and "disable automatic theme for matched site" demand; avoid automatic dynamic theming that competes with StyleCraft's explicit CSS editing model.
- Arc Boosts: per-site color/font/hide controls plus optional code. Learn from the fast "hide this" and remix UX; avoid JavaScript boost execution because it changes StyleCraft's security model.
- VisBug / CSS Peeper / Site Palette: designer-focused inspection, spacing, accessibility, color/font/token extraction, and asset export. Learn from computed-style and design-token extraction; avoid turning the extension into a general DevTools clone.
- UserStyles.world / UserCSS ecosystem: community styles increasingly expect UserCSS metadata, variables, update URLs, and raw install flows. Learn from advanced UserCSS compatibility; avoid depending on scraped HTML as the only search/catalog path.

## Security, Privacy, and Reliability
- Verified: `manifest.json` uses `<all_urls>` host permissions and injects `inject-styles.js` into all frames at `document_start`; Chrome guidance favors optional permissions and user-understandable runtime grants where feasible.
- Verified: `options.js` native import path accepts `raw.data || raw` and writes it to `stylecraft_data` without schema validation, merge preview, size limits, or automatic pre-import backup.
- Verified: `background.js` stores UserStyles.world CSS as-is; `inject-styles.js` applies imported/community CSS with `textContent`, which avoids script HTML injection but still allows CSS exfiltration primitives such as remote `@import`/`url()` requests and deceptive overlays.
- Verified: URL matching logic is duplicated: `background.js` `matchDomain()` ignores `appliesTo`, while `inject-styles.js` has `entryMatchesPage()` and `patternMatchesUrl()`. Badge counts and injected styles can diverge for exact URL, prefix, regexp, and wildcard entries.
- Verified: `background.js` scrapes UserStyles.world search HTML with regex against card markup, while style install/update uses `/api/style/:id`; search can silently break on markup changes.
- Verified: backups are daily, three-deep, and silently swallowed on failure in `background.js`; restore in `options.js` uses `prompt()` and the undo-toast success text loses the restored label after `undoSnapshot` is nulled.
- Verified: `npm audit --json` reported zero vulnerabilities and `npm outdated --json` returned `{}` on 2026-06-28.

## Architecture Assessment
- Shared matching core needed: move `matchDomain`, `entryMatchesPage`, `patternMatchesUrl`, and UserCSS document matching into one browser-safe module used by `background.js`, `inject-styles.js`, `editor.js`, and tests.
- Import/export boundary needed: add schema normalization, migrations, pre-import backups, merge/replace modes, size quotas, and invalid-entry quarantine in `options.js` and `background.js`.
- UserCSS parser boundary needed: replace regex-only `@-moz-document` parsing in `background.js`, `inject-styles.js`, and `options.js` with one tested parser that handles metadata, variables, update URLs, includes/excludes, and nested blocks.
- Security policy layer needed: lint dangerous CSS sources at import/install/update/save time, flag remote `@import`/`url()` use, block known-dead schemes, and provide per-style trust metadata without breaking local user CSS.
- Test gaps: Playwright covers editor smoke and picker smoke only. Missing coverage for options import/export, backup/restore, USw update failure states, popup search/install, pattern matching parity, permission-denied pages, accessibility names/focus, and package artifact validation.
- Documentation gaps: README claims broad import/update/backup safety but does not document current retention, failure handling, permission rationale tradeoffs, or how to recover from a corrupt import.

## Rejected Ideas
- Arc-style JavaScript boosts: source Arc Boosts; rejected because JavaScript execution would expand StyleCraft beyond CSS/readability styling and materially raise review/security risk.
- Default vendor cloud sync: source Amino and Stylus sync issues; rejected as a default because StyleCraft's privacy promise is local-first, but optional encrypted user-chosen sync remains aligned with the existing roadmap.
- Automatic Dark Reader replacement: source Dark Reader; rejected because StyleCraft should integrate/coordinate with dark-mode tools rather than maintain a full dynamic theme engine.
- General asset-downloader mode: source CSS Peeper/Site Palette; rejected because token extraction is useful, but bulk asset export would dilute the style-manager workflow.
- Chrome Web Store-only distribution: source Chrome extension packaging constraints and repo build script; rejected because local ZIP/load-unpacked remains the reliable self-distribution path.

## Sources
### Project
- https://github.com/SysAdminDoc/StyleCraft

### Direct competitors and ecosystem
- https://github.com/openstyles/stylus
- https://github.com/openstyles/stylus/wiki/Usercss
- https://github.com/openstyles/stylus/wiki/Writing-UserCSS
- https://github.com/openstyles/stylus/wiki/FAQ
- https://github.com/openstyles/stylus/wiki/Stylish-alternatives
- https://github.com/ankit/stylebot
- https://stylebot.dev/
- https://github.com/webextensions/live-css-editor
- https://chromewebstore.google.com/detail/amino-live-css-editor/pbcpfbcibpcbfbmddogfhcijfpboeaaf
- https://userstyles.world/
- https://github.com/tobimori/awesome-userstyles

### Adjacent products
- https://github.com/darkreader/darkreader
- https://darkreader.org/blog/dynamic-theme/
- https://resources.arc.net/hc/en-us/articles/19212718608151-Boosts-Customize-Any-Website
- https://github.com/GoogleChromeLabs/ProjectVisBug
- https://csspeeper.com/
- https://palette.site/

### Platform, specs, security, accessibility
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- https://developer.chrome.com/docs/extensions/reference/api/permissions
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/webstore/program-policies
- https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure
- https://www.w3.org/TR/css-cascade-6/
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40import
- https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/11-Client_Side_Testing/05-Testing_for_CSS_Injection
- https://www.w3.org/WAI/ARIA/apg/
- https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- https://webaim.org/techniques/forms/controls
- https://codemirror.net/

## Open Questions
None.
