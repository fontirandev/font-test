# Font Desk

A local Persian type-design workbench built with React, TypeScript, Tailwind CSS, and SQLite. The interface follows the supplied [Figma design](https://www.figma.com/design/kf79BgCl04FVQMubBYpac5/fonttester?node-id=1-14). Testing workflows are informed by [FontiranFontTester](https://github.com/mojtabaem/FontiranFontTester); this implementation does not copy its source code.

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

The server listens on `127.0.0.1` by default (`HOST` overrides it). `PORT` changes the port; `FONT_DESK_DATA_DIR` changes the default `.data` directory. No account, remote backend, CDN, analytics, or font upload is required. After installation, the application works offline.

## Run with Docker

Requires Docker with the Compose plugin. Run `make` to list every command.

```sh
make up-local     # development: Vite HMR, source bind-mounted
make up-prod      # production build served by the Node server
make check        # typecheck + tests + build inside the container
```

Open `http://localhost:8030`. Use `PORT=9000 make up-local` to pick another port. The server only accepts `localhost:<PORT>` / `127.0.0.1:<PORT>` Host headers, so the published port always equals the container port, and it is bound to loopback only. Saved defaults live in the `font_desk_data` volume; `make clean` removes it. The dev container polls for file changes (`FONT_DESK_WATCH_POLLING=1`) to avoid host inotify limits.

## Data ownership

- Font files are read with the browser File API and loaded as in-memory `FontFace` objects. They are never sent to the local HTTP server or written to SQLite.
- Every testing tab owns its font order, visibility, preview controls, and sample text. Removing a file removes it from all tabs and releases its browser font face.
- Closing or reloading the page discards the session. Settings → Save defaults is the only persistence action.
- SQLite stores one schema-validated, versioned defaults document. It contains theme preference and each tab's default controls, sort mode, and initial activation policy. It cannot accept font files, font IDs, test text, or session selections.
- Saved defaults apply to future sessions and new imports. Saving does not overwrite controls in already-open tabs.

## Testing views

Automatic typing with play/pause and speed control; live typing; variable/static weight specimens; character coverage and multilingual samples; Persian connections; half-space comparisons; diacritics and punctuation; paginated raw glyph outlines; metadata; and structural QA with local JSON export.

Feature and axis controls are discovered from selected fonts. Explicitly turning a feature off emits `0` rather than falling back to browser defaults. Axis values are clamped to each font's supported range. Metadata and raw glyph views do not display text-shaping controls.

TTF, OTF, WOFF and WOFF2 files can render when supported by the browser. The current OpenType inspector cannot decode WOFF2 and some newer font formats. Such fonts remain usable for previews but clearly report that metadata, coverage, glyph inspection, features, and QA are unavailable. Use an equivalent TTF/OTF for those inspection tools. QA checks structural declarations, not visual correctness; feature presence is not a shaping test.

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

`shared/` defines the settings schema and tab capabilities. `src/state/` contains the pure workspace reducer. `src/lib/` holds local font parsing and QA. `src/components/` contains the shared controls and views. `server/` serves the app and the strictly validated local defaults API.

Tests cover tab isolation, immutable sorting, font removal, feature disabling, axis clamping, SQLite persistence, payload validation, and same-origin write protection. UI values such as sample text and font names are rendered as text, never inserted as HTML.

## Contribution boundaries

Keep controls capability-driven. Do not add persistence to preview effects or network requests to font loading. Maintain keyboard access, RTL layout, explicit disabled states, and both semantic themes. Compare changes at the Figma reference size of 1440 × 1024.

Source code is available under the MIT license. Third-party font and design-asset rights remain with their respective owners; proprietary local fonts are excluded from this license.
