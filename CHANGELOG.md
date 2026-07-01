# Changelog

All notable changes to StyleCraft are documented here.

## [1.24.0] - 2026-07-01

### Added
- External-file import/export: export styles as `.user.css` files from the editor and options page; import `.user.css` files with full UserCSS metadata preservation.
- Privacy-safe diagnostics export: options page generates a local diagnostic report with redacted URLs, storage metrics, backup status, and adapter state. No data is transmitted.
- Regex URL pattern tester in the editor's Applies To panel: enter a URL to check whether it matches the current style's patterns.
- CSS layer wrapping setting: wrap injected styles in `@layer stylecraft` for cascade control over host page `@layer` declarations.
- Per-style conditional triggers: checkboxes for `prefers-color-scheme: dark/light`, `prefers-reduced-motion: reduce`, and `prefers-contrast: more` that wrap injected CSS in `@media` queries.
- Element picker nth-child path fallback: when no stable class, ID, or data attribute is available, the picker generates a precise `nth-child` chain instead of a bare tag name.
- Text-to-speech button in the side-panel editor: reads page content aloud using browser SpeechSynthesis with start/stop toggle.
- Per-style usage analytics: local-only match counter shown per domain in the options page, throttled to avoid storage contention.
- Per-site reading preferences: readability mode settings (theme, font, size, width) are saved per-domain and restored on future visits.
- Keyboard-driven command palette: `Ctrl+K` opens a searchable list of editor actions (save, format, templates, source modes, exports, toggles).

## [1.23.0] - 2026-06-30

### Added
- Computed design-token extraction in the Visual panel with color/type/spacing tokens, contrast status, copy actions, and insert-to-CSS actions.
- Content-script regression coverage for computed token extraction and Visual-panel token insertion.

## [1.22.0] - 2026-06-30

### Added
- Workflow regression coverage for export schemas, theme update application, popup community-style install/uninstall, and ZIP artifact validation.

## [1.21.0] - 2026-06-30

### Added
- Optional per-site host access grants replace required broad host permissions while preserving document-start injection on granted sites.
- Popup access prompt, service-worker permission guards, and Playwright coverage for manifest permission shape and grant flow.

## [1.20.0] - 2026-06-29

### Added
- Accessibility and focus coverage for options tabs, popup Quick CSS, editor dialog/CodeMirror focus recovery, and keyboard-driven Shadow DOM picker selection.
- Playwright accessibility smoke coverage for labels, tablist semantics, visible focus, dialog/panel focus return, and pointer-free picker operation.

## [1.19.0] - 2026-06-28

### Added
- Shared UserCSS parser for metadata, variables, update URLs, match rules, and nested `@-moz-document` resolution.
- Editor variable controls for parsed UserCSS variables with saved local values applied during injection.
- UserCSS smoke coverage for parser round-trip, import preservation, nested document blocks, and editor variable controls.

## [1.18.0] - 2026-06-28

### Added
- Tested UserStyles.world catalog adapter for search-card parsing, style detail/source normalization, and cached last-known search fallback.
- Popup and options warnings when cached UserStyles.world results are shown because live search failed.
- Adapter smoke coverage for current card markup, markup-drift detection, cache fallback, and raw-source fallback.

## [1.17.0] - 2026-06-28

### Added
- Explicit backup status reporting plus an in-page restore picker with backup preview counts, validation, and corrupt-backup handling.
- Backup restore smoke coverage for failure visibility, restore, undo, and corrupt backup refusal.

### Fixed
- Undo toast text now keeps the restored/deleted action label and the Undo button remains clickable while visible.

## [1.16.0] - 2026-06-28

### Added
- CSS trust checks for imports, community installs/updates, editor saves, options saves, popup quick saves, and background save messages.
- Trust smoke coverage for remote fetch warnings, high-risk selector warnings, blocked CSS schemes, and editor save blocking.

## [1.15.0] - 2026-06-28

### Added
- Import validation guard with schema normalization, invalid-entry quarantine, size checks, merge/replace counts, and guaranteed pre-import backups before storage writes.
- Options import smoke coverage for valid native imports, quarantined corrupt entries, and corrupt-file overwrite prevention.

