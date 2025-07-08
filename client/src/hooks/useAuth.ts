import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export function useAuth() {
  const queryClient = useQueryClient();

  // Get current user
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: (error: any) => {
      // Handle authentication failures
      if (error?.message?.includes('401') || error?.message?.includes('Authentication')) {
        // Clear token and redirect to login
        localStorage.removeItem("token");
        queryClient.clear();
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      }
    },
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/signout");
    },
    onSuccess: () => {
      // Clear token and user data
      localStorage.removeItem("token");
      queryClient.clear();
      // Redirect to root path which will show Auth component for unauthenticated users
      window.location.href = "/";
    },
  });

  const signOut = () => {
    signOutMutation.mutate();
  };

  // Check if user is authenticated (user exists and no error, also check token)
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");
  const isAuthenticated = !!user && !error && hasToken;

  return {
    user,
    isLoading,
    isAuthenticated,
    hasToken,
    signOut,
    isSigningOut: signOutMutation.isPending,
    authError: error,
  };
}