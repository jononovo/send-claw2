import { lazy, Suspense, useEffect, useState, ReactNode } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { AppLayout, Layout } from "@/components/layout";
import { MainNav } from "@/components/main-nav";
import { ProtectedRoute } from "@/lib/protected-route";
import { SemiProtectedRoute } from "@/lib/semi-protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { RegistrationModalProvider } from "@/hooks/use-registration-modal";
import { RegistrationModalContainer } from "@/components/registration-modal-container";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/hooks/use-theme";
import { InsufficientCreditsProvider } from "@/contexts/insufficient-credits-context";
import { InsufficientCreditsModal } from "@/components/insufficient-credits-modal";
import { InsufficientCreditsHandlerSetup } from "@/components/insufficient-credits-handler-setup";
import { useAnalytics } from "@/hooks/use-analytics";
import { useAttributionCapture } from "@/features/attribution";

// Static pages (small components kept static)
import Auth from "@/pages/auth";

// Direct import for primary landing page (critical path - no lazy loading)
import LandingStealth from "@/features/landing-stealth";

// Lazy-loaded landing pages (secondary pages)
const Landing = lazy(() => import("@/pages/landing"));
const Landing2 = lazy(() => import("@/pages/landing2"));
const Planning = lazy(() => import("@/pages/planning"));

// Lazy imports for app pages that can be loaded on demand
const Home = lazy(() => import("@/pages/home"));
const Account = lazy(() => import("@/pages/account"));
const Replies = lazy(() => import("@/pages/replies"));
const CompanyDetails = lazy(() => import("@/pages/company-details"));
const ContactDetails = lazy(() => import("@/pages/contact-details"));
const Testing = lazy(() => import("@/pages/testing"));
const SubscriptionSuccess = lazy(() => import("@/pages/subscription-success"));
const NotFound = lazy(() => import("@/pages/not-found"));
const StrategyDashboard = lazy(() => import("@/features/strategy-chat").then(module => ({ default: module.StrategyDashboard })));
const DailyOutreach = lazy(() => import("@/pages/DailyOutreach"));
const Streak = lazy(() => import("@/pages/Streak"));
const Contacts = lazy(() => import("@/pages/Contacts"));
const ContactListDetail = lazy(() => import("@/pages/ContactListDetail"));
const AllContacts = lazy(() => import("@/pages/AllContacts"));
const Campaigns = lazy(() => import("@/features/campaigns").then(module => ({ default: module.CampaignsPage })));
const CampaignDetail = lazy(() => import("@/pages/CampaignDetail"));

// Lazy imports for admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));
const AdminEmailTesting = lazy(() => import("@/pages/admin/EmailTesting"));
const AdminApiTesting = lazy(() => import("@/pages/admin/ApiTesting"));
const AdminTemplates = lazy(() => import("@/pages/admin/Templates"));

