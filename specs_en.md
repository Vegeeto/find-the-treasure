# Coordinate Treasure Game
## Implementation Specification

## 1. Project overview

Build a static, mobile-first web application for a wedding table game.

The game is optional and played by guests in table teams. There are five participating tables:

- France
- Italia
- México
- Jordan
- Egypt

The presidential table, Vienna, does not participate and must not appear in the table-selection screen.

The application is a local game client. It does not need a backend, database, authentication, cross-device synchronization, or automatic winner detection.

The couple will manually determine which team finishes first by checking which team arrives first and presents the final phrase.

## 2. Game flow

The game has four logical stages:

```text
Select table
    ↓
Enter latitude + longitude
    ↓
Solve table riddle
    ↓
Enter final phrase
    ↓
Show treasure-unlocked screen
```

Detailed flow:

1. The team opens the application.
2. The team selects its table.
3. The application loads that table’s configuration.
4. The team enters one latitude and one longitude using two separate inputs.
5. The application validates the pair as one coordinate.
6. The team has three attempts by default.
7. If the coordinate is incorrect, one attempt is consumed.
8. If all attempts are consumed, an organisation-only reset code can restore the attempts.
9. If the coordinate is correct, the application reveals the table-specific riddle.
10. The team submits the riddle answer.
11. If correct, the application reveals the table’s word.
12. The team combines the five table words into the final phrase.
13. The team submits the complete final phrase.
14. If correct, the application displays the treasure-unlocked screen.
15. The team goes to the couple and communicates the final phrase.
16. The couple manually determines which team arrived first.

## 3. Technology constraints

This must be a static website with no complex build process.

Required technologies:

- HTML5.
- CSS3.
- CSS Custom Properties for theming.
- Vanilla JavaScript for configuration and application logic.
- Alpine.js for lightweight interactivity and data binding.
- AOS for subtle entry animations.
- Font Awesome for iconography.
- WebP images where images are used.

Do not require:

- React.
- Vue.
- Angular.
- A backend.
- A database.
- An npm build pipeline.
- A bundler.
- Server-side rendering.
- External result synchronization.

The application should run by opening the static files through a basic static host. Document any restrictions caused by opening files directly via `file://`; if needed, recommend a simple static server for local development.

## 4. Recommended file structure

```text
/
├── index.html
├── app.js
├── config.js
├── styles.css
├── README.md
└── assets/
    ├── map.webp
    ├── landmarks/
    │   ├── france.webp
    │   ├── italia.webp
    │   ├── mexico.webp
    │   ├── jordan.webp
    │   └── egypt.webp
    └── icons/
```

Responsibilities:

- `index.html`: semantic page structure and Alpine.js templates.
- `config.js`: all game data and configurable values.
- `app.js`: reusable game logic and state management.
- `styles.css`: visual system, responsive layout, themes, states, and animations.
- `README.md`: setup, configuration, deployment, and testing instructions.

No table-specific logic should be duplicated in `app.js`. The logic must be generic and driven by `GAME_CONFIG`.

## 5. Configuration architecture

All game content must be configurable from `config.js` without changing the application logic.

Example structure:

```js
const GAME_CONFIG = {
  app: {
    language: 'ca',
    defaultTheme: 'light',
    maxAttempts: 3,
    allowRepeatedReset: true,
    finalPhrase: 'COMPARTIR CAMINS CREA RECORDS INOBLIDABLES',
    finalPhraseWords: [
      'COMPARTIR',
      'CAMINS',
      'CREA',
      'RECORDS',
      'INOBLIDABLES'
    ],
    finalPhraseWordOrder: [
      'france',
      'italia',
      'mexico',
      'jordan',
      'egypt'
    ]
  },
  tables: {
    france: {
      id: 'france',
      label: 'FRANCE',
      landmarkImage: 'assets/landmarks/france.webp',
      latitudeOptions: [],
      longitudeOptions: [],
      correctCoordinate: {
        latitude: null,
        longitude: null
      },
      riddle: '...',
      acceptedRiddleAnswers: ['COMPARTIR'],
      unlockedWord: 'COMPARTIR',
      resetCode: 'F-7KQ'
    }
  }
};
```

