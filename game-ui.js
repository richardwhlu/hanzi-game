// UI management and screen transitions

class GameUI {
    constructor(game) {
        this.game = game;
        this.currentScreen = 'character-select';
        this.elements = {};
        
        // Initialize practice tracking system
        this.practiceTracker = new PracticeTracker();
        this.practiceUI = new PracticeUI(this.practiceTracker, this);
        
        this.initializeElements();
        this.bindEvents();
        this.setupGameCallbacks();
    }
    
    // Initialize DOM element references
    initializeElements() {
        // Header elements
        this.elements.playerLevel = document.getElementById('player-level');
        this.elements.playerXP = document.getElementById('player-xp');
        this.elements.characterCount = document.getElementById('character-count');
        this.elements.itemCount = document.getElementById('item-count');
        
        // Screen elements
        this.elements.characterSelect = document.getElementById('character-select');
        this.elements.practiceScreen = document.getElementById('practice-screen');
        this.elements.manageScreen = document.getElementById('manage-screen');
        this.elements.evolutionScreen = document.getElementById('evolution-screen');
        
        // Character grids
        this.elements.characterGrid = document.getElementById('character-grid');
        this.elements.manageGrid = document.getElementById('manage-grid');
        
        // Practice screen elements
        this.elements.currentCharacterName = document.getElementById('current-character-name');
        this.elements.charLevel = document.getElementById('char-level');
        this.elements.charXP = document.getElementById('char-xp');
        this.elements.charHP = document.getElementById('char-hp');
        this.elements.hanziWriter = document.getElementById('hanzi-writer');
        this.elements.xpFeedback = document.getElementById('xp-feedback');
        this.elements.xpAmount = document.getElementById('xp-amount');
        this.elements.accuracyPercent = document.getElementById('accuracy-percent');
        
        // Management elements
        this.elements.newCharacterInput = document.getElementById('new-character-input');
        this.elements.newPinyinInput = document.getElementById('new-pinyin-input');
        this.elements.phraseGrid = document.getElementById('available-phrases');
        
        // Battle elements
        this.elements.battleScreen = document.getElementById('battle-screen');
        this.elements.playerBattleCharacter = document.getElementById('player-character');
        this.elements.enemyBattleCharacter = document.getElementById('enemy-character');
        this.elements.playerTeam = document.getElementById('player-team');
        this.elements.battleMessages = document.getElementById('battle-messages');
        this.elements.attackBtn = document.getElementById('attack-btn');
        this.elements.findOpponentBtn = document.getElementById('find-opponent-btn');
        this.elements.enemySideTitle = document.getElementById('enemy-side-title');
        this.elements.enemyTeam = document.getElementById('enemy-team');

        // Grand trial elements
        this.elements.trialsScreen = document.getElementById('trials-screen');
        this.elements.trialsList = document.getElementById('trials-list');
        this.elements.trialsBtn = document.getElementById('trials-btn');

        // Items elements
        this.elements.itemsScreen = document.getElementById('items-screen');
        this.elements.itemsGrid = document.getElementById('items-grid');

        // Modal elements
        this.elements.characterModal = document.getElementById('character-modal');
        this.elements.modalItemInfo = document.getElementById('modal-item-info');
        this.elements.modalCharacterGrid = document.getElementById('modal-character-grid');
        this.elements.modalClose = document.getElementById('modal-close');

        // Team selection modal elements
        this.elements.teamSelectionModal = document.getElementById('team-selection-modal');
        this.elements.availableCharactersList = document.getElementById('available-team-grid');
        this.elements.selectedTeamList = document.getElementById('selected-team-grid');
        this.elements.selectedCount = document.getElementById('selected-count');
        this.elements.maxCount = document.getElementById('max-count');
        this.elements.startBattleBtn = document.getElementById('start-battle-btn');
        this.elements.cancelTeamBtn = document.getElementById('cancel-team-btn');
        this.elements.teamModalClose = document.getElementById('team-modal-close');

        // Data management elements
        this.elements.currentDataSource = document.getElementById('current-data-source');
        this.elements.dataCharCount = document.getElementById('data-char-count');
        this.elements.dataPhraseCount = document.getElementById('data-phrase-count');
        this.elements.uploadArea = document.getElementById('upload-area');
        this.elements.fileInput = document.getElementById('file-input');
        this.elements.browseFiles = document.getElementById('browse-files');
        this.elements.switchToBuiltin = document.getElementById('switch-to-builtin');
        this.elements.switchToCustom = document.getElementById('switch-to-custom');
        this.elements.exportCustomData = document.getElementById('export-custom-data');
        this.elements.clearCustomData = document.getElementById('clear-custom-data');
        this.elements.showExamples = document.getElementById('show-examples');
        
        // Examples modal elements
        this.elements.examplesModal = document.getElementById('examples-modal');
        this.elements.examplesModalClose = document.getElementById('examples-modal-close');
        this.elements.characterExample = document.getElementById('character-example');
        this.elements.phraseExample = document.getElementById('phrase-example');
        this.elements.combinedExample = document.getElementById('combined-example');
        this.elements.downloadCharExample = document.getElementById('download-char-example');
        this.elements.downloadPhraseExample = document.getElementById('download-phrase-example');
        this.elements.downloadCombinedExample = document.getElementById('download-combined-example');
    }
    
