# Privacy Policy for StyleCraft

**Last updated:** June 30, 2026

## Overview

StyleCraft is a browser extension that allows users to customize the appearance of websites by applying custom CSS styles. Your privacy is important to us. This policy explains what data StyleCraft handles and how it is used.

## Data Collection

**StyleCraft does not collect, transmit, or share any personal data.**

All data created and used by StyleCraft is stored entirely on your device using Chrome's local storage API (`chrome.storage.local`). No data ever leaves your browser.

## Data Stored Locally

StyleCraft stores the following data locally on your device:

- **Custom CSS styles** you create for websites
- **Theme preferences** (UI theme selection, readability settings)
- **Installed community styles** downloaded from UserStyles.world
- **Auto-backup snapshots** (up to 3 rotating backups of your styles)
- **Extension settings** (badge counter preference, sort/filter state)

## Network Requests

StyleCraft makes network requests only in the following situations:

- **UserStyles.world search:** When you search for community styles, StyleCraft sends search queries to `userstyles.world` to retrieve publicly available style listings. No personal data is included in these requests.
- **Style installation:** When you install a community style, StyleCraft fetches the style's CSS from the UserStyles.world API.
- **Update checks:** StyleCraft periodically checks UserStyles.world for updates to installed community styles.

No analytics, tracking, telemetry, or advertising services are used.

## Local Diagnostics Export

The Options page includes a "Generate Report" button that produces a local diagnostic JSON file. This report contains:

- Extension version and browser language
- Storage usage (bytes, CSS line counts)
- Style counts by source (USw, Stylus, UserCSS, custom) with domain names redacted
- Backup status (timestamps, success/failure)
- UserStyles.world catalog status with URLs redacted
- Import quarantine summary (rejection reasons only, no style content)

The diagnostic report is generated entirely on your device. **It is never transmitted over the network.** The report is saved as a local JSON file that you can share with support if you choose to. URLs and domain names are redacted by default to protect browsing privacy.

## Permissions Justification

- **storage:** Save your custom styles and settings locally
- **scripting:** Inject your custom CSS into web pages
- **tabs:** Detect the active tab's URL to apply site-specific styles
- **contextMenus:** Provide right-click options to style or hide elements
- **alarms:** Schedule daily automatic backups of your styles
- **optional_host_permissions (HTTP/HTTPS sites):** Apply user-created CSS styles only on sites where the user grants access from the popup

## Third-Party Services

StyleCraft integrates with [UserStyles.world](https://userstyles.world), a public community repository of user-created website styles. When you search for or install community styles, requests are made to UserStyles.world's public website and API. No account or personal information is required or transmitted.

## Data Sharing

StyleCraft does not share any data with any third party. No data is sold, transferred, or used for advertising, analytics, or any purpose other than providing the extension's functionality.

## Limited Use Disclosure

StyleCraft's use of information received from Google APIs adheres to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements.

## Changes to This Policy

If this privacy policy is updated, the changes will be reflected in this document with an updated date.

## Contact

For questions about this privacy policy, please open an issue on the [StyleCraft GitHub repository](https://github.com/SysAdminDoc/StyleCraft).