The example values are placeholders. Final coordinate values and reset codes must be added later.

Recommended configurable fields:

```js
{
  id,
  label,
  displayLabel,
  icon,
  landmarkImage,
  latitudeOptions,
  longitudeOptions,
  correctCoordinate,
  coordinateTolerance,
  riddle,
  acceptedRiddleAnswers,
  unlockedWord,
  resetCode,
  helpText
}
```

## 6. Coordinate model

Each table uses two independent inputs:

- Latitude.
- Longitude.

The application must validate them as a pair:

```js
(latitude, longitude)
```

Latitude must be treated as the first value and longitude as the second value. Do not reverse them internally.

Recommended first implementation: provide selectable values from configured options rather than requiring guests to type the full coordinates. The interface must still show two clearly separate inputs labelled `LATITUDE` and `LONGITUDE`.

Example:

```js
latitudeOptions: [
  { id: 'lat-a', label: '48.8584° N', value: 48.8584 },
  { id: 'lat-b', label: '48.8049° N', value: 48.8049 }
],
longitudeOptions: [
  { id: 'lon-a', label: '2.2945° E', value: 2.2945 },
  { id: 'lon-b', label: '2.1204° E', value: 2.1204 }
]
```

The correct pair is configured separately:

```js
correctCoordinate: {
  latitude: 48.8049,
  longitude: 2.1204
}
```

Coordinate comparison should support a configurable tolerance for decimal rounding:

```js
coordinateTolerance: 0.0001
```

If using exact preconfigured option IDs, compare IDs where possible. If using numeric inputs, compare numeric values with tolerance.

The application must not reveal whether the latitude or longitude was the incorrect part.

## 7. Application screens

### 7.1 Start screen

Purpose: introduce the experience.

Suggested content:

```text
EL NOSTRE VIATGE

A table challenge of coordinates, riddles and a final treasure.
```

Primary button:

```text
START
```

The visible user-facing game text should be Catalan. The implementation specification is in English, but all configured UI copy should be stored in `config.js` or a dedicated copy object so it can be edited easily.

### 7.2 Table selection screen

Prompt:

```text
DE QUINA TAULA SOU?
```

Show exactly these options:

- FRANCE
- ITALIA
- MÉXICO
- JORDAN
- EGYPT

Do not show Vienna.

On selection:

- Store the selected table ID.
- Load that table’s configuration.
- Initialize or restore the table session.
- Reset the visible phase to coordinate entry unless the local session already has progress.

### 7.3 Coordinate screen

Display:

```text
LATITUD
[ select or input value ]

LONGITUD
[ select or input value ]

INTENTS RESTANTS: 3
```

Primary action:

```text
COMPROVAR COORDENADA
```

Requirements:

- Two separate inputs.
- Clear labels.
- Mobile-friendly controls.
- Selected values remain visible.
- Submit button disabled until both inputs have a value.
- Do not consume an attempt if one or both fields are empty.
- Do not consume an attempt for a client-side formatting error.
- Consume one attempt only when a complete coordinate pair is submitted and does not match.

### 7.4 Incorrect coordinate state

Show:

```text
AQUESTA COORDENADA NO ÉS LA CORRECTA

Torneu-ho a provar.

INTENTS RESTANTS: [X]
```

Do not show:

- Which field was wrong.
- The correct latitude.
- The correct longitude.
- Distance from the correct point.
- Partial correctness.

### 7.5 Coordinate success state

On success:

```text
COORDENADA VALIDADA

El vostre viatge continua.
```

Then transition to the riddle phase.

Requirements:

- Mark coordinate phase as complete.
- Prevent additional coordinate attempts.
- Persist the successful state.
- Load only the selected table’s riddle.

### 7.6 Attempt exhaustion and reset

When the team reaches zero attempts during coordinate phase, show:

```text
ELS TRES INTENTS S’HAN ESGOTAT

La ruta encara us espera.

Demaneu el codi de l’organització per continuar el viatge.
```

Show:

