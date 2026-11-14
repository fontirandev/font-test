import { test } from 'node:test';
import assert from 'node:assert/strict';
import { featureLabel, isToggleableFeature } from '../src/components/PreviewControls';

test('only discretionary OpenType features are offered as toggles', () => {
  for (const tag of ['dlig', 'calt', 'kern', 'ss01', 'ss20', 'cv03']) assert.ok(isToggleableFeature(tag));
  for (const tag of ['ccmp', 'locl', 'init', 'medi', 'fina', 'rlig', 'mark', 'mkmk', 'aalt'])
    assert.equal(isToggleableFeature(tag), false);
});

test('feature tags get readable labels', () => {
  assert.equal(featureLabel('dlig'), 'Rare ligatures');
  assert.equal(featureLabel('ss05'), 'Stylistic set 5');
  assert.equal(featureLabel('cv11'), 'Character variant 11');
});
