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
    '茶': { pinyin: 'chá', strokes: 10, difficulty: 2, frequency: 84 },
    '个': { pinyin: 'gè', strokes: 3, difficulty: 1, frequency: 95 }
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

// Default items that can be found/earned
const DEFAULT_ITEMS = {
    'xp_boost_small': {
        id: 'xp_boost_small',
        name: 'Small XP Boost',
        description: 'Grants 100 XP to a character',
        type: 'xp_boost',
        value: 100,
        rarity: 'common',
        icon: '🔮'
    },
    'xp_boost_medium': {
        id: 'xp_boost_medium',
        name: 'Medium XP Boost',
        description: 'Grants 200 XP to a character',
        type: 'xp_boost',
        value: 200,
        rarity: 'uncommon',
        icon: '💎'
    },
    'xp_boost_large': {
        id: 'xp_boost_large',
        name: 'Large XP Boost',
        description: 'Grants 700 XP to a character',
        type: 'xp_boost',
        value: 700,
        rarity: 'rare',
        icon: '⭐'
    }
};

// Item class
class Item {
    constructor(itemId, data = {}) {
        // Bug fix: when the item id is unknown, `data` holds both the item
        // definition AND the quantity. Previously quantity was read from
        // `itemData` (the default template), so newly-added custom items
        // always started at quantity 1.
        const itemData = DEFAULT_ITEMS[itemId] || data;
        const defaultQuantity = (data && data.quantity) || 1;

        this.id = itemData.id || itemId;
        this.name = itemData.name || 'Unknown Item';
        this.description = itemData.description || '';
        this.type = itemData.type || 'misc';
        this.value = itemData.value || 0;
        this.rarity = itemData.rarity || 'common';
        this.icon = itemData.icon || '📦';
        this.quantity = defaultQuantity;
    }
    
    // Use the item on a character (for XP boosts)
    use(character) {
        if (this.type === 'xp_boost' && character) {
            const leveledUp = character.addXP(this.value);
            this.quantity = Math.max(0, this.quantity - 1);
            
            return {
                success: true,
                xpGained: this.value,
                leveledUp: leveledUp,
                remainingQuantity: this.quantity
            };
        }
        
        return { success: false, message: 'Cannot use this item' };
    }
    
    // Add more of this item
    addQuantity(amount = 1) {
        this.quantity += amount;
        return this.quantity;
    }
    
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            type: this.type,
            value: this.value,
            rarity: this.rarity,
            icon: this.icon,
            quantity: this.quantity
        };
    }
}

// Player bag/inventory system
class Bag {
    constructor(data = {}) {
        this.items = {};
        this.maxSlots = data.maxSlots || 50; // Default bag size
        
        // Load existing items
        if (data.items) {
            for (const [itemId, itemData] of Object.entries(data.items)) {
                this.items[itemId] = new Item(itemId, itemData);
            }
        }
    }
    
    // Add an item to the bag
    addItem(itemId, quantity = 1) {
        if (this.items[itemId]) {
            // Item already exists, add to quantity
            this.items[itemId].addQuantity(quantity);
        } else {
            // New item, check if we have space
            if (Object.keys(this.items).length >= this.maxSlots) {
                return { success: false, item: null, message: 'Bag is full!' };
            }
            
            this.items[itemId] = new Item(itemId, { quantity: quantity });
        }
        
        return { 
            success: true, 
            item: this.items[itemId], 
            totalQuantity: this.items[itemId].quantity 
        };
    }
    
    // Remove an item from the bag
    removeItem(itemId, quantity = 1) {
        if (!this.items[itemId]) {
            return { success: false, message: 'Item not found' };
        }
        
        const item = this.items[itemId];
        if (item.quantity < quantity) {
            return { success: false, message: 'Not enough items' };
        }
        
        item.quantity -= quantity;
        
        // Remove item completely if quantity reaches 0
        if (item.quantity <= 0) {
            delete this.items[itemId];
        }
        
        return { success: true, removedQuantity: quantity };
    }
    
    // Use an item from the bag
    useItem(itemId, character = null) {
        if (!this.items[itemId]) {
            return { success: false, message: 'Item not found' };
        }
        
        const item = this.items[itemId];
        const result = item.use(character);
        
        // Remove item from bag if it was used up
        if (result.success && item.quantity <= 0) {
            delete this.items[itemId];
        }
        
        return result;
    }
    
    // Get all items in the bag (excluding empty stacks)
    getAllItems() {
        return Object.values(this.items).filter(item => item.quantity > 0);
    }
    
    // Get items by type
    getItemsByType(type) {
        return Object.values(this.items).filter(item => item.type === type);
    }
    
    // Check if bag has space
    hasSpace() {
        return Object.keys(this.items).length < this.maxSlots;
    }
    