```text
CODI DE DESBLOQUEIG
[______________]

RESTAURAR INTENTS
```

When the reset code is correct:

- Restore attempts to `GAME_CONFIG.app.maxAttempts`.
- Keep the selected table.
- Keep the current phase as coordinate entry.
- Keep the original coordinate options.
- Do not reveal the correct pair.
- Preserve any unrelated state.
- Allow another reset if configured.

Success copy:

```text
ELS INTENTS S’HAN RESTABLERT

Ara podeu continuar.
```

Incorrect reset code:

```text
EL CODI NO ÉS VÀLID
```

Reset codes must not be displayed to guests or included in public HTML copy.

### 7.7 Riddle screen

Display the table-specific riddle after a successful coordinate validation.

The riddles must be declarative text, not questions.

Current riddle configuration:

France / COMPARTIR:

```text
Quan un camí es viu en companyia, deixa de ser només d’una persona i es converteix en una experiència per compartir.
```

Italia / CAMINS:

```text
No són només carreteres: poden portar-nos lluny, apropar-nos o canviar-nos.
```

México / CREA:

```text
Cada viatge compartit transforma una experiència en una història i una història en un record.
```

Jordan / RECORDS:

```text
No caben en una maleta, però viatgen amb nosaltres durant anys. Poden tornar amb una olor, una cançó o una imatge.
```

Egypt / INOBLIDABLES:

```text
Alguns moments passen ràpidament, però deixen una petjada que el temps no aconsegueix esborrar.
```

Riddle input:

```text
[ resposta ]

DESBLOQUEJAR PARAULA
```

Do not show the expected answer in the riddle text.

### 7.8 Incorrect riddle answer

Show:

```text
AQUESTA NO ÉS LA PARAULA CORRECTA

Torneu a llegir l’enigma amb calma.
```

Riddle attempts are separate from coordinate attempts. Riddle mistakes must not reduce coordinate attempts.

### 7.9 Riddle success state

Show:

```text
PARAULA DESBLOQUEJADA

[UNLOCKED WORD]

Guardeu-la bé. La necessitareu per obrir el tresor final.
```

Current word mapping:

| Table | Word |
|---|---|
| France | COMPARTIR |
| Italia | CAMINS |
| México | CREA |
| Jordan | RECORDS |
| Egypt | INOBLIDABLES |

The word must be loaded from configuration, not hardcoded in the view.

### 7.10 Final phrase screen

A team may reach this screen after solving its own table riddle. The team should be able to enter the complete phrase once it has gathered all five words.

Display:

```text
REUNIU LES CINC PARAULES

Introduïu la frase que desbloquejarà el tresor.
```

Input:

```text
[ frase final ]

DESBLOQUEJAR TRESOR
```

Validate against:

```text
COMPARTIR CAMINS CREA RECORDS INOBLIDABLES
```

Recommended normalization:

- Convert to uppercase.
- Trim leading and trailing whitespace.
- Collapse repeated internal whitespace.
- Treat standard capitalization as irrelevant.
- Do not accept words in a different order.
- Do not accept synonyms.
- Keep accent handling configurable.

### 7.11 Final success screen

Show:

```text
TRESOR DESBLOQUEJAT

COMPARTIR CAMINS CREA RECORDS INOBLIDABLES

Aneu a trobar els nuvis i compartiu amb ells la frase secreta.
```

Optional additional text:

```text
No tanqueu aquesta pantalla.
Els nuvis confirmaran l’ordre d’arribada.
```

The couple, not the application, determines which team arrived first.

## 8. Local state and persistence

Use `localStorage` to persist progress on the current device.

Suggested storage key:

```text
wedding-coordinate-game-state
```

State should be stored per table ID:

```js
{
  selectedTable: 'france',
  tables: {
    france: {
      phase: 'coordinates',
      attemptsRemaining: 3,
      coordinateValidated: false,
      riddleSolved: false,
      unlockedWord: null,
      finalPhraseUnlocked: false,
      resetCount: 0
    }
  }
}
```

Recommended phase values:

