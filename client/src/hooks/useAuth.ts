import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName?: string;
  photoUrl?: string;
  serviceArea?: string;
  about?: string;
}

interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export function useAuth() {
  const queryClient = useQueryClient();

  // Get current user
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      window.location.href = "/auth";
    },
  });

  const signOut = () => {
    signOutMutation.mutate();
  };

  // Check if user is authenticated
  const isAuthenticated = !!user && !error;

  // Check if there's a token in localStorage
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");

  return {
    user,
    isLoading,
    isAuthenticated,
    hasToken,
    signOut,
    isSigningOut: signOutMutation.isPending,
  };
}