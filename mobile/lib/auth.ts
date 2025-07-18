import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@clippr_auth_token';

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
}

export async function setToken(newToken: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
  } catch (error) {
    console.error('Failed to set token:', error);
  }
}

export async function removeToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove token:', error);
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}