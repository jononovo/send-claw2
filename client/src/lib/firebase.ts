import { initializeApp, type FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  type Auth, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  type User,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";

// Validate Firebase configuration
function validateFirebaseConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  console.log('Raw environment variables:', {
    apiKey: apiKey ? '....' + apiKey.slice(-6) : 'undefined',
    projectId: projectId || 'undefined',
    appId: appId ? '....' + appId.slice(-6) : 'undefined',
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    domain: window.location.hostname
  });

  const errors = [];

  if (!apiKey) {
    errors.push('VITE_FIREBASE_API_KEY is missing');
  } else if (!apiKey.startsWith('AIza')) {
    errors.push('VITE_FIREBASE_API_KEY appears to be malformed (should start with "AIza")');
  }

  if (!projectId) {
    errors.push('VITE_FIREBASE_PROJECT_ID is missing');
  }

  if (!appId) {
    errors.push('VITE_FIREBASE_APP_ID is missing');
  } else if (!appId.includes(':')) {
    errors.push('VITE_FIREBASE_APP_ID appears to be malformed (should contain ":")');
  }

  const config = {
    apiKey,
    authDomain: 'auth.5ducks.ai',  // Custom domain for authentication
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    messagingSenderId: projectId?.split('-')[1] || '',
    appId
  };

  console.log('Firebase Configuration:', {
    hasApiKey: !!config.apiKey,
    hasProjectId: !!config.projectId,
    hasAppId: !!config.appId,
    authDomain: config.authDomain,
    environment: import.meta.env.MODE,
    domain: window.location.hostname,
  });

  return {
    isValid: errors.length === 0,
    errors,
    config
  };
}

// Initialize Firebase app
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let googleProvider: GoogleAuthProvider | undefined;
let currentAuthToken: string | null = null;

try {
  console.log('Starting Firebase initialization...', {
    timestamp: new Date().toISOString(),
    domain: window.location.hostname
  });

  const { isValid, errors, config } = validateFirebaseConfig();

  if (!isValid) {
    console.error('Firebase configuration validation failed:', {
      errors,
      environment: import.meta.env.MODE,
      domain: window.location.hostname
    });
    throw new Error(`Firebase configuration validation failed:\n${errors.join('\n')}`);
  }

  app = initializeApp(config);
  auth = getAuth(app);
  
  // Set persistence to LOCAL for long-term authentication
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log('Firebase persistence set to LOCAL');
    })
    .catch((error) => {
      console.error('Error setting persistence:', error);
    });
    
  googleProvider = new GoogleAuthProvider();

  // ============================================================
  // FIREBASE AUTHENTICATION VS GMAIL API - SCOPE SEPARATION
  // ============================================================
  // 
  // FIREBASE AUTH (This file):
  // - Handles app authentication only (login/signup)
  // - Firebase automatically includes 'email' and 'profile' scopes
  // - NO additional scopes needed or should be added here
  // - Minimal permissions for better user experience
  //
  // GMAIL API (Separate OAuth flow):
  // - Handled through gmail-api-service module
  // - Requires extensive Gmail permissions (read, send, modify)
  // - Uses Google People API OAuth flow
  // - Only requested when user needs email features
  //
  // IMPORTANT: Keep these two auth systems completely separate!
  // Never add Gmail scopes to Firebase auth configuration.
  // ============================================================

  // Set up auth state change listener
  if (auth) {
    onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          // Get the ID token
          const token = await user.getIdToken(true);
          currentAuthToken = token;
          
          // Store token in localStorage for added persistence
          localStorage.setItem('authToken', token);

          // Set up axios defaults for the auth header
          const axios = (await import('axios')).default;
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        } catch (error) {
          console.error('Error getting auth token:', error);
          currentAuthToken = null;
        }
      } else {
        // Check if we're initializing with an existing token
        const existingToken = localStorage.getItem('authToken');
        if (!existingToken) {
          // Clear token on explicit logout
          currentAuthToken = null;
          localStorage.removeItem('authToken');
          const axios = (await import('axios')).default;
          delete axios.defaults.headers.common['Authorization'];
        }
      }
    });
  }

  // Log successful initialization with domain info
  console.log('Firebase initialized successfully:', {
    domain: window.location.hostname,
    isAuth: !!auth,
    isProvider: !!googleProvider,
    authDomain: config.authDomain,
    timestamp: new Date().toISOString()
  });

} catch (error) {
  console.error('Firebase initialization error:', {
    error,
    domain: window.location.hostname,
    environment: import.meta.env.MODE,
    timestamp: new Date().toISOString()
  });

  if (error instanceof Error) {
    console.error('Detailed error information:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      domain: window.location.hostname
    });
  }
}

// Export with fallbacks
export const firebaseApp = app;
export const firebaseAuth = auth;
export const firebaseGoogleProvider = googleProvider;
export const getAuthToken = () => currentAuthToken;