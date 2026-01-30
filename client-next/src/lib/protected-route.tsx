import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { Loader2 } from "lucide-react";
import { Route } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const { openForProtectedRoute } = useRegistrationModal();

  // Show modal when user tries to access protected route
  useEffect(() => {
    if (!isLoading && !user) {
      openForProtectedRoute();
    }
  }, [user, isLoading, openForProtectedRoute]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return <Route path={path}>{null}</Route>;
  }

  return <Route path={path} component={Component} />;
}
