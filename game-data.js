// Game data structures and initial data

// Default character data with basic stats
const DEFAULT_CHARACTERS = {
    '你': { pinyin: 'nǐ', strokes: 7, difficulty: 1, frequency: 95 },
    '好': { pinyin: 'hǎo', strokes: 6, difficulty: 1, frequency: 88 },
    '我': { pinyin: 'wǒ', strokes: 7, difficulty: 1, frequency: 98 },
    '是': { pinyin: 'shì', strokes: 9, difficulty: 2, frequency: 97 },
    '的': { pinyin: 'de', strokes: 8, difficulty: 2, frequency: 100 },
    '一': { pinyin: 'yī', strokes: 1, difficulty: 1, frequency: 99 },
    '不': { pinyin: 'bù', strokes: 4, difficulty: 1, frequency: 92 },
    '在': { pinyin: 'zài', strokes: 6, difficulty: 2, frequency: 85 },
    '了': { pinyin: 'le', strokes: 2, difficulty: 1, frequency: 96 },
    '有': { pinyin: 'yǒu', strokes: 6, difficulty: 2, frequency: 89 },
    '戴': { pinyin: 'dài', strokes: 17, difficulty: 4, frequency: 80 },
    '吃': { pinyin: 'chī', strokes: 6, difficulty: 1, frequency: 85 },
    '喝': { pinyin: 'hē', strokes: 12, difficulty: 2, frequency: 85 },
    '夠': { pinyin: 'gòu', strokes: 11, difficulty: 4, frequency: 80 },
    '麵': { pinyin: 'miàn', strokes: 20, difficulty: 4, frequency: 80 },
    '飯': { pinyin: 'fàn', strokes: 13, difficulty: 2, frequency: 87 },
    '菜': { pinyin: 'cài', strokes: 12, difficulty: 2, frequency: 86 },
    '果': { pinyin: 'guǒ', strokes: 8, difficulty: 2, frequency: 83 },
    '汁': { pinyin: 'zhī', strokes: 6, difficulty: 1, frequency: 83 },
    '奶': { pinyin: 'nǎi', strokes: 5, difficulty: 1, frequency: 83 },
    '包': { pinyin: 'bāo', strokes: 5, difficulty: 1, frequency: 89 },
    '湯': { pinyin: 'tāng', strokes: 13, difficulty: 2, frequency: 82 },
    '茶': { pinyin: 'chá', strokes: 10, difficulty: 2, frequency: 84 }
};

// Default phrase combinations with requirements
const DEFAULT_PHRASES = {
    '你好': {
        characters: ['你', '好'],
        requirements: { '你': 3, '好': 3 },
        difficulty: 1,
        frequency: 95,
        pinyin: 'nǐ hǎo',
        meaning: 'hello'
    },
    '我是': {
        characters: ['我', '是'],
        requirements: { '我': 5, '是': 6 },
        difficulty: 2,
        frequency: 80,
        pinyin: 'wǒ shì',
        meaning: 'I am'
    },
    '好的': {
        characters: ['好', '的'],
        requirements: { '好': 4, '的': 5 },
        difficulty: 2,
        frequency: 75,
        pinyin: 'hǎo de',
        meaning: 'okay/good'
    },
    '不好': {
        characters: ['不', '好'],
        requirements: { '不': 3, '好': 4 },
        difficulty: 2,
        frequency: 70,
        pinyin: 'bù hǎo',
        meaning: 'not good'
    },
    '一个': {
        characters: ['一', '个'],
        requirements: { '一': 2, '个': 4 },
        difficulty: 2,
        frequency: 85,
        pinyin: 'yī gè',
        meaning: 'one (measure word)'
    },
    '麵包': {
        characters: ['麵', '包'],
        requirements: { '麵': 2, '包': 3 },
        difficulty: 3,
        frequency: 82,
        pinyin: 'miàn bāo',
        meaning: 'bread'
    }
};

// Character progression class
class Character {
    constructor(char, data = {}) {
        this.char = char;
        this.pinyin = data.pinyin || '';
        this.strokes = data.strokes || 1;
        this.difficulty = data.difficulty || 1;
        this.frequency = data.frequency || 50;
        
        // Progression stats
        this.level = data.level || 1;
        this.xp = data.xp || 0;
        this.totalPractices = data.totalPractices || 0;
        this.totalMistakes = data.totalMistakes || 0;
        this.bestAccuracy = data.bestAccuracy || 0;
        this.unlocked = data.unlocked !== undefined ? data.unlocked : true;
        
        // Phrase character properties
        this.isPhraseCharacter = data.isPhraseCharacter || false;
        this.originalPhrase = data.originalPhrase || null;
        
        // Pokemon-style stats derived from character properties
        this.hp = this.calculateHP();
        this.attack = this.calculateAttack();
        this.defense = this.calculateDefense();
    }
    