// Lazy imports for marketing pages
const Terms = lazy(() => import("@/pages/terms"));
const Blog = lazy(() => import("@/pages/blog"));
const BlogPost = lazy(() => import("@/pages/blog-post"));
const Support = lazy(() => import("@/pages/support"));
const Levels = lazy(() => import("@/pages/levels"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Changelog = lazy(() => import("@/pages/changelog"));

// Lazy import for guidance engine (heavy feature - only load on /quests)
const QuestsPage = lazy(() => import("@/features/guidance-engine").then(module => ({ default: module.QuestsPage })));

const GUIDANCE_ENABLED_ROUTES = ["/app", "/quests", "/contacts", "/campaigns", "/replies", "/account", "/strategy", "/companies", "/admin"];

function isGuidanceRoute(path: string): boolean {
  return GUIDANCE_ENABLED_ROUTES.some(route => path === route || path.startsWith(route + "/"));
}

function LazyGuidanceWrapper({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [GuidanceProvider, setGuidanceProvider] = useState<React.ComponentType<{ children: ReactNode; autoStartForNewUsers?: boolean }> | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  
  useEffect(() => {
    if (!isGuidanceRoute(location)) {
      return;
    }
    
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [location]);
  
  useEffect(() => {
    if (!shouldLoad) return;
    
    import("@/features/guidance-engine").then(module => {
      setGuidanceProvider(() => module.GuidanceProvider);
    });
  }, [shouldLoad]);
  
  if (GuidanceProvider) {
    return <GuidanceProvider autoStartForNewUsers={true}>{children}</GuidanceProvider>;
  }
  
  return <>{children}</>;
}

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  // Capture attribution data (UTM params, referrer, etc.) on first visit
  useAttributionCapture();
  
  return (
    <>
      <Switch>
        {/* Default landing page - Stealth Mode (directly imported, no Suspense needed) */}
        <Route path="/" component={LandingStealth} />
        
        {/* React version of landing page for comparison */}
        <Route path="/react-landing" component={() => 
          <Suspense fallback={<LoadingScreen />}>
            <Landing />
          </Suspense>
        } />
        
        {/* Landing2 Page Clone */}
        <Route path="/landing2" component={() => 
          <Suspense fallback={<LoadingScreen />}>
            <Landing2 />
          </Suspense>
        } />
        
        {/* Stealth Mode Landing Page (directly imported, no Suspense needed) */}
        <Route path="/landing-stealth" component={LandingStealth} />
        <Route path="/s" component={LandingStealth} />
        
        {/* Strategic Planning Page (no nav) */}
        <Route path="/planning" component={() => 
          <Suspense fallback={<LoadingScreen />}>
            <Planning />
          </Suspense>
        } />
        
        {/* Daily Outreach Page - Standalone without navigation */}
        <Route path="/outreach/daily/:token" component={() => 
          <Suspense fallback={<LoadingScreen />}>
            <DailyOutreach />
          </Suspense>
        } />
        
        {/* Marketing pages with full footer */}
        <Route path="/terms">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <Terms />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/blog">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <Blog />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/blog/:slug">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <BlogPost />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/levels">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <Levels />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/support">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <Support />
              </Suspense>
            </div>
          </Layout>
        </Route>
        <Route path="/privacy">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <Privacy />
              </Suspense>
            </div>
          </Layout>
        </Route>
        <Route path="/changelog">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <Changelog />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/quests">
          <Suspense fallback={<LoadingScreen />}>
            <QuestsPage />
          </Suspense>
        </Route>

        {/* App pages with mini footer */}
        <Route path="*">
          <AppLayout>
            <MainNav />
            <div className="flex-1">
              <Switch>
                <Route path="/auth" component={Auth} />
                
                {/* Semi-protected routes - allow initial access but prompt for login for certain actions */}
                <SemiProtectedRoute path="/app" component={() => 
                  <Suspense fallback={<LoadingScreen message="Loading search interface..." />}>
                    <Home />
                  </Suspense>
                } />
                <SemiProtectedRoute path="/company/:slug/:id" component={() => 
                  <Suspense fallback={<LoadingScreen message="Loading company details..." />}>
                    <CompanyDetails />
                  </Suspense>
                } />
                
                {/* Fully protected routes - require login */}
                <ProtectedRoute path="/account" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Account />
                  </Suspense>
                } />
                <ProtectedRoute path="/streak" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Streak />
                  </Suspense>
                } />
                <ProtectedRoute path="/campaigns" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Campaigns />
                  </Suspense>
                } />
                <ProtectedRoute path="/campaigns/:id" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <CampaignDetail />
                  </Suspense>
                } />
                <ProtectedRoute path="/contacts" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Contacts />
                  </Suspense>
                } />
                <ProtectedRoute path="/contacts/all-contacts" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <AllContacts />
                  </Suspense>
                } />
                <ProtectedRoute path="/contacts/lists/:id" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <ContactListDetail />
                  </Suspense>
                } />
                <ProtectedRoute path="/contact-lists/:id" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <ContactListDetail />
                  </Suspense>
                } />
                <ProtectedRoute path="/replies" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Replies />
                  </Suspense>
                } />
                <SemiProtectedRoute path="/p/:slug/:id" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <ContactDetails />
                  </Suspense>
                } />
                <ProtectedRoute path="/testing" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Testing />
                  </Suspense>
                } />
                <ProtectedRoute path="/strategy" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <StrategyDashboard />
                  </Suspense>
                } />
                
                {/* Admin routes - require login and admin privileges */}
                <ProtectedRoute path="/admin" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminDashboard />
                  </Suspense>
                } />
                <ProtectedRoute path="/admin/users" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminUsers />
                  </Suspense>
                } />
                <ProtectedRoute path="/admin/email" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminEmailTesting />
                  </Suspense>
                } />
                <ProtectedRoute path="/admin/testing" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminApiTesting />
                  </Suspense>
                } />
                <ProtectedRoute path="/admin/templates" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminTemplates />
                  </Suspense>
                } />
                
                {/* Subscription Success Page */}
                <Route path="/subscription-success" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <SubscriptionSuccess />
                  </Suspense>
                } />
                
                {/* 404 Page */}
                <Route component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <NotFound />
                  </Suspense>
                } />
              </Switch>
            </div>
          </AppLayout>
        </Route>
      </Switch>
      
    </>
  );
}

function App() {
  // Google Analytics is initialized in index.html with requestIdleCallback deferral
  // No need to call initGA() here - it would cause duplicate script loading
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <InsufficientCreditsProvider>
          <AuthProvider>
            <RegistrationModalProvider>
              <LazyGuidanceWrapper>
                <Router />
                <RegistrationModalContainer />
                <Toaster />
              </LazyGuidanceWrapper>
            </RegistrationModalProvider>
            <InsufficientCreditsModal />
            <InsufficientCreditsHandlerSetup />
          </AuthProvider>
        </InsufficientCreditsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;