// Tests for Round 2 + v3: distinct-char battle unlock, per-round re-lock,
// opponents restricted to the kid's owned set.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function mkContext() {
    const lsBacking = {};
    const sandbox = {
        console,
        localStorage: {
            getItem: k => lsBacking[k] || null,
            setItem: (k, v) => { lsBacking[k] = String(v); },
            removeItem: k => { delete lsBacking[k]; },
        },
        Date, Math, JSON, Object, Array, Number, String, Boolean, Error,
        setTimeout: () => 0, clearTimeout: () => {}
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'practice-tracker.js'), 'utf8'), sandbox);
    return { sandbox, lsBacking };
}

const TKEY = 'hanzi-game-practice-tracker';

// ---------- Test 1: PracticeTracker v3 ----------
{
    const { sandbox, lsBacking } = mkContext();
    let pass = 0, fail = 0;
    const assert = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  FAIL ' + m); } };
    const T = () => vm.runInContext('new PracticeTracker()', sandbox);

    const t = T();
    assert(t.REQUIRED_DISTINCT === 10, 'requires 10 distinct characters per round');

    // Spam one character 20 times -> 1 distinct, locked
    for (let i = 0; i < 20; i++) t.incrementPracticeCount({ character: '你' });
    assert(t.roundDistinct() === 1, 'spaming 你 x20 stays at ONE distinct char this round');
    assert(!t.isBattleUnlocked(), 'spams of one char do NOT unlock battle');
    assert(t.getPracticesRemaining() === 9, '9 distinct still needed');
    assert(t.getBattleProgressCount() === 1, 'bar shows 1 (never >10)');

    // Repeat practice does not inflate
    t.incrementPracticeCount({ character: '你' });
    assert(t.roundDistinct() === 1, 'repeat practice still 1 distinct');

    // 9 more distinct -> unlocked at the 10th
    let justUnlocked = false;
    for (const c of ['好','我','是','的','了','他','在','有','个']) {
        const r = t.incrementPracticeCount({ character: c });
        if (r.justUnlocked) justUnlocked = true;
    }
    assert(t.roundDistinct() === 10, '10 distinct chars this round');
    assert(t.isBattleUnlocked(), 'battle unlocked at 10 distinct');
    assert(justUnlocked, 'justUnlocked fired on the 10th distinct');

    // v3 RE-LOCK: battle used -> round resets to 0, counter must not exceed 10/10
    t.recordBattleUsed();
    assert(!t.isBattleUnlocked(), 'battle re-locks after use (v3)');
    assert(t.roundDistinct() === 0, 'round resets to 0 after battle (v3)');
    assert(t.getBattleProgressCount() === 0, 'bar back to 0 after battle (v3)');
    assert(t.lifetimeDistinct() >= 10, 'lifetime set preserved (stats)');

    // Second round: after the reset, PREVIOUSLY-trained chars count as
    // fresh again — intentional! (Requiring brand-new chars forever would
    // soft-lock a kid whose set is exactly 10.) Spamming is still blocked
    // because each char counts only ONCE per round.
    t.incrementPracticeCount({ character: '你' });
    assert(t.roundDistinct() === 1, 'already-known char counts again in the NEW round (soft-lock prevention)');
    assert(!t.isBattleUnlocked(), '1/10 is not enough in round 2');
    const R2 = ['㐀','㐁','㐂','㐃','㐄','㐅','㐆','㐇']; // 8 fresh chars (disjoint pools)
    for (const c of R2) t.incrementPracticeCount({ character: c });
    assert(t.roundDistinct() === 9, 'round 2: 9/10 recorded');
    assert(!t.isBattleUnlocked(), 'round 2: 9/10 is not enough');
    assert(t.getPracticesRemaining() === 1, 'exactly 1 remaining in round 2');
    const r10 = t.incrementPracticeCount({ character: '㐈' }); // 10th
    assert(t.isBattleUnlocked() && r10.justUnlocked, 'round 2 unlocks at exactly 10 distinct');

    // Cap: bar MUST never display over 10/10 regardless of how much is trained
    for (let i = 0; i < 25; i++) t.incrementPracticeCount({ character: String.fromCharCode(10000 + i) });
    assert(t.roundDistinct() > 10, 'internally the round can hold >10 (harmless)');
    assert(t.getBattleProgressCount() === 10, 'display capped at 10/10 (never 12/10 etc)');
    assert(t.getStatus().distinctTrained === 10, 'getStatus distinctTrained capped at 10');
    assert(t.getProgressPercentage() === 100, 'progress % capped at 100');

    // ---------- Phrase counts every component, in a FRESH store ----------
    const { sandbox: sp, lsBacking: lp } = mkContext();
    const t2 = vm.runInContext('new PracticeTracker()', sp);
    t2.incrementPracticeCount({ character: null, phrase: '我们', isPhrasePractice: true });
    assert(t2.roundDistinct() === 2, 'phrase 我们 counts as 2 distinct chars (我 + 们)');
    assert(t2.roundChars.has('我') && t2.roundChars.has('们'), 'both phrase components recorded');

    // ---------- v1 migration: raw sessions become round credit, mid-round ----------
    delete lsBacking[TKEY];
    lsBacking[TKEY] = JSON.stringify({ practiceCount: 7, battleUnlocked: false, battleUsageCount: 0 });
    const t3 = vm.runInContext('new PracticeTracker()', sandbox);
    assert(t3.roundDistinct() === 7, 'v1 save (7 sessions) grants 7 credit this round');
    assert(!t3.isBattleUnlocked(), 'v1-migrated save still needs 3 more');
    let v1Just = false;
    for (const c of ['甲','乙','丙']) {
        const r = t3.incrementPracticeCount({ character: c });
        if (r.justUnlocked) v1Just = true;
    }
    assert(t3.roundDistinct() === 10 && t3.isBattleUnlocked(), '7 credit + 3 real new = 10 total -> unlocked');
    assert(v1Just, 'justUnlocked fired on the 10th total');

    // ---------- v2 migration: battle already used -> round restarts fresh ----------
    delete lsBacking[TKEY];
    lsBacking[TKEY] = JSON.stringify({
        v3: false,
        trainedChars: { 你: 1, 好: 1, 我: 1, 是: 1, 的: 1, 了: 1, 他: 1, 在: 1, 有: 1, 个: 1 },
        battleUsageCount: 1, battleUnlocked: true
    });
    const t4 = vm.runInContext('new PracticeTracker()', sandbox);
    assert(t4.roundDistinct() === 0, 'v2 save with a battle already used -> round 0 (re-lock consistent)');
    assert(!t4.isBattleUnlocked(), 'v2 save re-locked after its first battle (v3 invariant)');
    assert(t4.lifetimeDistinct() === 10, 'v2 lifetime set preserved');

    // ---------- v2 migration: no battles yet -> mid-round carry-forward ----------
    delete lsBacking[TKEY];
    lsBacking[TKEY] = JSON.stringify({
        v3: false,
        trainedChars: { 你: 1, 好: 1 },
        battleUsageCount: 0, battleUnlocked: false
    });
    const t5 = vm.runInContext('new PracticeTracker()', sandbox);
    assert(t5.roundDistinct() === 2, 'v2 save with battles unused -> round keeps 2 progress');

    console.log('=== tracker v3: ' + pass + ' passed / ' + fail + ' failed ===');
    if (fail) process.exitCode = 1;
}

