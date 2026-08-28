// GRAND TRIAL BATTLES
// "Gym leader"-style boss battles: 6v6 teams of elite versions of the
// kid's own characters at a FIXED level per trial. Clear all 5 trials of
// a set to earn its badge and unlock the next set. This gives the game
// "finality" per set — a concrete goal that training characters up to
// the right level makes winnable:
//
//   • Trial 1 (L2): winnable early with a few low-level characters
//   • Trial 2 (L4): only needs a few characters trained to level 4
//   • Trial 5 (L9): needs the strongest characters nearly fully trained
//
// Elite scaling is applied to trial enemies only, so fights stay paced
// for the game's existing damage curve (ATK - DEF + small variance):
//   • HP ×0.4  → each elite falls in ~5-10 player turns, not 40+
//   • ATK ×1.5 → elites hit hard enough to threaten untrained teams
//   • DEF ×0.75 → keeps the game's "damage floor of 1" feeling

const GRAND_TRIAL_SETS = [
    {
        id: 'first',
        name: 'First Trials',
        icon: '🥉',
        intro: 'Five gentle gatekeepers test the basics. A few characters at level 4 is all it takes to clear it.',
        badge: '🥉 Bronze Trial Badge',
        itemRewards: ['xp_boost_small', 'xp_boost_small', 'xp_boost_medium', 'xp_boost_medium', 'xp_boost_large'],
        xpBase: 60,   // per trial, before trial-level scaling
        trials: [
            { name: 'Sprout, the Seedling',   level: 2 },
            { name: 'Ember, the Spark',       level: 4 },
            { name: 'River, the Current',     level: 5 },
            { name: 'Gale, the Whirlwind',    level: 7 },
            { name: 'Bastion, the Wall',      level: 9 }
        ]
    },
    {
        id: 'elite',
        name: 'Elite Trials',
        icon: '🥈',
        intro: 'Sharper guardians. Bring a team that\'s been practiced — several characters at level 7 or above.',
        badge: '🥈 Silver Trial Badge',
        itemRewards: ['xp_boost_medium', 'xp_boost_medium', 'xp_boost_medium', 'xp_boost_large', 'xp_boost_large'],
        xpBase: 90,
        trials: [
            { name: 'Cinder, the Flame',      level: 4 },
            { name: 'Tide, the Surge',        level: 5 },
            { name: 'Storm, the Gale',        level: 7 },
            { name: 'Forge, the Anvil',       level: 8 },
            { name: 'Titan, the Colossus',    level: 10 }
        ]
    },
    {
        id: 'champion',
        name: 'Champion Trials',
        icon: '🥇',
        intro: 'The final gauntlet. Only a fully trained team of your strongest characters can pass it.',
        badge: '🥇 Gold Champion Badge',
        itemRewards: ['xp_boost_medium', 'xp_boost_large', 'xp_boost_large', 'xp_boost_large', 'xp_boost_large'],
        xpBase: 120,
        trials: [
            { name: 'Aegis, the Shield',      level: 6 },
            { name: 'Blaze, the Inferno',     level: 7 },
            { name: 'Quake, the Temblor',     level: 8 },
            { name: 'Void, the Abyss',        level: 10 },
            { name: 'Sovereign, the Emperor', level: 10 }
        ]
    }
];

// Elite stat multipliers applied to trial enemies (see header comment).
const TRIAL_ELITE_SCALING = { hp: 0.4, attack: 1.5, defense: 0.75 };
const TRIAL_TEAM_SIZE = 6;
const MAX_TRIAL_LEVEL = 10;

// XP for fighting a trial (full reward for the first win; re-fights taper).
// Tapering: halves roughly every 2 extra wins, never below 25% — so
// trials can still be re-fought for modest XP, but can't be farmed.
const TRIAL_REPEAT_HALF_LIFE = 2;
const TRIAL_REPEAT_FLOOR = 0.25;

// ---------------------------------------------------------------------------
// Engine integration (added to the HanziGame prototype).
// ---------------------------------------------------------------------------

// Normalize one set's stored progress. Shape on the save file:
//   player.trialProgress[setIdx] = { cleared: [bool x 5], wins: { trialIdx: count } }
HanziGame.prototype.trialProgressOf = function (setIdx) {
    const store = (this.player && this.player.trialProgress) || {};
    const raw = store[String(setIdx)] || {};
    const cleared = Array.isArray(raw.cleared)
        ? raw.cleared.map(b => !!b)
        : [];
    return {
        cleared: cleared,
        clearedCount: cleared.filter(Boolean).length,
        allCleared: cleared.length >= 5 && cleared.every(Boolean),
        wins: raw.wins || {}
    };
};

// All 5 trials of a set must be cleared to unlock the next set.
HanziGame.prototype.isTrialSetAvailable = function (setIdx) {
    if (setIdx === 0) return true;
    return this.trialProgressOf(setIdx - 1).allCleared;
};

// Summary used by the UI — one entry per set.
HanziGame.prototype.getTrialSummary = function () {
    return GRAND_TRIAL_SETS.map((set, setIdx) => {
        const prog = this.trialProgressOf(setIdx);
        let nextTrialIdx = null;
        for (let i = 0; i < set.trials.length; i++) {
            if (!prog.cleared[i]) { nextTrialIdx = i; break; }
        }
        return {
            setIdx: setIdx,
            id: set.id,
            name: set.name,
            icon: set.icon,
            badge: set.badge,
            intro: set.intro,
            available: this.isTrialSetAvailable(setIdx),
            clearedCount: prog.clearedCount,
            allCleared: prog.allCleared,
            nextTrialIdx: nextTrialIdx,
            trials: set.trials.map((t, i) => ({
                trialIdx: i,
                name: t.name,
                level: t.level,
                cleared: !!prog.cleared[i],
                wins: (prog.wins && prog.wins[i]) || 0
            }))
        };
    });
};

