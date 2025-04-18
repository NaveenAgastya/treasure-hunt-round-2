

class PuzzleGame {
    constructor() {
        this.pieces = [];
        this.teamId = null;
        this.teamName = '';
        this.score = 0;
        this.time = 0;
        this.timer = null;
        this.gridSize = 5;
        this.currentImage = null;
        this.isInitialized = false;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.checkTeamAuthentication();
    }

    initializeElements() {
        this.puzzleContainer = document.getElementById('puzzle-image');
        this.startButton = document.getElementById('startGame');
        this.resetButton = document.getElementById('resetPuzzle');
        this.teamNameElement = document.getElementById('teamName');
        this.teamScoreElement = document.getElementById('teamScore');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.logoutBtn = document.getElementById('logoutBtn');
    }

    initializeEventListeners() {
        if (this.startButton) {
            this.startButton.addEventListener('click', () => this.startGame());
        }
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.resetPuzzle());
        }
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    handleLogout() {
        // Clear team info from localStorage
        localStorage.removeItem('teamId');
        localStorage.removeItem('puzzleImage');
        
        // Redirect to login page
        window.location.href = 'index.html';
    }

    async checkTeamAuthentication() {
        this.teamId = localStorage.getItem('teamId');
        const storedImage = localStorage.getItem('puzzleImage');
        
        if (this.teamId && storedImage) {
            await this.loadTeamData();
            if (!this.isInitialized) {
                await this.loadPuzzleImage(storedImage);
            }
        } else {
            window.location.href = 'index.html';
        }
    }

    async loadTeamData() {
        try {
            console.log("Attempting to load team data for team ID:", this.teamId);
            const teamDoc = await db.collection('teams').doc(this.teamId).get();
            
            if (teamDoc.exists) {
                const teamData = teamDoc.data();
                this.teamName = teamData.name;
                this.score = teamData.score || 0;
                this.teamNameElement.textContent = `Team: ${this.teamName}`;
                this.teamScoreElement.textContent = `Score: ${this.score}`;
                console.log("Team data loaded successfully:", teamData);
            } else {
                console.error("Team document doesn't exist");
                this.showError("Team not found", "Your team information could not be found. Please log in again.");
                // Team not found, redirect to login after a delay
                setTimeout(() => {
                    localStorage.removeItem('teamId');
                    localStorage.removeItem('puzzleImage');
                    window.location.href = 'index.html';
                }, 3000);
            }
        } catch (error) {
            console.error('Error loading team data:', error);
            
            // Show a user-friendly error message
            this.showError("Connection Error", "Unable to load your team data. Please check your internet connection and reload the page.");
            
            // Implement a retry button
            const retryBtn = document.createElement('button');
            retryBtn.innerText = "Retry Loading";
            retryBtn.className = "btn primary";
            retryBtn.addEventListener('click', () => {
                document.querySelector('.error-message')?.remove();
                this.loadTeamData();
            });
            
            document.querySelector('.error-message')?.appendChild(retryBtn);
        }
    }
    
    showError(title, message) {
        // Remove any existing error messages
        const existingError = document.querySelector('.error-message');
        if (existingError) existingError.remove();
        
        // Create and show new error message
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.innerHTML = `
            <h2>${title}</h2>
            <p>${message}</p>
        `;
        
        document.body.appendChild(errorElement);
    }

    async loadPuzzleImage(imageUrl) {
        if (this.isInitialized) return; // Prevent multiple initializations

        try {
            // Clear existing pieces
            this.pieces = [];
            if (this.puzzleContainer) {
                this.puzzleContainer.innerHTML = '';
            }
            
            const image = new Image();
            image.crossOrigin = "anonymous";
            
            return new Promise((resolve, reject) => {
                image.onload = () => {
                    this.currentImage = image;
                    if (this.puzzleContainer) {
                        this.puzzleContainer.style.width = '100%';
                        this.puzzleContainer.style.maxWidth = '800px';
                        this.puzzleContainer.style.height = 'auto';
                        this.createPuzzlePieces(image);
                        this.isInitialized = true;
                    }
                    resolve();
                };
                
                image.onerror = (error) => {
                    console.error('Error loading image:', error);
                    reject(error);
                };
                
                image.src = imageUrl;
            });
        } catch (error) {
            console.error('Error in loadPuzzleImage:', error);
            alert('Error loading puzzle image. Please try again.');
        }
    }

    createPuzzlePieces(image) {
        if (!this.puzzleContainer) return;
        
        this.puzzleContainer.innerHTML = '';
        this.pieces = [];
        
        const totalPieces = this.gridSize * this.gridSize;
        const positions = Array.from({ length: totalPieces }, (_, i) => i);
        
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const piece = document.createElement('div');
                piece.className = 'puzzle-piece';
                piece.dataset.originalPosition = i * this.gridSize + j;
                
                // Calculate background position
                const x = (j * 100) / (this.gridSize - 1);
                const y = (i * 100) / (this.gridSize - 1);
                
                piece.style.backgroundImage = `url(${image.src})`;
                piece.style.backgroundSize = `${this.gridSize * 100}% ${this.gridSize * 100}%`;
                piece.style.backgroundPosition = `${x}% ${y}%`;
                
                // Add drag-and-drop functionality
                piece.draggable = true;
                piece.addEventListener('dragstart', (e) => this.handleDragStart(e));
                piece.addEventListener('dragover', (e) => this.handleDragOver(e));
                piece.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                piece.addEventListener('drop', (e) => this.handleDrop(e));
                
                this.puzzleContainer.appendChild(piece);
                this.pieces.push({
                    element: piece,
                    originalPosition: i * this.gridSize + j,
                    currentPosition: i * this.gridSize + j
                });
            }
        }
        
        this.shufflePieces();
    }

    shufflePieces() {
        const positions = Array.from({ length: this.pieces.length }, (_, i) => i);
        
        // Fisher-Yates shuffle
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        
        // Apply shuffled positions
        positions.forEach((newPos, i) => {
            const piece = this.pieces[i];
            const row = Math.floor(newPos / this.gridSize);
            const col = newPos % this.gridSize;
            const x = (col * 100) / (this.gridSize - 1);
            const y = (row * 100) / (this.gridSize - 1);
            
            piece.currentPosition = newPos;
            piece.element.style.order = newPos;
        });
    }

    handleDragStart(e) {
        const piece = e.target;
        piece.classList.add('dragging');
        e.dataTransfer.setData('text/plain', piece.dataset.originalPosition);
    }

    handleDragOver(e) {
        e.preventDefault();
        const piece = e.target;
        if (piece.classList.contains('puzzle-piece')) {
            piece.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        const piece = e.target;
        if (piece.classList.contains('puzzle-piece')) {
            piece.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const draggedPiece = document.querySelector('.dragging');
        const targetPiece = e.target;
        
        if (draggedPiece && targetPiece.classList.contains('puzzle-piece')) {
            targetPiece.classList.remove('drag-over');
            
            // Swap the pieces
            const draggedIndex = this.pieces.findIndex(p => p.element === draggedPiece);
            const targetIndex = this.pieces.findIndex(p => p.element === targetPiece);
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                // Swap positions
                const tempOrder = draggedPiece.style.order;
                draggedPiece.style.order = targetPiece.style.order;
                targetPiece.style.order = tempOrder;
                
                // Update positions in the pieces array
                const tempPos = this.pieces[draggedIndex].currentPosition;
                this.pieces[draggedIndex].currentPosition = this.pieces[targetIndex].currentPosition;
                this.pieces[targetIndex].currentPosition = tempPos;
                
                this.checkPuzzleCompletion();
            }
        }
        
        draggedPiece.classList.remove('dragging');
    }

    checkPuzzleCompletion() {
        const isComplete = this.pieces.every(piece => 
            piece.currentPosition === piece.originalPosition
        );
        
        if (isComplete) {
            // Add visual feedback for completion
            this.pieces.forEach(piece => {
                piece.element.classList.add('correct');
            });
            
            // Add a small delay before showing completion message
            setTimeout(() => {
                this.handlePuzzleCompletion();
            }, 500);
        } else {
            // Check if pieces are in correct positions
            this.pieces.forEach(piece => {
                if (piece.currentPosition === piece.originalPosition) {
                    piece.element.classList.add('correct');
                } else {
                    piece.element.classList.remove('correct');
                }
            });
        }
    }

    startGame() {
        if (!this.isInitialized) return;
        
        this.time = 0;
        this.timer = setInterval(() => {
            this.time++;
            const minutes = Math.floor(this.time / 60);
            const seconds = this.time % 60;
            this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
        
        this.startButton.disabled = true;
    }

    resetPuzzle() {
        if (!this.isInitialized) return;
        
        clearInterval(this.timer);
        this.time = 0;
        this.timeDisplay.textContent = '00:00';
        this.startButton.disabled = false;
        
        // Remove correct class from all pieces
        this.pieces.forEach(piece => {
            piece.element.classList.remove('correct');
            piece.element.draggable = true;
            piece.element.style.cursor = 'move';
        });
        
        this.shufflePieces();
    }

    async handlePuzzleCompletion() {
        clearInterval(this.timer);
        const timeScore = Math.max(0, 1000 - (this.time * 10));
        const newTotalScore = this.score + timeScore;
        
        // Show a loading indicator
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'loading-message';
        loadingMsg.innerHTML = '<p>Saving score...</p>';
        document.body.appendChild(loadingMsg);
        
        try {
            // Try to update the score
            await this.updateTeamScoreWithRetry(this.teamId, newTotalScore);
            
            // Update was successful
            this.score = newTotalScore;
            this.teamScoreElement.textContent = `Score: ${this.score}`;
            
            // Remove loading indicator
            loadingMsg.remove();
            
            // Show completion message
            const completionMessage = document.createElement('div');
            completionMessage.className = 'completion-message';
            completionMessage.innerHTML = `
                <h2>Congratulations!</h2>
                <p>Puzzle completed in ${this.time} seconds</p>
                <p>Score: ${timeScore}</p>
                <button class="btn primary" id="okButton">OK</button>
            `;
            
            document.body.appendChild(completionMessage);
            document.getElementById('okButton').addEventListener('click', () => {
                completionMessage.remove();
            });
            
            // Disable drag and drop after completion
            this.pieces.forEach(piece => {
                piece.element.draggable = false;
                piece.element.style.cursor = 'default';
            });
            
        } catch (error) {
            // Remove loading indicator
            loadingMsg.remove();
            
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.innerHTML = `
                <h2>Error Updating Score</h2>
                <p>There was a problem saving your score. Please try again.</p>
                <button class="btn primary" id="retryButton">Retry</button>
                <button class="btn" id="dismissButton">Dismiss</button>
            `;
            
            document.body.appendChild(errorMessage);
            
            document.getElementById('retryButton').addEventListener('click', () => {
                errorMessage.remove();
                this.handlePuzzleCompletion();
            });
            
            document.getElementById('dismissButton').addEventListener('click', () => {
                errorMessage.remove();
                // Update the local score even if saving fails
                this.score = newTotalScore;
                this.teamScoreElement.textContent = `Score: ${this.score}`;
            });
        }
    }
    
    async updateTeamScoreWithRetry(teamId, newScore, maxRetries = 3) {
        let retries = maxRetries;
        
        const attemptUpdate = async () => {
            try {
                await db.collection('teams').doc(teamId).update({
                    score: newScore
                });
                return true;
            } catch (error) {
                console.error('Score update error:', error);
                
                if (retries > 0 && error.code !== 'permission-denied') {
                    retries--;
                    console.log(`Retrying score update... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                    return attemptUpdate();
                }
                
                throw error;
            }
        };
        
        return attemptUpdate();
    }
    
    showScoreSavingIndicator(show) {
        const indicator = document.getElementById('saving-indicator') || this.createSavingIndicator();
        indicator.style.display = show ? 'block' : 'none';
    }
    
    createSavingIndicator() {
        const div = document.createElement('div');
        div.id = 'saving-indicator';
        div.style.position = 'fixed';
        div.style.bottom = '20px';
        div.style.right = '20px';
        div.style.padding = '10px';
        div.style.backgroundColor = '#4CAF50';
        div.style.color = 'white';
        div.style.borderRadius = '4px';
        div.style.display = 'none';
        div.textContent = 'Saving score...';
        document.body.appendChild(div);
        return div;
    }
    
    showScoreUpdateError() {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <h3>Error Updating Score</h3>
            <p>There was a problem saving your score. Please try again.</p>
            <div class="error-actions">
                <button id="retry-score" class="btn primary">Retry</button>
                <button id="dismiss-error" class="btn secondary">Dismiss</button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        document.getElementById('retry-score').addEventListener('click', () => {
            errorDiv.remove();
            this.handlePuzzleCompletion();
        });
        
        document.getElementById('dismiss-error').addEventListener('click', () => {
            errorDiv.remove();
        });
    }
    
    showCompletionMessage(timeScore) {
        // Remove any existing completion messages
        const existingMessages = document.querySelectorAll('.completion-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new completion message
        const completionMessage = document.createElement('div');
        completionMessage.className = 'completion-message';
        completionMessage.innerHTML = `
            <h2>Congratulations!</h2>
            <p>Puzzle completed in ${this.time} seconds</p>
            <p>Score: ${timeScore}</p>
            <button class="btn primary" onclick="this.parentElement.remove()">OK</button>
        `;
        
        // Add to the page
        document.body.appendChild(completionMessage);
    }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PuzzleGame();
});