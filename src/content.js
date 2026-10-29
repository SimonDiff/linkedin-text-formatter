// Finds LinkedIn's editors as they appear and attaches a toolbar to each.
(function (root) {
  const { CONFIG, Toolbar, unicode: U, editor: E } = root.LTF;
  const attached = new Map(); // editor element -> controller
  // Diagnostics go to console.debug (DevTools "Verbose" level), prefixed [LTF].
  const log = (...a) => console.debug('[LTF]', ...a);
  document.documentElement.dataset.ltfVersion = chrome.runtime.getManifest().version;

  const INLINE_STYLES = new Set(['bold', 'italic', 'underline', 'strike', 'serif', 'script', 'double', 'mono']);

  // Text that hints at what an editor is for: its own label/placeholder, the
  // placeholder TipTap puts on the empty first paragraph, and the dialog's label.
  function describe(el) {
    const inner = el.querySelector('[data-placeholder]');
    const dialog = el.closest('[role="dialog"]');
    return [
      el.getAttribute('aria-label'), el.getAttribute('aria-placeholder'), el.getAttribute('data-placeholder'), el.getAttribute('placeholder'),
      inner && inner.getAttribute('data-placeholder'),
      dialog && (dialog.getAttribute('aria-label') || dialog.getAttribute('aria-labelledby') && document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent),
    ].filter(Boolean).join(' | ');
  }

  function classify(el) {
    const text = describe(el);
    for (const ctx of CONFIG.contexts) if (el.closest(ctx.containers)) return ctx;
    for (const ctx of CONFIG.contexts) if (ctx.hints.test(text)) return ctx;
    // Comments and messages are recognised above, so an unlabelled TipTap
    // editor left over is most likely the post composer.
    if (el.matches('.tiptap, .ProseMirror')) return CONFIG.contexts.find((c) => c.id === 'post');
    return null;
  }

  // Climb through wrappers that only hold the editor, so the toolbar sits above
  // the editor's scroll area and outside nodes the editor's framework manages.
  function outerWrapper(el) {
    // Prefer to sit outside the editor's scroll area, so the toolbar stays put
    // while the text scrolls.
    for (let a = el.parentElement; a && !a.matches('[role="dialog"], form, body'); a = a.parentElement) {
      const oy = getComputedStyle(a).overflowY;
      if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return a;
    }
    let a = el;
    while (a.parentElement && a.parentElement.children.length === 1 && !a.parentElement.matches('[role="dialog"], form, body')) a = a.parentElement;
    return a;
  }

  // One stylesheet per document/shadow root that hides adopted ::before bars.
  const hiddenIn = new WeakSet();
  function hideBeforeIn(root) {
    if (hiddenIn.has(root)) return;
    hiddenIn.add(root);
    const style = document.createElement('style');
    style.textContent = '[data-ltf-adopt]::before { visibility: hidden !important; }';
    (root.head || root).appendChild(style);
  }

  // The comment box's visible outline: the nearest ancestor of the editor with
  // a border and rounded corners, looking a few levels past the box we found.
  function roundedAround(ed, box) {
    let stop = box;
    for (let i = 0; i < 3 && stop.parentElement && stop.parentElement !== document.body; i++) stop = stop.parentElement;
    for (let a = ed.parentElement; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (a.contains(box) && parseFloat(cs.borderTopWidth) > 0 && parseFloat(cs.borderTopLeftRadius) > 0) return a;
      if (a === stop) break;
    }
    return box;
  }

  class Controller {
    constructor(editor, ctx) {
      this.editor = editor;
      this.ctx = ctx;
      this.typing = new Set(); // styles applied to new keystrokes when nothing is selected
      this.layout = this.target() ? ctx.layout : 'floating';
      this.toolbar = new Toolbar({
        layout: this.layout,
        variant: ctx.id,
        limit: ctx.limit,
        counterBelow: ctx.counterBelow && this.layout === 'row',
        nativeBold: !!ctx.nativeBold,
        onAction: (id) => this.run(id),
      });
      this.mount();
      this.bind();
      this.refresh();
    }

    get box() {
      return (this.ctx.box && this.editor.closest(this.ctx.box)) || this.editor;
    }

    // Where the toolbar goes in LinkedIn's DOM for this layout (null = not found).
    target() {
      const ed = this.editor;
      switch (this.layout || this.ctx.layout) {
        case 'inline':
          return outerWrapper(ed);
        case 'row': {
          if (this.ctx.rowInside) return ed.closest(this.ctx.rowInside);
          if (this.ctx.rowBefore) {
            const form = ed.closest('form, .msg-form');
            return (form && form.querySelector(this.ctx.rowBefore)) || null;
          }
          // The nearest ancestor holding an emoji button is this editor's box;
          // the row goes before the box's child that holds the button.
          for (let a = ed.parentElement, i = 0; a && i < 10; a = a.parentElement, i++) {
            if (a.querySelectorAll(CONFIG.editorSelector).length > 1) return null; // climbed past this box
            const btn = a.querySelector(this.ctx.rowNear);
            if (!btn) continue;
            this.box_ = a;
            // Above the text: go in at the level of the rounded outline, whose
            // children stack; deeper levels lay the text and icons side by side.
            const parent = this.ctx.rowAboveText ? (this.rounded_ = roundedAround(ed, a)) : a;
            let row = this.ctx.rowAboveText ? ed : btn;
            while (row.parentElement !== parent) row = row.parentElement;
            return row;
          }
          return null;
        }
        default:
          return document.body;
      }
    }

    mount() {
      const host = this.toolbar.host;
      const t = this.target();
      if (!t) return;
      if (this.layout === 'row' && this.ctx.rowInside) {
        if (t.firstChild !== host) t.prepend(host);
        // The container lays out the text and its expand button side by side;
        // let it wrap so the toolbar gets a full-width line of its own.
        const cs = getComputedStyle(t);
        if (cs.display.includes('flex') && !cs.flexDirection.startsWith('column')) {
          t.style.flexWrap = 'wrap';
          t.style.alignContent = 'flex-start';
          host.style.flex = '0 0 100%';
          // The text area may ask for the full width, which would push the
          // expand button onto a hidden third line; let it shrink to share the
          // second line with it. (min-width 1px keeps it off the toolbar's line.)
          const text = [...t.children].find((c) => c !== host && c.contains(this.editor));
          if (text) Object.assign(text.style, { flex: '1 1 0%', minWidth: '1px', width: 'auto' });
        }
      } else if (this.layout === 'inline' || this.layout === 'row') {
        if (host.nextSibling !== t) t.parentNode.insertBefore(host, t);
        // If that level is still a row, give the toolbar a full line of its own.
        if (this.ctx.rowAboveText) {
          const cs = getComputedStyle(t.parentNode);
          host.style.display = 'block';
          host.style.flex = '0 0 100%';
          host.style.width = '100%';
          if (cs.display.includes('flex') && !cs.flexDirection.startsWith('column') && cs.flexWrap === 'nowrap') t.parentNode.style.flexWrap = 'wrap';
        }
      } else if (host.parentNode !== t) {
        t.appendChild(host);
      }
      const ch = this.toolbar.countHost;
      if (ch && this.box_ && ch.previousSibling !== this.box_) this.box_.after(ch);
    }

    bind() {
      const ed = this.editor;
      this.onSel = () => { if (E.isFocused(ed)) this.refresh(); };
      document.addEventListener('selectionchange', this.onSel);
      ed.addEventListener('input', () => this.refresh());
      ed.addEventListener('focus', () => this.refresh());
      ed.addEventListener('blur', () => { this.typing.clear(); setTimeout(() => this.refresh(), 150); });
      // :focus-within styles change without a class flip; re-read the border on any focus move.
      ed.addEventListener('focusin', () => requestAnimationFrame(() => this.syncBorder()));
      ed.addEventListener('focusout', () => requestAnimationFrame(() => this.syncBorder()));

      // Keyboard shortcuts.
      ed.addEventListener('keydown', (e) => {
        if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
        const id = { b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()];
        if (!id) return;
        e.preventDefault();
        e.stopPropagation();
        this.run(id);
      }, true);

      // Typing mode: style characters as they're typed.
      ed.addEventListener('beforeinput', (e) => {
        if (this.inserting || !this.typing.size || e.inputType !== 'insertText' || !e.data || e.isComposing) return;
        let t = e.data;
        for (const id of this.typing) t = U.apply(t, id);
        if (t === e.data) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        this.inserting = true;
        try { E.replaceSelection(ed, t, { reselect: false }); } finally { this.inserting = false; }
      }, true);

      if (this.layout === 'floating') {
        this.reposition = () => this.place();
        addEventListener('scroll', this.reposition, { capture: true, passive: true });
        addEventListener('resize', this.reposition, { passive: true });
        this.ro = new ResizeObserver(this.reposition);
        this.ro.observe(this.box);
      }
    }

    place() {
      const ed = this.editor;
      const focused = E.isFocused(ed);
      // Comments keep the pill (and its counter) visible while there's a draft.
      const hasDraft = this.ctx.limit && E.toText(ed).trim().length > 0;
      if (this.layout === 'row') {
        const show = !this.ctx.showOnDraft || hasDraft || this.toolbar.menuOpen ||
          (this.ctx.rowAboveText && (focused || this.toolbar.hovered));
        this.toolbar.setVisible(show);
        if (show && this.ctx.rowAboveText) this.fitCorners();
      }
      else this.toolbar.place(this.box, focused || this.toolbar.hovered || this.toolbar.menuOpen || hasDraft);
    }

    // Inside the rounded comment box: same gap on top as on the sides, and
    // corners concentric with the box's (inner radius = outer radius - gap).
    fitCorners() {
      const box = this.box_, wrap = this.toolbar.wrap;
      if (!box) return;
      const rounded = this.rounded_ || box;
      const bs = getComputedStyle(rounded), b = rounded.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      if (!w.width) return;
      const side = w.left - b.left - parseFloat(bs.borderLeftWidth);
      const top = w.top - b.top - parseFloat(bs.borderTopWidth);
      const mt = parseFloat(getComputedStyle(wrap).marginTop) || 0;
      if (Math.abs(top - side) > 0.5) wrap.style.marginTop = `${Math.max(0, mt + side - top)}px`;
      const r = parseFloat(bs.borderTopLeftRadius) - side;
      wrap.style.borderRadius = `${Math.max(4, r)}px`;
    }

    // LinkedIn's line above the message field is two layers: a grey top border
    // and a ::before bar that turns green on focus. Hide both on the target and
    // draw them live on the toolbar's host instead, so the toolbar sits under the line.
    syncBorder() {
      const t = this.layout === 'row' && this.ctx.adoptTopBorder && this.target();
      if (!t) return;
      if (this.borderTarget !== t) {
        this.origBorderColor = t.style.getPropertyValue('border-top-color');
        hideBeforeIn(t.getRootNode());
        t.setAttribute('data-ltf-adopt', '');
      }
      t.style.removeProperty('border-top-color');
      if (this.origBorderColor) t.style.setProperty('border-top-color', this.origBorderColor);
      const cs = getComputedStyle(t);
      const host = this.toolbar.host;
      host.style.display = 'block';
      const wrap = host.style;
      wrap.borderTop = `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`;
      wrap.boxShadow = '';
      // The ::before bar keeps its own opacity/transform; we only set visibility.
      const b = getComputedStyle(t, '::before');
      const h = parseFloat(b.height) || 0;
      const shown = b.content !== 'none' && b.display !== 'none' && parseFloat(b.opacity) > 0 && h > 0 &&
        !/^matrix\(0,/.test(b.transform) && !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(b.backgroundColor);
      if (shown) {
        wrap.borderTopColor = b.backgroundColor;
        if (h > 1) wrap.boxShadow = `inset 0 ${h - 1}px 0 0 ${b.backgroundColor}`;
      }
      // !important: LinkedIn's focus colour may itself be !important.
      t.style.setProperty('border-top-color', 'transparent', 'important');
      if (this.borderTarget !== t) {
        this.borderObs?.disconnect();
        this.borderTarget = t;
        // LinkedIn flips the colour by toggling a class, sometimes with a transition.
        this.borderObs = new MutationObserver(() => this.syncBorder());
        this.borderObs.observe(t, { attributes: true, attributeFilter: ['class'] });
        const sync = () => this.syncBorder();
        t.addEventListener('transitionend', sync);
        t.addEventListener('focusin', () => requestAnimationFrame(sync));
        t.addEventListener('focusout', () => requestAnimationFrame(sync));
      }
    }

    refresh() {
      if (!this.editor.isConnected) return;
      this.syncBorder();
      if (this.ctx.limit) {
        const w = CONFIG.newlineWeight[this.ctx.id] ?? 1;
        this.toolbar.setCount(U.linkedInLength(E.toText(this.editor), w));
      }
      const sel = E.selectedText(this.editor);
      const active = new Set(this.typing);
      if (sel) for (const id of [...INLINE_STYLES, 'bullets', 'numbers']) if (U.isActive(sel, id)) active.add(id);
      if (this.native() && E.boldState(this.editor) === 'all') active.add('bold');
      this.toolbar.setActive(active);
      this.place();
    }

    // Real bold is used where the editor supports it, until it fails once.
    native() { return this.ctx.nativeBold && !this.nativeFailed; }

    async run(id) {
      const ed = this.editor;
      if (!E.selectionIn(ed)) { ed.focus(); }
      const s = E.selectionIn(ed);
      const collapsed = !s || s.range.collapsed;

      if (id === 'bold' && this.native()) {
        if (collapsed) { this.toolbar.hint('Select some text first'); return; }
        // Unicode bold from before (or pasted in) becomes plain letters first.
        const sel = E.selectedText(ed);
        if (U.isActive(sel, 'bold')) E.replaceSelection(ed, U.apply(sel, 'bold'));
        const { adding, ok } = await E.toggleNativeBold(ed);
        if (!ok && adding) {
          // The editor didn't take it: fall back to Unicode bold from now on.
          this.nativeFailed = true;
          this.toolbar.setNativeBold(false);
          log('native bold not supported here, using Unicode');
          return this.run(id);
        }
        this.refresh();
        return;
      }

      if (id === 'clear' && this.native() && !collapsed) await E.clearNativeBold(ed);

      if (U.STYLES[id].kind === 'list') {
        E.expandToLines(ed);
      } else if (collapsed) {
        if (INLINE_STYLES.has(id)) {
          // Nothing selected: toggle the style for what you type next.
          if (this.typing.has(id)) this.typing.delete(id);
          else {
            if (U.STYLES[id].kind === 'family') for (const f of ['serif', 'script', 'double', 'mono']) this.typing.delete(f);
            this.typing.add(id);
          }
          this.refresh();
          this.toolbar.hint(this.typing.has(id) ? `${U.STYLES[id].label} on for typing` : `${U.STYLES[id].label} off`);
          return;
        }
        this.toolbar.hint('Select some text first');
        return;
      }

      const before = E.selectedText(ed);
      if (!before) { this.toolbar.hint('Select some text first'); return; }
      const after = U.apply(before, id);
      if (after !== before) E.replaceSelection(ed, after);
      this.refresh();
    }

    alive() {
      if (this.editor.isConnected) { if (this.layout !== 'floating') this.mount(); return true; }
      document.removeEventListener('selectionchange', this.onSel);
      if (this.reposition) {
        removeEventListener('scroll', this.reposition, { capture: true });
        removeEventListener('resize', this.reposition);
        this.ro.disconnect();
      }
      this.borderObs?.disconnect();
      this.toolbar.destroy();
      return false;
    }
  }

  // LinkedIn renders some UI (like the post modal) inside open shadow roots,
  // which querySelectorAll and MutationObserver don't see into. Track them.
  const roots = new Set([document]);
  const observer = new MutationObserver(() => schedule());

  function findShadowRoots(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.shadowRoot && !roots.has(n.shadowRoot) && !n.hasAttribute('data-ltf')) {
        roots.add(n.shadowRoot);
        observer.observe(n.shadowRoot, { childList: true, subtree: true });
        findShadowRoots(n.shadowRoot);
      }
    }
  }

  function scan() {
    for (const r of roots) if (r !== document && !r.host.isConnected) roots.delete(r);
    findShadowRoots(document);
    for (const [ed, c] of attached) if (!c.alive()) attached.delete(ed);
    for (const root of roots) {
      for (const ed of root.querySelectorAll(CONFIG.editorSelector)) {
        if (attached.has(ed) || ed.closest('[data-ltf]')) continue;
        const ctx = classify(ed);
        if (!ctx) { log('unclassified editor', ed, describe(ed)); continue; }
        try {
          attached.set(ed, new Controller(ed, ctx));
          log('attached', ctx.id, ed, describe(ed));
        } catch (e) {
          console.warn('[LTF] could not attach to', ed, e);
        }
      }
    }
  }

  // Scans walk the whole page, so run at most every 250ms.
  let timer = null;
  let last = 0;
  function schedule() {
    if (timer) return;
    const wait = Math.max(0, 250 - (Date.now() - last));
    timer = setTimeout(() => { timer = null; last = Date.now(); safeScan(); }, wait);
  }
  observer.observe(document.documentElement, { childList: true, subtree: true });
  function safeScan() {
    try { scan(); } catch (e) { console.warn('[LTF] scan failed', e); }
  }
  log('loaded in', location.href);
  safeScan();
  root.LTF.scan = scan;
})(globalThis);
