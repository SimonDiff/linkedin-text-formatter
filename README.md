# LinkedIn Text Formatter

Chrome extension (Manifest V3) that adds a formatting toolbar to LinkedIn's text boxes.
LinkedIn has no real bold or italic, so the toolbar swaps letters for Unicode look-alikes
(𝗯𝗼𝗹𝗱, 𝘪𝘵𝘢𝘭𝘪𝘤, u̲n̲d̲e̲r̲l̲i̲n̲e̲ …) right inside the editor. No more copy, convert, paste.

## Where it shows up

| Place | Toolbar | Counter |
|---|---|---|
| "Start a post" modal | Outlined panel on top of the editor, full width | x / 3,000 |
| Comment and reply boxes | Compact row inside the box, above the emoji / GIF / photo icons, once you start typing | x / 1,250 under the box, where LinkedIn shows its own "-N" when you go over |
| Floating chat windows and the Messaging page | First row inside the message box, below its top line | none |

If LinkedIn's layout can't be matched, the toolbar falls back to a small pill floating above the box.

## What it does

The toolbar has two labelled groups (each title has an ⓘ explaining it), then a separate **Clear formatting** button. The blue starburst badge shows the credits.

- **Safe** (readable everywhere): UPPERCASE, lowercase, bulleted list, numbered list. These are plain
  characters, so LinkedIn search, Google and screen readers read them normally.
- **Stylized** (hidden from search & screen readers): Bold, Italic, Underline, Strikethrough, plus Serif bold,
  Script, Double-struck and Monospace in the `Aa` menu. These swap letters for Unicode look-alikes
  (𝗯𝗼𝗹𝗱, 𝘪𝘵𝘢𝘭𝘪𝘤 …), which search and screen readers can't read as words. Use them sparingly.
  Styles combine and toggle: Bold then Italic gives bold italic, Bold again removes it.
- **Clear formatting** turns any stylized text back into plain letters (also handy for pasted text).
- **Nothing selected?** Stylized buttons switch on "typing mode": what you type next comes out styled. Click again to stop.
- **Shortcuts:** ⌘/Ctrl+B, ⌘/Ctrl+I, ⌘/Ctrl+U.
- **Accented letters** (è, é, ñ…) keep their accent when styled.

### About the counter
LinkedIn counts in JavaScript string length, so every styled letter counts as **2** characters.
Line breaks seem to count as 2 in comments (calibrated from one screenshot; see `newlineWeight`
in `src/config.js`). Amber at 90%, red when over.

## Install it (load unpacked)

1. Get this `linkedin-text-formatter` folder onto your Mac (or unzip `linkedin-text-formatter.zip`).
2. In Chrome, open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose the `linkedin-text-formatter` folder (the one containing `manifest.json`).
5. Open or reload a LinkedIn tab.

After changing any file, hit the ↻ reload icon on the extension's card and reload the LinkedIn tab.

## When something doesn't attach

LinkedIn's class names change often. Every LinkedIn-specific selector lives in `src/config.js`.
The extension logs to the DevTools console at the **Verbose** level, prefixed `[LTF]`: which editors it
attached to, and any `unclassified editor` with its label and placeholder text, which tells you what to add
to `config.js`. Type `[LTF]` in the console filter to hide LinkedIn's own noise.

## Code map

- `src/unicode.js`: the formatting engine. Pure functions, no DOM. Tested in `tests/`.
- `src/editor.js`: reads the selection as text and writes back via `execCommand('insertText')` and
  `insertParagraph`, i.e. the same input events as typing, so LinkedIn's editor model stays in sync and undo works.
- `src/toolbar.js`: the toolbar UI (Shadow DOM, inline or floating layout).
- `src/content.js`: finds editors as LinkedIn adds them and wires a toolbar to each.
- `src/config.js`: LinkedIn selectors, limits, counter calibration.

## Tests

```sh
node --test tests/*.test.js
```

The editor integration was also checked in headless Chrome against Quill 1, Quill 2, ProseMirror and a
plain contenteditable (the editor types LinkedIn is built on), but not against linkedin.com itself.
