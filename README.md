# StyleCraft

![Version](https://img.shields.io/badge/version-1.22.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-4285F4?logo=googlechrome&logoColor=white)
![Manifest](https://img.shields.io/badge/manifest-v3-orange)
![Status](https://img.shields.io/badge/status-active-success)

> A full-featured CSS style manager for Chromium browsers. Create, edit, import, and manage custom styles for any website with a professional dark-themed interface, visual element picker, full CSS editor, and UserStyles.world integration.

## Installation

### From Source (Developer Mode)
1. Clone or download this repository
2. Open `chrome://extensions` in your browser
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `stylecraft` folder
5. Pin the extension for quick access

### Supported Browsers
Chrome, Edge, Brave, Vivaldi, Opera, Arc — any Chromium-based browser supporting Manifest V3.

## Features

### Visual Editor
| Feature | Description |
|---------|-------------|
| Element Picker | uBlock-style point-and-click selector with live highlighting |
| Multi-Select Picker | Shift-click multiple elements to build combined selectors like `h1, h2, h3` |
| Stable Selectors | Prefers stable data/ARIA attributes and filters generated-looking classes |
| Visual Properties | Edit colors, fonts, spacing, display, borders via dropdowns and inputs |
| Box Model Visualizer | Interactive box model diagram with arrow-key editing |
| 4-Tab Layout | Selector, Visual, Code, and Themes tabs in the side panel |
| Live Preview | Changes apply in real-time as you type |
| Keyboard Accessibility | Options, popup, editor dialogs, CodeMirror escape, and picker selection support labelled keyboard workflows |

### Full CSS Editor (`editor.html`)
| Feature | Description |
|---------|-------------|
| Syntax Highlighting | CodeMirror 6 CSS editor with local bundled syntax highlighting and low-memory fallback |
| SCSS / Sass | CSS, SCSS, and indented Sass source modes compile locally before save/live preview |
| PostCSS Pipeline | Modern CSS nesting is flattened and vendor prefixes are added before save/live preview |
| UserCSS Metadata | `.user.css` metadata, update URLs, match rules, and variables are parsed and preserved |
| Style Templates | Insert var-driven surface, button, card, and form templates with variant selectors |
| Snippet Triggers | Type `;dark`, `;motion`, `;contrast`, `;vars`, or `;focus` to expand reusable CSS blocks inline |
| CSS Assist | Opt-in drafting panel inserts CSS from a local or OpenAI-compatible endpoint |
| Find & Replace | Ctrl+F / Ctrl+H with regex, case-sensitive toggle, match highlighting |
| Color Picker | Inline swatches for hex/rgb/hsl — click to edit with native color input |
| Bracket Matching | Highlights matching `{}`, `()`, `[]` at cursor position |
| Code Folding | Collapse/expand CSS blocks via gutter buttons |
| CSS Linting | Real-time errors (unclosed braces, invalid hex) and warnings (missing semicolons, typos) |
| Autocomplete | Property name suggestions as you type |
| Auto-Indent | Smart indentation on Enter inside blocks |
| Format/Beautify | One-click CSS formatting |
| Undo/Redo | Full history stack with Ctrl+Z / Ctrl+Shift+Z |
| Line Numbers | Active line highlighting, clickable gutter |
| Domain Sidebar | Tree view of all domains with custom CSS and theme entries |
| Keyboard Shortcuts | Help overlay showing all shortcuts |

### URL Pattern Matching
| Pattern Type | Example | Description |
|-------------|---------|-------------|
| `domain` | `github.com` | Matches domain and subdomains |
| `url` | `https://github.com/SysAdminDoc` | Exact URL match |
| `url-prefix` | `https://github.com/SysAdminDoc/` | URL starts with value |
| `regexp` | `https?://.*\.github\.(com\|io)/.*` | Full regex against URL |
| `wildcard` | `*.google.com` | Glob pattern with `*` wildcards |

Configure per-style via the "Applies To" panel in the CSS editor.
The same matcher drives early injection, popup installed-style state, badge counts, editor live preview, and background update broadcasts.

### Theme Management
| Feature | Description |
|---------|-------------|
| UserStyles.world Browser | Search, preview, and install themes through a tested catalog adapter with cached fallback |
| Stylus Import | Import Stylus backup JSON with full @-moz-document parsing and multi-domain aggregation |
| Stylebot Import | Import Stylebot exports |
| Auto-Update Check | Compares installed USw themes against remote, one-click apply updates |
| Sort & Filter | Sort by name/domain/lines/date, filter by enabled/disabled/has-update |
| Bulk Operations | Select all, bulk enable/disable/delete |
| Clone/Duplicate | Clone styles or themes to another domain |
| Single Export | Export one domain's styles as a standalone JSON file |

### Readability Mode
| Feature | Description |
|---------|-------------|
| Reading Themes | Dark, Sepia, Light, OLED |
| Font Picker | Georgia, Times New Roman, System Sans, Helvetica, Verdana, Courier New + Google Fonts (Merriweather, Inter, Literata) |
| Font Size | Adjustable 12-28px with live slider |
| Line Height | Adjustable 1.2-2.4 with live slider |
| Content Width | Adjustable 400-1000px with live slider |
| Element Stripping | Hides sidebars, ads, navigation, comments, related posts |

### Data & Safety
| Feature | Description |
|---------|-------------|
| Auto-Backup | Daily automatic backup, keeps last 3 snapshots |
| Restore from Backup | In-page backup picker with preview counts, validation, and undo |
| Undo for Deletes | 8-second undo window on all destructive operations |
| Quota Protection | Catches and surfaces storage quota errors |
| Import Guard | Validates imported data, quarantines invalid entries, blocks dangerous CSS schemes, and creates a pre-import backup before storage writes |
| CSS Trust Checks | Flags remote CSS fetches and high-risk selectors with per-style trust metadata |
| Per-Site Access Grants | Host access is optional; the popup requests the current site only when StyleCraft needs to inject styles |
| Local Assist Settings | CSS assist endpoint/model stay in settings; optional key is stored separately from exports |
| Full Export/Import | JSON export of all data, compatible cross-browser |
| Context Menu | Right-click "Style this element" and "Hide this element" |
| Badge Counter | Shows active style count per tab |

### UI Themes
Three built-in themes across all interfaces (popup, editor, options):
- **Catppuccin Mocha** (default) — warm purple accents
- **Dark / OLED** — true black with blue accents
- **Light** — clean light theme with purple accents

## Quick CSS

The popup includes a collapsible Quick CSS textarea for fast edits without opening the full editor. Type CSS, hit Save & Apply, and it's live. Click the expand button to open in the full editor.

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Popup / Editor │────>│  chrome.storage  │────>│  inject-styles   │
│                  │     │     .local       │     │  (document_start)│
│  Write CSS       │     │  stylecraft_data │     │  Read & inject   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                                │
        ▼                                                ▼
┌─────────────────┐                              ┌─────────────────┐
│   content.js     │                              │   <style> tags   │
│                  │                              │                  │
│  Visual editor   │                              │  Theme CSS       │
│  Element picker  │                              │  Custom CSS      │
│  Live preview    │                              │  Global CSS      │
└─────────────────┘                              └─────────────────┘
```

**No background worker dependency for injection.** Styles are read directly from `chrome.storage.local` at `document_start`, ensuring instant application before page render. Host access is granted per HTTP/HTTPS site from the popup; once granted, the static document-start content script runs on future page loads for that site without requiring the service worker. The service worker handles only permission checks, USw API calls, context menus, badge updates, and backups.

## File Structure

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config (MV3) |
| `background.js` | Service worker — USw API, context menus, badge, auto-backup |
| `style-data.js` | Shared import schema guard, CSS trust analyzer, quarantine, merge/replace summary, and pre-import backup helpers |
| `style-match.js` | Shared URL and UserCSS document matcher for injection, popup, editor preview, and badge logic |
| `usercss.js` | Shared `.user.css` metadata, variable, and nested `@-moz-document` parser/resolver |
| `usw-adapter.js` | UserStyles.world catalog/search parser, cached fallback helpers, and style detail/source adapter |
| `content.js` | Visual editor, element picker, readability mode |
| `inject-styles.js` | Style injection at document_start |
| `popup.html/js` | Extension popup — installed styles, quick CSS, theme browser |
| `editor.html/js` | Full-page CSS editor |
| `options.html/js` | Options page — style management, settings, import/export |
| `theme.js` | Shared theme application |

## Configuration

All settings are accessible via the Options page (right-click extension icon > Options):

| Setting | Description | Default |
|---------|-------------|---------|
| Editor Width | Side panel width (px) | 420 |
| Code Font Size | Editor font size (px) | 12 |
| Auto-open Picker | Start element picker when editor opens | On |
| Default Tab | Tab shown when editor opens | Selector |
| Custom CSS on Top | Custom CSS layers above themes | On |
| Add !important | Append !important to all declarations | Off |
| Live Preview | Apply changes in real-time | On |
| UI Theme | Catppuccin / Dark / Light | Catppuccin |
| Accent Color | Primary accent color | #cba6f7 |
| Highlight Color | Element picker highlight color | #89b4fa |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+F` | Find |
| `Ctrl+H` | Find & Replace |
| `Tab` | Indent |
| `Shift+Tab` | Outdent |
| `Escape` | Close overlay / Find bar |

The global toggle shortcut can be configured at `chrome://extensions/shortcuts`.

## Development Build

```bash
npm install
npm run build
npm test
npm run build:zip
```

The CodeMirror, Sass, and PostCSS bundles are generated into `vendor/` and shipped locally with the extension; no remote runtime scripts are used.

## Import Compatibility

| Source | Format | Notes |
|--------|--------|-------|
| StyleCraft | JSON | Full backup/restore |
| Stylus | JSON array | Parses @-moz-document sections, extracts domains, aggregates multi-domain styles |
| Stylebot | JSON object | Maps domain keys to custom CSS entries |

## FAQ

**Q: Why aren't my styles applying?**
Styles inject at `document_start` from storage. If you just installed, reload the target page. Check that the style is enabled (green dot in editor sidebar).

**Q: Can I use this on Chrome Web Store pages?**
Chrome restricts extensions on `chrome://` and Web Store pages. StyleCraft cannot inject styles there.

**Q: Where is my data stored?**
All data is in `chrome.storage.local` (up to 10MB). Use Export to create backups. Auto-backup runs daily.

**Q: How do I import from Stylus?**
Export your Stylus data as JSON, then use the Import button in StyleCraft's Options page or popup. StyleCraft automatically detects the Stylus format.

## Related Tools

| Tool | Type | Best For |
|------|------|----------|
| **StyleCraft** (this repo) | Ground-up MV3 extension | Power users who want a full CSS editor with syntax highlighting, linting, autocomplete, Stylus import, and UserStyles.world integration |
| [StyleKit](https://github.com/SysAdminDoc/StyleKit) | Stylebot fork | Casual users who want plain-English labels, guided onboarding, and one-click site recipes — no manual CSS required |

If you want a simpler point-and-click interface with plain-English labels and pre-built site recipes, see [StyleKit](https://github.com/SysAdminDoc/StyleKit) (a modernized Stylebot fork).

## Contributing

Issues and PRs welcome. The codebase is vanilla JS with no build step — load the folder directly as an unpacked extension for development.

## License

[MIT](LICENSE) — Copyright (c) 2026 SysAdminDoc
