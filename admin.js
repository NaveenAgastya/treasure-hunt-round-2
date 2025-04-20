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


class SubmissionTracker {
    constructor() {
        this.submissions = [];
        this.initializeElements();
        this.initializeEventListeners();
        this.loadSubmissions();
    }

    initializeElements() {
        // Add these elements to your admin panel HTML
        this.submissionsList = document.getElementById('submissionsList');
        this.leaderboardTable = document.getElementById('leaderboardTable');
        this.exportRankingsBtn = document.getElementById('exportRankingsBtn');
        this.filterTeamInput = document.getElementById('filterTeam');
        this.dateRangeStart = document.getElementById('dateRangeStart');
        this.dateRangeEnd = document.getElementById('dateRangeEnd');
        this.filterBtn = document.getElementById('filterBtn');
        this.resetFilterBtn = document.getElementById('resetFilterBtn');
    }

    initializeEventListeners() {
        if (this.exportRankingsBtn) {
            this.exportRankingsBtn.addEventListener('click', () => this.exportRankings());
        }
        
        if (this.filterBtn) {
            this.filterBtn.addEventListener('click', () => this.applyFilters());
        }
        
        if (this.resetFilterBtn) {
            this.resetFilterBtn.addEventListener('click', () => this.resetFilters());
        }
    }

    async loadSubmissions() {
        try {
            // Listen for realtime updates to submissions
            db.collection('submissions')
                .orderBy('timestamp', 'desc')
                .onSnapshot(snapshot => {
                    this.submissions = [];
                    snapshot.forEach(doc => {
                        const submission = {
                            id: doc.id,
                            ...doc.data()
                        };
                        this.submissions.push(submission);
                    });
                    
                    this.renderSubmissions(this.submissions);
                    this.updateLeaderboard();
                });
        } catch (error) {
            console.error('Error loading submissions:', error);
        }
    }

    renderSubmissions(submissions) {
        if (!this.submissionsList) return;
        
        this.submissionsList.innerHTML = '';
        
        if (submissions.length === 0) {
            this.submissionsList.innerHTML = '<p class="no-data">No submissions recorded yet.</p>';
            return;
        }

        submissions.forEach(submission => {
            const timestamp = submission.timestamp ? 
                new Date(submission.timestamp.toDate()).toLocaleString() : 
                'Unknown time';
            
            const submissionItem = document.createElement('div');
            submissionItem.className = 'submission-item';
            submissionItem.innerHTML = `
                <div class="submission-header">
                    <h3>${submission.teamName}</h3>
                    <span class="timestamp">${timestamp}</span>
                </div>
                <div class="submission-details">
                    <p>Problem: ${submission.problemId || 'Unknown'}</p>
                    <p>Solution: ${submission.solution || 'Not provided'}</p>
                    <p>Status: <span class="${submission.isCorrect ? 'correct' : 'incorrect'}">${submission.isCorrect ? 'Correct' : 'Incorrect'}</span></p>
                    <p>Time Taken: ${this.formatTimeElapsed(submission.timeElapsed)}</p>
                    <p>Score: ${submission.score || 0}</p>
                </div>
                <div class="submission-actions">
                    <button class="btn secondary" onclick="submissionTracker.deleteSubmission('${submission.id}')">Delete</button>
                    <button class="btn ${submission.isCorrect ? 'danger' : 'primary'}" 
                        onclick="submissionTracker.toggleSubmissionStatus('${submission.id}', ${!submission.isCorrect})">
                        Mark as ${submission.isCorrect ? 'Incorrect' : 'Correct'}
                    </button>
                </div>
            `;
            this.submissionsList.appendChild(submissionItem);
        });
    }

    formatTimeElapsed(milliseconds) {
        if (!milliseconds) return 'N/A';
        
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }

    async deleteSubmission(submissionId) {
        if (confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
            try {
                await db.collection('submissions').doc(submissionId).delete();
                alert('Submission deleted successfully!');
            } catch (error) {
                console.error('Error deleting submission:', error);
                alert('Error deleting submission. Please try again.');
            }
        }
    }

    async toggleSubmissionStatus(submissionId, isCorrect) {
        try {
            const submissionRef = db.collection('submissions').doc(submissionId);
            const submission = (await submissionRef.get()).data();
            
            // If toggling from incorrect to correct, calculate score
            let score = submission.score || 0;
            if (isCorrect && !submission.isCorrect) {
                // Calculate score based on time elapsed and difficulty
                score = this.calculateScore(submission.timeElapsed, submission.difficulty || 1);
            }
            
            await submissionRef.update({
                isCorrect: isCorrect,
                score: isCorrect ? score : 0
            });
            
            // If submission is now correct, update team's score
            if (isCorrect) {
                const teamRef = db.collection('teams').doc(submission.teamId);
                const teamDoc = await teamRef.get();
                
                if (teamDoc.exists) {
                    const teamData = teamDoc.data();
                    const newScore = (teamData.score || 0) + score;
                    
                    await teamRef.update({
                        score: newScore
                    });
                }
            }
            
            alert(`Submission marked as ${isCorrect ? 'correct' : 'incorrect'}.`);
        } catch (error) {
            console.error('Error updating submission status:', error);
            alert('Error updating submission. Please try again.');
        }
    }

