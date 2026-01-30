import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface InsufficientCreditsContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  triggerInsufficientCredits: () => void;
}

const InsufficientCreditsContext = createContext<InsufficientCreditsContextType | null>(null);

export function InsufficientCreditsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const triggerInsufficientCredits = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <InsufficientCreditsContext.Provider value={{ isOpen, openModal, closeModal, triggerInsufficientCredits }}>
      {children}
    </InsufficientCreditsContext.Provider>
  );
}

export function useInsufficientCredits() {
  const context = useContext(InsufficientCreditsContext);
  if (!context) {
    throw new Error('useInsufficientCredits must be used within an InsufficientCreditsProvider');
  }
  return context;
}
