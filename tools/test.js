#!/usr/bin/env node
/* =============================================================================
 *  test.js — spec §15 test matrix, run headlessly with plain Node.
 *
 *  Usage:  node tools/test.js
 *  Exit code 0 = all green.
 * ========================================================================== */

'use strict';

const path = require('path');
const fs = require('fs');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

/* ---------- minimal browser stand-ins --------------------------------- */
function makeSandbox(opts) {
  const options = opts || {};
  const store = new Map();

  const localStorage = options.brokenStorage
    ? {
        getItem() { throw new Error('denied'); },
        setItem() { throw new Error('denied'); },
        removeItem() { throw new Error('denied'); }
      }
    : {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k)
      };

  const sandbox = {
    console,
    localStorage,
    matchMedia: () => ({ matches: false }),
    setTimeout,
    clearTimeout,
    document: { documentElement: { setAttribute() {} } },
    __store: store
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8'), sandbox, 'config.js');
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'), sandbox, 'app.js');
  return sandbox;
}

/* ---------- tiny assertion harness ------------------------------------ */
let pass = 0;
const failures = [];
const warnings = [];
let group = '';

function describe(name) { group = name; console.log('\n\x1b[1m' + name + '\x1b[0m'); }

function it(name, fn) {
  try {
    fn();
    pass++;
    console.log('  \x1b[32m✓\x1b[0m ' + name);
  } catch (err) {
    failures.push({ group, name, err });
    console.log('  \x1b[31m✗\x1b[0m ' + name + '  —  ' + err.message);
  }
}

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error((label ? label + ': ' : '') + 'expected ' + e + ', got ' + a);
}

function ok(value, label) {
  if (!value) throw new Error((label || 'assertion') + ' was falsy');
}

/* ---------- helpers ---------------------------------------------------- */
function fresh(tableId, opts) {
  const sb = makeSandbox(opts);
  const engine = sb.TreasureGame.createEngine();
  if (tableId) engine.selectTable(tableId);
  return { sb, engine, cfg: sb.GAME_CONFIG };
}

const TABLE_IDS = ['france', 'italia', 'mexico', 'jordan', 'egypt'];

/* =========================================================================
 * 1. Configuration integrity
 * ====================================================================== */
describe('Configuration');

{
  const { sb, cfg } = fresh(null);

  it('exposes exactly the five playing tables', () => {
    eq(Object.keys(cfg.tables).sort(), TABLE_IDS.slice().sort());
  });

  it('never includes Vienna', () => {
    const blob = JSON.stringify(cfg).toLowerCase();
    ok(blob.indexOf('vienna') === -1, 'Vienna found in config');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').toLowerCase();
    ok(html.indexOf('vienna') === -1, 'Vienna found in index.html');
  });

  it('has complete data for every table', () => {
    TABLE_IDS.forEach((id) => {
      const missing = sb.TreasureGame.validateTableConfig(cfg.tables[id]);
      eq(missing, [], id);
    });
  });

  it('table words match the final phrase in the configured order', () => {
    const words = cfg.app.finalPhraseWordOrder.map((id) => cfg.tables[id].unlockedWord);
    eq(words.join(' '), cfg.app.finalPhrase);
    eq(words, cfg.app.finalPhraseWords);
  });

  it('reset codes never appear in the HTML', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    TABLE_IDS.forEach((id) => {
      ok(html.indexOf(cfg.tables[id].resetCode) === -1, id + ' reset code leaked into HTML');
    });
  });

  // §7.7 "Do not show the expected answer in the riddle text."
  // Reported as a warning, not a failure: the riddle wording comes from the
  // couple and is copied verbatim from the spec.
  it('riddles are checked for leaking their own answer', () => {
    const leaks = TABLE_IDS.filter((id) => {
      const t = cfg.tables[id];
      const riddle = sb.TreasureGame.normalizeAnswer(t.riddle);
      const word = sb.TreasureGame.normalizeAnswer(t.unlockedWord);
      return new RegExp('(^|[^A-Z])' + word + '([^A-Z]|$)').test(riddle);
    });
    leaks.forEach((id) => {
      warnings.push(
        id + ': the riddle text contains its own answer "' +
        cfg.tables[id].unlockedWord + '" (spec §7.7 says it should not)'
      );
    });
  });

  it('every table has a distinct coordinate', () => {
    const seen = new Set();
    TABLE_IDS.forEach((id) => {
      const c = cfg.tables[id].correctCoordinate;
      const key = c.latitude + ',' + c.longitude;
      ok(!seen.has(key), 'duplicate coordinate on ' + id);
      seen.add(key);
    });
  });
}

