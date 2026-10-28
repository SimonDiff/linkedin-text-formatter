// Unicode "formatting" engine. Pure functions, no DOM.
// Text is decoded into units of { ch, family, bold, italic, underline, strike }
// so styles can be combined and toggled (bold + italic = bold italic, bold again = unbold).
(function (root) {
  const UNDERLINE = '̲';
  const STRIKE = '̶';

  // Families and the math alphanumeric blocks that implement them.
  // key = `${family}:${bold ? 1 : 0}${italic ? 1 : 0}`
  // upper/lower/digit = first code point of each run; exceptions = holes in the block
  // that live elsewhere in Unicode (Letterlike Symbols).
  const VARIANTS = {
    'sans:10': { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
    'sans:01': { upper: 0x1d608, lower: 0x1d622 },
    'sans:11': { upper: 0x1d63c, lower: 0x1d656, digit: 0x1d7ec },
    'serif:10': { upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
    'serif:01': { upper: 0x1d434, lower: 0x1d44e, exceptions: { h: 0x210e } },
    'serif:11': { upper: 0x1d468, lower: 0x1d482, digit: 0x1d7ce },
    'script:00': {
      upper: 0x1d49c, lower: 0x1d4b6,
      exceptions: { B: 0x212c, E: 0x2130, F: 0x2131, H: 0x210b, I: 0x2110, L: 0x2112, M: 0x2133, R: 0x211b, e: 0x212f, g: 0x210a, o: 0x2134 },
    },
    'script:10': { upper: 0x1d4d0, lower: 0x1d4ea },
    'double:00': {
      upper: 0x1d538, lower: 0x1d552, digit: 0x1d7d8,
      exceptions: { C: 0x2102, H: 0x210d, N: 0x2115, P: 0x2119, Q: 0x211a, R: 0x211d, Z: 0x2124 },
    },
    'mono:00': { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
  };
  // Plain sans-serif (U+1D5A0) looks like normal text; decode it as plain.
  const DECODE_ONLY = { 'plain:00': { upper: 0x1d5a0, lower: 0x1d5ba, digit: 0x1d7e2 } };

  // Reverse map: styled code point -> { ch, family, bold, italic }
  const REVERSE = new Map();
  function indexVariant(key, v) {
    const [family, flags] = key.split(':');
    const info = { family: family === 'plain' ? 'sans' : family, bold: flags[0] === '1', italic: flags[1] === '1' };
    const add = (cp, ch) => { if (!REVERSE.has(cp)) REVERSE.set(cp, { ch, ...info }); };
    for (let i = 0; i < 26; i++) {
      const U = String.fromCharCode(65 + i), l = String.fromCharCode(97 + i);
      add(v.exceptions?.[U] ?? v.upper + i, U);
      add(v.exceptions?.[l] ?? v.lower + i, l);
    }
    if (v.digit) for (let i = 0; i < 10; i++) add(v.digit + i, String(i));
  }
  for (const [k, v] of Object.entries(VARIANTS)) indexVariant(k, v);
  for (const [k, v] of Object.entries(DECODE_ONLY)) indexVariant(k, v);

  function encodeChar(ch, family, bold, italic) {
    if (family === 'sans' && !bold && !italic) return ch;
    const v = VARIANTS[`${family}:${bold ? 1 : 0}${italic ? 1 : 0}`];
    if (!v) return ch;
    if (v.exceptions?.[ch]) return String.fromCodePoint(v.exceptions[ch]);
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(v.upper + c - 65);
    if (c >= 97 && c <= 122) return String.fromCodePoint(v.lower + c - 97);
    if (c >= 48 && c <= 57 && v.digit) return String.fromCodePoint(v.digit + c - 48);
    return ch;
  }

  const isMappable = (ch) => /^[A-Za-z0-9]$/.test(ch);

  // Split text into units. Accented letters are decomposed (é -> e + U+0301) so the
  // base letter can be styled; the accent stays attached as a combining mark.
  function decode(text) {
    const units = [];
    for (const ch of text.normalize('NFD')) {
      if (ch === UNDERLINE || ch === STRIKE || /\p{M}/u.test(ch)) {
        const prev = units[units.length - 1];
        if (prev && prev.ch !== '\n') {
          if (ch === UNDERLINE) prev.underline = true;
          else if (ch === STRIKE) prev.strike = true;
          else prev.marks += ch;
          continue;
        }
        if (ch === UNDERLINE || ch === STRIKE) continue; // orphan mark, drop it
      }
      const r = REVERSE.get(ch.codePointAt(0));
      units.push(r
        ? { ch: r.ch, family: r.family, bold: r.bold, italic: r.italic, underline: false, strike: false, marks: '' }
        : { ch, family: 'sans', bold: false, italic: false, underline: false, strike: false, marks: '' });
    }
    return units;
  }

  function encode(units) {
    let out = '';
    for (const u of units) {
      out += encodeChar(u.ch, u.family, u.bold, u.italic) + u.marks;
      if (u.ch !== '\n') {
        if (u.underline) out += UNDERLINE;
        if (u.strike) out += STRIKE;
      }
    }
    return out.normalize('NFC');
  }

  // Units that a style can visibly change (skip spaces/newlines for decorations).
  const styleable = (u) => isMappable(u.ch);
  const decoratable = (u) => !/\s/.test(u.ch);

  // ---- Style definitions -------------------------------------------------
  // lossy: true when the result is no longer plain letters, so search engines,
  // LinkedIn search and screen readers can't read it as words.
  const STYLES = {
    bold:       { label: 'Bold',          lossy: true,  kind: 'flag', flag: 'bold' },
    italic:     { label: 'Italic',        lossy: true,  kind: 'flag', flag: 'italic' },
    underline:  { label: 'Underline',     lossy: true,  kind: 'decor', flag: 'underline' },
    strike:     { label: 'Strikethrough', lossy: true,  kind: 'decor', flag: 'strike' },
    serif:      { label: 'Serif bold',    lossy: true,  kind: 'family', family: 'serif', bold: true },
    script:     { label: 'Script',        lossy: true,  kind: 'family', family: 'script', bold: true },
    double:     { label: 'Double-struck', lossy: true,  kind: 'family', family: 'double' },
    mono:       { label: 'Monospace',     lossy: true,  kind: 'family', family: 'mono' },
    upper:      { label: 'UPPERCASE',     lossy: false, kind: 'case' },
    lower:      { label: 'lowercase',     lossy: false, kind: 'case' },
    bullets:    { label: 'Bulleted list', lossy: false, kind: 'list', marker: () => '• ' },
    numbers:    { label: 'Numbered list', lossy: false, kind: 'list', marker: (i) => `${i + 1}. ` },
    clear:      { label: 'Remove formatting', lossy: false, kind: 'clear' },
  };

  function isActive(text, styleId) {
    const s = STYLES[styleId];
    const units = decode(text);
    if (s.kind === 'flag') {
      const t = units.filter(styleable);
      return t.length > 0 && t.every((u) => u[s.flag] && (u.family === 'sans' || u.family === 'serif' || (u.family === 'script' && s.flag === 'bold')));
    }
    if (s.kind === 'decor') {
      const t = units.filter(decoratable);
      return t.length > 0 && t.every((u) => u[s.flag]);
    }
    if (s.kind === 'family') {
      const t = units.filter(styleable);
      return t.length > 0 && t.every((u) => u.family === s.family && (!s.bold || u.bold));
    }
    if (s.kind === 'list') {
      const lines = text.split('\n').filter((l) => l.trim());
      return lines.length > 0 && lines.every((l, i) => l.startsWith(s.marker(i)));
    }
    return false;
  }

  const LIST_MARKER = /^(?:[•◦▪‣\-*]\s|\d+[.)]\s)/;

  // Apply (or toggle off) a style on a piece of text. Returns the new text.
  function apply(text, styleId) {
    const s = STYLES[styleId];
    if (!s) throw new Error(`Unknown style ${styleId}`);

    if (s.kind === 'list') {
      const lines = text.split('\n');
      if (isActive(text, styleId)) return lines.map((l) => l.replace(LIST_MARKER, '')).join('\n');
      let i = 0;
      return lines.map((l) => (l.trim() ? s.marker(i++) + l.replace(LIST_MARKER, '') : l)).join('\n');
    }

    if (s.kind === 'clear') {
      return decode(text).map((u) => u.ch + u.marks).join('').normalize('NFC');
    }

    const units = decode(text);

    if (s.kind === 'case') {
      for (const u of units) u.ch = styleId === 'upper' ? u.ch.toUpperCase() : u.ch.toLowerCase();
      return encode(units);
    }

    const on = !isActive(text, styleId);
    for (const u of units) {
      if (s.kind === 'decor') {
        if (decoratable(u)) u[s.flag] = on;
      } else if (s.kind === 'flag') {
        if (!styleable(u)) continue;
        // Double-struck and monospace have no bold/italic: fall back to sans.
        if (u.family === 'double' || u.family === 'mono') u.family = 'sans';
        // Script only has a bold variant; italic switches it to sans italic.
        if (u.family === 'script' && s.flag === 'italic') { u.family = 'sans'; u.bold = true; }
        u[s.flag] = on;
      } else if (s.kind === 'family') {
        if (!styleable(u)) continue;
        u.family = on ? s.family : 'sans';
        u.bold = on ? !!s.bold : false;
        u.italic = on && s.family === 'serif' ? u.italic : false;
      }
    }
    return encode(units);
  }

  // Length as LinkedIn's JavaScript sees it: UTF-16 code units, so each 𝗯𝗼𝗹𝗱
  // letter counts as 2. newlineWeight lets the caller match how a given editor
  // serialises line breaks.
  function linkedInLength(text, newlineWeight = 1) {
    let n = 0;
    for (let i = 0; i < text.length; i++) n += text[i] === '\n' ? newlineWeight : 1;
    return n;
  }

  const api = { STYLES, apply, isActive, decode, encode, linkedInLength, LIST_MARKER };
  root.LTF = Object.assign(root.LTF || {}, { unicode: api });
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
