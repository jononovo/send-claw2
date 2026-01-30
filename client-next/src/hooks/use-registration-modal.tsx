import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "./use-auth";

export type RegistrationPage = "main" | "login" | "forgotPassword";

type RegistrationModalContextType = {
  isOpen: boolean;
  initialPage: RegistrationPage;
  openModal: () => void;
  openModalForLogin: () => void;
  closeModal: () => void;
  openForProtectedRoute: () => void;
  isOpenedFromProtectedRoute: boolean;
  setRegistrationSuccessCallback: (callback: (isNewUser?: boolean) => void) => void;
  setIsNewUser: (isNewUser: boolean) => void;
};

const RegistrationModalContext = createContext<RegistrationModalContextType>({
  isOpen: false,
  initialPage: "main",
  openModal: () => {},
  openModalForLogin: () => {},
  closeModal: () => {},
  openForProtectedRoute: () => {},
  isOpenedFromProtectedRoute: false,
  setRegistrationSuccessCallback: () => {},
  setIsNewUser: () => {},
});

export const useRegistrationModal = () => useContext(RegistrationModalContext);

interface RegistrationModalProviderProps {
  children: ReactNode;
}

export const RegistrationModalProvider = ({ children }: RegistrationModalProviderProps) => {
  // Modal should be closed by default
  const [isOpen, setIsOpen] = useState(false);
  const [initialPage, setInitialPage] = useState<RegistrationPage>("main");
  const [isOpenedFromProtectedRoute, setIsOpenedFromProtectedRoute] = useState(false);
  const [onSuccessCallback, setOnSuccessCallback] = useState<((isNewUser?: boolean) => void) | null>(null);
  const [pendingIsNewUser, setPendingIsNewUser] = useState<boolean | null>(null);
  const { user } = useAuth();

  // Clean up obsolete localStorage key from previous first-time visitor logic
  useEffect(() => {
    localStorage.removeItem("hasVisitedBefore");
  }, []);

  const openModal = () => {
    setIsOpenedFromProtectedRoute(false);
    setInitialPage("main");
    setIsOpen(true);
  };

  const openModalForLogin = () => {
    setIsOpenedFromProtectedRoute(false);
    setInitialPage("login");
    setIsOpen(true);
  };

  const openForProtectedRoute = () => {
    setIsOpenedFromProtectedRoute(true);
    setInitialPage("main");
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setIsOpenedFromProtectedRoute(false);
    setInitialPage("main");
  };

  const setRegistrationSuccessCallback = (callback: (isNewUser?: boolean) => void) => {
    setOnSuccessCallback(() => callback);
  };

  const setIsNewUser = (isNewUser: boolean) => {
    setPendingIsNewUser(isNewUser);
  };

  // Trigger callback when user becomes authenticated after registration
  // Wait for pendingIsNewUser to be explicitly set to avoid race condition with Google auth
  useEffect(() => {
    if (user && onSuccessCallback && pendingIsNewUser !== null) {
      onSuccessCallback(pendingIsNewUser);
      setOnSuccessCallback(null);
      setPendingIsNewUser(null);
    }
  }, [user, onSuccessCallback, pendingIsNewUser]);



  return (
    <RegistrationModalContext.Provider 
      value={{ 
        isOpen,
        initialPage,
        openModal,
        openModalForLogin,
        closeModal,
        openForProtectedRoute,
        isOpenedFromProtectedRoute,
        setRegistrationSuccessCallback,
        setIsNewUser
      }}
    >
      {children}
    </RegistrationModalContext.Provider>
  );
};