# Font Desk

A local Persian type-design workbench built with React, TypeScript, and Tailwind CSS. The interface follows the supplied [Figma design](https://www.figma.com/design/kf79BgCl04FVQMubBYpac5/fonttester?node-id=1-14). Testing workflows are informed by [FontiranFontTester](https://github.com/mojtabaem/FontiranFontTester); this implementation does not copy its source code.

## Run locally

Requires Node.js 24 or newer.

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. For a production build on your own computer:

```sh
npm run build
npm start
```

The server listens on `127.0.0.1` by default (`HOST` overrides it). `PORT` changes the port. No account, remote backend, CDN, analytics, or font upload is required. After installation, the application works offline.

## Run with Docker

Requires Docker with the Compose plugin. Run `make` to list every command.

```sh
make up-local     # development: Vite HMR, source bind-mounted
make up-prod      # production build served by the Node server
make check        # typecheck + tests + build inside the container
```

Open `http://localhost:8030`. Use `PORT=9000 make up-local` to pick another port. The server only accepts `localhost:<PORT>` / `127.0.0.1:<PORT>` Host headers, so the published port always equals the container port, and it is bound to loopback only. The dev container polls for file changes (`FONT_DESK_WATCH_POLLING=1`) to avoid host inotify limits.

## Data ownership

- Font files are read with the browser File API and loaded as in-memory `FontFace` objects. They are never sent to the local HTTP server.
- Every testing tab owns its font order, visibility, preview controls, and sample text. Removing a file removes it from all tabs and releases its browser font face.
- Closing or reloading the page discards the session. Settings → Save defaults is the only persistence action.
- The built-in defaults live in [`settings.json`](settings.json) at the project root (see [Editing settings.json](#editing-settingsjson)). The file is bundled into the app and never changes at runtime. It is validated against the schema in `shared/settings.ts`, so it cannot hold font files, font IDs, or session selections.
- Settings → Save stores a user's own defaults in their browser's localStorage, on top of `settings.json`. Nothing is saved on the server. The reset button in Settings refills the form from `settings.json`; saving it removes the browser's copy.
- Saved defaults apply to future sessions and new imports. Saving does not overwrite controls in already-open tabs.

## Editing settings.json

`settings.json` holds what every user starts with. Edit it, then run `npm test` to check it, and rebuild or redeploy so users get it. Users who saved their own default texts keep those until they reset them in Settings.

| Key                | What it sets                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `theme`            | `"light"`, `"dark"` or `"system"`                                                                                |
| `sort`             | Font list order: `"manual"`, `"name-asc"`, `"name-desc"`, `"weight-asc"`, `"weight-desc"`                        |
| `controls`         | Controls for every tab at once, e.g. `{ "fontSize": 48 }` for the starting font size                             |
| `tabs`             | Per-tab controls; these win over `controls`. Only list what differs; remove an entry to fall back to `controls`. |
| `texts.typingTest` | One line of text for the typing tab                                                                              |
| `texts.paragraph`  | List of paragraphs for the paragraph tab                                                                         |
| `texts.weights`    | Short sample for the weight tab, at most 32 characters                                                           |
| `texts.languages`  | One text each for `farsi`, `english`, `arabic`, `quran`, `urdu`, `kurdish`                                       |
| `texts.characters` | Characters to check, separated by spaces (`الله` stays one cell)                                                 |
| `texts.hardWords`  | List of difficult words, one per item                                                                            |
| `texts.hardPhrases`| List of `{ text, reference }` for full-width عبارات cards (`reference` may add a note)                            |

Tab names: `typing-test`, `paragraph`, `weights`, `languages`, `characters`, `connections`, `hard-words`, `glyphs`, `metadata`, `qa-report`. A tab entry looks like `"paragraph": { "controls": { "lineHeight": 2 } }`, and `"activateNewFonts": false` stops new fonts being switched on in that tab.

| Control       | Value if unset | Allowed                                                |
| ------------- | -------------- | ------------------------------------------------------ |
| `fontSize`    | `48`           | 8–300                                                  |
| `display`     | `"solid"`      | `"solid"`, `"outline"`                                 |
| `direction`   | `"rtl"`        | `"rtl"`, `"ltr"`                                       |
| `alignment`   | `"start"`      | `"start"`, `"center"`, `"end"`, `"justify"`            |
| `lineHeight`  | `1.8`          | 0.8–4, times the font size                             |
| `pageWidth`   | `"full"`       | `"320"`, `"480"`, `"640"`, `"960"`, `"1200"`, `"full"` |
| `features`    | `{}`           | OpenType tags, e.g. `{ "liga": false }`                |
| `axes`        | `{}`           | Variable axes, e.g. `{ "wght": 700 }`                  |
| `showMissing` | `true`         | `true`, `false`                                        |

Each text may be up to 3000 characters. A mistake such as a misspelled tab or control name, or a value out of range, makes the app and `npm test` stop with a message naming the key, for example `Unrecognized key: "fontsize" → at tabs.paragraph.controls`.

## Testing views

Automatic typing with play/pause and speed control; variable/static weight specimens; character coverage and multilingual samples; Persian connections; difficult-word sheets; diacritics and punctuation; paginated raw glyph outlines; metadata; and structural QA with local JSON export.

Feature and axis controls are discovered from selected fonts. Explicitly turning a feature off emits `0` rather than falling back to browser defaults. Axis values are clamped to each font's supported range. Metadata and raw glyph views do not display text-shaping controls.

TTF, OTF, WOFF and WOFF2 files are rendered by the browser and inspected locally. WOFF2 is decompressed in a Web Worker with a bundled WebAssembly decoder, started only when a WOFF2 file is opened. The decoder's glue code needs `eval`, so the server relaxes the CSP for that worker script alone; the page itself keeps a strict policy. Fonts the inspector cannot parse remain usable for previews but clearly report that metadata, coverage, glyph inspection, features, and QA are unavailable. QA checks structural declarations, not visual correctness; feature presence is not a shaping test.

## Design and typography

The supplied light frames specify a 64 px header, 238 px sidebar, 94 × 32 px tabs, square controls, and the gray/turquoise palette in `src/styles.css`. Exact exported SVG assets live in `public/design`. Dark mode uses semantic mappings of the supplied palette because the file contains no dark screen or theme modes. The About dialog includes a live component gallery showing enabled and disabled states.

The design uses **IRANYekanX**, which is not bundled in the public source. For a licensed local setup, place these files in `public/fonts/`:

```text
IRANYekanX-Light.woff2
IRANYekanX-Regular.woff2
IRANYekanX-DemiBold.woff2
```

These files are ignored by Git. The open-source fallback is the bundled Vazirmatn font; fallback typography does not exactly match Figma. Keep any distribution rights for proprietary fonts separate from the source-code license. The output build includes local files in `public`, so do not distribute a build containing private fonts unless permitted.

Phone layouts below 768 CSS pixels display an unsupported-screen message. Narrow desktop widths retain the workspace and scroll the tab strip.

## Development

```sh
npm run typecheck
npm test
npm run build
```

`shared/` defines the settings schema and tab capabilities. `src/state/` contains the pure workspace reducer. `src/lib/` holds local font parsing and QA. `src/components/` contains the shared controls and views. `server/` serves the app.

Tests cover tab isolation, immutable sorting, font removal, feature disabling, axis clamping, the `settings.json` defaults, browser-saved defaults, and payload validation. UI values such as sample text and font names are rendered as text, never inserted as HTML.

## Contribution boundaries

Keep controls capability-driven. Do not add persistence to preview effects or network requests to font loading. Maintain keyboard access, RTL layout, explicit disabled states, and both semantic themes. Compare changes at the Figma reference size of 1440 × 1024.

Source code is available under the MIT license. Third-party font and design-asset rights remain with their respective owners; proprietary local fonts are excluded from this license.
