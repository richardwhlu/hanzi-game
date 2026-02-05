// Data Management System for JSON uploads
// Handles importing and managing custom character and phrase data

class DataManager {
    constructor() {
        this.customCharacters = {};
        this.customPhrases = {};
        this.dataSource = 'built-in'; // 'built-in' or 'custom'
        this.loadCustomData();
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
                dataSource: this.dataSource
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

    // Get active character data (custom or built-in)
    getActiveCharacterData() {
        if (this.dataSource === 'custom' && Object.keys(this.customCharacters).length > 0) {
            return this.customCharacters;
        }
        return DEFAULT_CHARACTERS;
    }

    // Get active phrase data (custom or built-in)
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
