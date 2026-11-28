# Font Test

This tool was used to review and test the fonts published on [Fontiran](https://fontiran.com), and is now available to everyone as open source.

**Your privacy is protected.** Everything runs in your own browser, and the fonts you open are never sent to any server.

If you have an idea or suggestion to make it better, we'd be glad to hear it on Telegram.

## Getting started

Requires Node.js 24 or newer.

```sh
npm install
npm run dev     # http://127.0.0.1:5173
```

For production, run `npm run build` and then `npm start`. `HOST` and `PORT` set the listen address.

## Docker

Run `make` to list every command.

```sh
make up-local     # development with hot reload
make build-prod   # build and start the production container
make check        # typecheck, tests and build
```

The app runs on <http://localhost:8030>.

To deploy to a server, copy `.env.example` to `.env` and set:

```sh
PORT=8030
BIND_ADDRESS=0.0.0.0                            # default 127.0.0.1 (this machine only)
FONT_DESK_ALLOWED_HOSTS=fonts.example.com:8030  # Host headers to accept, with the port
```

The server rejects any other `Host` header with a 403. Docker-published ports bypass firewalls such as ufw. For HTTPS, keep `BIND_ADDRESS=127.0.0.1` and put a reverse proxy in front.

## Configuring defaults

[`settings.json`](settings.json) sets what every visitor starts with. It is validated against [`shared/settings.ts`](shared/settings.ts), so run `npm test` after editing it, then rebuild. Visitors can save their own defaults in Settings; those stay in their browser.

| Key                 | What it sets                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `theme`             | `"light"`, `"dark"` or `"system"`                                                         |
| `sort`              | Font list order: `"manual"`, `"name-asc"`, `"name-desc"`, `"weight-asc"`, `"weight-desc"` |
| `controls`          | Controls for every tab, e.g. `{ "fontSize": 48 }`                                         |
| `tabs`              | Per-tab overrides, e.g. `"paragraph": { "controls": { "lineHeight": 2 } }`                |
| `texts.typingTest`  | One line for the typing tab                                                               |
| `texts.paragraph`   | List of paragraphs                                                                        |
| `texts.weights`     | Weight sample, at most 32 characters                                                      |
| `texts.languages`   | One text each for `farsi`, `english`, `arabic`, `quran`, `urdu`, `kurdish`                |
| `texts.characters`  | Characters to check, separated by spaces                                                  |
| `texts.hardWords`   | List of difficult words                                                                   |
| `texts.hardPhrases` | List of `{ text, reference }` phrase cards                                                |

Tab IDs: `typing-test`, `paragraph`, `weights`, `languages`, `characters`, `connections`, `hard-words`, `glyphs`, `metadata`, `qa-report`. Add `"activateNewFonts": false` to a tab to stop new fonts being switched on there.

| Control       | Default   | Allowed values                                         |
| ------------- | --------- | ------------------------------------------------------ |
| `fontSize`    | `48`      | 8–300                                                  |
| `display`     | `"solid"` | `"solid"`, `"outline"`                                 |
| `direction`   | `"rtl"`   | `"rtl"`, `"ltr"`                                       |
| `alignment`   | `"start"` | `"start"`, `"center"`, `"end"`, `"justify"`            |
| `lineHeight`  | `1.8`     | 0.8–4, as a multiple of the font size                  |
| `pageWidth`   | `"full"`  | `"320"`, `"480"`, `"640"`, `"960"`, `"1200"`, `"full"` |
| `features`    | `{}`      | OpenType tags, e.g. `{ "liga": false }`                |
| `axes`        | `{}`      | Variable axes, e.g. `{ "wght": 700 }`                  |
| `showMissing` | `true`    | `true`, `false`                                        |

Texts can be up to 3000 characters each. An unknown key or out-of-range value fails with an error naming it.

## Development

```sh
npm run typecheck
npm test
npm run build
```

Tab controls are declared in [`shared/tabs.ts`](shared/tabs.ts). Font data must never be sent over the network.

## License

The source code is released under the [MIT License](LICENSE). The interface font, IRANYekanX, is commercial and not covered by this license.
