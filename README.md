# LinkedIn DiffStyle

A Chrome extension that adds a formatting toolbar and a permanent character counter to LinkedIn posts,
comments and messages.

| Post | Comment | Message |
|---|---|---|
| ![Toolbar in the post composer](docs/screenshots/post.png) | ![Toolbar in a comment box](docs/screenshots/comment.png) | ![Toolbar in a message window](docs/screenshots/message.png) |

## Features

- **Always-visible character counter** on posts (`x / 3,000`) and comments (`x / 1,250`). It turns amber at 90% and red when you're over.
- **Real bold in posts and comments.** LinkedIn's editor there supports one real format, bold, and DiffStyle uses it.
  It looks the same as Unicode bold but stays plain text, so search and screen readers have no trouble with it.
- **Bold, italic, underline and strikethrough** everywhere else, right inside LinkedIn's editor. No copy, convert, paste.
- **More styles** in the `Aa` menu: serif bold, script, double-struck and monospace.
- **UPPERCASE and lowercase** in one click.
- **Bulleted and numbered lists.**
- **Clear formatting** turns stylized text back into plain letters, including text you pasted in.
- **Typing mode:** click a style with nothing selected and what you type next comes out styled.
- **Keyboard shortcuts:** ⌘/Ctrl+B, ⌘/Ctrl+I, ⌘/Ctrl+U.
- **Accents survive:** é, ñ, ü and friends keep their accent when styled.
- **Styles combine and toggle:** Bold then Italic gives bold italic, Bold again removes it.
- Works in the post composer, comment and reply boxes, floating chat windows and the Messaging page.

### Why a permanent counter?

Sometimes an argument in the comments incenses me and I start writing an essay. LinkedIn's own counter
only shows up once I'm already over the limit, which is the worst possible moment to find out.
A counter that's there from the first word lets me gauge my verbosity before it's too late.

Note that LinkedIn counts every stylized letter as 2 characters, and so does this counter.

## A word of warning about stylized text

Apart from bold in posts and comments, LinkedIn has no real formatting: no italic, no underline, and no real bold in messages.
The **Stylized** buttons swap your letters for Unicode symbols
that only *look* like letters (𝗯𝗼𝗹𝗱, 𝘪𝘵𝘢𝘭𝘪𝘤 …), and that has a cost:

- **Search:** LinkedIn search and Google don't match 𝗿𝗲𝗰𝗿𝘂𝗶𝘁𝗲𝗿 to "recruiter", so those words can't be found.
- **Algorithm:** the feed can't read those words either, which may hurt how your post is understood and shown.
- **Accessibility:** screen readers skip them or spell them out symbol by symbol ("mathematical bold small r…").

The **Safe** group (case and lists, plus bold in posts and comments) uses plain characters and has none of these problems.
That's why the toolbar keeps the two groups apart.

> [!NOTE]
> I know most people won't bother with any of this. Nobody has time to proofread what ChatGPT
> tells them to post these days, let alone format it, and ChatGPT writes plain text anyway.
> As for the algorithm, going viral was never really the goal for me. I just like my comments and messages
> to look the way I want. If you feel the same, use stylized text for a few words that deserve it,
> and keep keywords, hashtags and whole paragraphs plain.

## Install (Chrome)

The extension isn't on the Chrome Web Store yet. For now you install it from this repo:

1. On this page, click the green **Code** button, then **Download ZIP**.
2. Unzip it. You get a folder called `linkedin-text-formatter-main`. Keep it somewhere permanent:
   Chrome loads the extension from that folder, so deleting or moving it removes the extension.
3. In Chrome, go to `chrome://extensions`.
4. Turn on **Developer mode** (switch in the top right corner).
5. Click **Load unpacked** and select the `linkedin-text-formatter-main` folder (the one that contains `manifest.json`).
6. Open LinkedIn, or reload any LinkedIn tab that was already open.

**To update:** download the ZIP again, replace the old folder with the new one, then click the ↻ reload icon on the
extension's card in `chrome://extensions` and reload LinkedIn.

## Roadmap

- **Clearer warnings in the toolbar** when a style hurts reach, search or accessibility, right where you apply it,
  not only in the ⓘ tooltips.
- Chrome Web Store release, so you no longer need Developer mode.
- Other browsers.

Ideas welcome, see below.

## Feedback, bugs and feature requests

- Open an [issue on GitHub](https://github.com/SimonDiff/linkedin-text-formatter/issues), or
- Send me a DM on [LinkedIn](https://www.linkedin.com/in/simondiff/).

Want to contribute code? See [CONTRIBUTING.md](CONTRIBUTING.md).

For bugs, say where it happened (post, comment or message) and add a screenshot if you can.
LinkedIn changes its page often, so the toolbar sometimes stops showing up in one place: that's the most useful thing to report.

## Fork it for other scripts

This version only styles the basic Latin alphabet (A–Z, a–z, digits and accented Latin letters),
because that's what Unicode's "mathematical" look-alike letters cover. Greek, Cyrillic, Arabic, Hebrew,
Devanagari, CJK and many other writing systems aren't served by it, but they may have their own tricks
(combining marks, alternative forms, fullwidth characters …).

If you write in one of those, please fork this repo and make it yours. All the character mapping lives in
[`src/unicode.js`](src/unicode.js), with no dependency on the rest of the code, and it has its own tests.
Open an issue or DM me if you build one: I'll link to it from here.

## For developers

No build step: plain JavaScript, Manifest V3. After editing a file, hit ↻ on the extension's card and reload LinkedIn.

| File | What it does |
|---|---|
| `src/unicode.js` | Formatting engine. Pure functions, no DOM. |
| `src/editor.js` | Reads the selection and writes back through the same input events as typing, so LinkedIn's editor stays in sync and undo works. |
| `src/toolbar.js` | Toolbar UI (Shadow DOM). |
| `src/content.js` | Finds editors as LinkedIn adds them and attaches a toolbar to each. |
| `src/config.js` | LinkedIn selectors, character limits, counter calibration. |

**Toolbar not showing up somewhere?** LinkedIn's class names change often, and every LinkedIn-specific
selector lives in `src/config.js`. The extension logs to the DevTools console at the **Verbose** level,
prefixed `[LTF]` (type `[LTF]` in the console filter). Look for `unclassified editor` lines: they tell you what to add.

**Tests:**

```sh
node --test tests/*.test.js
```

## License

[MIT](LICENSE) © Simon Diff
