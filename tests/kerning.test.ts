import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kerningForms } from '../src/lib/samples';

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
