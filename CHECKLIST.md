# Implementation Checklist — Coordinate Treasure Game

Derived from `specs_en.md`. Every item traces back to a spec section (§) or acceptance
criterion (AC). Check items off as they land.

---

## 0. Decisions taken before coding

| Decision | Choice | Impact |
|---|---|---|
| Coordinate entry | **Free numeric input** (two `type="text"` + `inputmode="decimal"` fields) | Validation is numeric with `coordinateTolerance`; `latitudeOptions` / `longitudeOptions` are kept in config as *optional hints* but not rendered as selects |
| Libraries | **Vendored locally** in `assets/vendor/` | Game works with no internet at the venue; still zero build process |
| Dark mode | **Optional toggle**, light is default | Theme persisted in `localStorage`, honours `prefers-color-scheme` only on first visit |
| Images | **Converted to WebP** in `assets/landmarks/` | Originals in `assets/` left untouched |

### Open items to fill in before the wedding
- [ ] Real `correctCoordinate` for each of the 5 tables
- [ ] Real `resetCode` for each of the 5 tables (must never appear in visible HTML copy)
- [ ] Confirm the final phrase spelling: `COMPARTIR CAMINS CREA RECORDS INOBLIDABLES`

---

## 1. Project scaffolding (§4)

- [ ] `index.html` — semantic structure + Alpine templates
- [ ] `config.js` — all game data and copy
- [ ] `app.js` — generic game logic and state
- [ ] `styles.css` — visual system, responsive layout, themes, states
- [ ] `README.md` — setup, configuration, deployment, testing
- [ ] `assets/landmarks/{france,italia,mexico,jordan,egypt}.webp`
- [ ] `assets/vendor/` — Alpine.js, AOS (js + css), Font Awesome (css + webfonts)
- [ ] No npm / bundler / backend / SSR anywhere (§3)
- [ ] Runs from any basic static host; `file://` limitation documented in README (§3)

---

## 2. `config.js` — configuration architecture (§5, AC "all visible copy editable")

- [ ] `GAME_CONFIG.app`
  - [ ] `language: 'ca'`
  - [ ] `defaultTheme: 'light'`
  - [ ] `maxAttempts: 3`
  - [ ] `allowRepeatedReset: true`
  - [ ] `finalPhrase`, `finalPhraseWords`, `finalPhraseWordOrder`
  - [ ] `coordinateTolerance` default (per-table override allowed)
  - [ ] `stripAccents` flag — accent handling configurable (§7.10)
  - [ ] `storageKey: 'wedding-coordinate-game-state'`
- [ ] `GAME_CONFIG.copy` — **every** user-facing Catalan string lives here
  - [ ] Start screen title / subtitle / button
  - [ ] Table selection prompt
  - [ ] Coordinate labels, attempts counter, submit button
  - [ ] Coordinate error / success copy (exact wording from §7.4, §7.5)
  - [ ] Lockout copy + reset form copy + reset success/failure (§7.6)
  - [ ] Riddle prompt, input placeholder, button, error copy (§7.7, §7.8)
  - [ ] Word-unlocked copy (§7.9)
  - [ ] Final-phrase copy + treasure-unlocked copy (§7.10, §7.11)
  - [ ] Generic error strings (missing config, storage unavailable, image failure)
- [ ] `GAME_CONFIG.tables` — exactly 5 entries, **Vienna absent** (§2, AC)
  - [ ] Per table: `id`, `label`, `displayLabel`, `icon`, `landmarkImage`,
        `latitudeOptions`, `longitudeOptions`, `correctCoordinate`,
        `coordinateTolerance`, `riddle`, `acceptedRiddleAnswers`,
        `unlockedWord`, `resetCode`, `helpText`
  - [ ] Riddles copied verbatim from §7.7, as **declarative text, not questions**
  - [ ] Word mapping: France→COMPARTIR, Italia→CAMINS, México→CREA, Jordan→RECORDS, Egypt→INOBLIDABLES (§7.9)
  - [ ] `acceptedRiddleAnswers` is an array (allows variants/accents)
- [ ] Config is frozen/validated at load; a table missing required data degrades gracefully (§14)

---

## 3. `app.js` — generic logic (§10)

Functions — **all table-agnostic**, no `validateFranceCoordinate()`-style duplication (§4, §10):

