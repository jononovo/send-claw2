import { createContext, useContext, useState, ReactNode } from 'react';
import { StrategyOverlay } from '../components/StrategyOverlay';
import type { OverlayState } from '../types';

interface StrategyOverlayContextType {
  state: OverlayState;
  showOverlay: (state: OverlayState) => void;
  hideOverlay: () => void;
  setState: (state: OverlayState) => void;
}

const StrategyOverlayContext = createContext<StrategyOverlayContextType | undefined>(undefined);

export function StrategyOverlayProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OverlayState>('hidden');

  const showOverlay = (newState: OverlayState) => {
    setState(newState);
  };

  const hideOverlay = () => {
    setState('hidden');
  };

  return (
    <StrategyOverlayContext.Provider value={{
      state,
      showOverlay,
      hideOverlay,
      setState
    }}>
      {children}
      {/* Render the overlay here so it's always available */}
      <StrategyOverlay 
        state={state} 
        onStateChange={setState} 
      />
    </StrategyOverlayContext.Provider>
  );
}

export function useStrategyOverlay() {
  const context = useContext(StrategyOverlayContext);
  if (context === undefined) {
    throw new Error('useStrategyOverlay must be used within a StrategyOverlayProvider');
  }
  return context;
}