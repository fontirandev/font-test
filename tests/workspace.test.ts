import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFactoryDefaults, normalizeDefaults } from '../shared/settings';
import { supportsControl, tabIds } from '../shared/tabs';
import { createWorkspace, orderedFonts, workspaceReducer } from '../src/state/workspace';
import { featureCSS, variationCSS } from '../src/lib/fonts';
import { inferWeight } from '../src/lib/weight';

const fonts = [
  { id: 'a', name: 'A', weight: 700 },
  { id: 'b', name: 'B', weight: 300 },
];
function setup() {
  const defaults = createFactoryDefaults();
  return workspaceReducer(createWorkspace(defaults), { type: 'add-fonts', fonts, defaults });
}
test('font activation, order, controls and text are isolated per tab', () => {
  const initial = setup();
  const untouched = structuredClone(initial.tabs['live-typing']);
  let state = workspaceReducer(initial, { type: 'toggle-font', tab: 'typing-test', id: 'a' });
  state = workspaceReducer(state, { type: 'move-font', tab: 'typing-test', id: 'b', before: 'a' });
  state = workspaceReducer(state, {
    type: 'set-controls',
    tab: 'typing-test',
    patch: { fontSize: 72 },
  });
  state = workspaceReducer(state, { type: 'set-text', tab: 'typing-test', text: 'آزمایش' });
  assert.deepEqual(state.tabs['live-typing'], untouched);
  assert.equal(state.tabs['typing-test'].active.a, false);
  assert.deepEqual(state.tabs['typing-test'].order, ['b', 'a']);
  assert.equal(initial.tabs['typing-test'].active.a, true);
});
test('sorting never mutates another tab or the shared font array', () => {
  const state = workspaceReducer(setup(), { type: 'set-sort', tab: 'weights', sort: 'weight-asc' });
  assert.deepEqual(
    orderedFonts(fonts, state.tabs.weights).map((f) => f.id),
    ['b', 'a'],
  );
  assert.deepEqual(
    orderedFonts(fonts, state.tabs['typing-test']).map((f) => f.id),
    ['a', 'b'],
  );
  assert.deepEqual(
    fonts.map((f) => f.id),
    ['a', 'b'],
  );
});
test('removing a font removes every stale tab reference', () => {
  const state = workspaceReducer(setup(), { type: 'remove-font', id: 'a' });
  for (const id of tabIds) {
    assert.deepEqual(state.tabs[id].order, ['b']);
    assert.equal('a' in state.tabs[id].active, false);
  }
});
test('dragging from a sorted list materializes its visible order before moving', () => {
  const state = workspaceReducer(setup(), {
    type: 'move-font',
    tab: 'weights',
    id: 'a',
    before: 'b',
    visibleOrder: ['b', 'a'],
  });
  assert.deepEqual(state.tabs.weights.order, ['a', 'b']);
  assert.equal(state.tabs.weights.sort, 'manual');
});
test('automatic typing progress survives tab changes without entering defaults', () => {
  let state = workspaceReducer(setup(), {
    type: 'set-typing',
    tab: 'typing-test',
    patch: { position: 12, speed: 10 },
  });
  state = workspaceReducer(state, { type: 'select-tab', tab: 'glyphs' });
  state = workspaceReducer(state, { type: 'select-tab', tab: 'typing-test' });
  assert.deepEqual(state.tabs['typing-test'].typing, { position: 12, speed: 10 });
  assert.equal('typing' in createFactoryDefaults().tabs['typing-test'], false);
});
test('tab defaults control new imports without copying runtime selections', () => {
  const defaults = createFactoryDefaults();
  defaults.tabs.metadata.activateNewFonts = false;
  const state = workspaceReducer(createWorkspace(defaults), { type: 'add-fonts', fonts, defaults });
  assert.equal(state.tabs.metadata.active.a, false);
  assert.equal(state.tabs['typing-test'].active.a, true);
});
test('irrelevant controls are rejected at the tab boundary', () => {
  const initial = setup();
  const state = workspaceReducer(initial, {
    type: 'set-controls',
    tab: 'metadata',
    patch: { fontSize: 99 },
  });
  assert.equal(state.tabs.metadata.controls.fontSize, initial.tabs.metadata.controls.fontSize);
  assert.equal(supportsControl('metadata', 'features'), false);
  assert.equal(supportsControl('glyphs', 'features'), false);
  assert.equal(supportsControl('weights', 'axes'), false);
});
test('defaults reject session data and invalid numeric controls', () => {
  assert.throws(() => normalizeDefaults({ ...createFactoryDefaults(), fonts }));
  const defaults = createFactoryDefaults();
  defaults.tabs['typing-test'].controls.fontSize = NaN;
  assert.throws(() => normalizeDefaults(defaults));
});
test('explicitly disabled OpenType features produce a zero, not browser defaults', () => {
  assert.equal(
    featureCSS({ liga: false, calt: true, ss01: true }, ['liga', 'calt']),
    '"liga" 0, "calt" 1',
  );
});
test('variable axes are clamped independently to each font range', () => {
  assert.equal(
    variationCSS({ wght: 900, fake: 123 }, [
      { tag: 'wght', name: 'Weight', min: 100, max: 700, defaultValue: 400 },
    ]),
    '"wght" 700',
  );
});
test('dragging down onto the next row moves past it, so the last slot is reachable', () => {
  let state = workspaceReducer(setup(), {
    type: 'move-font',
    tab: 'weights',
    id: 'a',
    before: 'b',
  });
  assert.deepEqual(state.tabs.weights.order, ['b', 'a']);
  state = workspaceReducer(state, { type: 'move-font', tab: 'weights', id: 'a', before: 'b' });
  assert.deepEqual(state.tabs.weights.order, ['a', 'b']);
});
test('weight sort prefers the inferred style weight over OS/2', () => {
  const fonts = [
    { id: 'x', name: 'X Black', weight: 400, sortWeight: 900 },
    { id: 'y', name: 'Y Light', weight: 400, sortWeight: 300 },
    { id: 'z', name: 'Z', weight: 500 },
  ];
  const tab = { ...setup().tabs.weights, order: ['x', 'y', 'z'], sort: 'weight-asc' as const };
  assert.deepEqual(
    orderedFonts(fonts, tab).map((font) => font.id),
    ['y', 'z', 'x'],
  );
});
test('weight inference reads style names before a misleading usWeightClass', () => {
  assert.equal(inferWeight({ names: ['Vazir-ExtraBold.ttf'], weightClass: 400 }), 800);
  assert.equal(inferWeight({ names: ['IRANYekanX-DemiBold.woff2'], weightClass: 400 }), 600);
  assert.equal(inferWeight({ names: ['Font ExtraLight'], weightClass: 400 }), 200);
  assert.equal(inferWeight({ names: ['فونت فوق‌ضخیم'] }), 800);
  assert.equal(
    inferWeight({ names: ['Family Light'], legacySubfamily: 'Regular', weightClass: 400 }),
    300,
  );
  assert.equal(inferWeight({ names: ['Plain.ttf'], weightClass: 7 }), 700);
  assert.equal(inferWeight({ names: ['Var.ttf'], variableDefault: 350 }), 350);
});
