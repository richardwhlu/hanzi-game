// Core game engine that handles game logic and hanzi-writer integration

class HanziGame {
    // Load a pre-loaded character pack (workbook chapter). Fetches it,
    // validates it, and makes it the active dataset — the same code paths
    // an upload would take. Returns { success, message } like the other
    // import methods so the UI can report the outcome uniformly.
    async loadCharacterPack(id) {
        try {
            // Ensure the manifest is loaded (UI usually preloads it, but the
            // engine shouldn't depend on that).
            if (!this.dataManager.getPackMeta(id)) {
                await this.dataManager.loadPacks();
            }
            const data = await this.dataManager.fetchPack(id);
            const meta = this.dataManager.getPackMeta(id);
            this.dataManager.importPack(data, meta);

            // Adopt the pack as a fresh set: replace all characters and
            // phrases with the pack's, dropping progress on other sets.
            for (const k of Object.keys(this.characters)) delete this.characters[k];
            for (const k of Object.keys(this.phrases)) delete this.phrases[k];
            const activeData = this.dataManager.getActiveCharacterData();
            for (const [char, charData] of Object.entries(activeData)) {
                this.characters[char] = new Character(char, charData);
            }
            this.player.totalCharacters = Object.keys(this.characters).length;
            this.initializePhrases();
            this.checkForNewUnlocks();
            this.saveGame();

            const name = (meta && meta.name) || id;
            const label = (meta && meta.grade != null)
                ? ` (Grade ${meta.grade}, Lesson ${meta.lesson})` : '';
            return {
                success: true,
                message: `Loaded pack "${name}"${label}: ${Object.keys(this.characters).length} characters, ` +
                         `${Object.keys(this.phrases).length} phrases.`
            };
        } catch (error) {
            console.error('Failed to load character pack:', error);
            return { success: false, message: error.message };
        }
    }

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
        this.phraseSessionData = {
            totalMistakes: 0,
            totalTime: 0,
            accuracySum: 0,
            characterCount: 0
        };
        
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
                
                // Blank-slate mode: start with an EMPTY box; strokes only
                // appear as the kid draws them (or when a hint is shown).
                // This matches what writing on paper looks like — no ghost
                // of the whole character waiting to be copied.
                //
                // IMPORTANT (regression 47510f8): do NOT pass
                // `radicalColor: 'transparent'` or any non-hex/rgba color
                // string. hanzi-writer 3.5.0 validates colors to hex or
                // r[g]ba(...) and throws "Invalid color" — which is async
                // (happens during the char-data load) and silently kills
                // `quiz()`, so the canvas appears blank AND ignores every
                // pointer event. With `showCharacter:false` and
                // `showOutline:false` the character is already hidden —
                // no radical-color override needed at all.
                showCharacter: false,   // hides the main character group (opacity 0)
                showOutline: false,    // also hides the faint outline layer
                strokeColor: '#222',   // color of the kid's own strokes (valid hex)
                
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
    