    // Calculate HP based on stroke count (more strokes = more HP)
    calculateHP() {
        const baseHP = 20;
        const strokeBonus = this.strokes * 3;
        const levelBonus = (this.level - 1) * 5;
        return baseHP + strokeBonus + levelBonus;
    }
    
    // Calculate Attack based on frequency and level
    calculateAttack() {
        const baseAttack = 10;
        const frequencyBonus = 10 - Math.floor(this.frequency / 10);
        const levelBonus = (this.level - 1) * 2;
        return baseAttack + frequencyBonus + levelBonus;
    }
    
    // Calculate Defense based on difficulty and level
    calculateDefense() {
        const baseDefense = 8;
        const difficultyBonus = this.difficulty * 4;
        const levelBonus = (this.level - 1) * 2;
        return baseDefense + difficultyBonus + levelBonus;
    }
    
    // Calculate XP needed for next level
    getXPForNextLevel() {
        return this.level * 100;
    }
    
    // Get current accuracy percentage
    getAccuracy() {
        if (this.totalPractices === 0) return 0;
        
        // Calculate accuracy based on total stroke attempts vs successful strokes
        // Each practice session involves multiple strokes, so we need to be more sophisticated
        const estimatedTotalStrokes = this.totalPractices * this.strokes; // rough estimate
        const estimatedCorrectStrokes = Math.max(0, estimatedTotalStrokes - this.totalMistakes);
        
        // Ensure accuracy doesn't go below 0 or above 100
        const accuracy = Math.min(100, Math.max(0, Math.floor((estimatedCorrectStrokes / estimatedTotalStrokes) * 100)));
        
        return accuracy;
    }
    
    // Add XP and handle level ups
    addXP(amount) {
        this.xp += amount;
        let leveledUp = false;
        
        while (this.xp >= this.getXPForNextLevel()) {
            const xpNeeded = this.getXPForNextLevel(); // Get XP needed BEFORE leveling up
            this.xp -= xpNeeded;
            this.level++;
            leveledUp = true;
            
            // Recalculate stats on level up
            this.hp = this.calculateHP();
            this.attack = this.calculateAttack();
            this.defense = this.calculateDefense();
        }
        
        return leveledUp;
    }
    
    // Calculate XP reward based on accuracy and performance
    calculateXPReward(accuracy, mistakeCount, completionTime) {
        const baseXP = 20;
        const accuracyBonus = Math.floor(accuracy * 30); // 0-30 bonus
        const speedBonus = completionTime < 30000 ? 10 : 0; // 10 bonus for under 30 seconds
        const mistakePenalty = mistakeCount * 2;
        
        return Math.max(5, baseXP + accuracyBonus + speedBonus - mistakePenalty);
    }
    
    // Record a practice session
    recordPractice(mistakeCount, accuracy, completionTime) {
        this.totalPractices++;
        this.totalMistakes += mistakeCount;
        
        if (accuracy > this.bestAccuracy) {
            this.bestAccuracy = accuracy;
        }
        
        const xpGained = this.calculateXPReward(accuracy / 100, mistakeCount, completionTime);
        const leveledUp = this.addXP(xpGained);
        
        return { xpGained, leveledUp, accuracy };
    }
    
    // Export to JSON
    toJSON() {
        return {
            char: this.char,
            pinyin: this.pinyin,
            strokes: this.strokes,
            difficulty: this.difficulty,
            frequency: this.frequency,
            level: this.level,
            xp: this.xp,
            totalPractices: this.totalPractices,
            totalMistakes: this.totalMistakes,
            bestAccuracy: this.bestAccuracy,
            unlocked: this.unlocked,
            isPhraseCharacter: this.isPhraseCharacter,
            originalPhrase: this.originalPhrase
        };
    }
}

