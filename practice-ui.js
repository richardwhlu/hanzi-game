/**
 * Practice Session UI Components
 * 
 * UI components and helpers for the practice session tracking system.
 * Manages battle button states, progress indicators, and congratulatory messages.
 */

class PracticeUI {
    constructor(practiceTracker, gameUI) {
        this.practiceTracker = practiceTracker;
        this.gameUI = gameUI;
        this.battleButton = null;
        this.progressIndicator = null;
        this.congratsModal = null;
        
        // Bind callbacks
        this.practiceTracker.onPracticeCountChanged = this.onPracticeCountChanged.bind(this);
        this.practiceTracker.onBattleUnlocked = this.onBattleUnlocked.bind(this);
        this.practiceTracker.onBattleLocked = this.onBattleLocked.bind(this);
        
        this.init();
    }
    
    /**
     * Initialize UI components
     */
    init() {
        this.createProgressIndicator();
        this.setupBattleButton();
        this.createCongratsModal();
        this.updateUI();
        
        console.log('Practice UI initialized');
    }
    
    /**
     * Create the progress indicator element
     */
    createProgressIndicator() {
        // Find the game header to insert progress indicator
        const gameHeader = document.querySelector('.game-header');
        if (!gameHeader) {
            console.warn('Game header not found, cannot create progress indicator');
            return;
        }
        
        // Create progress indicator container
        const progressContainer = document.createElement('div');
        progressContainer.id = 'practice-progress';
        progressContainer.className = 'practice-progress';
        
        progressContainer.innerHTML = `
            <div class="progress-label">Battle Progress:</div>
            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill"></div>
                </div>
                <span class="progress-text" id="progress-text">0/10</span>
            </div>
            <div class="progress-tooltip" id="progress-tooltip">
                Complete practice sessions to unlock Battle mode
            </div>
        `;
        
        // Insert after player stats
        const playerStats = gameHeader.querySelector('.player-stats');
        if (playerStats) {
            playerStats.insertAdjacentElement('afterend', progressContainer);
        } else {
            gameHeader.insertBefore(progressContainer, gameHeader.firstChild);
        }
        
        this.progressIndicator = progressContainer;
    }
    
    /**
     * Setup battle button with lock/unlock functionality
     */
    setupBattleButton() {
        this.battleButton = document.getElementById('battle-btn');
        if (!this.battleButton) {
            console.warn('Battle button not found');
            return;
        }
        
        // Store original click handler
        this.originalBattleHandler = this.battleButton.onclick;
        
        // Override click handler
        this.battleButton.addEventListener('click', this.handleBattleClick.bind(this), true);
        
        // Add hover events for tooltips
        this.battleButton.addEventListener('mouseenter', this.showBattleTooltip.bind(this));
        this.battleButton.addEventListener('mouseleave', this.hideBattleTooltip.bind(this));
    }
    
    /**
     * Handle battle button clicks (with lock check)
     */
    handleBattleClick(event) {
        if (!this.practiceTracker.isBattleUnlocked()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            
            const remaining = this.practiceTracker.getPracticesRemaining();
            const message = remaining === 1 
                ? `Complete 1 more practice session to unlock Battle mode!`
                : `Complete ${remaining} more practice sessions to unlock Battle mode!`;
            
            this.gameUI.showMessage(message, 'info');
            
            // Add shake animation to button
            this.battleButton.classList.add('shake-animation');
            setTimeout(() => {
                this.battleButton.classList.remove('shake-animation');
            }, 600);
            
            return false;
        }
        
        // Battle is unlocked, allow normal behavior
        return true;
    }
    
    /**
     * Show tooltip on battle button hover
     */
    showBattleTooltip(event) {
        const status = this.practiceTracker.getStatus();
        let tooltipText;
        
        if (status.battleUnlocked) {
            tooltipText = 'Battle wild characters and phrases!';
        } else {
            const remaining = status.practicesRemaining;
            tooltipText = remaining === 1
                ? 'Complete 1 more practice to unlock'
                : `Complete ${remaining} more practices to unlock`;
        }
        
        this.battleButton.setAttribute('title', tooltipText);
    }
    
    /**
     * Hide battle button tooltip
     */
    hideBattleTooltip() {
        // Let default tooltip handling work
    }
    
