class AdminPanel {
    constructor() {
        this.teams = [];
        this.currentImage = null;
        this.initializeElements();
        this.initializeEventListeners();
        this.checkAdminAuth();
    }

    initializeElements() {
        this.teamForm = document.getElementById('teamForm');
        this.teamNameInput = document.getElementById('teamName');
        this.teamPasswordInput = document.getElementById('teamPassword');
        this.puzzleImageInput = document.getElementById('puzzleImage');
        this.teamList = document.getElementById('teamList');
        this.logoutBtn = document.getElementById('logoutBtn');
    }

    initializeEventListeners() {
        if (this.teamForm) {
            this.teamForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        if (this.puzzleImageInput) {
            this.puzzleImageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    checkAdminAuth() {
        // Check if user is authenticated as admin
        auth.onAuthStateChanged(user => {
            if (user) {
                // Check if user is admin
                db.collection('admins').doc(user.uid).get()
                    .then(doc => {
                        if (doc.exists) {
                            // User is admin, load teams
                            this.loadTeams();
                        } else {
                            // User is not admin, redirect to login
                            alert('You are not authorized as an admin');
                            this.handleLogout();
                        }
                    })
                    .catch(error => {
                        console.error('Error checking admin status:', error);
                        alert('Error verifying admin status. Please try again.');
                    });
            } else {
                // User is not logged in, redirect to login
                window.location.href = 'index.html';
            }
        });
    }

    handleLogout() {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch(error => {
            console.error('Error signing out:', error);
        });
    }

    async handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64Image = await this.getBase64(file);
                this.currentImage = base64Image;
                
                // Preview the image
                const preview = document.getElementById('imagePreview');
                if (preview) {
                    preview.src = base64Image;
                    preview.style.display = 'block';
                }
            } catch (error) {
                console.error('Error converting image:', error);
                alert('Error processing image. Please try again.');
            }
        }
    }

    getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const teamName = this.teamNameInput.value.trim();
        const teamPassword = this.teamPasswordInput.value.trim();
        
        if (!teamName) {
            alert('Please enter a team name');
            return;
        }

        if (!teamPassword || teamPassword.length < 4) {
            alert('Please enter a password (minimum 4 characters)');
            return;
        }

        if (!this.currentImage) {
            alert('Please upload a puzzle image');
            return;
        }

        try {
            // Check if team name already exists
            const teamExists = await this.checkTeamExists(teamName);
            if (teamExists) {
                alert('Team name already exists. Please choose another name.');
                return;
            }

            // Add team to Firestore
            const teamRef = await db.collection('teams').add({
                name: teamName,
                password: teamPassword,
                puzzleImage: this.currentImage,
                score: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Clear the form
            this.teamNameInput.value = '';
            this.teamPasswordInput.value = '';
            this.puzzleImageInput.value = '';
            this.currentImage = null; // Clear the current image
            
            const preview = document.getElementById('imagePreview');
            if (preview) {
                preview.style.display = 'none';
            }

            // Reload teams list
            await this.loadTeams();
            
            alert('Team added successfully!');
        } catch (error) {
            console.error('Error adding team:', error);
            alert('Error adding team. Please try again.');
        }
    }

    async checkTeamExists(teamName) {
        const teamsSnapshot = await db.collection('teams')
            .where('name', '==', teamName)
            .get();
        
        return !teamsSnapshot.empty;
    }

    async loadTeams() {
        try {
            const teamsSnapshot = await db.collection('teams').get();
            this.teams = [];
            this.teamList.innerHTML = '';

            teamsSnapshot.forEach(doc => {
                const team = {
                    id: doc.id,
                    ...doc.data()
                };
                this.teams.push(team);
                this.renderTeam(team);
            });
        } catch (error) {
            console.error('Error loading teams:', error);
        }
    }

    renderTeam(team) {
        const teamCard = document.createElement('div');
        teamCard.className = 'team-card';
        teamCard.innerHTML = `
            <h3>${team.name}</h3>
            <p>Password: ${team.password}</p>
            <p>Score: ${team.score}</p>
            <img src="${team.puzzleImage}" alt="Puzzle Image" style="max-width: 100%; height: auto;">
            <div class="team-actions">
                <button class="btn secondary" onclick="adminPanel.deleteTeam('${team.id}')">Delete</button>
                <button class="btn primary" onclick="adminPanel.assignTeam('${team.id}')">Preview</button>
            </div>
        `;
        this.teamList.appendChild(teamCard);
    }

    async deleteTeam(teamId) {
        if (confirm('Are you sure you want to delete this team?')) {
            try {
                await db.collection('teams').doc(teamId).delete();
                await this.loadTeams();
                alert('Team deleted successfully!');
            } catch (error) {
                console.error('Error deleting team:', error);
                alert('Error deleting team. Please try again.');
            }
        }
    }

    async assignTeam(teamId) {
        try {
            // Store team ID in localStorage
            localStorage.setItem('teamId', teamId);
            
            // Get the team data
            const teamDoc = await db.collection('teams').doc(teamId).get();
            if (teamDoc.exists) {
                const teamData = teamDoc.data();
                // Store the puzzle image in localStorage
                localStorage.setItem('puzzleImage', teamData.puzzleImage);
            }
            
            // Open the game page in a new tab
            window.open('game.html', '_blank');
        } catch (error) {
            console.error('Error previewing team:', error);
            alert('Error previewing team. Please try again.');
        }
    }
}

// Initialize the admin panel when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});