// ---------- Test 2: Opponents only from owned set ----------
{
    const lsBacking = {};
    const sandbox = {
        console,
        localStorage: {
            getItem: k => lsBacking[k] || null,
            setItem: (k, v) => { lsBacking[k] = String(v); },
            removeItem: k => { delete lsBacking[k]; },
        },
        document: {
            addEventListener() {}, querySelectorAll() { return []; },
            createElement() { return { style:{}, classList:{add(){},remove(){}}, addEventListener(){}, appendChild(){} }; },
            body: { appendChild() {} }, head: { appendChild() {} }
        },
        window: { addEventListener() {} },
        navigator: { userAgent: 'test' },
        Date, Math, JSON, Object, Array, Number, String, Boolean, Error,
        confirm() { return true; }, alert() {}, setTimeout: () => 0, clearTimeout: () => {}
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    for (const f of ['game-data.js', 'data-manager.js', 'game-engine.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), sandbox, { filename: path.join(__dirname, f) });
    }

    let pass = 0, fail = 0;
    const assert = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

    const script = `
    (() => {
        const g = new HanziGame();
        g.player = new Player({});
        g.characters['你'] = new Character('你', {strokes:7, level:2, xp:0});
        g.characters['好'] = new Character('好', {strokes:6, level:1, xp:0});
        g.characters['我'] = new Character('我', {strokes:7, level:3, xp:0});
        g.phrases = {};
        const owned = new Set(['你','好','我']);

        let allOwned = true;
        const seen = new Set();
        for (let i = 0; i < 80; i++) {
            const o = g.generateWildOpponent();
            seen.add(o.name);
            if (!owned.has(o.name)) allOwned = false;
        }
        __assert__(allOwned, 'all 80 wild opponents from the kid\\'s owned set (saw: ' + [...seen].join('') + ')');
        __assert__(!(g.characters['龙']) && !(g.characters['魔']), 'no mystery characters leaked into the set');

        const g2 = new HanziGame();
        g2.player = new Player({});
        g2.characters = {};
        g2.phrases = {};
        const fallback = g2.generateWildOpponent();
        __assert__(fallback.noCapture === true, 'empty-set fallback is flagged noCapture');
        const before = Object.keys(g2.characters).length;
        g2.addDefeatedOpponent(fallback, null);
        __assert__(Object.keys(g2.characters).length === before, 'noCapture opponent NOT added to collection');
        return true;
    })()
    `;
    sandbox.__assert__ = (c, m) => assert(c, m);
    vm.runInContext(script, sandbox);

    console.log('=== opponents: ' + pass + ' passed / ' + fail + ' failed ===');
    if (fail) process.exitCode = 1;
}
