/**
 * IndexedDB Manager for Hanzi Game
 * Provides persistent storage with versioning, migrations, and error handling
 * @version 1.0.0
 */

import { SCHEMA_VERSION, validateGameData } from './schemas.js';

/**
 * IndexedDB database configuration
 */
const DB_NAME = 'HanziGameDB';
const DB_VERSION = 1;
const STORES = {
    GAME_DATA: 'gameData',
    SETTINGS: 'settings',
    BACKUP: 'backup'
};

/**
 * IndexedDB Manager class
 * Handles all IndexedDB operations with proper error handling and fallbacks
 */
export class IndexedDBManager {
    constructor() {
        this.db = null;
        this.isSupported = this.checkSupport();
        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * Check if IndexedDB is supported in the current browser
     * @returns {boolean} True if IndexedDB is supported
     */
    checkSupport() {
        if (typeof window === 'undefined') {
            return false; // Server-side environment
        }
        
        return !!(window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB);
    }

    /**
     * Initialize the IndexedDB connection
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._performInitialization();
        return this.initPromise;
    }

    /**
     * Internal initialization method
     * @private
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async _performInitialization() {
        if (!this.isSupported) {
            console.warn('IndexedDB is not supported in this browser');
            return false;
        }

        if (this.isInitialized) {
            return true;
        }

        try {
            this.db = await this._openDatabase();
            this.isInitialized = true;
            console.log('IndexedDB initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
            return false;
        }
    }

    /**
     * Open the IndexedDB database with proper schema setup
     * @private
     * @returns {Promise<IDBDatabase>} Database instance
     */
    _openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error(`Failed to open database: ${request.error}`));
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion;

                console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

