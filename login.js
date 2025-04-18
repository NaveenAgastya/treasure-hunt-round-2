document.addEventListener('DOMContentLoaded', () => {
    class LoginManager {
        constructor() {
            if (!firebase.apps.length) {
                console.error("Firebase not initialized");
                return;
            }
            
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.initializeElements();
            this.initializeEventListeners();
            this.checkExistingAuth();
        }

        initializeElements() {
            this.teamLoginForm = document.getElementById('teamLoginForm');
            this.adminLoginForm = document.getElementById('adminLoginForm');
            this.tabButtons = document.querySelectorAll('.tab-btn');
            this.tabContents = document.querySelectorAll('.tab-content');
            this.loadingIndicator = this.createLoadingIndicator();
        }

        createLoadingIndicator() {
            const loader = document.createElement('div');
            loader.className = 'loading-indicator';
            loader.style.display = 'none';
            loader.innerHTML = 'Loading...';
            document.body.appendChild(loader);
            return loader;
        }

        showLoading(show = true) {
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = show ? 'block' : 'none';
            }
        }

        initializeEventListeners() {
            this.teamLoginForm?.addEventListener('submit', (e) => this.handleTeamLogin(e));
            this.adminLoginForm?.addEventListener('submit', (e) => this.handleAdminLogin(e));
            
            this.tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tabId = button.getAttribute('data-tab');
                    this.switchTab(tabId);
                });
            });
        }

        switchTab(tabId) {
            this.tabButtons.forEach(btn => btn.classList.remove('active'));
            this.tabContents.forEach(content => content.classList.remove('active'));
            
            document.querySelector(`.tab-btn[data-tab="${tabId}"]`)?.classList.add('active');
            document.getElementById(tabId)?.classList.add('active');
        }

        async checkExistingAuth() {
            try {
                const user = await new Promise((resolve) => {
                    const unsubscribe = this.auth.onAuthStateChanged(user => {
                        unsubscribe();
                        resolve(user);
                    });
                });

                if (user) {
                    const isAdmin = await this.verifyAdmin(user.uid);
                    if (isAdmin) {
                        window.location.href = 'admin.html';
                        return;
                    }
                    await this.checkTeamAuth();
                }
            } catch (error) {
                console.error('Auth check error:', error);
            }
        }

        async verifyAdmin(uid) {
            try {
                const doc = await this.db.collection('admins').doc(uid).get();
                return doc.exists;
            } catch (error) {
                console.error('Admin verification error:', error);
                return false;
            }
        }

        async checkTeamAuth() {
            const teamId = localStorage.getItem('teamId');
            if (!teamId) return;

            try {
                const doc = await this.db.collection('teams').doc(teamId).get();
                if (doc.exists) {
                    window.location.href = 'game.html';
                } else {
                    localStorage.removeItem('teamId');
                    localStorage.removeItem('puzzleImage');
                }
            } catch (error) {
                console.error('Team auth error:', error);
                alert('Error verifying team session');
            }
        }

        async handleTeamLogin(e) {
            e.preventDefault();
            this.showLoading();
            
            const teamName = document.getElementById('teamLoginName').value.trim();
            const password = document.getElementById('teamPassword').value;
            
            if (!teamName || !password) {
                this.showLoading(false);
                alert('Please enter team name and password');
                return;
            }
            
            try {
                const query = await this.db.collection('teams')
                    .where('name', '==', teamName)
                    .where('password', '==', password)
                    .limit(1)
                    .get();

                if (query.empty) {
                    throw new Error('Invalid team name or password');
                }

                const teamDoc = query.docs[0];
                localStorage.setItem('teamId', teamDoc.id);
                localStorage.setItem('puzzleImage', teamDoc.data().puzzleImage);
                window.location.href = 'game.html';
                
            } catch (error) {
                console.error('Team login error:', error);
                alert(error.message || 'Login failed. Please try again.');
            } finally {
                this.showLoading(false);
            }
        }

        async handleAdminLogin(e) {
            e.preventDefault();
            this.showLoading();
            
            const email = document.getElementById('adminEmail').value.trim();
            const password = document.getElementById('adminPassword').value;
            
            if (!email || !password) {
                this.showLoading(false);
                alert('Please enter email and password');
                return;
            }

            try {
                const { user } = await this.auth.signInWithEmailAndPassword(email, password);
                const isAdmin = await this.verifyAdmin(user.uid);
                
                if (!isAdmin) {
                    await this.auth.signOut();
                    throw new Error('Admin privileges not found');
                }
                
                window.location.href = 'admin.html';
                
            } catch (error) {
                console.error('Admin login error:', error);
                this.handleAuthError(error);
            } finally {
                this.showLoading(false);
            }
        }

        
        handleAuthError(error) {
            const messages = {
                'auth/invalid-email': 'Invalid email address',
                'auth/user-disabled': 'Account disabled',
                'auth/user-not-found': 'No account found with this email',
                'auth/wrong-password': 'Incorrect password',
                'auth/too-many-requests': 'Too many attempts. Try again later',
                'auth/network-request-failed': 'Network error. Check your connection'
            };

            alert(messages[error.code] || error.message || 'Authentication failed');
        }
    }


    // Initialize only if Firebase is available
    if (typeof firebase !== 'undefined' && firebase.apps.length) {
        new LoginManager();
    } else {
        console.error('Firebase not initialized');
        alert('System error. Please refresh the page.');
    }
});