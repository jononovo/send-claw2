import { lazy, Suspense, useEffect, useState, ReactNode } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AppSkeleton } from "@/components/ui/app-skeleton";
import { AppLayout, Layout } from "@/components/layout";
import { MainNav } from "@/components/main-nav";
import { ProtectedRoute } from "@/lib/protected-route";
import { SemiProtectedRoute } from "@/lib/semi-protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { RegistrationModalProvider } from "@/hooks/use-registration-modal";
import { RegistrationModalContainer } from "@/components/registration-modal-container";
import { StrategyOverlayProvider } from "@/features/strategy-chat";
import { TopNavAdProvider, PasswordSetupModal } from "@/features/top-nav-bar-ad-message";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/hooks/use-theme";
import { InsufficientCreditsProvider } from "@/contexts/insufficient-credits-context";
import { InsufficientCreditsModal } from "@/components/insufficient-credits-modal";
import { InsufficientCreditsHandlerSetup } from "@/components/insufficient-credits-handler-setup";
import { useAnalytics } from "@/hooks/use-analytics";
import { useMetaPixel } from "@/hooks/use-meta-pixel";
import { useAttributionCapture } from "@/features/attribution";

// Static pages (small components kept static)
import Auth from "@/pages/auth";

// Lazy-loaded landing pages (framer-motion pages load on demand)
const Landing = lazy(() => import("@/pages/landing"));
const Landing2 = lazy(() => import("@/pages/landing2"));
const LandingSimple = lazy(() => import("@/pages/landing-simple"));
const LandingSimple2 = lazy(() => import("@/pages/landing-simple2"));
const LandingSimple3 = lazy(() => import("@/pages/landing-simple3"));
const LandingStealth = lazy(() => import("@/features/landing-stealth"));
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
const Outreach = lazy(() => import("@/pages/outreach"));
const Streak = lazy(() => import("@/pages/Streak"));
const AuthComplete = lazy(() => import("@/pages/auth-complete"));
const Contacts = lazy(() => import("@/pages/Contacts"));
const ContactListDetail = lazy(() => import("@/pages/ContactListDetail"));
const AllContacts = lazy(() => import("@/pages/AllContacts"));
const Campaigns = lazy(() => import("@/features/campaigns").then(module => ({ default: module.CampaignsPage })));
const CampaignDetail = lazy(() => import("@/pages/CampaignDetail"));

// Lazy imports for SendClaw pages
const Inbox = lazy(() => import("@/pages/inbox"));
const Dashboard = lazy(() => import("@/pages/dashboard"));

// Lazy imports for admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));
const AdminEmailTesting = lazy(() => import("@/pages/admin/EmailTesting"));
const AdminApiTesting = lazy(() => import("@/pages/admin/ApiTesting"));
const AdminTemplates = lazy(() => import("@/pages/admin/Templates"));
const AdminAttribution = lazy(() => import("@/pages/admin/Attribution"));

