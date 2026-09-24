# EL NOSTRE VIATGE — Coordinate Treasure Game

A static, mobile-first wedding table game. Five tables (France, Italia, México,
Jordan, Egypt) each solve a coordinate, then a riddle, to unlock one word.
The five words together form the final phrase that opens the treasure.

There is no backend, no database and no winner detection — **the couple decides
who arrived first.**

---

## Quick start

```bash
# 1. download Alpine, AOS, Font Awesome and the display font for offline use
bash fetch-vendor.sh

# 2. serve the folder
python3 -m http.server 8000
#    → open http://localhost:8000
```

The WebP landmark images in `assets/landmarks/` are already generated. To
rebuild them after editing the originals in `assets/`:

```bash
python3 tools/make-webp.py          # needs Pillow
```

Until `fetch-vendor.sh` has run, the page falls back to CDN links for the
libraries — it works online, but not at a venue with no signal.

### Why a server and not `file://`

Opening `index.html` straight from the filesystem mostly works, but:

- Some browsers block `localStorage` on `file://` — progress would not survive a
  refresh. The app detects this and shows a non-blocking warning, continuing in
  memory for the session.
- Chrome and Safari are stricter about local fonts, so Font Awesome icons may not
  render.

Any static server is fine: `python3 -m http.server`, `npx serve`, Live Server,
Netlify, Vercel, GitHub Pages, or a folder on any shared host.

---

## File structure

```text
/
├── index.html              semantic markup + Alpine templates
├── config.js               ALL game data and visible copy
├── app.js                  generic game logic (no table-specific code)
├── styles.css              watercolor design system, light + dark
├── fetch-vendor.sh         downloads Alpine, AOS, Font Awesome
├── CHECKLIST.md            implementation checklist traced to the spec
├── README.md
├── tools/
│   ├── make-webp.py        converts assets/*.jpeg|png → assets/landmarks/*.webp
│   └── test.js             headless test suite (node tools/test.js)
└── assets/
    ├── france.jpeg …       original photos (untouched)
    ├── landmarks/*.webp    generated, referenced by config.js
    └── vendor/             alpine/ aos/ fontawesome/ (generated)
```

---

## Configuring the game

Everything editable lives in **`config.js`**. `app.js` never mentions a table by
name — all logic is driven by `GAME_CONFIG`.

### Before the wedding — the two things that must change

```js
tables.france.correctCoordinate = { latitude: 48.8584, longitude: 2.2945 };  // TODO
tables.france.resetCode         = 'F-7KQ';                                   // TODO
```

Every table currently ships with a **placeholder** landmark coordinate and a
placeholder reset code. Replace all ten values before the day.

Reset codes are compared case-insensitively and ignore spaces, dashes,
underscores and dots — `f7kq`, `F-7KQ` and `f 7 k q` all work. Keep the card the
organisation hands out simple.

> Reset codes never appear in the rendered page. The test suite asserts this.

### Other useful settings

| Setting | Meaning |
|---|---|
| `app.maxAttempts` | Coordinate attempts per table (default 3) |
| `app.allowRepeatedReset` | `false` limits each table to one reset |
| `app.coordinateTolerance` | Default match tolerance; per table override allowed |
| `app.stripAccents` | `true` makes answers accent-insensitive |
| `app.defaultTheme` | `'light'` or `'dark'` |
| `app.enableThemeToggle` | Hide the toggle by setting `false` |
| `app.finalPhrase` | The phrase that opens the treasure |
| `app.tableOrder` | Order tables appear on the selection screen |

All visible Catalan text lives under `GAME_CONFIG.copy`. Edit it freely — nothing
is hardcoded in `index.html`.

### Coordinate entry

Guests type the two values into separate `LATITUD` and `LONGITUD` fields.
The parser is forgiving about how they write them:

```text
41.3874        41,3874        41.3874° N        41.3874 N
-2.1686        2.1686 W       2.1686 O          2.1686° W
```

South and West (and Catalan **O** for *oest*) become negative values. A value out
of range, or anything that isn't a number, is treated as a **formatting error and
costs no attempt** — only a complete, well-formed, wrong pair does.

Latitude is always the first value and longitude the second; a reversed pair is
simply wrong. The app never says which of the two fields was incorrect.

---

## Phases

```text
start → table-selection → coordinates → riddle → word-unlocked
                              ↓
                      coordinates-locked  (0 attempts, needs reset code)
                                                  ↓
                                          final-phrase → treasure-unlocked
```

Progress is stored per table under the `wedding-coordinate-game-state`
localStorage key, so a refresh — or switching tables and back — keeps each
table's own state. Corrupt or tampered data falls back to a clean state rather
than breaking.

---

## Testing

```bash
node tools/test.js
```

79 checks covering the spec's §15 matrix: attempt accounting, lockout, reset
codes, riddle isolation, phrase normalization, persistence, config integrity,
accessibility contracts in the markup, and the CSS token set. No dependencies.

### Manual checks on a real phone

- All five tables reachable, **Vienna absent**
- Three attempts, lockout on the third miss, reset restores three
- Wrong riddle answer does **not** reduce coordinate attempts
- Refresh at each phase resumes where you were
- Final phrase accepts odd spacing and capitalization, rejects wrong order
- System dark mode + the in-app toggle
- Reduced-motion enabled in OS settings (animations disappear, nothing hides)
- Airplane mode after the first load — the app still runs (vendored libraries)

---

## Known spec conflict

Spec §7.7 says the riddle must not contain its expected answer, but the France
riddle supplied by the couple ends with *"…una experiència per compartir"* —
which is the answer, `COMPARTIR`. The text is used verbatim as given. The test
suite reports this as a warning rather than a failure; reword the riddle in
`config.js` if the couple wants it hidden.

---

## Deploying

The folder is the site. Copy it to any static host:

```bash
# example: Netlify CLI
netlify deploy --dir . --prod
```

Check on the actual phones that will be used at the tables before the day, and
load the page once on the venue wifi so everything is cached.