// Phrase progression class
class Phrase {
    constructor(phraseText, data = {}) {
        this.text = phraseText;
        this.characters = data.characters || [];
        this.requirements = data.requirements || {};
        this.difficulty = data.difficulty || 1;
        this.frequency = data.frequency || 50;
        this.pinyin = data.pinyin || '';
        this.meaning = data.meaning || '';
        
        // Progression stats
        this.level = data.level || 1;
        this.xp = data.xp || 0;
        this.unlocked = data.unlocked || false;
        this.totalPractices = data.totalPractices || 0;
        this.firstTimeCompleted = data.firstTimeCompleted || false;
        
        // Calculate combined stats from component characters
        this.hp = this.calculateHP();
        this.attack = this.calculateAttack();
        this.defense = this.calculateDefense();
    }
    
    // Check if phrase can be unlocked based on character levels
    canUnlock(characterCollection) {
        return this.characters.every(char => {
            const character = characterCollection[char];
            return character && character.level >= this.requirements[char];
        });
    }
    
    // Calculate combined HP from characters
    calculateHP() {
        const baseHP = 50;
        const characterBonus = this.characters.length * 20;
        const levelBonus = (this.level - 1) * 10;
        return baseHP + characterBonus + levelBonus;
    }
    
    // Calculate combined attack
    calculateAttack() {
        const baseAttack = 15;
        const difficultyBonus = this.difficulty * 5;
        const levelBonus = (this.level - 1) * 3;
        return baseAttack + difficultyBonus + levelBonus;
    }
    
    // Calculate combined defense
    calculateDefense() {
        const baseDefense = 12;
        const frequencyBonus = 15 - Math.floor(this.frequency / 15);
        const levelBonus = (this.level - 1) * 3;
        return baseDefense + frequencyBonus + levelBonus;
    }
    
    // Record a phrase practice session
    recordPractice() {
        const isFirstCompletion = !this.firstTimeCompleted;
        this.totalPractices++;
        
        // Mark as completed for first time if this is the first completion
        if (isFirstCompletion) {
            this.firstTimeCompleted = true;
        }
        
        // Award XP for phrase completion (bonus for completing full sequences)
        const baseXP = 25; // Base XP for phrase completion
        const sequenceBonus = this.characters.length * 5; // Bonus for each character in sequence
        const firstTimeBonus = isFirstCompletion ? 50 : 0; // Extra XP for first time completion
        
        const xpGained = baseXP + sequenceBonus + firstTimeBonus;
        this.xp += xpGained;
        
        // Check for level up
        let leveledUp = false;
        const xpRequired = this.getXPForNextLevel();
        if (this.xp >= xpRequired) {
            this.xp -= xpRequired;
            this.level++;
            leveledUp = true;
            
            // Recalculate stats on level up
            this.hp = this.calculateHP();
            this.attack = this.calculateAttack();
            this.defense = this.calculateDefense();
        }
        
        return {
            xpGained: xpGained,
            leveledUp: leveledUp,
            isFirstCompletion: isFirstCompletion
        };
    }
    
    // Get XP required for next level
    getXPForNextLevel() {
        return this.level * 150; // Phrases level slower than individual characters
    }
    
    toJSON() {
        return {
            text: this.text,
            characters: this.characters,
            requirements: this.requirements,
            difficulty: this.difficulty,
            frequency: this.frequency,
            pinyin: this.pinyin,
            meaning: this.meaning,
            level: this.level,
            xp: this.xp,
            unlocked: this.unlocked,
            totalPractices: this.totalPractices,
            firstTimeCompleted: this.firstTimeCompleted
        };
    }
}

// Player progression class
class Player {
    constructor(data = {}) {
        this.level = data.level || 1;
        this.xp = data.xp || 0;
        this.totalCharacters = data.totalCharacters || 0;
        this.totalPhrases = data.totalPhrases || 0;
        this.totalPracticeTime = data.totalPracticeTime || 0;
        this.achievements = data.achievements || [];
    }
    
    getXPForNextLevel() {
        return this.level * 200;
    }
    
    addXP(amount) {
        this.xp += amount;
        let leveledUp = false;
        
        while (this.xp >= this.getXPForNextLevel()) {
            const xpNeeded = this.getXPForNextLevel(); // Get XP needed BEFORE leveling up
            this.xp -= xpNeeded;
            this.level++;
            leveledUp = true;
        }
        
        return leveledUp;
    }
    
    toJSON() {
        return {
            level: this.level,
            xp: this.xp,
            totalCharacters: this.totalCharacters,
            totalPhrases: this.totalPhrases,
            totalPracticeTime: this.totalPracticeTime,
            achievements: this.achievements
        };
    }
}
