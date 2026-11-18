import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kerningForms, kerningMarkGroups, withMarks } from '../src/lib/samples';

test('kerning forms cover every joining context of two joining letters', () => {
  // The user's sample for ج with ب, plus the one order it left out (جبجب).
  assert.deepEqual(kerningForms('ج', 'ب'), ['ج', 'جب', 'بجب', 'جبج', 'بجبج', 'جبجب', 'بج']);
});

test('a letter that never joins on is still met mid-word through the other letter', () => {
  // ا can't sit before ج inside a word, so ج is put mid-word by doubling it (ججا).
  assert.deepEqual(kerningForms('ج', 'ا'), ['ج', 'جا', 'ججا', 'جاجا', 'جاج', 'اجا', 'اج']);
});

test('two non-joining letters use a kashida to reach their final forms', () => {
  assert.deepEqual(kerningForms('د', 'ر'), ['د', 'در', 'ـدر', 'ـرد', 'رد']);
});

test('a letter paired with itself lists each distinct form once', () => {
  assert.deepEqual(kerningForms('ب', 'ب'), ['ب', 'بب', 'ببب', 'بببب']);
});

test('a chosen diacritic goes on every letter, stacked marks included', () => {
  assert.equal(withMarks('بجب', '\u064E'), 'بَجَبَ');
  assert.equal(withMarks('جب', '\u0651\u064E'), 'ج\u0651\u064Eب\u0651\u064E');
  // The kashida filler is not a letter, so it stays bare.
  assert.equal(withMarks('\u0640در', '\u064F'), '\u0640دُرُ');
  assert.equal(withMarks('جب', ''), 'جب');
});

test('every diacritic button is a distinct combining mark sequence', () => {
  const all = kerningMarkGroups.flatMap((group) => group.marks);
  assert.equal(new Set(all.map((mark) => mark.marks)).size, all.length);
  for (const mark of all) assert.match(mark.marks, /^[\u064B-\u065F\u0670]+$/u, mark.id);
});
