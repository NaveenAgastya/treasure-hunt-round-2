// config.js


// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCqE10uMm-cAho_J9fbIGhzDiRv1-urRM4",
  authDomain: "treasure-hunt-f5efc.firebaseapp.com",
  projectId: "treasure-hunt-f5efc",
  storageBucket: "treasure-hunt-f5efc.firebasestorage.app",
  messagingSenderId: "90380315506",
  appId: "1:90380315506:web:63dbbf1d6e373086494beb",
  measurementId: "G-8JG42E3VB3"
  };
  
  // Initialize Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  } else {
    firebase.app(); // if already initialized, use that one
  }
  
  const db = firebase.firestore();
  const auth = firebase.auth();
  
  // Rest of your existing config.js code...
  // Example usage:
// createAdmin('admin@example.com', 'securepassword123');


// You can create multiple admin accounts if needed
async function setupInitialAdmins() {
    const admins = [
        { email: 'naveenani2005@gmail.com', password: 'Naveen@01' }
        // Add more admin accounts as needed
    ];
    
    for (const admin of admins) {
        try {
            await createAdmin(admin.email, admin.password);
        } catch (error) {
            console.error(`Failed to create admin ${admin.email}:`, error);
        }
    }

    async function createAdmin(email, password) {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        await db.collection('admins').doc(userCredential.user.uid).set({
            email: email,
            role: 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Admin ${email} created successfully!`);
        return userCredential.user.uid;
    }
    
}

db.enablePersistence()
  .then(() => {
    console.log("Offline persistence enabled");
  })
  .catch((err) => {
    console.error("Error enabling offline persistence:", err);
  });

// Uncomment the line below to run the setup
// setupInitialAdmins();