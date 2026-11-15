import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFactoryDefaults, normalizeDefaults } from '../shared/settings';
import { supportsControl, tabIds } from '../shared/tabs';
import { createWorkspace, orderedFonts, workspaceReducer } from '../src/state/workspace';
import { featureCSS, variationCSS } from '../src/lib/fonts';
import { inferWeight } from '../src/lib/weight';
import { readStoredWorkspace, storeWorkspace } from '../src/lib/workspace-storage';

const fonts = [
  { id: 'a', name: 'A', weight: 700 },
  { id: 'b', name: 'B', weight: 300 },
];
function setup() {
  const defaults = createFactoryDefaults();
  return workspaceReducer(createWorkspace(defaults), { type: 'add-fonts', fonts, defaults });
}
test('font activation, controls and text are isolated per tab', () => {
  const initial = setup();
  const untouched = structuredClone(initial.tabs['live-typing']);
  let state = workspaceReducer(initial, { type: 'toggle-font', tab: 'typing-test', id: 'a' });
  state = workspaceReducer(state, { type: 'move-font', id: 'b', before: 'a' });
  state = workspaceReducer(state, {
    type: 'set-controls',
    tab: 'typing-test',
    patch: { direction: 'ltr' },
  });
  state = workspaceReducer(state, { type: 'set-text', tab: 'typing-test', text: 'آزمایش' });
  assert.deepEqual(state.tabs['live-typing'], untouched);
  assert.equal(state.tabs['typing-test'].active.a, false);
  assert.deepEqual(state.order, ['b', 'a']);
  assert.equal(initial.tabs['typing-test'].active.a, true);
});
test('font size and variable axes are shared by every tab that offers them', () => {
  let state = workspaceReducer(setup(), {
    type: 'set-controls',
    tab: 'languages',
    patch: { fontSize: 72, axes: { wght: 700, CNTR: 40 }, features: { ss01: true } },
  });
  for (const id of tabIds) {
    const { controls } = state.tabs[id];
    if (supportsControl(id, 'fontSize')) assert.equal(controls.fontSize, 72, id);
    if (supportsControl(id, 'axes')) assert.deepEqual(controls.axes, { wght: 700, CNTR: 40 }, id);
  }
  // Features stay per tab.
  assert.equal(state.tabs['typing-test'].controls.features.ss01, undefined);
  state = workspaceReducer(state, {
    type: 'reset-tab',
    tab: 'weights',
    defaults: createFactoryDefaults(),
  });
  assert.equal(state.tabs['typing-test'].controls.fontSize, 48);
});
test('font order and sort are shared by every tab and never mutate the font array', () => {
  let state = workspaceReducer(setup(), { type: 'set-sort', sort: 'weight-asc' });
  assert.deepEqual(
    orderedFonts(fonts, state).map((f) => f.id),
    ['b', 'a'],
  );
  const tabs = structuredClone(state.tabs);
  state = workspaceReducer(state, { type: 'select-tab', tab: 'glyphs' });
  assert.equal(state.sort, 'weight-asc');
  assert.deepEqual(state.tabs, tabs);
  assert.deepEqual(
    fonts.map((f) => f.id),
    ['a', 'b'],
  );
});
test('removing a font removes every stale tab reference', () => {
  const state = workspaceReducer(setup(), { type: 'remove-font', id: 'a' });
  assert.deepEqual(state.order, ['b']);
  for (const id of tabIds) {
    assert.equal('a' in state.tabs[id].active, false);
  }
});
test('dragging from a sorted list materializes its visible order before moving', () => {
  const state = workspaceReducer(setup(), {
    type: 'move-font',
    id: 'a',
    before: 'b',
    visibleOrder: ['b', 'a'],
  });
  assert.deepEqual(state.order, ['a', 'b']);
  assert.equal(state.sort, 'manual');
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
test('reference sheets have no adjustable controls and keep the 32pt default', () => {
  const workspace = createWorkspace(createFactoryDefaults());
  for (const tab of ['diacritics', 'characters', 'connections', 'zwnj'] as const) {
    assert.equal(supportsControl(tab, 'fontSize'), false, tab);
    assert.equal(workspace.tabs[tab].controls.fontSize, 32, tab);
  }
});
test('old saved defaults with per-tab sort and retired controls are migrated', () => {
  const legacy = JSON.parse(JSON.stringify(createFactoryDefaults()));
  delete legacy.sort;
  for (const tab of Object.values(legacy.tabs) as Record<string, any>[]) {
    tab.sort = 'manual';
    tab.controls.lineHeight = 1.8;
    tab.controls.letterSpacing = 0;
  }
  legacy.tabs['typing-test'].sort = 'weight-desc';
  const migrated = normalizeDefaults(legacy);
  assert.equal(migrated.sort, 'weight-desc');
  assert.equal('sort' in migrated.tabs.weights, false);
  assert.equal('lineHeight' in migrated.tabs.weights.controls, false);
  assert.equal(createWorkspace(migrated).sort, 'weight-desc');
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
  let state = workspaceReducer(setup(), { type: 'move-font', id: 'a', before: 'b' });
  assert.deepEqual(state.order, ['b', 'a']);
  state = workspaceReducer(state, { type: 'move-font', id: 'a', before: 'b' });
  assert.deepEqual(state.order, ['a', 'b']);
});
test('weight sort prefers the inferred style weight over OS/2', () => {
  const fonts = [
    { id: 'x', name: 'X Black', weight: 400, sortWeight: 900 },
    { id: 'y', name: 'Y Light', weight: 400, sortWeight: 300 },
    { id: 'z', name: 'Z', weight: 500 },
  ];
  assert.deepEqual(
    orderedFonts(fonts, { order: ['x', 'y', 'z'], sort: 'weight-asc' }).map((font) => font.id),
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
test('single-font tabs keep at most one font on', () => {
  const defaults = createFactoryDefaults();
  let state = setup();
  assert.deepEqual(state.tabs.characters.active, { a: true, b: false });
  assert.deepEqual(state.tabs.languages.active, { a: true, b: false });
  assert.deepEqual(state.tabs.glyphs.active, { a: true, b: false });
  state = workspaceReducer(state, {
    type: 'add-fonts',
    fonts: [{ id: 'c', name: 'C', weight: 400 }],
    defaults,
  });
  assert.equal(state.tabs.characters.active.c, false);
  state = workspaceReducer(state, { type: 'toggle-font', tab: 'characters', id: 'b' });
  assert.deepEqual(state.tabs.characters.active, { a: false, b: true, c: false });
  state = workspaceReducer(state, { type: 'toggle-font', tab: 'characters', id: 'b' });
  assert.deepEqual(state.tabs.characters.active, { a: false, b: false, c: false });
  assert.equal(state.tabs['typing-test'].active.c, true);
});

test('workspace choices survive a browser-storage round trip', () => {
  const savedStorage = globalThis.localStorage;
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
    },
  });
  try {
    const defaults = createFactoryDefaults();
    let workspace = workspaceReducer(createWorkspace(defaults), {
      type: 'add-fonts',
      fonts,
      defaults,
    });
    workspace = workspaceReducer(workspace, { type: 'select-tab', tab: 'connections' });
    workspace = workspaceReducer(workspace, {
      type: 'set-controls',
      tab: 'connections',
      patch: { fontSize: 72, features: { calt: false } },
    });
    workspace = workspaceReducer(workspace, {
      type: 'set-text',
      tab: 'live-typing',
      text: 'متن پایدار',
    });
    storeWorkspace(workspace);
    assert.deepEqual(readStoredWorkspace(defaults), workspace);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: savedStorage,
    });
  }
});
