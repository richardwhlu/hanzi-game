// Core game engine that handles game logic and hanzi-writer integration

class HanziGame {
    constructor() {
        this.player = null;
        this.characters = {};
        this.phrases = {};
        this.currentCharacter = null;
        this.currentWriter = null;
        this.practiceStartTime = null;
        this.currentMistakes = 0;
        this.sessionData = {
            mistakes: [],
            strokes: [],
            startTime: null
        };
        
        this.init();
    }
    
    // Initialize the game
    init() {
        this.loadGameData();
        this.initializePhrases();
        this.checkForNewUnlocks();
    }
    
    // Load saved data or create new game
    loadGameData() {
        const savedData = localStorage.getItem('hanzi-game-save');
        
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.player = new Player(data.player);
                
                // Load characters
                for (const [char, charData] of Object.entries(data.characters || {})) {
                    this.characters[char] = new Character(char, charData);
                }
                
                // Load phrases
                for (const [text, phraseData] of Object.entries(data.phrases || {})) {
                    this.phrases[text] = new Phrase(text, phraseData);
                }
                
                console.log('Game data loaded successfully');
            } catch (error) {
                console.error('Failed to load save data:', error);
                this.createNewGame();
            }
        } else {
            this.createNewGame();
        }
    }
    
    // Create a new game with default data
    createNewGame() {
        this.player = new Player();
        
        // Add some starter characters
        const starters = ['你', '好', '我'];
        for (const char of starters) {
            if (DEFAULT_CHARACTERS[char]) {
                this.characters[char] = new Character(char, DEFAULT_CHARACTERS[char]);
            }
        }
        
        this.player.totalCharacters = Object.keys(this.characters).length;
        console.log('New game created');
    }
    
    // Initialize phrases from defaults
    initializePhrases() {
        for (const [text, phraseData] of Object.entries(DEFAULT_PHRASES)) {
            if (!this.phrases[text]) {
                this.phrases[text] = new Phrase(text, phraseData);
            }
        }
    }
    
    // Check for newly unlocked phrases
    checkForNewUnlocks() {
        let newUnlocks = [];
        
        for (const [text, phrase] of Object.entries(this.phrases)) {
            if (!phrase.unlocked && phrase.canUnlock(this.characters)) {
                phrase.unlocked = true;
                newUnlocks.push(phrase);
                this.player.totalPhrases++;
            }
        }
        
        return newUnlocks;
    }
    
    // Add a new character to the game
    addCharacter(char, data = {}) {
        if (this.characters[char]) {
            return { success: false, message: 'Character already exists' };
        }
        
        // Use default data if available, otherwise create basic entry
        const characterData = DEFAULT_CHARACTERS[char] ? 
            { ...DEFAULT_CHARACTERS[char], ...data } :  // Merge with defaults if available
            {
                pinyin: data.pinyin || '',
                strokes: data.strokes || 5, // reasonable default
                difficulty: data.difficulty || 1,
                frequency: data.frequency || 50
            };
        
        this.characters[char] = new Character(char, characterData);
        this.player.totalCharacters = Object.keys(this.characters).length;
        
        // Check for new unlocks
        const newUnlocks = this.checkForNewUnlocks();
        
        return { 
            success: true, 
            message: 'Character added successfully',
            newUnlocks: newUnlocks
        };
    }
    
    // Remove a character from the game
    removeCharacter(char) {
        if (!this.characters[char]) {
            return { success: false, message: 'Character does not exist' };
        }
        
        delete this.characters[char];
        this.player.totalCharacters = Object.keys(this.characters).length;
        
        // Check if any phrases need to be locked again
        for (const phrase of Object.values(this.phrases)) {
            if (phrase.characters.includes(char)) {
                phrase.unlocked = false;
                this.player.totalPhrases = Math.max(0, this.player.totalPhrases - 1);
            }
        }
        
        return { success: true, message: 'Character removed successfully' };
    }
    
    // Start a practice session for a character
    startPractice(char) {
        if (!this.characters[char]) {
            throw new Error(`Character ${char} not found`);
        }
        
        this.currentCharacter = this.characters[char];
        this.practiceStartTime = Date.now();
        this.currentMistakes = 0;
        this.sessionData = {
            mistakes: [],
            strokes: [],
            startTime: this.practiceStartTime
        };
        
        return this.currentCharacter;
    }
    
    // Create hanzi writer instance with game callbacks
    createWriter(containerId, char) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container ${containerId} not found`);
        }
        
        // Check if HanziWriter is available
        if (typeof HanziWriter === 'undefined') {
            throw new Error('HanziWriter library is not loaded. Please check your internet connection and refresh the page.');
        }
        
        // Clear previous writer
        container.innerHTML = '';
        
        try {
            this.currentWriter = HanziWriter.create(container, char, {
                width: 300,
                height: 300,
                padding: 20,
                strokeAnimationSpeed: 1,
                delayBetweenStrokes: 100,
                strokeHighlightSpeed: 2,
                
                // Quiz configuration
                showHintAfterMisses: 3,
                leniency: 1.2, // Slightly more lenient for kids
                acceptBackwardsStrokes: false,
                
                // Event callbacks
                onMistake: (strokeData) => this.handleMistake(strokeData),
                onCorrectStroke: (strokeData) => this.handleCorrectStroke(strokeData),
                onComplete: (summary) => this.handleComplete(summary)
            });
        } catch (error) {
            console.error('Error creating HanziWriter:', error);
            throw new Error(`Failed to create character writer: ${error.message}`);
        }
        
        return this.currentWriter;
    }
    
    // Handle stroke mistakes
    handleMistake(strokeData) {
        this.currentMistakes++;
        
        const mistake = {
            strokeIndex: strokeData.strokeNum,
            timestamp: Date.now() - this.sessionData.startTime,
            mistakesOnStroke: strokeData.mistakesOnStroke,
            totalMistakes: strokeData.totalMistakes,
            isBackwards: strokeData.isBackwards
        };
        
        this.sessionData.mistakes.push(mistake);
        
        // Trigger UI feedback
        this.onMistakeFeedback && this.onMistakeFeedback(mistake);
    }
    
    // Handle correct strokes
    handleCorrectStroke(strokeData) {
        const stroke = {
            strokeIndex: strokeData.strokeNum,
            timestamp: Date.now() - this.sessionData.startTime,
            attemptsNeeded: strokeData.mistakesOnStroke + 1,
            accuracy: 1 - (strokeData.mistakesOnStroke / (strokeData.mistakesOnStroke + 1))
        };
        
        this.sessionData.strokes.push(stroke);
        
        // Trigger UI feedback
        this.onStrokeFeedback && this.onStrokeFeedback(stroke);
    }
    
    // Handle practice completion
    handleComplete(summary) {
        if (!this.currentCharacter) return;
        
        const completionTime = Date.now() - this.practiceStartTime;
        
        // Calculate accuracy based on total attempts vs mistakes
        // More reliable method using HanziWriter's summary data
        const totalStrokes = this.sessionData.strokes.length;
        const totalMistakes = this.currentMistakes;
        
        // If we have stroke data, use our detailed calculation
        let accuracy = 0;
        if (totalStrokes > 0) {
            const totalAttempts = this.sessionData.strokes.reduce((sum, stroke) => sum + stroke.attemptsNeeded, 0);
            accuracy = Math.floor((totalStrokes / totalAttempts) * 100);
        } else if (summary && 'totalMistakes' in summary) {
            // Fallback: estimate from HanziWriter's summary
            // Assume the character was completed, so we know total strokes attempted
            const estimatedStrokes = this.currentCharacter.strokes || 5; // fallback to 5
            const totalAttempts = estimatedStrokes + totalMistakes;
            accuracy = totalAttempts > 0 ? Math.floor((estimatedStrokes / totalAttempts) * 100) : 0;
        } else {
            // Last resort: base on mistakes vs time (rough estimate)
            accuracy = Math.max(0, Math.min(100, 100 - (totalMistakes * 10)));
        }
        
        console.log('Practice completed:', {
            totalStrokes,
            totalMistakes,
            accuracy,
            strokesData: this.sessionData.strokes.length,
            summary
        });
        
        // Record the practice session
        const result = this.currentCharacter.recordPractice(
            this.currentMistakes,
            accuracy,
            completionTime
        );
        
        // Add XP to player
        const playerLeveledUp = this.player.addXP(Math.floor(result.xpGained / 2));
        this.player.totalPracticeTime += completionTime;
        
        // Check for new unlocks
        const newUnlocks = this.checkForNewUnlocks();
        
        // Prepare completion data
        const completionData = {
            character: this.currentCharacter,
            result: result,
            playerLeveledUp: playerLeveledUp,
            newUnlocks: newUnlocks,
            sessionStats: {
                completionTime: completionTime,
                totalMistakes: this.currentMistakes,
                accuracy: accuracy,
                strokeCount: totalStrokes
            }
        };
        
        // Save progress
        this.saveGame();
        
        // Trigger completion callback
        this.onPracticeComplete && this.onPracticeComplete(completionData);
        
        return completionData;
    }
    
    // Start quiz mode for current writer
    startQuiz() {
        if (!this.currentWriter) {
            throw new Error('No writer instance available');
        }
        
        this.currentWriter.quiz();
    }
    
    // Show hint for current character
    showHint() {
        if (!this.currentWriter) return;
        this.currentWriter.showOutline();
    }
    
    // Reset current practice
    resetPractice() {
        if (!this.currentWriter) return;
        this.currentWriter.cancelQuiz();
        this.practiceStartTime = Date.now();
        this.currentMistakes = 0;
        this.sessionData = {
            mistakes: [],
            strokes: [],
            startTime: this.practiceStartTime
        };
        setTimeout(() => this.currentWriter.quiz(), 500);
    }
    
    // Get available characters for practice
    getAvailableCharacters() {
        return Object.values(this.characters).filter(char => char.unlocked);
    }
    
    // Get available phrases
    getAvailablePhrases() {
        return Object.values(this.phrases).filter(phrase => phrase.unlocked);
    }
    
    // Get characters that can be unlocked
    getUnlockablePhrases() {
        return Object.values(this.phrases).filter(phrase => 
            !phrase.unlocked && phrase.canUnlock(this.characters)
        );
    }
    
    // Save game data to localStorage
    saveGame() {
        const saveData = {
            player: this.player.toJSON(),
            characters: {},
            phrases: {}
        };
        
        // Save characters
        for (const [char, character] of Object.entries(this.characters)) {
            saveData.characters[char] = character.toJSON();
        }
        
        // Save phrases
        for (const [text, phrase] of Object.entries(this.phrases)) {
            saveData.phrases[text] = phrase.toJSON();
        }
        
        try {
            localStorage.setItem('hanzi-game-save', JSON.stringify(saveData));
            return { success: true, message: 'Game saved successfully' };
        } catch (error) {
            console.error('Failed to save game:', error);
            return { success: false, message: 'Failed to save game' };
        }
    }
    
    // Load game data from JSON
    loadFromJSON(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            this.player = new Player(data.player);
            this.characters = {};
            this.phrases = {};
            
            // Load characters
            for (const [char, charData] of Object.entries(data.characters || {})) {
                this.characters[char] = new Character(char, charData);
            }
            
            // Load phrases
            for (const [text, phraseData] of Object.entries(data.phrases || {})) {
                this.phrases[text] = new Phrase(text, phraseData);
            }
            
            this.saveGame(); // Save to localStorage
            return { success: true, message: 'Game loaded from JSON successfully' };
        } catch (error) {
            console.error('Failed to load from JSON:', error);
            return { success: false, message: 'Failed to load from JSON: Invalid format' };
        }
    }
    
    // Export game data as JSON
    exportToJSON() {
        const saveData = {
            player: this.player.toJSON(),
            characters: {},
            phrases: {},
            exportDate: new Date().toISOString()
        };
        
        // Export characters
        for (const [char, character] of Object.entries(this.characters)) {
            saveData.characters[char] = character.toJSON();
        }
        
        // Export phrases
        for (const [text, phrase] of Object.entries(this.phrases)) {
            saveData.phrases[text] = phrase.toJSON();
        }
        
        return JSON.stringify(saveData, null, 2);
    }
    
    // Get game statistics
    getGameStats() {
        const totalCharacters = Object.keys(this.characters).length;
        const unlockedPhrases = Object.values(this.phrases).filter(p => p.unlocked).length;
        const totalPractices = Object.values(this.characters).reduce((sum, char) => sum + char.totalPractices, 0);
        const averageAccuracy = Object.values(this.characters).reduce((sum, char) => sum + char.getAccuracy(), 0) / totalCharacters;
        
        return {
            playerLevel: this.player.level,
            playerXP: this.player.xp,
            totalCharacters: totalCharacters,
            unlockedPhrases: unlockedPhrases,
            totalPractices: totalPractices,
            averageAccuracy: Math.floor(averageAccuracy) || 0,
            totalPracticeTime: Math.floor(this.player.totalPracticeTime / 1000), // in seconds
            achievements: this.player.achievements.length
        };
    }
}
