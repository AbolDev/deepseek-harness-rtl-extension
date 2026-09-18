# DeepSeek Harness RTL

**Automatic text direction for a more natural reading experience in DeepSeek Harness.**

**English** · [فارسی](README.fa.md)

A lightweight Chrome extension that makes Persian, Arabic, and Hebrew text read right-to-left while keeping English and code left-to-right. Runs locally, with no build step and no runtime dependencies.

## Features

- Automatic direction detection for text blocks, including new and streaming messages.
- Live direction updates in textareas and editable text fields.
- Left-to-right code blocks and table column order; text inside table cells can use its own direction.
- An English popup with system-aware light/dark themes and a stable 440 × 360 layout.
- A persistent on/off switch shared across supported tabs.
- No analytics, external fonts, or external network requests from the extension.

This extension adjusts text direction, not the overall app layout. It is an independent project, not an official DeepSeek Harness extension.

## Installation

1. Download this repository using **Code → Download ZIP**, then extract it (or clone the repository).
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the **DeepSeek Harness RTL - Chrome Extension** subfolder containing `manifest.json` — not the repository root.
6. Refresh your DeepSeek Harness tab once.

Direction detection is automatic after installation. Pin the extension to the toolbar to access its switch easily.

### Supported pages

- http://127.0.0.1:3080
- http://localhost:3080

The page title must contain **DeepSeek Harness**. HTTPS, custom hostnames, and other ports are not supported by default. Chrome's content-script match patterns cover local HTTP hosts; the script checks the port and title before making changes.

### Updating

Replace the extension files, click **Reload** on its card at `chrome://extensions`, then refresh your Harness tabs. Keep the extension folder in a permanent location.

## How direction detection works

Each eligible text block is checked for Arabic-script or Hebrew letters. If any are present, the block uses RTL; otherwise it uses LTR. Persian is covered by Arabic-script detection. Code and URLs are excluded from language detection where supported by the parser.

The extension changes presentation only: it does not rewrite message text or input values. Turning it off removes its direction overrides.

### Limitations

- Mixed-language blocks use RTL whenever qualifying RTL letters are present, even if most words are English.
- Raw paths and complex mixed-direction text can still look ambiguous. Format paths as inline code when possible.
- Composer direction applies to the whole editable field, not separately to each line.
- Future Harness markup changes may require selector updates.
- The popup's theme follows the system; there is no manual theme or font selector.

## Privacy and permissions

The only declared API permission is **storage**, used to save the enabled preference locally. The content script reads page text to determine direction but does not store or transmit conversation content. Development tools may download test dependencies or a browser; these are not part of the installed extension.

## Repository structure

~~~text
DeepSeek Harness RTL - Chrome Extension/
  manifest.json
  content.js / content.css
  popup.html / popup.js / popup.css
  icons/
tests/
  rtl.test.mjs
  popup.test.mjs
  popup.visual.mjs
README.md
README.fa.md
~~~

## Development and tests

No build is required for the extension. Node.js 22 is recommended for tests.

~~~sh
cd tests
npm ci
npm test
~~~

These tests cover direction detection, streaming updates, typing, disabling/restoring styles, popup settings, and storage failure recovery.

### Browser layout tests

~~~sh
cd tests
npx playwright install chromium
npm run test:visual
~~~

To use an already installed Chrome instead of downloading Chromium (PowerShell):

~~~powershell
$env:BROWSER_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npm run test:visual
~~~

The layout test renders the popup files with mocked Chrome APIs. It checks light/dark themes and stable dimensions across loading, enabled, paused, and expanded-help states. Screenshots are written to `tests/screenshots/` and excluded from Git. This does not replace testing an installed extension.

Before releasing, load the unpacked extension and check Persian/Arabic and English messages, streaming output, code blocks, typing, the switch, and repeated popup opening in Chrome.

## Troubleshooting

- **Nothing changes:** confirm the supported URL and title, enable the switch, then refresh the Harness tab.
- **Old popup design:** reload the extension, close the popup, and open it again.
- **Settings error:** use **Try again**, or retry the switch if saving failed.
- **Unexpected text direction:** report the relevant markup and a minimal text example without private conversation data.

## Contributing

Small, focused improvements and reproducible bug reports are welcome. Run the tests before submitting a pull request. Do not include browser profiles, local snapshots, personal paths, or conversation exports.
