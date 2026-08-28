// End-to-end test of the Grand Trials system (engine methods + rewards)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
    console, localStorage: { getItem(){return null}, setItem(){}, removeItem(){} },
    document: {
        addEventListener(){}, querySelectorAll(){return[]},
        createElement(){return {style:{},classList:{add(){},remove(){}},addEventListener(){},appendChild(){}}},
        body: {appendChild(){}, insertAdjacentHTML(){}}, head: {appendChild(){}}
    },
    window: {addEventListener(){}}, navigator: {userAgent:'test'},
    Date, Math, JSON, Object, Array, Number, String, Error,
    confirm(){return true}, alert(){}, setTimeout: ()=>0, clearTimeout: ()=>{},
    process
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ['game-data.js', 'data-manager.js', 'game-engine.js', 'grand-trials.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), sandbox, { filename: path.join(__dirname, f) });
}

const script = `
(() => {
    let pass = 0, fail = 0;
    const assert = (c, m) => { if (c) { pass++; console.log('  OK   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

    const g = new HanziGame();
    g.player = new Player({});
    g.bag = new Bag({});

    // Build a roster: 8 characters at mixed levels (some at 4, some at 9)
    const mk = (c, lv) => g.characters[c] = new Character(c, Object.assign({}, {strokes: 8, difficulty: 2, frequency: 80, level: lv, xp: 0, totalBattles: 0}), {});
    ['你','好','我','是','的','一','不','在'].forEach((c, i) => {
        const ch = new Character(c, {pinyin:'x', strokes: 6+i, difficulty: 1+ (i%3), frequency: 80, level: (i < 3) ? 4 : 9, xp: 0});
        g.characters[c] = ch;
    });

    console.log('— trial summary / availability —');
    let summary = g.getTrialSummary();
    assert(summary.length === GRAND_TRIAL_SETS.length, 'three trial sets available');
    assert(summary[0].available === true, 'set 0 always available');
    assert(summary[1].available === false, 'set 1 locked until set 0 fully cleared');
    assert(summary[0].nextTrialIdx === 0, 'next trial of set 0 starts at 0');
    assert(summary[0].trials[0].level === 2, 'first trial locked at level 2');
    assert(summary[0].trials[4].level === 9, 'fifth trial locked near max (level 9)');
    assert(summary[2].trials[4].level === 10, 'champion final locked at 10');

    console.log('— enemy team building —');
    const team = g.buildTrialEnemyTeam(0, 4);
    assert(team.length === 6, 'trial enemy team is 6 strong');
    assert(team.every(e => e.level === 9), 'all guardians at fixed level 9');
    assert(team.every(e => e.noCapture === true), 'trial enemies are not capturable');
    assert(team.every(e => e.trialElite === true), 'trial enemies flagged elite');
    assert(team.every(e => e.currentHP === e.maxHP), 'guardians start at full HP');
    // Elite HP should be well under raw HP — paced fight
    const rawHP9 = 20 + 8*3 + (9-1)*5;
    assert(team[0].maxHP < rawHP9, 'elite HP scaled DOWN (' + team[0].maxHP + ' < ' + rawHP9 + ')');
    const rawAtk9 = 10 + (10 - Math.floor(80/10)) + (9-1)*2;
    assert(team[0].attack > rawAtk9, 'elite ATK scaled UP (' + team[0].attack + ' > ' + rawAtk9 + ')');

    console.log('— team reflects roster (own characters only) —');
    const names = new Set(team.map(e => e.char));
    for (const n of names) {
        assert(g.characters[n] !== undefined, 'guardian ' + n + ' is from the player\\'s roster');
    }

    console.log('— rewards / progression —');
    const xpBefore = g.player.xp;
    const r1 = g.recordTrialResult(0, 0, true);
    assert(r1.firstWin === true, 'first win flagged');
    assert(r1.xp >= 60 + 2*10, 'first trial reward >= base+level = ' + (r1.xp));
    assert(g.player.xp > xpBefore, 'player XP increased on win');
    assert(r1.itemId === 'xp_boost_small', 'prize item granted (' + r1.itemId + ')');
    const s0 = g.getTrialSummary()[0];
    assert(s0.clearedCount === 1 && s0.nextTrialIdx === 1, 'progress advances to trial 2');

    // Re-fight: should taper, NOT be a first win
    const xpBefore2 = g.player.xp;
    const r1b = g.recordTrialResult(0, 0, true);
    assert(r1b.firstWin === false, 're-fight not flagged as first win');
    assert(r1b.xp < r1.xp, 're-fight XP tapered (' + r1b.xp + ' < ' + r1.xp + ')');

    // Loss: no reward, no clearing
    const clearedCountBefore = g.getTrialSummary()[0].clearedCount;
    const rLose = g.recordTrialResult(0, 2, false);
    assert(rLose.xp === 0, 'loss awards no XP');
    assert(g.getTrialSummary()[0].clearedCount === clearedCountBefore, 'loss does not clear a trial');

    console.log('— clear set 0, unlock set 1 —');
    for (let i = 0; i < 5; i++) g.recordTrialResult(0, i, true);
    const s0b = g.getTrialSummary()[0];
    assert(s0b.allCleared === true, 'set 0 fully cleared');
    assert(g.isTrialSetAvailable(1) === true, 'set 1 now unlocked');
    assert(g.isTrialSetAvailable(2) === false, 'set 2 still locked');
    // Clear set 1 to unlock set 2
    for (let i = 0; i < 5; i++) g.recordTrialResult(1, i, true);
    assert(g.isTrialSetAvailable(2) === true, 'set 2 now unlocked');

    console.log('— persistence shape —');
    assert(g.player.trialProgress && g.player.trialProgress['0'].cleared.length === 5, 'progress serialized on player');
    const json = g.player.toJSON();
    assert(json.trialProgress && json.trialProgress['1'], 'trialProgress in player JSON export');
    const restored = new Player(json);
    assert(restored.trialProgress['0'].cleared[0] === true, 'restored player keeps cleared trials');

    console.log('');
    console.log(pass + ' passed, ' + fail + ' failed');
    process.exit(fail > 0 ? 1 : 0);
})()
`;

try {
    vm.runInContext(script, sandbox, { filename: 'test-trials-body.js' });
} catch (e) {
    console.error('TEST CRASHED:', e.message);
    process.exit(1);
}