/* =========================================================================
 * 2. Coordinate parsing
 * ====================================================================== */
describe('Coordinate parsing');

{
  const { sb } = fresh(null);
  const p = sb.TreasureGame.parseCoordinate;

  it('accepts a plain decimal', () => eq(p('48.8584', 'latitude').value, 48.8584));
  it('accepts a decimal comma', () => eq(p('48,8584', 'latitude').value, 48.8584));
  it('accepts a degree symbol and hemisphere', () => eq(p('48.8584° N', 'latitude').value, 48.8584));
  it('treats S as negative', () => eq(p('33.9249 S', 'latitude').value, -33.9249));
  it('treats W as negative', () => eq(p('88.5678 W', 'longitude').value, -88.5678));
  it('treats Catalan O (oest) as negative', () => eq(p('88.5678 O', 'longitude').value, -88.5678));
  it('accepts an explicit minus sign', () => eq(p('-88.5678', 'longitude').value, -88.5678));
  it('rejects letters', () => eq(p('quaranta-vuit', 'latitude').reason, 'format'));
  it('rejects out-of-range latitude', () => eq(p('120', 'latitude').reason, 'format'));
  it('accepts a longitude beyond 90', () => ok(p('120', 'longitude').ok));
  it('reports empty separately from malformed', () => eq(p('   ', 'latitude').reason, 'empty'));
}

/* =========================================================================
 * 3. Coordinate attempts — per table
 * ====================================================================== */
describe('Coordinate attempts (all five tables)');

TABLE_IDS.forEach((id) => {
  const { engine, cfg } = fresh(id);
  const correct = cfg.tables[id].correctCoordinate;

  it(id + ': correct coordinate unlocks that table\'s riddle', () => {
    const res = engine.validateCoordinate(String(correct.latitude), String(correct.longitude));
    eq(res.status, 'success');
    eq(engine.getTableState().phase, 'riddle');
    eq(engine.getTableConfig().riddle, cfg.tables[id].riddle);
  });
});

TABLE_IDS.forEach((id) => {
  const { engine } = fresh(id);

  it(id + ': wrong coordinate consumes exactly one attempt', () => {
    const before = engine.getTableState().attemptsRemaining;
    const res = engine.validateCoordinate('1.0', '1.0');
    eq(res.status, 'incorrect');
    eq(engine.getTableState().attemptsRemaining, before - 1);
  });
});

{
  const { engine, cfg } = fresh('france');
  const correct = cfg.tables.france.correctCoordinate;

  it('reversed pair is rejected — latitude is never swapped with longitude', () => {
    const res = engine.validateCoordinate(String(correct.longitude), String(correct.latitude));
    eq(res.status, 'incorrect');
  });
}

{
  const { engine } = fresh('france');

  it('empty fields consume no attempt', () => {
    eq(engine.validateCoordinate('', '').status, 'empty');
    eq(engine.validateCoordinate('48.8584', '').status, 'empty');
    eq(engine.validateCoordinate('', '2.2945').status, 'empty');
    eq(engine.getTableState().attemptsRemaining, 3);
  });

  it('a formatting error consumes no attempt', () => {
    eq(engine.validateCoordinate('abc', '2.2945').status, 'format');
    eq(engine.validateCoordinate('48.8584', 'xyz').status, 'format');
    eq(engine.getTableState().attemptsRemaining, 3);
  });
}

{
  const { engine } = fresh('france');

  it('the third wrong submission locks the coordinate phase', () => {
    eq(engine.validateCoordinate('1', '1').status, 'incorrect');
    eq(engine.validateCoordinate('2', '2').status, 'incorrect');
    const third = engine.validateCoordinate('3', '3');
    eq(third.status, 'locked');
    eq(engine.getTableState().attemptsRemaining, 0);
    eq(engine.getTableState().phase, 'coordinates-locked');
  });

  it('no further attempts are accepted while locked', () => {
    eq(engine.validateCoordinate('4', '4').status, 'locked');
    eq(engine.getTableState().attemptsRemaining, 0);
  });
}

