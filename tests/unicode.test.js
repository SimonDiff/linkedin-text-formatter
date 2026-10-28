// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../src/unicode.js');

test('bold and unbold round trip', () => {
  const b = U.apply('Hello 2026!', 'bold');
  assert.equal(b, '𝗛𝗲𝗹𝗹𝗼 𝟮𝟬𝟮𝟲!');
  assert.equal(U.apply(b, 'bold'), 'Hello 2026!');
});

test('bold + italic combine into bold italic', () => {
  const bi = U.apply(U.apply('word', 'bold'), 'italic');
  assert.equal(bi, '𝙬𝙤𝙧𝙙');
  assert.equal(U.apply(bi, 'bold'), '𝘸𝘰𝘳𝘥');
});

test('partially bold selection becomes fully bold', () => {
  assert.equal(U.apply('a𝗯c', 'bold'), '𝗮𝗯𝗰');
});

test('accented letters keep their accent', () => {
  const b = U.apply('perché', 'bold');
  assert.equal(U.apply(b, 'clear'), 'perché');
  assert.ok(b.includes('́'));
});

test('script and double-struck use letterlike exceptions', () => {
  assert.equal(U.apply('Hello', 'double'), 'ℍ𝕖𝕝𝕝𝕠');
  assert.equal(U.apply(U.apply('Hello', 'double'), 'clear'), 'Hello');
});

test('underline and strike decorate non-space chars and toggle off', () => {
  const u = U.apply('a b', 'underline');
  assert.equal(u, 'a̲ b̲');
  assert.equal(U.apply(u, 'underline'), 'a b');
  assert.equal(U.apply(U.apply('ab', 'strike'), 'clear'), 'ab');
});

test('case changes keep styling', () => {
  assert.equal(U.apply(U.apply('abc', 'bold'), 'upper'), '𝗔𝗕𝗖');
});

test('lists add, switch and toggle off', () => {
  const b = U.apply('one\ntwo\n\nthree', 'bullets');
  assert.equal(b, '• one\n• two\n\n• three');
  assert.equal(U.apply(b, 'numbers'), '1. one\n2. two\n\n3. three');
  assert.equal(U.apply(b, 'bullets'), 'one\ntwo\n\nthree');
});

test('clear removes everything', () => {
  const messy = U.apply(U.apply(U.apply('Mix it', 'script'), 'underline'), 'strike');
  assert.equal(U.apply(messy, 'clear'), 'Mix it');
});

test('length counts surrogate pairs as 2', () => {
  assert.equal(U.linkedInLength('ab'), 2);
  assert.equal(U.linkedInLength(U.apply('ab', 'bold')), 4);
  assert.equal(U.linkedInLength('a\nb', 2), 4);
});
