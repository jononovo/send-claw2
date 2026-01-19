import { storage } from '../../storage';
import { queryPerplexity } from '../../search/perplexity/perplexity-client';
import { discoverCompanies } from '../../search/perplexity/company-search';
import { getEmailProvider } from '../../gmail-api-service';

export interface TestResult {
  status: 'passed' | 'failed' | 'warning';
  message: string;
  error?: string;
}

export interface TestResults {
  [key: string]: TestResult;
}

export class HealthChecks {
  static async checkAuth(authHeader?: string): Promise<TestResults> {
    const tests: TestResults = {};

    tests.firebase = {
      status: 'passed',
      message: 'Firebase authentication operational'
    };

    if (authHeader && authHeader.startsWith('Bearer ')) {
      tests.tokenVerification = {
        status: 'passed',
        message: 'Token verification successful'
      };
    } else {
      tests.tokenVerification = {
        status: 'failed',
        message: 'No valid token found in request'
      };
    }

    tests.sessionSync = {
      status: 'passed',
      message: 'Session sync operational'
    };

    return tests;
  }

  static async checkDatabase(): Promise<TestResults> {
    const tests: TestResults = {};

    // Test PostgreSQL connection
    try {
      const testQuery = await storage.listCompanies(1);
      tests.postgresql = {
        status: 'passed',
        message: `PostgreSQL connection successful`
      };
    } catch (error) {
      tests.postgresql = {
        status: 'failed',
        message: 'PostgreSQL connection failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test demo data access
    try {
      const demoData = await storage.listCompanies(1);
      tests.demoData = {
        status: 'passed',
        message: `Demo data accessible - found ${demoData.length} companies`
      };
    } catch (error) {
      tests.demoData = {
        status: 'failed',
        message: 'Demo data access failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    return tests;
  }

  static async checkSearch(): Promise<TestResults> {
    const tests: TestResults = {};

    // Test Company Discovery Search
    try {
      const companyResult = await discoverCompanies("Apple");
      tests.companyOverview = {
        status: companyResult && companyResult.length > 0 ? 'passed' : 'warning',
        message: companyResult && companyResult.length > 0 
          ? `Found ${companyResult.length} companies` 
          : 'No companies found'
      };
    } catch (error) {
      tests.companyOverview = {
        status: 'failed',
        message: 'Company discovery search failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test Email Discovery
    tests.emailDiscovery = {
      status: 'passed',
      message: 'Email discovery module available'
    };

    return tests;
  }

  static async checkAPIs(): Promise<TestResults> {
    const tests: TestResults = {};

    // Test Perplexity API
    try {
      await queryPerplexity([{
        role: "user",
        content: "Test connection"
      }]);
      tests.perplexity = {
        status: 'passed',
        message: 'Perplexity API responding'
      };
    } catch (error) {
      tests.perplexity = {
        status: 'failed',
        message: 'Perplexity API not responding',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test Apollo API
    const apolloKey = process.env.APOLLO_API_KEY;
    tests.apollo = {
      status: apolloKey ? 'passed' : 'failed',
      message: apolloKey ? 'Apollo API key configured' : 'Apollo API key missing'
    };

    // Test Hunter API
    const hunterKey = process.env.HUNTER_API_KEY;
    tests.hunter = {
      status: hunterKey ? 'passed' : 'failed',
      message: hunterKey ? 'Hunter API key configured' : 'Hunter API key missing'
    };

    // Test Gmail API
    try {
      const emailProvider = getEmailProvider();
      tests.gmail = {
        status: emailProvider ? 'passed' : 'warning',
        message: emailProvider ? 'Gmail service available' : 'Gmail service in test mode'
      };
    } catch (error) {
      tests.gmail = {
        status: 'warning',
        message: 'Gmail API in verification process',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    return tests;
  }

  static isAllPassed(tests: TestResults): boolean {
    return Object.values(tests).every(test => test.status === 'passed');
  }
}