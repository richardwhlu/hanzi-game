/**
 * Central Data Manager for Hanzi Game
 * Coordinates data flow between IndexedDB, validation, and fallback systems
 * @version 1.0.0
 */

import { indexedDBManager } from './indexeddb-manager.js';
import { 
    SCHEMA_VERSION,
    validateGameData,
    validateCharacter,
    validatePhrase,
    validatePlayer,
    validateBag,
    validateAndSanitize,
    CHARACTER_SCHEMA,
    PHRASE_SCHEMA,
    PLAYER_SCHEMA,
    BAG_SCHEMA
} from './schemas.js';
import { getDefaultGameData } from './game-data.js';

/**
 * Event types for data manager
 */
export const DATA_EVENTS = {
    LOADED: 'data:loaded',
    SAVED: 'data:saved',
    ERROR: 'data:error',
    CHARACTER_UPDATED: 'data:character:updated',
    PHRASE_UPDATED: 'data:phrase:updated',
    PLAYER_UPDATED: 'data:player:updated',
    BAG_UPDATED: 'data:bag:updated'
};

/**
 * Central Data Manager class
 * Handles all data operations with persistence, validation, and event notifications
 */
export class DataManager extends EventTarget {
    constructor() {
        super();
        this.isLoaded = false;
        this.gameData = null;
        this.autoSaveEnabled = true;
        this.autoSaveDelay = 2000; // 2 seconds
        this.autoSaveTimeout = null;
        this.lastSaveTime = 0;
    }

    /**
     * Initialize the data manager and load game data
     * @param {Object} options Configuration options
     * @returns {Promise<Object>} Loaded game data
     */
    async initialize(options = {}) {
        try {
            // Configure options
            this.autoSaveEnabled = options.autoSave !== false;
            this.autoSaveDelay = options.autoSaveDelay || 2000;

            console.log('Initializing Data Manager...');

            // Try to load from IndexedDB first
            let gameData = await this._loadFromIndexedDB();

            if (!gameData) {
                console.log('No saved data found, using default data');
                gameData = getDefaultGameData();
                
                // Save the default data immediately
                await this._saveToIndexedDB(gameData);
            }

            // Validate and sanitize the loaded data
            const validation = validateAndSanitize(gameData, { properties: {} }, validateGameData);
            
            if (!validation.valid) {
                console.warn('Data validation issues found:', validation.errors);
                // Apply corrections where possible
                gameData = this._repairGameData(gameData);
            }

            this.gameData = gameData;
            this.isLoaded = true;

            console.log('Data Manager initialized successfully');

            // Dispatch loaded event
            this.dispatchEvent(new CustomEvent(DATA_EVENTS.LOADED, {
                detail: { gameData: this.gameData }
            }));

            return this.gameData;

        } catch (error) {
            console.error('Failed to initialize Data Manager:', error);
            
            // Fallback to default data on critical failure
            this.gameData = getDefaultGameData();
            this.isLoaded = true;

            this.dispatchEvent(new CustomEvent(DATA_EVENTS.ERROR, {
                detail: { error, fallbackUsed: true }
            }));

            return this.gameData;
        }
    }

    /**
     * Get current game data
     * @returns {Object} Current game data
     */
    getGameData() {
        if (!this.isLoaded) {
            throw new Error('Data Manager not initialized. Call initialize() first.');
        }
        return this.gameData;
    }

    /**
     * Get all characters
     * @returns {Object} Characters collection
     */
    getCharacters() {
        return this.gameData.characters || {};
    }

    /**
     * Get a specific character
     * @param {string} char Character to retrieve
     * @returns {Object|null} Character data or null if not found
     */
    getCharacter(char) {
        return this.gameData.characters?.[char] || null;
    }

    /**
     * Update or add a character
     * @param {string} char Character key
     * @param {Object} characterData Character data
     * @returns {Object} Updated character data
     */
    updateCharacter(char, characterData) {
        // Validate character data
        const validation = validateAndSanitize(characterData, CHARACTER_SCHEMA, validateCharacter);
        
        if (!validation.valid) {
            throw new Error(`Invalid character data: ${validation.errors.join(', ')}`);
        }

        // Update the character
        if (!this.gameData.characters) {
            this.gameData.characters = {};
        }

        this.gameData.characters[char] = validation.data;

        // Trigger auto-save
        this._scheduleAutoSave();

        // Dispatch event
        this.dispatchEvent(new CustomEvent(DATA_EVENTS.CHARACTER_UPDATED, {
            detail: { char, data: validation.data }
        }));

        return validation.data;
    }

    /**
     * Get all phrases
     * @returns {Object} Phrases collection
     */
    getPhrases() {
        return this.gameData.phrases || {};
    }

    /**
     * Get a specific phrase
     * @param {string} phraseText Phrase text to retrieve
     * @returns {Object|null} Phrase data or null if not found
     */
    getPhrase(phraseText) {
        return this.gameData.phrases?.[phraseText] || null;
    }