    /**
     * Create congratulatory modal for battle unlock
     */
    createCongratsModal() {
        const modalHTML = `
            <div id="battle-unlock-modal" class="modal practice-unlock-modal hidden">
                <div class="modal-content celebration-content">
                    <div class="modal-header celebration-header">
                        <div class="celebration-icon">🎉</div>
                        <h3>Battle Mode Unlocked!</h3>
                    </div>
                    <div class="modal-body celebration-body">
                        <div class="celebration-message">
                            <p><strong>Congratulations!</strong></p>
                            <p>You've completed 10 practice sessions and unlocked Battle mode!</p>
                            <p>Now you can battle wild characters and phrases to test your skills and earn rewards.</p>
                        </div>
                        <div class="celebration-stats" id="celebration-stats">
                            <!-- Stats will be populated here -->
                        </div>
                        <div class="celebration-actions">
                            <button id="try-battle-btn" class="pixel-btn celebration-btn primary">
                                ⚔️ Try Battle Mode!
                            </button>
                            <button id="continue-practice-btn" class="pixel-btn celebration-btn">
                                Continue Practicing
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.congratsModal = document.getElementById('battle-unlock-modal');
        
        // Setup modal event handlers
        document.getElementById('try-battle-btn').addEventListener('click', () => {
            this.hideCongratsModal();
            // Trigger battle mode
            if (this.gameUI && this.gameUI.showBattleScreen) {
                this.gameUI.showBattleScreen();
            }
        });
        
        document.getElementById('continue-practice-btn').addEventListener('click', () => {
            this.hideCongratsModal();
        });
        
        // Close on background click
        this.congratsModal.addEventListener('click', (event) => {
            if (event.target === this.congratsModal) {
                this.hideCongratsModal();
            }
        });
    }
    
    /**
     * Show congratulatory modal
     */
    showCongratsModal(data = {}) {
        if (!this.congratsModal) return;
        
        // Update stats in modal
        const statsContainer = document.getElementById('celebration-stats');
        if (statsContainer && data.sessionStats) {
            statsContainer.innerHTML = `
                <div class="celebration-stat">
                    <span class="stat-label">Practice Sessions:</span>
                    <span class="stat-value">${this.practiceTracker.getPracticeCount()}</span>
                </div>
                <div class="celebration-stat">
                    <span class="stat-label">Last Session Accuracy:</span>
                    <span class="stat-value">${data.sessionStats.accuracy || 0}%</span>
                </div>
            `;
        }
        
        // Show modal with animation
        this.congratsModal.classList.remove('hidden');
        setTimeout(() => {
            this.congratsModal.classList.add('show');
        }, 10);
        
        // Mark congratulation as shown
        this.practiceTracker.markCongratulationShown();
        
        // Add celebration particles effect
        this.addCelebrationEffects();
    }
    
    /**
     * Hide congratulatory modal
     */
    hideCongratsModal() {
        if (!this.congratsModal) return;
        
        this.congratsModal.classList.remove('show');
        setTimeout(() => {
            this.congratsModal.classList.add('hidden');
        }, 300);
    }
    
    /**
     * Add celebration effects (confetti/particles)
     */
    addCelebrationEffects() {
        // Simple confetti effect using CSS animations
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.backgroundColor = this.getRandomColor();
            confettiContainer.appendChild(confetti);
        }
        
        document.body.appendChild(confettiContainer);
        
        // Remove confetti after animation
        setTimeout(() => {
            confettiContainer.remove();
        }, 4000);
    }
    
    /**
     * Get random color for confetti
     */
    getRandomColor() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#f368e0'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Update all UI elements to reflect current state
     */
    updateUI() {
        const status = this.practiceTracker.getStatus();
        this.updateBattleButton(status);
        this.updateProgressIndicator(status);
    }
    
    /**
     * Update battle button appearance and state
     */
    updateBattleButton(status) {
        if (!this.battleButton) return;
        
        if (status.battleUnlocked) {
            this.battleButton.classList.remove('locked');
            this.battleButton.classList.add('unlocked');
            this.battleButton.disabled = false;
            this.battleButton.setAttribute('title', 'Battle wild characters and phrases!');
        } else {
            this.battleButton.classList.add('locked');
            this.battleButton.classList.remove('unlocked');
            this.battleButton.disabled = true;
            
            const remaining = status.practicesRemaining;
            const tooltipText = remaining === 1
                ? 'Complete 1 more practice to unlock'
                : `Complete ${remaining} more practices to unlock`;
            this.battleButton.setAttribute('title', tooltipText);
        }
    }
    
    /**
     * Update progress indicator
     */
    updateProgressIndicator(status) {
        if (!this.progressIndicator) return;
        
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const progressTooltip = document.getElementById('progress-tooltip');
        
        // Use battle-specific progress methods for accurate display
        const battleProgressPercentage = this.practiceTracker.getBattleProgressPercentage();
        const battleProgressCount = this.practiceTracker.getBattleProgressCount();
        
        if (progressFill) {
            progressFill.style.width = battleProgressPercentage + '%';
        }
        
        if (progressText) {
            progressText.textContent = `${battleProgressCount}/${status.practicesRequired}`;
        }
        
        if (progressTooltip) {
            if (status.battleUnlocked) {
                progressTooltip.textContent = 'Battle mode unlocked! Great job!';
                this.progressIndicator.classList.add('completed');
            } else {
                const remaining = status.practicesRemaining;
                progressTooltip.textContent = remaining === 1
                    ? 'Complete 1 more practice session to unlock Battle mode'
                    : `Complete ${remaining} more practice sessions to unlock Battle mode`;
                this.progressIndicator.classList.remove('completed');
            }
        }
    }
    
    /**
     * Callback for practice count changes
     */
    onPracticeCountChanged(result) {
        this.updateUI();
        
        // Show progress message if available
        if (result.message && this.gameUI) {
            const messageType = result.justUnlocked ? 'success' : 'info';
            this.gameUI.showMessage(result.message, messageType);
        }
        
        console.log('Practice count changed:', result);
    }
    
    /**
     * Callback for battle unlock
     */
    onBattleUnlocked(result) {
        this.updateUI();
        
        // Show congratulatory modal if not already shown
        if (!this.practiceTracker.congratulationShown) {
            setTimeout(() => {
                this.showCongratsModal(result);
            }, 1000); // Delay to let other UI updates complete
        }
        
        console.log('Battle mode unlocked!', result);
    }
    
    /**
     * Callback for battle locked (after battle usage)
     */
    onBattleLocked(result) {
        this.updateUI();
        
        console.log('Battle mode locked after use:', result);
    }
    
    /**
     * Handle practice completion (called by game engine)
     */
    onPracticeComplete(practiceData) {
        return this.practiceTracker.incrementPracticeCount(practiceData);
    }
    
    /**
     * Get current status for external use
     */
    getStatus() {
        return this.practiceTracker.getStatus();
    }
    
    /**
     * Force update UI (useful after data import/export)
     */
    refresh() {
        this.updateUI();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PracticeUI = PracticeUI;
}