{
  const { engine, cfg } = fresh('italia');
  const correct = cfg.tables.italia.correctCoordinate;

  it('tolerance absorbs a small rounding difference', () => {
    const tol = cfg.tables.italia.coordinateTolerance;
    const res = engine.validateCoordinate(
      String(correct.latitude + tol * 0.5),
      String(correct.longitude - tol * 0.5)
    );
    eq(res.status, 'success');
  });
}

{
  const { engine, cfg } = fresh('italia');
  const correct = cfg.tables.italia.correctCoordinate;

  it('a value beyond the tolerance is rejected', () => {
    const tol = cfg.tables.italia.coordinateTolerance;
    const res = engine.validateCoordinate(
      String(correct.latitude + tol * 10),
      String(correct.longitude)
    );
    eq(res.status, 'incorrect');
  });
}

{
  const { engine, cfg } = fresh('france');
  const correct = cfg.tables.france.correctCoordinate;

  it('coordinate phase cannot be replayed after success', () => {
    eq(engine.validateCoordinate(String(correct.latitude), String(correct.longitude)).status,
       'success');
    eq(engine.validateCoordinate('1', '1').status, 'not-allowed');
    eq(engine.getTableState().attemptsRemaining, 3);
  });
}

/* =========================================================================
 * 4. Reset codes
 * ====================================================================== */
describe('Reset codes');

TABLE_IDS.forEach((id) => {
  const { engine, cfg } = fresh(id);
  engine.validateCoordinate('1', '1');
  engine.validateCoordinate('2', '2');
  engine.validateCoordinate('3', '3');

  it(id + ': valid code restores three attempts and keeps the table', () => {
    const res = engine.resetAttempts(cfg.tables[id].resetCode);
    ok(res.ok, 'reset rejected');
    eq(engine.getTableState().attemptsRemaining, cfg.app.maxAttempts);
    eq(engine.state.selectedTable, id);
    eq(engine.getTableState().phase, 'coordinates');
    eq(engine.getTableConfig().unlockedWord, cfg.tables[id].unlockedWord);
    eq(engine.getTableState().resetCount, 1);
  });
});

{
  const { engine } = fresh('france');
  engine.validateCoordinate('1', '1');
  engine.validateCoordinate('2', '2');
  engine.validateCoordinate('3', '3');

  it('invalid code restores nothing', () => {
    const res = engine.resetAttempts('NOPE');
    eq(res.ok, false);
    eq(res.reason, 'invalid');
    eq(engine.getTableState().attemptsRemaining, 0);
    eq(engine.getTableState().phase, 'coordinates-locked');
  });

  it('another table\'s code does not work', () => {
    eq(engine.resetAttempts('I-3MB').ok, false);
    eq(engine.getTableState().attemptsRemaining, 0);
  });

  it('the code is case- and dash-insensitive', () => {
    eq(engine.resetAttempts('f7kq').ok, true);
    eq(engine.getTableState().attemptsRemaining, 3);
  });
}

{
  const { engine, cfg } = fresh('france');

  it('reset preserves progress made on other tables', () => {
    engine.selectTable('italia');
    const it2 = cfg.tables.italia.correctCoordinate;
    engine.validateCoordinate(String(it2.latitude), String(it2.longitude));
    engine.validateRiddleAnswer('CAMINS');

    engine.selectTable('france');
    engine.validateCoordinate('1', '1');
    engine.validateCoordinate('2', '2');
    engine.validateCoordinate('3', '3');
    ok(engine.resetAttempts(cfg.tables.france.resetCode).ok);

    eq(engine.getTableState('italia').riddleSolved, true);
    eq(engine.getTableState('italia').unlockedWord, 'CAMINS');
  });
}

/* =========================================================================
 * 5. Riddles
 * ====================================================================== */
describe('Riddles');

