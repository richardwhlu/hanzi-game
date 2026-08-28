// Regression test: tracker keyed by a Character OBJECT (not a string) used
// to coerce to "[object Object]", freezing the distinct counter at 1/10 and
// producing "[object Object] is already trained this round" popups every
// time a NEW character was trained. See bug report 2026-08-26.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { console, Date, Math, JSON, Object, Array, Number, String, Boolean, Error,
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } } };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'practice-tracker.js'), 'utf8'), sandbox);

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL: ' + m); } };

const t = vm.runInContext('new PracticeTracker()', sandbox);
const mkChar = (ch) => ({ char: ch, pinyin: 'x' + ch, level: 1 }); // a Character-like object

// The exact reported scenario: pass OBJECTS for 10 distinct chars.
let sawObjPopup = false;
for (let i = 1; i <= 10; i++) {
    const r = t.incrementPracticeCount({ character: mkChar(String(i)) });
    if (r.message && r.message.includes('[object Object]')) sawObjPopup = true;
}
assert(t.roundDistinct() === 10, '10 object-passed chars count as 10 distinct');
assert(t.isBattleUnlocked(), 'battle unlocks after 10 distinct (objects accepted)');
assert(!sawObjPopup, 'no "[object Object]" text ever in the progress message');
assert(t.trainedChars['[object Object]'] === undefined, 'no [object Object] key in state');

// Repeat practice of an already-seen char still stays "new=false"
const r = t.incrementPracticeCount({ character: mkChar('1') });
assert(t.roundDistinct() === 10, 'repeat char does not inflate');
assert(r.isNewChar === false, 'repeat char flagged as not-new');

// Round reset still works after the fix
t.recordBattleUsed();
assert(!t.isBattleUnlocked() && t.roundDistinct() === 0, 'battle re-locks and round resets to 0');

// Migration: a save polluted by the old bug (fake "[object Object]" key)
// must be purged on load — the child starts from a true 0, not a frozen 1.
sandbox.localStorage._d['hanzi-game-practice-tracker'] = JSON.stringify({
    v3: true,
    trainedChars: { '[object Object]': 123, 好: 123 },
    roundChars: ['[object Object]', '好'],
    battleUsageCount: 0,
    practiceCount: 5
});
const m = vm.runInContext('new PracticeTracker()', sandbox);
assert(!m.trainedChars['[object Object]'], 'polluted [object Object] key purged from trainedChars');
assert(!m.roundChars.has('[object Object)'), 'polluted [object Object] key purged from roundChars');
assert(m.roundDistinct() === 1 && m.roundChars.has('好'), 'round keeps only the genuinely trained chars (1/10)');
assert(!m.isBattleUnlocked(), 'battle is locked after migration (polluted key counted nothing)');

// A legitimate internal credit key must survive the purge
sandbox.localStorage._d['hanzi-game-practice-tracker'] = JSON.stringify({
    v3: true, trainedChars: { __v1_credit_0: 1, __v1_credit_1: 1 },
    roundChars: ['__v1_credit_0', '__v1_credit_1'], battleUsageCount: 1
});
const m2 = vm.runInContext('new PracticeTracker()', sandbox);
assert(m2.roundDistinct() === 2, 'legitimate internal keys (__v1_credit_N) survive the purge');

console.log('=== tracker object-char regression: ' + pass + ' passed / ' + fail + ' failed ===');
if (fail) process.exitCode = 1;
