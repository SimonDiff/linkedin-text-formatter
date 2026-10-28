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
            let row = btn;
            while (row.parentElement !== a) row = row.parentElement;
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
      if (this.layout === 'inline' || this.layout === 'row') {
        if (host.nextSibling !== t) t.parentNode.insertBefore(host, t);
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
      if (this.layout === 'row') this.toolbar.setVisible(!this.ctx.showOnDraft || hasDraft || this.toolbar.menuOpen);
      else this.toolbar.place(this.box, focused || this.toolbar.hovered || this.toolbar.menuOpen || hasDraft);
    }

    refresh() {
      if (!this.editor.isConnected) return;
      if (this.ctx.limit) {
        const w = CONFIG.newlineWeight[this.ctx.id] ?? 1;
        this.toolbar.setCount(U.linkedInLength(E.toText(this.editor), w));
      }
      const sel = E.selectedText(this.editor);
      const active = new Set(this.typing);
      if (sel) for (const id of [...INLINE_STYLES, 'bullets', 'numbers']) if (U.isActive(sel, id)) active.add(id);
      this.toolbar.setActive(active);
      this.place();
    }

    run(id) {
      const ed = this.editor;
      if (!E.selectionIn(ed)) { ed.focus(); }
      const s = E.selectionIn(ed);
      const collapsed = !s || s.range.collapsed;

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