```text
start
 table-selection
coordinates
coordinates-locked
riddle
word-unlocked
final-phrase
treasure-unlocked
```

Because the application is local-only:

- Do not attempt to synchronize team progress between devices.
- Do not implement automatic winner detection.
- Do not claim that the application knows which team was first.
- The couple manually verifies the first team to arrive with the final phrase.

A reset must modify only the relevant table’s coordinate attempt state.

## 9. Alpine.js requirements

Use Alpine.js for:

- Current screen/phase rendering.
- Table selection.
- Input binding.
- Showing and hiding phase-specific sections.
- Attempt counter updates.
- Error and success messages.
- Loading states.
- Reset-code form visibility.
- Theme toggling if implemented.

Conceptual structure:

```html
<div x-data="gameApp()">
  <template x-if="phase === 'start'">
    <!-- Start screen -->
  </template>

  <template x-if="phase === 'table-selection'">
    <!-- Table selection -->
  </template>

  <template x-if="phase === 'coordinates'">
    <!-- Latitude and longitude inputs -->
  </template>

  <template x-if="phase === 'coordinates-locked'">
    <!-- Reset code form -->
  </template>

  <template x-if="phase === 'riddle'">
    <!-- Table riddle -->
  </template>

  <template x-if="phase === 'word-unlocked' || phase === 'final-phrase'">
    <!-- Word and final phrase flow -->
  </template>

  <template x-if="phase === 'treasure-unlocked'">
    <!-- Final success -->
  </template>
</div>
```

All views must derive their content from the current Alpine state and `GAME_CONFIG`.

## 10. Vanilla JavaScript requirements

Implement generic functions such as:

```js
loadState()
saveState()
selectTable(tableId)
getCurrentTableConfig()
getCurrentTableState()
validateCoordinate()
consumeCoordinateAttempt()
resetAttempts(resetCode)
normalizeAnswer(value)
validateRiddleAnswer()
validateFinalPhrase()
setPhase(phase)
```

Do not create separate functions such as `validateFranceCoordinate()` or `validateItalyCoordinate()`.

Suggested coordinate validation pseudocode:

```js
function isCorrectCoordinate(tableConfig, latitude, longitude) {
  const expected = tableConfig.correctCoordinate;
  const tolerance = tableConfig.coordinateTolerance ?? 0.0001;

  return (
    Math.abs(Number(latitude) - Number(expected.latitude)) <= tolerance &&
    Math.abs(Number(longitude) - Number(expected.longitude)) <= tolerance
  );
}
```

If using option IDs, prefer comparing option IDs to avoid floating-point issues.

## 11. AOS animation requirements

Use AOS only for subtle transitions:

- Header entrance.
- Table option entrance.
- Coordinate form entrance.
- Riddle appearance.
- Unlocked-word appearance.
- Final treasure message.

Animations must not delay interaction or hide critical information. Respect `prefers-reduced-motion`.

## 12. Visual design requirements

The visual language should match refined watercolor wedding stationery:

- Warm ivory paper background.
- Soft watercolor texture.
- Dark charcoal text.
- Muted sage, sand, taupe, dusty blue-gray, and restrained terracotta accents.
- Generous negative space.
- Elegant editorial appearance.
- Mobile readability as the priority.

Suggested CSS variables:

```css
:root {
  --color-paper: #f5f0e8;
  --color-surface: #fbf8f2;
  --color-ink: #313438;
  --color-muted: #7c8582;
  --color-sage: #aebbb0;
  --color-sand: #d8c4a6;
  --color-accent: #b77f6e;
  --color-success: #6f8b78;
  --color-error: #a66d68;
  --shadow-soft: 0 12px 30px rgba(49, 52, 56, .10);
  --radius-card: 18px;
}

[data-theme='dark'] {
  --color-paper: #222426;
  --color-surface: #2d3032;
  --color-ink: #f3eee5;
  --color-muted: #b7beb9;
  --color-sage: #879b90;
  --color-sand: #b69e7a;
  --color-accent: #c58b7a;
  --color-success: #91b49b;
  --color-error: #d08d86;
}
```

