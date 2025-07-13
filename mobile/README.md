# Clippr Mobile App - React Native

A native mobile application for iOS and Android built with React Native and Expo.

## Overview

The Clippr mobile app provides barbers and stylists with a native mobile experience for managing their business on-the-go. The app connects to the main Clippr backend API for data synchronization.

## Features

- **Dashboard**: Daily earnings, appointment counts, client statistics
- **Calendar**: Timeline and list view of appointments with date navigation
- **Clients**: Client management with search and profile views
- **Services**: Service management with categories and pricing
- **Settings**: Profile management and app preferences
- **Authentication**: Sign-in/sign-up with social login options

## Tech Stack

- **React Native**: 0.76.0
- **Expo**: ~52.0.0
- **Expo Router**: File-based routing
- **TypeScript**: Full type safety
- **NativeWind**: Tailwind CSS for React Native
- **Expo Vector Icons**: Icon library

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio/Emulator (for Android development)

### Installation

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

### Running on Devices

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

### Using Expo Go

1. Install Expo Go on your device
2. Run `npm start` 
3. Scan the QR code with Expo Go (Android) or Camera app (iOS)

## Project Structure

```
mobile/
├── app/                    # App screens with file-based routing
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Dashboard
│   │   ├── calendar.tsx   # Calendar
│   │   ├── clients.tsx    # Client list
│   │   ├── services.tsx   # Service management
│   │   └── settings.tsx   # Settings
│   ├── _layout.tsx        # Root layout
│   ├── auth.tsx           # Authentication screen
│   └── index.tsx          # Welcome screen
├── assets/                # App icons and images
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and types
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── README.md             # This file
```

## API Integration

The mobile app connects to the main Clippr backend API:
- Authentication endpoints
- Dashboard data
- Appointment management
- Client management
- Service management

API configuration is in `lib/api.ts` with automatic token management.

## Theme

The app uses a dark theme with golden accents:
- Primary: #F59E0B (Golden yellow)
- Background: #0F0F0F (Dark black)
- Cards: #1A1A1A (Dark gray)
- Text: #FFFFFF (White)

## Development

### Adding New Screens

1. Create new files in `app/` directory
2. Follow Expo Router conventions
3. Use TypeScript for type safety
4. Follow existing styling patterns

### API Requests

Use the `apiRequest` function from `lib/api.ts`:
```typescript
import { apiRequest } from '../lib/api';

const data = await apiRequest<ResponseType>('GET', '/api/endpoint');
```

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

## Deployment

The app can be deployed to:
- Apple App Store (iOS)
- Google Play Store (Android)
- Expo's over-the-air updates

Follow Expo's deployment guide for detailed instructions.

## Contributing

1. Follow React Native and Expo best practices
2. Use TypeScript for all new code
3. Test on both iOS and Android
4. Follow the existing code style
5. Update this README for new features