    // Bind event listeners
    bindEvents() {
        // Header button events
        document.getElementById('items-btn').addEventListener('click', () => this.showItemsScreen());
        document.getElementById('battle-btn').addEventListener('click', () => this.startBattle());
        document.getElementById('trials-btn').addEventListener('click', () => this.showScreen('trials-screen'));
        document.getElementById('trials-back-btn').addEventListener('click', () => this.showScreen('character-select'));
        // Note: File menu buttons (save, export, load) are handled in setupDropdownMenus()
        document.getElementById('manage-btn').addEventListener('click', () => this.showScreen('manage-screen'));
        // Note: game-reset-btn event listener is set up in initializeSettingsDropdown() to include dropdown closing
        
        // Navigation events
        document.getElementById('back-btn').addEventListener('click', () => {
            // Bug fix: previously "Back" only changed screens but left
            // currentPhrase/currentCharacter state intact, so the next
            // single-character practice was treated (incorrectly) as
            // phrase practice. Now we clean up the session properly.
            if (this.game && this.game.exitPracticeSession) {
                this.game.exitPracticeSession();
            }
            this.showScreen('character-select');
        });
        document.getElementById('back-to-select').addEventListener('click', () => this.showScreen('character-select'));
        document.getElementById('back-from-evolution').addEventListener('click', () => this.showScreen('character-select'));
        document.getElementById('items-back-btn').addEventListener('click', () => this.showScreen('character-select'));
        document.getElementById('instructions-back-btn').addEventListener('click', () => this.showScreen('character-select'));
        
        // Modal events
        this.elements.modalClose.addEventListener('click', () => this.hideCharacterModal());
        
        // Character management events
        document.getElementById('add-character-btn').addEventListener('click', () => this.showScreen('manage-screen'));
        document.getElementById('add-char-btn').addEventListener('click', () => this.addNewCharacter());
        
        // Practice control events
        document.getElementById('hint-btn').addEventListener('click', () => this.game.showHint());
        document.getElementById('reset-btn').addEventListener('click', () => this.game.resetPractice());
        document.getElementById('next-btn').addEventListener('click', () => this.nextPractice());
        
        // Allow Enter key to add characters
        this.elements.newCharacterInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addNewCharacter();
            }
        });
        
        // Allow Enter key on pinyin input too
        this.elements.newPinyinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addNewCharacter();
            }
        });

        // Data management events
        this.bindDataManagementEvents();
        
        // Dropdown menu events
        this.bindDropdownEvents();
    }
    
    // Setup game engine callbacks
    setupGameCallbacks() {
        this.game.onPracticeComplete = (data) => this.handlePracticeComplete(data);
        this.game.onMistakeFeedback = (mistake) => this.handleMistakeFeedback(mistake);
        this.game.onStrokeFeedback = (stroke) => this.handleStrokeFeedback(stroke);
        this.game.onPhraseComplete = (data) => this.handlePhraseComplete(data);
    }
    
    // Switch between screens
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        }
        
        // Update content based on screen
        switch (screenId) {
            case 'character-select':
                this.refreshCharacterGrid();
                break;
            case 'manage-screen':
                this.refreshManageGrid();
                this.refreshPacksList();
                break;
            case 'evolution-screen':
                this.refreshPhraseGrid();
                break;
            case 'items-screen':
                this.refreshItemsGrid();
                break;
            case 'trials-screen':
                this.refreshTrialsScreen();
                break;
        }
        
        this.updateHeaderStats();
    }
    
    // Update header statistics
    updateHeaderStats() {
        const stats = this.game.getGameStats();
        this.elements.playerLevel.textContent = stats.playerLevel;
        this.elements.playerXP.textContent = `${this.game.player.xp}/${this.game.player.getXPForNextLevel()}`;
        this.elements.characterCount.textContent = stats.totalCharacters;
        this.elements.itemCount.textContent = this.game.bag.getTotalItemCount();
        
        // Update battle button based on lock status
        this.updateBattleButton();
        this.updateTrialsButton();
    }
    
    // Update the trials header button with badge/trial progress
    updateTrialsButton() {
        const trialsBtn = this.elements.trialsBtn;
        if (!trialsBtn) return;
        
        const summary = this.game.getTrialSummary();
        const cleared = summary.reduce((n, s) => n + s.clearedCount, 0);
        const total = summary.reduce((n, s) => n + s.trials.length, 0);
        const allDone = summary.every(s => s.allCleared);
        
        trialsBtn.textContent = allDone ? '🏆 Trials ⭐' : `🏆 Trials (${cleared}/${total})`;
        trialsBtn.title = allDone
            ? 'All Grand Trials complete — rematch any guardian!'
            : `Grand Trial battles: ${cleared}/${total} trials cleared. Face the guardians!`;
    }
    
    // Update battle button appearance based on unlock status
    updateBattleButton() {
        const battleBtn = document.getElementById('battle-btn');
        const status = this.practiceTracker.getStatus();
        
        if (status.battleUnlocked) {
            battleBtn.textContent = '⚔️ Battle';
            battleBtn.title = 'Battle wild characters and phrases!';
            battleBtn.classList.remove('locked');
        } else {
            // v2: unlock progress = DISTINCT characters trained
            const distinct = status.distinctTrained !== undefined ? status.distinctTrained : status.practiceCount;
            battleBtn.textContent = `🔒 Battle (${distinct}/${status.practicesRequired})`;
            battleBtn.title = `Train ${status.practicesRemaining} more different character${status.practicesRemaining === 1 ? '' : 's'} to unlock battles (same character doesn't count more than once)`;
            battleBtn.classList.add('locked');
        }
    }
    
    // Refresh character selection grid
    refreshCharacterGrid() {
        const characters = this.game.getAvailableCharacters();
        this.elements.characterGrid.innerHTML = '';
        
        characters.forEach(character => {
            const card = this.createCharacterCard(character, true);
            this.elements.characterGrid.appendChild(card);
        });
        
        // Add phrase evolution button if phrases available
        const unlockedPhrases = this.game.getAvailablePhrases();
        if (unlockedPhrases.length > 0) {
            const phraseButton = document.createElement('div');
            phraseButton.className = 'character-card phrase-evolution-btn';
            phraseButton.innerHTML = `
                <div class="character-display">🔮</div>
                <div class="character-info">
                    <div>Create Phrases</div>
                    <div class="character-level">Evolution</div>
                </div>
            `;
            phraseButton.addEventListener('click', () => this.showScreen('evolution-screen'));
            this.elements.characterGrid.appendChild(phraseButton);
        }
    }
    
    // Create character card element
    createCharacterCard(character, clickable = false) {
        const card = document.createElement('div');
        let cardClass = character.isPhraseCharacter ? 'character-card phrase-character' : 'character-card';
        
        // Add max-level class for level 10 characters
        if (character.level >= 10) {
            cardClass += ' max-level';
        }
        
        card.className = cardClass;
        
        const progressWidth = character.level >= 10 ? 100 : (character.xp / character.getXPForNextLevel()) * 100;
        
        // Remove sparkle indicator, show level for all characters
        const phraseIndicator = '';
        const characterType = `Level ${character.level}`;
        
        card.innerHTML = `
            <div class="character-display">${phraseIndicator}${character.char}</div>
            <div class="character-info">
                <div><strong>${character.pinyin}</strong></div>
                <div class="character-level">${characterType}</div>
                <div>HP: ${character.hp} | ATK: ${character.attack} | DEF: ${character.defense}</div>
                <div>Accuracy: ${character.getAccuracy()}%</div>
                <div style="background: #ddd; height: 4px; margin: 4px 0;">
                    <div style="background: ${character.isPhraseCharacter ? 'var(--gbc-yellow)' : 'var(--gbc-blue)'}; height: 100%; width: ${progressWidth}%;"></div>
                </div>
            </div>
        `;
        
        if (clickable) {
            card.addEventListener('click', () => this.startPractice(character.char));
        }
        
        return card;
    }
    
    // Start practice session
    startPractice(char) {
        try {
            const character = this.game.characters[char];
            
            // Check if this is a phrase character
            if (character && character.isPhraseCharacter) {
                // Start phrase sequence practice instead
                this.startPhraseCharacterPractice(character);
            } else {
                // Regular character practice
                const practiceCharacter = this.game.startPractice(char);
                this.updatePracticeScreen(practiceCharacter);
                this.showScreen('practice-screen');
                
                // Create writer and start quiz
                setTimeout(() => {
                    this.game.createWriter('hanzi-writer', char);
                    this.game.startQuiz();
                }, 500);
            }
        } catch (error) {
            console.error('Failed to start practice:', error);
            this.showMessage('Failed to start practice session', 'error');
        }
    }
    
    // Start phrase character practice (practice each character in the phrase sequence)
    startPhraseCharacterPractice(phraseCharacter) {
        // Find the original phrase in the phrases collection
        const originalPhrase = this.game.phrases[phraseCharacter.originalPhrase];
        
        if (originalPhrase) {
            // Use the original phrase object for practice
            try {
                this.game.startPhraseSequence(originalPhrase);
                this.showScreen('practice-screen');
                this.initializePhraseWriter();
            } catch (error) {
                console.error('Error starting phrase character practice:', error);
                this.showMessage('Error starting phrase practice: ' + error.message, 'error');
            }
        } else {
            // Fallback: create a pseudo-phrase from the phrase character
            const pseudoPhrase = this.createPseudoPhrase(phraseCharacter);
            try {
                this.game.startPhraseSequence(pseudoPhrase);
                this.showScreen('practice-screen');
                this.initializePhraseWriter();
            } catch (error) {
                console.error('Error starting pseudo phrase practice:', error);
                this.showMessage('Error starting phrase practice: ' + error.message, 'error');
            }
        }
    }
    
    // Create a pseudo-phrase object from a phrase character for practice
    createPseudoPhrase(phraseCharacter) {
        // Extract individual characters from the phrase text
        const characters = phraseCharacter.char.split('');
        
        // Create a temporary phrase object that mimics the Phrase class structure
        return {
            text: phraseCharacter.char,
            characters: characters,
            pinyin: phraseCharacter.pinyin,
            meaning: `Practice: ${phraseCharacter.char}`,
            level: phraseCharacter.level,
            hp: phraseCharacter.hp,
            attack: phraseCharacter.attack,
            defense: phraseCharacter.defense
        };
    }
    
    // Update practice screen with character info
    updatePracticeScreen(character) {
        // Use current character if not provided
        if (!character) {
            character = this.game.currentCharacter;
        }
        
        if (!character) return;
        
        // Check if we're in phrase practice mode
        const phraseProgress = this.game.getPhraseProgress();
        if (phraseProgress) {
            // Show phrase progress
            const progressText = `${phraseProgress.phrase.text} - Character ${phraseProgress.currentIndex + 1}/${phraseProgress.totalCharacters}`;
            this.elements.currentCharacterName.textContent = `${character.char} (${character.pinyin}) - ${progressText}`;
        } else {
            // Regular character practice
            this.elements.currentCharacterName.textContent = `${character.char} (${character.pinyin})`;
        }
        
        this.elements.charLevel.textContent = character.level;
        this.elements.charXP.textContent = `${character.xp}/${character.getXPForNextLevel()}`;
        this.elements.charHP.textContent = character.hp;
        
        // Hide XP feedback initially
        this.elements.xpFeedback.classList.add('hidden');
    }
    
    // Handle practice completion
    handlePracticeComplete(data) {
        const { character, result, playerLeveledUp, newUnlocks, sessionStats, isPhrasePractice, phraseProgress } = data;
        
        // Track practice completion for battle unlock system (v2: counts
        // DISTINCT characters, not raw sessions — spams the same char and
        // you don't get closer to battle).
        if (!isPhrasePractice || (phraseProgress && phraseProgress.isLastCharacter)) {
            const trackerInfo = {
                ...sessionStats,
                // Pass the single-character STRING, not the Character object —
                // the tracker keys its distinct set by string, and an object
                // would collide to "[object Object]" (broke the 0/10 counter).
                character: isPhrasePractice && phraseProgress && phraseProgress.phrase
                    ? null : (character && typeof character.char === 'string' ? character.char : character),
                phrase: isPhrasePractice && phraseProgress && phraseProgress.phrase
                    ? phraseProgress.phrase.text
                    : null,
                isPhrasePractice: !!isPhrasePractice
            };
            const practiceResult = this.practiceTracker.incrementPracticeCount(trackerInfo);
            if (practiceResult.message) {
                this.showMessage(practiceResult.message, practiceResult.justUnlocked ? 'success' : 'info');
            }
        }
        
        // Update character info display
        this.updatePracticeScreen(character);
        
        // Update header stats including battle button progress (real-time updates)
        this.updateHeaderStats();
        
        // Show XP feedback
        this.elements.xpAmount.textContent = result.xpGained;
        this.elements.accuracyPercent.textContent = sessionStats.accuracy;
        this.elements.xpFeedback.classList.remove('hidden');
        
        // Show level up animation if character leveled up
        if (result.leveledUp) {
            this.elements.currentCharacterName.classList.add('level-up');
            setTimeout(() => {
                this.elements.currentCharacterName.classList.remove('level-up');
            }, 1000);
        }
        
        // Show unlock notifications
        if (newUnlocks.length > 0) {
            const unlockMessage = `New phrases unlocked: ${newUnlocks.map(p => p.text).join(', ')}!`;
            this.showMessage(unlockMessage, 'success');
            // Refresh character grid to show "Create Phrases" button if not visible
            if (this.currentScreen === 'character-select') {
                setTimeout(() => this.refreshCharacterGrid(), 500);
            }
        }
        
        // Player level up notification
        if (playerLeveledUp) {
            this.showMessage(`Player Level Up! Now level ${this.game.player.level}!`, 'success');
        }
        
        // Handle phrase practice progression
        if (isPhrasePractice && phraseProgress) {
            if (phraseProgress.isLastCharacter) {
                // Complete the phrase sequence
                setTimeout(() => {
                    const completionData = this.game.completePhraseSequence();
                    if (completionData) {
                        this.showMessage(`Phrase "${completionData.phrase.text}" completed! Bonus XP: ${completionData.bonusXP}!`, 'success');
                        this.showScreen('character-select');
                    }
                }, 2000);
            } else {
                // Advance to next character in sequence
                setTimeout(() => {
                    this.game.advancePhraseSequence();
                    this.initializePhraseWriter();
                }, 2000);
            }
        }
        
        // Auto-hide feedback after delay (only if not in phrase practice or on last character)
        const hideDelay = (isPhrasePractice && !phraseProgress?.isLastCharacter) ? 2000 : 5000;
        setTimeout(() => {
            this.elements.xpFeedback.classList.add('hidden');
        }, hideDelay);
    }
    
    // Handle practice mistake feedback
    handleMistakeFeedback(mistake) {
        // Could add visual feedback for mistakes here
        console.log('Mistake feedback:', mistake);
    }
    
    // Handle correct stroke feedback
    handleStrokeFeedback(stroke) {
        // Could add visual feedback for correct strokes here
        console.log('Stroke feedback:', stroke);
    }
    
    // Handle phrase completion
    handlePhraseComplete(data) {
        const { phrase, bonusXP, playerLeveledUp, isFirstCompletion, phraseCharacterXP, phraseCharacterLeveledUp } = data;
        
        if (isFirstCompletion) {
            this.showMessage(`🎉 First time completing "${phrase.text}"! It's now available as a character! Bonus XP: ${bonusXP}!`, 'success');
            // Refresh the character grid to show the new phrase-character
            setTimeout(() => {
                this.refreshCharacterGrid();
            }, 1000); // Small delay to let the message show first
        } else {
            let message = `Phrase "${phrase.text}" completed! Bonus XP: ${bonusXP}!`;
            if (phraseCharacterXP) {
                message += ` Phrase character gained ${phraseCharacterXP} XP!`;
            }
            this.showMessage(message, 'success');
        }
        
        if (playerLeveledUp) {
            this.showMessage(`Player Level Up! Now level ${this.game.player.level}!`, 'success');
        }
        
        if (phraseCharacterLeveledUp) {
            setTimeout(() => {
                this.showMessage(`✨ Phrase character "${phrase.text}" leveled up!`, 'success');
            }, 1000);
        }
        
        this.updateHeaderStats();
    }
    
    // Start next practice session
    nextPractice() {
        if (this.game.currentCharacter) {
            this.game.resetPractice();
        }
    }
    
    // Refresh management grid
    refreshManageGrid() {
        const characters = Object.values(this.game.characters);
        this.elements.manageGrid.innerHTML = '';
        
        characters.forEach(character => {
            const card = this.createCharacterCard(character, false);
            
            // Add remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'pixel-btn error';
            removeBtn.textContent = 'Remove';
            removeBtn.style.marginTop = '8px';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeCharacter(character.char);
            });
            
            card.appendChild(removeBtn);
            this.elements.manageGrid.appendChild(card);
        });
    }
    
    // Add new character
    addNewCharacter() {
        const char = this.elements.newCharacterInput.value.trim();
        const pinyin = this.elements.newPinyinInput.value.trim();
        
        if (!char) {
            this.showMessage('Please enter a character', 'error');
            return;
        }
        
        if (char.length !== 1) {
            this.showMessage('Please enter exactly one character', 'error');
            return;
        }
        
        // Create character data with custom pinyin
        const characterData = {};
        if (pinyin) {
            characterData.pinyin = pinyin;
        }
        
        const result = this.game.addCharacter(char, characterData);
        
        if (result.success) {
            this.showMessage(result.message, 'success');
            this.elements.newCharacterInput.value = '';
            this.elements.newPinyinInput.value = '';
            this.refreshManageGrid();
            
            if (result.newUnlocks && result.newUnlocks.length > 0) {
                const unlockMessage = `New phrases unlocked: ${result.newUnlocks.map(p => p.text).join(', ')}!`;
                setTimeout(() => this.showMessage(unlockMessage, 'success'), 1000);
            }
        } else {
            this.showMessage(result.message, 'error');
        }
    }
    
    // Remove character
    removeCharacter(char) {
        if (confirm(`Remove character "${char}" and all its progress?`)) {
            const result = this.game.removeCharacter(char);
            
            if (result.success) {
                this.showMessage(result.message, 'success');
                this.refreshManageGrid();
            } else {
                this.showMessage(result.message, 'error');
            }
        }
    }
    
    // Refresh phrase evolution grid
    refreshPhraseGrid() {
        const phrases = this.game.getAvailablePhrases();
        const unlockable = this.game.getUnlockablePhrases();
        this.elements.phraseGrid.innerHTML = '';
        
        // Show unlocked phrases
        phrases.forEach(phrase => {
            const card = this.createPhraseCard(phrase, true);
            this.elements.phraseGrid.appendChild(card);
        });
        
        // Show unlockable phrases
        unlockable.forEach(phrase => {
            const card = this.createPhraseCard(phrase, false);
            this.elements.phraseGrid.appendChild(card);
        });
        
        if (phrases.length === 0 && unlockable.length === 0) {
            this.elements.phraseGrid.innerHTML = '<p>No phrases available yet. Level up more characters!</p>';
        }
    }
    
    // Create phrase card element
    createPhraseCard(phrase, unlocked) {
        const card = document.createElement('div');
        card.className = unlocked ? 'phrase-card' : 'phrase-card locked';
        
        if (!unlocked) {
            card.style.opacity = '0.6';
            card.style.cursor = 'not-allowed';
        }
        
        const requirementText = Object.entries(phrase.requirements)
            .map(([char, level]) => `${char}:${level}`)
            .join(', ');
        
        card.innerHTML = `
            <div class="phrase-display">${phrase.text}</div>
            <div class="phrase-info">
                <div><strong>${phrase.pinyin}</strong></div>
                <div>${phrase.meaning}</div>
                <div>HP: ${phrase.hp} | ATK: ${phrase.attack} | DEF: ${phrase.defense}</div>
                <div class="phrase-requirements">Requires: ${requirementText}</div>
                ${unlocked ? `<div class="character-level">Level ${phrase.level}</div>` : '<div class="locked-indicator">🔒 Locked</div>'}
            </div>
        `;
        
        if (unlocked) {
            card.addEventListener('click', () => this.practicePhraseSequence(phrase));
        }
        
        return card;
    }
    
    // Practice phrase as sequence of characters
    practicePhraseSequence(phrase) {
        try {
            this.game.startPhraseSequence(phrase);
            this.showScreen('practice-screen');
            this.initializePhraseWriter();
        } catch (error) {
            console.error('Error starting phrase practice:', error);
            this.showMessage('Error starting phrase practice: ' + error.message, 'error');
        }
    }
    
    // Initialize writer for phrase practice
    initializePhraseWriter() {
        const phraseProgress = this.game.getPhraseProgress();
        if (!phraseProgress) return;
        
        const currentChar = phraseProgress.currentCharacter;
        
        try {
            this.game.createWriter('hanzi-writer', currentChar);
            this.updatePracticeScreen();
            this.game.startQuiz();
        } catch (error) {
            console.error('Error initializing phrase writer:', error);
            this.showMessage('Error: ' + error.message, 'error');
        }
    }
    
    // Save game
    saveGame() {
        const result = this.game.saveGame();
        this.showMessage(result.message, result.success ? 'success' : 'error');
    }
    
    // Load game (download JSON)
    loadGame() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = this.game.loadFromJSON(e.target.result);
                    this.showMessage(result.message, result.success ? 'success' : 'error');
                    
                    if (result.success) {
                        this.refreshCharacterGrid();
                        this.updateHeaderStats();
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }
    
    // Export game data
    exportGame() {
        const data = this.game.exportToJSON();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        // Create timestamp with format: YYYY-MM-DD_HH-MM-SS
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.download = `hanzi-game-save-${timestamp}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showMessage('Game data exported successfully!', 'success');
    }
    
    // Reset game data
    resetGame() {
        // Show confirmation dialog
        if (confirm('⚠️ This will delete ALL your progress and reset the game to the beginning.\n\nThis action cannot be undone! Are you sure you want to continue?')) {
            const secondConfirm = confirm('Are you REALLY sure? This will permanently delete:\n• All characters and their progress\n• All phrases and unlocks\n• Player level and XP\n• Battle records\n\nThis cannot be undone!');
            
            if (secondConfirm) {
                try {
                    // Clear localStorage
                    localStorage.removeItem('hanzi-game-save');
                    
                    // Also clear any practice tracker data (bug fix: was using the
                    // wrong storage key, so battle lock/unlock state was NOT
                    // actually reset).
                    localStorage.removeItem('hanzi-game-practice-tracker');
                    
                    // Reset the practice tracker instance in memory (it caches)
                    if (this.practiceTracker && this.practiceTracker.reset) {
                        this.practiceTracker.reset();
                    }
                    
                    // Reset the game instance in memory
                    this.game.resetToDefaults();
                    
                    // Reset the UI
                    this.refreshCharacterGrid();
                    this.updateHeaderStats();
                    this.showScreen('character-select');
                    
                    // Show confirmation message
                    this.showMessage('Game reset complete! All progress has been cleared.', 'success');
                    
                } catch (error) {
                    console.error('Error resetting game:', error);
                    this.showMessage('Error resetting game data. Please refresh the page manually.', 'error');
                }
            }
        }
    }
    
    // Show temporary message
    showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `game-message ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px;
            border: 2px solid var(--gbc-dark-green);
            border-radius: 4px;
            z-index: 1000;
            font-weight: bold;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }
    
    // BATTLE SYSTEM METHODS
    
    // Start battle mode
    startBattle() {
        // Check if battles are unlocked using PracticeTracker
        if (!this.practiceTracker.isBattleUnlocked()) {
            const status = this.practiceTracker.getStatus();
            this.showMessage(
                `Battles are locked! Train ${status.practicesRemaining} more different character${status.practicesRemaining === 1 ? '' : 's'} to unlock battles. (${status.distinctTrained !== undefined ? status.distinctTrained : status.practiceCount}/${status.practicesRequired} distinct)`,
                'info'
            );
            return;
        }
        
        const availableCharacters = this.game.getAvailableCharacters();
        if (availableCharacters.length === 0) {
            this.showMessage('You need at least one character to battle!', 'error');
            return;
        }
        
        // Check if team selection is needed (more than 6 characters)
        const MAX_BATTLE_TEAM_SIZE = 6;
        if (availableCharacters.length > MAX_BATTLE_TEAM_SIZE) {
            this.showTeamSelectionModal(availableCharacters);
            return;
        }
        
        // Start battle with all available characters (6 or fewer)
        this.initializeBattleWithTeam(availableCharacters);
    }
    
    // Show team selection modal for battles with more than 6 characters
    showTeamSelectionModal(availableCharacters) {
        // Initialize selection state
        this.teamSelectionState = {
            availableCharacters: availableCharacters,
            selectedCharacters: [],
            maxTeamSize: 6
        };
        
        // Populate available characters list
        this.populateAvailableCharactersList();
        
        // Clear selected team list and update counters
        this.elements.selectedTeamList.innerHTML = '';
        this.updateSelectedTeamCount();
        
        // Show the modal
        this.elements.teamSelectionModal.classList.remove('hidden');
        
        // Bind modal events only once - check if already bound
        if (!this.teamSelectionEventsBound) {
            this.bindTeamSelectionEvents();
            this.teamSelectionEventsBound = true;
        }
    }
    
    // Populate available characters list with cards
    populateAvailableCharactersList() {
        this.elements.availableCharactersList.innerHTML = '';
        
        this.teamSelectionState.availableCharacters.forEach((character, index) => {
            // Create character card using existing function
            const card = this.createCharacterCard(character, false);
            
            // Add team selection specific classes and functionality
            card.classList.add('team-selection-card');
            card.setAttribute('data-index', index);
            
            // Add selection state
            const isSelected = this.teamSelectionState.selectedCharacters.some(c => c.char === character.char);
            if (isSelected) {
                card.classList.add('selected');
            }
            
            // Add selection overlay with button
            const selectionOverlay = document.createElement('div');
            selectionOverlay.className = 'selection-overlay';
            selectionOverlay.innerHTML = `
                <button class="select-character-btn pixel-btn" data-index="${index}">
                    ${isSelected ? 'Remove' : 'Select'}
                </button>
            `;
            
            card.appendChild(selectionOverlay);
            this.elements.availableCharactersList.appendChild(card);
        });
    }
    
    // Update selected team display and count
    updateSelectedTeamCount() {
        const count = this.teamSelectionState.selectedCharacters.length;
        const max = this.teamSelectionState.maxTeamSize;
        
        this.elements.selectedCount.textContent = count;
        this.elements.maxCount.textContent = max;
        
        // Update start battle button state
        this.elements.startBattleBtn.disabled = count === 0;
        
        // Update selected team list display with mini cards
        this.elements.selectedTeamList.innerHTML = '';
        this.teamSelectionState.selectedCharacters.forEach(character => {
            const miniCard = this.createCharacterCard(character, false);
            miniCard.classList.add('selected-team-card');
            this.elements.selectedTeamList.appendChild(miniCard);
        });
    }
    
    // Bind team selection modal events
    bindTeamSelectionEvents() {
        // Character selection/deselection
        this.elements.availableCharactersList.addEventListener('click', (e) => {
            if (e.target.classList.contains('select-character-btn')) {
                const index = parseInt(e.target.dataset.index);
                this.toggleCharacterSelection(index);
            }
        });
        
        // Start battle button
        this.elements.startBattleBtn.addEventListener('click', () => {
            this.confirmTeamSelection();
        });
        
        // Cancel team selection button
        this.elements.cancelTeamBtn.addEventListener('click', () => {
            this.hideTeamSelectionModal();
        });
        
        // Close modal
        this.elements.teamModalClose.addEventListener('click', () => {
            this.hideTeamSelectionModal();
        });
        
        // Click outside to close
        const handleOutsideClick = (e) => {
            if (e.target === this.elements.teamSelectionModal) {
                this.hideTeamSelectionModal();
                document.removeEventListener('click', handleOutsideClick);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 100);
    }
    
    // Toggle character selection
    toggleCharacterSelection(index) {
        const character = this.teamSelectionState.availableCharacters[index];
        const selectedIndex = this.teamSelectionState.selectedCharacters.findIndex(c => c.char === character.char);
        
        if (selectedIndex === -1) {
            // Add character to selection
            if (this.teamSelectionState.selectedCharacters.length < this.teamSelectionState.maxTeamSize) {
                this.teamSelectionState.selectedCharacters.push(character);
            } else {
                this.showMessage(`Maximum team size is ${this.teamSelectionState.maxTeamSize}!`, 'error');
                return;
            }
        } else {
            // Remove character from selection
            this.teamSelectionState.selectedCharacters.splice(selectedIndex, 1);
        }
        
        // Update UI
        this.populateAvailableCharactersList();
        this.updateSelectedTeamCount();
    }
    
    // Confirm team selection and start battle (or a grand trial, if pending)
    confirmTeamSelection() {
        if (!this.teamSelectionState || this.teamSelectionState.selectedCharacters.length === 0) {
            this.showMessage('Please select at least one character!', 'error');
            return;
        }
        
        // Store selected characters before hiding modal
        const selectedCharacters = this.teamSelectionState.selectedCharacters;
        const pendingTrial = this.pendingTrial;
        this.pendingTrial = null;
        
        // Restore the default button text for the next use of the modal
        this.elements.startBattleBtn.textContent = 'Start Battle!';
        
        // Hide modal
        this.hideTeamSelectionModal();
        
        // Route: trial battle or regular wild battle
        if (pendingTrial) {
            this.beginTrialBattle(selectedCharacters, pendingTrial.setIdx, pendingTrial.trialIdx);
        } else {
            this.initializeBattleWithTeam(selectedCharacters);
        }
    }
    
    // Hide team selection modal
    hideTeamSelectionModal() {
        this.elements.teamSelectionModal.classList.add('hidden');
        this.teamSelectionState = null;
        // Drop any pending trial routing so a cancelled trial doesn't leak
        // into the next time the modal is used for a wild battle.
        this.pendingTrial = null;
        this.elements.startBattleBtn.textContent = 'Start Battle!';
    }
    
    // GRAND TRIALS UI -------------------------------------------------------

    // Render the trials list: one card per set, trial rows showing status
    // (locked / ready / cleared) and a "Face Trial N" button when it's the
    // next one to beat. Sets unlock strictly in order.
    refreshTrialsScreen() {
        this.elements.trialsList.innerHTML = '';
        const summary = this.game.getTrialSummary();
        const battleLocked = this.practiceTracker.isBattleUnlocked();
        
        summary.forEach(s => {
            const card = document.createElement('div');
            card.className = `trial-set-card ${s.available ? '' : 'locked'} ${s.allCleared ? 'complete' : ''}`;
            
            const trialRows = s.trials.map(t => {
                let statusIcon, statusText;
                const isNext = !t.cleared && t.trialIdx === s.nextTrialIdx && s.available;
                if (isNext) {
                    statusIcon = '⚔️'; statusText = 'Up next';
                } else if (t.cleared) {
                    statusIcon = '✅'; statusText = t.wins > 1 ? `Cleared (${t.wins}x)` : 'Cleared';
                } else if (!s.available) {
                    statusIcon = '🔒'; statusText = 'Locked';
                } else {
                    statusIcon = '⬜'; statusText = 'Waiting';
                }
                // Completed trials can be re-fought at any time (rewards taper).
                const rematchBtn = t.cleared && s.available
                    ? `<button class="pixel-btn small-btn trial-rematch-btn" data-set="${s.setIdx}" data-trial="${t.trialIdx}">↻</button>`
                    : '';
                return `<div class="trial-row ${isNext ? 'is-next' : ''}">
                    <span class="trial-row-icon">${statusIcon}</span>
                    <span class="trial-row-name">Trial ${t.trialIdx + 1}: ${t.name}</span>
                    <span class="trial-row-level">Lv ${t.level} × 6</span>
                    <span class="trial-row-status">${statusText}</span>
                    ${rematchBtn}
                </div>`;
            }).join('');
            
            let action = '';
            if (s.available && s.nextTrialIdx !== null) {
                action = `<button class="pixel-btn battle-btn trial-fight-btn" data-set="${s.setIdx}" data-trial="${s.nextTrialIdx}">⚔️ Face Trial ${s.nextTrialIdx + 1}</button>`;
            }
            
            card.innerHTML = `
                <div class="trial-set-header">
                    <span class="trial-set-icon">${s.icon}</span>
                    <div>
                        <h3>${s.name}</h3>
                        <p class="trial-set-intro">${s.intro}</p>
                    </div>
                    <span class="trial-set-badge">${s.allCleared ? s.badge : `${s.clearedCount}/5`}</span>
                </div>
                ${!s.available
                    ? '<div class="trial-lock-note">🔒 Clear all 5 trials of the previous set to unlock this one.</div>'
                    : ''}
                <div class="trial-rows">${trialRows}</div>
                <div class="trial-action">${action}</div>
            `;
            
            this.elements.trialsList.appendChild(card);
        });
        
        // Bind fight buttons (delegated per render)
        this.elements.trialsList.querySelectorAll('.trial-fight-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const setIdx = parseInt(btn.dataset.set);
                const trialIdx = parseInt(btn.dataset.trial);
                if (!battleLocked) {
                    const status = this.practiceTracker.getStatus();
                    this.showMessage(
                        `Battles are locked! Train ${status.practicesRemaining} more different character${status.practicesRemaining === 1 ? '' : 's'} first. (${status.distinctTrained !== undefined ? status.distinctTrained : status.practiceCount}/${status.practicesRequired} this round)`,
                        'info'
                    );
                    return;
                }
                this.startTrialBattle(setIdx, trialIdx);
            });
        });
        
        // Per-trial rematch buttons (cleared trials can be re-fought)
        this.elements.trialsList.querySelectorAll('.trial-rematch-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const setIdx = parseInt(btn.dataset.set);
                const trialIdx = parseInt(btn.dataset.trial);
                if (!battleLocked) {
                    const status = this.practiceTracker.getStatus();
                    this.showMessage(
                        `Battles are locked! Train ${status.practicesRemaining} more different character${status.practicesRemaining === 1 ? '' : 's'} first. (${status.distinctTrained !== undefined ? status.distinctTrained : status.practiceCount}/${status.practicesRequired} this round)`,
                        'info'
                    );
                    return;
                }
                this.startTrialBattle(setIdx, trialIdx);
            });
        });
    }
    
    // Set up shared battle state for a battle (wild or trial).
    // `enemyTeam` is an array of 1..6 battle-ready enemy objects. Wild
    // battles pass a single-enemy team; trials pass 6 elite enemies.
    setupBattleState(playerCharacters, enemyTeam, mode) {
        this.battleState = {
            mode: mode, // 'wild' | 'trial'
            setIdx: null,
            trialIdx: null,
            playerCharacters: playerCharacters.map(char => ({
                ...char,
                currentHP: char.hp, // Reset to full HP
                defeated: false     // Reset defeated status
            })),
            currentPlayerCharacter: null,
            enemyTeam: enemyTeam,
            battleLog: []
        };
        
        // Set first character and first enemy as active
        this.battleState.currentPlayerCharacter = this.battleState.playerCharacters[0];
        if (this.battleState.enemyTeam.length > 0) {
            this.battleState.currentEnemy = this.battleState.enemyTeam[0];
        }
        
        // Route victory/defeat handlers based on battle mode
        this._onVictory = mode === 'trial' ? () => this.handleTrialVictory() : () => this.handleEnemyDefeated();
        this._onDefeat = mode === 'trial' ? () => this.handleTrialDefeat() : () => this.handlePlayerDefeated();
    }
    
    // Initialize battle with selected team (wild battle)
    initializeBattleWithTeam(selectedCharacters) {
        const enemy = this.game.generateWildOpponent();
        this.setupBattleState(selectedCharacters, [enemy], 'wild');
        
        // Show battle screen and initialize
        this.showScreen('battle-screen');
        this.initializeBattleScreen();
    }
    
    // Start a grand trial battle: pick the first uncleared trial of a set,
    // validate prerequisites, then enter a 6v6 battle against the guardians.
    startTrialBattle(setIdx, trialIdx) {
        if (!this.game.isTrialSetAvailable(setIdx)) {
            this.showMessage('Clear all trials in the previous set to unlock this one!', 'error');
            return;
        }
        
        const availableCharacters = this.game.getAvailableCharacters().filter(c => !c.isPhraseCharacter);
        if (availableCharacters.length === 0) {
            this.showMessage('You need at least one character to enter a Grand Trial!', 'error');
            return;
        }
        
        // Reuse the team selection modal, routing the confirm through pendingTrial
        const MAX_TRIAL_TEAM_SIZE = 6;
        // Sort strongest-first so the kid's best options are at the top
        const sorted = availableCharacters.slice().sort((a, b) => {
            const pa = (a.hp || 0) + (a.attack || 0) + (a.defense || 0) + (a.level || 1) * 10;
            const pb = (b.hp || 0) + (b.attack || 0) + (b.defense || 0) + (b.level || 1) * 10;
            return pb - pa;
        });
        this.teamSelectionState = {
            availableCharacters: sorted,
            selectedCharacters: [],
            maxTeamSize: MAX_TRIAL_TEAM_SIZE
        };
        
        this.populateAvailableCharactersList();
        this.elements.selectedTeamList.innerHTML = '';
        this.updateSelectedTeamCount();
        this.elements.startBattleBtn.textContent = 'Enter Trial!';
        
        // Store the trial so the confirm handler can route correctly
        this.pendingTrial = { setIdx: setIdx, trialIdx: trialIdx };
        
        this.elements.teamSelectionModal.classList.remove('hidden');
        if (!this.teamSelectionEventsBound) {
            this.bindTeamSelectionEvents();
            this.teamSelectionEventsBound = true;
        }
    }
    
    // Begin a trial battle (called from the team selection confirm).
    beginTrialBattle(selectedCharacters, setIdx, trialIdx) {
        const enemyTeam = this.game.buildTrialEnemyTeam(setIdx, trialIdx);
        if (enemyTeam.length === 0) {
            this.showMessage('You need at least one trained character to start this trial!', 'error');
            return;
        }
        
        const set = GRAND_TRIAL_SETS[setIdx];
        const trial = set.trials[trialIdx];
        this.setupBattleState(selectedCharacters, enemyTeam, 'trial');
        this.battleState.setIdx = setIdx;
        this.battleState.trialIdx = trialIdx;
        
        this.showScreen('battle-screen');
        this.initializeBattleScreen();
        this.addBattleMessage(`🛡️ Guardian ${trial.name} leads the trial team (Lv ${trial.level})!`, 'info');
    }
    
    // Initialize battle screen UI
    initializeBattleScreen() {
        const isTrial = this.battleState.mode === 'trial';
        
        // Reset attack button state and text for new battle
        this.elements.attackBtn.disabled = false;
        this.elements.attackBtn.textContent = 'Attack!';
        this.elements.findOpponentBtn.disabled = isTrial;
        this.elements.findOpponentBtn.style.display = isTrial ? 'none' : '';
        
        // Back button label + enemy side title: wild single vs guardian team
        const backBtn = document.getElementById('battle-back-btn');
        if (backBtn) {
            backBtn.textContent = isTrial ? '← Back to Trials' : '← Back to Practice';
        }
        if (this.elements.enemySideTitle) {
            this.elements.enemySideTitle.textContent = isTrial
                ? `Guardians (Lv ${this.battleState.currentEnemy ? this.battleState.currentEnemy.level : ''})`
                : 'Wild Character';
        }
        
        // Setup event listeners for battle
        this.setupBattleEvents();
        
        // Render battle participants
        this.renderBattleCharacter(this.battleState.currentPlayerCharacter, 'player');
        this.renderBattleCharacter(this.battleState.currentEnemy, 'enemy');
        this.renderEnemyTeam(isTrial);
        this.renderPlayerTeam();
        
        // Clear battle log
        this.battleState.battleLog = [];
        if (!isTrial) {
            this.addBattleMessage(`A wild ${this.battleState.currentEnemy.name} appears!`, 'info');
        }
    }
    
    // Render the enemy team panel (trials only; hidden for wild battles)
    renderEnemyTeam(isTrial) {
        if (!this.elements.enemyTeam) return;
        if (!isTrial) {
            this.elements.enemyTeam.innerHTML = '';
            return;
        }
        
        this.elements.enemyTeam.innerHTML = '';
        this.battleState.enemyTeam.forEach(enemy => {
            const chip = document.createElement('div');
            chip.className = `team-character trial-enemy ${enemy.currentHP <= 0 ? 'defeated' : ''}`;
            chip.textContent = enemy.name;
            chip.title = `${enemy.name} — ${enemy.currentHP}/${enemy.maxHP} HP`;
            this.elements.enemyTeam.appendChild(chip);
        });
    }
    
    // Setup battle event listeners
    setupBattleEvents() {
        // Remove existing listeners to avoid duplicates
        this.elements.attackBtn.removeEventListener('click', this.handleAttack);
        this.elements.findOpponentBtn.removeEventListener('click', this.findNewOpponent);
        document.getElementById('battle-back-btn').removeEventListener('click', this.exitBattle);
        
        // Add event listeners
        this.handleAttack = () => this.executeAttack();
        this.findNewOpponent = () => this.generateNewEnemy();
        // Back button returns to the Trials screen for trial battles
        this.exitBattle = () => this.showScreen(this.battleState && this.battleState.mode === 'trial' ? 'trials-screen' : 'character-select');
        
        this.elements.attackBtn.addEventListener('click', this.handleAttack);
        this.elements.findOpponentBtn.addEventListener('click', this.findNewOpponent);
        document.getElementById('battle-back-btn').addEventListener('click', this.exitBattle);
    }
    
    // Render battle character display
    renderBattleCharacter(character, side) {
        const element = side === 'player' ? this.elements.playerBattleCharacter : this.elements.enemyBattleCharacter;
        const isEnemy = side === 'enemy';
        
        // For player characters, maxHP is stored in 'hp' property. For enemies, it's in 'maxHP'
        const maxHP = character.maxHP || character.hp;
        const hpPercentage = (character.currentHP / maxHP) * 100;
        
        element.innerHTML = `
            <div class="character-name">${character.name || character.char}</div>
            <div class="character-stats">
                <span>Level ${character.level}</span>
                <span>ATK: ${character.attack}</span>
                <span>DEF: ${character.defense}</span>
            </div>
            <div class="hp-bar">
                <div class="hp-fill" style="width: ${hpPercentage}%"></div>
            </div>
            <div class="hp-text">${character.currentHP}/${maxHP} HP</div>
            <div class="character-info">
                <strong>${character.pinyin}</strong>
                ${isEnemy ? '' : `<br>Accuracy: ${character.getAccuracy ? character.getAccuracy() : 0}%`}
                ${character.isPhrase ? '<br><span class="phrase-indicator">📜 Phrase</span>' : ''}
            </div>
        `;
        
        element.className = `battle-character ${isEnemy ? 'enemy' : ''}`;
    }
    
    // Render player team selection
    renderPlayerTeam() {
        this.elements.playerTeam.innerHTML = '';
        
        this.battleState.playerCharacters.forEach((character, index) => {
            const teamChar = document.createElement('div');
            teamChar.className = 'team-character';
            teamChar.textContent = character.char;
            
            if (character.defeated) {
                teamChar.classList.add('defeated');
            } else if (character === this.battleState.currentPlayerCharacter) {
                teamChar.classList.add('active');
            }
            
            teamChar.title = `${character.char} (${character.pinyin}) - ${character.currentHP}/${character.hp} HP`;
            
            if (!character.defeated && character !== this.battleState.currentPlayerCharacter) {
                teamChar.addEventListener('click', () => this.switchCharacter(index));
            }
            
            this.elements.playerTeam.appendChild(teamChar);
        });
    }
    
    // Switch active player character
    switchCharacter(index) {
        const newCharacter = this.battleState.playerCharacters[index];
        if (newCharacter.defeated) return;
        
        this.battleState.currentPlayerCharacter = newCharacter;
        this.renderBattleCharacter(newCharacter, 'player');
        this.renderPlayerTeam();
        this.addBattleMessage(`Switched to ${newCharacter.char}!`, 'info');
    }
    
    // Execute attack action
    executeAttack() {
        if (!this.battleState.currentPlayerCharacter || !this.battleState.currentEnemy) return;
        
        const player = this.battleState.currentPlayerCharacter;
        const enemy = this.battleState.currentEnemy;
        
        // Disable attack button during animation
        this.elements.attackBtn.disabled = true;
        
        // Player attacks
        const attackResult = this.game.executeBattleTurn(player, enemy);
        this.addBattleMessage(`${player.char} attacks ${enemy.name} for ${attackResult.damage} damage!`, 'damage');
        
        // Add hit animation
        this.elements.enemyBattleCharacter.classList.add('hit-animation');
        setTimeout(() => {
            this.elements.enemyBattleCharacter.classList.remove('hit-animation');
        }, 500);
        
        // Update enemy display + trial team panel
        this.renderBattleCharacter(enemy, 'enemy');
        this.renderEnemyTeam(this.battleState.mode === 'trial');
        
        if (attackResult.enemyDefeated) {
            // Enemy defeated!
            setTimeout(() => this.advanceAfterEnemyDefeated(), 1000);
            return;
        }
        
        // Enemy counter-attacks
        setTimeout(() => {
            const counterResult = this.game.executeEnemyTurn(enemy, player);
            if (counterResult) {
                this.addBattleMessage(`${enemy.name} attacks ${player.char} for ${counterResult.damage} damage!`, 'damage');
                
                // Apply damage to player character
                player.currentHP = Math.max(0, player.currentHP - counterResult.damage);
                
                // Add hit animation to player
                this.elements.playerBattleCharacter.classList.add('hit-animation');
                setTimeout(() => {
                    this.elements.playerBattleCharacter.classList.remove('hit-animation');
                }, 500);
                
                // Update player display
                this.renderBattleCharacter(player, 'player');
                this.renderPlayerTeam();
                
                if (player.currentHP === 0) {
                    // Player character defeated
                    setTimeout(() => this.handlePlayerDefeated(), 1000);
                    return;
                }
            }
            
            // Re-enable attack button
            this.elements.attackBtn.disabled = false;
        }, 1500);
    }
    
    // Resolve the real Character object (the battle team members are copies
    // made with object-spread, so mutating `fighter` directly would not
    // persist XP/level back to the saved character).
    resolveFighterCharacter(fighter) {
        if (!fighter) return null;
        const real = this.game.characters && this.game.characters[fighter.char];
        return real || fighter;
    }
    
    // A single enemy fainted — either advance to the next guardian (trial)
    // or resolve a wild battle victory.
    advanceAfterEnemyDefeated() {
        if (this.battleState.mode === 'trial') {
            const next = (this.battleState.enemyTeam || []).find(e => e.currentHP > 0);
            if (next) {
                this.battleState.currentEnemy = next;
                this.renderBattleCharacter(next, 'enemy');
                this.addBattleMessage(`Guardian ${next.name} steps forward!`, 'info');
                this.elements.attackBtn.disabled = false;
                return;
            }
            setTimeout(() => this.handleTrialVictory(), 700);
            return;
        }
        this.handleEnemyDefeated();
    }
    
    // Handle enemy defeated
    handleEnemyDefeated() {
        const enemy = this.battleState.enemy || this.battleState.currentEnemy;
        const fighter = this.resolveFighterCharacter(this.battleState.currentPlayerCharacter);
        this.addBattleMessage(`${enemy.name} is defeated!`, 'victory');
        
        // Record battle usage to lock battles again (once — not per capture)
        const battleLockResult = this.practiceTracker.recordBattleUsed();
        
        // Add defeated opponent to collection AND award battle/reward XP
        const addResult = this.game.addDefeatedOpponent(enemy, fighter);
        
        // Show the battle/reward XP the fighter just earned (battles are a
        // big XP source — worth more than passive capture of the same word).
        if (addResult.battleXP) {
            let xpMsg = `⚔️ +${addResult.battleXP} battle XP!`;
            if (addResult.isNewCapture) {
                xpMsg += (fighter && fighter.char) ? ` ${fighter.char} earned +${addResult.fighterXP} extra!` : '';
            }
            this.addBattleMessage(xpMsg, 'loot');
        }
        if (addResult.fighterLeveledUp && fighter) {
            this.addBattleMessage(`✨ ${fighter.char} leveled up in battle!`, 'victory');
        }
        
        if (addResult.type === 'character') {
            this.addBattleMessage(`You captured ${addResult.name}! It's now in your practice list!`, 'victory');
        } else if (addResult.type === 'phrase') {
            this.addBattleMessage(`You learned the phrase "${addResult.name}"! It's now available for practice!`, 'victory');
        }
        
        // Display item drops if any
        if (addResult.itemDrops && addResult.itemDrops.length > 0) {
            addResult.itemDrops.forEach(drop => {
                this.addBattleMessage(`Found item: ${drop.item.name}! 🎁`, 'loot');
            });
        }
        
        // Persist the captured character/phrase and the battle XP earned
        this.game.saveGame();
        
        // Update game stats and battle button
        this.updateHeaderStats();
        
        // Disable all battle controls - battle is over
        this.elements.attackBtn.disabled = true;
        this.elements.findOpponentBtn.disabled = true;
        this.elements.attackBtn.textContent = 'Victory!';
        
        // Force return to practice after victory
        this.addBattleMessage('Battle complete! Returning to practice to unlock more battles...', 'info');
        setTimeout(() => {
            this.showScreen('character-select');
            this.showMessage('Victory! Train more different characters to battle again.', 'success');
        }, 3000);
    }
    
    // Handle player character defeated
    handlePlayerDefeated() {
        const player = this.battleState.currentPlayerCharacter;
        player.defeated = true;
        this.addBattleMessage(`${player.char} is defeated!`, 'defeat');
        
        // Check if any characters remain
        const remainingCharacters = this.battleState.playerCharacters.filter(char => !char.defeated);
        
        if (remainingCharacters.length === 0) {
            if (this.battleState.mode === 'trial') {
                this.handleTrialDefeat();
            } else {
                this.handleWildDefeat();
            }
            return;
        }
        
        // Switch to next available character (auto-rotation)
        this.battleState.currentPlayerCharacter = remainingCharacters[0];
        this.renderBattleCharacter(this.battleState.currentPlayerCharacter, 'player');
        this.renderPlayerTeam();
        this.addBattleMessage(`Switched to ${this.battleState.currentPlayerCharacter.char}!`, 'info');
        this.elements.attackBtn.disabled = false;
    }
    
    // Wild battle full-defeat path (keeps the original lock-on-lose behavior)
    handleWildDefeat() {
        const battleLockResult = this.practiceTracker.recordBattleUsed();
        this.addBattleMessage(battleLockResult.message, 'info');
        
        this.addBattleMessage('All your characters are defeated! Returning to practice...', 'defeat');
        setTimeout(() => {
            this.showScreen('character-select');
            this.showMessage('Your characters need more training! Practice to get stronger!', 'info');
        }, 3000);
    }
    
    // TRIAL BATTLE RESULTS --------------------------------------------------

    // All guardians defeated — award rewards, record progress, and note whether
    // the whole set just got cleared (badge earned!).
    handleTrialVictory() {
        const setIdx = this.battleState.setIdx;
        const trialIdx = this.battleState.trialIdx;
        const set = GRAND_TRIAL_SETS[setIdx];
        const trial = set.trials[trialIdx];
        
        this.addBattleMessage(`✨ All guardians defeated! You cleared ${trial.name}'s trial!`, 'victory');
        
        const result = this.game.recordTrialResult(setIdx, trialIdx, true);
        if (result.xp) {
            this.addBattleMessage(`🏆 Trial complete: +${result.xp} XP!${result.firstWin ? '' : ' (re-fight bonus)'}`, 'loot');
        }
        if (result.itemId) {
            const bagItems = this.game.getBagItems();
            const itemInfo = bagItems.find(i => i.id === result.itemId);
            this.addBattleMessage(`🎁 Prize: ${itemInfo ? itemInfo.name : result.itemId}!`, 'loot');
        }
        
        const summary = this.game.getTrialSummary()[setIdx];
        if (summary.allCleared) {
            this.addBattleMessage(`🎉 ${set.badge} earned — ${set.name} complete!`, 'victory');
        } else if (summary.nextTrialIdx !== null) {
            this.addBattleMessage(`Next up: Trial ${summary.nextTrialIdx + 1} of ${set.name} awaits...`, 'info');
        }
        
        if (result.playerLeveledUp) {
            this.addBattleMessage('✨ Your trainer level went up!', 'victory');
        }
        
        this.game.saveGame();
        this.updateHeaderStats();
        
        this.elements.attackBtn.disabled = true;
        this.elements.attackBtn.textContent = 'Victory!';
        setTimeout(() => {
            this.showScreen('trials-screen');
            const setSummary = this.game.getTrialSummary()[setIdx];
            if (setSummary.allCleared) {
                this.showMessage(`🏆 ${set.name} complete! You earned ${set.badge}!`, 'success');
            } else {
                const remaining = 5 - setSummary.clearedCount;
                this.showMessage(`Trial cleared! ${remaining} trial${remaining === 1 ? '' : 's'} left in ${set.name}.`, 'success');
            }
        }, 3500);
    }
    
    // All your characters fainted in a trial — no progress change.
    handleTrialDefeat() {
        const set = GRAND_TRIAL_SETS[this.battleState.setIdx];
        if (set) {
            this.addBattleMessage(`🛡️ The guardians of ${set.name} were too strong...`, 'defeat');
            this.addBattleMessage('Train your characters to higher levels and come back!', 'info');
        }
        
        this.game.saveGame();
        this.updateHeaderStats();
        this.elements.attackBtn.disabled = true;
        setTimeout(() => {
            this.showScreen('trials-screen');
            this.showMessage('Trial failed! Train your characters and try again.', 'info');
        }, 3000);
    }
    
    // Generate new enemy during active battle
    generateNewEnemy() {
        // Trial battles have a fixed guardian team — no swapping enemies in.
        if (this.battleState && this.battleState.mode === 'trial') {
            this.addBattleMessage('Trial teams are fixed — face what the guardian brings!', 'info');
            return;
        }
        // Only allow finding new opponents during active battle (not after victory/defeat)
        if (!this.battleState || !this.battleState.currentPlayerCharacter || 
            this.battleState.currentPlayerCharacter.defeated ||
            this.elements.attackBtn.textContent === 'Victory!') {
            this.addBattleMessage('Cannot find new opponent - battle is not active.', 'info');
            return;
        }
        
        // Check if all player characters are defeated
        const aliveCharacters = this.battleState.playerCharacters.filter(char => !char.defeated);
        if (aliveCharacters.length === 0) {
            this.addBattleMessage('Cannot find new opponent - no characters available to battle.', 'info');
            return;
        }
        
        // Generate a new enemy
        const newEnemy = this.game.generateWildOpponent();
        
        // Update battle state
        this.battleState.enemy = newEnemy;
        
        // Re-render the new enemy
        this.renderBattleCharacter(newEnemy, 'enemy');
        
        // Add message to battle log
        this.addBattleMessage(`A new wild ${newEnemy.name} appears to challenge you!`, 'info');
        
        // Ensure attack button is enabled for the new fight (unless temporarily disabled during animation)
        if (this.elements.attackBtn.textContent !== 'Attack!') {
            this.elements.attackBtn.textContent = 'Attack!';
        }
        // Don't force enable if it's temporarily disabled during combat animation
    }
    
    // Add message to battle log
    addBattleMessage(message, type = 'info') {
        this.battleState.battleLog.push({ message, type });
        
        const messageEl = document.createElement('div');
        messageEl.className = `battle-message ${type}`;
        messageEl.textContent = message;
        
        this.elements.battleMessages.appendChild(messageEl);
        
        // Auto-scroll to bottom
        this.elements.battleMessages.scrollTop = this.elements.battleMessages.scrollHeight;
        
        // Limit log size
        while (this.elements.battleMessages.children.length > 20) {
            this.elements.battleMessages.removeChild(this.elements.battleMessages.firstChild);
        }
    }
    
    // ITEMS SYSTEM METHODS
    
    // Show items screen
    showItemsScreen() {
        this.showScreen('items-screen');
    }
    
    // Refresh items grid
    refreshItemsGrid() {
        const items = this.game.getBagItems();
        this.elements.itemsGrid.innerHTML = '';
        
        if (items.length === 0) {
            this.elements.itemsGrid.innerHTML = `
                <div class="empty-items-message">
                    <h3>No Items Yet</h3>
                    <p>Items can be found by defeating enemies in battle!</p>
                    <p>Try battling some wild characters to collect XP boost items.</p>
                </div>
            `;
            return;
        }
        
        items.forEach(item => {
            const card = this.createItemCard(item);
            this.elements.itemsGrid.appendChild(card);
        });
    }
    
    // Create item card element
    createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        card.innerHTML = `
            <div class="item-quantity">${item.quantity}</div>
            <div class="item-icon">${item.icon}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-rarity ${item.rarity}">${item.rarity}</div>
            <div class="item-description">${item.description}</div>
            <button class="pixel-btn use-item-btn">Use Item</button>
        `;
        
        // Add click handler for use button
        const useBtn = card.querySelector('.use-item-btn');
        useBtn.addEventListener('click', () => this.startItemUsage(item.id));
        
        return card;
    }
    
    // Start item usage (show character selection modal)
    startItemUsage(itemId) {
        const characters = this.game.getAvailableCharacters();
        
        if (characters.length === 0) {
            this.showMessage('You need at least one character to use items!', 'error');
            return;
        }
        
        // Store the item ID for when character is selected
        this.selectedItemId = itemId;
        
        // Get item info for display
        const items = this.game.getBagItems();
        const item = items.find(i => i.id === itemId);
        
        if (!item) {
            this.showMessage('Item not found!', 'error');
            return;
        }
        
        // Update modal content
        this.elements.modalItemInfo.textContent = `Select a character to use ${item.name}:`;
        
        // Populate character grid
        this.elements.modalCharacterGrid.innerHTML = '';
        characters.forEach(character => {
            const card = this.createCharacterCard(character, false);
            card.classList.add('modal-character-card');
            
            // Add click handler for character selection
            card.addEventListener('click', () => this.useItemOnCharacter(this.selectedItemId, character.char));
            
            this.elements.modalCharacterGrid.appendChild(card);
        });
        
        // Show modal
        this.showCharacterModal();
    }
    
    // Use item on selected character
    useItemOnCharacter(itemId, characterName) {
        const result = this.game.useItem(itemId, characterName);
        
        if (result.success) {
            this.showMessage(result.message, 'success');
            this.refreshItemsGrid();
            this.updateHeaderStats();
        } else {
            this.showMessage(result.message, 'error');
        }
        
        // Hide modal
        this.hideCharacterModal();
    }
    
    // Show character selection modal
    showCharacterModal() {
        this.elements.characterModal.classList.remove('hidden');
        
        // Add click outside to close
        const handleOutsideClick = (e) => {
            if (e.target === this.elements.characterModal) {
                this.hideCharacterModal();
                document.removeEventListener('click', handleOutsideClick);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 100);
    }
    
    // Hide character selection modal
    hideCharacterModal() {
        this.elements.characterModal.classList.add('hidden');
        this.selectedItemId = null;
    }
    
    // Bind data management events
    bindDataManagementEvents() {
        // File upload events
        const uploadArea = this.elements.uploadArea;
        const fileInput = this.elements.fileInput;
        const browseFiles = this.elements.browseFiles;
        
        // Drag and drop events
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/json');
            if (files.length > 0) {
                this.handleFileUploads(files);
            } else {
                this.showMessage('Please upload JSON files only.', 'error');
            }
        });
        
        // Browse files button
        browseFiles.addEventListener('click', () => {
            fileInput.click();
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                this.handleFileUploads(files);
            }
            // Clear input to allow re-uploading same file
            e.target.value = '';
        });
        
        // Data source switching
        this.elements.switchToBuiltin.addEventListener('click', () => {
            this.switchToBuiltinData();
        });
        
        this.elements.switchToCustom.addEventListener('click', () => {
            this.switchToCustomData();
        });
        
        // Export custom data
        this.elements.exportCustomData.addEventListener('click', () => {
            this.exportCustomData();
        });
        
        // Clear custom data
        this.elements.clearCustomData.addEventListener('click', () => {
            this.clearCustomData();
        });
        
        // Show examples
        this.elements.showExamples.addEventListener('click', () => {
            this.showExamples();
        });
        
        // Examples modal events
        if (this.elements.examplesModal) {
            this.elements.examplesModalClose.addEventListener('click', () => {
                this.hideExamples();
            });
            
            // Download example buttons
            this.elements.downloadCharExample.addEventListener('click', () => {
                this.downloadExample('character');
            });
            
            this.elements.downloadPhraseExample.addEventListener('click', () => {
                this.downloadExample('phrase');
            });
            
            this.elements.downloadCombinedExample.addEventListener('click', () => {
                this.downloadExample('combined');
            });
        }
        
        // Initialize data status display
        this.updateDataStatus();
        this.refreshPacksList();
    }
    
    // Handle file uploads
    async handleFileUploads(files) {
        // Show warning and get confirmation before importing
        const confirmed = this.confirmCustomDataImport();
        if (!confirmed) {
            return; // User cancelled
        }
        
        for (const file of files) {
            try {
                const text = await this.readFileAsText(file);
                
                // Use the new method that resets progress and imports custom data only
                const result = this.game.importCustomDataWithReset(text);
                
                if (result.success) {
                    this.showMessage(result.message, 'success');
                    this.updateDataStatus();
                    
                    // Reset practice tracker to lock battles for new custom data
                    this.practiceTracker.resetToDefaults();
                    
                    // Navigate back to character selection screen
                    this.showScreen('character-select');
                    
                    // Refresh the UI to show the new data
                    this.refreshCharacterGrid();
                    this.updateHeaderStats(); // This already includes battle progress update
                } else {
                    this.showMessage(result.message, 'error');
                }
            } catch (error) {
                this.showMessage(`Failed to import ${file.name}: ${error.message}`, 'error');
            }
        }
    }
    
    // Show confirmation dialog for custom data import
    confirmCustomDataImport() {
        return confirm(
            '⚠️ WARNING: Importing custom data will OVERWRITE all current progress!\n\n' +
            'This will:\n' +
            '• Delete ALL character progress and levels\n' +
            '• Delete ALL phrase unlocks and progress\n' +
            '• Reset player level and XP to 0\n' +
            '• Remove all battle records and items\n' +
            '• Lock battles again (requires 10 practice sessions to unlock)\n' +
            '• Switch to using ONLY your custom data\n\n' +
            'If you want to keep your current progress, click Cancel and export your data first.\n\n' +
            'Are you sure you want to continue?'
        );
    }
    
    // Read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    // ---------------- Pre-loaded Character Packs ----------------

    // Render the available pack list (from vocabulary_packs/packs.json).
    // Degrades gracefully if the site isn't served over http(s).
    async refreshPacksList() {
        const listEl = document.getElementById('packs-list');
        if (!listEl) return;

        let packs = null;
        try {
            packs = await this.game.dataManager.loadPacks();
        } catch (error) {
            listEl.innerHTML = '<p class="packs-error">Could not load character packs.</p>';
            return;
        }

        if (!packs || packs.length === 0) {
            listEl.innerHTML =
                '<p class="packs-empty">No character packs available yet. ' +
                'You can still upload your own JSON data below.</p>';
            return;
        }

        const activeId = this.game.dataManager.customPackId;
        listEl.innerHTML = packs.map(p => {
            const gradeLabel = (p.grade != null)
                ? `Grade ${p.grade} · Lesson ${p.lesson != null ? p.lesson : '—'}`
                : '';
            const isActive = activeId && activeId === p.id;
            return `
                <div class="pack-row${isActive ? ' active' : ''}" data-pack-id="${p.id}">
                    <div class="pack-info">
                        <span class="pack-name">${p.name}</span>
                        <span class="pack-meta">${[gradeLabel,
                            p.characters != null ? p.characters + ' characters' : null,
                            p.phrases != null ? p.phrases + ' phrases' : null
                        ].filter(Boolean).join(' · ')}</span>
                    </div>
                    <button class="pixel-btn pack-load-btn${isActive ? ' active' : ''}"
                            data-pack-id="${p.id}" ${isActive ? 'disabled' : ''}>
                        ${isActive ? '✓ Loaded' : '📥 Load'}
                    </button>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.pack-load-btn').forEach(btn => {
            btn.addEventListener('click', () => this.loadPack(btn.dataset.packId));
        });
    }

    // Load a pre-loaded pack as the active dataset
    async loadPack(id) {
        const meta = this.game.dataManager.getPackMeta(id);
        const name = (meta && meta.name) || id;

        const confirmed = confirm(
            `⚠️ Loading the pack "${name}" will OVERWRITE all current progress!\n\n` +
            '• Deletes ALL character progress and levels\n' +
            '• Deletes ALL phrase unlocks and progress\n' +
            '• Resets player level and items\n' +
            '• Locks battles again (train 10 different characters to unlock)\n\n' +
            'Export your progress first (File → Export) if you want to keep it.\n\n' +
            `Load "${name}"?`
        );
        if (!confirmed) return;

        const btns = document.querySelectorAll(`.pack-load-btn[data-pack-id="${id}"]`);
        btns.forEach(b => { b.disabled = true; b.textContent = 'Loading…'; });

        const result = await this.game.loadCharacterPack(id);
        btns.forEach(b => {
            b.disabled = false;
            b.textContent = '📥 Load';
        });

        if (result.success) {
            this.showMessage(result.message, 'success');
            // Reset practice tracker so the locked-battle counter is fair for the new set
            this.practiceTracker.resetToDefaults();
            this.updateDataStatus();
            this.showScreen('character-select');
            this.refreshCharacterGrid();
            this.updateHeaderStats();
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    // Switch to built-in data
    switchToBuiltinData() {
        try {
            this.game.dataManager.setDataSource('built-in');
            this.showMessage('Switched to built-in data. Reloading game...', 'success');
            this.updateDataStatus();
            
            // Reinitialize game data
            setTimeout(() => {
                this.game.initializePhrases();
                this.refreshCharacterGrid();
                this.updateHeaderStats();
            }, 500);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }
    
    // Switch to custom data
    switchToCustomData() {
        try {
            this.game.dataManager.setDataSource('custom');
            this.showMessage('Switched to custom data. Reloading game...', 'success');
            this.updateDataStatus();
            
            // Reinitialize game data
            setTimeout(() => {
                this.game.initializePhrases();
                this.refreshCharacterGrid();
                this.updateHeaderStats();
            }, 500);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }
    
    // Export custom data
    exportCustomData() {
        try {
            const data = this.game.dataManager.exportCustomData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            // Create timestamp with format: YYYY-MM-DD_HH-MM-SS
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.download = `hanzi-game-custom-data-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showMessage('Custom data exported successfully!', 'success');
        } catch (error) {
            this.showMessage(`Failed to export data: ${error.message}`, 'error');
        }
    }
    
    // Clear custom data
    clearCustomData() {
        if (confirm('This will delete all your custom character and phrase data. This action cannot be undone. Are you sure?')) {
            try {
                this.game.dataManager.clearCustomData();
                this.showMessage('Custom data cleared successfully.', 'success');
                this.updateDataStatus();
                
                // Switch back to built-in data if we were using custom
                if (this.game.dataManager.getDataSource() === 'custom') {
                    this.switchToBuiltinData();
                }
            } catch (error) {
                this.showMessage(`Failed to clear custom data: ${error.message}`, 'error');
            }
        }
    }
    
// Update data status display
    updateDataStatus() {
        const stats = this.game.dataManager.getDataStats();
        
        // Update current data source
        const packName = this.game.dataManager.customPackName;
        const sourceLabel = stats.currentSource === 'custom'
            ? (packName ? `Character Pack — ${packName}` : 'Custom')
            : 'Built-in';
        this.elements.currentDataSource.textContent = sourceLabel;
        
        // Update character and phrase counts
        if (stats.currentSource === 'custom') {
            this.elements.dataCharCount.textContent = stats.customCharacters;
            this.elements.dataPhraseCount.textContent = stats.customPhrases;
        } else {
            this.elements.dataCharCount.textContent = stats.builtInCharacters;
            this.elements.dataPhraseCount.textContent = stats.builtInPhrases;
        }
        
        // Update button states
        const hasCustomData = stats.customCharacters > 0 || stats.customPhrases > 0;
        this.elements.switchToCustom.disabled = !hasCustomData;
        this.elements.exportCustomData.disabled = !hasCustomData;
        this.elements.clearCustomData.disabled = !hasCustomData;
        
        // Update button text to show which is active
        this.elements.switchToBuiltin.textContent = stats.currentSource === 'built-in' ? '📦 Built-in (Active)' : '📦 Use Built-in Data';
        this.elements.switchToCustom.textContent = stats.currentSource === 'custom' ? '📝 Custom (Active)' : '📝 Use Custom Data';
    }
    
    // Show examples modal
    showExamples() {
        // Populate examples
        this.elements.characterExample.textContent = JSON.stringify(this.game.dataManager.generateExampleCharacterJSON(), null, 2);
        this.elements.phraseExample.textContent = JSON.stringify(this.game.dataManager.generateExamplePhraseJSON(), null, 2);
        this.elements.combinedExample.textContent = JSON.stringify(this.game.dataManager.generateExampleCombinedJSON(), null, 2);
        
        // Show modal
        this.elements.examplesModal.classList.remove('hidden');
    }
    
    // Hide examples modal
    hideExamples() {
        this.elements.examplesModal.classList.add('hidden');
    }
    
    // Download example file
    downloadExample(type) {
        let data, filename;
        
        switch (type) {
            case 'character':
                data = this.game.dataManager.generateExampleCharacterJSON();
                filename = 'character-data-example.json';
                break;
            case 'phrase':
                data = this.game.dataManager.generateExamplePhraseJSON();
                filename = 'phrase-data-example.json';
                break;
            case 'combined':
                data = this.game.dataManager.generateExampleCombinedJSON();
                filename = 'combined-data-example.json';
                break;
            default:
                return;
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage(`Downloaded ${filename}!`, 'success');
    }

    // Bind dropdown menu events
    bindDropdownEvents() {
        // File menu dropdown
        const fileMenuBtn = document.getElementById('file-menu-btn');
        const fileDropdown = fileMenuBtn.parentElement;
        
        // Settings menu dropdown
        const settingsMenuBtn = document.getElementById('settings-menu-btn');
        const settingsDropdown = settingsMenuBtn.parentElement;
        
        // Toggle dropdown on button click
        fileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileDropdown.classList.toggle('show');
            settingsDropdown.classList.remove('show');
        });
        
        settingsMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsDropdown.classList.toggle('show');
            fileDropdown.classList.remove('show');
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            fileDropdown.classList.remove('show');
            settingsDropdown.classList.remove('show');
        });
        
        // Prevent dropdown from closing when clicking inside
        fileDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        settingsDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Close dropdown when item is clicked
        const closeDropdown = (dropdown) => {
            dropdown.classList.remove('show');
        };
        
        // Add click handlers to dropdown items
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveGame();
            closeDropdown(fileDropdown);
        });
        
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportGame();
            closeDropdown(fileDropdown);
        });
        
        document.getElementById('load-btn').addEventListener('click', () => {
            this.loadGame();
            closeDropdown(fileDropdown);
        });
        
        document.getElementById('instructions-btn').addEventListener('click', () => {
            this.showScreen('instructions-screen');
            closeDropdown(settingsDropdown);
        });
        
        document.getElementById('manage-btn').addEventListener('click', () => {
            this.showScreen('manage-screen');
            closeDropdown(settingsDropdown);
        });
        
        document.getElementById('game-reset-btn').addEventListener('click', () => {
            this.resetGame();
            closeDropdown(settingsDropdown);
        });
    }

    // Initialize UI
    init() {
        this.showScreen('character-select');
        this.updateHeaderStats();
    }
}
