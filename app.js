/* =============================================================================
 *  EL NOSTRE VIATGE — Coordinate Treasure Game
 *  app.js — generic game logic + Alpine.js component.
 *
 *  Nothing in this file is table-specific. Every value comes from GAME_CONFIG.
 * ========================================================================== */

(function (global) {
  'use strict';

  const CFG = () => global.GAME_CONFIG;

  /* =========================================================================
   * PHASES
   * ====================================================================== */
  const PHASES = Object.freeze({
    START: 'start',
    TABLE_SELECTION: 'table-selection',
    COORDINATES: 'coordinates',
    COORDINATES_LOCKED: 'coordinates-locked',
    RIDDLE: 'riddle',
    WORD_UNLOCKED: 'word-unlocked',
    FINAL_PHRASE: 'final-phrase',
    TREASURE_UNLOCKED: 'treasure-unlocked'
  });

  const VALID_PHASES = Object.values(PHASES);

  /* =========================================================================
   * TEXT NORMALIZATION
   * ====================================================================== */

  /**
   * Uppercase, trim, collapse internal whitespace, normalise quotes,
   * and optionally strip accents. Used for riddle answers and final phrase.
   */
  function normalizeAnswer(value, options) {
    const opts = options || {};
    const stripAccents =
      opts.stripAccents !== undefined
        ? opts.stripAccents
        : !!(CFG() && CFG().app && CFG().app.stripAccents);

    let out = String(value == null ? '' : value);

    // Unify apostrophes and dashes so "l’organització" === "l'organització"
    out = out.replace(/[‘’ʼ`´]/g, "'");
    out = out.replace(/[–—]/g, '-');

    out = out.trim().replace(/\s+/g, ' ').toUpperCase();

    if (stripAccents) {
      out = out.normalize('NFD').replace(/[̀-ͯ]/g, '');
      // Catalan interpunct is decorative for our purposes
      out = out.replace(/·/g, '');
    }

    return out;
  }

  /** Reset codes: case-insensitive, whitespace- and dash-insensitive. */
  function normalizeCode(value) {
    return String(value == null ? '' : value)
      .toUpperCase()
      .replace(/[\s\-_.]/g, '');
  }

  /* =========================================================================
   * COORDINATE PARSING & VALIDATION
   * ====================================================================== */

  /**
   * Parse a free-typed coordinate into a signed decimal number.
   * Accepts:  48.8584 | 48,8584 | 48.8584° N | 2.1204 E | -88.5678 | 88.5678 W
   * Returns { ok: true, value } or { ok: false, reason: 'empty' | 'format' }.
   *
   * A format failure is NOT a wrong answer — it must not consume an attempt.
   */
  function parseCoordinate(raw, axis) {
    const text = String(raw == null ? '' : raw).trim();
    if (text === '') return { ok: false, reason: 'empty' };

    let s = text
      .toUpperCase()
      .replace(/[°º′″'"]/g, ' ')   // degree/minute/second marks
      .replace(/,/g, '.')                              // decimal comma
      .replace(/\s+/g, ' ')
      .trim();

    // Hemisphere letter, leading or trailing
    let hemisphere = null;
    const hemiMatch = s.match(/(^|\s)([NSEWO])(\s|$)/);
    if (hemiMatch) {
      hemisphere = hemiMatch[2];
      s = s.replace(/(^|\s)[NSEWO](\s|$)/, ' ').trim();
    }

    // What remains must be a single signed decimal number
    if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return { ok: false, reason: 'format' };

    let value = Number(s);
    if (!isFinite(value)) return { ok: false, reason: 'format' };

    if (hemisphere) {
      // 'O' = oest (Catalan for west)
      const negative = hemisphere === 'S' || hemisphere === 'W' || hemisphere === 'O';
      value = Math.abs(value) * (negative ? -1 : 1);
    }

    // Range sanity check
    const limit = axis === 'longitude' ? 180 : 90;
    if (Math.abs(value) > limit) return { ok: false, reason: 'format' };

    return { ok: true, value: value };
  }

  /**
   * Compare a (latitude, longitude) pair against the table's configured
   * coordinate. Latitude is ALWAYS first, longitude ALWAYS second.
   */
  function isCorrectCoordinate(tableConfig, latitude, longitude) {
    if (!tableConfig || !tableConfig.correctCoordinate) return false;
    const expected = tableConfig.correctCoordinate;
    if (expected.latitude == null || expected.longitude == null) return false;

    const tolerance =
      tableConfig.coordinateTolerance != null
        ? tableConfig.coordinateTolerance
        : (CFG().app.coordinateTolerance != null ? CFG().app.coordinateTolerance : 0.0001);

    return (
      Math.abs(Number(latitude) - Number(expected.latitude)) <= tolerance &&
      Math.abs(Number(longitude) - Number(expected.longitude)) <= tolerance
    );
  }

  /* =========================================================================
   * CONFIG VALIDATION
   * ====================================================================== */

  function validateTableConfig(tableConfig) {
    const missing = [];
    if (!tableConfig) return ['table'];
    if (!tableConfig.id) missing.push('id');
    if (!tableConfig.label) missing.push('label');
    if (!tableConfig.riddle) missing.push('riddle');
    if (!tableConfig.unlockedWord) missing.push('unlockedWord');
    if (!Array.isArray(tableConfig.acceptedRiddleAnswers) ||
        tableConfig.acceptedRiddleAnswers.length === 0) missing.push('acceptedRiddleAnswers');
    if (!tableConfig.correctCoordinate ||
        tableConfig.correctCoordinate.latitude == null ||
        tableConfig.correctCoordinate.longitude == null) missing.push('correctCoordinate');
    if (!tableConfig.resetCode) missing.push('resetCode');
    return missing;
  }

  /* =========================================================================
   * STORAGE
   * ====================================================================== */

  function storageAvailable() {
    try {
      const k = '__ft_probe__';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function freshTableState() {
    return {
      phase: PHASES.COORDINATES,
      attemptsRemaining: CFG().app.maxAttempts,
      coordinateValidated: false,
      riddleSolved: false,
      unlockedWord: null,
      finalPhraseUnlocked: false,
      resetCount: 0
    };
  }

  function freshState() {
    return {
      version: 1,
      selectedTable: null,
      theme: CFG().app.defaultTheme || 'light',
      tables: {}
    };
  }

  /** Repair anything unexpected so a corrupt payload can never white-screen. */
  function sanitizeState(raw) {
    const base = freshState();
    if (!raw || typeof raw !== 'object') return base;

    if (typeof raw.theme === 'string' && (raw.theme === 'light' || raw.theme === 'dark')) {
      base.theme = raw.theme;
    }

    if (typeof raw.selectedTable === 'string' && CFG().tables[raw.selectedTable]) {
      base.selectedTable = raw.selectedTable;
    }

    if (raw.tables && typeof raw.tables === 'object') {
      Object.keys(CFG().tables).forEach(function (id) {
        const t = raw.tables[id];
        if (!t || typeof t !== 'object') return;
        const clean = freshTableState();

        if (VALID_PHASES.indexOf(t.phase) !== -1 && t.phase !== PHASES.START &&
            t.phase !== PHASES.TABLE_SELECTION) {
          clean.phase = t.phase;
        }
        if (Number.isFinite(t.attemptsRemaining)) {
          clean.attemptsRemaining = Math.max(
            0, Math.min(CFG().app.maxAttempts, Math.floor(t.attemptsRemaining))
          );
        }
        clean.coordinateValidated = !!t.coordinateValidated;
        clean.riddleSolved = !!t.riddleSolved;
        clean.finalPhraseUnlocked = !!t.finalPhraseUnlocked;
        clean.resetCount = Number.isFinite(t.resetCount) ? Math.max(0, t.resetCount) : 0;
        clean.unlockedWord = clean.riddleSolved
          ? (CFG().tables[id].unlockedWord || null)
          : null;

        base.tables[id] = clean;
      });
    }

    return base;
  }

  function loadState() {
    if (!storageAvailable()) return { state: freshState(), persisted: false };
    try {
      const raw = global.localStorage.getItem(CFG().app.storageKey);
      if (!raw) return { state: freshState(), persisted: true };
      return { state: sanitizeState(JSON.parse(raw)), persisted: true };
    } catch (e) {
      return { state: freshState(), persisted: false };
    }
  }

  function saveState(state) {
    if (!storageAvailable()) return false;
    try {
      global.localStorage.setItem(CFG().app.storageKey, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* =========================================================================
   * GAME ENGINE — pure-ish logic, unit-testable outside the browser
   * ====================================================================== */

  function createEngine() {
    const loaded = loadState();

    const engine = {
      PHASES: PHASES,
      state: loaded.state,
      persistent: loaded.persisted
    };

    engine.save = function () {
      if (!saveState(engine.state)) engine.persistent = false;
    };

    engine.getTableConfig = function (tableId) {
      const id = tableId || engine.state.selectedTable;
      return id ? (CFG().tables[id] || null) : null;
    };

    engine.getTableState = function (tableId) {
      const id = tableId || engine.state.selectedTable;
      if (!id || !CFG().tables[id]) return null;
      if (!engine.state.tables[id]) engine.state.tables[id] = freshTableState();
      return engine.state.tables[id];
    };

    engine.selectTable = function (tableId) {
      if (!CFG().tables[tableId]) return { ok: false, reason: 'unknown-table' };
      engine.state.selectedTable = tableId;
      // Existing progress for this table is preserved; a new table starts fresh.
      engine.getTableState(tableId);
      engine.save();
      return { ok: true, phase: engine.getTableState(tableId).phase };
    };

    engine.setPhase = function (phase) {
      if (VALID_PHASES.indexOf(phase) === -1) return false;
      const ts = engine.getTableState();
      if (!ts) return false;
      ts.phase = phase;
      engine.save();
      return true;
    };

    /**
     * Validate a submitted coordinate pair.
     * Returns one of:
     *   { status: 'empty' }                      — no attempt consumed
     *   { status: 'format', axis }               — no attempt consumed
     *   { status: 'success' }                    — phase advances to riddle
     *   { status: 'incorrect', attemptsRemaining }
     *   { status: 'locked', attemptsRemaining: 0 }
     *   { status: 'not-allowed' }                — phase already passed/locked
     */
    engine.validateCoordinate = function (latRaw, lonRaw) {
      const cfg = engine.getTableConfig();
      const ts = engine.getTableState();
      if (!cfg || !ts) return { status: 'not-allowed' };
      if (ts.coordinateValidated) return { status: 'not-allowed' };
      if (ts.phase === PHASES.COORDINATES_LOCKED || ts.attemptsRemaining <= 0) {
        return { status: 'locked', attemptsRemaining: 0 };
      }

      const lat = parseCoordinate(latRaw, 'latitude');
      const lon = parseCoordinate(lonRaw, 'longitude');

      // Empty fields never consume an attempt.
      if (lat.reason === 'empty' || lon.reason === 'empty') return { status: 'empty' };

      // Client-side formatting errors never consume an attempt.
      if (!lat.ok) return { status: 'format', axis: 'latitude' };
      if (!lon.ok) return { status: 'format', axis: 'longitude' };

      if (isCorrectCoordinate(cfg, lat.value, lon.value)) {
        ts.coordinateValidated = true;
        ts.phase = PHASES.RIDDLE;
        engine.save();
        return { status: 'success' };
      }

      // Only a complete, well-formed, wrong pair consumes exactly one attempt.
      ts.attemptsRemaining = Math.max(0, ts.attemptsRemaining - 1);
      if (ts.attemptsRemaining === 0) ts.phase = PHASES.COORDINATES_LOCKED;
      engine.save();

      return ts.attemptsRemaining === 0
        ? { status: 'locked', attemptsRemaining: 0 }
        : { status: 'incorrect', attemptsRemaining: ts.attemptsRemaining };
    };

    /**
     * Restore attempts with the organisation's code.
     * Returns { ok, reason?, attemptsRemaining }.
     */
    engine.resetAttempts = function (code) {
      const cfg = engine.getTableConfig();
      const ts = engine.getTableState();
      if (!cfg || !ts) return { ok: false, reason: 'not-allowed' };

      if (!CFG().app.allowRepeatedReset && ts.resetCount >= 1) {
        return { ok: false, reason: 'exhausted', attemptsRemaining: ts.attemptsRemaining };
      }

      if (normalizeCode(code) !== normalizeCode(cfg.resetCode)) {
        return { ok: false, reason: 'invalid', attemptsRemaining: ts.attemptsRemaining };
      }

      // Restore only the coordinate attempt state. Nothing else is touched.
      ts.attemptsRemaining = CFG().app.maxAttempts;
      ts.resetCount += 1;
      ts.phase = PHASES.COORDINATES;
      engine.save();
      return { ok: true, attemptsRemaining: ts.attemptsRemaining };
    };

    /** Riddle answers never touch coordinate attempts. */
    engine.validateRiddleAnswer = function (answer) {
      const cfg = engine.getTableConfig();
      const ts = engine.getTableState();
      if (!cfg || !ts) return { ok: false, reason: 'not-allowed' };
      if (!ts.coordinateValidated) return { ok: false, reason: 'not-allowed' };

      const given = normalizeAnswer(answer);
      if (given === '') return { ok: false, reason: 'empty' };

      const accepted = (cfg.acceptedRiddleAnswers || []).map(function (a) {
        return normalizeAnswer(a);
      });

      if (accepted.indexOf(given) === -1) return { ok: false, reason: 'incorrect' };

      ts.riddleSolved = true;
      ts.unlockedWord = cfg.unlockedWord;
      ts.phase = PHASES.WORD_UNLOCKED;
      engine.save();
      return { ok: true, word: cfg.unlockedWord };
    };

    /**
     * Validate the five-word phrase. Capitalization and spacing are forgiving;
     * word order and vocabulary are not.
     */
    engine.validateFinalPhrase = function (phrase) {
      const ts = engine.getTableState();
      if (!ts) return { ok: false, reason: 'not-allowed' };
      if (!ts.riddleSolved) return { ok: false, reason: 'not-allowed' };

      const given = normalizeAnswer(phrase);
      if (given === '') return { ok: false, reason: 'empty' };

      const expected = normalizeAnswer(CFG().app.finalPhrase);
      if (given !== expected) return { ok: false, reason: 'incorrect' };

      ts.finalPhraseUnlocked = true;
      ts.phase = PHASES.TREASURE_UNLOCKED;
      engine.save();
      return { ok: true };
    };

    return engine;
  }

  /* =========================================================================
   * ALPINE COMPONENT
   * ====================================================================== */

  function gameApp() {
    return {
      /* ---- config passthrough (views read everything from here) ---- */
      config: null,
      copy: null,
      PHASES: PHASES,

      /* ---- engine + view state ----
       * The engine owns the source of truth but mutates its own plain object,
       * which lives outside Alpine's reactive proxy. So the view keeps its own
       * copies of the values it renders and refreshes them through sync()
       * after every action. Never read engine state directly from a template.
       */
      engine: null,
      phase: PHASES.START,
      selectedTable: null,
      theme: 'light',
      storageWarning: false,
      configProblem: '',

      /* ---- mirrored engine state (kept in sync by sync()) ---- */
      attemptsRemaining: 0,
      unlockedWord: '',
      resetCount: 0,
      coordinateValidated: false,
      riddleSolved: false,

      /* ---- form models ---- */
      latitudeInput: '',
      longitudeInput: '',
      resetCodeInput: '',
      riddleInput: '',
      finalPhraseInput: '',

      /* ---- feedback ---- */
      message: null,       // { tone: 'error' | 'success' | 'info', title, body }
      shake: false,

      /* =====================================================
       * lifecycle
       * ================================================== */
      init: function () {
        this.config = GAME_CONFIG;
        this.copy = GAME_CONFIG.copy;
        this.engine = createEngine();
        this.attemptsRemaining = GAME_CONFIG.app.maxAttempts;

        this.theme = this.engine.state.theme || GAME_CONFIG.app.defaultTheme || 'light';
        this.applyTheme();

        this.storageWarning = !this.engine.persistent;

        // Resume a session in progress, otherwise show the start screen.
        const id = this.engine.state.selectedTable;
        if (id && GAME_CONFIG.tables[id]) {
          this.selectedTable = id;
          this.phase = this.engine.getTableState(id).phase;
          this.checkTableConfig();
        } else {
          this.phase = PHASES.START;
        }

        this.sync();
        this.refreshAos();
      },

      /**
       * Copy the engine's current table state into the component's own
       * reactive properties. Must be called after anything that can change it.
       */
      sync: function () {
        const ts = this.selectedTable
          ? this.engine.getTableState(this.selectedTable)
          : null;

        this.attemptsRemaining = ts ? ts.attemptsRemaining : GAME_CONFIG.app.maxAttempts;
        this.unlockedWord = ts && ts.unlockedWord ? ts.unlockedWord : '';
        this.resetCount = ts ? ts.resetCount : 0;
        this.coordinateValidated = ts ? !!ts.coordinateValidated : false;
        this.riddleSolved = ts ? !!ts.riddleSolved : false;
      },

      refreshAos: function () {
        const self = this;
        this.$nextTick(function () {
          if (global.AOS && typeof global.AOS.refreshHard === 'function') {
            global.AOS.refreshHard();
          }
          // Move focus to the new screen for keyboard and screen-reader users
          const heading = self.$root.querySelector('[data-autofocus]');
          if (heading && typeof heading.focus === 'function') heading.focus();
        });
      },

      /* =====================================================
       * derived values
       * ================================================== */
      get tableList() {
        const order = GAME_CONFIG.app.tableOrder || Object.keys(GAME_CONFIG.tables);
        return order
          .map(function (id) { return GAME_CONFIG.tables[id]; })
          .filter(Boolean);
      },

      get tableConfig() {
        return this.selectedTable ? GAME_CONFIG.tables[this.selectedTable] : null;
      },

      get canSubmitCoordinate() {
        return this.latitudeInput.trim() !== '' && this.longitudeInput.trim() !== '';
      },

      get canSubmitReset() {
        return this.resetCodeInput.trim() !== '';
      },

      get canSubmitRiddle() {
        return this.riddleInput.trim() !== '';
      },

      get canSubmitFinalPhrase() {
        return this.finalPhraseInput.trim() !== '';
      },

      get finalPhrase() {
        return GAME_CONFIG.app.finalPhrase;
      },

      /* =====================================================
       * navigation
       * ================================================== */
      go: function (phase) {
        this.message = null;
        this.phase = phase;
        if (this.selectedTable &&
            phase !== PHASES.START && phase !== PHASES.TABLE_SELECTION) {
          this.engine.setPhase(phase);
        }
        this.sync();
        this.refreshAos();
      },

      start: function () {
        this.go(PHASES.TABLE_SELECTION);
      },

      backToTableSelection: function () {
        // Progress for every table is kept; only the view changes.
        this.message = null;
        this.phase = PHASES.TABLE_SELECTION;
        this.refreshAos();
      },

      selectTable: function (tableId) {
        const res = this.engine.selectTable(tableId);
        if (!res.ok) {
          this.setMessage('error', this.copy.common.configError, '');
          return;
        }
        this.selectedTable = tableId;
        this.latitudeInput = '';
        this.longitudeInput = '';
        this.riddleInput = '';
        this.resetCodeInput = '';
        this.finalPhraseInput = '';
        this.message = null;
        this.checkTableConfig();
        this.phase = res.phase;
        this.sync();
        this.refreshAos();
      },

      checkTableConfig: function () {
        const missing = validateTableConfig(this.tableConfig);
        this.configProblem = missing.length ? missing.join(', ') : '';
      },

      /* =====================================================
       * feedback helpers
       * ================================================== */
      setMessage: function (tone, title, body) {
        this.message = { tone: tone, title: title, body: body || '' };
        if (tone === 'error') this.pulse();
      },

      pulse: function () {
        const self = this;
        if (global.matchMedia &&
            global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        this.shake = true;
        setTimeout(function () { self.shake = false; }, 500);
      },

      /* =====================================================
       * actions
       * ================================================== */
      submitCoordinate: function () {
        if (!this.canSubmitCoordinate) {
          this.setMessage('info', this.copy.coordinates.emptyHint, '');
          return;
        }

        const res = this.engine.validateCoordinate(this.latitudeInput, this.longitudeInput);

        // Pull the new attempt count into the view before rendering feedback.
        this.sync();

        switch (res.status) {
          case 'empty':
            this.setMessage('info', this.copy.coordinates.emptyHint, '');
            break;

          case 'format':
            // Deliberately does not say which axis was malformed beyond a generic hint.
            this.setMessage('info', this.copy.coordinates.formatHint, '');
            break;

          case 'success':
            this.setMessage(
              'success',
              this.copy.coordinateSuccess.title,
              this.copy.coordinateSuccess.body
            );
            this.phase = PHASES.RIDDLE;
            this.refreshAos();
            break;

          case 'incorrect':
            this.setMessage(
              'error',
              this.copy.coordinateError.title,
              this.copy.coordinateError.body
            );
            break;

          case 'locked':
            this.message = null;
            this.phase = PHASES.COORDINATES_LOCKED;
            this.refreshAos();
            break;

          default:
            this.setMessage('info', this.copy.common.configError, '');
        }
      },

      submitResetCode: function () {
        if (!this.canSubmitReset) return;

        const res = this.engine.resetAttempts(this.resetCodeInput);
        this.sync();

        if (res.ok) {
          this.resetCodeInput = '';
          this.latitudeInput = '';
          this.longitudeInput = '';
          this.phase = PHASES.COORDINATES;
          this.setMessage(
            'success',
            this.copy.locked.successTitle,
            this.copy.locked.successBody
          );
          this.refreshAos();
          return;
        }

        if (res.reason === 'exhausted') {
          this.setMessage('error', this.copy.locked.errorTitle, this.copy.locked.exhausted);
        } else {
          this.setMessage('error', this.copy.locked.errorTitle, '');
        }
      },

      submitRiddle: function () {
        if (!this.canSubmitRiddle) return;

        const res = this.engine.validateRiddleAnswer(this.riddleInput);
        this.sync();

        if (res.ok) {
          this.riddleInput = '';
          this.message = null;
          this.phase = PHASES.WORD_UNLOCKED;
          this.refreshAos();
          return;
        }

        if (res.reason === 'incorrect') {
          this.setMessage(
            'error',
            this.copy.riddle.errorTitle,
            this.copy.riddle.errorBody
          );
        }
      },

      submitFinalPhrase: function () {
        if (!this.canSubmitFinalPhrase) return;

        const res = this.engine.validateFinalPhrase(this.finalPhraseInput);
        this.sync();

        if (res.ok) {
          this.message = null;
          this.phase = PHASES.TREASURE_UNLOCKED;
          this.refreshAos();
          return;
        }

        if (res.reason === 'incorrect') {
          this.setMessage(
            'error',
            this.copy.finalPhrase.errorTitle,
            this.copy.finalPhrase.errorBody
          );
        }
      },

      /* =====================================================
       * theme
       * ================================================== */
      toggleTheme: function () {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.engine.state.theme = this.theme;
        this.engine.save();
        this.applyTheme();
      },

      applyTheme: function () {
        if (global.document) {
          global.document.documentElement.setAttribute('data-theme', this.theme);
        }
      },

      /* =====================================================
       * misc
       * ================================================== */
      onImageError: function (event) {
        // Hide a broken landmark image rather than showing the browser's icon.
        if (event && event.target) event.target.style.display = 'none';
      }
    };
  }

  /* =========================================================================
   * EXPORTS
   * ====================================================================== */
  const API = {
    PHASES: PHASES,
    normalizeAnswer: normalizeAnswer,
    normalizeCode: normalizeCode,
    parseCoordinate: parseCoordinate,
    isCorrectCoordinate: isCorrectCoordinate,
    validateTableConfig: validateTableConfig,
    createEngine: createEngine,
    gameApp: gameApp
  };

  global.TreasureGame = API;
  global.gameApp = gameApp;

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
