// End-to-end test of the battle XP flow (engine.addDefeatedOpponent)
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
    confirm(){return true}, alert(){}, setTimeout: ()=>0, clearTimeout: ()=>{}
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ['game-data.js', 'data-manager.js', 'game-engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), sandbox, { filename: path.join(__dirname, f) });
}

const script = `
(() => {
    let pass = 0, fail = 0;
    const assert = (c, m) => { if (c) { pass++; console.log('  OK  '+m); } else { fail++; console.log('  FAIL '+m); } };

    const g = new HanziGame();
    g.player = new Player({});
    // Pre-register a few "starter" characters so an opponent is not new to the player
    g.characters['你'] = new Character('你', {strokes: 7, level: 2, xp: 0, totalBattles: 0});
    g.characters['好'] = new Character('好', {strokes: 6, level: 1, xp: 0, totalBattles: 0});
    g.phrases = {};
    g.bag = new Bag({});

    // Scenario A: fight a new (unowned) character — should be a capture
    const opponentA = { name: '戴', originalData: {pinyin:'dài',strokes:17,difficulty:4,frequency:80}, isPhrase: false, level: 3 };
    const fighterA = g.characters['你'];
    const beforePlayerXP = g.player.xp;
    const beforeFighterXP = fighterA.xp;
    const resultA = g.addDefeatedOpponent(opponentA, fighterA);
    assert(resultA.isNewCapture === true, 'new enemy is isNewCapture=true');
    assert((g.characters['戴']) !== undefined, 'captured character is added to collection');
    assert(g.player.xp >= beforePlayerXP + 8*3, 'player XP rises by ~8*level (=' + (g.player.xp - beforePlayerXP) + ')');
    assert(fighterA.xp > beforeFighterXP, 'fighter also earns battle XP');
    assert(typeof resultA.battleXP === 'number' && resultA.battleXP >= Economy.MIN_XP, 'battleXP is a positive number');

    // Scenario B: fight an already-owned character — NOT a capture, less XP
    const opponentB = { name: '戴', originalData: {pinyin:'dài',strokes:17,difficulty:4,frequency:80}, isPhrase: false, level: 3 };
    const beforeCapture = g.player.xp;
    const resultB = g.addDefeatedOpponent(opponentB, fighterA);
    assert(resultB.isNewCapture === false, 'rerun battle is not a new capture');
    assert(g.player.xp - beforeCapture < resultA.battleXP, 'rerun battle gives less than capture');

    // Scenario C: fight a new phrase
    const opponentC = { name: '我是', originalData: {characters:['我','是'], requirements:{我:1,是:1}, pinyin:'wǒ shì', meaning:'I am', difficulty:1, frequency:50}, isPhrase: true, level: 2 };
    g.characters['我'] = new Character('我', {strokes: 7, level: 2, xp: 0, totalBattles: 0});
    g.characters['是'] = new Character('是', {strokes: 9, level: 2, xp: 0, totalBattles: 0});
    const phrasesBefore = g.player.totalPhrases;
    const resultC = g.addDefeatedOpponent(opponentC, g.characters['你']);
    assert(resultC.type === 'phrase', 'phrase battle type == phrase');
    assert(resultC.isNewCapture === true, 'new phrase is a new capture');
    assert(g.player.totalPhrases === phrasesBefore + 1, 'totalPhrases incremented once');
    // Rerun: should NOT increment again
    const resultD = g.addDefeatedOpponent(opponentC, g.characters['你']);
    assert(resultD.isNewCapture === false, 're-battling a known phrase is not new');
    assert(g.player.totalPhrases === phrasesBefore + 1, 'totalPhrases NOT re-incremented');
    assert(typeof resultC.battleXP === 'number', 'phrase battle awarded XP');

    // Scenario E: totalPhrases consistency (BUG B4 regression)
    const expected = Object.values(g.phrases).filter(p => p.unlocked).length;
    assert(g.player.totalPhrases === expected, 'player.totalPhrases matches number of unlocked phrases: ' + g.player.totalPhrases + ' === ' + expected);

    // Scenario F: getGameStats no longer NaNs on empty game
    const g2 = new HanziGame();
    g2.player = new Player({});
    g2.characters = {};
    const stats = g2.getGameStats();
    assert(typeof stats.averageAccuracy === 'number' && !Number.isNaN(stats.averageAccuracy), 'getGameStats() on empty game gives finite averageAccuracy');

    console.log('');
    console.log('=== ' + pass + ' passed / ' + fail + ' failed ===');
    return fail === 0;
})()
`;

const ok = vm.runInContext(script, sandbox);
process.exit(ok ? 0 : 1);