// Lazy imports for marketing pages
const Terms = lazy(() => import("@/pages/terms"));
const Blog = lazy(() => import("@/pages/blog"));
const BlogPost = lazy(() => import("@/pages/blog-post"));
const Support = lazy(() => import("@/pages/support"));
const Levels = lazy(() => import("@/pages/levels"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Changelog = lazy(() => import("@/pages/changelog"));
const PricingNew = lazy(() => import("@/pages/pricing-new"));

// Lazy import for guidance engine (heavy feature - only load on /quests)
const QuestsPage = lazy(() => import("@/features/guidance-engine").then(module => ({ default: module.QuestsPage })));

const GUIDANCE_ENABLED_ROUTES = ["/app", "/app/new-search", "/search", "/quests", "/contacts", "/campaigns", "/replies", "/account", "/strategy", "/companies", "/admin"];

function isGuidanceRoute(path: string): boolean {
  return GUIDANCE_ENABLED_ROUTES.some(route => path === route || path.startsWith(route + "/"));
}

function DeferredGuidance() {
  const [GuidanceProvider, setGuidanceProvider] = useState<React.ComponentType<{ children: ReactNode; autoStartForNewUsers?: boolean }> | null>(null);
  const [location] = useLocation();
  
  useEffect(() => {
    if (!isGuidanceRoute(location)) return;
    if (GuidanceProvider) return;
    
    const load = () => {
      import("@/features/guidance-engine").then(module => {
        setGuidanceProvider(() => module.GuidanceProvider);
      }).catch(err => {
        console.error("Failed to load guidance engine:", err);
      });
    };
    
    if ('requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(load, { timeout: 5000 });
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(load, 3000);
      return () => clearTimeout(timer);
    }
  }, [location, GuidanceProvider]);
  
  if (!GuidanceProvider) return null;
  
  return (
    <GuidanceProvider autoStartForNewUsers={true}>
      <></>
    </GuidanceProvider>
  );
}

// Preload Home page when on landing pages (runs after page load, during idle time)
const LANDING_ROUTES = ["/", "/landing-stealth", "/stealth", "/s", "/react-landing", "/landing2", "/landing-simple", "/simple", "/landing-simple2", "/simple2", "/landing-simple3", "/simple3"];

function useHomePreload() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Only preload if we're on a landing page
    if (!LANDING_ROUTES.includes(location)) return;
    
    const preloadHome = () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          import("@/pages/home");
        }, { timeout: 3000 });
      } else {
        setTimeout(() => import("@/pages/home"), 2000);
      }
    };
    
    if (document.readyState === 'complete') {
      preloadHome();
    } else {
      window.addEventListener('load', preloadHome, { once: true });
    }
  }, [location]);
}

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  // Track Meta Pixel page views on route changes
  useMetaPixel();
  
  // Capture attribution data (UTM params, referrer, etc.) on first visit
  useAttributionCapture();
  
  // Preload Home page during idle time when on landing pages
  useHomePreload();
  
  return (
    <>
      <Switch>
        {/* Default landing page - Simple Landing 3 */}
        <Route path="/" component={() => 
          <Suspense fallback={null}>
            <LandingSimple3 />
          </Suspense>
        } />
        
        {/* React version of landing page for comparison */}
        <Route path="/react-landing" component={() => 
          <Suspense fallback={null}>
            <Landing />
          </Suspense>
        } />
        
        {/* Landing2 Page Clone */}
        <Route path="/landing2" component={() => 
          <Suspense fallback={null}>
            <Landing2 />
          </Suspense>
        } />
        
        {/* Stealth Mode Landing Page (lazy-loaded with framer-motion) */}
        <Route path="/landing-stealth" component={() => 
          <Suspense fallback={null}>
            <LandingStealth />
          </Suspense>
        } />
        <Route path="/stealth" component={() => 
          <Suspense fallback={null}>
            <LandingStealth />
          </Suspense>
        } />
        <Route path="/s" component={() => 
          <Suspense fallback={null}>
            <LandingStealth />
          </Suspense>
        } />
        
        {/* Simple Landing Page (minimal animations) */}
        <Route path="/landing-simple" component={() => 
          <Suspense fallback={null}>
            <LandingSimple />
          </Suspense>
        } />
        <Route path="/simple" component={() => 
          <Suspense fallback={null}>
            <LandingSimple />
          </Suspense>
        } />
        
        {/* Simple Landing Page Variant 2 (A/B testing) */}
        <Route path="/landing-simple2" component={() => 
          <Suspense fallback={null}>
            <LandingSimple2 />
          </Suspense>
        } />
        <Route path="/simple2" component={() => 
          <Suspense fallback={null}>
            <LandingSimple2 />
          </Suspense>
        } />
        
        {/* Simple Landing Page Variant 3 (A/B testing) */}
        <Route path="/landing-simple3" component={() => 
          <Suspense fallback={null}>
            <LandingSimple3 />
          </Suspense>
        } />
        <Route path="/simple3" component={() => 
          <Suspense fallback={null}>
            <LandingSimple3 />
          </Suspense>
        } />
        
        {/* Strategic Planning Page (no nav) */}
        <Route path="/planning" component={() => 
          <Suspense fallback={null}>
            <Planning />
          </Suspense>
        } />
        
        {/* Outreach redirect page */}
        <Route path="/outreach" component={() => 
          <Suspense fallback={null}>
            <Outreach />
          </Suspense>
        } />
        
        {/* Daily Outreach Page - Standalone without navigation */}
        <Route path="/outreach/daily/:token" component={() => 
          <Suspense fallback={null}>
            <DailyOutreach />
          </Suspense>
        } />
        
        {/* Marketing pages with full footer */}
        <Route path="/terms">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={null}>
                <Terms />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/blog">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={null}>
                <Blog />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/blog/:slug">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={null}>
                <BlogPost />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/levels">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={null}>
                <Levels />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/support">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={null}>
                <Support />
              </Suspense>
            </div>
          </Layout>
        </Route>
        <Route path="/privacy">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={null}>
                <Privacy />
              </Suspense>
            </div>
          </Layout>
        </Route>
        <Route path="/changelog">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={null}>
                <Changelog />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/pricing" component={() => 
          <Suspense fallback={null}>
            <PricingNew />
          </Suspense>
        } />

        <Route path="/quests">
          <Suspense fallback={null}>
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
                <Route path="/auth/complete">
                  <Suspense fallback={<AppSkeleton />}>
                    <AuthComplete />
                  </Suspense>
                </Route>
                
                {/* /search redirect to /app */}
                <Route path="/search">
                  {() => {
                    window.location.replace('/app');
                    return null;
                  }}
                </Route>
                
                {/* Semi-protected routes - allow initial access but prompt for login for certain actions */}
                <SemiProtectedRoute path="/search/:slug/:listId" component={() => 
                  <Suspense fallback={<AppSkeleton />}>
                    <Home />
                  </Suspense>
                } />
                <SemiProtectedRoute path="/app/new-search" component={() => 
                  <Suspense fallback={<AppSkeleton />}>
                    <Home isNewSearch={true} />
                  </Suspense>
                } />
                <SemiProtectedRoute path="/app" component={() => 
                  <Suspense fallback={<AppSkeleton />}>
                    <Home />
                  </Suspense>
                } />
                <SemiProtectedRoute path="/company/:slug/:id" component={() => 
                  <Suspense fallback={null}>
                    <CompanyDetails />
                  </Suspense>
                } />
                
                {/* Fully protected routes - require login */}
                <ProtectedRoute path="/account" component={() => 
                  <Suspense fallback={null}>
                    <Account />
                  </Suspense>
                } />
                <ProtectedRoute path="/streak" component={() => 
                  <Suspense fallback={null}>
                    <Streak />
                  </Suspense>
                } />
                <ProtectedRoute path="/campaigns" component={() => 
                  <Suspense fallback={null}>
                    <Campaigns />
                  </Suspense>
                } />
                <ProtectedRoute path="/campaigns/:id" component={() => 
                  <Suspense fallback={null}>
                    <CampaignDetail />
                  </Suspense>
                } />
                <ProtectedRoute path="/contacts" component={() => 
                  <Suspense fallback={null}>
                    <Contacts />
                  </Suspense>
                } />
                <ProtectedRoute path="/contacts/all-contacts" component={() => 
                  <Suspense fallback={null}>
                    <AllContacts />
                  </Suspense>
                } />
                <ProtectedRoute path="/contacts/lists/:id" component={() => 
                  <Suspense fallback={null}>
                    <ContactListDetail />
                  </Suspense>
                } />
                <ProtectedRoute path="/contact-lists/:id" component={() => 
                  <Suspense fallback={null}>
                    <ContactListDetail />
                  </Suspense>
                } />
                <ProtectedRoute path="/replies" component={() => 
                  <Suspense fallback={null}>
                    <Replies />
                  </Suspense>
                } />
                <ProtectedRoute path="/dashboard" component={() => 
                  <Suspense fallback={null}>
                    <Dashboard />
                  </Suspense>
                } />
                <ProtectedRoute path="/inbox" component={() => 
                  <Suspense fallback={null}>
                    <Inbox />
                  </Suspense>
                } />
                <SemiProtectedRoute path="/p/:slug/:id" component={() => 
                  <Suspense fallback={null}>
                    <ContactDetails />
                  </Suspense>
                } />
                <ProtectedRoute path="/testing" component={() => 
                  <Suspense fallback={null}>
                    <Testing />
                  </Suspense>
                } />
                <ProtectedRoute path="/strategy" component={() => 
                  <Suspense fallback={null}>
                    <StrategyDashboard />
                  </Suspense>
                } />
                
                {/* Admin routes - require login and admin privileges */}
                <ProtectedRoute path="/admin" component={() => 
                  <Suspense fallback={null}>
                    <AdminDashboard />
                  </Suspense>
                } />
                <ProtectedRoute path="/admin/users" component={() => 
                  <Suspense fallback={null}>
                    <AdminUsers />
                  </Suspense>
                } />
                <ProtectedRoute path="/admin/email" component={() => 
                  <Suspense fallback={null}>
                    <AdminEmailTesting />
                  </Suspense>
                } />
                <ProtectedRoute path="/admin/testing" component={() => 
                  <Suspense fallback={null}>
                    <AdminApiTesting />
                  </Suspense>
                } />
                <ProtectedRoute path="/admin/templates" component={() => 
                  <Suspense fallback={null}>
                    <AdminTemplates />
                  </Suspense>
                } />
                <ProtectedRoute path="/admin/attribution" component={() => 
                  <Suspense fallback={null}>
                    <AdminAttribution />
                  </Suspense>
                } />
                
                {/* Subscription Success Page */}
                <Route path="/subscription-success" component={() => 
                  <Suspense fallback={null}>
                    <SubscriptionSuccess />
                  </Suspense>
                } />
                
                {/* 404 Page */}
                <Route component={() => 
                  <Suspense fallback={null}>
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
              <StrategyOverlayProvider>
                <TopNavAdProvider>
                  <Router />
                  <DeferredGuidance />
                  <RegistrationModalContainer />
                  <PasswordSetupModal />
                </TopNavAdProvider>
              </StrategyOverlayProvider>
              <Toaster />
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