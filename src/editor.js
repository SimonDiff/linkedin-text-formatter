// Reading and writing text in LinkedIn's rich-text editors (contenteditable,
// Quill/ProseMirror style). Writes go through execCommand('insertText'), which
// fires the same beforeinput/input events as typing, so the editor's own model
// stays in sync and native undo keeps working. Raw DOM edits would be wiped.
(function (root) {
  const BLOCK = /^(P|DIV|LI|H[1-6]|BLOCKQUOTE|PRE|UL|OL)$/;

  // Serialise a node (or fragment) to plain text: one "\n" between blocks,
  // "\n" for <br>, and the trailing placeholder <br> in a block ignored.
  function toText(node) {
    let out = '';
    let pendingBreak = false; // a block just ended; the next content starts a new line
    const emit = (t) => {
      if (pendingBreak) { out += '\n'; pendingBreak = false; }
      out += t;
    };
    const walk = (n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = n.data.replace(/\u00a0/g, ' ').replace(/\u200b|\ufeff/g, '');
        if (t) emit(t);
        return;
      }
      if (n.nodeType !== Node.ELEMENT_NODE && n.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
      if (n.nodeName === 'BR') {
        if (!isTrailingBr(n)) emit('\n');
        return;
      }
      const isBlock = n.nodeType === Node.ELEMENT_NODE && BLOCK.test(n.nodeName);
      if (isBlock) {
        if (pendingBreak) emit('');
        else if (out && !out.endsWith('\n')) out += '\n';
      }
      for (const c of n.childNodes) walk(c);
      if (isBlock) pendingBreak = true;
    };
    walk(node);
    return out;
  }

  function isTrailingBr(br) {
    let s = br.nextSibling;
    while (s && s.nodeType === Node.TEXT_NODE && !s.data) s = s.nextSibling;
    if (s) return false;
    const parent = br.parentNode;
    return !!parent && (parent.nodeType === 11 || BLOCK.test(parent.nodeName) || parent.isContentEditable);
  }

  // Inside a shadow root, Chrome only exposes the real selection on the root itself.
  function getSel(editor) {
    const root = editor.getRootNode();
    return typeof root.getSelection === 'function' ? root.getSelection() : editor.ownerDocument.getSelection();
  }

  function isFocused(editor) {
    const a = editor.getRootNode().activeElement;
    return !!a && (a === editor || editor.contains(a));
  }

  function selectionIn(editor) {
    const sel = getSel(editor);
    if (!sel || sel.rangeCount === 0) return null;
    const r = sel.getRangeAt(0);
    if (!editor.contains(r.commonAncestorContainer)) return null;
    return { sel, range: r };
  }

  function selectedText(editor) {
    const s = selectionIn(editor);
    if (!s || s.range.collapsed) return '';
    return toText(s.range.cloneContents());
  }

  // Grow the selection to whole lines (for lists).
  function expandToLines(editor) {
    const s = selectionIn(editor);
    if (!s) return false;
    const { sel, range } = s;
    const end = [range.endContainer, range.endOffset];
    sel.collapse(range.startContainer, range.startOffset);
    sel.modify('move', 'backward', 'paragraphboundary');
    const start = sel.getRangeAt(0);
    const startPos = [start.startContainer, start.startOffset];
    sel.collapse(end[0], end[1]);
    sel.modify('move', 'forward', 'paragraphboundary');
    const fin = sel.getRangeAt(0);
    sel.setBaseAndExtent(startPos[0], startPos[1], fin.endContainer, fin.endOffset);
    return true;
  }

  function selectAll(editor) {
    const sel = getSel(editor);
    const r = editor.ownerDocument.createRange();
    r.selectNodeContents(editor);
    sel.removeAllRanges();
    sel.addRange(r);
  }

  const graphemes = (t) => {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) return [...new Intl.Segmenter().segment(t)].length;
    return [...t].length;
  };

  // Replace the current selection with `text`, then re-select what was inserted
  // so styles can be stacked (Bold, then Italic).
  function replaceSelection(editor, text, { reselect = true } = {}) {
    editor.focus();
    const doc = editor.ownerDocument;
    const before = toText(editor);
    let ok;
    if (!text.includes('\n')) {
      ok = doc.execCommand('insertText', false, text);
    } else {
      // Line by line: "\n" inside insertText is handled inconsistently across
      // editors (ProseMirror drops it), but insertParagraph is a plain Enter.
      if (!getSel(editor).isCollapsed) doc.execCommand('delete');
      ok = true;
      text.split('\n').forEach((line, i) => {
        if (i > 0) ok = doc.execCommand('insertParagraph') && ok;
        if (line) ok = doc.execCommand('insertText', false, line) && ok;
      });
    }
    if (!ok || toText(editor) === before) ok = pasteFallback(editor, text);
    if (ok && reselect && text) {
      const sel = getSel(editor);
      const n = graphemes(text);
      for (let i = 0; i < n; i++) sel.modify('extend', 'backward', 'character');
    }
    return ok;
  }

  // Some editors ignore execCommand; most handle a paste event with text/plain.
  function pasteFallback(editor, text) {
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      editor.dispatchEvent(ev);
      return ev.defaultPrevented;
    } catch (e) {
      return false;
    }
  }

  // ---- Native bold (editors whose schema has a real bold mark) ------------
  const inBold = (node, editor) => {
    for (let el = node.parentElement; el && el !== editor; el = el.parentElement) {
      if (el.nodeName === 'STRONG' || el.nodeName === 'B') return true;
    }
    return false;
  };

  // 'all' | 'some' | 'none': how much of the selection is real bold. A caret
  // counts as 'all' when it sits inside bold text.
  function boldState(editor) {
    const s = selectionIn(editor);
    if (!s) return 'none';
    const r = s.range;
    if (r.collapsed) return r.startContainer.nodeType === Node.TEXT_NODE && inBold(r.startContainer, editor) ? 'all' : 'none';
    let bold = 0, plain = 0;
    const w = editor.ownerDocument.createTreeWalker(r.commonAncestorContainer.nodeType === Node.TEXT_NODE ? r.commonAncestorContainer.parentNode : r.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!r.intersectsNode(n)) continue;
      const from = n === r.startContainer ? r.startOffset : 0;
      const to = n === r.endContainer ? r.endOffset : n.data.length;
      if (!n.data.slice(from, to).trim()) continue; // spaces between bold words don't count
      if (inBold(n, editor)) bold++; else plain++;
    }
    return bold && !plain ? 'all' : bold ? 'some' : 'none';
  }

  // Toggle real bold on the selection, the way the browser's own Bold does;
  // the editor reads the change into its model. Resolves to { adding, ok },
  // ok = the selection ended up in the state we asked for.
  async function toggleNativeBold(editor) {
    editor.focus();
    // ProseMirror reads a selection change on its own schedule; let it catch
    // up first, or the command lands on the previous selection.
    await new Promise((r) => setTimeout(r, 30));
    const want = boldState(editor) === 'all' ? 'none' : 'all';
    editor.ownerDocument.execCommand('bold');
    // Let the editor parse the DOM change and re-render it.
    await new Promise((r) => setTimeout(r, 60));
    return { adding: want === 'all', ok: boldState(editor) === want };
  }

  // Remove real bold from the selection (part of Clear formatting).
  async function clearNativeBold(editor) {
    if (boldState(editor) === 'none') return;
    editor.focus();
    await new Promise((r) => setTimeout(r, 30));
    editor.ownerDocument.execCommand('removeFormat');
    await new Promise((r) => setTimeout(r, 60));
  }

  root.LTF = Object.assign(root.LTF || {}, {
    editor: { getSel, isFocused, toText, selectedText, selectionIn, expandToLines, selectAll, replaceSelection, boldState, toggleNativeBold, clearNativeBold },
  });
})(globalThis);