TABLE_IDS.forEach((id) => {
  const { engine, cfg } = fresh(id);
  const c = cfg.tables[id].correctCoordinate;
  engine.validateCoordinate(String(c.latitude), String(c.longitude));

  it(id + ': correct answer unlocks the configured word', () => {
    const res = engine.validateRiddleAnswer(cfg.tables[id].acceptedRiddleAnswers[0]);
    ok(res.ok, 'riddle rejected');
    eq(res.word, cfg.tables[id].unlockedWord);
    eq(engine.getTableState().phase, 'word-unlocked');
  });
});

{
  const { engine, cfg } = fresh('france');
  const c = cfg.tables.france.correctCoordinate;
  engine.validateCoordinate(String(c.latitude), String(c.longitude));

  it('a wrong riddle answer does not consume coordinate attempts', () => {
    const before = engine.getTableState().attemptsRemaining;
    eq(engine.validateRiddleAnswer('CAMINS').reason, 'incorrect');
    eq(engine.validateRiddleAnswer('qualsevol cosa').reason, 'incorrect');
    eq(engine.getTableState().attemptsRemaining, before);
    eq(engine.getTableState().riddleSolved, false);
  });

  it('riddle answers tolerate case, spacing and accents', () => {
    ok(engine.validateRiddleAnswer('  compartir  ').ok);
  });
}

{
  const { engine } = fresh('france');

  it('the riddle cannot be answered before the coordinate is validated', () => {
    eq(engine.validateRiddleAnswer('COMPARTIR').reason, 'not-allowed');
  });
}

/* =========================================================================
 * 6. Final phrase
 * ====================================================================== */
describe('Final phrase');

{
  function reach(id) {
    const { engine, cfg } = fresh(id);
    const c = cfg.tables[id].correctCoordinate;
    engine.validateCoordinate(String(c.latitude), String(c.longitude));
    engine.validateRiddleAnswer(cfg.tables[id].acceptedRiddleAnswers[0]);
    return { engine, cfg };
  }

  it('accepts the exact phrase', () => {
    const { engine, cfg } = reach('france');
    ok(engine.validateFinalPhrase(cfg.app.finalPhrase).ok);
    eq(engine.getTableState().phase, 'treasure-unlocked');
  });

  it('accepts different capitalization', () => {
    const { engine } = reach('france');
    ok(engine.validateFinalPhrase('compartir camins Crea records INOBLIDABLES').ok);
  });

  it('accepts extra and doubled spacing', () => {
    const { engine } = reach('france');
    ok(engine.validateFinalPhrase('   COMPARTIR   CAMINS  CREA    RECORDS  INOBLIDABLES  ').ok);
  });

  it('rejects a different word order', () => {
    const { engine } = reach('france');
    eq(engine.validateFinalPhrase('CAMINS COMPARTIR CREA RECORDS INOBLIDABLES').reason,
       'incorrect');
    eq(engine.getTableState().phase, 'word-unlocked');
  });

  it('rejects a missing word', () => {
    const { engine } = reach('france');
    eq(engine.validateFinalPhrase('COMPARTIR CAMINS CREA RECORDS').reason, 'incorrect');
  });

  it('rejects synonyms', () => {
    const { engine } = reach('france');
    eq(engine.validateFinalPhrase('COMPARTIR RUTES CREA RECORDS INOBLIDABLES').reason,
       'incorrect');
  });

  it('any table can submit the phrase after solving its own riddle', () => {
    TABLE_IDS.forEach((id) => {
      const { engine, cfg } = reach(id);
      ok(engine.validateFinalPhrase(cfg.app.finalPhrase).ok, id + ' could not finish');
    });
  });

  it('the phrase cannot be submitted before the riddle is solved', () => {
    const { engine, cfg } = fresh('france');
    eq(engine.validateFinalPhrase(cfg.app.finalPhrase).reason, 'not-allowed');
  });
}

/* =========================================================================
 * 7. Persistence
 * ====================================================================== */
describe('Persistence');

