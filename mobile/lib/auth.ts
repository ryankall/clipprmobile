// Simple in-memory storage for now (replace with AsyncStorage later)
let token: string | null = null;

export async function getToken(): Promise<string | null> {
  return token;
}

export async function setToken(newToken: string): Promise<void> {
  token = newToken;
}

export async function removeToken(): Promise<void> {
  token = null;
}

export async function isAuthenticated(): Promise<boolean> {
  return !!token;
}