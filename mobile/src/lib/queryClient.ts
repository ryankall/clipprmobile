import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Handle authentication failures
    if (res.status === 401) {
      // Clear any stored tokens
      localStorage.removeItem("token");
      
      // Only redirect if not already on login page
      const isOnLoginPage = window.location.pathname === "/" || window.location.pathname === "/auth";
      if (!isOnLoginPage) {
        // Redirect to authentication after a brief delay
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      }
      
      throw new Error(`Authentication expired. Please sign in again.`);
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: any,
  options: RequestInit = {}
): Promise<any> {
  const token = localStorage.getItem("token");
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: "include",
    ...options,
  };

  if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
    config.body = JSON.stringify(data);
  }

  const res = await fetch(url, config);

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      onError: (error: any) => {
        // Global error handler for authentication failures
        if (error?.message?.includes('Authentication expired')) {
          console.log('Authentication expired, redirecting to login...');
        }
      },
    },
    mutations: {
      retry: false,
      onError: (error: any) => {
        // Global error handler for mutations
        if (error?.message?.includes('Authentication expired')) {
          console.log('Authentication expired during mutation, redirecting to login...');
        }
      },
    },
  },
});
