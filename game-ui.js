// UI management and screen transitions

class GameUI {
    constructor(game) {
        this.game = game;
        this.currentScreen = 'character-select';
        this.elements = {};
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
    }
    
    // Bind event listeners
    bindEvents() {
        // Header button events
        document.getElementById('battle-btn').addEventListener('click', () => this.startBattle());
        document.getElementById('save-btn').addEventListener('click', () => this.saveGame());
        document.getElementById('export-btn').addEventListener('click', () => this.exportGame());
        document.getElementById('load-btn').addEventListener('click', () => this.loadGame());
        document.getElementById('manage-btn').addEventListener('click', () => this.showScreen('manage-screen'));
        
        // Navigation events
        document.getElementById('back-btn').addEventListener('click', () => this.showScreen('character-select'));
        document.getElementById('back-to-select').addEventListener('click', () => this.showScreen('character-select'));
        document.getElementById('back-from-evolution').addEventListener('click', () => this.showScreen('character-select'));
        
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
                break;
            case 'evolution-screen':
                this.refreshPhraseGrid();
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
        card.className = character.isPhraseCharacter ? 'character-card phrase-character' : 'character-card';
        
        const progressWidth = (character.xp / character.getXPForNextLevel()) * 100;
        
        // Add visual indicator for phrase characters
        const phraseIndicator = character.isPhraseCharacter ? '✨ ' : '';
        const characterType = character.isPhraseCharacter ? 'Phrase' : `Level ${character.level}`;
        
        card.innerHTML = `
            <div class="character-display">${phraseIndicator}${character.char}</div>
            <div class="character-info">
                <div><strong>${character.pinyin}</strong></div>
                <div>${characterType}</div>
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
        
        // Update character info display
        this.updatePracticeScreen(character);
        
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
        a.download = `hanzi-game-save-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showMessage('Game data exported successfully!', 'success');
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
        const availableCharacters = this.game.getAvailableCharacters();
        if (availableCharacters.length === 0) {
            this.showMessage('You need at least one character to battle!', 'error');
            return;
        }
        
        // Initialize battle state
        this.battleState = {
            playerCharacters: availableCharacters.map(char => ({
                ...char,
                currentHP: char.hp,
                defeated: false
            })),
            currentPlayerCharacter: null,
            enemy: null,
            battleLog: []
        };
        
        // Set first character as active
        this.battleState.currentPlayerCharacter = this.battleState.playerCharacters[0];
        
        // Generate enemy
        this.battleState.enemy = this.game.generateWildOpponent();
        
        // Show battle screen and initialize
        this.showScreen('battle-screen');
        this.initializeBattleScreen();
    }
    
    // Initialize battle screen UI
    initializeBattleScreen() {
        // Setup event listeners for battle
        this.setupBattleEvents();
        
        // Render battle participants
        this.renderBattleCharacter(this.battleState.currentPlayerCharacter, 'player');
        this.renderBattleCharacter(this.battleState.enemy, 'enemy');
        this.renderPlayerTeam();
        
        // Clear battle log
        this.battleState.battleLog = [];
        this.addBattleMessage(`A wild ${this.battleState.enemy.name} appears!`, 'info');
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
        this.exitBattle = () => this.showScreen('character-select');
        
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
        if (!this.battleState.currentPlayerCharacter || !this.battleState.enemy) return;
        
        const player = this.battleState.currentPlayerCharacter;
        const enemy = this.battleState.enemy;
        
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
        
        // Update enemy display
        this.renderBattleCharacter(enemy, 'enemy');
        
        if (attackResult.enemyDefeated) {
            // Enemy defeated!
            setTimeout(() => this.handleEnemyDefeated(), 1000);
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
                    setTimeout(() => this.handlePlayerCharacterDefeated(), 1000);
                    return;
                }
            }
            
            // Re-enable attack button
            this.elements.attackBtn.disabled = false;
        }, 1500);
    }
    
    // Handle enemy defeated
    handleEnemyDefeated() {
        const enemy = this.battleState.enemy;
        this.addBattleMessage(`${enemy.name} is defeated!`, 'victory');
        
        // Add defeated opponent to collection
        const addResult = this.game.addDefeatedOpponent(enemy);
        
        if (addResult.type === 'character') {
            this.addBattleMessage(`You captured ${addResult.name}! It's now in your practice list!`, 'victory');
        } else if (addResult.type === 'phrase') {
            this.addBattleMessage(`You learned the phrase "${addResult.name}"! It's now available for practice!`, 'victory');
        }
        
        // Update game stats
        this.updateHeaderStats();
        
        // Disable attack button and suggest actions
        this.elements.attackBtn.disabled = true;
        this.elements.attackBtn.textContent = 'Victory!';
        this.addBattleMessage('Find a new opponent or return to practice!', 'info');
    }
    
    // Handle player character defeated
    handlePlayerCharacterDefeated() {
        const player = this.battleState.currentPlayerCharacter;
        player.defeated = true;
        this.addBattleMessage(`${player.char} is defeated!`, 'defeat');
        
        // Check if any characters remain
        const remainingCharacters = this.battleState.playerCharacters.filter(char => !char.defeated);
        
        if (remainingCharacters.length === 0) {
            // All characters defeated
            this.addBattleMessage('All your characters are defeated! Returning to practice...', 'defeat');
            setTimeout(() => {
                this.showScreen('character-select');
                this.showMessage('Your characters need more training! Practice to get stronger!', 'info');
            }, 3000);
        } else {
            // Switch to next available character
            this.battleState.currentPlayerCharacter = remainingCharacters[0];
            this.renderBattleCharacter(this.battleState.currentPlayerCharacter, 'player');
            this.renderPlayerTeam();
            this.addBattleMessage(`Switched to ${this.battleState.currentPlayerCharacter.char}!`, 'info');
            this.elements.attackBtn.disabled = false;
        }
    }
    
    // Generate new enemy
    generateNewEnemy() {
        this.battleState.enemy = this.game.generateWildOpponent();
        this.renderBattleCharacter(this.battleState.enemy, 'enemy');
        this.addBattleMessage(`A wild ${this.battleState.enemy.name} appears!`, 'info');
        
        // Reset attack button
        this.elements.attackBtn.disabled = false;
        this.elements.attackBtn.textContent = 'Attack!';
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
    
    // Initialize UI
    init() {
        this.showScreen('character-select');
        this.updateHeaderStats();
    }
}