{
  it('a refresh mid-coordinate phase restores attempts and phase', () => {
    const sb = makeSandbox();
    let engine = sb.TreasureGame.createEngine();
    engine.selectTable('jordan');
    engine.validateCoordinate('1', '1');

    engine = sb.TreasureGame.createEngine();          // simulate reload
    eq(engine.state.selectedTable, 'jordan');
    eq(engine.getTableState().attemptsRemaining, 2);
    eq(engine.getTableState().phase, 'coordinates');
  });

  it('a refresh after solving the riddle restores the unlocked word', () => {
    const sb = makeSandbox();
    let engine = sb.TreasureGame.createEngine();
    engine.selectTable('egypt');
    const c = sb.GAME_CONFIG.tables.egypt.correctCoordinate;
    engine.validateCoordinate(String(c.latitude), String(c.longitude));
    engine.validateRiddleAnswer('INOBLIDABLES');

    engine = sb.TreasureGame.createEngine();
    eq(engine.getTableState().phase, 'word-unlocked');
    eq(engine.getTableState().unlockedWord, 'INOBLIDABLES');
    eq(engine.getTableState().riddleSolved, true);
  });

  it('switching tables keeps each table\'s own progress', () => {
    const sb = makeSandbox();
    const engine = sb.TreasureGame.createEngine();

    engine.selectTable('france');
    engine.validateCoordinate('1', '1');           // 2 left

    engine.selectTable('mexico');
    eq(engine.getTableState().attemptsRemaining, 3);

    engine.selectTable('france');
    eq(engine.getTableState().attemptsRemaining, 2);
  });

  it('corrupt stored JSON falls back to a clean state', () => {
    const sb = makeSandbox();
    sb.localStorage.setItem(sb.GAME_CONFIG.app.storageKey, '{ not json');
    const engine = sb.TreasureGame.createEngine();
    eq(engine.state.selectedTable, null);
    eq(engine.state.tables, {});
  });

  it('a tampered attempt count is clamped to the configured maximum', () => {
    const sb = makeSandbox();
    sb.localStorage.setItem(sb.GAME_CONFIG.app.storageKey, JSON.stringify({
      selectedTable: 'france',
      tables: { france: { phase: 'coordinates', attemptsRemaining: 9999 } }
    }));
    const engine = sb.TreasureGame.createEngine();
    eq(engine.getTableState().attemptsRemaining, sb.GAME_CONFIG.app.maxAttempts);
  });

  it('unavailable localStorage still allows a full in-memory session', () => {
    const sb = makeSandbox({ brokenStorage: true });
    const engine = sb.TreasureGame.createEngine();
    eq(engine.persistent, false);
    engine.selectTable('jordan');
    const c = sb.GAME_CONFIG.tables.jordan.correctCoordinate;
    eq(engine.validateCoordinate(String(c.latitude), String(c.longitude)).status, 'success');
    ok(engine.validateRiddleAnswer('RECORDS').ok);
    ok(engine.validateFinalPhrase(sb.GAME_CONFIG.app.finalPhrase).ok);
  });
}

/* =========================================================================
 * 7b. Alpine component — what the screen actually shows
 *
 * The engine mutates a plain object that lives outside Alpine's reactive
 * proxy, so anything a template renders must be an own data property on the
 * component, refreshed by sync(). These tests guard that contract.
 * ====================================================================== */
describe('Alpine component');