    // Get total number of items (counting quantities)
    getTotalItemCount() {
        return Object.values(this.items).reduce((total, item) => total + item.quantity, 0);
    }
    
    toJSON() {
        return {
            maxSlots: this.maxSlots,
            items: Object.fromEntries(
                Object.entries(this.items).map(([id, item]) => [id, item.toJSON()])
            )
        };
    }
}

// ============================================================
// ECONOMY — central source of truth for all XP formulas.
//
// Design intent for younger kids:
//  * Phrases are worth MORE than the sum of their single characters.
//  * Battles are worth MORE than passive capture (bigger XP + better item drops).
//  * Repeating the SAME easy word has diminishing returns (tapered multiplier),
//    while training NEW or DIVERSE phrases is rewarded with a "variety bonus".
//  * First-time completion of a phrase is a big milestone reward.
// ============================================================
const Economy = {
    // ---- Single-character practice ----------------------------------------------------
    CHARACTER_BASE_XP: 20,           // base XP before bonuses
    CHARACTER_ACCURACY_BONUS: 30,    // up to +30 for perfect accuracy
    CHARACTER_SPEED_BONUS: 10,       // +10 if under 30s
    MISTAKE_PENALTY: 2,              // -2 per mistake
    MIN_XP: 5,                       // a completed practice always yields >=5

    // Stroke-difficulty weights: harder (more strokes) = more valuable XP.
    STROKE_WEIGHTS: [
        { upTo: 3,  weight: 1.0 },
        { upTo: 6,  weight: 1.15 },
        { upTo: 10, weight: 1.3 },
        { upTo: 15, weight: 1.5 },
        { upTo: 99, weight: 1.75 }
    ],

    // Repeating the same character: reward tapers via exponential decay
    //  -> multiplier = floor + (1 - floor) * exp(-ln2 * repeats / halfLife)
    REPEAT_HALF_LIFE: 5,             // ~half XP after ~5 more repeats
    REPEAT_FLOOR: 0.15,              // never below 15% of base (still rewarding)

    // ---- Phrase training (sequence practice) ----------------------------------------
    PHRASE_MULT: 1.5,                // phrase XP >= 1.5x the sum of its chars
    PHRASE_FIRST_TIME_BONUS: 50,     // first completion bonus (per phrase)
    PHRASE_CHAR_REWARD: 'PHRASE_CHAR_SHARE',  // (semantic marker, see below)
    PHRASE_CHAR_SHARE: 0.5,          // each component char gets 50% of the phrase bonus

    // ---- Battle rewards ---------------------------------------------------------------
    BATTLE_BASE_XP_PER_LEVEL: 8,     // XP per opponent level (min 1)
    BATTLE_CAPTURE_BONUS: 20,        // +20 XP when the first capture lands
    BATTLE_REBATTLE_XP_MULT: 0.75,   // fighting again is still rewarded
    BATTLE_ITEM_CHANCE: 0.25,
    BATTLE_ITEM_RARITY_BIAS: 0.15,   // +15% chance for a rarer tier per Lvl/Diff

    // ---- Phrase diversity (training ALL phrases vs. ONE) ------------------------------
    // For each phrase the player has already practiced at least once, we reward
    // them again with a "diversity bonus" proportional to how many DISTINCT
    // phrases they have trained since the last one. This encourages variety.
    DIVERSITY_BONUS_START: 0.05,     // 5% for first other phrase trained
    DIVERSITY_BONUS_STEP: 0.075,     // +7.5% for each additional distinct phrase
    DIVERSITY_BONUS_MAX: 0.6,        // cap at +60%

    // ============================================================
    // Helpers
    // ============================================================

    // Weight for a given stroke count (higher = harder = more valuable)
    strokeWeight(strokeCount) {
        const s = Math.max(1, Number(strokeCount) || 1);
        for (const tier of Economy.STROKE_WEIGHTS) {
            if (s <= tier.upTo) return tier.weight;
        }
        return 1;
    },

    // Tapered multiplier for repeated practice of the SAME character.
    // 1.0 at first use, halves roughly every `halfLife` additional uses,
    // never dropping below `floor`.
    repeatMultiplier(repeats, halfLife = Economy.REPEAT_HALF_LIFE, floor = Economy.REPEAT_FLOOR) {
        const r = Math.max(1, Number(repeats) || 1);
        const decay = Math.exp(-Math.LN2 * (r - 1) / Math.max(1, halfLife));
        return Math.max(floor, floor + (1 - floor) * decay);
    },

    // How much extra XP does a phrase get over single-character practice
    // (as a multiplier applied to the phrase's total XP)?
    phraseMultiplier(length) {
        const len = Math.max(1, Number(length) || 1);
        // Slight extra reward for longer phrases (3+ characters)
        const lengthBonus = len >= 3 ? 0.1 : 0;
        return Economy.PHRASE_MULT + lengthBonus;
    },

    // XP for completing a phrase sequence.
    //  - `charsXP` = array of XP values each component character earned this session
    //                (we use the sum as the "base" so phrases are worth >= 1.5x chars)
    //  - `isFirst` = first time completing this phrase
    //  - `distinctTrained` = how many OTHER distinct phrases have been trained since
    //                        the last one (drives the variety/diversity bonus)
    phraseCompletionXP(charsXP, isFirst, distinctTrained) {
        const base = charsXP.reduce((a, b) => a + (Number(b) || 0), 0);
        const mult = Economy.phraseMultiplier(charsXP.length);
        const firstTime = isFirst ? Economy.PHRASE_FIRST_TIME_BONUS : 0;
        const diversity = distinctTrained >= 0 ?
            Math.min(Economy.DIVERSITY_BONUS_MAX,
                     Economy.DIVERSITY_BONUS_START +
                     Math.max(0, distinctTrained - 1) * Economy.DIVERSITY_BONUS_STEP)
            : 0;
        const total = (base * mult) + firstTime + (base * diversity);
        return Math.max(Economy.MIN_XP, Math.round(total));
    },

    // XP for winning a battle.
    battleReward(opponent, isCapture) {
        const level = Math.max(1, opponent.level || 1);
        const base = Economy.BATTLE_BASE_XP_PER_LEVEL * level;
        const capture = isCapture ? Economy.BATTLE_CAPTURE_BONUS : 0;
        // Re-battling a character you already own still rewards, less than capture
        return Math.max(Economy.MIN_XP, base + capture);
    },

    // Item drop chance and rare-tier bias for a given opponent
    itemDropChance(opponent) {
        return Economy.BATTLE_ITEM_CHANCE;
    },
    itemRarityBias(opponent) {
        return (opponent && (opponent.level || 0)) * Economy.BATTLE_ITEM_RARITY_BIAS;
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
        
        // Battle history (used for battle-XP tapering — fights the SAME word
        // taper off, just like repeat practice).
        this.totalBattles = data.totalBattles || 0;
        
        // Per-session XP cache — the XP this character earned in the most
        // recent practice session. Used by phrase-completion XP so that a
        // phrase is worth the sum of its component sessions times a multiplier.
        this.lastSessionXP = (data && typeof data.lastSessionXP === 'number') ? data.lastSessionXP : null;
        
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
        // Bug fix: guard against non-numeric/negative amounts that broke
        // leveling math (and could cause the while-loop to never advance).
        amount = Math.max(0, Math.floor(Number(amount) || 0));
        if (amount <= 0) {
            return false;
        }
        
        // Stop gaining XP if already at max level
        if (this.level >= 10) {
            return false;
        }
        
        this.xp += amount;
        let leveledUp = false;
        
        while (this.xp >= this.getXPForNextLevel() && this.level < 10) {
            this.xp -= this.getXPForNextLevel(); // XP needed BEFORE leveling up
            this.level++;
            leveledUp = true;
            
            // Recalculate stats on level up
            this.hp = this.calculateHP();
            this.attack = this.calculateAttack();
            this.defense = this.calculateDefense();
            
            // If we just reached max level, reset excess XP to 0
            if (this.level >= 10) {
                this.xp = 0;
                break;
            }
        }
        
        return leveledUp;
    }
    
    // Calculate XP reward based on accuracy and performance
    // Economy: XP scales with stroke difficulty (harder characters are worth
    // more), and drops with repeated practice of the SAME word (diminishing
    // returns) so kids can't "farm" one or two easy words forever.
    calculateXPReward(accuracy, mistakeCount, completionTime, repeats = 1) {
        const baseXP = Economy.CHARACTER_BASE_XP;
        const strokeWeight = Economy.strokeWeight(this.strokes);
        const accuracyBonus = Math.floor(accuracy * Economy.CHARACTER_ACCURACY_BONUS);
        const speedBonus = completionTime < 30000 ? Economy.CHARACTER_SPEED_BONUS : 0;
        const mistakePenalty = mistakeCount * Economy.MISTAKE_PENALTY;
        
        const raw = (baseXP + accuracyBonus + speedBonus) * strokeWeight - mistakePenalty;
        const withRepeat = raw * Economy.repeatMultiplier(repeats, Economy.REPEAT_HALF_LIFE, Economy.REPEAT_FLOOR);
        
        return Math.max(Economy.MIN_XP, Math.round(withRepeat));
    }
    
    // Record a practice session
    recordPractice(mistakeCount, accuracy, completionTime) {
        this.totalPractices++;
        this.totalMistakes += mistakeCount;
        
        if (accuracy > this.bestAccuracy) {
            this.bestAccuracy = accuracy;
        }
        
        // The character's own practice count is its "repeat count": the first
        // few sessions earn full XP, later ones taper off toward REPEAT_FLOOR.
        const repeats = Math.max(1, this.totalPractices);
        const xpGained = this.calculateXPReward(accuracy / 100, mistakeCount, completionTime, repeats);
        const leveledUp = this.addXP(xpGained);
        
        return { xpGained, leveledUp, accuracy, repeats };
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
            originalPhrase: this.originalPhrase,
            totalBattles: this.totalBattles,
            lastSessionXP: this.lastSessionXP
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
    
    // Calculate combined HP from characters - Enhanced for stronger phrases
    calculateHP() {
        const baseHP = 60; // Higher base than single characters (20)
        const characterBonus = this.characters.length * 25; // Higher per-character bonus
        const levelBonus = (this.level - 1) * 15; // 50% more per level than single characters (10)
        const phraseBonus = this.characters.length >= 3 ? 20 : 10; // Bonus for longer phrases
        return baseHP + characterBonus + levelBonus + phraseBonus;
    }
    
    // Calculate combined attack - Enhanced for stronger phrases  
    calculateAttack() {
        const baseAttack = 18; // Higher base than single characters (10)
        const difficultyBonus = this.difficulty * 6; // Higher difficulty scaling
        const levelBonus = (this.level - 1) * 4; // Double level bonus vs single characters (2)
        const lengthBonus = Math.floor(this.characters.length / 2) * 3; // Bonus for longer phrases
        return baseAttack + difficultyBonus + levelBonus + lengthBonus;
    }
    
    // Calculate combined defense - Enhanced for stronger phrases
    calculateDefense() {
        const baseDefense = 15; // Higher base than single characters (8)
        const frequencyBonus = 18 - Math.floor(this.frequency / 12); // Better frequency scaling
        const levelBonus = (this.level - 1) * 4; // Double level bonus vs single characters (2)
        const complexityBonus = this.characters.length >= 3 ? 5 : 2; // Bonus for complex phrases
        return baseDefense + frequencyBonus + levelBonus + complexityBonus;
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
        
        // Stop gaining XP if already at max level
        if (this.level >= 10) {
            return {
                xpGained: 0,
                leveledUp: false,
                isFirstCompletion: isFirstCompletion
            };
        }
        
        this.xp += xpGained;
        
        // Check for level up
        let leveledUp = false;
        while (this.xp >= this.getXPForNextLevel() && this.level < 10) {
            const xpRequired = this.getXPForNextLevel();
            this.xp -= xpRequired;
            this.level++;
            leveledUp = true;
            
            // Recalculate stats on level up
            this.hp = this.calculateHP();
            this.attack = this.calculateAttack();
            this.defense = this.calculateDefense();
            
            // If we just reached max level, reset excess XP to 0
            if (this.level >= 10) {
                this.xp = 0;
                break;
            }
        }
        
        return {
            xpGained: this.level >= 10 ? 0 : xpGained,
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
        this.practiceCount = data.practiceCount || 0; // Track number of practice sessions
        this.achievements = data.achievements || [];
        // Grand trial progress: { "0": { cleared: [bool...], wins: {trialIdx: n} }, ... }
        this.trialProgress = data.trialProgress || {};
    }
    
    getXPForNextLevel() {
        return this.level * 200;
    }
    
    addXP(amount) {
        // Bug fix: guard against non-numeric / negative amounts (e.g. from
        // a corrupt save or bad input) to prevent negative XP or infinite
        // level-drift loops.
        amount = Math.max(0, Math.floor(Number(amount) || 0));
        if (amount <= 0) {
            return false;
        }
        
        this.xp += amount;
        let leveledUp = false;
        
        // Cap the number of level-ups per call to prevent runaway loops if
        // xp somehow became astronomically large from a corrupt save.
        const MAX_LEVEL_UPS_PER_CALL = 100;
        let guard = 0;
        while (this.xp >= this.getXPForNextLevel() && guard++ < MAX_LEVEL_UPS_PER_CALL) {
            const xpNeeded = this.getXPForNextLevel(); // Get XP needed BEFORE leveling up
            if (xpNeeded <= 0) break; // safety: avoid infinite loop
            this.xp -= xpNeeded;
            this.level++;
            leveledUp = true;
        }
        
        // If we hit the guard, discard the excess to keep the state sane
        if (this.xp >= this.getXPForNextLevel()) {
            this.xp = this.xp % Math.max(1, this.getXPForNextLevel());
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
            practiceCount: this.practiceCount,
            achievements: this.achievements,
            trialProgress: this.trialProgress
        };
    }
}
