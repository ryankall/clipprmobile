# How to Run Clippr Mobile App

## Architecture Overview

```
Replit (Cloud)           Your Computer (Local)
┌─────────────────┐      ┌─────────────────┐
│  Backend API    │ ←──→ │  Mobile App     │
│  (Node.js)      │      │  (React Native) │
│  Port 5000      │      │  (Expo)         │
└─────────────────┘      └─────────────────┘
```

## What Runs Where

### ✅ On Replit (Cloud)
- **Backend API**: Node.js + Express server
- **Database**: PostgreSQL with Neon
- **API Endpoints**: `/api/auth`, `/api/appointments`, etc.
- **Command**: `npm run dev` (already running)

### ✅ On Your Computer (Local)
- **Mobile App**: React Native + Expo
- **Development**: `cd mobile && npx expo start`
- **Testing**: Expo Go app on your phone

## Step-by-Step Setup

### 1. Keep Replit Running
Your backend API is already running on Replit at:
```
https://your-replit-url.replit.dev
```

### 2. Download Mobile Code
Download the `mobile/` folder from your Replit to your local computer.

### 3. Install Dependencies Locally
```bash
cd mobile
npm install
```

### 4. Update API URL
Edit `mobile/lib/api.ts` to point to your Replit backend:
```typescript
const API_BASE_URL = 'https://your-replit-url.replit.dev';
```

### 5. Start Mobile App
```bash
npx expo start
```

### 6. Test on Device
- Install "Expo Go" app
- Scan QR code
- App connects to Replit backend

## Why This Works

- **Backend**: Runs on Replit (accessible from anywhere)
- **Mobile**: Runs locally with Expo (connects to Replit backend)
- **Database**: Hosted on Neon (accessible from both)

## Alternative: Web Version

If you want to run everything on Replit, you could create a web version of the mobile app using the same React components but with web-specific navigation and styling.

## Deployment

- **Backend**: Deploy Replit to production
- **Mobile**: Deploy to App Store/Google Play via Expo
- **Database**: Already hosted on Neon

The mobile app is designed to work as a separate client that connects to your Replit backend API.