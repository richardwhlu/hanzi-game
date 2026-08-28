/**
 * Practice Session Tracking & Battle Unlock System (v3)
 *
 * Battle progress is measured in DISTINCT CHARACTERS trained per ROUND,
 * not cumulative across the whole lifetime. This is the anti-spam loop:
 *
 *   Train 10 distinct chars  → battle unlocked  → battle  → ROUND RESETS →
 *   Train 10 MORE distinct   → next battle
 *
 * Why this matters:
 *   - v2 (commit 47510f8) kept the whole trained-set forever. Once the
 *     child hit 10, the bar stayed at 10/10, then climbed to 11/10, 12/10…
 *     and `isBattleUnlocked()` stayed `true` forever — no re-lock, no
 *     incentive to keep broadening.
 *   - v3 tracks a "round" set that is cleared on every battle. The bar
 *     caps at 10/10 (never displays over) and returns to 0/10 after each
 *     battle.
 *
 * Migration:
 *   v1 (raw session count)  → round starts at min(sessionCount, 10)
 *   v2 (lifetime distinct)  → if no battle was used yet, round carries
 *                              forward the lifetime set (mid-round state);
 *                              if a battle WAS already used, round
 *                              restarts (matches the v3 "reset on battle"
 *                              invariant).
 */

class PracticeTracker {
    constructor() {
        this.REQUIRED_DISTINCT = 10;                    // per-round requirement
        this.STORAGE_KEY = 'hanzi-game-practice-tracker';

        // v3 state
        this.trainedChars = {};                          // char -> ms, LIFETIME (stats)
        this.roundChars = new Set();                     // per-ROUND distinct (the GATE)
        this.battleUsageCount = 0;
        this.lastBattleAt = null;
        this.congratulationShown = false;

        // v1 backward-compat display fields
        this.practiceCount = 0;                          // lifetime session count
        this.practicesSinceBattle = 0;

        // UI callbacks
        this.onPracticeCountChanged = null;
        this.onBattleUnlocked = null;
        this.onBattleLocked = null;

        this.loadData();
    }

    // --------------------------------- persistence ---------------------------------

    loadData() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return;
            const d = JSON.parse(raw);

            this.battleUsageCount = d.battleUsageCount || 0;
            this.lastBattleAt = d.lastBattleAt || null;
            this.congratulationShown = d.congratulationShown || false;
            this.practiceCount = d.practiceCount || 0;
            this.practicesSinceBattle = d.practicesSinceBattle || 0;

            if (d.v3 && Array.isArray(d.roundChars)) {
                // v3: direct load
                this.trainedChars = (d.trainedChars && typeof d.trainedChars === 'object')
                    ? d.trainedChars : {};
                this.roundChars = new Set(d.roundChars);
            } else if (d.trainedChars && typeof d.trainedChars === 'object') {
                // v2: lifetime set. Whether this is the current round depends
                // on whether a battle has already been used.
                this.trainedChars = d.trainedChars;
                const real = Object.keys(this.trainedChars)
                    .filter(k => !k.startsWith('__migration_'));
                if (this.battleUsageCount > 0) {
                    // v2 invariant (reset-on-battle) already implies "round
                    // is about to start fresh" → start fresh.
                    this.roundChars = new Set();
                } else {
                    // Mid-round: carry forward whatever the child has already
                    // trained so progress isn't lost by the migration.
                    this.roundChars = new Set(real);
                }
            } else {
                // v1: raw session count becomes a starting point for the round
                // (capped at the requirement)
                const credit = Math.min(d.practiceCount || 0, this.REQUIRED_DISTINCT);
                for (let i = 0; i < credit; i++) {
                    const k = '__v1_credit_' + i;
                    this.trainedChars[k] = Date.now();
                    this.roundChars.add(k);
                }
            }
            // Migration (bug 2026-08): a bad call site once keyed the distinct
            // set with the Character OBJECT, which coerced to
            // "[object Object]" — a fake entry that froze the count at 1/10.
            // Purge any such garbage keys from both collections.
            const isObjKey = (k) => !k || /^\[object .*?\]$/.test(k);   // "[object Object]" & friends
            for (const k of Object.keys(this.trainedChars)) {
                if (isObjKey(k)) delete this.trainedChars[k];
            }
            this.roundChars = new Set([...this.roundChars].filter(k => !isObjKey(k)));

