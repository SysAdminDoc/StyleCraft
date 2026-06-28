# StyleCraft Roadmap

Roadmap for StyleCraft, the Chrome MV3 CSS style manager with visual element picker, full CSS editor, USw integration, and Stylus import.

## Planned Features

### Element picker
- XPath fallback for sites with no stable class/id
- Before/after live diff preview
- Recording mode - every edit becomes a named step for replay

### Matching & scoping
- CSS-layer order control (user-styles above `@layer` vs below)
- `@scope` support for proper cascading when host pages use it
- Per-style conditional triggers (time of day, reduced-motion, dark-mode media query, prefers-contrast)
- Regex URL matching UI with pattern tester

### Sync & library
- Optional encrypted sync (user-provided passphrase, AES-GCM, store to their chosen endpoint)
- GitHub Gist sync in addition to USw
- Stylus backup full-import with `@-moz-document` parsing improvements
- Export Chrome-only CRX of a selected style as a standalone extension (for sharing)
- Per-style version history with checkout/diff/revert

### Firefox & cross-browser
- Firefox MV3 port (manifest variant, polyfills)
- Edge-specific picker fixes for Edge Splitview mode
- Safari Web Extension port via `xcrun safari-web-extension-converter`

### Readability mode
- Per-site reading themes + custom CSS
- Reading-list save (with reader-view rehydration later)
- TTS button (uses browser SpeechSynthesis)
- Highlighter + notes saved per URL

## Competitive Research

