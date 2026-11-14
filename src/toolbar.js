// The toolbar UI: one line of icon buttons with hover labels. Three layouts:
//  - inline: a full row inserted on top of the editor (post composer)
//  - row: a compact row inside LinkedIn's box, above its footer icons (comments, messages)
//  - floating: a compact pill above the editor box (fallback)
// Rendered in a shadow root so LinkedIn's CSS can't reach it (and vice versa).
(function (root) {
  const { STYLES } = root.LTF.unicode;

  // Line icons in the style of LinkedIn's 2026 iconography: outline by default,
  // filled (or heavier) when the style is on. The CSS does the switch: shapes
  // marked .f/.d get filled, every other stroke gets heavier.
  const svg = (body, w = 20) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const ICONS = {
    bold: svg('<path class="f" fill-rule="evenodd" d="M6.5 4.5h6.75a4 4 0 0 1 2.7 6.95 4.25 4.25 0 0 1-2.2 8.05H6.5z M9.25 7.25v3.5h4a1.75 1.75 0 0 0 0-3.5z M9.25 13.25v3.5h4.5a1.75 1.75 0 0 0 0-3.5z"/>'),
    italic: svg('<path d="M10 4.5h8M6 19.5h8M14.5 4.5l-5 15"/>'),
    underline: svg('<path d="M7 4.5v6.5a5 5 0 0 0 10 0V4.5M5 20h14"/>'),
    strike: svg('<path d="M16.5 7c-.6-1.6-2.3-2.5-4.4-2.5-2.6 0-4.4 1.4-4.4 3.4 0 1.5.9 2.5 2.6 3.1M4 12h16M8 16.8c.6 1.7 2.3 2.7 4.5 2.7 2.7 0 4.5-1.4 4.5-3.5 0-.8-.3-1.5-.8-2"/>'),
    upper: svg('<path d="M2.5 18l4.25-12L11 18M4 14h5.5M13 18l4.25-12L21.5 18M14.5 14H20"/>'),
    lower: svg('<circle cx="7.5" cy="14.5" r="3.5"/><path d="M11 11v7"/><circle cx="16.5" cy="14.5" r="3.5"/><path d="M20 11v7"/>'),
    bullets: svg('<circle class="d" cx="4.5" cy="6.5" r="1.5"/><circle class="d" cx="4.5" cy="12" r="1.5"/><circle class="d" cx="4.5" cy="17.5" r="1.5"/><path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10"/>'),
    numbers: svg('<path d="M3.5 5l1.5-1v5M3.5 9h3M3.5 15.2a1.5 1.5 0 0 1 3 .3c0 1-3 2-3 3.5h3M10 6.5h10M10 12h10M10 17.5h10"/>'),
    clear: svg('<path d="M13.5 4.5l6 6-8 8h-5l-2.5-2.5z M9 9l6 6M11 19.5h8.5"/>'),
    more: svg('<path d="M2.5 18l4.25-12L11 18M4 14h5.5"/><circle cx="16.5" cy="14.5" r="3.5"/><path d="M20 11v7"/>') +
      '<svg viewBox="0 0 10 10" width="8" height="8" aria-hidden="true" style="margin-left:1px"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    // Filled starburst with the "i" cut out (evenodd), for the credits button.
    badge: '<svg viewBox="0 0 16 16" width="18" height="18"><path fill-rule="evenodd" d="M8.00 0.40L9.58 2.11L11.80 1.42L12.31 3.69L14.58 4.20L13.89 6.42L15.60 8.00L13.89 9.58L14.58 11.80L12.31 12.31L11.80 14.58L9.58 13.89L8.00 15.60L6.42 13.89L4.20 14.58L3.69 12.31L1.42 11.80L2.11 9.58L0.40 8.00L2.11 6.42L1.42 4.20L3.69 3.69L4.20 1.42L6.42 2.11Z M8 3.9a1 1 0 1 0 0 2a1 1 0 1 0 0-2Z M7.2 6.9h1.6v5H7.2Z"/></svg>',
  };

  const MORE_STYLES = ['serif', 'script', 'double', 'mono'];
  const MORE_PREVIEW = { serif: '𝐒𝐞𝐫𝐢𝐟 𝐛𝐨𝐥𝐝', script: '𝓢𝓬𝓻𝓲𝓹𝓽', double: '𝔻𝕠𝕦𝕓𝕝𝕖-𝕤𝕥𝕣𝕦𝕔𝕜', mono: '𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎' };

  // Two groups on one line, split by a divider. Safe styles only add or change
  // plain characters; stylized ones swap letters for Unicode look-alikes, and
  // their tooltips say so.
  const SAFE = ['upper', 'lower', 'bullets', 'numbers'];
  const STYLIZED = ['bold', 'italic', 'underline', 'strike'];
  const WARN = 'Search/algorithm unsafe';
  const WARN_HTML = `<span class="bang" aria-hidden="true">!</span>${WARN}`;

  const AUTHOR_URL = 'https://www.linkedin.com/in/simondiff/';
  const REPO_URL = 'https://github.com/SimonDiff/linkedin-text-formatter';

  const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const KEYS = { bold: 'B', italic: 'I', underline: 'U' };
  const shortcut = (id) => (KEYS[id] ? (MAC ? `⌘${KEYS[id]}` : `Ctrl+${KEYS[id]}`) : '');

  const FONT = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
  const CSS = `
    :host { all: initial; }
    .bar {
      display: flex; align-items: center; gap: 2px; flex-wrap: wrap;
      font: 14px/1 ${FONT}; color: rgba(0,0,0,.6); box-sizing: border-box; position: relative;
    }
    /* Containers per place: outlined in posts and messages, light grey in comments. */
    .wrap { font: 14px/1 ${FONT}; color: rgba(0,0,0,.6); }
    .wrap.post { margin: 4px 0 12px; padding: 4px 6px; border: 1px solid rgba(0,0,0,.15); border-radius: 8px; background: #fff; }
    .wrap.comment { margin: 8px 12px 4px; padding: 2px 4px; border-radius: 8px; background: rgba(0,0,0,.035); }
    .wrap.message { margin: 8px 12px 4px; padding: 2px 4px; border: 1px solid rgba(0,0,0,.15); border-radius: 8px; background: #fff; }
    .wrap.hidden { display: none; }
    .bar.floating {
      position: fixed; z-index: 2147483000; padding: 3px 4px; flex-wrap: nowrap;
      background: #fff; border-radius: 10px;
      box-shadow: 0 0 0 1px rgba(0,0,0,.1), 0 4px 12px rgba(0,0,0,.12);
      transition: opacity .12s;
    }
    .bar.floating.hidden { opacity: 0; pointer-events: none; }

    .group { display: flex; align-items: center; gap: 2px; }
    .vsep { width: 1px; height: 20px; margin: 0 6px; background: rgba(0,0,0,.15); flex: none; }
    .compact .vsep { height: 18px; margin: 0 3px; }
    .tail { display: flex; align-items: center; gap: 6px; margin-left: auto; padding-left: 6px; }

    button {
      all: unset; box-sizing: border-box; cursor: pointer; position: relative;
      min-width: 32px; height: 32px; padding: 0 6px; border-radius: 6px;
      display: inline-flex; align-items: center; justify-content: center;
      color: inherit; fill: currentColor; white-space: nowrap;
    }
    .compact button { min-width: 26px; height: 28px; padding: 0 2px; }
    .compact button svg:first-child { width: 18px; height: 18px; }
    button:hover { background: rgba(0,0,0,.08); color: rgba(0,0,0,.9); }
    button:focus-visible { outline: 2px solid #0a66c2; outline-offset: -2px; }
    /* Selected, like LinkedIn's nav: filled icon in near-black with a bar under it. */
    button.active { color: rgba(0,0,0,.9); }
    button.active svg { stroke-width: 2.1; }
    /* Solid shapes get a clean fill with no stroke on top (a stroke on a fill
       bloats the glyph); bullet dots keep their thin edge so they don't shrink. */
    button.active .f { fill: currentColor; stroke: none; }
    button.active .d { fill: currentColor; stroke-width: 1.6; }
    button.active::after {
      content: ''; position: absolute; left: 25%; right: 25%; bottom: 1px; height: 2px;
      border-radius: 1px; background: currentColor;
    }
    button.badge { min-width: 28px; height: 28px; padding: 0; border-radius: 50%; color: #0a66c2; fill: #0a66c2; }
    .compact button.badge { min-width: 24px; height: 24px; }
    button.badge:hover { color: #004182; fill: #004182; background: rgba(10,102,194,.08); }

    .count { font: 12px/1.33 ${FONT}; font-variant-numeric: tabular-nums; color: rgba(0,0,0,.6); padding: 0 2px; white-space: nowrap; cursor: default; }
    .count.warn { color: #b24d00; font-weight: 600; }
    .count.over { color: #cc1016; font-weight: 600; }
    .hint {
      position: absolute; left: 50%; top: calc(100% + 6px); transform: translateX(-50%);
      background: #1d2226; color: #fff; font-size: 12px; padding: 6px 8px; border-radius: 6px;
      white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity .15s; z-index: 1;
    }
    .bar.row .hint { top: auto; bottom: calc(100% + 6px); }
    .hint.show { opacity: 1; }

    /* Hover label: "Bold (⌘B)", plus a muted second line for stylized styles. */
    .tip {
      font: 600 12px/1.35 ${FONT}; color: #fff; background: #1d2226; border-radius: 4px;
      padding: 4px 8px; max-width: 240px; pointer-events: none;
    }
    .tip .k { font-weight: 400; color: rgba(255,255,255,.7); }
    .tip .sub { display: flex; align-items: center; gap: 5px; font-weight: 400; color: rgba(255,255,255,.75); margin-top: 2px; }
    /* Orange "!" dot marking stylized (search/algorithm unsafe) styles. */
    .bang {
      display: inline-flex; align-items: center; justify-content: center; flex: none;
      width: 13px; height: 13px; border-radius: 50%; background: #e7a33e; color: #1d2226;
      font: 800 10px/1 ${FONT};
    }
    .note .bang { margin-right: 6px; }
    .note { display: flex; align-items: center; }

    .pop {
      position: relative; font: 14px/1.4 ${FONT}; color: rgba(0,0,0,.75); min-width: 180px; padding: 6px 0;
      background: #fff; border-radius: 8px; box-shadow: 0 0 0 1px rgba(0,0,0,.1), 0 6px 16px rgba(0,0,0,.16);
    }
    .pop[hidden], .tip[hidden], button[hidden] { display: none !important; }
    .pop button { display: flex; width: 100%; justify-content: flex-start; border-radius: 0; height: 34px; padding: 0 14px; font-size: 15px; color: rgba(0,0,0,.75); }
    .pop button.active::after { display: none; }
    .pop button.active { background: rgba(0,0,0,.06); }
    .pop .note { font-size: 12px; color: rgba(0,0,0,.55); padding: 8px 14px 4px; border-top: 1px solid rgba(0,0,0,.08); margin-top: 4px; max-width: 240px; line-height: 1.4; }
    .about { padding: 12px 16px; max-width: 280px; font-size: 13px; }
    .about p { margin: 0 0 8px; }
    .about p:last-child { margin: 0; }
    .about strong { color: rgba(0,0,0,.9); }
    .about a { color: #0a66c2; font-weight: 600; text-decoration: none; }
    .about a:hover { text-decoration: underline; }
    .about .small { font-size: 12px; color: rgba(0,0,0,.6); }
  `;

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  // Top-layer host (popover) so menus and tooltips escape LinkedIn's clipping
  // and stay above its modal. A modal <dialog> makes the rest of the page
  // inert, so the host lives inside it when there is one.
  function topLayerHost(tag) {
    const host = document.createElement(tag);
    host.setAttribute('data-ltf', '');
    host.setAttribute('popover', 'manual');
    Object.assign(host.style, { position: 'fixed', inset: 'auto', margin: '0', padding: '0', border: '0', background: 'transparent', overflow: 'visible' });
    return host;
  }
  function layerFor(anchor) {
    const anchorHost = anchor.getRootNode().host || anchor;
    return anchorHost.closest('dialog, [popover]:not(ltf-popover):not(ltf-tip)') || document.body;
  }

  // One tooltip per toolbar, shown above the hovered or focused button.
  class Tooltip {
    constructor() {
      this.host = topLayerHost('ltf-tip');
      const shadow = this.host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<style>${CSS}</style><div class="tip" role="tooltip" hidden></div>`;
      this.el = shadow.querySelector('.tip');
    }
    show(anchor, html) {
      clearTimeout(this.t);
      this.t = setTimeout(() => {
        if (!anchor.isConnected) return;
        const layer = layerFor(anchor);
        if (this.host.parentNode !== layer) layer.appendChild(this.host);
        this.el.innerHTML = html;
        this.el.hidden = false;
        try { this.host.showPopover(); } catch {}
        const r = anchor.getBoundingClientRect();
        const m = this.el.getBoundingClientRect();
        const above = r.top - 6 - m.height >= 8;
        this.host.style.top = `${Math.round(above ? r.top - 6 - m.height : r.bottom + 6)}px`;
        this.host.style.left = `${Math.round(Math.max(8, Math.min(r.left + r.width / 2 - m.width / 2, innerWidth - m.width - 8)))}px`;
      }, this.el.hidden ? 250 : 0);
    }
    hide() {
      clearTimeout(this.t);
      if (this.el.hidden) return;
      this.el.hidden = true;
      try { this.host.hidePopover(); } catch {}
    }
    remove() { this.hide(); this.host.remove(); }
  }

  // A small menu rendered as a popover: the browser's top layer keeps it above
  // LinkedIn's modal and out of reach of its overflow clipping and transforms.
  class Popover {
    constructor(html, onClick) {
      this.host = topLayerHost('ltf-popover');
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
      const layer = layerFor(anchor);
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
    // nativeBold: Bold is the editor's real bold, shown in the Safe group.
    constructor({ layout, variant, limit, counterBelow, nativeBold, onAction }) {
      this.layout = layout;
      this.limit = limit;
      this.onAction = onAction;
      this.host = document.createElement('ltf-toolbar');
      this.host.setAttribute('data-ltf', '');
      const shadow = this.host.attachShadow({ mode: 'open' });
      const compact = layout !== 'inline';
      this.host.style.display = layout === 'floating' ? 'contents' : 'block';

      // No title attributes: the toolbar draws its own tooltips (data-tip), so
      // the native ones don't double up. aria-label carries the name.
      const tipHtml = (label, sub) => {
        const [name, key] = label.split('\u0000');
        return `${esc(name)}${key ? ` <span class="k">(${key})</span>` : ''}${sub ? `<span class="sub">${sub === WARN ? WARN_HTML : esc(sub)}</span>` : ''}`;
      };
      const button = (attrs, label, key, sub, icon) =>
        `<button type="button" ${attrs} aria-label="${esc(label)}${sub ? `. ${esc(sub)}` : ''}" data-tip="${esc(tipHtml(`${label}\u0000${key}`, sub))}">${icon}</button>`;
      const btn = (id, sub) => button(`data-style="${id}"`, STYLES[id].label, shortcut(id), sub, ICONS[id]);
      // Two Bold buttons, real (Safe) and Unicode (Stylized); setNativeBold shows one.
      const nativeBtn = button('data-style="bold" data-native', 'Bold', shortcut('bold'), 'LinkedIn’s own bold, safe for search', ICONS.bold);
      const moreBtn = button('data-pop="more" aria-haspopup="true"', 'More fonts', '', WARN, ICONS.more);
      const clearBtn = button('data-style="clear"', 'Clear formatting', '', nativeBold ? 'Removes bold and turns stylized letters back into plain text' : 'Turns stylized letters back into plain text', ICONS.clear);
      // Messages skip the credits badge: floating chat windows are too narrow for one line with it.
      const aboutBtn = button('class="badge" data-pop="about"', 'About LinkedIn DiffStyle', '', '', ICONS.badge);
      const count = limit && !counterBelow ? '<span class="count" aria-live="polite"></span>' : '';
      const classes = ['bar', layout, compact && 'compact', layout === 'floating' && 'hidden'].filter(Boolean).join(' ');

      shadow.innerHTML = `<style>${CSS}</style>
        <div class="wrap ${layout === 'floating' ? '' : variant}">
          <div class="${classes}" role="toolbar" aria-label="Text formatting">
            <span class="group" role="group" aria-label="Safe styles">${nativeBold ? nativeBtn : ''}${SAFE.map((id) => btn(id)).join('')}</span>
            <span class="vsep" role="separator"></span>
            <span class="group" role="group" aria-label="Stylized styles">${STYLIZED.map((id) => btn(id, WARN)).join('')}${moreBtn}</span>
            <span class="vsep" role="separator"></span>
            ${clearBtn}
            <span class="tail">${count}${variant === 'message' ? '' : aboutBtn}</span>
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
          MORE_STYLES.map((id) => `<button type="button" data-style="${id}">${MORE_PREVIEW[id]}</button>`).join('') + `<div class="note">${WARN_HTML}</div>`,
          (e) => { const b = e.target.closest('button[data-style]'); if (b) run(b.dataset.style); },
        ),
        about: new Popover(
          `<div class="about">
            <p><strong>LinkedIn DiffStyle</strong> extension by <a href="${AUTHOR_URL}" target="_blank" rel="noopener">Simon Diff</a></p>
            <p>Open source on <a href="${REPO_URL}" target="_blank" rel="noopener">GitHub</a>.</p>
          </div>`,
          (e, pop) => { if (e.target.closest('a')) setTimeout(() => pop.toggle(null, false), 0); },
        ),
      };
      this.more = this.pops.more;
      this.tip = new Tooltip();

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
      const tipFor = (e) => e.target.closest && e.target.closest('button[data-tip]');
      shadow.addEventListener('mouseover', (e) => { const b = tipFor(e); if (b && !this.menuOpen) this.tip.show(b, b.dataset.tip); });
      shadow.addEventListener('mouseout', (e) => { if (tipFor(e) && !tipFor({ target: e.relatedTarget || shadow })) this.tip.hide(); });
      shadow.addEventListener('focusin', (e) => { const b = tipFor(e); if (b && b.matches(':focus-visible')) this.tip.show(b, b.dataset.tip); });
      shadow.addEventListener('focusout', () => this.tip.hide());
      shadow.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        this.tip.hide();
        if (b.dataset.pop) {
          const pop = this.pops[b.dataset.pop];
          for (const p of Object.values(this.pops)) if (p !== pop) p.toggle(null, false);
          pop.toggle(b);
          return;
        }
        run(b.dataset.style);
      });
      this.setNativeBold(!!nativeBold);
      this.host.addEventListener('mouseenter', () => (this.hovered = true));
      this.host.addEventListener('mouseleave', () => (this.hovered = false));
    }

    // Real bold in Safe, or (fallback) Unicode bold in Stylized.
    setNativeBold(on) {
      for (const b of this.bar.querySelectorAll('button[data-style="bold"]')) b.hidden = b.hasAttribute('data-native') ? !on : on;
    }

    closePops() { for (const p of Object.values(this.pops)) p.toggle(null, false); }
    get menuOpen() { return Object.values(this.pops).some((p) => p.open); }

    setActive(ids) {
      for (const b of [...this.bar.querySelectorAll('button[data-style]'), ...this.more.el.querySelectorAll('button[data-style]')]) b.classList.toggle('active', ids.has(b.dataset.style));
      this.bar.querySelector('button[data-pop="more"]').classList.toggle('active', MORE_STYLES.some((id) => ids.has(id)));
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
      if (!show) { this.closePops(); this.tip.hide(); }
    }

    // Floating layout only: dock above `box` (or below it when there's no room).
    place(box, visible) {
      if (this.layout !== 'floating') return;
      const r = box.getBoundingClientRect();
      const onScreen = r.width > 0 && r.bottom > 0 && r.top < innerHeight;
      const show = visible && onScreen;
      this.bar.classList.toggle('hidden', !show);
      if (!show) { this.closePops(); this.tip.hide(); return; }
      const h = this.bar.offsetHeight || 32;
      const w = this.bar.offsetWidth || 300;
      let top = r.top - h - 6;
      if (top < 56) top = r.bottom + 6; // LinkedIn's top nav is ~52px tall
      const left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8));
      this.bar.style.top = `${Math.round(top)}px`;
      this.bar.style.left = `${Math.round(left)}px`;
    }

    destroy() { for (const p of Object.values(this.pops)) p.remove(); this.tip.remove(); this.host.remove(); this.countHost?.remove(); }
  }

  root.LTF = Object.assign(root.LTF || {}, { Toolbar });
})(globalThis);
