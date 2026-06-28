# Changelog

All notable changes to StyleCraft are documented here.

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
