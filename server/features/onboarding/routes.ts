import { Router, Request, Response, Application } from 'express';
import { getUserId } from '../../utils/auth';
import { db } from '../../db';
import { strategicProfiles, targetCustomerProfiles, insertUserOnboardingSnapshotSchema } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { queryOpenAI } from '../../ai-services';
import { storage } from '../../storage';

interface GenerateICPRequest {
  searchQuery: string;
  searchResults: Array<{
    name: string;
    description: string | null;
    size: number | null;
    industry?: string;
  }>;
  productId: number;
}

export function registerOnboardingRoutes(app: Application, requireAuth: any) {
  const router = Router();

  // Generate ICP based on search results and product
  router.post('/generate-icp', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

    const { searchQuery, searchResults, productId }: GenerateICPRequest = req.body;

    // Get product data
    const [product] = await db
      .select()
      .from(strategicProfiles)
      .where(eq(strategicProfiles.id, productId));

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Analyze the search results to identify patterns
    const companyAnalysis = searchResults.slice(0, 10).map(c => ({
      name: c.name,
      description: c.description || '',
      size: c.size || 'Unknown',
      industry: c.industry || 'Not specified'
    }));

    // Build the prompt for ICP generation
    const prompt = `You are a B2B sales strategist creating an Ideal Customer Profile (ICP).

Context:
- User's search query: "${searchQuery}"
- Product/Service: ${product.productService}
- Customer feedback: ${product.customerFeedback || 'Not provided'}
- Business type: ${product.businessType}
- Product website: ${product.website || 'Not provided'}

Sample companies from search results:
${companyAnalysis.map((c, i) => `${i + 1}. ${c.name}
   Description: ${c.description}
   Size: ${c.size} employees
   Industry: ${c.industry}`).join('\n')}

Based on this information, create a comprehensive ICP that includes:
1. Target industry (be specific based on the patterns in the search results)
2. Ideal company size range
3. Key decision maker titles (list 3-5 specific roles)
4. Top 3-4 pain points this product/service solves for these companies
5. Clear value proposition statement (one sentence)
6. An optimized search query to find more similar companies

Return ONLY a JSON object with this structure:
{
  "title": "ICP title",
  "industry": "Primary industry focus",
  "companySize": "Size range (e.g., 50-200 employees)",
  "targetRoles": ["Role 1", "Role 2", "Role 3"],
  "painPoints": ["Pain point 1", "Pain point 2", "Pain point 3"],
  "valueProposition": "Clear value statement",
  "searchPrompt": "Optimized search query",
  "exampleCompany": "Best example from the list",
  "additionalContext": "Any special timing or context"
}`;

    const response = await queryOpenAI(
      [
        {
          role: 'system',
          content: 'You are an expert at creating Ideal Customer Profiles for B2B sales. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      'gpt-4-turbo-preview'
    );

    // Parse the response
    let icpData;
    try {
      // Extract JSON from the response (in case it includes extra text)
      const responseText = typeof response === 'string' ? response : JSON.stringify(response);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        icpData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing ICP response:', parseError);
      // Fallback to a basic ICP
      icpData = {
        title: `ICP for ${product.businessType}`,
        industry: searchResults[0]?.industry || 'Technology',
        companySize: '50-500 employees',
        targetRoles: ['CEO', 'VP Sales', 'Marketing Director'],
        painPoints: [
          'Need to improve efficiency',
          'Looking for better solutions',
          'Want to reduce costs'
        ],
        valueProposition: product.customerFeedback || product.productService,
        searchPrompt: searchQuery,
        exampleCompany: searchResults[0]?.name || '',
        additionalContext: ''
      };
    }

    res.json({
      icp: icpData,
      searchResultsAnalyzed: searchResults.length,
      productUsed: {
        id: product.id,
        title: product.title,
        businessType: product.businessType
      }
    });
  } catch (error) {
    console.error('Error generating ICP:', error);
    res.status(500).json({ 
      error: 'Failed to generate ICP',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  });

  // Generate improved search prompts based on user feedback
  router.post('/improve-search-prompt', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      const { originalPrompt, searchResults, ratings } = req.body;
      
      // Analyze the ratings to understand what was wrong
      const perfectFitCompanies = ratings.filter((r: any) => r.rating === 'perfect');
      const notFitCompanies = ratings.filter((r: any) => r.rating === 'not-fit');
      const unsureCompanies = ratings.filter((r: any) => r.rating === 'unsure');
      
      // Build analysis of what's wrong
      const analysisPrompt = `You are a B2B search optimization expert. A user searched for companies but the results were poor.

Original search query: "${originalPrompt}"

Rating breakdown:
- ${perfectFitCompanies.length} companies marked as "Perfect fit"
- ${unsureCompanies.length} companies marked as "Not sure"
- ${notFitCompanies.length} companies marked as "Not a fit"

${perfectFitCompanies.length > 0 ? `Good matches (Perfect fit):
${perfectFitCompanies.map((c: any) => `- ${c.companyName}`).join('\n')}` : 'No perfect matches found'}

${notFitCompanies.length > 0 ? `Poor matches (Not a fit):
${notFitCompanies.map((c: any) => `- ${c.companyName}`).join('\n')}` : ''}

Sample of all companies found:
${searchResults.slice(0, 10).map((c: any) => `- ${c.name}: ${c.description || 'No description'}`).join('\n')}

Based on this feedback, the user needs better search prompts. Generate 3 improved search queries that will find more companies like the "Perfect fit" ones and avoid companies like the "Not a fit" ones.

Each suggestion should:
1. Be more specific and targeted
2. Use industry-specific terms when appropriate
3. Include relevant keywords that would filter results better
4. Be different enough from each other to give variety

Return ONLY a JSON object with this structure:
{
  "suggestions": [
    "First improved search query",
    "Second improved search query", 
    "Third improved search query"
  ],
  "reasoning": "Brief explanation of what was wrong with the original search"
}`;

      const response = await queryOpenAI(
        [
          {
            role: 'system',
            content: 'You are an expert at optimizing B2B company search queries. Always return valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        'gpt-4-turbo-preview'
      );
      
      // Parse the response
      let suggestionsData;
      try {
        const responseText = typeof response === 'string' ? response : JSON.stringify(response);
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          suggestionsData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Error parsing suggestions response:', parseError);
        // Fallback suggestions
        suggestionsData = {
          suggestions: [
            originalPrompt + ' software companies',
            originalPrompt + ' B2B services',
            originalPrompt + ' enterprise solutions'
          ],
          reasoning: 'The original search may have been too broad. Try being more specific about the industry or company type.'
        };
      }
      
      res.json(suggestionsData);
      
    } catch (error) {
      console.error('Error generating improved prompts:', error);
      res.status(500).json({ 
        error: 'Failed to generate improved search suggestions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Save user onboarding snapshot (immutable source of truth for user's original words)
  router.post('/snapshot', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      // Parse and validate the request body
      const parseResult = insertUserOnboardingSnapshotSchema.safeParse({
        ...req.body,
        userId
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: 'Invalid onboarding data',
          details: parseResult.error.issues 
        });
      }
      
      // Check if user already has a snapshot (immutable - one per user)
      const existingSnapshot = await storage.getUserOnboardingSnapshot(userId);
      if (existingSnapshot) {
        return res.status(409).json({ 
          error: 'Onboarding snapshot already exists',
          message: 'User onboarding data is immutable and cannot be overwritten',
          existingSnapshot
        });
      }
      
      // Create the immutable snapshot
      const snapshot = await storage.createUserOnboardingSnapshot(parseResult.data);
      
      console.log(`[Onboarding] Created snapshot for user ${userId}:`, {
        hasCompany: !!parseResult.data.company,
        hasGoals: !!parseResult.data.userGoals,
        hasProduct: !!parseResult.data.product
      });
      
      res.status(201).json({ 
        success: true,
        snapshot 
      });
      
    } catch (error) {
      console.error('Error creating onboarding snapshot:', error);
      res.status(500).json({ 
        error: 'Failed to save onboarding data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get user's onboarding snapshot
  router.get('/snapshot', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const snapshot = await storage.getUserOnboardingSnapshot(userId);
      
      if (!snapshot) {
        return res.status(404).json({ error: 'No onboarding snapshot found' });
      }
      
      res.json({ snapshot });
    } catch (error) {
      console.error('Error fetching onboarding snapshot:', error);
      res.status(500).json({ 
        error: 'Failed to fetch onboarding data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.use('/api/onboarding', router);
}