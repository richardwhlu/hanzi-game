/**
 * Regression test: blank-slate writer must not break handwriting input.
 *
 * ROOT CAUSE (fixed by 47510f8 follow-up):
 *   game-engine.js passed `radicalColor: 'transparent'` to HanziWriter.
 *   hanzi-writer 3.5.0 validates color strings to hex or r[g]ba(...) and
 *   throws "Invalid color: transparent" DURING the (async) char-data load,
 *   which rejects the writer's data promise. `quiz()` then throws the
 *   same error, `writer._quiz` is never set, and every pointer event
 *   hits the `this._quiz && ...` guard and does nothing — the canvas
 *   looks blank AND ignores all input ("I can't write any strokes").
 *   Because create() itself succeeds and the error only surfaces async,
 *   a smoke-test can miss it.
 *
 * FIX: drop the radicalColor override entirely. `showCharacter: false`
 * hides the main character group and `showOutline: false` hides the
 * faint outline, so no invisible-color trickery is needed at all.
 *
 * HOW TO RUN:
 *   1. Download hanzi-writer 3.5.0:
 *        curl -o /tmp/hw.min.js https://unpkg.com/hanzi-writer@3.5.0/dist/hanzi-writer.min.js
 *   2. Install jsdom in /tmp/hw-test:
 *        mkdir -p /tmp/hw-test && cd /tmp/hw-test && npm init -y >/dev/null && npm i jsdom
 *   3. Run:
 *        node test-blank-slate.js /tmp/hw.min.js /tmp/hw-test/node_modules/jsdom
 *
 * Without the env args it prints a setup hint and exits 1 (so a CI that
 * just runs `node test-blank-slate.js` gets an explainable failure).
 */
/* global HanziWriter */
const path = require('path');
const fs = require('fs');

const HW_MIN = process.argv[2];
const JSDOM_DIR = process.argv[3] || '/tmp/hw-test/node_modules/jsdom';

if (!HW_MIN || !fs.existsSync(HW_MIN)) {
    console.error('Missing hanzi-writer min.js. Run:');
    console.error('  curl -o /tmp/hw.min.js https://unpkg.com/hanzi-writer@3.5.0/dist/hanzi-writer.min.js');
    console.error('  mkdir -p /tmp/hw-test && cd /tmp/hw-test && npm init -y && npm i jsdom');
    console.error('  node ' + __filename + ' /tmp/hw.min.js');
    process.exit(1);
}

const { JSDOM } = require(JSDOM_DIR);

function mkDom(id) {
    const dom = new JSDOM(`<body><div id="${id}"></div></body>`, {
        url: 'http://localhost/', runScripts: 'outside-only'
    });
    dom.window.eval(fs.readFileSync(HW_MIN, 'utf8') + '\n;window.HanziWriter = HanziWriter;');
    if (!dom.window.HanziWriter) throw new Error('HanziWriter global missing after eval');
    return dom.window;
}

// Valid v2.0 format: one horizontal stroke (一-shaped)
const P0 = [100, 256], P1 = [924, 256];
const stubData = {
    character: '一', pinyin: 'yī',
    strokes: [{ path: `M ${P0[0]} ${P0[1]} L ${P1[0]} ${P1[1]}`, points: [P0, P1] }],
    medians: [[P0, P1]]
};
const stubLoader = (char, resolve, reject) => { resolve(stubData); };

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

async function main() {
    // ---- A: the OLD broken config must reproduce the dead-quiz bug ----
    {
        const window = mkDom('broken');
        const writer = window.HanziWriter.create(window.document.getElementById('broken'), '一', {
            width: 300, height: 300, padding: 20,
            showCharacter: false,
            strokeColor: '#222',
            radicalColor: 'transparent',   // <-- the line that broke the app in 47510f8
            showHintAfterMisses: 3, leniency: 1.2,
            charDataLoader: stubLoader,
            onMistake: () => {}, onCorrectStroke: () => {}, onComplete: () => {}
        });
        assert(!!writer, 'A: create() returns the writer (failure is async and invisible at create time)');
        let loadErr = null;
        try { await writer._withDataPromise; } catch (e) { loadErr = e.message; }
        assert(loadErr && /Invalid color: ?transparent/i.test(loadErr),
            `A: data-load chain rejects with "Invalid color: transparent" (got: ${loadErr})`);
        let quizErr = null;
        try { await writer.quiz(); } catch (e) { quizErr = e.message; }
        assert(!writer._quiz,
            `A: quiz() never arms after the rejected load -> canvas ignores input (err: ${quizErr || ''}) — the reported bug`);
    }

    // ---- B: THE CONFIG game-engine.js USES NOW must work ----
    {
        const window = mkDom('fixed');
        const writer = window.HanziWriter.create(window.document.getElementById('fixed'), '一', {
            width: 300, height: 300, padding: 20,
            strokeAnimationSpeed: 1, delayBetweenStrokes: 100, strokeHighlightSpeed: 2,
            showCharacter: false,
            showOutline: false,
            strokeColor: '#222',
            showHintAfterMisses: 3, leniency: 1.2, acceptBackwardsStrokes: false,
            charDataLoader: stubLoader,
            onMistake: () => {}, onCorrectStroke: () => {}, onComplete: () => {}
        });
        let loadErr = null;
        try { await writer._withDataPromise; } catch (e) { loadErr = e.message; }
        assert(!loadErr, `B: data load succeeds with the fixed config (err: ${loadErr || 'none'})`);

        await writer.quiz();
        assert(!!writer._quiz, 'B: quiz() arms the drawing pipeline');

        const st = writer._renderState.state;
        const strokeOpacities = Object.values(st.character.main.strokes).map(s => s.opacity);
        const blank = st.character.main.opacity === 0 ||
                      (strokeOpacities.length > 0 && strokeOpacities.every(o => o === 0));
        assert(blank, `B: starts BLANK (group.opacity=${st.character.main.opacity}, strokes=${JSON.stringify(strokeOpacities)})`);

        let verdict = null;
        writer._quiz._options = Object.assign({}, writer._quiz._options, {
            onCorrectStroke: () => { verdict = 'correct'; },
            onMistake: () => { verdict = verdict || 'mistake'; }
        });
        writer._quiz.startUserStroke({ x: 60, y: 150 });
        writer._quiz.continueUserStroke({ x: 150, y: 152 });
        writer._quiz.continueUserStroke({ x: 240, y: 150 });
        writer._quiz.endUserStroke();
        await new Promise(r => setTimeout(r, 30));
        assert(verdict === 'correct' || verdict === 'mistake',
            `B: pointer input is JUDGED (verdict: ${verdict || 'none — input dead!'})`);
    }

    console.log(`\n=== blank-slate regression: ${pass} passed / ${fail} failed ===`);
    process.exitCode = fail ? 1 : 0;
}
main().catch(e => { console.error('HARNESS ERROR', e); process.exitCode = 2; });