    // Handle practice completion.
    //
    // Idempotency guard (BUG FIX): The writer's `onComplete` callback fires
    // on every completed drawing, and the UI advances the phrase sequence on
    // its own timer. Without a guard, the same character could be "counted"
    // more than once (double XP, inflated practice counts). We mark the
    // session as already-counted immediately, and ignore any later callbacks
    // for the same session.
    handleComplete(summary) {
        if (!this.currentCharacter) return;
        
        // Already counted this session? (e.g. a delayed second onComplete
        // callback for the same completed drawing.)
        if (this.sessionData && this.sessionData._counted) {
            return;
        }
        if (this.sessionData) this.sessionData._counted = true;
        
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
        
        // Record the practice session (this also gives XP to the character).
        const result = this.currentCharacter.recordPractice(
            this.currentMistakes,
            accuracy,
            completionTime
        );
        
        // Award XP to the player.
        //   - SOLO character practice: player gets XP (scaled by stroke
        //     difficulty, capped at the character's own XP gain) + a small
        //     player bonus of 25% of that amount (so solo practice rewards
        //     less than a completed phrase, which pays out a bigger bonus).
        //   - PHRASE practice: player XP is deferred to
        //     completePhraseSequence(), which pays a bigger phrase bonus
        //     (sum of component sessions × multiplier + first-time/variety
        //     bonuses). This is what makes "phrases are worth more than
        //     solo characters" in the economy.
        const inPhraseMode = this.isPhrasePractice();
        const playerXP = inPhraseMode
            ? 0
            : Math.max(Economy.MIN_XP,
                Math.floor(Economy.strokeWeight(this.currentCharacter.strokes) * result.xpGained));
        const playerLeveledUp = this.player.addXP(playerXP);
        
        // Remember this session's XP on the character (used by phrase-completion
        // XP calculation so a phrase is worth the sum of its component
        // sessions times the phrase multiplier).
        this.currentCharacter.lastSessionXP = result.xpGained;
        this.player.totalPracticeTime += completionTime;
        this.player.practiceCount += 1; // Increment practice count for battle unlock
        
        // Check for new unlocks
        const newUnlocks = this.checkForNewUnlocks();
        
        // Check if we're in phrase practice mode
        if (this.isPhrasePractice()) {
            const phraseProgress = this.getPhraseProgress();
            
            // Accumulate session data for phrase performance calculation
            this.phraseSessionData.totalMistakes += this.currentMistakes;
            this.phraseSessionData.totalTime += completionTime;
            this.phraseSessionData.accuracySum += accuracy;
            this.phraseSessionData.characterCount++;
            
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
        
        try {
            // Show just the next stroke as a hint (much more helpful for learning!)
            this.currentWriter.showNextStroke();
            console.log('Hint shown: next stroke');
        } catch (error) {
            console.error('Error showing next stroke hint:', error);
            // Fallback: try showing character outline
            try {
                this.currentWriter.showCharacter({
                    strokeColor: '#ddd',
                    strokeWidth: 2,
                    onComplete: () => {
                        console.log('Fallback hint: showed character outline');
                    }
                });
            } catch (fallbackError) {
                console.error('All hint methods failed:', fallbackError);
                // Final fallback: animate the character
                try {
                    this.currentWriter.animateCharacter();
                } catch (finalError) {
                    console.error('Final hint fallback failed:', finalError);
                }
            }
        }
    }
    
    // Cancel the current phrase sequence (used by the UI when the player
    // presses "Next Practice" mid-phrase or "Back").
    cancelPhraseSequence() {
        if (this.currentPhrase) {
            // Reset per-component markers so the next session starts fresh
            for (const charText of this.currentPhrase.characters) {
                const ch = this.characters[charText];
                if (ch) ch.lastSessionXP = null;
            }
            this.currentPhrase = null;
            this.currentPhraseIndex = 0;
            this.saveGame();
        }
    }
    
    // Cleanly abandon the current practice session (single character or
    // mid-phrase). Prevents leftover phrase state from corrupting the next
    // session (BUG: previously "Back" left currentPhrase set, so the next
    // single-character practice was treated as phrase practice).
    exitPracticeSession() {
        this.cancelPhraseSequence();
        this.currentCharacter = null;
        this.currentWriter = null;
        this.practiceStartTime = null;
        this.currentMistakes = 0;
        this.sessionData = { mistakes: [], strokes: [], startTime: null };
    }
    
    // Reset current practice
    resetPractice() {
        if (this.currentWriter) {
            try { this.currentWriter.cancelQuiz(); } catch (e) { /* no quiz active */ }
        }
        this.practiceStartTime = Date.now();
        this.currentMistakes = 0;
        this.sessionData = {
            mistakes: [],
            strokes: [],
            startTime: this.practiceStartTime
        };
        // Re-enter quiz mode after a brief delay so the writer has time to
        // render the next stroke.
        if (this.currentWriter) {
            setTimeout(() => {
                try { if (this.currentWriter && !this.currentWriter.quiz) { /* legacy */ return; } this.currentWriter.quiz(); }
                catch (e) { /* already in quiz mode */ }
            }, 500);
        }
    }
    
    // Start a phrase practice sequence
    startPhraseSequence(phrase) {
        this.currentPhrase = phrase;
        this.currentPhraseIndex = 0;
        
        // Reset phrase session tracking
        this.phraseSessionData = {
            totalMistakes: 0,
            totalTime: 0,
            accuracySum: 0,
            characterCount: 0,
            startTime: Date.now()
        };
        
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
    
    // Calculate performance-based XP for phrase completion.
    //
    // The XP is computed by summing the XP each *component character* earned
    // during this session, then multiplying by a phrase multiplier (>= 1.5)
    // plus a first-time bonus and a "variety bonus" that grows the more
    // DISTINCT phrases the player has trained. This makes phrases worth
    // MORE than single characters, and rewards breadth of practice.
    calculatePhraseXP() {
        if (!this.currentPhrase) {
            return 0;
        }
        
        // Collect the per-character XP from this session. We use each
        // character's final `xpGained` if we captured it; otherwise we
        // fall back to the current character's last recorded session.
        const charsXP = this.currentPhrase.characters.map(charText => {
            const ch = this.characters[charText];
            if (ch && typeof ch.lastSessionXP === 'number') {
                return ch.lastSessionXP;
            }
            // Fallback estimate based on stroke weight
            const strokes = ch ? ch.strokes : 5;
            return Economy.MIN_XP + Economy.strokeWeight(strokes) * Economy.CHARACTER_BASE_XP;
        });
        
        const isFirst = !this.currentPhrase.firstTimeCompleted;
        const distinctTrained = this.getDistinctPhrasesTrainedExcluding(this.currentPhrase.text);
        
        const xp = Economy.phraseCompletionXP(charsXP, isFirst, distinctTrained);
        
        console.log('Phrase XP calculation:', {
            phraseText: this.currentPhrase.text,
            charsXP,
            isFirst,
            distinctTrained,
            finalXP: xp
        });
        
        return xp;
    }
    
    // How many DISTINCT phrases has the player trained (at least once),
    // excluding the one about to be (re-)trained now? Drives the variety bonus.
    getDistinctPhrasesTrainedExcluding(text) {
        let count = 0;
        for (const [t, p] of Object.entries(this.phrases)) {
            if (t !== text && p && p.totalPractices > 0) {
                count++;
            }
        }
        return count;
    }
    
    // Reset per-session XP markers on components so the next session starts fresh
    clearLastSessionXP() {
        if (!this.currentPhrase) {
            // Also clear any left over from normal practice (character) so it's not stale
            for (const ch of Object.values(this.characters)) {
                ch.lastSessionXP = null;
            }
            return;
        }
        for (const charText of this.currentPhrase.characters) {
            const ch = this.characters[charText];
            if (ch) ch.lastSessionXP = null;
        }
    }
    
    // Complete phrase practice sequence
    completePhraseSequence() {
        if (!this.currentPhrase) return;
        
        // Calculate performance-based XP for completing full phrase
        const bonusXP = this.calculatePhraseXP();
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
            // Fix: on first completion the phrase-character still earns XP for
            // this session (previously it stayed at 0 XP forever on the first
            // pass, then jumped to "half" on subsequent passes).
            const phraseCharacter = this.characters[this.currentPhrase.text];
            if (phraseCharacter) {
                const phraseXP = Math.max(Economy.MIN_XP, Math.floor(bonusXP * Economy.PHRASE_CHAR_SHARE));
                completionData.phraseCharacterXP = phraseXP;
                completionData.phraseCharacterLeveledUp = phraseCharacter.addXP(phraseXP);
            }
        } else {
            // If phrase character already exists, give it XP too
            const phraseCharacter = this.characters[this.currentPhrase.text];
            if (phraseCharacter && phraseCharacter.isPhraseCharacter) {
                const phraseXP = Math.max(Economy.MIN_XP, Math.floor(bonusXP * Economy.PHRASE_CHAR_SHARE)); // Give phrase character the char-share of the bonus
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
        // Bug fix: previously divided by totalCharacters unconditionally →
        // NaN (and crash in some UI) for a fresh/empty game.
        const averageAccuracy = totalCharacters > 0
            ? Object.values(this.characters).reduce((sum, char) => sum + char.getAccuracy(), 0) / totalCharacters
            : 0;
        
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
    
    // Generate a wild opponent for battle.
    //
    // IMPORTANT: opponents are drawn ONLY from characters and phrases the
    // player already owns — never from the full vocabulary pack. This keeps
    // the practice set stable: a battle should reinforce what the kid
    // already knows, not lure them into a bunch of new "shiny" 1-stroke
    // characters to farm.
    generateWildOpponent() {
        const ownedCharacters = Object.entries(this.characters)
            .filter(([, c]) => c && c.unlocked !== false && !c.isPhraseCharacter)
            .map(([char, c]) => ({ char, ...this.getCharacterDataForChar(char), level: c.level || 1, isWild: true }));
        
        const ownedPhrases = Object.entries(this.phrases)
            .filter(([, p]) => p && p.unlocked)
            .map(([text, p]) => ({ text, ...this.getPhraseDataForPhrase(text), isWild: true, isPhrase: true, level: Math.max(1, p.level || 1) }));
        
        const allOpponents = [...ownedCharacters, ...ownedPhrases];
        
        // If the player somehow owns nothing, refuse to invent a new
        // character — return a safe empty opponent (no capture possible)
        // so the UI can tell the player to practice first. This is the
        // hard guarantee that a battle NEVER introduces characters outside
        // the kid's set.
        if (allOpponents.length === 0) {
            return {
                name: '？',
                pinyin: '',
                meaning: 'empty set — practice a character first',
                isPhrase: false,
                isWild: true,
                noCapture: true,
                emptySetFallback: true,
                strokes: 1,
                difficulty: 1,
                frequency: 50,
                level: Math.max(1, this.getPlayerLevelStats().averageLevel || 1)
            };
        }
        
        const opponent = this.selectWeightedOpponent(allOpponents);
        return this.createBattleOpponent(opponent);
    }
    
    // Pull the data record for a character by trying the active data source
    // (custom or built-in) — used for opponent stat construction.
    getCharacterDataForChar(char) {
        const active = this.dataManager.getActiveCharacterData();
        if (active && active[char]) {
            return {
                pinyin: active[char].pinyin,
                strokes: active[char].strokes,
                difficulty: active[char].difficulty,
                frequency: active[char].frequency,
                originalData: active[char]
            };
        }
        // Fall back to the character's own stored data — should always be
        // present because the kid owns it.
        const c = this.characters[char];
        return {
            pinyin: c.pinyin || '',
            strokes: c.strokes || 5,
            difficulty: c.difficulty || 1,
            frequency: c.frequency || 50,
            originalData: c.toJSON ? c.toJSON() : {}
        };
    }
    
    getPhraseDataForPhrase(text) {
        const active = this.dataManager.getActivePhraseData();
        const src = (active && active[text]) || this.phrases[text] || {};
        return {
            pinyin: src.pinyin || '',
            meaning: src.meaning || '',
            difficulty: src.difficulty || 1,
            frequency: src.frequency || 50,
            characters: src.characters || []
        };
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
    
    // Add defeated opponent to player's collection.
    // `fighterCharacter` (optional) is the live player Character object
    // that participated in the battle; it earns the per-battle XP bonus.
    addDefeatedOpponent(opponent, fighterCharacter = null) {
        const captureResult = {};
        
        // Opponents the game refuses to add (e.g. the empty-set fallback).
        // We still award the combat XP, just nothing new enters the set.
        if (opponent.noCapture) {
            captureResult.type = opponent.isPhrase ? 'phrase' : 'character';
            captureResult.name = opponent.name;
            captureResult.success = false;
            captureResult.isNewCapture = false;
            captureResult.noCapture = true;
        } else if (opponent.isPhrase) {
            // Add phrase to collection if not already there
            if (!this.phrases[opponent.name]) {
                this.phrases[opponent.name] = new Phrase(opponent.name, opponent.originalData);
            }
            
            // Bug fix: only count the phrase as newly captured if it was NOT
            // already unlocked (previously totalPhrases was incremented every
            // battle victory, inflating the counter).
            const wasUnlocked = this.phrases[opponent.name].unlocked;
            this.phrases[opponent.name].unlocked = true;
            if (!wasUnlocked) {
                this.phrases[opponent.name].level = 1;
                this.phrases[opponent.name].xp = 0;
                this.player.totalPhrases++;
            }
            
            captureResult.type = 'phrase';
            captureResult.name = opponent.name;
            captureResult.isNewCapture = !wasUnlocked;
        } else {
            // Add character to collection if not already there
            if (!this.characters[opponent.name]) {
                // Force level 1 for captured characters
                const captureData = { ...opponent.originalData, level: 1, xp: 0 };
                const result = this.addCharacter(opponent.name, captureData);
                captureResult.type = 'character';
                captureResult.name = opponent.name;
                captureResult.success = result.success;
                captureResult.isNewCapture = result.success;
            } else {
                captureResult.type = 'character';
                captureResult.name = opponent.name;
                captureResult.success = false;
                captureResult.isNewCapture = false;
                captureResult.message = 'Already owned';
            }
        }
        
        // BATTLE REWARDS — battles earn more XP than passive capture (base
        // scales with opponent level, first-time captures get a capture
        // bonus). Per-character battles still reward but taper off via
        // repeatMultiplier so one low-level opponent can't be farmed forever.
        if (fighterCharacter) {
            const base = Economy.battleReward(opponent, !!captureResult.isNewCapture);
            const battlesFought = (fighterCharacter.totalBattles || 0) + 1;
            const tapered = Math.max(Economy.MIN_XP,
                Math.round(base * Economy.repeatMultiplier(battlesFought)));
            fighterCharacter.totalBattles = battlesFought;
            const fighterLeveled = fighterCharacter.addXP(tapered);
            const playerLeveled = this.player.addXP(base);
            captureResult.battleXP = base;
            captureResult.fighterXP = tapered;
            captureResult.fighterLeveledUp = fighterLeveled;
            captureResult.playerBattleLeveledUp = playerLeveled;
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
    
    // Import custom data with complete reset (for fresh start with custom data only)
    importCustomDataWithReset(jsonData) {
        try {
            // First, import the custom data
            const result = this.dataManager.importCombinedData(jsonData);
            
            if (result.success) {
                // Reset all game progress
                this.resetToDefaultsForCustomData();
                
                // Switch to custom data source
                this.dataManager.setDataSource('custom');
                
                // Initialize only with custom data
                this.initializeWithCustomDataOnly();
                
                this.saveGame();
                
                return { 
                    success: true, 
                    message: 'Custom data imported successfully! Game reset to start fresh with your custom data.'
                };
            }
            
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    // Reset to defaults but don't add starter characters (for custom data import)
    resetToDefaultsForCustomData() {
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
        
        // Don't add any starter characters - we'll add only what's in custom data
        
        console.log('Game reset for custom data import');
    }
    
    // Initialize game with custom data only
    initializeWithCustomDataOnly() {
        // Get custom character data
        const activeCharacterData = this.dataManager.getActiveCharacterData();
        
        // Add all available characters from custom data at level 1
        for (const [char, data] of Object.entries(activeCharacterData)) {
            this.characters[char] = new Character(char, data);
        }
        
        // Update player totals
        this.player.totalCharacters = Object.keys(this.characters).length;
        
        // Give starter XP boost items
        this.bag.addItem('xp_boost_small', 2);
        
        // Initialize phrases with custom data
        this.initializePhrases();
        
        console.log('Game initialized with custom data only');
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
        
        // Reinitialize phrases
        this.initializePhrases();
        
        console.log('Game reset to default state');
    }
}
