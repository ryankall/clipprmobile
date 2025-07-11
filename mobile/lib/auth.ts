const TOKEN_KEY = 'auth_token';

export async function getToken(): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

export async function setToken(newToken: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(TOKEN_KEY, newToken);
    }
  } catch (error) {
    console.error('Error setting token:', error);
  }
}

export async function removeToken(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error removing token:', error);
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}