    calculateScore(timeElapsed, difficulty) {
        // Base score calculation:
        // - Faster submissions get higher scores
        // - Higher difficulty problems get higher scores
        // Example formula: score = baseScore * difficulty / (timeElapsed / 60000)
        
        const baseScore = 1000; // Base score for a submission
        const timeInMinutes = timeElapsed / 60000; // Convert ms to minutes
        
        // Add a minimum time to prevent extremely high scores for very fast submissions
        const adjustedTime = Math.max(timeInMinutes, 1);
        
        // Calculate score: higher for quicker solutions and more difficult problems
        let score = Math.round(baseScore * difficulty / adjustedTime);
        
        // Cap the maximum score
        const maxScore = 5000;
        return Math.min(score, maxScore);
    }

    updateLeaderboard() {
        if (!this.leaderboardTable) return;
        
        // Group submissions by team and calculate total scores
        const teamScores = {};
        const teamSubmissions = {};
        const teamFastestSolves = {};
        
        this.submissions.forEach(submission => {
            if (submission.isCorrect) {
                // Initialize team data if not exists
                if (!teamScores[submission.teamId]) {
                    teamScores[submission.teamId] = 0;
                    teamSubmissions[submission.teamId] = 0;
                    teamFastestSolves[submission.teamId] = Infinity;
                }
                
                // Add to team's score
                teamScores[submission.teamId] += (submission.score || 0);
                
                // Count correct submissions
                teamSubmissions[submission.teamId]++;
                
                // Track fastest solve time
                if (submission.timeElapsed < teamFastestSolves[submission.teamId]) {
                    teamFastestSolves[submission.teamId] = submission.timeElapsed;
                }
            }
        });
        
        // Get team details for each team ID
        const teamsPromises = Object.keys(teamScores).map(teamId => {
            return db.collection('teams').doc(teamId).get()
                .then(doc => {
                    if (doc.exists) {
                        return {
                            id: doc.id,
                            name: doc.data().name,
                            score: teamScores[doc.id],
                            submissions: teamSubmissions[doc.id],
                            fastestSolve: teamFastestSolves[doc.id]
                        };
                    }
                    return null;
                });
        });
        
        // Render the leaderboard once we have all team data
        Promise.all(teamsPromises)
            .then(teams => {
                // Filter out null values and sort by score (descending)
                const validTeams = teams.filter(team => team !== null);
                validTeams.sort((a, b) => {
                    // First sort by score (higher is better)
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    // Then by number of submissions (more is better)
                    if (b.submissions !== a.submissions) {
                        return b.submissions - a.submissions;
                    }
                    // Finally by fastest solve time (lower is better)
                    return a.fastestSolve - b.fastestSolve;
                });
                
                this.renderLeaderboard(validTeams);
            })
            .catch(error => {
                console.error('Error fetching team data for leaderboard:', error);
            });
    }