    /**
     * Update or add a phrase
     * @param {string} phraseText Phrase key
     * @param {Object} phraseData Phrase data
     * @returns {Object} Updated phrase data
     */
    updatePhrase(phraseText, phraseData) {
        // Validate phrase data
        const validation = validateAndSanitize(phraseData, PHRASE_SCHEMA, validatePhrase);
        
        if (!validation.valid) {
            throw new Error(`Invalid phrase data: ${validation.errors.join(', ')}`);
        }

        // Update the phrase
        if (!this.gameData.phrases) {
            this.gameData.phrases = {};
        }

        this.gameData.phrases[phraseText] = validation.data;

        // Trigger auto-save
        this._scheduleAutoSave();

        // Dispatch event
        this.dispatchEvent(new CustomEvent(DATA_EVENTS.PHRASE_UPDATED, {
            detail: { phraseText, data: validation.data }
        }));

        return validation.data;
    }

    /**
     * Get player data
     * @returns {Object} Player data
     */
    getPlayer() {
        return this.gameData.player || {};
    }

    /**
     * Update player data
     * @param {Object} playerData New player data (partial updates allowed)
     * @returns {Object} Updated player data
     */
    updatePlayer(playerData) {
        // Merge with existing player data
        const currentPlayer = this.gameData.player || {};
        const mergedData = { ...currentPlayer, ...playerData };

        // Validate merged data
        const validation = validateAndSanitize(mergedData, PLAYER_SCHEMA, validatePlayer);
        
        if (!validation.valid) {
            throw new Error(`Invalid player data: ${validation.errors.join(', ')}`);
        }

        // Update player data
        this.gameData.player = validation.data;

        // Trigger auto-save
        this._scheduleAutoSave();

        // Dispatch event
        this.dispatchEvent(new CustomEvent(DATA_EVENTS.PLAYER_UPDATED, {
            detail: { data: validation.data }
        }));

        return validation.data;
    }

    /**
     * Get bag/inventory data
     * @returns {Object} Bag data
     */
    getBag() {
        return this.gameData.bag || {};
    }

    /**
     * Update bag/inventory data
     * @param {Object} bagData New bag data (partial updates allowed)
     * @returns {Object} Updated bag data
     */
    updateBag(bagData) {
        // Merge with existing bag data
        const currentBag = this.gameData.bag || {};
        const mergedData = { ...currentBag, ...bagData };

        // Validate merged data
        const validation = validateAndSanitize(mergedData, BAG_SCHEMA, validateBag);
        
        if (!validation.valid) {
            throw new Error(`Invalid bag data: ${validation.errors.join(', ')}`);
        }

        // Update bag data
        this.gameData.bag = validation.data;

        // Trigger auto-save
        this._scheduleAutoSave();

        // Dispatch event
        this.dispatchEvent(new CustomEvent(DATA_EVENTS.BAG_UPDATED, {
            detail: { data: validation.data }
        }));

        return validation.data;
    }

    /**
     * Save game data immediately
     * @returns {Promise<boolean>} True if save was successful
     */
    async save() {
        try {
            const success = await this._saveToIndexedDB(this.gameData);
            
            if (success) {
                this.lastSaveTime = Date.now();
                this.dispatchEvent(new CustomEvent(DATA_EVENTS.SAVED, {
                    detail: { timestamp: this.lastSaveTime }
                }));
            }

            return success;
        } catch (error) {
            console.error('Failed to save game data:', error);
            this.dispatchEvent(new CustomEvent(DATA_EVENTS.ERROR, {
                detail: { error, operation: 'save' }
            }));
            return false;
        }
    }

