// Headless end-to-end test of the 6v6 trial battle FLOW (UI game logic).
// Stubs the DOM + a *queued* setTimeout (matching the browser event-loop
// model) to drive GameUI's battle methods and confirm the full loop:
// attack -> KO -> next guardian -> ... -> victory -> rewards -> set unlock.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeEl(tag){const el={children:[],style:{},dataset:{},disabled:false,textContent:'',title:'',scrollTop:0,scrollHeight:0,classList:{_s:new Set(),add(...c){c.forEach(x=>this._s.add(x))},remove(...c){c.forEach(x=>this._s.delete(x))},contains(c){return this._s.has(c)}},appendChild(c){el.children.push(c);return c},removeChild(c){const i=el.children.indexOf(c);if(i>=0)el.children.splice(i,1);},addEventListener(){},removeEventListener(){},setAttribute(){},getAttribute(){return null},querySelectorAll(){return[]},querySelector(){return null},remove(){}};el._h='';Object.defineProperty(el,'innerHTML',{get(){return el._h},set(v){el._h=v;el.children.length=0}});el.parentElement=el;Object.defineProperty(el,'firstChild',{get(){return el.children[0]||null}});return el}
const els = {};
const getEl = id => els[id] || (els[id] = makeEl(id));

// Browser-like timer queue: timers are pushed, not executed inline,
// matching the event loop (attack -> counter -> next guardian hops).
const timerQueue = [];
let timerId = 0;
const sandbox = {
    console,
    localStorage: { getItem(){return null}, setItem(){}, removeItem(){} },
    document: {
        addEventListener(){}, querySelectorAll(){return[]}, querySelector(){return null},
        getElementById: getEl, createElement: t => makeEl(t),
        body: Object.assign(makeEl('body'), { insertAdjacentHTML(){} }),
        head: makeEl('head')
    },
    window: { addEventListener(){} },
    navigator: { userAgent: 'test' },
    Date, Math, JSON, Object, Array, Number, String, Error, RegExp,
    confirm(){return true}, alert(){},
    setTimeout(fn, ms) { timerQueue.push({ id: ++timerId, fn, ms: ms || 0 }); return timerId; },
    clearTimeout(id) { const i = timerQueue.findIndex(t => t.id === id); if (i >= 0) timerQueue.splice(i, 1); }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ['game-data.js', 'practice-tracker.js', 'practice-ui.js', 'data-manager.js', 'game-engine.js', 'grand-trials.js', 'game-ui.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), sandbox, { filename: path.join(__dirname, f) });
}

const failedRef = { failed: false };
const assert = (c, m) => { if (c) console.log('  OK   ' + m);
    else { failedRef.failed = true; console.log('  FAIL ' + m); } };
const drain = (max = 500) => { let n = 0; while (timerQueue.length && n++ < max) timerQueue.shift().fn(); return n; };
sandbox.__assert = assert; sandbox.__drain = drain;

try {
    vm.runInContext(`
    const { __assert: assert, __drain: drain } = globalThis;

    const g = new HanziGame();
    g.bag = new Bag({});
    ['一','个','不','了'].forEach((c, i) => {
        g.characters[c] = new Character(c, {pinyin:'x', strokes: 4+i, difficulty: 1+i%2, frequency: 85, level: 4, xp: 0});
    });

    const ui = new GameUI(g);

    // --- Trial screen renders ---
    ui.refreshTrialsScreen();
    assert(ui.elements.trialsList.children.length === 3, 'trials screen renders 3 set cards');

    // --- Enter trial 1 (Lv 2 guardians) ---
    ui.startTrialBattle(0, 0);
    assert(!!ui.pendingTrial, 'pending trial set before confirm');
    ui.teamSelectionState.selectedCharacters.push(g.characters['一'], g.characters['个'], g.characters['不']);
    ui.confirmTeamSelection();
    assert(ui.pendingTrial === null, 'pending cleared after confirm');
    assert(ui.battleState.mode === 'trial', 'battle state in trial mode');

    const team = ui.battleState.enemyTeam;
    const players = ui.battleState.playerCharacters;
    assert(team.length === 6, 'six guardians present');
    assert(team.every(e => e.level === 2), 'all guardians at fixed Lv 2');
    assert(ui.battleState.currentEnemy === team[0], 'first guardian faces off');
    assert(players.length === 3, 'player brings 3 fighters');
    assert(g.trialProgressOf(0).cleared[0] !== true, 'trial not yet cleared');

    // --- Fight the loop: attack, drain timers (event loop), repeat ---
    let sawRotation = false, ended = 'unknown', rounds = 0;
    while (rounds++ < 300) {
        if (team.every(e => e.currentHP <= 0)) { ended = 'victory'; break; }
        if (players.every(p => p.defeated)) { ended = 'defeat'; break; }
        const enemy = ui.battleState.currentEnemy;
        const player = ui.battleState.currentPlayerCharacter;
        if (!enemy || enemy.currentHP <= 0) { ended = 'no-enemy'; break; }
        if (!player || player.defeated) { ended = 'no-player'; break; }

        ui.executeAttack();
        drain();
        if (team[0].currentHP <= 0 && ui.battleState.currentEnemy !== team[0]) sawRotation = true;
        if (team[1] && team[1].currentHP <= 0 && ui.battleState.currentEnemy !== team[1]) sawRotation = true;
    }
    assert(sawRotation, 'guardians rotate when one falls (6v6 flow)');
    assert(ended === 'victory' || ended === 'defeat', 'battle reached an outcome: ' + ended + ' after ' + (rounds-1) + ' rounds');

    const cleared = g.trialProgressOf(0).cleared[0] === true;
    const wiped = players.every(p => p.defeated);
    assert(cleared === (ended === 'victory'), 'progress state matches outcome (cleared=' + cleared + ')');

    if (cleared) {
        assert(g.trialProgressOf(0).wins[0] >= 1, 'trial wins recorded');
        assert(g.player.xp > 0, 'player earned XP from trial');
        assert(g.bag.getTotalItemCount() >= 1, 'prize item granted to bag');
        assert(g.isTrialSetAvailable(1) === false, 'set 1 still locked (only 1/5 cleared)');
    } else if (wiped) {
        assert(g.trialProgressOf(0).cleared[0] !== true, 'no progress on defeat');
        assert(g.player.xp === 0, 'no XP on defeat');
    }

    // --- Finishing set 0 unlocks set 1 ---
    for (let t = 1; t < 5; t++) g.recordTrialResult(0, t, true);
    assert(g.trialProgressOf(0).allCleared === true, 'set 0 fully cleared');
    assert(g.isTrialSetAvailable(1) === true, 'set 1 unlocked after set 0');
    assert(g.getTrialSummary()[0].nextTrialIdx === null, 'no next trial in a complete set');

    // --- Persistence round-trip ---
    const json = JSON.parse(JSON.stringify(g.player.toJSON()));
    const restored = new Player(json);
    assert(restored.trialProgress && restored.trialProgress['0'].cleared.every(Boolean),
        'cleared trials survive save/load round-trip');
    `, sandbox, { filename: 'trial-flow-body.js' });
} catch (e) {
    console.error('FLOW CRASHED:', e.stack || e.message);
    failedRef.failed = true;
}

console.log('');
console.log(failedRef.failed ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(failedRef.failed ? 1 : 0);
