import type { Contact, Company } from "@shared/schema";

export type DrawerMode = 'compose' | 'campaign';
export type DrawerViewState = 'normal' | 'minimized' | 'expanded';

export interface EmailDrawerProps {
  open: boolean;
  mode: DrawerMode;
  viewState: DrawerViewState;
  selectedContact: Contact | null;
  selectedCompany: Company | null;
  selectedCompanyContacts: Contact[];
  width: number;
  isResizing: boolean;
  currentListId: number | null;
  currentQuery: string;
  emailSubject?: string;
  onClose: () => void;
  onModeChange: (mode: DrawerMode) => void;
  onContactChange: (contact: Contact | null) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onMinimize: () => void;
  onExpand: () => void;
  onRestore: () => void;
}

export interface UseEmailDrawerOptions {
  onOpen?: (contact: Contact, company: Company) => void;
  onClose?: () => void;
}

export interface UseEmailDrawerReturn {
  isOpen: boolean;
  mode: DrawerMode;
  viewState: DrawerViewState;
  selectedContact: Contact | null;
  selectedCompany: Company | null;
  selectedCompanyContacts: Contact[];
  drawerWidth: number;
  isResizing: boolean;
  openDrawer: (contact: Contact, company: Company, companyContacts: Contact[]) => void;
  openCompose: () => void;
  closeDrawer: () => void;
  setMode: (mode: DrawerMode) => void;
  setSelectedContact: (contact: Contact | null) => void;
  setIsResizing: (isResizing: boolean) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  minimize: () => void;
  expand: () => void;
  restore: () => void;
}
