import { useEffect, useState } from "react";
'use client';

import { usePathname, useRouter } from "next/navigation";
import { loadFirebase, setAuthToken } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { sendAttributionToServer, logConversionEvent } from "@/features/attribution";
import { queryClient } from "@/lib/queryClient";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setNeedsPasswordSetup } from "@/features/top-nav-bar-ad-message";

type AuthStatus = "loading" | "success" | "error" | "set-password";

export default function AuthCompletePage() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    handleEmailLinkSignIn();
  }, []);

  const handleEmailLinkSignIn = async () => {
    try {
      const { auth } = await loadFirebase();
      const { isSignInWithEmailLink, signInWithEmailLink, checkActionCode } = await import("firebase/auth");

      // Check if the URL is a sign-in with email link
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setStatus("error");
        setErrorMessage("Invalid or expired link. Please request a new one.");
        return;
      }

      // Extract oobCode from URL to get email directly from Firebase
      const url = new URL(window.location.href);
      const oobCode = url.searchParams.get('oobCode');
      
      let email: string | null = null;
      let usedFallback = false;
      
      // Primary method: Extract email from the action code (works cross-device)
      if (oobCode) {
        try {
          const actionInfo = await checkActionCode(auth, oobCode);
          // Verify this is an email sign-in action
          if (actionInfo.operation === 'EMAIL_SIGNIN' && actionInfo.data.email) {
            email = actionInfo.data.email;
            console.log("Email extracted from magic link via checkActionCode");
          }
        } catch (checkError: any) {
          console.warn("checkActionCode failed, will try localStorage fallback:", checkError?.code || checkError);
        }
      }
      
      // Fallback: Check localStorage (same-device scenario)
      if (!email) {
        email = localStorage.getItem('emailForSignIn');
        if (email) {
          console.log("Using localStorage fallback for email retrieval");
          usedFallback = true;
        }
      }
      
      // If we still don't have an email, we can't proceed
      if (!email) {
        setStatus("error");
        setErrorMessage("We couldn't verify your email. If you opened this link on a different device, please try again from the original device or request a new link.");
        return;
      }

      // Get name from localStorage if available (for profile setup)
      const name = localStorage.getItem('nameForSignIn');

      // Complete the sign-in
      const result = await signInWithEmailLink(auth, email, window.location.href);
      
      // Reload user to ensure emailVerified status is fresh
      await result.user.reload();
      
      // Clear localStorage
      localStorage.removeItem('emailForSignIn');
      localStorage.removeItem('nameForSignIn');

      if (result.user) {
        // Update the user's display name FIRST
        if (name) {
          const { updateProfile } = await import("firebase/auth");
          await updateProfile(result.user, { displayName: name });
        }

        // Get fresh token after profile update
        const token = await result.user.getIdToken(true);
        setAuthToken(token);
        
        // Explicitly sync with backend to ensure user is created with correct name
        // The /api/google-auth endpoint handles all Firebase auth methods
        const response = await fetch('/api/google-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({
            email: result.user.email,
            username: name || result.user.displayName || result.user.email?.split('@')[0],
            firebaseUid: result.user.uid
          })
        });

        if (response.ok) {
          // Update the query cache so auth context picks up the user
          const userData = await response.json();
          queryClient.setQueryData(["/api/user"], userData);
        }

        // Track registration
        window.dataLayer?.push({ event: 'registration_complete' });
        sendAttributionToServer().catch(() => {});
        logConversionEvent('registration_complete').catch(() => {});
        
        // Move to password step
        setStatus("set-password");
      }
      
    } catch (error: any) {
      console.error("Email link sign-in error:", error);
      setStatus("error");
      
      if (error.code === 'auth/invalid-action-code') {
        setErrorMessage("This link has expired or already been used. Please request a new one.");
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage("The email address is invalid.");
      } else {
        setErrorMessage(error.message || "Failed to complete sign-in. Please try again.");
      }
    }
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }

    setIsSettingPassword(true);

    try {
      const { auth } = await loadFirebase();
      const { updatePassword } = await import("firebase/auth");
      
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setNeedsPasswordSetup(false);
        toast({
          title: "Password Set!",
          description: "You can now log in with your email and password",
        });
      }
      
      setStatus("success");
      
      // Redirect to app after a moment
      setTimeout(() => {
        router.push('/app');
      }, 2000);
      
    } catch (error: any) {
      console.error("Set password error:", error);
      toast({
        title: "Failed to Set Password",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
      // Still allow them to continue without password
      setStatus("success");
      setTimeout(() => {
        router.push('/app');
      }, 2000);
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleSkipPassword = () => {
    setNeedsPasswordSetup(true);
    setStatus("success");
    setTimeout(() => {
      router.push('/app');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="bg-black/50 border border-white/10 rounded-xl p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Verifying...</h1>
            <p className="text-gray-400">Please wait while we complete your sign-in</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">You're In!</h1>
            <p className="text-gray-400 mb-4">Redirecting you to the app...</p>
            <Loader2 className="h-6 w-6 text-blue-400 animate-spin mx-auto" />
          </>
        )}

        {status === "set-password" && (
          <>
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome!</h1>
            <p className="text-gray-400 mb-6">Would you like to set a password for faster logins?</p>
            
            <div className="space-y-4 text-left">
              <input
                type="password"
                placeholder="New Password (min 8 characters)"
                className="w-full p-4 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              
              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full p-4 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSetPassword();
                  }
                }}
              />
              
              <Button 
                className="w-full bg-gradient-to-r from-blue-800 via-indigo-800 to-purple-800 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white border-0"
                onClick={handleSetPassword}
                disabled={isSettingPassword}
              >
                {isSettingPassword ? "Setting Password..." : "Set Password"}
              </Button>
              
              <button 
                onClick={handleSkipPassword}
                className="w-full text-white/80 hover:text-white text-base font-medium transition-colors py-3 border border-white/20 rounded-md hover:border-white/40 hover:bg-white/5"
              >
                Skip for now - I'll use magic links
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something Went Wrong</h1>
            <p className="text-gray-400 mb-6">{errorMessage}</p>
            
            <Button 
              className="w-full bg-gradient-to-r from-blue-800 via-indigo-800 to-purple-800 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white border-0"
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
