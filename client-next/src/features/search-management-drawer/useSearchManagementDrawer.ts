import { useState, useEffect, useCallback } from 'react';

export interface UseSearchManagementDrawerOptions {
  onOpen?: () => void;
  onClose?: () => void;
}

export interface UseSearchManagementDrawerReturn {
  isOpen: boolean;
  drawerWidth: number;
  isResizing: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  setIsResizing: (isResizing: boolean) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
}

export function useSearchManagementDrawer(options: UseSearchManagementDrawerOptions = {}): UseSearchManagementDrawerReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(480); // Match EmailDrawer's default width
  const [isResizing, setIsResizing] = useState(false);

  // Handle resize logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const constrainedWidth = Math.max(400, Math.min(720, newWidth));
      setDrawerWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    options.onOpen?.();
  }, [options]);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    options.onClose?.();
  }, [options]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  return {
    isOpen,
    drawerWidth,
    isResizing,
    openDrawer,
    closeDrawer,
    setIsResizing,
    handleMouseDown,
  };
}