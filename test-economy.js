// Runtime test for the economy + bug fixes (single vm context).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const lsBacking = {};
const localStorage = {
    getItem: k => lsBacking[k] || null,
    setItem: (k, v) => { lsBacking[k] = String(v); },
    removeItem: k => { delete lsBacking[k]; }
};
const documentStub = {
    addEventListener: () => {},
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {}, setAttribute() {}, textContent: '', innerHTML: '' }),
    body: { appendChild() {}, insertAdjacentHTML() {} },
    head: { appendChild() {} }
};
const windowStub = { addEventListener: () => {} };
const navigatorStub = { userAgent: 'node-test' };

const sandbox = {
    console, localStorage, document: documentStub, window: windowStub,
    navigator: navigatorStub, Date, Math, JSON, Object, Array, Number, String,
    Boolean, Error, setTimeout: (fn) => 0, clearTimeout: () => {},
    confirm: () => true, alert: () => {}
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ['game-data.js', 'data-manager.js', 'game-engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), sandbox, { filename: path.join(__dirname, f) });
}

// Build the test runner inside the context so it shares scope with the game modules.
const testScript = `
(() => {
    let pass = 0, fail = 0;
    const assert = (cond, msg) => {
        if (cond) { pass++; console.log('  OK  ' + msg); }
        else { fail++; console.log('  FAIL ' + msg); }
    };

    console.log('Economy module:');
    assert(typeof Economy === 'object', 'Economy defined');
    const sw = [2,5,10,20].map(s => Economy.strokeWeight(s));
    assert(sw[0] <= sw[1] && sw[1] <= sw[2] && sw[2] <= sw[3], 'strokeWeight monotonic (' + sw.join(',') + ')');

    const m = [1,5,10,50].map(r => Economy.repeatMultiplier(r));
    assert(m[0] === 1, 'repeatMultiplier(1) === 1');
    assert(m[0] > m[1] && m[1] > m[2] && m[2] > m[3], 'repeatMultiplier strictly decreasing');
    assert(m[3] >= Economy.REPEAT_FLOOR, 'repeatMultiplier respects floor');

    const solo = Economy.MIN_XP + Economy.strokeWeight(5) * Economy.CHARACTER_BASE_XP;
    const phrase = Economy.phraseCompletionXP([solo], false, 0);
    assert(phrase > solo, 'phrase [' + solo + '] = ' + phrase + ' > solo');

    const low = Economy.battleReward({name:'a',level:1}, true);
    const high = Economy.battleReward({name:'b',level:5}, true);
    const lowRepeat = Economy.battleReward({name:'a',level:1}, false);
    assert(high > low, 'battle XP scales with opponent level (' + low + ' -> ' + high + ')');
    assert(low >= lowRepeat, 'capture bonus >= rebattle bonus');

    console.log('Robustness:');
    assert(!new Character('X', {strokes:3}).addXP(NaN), 'Character.addXP(NaN) safe');
    assert(!new Character('X', {strokes:3}).addXP('NaN'), 'Character.addXP(\\'NaN\\') safe');

    const p = new Player({xp: 50, level: 1});
    p.addXP(-100);
    assert(p.xp >= 0, 'Player.addXP(negative) does not reduce XP (xp=' + p.xp + ')');
    const p2 = new Player({xp: 0, level: 1});
    p2.addXP(NaN);
    assert(p2.xp === 0 && p2.level === 1, 'Player.addXP(NaN) no-op');

    const c = new Character('好', {strokes: 6});
    const r1 = c.recordPractice(0, 100, 20000);
    const r2 = c.recordPractice(0, 100, 20000);
    for (let i=0;i<8;i++) c.recordPractice(0,100,20000);
    const r10 = c.recordPractice(0,100,20000);
    console.log('   char XP  session: 1=' + r1.xpGained + ' 2=' + r2.xpGained + ' 10=' + r10.xpGained);
    assert(r1.xpGained > r2.xpGained && r2.xpGained > r10.xpGained,
        'diminishing returns (1 > 2 > 10)');

    const bag = new Bag({ maxSlots: 1 });
    bag.addItem('first', 1);
    const full = bag.addItem('second', 1);
    assert(full.success === false, 'full bag returns success:false');
    assert('item' in full, 'full bag result includes item field');

    const bag2 = new Bag({});
    bag2.addItem('xp_boost_small', 1);
    const target = new Character('你好', {strokes: 6, level: 1, xp: 0});
    bag2.useItem('xp_boost_small', target);
    assert(bag2.items.xp_boost_small === undefined, 'used-up XP-boost item removed from bag');
    const bag2b = new Bag({});
    assert(bag2b.useItem('nope', null).success === false, 'useItem on missing item returns success:false');

    const c10 = new Character('你', {strokes: 7, level: 9, xp: 900});
    const beforeLevel = c10.level;
    c10.addXP(1000000);
    assert(c10.level === 10 && c10.xp === 0, 'Character maxes at level 10, xp reset to 0 (level=' + c10.level + ', xp=' + c10.xp + ')');

    console.log('');
    console.log('=== ' + pass + ' passed / ' + fail + ' failed ===');
    return fail === 0;
})()
`;

const ok = vm.runInContext(testScript, sandbox);
process.exit(ok ? 0 : 1);
