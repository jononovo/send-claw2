import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { getQueryFn, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { firebaseAuth, firebaseGoogleProvider } from "@/lib/firebase";
import { 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  type User as FirebaseUser,
  type AuthCredential 
} from "firebase/auth";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  authReady: boolean;
  error: Error | null;
  logoutMutation: UseMutationResult<void, Error, void>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, username?: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Track ongoing sync operations to prevent duplicate user creation
  const syncPromiseRef = useRef<Promise<void> | null>(null);
  
  // Track whether Firebase auth has completed its initial check
  const [authReady, setAuthReady] = useState(false);
  
  // Check test mode status
  const { data: testModeStatus } = useQuery({
    queryKey: ["/api/test-mode-status"],
    queryFn: async () => {
      const res = await fetch("/api/test-mode-status");
      return res.json();
    },
    staleTime: Infinity, // Test mode status doesn't change during runtime
  });
  
  const isAITestMode = testModeStatus?.enabled === true;
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    // In AI test mode, provide a default guest user
    initialData: isAITestMode ? {
      id: 1,
      email: 'demo@5ducks.ai',
      username: 'Guest User',
      createdAt: new Date()
    } as SelectUser : undefined,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // 1. Clear localStorage first (prevent auto-restore)
      localStorage.removeItem('authToken');
      
      // 2. Clear axios headers
      const axios = (await import('axios')).default;
      delete axios.defaults.headers.common['Authorization'];
      
      // 3. Call backend logout (clear server session)
      try {
        await axios.post('/api/logout');
      } catch (error) {
        console.log('Backend logout failed, continuing with Firebase logout');
      }
      
      // 4. Firebase signOut last
      if (firebaseAuth) {
        try {
          await signOut(firebaseAuth);
        } catch (error) {
          console.error("Firebase sign out error:", error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const signInWithEmail = async (email: string, password: string) => {
    try {
      if (!firebaseAuth) {
        console.error('Firebase auth not initialized');
        throw new Error("Authentication service is not properly configured");
      }

      console.log('Starting email sign-in process', {
        email: email.split('@')[0] + '@...',
        timestamp: new Date().toISOString()
      });

      const result = await signInWithEmailAndPassword(firebaseAuth, email, password);

      if (!result.user?.email) {
        throw new Error("No email available after sign-in");
      }

      console.log('Email sign-in successful, syncing with backend');
      await syncWithBackend(result.user);

    } catch (error: any) {
      console.error("Email sign-in error:", {
        error: error.message,
        code: error.code
      });

      // Show user-friendly error messages
      let errorMessage = "Please try again";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Invalid email or password";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please try again later";
      }

      toast({
        title: "Sign-in failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    }
  };

  const registerWithEmail = async (email: string, password: string, username?: string) => {
    try {
      if (!firebaseAuth) {
        console.error('Firebase auth not initialized');
        throw new Error("Authentication service is not properly configured");
      }

      console.log('Starting email registration process', {
        email: email.split('@')[0] + '@...',
        username: username || 'not provided',
        timestamp: new Date().toISOString()
      });

      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);

      if (!result.user?.email) {
        throw new Error("No email available after registration");
      }

      // Set display name if username is provided
      if (username && result.user) {
        await updateProfile(result.user, {
          displayName: username
        });
      }

      console.log('Email registration successful, syncing with backend');
      // Pass the username explicitly since Firebase token won't have displayName yet
      await syncWithBackend(result.user, null, username);

    } catch (error: any) {
      console.error("Email registration error:", {
        error: error.message,
        code: error.code
      });

      // Show user-friendly error messages, but skip toast for email-already-in-use
      // (registration modal will handle this case with auto-login)
      if (error.code !== 'auth/email-already-in-use') {
        let errorMessage = "Please try again";
        if (error.code === 'auth/weak-password') {
          errorMessage = "Password is too weak. Please use a stronger password";
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = "Invalid email address";
        }

        toast({
          title: "Registration failed",
          description: errorMessage,
          variant: "destructive",
        });
      }

      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<{ isNewUser: boolean }> => {
    try {
      console.log('Starting Google sign-in process', {
        environment: import.meta.env.MODE,
        domain: window.location.hostname,
        origin: window.location.origin
      });

      if (!firebaseAuth || !firebaseGoogleProvider) {
        const configError = {
          auth: !!firebaseAuth,
          provider: !!firebaseGoogleProvider,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          environment: import.meta.env.MODE,
          domain: window.location.hostname
        };
        console.error('Firebase auth not initialized:', configError);
        throw new Error("Authentication service is not properly configured");
      }

      // Use 'select_account' for better UX - allows account switching
      // without forcing re-consent every time (Firebase auth uses minimal scopes)
      // Note: This is for Firebase authentication only, not Gmail API permissions
      firebaseGoogleProvider.setCustomParameters({
        prompt: 'select_account'
      });

      console.log('Calling signInWithPopup...');
      const result = await signInWithPopup(firebaseAuth, firebaseGoogleProvider);

      // Check if this is a new user
      const additionalUserInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalUserInfo?.isNewUser ?? false;

      // Get the OAuth credential from the result
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (!result.user?.email) {
        throw new Error("No email provided from Google sign-in");
      }

      console.log('Google sign-in successful, syncing with backend', {
        email: result.user.email.split('@')[0] + '@...',
        displayName: result.user.displayName,
        isNewUser
      });

      // Pass the OAuth credential to syncWithBackend
      await syncWithBackend(result.user, credential);
      
      return { isNewUser };

    } catch (error: any) {
      console.error("Google sign-in error:", {
        error: error.message,
        code: error.code,
        domain: window.location.hostname,
        environment: import.meta.env.MODE
      });

      // Show a more user-friendly error message
      toast({
        title: "Google Sign-in failed",
        description: error.code === 'auth/popup-blocked'
          ? "Please allow popups for this site and try again"
          : "Please try again or use email/password login",
        variant: "destructive",
      });

      throw error;
    }
  };

  // Safely parse JSON with better error handling
  async function safeJsonParse(res: Response): Promise<any> {
    try {
      return await res.json();
    } catch (error) {
      console.error('JSON parsing error:', {
        status: res.status,
        statusText: res.statusText,
        url: res.url,
        error
      });
      
      // Get the text content for debugging
      try {
        const text = await res.clone().text();
        console.error('Response that failed to parse:', {
          text: text.substring(0, 500), // Log only first 500 chars to avoid huge logs
          contentType: res.headers.get('content-type')
        });
      } catch (textError) {
        console.error('Could not get response text after JSON parse error:', textError);
      }
      
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
    }
  }

  // Function to get Firebase ID token and sync with backend
  const syncWithBackend = async (firebaseUser: FirebaseUser, credential?: AuthCredential | null, explicitUsername?: string) => {
    // Prevent duplicate sync calls that cause duplicate user creation
    // This happens when both onAuthStateChanged and signInWithGoogle call syncWithBackend simultaneously
    if (syncPromiseRef.current) {
      console.log('Sync already in progress, waiting for it to complete');
      return syncPromiseRef.current;
    }
    
    // Create the sync promise and store it
    syncPromiseRef.current = (async () => {
      try {
        // Get the ID token for authentication
        const idToken = await firebaseUser.getIdToken(true);

        // Check for selected plan from pricing page
        const selectedPlan = localStorage.getItem('selectedPlan');
        const planSource = localStorage.getItem('planSource');
        const joinWaitlist = localStorage.getItem('joinWaitlist');
        const accessCode = localStorage.getItem('accessCode');
        
        // Use explicit username if provided (for fresh registrations where Firebase token doesn't have displayName yet)
        // Fall back to Firebase displayName, then email prefix
        const usernameToSync = explicitUsername || firebaseUser.displayName || firebaseUser.email?.split('@')[0];

        console.log('Making backend sync request', {
          endpoint: '/api/google-auth',
          domain: window.location.hostname,
          username: usernameToSync,
          selectedPlan,
          planSource,
          joinWaitlist,
          accessCode
        });

        const createRes = await fetch("/api/google-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          credentials: 'include', // Essential for session cookies to be set/received
          body: JSON.stringify({
            email: firebaseUser.email,
            username: usernameToSync,
            firebaseUid: firebaseUser.uid,
            selectedPlan,
            planSource,
            joinWaitlist: joinWaitlist === 'true',
            accessCode
          })
        });

        if (!createRes.ok) {
          let errorText;
          try {
            errorText = await createRes.text();
          } catch (textError) {
            errorText = 'Could not read error response';
          }
          
          console.error('Backend sync error response:', {
            status: createRes.status,
            statusText: createRes.statusText,
            responseText: errorText
          });
          throw new Error(`Failed to sync with backend: ${createRes.status}`);
        }

        console.log('Successfully synced with backend');
        
        try {
          const user = await safeJsonParse(createRes);
          queryClient.setQueryData(["/api/user"], user);
          
          // Clean up localStorage after successful sync
          if (selectedPlan) {
            localStorage.removeItem('selectedPlan');
            localStorage.removeItem('planSource');
            localStorage.removeItem('joinWaitlist');
            console.log('Cleaned up plan selection from localStorage');
          }
          if (accessCode) {
            localStorage.removeItem('accessCode');
            console.log('Cleaned up access code from localStorage');
          }
        } catch (parseError) {
          console.error('Error parsing user data from sync response:', parseError);
          throw new Error('Failed to parse user data from backend response');
        }

      } catch (error) {
        console.error("Error syncing with backend:", {
          error,
          domain: window.location.hostname,
          environment: import.meta.env.MODE
        });
        throw error;
      } finally {
        // Clear the promise ref when sync completes (success or failure)
        syncPromiseRef.current = null;
      }
    })();
    
    return syncPromiseRef.current;
  };

  // Monitor Firebase auth state
  useEffect(() => {
    // Skip Firebase auth monitoring in AI test mode
    if (isAITestMode) {
      console.log('AI Test Mode enabled - skipping Firebase auth monitoring');
      setAuthReady(true);
      return;
    }

    console.log('Setting up Firebase auth state listener');

    if (!firebaseAuth) {
      console.warn('Firebase Auth not initialized in useEffect');
      setAuthReady(true);
      return;
    }

    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      console.log('Firebase auth state changed:', firebaseUser?.email);

      if (firebaseUser?.email) {
        try {
          await syncWithBackend(firebaseUser);
        } catch (error) {
          console.error('Error during auth state sync:', error);
          queryClient.setQueryData(["/api/user"], null);
        }
      } else {
        queryClient.setQueryData(["/api/user"], null);
      }
      
      // Mark auth as ready after first auth state check completes
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [isAITestMode]);

  // In AI test mode, always return the guest user
  const finalUser = isAITestMode ? {
    id: 1,
    email: 'guest@5ducks.ai',
    username: 'Guest User',
    password: '',
    createdAt: new Date(),
    isGuest: false
  } as SelectUser : (user ?? null);

  return (
    <AuthContext.Provider
      value={{
        user: finalUser,
        isLoading: isLoading && !isAITestMode, // Never loading in test mode
        authReady: isAITestMode ? true : authReady, // Always ready in test mode
        error: isAITestMode ? null : error, // No errors in test mode
        logoutMutation,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}