{
  function mount(opts) {
    const sb = makeSandbox(opts);
    const c = sb.gameApp();
    c.$nextTick = (fn) => { if (fn) fn(); };
    c.$root = { querySelector: () => null };
    c.init();
    return { c, sb };
  }

  it('attemptsRemaining is a plain data property, not a getter', () => {
    const { c } = mount();
    const proto = Object.getPrototypeOf(c) || {};
    ok(!Object.getOwnPropertyDescriptor(c, 'attemptsRemaining').get,
       'attemptsRemaining is an accessor — Alpine will not see engine mutations');
    ok(!Object.getOwnPropertyDescriptor(proto, 'attemptsRemaining'),
       'attemptsRemaining defined on the prototype');
  });

  it('the displayed counter decrements on every wrong submission', () => {
    const { c } = mount();
    c.selectTable('france');
    eq(c.attemptsRemaining, 3);

    c.latitudeInput = '1.0'; c.longitudeInput = '1.0';
    c.submitCoordinate();
    eq(c.attemptsRemaining, 2, 'after 1st miss');

    c.latitudeInput = '2.0'; c.longitudeInput = '2.0';
    c.submitCoordinate();
    eq(c.attemptsRemaining, 1, 'after 2nd miss');

    c.latitudeInput = '3.0'; c.longitudeInput = '3.0';
    c.submitCoordinate();
    eq(c.attemptsRemaining, 0, 'after 3rd miss');
    eq(c.phase, 'coordinates-locked');
  });

  it('the displayed counter does not move on empty or malformed input', () => {
    const { c } = mount();
    c.selectTable('italia');

    c.latitudeInput = ''; c.longitudeInput = '';
    c.submitCoordinate();
    eq(c.attemptsRemaining, 3, 'after empty submit');

    c.latitudeInput = 'nord'; c.longitudeInput = '12.4922';
    c.submitCoordinate();
    eq(c.attemptsRemaining, 3, 'after malformed submit');
  });

  it('the displayed counter returns to three after a valid reset code', () => {
    const { c, sb } = mount();
    c.selectTable('mexico');
    ['1', '2', '3'].forEach((v) => {
      c.latitudeInput = v; c.longitudeInput = v; c.submitCoordinate();
    });
    eq(c.attemptsRemaining, 0);

    c.resetCodeInput = 'wrong';
    c.submitResetCode();
    eq(c.attemptsRemaining, 0, 'wrong code must not restore');

    c.resetCodeInput = sb.GAME_CONFIG.tables.mexico.resetCode;
    c.submitResetCode();
    eq(c.attemptsRemaining, 3);
    eq(c.phase, 'coordinates');
    eq(c.resetCount, 1);
  });

  it('the counter follows the table you switch to', () => {
    const { c } = mount();
    c.selectTable('jordan');
    c.latitudeInput = '1'; c.longitudeInput = '1';
    c.submitCoordinate();
    eq(c.attemptsRemaining, 2);

    c.selectTable('egypt');
    eq(c.attemptsRemaining, 3);

    c.selectTable('jordan');
    eq(c.attemptsRemaining, 2);
  });

  it('the counter survives a reload', () => {
    const sb = makeSandbox();
    let c = sb.gameApp();
    c.$nextTick = (fn) => fn && fn(); c.$root = { querySelector: () => null };
    c.init();
    c.selectTable('egypt');
    c.latitudeInput = '1'; c.longitudeInput = '1';
    c.submitCoordinate();

    c = sb.gameApp();
    c.$nextTick = (fn) => fn && fn(); c.$root = { querySelector: () => null };
    c.init();
    eq(c.attemptsRemaining, 2);
    eq(c.selectedTable, 'egypt');
  });

  it('the unlocked word appears on the component after the riddle', () => {
    const { c, sb } = mount();
    c.selectTable('egypt');
    const co = sb.GAME_CONFIG.tables.egypt.correctCoordinate;
    c.latitudeInput = String(co.latitude);
    c.longitudeInput = String(co.longitude);
    c.submitCoordinate();
    eq(c.phase, 'riddle');
    eq(c.attemptsRemaining, 3, 'a correct coordinate must not cost an attempt');

    c.riddleInput = 'inoblidables';
    c.submitRiddle();
    eq(c.unlockedWord, 'INOBLIDABLES');
    eq(c.phase, 'word-unlocked');
  });

  it('a wrong riddle answer leaves the coordinate counter alone', () => {
    const { c, sb } = mount();
    c.selectTable('france');
    const co = sb.GAME_CONFIG.tables.france.correctCoordinate;
    c.latitudeInput = String(co.latitude);
    c.longitudeInput = String(co.longitude);
    c.submitCoordinate();

    c.riddleInput = 'CAMINS';
    c.submitRiddle();
    eq(c.attemptsRemaining, 3);
    eq(c.unlockedWord, '');
  });

  it('every engine call in the component is followed by a sync', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const component = src.slice(src.indexOf('function gameApp()'));
    const mutators = ['validateCoordinate', 'resetAttempts', 'validateRiddleAnswer',
                      'validateFinalPhrase', 'selectTable', 'setPhase'];
    mutators.forEach((m) => {
      const i = component.indexOf('this.engine.' + m + '(');
      if (i === -1) return;
      const after = component.slice(i, i + 700);
      ok(after.indexOf('this.sync()') !== -1, m + ' is not followed by sync()');
    });
  });

  it('no template reads engine state directly', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    ok(html.indexOf('engine.') === -1, 'a template reads engine state');
    ok(html.indexOf('tableState') === -1, 'a template reads tableState');
  });
}

