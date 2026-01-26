import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, User as SelectUser } from "@shared/schema";
import admin from "firebase-admin";
import { TokenService } from "./features/billing/tokens/service";
import { UserTokens } from "./features/billing/tokens/types";
import { CreditRewardService } from "./features/billing/rewards/service";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { dripEmailEngine } from "./email/drip-engine";
import { welcomeRegistrationTemplate } from "./email/templates/index";

// In-memory lock to prevent duplicate user creation from concurrent requests
// Maps email -> Promise that resolves when user creation/lookup completes
const userCreationLocks = new Map<string, Promise<User | null>>();

// Extend the session type to include gmailToken
declare module 'express-session' {
  interface SessionData {
    gmailToken?: string;
  }
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Send welcome email to newly registered users (fire-and-forget, non-blocking)
function sendWelcomeEmail(email: string, name?: string): void {
  const emailContent = welcomeRegistrationTemplate({ name: name || email.split('@')[0] });
  dripEmailEngine.sendImmediate(email, emailContent)
    .then(sent => {
      if (sent) {
        console.log(`[Auth] Welcome email sent to ${email.split('@')[0]}@...`);
      }
    })
    .catch(err => {
      console.error(`[Auth] Failed to send welcome email to ${email.split('@')[0]}@...:`, err);
    });
}

// Firebase token verification middleware
async function verifyFirebaseToken(req: Request): Promise<SelectUser | null> {
  // Try to get token from various sources
  let token: string | null = null;
  
  // 1. Check Authorization header (traditional method)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  }
  
  // 2. Check cookies if header not available
  if (!token && req.cookies?.authToken) {
    token = req.cookies.authToken;
  }
  
  // 3. Check custom header as fallback
  if (!token && req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'] as string;
  }

  if (!token || !admin.apps.length) {
    // Only log when Firebase is misconfigured (actual error)
    // Don't log "missing credentials" - expected for public routes
    if (token && !admin.apps.length) {
      console.error('Auth verification failed: Firebase Admin not initialized but token was provided');
    }
    return null;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    if (!decodedToken.email) {
      console.warn('Token missing email claim');
      return null;
    }

    const email = decodedToken.email;

    // Check if there's already a user creation in progress for this email
    const existingLock = userCreationLocks.get(email);
    if (existingLock) {
      console.log(`[verifyFirebaseToken] User creation already in progress for: ${email.split('@')[0]}@..., waiting...`);
      const existingUser = await existingLock;
      if (existingUser) {
        return existingUser;
      }
      // If lock resolved to null, fall through to try our own lookup
    }

    // Create a lock for this email BEFORE any lookup to prevent race condition
    let lockResolve: (user: User | null) => void;
    const lockPromise = new Promise<User | null>((resolve) => {
      lockResolve = resolve;
    });
    userCreationLocks.set(email, lockPromise);

    try {
      // Get or create user in our database
      let user = await storage.getUserByEmail(email);

      if (!user) {
        console.log('Creating new user in backend:', {
          email: email.split('@')[0] + '@...',
          timestamp: new Date().toISOString()
        });

        user = await storage.createUser({
          email: email,
          username: decodedToken.name || email.split('@')[0],
          password: '',  // Not used for Firebase auth
        });
        
        // Award registration credits using unified system (non-blocking)
        CreditRewardService.awardOneTimeCredits(
          user.id, 
          250, 
          "registration:welcome-bonus", 
          "Welcome bonus - 250 free credits"
        ).catch(err => console.error(`[Auth] Failed to award registration credits:`, err));
        
        // Create default Pipeline contact list for new user (non-blocking)
        storage.getOrCreatePipeline(user.id)
          .catch(err => console.error(`[Auth] Failed to create Pipeline for user:`, err));
        
        // NOTE: Do NOT send welcome email here - this is a fallback path
        // Welcome emails should only be sent from explicit registration endpoints
        // (/api/register, /api/google-auth) to avoid duplicates
      }

      // Resolve lock with the user (existing or newly created)
      lockResolve!(user);
      userCreationLocks.delete(email);
      return user;
    } catch (createError) {
      userCreationLocks.delete(email);
      lockResolve!(null);
      throw createError;
    }
  } catch (error) {
    console.error('Firebase token verification error:', {
      error,
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

// Add requireAuth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

export function setupAuth(app: Express) {
  // Create PostgreSQL session store using the Neon serverless pool
  const PgSession = connectPgSimple(session);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'temporary-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool: pool,
      tableName: 'user_sessions',
      createTableIfMissing: true, // Automatically create the session table
      ttl: 7 * 24 * 60 * 60, // 7 days TTL (in seconds for pg-simple)
      pruneSessionInterval: 86400, // Prune expired sessions every 24h (in seconds)
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  };

  console.log('Setting up PostgreSQL session store:', {
    environment: process.env.NODE_ENV,
    sessionTTL: '7 days',
    storeType: 'PostgreSQL',
    tableName: 'user_sessions',
    cookieSecure: sessionSettings.cookie?.secure,
    timestamp: new Date().toISOString()
  });

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Update local strategy to use email
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email', // Change this to use email field
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Initialize Firebase Admin
  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    try {
      if (!admin.apps.length) {
        console.log('Initializing Firebase Admin with config:', {
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        });

        admin.initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        });
        console.log('Firebase Admin initialized successfully');
      }
    } catch (error) {
      console.error('Firebase Admin initialization error:', {
        error,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    console.warn('Firebase Admin not initialized: missing project ID', {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  }


  // Add Firebase token verification to all authenticated routes
  app.use(async (req, res, next) => {
    // Development domain authentication bypass
    // Allow easy testing on configured development domains
    const host = req.get('host') || '';
    const exemptedDomains = process.env.AUTH_EXEMPT_DOMAINS ? 
      process.env.AUTH_EXEMPT_DOMAINS.split(',').map(d => d.trim()) : [];
    
    const isDevelopmentDomain = exemptedDomains.some(domain => {
      const matches = domain.startsWith('*') ? host.endsWith(domain.slice(1)) : host === domain;
      return matches;
    });
    
    if (isDevelopmentDomain && !req.isAuthenticated()) {
      // For development environments, automatically use demo user (ID 1)
      req.user = { 
        id: 1, 
        email: 'demo@5ducks.ai',
        username: 'Guest User',
        password: '' // Empty password for Firebase compatibility
      } as any;
      
      // Override isAuthenticated to return true for this request
      req.isAuthenticated = function(this: any) { return true; } as any;
      
      return next(); // Skip other auth checks
    }
    
    if (!req.isAuthenticated()) {
      const firebaseUser = await verifyFirebaseToken(req);
      if (firebaseUser) {
        // Attach the Firebase user to the request for other middleware to access
        (req as any).firebaseUser = firebaseUser;
        
        // Also log the user in to create a session - WAIT for completion
        req.login(firebaseUser, (err) => {
          if (err) {
            console.error('Session creation failed:', {
              error: err.message,
              userId: firebaseUser.id,
              timestamp: new Date().toISOString()
            });
            return next(err);
          }
          
          next(); // Only call next() after login completes
        });
        // Remove the return here - wait for req.login to complete
      } else {
        // No Firebase user found, continue without authentication
        next();
      }
    } else {
      // Already authenticated via session
      next();
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Check if there's already a user creation in progress for this email
      const existingLock = userCreationLocks.get(email);
      if (existingLock) {
        console.log(`[/api/register] User creation already in progress for: ${email.split('@')[0]}@..., waiting...`);
        const existingUser = await existingLock;
        if (existingUser) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }

      // Create a lock for this email BEFORE any lookup
      let lockResolve: (user: User | null) => void;
      const lockPromise = new Promise<User | null>((resolve) => {
        lockResolve = resolve;
      });
      userCreationLocks.set(email, lockPromise);

      try {
        // Check for existing email
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          userCreationLocks.delete(email);
          lockResolve!(existingEmail);
          return res.status(400).json({ error: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const user = await storage.createUser({
          email,
          password: hashedPassword,
        });

        // Resolve lock with the created user
        lockResolve!(user);
        userCreationLocks.delete(email);

        console.log('User created successfully:', {
          id: user.id,
          email: email.split('@')[0] + '@...',
          timestamp: new Date().toISOString()
        });

        // Award registration credits using unified system (non-blocking)
        CreditRewardService.awardOneTimeCredits(
          user.id, 
          250, 
          "registration:welcome-bonus", 
          "Welcome bonus - 250 free credits"
        ).catch(err => console.error(`[Auth] Failed to award registration credits:`, err));

        // Send welcome email to new user (non-blocking)
        sendWelcomeEmail(email, user.username);

        // Login the user
        req.login(user, (err) => {
          if (err) {
            console.error('Login error after registration:', err);
            return next(err);
          }
          
          // Return success response with user data
          console.log('User logged in after registration');
          return res.status(201).json(user);
        });
      } catch (createError) {
        // Clean up lock on error
        userCreationLocks.delete(email);
        lockResolve!(null);
        console.error('User creation error:', createError);
        return res.status(500).json({ error: "Failed to create user account" });
      }
    } catch (err) {
      // Clean up lock on outer error
      const email = req.body.email;
      if (email && userCreationLocks.has(email)) {
        userCreationLocks.delete(email);
      }
      console.error('Registration error:', err);
      // Send proper JSON response instead of passing to generic error handler
      return res.status(500).json({ error: "Registration failed", details: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, (err: Error | null) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    // Store the logout time in the session before logout
    // This will help us prevent showing previous user data to a new user
    if (req.session) {
      (req.session as any).logoutTime = Date.now();
      console.log('Set logout timestamp:', { time: new Date().toISOString() });
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Endpoint to check if development domain bypass is enabled
  app.get("/api/test-mode-status", (req, res) => {
    // Check if current domain is in AUTH_EXEMPT_DOMAINS
    const host = req.get('host') || '';
    const exemptedDomains = process.env.AUTH_EXEMPT_DOMAINS ? 
      process.env.AUTH_EXEMPT_DOMAINS.split(',').map(d => d.trim()) : [];
    
    const isDevelopmentDomain = exemptedDomains.some(domain => 
      domain.startsWith('*') ? host.endsWith(domain.slice(1)) : host === domain
    );
    
    res.json({
      enabled: isDevelopmentDomain,
      user: isDevelopmentDomain ? {
        id: 1,
        email: 'demo@5ducks.ai',
        username: 'Guest User'
      } : null
    });
  });

  app.get("/api/user", (req, res) => {
    // Check for req.user presence (set by AUTH_EXEMPT_DOMAINS or regular auth)
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  app.get("/api/user/profile", async (req, res) => {
    // Check for req.user presence (set by AUTH_EXEMPT_DOMAINS or regular auth)
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  app.put("/api/user/profile", async (req, res) => {
    // Check for req.user presence (set by AUTH_EXEMPT_DOMAINS or regular auth)
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const { username } = req.body;
      const userId = (req.user as any).id;
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: "Username is required" });
      }
      
      if (username.length < 1) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      if (username.length > 50) {
        return res.status(400).json({ error: "Name must be less than 50 characters" });
      }
      
      const updatedUser = await storage.updateUser(userId, { username });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        createdAt: updatedUser.createdAt
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });

  app.get("/api/user/subscription-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const userId = (req.user as any).id;
      const { CreditService } = await import("./features/billing/credits/service");
      const credits = await CreditService.getUserCredits(userId);
      
      const planMap = {
        'ugly-duckling': 'The Duckling',
        'duckin-awesome': 'Mama Duck'
      };
      
      const currentPlan = credits.currentPlan || null;
      const isSubscribed = credits.subscriptionStatus === 'active';
      
      res.json({
        isSubscribed,
        currentPlan,
        planDisplayName: currentPlan ? planMap[currentPlan as keyof typeof planMap] : null
      });
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  // Add to the Google auth route
  app.post("/api/google-auth", async (req, res, next) => {
    try {
      const { email, username, firebaseUid, selectedPlan, planSource, joinWaitlist, accessCode } = req.body;

      console.log('Google auth endpoint received request:', { 
        hasEmail: !!email, 
        hasUsername: !!username,
        hasFirebaseUid: !!firebaseUid,
        selectedPlan,
        planSource,
        joinWaitlist,
        accessCode,
        timestamp: new Date().toISOString()
      });

      if (!email) {
        console.error('[/api/google-auth] Missing email in request body');
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if there's already a user creation in progress for this email
      const existingLock = userCreationLocks.get(email);
      if (existingLock) {
        console.log(`[/api/google-auth] User creation already in progress for: ${email.split('@')[0]}@..., waiting...`);
        try {
          const existingUser = await existingLock;
          if (existingUser) {
            console.log(`[/api/google-auth] Returning user from concurrent request: id=${existingUser.id}`);
            // Skip to returning user (login flow)
            req.login(existingUser, (loginErr) => {
              if (loginErr) {
                console.error('[/api/google-auth] Login error:', loginErr);
                return res.status(500).json({ error: "Failed to log in" });
              }
              return res.json(existingUser);
            });
            return;
          }
        } catch (lockError) {
          console.error('[/api/google-auth] Concurrent request failed:', lockError);
          // Fall through to try our own lookup
        }
      }

      // Create a lock for this email to prevent concurrent user creation
      let lockResolve: (user: User | null) => void;
      const lockPromise = new Promise<User | null>((resolve) => {
        lockResolve = resolve;
      });
      userCreationLocks.set(email, lockPromise);

      // Try to find user by email
      console.log(`[/api/google-auth] Looking up user by email: ${email.split('@')[0]}@...`);
      let user = null;
      
      try {
        user = await storage.getUserByEmail(email);
        if (user) {
          console.log(`[/api/google-auth] Found existing user: id=${user.id}`);
        } else {
          console.log(`[/api/google-auth] No existing user found for email`);
        }
      } catch (lookupError) {
        userCreationLocks.delete(email);
        lockResolve!(null);
        console.error('[/api/google-auth] Error looking up user by email:', {
          error: lookupError instanceof Error ? lookupError.message : lookupError,
          stack: lookupError instanceof Error ? lookupError.stack : undefined
        });
        return res.status(500).json({ 
          error: "Database error while looking up user",
          details: lookupError instanceof Error ? lookupError.message : "Unknown database error"
        });
      }

      if (!user) {
        // Create new user if doesn't exist
        console.log(`[/api/google-auth] Creating new user for: ${email.split('@')[0]}@...`);
        try {
          user = await storage.createUser({
            email,
            username: username || email.split('@')[0],
            password: '',  // Not used for Google auth
          });
          console.log(`[/api/google-auth] Successfully created new user: id=${user.id}`);
          
          // Award registration credits using unified system (non-blocking)
          CreditRewardService.awardOneTimeCredits(
            user.id, 
            250, 
            "registration:welcome-bonus", 
            "Welcome bonus - 250 free credits"
          ).catch(err => console.error(`[Auth] Failed to award registration credits:`, err));
          
          // Send welcome email to new user (non-blocking)
          sendWelcomeEmail(email, username);
        } catch (createError) {
          userCreationLocks.delete(email);
          lockResolve!(null);
          console.error('[/api/google-auth] Failed to create user:', {
            error: createError instanceof Error ? createError.message : createError,
            stack: createError instanceof Error ? createError.stack : undefined,
            email: email.split('@')[0] + '@...'
          });
          return res.status(500).json({ 
            error: "Failed to create user account",
            details: createError instanceof Error ? createError.message : "Unknown error"
          });
        }
      }
      
      // Resolve lock with the user (for other concurrent requests waiting)
      lockResolve!(user);

      // Optional: Store Firebase UID mapping for fast lookup
      if (firebaseUid) {
        console.log(`[/api/google-auth] Attempting to store Firebase UID mapping for user ${user.id}`);
        try {
          await TokenService.storeFirebaseUidMapping(firebaseUid, user.id);
          console.log(`[/api/google-auth] Successfully stored Firebase UID mapping`);
        } catch (tokenError) {
          console.error('[/api/google-auth] Failed to store Firebase UID mapping (non-critical):', {
            error: tokenError instanceof Error ? tokenError.message : tokenError,
            stack: tokenError instanceof Error ? tokenError.stack : undefined,
            userId: user.id
          });
          // Don't fail the authentication if mapping storage fails - this is optional
        }
      }

      // Save access code to user preferences if provided
      if (accessCode) {
        console.log(`[/api/google-auth] Saving access code for user ${user.id}: ${accessCode}`);
        try {
          await storage.updateUserPreferences(user.id, { 
            settings: { accessCode } 
          });
          console.log(`[/api/google-auth] Successfully saved access code to user preferences`);
        } catch (accessCodeError) {
          console.error('[/api/google-auth] Failed to save access code (non-critical):', {
            error: accessCodeError instanceof Error ? accessCodeError.message : accessCodeError,
            userId: user.id
          });
          // Don't fail authentication if access code saving fails
        }
      }

      // Handle plan selection from pricing page
      if (selectedPlan && planSource === 'pricing_page') {
        console.log(`[/api/google-auth] Processing plan selection: ${selectedPlan}`);
        try {
          const { CreditService } = await import("./features/billing/credits/service");
          
          if (selectedPlan === 'ugly-duckling') {
            // User selected The Duckling plan - redirect to Stripe checkout after auth
            console.log(`[/api/google-auth] User ${user.id} selected The Duckling plan from pricing page`);
            // The frontend will handle Stripe checkout redirection
          } else if (selectedPlan === 'duckin-awesome' && joinWaitlist) {
            // User selected Mama Duck plan - add to waitlist
            console.log(`[/api/google-auth] User ${user.id} joined Mama Duck waitlist from pricing page`);
            // TODO: Implement waitlist logic
          }
        } catch (planError) {
          console.error('[/api/google-auth] Error handling plan selection (non-critical):', {
            error: planError instanceof Error ? planError.message : planError,
            stack: planError instanceof Error ? planError.stack : undefined,
            userId: user.id,
            selectedPlan
          });
          // Don't fail authentication if plan handling fails
        }
      }

      // Create session for the user
      console.log(`[/api/google-auth] Creating session for user ${user.id}`);
      req.login(user, (err) => {
        // Clean up lock after login attempt (success or failure)
        if (email) {
          userCreationLocks.delete(email);
        }
        if (err) {
          console.error('[/api/google-auth] Failed to create session:', {
            error: err instanceof Error ? err.message : err,
            stack: err instanceof Error ? err.stack : undefined,
            userId: user.id
          });
          return res.status(500).json({ 
            error: "Failed to create user session",
            details: err instanceof Error ? err.message : "Session creation failed"
          });
        }
        console.log(`[/api/google-auth] Successfully authenticated user ${user.id}`);
        res.json(user);
      });
    } catch (err) {
      // Clean up lock on unexpected error
      const email = req.body.email;
      if (email && userCreationLocks.has(email)) {
        userCreationLocks.delete(email);
      }
      console.error('[/api/google-auth] Unexpected error in authentication flow:', {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
        body: {
          hasEmail: !!req.body.email,
          hasUsername: !!req.body.username,
          hasFirebaseUid: !!req.body.firebaseUid
        }
      });
      res.status(500).json({ 
        error: "Authentication failed",
        details: err instanceof Error ? err.message : "Unexpected error during authentication"
      });
    }
  });
}