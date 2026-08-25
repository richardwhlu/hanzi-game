/**
 * Practice Session Tracking & Battle Unlock System (v2)
 *
 * Battle progress is measured in DISTINCT CHARACTERS trained, not raw
 * sessions. This stops the "spam one easy character 10 times" loophole:
 * practicing the same character twice counts as one, not two, toward
 * battle readiness. Kids must broaden across the set to fight.
 *
 * Old saves (v1, raw session count) are migrated: the previous
 * practiceCount is treated as credit toward the distinct-character
 * requirement, so nobody loses progress.
 */

class PracticeTracker {
    constructor() {
        this.REQUIRED_DISTINCT = 10;    // distinct chars trained to unlock
        this.SESSION_WINDOW = 60;       // window (minutes) for rolling distinct count
        this.STORAGE_KEY = 'hanzi-game-practice-tracker';
        this.schemaVersion = 2;

        // v2 state
        this.trainedChars = {};                    // char -> latest timestamp (ms)
        this.battleUnlocked = false;
        this.congratulationShown = false;
        this.battleUsageCount = 0;
        this.lastBattleAt = null;

        // v1 compat fields (read-only after migration)
        this.practiceCount = 0;                    // lifetime session count (display only)
        this.practicesSinceBattle = 0;

        // Callbacks for UI updates
        this.onPracticeCountChanged = null;
        this.onBattleUnlocked = null;
        this.onBattleLocked = null;

        this.loadData();
    }

    loadData() {
        try {
            const savedData = localStorage.getItem(this.STORAGE_KEY);
            if (savedData) {
                const d = JSON.parse(savedData);
                this.schemaVersion = d.schemaVersion || 1;

                this.battleUnlocked = d.battleUnlocked || false;
                this.congratulationShown = d.congratulationShown || false;
                this.battleUsageCount = d.battleUsageCount || 0;

                if (d.schemaVersion === 2 && d.trainedChars && typeof d.trainedChars === 'object') {
                    this.trainedChars = d.trainedChars;
                    this.lastBattleAt = d.lastBattleAt || null;
                } else {
                    // v1 migration: the old raw session count becomes a
                    // one-time credit so existing kids don't lose progress.
                    this.trainedChars = {};
                    let credit = Math.min(d.practiceCount || 0, this.REQUIRED_DISTINCT);
                    for (let i = 0; i < credit; i++) {
                        this.trainedChars['__migration_' + i] = Date.now();
                    }
                    this.lastBattleAt = null;
                    this.saveData();
                }

                // Keep legacy display fields in sync
                this.practiceCount = d.practiceCount || 0;
                this.practicesSinceBattle = d.practicesSinceBattle || 0;

                if (this.distinctTrained() >= this.REQUIRED_DISTINCT && !this.battleUnlocked) {
                    this.battleUnlocked = true;
                }
                this.saveData();
                console.log(`Practice tracker loaded (v${this.schemaVersion}): ${this.distinctTrained()}/${this.REQUIRED_DISTINCT} distinct chars`);
            }
        } catch (error) {
            console.error('Failed to load practice tracker data:', error);
            this.resetToDefaults();
        }
    }