## [1.14.0] - 2026-06-28

### Added
- Shared URL/style matcher for injection, popup installed-state, badge counts, editor live preview, background update broadcasts, and UserCSS document matching.
- Matcher parity smoke coverage for domain, url, url-prefix, regexp, wildcard, stored-key, and `@-moz-document` conditions.

## [1.13.0] - 2026-06-27

### Added
- **Stable selector preference** - element picker now prefers data/ARIA attributes before classes and filters generated-looking class names.
- Content-script smoke coverage for data attribute selection over generated classes.

## [1.12.0] - 2026-06-27

### Added
- **Element picker multi-select** - shift-click multiple page elements to build combined selectors such as `h1, h2, h3`.
- Content-script smoke coverage for real picker clicks, combined selector output, match count, and multi-target outlines.

## [1.11.0] - 2026-06-27

### Added
- **CSS assist panel** - editor can draft CSS inline from a local or OpenAI-compatible chat endpoint when the user opts in.
- Smoke coverage for mocked local drafting, response extraction, and inline CodeMirror insertion.
- Optional assist key is stored separately from exported settings.

## [1.10.0] - 2026-06-27

### Added
- **Snippet trigger library** - editor expands typed triggers like `;dark`, `;motion`, `;contrast`, `;vars`, and `;focus` into reusable CSS blocks.
- Smoke coverage for typed snippet expansion in the CodeMirror editor.

## [1.9.0] - 2026-06-27

### Added
- **CSS-in-JS style templates** — editor toolbar can insert var-driven surface, button, card, and form templates with variant selectors.
- Smoke coverage for template insertion in the CodeMirror editor.

## [1.8.0] - 2026-06-27

### Added
- **PostCSS save pipeline** — CSS from all source modes now runs through local PostCSS nesting and Autoprefixer before save/live preview.
- Smoke coverage for nested CSS flattening and vendor prefix output.

## [1.7.0] - 2026-06-27

### Added
- **SCSS / Sass source modes** — editor can preserve CSS, SCSS, or indented Sass source and compile Sass modes locally before save/live preview.
- Bundled local Sass compiler build and smoke coverage for compiled storage output.

## [1.6.0] - 2026-06-27

### Added
- **CodeMirror 6 editor engine** — full CSS editor now uses a bundled local CodeMirror 6 surface with CSS syntax highlighting, folding, bracket matching, autocomplete, search highlights, and color swatches.
- **Low-memory editor fallback** — the original textarea/highlight editor remains available automatically on very low-memory devices and via `editor.html?legacy=1`.
- Local extension validation and ZIP packaging scripts.

### Fixed
- Manifest and popup icon paths now point at the shipped `icon.png` asset.
- Version strings are synchronized across manifest, UI, export metadata, README, changelog, and working notes.

## [1.5.0] - 2026-02-13

### Added
- **Undo for destructive actions** — delete/bulk-delete operations now show an Undo button in the toast notification (8-second window to revert)
- **Auto-backup system** — daily automatic backup of all data, keeps last 3 snapshots, restore from Settings > Data & Storage
- **Single-domain export** — export button on each style card to save one domain's styles as a standalone JSON file
- **Keyboard shortcut cheatsheet** — help button (?) in editor toolbar shows all shortcuts in an overlay
- **Onboarding guidance** — empty popup state now explains how to get started with Visual Editor, CSS Editor, or Quick CSS
- **Storage quota protection** — all save operations now catch and surface quota exceeded errors instead of silently failing
- **Export buttons** on individual style cards in Options page

### Improved
- Better empty states across all interfaces
- Version consistency across all files

---

## [1.4.0] - 2026-02-13

### Added
- **Code folding** — click -/+ buttons in the gutter to collapse/expand CSS blocks, supports nested folding
- **CSS linting** — real-time error/warning detection with gutter dots, clickable lint panel, detects unclosed braces, missing semicolons, invalid hex colors, property typos
- **Enhanced readability mode** — 4 reading themes (Dark/Sepia/Light/OLED), font picker with 6 system + 3 Google Fonts, font size slider (12-28px), line height slider (1.2-2.4), content width slider (400-1000px)
- Readability settings panel in popup with live preview
- Google Fonts loaded on demand via @import

