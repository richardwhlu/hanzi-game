/**
 * Practice Session Tracking System
 * 
 * This system tracks completed practice sessions and manages battle functionality unlock.
 * Users must complete 10 practice sessions before battles are unlocked.
 */

class PracticeTracker {
    constructor() {
        this.PRACTICES_REQUIRED = 10;
        this.STORAGE_KEY = 'hanzi-game-practice-tracker';
        this.practiceCount = 0;
        this.battleUnlocked = false;
        this.congratulationShown = false;
        this.battleUsageCount = 0; // Track how many times battles have been used
        this.practicesSinceBattle = 0; // Track practices completed since last battle
        
        // Callbacks for UI updates
        this.onPracticeCountChanged = null;
        this.onBattleUnlocked = null;
        this.onBattleLocked = null; // New callback for battle locking
        
        this.loadData();
    }
    
    /**
     * Load practice tracking data from localStorage
     */
    loadData() {
        try {
            const savedData = localStorage.getItem(this.STORAGE_KEY);
            if (savedData) {
                const data = JSON.parse(savedData);
                this.practiceCount = data.practiceCount || 0;
                this.battleUnlocked = data.battleUnlocked || false;
                this.congratulationShown = data.congratulationShown || false;
                this.battleUsageCount = data.battleUsageCount || 0;
                this.practicesSinceBattle = data.practicesSinceBattle || 0;
                
                // Validate and fix inconsistent states
                if (this.practiceCount >= this.PRACTICES_REQUIRED && !this.battleUnlocked) {
                    this.battleUnlocked = true;
                    this.saveData();
                }
                
                console.log(`Practice tracker loaded: ${this.practiceCount}/${this.PRACTICES_REQUIRED} practices completed, ${this.practicesSinceBattle} practices since last battle`);
            }
        } catch (error) {
            console.error('Failed to load practice tracker data:', error);
            this.resetToDefaults();
        }
    }
    
