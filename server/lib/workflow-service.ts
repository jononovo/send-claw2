import { logOutgoingRequest, logHttpStatus } from "./webhook-logger";

// Default N8N workflow webhook URL - this should be configurable in production
const DEFAULT_N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "https://n8n.5ducks.io/webhook/5-ducks-search-workflow";

// Provider-specific workflow webhook URLs
const PROVIDER_WEBHOOK_URLS: Record<string, string> = {
  "lion": process.env.LION_WEBHOOK_URL || "https://n8n.5ducks.io/webhook/lion-workflow",
  "rabbit": process.env.RABBIT_WEBHOOK_URL || "https://lead-rabbit.replit.app/api/search",
  "donkey": process.env.DONKEY_WEBHOOK_URL || "https://n8n.5ducks.io/webhook/donkey-workflow"
};

interface WorkflowRequestOptions {
  additionalParams?: Record<string, any>;
  customWebhookUrl?: string;
}

/**
 * Sends a search request to the N8N workflow
 */
export async function sendSearchRequest(query: string, options: WorkflowRequestOptions = {}): Promise<{
  success: boolean;
  searchId: string;
  message?: string;
  error?: string;
}> {
  // Generate a unique search ID
  const searchId = `search_${Date.now()}`;
  
  // Get the workflow provider and custom URLs from additional params, if any
  const provider = options.additionalParams?.provider?.toLowerCase() || null;
  const targetUrl = options.additionalParams?.targetUrl;
  const resultsUrl = options.additionalParams?.resultsUrl;
  
  // Get the webhook URL based on provider or use custom URL or default
  let webhookUrl = options.customWebhookUrl || DEFAULT_N8N_WEBHOOK_URL;
  
  // If we have a custom target URL, use it
  if (targetUrl) {
    webhookUrl = targetUrl;
    console.log(`Using custom target URL: ${webhookUrl}`);
  }
  // Otherwise, if we have a valid provider, use its specific URL
  else if (provider && PROVIDER_WEBHOOK_URLS[provider]) {
    webhookUrl = PROVIDER_WEBHOOK_URLS[provider];
    console.log(`Using ${provider} webhook URL: ${webhookUrl}`);
  }
  
  // Determine the callback URL
  let callbackUrl = `${process.env.API_BASE_URL || ""}/api/webhooks/workflow/results/unknown/node/webhook_trigger-${Date.now()}`;
  
  // If a resultsUrl was specified, use that instead
  if (resultsUrl) {
    callbackUrl = resultsUrl;
    console.log(`Using custom results URL: ${callbackUrl}`);
  }
  
  // Prepare the request payload
  const payload = {
    query, 
    searchId,
    callbackUrl,
    ...options.additionalParams
  };
  
  try {
    // Log the outgoing request
    const requestId = await logOutgoingRequest(searchId, webhookUrl, payload);
    
    console.log(`Sending search request: ${searchId} - Query: "${query}"`);
    
    // Make the API request
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.N8N_API_KEY || ""}`
      },
      body: JSON.stringify(payload)
    });
    
    // Read the response
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { rawResponse: responseText };
    }
    
    // Log the HTTP status
    await logHttpStatus(
      requestId,
      response.status,
      response.statusText,
      responseData
    );
    
    // Check response status
    if (!response.ok) {
      throw new Error(`N8N API error: ${response.status} ${response.statusText}`);
    }
    
    return {
      success: true,
      searchId,
      message: "Search request submitted successfully"
    };
  } catch (error) {
    console.error(`Search request failed: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      searchId,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * A function to handle keep-alive mechanism for long-running searches.
 * This function can be called to start a timer that will periodically ping
 * the server to keep it awake during long-running searches.
 */
const keepAliveTimers: Record<string, NodeJS.Timeout> = {};

export function startKeepAlive(searchId: string, minutes = 15): void {
  console.log(`Starting keep-alive for search ${searchId} (${minutes} minutes)`);
  
  // Clear any existing timer for this search
  if (keepAliveTimers[searchId]) {
    clearInterval(keepAliveTimers[searchId]);
  }
  
  // Calculate interval and end time
  const intervalMs = 30 * 1000; // 30 seconds
  const endTime = Date.now() + (minutes * 60 * 1000);
  
  // Start the interval
  keepAliveTimers[searchId] = setInterval(() => {
    const remaining = endTime - Date.now();
    
    // If time is up, clear the interval
    if (remaining <= 0) {
      console.log(`Keep-alive for search ${searchId} completed`);
      clearInterval(keepAliveTimers[searchId]);
      delete keepAliveTimers[searchId];
      return;
    }
    
    // Log a keep-alive message
    console.log(`Keep-alive ping for search ${searchId} - ${Math.ceil(remaining / 60000)} minutes remaining`);
    
    // Make a simple request to keep the server awake
    // This could be changed to ping a specific endpoint if needed
    fetch("/api/ping").catch(() => {});
  }, intervalMs);
}

/**
 * Stop a running keep-alive timer
 */
export function stopKeepAlive(searchId: string): void {
  if (keepAliveTimers[searchId]) {
    console.log(`Stopping keep-alive for search ${searchId}`);
    clearInterval(keepAliveTimers[searchId]);
    delete keepAliveTimers[searchId];
  }
}