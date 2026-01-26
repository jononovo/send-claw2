import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { outreachScheduler } from "./features/daily-outreach";
import { CampaignScheduler } from "./features/campaigns/services/campaign-scheduler";
import { emailQueueProcessor } from "./features/campaigns/email-queue-processor";
import { dripEmailEngine } from "./email/drip-engine";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();

// Trust proxy for correct IP detection behind Replit's proxy
app.set('trust proxy', 1);

// Configure webhook-specific raw body parsing
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Configure JSON parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable gzip/deflate compression for all responses
app.use(compression());

// Configure CORS to handle credentials properly
app.use((req, res, next) => {
  // Get the origin from the request
  const origin = req.headers.origin as string | undefined;
  
  // If no origin header (same-origin request), no CORS needed
  if (!origin) {
    // Same-origin requests don't need CORS headers
    return next();
  }
  
  // Configure allowed origins based on environment
  let allowedOrigins: string[] = [];
  
  if (process.env.NODE_ENV === 'production') {
    // In production, be strict about allowed origins
    allowedOrigins = [
      // Add your production domains here
      process.env.FRONTEND_URL,
      // Replit domains - be specific, no wildcards with credentials
      ...(process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',') : [])
    ].filter(Boolean) as string[];
    
    // If deployed on Replit, also allow the specific Replit app domain
    if (process.env.REPL_ID && process.env.REPL_OWNER) {
      // Construct the likely Replit domain
      const replitDomain = `https://${process.env.REPL_ID}.${process.env.REPL_OWNER}.repl.co`;
      const replitAppDomain = `https://${process.env.REPL_ID}-${process.env.REPL_OWNER}.replit.app`;
      allowedOrigins.push(replitDomain, replitAppDomain);
    }
  } else {
    // In development, allow localhost origins
    allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      origin // Also allow the requesting origin in dev
    ];
  }
  
  // Check if the origin is allowed
  const isAllowedOrigin = allowedOrigins.includes(origin);
  
  if (isAllowedOrigin) {
    // Set the specific origin (not wildcard) when credentials are used
    res.header('Access-Control-Allow-Origin', origin);
    // Allow credentials
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (process.env.NODE_ENV !== 'production') {
    // In development only, be more permissive if origin not in list
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  // In production, if origin is not allowed, don't set CORS headers (request will be blocked)
  
  // Set allowed headers and methods
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  
  // Cache preflight requests for 10 minutes
  res.header('Access-Control-Max-Age', '600');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    // Respond immediately to OPTIONS requests
    return res.sendStatus(200);
  }
  
  next();
});

// Capture the domain from incoming requests for webhook callbacks
app.use((req, res, next) => {
  const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const host = req.get('host');
  if (host) {
    process.env.CURRENT_DOMAIN = `${protocol}://${host}`;
    console.log(`Current domain captured: ${process.env.CURRENT_DOMAIN}`);
  }
  next();
});

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Add health check endpoint with database connectivity check
app.get('/api/health', async (_req, res) => {
  try {
    // Check database connectivity for production health checks
    if (process.env.NODE_ENV === 'production') {
      const { db } = await import('./db.js');
      await db.execute(sql`SELECT 1`);
    }
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'error', 
      message: 'Service unavailable',
      timestamp: new Date().toISOString() 
    });
  }
});

(async () => {
  try {
    console.log('Starting server initialization...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Port:', process.env.PORT || '5000');
    
    // Verify database connection early
    try {
      const { db } = await import('./db.js');
      await db.execute(sql`SELECT 1`);
      console.log('Database connection verified');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      throw new Error(`Database initialization failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }
    
    // Setup authentication before registering routes
    setupAuth(app);
    console.log('Authentication configured');
    
    // Initialize daily outreach scheduler with error handling
    try {
      await outreachScheduler.initialize();
      console.log('Daily outreach scheduler initialized');
    } catch (schedulerError) {
      console.warn('Outreach scheduler initialization failed (non-critical):', schedulerError);
    }
    
    // Initialize campaign scheduler to activate scheduled campaigns
    try {
      const campaignScheduler = CampaignScheduler.getInstance();
      await campaignScheduler.start();
      console.log('Campaign scheduler initialized');
    } catch (campaignSchedulerError) {
      console.warn('Campaign scheduler initialization failed (non-critical):', campaignSchedulerError);
    }

    // Initialize email queue processor for batch email generation
    try {
      emailQueueProcessor.start();
      console.log('Email queue processor initialized');
    } catch (emailQueueError) {
      console.warn('Email queue processor initialization failed (non-critical):', emailQueueError);
    }

    // Initialize drip email engine
    try {
      await dripEmailEngine.initialize();
      console.log('Drip email engine initialized');
    } catch (dripError) {
      console.warn('Drip email engine initialization failed (non-critical):', dripError);
    }

    const server = registerRoutes(app);
    console.log('Routes registered');

    if (app.get("env") === "development") {
      await setupVite(app, server);
      console.log('Vite development server configured');
    } else {
      serveStatic(app);
      console.log('Static file serving configured');
    }

    // Global error handler - place after Vite setup
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      // Return a properly formatted error response
      res.status(status).json({ 
        error: message,
        status: status,
        timestamp: new Date().toISOString()
      });
    });

    const PORT = parseInt(process.env.PORT || "5000", 10);
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server successfully started on 0.0.0.0:${PORT}`);
      console.log(`Health check available at http://0.0.0.0:${PORT}/api/health`);
      log(`Express server serving on port ${PORT}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received, starting graceful shutdown...`);
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('FATAL: Failed to start server:', error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    process.exit(1);
  }
})();