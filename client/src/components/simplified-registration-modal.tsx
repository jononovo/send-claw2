import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { ArrowLeft, X, CheckCircle } from "lucide-react";
import { loadFirebase } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { sendAttributionToServer, logConversionEvent } from "@/features/attribution";

type SimplifiedRegistrationPage = "email" | "checkEmail" | "login";

export function SimplifiedRegistrationModal() {
  const { isOpen, closeModal: onClose, initialPage } = useRegistrationModal();
  const [currentPage, setCurrentPage] = useState<SimplifiedRegistrationPage>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const loginEmailRef = useRef<HTMLInputElement>(null);
  
  const { user, signInWithGoogle, signInWithEmail } = useAuth();
  const { toast } = useToast();

  // Close modal when user is authenticated
  useEffect(() => {
    if (user && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);
  
  // Set initial page based on initialPage from hook
  useEffect(() => {
    if (isOpen) {
      if (initialPage === "login") {
        setCurrentPage("login");
      } else {
        setCurrentPage("email");
      }
    }
  }, [isOpen, initialPage]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Focus appropriate input when page changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (currentPage === "email") {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    } else if (currentPage === "login") {
      setTimeout(() => loginEmailRef.current?.focus(), 100);
    }
  }, [currentPage, isOpen]);

  // Focus name field when email becomes valid
  useEffect(() => {
    if (emailValid && currentPage === "email") {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [emailValid, currentPage]);

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = regex.test(email);
    setEmailValid(isValid);
    return isValid;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const handleGoogleSignIn = async () => {
    try {
      const { isNewUser } = await signInWithGoogle();
      
      if (isNewUser) {
        window.dataLayer?.push({ event: 'registration_complete' });
        sendAttributionToServer().catch(() => {});
        logConversionEvent('registration_complete').catch(() => {});
      }
      
      onClose();
    } catch (error) {
      console.error("Google sign-in failed:", error);
    }
  };

  const handleSendEmailLink = async () => {
    if (!validateEmail(email) || !name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your email and name",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    
    try {
      const { auth } = await loadFirebase();
      const { sendSignInLinkToEmail } = await import("firebase/auth");
      
      // Store email and name in localStorage for when they click the link
      localStorage.setItem('emailForSignIn', email);
      localStorage.setItem('nameForSignIn', name);
      
      // Configure the action code settings
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/complete`,
        handleCodeInApp: true,
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Track the registration attempt
      window.dataLayer?.push({ event: 'registration_email_sent' });
      
      setCurrentPage("checkEmail");
    } catch (error: any) {
      console.error("Email link error:", error);
      
      if (error.code === 'auth/invalid-email') {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to Send Email",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleLoginSubmit = async () => {
    if (!validateEmail(email) || !password) {
      return;
    }

    try {
      await signInWithEmail(email, password);
      onClose();
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
    }
  };

  const handleReturnToEmail = () => {
    setCurrentPage("email");
    setPassword("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
      {/* Close button */}
      <div className="absolute top-6 right-6 z-10">
        <button 
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
          aria-label="Close modal"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <div className="w-full max-w-full sm:max-w-md mx-auto relative">
        <div className="p-8">
          {currentPage === "email" && (
            <div className="w-full max-w-md mx-auto">
              <div className="text-center text-white mb-8">
                <h2 className="text-3xl font-bold mb-3">Sign up</h2>
              </div>

              <div className="space-y-4 max-w-sm mx-auto px-2 sm:px-4">
                <div className="space-y-4">
                  <input
                    ref={emailInputRef}
                    type="email"
                    placeholder="Email"
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300"
                    value={email}
                    onChange={handleEmailChange}
                  />
                  
                  {/* Name field appears after email is valid */}
                  {emailValid && (
                    <input
                      ref={nameInputRef}
                      type="text"
                      placeholder="Full Name"
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSendEmailLink();
                        }
                      }}
                    />
                  )}
                  
                  <Button 
                    variant="outline" 
                    className={`w-full justify-center transition-all duration-300 ${
                      emailValid && name.trim()
                        ? 'bg-gradient-to-r from-blue-800 via-indigo-800 to-purple-800 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white hover:text-white border-0 shadow-lg'
                        : 'bg-transparent hover:bg-white/10 text-white border border-white/30 hover:border-white/50'
                    }`}
                    onClick={handleSendEmailLink}
                    disabled={!emailValid || !name.trim() || isSending}
                  >
                    {isSending ? (
                      <span>Sending...</span>
                    ) : (
                      <span className="font-semibold">GO →</span>
                    )}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-black/70 text-gray-400">OR</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full justify-center relative bg-white hover:bg-gray-100 text-gray-700 border border-gray-300"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                <div className="text-center mt-6 pt-5">
                  <p className="text-gray-400 text-sm">
                    Already have an account?{" "}
                    <button 
                      onClick={() => setCurrentPage("login")}
                      className="text-blue-300 hover:text-blue-200 transition-colors font-medium"
                    >
                      Login
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentPage === "checkEmail" && (
            <div className="w-full max-w-md mx-auto">
              <div className="text-center text-white mb-8">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold mb-3">Check Your Email</h2>
                <p className="text-gray-200 text-lg">
                  We sent a magic link to<br />
                  <span className="text-white font-medium">{email}</span>
                </p>
              </div>

              <div className="space-y-4 max-w-sm mx-auto px-2 sm:px-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                  <p className="text-gray-300 text-sm">
                    Click the link in your email to sign in instantly. No password required!
                  </p>
                </div>

                <div className="text-center pt-4">
                  <button 
                    onClick={() => {
                      setCurrentPage("email");
                      setEmail("");
                      setName("");
                      setEmailValid(false);
                    }}
                    className="text-sm text-blue-300 hover:text-blue-200 transition-colors"
                  >
                    Use a different email
                  </button>
                </div>

                <div className="relative pt-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-black/70 text-gray-400">OR</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full justify-center relative bg-white hover:bg-gray-100 text-gray-700 border border-gray-300"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google instead
                </Button>
              </div>
            </div>
          )}

          {currentPage === "login" && (
            <div className="w-full max-w-md mx-auto">
              <div className="flex justify-start mb-4 sm:mb-6 px-2 sm:px-4">
                <button 
                  onClick={handleReturnToEmail}
                  className="text-sm text-white hover:text-blue-300 transition-colors flex items-center gap-1 p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              </div>
              
              <div className="text-center text-white mb-8">
                <h2 className="text-3xl font-bold mb-3">Welcome Back</h2>
                <p className="text-gray-200 text-lg">Log in to your account</p>
              </div>

              <div className="space-y-4 max-w-sm mx-auto px-2 sm:px-4">
                <div className="space-y-4">
                  <input
                    ref={loginEmailRef}
                    type="email"
                    placeholder="Email"
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300"
                    value={email}
                    onChange={handleEmailChange}
                  />
                  
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLoginSubmit();
                      }
                    }}
                  />
                  
                  <Button 
                    variant="outline" 
                    className={`w-full justify-center transition-all duration-300 ${
                      emailValid && password.length > 0
                        ? 'bg-gradient-to-r from-blue-800 via-indigo-800 to-purple-800 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white hover:text-white border-0 shadow-lg'
                        : 'bg-transparent hover:bg-white/10 text-white border border-white/30 hover:border-white/50'
                    }`}
                    onClick={handleLoginSubmit}
                    disabled={!emailValid || password.length === 0}
                  >
                    Sign In
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-black/70 text-gray-400">OR</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full justify-center relative bg-white hover:bg-gray-100 text-gray-700 border border-gray-300"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
