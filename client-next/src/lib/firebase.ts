import type { FirebaseApp } from "firebase/app";
import type { Auth, GoogleAuthProvider } from "firebase/auth";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let googleProvider: GoogleAuthProvider | undefined;
let currentAuthToken: string | null = null;
let initPromise: Promise<FirebaseInstances> | null = null;

export interface FirebaseInstances {
  app: FirebaseApp;
  auth: Auth;
  googleProvider: GoogleAuthProvider;
  getAuthToken: () => string | null;
}

function validateFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  const errors: string[] = [];

  if (!apiKey) {
    errors.push('NEXT_PUBLIC_FIREBASE_API_KEY is missing');
  } else if (!apiKey.startsWith('AIza')) {
    errors.push('NEXT_PUBLIC_FIREBASE_API_KEY appears to be malformed (should start with "AIza")');
  }

  if (!projectId) {
    errors.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing');
  }

  if (!appId) {
    errors.push('NEXT_PUBLIC_FIREBASE_APP_ID is missing');
  } else if (!appId.includes(':')) {
    errors.push('NEXT_PUBLIC_FIREBASE_APP_ID appears to be malformed (should contain ":")');
  }

  const config = {
    apiKey,
    authDomain: 'auth.5ducks.ai',
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    messagingSenderId: projectId?.split('-')[1] || '',
    appId
  };

  return {
    isValid: errors.length === 0,
    errors,
    config
  };
}

export async function loadFirebase(): Promise<FirebaseInstances> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const { initializeApp } = await import("firebase/app");
    const { 
      getAuth, 
      GoogleAuthProvider, 
      setPersistence, 
      browserLocalPersistence 
    } = await import("firebase/auth");

    const { isValid, errors, config } = validateFirebaseConfig();

    if (!isValid) {
      console.error('Firebase configuration validation failed:', {
        errors,
        environment: process.env.NODE_ENV,
        domain: typeof window !== 'undefined' ? window.location.hostname : 'server'
      });
      throw new Error(`Firebase configuration validation failed:\n${errors.join('\n')}`);
    }

    app = initializeApp(config);
    auth = getAuth(app);
    
    await setPersistence(auth, browserLocalPersistence);
    
    googleProvider = new GoogleAuthProvider();

    return {
      app,
      auth,
      googleProvider,
      getAuthToken: () => currentAuthToken,
    };
  })();

  return initPromise;
}

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }
}
