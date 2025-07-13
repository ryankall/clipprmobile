// Simple in-memory token storage for development
// In production, you would use SecureStore or AsyncStorage
let authToken: string | null = null;

export async function getToken(): Promise<string | null> {
  return authToken;
}

export async function setToken(newToken: string): Promise<void> {
  authToken = newToken;
}

export async function removeToken(): Promise<void> {
  authToken = null;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}