# Firebase Lazy Loading Implementation Plan

## Why Lazy-Load Firebase?

### The Problem
Firebase SDK (~100-150 KB gzipped) is currently loaded **synchronously on every page load**, even for marketing pages where authentication isn't needed. This means:

- **Landing page visitors** pay the Firebase cost even though they may never log in
- Firebase initialization runs immediately, blocking initial render
- The main JS bundle is larger than necessary (currently 434 KB gzipped)

### The Benefit
By lazy-loading Firebase:
- Marketing pages (/, /landing, /blog, /terms, etc.) load **100+ KB faster**
- Firebase only loads when users interact with authentication
- Returning visitors with cached vendor bundles see even faster loads
- Time-to-interactive improves significantly for first-time visitors

---

## Current State Analysis

### Files That Import Firebase

1. **`client/src/App.tsx`** (line 20 - ALREADY REMOVED)
   ```typescript
   // This was removed:
   // import "@/lib/firebase";
   ```

2. **`client/src/hooks/use-auth.tsx`** (lines 10-21)
   ```typescript
   import { firebaseAuth, firebaseGoogleProvider } from "@/lib/firebase";
   import { 
     signInWithPopup, 
     signOut, 
     signInWithEmailAndPassword,
     createUserWithEmailAndPassword,
     // ... more Firebase auth imports
   } from "firebase/auth";
   ```

3. **`client/src/components/registration-modal.tsx`** (lines 6-7)
   ```typescript
   import { firebaseAuth } from "@/lib/firebase";
   import { sendPasswordResetEmail } from "firebase/auth";
   ```

### Current Firebase Initialization (`client/src/lib/firebase.ts`)
- Validates config at module load time
- Initializes `app`, `auth`, `googleProvider` immediately
- Sets up `onAuthStateChanged` listener immediately
- Exports static references: `firebaseAuth`, `firebaseGoogleProvider`, `getAuthToken`

---

## Implementation Plan

### Step 1: Refactor `client/src/lib/firebase.ts`

Convert from eager initialization to a cached async loader:

```typescript
// client/src/lib/firebase.ts

import type { FirebaseApp } from "firebase/app";
import type { Auth, GoogleAuthProvider } from "firebase/auth";

// Cached instances (filled after first load)
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let googleProvider: GoogleAuthProvider | undefined;
let currentAuthToken: string | null = null;
let initPromise: Promise<FirebaseInstances> | null = null;

export interface FirebaseInstances {
  auth: Auth;
  googleProvider: GoogleAuthProvider;
  getAuthToken: () => string | null;
}

// Validate config (keep existing logic)
function validateFirebaseConfig() {
  // ... existing validation code ...
}

// NEW: Async loader that initializes once and caches
export async function loadFirebase(): Promise<FirebaseInstances> {
  // Return cached promise if already loading/loaded
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    // Dynamic imports - only loads when called
    const { initializeApp } = await import("firebase/app");
    const { 
      getAuth, 
      GoogleAuthProvider, 
      setPersistence, 
      browserLocalPersistence 
    } = await import("firebase/auth");

    const { isValid, errors, config } = validateFirebaseConfig();

    if (!isValid) {
      console.error('Firebase configuration validation failed:', errors);
      throw new Error(`Firebase config invalid: ${errors.join(', ')}`);
    }

    app = initializeApp(config);
    auth = getAuth(app);
    
    await setPersistence(auth, browserLocalPersistence);
    
    googleProvider = new GoogleAuthProvider();

    return {
      auth,
      googleProvider,
      getAuthToken: () => currentAuthToken,
    };
  })();

  return initPromise;
}

// Keep legacy exports for gradual migration (will be undefined until loadFirebase called)
export const firebaseAuth = auth;
export const firebaseGoogleProvider = googleProvider;
export const getAuthToken = () => currentAuthToken;

// NEW: Helper for components that need to update token
export function setAuthToken(token: string | null) {
  currentAuthToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}
```

### Step 2: Update `client/src/hooks/use-auth.tsx`

Modify AuthProvider to load Firebase on mount:

```typescript
// At the top - remove static imports, add type-only imports
import type { Auth, GoogleAuthProvider, User as FirebaseUser } from "firebase/auth";
import { loadFirebase, type FirebaseInstances } from "@/lib/firebase";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // NEW: Firebase instances state
  const [firebase, setFirebase] = useState<FirebaseInstances | null>(null);
  const [firebaseError, setFirebaseError] = useState<Error | null>(null);
  
  // Track Firebase initialization
  const [firebaseReady, setFirebaseReady] = useState(false);

  // ... existing state ...

  // NEW: Load Firebase on mount
  useEffect(() => {
    if (isAITestMode) {
      setFirebaseReady(true);
      setAuthReady(true);
      return;
    }

    loadFirebase()
      .then((fb) => {
        setFirebase(fb);
        setFirebaseReady(true);
        
        // Set up auth state listener HERE (moved from firebase.ts)
        const { onAuthStateChanged } = await import("firebase/auth");
        const unsubscribe = onAuthStateChanged(fb.auth, async (user) => {
          if (user?.email) {
            await syncWithBackend(user);
          } else {
            queryClient.setQueryData(["/api/user"], null);
          }
          setAuthReady(true);
        });
        
        return () => unsubscribe();
      })
      .catch((err) => {
        console.error('Failed to load Firebase:', err);
        setFirebaseError(err);
        setFirebaseReady(true); // Still mark ready so app doesn't hang
        setAuthReady(true);
      });
  }, [isAITestMode]);

  // Update auth functions to use firebase state
  const signInWithEmail = async (email: string, password: string) => {
    if (!firebase) {
      throw new Error("Authentication not ready");
    }
    
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    const result = await signInWithEmailAndPassword(firebase.auth, email, password);
    // ... rest of logic
  };

  // Similar updates for signInWithGoogle, registerWithEmail, logoutMutation
  // ...
}
```

### Step 3: Update `client/src/components/registration-modal.tsx`

Remove direct Firebase imports and use dynamic import for password reset:

```typescript
// REMOVE these imports:
// import { firebaseAuth } from "@/lib/firebase";
// import { sendPasswordResetEmail } from "firebase/auth";

// In the component:
const handleForgotPassword = async () => {
  // Dynamic import only when needed
  const { loadFirebase } = await import("@/lib/firebase");
  const { sendPasswordResetEmail } = await import("firebase/auth");
  
  const { auth } = await loadFirebase();
  await sendPasswordResetEmail(auth, email);
  // ... rest of logic
};
```

---

## Gotchas & Edge Cases

1. **Prevent multiple concurrent imports**: The `initPromise` pattern ensures only one initialization happens even if multiple components call `loadFirebase()` simultaneously.

2. **Handle initialization failures**: Show a toast error but don't crash the app. Marketing pages should still work.

3. **AI Test Mode bypass**: The existing `isAITestMode` logic must continue to work - skip Firebase entirely in test mode.

4. **Guard auth actions**: All `signIn*` and `register*` functions must check `firebase !== null` before proceeding.

5. **Auth state listener cleanup**: The `onAuthStateChanged` listener must be unsubscribed on unmount to prevent memory leaks.

6. **Token persistence**: The auth token storage in localStorage must still work for session persistence across page reloads.

---

## Testing Checklist

After implementation, verify:

- [ ] Landing page (`/`) loads WITHOUT any Firebase network requests in DevTools
- [ ] Blog and marketing pages load without Firebase
- [ ] Google Sign-in works correctly
- [ ] Email/password login works correctly
- [ ] Email/password registration works correctly
- [ ] Password reset email sends correctly
- [ ] Logout clears session properly
- [ ] Auth persists across page refresh (token in localStorage)
- [ ] AI test mode still bypasses Firebase correctly
- [ ] No console errors on any page
- [ ] Run `npx vite-bundle-visualizer` - Firebase should be in a separate chunk

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Landing page JS | ~434 KB | ~300-330 KB |
| Firebase chunk | In main bundle | Separate ~100 KB chunk |
| Time to interactive (landing) | ~2-3s | ~1.5-2s |
| Auth pages | Same | Same (loads Firebase on demand) |
