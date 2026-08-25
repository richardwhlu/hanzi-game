// Tests for Round 2: distinct-char battle unlock, set-bound opponents.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const mkSandbox = () => {
    const lsBacking = {};
    const sandbox = {
        console,
        localStorage: {
            getItem: k => lsBacking[k] || null,
            setItem: (k, v) => { lsBacking[k] = String(v); },
            removeItem: k => { delete lsBacking[k]; },
        },
        document: {
            addEventListener(){}, querySelectorAll(){return[]},
            createElement(){return {style:{},classList:{add(){},remove(){}},addEventListener(){},appendChild(){},setAttribute(){}}},
            body: {appendChild(){}}, head: {appendChild(){}},
        },
        window: {addEventListener(){}}, navigator: {userAgent:'test'},
        Date, Math, JSON, Object, Array, Number, String, Boolean, Error,
        confirm(){return true}, alert(){}, setTimeout: ()=>0, clearTimeout: ()=>{}
    };
    sandbox.globalThis = sandbox;
    return { sandbox, lsBacking };
};

// ---------- Test 1: PracticeTracker v2 ----------
{
    const lsBacking2 = {};
    const sandbox = {
        console,
        localStorage: {
            getItem: k => lsBacking2[k] || null,
            setItem: (k, v) => { lsBacking2[k] = String(v); },
            removeItem: k => { delete lsBacking2[k]; },
        },
        Date, Math, JSON, Object, Array, Number, String, Error,
        setTimeout: ()=>0, clearTimeout: ()=>{},
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'practice-tracker.js'), 'utf8'), sandbox);

    let pass = 0, fail = 0;
    const assert = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

    const t = new vm.runInContext('new PracticeTracker()', sandbox);

    assert(t.REQUIRED_DISTINCT === 10, 'requires 10 distinct characters');

    // Spam the same easy character 20 times -> still 1 distinct, NOT unlocked
    for (let i = 0; i < 20; i++) {
        t.incrementPracticeCount({ character: '你' });
    }
    assert(t.distinctTrained() === 1, 'spaming 你 20 times counts as ONE distinct char');
    assert(!t.isBattleUnlocked(), 'battles NOT unlocked by spamming one char (x20)');
    assert(t.getPracticesRemaining() === 9, '9 distinct still needed');

    // Train 9 more distinct chars -> unlocked
    const chars = ['好','我','是','的','了','他','在','有','个',];
    let justUnlocked = false;
    for (const c of chars) {
        const r = t.incrementPracticeCount({ character: c });
        if (r.justUnlocked) justUnlocked = true;
    }
    assert(t.distinctTrained() === 10, '10 distinct chars recorded');
    assert(t.isBattleUnlocked(), 'battles unlocked at 10 distinct');
    assert(justUnlocked, 'justUnlocked fired on the 10th distinct');
    assert(t.getPracticesRemaining() === 0, '0 remaining once unlocked');

    // Re-practicing an already-trained char: no new progress (already at cap)
    const before = t.distinctTrained();
    t.incrementPracticeCount({ character: '你' });
    assert(t.distinctTrained() === before, 'repeat practice does not inflate distinct count');

    // Phrase practice marks ALL its characters as distinct — use a fresh
    // storage + context so the previous 你 doesn't pollute.
    const lsBacking3 = {};
    const sandboxPhrase = {
        console,
        localStorage: {
            getItem: k => lsBacking3[k] || null,
            setItem: (k, v) => { lsBacking3[k] = String(v); },
            removeItem: k => { delete lsBacking3[k]; },
        },
        Date, Math, JSON, Object, Array, Number, String, Error,
        setTimeout: ()=>0, clearTimeout: ()=>{},
    };
    sandboxPhrase.globalThis = sandboxPhrase;
    vm.createContext(sandboxPhrase);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'practice-tracker.js'), 'utf8'), sandboxPhrase);
    const t2 = new vm.runInContext('new PracticeTracker()', sandboxPhrase);
    t2.incrementPracticeCount({ character: null, phrase: '我们', isPhrasePractice: true });
    assert(t2.distinctTrained() === 2, 'phrase 我们 counts as 2 distinct chars (我 + 们)');
    assert(t2.trainedChars['我'] && t2.trainedChars['们'], 'both component chars recorded');

    // v1 migration: old save with practiceCount=7 gets 7 credit.
    // (Clear store first — previous tests left 10 real chars in it.)
    delete lsBacking2['hanzi-game-practice-tracker'];
    lsBacking2['hanzi-game-practice-tracker'] = JSON.stringify({
        practiceCount: 7, battleUnlocked: false, congratulationShown: false,
        battleUsageCount: 0, practicesSinceBattle: 7
    });
    const t3 = new vm.runInContext('new PracticeTracker()', sandbox);
    assert(t3.distinctTrained() === 7, 'v1 save with 7 sessions migrates to 7 credit');
    assert(!t3.isBattleUnlocked(), 'migrated v1 save still needs 3 more');
    t3.incrementPracticeCount({ character: 'A' });
    t3.incrementPracticeCount({ character: 'B' });
    t3.incrementPracticeCount({ character: 'C' });
    assert(t3.isBattleUnlocked(), '3 more REAL distinct chars finish the unlock after migration');

    console.log('=== tracker: ' + pass + ' passed / ' + fail + ' failed ===');
    if (fail) process.exitCode = 1;
}

// ---------- Test 2: Opponents only from owned set ----------
{
    const { sandbox } = mkSandbox();
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
        // Kid owns exactly these characters — the 3 starters + a few more.
        // (Opponents may be ANY of the kid's owned characters.)
        g.characters['一'] = new Character('一', {strokes:1, level:2, xp:0});
        g.characters['二'] = new Character('二', {strokes:2, level:1, xp:0});
        g.characters['三'] = new Character('三', {strokes:3, level:3, xp:0});
        g.phrases = {};
        const owned = new Set(['你','好','我','一','二','三']);

        // Battle 80 opponents — EVERY name must be from the owned set
        let allOwned = true;
        const seen = new Set();
        for (let i = 0; i < 80; i++) {
            const o = g.generateWildOpponent();
            seen.add(o.name);
            if (!owned.has(o.name)) { allOwned = false; }
        }
        __assert__(allOwned, 'all 80 wild opponents from owned set (saw: ' + [...seen].join('') + ')');
        __assert__(!(g.characters['龙']) && !(g.characters['魔']), 'no mystery characters leaked into the set');

        // Empty-set fallback: no crash, no capture, flagged
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
