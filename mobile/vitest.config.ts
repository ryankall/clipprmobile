// /// <reference types="vitest" />
// import { defineConfig } from 'vitest/config';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//   plugins: [react()],
//   test: {
//     globals: true,
//     environment: 'node', // Changed from jsdom to node for React Native
//     setupFiles: ['./__tests__/setup.ts'],
//     include: ['__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}'],
//     exclude: ['node_modules', 'dist', '.expo'],
//     // Add React Native specific testing configuration
//     testTimeout: 10000,
//     hookTimeout: 10000,
//   },
//   resolve: {
//     alias: {
//       '@': './',
//       'react-native': 'react-native-web', // Map react-native to react-native-web for testing
//     },
//     // Add React Native module resolution
//     extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
//   },
//   define: {
//     __DEV__: true,
//   },
// });

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    globals: true,
    transformMode: {
      web: [/.[jt]sx$/],
    },
    deps: {
      inline: [
        'expo',
        'expo-router',
        'react-native',
        '@react-native',
        '@expo',
        'expo-status-bar',
        'expo-constants',
        'expo-file-system',
        'expo-asset',
        'expo-splash-screen',
      ],
    },
  },
});
