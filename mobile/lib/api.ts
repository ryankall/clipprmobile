import { getToken } from './auth';

// Use the main server URL for API requests
const API_BASE_URL = 'https://b22f0720-93ab-4faa-a11e-f9419792ac50-00-3m9qdub93g7mz.kirk.replit.dev';

export interface ApiError {
  message: string;
  status?: number;
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
      const errorData = await response.json().catch(() => ({}));
      
      // Handle authentication failures
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in again.');
      }
      
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}