import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, User, Menu, Target, PanelLeft, LifeBuoy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { CreditUpgradeDropdown } from "@/components/credit-upgrade-dropdown";
import { StreakButton } from "@/components/streak-button";
import { FeedbackDialog } from "@/features/feedback";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  // Navigation items removed - now in hamburger menu
];

export function MainNav() {
  const [location, setLocation] = useLocation();
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  
  // Safe auth hook usage with error handling
  let user = null;
  let logoutMutation = null;
  let openRegistrationModal = null;
  
  try {
    const auth = useAuth();
    user = auth.user;
    logoutMutation = auth.logoutMutation;
    
    // Registration modal for login functionality
    const { openModal } = useRegistrationModal();
    openRegistrationModal = openModal;
  } catch (error) {
    // MainNav is being rendered outside AuthProvider context
    // This is acceptable for public routes - just don't show user menu
  }

  const handleDrawerClick = () => {
    // Trigger the drawer open event on any page
    window.dispatchEvent(new CustomEvent('openSavedSearchesDrawer'));
  };

  return (
    <nav className="flex items-center justify-between mb-2 px-4 py-1.5">
        <div className="flex items-center space-x-2">
          <Logo size="sm" className="mr-2" />
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDrawerClick}
              className="h-8 w-8 hover:bg-accent-hover"
              title="Historic Searches"
              data-testid="button-open-drawer"
            >
              <PanelLeft 
                className="text-muted-foreground" 
                style={{ width: '22px', height: '22px' }}
                strokeWidth={1.5}
              />
            </Button>
          )}
        </div>
      <div className="flex items-center ml-auto gap-3">
        {user ? (
          <>
            <StreakButton />
            <CreditUpgradeDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent-hover">
                  <Menu className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href="/account">
                  <DropdownMenuItem className="text-muted-foreground hover:text-foreground">
                    <User className="h-4 w-4 mr-2" />
                    <span>Account</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/strategy">
                  <DropdownMenuItem className="text-muted-foreground hover:text-foreground">
                    <Target className="h-4 w-4 mr-2" />
                    <span>Strategy</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  onClick={() => setFeedbackDialogOpen(true)}
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                  data-testid="menu-item-support"
                >
                  <LifeBuoy className="h-4 w-4 mr-2" />
                  <span>Support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {logoutMutation && (
                  <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="text-muted-foreground hover:text-foreground">
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Link 
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground font-medium mr-2"
            >
              Pricing
            </Link>
            {openRegistrationModal && (
              <Button 
                variant="outline" 
                onClick={openRegistrationModal}
                className="h-8 px-4 text-sm text-muted-foreground hover:text-foreground"
              >
                Login
              </Button>
            )}
          </>
        )}
      </div>
      
      <FeedbackDialog 
        open={feedbackDialogOpen} 
        onOpenChange={setFeedbackDialogOpen} 
      />
    </nav>
  );
}