            this.saveData();
            console.log(`practice tracker v3: round ${this.roundDistinct()}/${this.REQUIRED_DISTINCT}, battles so far ${this.battleUsageCount}`);
        } catch (e) {
            console.error('Failed to load practice tracker:', e);
            this.resetToDefaults();
        }
    }

    saveData() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                v3: true,
                REQUIRED_DISTINCT: this.REQUIRED_DISTINCT,
                trainedChars: this.trainedChars,
                roundChars: [...this.roundChars],
                battleUsageCount: this.battleUsageCount,
                lastBattleAt: this.lastBattleAt,
                congratulationShown: this.congratulationShown,
                practiceCount: this.practiceCount,
                practicesSinceBattle: this.practicesSinceBattle,
                lastUpdated: Date.now()
            }));
        } catch (e) {
            console.error('Failed to save practice tracker:', e);
        }
    }

    resetToDefaults() {
        this.trainedChars = {};
        this.roundChars = new Set();
        this.battleUsageCount = 0;
        this.lastBattleAt = null;
        this.congratulationShown = false;
        this.practiceCount = 0;
        this.practicesSinceBattle = 0;
        this.saveData();
        console.log('practice tracker reset');
    }

    // --------------------------------- core state ---------------------------------

    lifetimeDistinct() { return Object.keys(this.trainedChars).length; }
    roundDistinct()    { return this.roundChars.size; }

    /**
     * Battle unlock condition: THIS round has >= REQUIRED_DISTINCT distinct
     * characters trained. Resets to 0 every battle.
     */
    isBattleUnlocked() {
        return this.roundDistinct() >= this.REQUIRED_DISTINCT;
    }

    getPracticesRemaining() {
        return Math.max(0, this.REQUIRED_DISTINCT - this.roundDistinct());
    }

    getBattlePracticesRemaining() {
        return this.getPracticesRemaining();
    }

    /**
     * Record a practice completion. Pass character(s) or a phrase.
     * Only NEW distinct characters in THIS round advance the bar.
     */
    incrementPracticeCount(practiceData = {}) {
        const wasUnlocked = this.isBattleUnlocked();
        this.practiceCount++;
        this.practicesSinceBattle++;

        const mark = (c) => {
            if (!c) return false;
            // Defensive: call sites may hand us a Character/Phrase-like object
            // instead of a string. Extract the string before keying — otherwise
            // every object collides to the same "[object Object]" key and the
            // distinct-character counter freezes at 1.
            if (typeof c !== 'string') c = (c && typeof c.char === 'string' && c.char) || (c && typeof c.text === 'string' ? c.text[0] : null);
            if (!c || c === '[object Object]') return false;
            this.trainedChars[c] = Date.now();
            if (this.roundChars.has(c)) return false;
            this.roundChars.add(c);
            return true;
        };

        let anyNew = false;
        const char = practiceData.character || practiceData.char || null;
        if (practiceData.isPhrasePractice || practiceData.phrase) {
            for (const ch of (practiceData.phrase || '').split('')) {
                anyNew = mark(ch) || anyNew;
            }
        }
        if (char) anyNew = mark(char) || anyNew;
        if (Array.isArray(practiceData.characters)) {
            practiceData.characters.forEach(c => { anyNew = mark(c) || anyNew; });
        }

        const justUnlocked = anyNew && !wasUnlocked && this.isBattleUnlocked();
        this.saveData();

        const result = {
            practiceCount: this.practiceCount,
            distinctTrained: this.roundDistinct(),          // per-round (gates battles)
            lifetimeTrained: this.lifetimeDistinct(),       // ever (stats)
            distinctRequired: this.REQUIRED_DISTINCT,
            practicesRemaining: this.getPracticesRemaining(),
            battleUnlocked: this.isBattleUnlocked(),
            justUnlocked,
            isNewChar: anyNew,
            message: this.generateProgressMessage(anyNew, justUnlocked, char)
        };

        if (this.onPracticeCountChanged) this.onPracticeCountChanged(result);
        if (justUnlocked && this.onBattleUnlocked) this.onBattleUnlocked(result);
        console.log(`practice v3 +${result.practiceCount}: round ${result.distinctTrained}/${this.REQUIRED_DISTINCT}, lifetime ${result.lifetimeTrained}`);
        return result;
    }

    generateProgressMessage(anyNew, justUnlocked, char) {
        if (justUnlocked) {
            return `🎉 You trained ${this.REQUIRED_DISTINCT} different characters — Battle unlocked!`;
        }
        const remaining = this.getPracticesRemaining();
        if (remaining > 0) {
            const plural = remaining === 1 ? 'character' : 'characters';
            let msg = `📚 ${this.roundDistinct()}/${this.REQUIRED_DISTINCT} characters this round — ${remaining} more ${plural} to unlock.`;
            if (!anyNew && char) {
                msg += ` (${char} is already trained this round — pick a new one to keep going!)`;
            }
            return msg;
        }
        return null;
    }

    /**
     * THE v3 FIX: after every battle, the round resets. Bar goes back to
     * 0/10, the child must broaden (or re-train in a new order) to unlock
     * the next one. `recordBattleUsed` is called by the game on both the
     * victory and the defeat paths.
     */
    recordBattleUsed() {
        this.battleUsageCount++;
        this.lastBattleAt = Date.now();
        this.roundChars = new Set();                        // ← reset the round
        this.saveData();

        const result = {
            battleUsageCount: this.battleUsageCount,
            practicesRemaining: this.getPracticesRemaining(),
            battleUnlocked: this.isBattleUnlocked(),
            message: `⚔️ Battle complete! Train ${this.REQUIRED_DISTINCT} more different characters to unlock the next one.`
        };
        if (this.onBattleLocked) this.onBattleLocked(result);
        return result;
    }

    // --------------------------------- display helpers ---------------------------------

    getProgressPercentage() {
        return Math.min(100, Math.floor((this.roundDistinct() / this.REQUIRED_DISTINCT) * 100));
    }

    getBattleProgressPercentage() {
        return this.getProgressPercentage();
    }

    /**
     * Number to display next to the "/10". Capped at the requirement so we
     * can never render "12/10" or worse.
     */
    getBattleProgressCount() {
        return Math.min(this.REQUIRED_DISTINCT, this.roundDistinct());
    }

    getStatus() {
        return {
            practiceCount: this.practiceCount,
            distinctTrained: Math.min(this.REQUIRED_DISTINCT, this.roundDistinct()),
            lifetimeTrained: this.lifetimeDistinct(),
            practicesRequired: this.REQUIRED_DISTINCT,
            practicesRemaining: this.getPracticesRemaining(),
            progressPercentage: this.getProgressPercentage(),
            battleUnlocked: this.isBattleUnlocked(),
            congratulationShown: this.congratulationShown,
            battleUsageCount: this.battleUsageCount,
            practicesSinceBattle: this.practicesSinceBattle
        };
    }

    markCongratulationShown() {
        this.congratulationShown = true;
        this.saveData();
    }

    forceUnlockBattles() {
        for (let i = 0; this.roundDistinct() < this.REQUIRED_DISTINCT; i++) {
            const k = '__force_' + i;
            this.roundChars.add(k);
            this.trainedChars[k] = Date.now();
        }
        this.saveData();
        if (this.onBattleUnlocked) this.onBattleUnlocked(this.getStatus());
    }

    reset() {
        this.resetToDefaults();
        if (this.onPracticeCountChanged) this.onPracticeCountChanged(this.getStatus());
    }

    exportData() {
        return this.getStatus();
    }

    importData(data) {
        try {
            if (!data || typeof data !== 'object') throw new Error('invalid data');
            if (Array.isArray(data.roundChars)) this.roundChars = new Set(data.roundChars);
            if (data.trainedChars && typeof data.trainedChars === 'object') this.trainedChars = data.trainedChars;
            this.battleUsageCount = data.battleUsageCount || 0;
            this.lastBattleAt = data.lastBattleAt || null;
            this.congratulationShown = Boolean(data.congratulationShown);
            this.saveData();
            if (this.onPracticeCountChanged) this.onPracticeCountChanged(this.getStatus());
            return true;
        } catch (e) {
            console.error('Failed to import practice tracker data:', e);
            return false;
        }
    }
}

if (typeof window !== 'undefined') {
    window.PracticeTracker = PracticeTracker;
}
