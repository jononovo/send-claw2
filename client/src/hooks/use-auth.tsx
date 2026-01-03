import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { getQueryFn, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { loadFirebase, setAuthToken, type FirebaseInstances } from "@/lib/firebase";
import type { User as FirebaseUser, AuthCredential } from "firebase/auth";

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
  
  const syncPromiseRef = useRef<Promise<void> | null>(null);
  
  const [authReady, setAuthReady] = useState(false);
  const [firebase, setFirebase] = useState<FirebaseInstances | null>(null);
  
  const { data: testModeStatus } = useQuery({
    queryKey: ["/api/test-mode-status"],
    queryFn: async () => {
      const res = await fetch("/api/test-mode-status");
      return res.json();
    },
    staleTime: Infinity,
  });
  
  const isAITestMode = testModeStatus?.enabled === true;
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    initialData: isAITestMode ? {
      id: 1,
      email: 'demo@5ducks.ai',
      username: 'Guest User',
      createdAt: new Date()
    } as SelectUser : undefined,
  });

  const safeJsonParse = async (res: Response): Promise<any> => {
    try {
      return await res.json();
    } catch (error) {
      console.error('JSON parsing error:', {
        status: res.status,
        statusText: res.statusText,
        url: res.url,
        error
      });
      
      try {
        const text = await res.clone().text();
        console.error('Response that failed to parse:', {
          text: text.substring(0, 500),
          contentType: res.headers.get('content-type')
        });
      } catch (textError) {
        console.error('Could not get response text after JSON parse error:', textError);
      }
      
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
    }
  };

  const syncWithBackend = async (firebaseUser: FirebaseUser, credential?: AuthCredential | null, explicitUsername?: string) => {
    if (syncPromiseRef.current) {
      console.log('Sync already in progress, waiting for it to complete');
      return syncPromiseRef.current;
    }
    
    syncPromiseRef.current = (async () => {
      try {
        const idToken = await firebaseUser.getIdToken(true);
        
        setAuthToken(idToken);
        const axios = (await import('axios')).default;
        axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;

        const selectedPlan = localStorage.getItem('selectedPlan');
        const planSource = localStorage.getItem('planSource');
        const joinWaitlist = localStorage.getItem('joinWaitlist');
        const accessCode = localStorage.getItem('accessCode');
        
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
          credentials: 'include',
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
        syncPromiseRef.current = null;
      }
    })();
    
    return syncPromiseRef.current;
  };

  useEffect(() => {
    // Wait until test mode status is resolved before deciding
    if (testModeStatus === undefined) {
      return;
    }
    
    if (isAITestMode) {
      console.log('AI Test Mode enabled - skipping Firebase initialization');
      setAuthReady(true);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    loadFirebase()
      .then(async (fb) => {
        setFirebase(fb);
        
        const { onAuthStateChanged } = await import("firebase/auth");
        
        unsubscribe = onAuthStateChanged(fb.auth, async (firebaseUser) => {
          console.log('Firebase auth state changed:', firebaseUser?.email);

          if (firebaseUser?.email) {
            try {
              const token = await firebaseUser.getIdToken(true);
              setAuthToken(token);
              
              const axios = (await import('axios')).default;
              axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
              
              await syncWithBackend(firebaseUser);
            } catch (error) {
              console.error('Error during auth state sync:', error);
              queryClient.setQueryData(["/api/user"], null);
            }
          } else {
            const existingToken = localStorage.getItem('authToken');
            if (!existingToken) {
              setAuthToken(null);
              const axios = (await import('axios')).default;
              delete axios.defaults.headers.common['Authorization'];
            }
            queryClient.setQueryData(["/api/user"], null);
          }
          
          setAuthReady(true);
        });
      })
      .catch((err) => {
        console.error('Failed to load Firebase:', err);
        setAuthReady(true);
      });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [testModeStatus, isAITestMode]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('authToken');
      
      const axios = (await import('axios')).default;
      delete axios.defaults.headers.common['Authorization'];
      
      try {
        await axios.post('/api/logout');
      } catch (error) {
        console.log('Backend logout failed, continuing with Firebase logout');
      }
      
      if (firebase?.auth) {
        try {
          const { signOut } = await import("firebase/auth");
          await signOut(firebase.auth);
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
      if (!firebase) {
        console.error('Firebase not initialized');
        throw new Error("Authentication service is not ready. Please try again.");
      }

      console.log('Starting email sign-in process', {
        email: email.split('@')[0] + '@...',
        timestamp: new Date().toISOString()
      });

      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const result = await signInWithEmailAndPassword(firebase.auth, email, password);

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
      if (!firebase) {
        console.error('Firebase not initialized');
        throw new Error("Authentication service is not ready. Please try again.");
      }

      console.log('Starting email registration process', {
        email: email.split('@')[0] + '@...',
        username: username || 'not provided',
        timestamp: new Date().toISOString()
      });

      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      const result = await createUserWithEmailAndPassword(firebase.auth, email, password);

      if (!result.user?.email) {
        throw new Error("No email available after registration");
      }

      if (username && result.user) {
        await updateProfile(result.user, {
          displayName: username
        });
      }

      console.log('Email registration successful, syncing with backend');
      await syncWithBackend(result.user, null, username);

    } catch (error: any) {
      console.error("Email registration error:", {
        error: error.message,
        code: error.code
      });

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

      if (!firebase) {
        const configError = {
          firebase: !!firebase,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          environment: import.meta.env.MODE,
          domain: window.location.hostname
        };
        console.error('Firebase not initialized:', configError);
        throw new Error("Authentication service is not ready. Please try again.");
      }

      firebase.googleProvider.setCustomParameters({
        prompt: 'select_account'
      });

      console.log('Calling signInWithPopup...');
      const { signInWithPopup, getAdditionalUserInfo, GoogleAuthProvider } = await import("firebase/auth");
      const result = await signInWithPopup(firebase.auth, firebase.googleProvider);

      const additionalUserInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalUserInfo?.isNewUser ?? false;

      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (!result.user?.email) {
        throw new Error("No email provided from Google sign-in");
      }

      console.log('Google sign-in successful, syncing with backend', {
        email: result.user.email.split('@')[0] + '@...',
        displayName: result.user.displayName,
        isNewUser
      });

      await syncWithBackend(result.user, credential);
      
      return { isNewUser };

    } catch (error: any) {
      console.error("Google sign-in error:", {
        error: error.message,
        code: error.code,
        domain: window.location.hostname,
        environment: import.meta.env.MODE
      });

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
        isLoading: isLoading && !isAITestMode,
        authReady: isAITestMode ? true : authReady,
        error: isAITestMode ? null : error,
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
