import { useState, useEffect } from "react";
import { X, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadFirebase } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { setNeedsPasswordSetup } from "./context";

export function PasswordSetupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(false);
    };

    window.addEventListener("openPasswordSetupModal", handleOpen);
    return () => window.removeEventListener("openPasswordSetupModal", handleOpen);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async () => {
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

    setIsSubmitting(true);

    try {
      const { auth } = await loadFirebase();
      const { updatePassword } = await import("firebase/auth");

      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setNeedsPasswordSetup(false);
        setSuccess(true);
        
        toast({
          title: "Password Set!",
          description: "You can now log in with your email and password",
        });

        setTimeout(() => {
          setIsOpen(false);
          window.location.reload();
        }, 1500);
      } else {
        toast({
          title: "Not Signed In",
          description: "Please sign in to set your password",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Set password error:", error);
      
      if (error.code === "auth/requires-recent-login") {
        toast({
          title: "Session Expired",
          description: "For security, please sign out and sign in again to set your password",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to Set Password",
          description: error.message || "Please try again later",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative z-10 bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Password Set!</h2>
            <p className="text-gray-400">You can now log in with your email and password</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Set Your Password</h2>
                <p className="text-sm text-gray-400">Secure your account for faster logins</p>
              </div>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                placeholder="New Password (min 8 characters)"
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary/50 transition-colors"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
              />

              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary/50 transition-colors"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />

              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 h-12"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Setting Password..." : "Set Password & Unlock Credits"}
              </Button>

              <button
                onClick={handleClose}
                className="w-full text-gray-400 hover:text-white text-sm transition-colors py-2"
              >
                Maybe later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