    saveData() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                schemaVersion: 2,
                REQUIRED_DISTINCT: this.REQUIRED_DISTINCT,
                SESSION_WINDOW: this.SESSION_WINDOW,
                trainedChars: this.trainedChars,
                battleUnlocked: this.battleUnlocked,
                congratulationShown: this.congratulationShown,
                battleUsageCount: this.battleUsageCount,
                lastBattleAt: this.lastBattleAt,
                practiceCount: this.practiceCount,
                practicesSinceBattle: this.practicesSinceBattle,
                lastUpdated: Date.now()
            }));
        } catch (error) {
            console.error('Failed to save practice tracker data:', error);
        }
    }

    resetToDefaults() {
        this.trainedChars = {};
        this.battleUnlocked = false;
        this.congratulationShown = false;
        this.battleUsageCount = 0;
        this.lastBattleAt = null;
        this.practiceCount = 0;
        this.practicesSinceBattle = 0;
        this.saveData();
        console.log('Practice tracker reset to defaults');
    }

    // ---- v2 core: distinct-character tracking --------------------------------

    /**
     * How many DISTINCT characters were trained within the rolling window
     * (migration placeholders don't count as "real" distinct chars for the
     * rolling window, but DO count toward the requirement as lifetime credit).
     */
    distinctTrainedWithWindow() {
        const cutoff = Date.now() - this.SESSION_WINDOW * 60 * 1000;
        return Object.entries(this.trainedChars)
            .filter(([ch]) => !ch.startsWith('__migration_'))
            .filter(([, t]) => t >= cutoff)
            .length;
    }

    /**
     * Total distinct characters ever marked trained (migration credit
     * included). This is the number that gates battle unlock.
     */
    distinctTrained() {
        return Object.keys(this.trainedChars).length;
    }

    /**
     * Record a completed practice session.
     * @param {Object} practiceData - should include `character` (str) and,
     *   for phrase practice, `phrase` (str). All characters of a phrase
     *   count individually (breadth across the set is what matters).
     * @returns {Object} result including unlock status and messages
     */
    incrementPracticeCount(practiceData = {}) {
        const wasUnlocked = this.isBattleUnlocked();
        const beforeDistinct = this.distinctTrained();

        this.practiceCount++;
        this.practicesSinceBattle++;

        // Mark distinct characters as trained (v2 anti-spam core).
        const char = practiceData.character || practiceData.char || null;
        let newDistinct = 0;
        const mark = (c) => {
            if (!c) return;
            const existing = this.trainedChars[c];
            this.trainedChars[c] = Date.now();
            if (!existing) newDistinct++;
        };
        if (practiceData.isPhrasePractice || practiceData.phrase) {
            const phrase = practiceData.phrase || '';
            for (const ch of phrase.split('')) mark(ch);
        }
        if (char) mark(char);
        if (practiceData.characters && Array.isArray(practiceData.characters)) {
            practiceData.characters.forEach(mark);
        }

        const nowDistinct = this.distinctTrained();
        const remaining = Math.max(0, this.REQUIRED_DISTINCT - nowDistinct);
        const justUnlocked = !wasUnlocked && remaining === 0;
        if (justUnlocked) {
            this.battleUnlocked = true;
        }

        this.saveData();

        const result = {
            practiceCount: this.practiceCount,
            distinctTrained: nowDistinct,
            distinctRequired: this.REQUIRED_DISTINCT,
            practicesRemaining: remaining,
            battleUnlocked: this.isBattleUnlocked(),
            justUnlocked,
            isNewChar: newDistinct > 0,
            message: this.generateProgressMessage(remaining, justUnlocked, newDistinct, char)
        };

        if (this.onPracticeCountChanged) {
            this.onPracticeCountChanged(result);
        }
        if (justUnlocked && this.onBattleUnlocked) {
            this.onBattleUnlocked(result);
        }

        console.log(`Practice v2: ${nowDistinct}/${this.REQUIRED_DISTINCT} distinct (+${newDistinct} new)`, result);
        return result;
    }

    generateProgressMessage(remaining, justUnlocked, newDistinct, char) {
        if (justUnlocked) {
            return "🎉 You've trained " + this.REQUIRED_DISTINCT + " different characters and unlocked Battle mode!";
        }
        if (remaining > 0) {
            const plural = remaining === 1 ? 'character' : 'characters';
            let msg = `📚 ${this.distinctTrained()}/${this.REQUIRED_DISTINCT} distinct characters trained — ${remaining} more ${plural} to unlock!`;
            if (newDistinct === 0 && char) {
                msg += ` (${char} is already trained — pick a NEW character to keep unlocking!)`;
            }
            return msg;
        }
        return null;
    }

    isBattleUnlocked() {
        if (!this.battleUnlocked) return false;
        return this.distinctTrained() >= this.REQUIRED_DISTINCT;
    }

    getPracticeCount() {
        return this.practiceCount;
    }

    getPracticesRemaining() {
        return Math.max(0, this.REQUIRED_DISTINCT - this.distinctTrained());
    }

    getBattlePracticesRemaining() {
        return this.getPracticesRemaining();
    }

    recordBattleUsed() {
        this.battleUsageCount++;
        this.lastBattleAt = Date.now();
        // Battles are still locked even after winning — the kid must keep
        // practicing DISTINCT characters to unlock the next round. We do
        // NOT wipe the trainedChars set (that would feel punishing); the
        // anti-spam rule already guarantees breadth.
        this.saveData();

        const remaining = this.getBattlePracticesRemaining();
        const result = {
            battleUsageCount: this.battleUsageCount,
            practicesRemaining: remaining,
            battleUnlocked: this.isBattleUnlocked(),
            message: `⚔️ Battle complete! Keep training different characters to unlock the next one.` +
                     (remaining > 0 ? ` (${remaining} more distinct needed)` : ` (battles still open for now)`),
            alreadyUnlocked: this.distinctTrained() >= this.REQUIRED_DISTINCT
        };

        if (this.onBattleLocked) {
            this.onBattleLocked(result);
        }
        return result;
    }

    getProgressPercentage() {
        return Math.min(100, Math.floor((this.distinctTrained() / this.REQUIRED_DISTINCT) * 100));
    }

    getBattleProgressPercentage() {
        return this.isBattleUnlocked() ? 100 : this.getProgressPercentage();
    }

    getBattleProgressCount() {
        return this.distinctTrained();
    }

    getStatus() {
        return {
            practiceCount: this.practiceCount,
            distinctTrained: this.distinctTrained(),
            practicesRequired: this.REQUIRED_DISTINCT,
            practicesRemaining: this.getBattlePracticesRemaining(),
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
        this.battleUnlocked = true;
        // Make sure the distinct count satisfies the requirement too
        for (let i = 0; this.distinctTrained() < this.REQUIRED_DISTINCT; i++) {
            this.trainedChars['__migration_' + i] = Date.now();
        }
        this.saveData();
        if (this.onBattleUnlocked) this.onBattleUnlocked(this.getStatus());
    }

    reset() {
        this.resetToDefaults();
        if (this.onPracticeCountChanged) {
            this.onPracticeCountChanged(this.getStatus());
        }
    }

    exportData() {
        return this.getStatus();
    }

    importData(data) {
        try {
            if (!data || typeof data !== 'object') throw new Error('Invalid import data');
            if (data.trainedChars && typeof data.trainedChars === 'object') {
                this.trainedChars = data.trainedChars;
            }
            this.battleUnlocked = Boolean(data.battleUnlocked);
            this.congratulationShown = Boolean(data.congratulationShown);
            if (this.distinctTrained() >= this.REQUIRED_DISTINCT) {
                this.battleUnlocked = true;
            }
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
