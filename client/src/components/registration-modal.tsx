import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Mail, ChevronRight, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { firebaseAuth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type RegistrationPage = "main" | "login" | "forgotPassword";

export function RegistrationModal() {
  const [currentPage, setCurrentPage] = useState<RegistrationPage>("main");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showGoogleAuthInfo, setShowGoogleAuthInfo] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const loginEmailRef = useRef<HTMLInputElement>(null);
  const forgotPasswordEmailRef = useRef<HTMLInputElement>(null);
  
  // Use the auth hook
  const { user, signInWithGoogle, signInWithEmail, registerWithEmail } = useAuth();
  const { closeModal, isOpenedFromProtectedRoute } = useRegistrationModal();
  const { toast } = useToast();

  // If user is already logged in, we'll close the modal
  // but we don't return early to avoid React hooks errors
  useEffect(() => {
    if (user) {
      closeModal();
    }
  }, [user, closeModal]);

  const handleLoginClick = () => {
    setCurrentPage("login");
  };

  const handleGmailClick = () => {
    // Show Google auth info instead of navigating to a new page
    setShowGoogleAuthInfo(true);
  };
  
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      closeModal();
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Sign-in failed",
        description: "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOutlookClick = () => {
    // Outlook registration will be implemented later
    console.log("Outlook registration clicked");
  };

  const handleOtherEmailClick = () => {
    setShowEmailForm(true);
  };
  
  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = regex.test(email);
    setEmailValid(isValid);
    return isValid;
  };
  
  // Focus the appropriate input field when the page changes
  useEffect(() => {
    if (showEmailForm) {
      // Focus the name input field when email form appears
      setTimeout(() => nameInputRef.current?.focus(), 100);
    } else if (currentPage === "login") {
      // Focus the email input field on the login page
      setTimeout(() => loginEmailRef.current?.focus(), 100);
    } else if (currentPage === "forgotPassword") {
      // Focus the email input field on the forgot password page
      setTimeout(() => forgotPasswordEmailRef.current?.focus(), 100);
      // Reset the email sent flag when navigating to this page
      setResetEmailSent(false);
    }
  }, [currentPage, showEmailForm]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const handleForgotPassword = () => {
    setCurrentPage("forgotPassword");
    // Reset email field for a fresh start
    setEmail("");
    setEmailValid(false);
  };

  const handleReturnToMain = () => {
    setCurrentPage("main");
    setShowEmailForm(false);
    setShowGoogleAuthInfo(false);
    // Reset form fields
    setName("");
    setEmail("");
    setPassword("");
    setEmailValid(false);
  };

  const handleForgotPasswordSubmit = async () => {
    if (validateEmail(email)) {
      try {
        // Use Firebase's password reset functionality
        if (!firebaseAuth) {
          throw new Error("Authentication service is not initialized");
        }
        
        await sendPasswordResetEmail(firebaseAuth, email, {
          url: window.location.origin, 
          handleCodeInApp: false
        });
        
        console.log("Password reset email sent to:", email);
        setResetEmailSent(true);
        
        // After 3 seconds, return to login page
        setTimeout(() => {
          setCurrentPage("login");
        }, 3000);
      } catch (error: any) {
        // Handle errors
        console.error("Password reset error:", error);
        toast({
          title: "Password Reset Failed",
          description: error.message || "Please try again later.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async () => {
    // Different validation rules for registration vs login
    if (!validateEmail(email)) return;
    
    // For registration, enforce 8+ character password only if email includes @
    // This allows users to proceed if they haven't reached the password field yet
    if (showEmailForm && email.includes('@') && password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    
    if (showEmailForm) {
      try {
        // Register user with Firebase authentication
        console.log("Attempting registration with:", { email, name });
        
        await registerWithEmail(email, password, name);
        
        console.log("Registration successful with Firebase");
        closeModal();
      } catch (error: any) {
        console.error("Registration error:", error);
        
        // Special handling for operation-not-allowed error
        if (error.code === 'auth/operation-not-allowed') {
          toast({
            title: "Email/Password Sign-up Not Enabled",
            description: "Email/Password authentication needs to be enabled in the Firebase Console.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registration Failed",
            description: error.message || "Please try again.",
            variant: "destructive",
          });
        }
      }
    } else if (currentPage === "login") {
      try {
        // Sign in with Firebase authentication
        console.log("Attempting login with:", { email });
        
        await signInWithEmail(email, password);
        
        console.log("Login successful with Firebase");
        closeModal();
      } catch (error: any) {
        console.error("Login error:", error);
        
        // Special handling for operation-not-allowed error
        if (error.code === 'auth/operation-not-allowed') {
          toast({
            title: "Email/Password Login Not Enabled",
            description: "Email/Password authentication needs to be enabled in the Firebase Console.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: error.message || "Invalid email or password.",
            variant: "destructive",
          });
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {currentPage === "main" && (
        <div className="w-full max-w-md mx-auto relative">
          {/* Login link in upper right corner - only show when not displaying Google auth info */}
          {!showGoogleAuthInfo && (
            <div className="absolute top-0 right-0 mt-6 mr-6 z-10">
              <button 
                onClick={handleLoginClick}
                className="text-sm text-white hover:text-blue-300 transition-colors"
              >
                Login
              </button>
            </div>
          )}
          
          {/* Main content - only show when not displaying Google auth info */}
          <AnimatePresence>
            {!showGoogleAuthInfo && (
              <motion.div 
                key="main-title"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-white mb-12 mt-16"
              >
                <h2 className="text-3xl font-bold mb-3">
                  {isOpenedFromProtectedRoute ? "Sign In Required" : "Join 5Ducks"}
                </h2>
                <p className="text-gray-200 text-lg">
                  {isOpenedFromProtectedRoute 
                    ? "Please sign in to access this feature" 
                    : "Access powerful sales tools and features"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Registration options */}
          <div className="space-y-4 max-w-sm mx-auto px-4">
            <AnimatePresence mode="wait">
              {!showGoogleAuthInfo ? (
                <motion.div 
                  key="registration-options"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <Button 
                    variant="outline"
                    className="group w-full justify-between relative bg-blue-500/20 hover:bg-black/50 text-blue-400 border-2 border-blue-400 hover:border-blue-300 group-hover:text-blue-300 group-hover:font-semibold shadow-sm cursor-pointer"
                    onClick={handleOtherEmailClick}
                  >
                    <div className="flex items-center text-blue-400 group-hover:text-blue-300">
                      <Mail className="h-5 w-5 mr-2 text-blue-400 group-hover:text-blue-300" />
                      Email & Password
                    </div>
                    <ChevronRight className="h-4 w-4 text-blue-400 group-hover:text-blue-300" />
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-between relative bg-white/10 text-white border-white/20 hover:bg-white/20 cursor-pointer"
                    onClick={handleGmailClick}
                  >
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 mr-2" />
                      Register with Gmail
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2 text-white border-white/50">Coming Soon</Badge>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-between relative bg-white/10 text-white border-white/20 hover:bg-white/20 cursor-pointer"
                    onClick={handleOutlookClick}
                  >
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 mr-2" />
                      Register with Outlook
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2 text-white border-white/50">Coming Soon</Badge>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </Button>
                </motion.div>
              ) : (
                <motion.div 
                  key="google-auth-info"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-4 text-white mb-4">
                    <h3 className="font-bold mb-2">Sending Permissions</h3>
                    <p className="text-sm">We help you send a compelling message.<br /><br />Please approve the additional permissions for sending email.</p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-center relative bg-white/10 text-white border-white/20 hover:bg-white/20"
                    onClick={handleGoogleSignIn}
                  >
                    <Mail className="h-5 w-5 mr-2" />
                    Continue with Google
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                  
                  <div className="text-center mt-2">
                    <button 
                      onClick={() => setShowGoogleAuthInfo(false)}
                      className="text-sm text-white hover:text-blue-300 transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to options
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Email registration form - appears when Email & Password is clicked */}
            {showEmailForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 space-y-4"
              >
                <div className="space-y-4">
                  <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="Your Name"
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  
                  <input
                    ref={emailInputRef}
                    type="email"
                    placeholder="Email Address"
                    className={`w-full p-4 bg-white/10 border ${
                      email.length > 0 ? (emailValid ? 'border-green-400' : 'border-red-400') : 'border-white/20'
                    } rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300`}
                    value={email}
                    onChange={handleEmailChange}
                  />
                  
                  {/* Password field only appears after @ is typed in email */}
                  {email.includes('@') && (
                    <div>
                      <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-4 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                    </div>
                  )}
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-center relative bg-white/10 text-white border-white/20 hover:bg-white/20"
                  onClick={handleSubmit}
                  disabled={!emailValid || (email.includes('@') && password.length < 8)}
                >
                  Create Account
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {currentPage === "login" && (
        <div className="w-full max-w-md mx-auto relative">
          {/* Back button in upper left corner */}
          <div className="absolute top-0 left-0 mt-6 ml-6 z-10">
            <button 
              onClick={handleReturnToMain}
              className="text-sm text-white hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          
          {/* Main content */}
          <div className="text-center text-white mb-8 mt-16">
            <h2 className="text-3xl font-bold mb-3">Welcome Back</h2>
            <p className="text-gray-200 text-lg">Log in to your account</p>
          </div>

          {/* Login form */}
          <div className="space-y-4 max-w-sm mx-auto px-4">
            <div className="space-y-4">
              <input
                ref={loginEmailRef}
                type="email"
                placeholder="Email Address"
                className={`w-full p-4 bg-white/10 border ${
                  email.length > 0 ? (emailValid ? 'border-green-400' : 'border-red-400') : 'border-white/20'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300`}
                value={email}
                onChange={handleEmailChange}
              />
              
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full justify-center relative bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={handleSubmit}
              disabled={!emailValid}
            >
              Go
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
            
            <div className="text-center mt-2">
              <button 
                onClick={handleForgotPassword}
                className="text-sm text-white hover:text-blue-300 transition-colors"
              >
                Forgot password
              </button>
            </div>
          </div>
        </div>
      )}

      {currentPage === "forgotPassword" && (
        <div className="w-full max-w-md mx-auto relative">
          {/* Back button in upper left corner */}
          <div className="absolute top-0 left-0 mt-6 ml-6 z-10">
            <button 
              onClick={() => setCurrentPage("login")}
              className="text-sm text-white hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          
          {/* Main content */}
          <div className="text-center text-white mb-8 mt-16">
            <h2 className="text-3xl font-bold mb-3">Reset Password</h2>
            <p className="text-gray-200 text-lg">Enter your email to receive reset instructions</p>
          </div>

          {/* Forgot password form */}
          <div className="space-y-4 max-w-sm mx-auto px-4">
            {resetEmailSent ? (
              <div className="text-center p-4 bg-green-500/20 border border-green-500/30 rounded-md text-white">
                <p>Password reset email sent!</p>
                <p className="text-sm mt-1">Please check your inbox for instructions.</p>
                <p className="text-xs mt-3">Returning to login page in a moment...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  ref={forgotPasswordEmailRef}
                  type="email"
                  placeholder="Email Address"
                  className={`w-full p-4 bg-white/10 border ${
                    email.length > 0 ? (emailValid ? 'border-green-400' : 'border-red-400') : 'border-white/20'
                  } rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300`}
                  value={email}
                  onChange={handleEmailChange}
                />
                
                <Button 
                  variant="outline" 
                  className="w-full justify-center relative bg-white/10 text-white border-white/20 hover:bg-white/20"
                  onClick={handleForgotPasswordSubmit}
                  disabled={!emailValid}
                >
                  Send Reset Email
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}