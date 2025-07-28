import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient'; 

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="clients/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="gallery/gallery" options={{ headerShown: false }} />
          <Stack.Screen name="appointment-details" options={{ headerShown: false }} />
          <Stack.Screen name="appointments/new" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}