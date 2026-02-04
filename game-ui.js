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
    }
    
    // Bind event listeners
    bindEvents() {
        // Header button events
        document.getElementById('save-btn').addEventListener('click', () => this.saveGame());
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
        card.className = 'character-card';
        
        const progressWidth = (character.xp / character.getXPForNextLevel()) * 100;
        
        card.innerHTML = `
            <div class="character-display">${character.char}</div>
            <div class="character-info">
                <div><strong>${character.pinyin}</strong></div>
                <div>Level ${character.level}</div>
                <div>HP: ${character.hp} | ATK: ${character.attack} | DEF: ${character.defense}</div>
                <div>Accuracy: ${character.getAccuracy()}%</div>
                <div style="background: #ddd; height: 4px; margin: 4px 0;">
                    <div style="background: var(--gbc-blue); height: 100%; width: ${progressWidth}%;"></div>
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
            const character = this.game.startPractice(char);
            this.updatePracticeScreen(character);
            this.showScreen('practice-screen');
            
            // Create writer and start quiz
            setTimeout(() => {
                this.game.createWriter('hanzi-writer', char);
                this.game.startQuiz();
            }, 500);
        } catch (error) {
            console.error('Failed to start practice:', error);
            this.showMessage('Failed to start practice session', 'error');
        }
    }
    
    // Update practice screen with character info
    updatePracticeScreen(character) {
        this.elements.currentCharacterName.textContent = `${character.char} (${character.pinyin})`;
        this.elements.charLevel.textContent = character.level;
        this.elements.charXP.textContent = `${character.xp}/${character.getXPForNextLevel()}`;
        this.elements.charHP.textContent = character.hp;
        
        // Hide XP feedback initially
        this.elements.xpFeedback.classList.add('hidden');
    }
    
    // Handle practice completion
    handlePracticeComplete(data) {
        const { character, result, playerLeveledUp, newUnlocks, sessionStats } = data;
        
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
        }
        
        // Player level up notification
        if (playerLeveledUp) {
            this.showMessage(`Player Level Up! Now level ${this.game.player.level}!`, 'success');
        }
        
        // Auto-hide feedback after delay
        setTimeout(() => {
            this.elements.xpFeedback.classList.add('hidden');
        }, 5000);
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
        // For now, just practice the first character in the phrase
        // Could be extended to practice the whole phrase sequence
        if (phrase.characters.length > 0) {
            this.startPractice(phrase.characters[0]);
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
    
    // Initialize UI
    init() {
        this.showScreen('character-select');
        this.updateHeaderStats();
    }
}
