import { useState, useEffect, useCallback } from 'react';
import type { Contact, Company } from '@shared/schema';
import type { DrawerMode, DrawerViewState, UseEmailDrawerOptions, UseEmailDrawerReturn } from './types';
import { getEmailComposerDrawerState, setDrawerOpenState } from '@/hooks/use-email-composer-persistence';

export function useEmailDrawer(options: UseEmailDrawerOptions = {}): UseEmailDrawerReturn {
  const savedDrawerState = getEmailComposerDrawerState();
  const [isOpen, setIsOpen] = useState(savedDrawerState.isOpen || false);
  const [mode, setMode] = useState<DrawerMode>(savedDrawerState.drawerMode || 'compose');
  const [viewState, setViewState] = useState<DrawerViewState>('normal');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedCompanyContacts, setSelectedCompanyContacts] = useState<Contact[]>([]);
  const [drawerWidth, setDrawerWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const constrainedWidth = Math.max(320, Math.min(720, newWidth));
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

  const openDrawer = useCallback((contact: Contact, company: Company, companyContacts: Contact[]) => {
    setSelectedContact(contact);
    setSelectedCompany(company);
    setSelectedCompanyContacts(companyContacts);
    setIsOpen(true);
    setViewState('normal');
    options.onOpen?.(contact, company);
  }, [options]);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setDrawerOpenState(false);
    setMode('compose');
    setViewState('normal');
    setSelectedContact(null);
    setSelectedCompany(null);
    setSelectedCompanyContacts([]);
    options.onClose?.();
  }, [options]);

  const openCompose = useCallback(() => {
    setMode('compose');
    setSelectedContact(null);
    setSelectedCompany(null);
    setSelectedCompanyContacts([]);
    setIsOpen(true);
    setViewState('normal');
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const minimize = useCallback(() => {
    setViewState('minimized');
  }, []);

  const expand = useCallback(() => {
    setViewState('expanded');
  }, []);

  const restore = useCallback(() => {
    setViewState('normal');
  }, []);

  return {
    isOpen,
    mode,
    viewState,
    selectedContact,
    selectedCompany,
    selectedCompanyContacts,
    drawerWidth,
    isResizing,
    openDrawer,
    openCompose,
    closeDrawer,
    setMode,
    setSelectedContact,
    setIsResizing,
    handleMouseDown,
    minimize,
    expand,
    restore,
  };
}
