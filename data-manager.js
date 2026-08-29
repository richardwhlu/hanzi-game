// Data Management System for JSON uploads
// Handles importing and managing custom character and phrase data

class DataManager {
    constructor() {
        this.customCharacters = {};
        this.customPhrases = {};
        this.dataSource = 'built-in'; // 'built-in' or 'custom'

        // Pre-loaded character packs (workbook chapters, e.g. "Grade 3,
        // Lesson 1"). A pack is the same { characters, phrases } JSON shape
        // as an upload; we reuse the exact same import path so loading a pack
        // is indistinguishable from uploading a file — and, like uploads, the
        // data lands in localStorage and keeps working offline / via file://.
        this.PACKS_BASE = 'vocabulary_packs/';
        this.packList = [];             // manifest entries (from packs.json)
        this.customPackId = null;       // set when the active custom data came from a loaded pack

        this.loadCustomData();
    }

    // -------- Pre-loaded character packs --------
    //
    // Flow:  packs.json (manifest)  ->  user clicks a pack  ->
    //       fetch <id>.json, validate, import as custom data (like upload),
    //       reinitialize the game with it.

    // Discover and hydrate built-in packs. Safe to call repeatedly.
    // Resolves to packList (possibly empty if unavailable, e.g. file://).
    async loadPacks() {
        if (this._packsLoading) return this._packsLoading;
        this._packsLoading = (async () => {
            try {
                const res = await fetch(this.PACKS_BASE + 'packs.json',
                                        { cache: 'no-cache' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const manifest = await res.json();
                this.packList = Array.isArray(manifest)
                    ? manifest.map(m => this._normalizePackMeta(m)).filter(Boolean)
                    : (manifest.packs || []).map(m => this._normalizePackMeta(m)).filter(Boolean);
                return this.packList;
            } catch (error) {
                console.warn('Character packs unavailable (' + error.message + ')');
                return [];
            } finally {
                this._packsLoading = null;
            }
        })();
        return this._packsLoading;
    }

    // Accept manifest entries with or without a "file" field
    _normalizePackMeta(m) {
        if (!m || !m.id) return null;
        return {
            id: m.id,
            file: m.file || (m.id + '.json'),
            name: m.name || m.id,
            grade: (m.grade !== undefined ? m.grade : null),
            lesson: (m.lesson !== undefined ? m.lesson : null),
            characters: (m.characters !== undefined ? m.characters : null),
            phrases: (m.phrases !== undefined ? m.phrases : null),
            description: m.description || ''
        };
    }

    // Fetch + validate one pack's data (same structure the uploader uses,
    // so the existing validators apply unchanged).
    async fetchPack(id) {
        const meta = this.packList.find(p => p.id === id);
        if (!meta) throw new Error('Unknown pack "' + id + '"');
        let res;
        try {
            res = await fetch(this.PACKS_BASE + meta.file, { cache: 'no-cache' });
        } catch (error) {
            throw new Error('Failed to download pack "' + id + '" (is the site served over http(s)?)');
        }
        if (!res.ok) throw new Error('Failed to download pack "' + id + '" (HTTP ' + res.status + ')');

        const pack = await res.json();
        const characters = pack.characters || {};
        const phrases = pack.phrases || {};

        const errors = [];
        if (Object.keys(characters).length === 0) {
            errors.push('Pack "' + id + '" contains no characters');
        } else {
            errors.push(...this.validateCharacterData(characters));
        }
        if (Object.keys(phrases).length) {
            errors.push(...this.validatePhraseData(phrases));
        }
        if (errors.length) {
            throw new Error('Pack "' + id + '" failed validation:\n' + errors.join('\n'));
        }
        return { characters, phrases };
    }

    // Import a pre-loaded pack. Reuses the regular custom-data storage so
    // the pack keeps working offline / via file:// after the first load.
    importPack(pack, meta) {
        this.customCharacters = pack.characters || {};
        this.customPhrases = pack.phrases || {};
        this.customPackId = meta ? meta.id : (pack.id || null);
        this.customPackName = meta ? meta.name : (pack.name || this.customPackId);
        this.dataSource = 'custom';
        this.saveCustomData();
    }

    getPackMeta(id) {
        return this.packList.find(p => p.id === id) || null;
    }

    clearActivePack() {
        // Pack data lives in the same localStorage slot as uploaded data;
        // clearing a pack is the same as clearing custom data.
        this.clearCustomData();
    }

    // Load any existing custom data from localStorage
    loadCustomData() {
        try {
            const customData = localStorage.getItem('hanzi-game-custom-data');
            if (customData) {
                const parsed = JSON.parse(customData);
                this.customCharacters = parsed.characters || {};
                this.customPhrases = parsed.phrases || {};
                this.dataSource = parsed.dataSource || 'built-in';
                // Restore pack provenance, if this dataset came from a pack
                this.customPackId = parsed.customPackId || null;
                this.customPackName = parsed.customPackName || null;
                console.log('Custom data loaded successfully');
            }
        } catch (error) {
            console.error('Failed to load custom data:', error);
        }
    }

    // Save custom data to localStorage
    saveCustomData() {
        try {
            const dataToSave = {
                characters: this.customCharacters,
                phrases: this.customPhrases,
                dataSource: this.dataSource,
                customPackId: this.customPackId || null,
                customPackName: this.customPackName || null
            };
            localStorage.setItem('hanzi-game-custom-data', JSON.stringify(dataToSave));
            console.log('Custom data saved successfully');
        } catch (error) {
            console.error('Failed to save custom data:', error);
            throw new Error('Failed to save custom data');
        }
    }

    // Validate character data structure
    validateCharacterData(data) {
        const errors = [];
        
        if (!data || typeof data !== 'object') {
            errors.push('Data must be an object');
            return errors;
        }

        for (const [char, charData] of Object.entries(data)) {
            if (!char || typeof char !== 'string') {
                errors.push(`Invalid character key: ${char}`);
                continue;
            }

            if (!charData || typeof charData !== 'object') {
                errors.push(`Character ${char}: data must be an object`);
                continue;
            }

            // Required fields
            const required = ['pinyin', 'strokes', 'difficulty', 'frequency'];
            for (const field of required) {
                if (!(field in charData)) {
                    errors.push(`Character ${char}: missing required field "${field}"`);
                }
            }

            // Type validation
            if (charData.pinyin !== undefined && typeof charData.pinyin !== 'string') {
                errors.push(`Character ${char}: pinyin must be a string`);
            }

            if (charData.strokes !== undefined && (!Number.isInteger(charData.strokes) || charData.strokes < 1)) {
                errors.push(`Character ${char}: strokes must be a positive integer`);
            }

            if (charData.difficulty !== undefined && (!Number.isInteger(charData.difficulty) || charData.difficulty < 1 || charData.difficulty > 5)) {
                errors.push(`Character ${char}: difficulty must be an integer between 1 and 5`);
            }

            if (charData.frequency !== undefined && (typeof charData.frequency !== 'number' || charData.frequency < 0 || charData.frequency > 100)) {
                errors.push(`Character ${char}: frequency must be a number between 0 and 100`);
            }
        }

        return errors;
    }

    // Validate phrase data structure
    validatePhraseData(data) {
        const errors = [];
        
        if (!data || typeof data !== 'object') {
            errors.push('Data must be an object');
            return errors;
        }

        for (const [phraseText, phraseData] of Object.entries(data)) {
            if (!phraseText || typeof phraseText !== 'string') {
                errors.push(`Invalid phrase key: ${phraseText}`);
                continue;
            }

            if (!phraseData || typeof phraseData !== 'object') {
                errors.push(`Phrase ${phraseText}: data must be an object`);
                continue;
            }

            // Required fields
            const required = ['characters', 'requirements', 'difficulty', 'frequency', 'pinyin', 'meaning'];
            for (const field of required) {
                if (!(field in phraseData)) {
                    errors.push(`Phrase ${phraseText}: missing required field "${field}"`);
                }
            }

            // Type validation
            if (phraseData.characters !== undefined && (!Array.isArray(phraseData.characters) || phraseData.characters.length === 0)) {
                errors.push(`Phrase ${phraseText}: characters must be a non-empty array`);
            }

            if (phraseData.requirements !== undefined && typeof phraseData.requirements !== 'object') {
                errors.push(`Phrase ${phraseText}: requirements must be an object`);
            }

            if (phraseData.difficulty !== undefined && (!Number.isInteger(phraseData.difficulty) || phraseData.difficulty < 1 || phraseData.difficulty > 5)) {
                errors.push(`Phrase ${phraseText}: difficulty must be an integer between 1 and 5`);
            }

            if (phraseData.frequency !== undefined && (typeof phraseData.frequency !== 'number' || phraseData.frequency < 0 || phraseData.frequency > 100)) {
                errors.push(`Phrase ${phraseText}: frequency must be a number between 0 and 100`);
            }

            if (phraseData.pinyin !== undefined && typeof phraseData.pinyin !== 'string') {
                errors.push(`Phrase ${phraseText}: pinyin must be a string`);
            }

            if (phraseData.meaning !== undefined && typeof phraseData.meaning !== 'string') {
                errors.push(`Phrase ${phraseText}: meaning must be a string`);
            }

            // Validate that characters in the phrase exist
            if (phraseData.characters && phraseData.requirements) {
                for (const char of phraseData.characters) {
                    if (!(char in phraseData.requirements)) {
                        errors.push(`Phrase ${phraseText}: character "${char}" is in characters array but missing from requirements`);
                    }
                }

                for (const char of Object.keys(phraseData.requirements)) {
                    if (!phraseData.characters.includes(char)) {
                        errors.push(`Phrase ${phraseText}: character "${char}" is in requirements but missing from characters array`);
                    }
                }
            }
        }

        return errors;
    }

    // Import character data from JSON
    importCharacterData(jsonData) {
        let parsed;
        
        // Parse if string
        if (typeof jsonData === 'string') {
            try {
                parsed = JSON.parse(jsonData);
            } catch (error) {
                throw new Error('Invalid JSON format');
            }
        } else {
            parsed = jsonData;
        }

        // Validate structure
        const errors = this.validateCharacterData(parsed);
        if (errors.length > 0) {
            throw new Error('Validation failed:\n' + errors.join('\n'));
        }

        // Store the data
        this.customCharacters = parsed;
        
        // Automatically switch to custom data source
        this.dataSource = 'custom';
        this.saveCustomData();

        return {
            success: true,
            characterCount: Object.keys(parsed).length,
            message: `Successfully imported ${Object.keys(parsed).length} characters`
        };
    }

    // Import phrase data from JSON
    importPhraseData(jsonData) {
        let parsed;
        
        // Parse if string
        if (typeof jsonData === 'string') {
            try {
                parsed = JSON.parse(jsonData);
            } catch (error) {
                throw new Error('Invalid JSON format');
            }
        } else {
            parsed = jsonData;
        }

        // Validate structure
        const errors = this.validatePhraseData(parsed);
        if (errors.length > 0) {
            throw new Error('Validation failed:\n' + errors.join('\n'));
        }

        // Store the data
        this.customPhrases = parsed;
        
        // Automatically switch to custom data source
        this.dataSource = 'custom';
        this.saveCustomData();

        return {
            success: true,
            phraseCount: Object.keys(parsed).length,
            message: `Successfully imported ${Object.keys(parsed).length} phrases`
        };
    }

    // Import combined data (characters and phrases)
    importCombinedData(jsonData) {
        let parsed;
        
        // Parse if string
        if (typeof jsonData === 'string') {
            try {
                parsed = JSON.parse(jsonData);
            } catch (error) {
                throw new Error('Invalid JSON format');
            }
        } else {
            parsed = jsonData;
        }

        const results = [];

        // Import characters if present
        if (parsed.characters) {
            try {
                const charResult = this.importCharacterData(parsed.characters);
                results.push(charResult.message);
            } catch (error) {
                throw new Error(`Character data error: ${error.message}`);
            }
        }

        // Import phrases if present
        if (parsed.phrases) {
            try {
                const phraseResult = this.importPhraseData(parsed.phrases);
                results.push(phraseResult.message);
            } catch (error) {
                throw new Error(`Phrase data error: ${error.message}`);
            }
        }

        if (results.length === 0) {
            throw new Error('No valid "characters" or "phrases" data found in the file');
        }

        return {
            success: true,
            message: results.join('\n')
        };
    }

    // Get active character data (custom/pre-loaded pack > built-in)
    getActiveCharacterData() {
        if (this.dataSource === 'custom' && Object.keys(this.customCharacters).length > 0) {
            return this.customCharacters;
        }
        return DEFAULT_CHARACTERS;
    }

    // Get active phrase data (custom/pre-loaded pack > built-in)
    getActivePhraseData() {
        if (this.dataSource === 'custom' && Object.keys(this.customPhrases).length > 0) {
            return this.customPhrases;
        }
        return DEFAULT_PHRASES;
    }

    // Switch data source
    setDataSource(source) {
        if (source !== 'built-in' && source !== 'custom') {
            throw new Error('Data source must be "built-in" or "custom"');
        }

        if (source === 'custom' && Object.keys(this.customCharacters).length === 0 && Object.keys(this.customPhrases).length === 0) {
            throw new Error('No custom data available. Please import data first.');
        }

        this.dataSource = source;
        this.saveCustomData();
    }

    // Get current data source
    getDataSource() {
        return this.dataSource;
    }

    // Check if custom data is available
    hasCustomData() {
        return Object.keys(this.customCharacters).length > 0 || Object.keys(this.customPhrases).length > 0;
    }

    // Get data statistics
    getDataStats() {
        return {
            builtInCharacters: Object.keys(DEFAULT_CHARACTERS).length,
            builtInPhrases: Object.keys(DEFAULT_PHRASES).length,
            customCharacters: Object.keys(this.customCharacters).length,
            customPhrases: Object.keys(this.customPhrases).length,
            currentSource: this.dataSource
        };
    }

    // Clear custom data
    clearCustomData() {
        this.customCharacters = {};
        this.customPhrases = {};
        this.dataSource = 'built-in';
        this.saveCustomData();
    }

    // Export current custom data as JSON
    exportCustomData() {
        return {
            characters: this.customCharacters,
            phrases: this.customPhrases,
            metadata: {
                exportDate: new Date().toISOString(),
                version: '1.0',
                description: 'Custom Hanzi Game data export'
            }
        };
    }

    // Generate example JSON structures
    generateExampleCharacterJSON() {
        return {
            "学": {
                "pinyin": "xué",
                "strokes": 8,
                "difficulty": 2,
                "frequency": 90
            },
            "习": {
                "pinyin": "xí", 
                "strokes": 3,
                "difficulty": 1,
                "frequency": 85
            }
        };
    }

    generateExamplePhraseJSON() {
        return {
            "学习": {
                "characters": ["学", "习"],
                "requirements": {
                    "学": 3,
                    "习": 2
                },
                "difficulty": 2,
                "frequency": 88,
                "pinyin": "xué xí",
                "meaning": "to study/learn"
            }
        };
    }

    generateExampleCombinedJSON() {
        return {
            "characters": this.generateExampleCharacterJSON(),
            "phrases": this.generateExamplePhraseJSON()
        };
    }
}
