// The toolbar UI. One component, three layouts:
//  - inline: a full row inserted on top of the editor (post composer)
//  - row: a compact row inside LinkedIn's box, above its footer icons (comments, messages)
//  - floating: a compact pill above the editor box (fallback)
// Rendered in a shadow root so LinkedIn's CSS can't reach it (and vice versa).
(function (root) {
  const { STYLES } = root.LTF.unicode;

  const ICONS = {
    bold: '<b style="font-weight:800">B</b>',
    italic: '<i style="font-family:Georgia,serif;font-size:16px">I</i>',
    underline: '<span style="text-decoration:underline;text-underline-offset:2px">U</span>',
    strike: '<span style="text-decoration:line-through">S</span>',
    upper: '<span style="font-size:11px;font-weight:700;letter-spacing:.02em">AA</span>',
    lower: '<span style="font-size:12px;font-weight:600">aa</span>',
    bullets: '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="2.5" cy="4" r="1.3"/><circle cx="2.5" cy="8" r="1.3"/><circle cx="2.5" cy="12" r="1.3"/><rect x="5.5" y="3.25" width="9" height="1.5" rx=".75"/><rect x="5.5" y="7.25" width="9" height="1.5" rx=".75"/><rect x="5.5" y="11.25" width="9" height="1.5" rx=".75"/></svg>',
    numbers: '<svg viewBox="0 0 16 16" width="16" height="16"><text x="0" y="6" font-size="5.5" font-weight="700" font-family="system-ui">1</text><text x="0" y="14" font-size="5.5" font-weight="700" font-family="system-ui">2</text><rect x="5.5" y="3.25" width="9" height="1.5" rx=".75"/><rect x="5.5" y="11.25" width="9" height="1.5" rx=".75"/></svg>',
    clear: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M9.5 2.5l4 4-6.5 6.5H3.5l-1.5-1.5 7.5-9z"/><path d="M6 6l4 4"/><path d="M7 13h7" stroke-linecap="round"/></svg>',
    info: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6.3"/><path d="M8 7.2v4" stroke-linecap="round"/><circle cx="8" cy="4.9" r=".5" fill="currentColor"/></svg>',
    // Filled starburst with the "i" cut out (evenodd), for the credits button.
    badge: '<svg viewBox="0 0 16 16" width="18" height="18"><path fill-rule="evenodd" d="M8.00 0.40L9.58 2.11L11.80 1.42L12.31 3.69L14.58 4.20L13.89 6.42L15.60 8.00L13.89 9.58L14.58 11.80L12.31 12.31L11.80 14.58L9.58 13.89L8.00 15.60L6.42 13.89L4.20 14.58L3.69 12.31L1.42 11.80L2.11 9.58L0.40 8.00L2.11 6.42L1.42 4.20L3.69 3.69L4.20 1.42L6.42 2.11Z M8 3.9a1 1 0 1 0 0 2a1 1 0 1 0 0-2Z M7.2 6.9h1.6v5H7.2Z"/></svg>',
    more: '<span style="font-family:Georgia,serif;font-style:italic;font-size:14px">Aa</span><svg viewBox="0 0 10 10" width="8" height="8" style="margin-left:2px"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  };

  const MORE_STYLES = ['serif', 'script', 'double', 'mono'];
  const MORE_PREVIEW = { serif: '𝐒𝐞𝐫𝐢𝐟 𝐛𝐨𝐥𝐝', script: '𝓢𝓬𝓻𝓲𝓹𝓽', double: '𝔻𝕠𝕦𝕓𝕝𝕖-𝕤𝕥𝕣𝕦𝕔𝕜', mono: '𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎' };

  // The two groups. Safe styles only add or change plain characters; stylized
  // ones swap letters for Unicode look-alikes.
  const GROUPS = {
    safe: { title: 'Safe', long: 'Safe styles are plain characters, so LinkedIn search, Google and screen readers read them normally.', ids: ['upper', 'lower', 'bullets', 'numbers'] },
    stylized: { title: 'Stylized', long: 'Stylized styles use look-alike Unicode letters. They look great, but search and screen readers can’t read them as words, so use them sparingly.', ids: ['bold', 'italic', 'underline', 'strike'] },
  };

  const AUTHOR_URL = 'https://www.linkedin.com/in/simondiff/';
  const REPO_URL = 'https://github.com/SimonDiff/linkedin-text-formatter';

  const FONT = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
  const CSS = `
    :host { all: initial; }
    .bar {
      display: flex; align-items: center; gap: 4px 12px; flex-wrap: wrap;
      font: 14px/1 ${FONT}; color: rgba(0,0,0,.75); box-sizing: border-box; position: relative;
    }
    /* Containers per place: outlined in posts and messages, light grey in comments. */
    .wrap { font: 14px/1 ${FONT}; color: rgba(0,0,0,.75); }
    .wrap.post { margin: 4px 0 12px; padding: 8px 10px 6px; border: 1px solid rgba(0,0,0,.15); border-radius: 8px; background: #fff; }
    .wrap.comment { margin: 8px 12px 4px; padding: 4px 6px; border-radius: 8px; background: rgba(0,0,0,.035); }
    .wrap.message { margin: 8px 12px 4px; padding: 8px 10px 6px; border: 1px solid rgba(0,0,0,.15); border-radius: 8px; background: #fff; }
    .wrap.hidden { display: none; }
    .bar.inline { align-items: flex-end; }
    .bar.row { gap: 4px 8px; color: rgba(0,0,0,.6); }
    .bar.stacked { align-items: flex-end; }
    .bar.floating {
      position: fixed; z-index: 2147483000; padding: 3px 6px; gap: 2px 8px; flex-wrap: nowrap;
      background: #fff; border-radius: 10px;
      box-shadow: 0 0 0 1px rgba(0,0,0,.1), 0 4px 12px rgba(0,0,0,.12);
      transition: opacity .12s;
    }
    .bar.floating.hidden { opacity: 0; pointer-events: none; }

    /* Groups: title (with its ⓘ) above the buttons, or inline before them in tight rows. */
    .group { display: flex; flex-direction: column; gap: 2px; }
    .inlinetitles .group { flex-direction: row; align-items: center; }
    .ghead { display: flex; align-items: center; gap: 0; padding-left: 6px; white-space: nowrap; }
    .inlinetitles .ghead { padding: 0 2px 0 0; }
    .gtitle { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: rgba(0,0,0,.6); }
    .gbtns { display: flex; align-items: center; gap: 2px; }
    .vsep { align-self: stretch; width: 1px; background: rgba(0,0,0,.1); }
    .inlinetitles .vsep { align-self: center; height: 18px; }
    .tail { display: flex; align-items: flex-end; gap: 8px; margin-left: auto; }
    .tail .count { padding: 0 2px; line-height: 30px; cursor: default; }
    .compact .tail .count { line-height: 26px; }

    button {
      all: unset; box-sizing: border-box; cursor: pointer; position: relative;
      min-width: 30px; height: 30px; padding: 0 6px; border-radius: 6px;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      color: inherit; fill: currentColor; font-size: 15px; white-space: nowrap;
    }
    .compact button { min-width: 26px; height: 26px; padding: 0 4px; font-size: 13px; }
    button.labeled { font-size: 13px; font-weight: 600; padding: 0 10px 0 8px; }
    .compact button.labeled { font-size: 12px; padding: 0 6px; gap: 4px; }
    button.i { min-width: 18px; height: 18px; padding: 0; border-radius: 50%; color: rgba(0,0,0,.5); }
    button.i svg { width: 13px; height: 13px; }
    button.badge { min-width: 26px; height: 26px; padding: 0; border-radius: 50%; color: #0a66c2; fill: #0a66c2; }
    .compact button.badge { min-width: 24px; height: 24px; }
    button.badge:hover { color: #004182; fill: #004182; background: rgba(10,102,194,.08); }
    button:hover { background: rgba(0,0,0,.08); color: rgba(0,0,0,.9); }
    button:focus-visible { outline: 2px solid #0a66c2; outline-offset: -2px; }
    button.active { background: #e8f0fa; color: #0a66c2; fill: #0a66c2; }

    .count { font: 12px/1.33 ${FONT}; font-variant-numeric: tabular-nums; color: rgba(0,0,0,.6); padding: 0 6px; white-space: nowrap; }
    .count.warn { color: #b24d00; font-weight: 600; }
    .count.over { color: #cc1016; font-weight: 600; }
    .hint {
      position: absolute; left: 50%; top: calc(100% + 6px); transform: translateX(-50%);
      background: #1d2226; color: #fff; font-size: 12px; padding: 6px 8px; border-radius: 6px;
      white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity .15s; z-index: 1;
    }
    .bar.row .hint { top: auto; bottom: calc(100% + 6px); }
    .pop .explain { padding: 10px 14px; max-width: 260px; font-size: 13px; line-height: 1.45; }
    .hint.show { opacity: 1; }

    .pop {
      position: relative; font: 14px/1.4 ${FONT}; color: rgba(0,0,0,.75); min-width: 180px; padding: 6px 0;
      background: #fff; border-radius: 8px; box-shadow: 0 0 0 1px rgba(0,0,0,.1), 0 6px 16px rgba(0,0,0,.16);
    }
    .pop[hidden] { display: none; }
    .pop button { display: flex; width: 100%; justify-content: flex-start; border-radius: 0; height: 34px; padding: 0 14px; font-size: 15px; }
    .pop .note { font-size: 12px; color: rgba(0,0,0,.55); padding: 8px 14px 4px; border-top: 1px solid rgba(0,0,0,.08); margin-top: 4px; max-width: 240px; }
    .about { padding: 12px 16px; max-width: 280px; font-size: 13px; }
    .about p { margin: 0 0 8px; }
    .about p:last-child { margin: 0; }
    .about strong { color: rgba(0,0,0,.9); }
    .about a { color: #0a66c2; font-weight: 600; text-decoration: none; }
    .about a:hover { text-decoration: underline; }
    .about .small { font-size: 12px; color: rgba(0,0,0,.6); }
  `;

  const tip = (id) => {
    const keys = { bold: ' (⌘/Ctrl+B)', italic: ' (⌘/Ctrl+I)', underline: ' (⌘/Ctrl+U)' }[id] || '';
    return STYLES[id].label + keys;
  };

  // A small menu rendered as a popover: the browser's top layer keeps it above
  // LinkedIn's modal and out of reach of its overflow clipping and transforms.
  class Popover {
    constructor(html, onClick) {
      this.host = document.createElement('ltf-popover');
      this.host.setAttribute('data-ltf', '');
      this.host.setAttribute('popover', 'manual');
      Object.assign(this.host.style, { position: 'fixed', inset: 'auto', margin: '0', padding: '0', border: '0', background: 'transparent', overflow: 'visible' });
      const shadow = this.host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<style>${CSS}</style><div class="pop" hidden>${html}</div>`;
      this.el = shadow.querySelector('.pop');
      // Keep the editor's selection; links still work since only mousedown is cancelled.
      shadow.addEventListener('mousedown', (e) => e.preventDefault());
      shadow.addEventListener('click', (e) => onClick(e, this));
      this.close = (e) => {
        const path = e && e.composedPath ? e.composedPath() : [];
        if (path.includes(this.host) || (this.anchor && path.includes(this.anchor.getRootNode().host || this.anchor))) return;
        this.toggle(null, false);
      };
    }
    get open() { return !this.el.hidden; }
    toggle(anchor, force) {
      const open = force ?? this.el.hidden;
      if (!open) {
        if (this.el.hidden) return;
        this.el.hidden = true;
        try { this.host.hidePopover(); } catch {}
        removeEventListener('scroll', this.close, true);
        removeEventListener('resize', this.close);
        document.removeEventListener('mousedown', this.close);
        return;
      }
      this.anchor = anchor;
      // A modal <dialog> makes the rest of the page inert, so live inside it.
      const anchorHost = anchor.getRootNode().host || anchor;
      const layer = anchorHost.closest('dialog, [popover]:not(ltf-popover)') || document.body;
      if (this.host.parentNode !== layer) layer.appendChild(this.host);
      this.el.hidden = false;
      try { this.host.showPopover(); } catch {}
      const r = anchor.getBoundingClientRect();
      const m = this.el.getBoundingClientRect();
      const below = r.bottom + 4 + m.height <= innerHeight - 8;
      this.host.style.top = `${Math.round(below ? r.bottom + 4 : Math.max(8, r.top - 4 - m.height))}px`;
      this.host.style.left = `${Math.round(Math.max(8, Math.min(r.left, innerWidth - m.width - 8)))}px`;
      addEventListener('scroll', this.close, true);
      addEventListener('resize', this.close);
      document.addEventListener('mousedown', this.close);
    }
    remove() { this.toggle(null, false); this.host.remove(); }
  }

  class Toolbar {
    // onAction(styleId) is called on click; the toolbar knows nothing about editors.
    // variant: 'post' | 'comment' | 'message' (container look).
    // counterBelow: render the counter in its own element (placed by the caller).
    constructor({ layout, variant, limit, counterBelow, onAction }) {
      this.layout = layout;
      this.limit = limit;
      this.onAction = onAction;
      this.host = document.createElement('ltf-toolbar');
      this.host.setAttribute('data-ltf', '');
      const shadow = this.host.attachShadow({ mode: 'open' });
      const compact = layout !== 'inline';
      // Titles sit above their buttons, except in the floating fallback pill.
      const inlineTitles = layout === 'floating';
      this.host.style.display = layout === 'floating' ? 'contents' : 'block';

      const btn = (id) => `<button type="button" data-style="${id}" title="${tip(id)}" aria-label="${STYLES[id].label}">${ICONS[id]}</button>`;
      const infoBtn = (pop, label) => `<button type="button" class="i" data-pop="${pop}" title="${label}" aria-label="${label}">${ICONS.info}</button>`;
      const group = (key, extra = '') => {
        const g = GROUPS[key];
        return `<div class="group" role="group" aria-label="${g.title}">
          <span class="ghead"><span class="gtitle">${g.title}</span>${infoBtn(key, `What “${g.title}” means`)}</span>
          <span class="gbtns">${g.ids.map(btn).join('')}${extra}</span></div>`;
      };
      const moreBtn = `<button type="button" data-pop="more" title="More stylized fonts" aria-haspopup="true">${ICONS.more}</button>`;
      const clearBtn = `<button type="button" class="labeled" data-style="clear" title="Turn stylized letters back into plain text">${ICONS.clear}${compact ? 'Clear' : 'Clear formatting'}</button>`;
      const aboutBtn = `<button type="button" class="badge" data-pop="about" title="About LinkedIn DiffStyle" aria-label="About LinkedIn DiffStyle">${ICONS.badge}</button>`;
      const count = limit && !counterBelow ? '<span class="count" aria-live="polite"></span>' : '';
      const classes = ['bar', layout, compact && 'compact', inlineTitles && 'inlinetitles', layout === 'floating' && 'hidden'].filter(Boolean).join(' ');

      shadow.innerHTML = `<style>${CSS}</style>
        <div class="wrap ${layout === 'floating' ? '' : variant}">
          <div class="${classes}" role="toolbar" aria-label="Text formatting">
            ${group('safe')}
            <span class="vsep"></span>
            ${group('stylized', moreBtn)}
            <span class="vsep"></span>
            <span class="group">${inlineTitles ? '' : '<span class="ghead">&nbsp;</span>'}<span class="gbtns">${clearBtn}</span></span>
            <span class="tail">${count}${aboutBtn}</span>
            <span class="hint" role="status"></span>
          </div>
        </div>`;

      this.wrap = shadow.querySelector('.wrap');
      this.bar = shadow.querySelector('.bar');
      this.hintEl = shadow.querySelector('.hint');
      this.countEl = shadow.querySelector('.count');

      const run = (id) => { this.closePops(); this.onAction(id); };
      this.pops = {
        more: new Popover(
          MORE_STYLES.map((id) => `<button type="button" data-style="${id}">${MORE_PREVIEW[id]}</button>`).join(''),
          (e) => { const b = e.target.closest('button[data-style]'); if (b) run(b.dataset.style); },
        ),
        about: new Popover(
          `<div class="about">
            <p><strong>LinkedIn DiffStyle</strong> extension by <a href="${AUTHOR_URL}" target="_blank" rel="noopener">Simon Diff</a></p>
            <p>Open source on <a href="${REPO_URL}" target="_blank" rel="noopener">GitHub</a>.</p>
          </div>`,
          (e, pop) => { if (e.target.closest('a')) setTimeout(() => pop.toggle(null, false), 0); },
        ),
        safe: new Popover(`<div class="explain">${GROUPS.safe.long}</div>`, () => {}),
        stylized: new Popover(`<div class="explain">${GROUPS.stylized.long}</div>`, () => {}),
      };
      this.more = this.pops.more;

      if (limit && counterBelow) {
        // Comments: the counter sits under the box, right-aligned, where
        // LinkedIn shows its own "-2" once you go over.
        this.countHost = document.createElement('ltf-counter');
        this.countHost.setAttribute('data-ltf', '');
        this.countHost.style.display = 'block';
        const cs = this.countHost.attachShadow({ mode: 'open' });
        cs.innerHTML = `<style>${CSS} .count { display: block; text-align: right; padding: 4px 12px 0; }</style><span class="count" aria-live="polite"></span>`;
        this.countEl = cs.querySelector('.count');
      }

      // Keep focus and selection in the editor when clicking the toolbar.
      shadow.addEventListener('mousedown', (e) => e.preventDefault());
      shadow.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.pop) {
          const pop = this.pops[b.dataset.pop];
          for (const p of Object.values(this.pops)) if (p !== pop) p.toggle(null, false);
          pop.toggle(b);
          return;
        }
        run(b.dataset.style);
      });
      this.host.addEventListener('mouseenter', () => (this.hovered = true));
      this.host.addEventListener('mouseleave', () => (this.hovered = false));
    }

    closePops() { for (const p of Object.values(this.pops)) p.toggle(null, false); }
    get menuOpen() { return Object.values(this.pops).some((p) => p.open); }

    setActive(ids) {
      for (const b of [...this.bar.querySelectorAll('button[data-style]'), ...this.more.el.querySelectorAll('button[data-style]')]) b.classList.toggle('active', ids.has(b.dataset.style));
    }

    setCount(n) {
      if (!this.countEl) return;
      const left = this.limit - n;
      // Under the box, LinkedIn's own counter takes over once you're over the limit.
      if (this.countHost) this.countHost.style.display = n > 0 && left >= 0 ? 'block' : 'none';
      this.countEl.textContent = `${n.toLocaleString()} / ${this.limit.toLocaleString()}`;
      this.countEl.title = `Character counter: ${left >= 0 ? `${left.toLocaleString()} characters left` : `${(-left).toLocaleString()} over the limit`}`;
      this.countEl.classList.toggle('over', left < 0);
      this.countEl.classList.toggle('warn', left >= 0 && n >= this.limit * 0.9);
    }

    hint(text) {
      this.hintEl.textContent = text;
      this.hintEl.classList.add('show');
      clearTimeout(this._hintT);
      this._hintT = setTimeout(() => this.hintEl.classList.remove('show'), 1800);
    }

    setVisible(show) {
      this.wrap.classList.toggle('hidden', !show);
      if (!show) this.closePops();
    }

    // Floating layout only: dock above `box` (or below it when there's no room).
    place(box, visible) {
      if (this.layout !== 'floating') return;
      const r = box.getBoundingClientRect();
      const onScreen = r.width > 0 && r.bottom > 0 && r.top < innerHeight;
      const show = visible && onScreen;
      this.bar.classList.toggle('hidden', !show);
      if (!show) { this.closePops(); return; }
      const h = this.bar.offsetHeight || 32;
      const w = this.bar.offsetWidth || 300;
      let top = r.top - h - 6;
      if (top < 56) top = r.bottom + 6; // LinkedIn's top nav is ~52px tall
      const left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8));
      this.bar.style.top = `${Math.round(top)}px`;
      this.bar.style.left = `${Math.round(left)}px`;
    }

    destroy() { for (const p of Object.values(this.pops)) p.remove(); this.host.remove(); this.countHost?.remove(); }
  }

  root.LTF = Object.assign(root.LTF || {}, { Toolbar });
})(globalThis);