// Build the enemy team for a trial from the kid's OWN trained characters,
// so a trial is always "roughly achievable" with the roster at hand:
// the 6 most powerful base characters (padding by repeating the best)
// become elite copies at the trial's fixed level.
HanziGame.prototype.buildTrialEnemyTeam = function (setIdx, trialIdx) {
    const set = GRAND_TRIAL_SETS[setIdx];
    if (!set) return [];
    const trial = set.trials[trialIdx];
    if (!trial) return [];

    const pool = Object.values(this.characters)
        .filter(c => c && c.unlocked !== false && !c.isPhraseCharacter)
        .slice()
        .sort((a, b) => this.trialBasePower(b) - this.trialBasePower(a));

    if (pool.length === 0) return [];

    // Pick up to 6 best; pad by repeating so it's always a full 6v6.
    const roster = [];
    for (let i = 0; i < TRIAL_TEAM_SIZE; i++) {
        roster.push(pool[i % pool.length]);
    }

    const level = Math.min(MAX_TRIAL_LEVEL, Math.max(1, trial.level));
    return roster.map(c => {
        const strokes = c.strokes || 5;
        const difficulty = c.difficulty || 1;
        const frequency = c.frequency || 50;

        // Same stat family as the rest of the game, at the trial level,
        // then elite-scaled so the fight is paced right.
        const baseHP = 20 + strokes * 3 + (level - 1) * 5;
        const baseAttack = 10 + (10 - Math.floor(frequency / 10)) + (level - 1) * 2;
        const baseDefense = 8 + difficulty * 4 + (level - 1) * 2;

        return {
            name: c.char,
            char: c.char,
            pinyin: c.pinyin || '',
            strokes: strokes,
            difficulty: difficulty,
            frequency: frequency,
            isPhrase: false,
            noCapture: true,        // trials never add new characters
            trialElite: true,
            guardian: trial.name,
            level: level,
            maxHP: Math.max(1, Math.round(baseHP * TRIAL_ELITE_SCALING.hp)),
            currentHP: Math.max(1, Math.round(baseHP * TRIAL_ELITE_SCALING.hp)),
            attack: Math.max(1, Math.round(baseAttack * TRIAL_ELITE_SCALING.attack)),
            defense: Math.max(1, Math.round(baseDefense * TRIAL_ELITE_SCALING.defense)),
            originalData: (c.toJSON && c.toJSON()) || {}
        };
    });
};

// "Power at level 1" — used to rank which characters become the enemy team.
HanziGame.prototype.trialBasePower = function (c) {
    const strokes = c.strokes || 5;
    const difficulty = c.difficulty || 1;
    const frequency = c.frequency || 50;
    const hp = 20 + strokes * 3;
    const atk = 10 + (10 - Math.floor(frequency / 10));
    const def = 8 + difficulty * 4;
    return hp + atk + def;
};

// Base XP reward for defeating this trial (before re-fight tapering).
HanziGame.prototype.trialRewardBase = function (setIdx, trialIdx) {
    const set = GRAND_TRIAL_SETS[setIdx];
    const trial = set && set.trials[trialIdx];
    if (!set || !trial) return 0;
    return set.xpBase + trial.level * 10;
};

// Record the outcome of a trial battle and apply rewards on a win.
// First win = full XP + guaranteed item; re-fights taper via
// Economy.repeatMultiplier so trials can't be farmed forever.
HanziGame.prototype.recordTrialResult = function (setIdx, trialIdx, won) {
    if (!this.player) return { won: !!won };

    if (!this.player.trialProgress) this.player.trialProgress = {};
    const key = String(setIdx);
    if (!this.player.trialProgress[key]) {
        this.player.trialProgress[key] = { cleared: [], wins: {} };
    }
    const prog = this.player.trialProgress[key];
    if (!Array.isArray(prog.cleared)) prog.cleared = [];
    if (!prog.wins) prog.wins = {};

    const result = { won: !!won, xp: 0, itemId: null, firstWin: false, reFightTaper: true };

    if (won) {
        const prevWins = prog.wins[trialIdx] || 0;
        prog.wins[trialIdx] = prevWins + 1;
        prog.cleared[trialIdx] = true;

        const base = this.trialRewardBase(setIdx, trialIdx);
        const tapered = Math.max(
            Economy.MIN_XP,
            Math.round(base * Economy.repeatMultiplier(prevWins + 1, TRIAL_REPEAT_HALF_LIFE, TRIAL_REPEAT_FLOOR))
        );
        result.xp = tapered;
        result.firstWin = prevWins === 0;

        const playerLeveled = this.player.addXP(tapered);
        result.playerLeveledUp = !!playerLeveled;

        // Guaranteed item prize, better items for later trials.
        const set = GRAND_TRIAL_SETS[setIdx];
        const itemId = (set.itemRewards && set.itemRewards[trialIdx]) || 'xp_boost_small';
        const addResult = this.bag.addItem(itemId, 1);
        result.itemId = itemId;
        result.itemFit = !!addResult.success;
    }

    return result;
};