- **Stylus** - the reference open-source style manager. StyleCraft is intentionally a different codebase, but add Stylus-compatible import/export for seamless migration in both directions.
- **Stylebot** - the root StyleKit forked; Stylebot's plain-English labels are the reason that branch exists. StyleCraft can add a "Simple mode" toggle that borrows the labels without forking.
- **UserStyles.world** - already integrated. Add a "mirror" fallback in case USw is down (cache installed styles' sources for offline install).
- **CSS Peeper / Stylebot Playground** - dev-facing tools with computed-style inspection; worth mirroring in StyleCraft's Visual panel.
- **Arc Boosts** - Arc browser ships per-site JS + CSS editing natively; StyleCraft's advantage is cross-browser. Copy Arc's "Zap" element-remove UX.

## Nice-to-Haves

- Multi-profile support (per-browser-profile style isolation if the user runs multiple profiles)
- Auto-generated "dark-mode for this site" via heuristic color inversion fallback
- Keyboard-driven command palette (`Ctrl+K` everywhere)
- Per-style usage analytics (local only: "how often did this style match a page?")
- Safer import: refuse `url(javascript:)` and nuke at-import chains
- Style-pack gallery hosted on GitHub Pages, installable via URL
- Publish-to-USw button directly from the editor with metadata prefilled

## Open-Source Research (Round 2)

### Related OSS Projects
- https://github.com/openstyles/stylus — Canonical userstyles manager: CSS/LESS/Stylus preprocessing, cloud sync (Dropbox/GDrive/OneDrive/WebDAV), JSON backup, auto-update, linters
- https://github.com/ankit/stylebot — Original Stylebot; point-and-click element styling + full-code editor
- https://github.com/darkreader/darkreader — Dynamic dark-mode engine; inversion + color-scheme detection
- https://github.com/xcss/xStyle — Stylish fork with style management + preprocessor
- https://github.com/violentmonkey/violentmonkey — Userscripts counterpart, MV3 migration reference
- https://userstyles.world — Modern UserCSS hosting (successor to userstyles.org), import target
- https://github.com/openstyles/stylus/wiki/Stylish-alternatives — Canonical alt list

### Features to Borrow
- UserCSS format support — single-file `.user.css` with `@name`/`@namespace`/`@version`/`@updateURL` metadata, auto-update polling (Stylus)
- Preprocessor support: Less/Stylus/SCSS compile at save time (Stylus)
- Stylelint + CSSLint-mod integrated editor (Stylus)
- Cloud sync layer: Dropbox / GDrive / OneDrive / generic WebDAV adapters (Stylus)
- Stylish-compatible JSON backup format for friction-free migration in/out (Stylus)
- Dark Reader integration — dispatch "skip dark-reader for matched URLs" for pages where StyleCraft already supplies a dark theme
- Point-and-click element picker UX from Stylebot (already have; reference for keyboard-a11y fallback)
- Install from raw URL with confirmation preview pane (Stylus)

### Patterns & Architectures Worth Studying
- UserCSS-centric source of truth — all styles internally stored as UserCSS text, edit/apply derive from parse; interop with every other manager "for free" (Stylus model)
- `@match` + `@exclude-match` glob with MV3 `declarativeNetRequest` fast-path vs content-script slow-path selection based on complexity (performance opportunity)
- Per-style ServiceWorker event hooks so a style can run JS prep once per navigation (Stylus advanced feature)
- Option-page iframe sandbox for preview — render target page in srcdoc with injected style to preview before apply (Stylus)
- Violentmonkey's MV3 migration approach for scripts — applicable if StyleCraft adds a user-script sibling mode

## Research-Driven Additions

- [ ] P1 - Build a shared UserCSS metadata and variable parser
  Why: Stylus-compatible `.user.css` metadata, variables, update URLs, includes, excludes, and preprocessors are ecosystem table-stakes and current parsing is regex-fragmented.
  Evidence: Stylus UserCSS and Writing UserCSS docs; `background.js` `resolveUserCSS()`; `options.js` `convertStylusImport()`.
  Touches: `background.js`, `inject-styles.js`, `options.js`, `editor.js`, `tests/`
  Acceptance: UserCSS metadata round-trips on import/export, variables render editable controls, update URLs are preserved, and parser fixtures cover nested document blocks.
  Complexity: L

- [ ] P1 - Add options/popup accessibility and focus coverage
  Why: The extension uses custom tabs, icon buttons, inline SVG buttons, CodeMirror, and Shadow DOM controls, but tests do not verify accessible names, tab order, or focus recovery.
  Evidence: WAI-ARIA APG tabs/focus guidance; WebAIM form-control guidance; CodeMirror accessibility docs; `popup.html`, `options.html`, `editor.html`, `content.js`.
  Touches: `popup.html`, `options.html`, `editor.html`, `content.js`, `tests/`
  Acceptance: Playwright verifies labels/names, tablist semantics, visible focus, dialog/panel focus return, CodeMirror escape path, and picker operation without pointer input.
  Complexity: M

- [ ] P1 - Minimize broad host-permission trust friction
  Why: `<all_urls>` and all-frame document-start injection support anti-FOUC but create review and trust friction; Chrome supports optional runtime permissions for clearer user intent.
  Evidence: `manifest.json`; Chrome permission and `chrome.permissions` docs; Chrome Web Store policy guidance.
  Touches: `manifest.json`, `background.js`, `popup.js`, `options.js`, `inject-styles.js`, `README.md`
  Acceptance: A reviewed permission model documents why early injection needs broad access or offers a per-site grant mode that preserves no-flash behavior for enabled sites.
  Complexity: L

- [ ] P1 - Expand smoke tests into workflow regression tests
  Why: Current Playwright coverage exercises editor and picker happy paths only, leaving import/export, updates, backup/restore, popup search, packaging, and error states untested.
  Evidence: `tests/editor-smoke.spec.mjs`, `tests/content-picker-smoke.spec.mjs`, `tools/validate-extension.mjs`.
  Touches: `tests/`, `tools/`, `background.js`, `options.js`, `popup.js`
  Acceptance: `npm test` covers import/export schemas, USw adapter failures, backup restore, popup install/update, matcher parity, and build artifact validation.
  Complexity: M

- [ ] P2 - Add computed-style and design-token extraction to the Visual panel
  Why: CSS Peeper, VisBug, and Site Palette show demand for readable computed fonts/colors/spacing/assets without digging through DevTools.
  Evidence: CSS Peeper, VisBug, Site Palette; existing ROADMAP CSS Peeper note; `content.js` visual editor.
  Touches: `content.js`, `editor.js`, `popup.js`, `tests/`
  Acceptance: Selecting an element shows computed color/font/spacing tokens with copy/insert actions, contrast warnings, and tests for token extraction on sample pages.
  Complexity: L

- [ ] P2 - Add optional external-file import/export workflow
  Why: Magic CSS and Stylus users value editing styles in their chosen editor and syncing through their own tools.
  Evidence: Magic CSS file save/reloader features; Stylus local-filesystem request; existing raw URL install roadmap item.
  Touches: `editor.js`, `options.js`, `manifest.json`, `README.md`, `tests/`
  Acceptance: Users can export a style as `.user.css`, re-import it without metadata loss, and optionally refresh from a chosen local file where browser APIs permit.
  Complexity: L

- [ ] P2 - Add privacy-safe diagnostics export
  Why: Service-worker, storage, quota, and community-style failures currently surface inconsistently, making support and recovery harder without collecting telemetry.
  Evidence: `background.js` swallowed backup errors; `options.js` quota toast; Chrome extension security guidance; no telemetry promise in `PRIVACY.md`.
  Touches: `background.js`, `options.js`, `popup.js`, `PRIVACY.md`, `tests/`
  Acceptance: Options page exposes a local diagnostic log/export with redacted URLs by default, storage usage, last backup status, adapter errors, and no network transmission.
  Complexity: M
