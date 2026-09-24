/* =============================================================================
 *  EL NOSTRE VIATGE — Coordinate Treasure Game
 *  config.js — ALL game data and visible copy live here.
 *
 *  You can change every text, riddle, word, coordinate and code in this file
 *  without touching app.js, index.html or styles.css.
 *
 *  ⚠️  BEFORE THE WEDDING — replace the PLACEHOLDER values marked with «TODO»:
 *      · tables.<id>.correctCoordinate
 *      · tables.<id>.resetCode
 * ========================================================================== */

const GAME_CONFIG = {
  /* ---------------------------------------------------------------------
   * Global application settings
   * ------------------------------------------------------------------ */
  app: {
    language: 'ca',
    defaultTheme: 'light',          // 'light' | 'dark'
    enableThemeToggle: true,

    maxAttempts: 3,                 // coordinate attempts per table
    allowRepeatedReset: true,       // may the organisation reset more than once?

    coordinateTolerance: 0.0005,    // default tolerance, per-table override allowed

    // Accent handling for answers. true = "PARAULA" matches "PARAÙLA".
    stripAccents: true,

    storageKey: 'wedding-coordinate-game-state',

    finalPhrase: 'COMPARTIR CAMINS CREA RECORDS INOBLIDABLES',
    finalPhraseWords: ['COMPARTIR', 'CAMINS', 'CREA', 'RECORDS', 'INOBLIDABLES'],
    finalPhraseWordOrder: ['france', 'italia', 'mexico', 'jordan', 'egypt'],

    // Order in which tables are listed on the selection screen
    tableOrder: ['france', 'italia', 'mexico', 'jordan', 'egypt']
  },

  /* ---------------------------------------------------------------------
   * Every user-facing string (Catalan). Edit freely.
   * `{n}` style tokens are replaced at runtime.
   * ------------------------------------------------------------------ */
  copy: {
    common: {
      appName: 'EL NOSTRE VIATGE',
      back: 'Enrere',
      changeTable: 'Canviar de taula',
      themeLight: 'Mode clar',
      themeDark: 'Mode fosc',
      storageWarning:
        'Aquest dispositiu no pot desar el progrés. Podeu continuar jugant, però no tanqueu aquesta pestanya.',
      configError:
        'Hi ha un problema amb la configuració d’aquesta taula. Aviseu l’organització.'
    },

    start: {
      title: 'EL NOSTRE VIATGE',
      subtitle: 'Un repte de taula fet de coordenades, enigmes i un tresor final.',
      button: 'COMENÇAR'
    },

    tableSelection: {
      title: 'DE QUINA TAULA SOU?',
      hint: 'Trieu la vostra taula per començar el viatge.'
    },

    coordinates: {
      title: 'LA PRIMERA COORDENADA',
      intro: 'Introduïu la latitud i la longitud del vostre destí.',
      latitudeLabel: 'LATITUD',
      longitudeLabel: 'LONGITUD',
      latitudePlaceholder: 'p. ex. 41.3874',
      longitudePlaceholder: 'p. ex. 2.1686',
      attemptsLabel: 'INTENTS RESTANTS',
      submit: 'COMPROVAR COORDENADA',
      formatHint:
        'Escriviu només números decimals. Podeu fer servir el punt o la coma. Aquest avís no consumeix cap intent.',
      emptyHint: 'Cal omplir les dues caselles abans de comprovar.'
    },

    coordinateError: {
      title: 'AQUESTA COORDENADA NO ÉS LA CORRECTA',
      body: 'Torneu-ho a provar.'
    },

    coordinateSuccess: {
      title: 'COORDENADA VALIDADA',
      body: 'El vostre viatge continua.',
      button: 'CONTINUAR'
    },

    locked: {
      title: 'ELS TRES INTENTS S’HAN ESGOTAT',
      body: 'La ruta encara us espera.',
      help: 'Demaneu el codi de l’organització per continuar el viatge.',
      codeLabel: 'CODI DE DESBLOQUEIG',
      codePlaceholder: 'Codi',
      submit: 'RESTAURAR INTENTS',
      successTitle: 'ELS INTENTS S’HAN RESTABLERT',
      successBody: 'Ara podeu continuar.',
      errorTitle: 'EL CODI NO ÉS VÀLID',
      exhausted:
        'Aquesta taula ja ha fet servir la seva restauració. Parleu amb l’organització.'
    },

    riddle: {
      title: 'EL VOSTRE ENIGMA',
      inputLabel: 'La vostra resposta',
      placeholder: 'resposta',
      submit: 'DESBLOQUEJAR PARAULA',
      errorTitle: 'AQUESTA NO ÉS LA PARAULA CORRECTA',
      errorBody: 'Torneu a llegir l’enigma amb calma.'
    },

    wordUnlocked: {
      title: 'PARAULA DESBLOQUEJADA',
      body: 'Guardeu-la bé. La necessitareu per obrir el tresor final.',
      button: 'ANAR A LA FRASE FINAL'
    },

    finalPhrase: {
      title: 'REUNIU LES CINC PARAULES',
      body: 'Introduïu la frase que desbloquejarà el tresor.',
      inputLabel: 'Frase final',
      placeholder: 'frase final',
      submit: 'DESBLOQUEJAR TRESOR',
      errorTitle: 'ENCARA NO HI SOU',
      errorBody: 'Reviseu les paraules i el seu ordre.',
      reminderLabel: 'La vostra paraula',
      backToWord: 'Tornar a veure la paraula'
    },

    treasure: {
      title: 'TRESOR DESBLOQUEJAT',
      body: 'Aneu a trobar els nuvis i compartiu amb ells la frase secreta.',
      note: 'No tanqueu aquesta pantalla. Els nuvis confirmaran l’ordre d’arribada.'
    }
  },

  /* ---------------------------------------------------------------------
   * Tables. Vienna (presidential table) is intentionally NOT here.
   * ------------------------------------------------------------------ */
  tables: {
    france: {
      id: 'france',
      label: 'FRANCE',
      displayLabel: 'FRANCE',
      icon: 'fa-solid fa-compass',
      landmarkImage: 'assets/landmarks/france.webp',
      landmarkAlt: 'Il·lustració en aquarel·la del monument de la taula França',

      // Optional hints shown under the inputs (not selectable options)
      latitudeOptions: [],
      longitudeOptions: [],

      // TODO — replace with the real coordinate
      correctCoordinate: { latitude: 48.8584, longitude: 2.2945 },
      coordinateTolerance: 0.0005,

      riddle:
        'Quan un camí es viu en companyia, deixa de ser només d’una persona i es converteix en una experiència per compartir.',
      acceptedRiddleAnswers: ['COMPARTIR'],
      unlockedWord: 'COMPARTIR',

      // TODO — replace with the real secret code (never shown to guests)
      resetCode: 'F-7KQ',

      helpText: 'Latitud nord i longitud est.'
    },

    italia: {
      id: 'italia',
      label: 'ITALIA',
      displayLabel: 'ITALIA',
      icon: 'fa-solid fa-compass',
      landmarkImage: 'assets/landmarks/italia.webp',
      landmarkAlt: 'Il·lustració en aquarel·la del monument de la taula Itàlia',

      latitudeOptions: [],
      longitudeOptions: [],

      // TODO — replace with the real coordinate
      correctCoordinate: { latitude: 41.8902, longitude: 12.4922 },
      coordinateTolerance: 0.0005,

      riddle:
        'No són només carreteres: poden portar-nos lluny, apropar-nos o canviar-nos.',
      acceptedRiddleAnswers: ['CAMINS'],
      unlockedWord: 'CAMINS',

      // TODO — replace with the real secret code
      resetCode: 'I-3MB',

      helpText: 'Latitud nord i longitud est.'
    },

    mexico: {
      id: 'mexico',
      label: 'MEXICO',
      displayLabel: 'MÉXICO',
      icon: 'fa-solid fa-compass',
      landmarkImage: 'assets/landmarks/mexico.webp',
      landmarkAlt: 'Il·lustració en aquarel·la del monument de la taula Mèxic',

      latitudeOptions: [],
      longitudeOptions: [],

      // TODO — replace with the real coordinate
      correctCoordinate: { latitude: 20.6843, longitude: -88.5678 },
      coordinateTolerance: 0.0005,

      riddle:
        'Cada viatge compartit transforma una experiència en una història i una història en un record.',
      acceptedRiddleAnswers: ['CREA'],
      unlockedWord: 'CREA',

      // TODO — replace with the real secret code
      resetCode: 'M-9XR',

      helpText: 'Latitud nord i longitud oest (valor negatiu).'
    },

    jordan: {
      id: 'jordan',
      label: 'JORDAN',
      displayLabel: 'JORDAN',
      icon: 'fa-solid fa-compass',
      landmarkImage: 'assets/landmarks/jordan.webp',
      landmarkAlt: 'Il·lustració en aquarel·la del monument de la taula Jordània',

      latitudeOptions: [],
      longitudeOptions: [],

      // TODO — replace with the real coordinate
      correctCoordinate: { latitude: 30.3285, longitude: 35.4444 },
      coordinateTolerance: 0.0005,

      riddle:
        'No caben en una maleta, però viatgen amb nosaltres durant anys. Poden tornar amb una olor, una cançó o una imatge.',
      acceptedRiddleAnswers: ['RECORDS'],
      unlockedWord: 'RECORDS',

      // TODO — replace with the real secret code
      resetCode: 'J-5TV',

      helpText: 'Latitud nord i longitud est.'
    },

    egypt: {
      id: 'egypt',
      label: 'EGYPT',
      displayLabel: 'EGYPT',
      icon: 'fa-solid fa-compass',
      landmarkImage: 'assets/landmarks/egypt.webp',
      landmarkAlt: 'Il·lustració en aquarel·la del monument de la taula Egipte',

      latitudeOptions: [],
      longitudeOptions: [],

      // TODO — replace with the real coordinate
      correctCoordinate: { latitude: 29.9792, longitude: 31.1342 },
      coordinateTolerance: 0.0005,

      riddle:
        'Alguns moments passen ràpidament, però deixen una petjada que el temps no aconsegueix esborrar.',
      acceptedRiddleAnswers: ['INOBLIDABLES'],
      unlockedWord: 'INOBLIDABLES',

      // TODO — replace with the real secret code
      resetCode: 'E-2PL',

      helpText: 'Latitud nord i longitud est.'
    }
  }
};

/* Expose for both browser and test runners (Node) */
if (typeof window !== 'undefined') window.GAME_CONFIG = GAME_CONFIG;
if (typeof module !== 'undefined' && module.exports) module.exports = { GAME_CONFIG };
