# StyleCraft

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-0078D4)
![Manifest](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)

> A visual CSS editor for Chrome that lets you pick elements, tweak styles, and install community themes — all from a premium dark-themed interface.

## Installation

1. Download or clone this repository
2. Open `chrome://extensions` in Chrome, Edge, or Brave
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `stylecraft` folder

## Features

| Feature | Description |
|---------|-------------|
| **Element Picker** | uBlock-style selector with depth navigation (parent/child/sibling traversal) and adjustable specificity |
| **Visual Editor** | Point-and-click CSS property editing across 10 categories with live preview |
| **Code Editor** | Raw CSS textarea with line numbers, undo/redo, and real-time injection |
| **Box Model Visualizer** | Stylebot-style interactive box model — click any margin/border/padding/content value to edit inline with arrow key increment and live CSS preview |
| **Theme Browser** | Search and install community themes from [UserStyles.world](https://userstyles.world) directly in the editor |
| **Dual CSS Layers** | Theme CSS and custom CSS applied as separate layers — custom always wins |
| **Stylus Compatibility** | Full `@-moz-document` / `@document` directive parsing (domain, url, url-prefix, regexp) |
| **3 UI Themes** | Catppuccin Mocha (default), Dark (OLED), and Light — synced across popup, editor, and options |
| **Context Menus** | Right-click → "Style this element" or "Hide this element" |
| **Import / Export** | Full data backup and restore as JSON |
| **Global CSS** | Write CSS that applies across every site |

### Editor Property Categories

Typography, Colors & Background, Spacing, Size & Layout, Flexbox, Position, Border & Outline, Shadows & Effects, Transform & Animation, Cursor & Misc

### Box Model Editing

Click any value in the box model diagram to edit it inline. While focused:

- **Up/Down** arrows increment/decrement by 1px
- **Shift+Up/Down** increment/decrement by 10px
- Negative values are fully supported (useful for negative margins)
- CSS updates live as you press arrow keys — no need to commit first
- **Enter** commits, **Escape** reverts to original value
- Click the content area (W × H) to edit width and height with **Tab** to switch fields

### Options Page Tabs

| Tab | Purpose |
|-----|---------|
| Custom CSS | View and edit per-domain custom CSS rules |
| Installed Themes | Manage installed UserStyles.world themes per domain |
| Browse Themes | Search and install themes from UserStyles.world |
| Global CSS | CSS applied to all websites |
| Shortcuts | Quick-reference for keyboard shortcuts |
| Settings | UI theme, accent color, injection timing, export/import |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+S` | Open StyleCraft popup |
| `Alt+Shift+S` | Toggle editor on current page |

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  inject-styles  │────>│  chrome.storage │<────│   background    │
│ (document_start)│     │     .local      │     │ (service worker)│
│                 │     │                 │     │                 │
│ Reads storage   │     │ stylecraft_data │     │ Handles messages│
│ directly, no SW │     │ per-domain CSS  │     │ USw API proxy   │
│ dependency      │     │ + settings      │     │ Tab broadcasts  │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              ┌─────┴─────┐           ┌───────┴───────┐
              │  content  │           │    popup /    │
              │  (editor) │           │   options     │
              │           │           │               │
              │ Shadow DOM│           │ Theme mgmt    │
              │ Visual CSS│           │ USw browser   │
              │ Box model │           │ Import/Export │
              └───────────┘           └───────────────┘
```

**Style persistence** — `inject-styles.js` runs at `document_start` and reads directly from `chrome.storage.local`, bypassing the service worker entirely. This guarantees styles load even when the MV3 service worker is asleep. A DOMContentLoaded re-apply ensures styles survive late `<head>` creation.

**Dual layer system** — Each domain stores two independent layers: theme CSS (from installed UserStyles.world themes) and custom CSS (from the visual/code editor). Theme CSS injects first, custom CSS always overlays on top. Both layers are managed through separate `<style>` elements with fixed IDs.

**Shadow DOM isolation** — The editor panel injects into the page inside a Shadow DOM container, preventing host page styles from affecting the editor UI and vice versa.

## File Structure

```
stylecraft/
├── manifest.json        # MV3 manifest
├── background.js        # Service worker — message router, USw API, storage
├── inject-styles.js     # Content script (document_start) — reads storage, injects CSS
├── content.js           # Editor UI — shadow DOM panel, visual editor, box model
├── popup.html/js        # Extension popup — domain toggle, USw search, quick tools
├── options.html/js      # Full options page — 6 tabs, theme management, settings
├── theme.js             # Shared theme engine — auto-loads and syncs across all UIs
├── icons/               # Extension icons (16, 48, 128)
├── LICENSE              # MIT
└── README.md
```

## Prerequisites

- Chrome 110+, Edge 110+, or Brave (any Chromium-based browser with MV3 support)
- No build step required — plain JS, no bundler, no dependencies

## FAQ

**Styles disappear after refresh?**
Fixed in v1.0.0. The injector now reads directly from `chrome.storage.local` at `document_start` instead of messaging the service worker, which may be asleep in MV3.

**Can I use Stylus themes?**
Yes. StyleCraft parses `@-moz-document` and `@document` directives (domain, url, url-prefix, regexp) — the same format Stylus/UserStyles.world uses.

**Does the editor affect the page?**
No. The editor runs inside a Shadow DOM container. Its styles and DOM are completely isolated from the page.

**Can I use negative margins?**
Yes. The box model editor accepts any integer value including negatives. Arrow keys work in both directions with no floor.

## License

[MIT](LICENSE) — Issues and PRs welcome.