                try {
                    this._performMigration(db, oldVersion, newVersion);
                } catch (error) {
                    console.error('Migration failed:', error);
                    reject(error);
                }
            };

            request.onblocked = () => {
                console.warn('Database upgrade blocked by another connection');
                reject(new Error('Database upgrade blocked'));
            };
        });
    }

    /**
     * Perform database schema migration
     * @private
     * @param {IDBDatabase} db Database instance
     * @param {number} oldVersion Previous version
     * @param {number} newVersion Target version
     */
    _performMigration(db, oldVersion, newVersion) {
        // Migration logic for different versions
        if (oldVersion < 1) {
            // Initial database setup
            this._createInitialSchema(db);
        }

        // Future migration logic would go here
        // if (oldVersion < 2) { ... }
    }

    /**
     * Create initial database schema
     * @private
     * @param {IDBDatabase} db Database instance
     */
    _createInitialSchema(db) {
        // Game data store (main game state)
        if (!db.objectStoreNames.contains(STORES.GAME_DATA)) {
            const gameDataStore = db.createObjectStore(STORES.GAME_DATA, { keyPath: 'id' });
            gameDataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
            db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        // Backup store for data recovery
        if (!db.objectStoreNames.contains(STORES.BACKUP)) {
            const backupStore = db.createObjectStore(STORES.BACKUP, { keyPath: 'id' });
            backupStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
    }

    /**
     * Save complete game data to IndexedDB
     * @param {Object} gameData Complete game state object
     * @returns {Promise<boolean>} True if save was successful
     */
    async saveGameData(gameData) {
        if (!await this.initialize()) {
            throw new Error('IndexedDB not available');
        }

        // Validate data before saving
        const validation = validateGameData(gameData);
        if (!validation.valid) {
            console.warn('Game data validation failed:', validation.errors);
            // Still attempt to save for graceful degradation
        }

        try {
            const transaction = this.db.transaction([STORES.GAME_DATA], 'readwrite');
            const store = transaction.objectStore(STORES.GAME_DATA);

            const dataToSave = {
                id: 'current',
                timestamp: Date.now(),
                version: SCHEMA_VERSION,
                data: gameData
            };

            await this._promisifyRequest(store.put(dataToSave));
            await this._promisifyTransaction(transaction);

            console.log('Game data saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save game data:', error);
            throw error;
        }
    }

    /**
     * Load complete game data from IndexedDB
     * @returns {Promise<Object|null>} Game data object or null if not found
     */
    async loadGameData() {
        if (!await this.initialize()) {
            return null;
        }

        try {
            const transaction = this.db.transaction([STORES.GAME_DATA], 'readonly');
            const store = transaction.objectStore(STORES.GAME_DATA);

            const result = await this._promisifyRequest(store.get('current'));

            if (result && result.data) {
                console.log('Game data loaded successfully');
                return result.data;
            } else {
                console.log('No saved game data found');
                return null;
            }
        } catch (error) {
            console.error('Failed to load game data:', error);
            return null;
        }
    }

    /**
     * Create a backup of current game data
     * @param {Object} gameData Game data to backup
     * @param {string} label Optional backup label
     * @returns {Promise<string>} Backup ID
     */
    async createBackup(gameData, label = 'Auto Backup') {
        if (!await this.initialize()) {
            throw new Error('IndexedDB not available');
        }

        try {
            const transaction = this.db.transaction([STORES.BACKUP], 'readwrite');
            const store = transaction.objectStore(STORES.BACKUP);

            const backupId = `backup_${Date.now()}`;
            const backupData = {
                id: backupId,
                timestamp: Date.now(),
                label: label,
                version: SCHEMA_VERSION,
                data: gameData
            };

            await this._promisifyRequest(store.put(backupData));
            await this._promisifyTransaction(transaction);

            // Clean up old backups (keep only last 10)
            await this._cleanupBackups();

            console.log(`Backup created with ID: ${backupId}`);
            return backupId;
        } catch (error) {
            console.error('Failed to create backup:', error);
            throw error;
        }
    }

    /**
     * List available backups
     * @returns {Promise<Array>} Array of backup metadata
     */
    async listBackups() {
        if (!await this.initialize()) {
            return [];
        }

        try {
            const transaction = this.db.transaction([STORES.BACKUP], 'readonly');
            const store = transaction.objectStore(STORES.BACKUP);
            const index = store.index('timestamp');

            const results = await this._promisifyRequest(
                index.getAll(null, 20) // Get last 20 backups
            );

            return results
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(backup => ({
                    id: backup.id,
                    timestamp: backup.timestamp,
                    label: backup.label,
                    version: backup.version,
                    date: new Date(backup.timestamp).toLocaleString()
                }));
        } catch (error) {
            console.error('Failed to list backups:', error);
            return [];
        }
    }

    /**
     * Restore game data from a backup
     * @param {string} backupId Backup ID to restore
     * @returns {Promise<Object|null>} Restored game data
     */
    async restoreFromBackup(backupId) {
        if (!await this.initialize()) {
            throw new Error('IndexedDB not available');
        }

        try {
            const transaction = this.db.transaction([STORES.BACKUP], 'readonly');
            const store = transaction.objectStore(STORES.BACKUP);

            const backup = await this._promisifyRequest(store.get(backupId));

            if (backup && backup.data) {
                console.log(`Restored game data from backup: ${backupId}`);
                return backup.data;
            } else {
                console.warn(`Backup not found: ${backupId}`);
                return null;
            }
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            throw error;
        }
    }

    /**
     * Save application settings
     * @param {string} key Settings key
     * @param {any} value Settings value
     * @returns {Promise<boolean>} True if save was successful
     */
    async saveSetting(key, value) {
        if (!await this.initialize()) {
            throw new Error('IndexedDB not available');
        }

        try {
            const transaction = this.db.transaction([STORES.SETTINGS], 'readwrite');
            const store = transaction.objectStore(STORES.SETTINGS);

            const settingData = {
                key: key,
                value: value,
                timestamp: Date.now()
            };

            await this._promisifyRequest(store.put(settingData));
            await this._promisifyTransaction(transaction);

            return true;
        } catch (error) {
            console.error('Failed to save setting:', error);
            throw error;
        }
    }

    /**
     * Load application setting
     * @param {string} key Settings key
     * @param {any} defaultValue Default value if setting not found
     * @returns {Promise<any>} Setting value
     */
    async loadSetting(key, defaultValue = null) {
        if (!await this.initialize()) {
            return defaultValue;
        }

        try {
            const transaction = this.db.transaction([STORES.SETTINGS], 'readonly');
            const store = transaction.objectStore(STORES.SETTINGS);

            const result = await this._promisifyRequest(store.get(key));

            return result ? result.value : defaultValue;
        } catch (error) {
            console.error('Failed to load setting:', error);
            return defaultValue;
        }
    }

    /**
     * Clear all game data (for reset functionality)
     * @returns {Promise<boolean>} True if clear was successful
     */
    async clearGameData() {
        if (!await this.initialize()) {
            throw new Error('IndexedDB not available');
        }

        try {
            const transaction = this.db.transaction([STORES.GAME_DATA], 'readwrite');
            const store = transaction.objectStore(STORES.GAME_DATA);

            await this._promisifyRequest(store.clear());
            await this._promisifyTransaction(transaction);

            console.log('Game data cleared successfully');
            return true;
        } catch (error) {
            console.error('Failed to clear game data:', error);
            throw error;
        }
    }

    /**
     * Get database statistics
     * @returns {Promise<Object>} Database statistics
     */
    async getStatistics() {
        if (!await this.initialize()) {
            return {
                supported: false,
                initialized: false
            };
        }

        try {
            const gameDataTransaction = this.db.transaction([STORES.GAME_DATA], 'readonly');
            const gameDataStore = gameDataTransaction.objectStore(STORES.GAME_DATA);
            const gameDataCount = await this._promisifyRequest(gameDataStore.count());

            const backupTransaction = this.db.transaction([STORES.BACKUP], 'readonly');
            const backupStore = backupTransaction.objectStore(STORES.BACKUP);
            const backupCount = await this._promisifyRequest(backupStore.count());

            const settingsTransaction = this.db.transaction([STORES.SETTINGS], 'readonly');
            const settingsStore = settingsTransaction.objectStore(STORES.SETTINGS);
            const settingsCount = await this._promisifyRequest(settingsStore.count());

            return {
                supported: true,
                initialized: true,
                gameDataRecords: gameDataCount,
                backupRecords: backupCount,
                settingsRecords: settingsCount,
                dbName: DB_NAME,
                dbVersion: DB_VERSION
            };
        } catch (error) {
            console.error('Failed to get statistics:', error);
            return {
                supported: true,
                initialized: true,
                error: error.message
            };
        }
    }

    /**
     * Clean up old backups, keeping only the most recent ones
     * @private
     * @param {number} keepCount Number of backups to keep
     */
    async _cleanupBackups(keepCount = 10) {
        try {
            const transaction = this.db.transaction([STORES.BACKUP], 'readwrite');
            const store = transaction.objectStore(STORES.BACKUP);
            const index = store.index('timestamp');

            // Get all backups sorted by timestamp (oldest first)
            const allBackups = await this._promisifyRequest(index.getAll());
            
            // If we have more backups than we want to keep, delete the oldest ones
            if (allBackups.length > keepCount) {
                const backupsToDelete = allBackups
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .slice(0, allBackups.length - keepCount);

                for (const backup of backupsToDelete) {
                    await this._promisifyRequest(store.delete(backup.id));
                }

                console.log(`Cleaned up ${backupsToDelete.length} old backups`);
            }

            await this._promisifyTransaction(transaction);
        } catch (error) {
            console.error('Failed to cleanup backups:', error);
        }
    }

    /**
     * Convert IDBRequest to Promise
     * @private
     * @param {IDBRequest} request IndexedDB request
     * @returns {Promise} Promise that resolves with the request result
     */
    _promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Convert IDBTransaction to Promise
     * @private
     * @param {IDBTransaction} transaction IndexedDB transaction
     * @returns {Promise} Promise that resolves when transaction completes
     */
    _promisifyTransaction(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(new Error('Transaction aborted'));
        });
    }

    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
            this.initPromise = null;
            console.log('IndexedDB connection closed');
        }
    }

    /**
     * Delete the entire database (for complete reset)
     * @returns {Promise<boolean>} True if deletion was successful
     */
    static async deleteDatabase() {
        if (!window.indexedDB) {
            return false;
        }

        try {
            const request = indexedDB.deleteDatabase(DB_NAME);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log('Database deleted successfully');
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('Failed to delete database:', request.error);
                    reject(request.error);
                };
                
                request.onblocked = () => {
                    console.warn('Database deletion blocked');
                    reject(new Error('Database deletion blocked'));
                };
            });
        } catch (error) {
            console.error('Failed to delete database:', error);
            return false;
        }
    }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();