---

## [1.3.0] - 2026-02-13

### Added
- **Sort controls** — Custom CSS tab: Domain A-Z/Z-A, Most/Fewest Lines, Recently Modified. Themes tab: Name A-Z/Z-A, Domain A-Z, Most Lines, Recently Installed
- **Filter controls** — All, Enabled, Disabled (themes also: Has Update)
- **Bulk operations** — Select All checkbox, per-card checkboxes, bulk Enable/Disable/Delete for both tabs
- **Auto-update check** — Check Updates button fetches latest CSS from UserStyles.world API, shows update badges, one-click apply
- **Clone/duplicate** — clone styles or themes to another domain with one click
- `installedAt` timestamp on all new USw theme installs
- Install date shown in theme card metadata

---

## [1.2.0] - 2026-02-13

### Added
- **Advanced URL pattern matching** — 5 pattern types: domain, url, url-prefix, regexp, wildcard
- **"Applies To" UI** — collapsible panel in CSS editor with per-pattern type dropdown + value input, live save
- **Style metadata** — name, description, created/modified dates per domain entry
- Sidebar shows meta name when available
- Backward compatible: entries without appliesTo fall back to domain key matching

---

## [1.1.0] - 2026-02-13

### Added
- **Find & Replace** — Ctrl+F/Ctrl+H with regex support, case-sensitive toggle, match highlighting, replace one/all
- **Color picker** — inline color swatches for hex/rgb/hsl values, click to edit with native color input
- **Bracket matching** — highlights matching {}, (), [] pairs at cursor position
- **Quick CSS in popup** — collapsible textarea for quick edits, save & apply, expand to full editor

---

## [1.0.9] - 2026-02-13

### Added
- Delete buttons in sidebar for domains, custom CSS, and themes
- Auto-cleanup of empty domain entries after deletion

---

## [1.0.8] - 2026-02-13

### Fixed
- MV3 CSP compliance — extracted inline script to editor.js

---

## [1.0.7] - 2026-02-13

### Added
- Edit buttons in popup and options link to full CSS editor
- Hash-based routing (#domain or #domain/theme/ID)
- Sidebar tree structure with collapsible domains

---

## [1.0.6] - 2026-02-13

### Added
- Full-page CSS editor (editor.html) with syntax highlighting, line numbers, autocomplete, live preview, undo/redo, auto-indent, format, domain sidebar

---

## [1.0.5] - 2026-02-13

### Added
- Installed styles section in popup showing custom CSS + themes for current domain
- Popup storage independence from background worker

---

## [1.0.4] - 2026-02-12

### Fixed
- Stylus settings object detection during import

---

## [1.0.3] - 2026-02-12

### Changed
- Complete options.js rewrite eliminating background worker dependency
- Direct storage reads/writes throughout
- Stylebot import support
- Runtime.lastError fixes
- Tab URL filtering for message passing
- Generated extension icons

---

## [1.0.2] - 2026-02-12

### Added
- Direct storage writes bypassing service worker
- Toolbar badge counter showing active styles per tab

---

## [1.0.1] - 2026-02-12

### Added
- Stylus backup import with multi-domain aggregation
- @-moz-document section parsing and domain extraction

---

## [1.0.0] - 2026-02-12

### Added
- Box model arrow key editing with visual feedback

---

## [0.0.1 - 0.9.x] - 2026-02-12

### Initial Development
- Chrome extension with uBlock-style element selector
- Visual CSS editor with 4-tab layout (Selector, Visual, Code, Themes)
- UserStyles.world browser with search, preview, and install
- Dual-layer CSS system (custom CSS + installed themes)
- Live preview with real-time injection
- Comprehensive options page with import/export
- Editable box model visualizer
- Unified 3-theme system (Catppuccin, Dark/OLED, Light)
- Stylus and Stylebot backup import
- Context menu: "Style this element" and "Hide this element"
- Keyboard shortcut support via chrome.commands
- Readability mode and grayscale mode