- [ ] `loadState()` / `saveState()` — localStorage, wrapped in try/catch
- [ ] `selectTable(tableId)`
- [ ] `getCurrentTableConfig()` / `getCurrentTableState()`
- [ ] `parseCoordinate(value)` — accepts `48.8584`, `48,8584`, `48.8584° N`, `2.1204 E`; returns signed number or `null`
- [ ] `validateCoordinate()` — latitude first, longitude second, **never reversed** (§6)
- [ ] `isCorrectCoordinate(tableConfig, lat, lon)` — `Math.abs(diff) <= tolerance` on both (§10)
- [ ] `consumeCoordinateAttempt()`
- [ ] `resetAttempts(resetCode)`
- [ ] `normalizeAnswer(value)` — uppercase, trim, collapse whitespace, optional accent strip (§7.10)
- [ ] `validateRiddleAnswer()`
- [ ] `validateFinalPhrase()`
- [ ] `setPhase(phase)`
- [ ] `toggleTheme()`

Attempt rules (§7.3, §15):

- [ ] Submit button disabled while either field is empty
- [ ] Empty / partial submission consumes **no** attempt
- [ ] Unparseable input = formatting error → consumes **no** attempt, shows a format hint
- [ ] A complete, parseable, wrong pair consumes **exactly one** attempt
- [ ] Reaching 0 attempts moves phase to `coordinates-locked`
- [ ] Riddle mistakes never touch coordinate attempts (§7.8)

Reset rules (§7.6):

- [ ] Correct code restores attempts to `maxAttempts`
- [ ] Keeps selected table, keeps phase at `coordinates`, keeps coordinate options
- [ ] Never reveals the correct pair
- [ ] Preserves unrelated state; increments `resetCount`
- [ ] Repeat reset allowed only when `allowRepeatedReset` is true
- [ ] Wrong code → `EL CODI NO ÉS VÀLID`, attempts unchanged
- [ ] Reset codes never rendered into HTML or exposed in visible copy

Information hiding (§6, §7.4):

- [ ] Error never says which field was wrong
- [ ] Never shows correct latitude / longitude / distance / partial correctness

---

## 4. State and persistence (§8)

- [ ] Storage key `wedding-coordinate-game-state`
- [ ] Shape: `{ selectedTable, theme, tables: { <id>: { phase, attemptsRemaining, coordinateValidated, riddleSolved, unlockedWord, finalPhraseUnlocked, resetCount } } }`
- [ ] Phase values: `start`, `table-selection`, `coordinates`, `coordinates-locked`, `riddle`, `word-unlocked`, `final-phrase`, `treasure-unlocked`
- [ ] Per-table state — switching tables preserves each table's own progress (§14)
- [ ] Refresh restores the exact phase, mid-coordinates and post-riddle (§15)
- [ ] State migration/guard: unknown or corrupt JSON → fresh state, no crash
- [ ] localStorage unavailable → non-blocking warning banner, in-memory session continues (§14)
- [ ] **No** cross-device sync, **no** automatic winner detection, no claim about who was first (§8, AC)

---

## 5. Screens and Alpine views (§7, §9)

- [ ] Single `x-data="gameApp()"` root; `<template x-if="phase === ...">` per screen
- [ ] All view content derives from Alpine state + `GAME_CONFIG` — nothing hardcoded (§9)
- [ ] **7.1 Start** — title, intro, `START`
- [ ] **7.2 Table selection** — `DE QUINA TAULA SOU?`, exactly 5 semantic `<button>` options, **no Vienna**
- [ ] **7.3 Coordinates** — two labelled inputs (`LATITUD` / `LONGITUD`), attempts counter, `COMPROVAR COORDENADA`
- [ ] **7.4 Incorrect state** — exact copy, attempts remaining, nothing revealing
- [ ] **7.5 Success state** — `COORDENADA VALIDADA`, phase locked, no further attempts, persisted
- [ ] **7.6 Lockout + reset** — lockout copy, `CODI DE DESBLOQUEIG` field, `RESTAURAR INTENTS`
- [ ] **7.7 Riddle** — only the selected table's riddle; answer field + `DESBLOQUEJAR PARAULA`; answer never shown in the riddle text
- [ ] **7.8 Riddle error** — exact copy
- [ ] **7.9 Word unlocked** — `PARAULA DESBLOQUEJADA` + word **from config**
- [ ] **7.10 Final phrase** — reachable after own riddle; input + `DESBLOQUEJAR TRESOR`
- [ ] **7.11 Treasure unlocked** — `TRESOR DESBLOQUEJAT`, full phrase, go-find-the-couple copy, "no tanqueu aquesta pantalla"
- [ ] Back/change-table control that does not silently wipe progress

Final phrase normalization (§7.10):

- [ ] Uppercase, trim, collapse internal whitespace
- [ ] Capitalization irrelevant
- [ ] Wrong word order rejected
- [ ] Synonyms rejected
- [ ] Accent handling driven by the config flag

---

## 6. Visual design (§12)

