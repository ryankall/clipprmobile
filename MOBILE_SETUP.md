# Clippr Mobile App Setup Guide

This project now includes a complete mobile application built with Expo and React Native, designed to work alongside your existing web application.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (optional, but recommended)
- iOS Simulator (Mac) or Android Studio (for testing)

### 1. Install Expo CLI (Optional)
```bash
npm install -g @expo/cli
```

### 2. Set up the Mobile App
```bash
cd mobile
npm install
```

### 3. Start Development
```bash
# Start the Expo development server
npm start

# Or run directly:
npx expo start
```

### 4. Run on Device/Simulator
- **Physical Device**: Install Expo Go app and scan the QR code
- **iOS Simulator**: Press `i` in the terminal
- **Android Simulator**: Press `a` in the terminal

## 📱 App Features

### Core Functionality
- **Dashboard**: Overview of daily statistics and quick actions
- **Calendar**: View and manage appointments by time slots
- **Clients**: Browse and search client database
- **Services**: Manage service offerings and pricing
- **Settings**: User profile and app configuration

### Technical Features
- **Dark Theme**: Consistent with web app styling
- **Native Navigation**: Tab-based navigation optimized for mobile
- **Responsive Design**: Optimized for both iOS and Android
- **TypeScript**: Full type safety throughout the app
- **NativeWind**: Tailwind CSS styling for React Native

## 🛠 Development Structure

```
mobile/
├── app/                    # Main app screens (Expo Router)
│   ├── _layout.tsx        # Root layout with navigation
│   ├── index.tsx          # Welcome screen
│   ├── auth.tsx           # Authentication screen
│   └── (tabs)/            # Tab navigation
│       ├── _layout.tsx    # Tab layout configuration
│       ├── index.tsx      # Dashboard
│       ├── calendar.tsx   # Calendar view
│       ├── clients.tsx    # Client management
│       ├── services.tsx   # Service management
│       └── settings.tsx   # Settings
├── assets/                # App icons and images
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind CSS configuration
├── metro.config.js       # Metro bundler configuration
├── babel.config.js       # Babel configuration
└── tsconfig.json         # TypeScript configuration
```

## 🔧 Configuration

### Expo Configuration (app.json)
- **App Name**: Clippr
- **Bundle ID**: com.clippr.app
- **Platform Support**: iOS, Android, Web
- **Theme**: Dark mode optimized
- **Navigation**: Expo Router with typed routes

### Styling
- **NativeWind**: Tailwind CSS for React Native
- **Color Scheme**: Matches web app dark theme
- **Icons**: Expo Vector Icons (Ionicons)

## 📦 Building for Production

### Development Builds
```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### Production Builds
```bash
# Build for app stores
npx expo build:ios
npx expo build:android

# Or using EAS Build (recommended)
npx eas build --platform ios
npx eas build --platform android
```

## 🔄 API Integration

The mobile app is designed to connect to your existing Clippr web application's API endpoints:

- Authentication endpoints
- Client management
- Appointment scheduling
- Service management
- Settings and preferences

### Configuration
Update the API base URL in the mobile app configuration to point to your web application's backend.

## 🎨 Customization

### Brand Colors
Update `tailwind.config.js` to match your brand:

```javascript
colors: {
  primary: "#22c55e",      // Your brand primary color
  background: "#0F0F0F",   // Dark background
  // ... other colors
}
```

### App Icons
Replace the SVG files in `mobile/assets/` with your custom icons:
- `icon.svg` - App icon
- `splash.svg` - Splash screen
- `adaptive-icon.svg` - Android adaptive icon
- `favicon.svg` - Web favicon

## 🚀 Next Steps

1. **API Integration**: Connect mobile app to your web backend
2. **Authentication**: Implement OAuth and JWT token handling
3. **Push Notifications**: Add native push notification support
4. **Camera Integration**: Add photo capture for client gallery
5. **Maps Integration**: Add location services for travel appointments
6. **Offline Support**: Implement offline data caching

## 📝 Development Notes

- The mobile app shares the same data models as your web application
- UI components are optimized for touch interactions
- Navigation uses native patterns for each platform
- All screens support both light and dark themes
- The app is PWA-ready for web deployment

## 🐛 Troubleshooting

### Common Issues
1. **Metro bundler errors**: Clear cache with `npx expo start --clear`
2. **iOS simulator issues**: Reset simulator or update Xcode
3. **Android emulator**: Ensure Android Studio is properly configured
4. **Dependency conflicts**: Delete `node_modules` and reinstall

### Support
For issues specific to Expo development, consult the [Expo Documentation](https://docs.expo.dev/).

---

Your Clippr mobile app is now ready for development! The app provides a solid foundation that mirrors your web application's functionality while offering a native mobile experience.