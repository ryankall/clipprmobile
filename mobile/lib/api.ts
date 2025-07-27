import { getToken } from './auth';

// Use the main server URL for API requests
export const API_BASE_URL = 'https://b22f0720-93ab-4faa-a11e-f9419792ac50-00-3m9qdub93g7mz.kirk.replit.dev';

let data = '';
export interface ApiError {
  message: string;
  status?: number;
}

export class AuthenticationError extends Error {
  status: number;
  constructor(message = 'Authentication required. Please sign in again.') {
    super(message);
    this.name = 'AuthenticationError';
    this.status = 401;
  }
}

export async function apiRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  endpoint: string,
  data?: any
): Promise<T> {
  const token = await getToken();
  
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: 'include', // Include cookies for session-based auth
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Handle authentication failures: do NOT try to parse as JSON, may be HTML
      if (response.status === 401) {
        throw new AuthenticationError();
      }

      // For other errors, try to parse as JSON, but handle parse failures gracefully
      let errorData: any = {};
      let text = '';
      try {
        text = await response.text();
        errorData = JSON.parse(text);
      } catch (jsonError) {
        // Not JSON, log the raw response text before proceeding
        console.error('Failed to parse JSON. Raw response text:', text);
        // leave errorData as empty object
}

      // If the response is HTML (starts with <), show a generic error
      if (text.trim().startsWith('<')) {
        throw new Error(`HTTP ${response.status}: Unexpected HTML response`);
      }

      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    //console.log(url)
    // Read response as text, then try to parse as JSON
    const responseText = await response.text();
    //console.log(responseText)
    try {
      return JSON.parse(responseText);
    } catch (jsonError) {
      // Log the raw response text before throwing
      console.error('Failed to parse JSON. Raw response text:', responseText);
      throw jsonError;
    }
  } catch (error) {
    console.error('API request failed:', error, endpoint);
    throw error;
  }
}