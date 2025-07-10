# Clippr Mobile App

This is the mobile version of Clippr built with Expo and React Native.

## Getting Started

1. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Use the Expo Go app on your phone to scan the QR code, or use an iOS/Android simulator.

## Features

- 📱 **Native Mobile Experience**: Optimized for iOS and Android
- 🎨 **Dark Theme**: Consistent with web app styling
- 📅 **Calendar Management**: View and manage appointments
- 👥 **Client Management**: Access client information on the go
- ⚙️ **Service Management**: Manage your service offerings
- 🔧 **Settings**: Configure app preferences

## Development

- Built with Expo Router for navigation
- NativeWind for Tailwind CSS styling
- TypeScript for type safety
- Vector Icons from Expo

## Building for Production

```bash
# Build for iOS
npm run ios

# Build for Android
npm run android
```

## API Integration

The mobile app can connect to your Clippr web app's API by configuring the base URL in the app settings.