/* =========================================================================
 * 8. Views render from configuration
 * ====================================================================== */
describe('Views');

{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const { cfg } = fresh(null);

  it('no riddle text is hardcoded in the markup', () => {
    TABLE_IDS.forEach((id) => {
      const snippet = cfg.tables[id].riddle.slice(0, 30);
      ok(html.indexOf(snippet) === -1, id + ' riddle hardcoded in index.html');
    });
  });

  it('no unlocked word is hardcoded in the markup', () => {
    TABLE_IDS.forEach((id) => {
      ok(html.indexOf(cfg.tables[id].unlockedWord) === -1,
         cfg.tables[id].unlockedWord + ' hardcoded in index.html');
    });
  });

  it('the final phrase is not hardcoded in the markup', () => {
    ok(html.indexOf(cfg.app.finalPhrase) === -1);
  });

  it('every phase has a template', () => {
    Object.values(fresh(null).sb.TreasureGame.PHASES).forEach((phase) => {
      const token = 'PHASES.' + phase.toUpperCase().replace(/-/g, '_');
      ok(html.indexOf(token) !== -1, 'no template for ' + phase);
    });
  });

  it('all interactive controls are semantic buttons', () => {
    ok(!/<div[^>]*@click/.test(html), 'clickable div found');
    ok(!/<span[^>]*@click/.test(html), 'clickable span found');
  });

  it('every input has a matching label', () => {
    const ids = [];
    html.replace(/<(?:input|textarea)[^>]*\bid="([^"]+)"/g, (_, id) => { ids.push(id); return _; });
    ok(ids.length >= 5, 'expected at least 5 inputs, found ' + ids.length);
    ids.forEach((id) => {
      ok(html.indexOf('for="' + id + '"') !== -1, 'no label for #' + id);
    });
  });

  it('validation regions are aria-live polite', () => {
    const count = (html.match(/aria-live="polite"/g) || []).length;
    ok(count >= 4, 'expected aria-live regions on every form screen, found ' + count);
  });

  it('images declare alt text', () => {
    const imgs = html.match(/<img[^>]*>/g) || [];
    imgs.forEach((tag) => ok(/:alt=|\balt=/.test(tag), 'img without alt: ' + tag));
  });
}

/* =========================================================================
 * 9. Styling contract
 * ====================================================================== */
describe('Styles');

{
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

  it('defines the specified custom properties', () => {
    ['--color-paper', '--color-surface', '--color-ink', '--color-muted', '--color-sage',
     '--color-sand', '--color-accent', '--color-success', '--color-error',
     '--shadow-soft', '--radius-card'].forEach((token) => {
      ok(css.indexOf(token + ':') !== -1, 'missing ' + token);
    });
  });

  it('provides a dark theme block', () => ok(css.indexOf("[data-theme='dark']") !== -1));

  it('honours prefers-reduced-motion', () => {
    ok(css.indexOf('prefers-reduced-motion: reduce') !== -1);
  });

  it('inputs are at least 16px so iOS does not zoom', () => {
    ok(/\.field__input\s*\{[^}]*font-size:\s*1\.0625rem/.test(css));
  });
}

/* =========================================================================
 * summary
 * ====================================================================== */
console.log('\n' + '─'.repeat(52));
if (warnings.length) {
  console.log('\x1b[33mWarnings (review, not blocking):\x1b[0m');
  warnings.forEach((w) => console.log('  ! ' + w));
  console.log('');
}
if (failures.length === 0) {
  console.log('\x1b[32m' + pass + ' passing, 0 failing\x1b[0m');
  process.exit(0);
} else {
  console.log('\x1b[32m' + pass + ' passing\x1b[0m, \x1b[31m' + failures.length + ' failing\x1b[0m');
  failures.forEach((f) => console.log('  • [' + f.group + '] ' + f.name + ' — ' + f.err.message));
  process.exit(1);
}
