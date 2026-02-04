// Main application entry point

// Global game instances
let game;
let gameUI;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Hanzi Creatures - Initializing...');
    
    try {
        // Create game instance
        game = new HanziGame();
        console.log('Game engine initialized');
        
        // Create UI manager
        gameUI = new GameUI(game);
        console.log('UI manager initialized');
        
        // Initialize UI
        gameUI.init();
        
        // Hide loading indicator and show the game
        setTimeout(() => {
            const loadingIndicator = document.getElementById('loading-indicator');
            const characterGrid = document.getElementById('character-grid');
            const addButton = document.getElementById('add-character-btn');
            
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (characterGrid) characterGrid.style.display = 'grid';
            if (addButton) addButton.style.display = 'block';
        }, 1000);
        
        // Add some CSS animations dynamically
        addCustomAnimations();
        
        // Setup global error handling
        setupErrorHandling();
        
        // Export functionality now handled by dedicated Export button
        
        console.log('Hanzi Creatures - Ready to play!');
        
        // Show welcome message for new games
        if (Object.keys(game.characters).length <= 3) {
            setTimeout(() => {
                gameUI.showMessage('Welcome to Hanzi Creatures! Click on a character to start practicing.', 'info');
            }, 1000);
        }
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showCriticalError('Failed to initialize the game. Please refresh the page and try again.');
    }
});

// Add custom CSS animations
function addCustomAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        @keyframes bounce {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-10px);
            }
        }
        
        @keyframes glow {
            0%, 100% {
                box-shadow: 0 0 5px var(--gbc-blue);
            }
            50% {
                box-shadow: 0 0 20px var(--gbc-blue), 0 0 30px var(--gbc-blue);
            }
        }
        
        .phrase-evolution-btn:hover {
            animation: glow 1s infinite;
        }
        
        .character-card:hover {
            animation: bounce 0.6s ease-in-out;
        }
        
        .game-message {
            backdrop-filter: blur(4px);
        }
        
        .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid var(--gbc-light-green);
            border-radius: 50%;
            border-top-color: var(--gbc-dark-green);
            animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .practice-area.practicing {
            background: linear-gradient(45deg, var(--gbc-lightest) 25%, transparent 25%), 
                        linear-gradient(-45deg, var(--gbc-lightest) 25%, transparent 25%), 
                        linear-gradient(45deg, transparent 75%, var(--gbc-lightest) 75%), 
                        linear-gradient(-45deg, transparent 75%, var(--gbc-lightest) 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            animation: practice-bg 20s linear infinite;
        }
        
        @keyframes practice-bg {
            0% { background-position: 0 0, 0 10px, 10px -10px, -10px 0px; }
            100% { background-position: 20px 20px, 20px 30px, 30px 10px, 10px 20px; }
        }
    `;
    document.head.appendChild(style);
}

// Setup global error handling
function setupErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        
        // Don't show error messages for hanzi-writer internal errors
        if (event.error && event.error.message && 
            event.error.message.includes('hanzi-writer')) {
            return;
        }
        
        if (gameUI) {
            gameUI.showMessage('An error occurred. Please try again.', 'error');
        }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        
        if (gameUI) {
            gameUI.showMessage('An error occurred while processing your request.', 'error');
        }
    });
}

// Setup export functionality (right-click on save button)
function setupExportFunctionality() {
    const saveBtn = document.getElementById('save-btn');
    
    saveBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (gameUI) {
            gameUI.exportGame();
        }
    });
    
    // Add tooltip
    saveBtn.title = 'Click to save, right-click to export as file';
}

// Show critical error message
function showCriticalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--gbc-red);
        color: white;
        padding: 20px;
        border: 2px solid var(--gbc-dark-green);
        border-radius: 8px;
        z-index: 10000;
        text-align: center;
        font-weight: bold;
        max-width: 400px;
    `;
    errorDiv.innerHTML = `
        <h3>⚠️ Error</h3>
        <p>${message}</p>
        <button onclick="location.reload()" style="
            margin-top: 16px;
            padding: 8px 16px;
            background: white;
            color: var(--gbc-red);
            border: none;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer;
        ">Reload Page</button>
    `;
    
    document.body.appendChild(errorDiv);
}

// Utility functions for development/debugging
if (typeof window !== 'undefined') {
    window.gameDebug = {
        // Expose game instance for debugging
        getGame: () => game,
        getUI: () => gameUI,
        
        // Quick character adding for testing
        addTestCharacters: () => {
            const testChars = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
            testChars.forEach(char => game.addCharacter(char));
            gameUI.refreshCharacterGrid();
            gameUI.updateHeaderStats();
            console.log('Added test characters');
        },
        
        // Level up current character for testing
        levelUpCurrent: () => {
            if (game.currentCharacter) {
                game.currentCharacter.addXP(1000);
                gameUI.updatePracticeScreen(game.currentCharacter);
                console.log(`Leveled up ${game.currentCharacter.char}`);
            }
        },
        
        // Show game stats
        showStats: () => {
            console.table(game.getGameStats());
        },
        
        // Reset game (caution!)
        resetGame: () => {
            if (confirm('This will delete all progress! Are you sure?')) {
                localStorage.removeItem('hanzi-game-save');
                location.reload();
            }
        },
        
        // Unlock all phrases for testing
        unlockAllPhrases: () => {
            Object.values(game.phrases).forEach(phrase => phrase.unlocked = true);
            game.player.totalPhrases = Object.keys(game.phrases).length;
            console.log('Unlocked all phrases');
        }
    };
    
    // Console welcome message
    console.log(`
    🐉 Hanzi Creatures Debug Console
    
    Available commands:
    - gameDebug.addTestCharacters() - Add test characters
    - gameDebug.levelUpCurrent() - Level up current character
    - gameDebug.showStats() - Show game statistics
    - gameDebug.unlockAllPhrases() - Unlock all phrases
    - gameDebug.resetGame() - Reset all progress (careful!)
    
    Access game instance: gameDebug.getGame()
    Access UI instance: gameDebug.getUI()
    `);
}

// Service worker registration for offline support (if available)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Note: Service worker would need to be implemented separately
        // This is just a placeholder for future offline functionality
        console.log('Service worker support detected (not implemented yet)');
    });
}

// Handle page visibility changes to pause/resume
document.addEventListener('visibilitychange', () => {
    if (document.hidden && game) {
        // Page is hidden, save progress
        game.saveGame();
        console.log('Page hidden - progress saved');
    } else if (game) {
        // Page is visible again
        console.log('Page visible - welcome back!');
    }
});

// Prevent accidental page refresh during practice
window.addEventListener('beforeunload', (e) => {
    if (game && game.currentCharacter && game.practiceStartTime) {
        e.preventDefault();
        e.returnValue = 'You have an active practice session. Are you sure you want to leave?';
        return e.returnValue;
    }
});
