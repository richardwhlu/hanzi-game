// Tests for pre-loaded character packs (workbook chapters)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const packs = (u) => {
    const name = decodeURIComponent(u.split('/').pop());
    const fp = path.join(__dirname, 'vocabulary_packs', name);
    if (!fs.existsSync(fp)) return null;
    return fs.readFileSync(fp, 'utf8');
};

const sandbox = {
    console, localStorage: { getItem(){return null}, setItem(){}, removeItem(){} },
    document: { addEventListener(){}, querySelectorAll(){return[]},
        createElement(){return {style:{},classList:{add(){},remove(){}},addEventListener(){},appendChild(){}}},
        body: {appendChild(){}, insertAdjacentHTML(){}}, head: {appendChild(){}} },
    window: {addEventListener(){}}, navigator: {userAgent:'test'},
    Date, Math, JSON, Object, Array, Number, String, Error, process,
    fetch: async (url) => {
        const text = packs(url);
        if (text === null) return { ok: false, status: 404, json: async () => { throw new Error('not found'); } };
        return { ok: true, json: async () => JSON.parse(text) };
    },
    confirm(){return true}, alert(){}, setTimeout: ()=>0, clearTimeout: ()=>{}
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ['game-data.js', 'data-manager.js', 'game-engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), sandbox, { filename: path.join(__dirname, f) });
}

const script = `
(async () => {
    let pass = 0, fail = 0;
    const assert = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

    // 1. Manifest loads and is normalized
    const dm = new DataManager();
    const list = await dm.loadPacks();
    assert(list.length >= 1, 'packs.json manifest loads (got ' + list.length + ')');
    const fam = list.find(p => p.id === 'family-vocabulary');
    assert(!!fam, 'family-vocabulary present in manifest');
    assert(fam.grade === 3 && fam.lesson === 1, 'family-vocabulary is grade 3 lesson 1');

    // 2. Pack fetch + validation
    const data = await dm.fetchPack('family-vocabulary');
    assert(Object.keys(data.characters).length === 24, 'pack has 24 characters');
    assert(Object.keys(data.phrases).length === 16, 'pack has 16 phrases');

    // 3. importPack persists to custom storage with provenance
    dm.importPack(data, fam);
    assert(dm.getDataSource() === 'custom', 'source switched to custom');
    assert(dm.customPackId === 'family-vocabulary', 'pack id provenance stored');
    assert(dm.customPackName === fam.name, 'pack name provenance stored');

    // 4. Active data resolves through getActiveCharacterData
    assert(Object.keys(dm.getActiveCharacterData()).length === 24, 'active data serves pack characters');
    assert(DataManager.prototype.getActivePhraseData.call(dm) !== undefined, 'active phrase accessor exists');

    // 5. Pack JSON pinyin is clean (no decomposed accents, tone on a vowel)
    const famChars = data.characters;
    let pinyinClean = Object.keys(famChars).every(c => {
        const p = famChars[c].pinyin;
        return p === p.normalize('NFC');
    });
    assert(pinyinClean, 'all pinyin NFC-normalized');

    // 6. Engine adopts the pack as a fresh set
    const g = new HanziGame();
    const before = Object.keys(g.characters).length;
    const r = await g.loadCharacterPack('family-vocabulary');
    assert(r.success === true, 'engine loadCharacterPack succeeds: ' + r.message);
    assert(Object.keys(g.characters).length === 24, 'game now has the pack\\'s 24 characters (was ' + before + ')');
    assert(Object.keys(g.phrases).length === 16, 'game now has the pack\\'s 16 phrases');

    // 7. Family pack contains the expected 女
    assert(typeof g.characters['女'] !== 'undefined', '女 present in adopted pack');

    // 8. Bad id fails gracefully (no throw)
    const bad = await g.loadCharacterPack('no-such-pack');
    assert(bad.success === false, 'unknown pack id returns success:false');
    assert(typeof bad.message === 'string' && bad.message.length > 0, 'unknown pack id has a message');

    console.log('');
    console.log('=== packs: ' + pass + ' passed / ' + fail + ' failed ===');
    if (fail > 0) process.exitCode = 1;
})()
`;

vm.runInContext(script, sandbox, { filename: 'test-packs-script' });
