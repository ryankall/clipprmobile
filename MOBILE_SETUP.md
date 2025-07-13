# Clippr Mobile App Setup

## Quick Start

The mobile app shows a blank screen? Follow these steps to get it running:

### 1. Start the Backend API
```bash
npm run dev
```
This starts the backend server on port 5000.

### 2. Start the Mobile App
```bash
cd mobile
npx expo start
```

### 3. Open in Expo Go
- Install "Expo Go" app on your phone
- Scan the QR code from the terminal
- The app should load showing the welcome screen

## If Still Blank Screen

The most common issues:

1. **Missing Dependencies**: Make sure you're in the `mobile/` directory when running `npx expo start`

2. **Network Issues**: The mobile app tries to connect to the backend. Make sure:
   - Backend is running on port 5000
   - Your phone and computer are on the same network
   - The API_BASE_URL in `mobile/lib/api.ts` is correct

3. **Console Logs**: Check the Expo developer console for error messages

## Testing Without Backend

For quick testing, you can use the "Continue as Guest" button on the welcome screen to bypass authentication and see the app interface.

## Development Tips

- Use `console.log` statements to debug
- Check the Expo developer console for errors
- The app starts with a welcome screen that has "Get Started" and "Continue as Guest" buttons
- All screens are designed with dark theme and golden accents

## Architecture

```
Mobile App (React Native/Expo) ←→ Backend API (Node.js/Express)
```

The mobile app is completely separate from the backend and communicates via HTTP requests.