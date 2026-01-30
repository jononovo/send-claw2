import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Safely parse JSON with better error handling
async function safeJsonParse(res: Response): Promise<any> {
  // Clone the response first before any consumption
  const clonedRes = res.clone();
  
  try {
    return await res.json();
  } catch (error) {
    console.error('JSON parsing error:', {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      error
    });
    
    // Get the text content for debugging using the cloned response
    try {
      const text = await clonedRes.text();
      console.error('Response that failed to parse:', {
        text: text.substring(0, 500), // Log only first 500 chars to avoid huge logs
        contentType: res.headers.get('content-type')
      });
    } catch (cloneError) {
      console.error('Could not clone response for debugging:', cloneError);
    }
    
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    console.log(`API Request: ${method} ${url}`, {
      hasData: !!data,
      timestamp: new Date().toISOString()
    });
    
    // Get Firebase token from localStorage if available
    const authToken = localStorage.getItem('authToken');
    
    // Prepare headers
    const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
    
    // Add auth token if available
    // BUT skip auth headers for token-based endpoints (daily outreach)
    const isTokenBasedEndpoint = url.includes('/daily-outreach/batch/');
    
    if (authToken && !isTokenBasedEndpoint) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const res = await fetch(url, {
      method: method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Request Error: ${method} ${url}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle array query keys properly
    // If queryKey is ['/api/campaigns', 37], build URL as '/api/campaigns/37'
    let url: string;
    if (Array.isArray(queryKey) && queryKey.length > 1) {
      // Join array elements with '/' for hierarchical paths
      url = queryKey.join('/');
    } else {
      url = queryKey[0] as string;
    }
    
    try {
      
      // Get Firebase token from localStorage if available
      const authToken = localStorage.getItem('authToken');
      
      // Set up headers with auth token if available
      // BUT skip auth headers for token-based endpoints (daily outreach)
      const headers: HeadersInit = {};
      const isTokenBasedEndpoint = url.includes('/daily-outreach/batch/');
      
      if (authToken && !isTokenBasedEndpoint) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const res = await fetch(url, {
        credentials: "include",
        headers
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await safeJsonParse(res);
    } catch (error) {
      console.error(`Query error for ${url}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