    renderLeaderboard(teams) {
        if (!this.leaderboardTable) return;
        
        const tableBody = this.leaderboardTable.querySelector('tbody') || this.leaderboardTable;
        tableBody.innerHTML = '';
        
        if (teams.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="no-data">No teams have made submissions yet.</td>
                </tr>`;
            return;
        }
        
        teams.forEach((team, index) => {
            const rank = index + 1;
            const row = document.createElement('tr');
            
            // Apply special styling for top 3 ranks
            if (rank <= 3) {
                row.className = `rank-${rank}`;
            }
            
            row.innerHTML = `
                <td>${rank}</td>
                <td>${team.name}</td>
                <td>${team.score}</td>
                <td>${team.submissions}</td>
                <td>${this.formatTimeElapsed(team.fastestSolve)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    applyFilters() {
        const teamFilter = this.filterTeamInput ? this.filterTeamInput.value.trim().toLowerCase() : '';
        const startDate = this.dateRangeStart ? new Date(this.dateRangeStart.value) : null;
        const endDate = this.dateRangeEnd ? new Date(this.dateRangeEnd.value) : null;
        
        // If end date is provided, set time to end of day
        if (endDate) {
            endDate.setHours(23, 59, 59, 999);
        }
        
        // Filter submissions based on criteria
        const filteredSubmissions = this.submissions.filter(submission => {
            const submissionDate = submission.timestamp ? new Date(submission.timestamp.toDate()) : null;
            
            // Filter by team name
            const teamNameMatch = !teamFilter || 
                (submission.teamName && submission.teamName.toLowerCase().includes(teamFilter));
            
            // Filter by date range
            const dateMatch = (!startDate || !submissionDate || submissionDate >= startDate) && 
                             (!endDate || !submissionDate || submissionDate <= endDate);
            
            return teamNameMatch && dateMatch;
        });
        
        this.renderSubmissions(filteredSubmissions);
    }

    resetFilters() {
        if (this.filterTeamInput) this.filterTeamInput.value = '';
        if (this.dateRangeStart) this.dateRangeStart.value = '';
        if (this.dateRangeEnd) this.dateRangeEnd.value = '';
        
        // Re-render all submissions
        this.renderSubmissions(this.submissions);
    }

    exportRankings() {
        // Get current leaderboard data
        const rows = [];
        const tableRows = this.leaderboardTable.querySelectorAll('tbody tr');
        
        // Create CSV header
        rows.push(['Rank', 'Team Name', 'Score', 'Correct Submissions', 'Fastest Solve Time']);
        
        // Add data rows
        tableRows.forEach(row => {
            const columns = Array.from(row.querySelectorAll('td')).map(td => td.textContent);
            rows.push(columns);
        });
        
        // Convert to CSV
        const csvContent = rows.map(row => row.join(',')).join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leaderboard-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Method to record a new submission (typically called from game.js)
    static async recordSubmission(teamId, teamName, problemId, solution, isCorrect, timeElapsed, difficulty = 1) {
        try {
            // Create the submission record
            const submissionData = {
                teamId,
                teamName,
                problemId,
                solution,
                isCorrect,
                timeElapsed, // in milliseconds
                difficulty,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Calculate score if submission is correct
            if (isCorrect) {
                const tracker = new SubmissionTracker();
                submissionData.score = tracker.calculateScore(timeElapsed, difficulty);
                
                // Update team score
                const teamRef = db.collection('teams').doc(teamId);
                const teamDoc = await teamRef.get();
                
                if (teamDoc.exists) {
                    const teamData = teamDoc.data();
                    const newScore = (teamData.score || 0) + submissionData.score;
                    
                    await teamRef.update({
                        score: newScore
                    });
                }
            }
            
            // Add submission to database
            await db.collection('submissions').add(submissionData);
            
            return true;
        } catch (error) {
            console.error('Error recording submission:', error);
            return false;
        }
    }
}

// HTML needed for the submissions and rankings UI:
// Recommended to be added to the admin.html page

/*
<div class="admin-section">
    <h2>Team Submissions</h2>
    
    <div class="filter-controls">
        <div class="filter-group">
            <input type="text" id="filterTeam" placeholder="Filter by team name">
        </div>
        <div class="filter-group">
            <label>Date Range:</label>
            <input type="date" id="dateRangeStart">
            <span>to</span>
            <input type="date" id="dateRangeEnd">
        </div>
        <div class="filter-actions">
            <button id="filterBtn" class="btn secondary">Apply Filters</button>
            <button id="resetFilterBtn" class="btn">Reset</button>
        </div>
    </div>
    
    <div id="submissionsList" class="submissions-list"></div>
</div>

<div class="admin-section">
    <h2>Team Rankings & Leaderboard</h2>
    <button id="exportRankingsBtn" class="btn primary">Export Rankings (CSV)</button>
    
    <table id="leaderboardTable" class="leaderboard-table">
        <thead>
            <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Score</th>
                <th>Correct Submissions</th>
                <th>Fastest Solve</th>
            </tr>
        </thead>
        <tbody>
            <!-- Leaderboard data will be inserted here -->
        </tbody>
    </table>
</div>

<style>
    .submissions-list {
        margin-top: 20px;
    }
    
    .submission-item {
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .submission-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .submission-header h3 {
        margin: 0;
    }
    
    .timestamp {
        color: #777;
        font-size: 0.9em;
    }
    
    .submission-details p {
        margin: 5px 0;
    }
    
    .correct {
        color: green;
        font-weight: bold;
    }
    
    .incorrect {
        color: red;
    }
    
    .submission-actions {
        margin-top: 10px;
        display: flex;
        gap: 10px;
    }
    
    .filter-controls {
        background-color: #f0f0f0;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        align-items: flex-end;
    }
    
    .filter-group {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .filter-actions {
        margin-left: auto;
    }
    
    .leaderboard-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
    }
    
    .leaderboard-table th, .leaderboard-table td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }
    
    .leaderboard-table th {
        background-color: #f5f5f5;
        font-weight: bold;
    }
    
    .rank-1 {
        background-color: rgba(255, 215, 0, 0.1);
        font-weight: bold;
    }
    
    .rank-2 {
        background-color: rgba(192, 192, 192, 0.1);
        font-weight: bold;
    }
    
    .rank-3 {
        background-color: rgba(205, 127, 50, 0.1);
        font-weight: bold;
    }
    
    .no-data {
        text-align: center;
        padding: 20px;
        color: #777;
        font-style: italic;
    }
</style>
*/

// Initialize the submission tracker when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('submissionsList')) {
        window.submissionTracker = new SubmissionTracker();
    }
});


// Initialize the admin panel when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});