// Core game engine that handles game logic and hanzi-writer integration

class HanziGame {
    constructor() {
        this.player = null;
        this.characters = {};
        this.phrases = {};
        this.bag = null;
        this.currentCharacter = null;
        this.currentWriter = null;
        this.practiceStartTime = null;
        this.currentMistakes = 0;
        this.sessionData = {
            mistakes: [],
            strokes: [],
            startTime: null
        };
        
        // Phrase practice state
        this.currentPhrase = null;
        this.currentPhraseIndex = 0;
        
        // Data management
        this.dataManager = new DataManager();
        
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
                
                // Load bag
                this.bag = new Bag(data.bag);
                
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
        this.bag = new Bag();
        
        // Add some starter characters from active character data
        const activeCharacterData = this.dataManager.getActiveCharacterData();
        const starters = ['你', '好', '我'];
        for (const char of starters) {
            if (activeCharacterData[char]) {
                this.characters[char] = new Character(char, activeCharacterData[char]);
            }
        }
        
        this.player.totalCharacters = Object.keys(this.characters).length;
        
        // Give starter XP boost items
        this.bag.addItem('xp_boost_small', 2);
        
        console.log('New game created');
    }
    
    // Initialize phrases from active data
    initializePhrases() {
        const activePhraseData = this.dataManager.getActivePhraseData();
        for (const [text, phraseData] of Object.entries(activePhraseData)) {
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
        
        // Use active character data if available, otherwise create basic entry
        const activeCharacterData = this.dataManager.getActiveCharacterData();
        const characterData = activeCharacterData[char] ? 
            { ...activeCharacterData[char], ...data } :  // Merge with active data if available
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
        this.player.practiceCount += 1; // Increment practice count for battle unlock
        
        // Check for new unlocks
        const newUnlocks = this.checkForNewUnlocks();
        
        // Check if we're in phrase practice mode
        if (this.isPhrasePractice()) {
            const phraseProgress = this.getPhraseProgress();
            
            // Prepare completion data for phrase character
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
                },
                phraseProgress: phraseProgress,
                isPhrasePractice: true
            };
            
            // Save progress
            this.saveGame();
            
            // Trigger completion callback
            this.onPracticeComplete && this.onPracticeComplete(completionData);
            
            return completionData;
        } else {
            // Regular character practice
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
                },
                isPhrasePractice: false
            };
            
            // Save progress
            this.saveGame();
            
            // Trigger completion callback
            this.onPracticeComplete && this.onPracticeComplete(completionData);
            
            return completionData;
        }
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
    
    // Start a phrase practice sequence
    startPhraseSequence(phrase) {
        this.currentPhrase = phrase;
        this.currentPhraseIndex = 0;
        
        // Start with the first character
        if (phrase.characters.length > 0) {
            const firstChar = phrase.characters[0];
            return this.startPractice(firstChar);
        }
        
        throw new Error('Phrase has no characters');
    }
    
    // Check if we're currently practicing a phrase
    isPhrasePractice() {
        return this.currentPhrase !== null;
    }
    
    // Get current phrase practice info
    getPhraseProgress() {
        if (!this.currentPhrase) return null;
        
        return {
            phrase: this.currentPhrase,
            currentIndex: this.currentPhraseIndex,
            totalCharacters: this.currentPhrase.characters.length,
            currentCharacter: this.currentPhrase.characters[this.currentPhraseIndex],
            isLastCharacter: this.currentPhraseIndex === this.currentPhrase.characters.length - 1
        };
    }
    
    // Advance to next character in phrase sequence
    advancePhraseSequence() {
        if (!this.currentPhrase) return null;
        
        this.currentPhraseIndex++;
        
        if (this.currentPhraseIndex < this.currentPhrase.characters.length) {
            // More characters to practice
            const nextChar = this.currentPhrase.characters[this.currentPhraseIndex];
            return this.startPractice(nextChar);
        } else {
            // Phrase completed
            this.completePhraseSequence();
            return null;
        }
    }
    
    // Complete phrase practice sequence
    completePhraseSequence() {
        if (!this.currentPhrase) return;
        
        // Award bonus XP for completing full phrase
        const bonusXP = this.currentPhrase.characters.length * 10;
        const playerLeveledUp = this.player.addXP(bonusXP);
        
        // Record phrase completion and check if it's first time
        const practiceResult = this.currentPhrase.recordPractice();
        
        const completionData = {
            phrase: this.currentPhrase,
            bonusXP: bonusXP,
            playerLeveledUp: playerLeveledUp,
            isFirstCompletion: practiceResult.isFirstCompletion
        };
        
        // If this is the first time completing the phrase, add it as a character
        if (practiceResult.isFirstCompletion) {
            this.createPhraseCharacter(this.currentPhrase);
        } else {
            // If phrase character already exists, give it XP too
            const phraseCharacter = this.characters[this.currentPhrase.text];
            if (phraseCharacter && phraseCharacter.isPhraseCharacter) {
                const phraseXP = Math.floor(bonusXP / 2); // Give phrase character half the bonus XP
                const phraseLeveledUp = phraseCharacter.addXP(phraseXP);
                completionData.phraseCharacterXP = phraseXP;
                completionData.phraseCharacterLeveledUp = phraseLeveledUp;
            }
        }
        
        // Update phrase character practice statistics for accuracy tracking
        const phraseCharacter = this.characters[this.currentPhrase.text];
        if (phraseCharacter && phraseCharacter.isPhraseCharacter) {
            // Track practice session for phrase character
            phraseCharacter.totalPractices++;
            
            // Calculate combined accuracy from all characters in the phrase
            let totalAccuracy = 0;
            let characterCount = 0;
            
            for (const charText of this.currentPhrase.characters) {
                const char = this.characters[charText];
                if (char) {
                    totalAccuracy += char.getAccuracy();
                    characterCount++;
                }
            }
            
            // Use average accuracy from component characters
            const averageAccuracy = characterCount > 0 ? totalAccuracy / characterCount : 0;
            
            // Estimate mistakes based on accuracy (lower accuracy = more mistakes)
            const estimatedMistakes = Math.floor((100 - averageAccuracy) * 0.1 * this.currentPhrase.characters.length);
            phraseCharacter.totalMistakes += Math.max(0, estimatedMistakes);
            
            // Update best accuracy if this session was better
            if (averageAccuracy > phraseCharacter.bestAccuracy) {
                phraseCharacter.bestAccuracy = Math.floor(averageAccuracy);
            }
        }
        
        // Reset phrase state
        this.currentPhrase = null;
        this.currentPhraseIndex = 0;
        
        // Save progress
        this.saveGame();
        
        // Trigger phrase completion callback
        this.onPhraseComplete && this.onPhraseComplete(completionData);
        
        return completionData;
    }
    
    // Create a character representation of a completed phrase
    createPhraseCharacter(phrase) {
        // Check if phrase character already exists
        if (this.characters[phrase.text]) {
            console.log(`Phrase character ${phrase.text} already exists`);
            return this.characters[phrase.text];
        }
        
        // Create character data based on the phrase
        const phraseCharacterData = {
            pinyin: phrase.pinyin,
            strokes: phrase.characters.reduce((total, charText) => {
                const char = this.characters[charText];
                return total + (char ? char.strokes : 5); // fallback to 5 if character not found
            }, 0),
            difficulty: phrase.difficulty,
            frequency: phrase.frequency,
            level: 1, // Start at level 1
            xp: 0,
            totalPractices: 0,
            totalMistakes: 0,
            bestAccuracy: 0,
            unlocked: true,
            isPhraseCharacter: true, // Mark this as a phrase-based character
            originalPhrase: phrase.text
        };
        
        // Add the phrase as a character using its text as the key
        this.characters[phrase.text] = new Character(phrase.text, phraseCharacterData);
        this.player.totalCharacters = Object.keys(this.characters).length;
        
        console.log(`Created phrase character: ${phrase.text}`);
        return this.characters[phrase.text];
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
            bag: this.bag.toJSON(),
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
            this.bag = new Bag(data.bag);
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
            bag: this.bag.toJSON(),
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
    
    // BATTLE SYSTEM METHODS
    
    // Generate a wild character/phrase for battle
    generateWildOpponent() {
        // Get all possible characters and phrases from active data that player doesn't have
        const wildCharacters = [];
        const wildPhrases = [];
        
        // Get active data from DataManager
        const activeCharacterData = this.dataManager.getActiveCharacterData();
        const activePhraseData = this.dataManager.getActivePhraseData();
        
        // Find characters from active character data that player doesn't have
        for (const [char, data] of Object.entries(activeCharacterData)) {
            if (!this.characters[char]) {
                wildCharacters.push({ char, ...data, isWild: true });
            }
        }
        
        // Find phrases from active phrase data that player doesn't have unlocked
        for (const [text, data] of Object.entries(activePhraseData)) {
            if (!this.phrases[text] || !this.phrases[text].unlocked) {
                wildPhrases.push({ text, ...data, isWild: true, isPhrase: true });
            }
        }
        
        // Combine all possible opponents
        const allOpponents = [...wildCharacters, ...wildPhrases];
        
        if (allOpponents.length === 0) {
            // If no wild opponents available, generate a random strong character
            return this.generateRandomOpponent();
        }
        
        // Pick an opponent with stroke-based weighting for early game progression
        const opponent = this.selectWeightedOpponent(allOpponents);
        
        // Create battle-ready opponent with stats
        return this.createBattleOpponent(opponent);
    }
    
    // Select opponent with preference for simpler characters early in game
    selectWeightedOpponent(opponents) {
        const { averageLevel } = this.getPlayerLevelStats();
        
        // In early game, heavily favor simpler characters
        if (averageLevel <= 3) {
            // Create weighted array based on stroke count (lower strokes = higher weight)
            const weightedOpponents = [];
            
            const activeCharacterData = this.dataManager.getActiveCharacterData();
            
            opponents.forEach(opponent => {
                const strokes = opponent.strokes || (opponent.characters ? 
                    opponent.characters.reduce((total, char) => {
                        const charData = activeCharacterData[char];
                        return total + (charData ? charData.strokes : 5);
                    }, 0) : 10);
                
                // Weight: simpler characters appear more often
                let weight = 1;
                if (strokes <= 3) weight = 8;       // Very simple: 8x more likely
                else if (strokes <= 6) weight = 4;  // Simple: 4x more likely
                else if (strokes <= 10) weight = 2; // Medium: 2x more likely
                else weight = 1;                    // Complex: normal chance
                
                // Add multiple copies based on weight
                for (let i = 0; i < weight; i++) {
                    weightedOpponents.push(opponent);
                }
            });
            
            // Pick from weighted array
            const randomIndex = Math.floor(Math.random() * weightedOpponents.length);
            return weightedOpponents[randomIndex];
        } else {
            // Mid-late game: more balanced selection but still slight preference for simpler
            const weightedOpponents = [];
            const activeCharacterData = this.dataManager.getActiveCharacterData();
            
            opponents.forEach(opponent => {
                const strokes = opponent.strokes || (opponent.characters ? 
                    opponent.characters.reduce((total, char) => {
                        const charData = activeCharacterData[char];
                        return total + (charData ? charData.strokes : 5);
                    }, 0) : 10);
                
                // Lighter weighting in late game
                let weight = 1;
                if (strokes <= 6) weight = 2;      // Simple: 2x more likely
                else weight = 1;                   // Everything else: normal
                
                for (let i = 0; i < weight; i++) {
                    weightedOpponents.push(opponent);
                }
            });
            
            const randomIndex = Math.floor(Math.random() * weightedOpponents.length);
            return weightedOpponents[randomIndex];
        }
    }
    
    // Create a battle-ready opponent from character/phrase data
    createBattleOpponent(opponentData) {
        let battleOpponent;
        const activeCharacterData = this.dataManager.getActiveCharacterData();
        
        if (opponentData.isPhrase) {
            // Create phrase opponent
            battleOpponent = {
                name: opponentData.text,
                pinyin: opponentData.pinyin,
                meaning: opponentData.meaning,
                isPhrase: true,
                isWild: true,
                // Calculate combined stats from component characters
                strokes: opponentData.characters ? 
                    opponentData.characters.reduce((total, char) => {
                        const charData = activeCharacterData[char];
                        return total + (charData ? charData.strokes : 5);
                    }, 0) : 10, // fallback
                difficulty: opponentData.difficulty,
                frequency: opponentData.frequency,
                originalData: opponentData
            };
        } else {
            // Create character opponent
            battleOpponent = {
                name: opponentData.char,
                pinyin: opponentData.pinyin,
                strokes: opponentData.strokes,
                difficulty: opponentData.difficulty,
                frequency: opponentData.frequency,
                isPhrase: false,
                isWild: true,
                originalData: opponentData
            };
        }
        
        // Calculate level first (needed for stat calculations)
        battleOpponent.level = this.calculateOpponentLevel(battleOpponent);
        
        // Calculate battle stats
        battleOpponent.maxHP = this.calculateOpponentHP(battleOpponent);
        battleOpponent.currentHP = battleOpponent.maxHP;
        battleOpponent.attack = this.calculateOpponentAttack(battleOpponent);
        battleOpponent.defense = this.calculateOpponentDefense(battleOpponent);
        
        return battleOpponent;
    }
    
    // Generate a random strong opponent when no wild ones available
    generateRandomOpponent() {
        const randomChars = ['龙', '凤', '麒', '麟', '神', '魔', '仙', '妖'];
        const randomChar = randomChars[Math.floor(Math.random() * randomChars.length)];
        
        return this.createBattleOpponent({
            char: randomChar,
            pinyin: 'mystery',
            strokes: 15 + Math.floor(Math.random() * 10), // 15-25 strokes
            difficulty: 4 + Math.floor(Math.random() * 2), // difficulty 4-5
            frequency: 20 + Math.floor(Math.random() * 30), // frequency 20-50
            isWild: true
        });
    }
    
    // Calculate opponent stats based on player's character levels
    calculateOpponentHP(opponent) {
        const baseHP = opponent.isPhrase ? 50 : 20;
        const strokeBonus = opponent.strokes * 3;
        const levelBonus = (opponent.level - 1) * 5;
        
        return baseHP + strokeBonus + levelBonus;
    }
    
    calculateOpponentAttack(opponent) {
        const baseAttack = opponent.isPhrase ? 15 : 10;
        const difficultyBonus = opponent.difficulty * (opponent.isPhrase ? 5 : 4);
        const levelBonus = (opponent.level - 1) * (opponent.isPhrase ? 3 : 2);
        
        return baseAttack + difficultyBonus + levelBonus;
    }
    
    calculateOpponentDefense(opponent) {
        const baseDefense = opponent.isPhrase ? 12 : 8;
        const frequencyBonus = Math.max(0, 10 - Math.floor(opponent.frequency / 10));
        const levelBonus = (opponent.level - 1) * (opponent.isPhrase ? 3 : 2);
        
        return baseDefense + frequencyBonus + levelBonus;
    }
    
    calculateOpponentLevel(opponent) {
        const { averageLevel, maxLevel, minLevel } = this.getPlayerLevelStats();
        
        // Create a balanced level range based on player characters
        let targetLevel;
        
        if (averageLevel <= 3) {
            // Early game: opponents should be close to average
            targetLevel = averageLevel + Math.floor(Math.random() * 3) - 1; // -1 to +1
        } else {
            // Mid-late game: wider but controlled range
            const levelSpread = Math.min(3, Math.floor((maxLevel - minLevel) / 2) + 1);
            const minTarget = Math.max(1, averageLevel - levelSpread);
            const maxTarget = averageLevel + levelSpread;
            targetLevel = minTarget + Math.floor(Math.random() * (maxTarget - minTarget + 1));
        }
        
        // Add stroke-based difficulty adjustment
        const strokeModifier = this.calculateStrokeModifier(opponent.strokes);
        
        // Add slight difficulty modifier based on opponent complexity
        const difficultyModifier = opponent.isPhrase ? 1 : 0;
        const complexityModifier = opponent.difficulty >= 4 ? 1 : 0;
        
        return Math.max(1, targetLevel + strokeModifier + difficultyModifier + complexityModifier);
    }
    
    // Calculate level modifier based on stroke count
    calculateStrokeModifier(strokeCount) {
        // Create progressive difficulty tiers based on stroke count
        if (strokeCount <= 3) return -2;      // Very simple characters (一, 二, 人) are easier
        if (strokeCount <= 6) return -1;      // Simple characters (你, 好, 我) are a bit easier
        if (strokeCount <= 10) return 0;      // Medium characters (是, 的) are balanced
        if (strokeCount <= 15) return 1;      // Complex characters (麵, 湯) are harder
        return 2;                             // Very complex characters (戴) are much harder
    }
    
    // Get comprehensive player level statistics
    getPlayerLevelStats() {
        const characters = Object.values(this.characters);
        if (characters.length === 0) return { averageLevel: 1, maxLevel: 1, minLevel: 1 };
        
        const levels = characters.map(char => char.level);
        const totalLevel = levels.reduce((sum, level) => sum + level, 0);
        const averageLevel = Math.floor(totalLevel / levels.length);
        const maxLevel = Math.max(...levels);
        const minLevel = Math.min(...levels);
        
        return { averageLevel, maxLevel, minLevel };
    }
    
    // Get player's average character level (kept for compatibility)
    getPlayerAverageLevel() {
        return this.getPlayerLevelStats().averageLevel;
    }
    
    // Check if battles are unlocked (requires 10+ practice sessions)
    isBattleUnlocked() {
        const REQUIRED_PRACTICES = 10;
        return this.player.practiceCount >= REQUIRED_PRACTICES;
    }
    
    // Get practice progress toward battle unlock
    getBattleUnlockProgress() {
        const REQUIRED_PRACTICES = 10;
        return {
            current: this.player.practiceCount,
            required: REQUIRED_PRACTICES,
            isUnlocked: this.isBattleUnlocked(),
            remaining: Math.max(0, REQUIRED_PRACTICES - this.player.practiceCount)
        };
    }
    
    // Execute battle turn (player attacks enemy)
    executeBattleTurn(playerCharacter, enemy) {
        // Calculate damage: attack - defense, minimum 1
        const baseDamage = Math.max(1, playerCharacter.attack - enemy.defense);
        const variation = Math.floor(Math.random() * 6) - 2; // ±2 damage variation
        const damage = Math.max(1, baseDamage + variation);
        
        // Apply damage
        enemy.currentHP = Math.max(0, enemy.currentHP - damage);
        
        const result = {
            damage: damage,
            enemyDefeated: enemy.currentHP === 0,
            playerAttack: true
        };
        
        return result;
    }
    
    // Execute enemy counter-attack
    executeEnemyTurn(enemy, playerCharacter) {
        if (enemy.currentHP === 0) return null; // Dead enemies can't attack
        
        // Calculate damage: attack - defense, minimum 1
        const baseDamage = Math.max(1, enemy.attack - playerCharacter.defense);
        const variation = Math.floor(Math.random() * 6) - 2; // ±2 damage variation
        const damage = Math.max(1, baseDamage + variation);
        
        // Apply damage (but don't modify the original character, create battle state)
        const result = {
            damage: damage,
            enemyAttack: true
        };
        
        return result;
    }
    
    // Add defeated opponent to player's collection
    addDefeatedOpponent(opponent) {
        const captureResult = {};
        
        if (opponent.isPhrase) {
            // Add phrase to collection if not already there
            if (!this.phrases[opponent.name]) {
                this.phrases[opponent.name] = new Phrase(opponent.name, opponent.originalData);
            }
            // Unlock the phrase and reset to level 1
            this.phrases[opponent.name].unlocked = true;
            this.phrases[opponent.name].level = 1;
            this.phrases[opponent.name].xp = 0;
            this.player.totalPhrases++;
            
            captureResult.type = 'phrase';
            captureResult.name = opponent.name;
        } else {
            // Add character to collection if not already there
            if (!this.characters[opponent.name]) {
                // Force level 1 for captured characters
                const captureData = { ...opponent.originalData, level: 1, xp: 0 };
                const result = this.addCharacter(opponent.name, captureData);
                captureResult.type = 'character';
                captureResult.name = opponent.name;
                captureResult.success = result.success;
            } else {
                captureResult.type = 'character';
                captureResult.name = opponent.name;
                captureResult.success = false;
                captureResult.message = 'Already owned';
            }
        }
        
        // Check for item drops
        const itemDrops = this.rollForItemDrops(opponent);
        if (itemDrops.length > 0) {
            captureResult.itemDrops = itemDrops;
        }
        
        return captureResult;
    }
    
    // Roll for item drops after defeating an enemy
    rollForItemDrops(opponent) {
        const drops = [];
        
        // Base drop chance: 25% for any item
        if (Math.random() < 0.25) {
            // Determine item rarity based on opponent level and difficulty
            let itemId;
            const rarityRoll = Math.random();
            
            // Higher level enemies drop better items
            const levelModifier = Math.min(0.3, opponent.level * 0.05); // Up to +30% for rare items
            const difficultyModifier = opponent.difficulty * 0.05; // +5% per difficulty level
            
            const adjustedRarityRoll = rarityRoll + levelModifier + difficultyModifier;
            
            if (adjustedRarityRoll < 0.15) {
                // 15% chance for large XP boost (rare)
                itemId = 'xp_boost_large';
            } else if (adjustedRarityRoll < 0.45) {
                // 30% chance for medium XP boost (uncommon)
                itemId = 'xp_boost_medium';
            } else {
                // 55% chance for small XP boost (common)
                itemId = 'xp_boost_small';
            }
            
            // Add item to bag
            const addResult = this.bag.addItem(itemId, 1);
            if (addResult.success) {
                drops.push({
                    itemId: itemId,
                    item: addResult.item,
                    quantity: 1
                });
                
                console.log(`Item drop: ${addResult.item.name}`);
            } else {
                console.log(`Bag full - item drop lost: ${itemId}`);
            }
        }
        
        return drops;
    }
    
    // ITEM MANAGEMENT METHODS
    
    // Use an item from the bag on a character
    useItem(itemId, characterName) {
        if (!this.characters[characterName]) {
            return { success: false, message: 'Character not found' };
        }
        
        const character = this.characters[characterName];
        const result = this.bag.useItem(itemId, character);
        
        if (result.success) {
            // Update character stats after using item
            character.hp = character.calculateHP();
            character.attack = character.calculateAttack();
            character.defense = character.calculateDefense();
            
            // Save game after item use
            this.saveGame();
        }
        
        return result;
    }
    
    // Get all items in the bag
    getBagItems() {
        return this.bag.getAllItems();
    }
    
    // Get items by type (useful for UI filtering)
    getItemsByType(type) {
        return this.bag.getItemsByType(type);
    }
    
    // Get bag status information
    getBagStatus() {
        return {
            totalItems: this.bag.getTotalItemCount(),
            maxSlots: this.bag.maxSlots,
            hasSpace: this.bag.hasSpace(),
            itemTypes: {
                xp_boosts: this.bag.getItemsByType('xp_boost').length
            }
        };
    }
    
    // Add an item to the bag (for admin/testing purposes)
    addItemToBag(itemId, quantity = 1) {
        const result = this.bag.addItem(itemId, quantity);
        if (result.success) {
            this.saveGame();
        }
        return result;
    }
    
    // Remove an item from the bag
    removeItemFromBag(itemId, quantity = 1) {
        const result = this.bag.removeItem(itemId, quantity);
        if (result.success) {
            this.saveGame();
        }
        return result;
    }

    // DATA MANAGEMENT METHODS
    
    // Import character data from JSON
    importCharacterData(jsonData) {
        try {
            const result = this.dataManager.importCharacterData(jsonData);
            
            // After successful import, we need to reinitialize the game with new data
            if (result.success) {
                this.reinitializeWithCustomData();
                this.saveGame();
            }
            
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Import phrase data from JSON
    importPhraseData(jsonData) {
        try {
            const result = this.dataManager.importPhraseData(jsonData);
            
            // After successful import, we need to reinitialize the game with new data
            if (result.success) {
                this.reinitializeWithCustomData();
                this.saveGame();
            }
            
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Import combined character and phrase data from JSON
    importCombinedData(jsonData) {
        try {
            const result = this.dataManager.importCombinedData(jsonData);
            
            // After successful import, we need to reinitialize the game with new data
            if (result.success) {
                this.reinitializeWithCustomData();
                this.saveGame();
            }
            
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Switch between built-in and custom data
    switchDataSource(source) {
        try {
            this.dataManager.setDataSource(source);
            this.reinitializeWithCustomData();
            this.saveGame();
            
            return { 
                success: true, 
                message: `Switched to ${source} data successfully`,
                dataSource: source
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Reinitialize phrases when data source changes
    reinitializeWithCustomData() {
        // Clear current phrases and reinitialize with new data
        this.phrases = {};
        this.initializePhrases();
        
        // Check which phrases are still valid based on current characters
        this.checkForNewUnlocks();
        
        // Update player totals
        this.player.totalPhrases = Object.values(this.phrases).filter(p => p.unlocked).length;
    }

    // Get data management status
    getDataManagerStatus() {
        return this.dataManager.getDataStats();
    }

    // Check if custom data is available
    hasCustomData() {
        return this.dataManager.hasCustomData();
    }

    // Get current data source
    getCurrentDataSource() {
        return this.dataManager.getDataSource();
    }

    // Clear custom data
    clearCustomData() {
        this.dataManager.clearCustomData();
        
        // If we were using custom data, switch back to built-in
        if (this.getCurrentDataSource() === 'custom') {
            this.switchDataSource('built-in');
        }
        
        return { success: true, message: 'Custom data cleared successfully' };
    }

    // Export custom data as JSON
    exportCustomData() {
        return this.dataManager.exportCustomData();
    }

    // Get example JSON structures for help
    getExampleJSONStructures() {
        return {
            characters: this.dataManager.generateExampleCharacterJSON(),
            phrases: this.dataManager.generateExamplePhraseJSON(),
            combined: this.dataManager.generateExampleCombinedJSON()
        };
    }
    
    // Reset game to default state (for game reset functionality)
    resetToDefaults() {
        // Reset player
        this.player = new Player();
        
        // Reset bag
        this.bag = new Bag();
        
        // Clear all characters and phrases
        this.characters = {};
        this.phrases = {};
        
        // Reset current character and practice state
        this.currentCharacter = null;
        this.practiceStartTime = null;
        this.strokes = [];
        this.mistakes = [];
        
        // Reset phrase practice state
        this.currentPhraseSequence = null;
        
        // Reinitialize with default starter characters
        this.initializeStarterCharacters();
        
        // Reinitialize phrases
        this.initializePhrases();
        
        console.log('Game reset to default state');
    }
}
