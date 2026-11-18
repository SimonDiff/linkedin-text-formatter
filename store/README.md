# Publishing DiffStyle on the Chrome Web Store

Everything to paste into the Chrome Web Store dashboard, in the order the dashboard asks for it.
Build the upload with `./scripts/package.sh` (makes `dist/diffstyle-<version>.zip`).

## 1. One-time account setup

1. Turn on **2-Step Verification** on the Google account that will own the extension (required to publish).
2. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole), accept the developer agreement and pay the **one-time US$5 registration fee**.
3. In **Account**: set the publisher name (e.g. `Simon Diff`), verify the contact email.
4. **Trader status** (EU rule): a free hobby project with no revenue is normally **non-trader**. Declaring yourself a trader publishes an address and phone number on the listing.

## 2. Upload

**Items › New item** › upload `dist/diffstyle-0.4.0.zip`.

## 3. Store listing tab

**Title** (from the manifest): `DiffStyle for LinkedIn`

**Summary** (from the manifest, max 132 chars):
> Bold, italic, lists and more for LinkedIn posts, comments and messages, plus an always-visible character counter.

**Description:**

```
Format your LinkedIn posts, comments and messages right where you write them. No more copying text into a converter and pasting it back.

DiffStyle adds a small toolbar to LinkedIn's post box, comment and reply boxes, floating chat windows and the Messaging page.

WHAT YOU GET
• Always-visible character counter on posts (x / 3,000) and comments (x / 1,250). LinkedIn only tells you once you're over; DiffStyle counts from the first word.
• Real bold in posts, using LinkedIn's own bold: plain text that search and screen readers read normally.
• Bold, italic, underline and strikethrough in comments and messages.
• More styles: serif bold, script, double-struck and monospace.
• UPPERCASE and lowercase in one click.
• Bulleted and numbered lists.
• Clear formatting turns stylized text back into plain letters, including text you pasted in.
• Keyboard shortcuts: ⌘B / ⌘I / ⌘U on Mac, Ctrl+B / Ctrl+I / Ctrl+U on Windows and Linux.
• Accented letters (é, ñ, ü…) keep their accents when styled.

HONEST ABOUT THE TRADE-OFFS
Apart from bold in posts, LinkedIn has no real formatting. Italic, underline and the other stylized options swap your letters for Unicode look-alike symbols. Those words can't be found by LinkedIn search or Google, may be harder for the feed to understand, and screen readers skip them or spell them out. DiffStyle keeps the safe buttons and the stylized ones apart, and marks every stylized button so you can use them on purpose: for a few words, not whole paragraphs.

PRIVATE BY DESIGN
DiffStyle collects no data. It makes no network requests, has no analytics and stores nothing. Your text never leaves your browser.

OPEN SOURCE
Code, issues and feature requests: https://github.com/SimonDiff/linkedin-text-formatter

DiffStyle is an independent project by Simon Diff. It is not affiliated with, endorsed by or sponsored by LinkedIn Corporation. LinkedIn is a trademark of LinkedIn Corporation.
```

**Category:** Productivity › Communication (or Tools)
**Language:** English

**Graphic assets** (all in `store/images/`):

| Field | File |
|---|---|
| Store icon (128×128) | `icons/icon128.png` |
| Screenshots (1280×800, up to 5) | `screenshot-1-post.png`, `screenshot-2-comment.png`, `screenshot-3-message.png`, `screenshot-4-warning.png` |
| Small promo tile (440×280) | `promo-small-440x280.png` |
| Marquee (1400×560) | optional, only used if Google features the extension; skip |

**Additional fields:**
- Official URL: none
- Homepage URL: `https://github.com/SimonDiff/linkedin-text-formatter`
- Support URL: `https://github.com/SimonDiff/linkedin-text-formatter/issues`
- Mature content: No

## 4. Privacy practices tab

**Single purpose description:**
> DiffStyle adds a text formatting toolbar and a character counter to the post, comment and message boxes on linkedin.com, so users can format what they write there.

**Permission justifications.** The extension requests no API permissions. The only one to justify is the host access from its content script:

- **Host permission (`https://www.linkedin.com/*`):**
  > The content script runs only on linkedin.com to add the formatting toolbar and character counter next to LinkedIn's post, comment and message editors, and to rewrite the text the user selects when they click a formatting button. It reads no other pages, and sends nothing anywhere.

**Are you using remote code?** No, I am not using remote code. (All JavaScript is in the package; no eval, no external scripts.)

**Data usage:** tick **none** of the data types (no personally identifiable info, health, financial, authentication, personal communications, location, web history, user activity or website content is collected).
> Note: the extension edits text inside LinkedIn's editors, but only in the page, on the user's click. Nothing is collected or transmitted, so "website content" stays unticked.

Then tick all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** `https://github.com/SimonDiff/linkedin-text-formatter/blob/main/PRIVACY.md`

## 5. Distribution tab

- Payments: free
- Visibility: **Public** (or **Unlisted** for a soft launch: only people with the link can find it)
- Regions: all

## 6. Submit for review

Click **Submit for review**. You can choose to publish automatically when approved, or to publish manually afterwards.
Review usually takes from a few days to a couple of weeks for a first submission; the result comes by email.

## Updating later

1. Bump `version` in `manifest.json` (the store refuses a version it has already seen).
2. `./scripts/package.sh`
3. Dashboard › the item › **Package** › Upload new package › Submit for review.

## Regenerating the screenshots

The screenshots show the real extension (loaded unpacked in Chromium) on mock pages that imitate LinkedIn's editors
with made-up people. They contain no LinkedIn logo and no real account. Real screenshots from your own LinkedIn work too, as long as
they're 1280×800 or 640×400 and don't show other people's private data.