Light mode must be the default. Dark mode may be included as an optional toggle, but it must not compromise the wedding stationery aesthetic.

Use Font Awesome icons sparingly:

- Compass or globe for the game introduction.
- Location-dot for coordinate inputs.
- Key or treasure icon for final success.
- Rotate or unlock icon for reset.

Do not use overly literal travel decorations such as passports, luggage tags, airplanes, flags, or cartoon maps.

## 13. Responsive and accessibility requirements

- Mobile-first layout.
- Comfortable tap targets.
- Clear labels for latitude and longitude.
- Visible focus states.
- Sufficient text/background contrast.
- Do not rely on colour alone to communicate status.
- Keyboard-accessible controls.
- `aria-live="polite"` for validation messages.
- Descriptive `alt` text for WebP images.
- Respect `prefers-reduced-motion`.
- Avoid excessive animation.
- Use semantic buttons instead of clickable generic divs.
- Inputs must have associated labels.
- Error messages should be programmatically associated with inputs when possible.

## 14. Error and edge-case handling

Handle the following cases gracefully:

- User submits without selecting both coordinates.
- User refreshes during coordinate phase.
- User refreshes after solving the riddle.
- User enters an invalid reset code.
- User selects a different table after making progress.
- User enters a wrong riddle answer.
- User enters a phrase with extra spaces.
- User enters the final phrase with different capitalization.
- Local storage is unavailable or cleared.
- A configured table is missing required data.
- A required image fails to load.

If local storage is unavailable, show a non-blocking warning and continue in memory for the current session.

## 15. Testing requirements

Test each table independently:

- Correct coordinate unlocks the correct riddle.
- Incorrect coordinate consumes exactly one attempt.
- Empty fields do not consume an attempt.
- The third incorrect complete submission locks the coordinate phase.
- Valid reset code restores three attempts.
- Invalid reset code does not restore attempts.
- Reset does not erase table identity or configuration.
- Riddle answer unlocks the correct word.
- Wrong riddle answer does not consume coordinate attempts.
- Final phrase accepts normal capitalization and spacing differences.
- Final phrase rejects incorrect word order.
- Vienna never appears in table selection.
- Refresh preserves local progress.
- Every view renders from configuration.
- The application works on mobile widths.
- Reduced-motion mode works.

## 16. Acceptance criteria

The implementation is complete when:

- The site runs as a static website without a complex build process.
- All visible game copy can be edited through configuration.
- The first game screen asks which table the team belongs to.
- The available tables are France, Italia, México, Jordan, and Egypt only.
- Vienna is excluded.
- The selected table loads independent table data.
- The UI has separate latitude and longitude inputs.
- The coordinate pair is validated in latitude-longitude order.
- Each table starts with three coordinate attempts.
- Wrong complete submissions consume one attempt.
- Empty submissions do not consume attempts.
- The reset code restores attempts after lockout.
- A correct coordinate reveals only the selected table’s riddle.
- The riddle answer reveals the selected table’s configured word.
- The complete final phrase can be validated locally.
- A correct final phrase shows the treasure-unlocked screen.
- No backend or cross-device winner detection is implemented.
- The couple manually determines the winner.
- Alpine.js is used for reactive views and binding.
- Vanilla JavaScript contains generic game logic.
- AOS is used for subtle entry animations.
- Font Awesome is used for selected icons.
- CSS Custom Properties support theming.
- WebP images are used where imagery is included.
- The application is readable and usable on mobile.

## 17. Implementation priorities

Implement in this order:

1. Create `config.js` with placeholder coordinate values.
2. Create the generic Alpine.js application shell.
3. Implement table selection.
4. Implement two-input coordinate validation.
5. Implement three attempts and reset-code recovery.
6. Implement riddle display and answer validation.
7. Implement unlocked-word state.
8. Implement final phrase validation.
9. Add local persistence.
10. Add visual styling and watercolor assets.
11. Add AOS and Font Awesome.
12. Test all five tables and all edge cases.
13. Replace placeholders with final coordinates and secret reset codes.
14. Deploy to a static host and test on the wedding-day devices.
