// Firebase configuration
// Note: Firebase Web API keys are public by design and safe to commit to version control.
// They identify your Firebase project but do NOT provide authentication or authorization.
// Security is enforced through Firebase Security Rules and authentication, not API key secrecy.
// See: https://firebase.google.com/docs/projects/api-keys
// nosemgrep: generic.secrets.security.detected-generic-api-key, generic.secrets.gitleaks.google-api-key.google-api-key
const firebaseConfig = {
  // gitleaks:allow
  apiKey: "AIzaSyATWWlnIrPWNgxKgk5y8k71vGbJi9aDbuzU",
  authDomain: "auth.5ducks.ai",  // Custom domain for authentication
  projectId: "fire-5-ducks",
  appId: "1:1072598853946:web:15b5efc5feda6b133e8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Check authentication status and redirect if logged in
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // User is authenticated, redirect to React app
    console.log('User authenticated, redirecting to app...');
    window.location.href = '/app';
  } else {
    // User not authenticated, stay on static landing page
    console.log('User not authenticated, staying on landing page');
  }
});

// Set persistence to LOCAL to maintain login across browser sessions
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);