    /**
     * Export game data as JSON
     * @param {boolean} includeMetadata Whether to include metadata
     * @returns {string} JSON string of game data
     */
    exportData(includeMetadata = true) {
        const exportData = {
            ...this.gameData,
            exportedAt: new Date().toISOString(),
            exportVersion: SCHEMA_VERSION
        };

        if (!includeMetadata) {
            delete exportData.exportedAt;
            delete exportData.exportVersion;
        }

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import game data from JSON
     * @param {string} jsonData JSON string containing game data
     * @param {Object} options Import options
     * @returns {Promise<boolean>} True if import was successful
     */
    async importData(jsonData, options = {}) {
        try {
            let importedData;
            
            try {
                importedData = JSON.parse(jsonData);
            } catch (parseError) {
                throw new Error(`Invalid JSON format: ${parseError.message}`);
            }

            // Remove metadata fields
            delete importedData.exportedAt;
            delete importedData.exportVersion;

            // Validate imported data
            const validation = validateAndSanitize(importedData, { properties: {} }, validateGameData);
            
            if (!validation.valid && !options.force) {
                throw new Error(`Invalid data format: ${validation.errors.join(', ')}`);
            }

            // Create backup before importing if requested
            if (options.createBackup !== false) {
                await this.createBackup('Pre-import backup');
            }

            // Replace or merge data
            if (options.merge) {
                this.gameData = this._mergeGameData(this.gameData, validation.data);
            } else {
                this.gameData = validation.data;
            }

            // Save the imported data
            await this.save();

            console.log('Game data imported successfully');
            return true;

        } catch (error) {
            console.error('Failed to import game data:', error);
            this.dispatchEvent(new CustomEvent(DATA_EVENTS.ERROR, {
                detail: { error, operation: 'import' }
            }));
            return false;
        }
    }

    /**
     * Reset all game data to defaults
     * @param {boolean} createBackup Whether to create a backup first
     * @returns {Promise<boolean>} True if reset was successful
     */
    async resetData(createBackup = true) {
        try {
            if (createBackup) {
                await this.createBackup('Pre-reset backup');
            }

            this.gameData = getDefaultGameData();
            await this.save();

            console.log('Game data reset to defaults');
            
            this.dispatchEvent(new CustomEvent(DATA_EVENTS.LOADED, {
                detail: { gameData: this.gameData, reset: true }
            }));

            return true;
        } catch (error) {
            console.error('Failed to reset game data:', error);
            return false;
        }
    }

    /**
     * Create a backup of current game data
     * @param {string} label Backup label
     * @returns {Promise<string|null>} Backup ID or null if failed
     */
    async createBackup(label = 'Manual backup') {
        try {
            const backupId = await indexedDBManager.createBackup(this.gameData, label);
            console.log(`Backup created: ${backupId}`);
            return backupId;
        } catch (error) {
            console.error('Failed to create backup:', error);
            return null;
        }
    }

    /**
     * List available backups
     * @returns {Promise<Array>} Array of backup metadata
     */
    async listBackups() {
        try {
            return await indexedDBManager.listBackups();
        } catch (error) {
            console.error('Failed to list backups:', error);
            return [];
        }
    }

    /**
     * Restore from a backup
     * @param {string} backupId Backup ID to restore
     * @returns {Promise<boolean>} True if restore was successful
     */
    async restoreFromBackup(backupId) {
        try {
            const backupData = await indexedDBManager.restoreFromBackup(backupId);
            
            if (backupData) {
                this.gameData = backupData;
                await this.save();
                
                console.log('Data restored from backup');
                
                this.dispatchEvent(new CustomEvent(DATA_EVENTS.LOADED, {
                    detail: { gameData: this.gameData, restored: true }
                }));

                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            return false;
        }
    }

    /**
     * Get data manager statistics
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        const dbStats = await indexedDBManager.getStatistics();
        
        return {
            ...dbStats,
            isLoaded: this.isLoaded,
            lastSaveTime: this.lastSaveTime,
            autoSaveEnabled: this.autoSaveEnabled,
            characterCount: Object.keys(this.gameData?.characters || {}).length,
            phraseCount: Object.keys(this.gameData?.phrases || {}).length,
            playerLevel: this.gameData?.player?.level || 1
        };
    }

    /**
     * Load game data from IndexedDB
     * @private
     * @returns {Promise<Object|null>} Game data or null
     */
    async _loadFromIndexedDB() {
        try {
            return await indexedDBManager.loadGameData();
        } catch (error) {
            console.error('Failed to load from IndexedDB:', error);
            return null;
        }
    }

    /**
     * Save game data to IndexedDB
     * @private
     * @param {Object} gameData Game data to save
     * @returns {Promise<boolean>} True if save was successful
     */
    async _saveToIndexedDB(gameData) {
        try {
            return await indexedDBManager.saveGameData(gameData);
        } catch (error) {
            console.error('Failed to save to IndexedDB:', error);
            return false;
        }
    }

    /**
     * Schedule an auto-save operation
     * @private
     */
    _scheduleAutoSave() {
        if (!this.autoSaveEnabled) {
            return;
        }

        // Clear existing timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Schedule new save
        this.autoSaveTimeout = setTimeout(() => {
            this.save().catch(error => {
                console.error('Auto-save failed:', error);
            });
        }, this.autoSaveDelay);
    }

    /**
     * Repair corrupted game data
     * @private
     * @param {Object} gameData Potentially corrupted game data
     * @returns {Object} Repaired game data
     */
    _repairGameData(gameData) {
        const defaultData = getDefaultGameData();
        
        // Ensure required top-level properties exist
        const repaired = {
            version: gameData.version || defaultData.version,
            characters: gameData.characters || defaultData.characters,
            phrases: gameData.phrases || defaultData.phrases,
            player: gameData.player || defaultData.player,
            bag: gameData.bag || defaultData.bag
        };

        console.log('Game data repaired');
        return repaired;
    }

    /**
     * Merge two game data objects
     * @private
     * @param {Object} existing Existing game data
     * @param {Object} incoming New game data to merge
     * @returns {Object} Merged game data
     */
    _mergeGameData(existing, incoming) {
        return {
            version: incoming.version || existing.version,
            characters: { ...existing.characters, ...incoming.characters },
            phrases: { ...existing.phrases, ...incoming.phrases },
            player: { ...existing.player, ...incoming.player },
            bag: { ...existing.bag, ...incoming.bag }
        };
    }

    /**
     * Enable or disable auto-save
     * @param {boolean} enabled Whether auto-save should be enabled
     */
    setAutoSave(enabled) {
        this.autoSaveEnabled = enabled;
        
        if (!enabled && this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        indexedDBManager.close();
        this.gameData = null;
        this.isLoaded = false;
    }
}

// Export singleton instance
export const dataManager = new DataManager();