- [ ] CSS custom properties exactly as specified for `:root` and `[data-theme='dark']`
- [ ] Light mode default; dark toggle does not break the stationery aesthetic
- [ ] Warm ivory paper background + soft watercolor texture
- [ ] Charcoal text; sage / sand / taupe / dusty blue-gray / restrained terracotta accents
- [ ] Generous negative space, editorial type scale
- [ ] Font Awesome used sparingly: compass/globe (intro), location-dot (coordinates), key/treasure (final), rotate/unlock (reset)
- [ ] **No** passports, luggage, airplanes, flags or cartoon maps
- [ ] Landmark WebP shown per table with descriptive `alt`; graceful fallback if it fails to load (§14)

---

## 7. Animation (§11)

- [ ] AOS initialised, used only for: header, table options, coordinate form, riddle, unlocked word, final message
- [ ] Animations never delay interaction or hide critical information
- [ ] `AOS.init({ disable: prefers-reduced-motion })` + CSS `@media (prefers-reduced-motion: reduce)` killing transitions

---

## 8. Responsive & accessibility (§13)

- [ ] Mobile-first; tested at 320 / 375 / 414 / 768 px
- [ ] Tap targets ≥ 44 px
- [ ] Every input has an associated `<label for>`
- [ ] Visible focus states on all interactive elements
- [ ] Contrast ≥ 4.5:1 for body text in both themes
- [ ] Status never conveyed by colour alone (icon + text accompany every state)
- [ ] Full keyboard operability; Enter submits the active form
- [ ] `aria-live="polite"` region for validation messages
- [ ] `aria-describedby` links errors to their input; `aria-invalid` on failure
- [ ] Semantic `<button>` everywhere — no clickable `<div>`
- [ ] Descriptive `alt` text on all WebP images
- [ ] `lang="ca"` on `<html>`

---

## 9. Error & edge cases (§14)

- [ ] Submit with one or both coordinate fields empty
- [ ] Refresh during coordinate phase
- [ ] Refresh after solving the riddle
- [ ] Invalid reset code
- [ ] Selecting a different table after making progress
- [ ] Wrong riddle answer
- [ ] Final phrase with extra / doubled spaces
- [ ] Final phrase with different capitalization
- [ ] localStorage unavailable or cleared mid-session
- [ ] Table config missing required data → friendly message, no white screen
- [ ] Landmark image fails to load → layout holds, no broken-image icon

---

## 10. Testing matrix (§15) — run per table × 5

- [ ] Correct coordinate unlocks **that table's** riddle only
- [ ] Incorrect coordinate consumes exactly one attempt
- [ ] Empty fields consume no attempt
- [ ] Third wrong complete submission locks the coordinate phase
- [ ] Valid reset code restores 3 attempts
- [ ] Invalid reset code restores nothing
- [ ] Reset preserves table identity and configuration
- [ ] Riddle answer unlocks the correct configured word
- [ ] Wrong riddle answer leaves coordinate attempts untouched
- [ ] Final phrase tolerates capitalization and spacing differences
- [ ] Final phrase rejects wrong word order
- [ ] Vienna never appears anywhere in table selection
- [ ] Refresh preserves local progress at every phase
- [ ] Every view renders from configuration
- [ ] Works at mobile widths
- [ ] Reduced-motion mode works

---

## 11. Acceptance criteria sign-off (§16)

- [ ] Static site, no complex build process
- [ ] All visible copy editable through configuration
- [ ] First game screen asks which table the team belongs to
- [ ] Tables are France, Italia, México, Jordan, Egypt only — Vienna excluded
- [ ] Selected table loads independent data
- [ ] Separate latitude and longitude inputs
- [ ] Pair validated in latitude→longitude order
- [ ] Three coordinate attempts per table
- [ ] Wrong complete submissions consume one attempt; empty ones consume none
- [ ] Reset code restores attempts after lockout
- [ ] Correct coordinate reveals only the selected table's riddle
- [ ] Riddle answer reveals the configured word
- [ ] Final phrase validated locally; correct phrase shows treasure screen
- [ ] No backend, no cross-device winner detection — couple decides
- [ ] Alpine.js for reactive views, vanilla JS for generic logic
- [ ] AOS for subtle entry animations
- [ ] Font Awesome for selected icons
- [ ] CSS Custom Properties support theming
- [ ] WebP images used
- [ ] Readable and usable on mobile

---

## 12. Build order (§17)

1. [ ] `config.js` with placeholder coordinates
2. [ ] Generic Alpine application shell
3. [ ] Table selection
4. [ ] Two-input coordinate validation
5. [ ] Three attempts + reset-code recovery
6. [ ] Riddle display and answer validation
7. [ ] Unlocked-word state
8. [ ] Final phrase validation
9. [ ] Local persistence
10. [ ] Visual styling and watercolor assets
11. [ ] AOS + Font Awesome
12. [ ] Test all five tables and edge cases
13. [ ] Replace placeholders with final coordinates and secret reset codes
14. [ ] Deploy to a static host and test on wedding-day devices