    /**
     * Save practice tracking data to localStorage
     */
    saveData() {
        try {
            const data = {
                practiceCount: this.practiceCount,
                battleUnlocked: this.battleUnlocked,
                congratulationShown: this.congratulationShown,
                battleUsageCount: this.battleUsageCount,
                practicesSinceBattle: this.practicesSinceBattle,
                lastUpdated: Date.now()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save practice tracker data:', error);
        }
    }
    
    /**
     * Reset to default values in case of data corruption
     */
    resetToDefaults() {
        this.practiceCount = 0;
        this.battleUnlocked = false;
        this.congratulationShown = false;
        this.battleUsageCount = 0;
        this.practicesSinceBattle = 0;
        this.saveData();
        console.log('Practice tracker reset to defaults');
    }
    
    /**
     * Increment the practice count and check for battle unlock
     * @param {Object} practiceData - Data from completed practice session
     * @returns {Object} - Result containing unlock status and messages
     */
    incrementPracticeCount(practiceData = {}) {
        const previousCount = this.practiceCount;
        const previousSinceBattle = this.practicesSinceBattle;
        const wasUnlocked = this.isBattleUnlocked();
        
        // Always increment practice count for initial unlock
        this.practiceCount = Math.min(this.practiceCount + 1, this.PRACTICES_REQUIRED);
        
        // Increment practices since last battle
        this.practicesSinceBattle++;
        
        // Check for initial battle unlock (first time reaching 10 practices)
        const initialUnlock = this.practiceCount >= this.PRACTICES_REQUIRED && !this.battleUnlocked;
        if (initialUnlock) {
            this.battleUnlocked = true;
        }
        
        // Check for battle re-unlock after being used
        const battleReunlocked = this.battleUsageCount > 0 && 
                               this.practicesSinceBattle >= this.PRACTICES_REQUIRED &&
                               !wasUnlocked;
        
        const practicesRemaining = this.getBattlePracticesRemaining();
        const justUnlocked = initialUnlock || battleReunlocked;
        
        // Save updated data
        this.saveData();
        
        // Prepare result
        const result = {
            practiceCount: this.practiceCount,
            practicesRemaining: practicesRemaining,
            battleUnlocked: this.isBattleUnlocked(),
            justUnlocked: justUnlocked,
            message: this.generateProgressMessage(practicesRemaining, justUnlocked),
            previousCount: previousCount,
            practicesSinceBattle: this.practicesSinceBattle,
            battleUsageCount: this.battleUsageCount
        };
        
        // Trigger callbacks
        if (this.onPracticeCountChanged) {
            this.onPracticeCountChanged(result);
        }
        
        if (justUnlocked && this.onBattleUnlocked) {
            this.onBattleUnlocked(result);
        }
        
        console.log(`Practice completed! ${this.practiceCount}/${this.PRACTICES_REQUIRED}, ${this.practicesSinceBattle} since battle`, result);
        
        return result;
    }
    
    /**
     * Generate appropriate progress message
     * @param {number} practicesRemaining - Practices still needed
     * @param {boolean} justUnlocked - Whether battles were just unlocked
     * @returns {string|null} - Progress message or null
     */
    generateProgressMessage(practicesRemaining, justUnlocked) {
        if (justUnlocked) {
            return "🎉 Congratulations! You've completed 10 practice sessions and unlocked Battle mode!";
        } else if (practicesRemaining > 0) {
            const plural = practicesRemaining === 1 ? 'session' : 'sessions';
            return `Great practice! Complete ${practicesRemaining} more ${plural} to unlock Battle mode.`;
        }
        return null;
    }
    
    /**
     * Check if battles are unlocked
     * @returns {boolean} - True if battles are unlocked
     */
    isBattleUnlocked() {
        // Must have completed initial 10 practices
        if (!this.battleUnlocked || this.practiceCount < this.PRACTICES_REQUIRED) {
            return false;
        }
        
        // If never used battles, they're unlocked
        if (this.battleUsageCount === 0) {
            return true;
        }
        
        // If used battles, need 10 more practices since last battle
        return this.practicesSinceBattle >= this.PRACTICES_REQUIRED;
    }
    
    /**
     * Get current practice count
     * @returns {number} - Number of completed practices
     */
    getPracticeCount() {
        return this.practiceCount;
    }
    
    /**
     * Get number of practices remaining to unlock battles
     * @returns {number} - Practices remaining (0 if unlocked)
     */
    getPracticesRemaining() {
        return Math.max(0, this.PRACTICES_REQUIRED - this.practiceCount);
    }
    
    /**
     * Get number of practices remaining for battle unlock (considering current state)
     * @returns {number} - Practices remaining for battle access
     */
    getBattlePracticesRemaining() {
        if (this.isBattleUnlocked()) {
            return 0;
        }
        
        // If haven't reached initial unlock
        if (this.practiceCount < this.PRACTICES_REQUIRED) {
            return this.PRACTICES_REQUIRED - this.practiceCount;
        }
        
        // If battles were used, need more practices since last battle
        if (this.battleUsageCount > 0) {
            return Math.max(0, this.PRACTICES_REQUIRED - this.practicesSinceBattle);
        }
        
        return 0;
    }
    
    /**
     * Record that a battle has been completed (locks battles again)
     * @returns {Object} - Result with updated status
     */
    recordBattleUsed() {
        this.battleUsageCount++;
        this.practicesSinceBattle = 0;
        
        this.saveData();
        
        const result = {
            battleUsageCount: this.battleUsageCount,
            practicesSinceBattle: this.practicesSinceBattle,
            battleUnlocked: this.isBattleUnlocked(),
            practicesRemaining: this.getBattlePracticesRemaining(),
            message: `Battle completed! Complete ${this.PRACTICES_REQUIRED} more practice sessions to unlock battles again.`
        };
        
        console.log('Battle usage recorded:', result);
        
        // Trigger callback for battle being locked
        if (this.onBattleLocked) {
            this.onBattleLocked(result);
        }
        
        return result;
    }
    
    /**
     * Get progress as a percentage (0-100)
     * @returns {number} - Progress percentage
     */
    getProgressPercentage() {
        return Math.floor((this.practiceCount / this.PRACTICES_REQUIRED) * 100);
    }
    
    /**
     * Get battle-specific progress as a percentage (0-100)
     * This shows progress toward the next battle unlock, considering battle usage
     * @returns {number} - Progress percentage for battle unlock
     */
    getBattleProgressPercentage() {
        if (this.isBattleUnlocked()) {
            return 100;
        }
        
        // If haven't reached initial unlock, show total progress
        if (this.practiceCount < this.PRACTICES_REQUIRED) {
            return Math.floor((this.practiceCount / this.PRACTICES_REQUIRED) * 100);
        }
        
        // If battles were used, show progress since last battle
        if (this.battleUsageCount > 0) {
            return Math.floor((this.practicesSinceBattle / this.PRACTICES_REQUIRED) * 100);
        }
        
        return 100;
    }
    
    /**
     * Get the practice count to display for battle progress
     * This shows the relevant count based on current battle status
     * @returns {number} - Practice count for display
     */
    getBattleProgressCount() {
        // If battles have been used, show progress since last battle
        if (this.battleUsageCount > 0) {
            return this.practicesSinceBattle;
        }
        
        // Otherwise show total progress toward first unlock
        return this.practiceCount;
    }
    
    /**
     * Get comprehensive status object
     * @returns {Object} - Complete status information
     */
    getStatus() {
        return {
            practiceCount: this.practiceCount,
            practicesRequired: this.PRACTICES_REQUIRED,
            practicesRemaining: this.getBattlePracticesRemaining(),
            progressPercentage: this.getProgressPercentage(),
            battleUnlocked: this.isBattleUnlocked(),
            congratulationShown: this.congratulationShown,
            battleUsageCount: this.battleUsageCount,
            practicesSinceBattle: this.practicesSinceBattle
        };
    }
    
    /**
     * Mark congratulatory message as shown
     */
    markCongratulationShown() {
        this.congratulationShown = true;
        this.saveData();
    }
    
    /**
     * Force unlock battles (for testing/admin purposes)
     */
    forceUnlockBattles() {
        this.battleUnlocked = true;
        this.practiceCount = Math.max(this.practiceCount, this.PRACTICES_REQUIRED);
        this.saveData();
        
        console.log('Battles force-unlocked');
        
        if (this.onBattleUnlocked) {
            this.onBattleUnlocked(this.getStatus());
        }
    }
    
    /**
     * Reset practice tracking (for testing/reset purposes)
     */
    reset() {
        this.practiceCount = 0;
        this.battleUnlocked = false;
        this.congratulationShown = false;
        this.battleUsageCount = 0;
        this.practicesSinceBattle = 0;
        this.saveData();
        
        console.log('Practice tracker reset');
        
        if (this.onPracticeCountChanged) {
            this.onPracticeCountChanged(this.getStatus());
        }
    }
    
    /**
     * Export practice tracking data for backup
     * @returns {Object} - Exportable data
     */
    exportData() {
        return {
            practiceCount: this.practiceCount,
            battleUnlocked: this.battleUnlocked,
            congratulationShown: this.congratulationShown,
            practicesRequired: this.PRACTICES_REQUIRED,
            exportedAt: Date.now(),
            version: '1.0'
        };
    }
    
    /**
     * Import practice tracking data from backup
     * @param {Object} data - Data to import
     * @returns {boolean} - Success status
     */
    importData(data) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid import data');
            }
            
            // Validate required fields
            if (typeof data.practiceCount !== 'number' || data.practiceCount < 0) {
                throw new Error('Invalid practice count in import data');
            }
            
            this.practiceCount = Math.min(data.practiceCount, this.PRACTICES_REQUIRED);
            this.battleUnlocked = Boolean(data.battleUnlocked);
            this.congratulationShown = Boolean(data.congratulationShown);
            
            // Ensure consistency
            if (this.practiceCount >= this.PRACTICES_REQUIRED) {
                this.battleUnlocked = true;
            }
            
            this.saveData();
            
            console.log('Practice tracker data imported successfully');
            
            if (this.onPracticeCountChanged) {
                this.onPracticeCountChanged(this.getStatus());
            }
            
            return true;
        } catch (error) {
            console.error('Failed to import practice tracker data:', error);
            return false;
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PracticeTracker = PracticeTracker;
}
