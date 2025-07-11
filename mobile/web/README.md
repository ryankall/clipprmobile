# Clippr Mobile Web App

This is the standalone mobile web application for Clippr, designed for mobile barbers and stylists.

## Features

- **Dashboard**: Mobile-optimized dashboard with earnings stats, appointment overview, and gallery
- **Calendar**: Timeline and list view calendar with appointment management
- **Appointment Creation**: Native mobile appointment creation with service selection and client management
- **Mobile-First Design**: Golden theme (#F59E0B) with bottom navigation optimized for touch interfaces
- **Responsive Interface**: Designed specifically for mobile screens and touch interactions

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
cd mobile/web
npm install
```

### Development Server

```bash
npm run dev
```

The mobile app will be available at `http://localhost:5001`

### Build

```bash
npm run build
```

### API Integration

The mobile app connects to the main Clippr backend server running on port 5000. The Vite development server is configured to proxy API requests to the backend.

## Architecture

- **Framework**: React 18 with TypeScript
- **State Management**: TanStack Query for server state
- **Styling**: Tailwind CSS with mobile-first approach
- **Build Tool**: Vite
- **Icons**: Lucide React

## Mobile-Specific Features

- **Touch-Optimized Navigation**: Bottom tab navigation for easy thumb access
- **Mobile Timeline**: Hourly timeline view optimized for mobile screens
- **Responsive Cards**: All interface elements sized for mobile viewing
- **Service Selection**: Quantity controls for service selection
- **Mobile Appointment Creation**: Step-by-step appointment creation flow

## Deployment

The mobile web app can be deployed independently from the main client application, allowing for separate mobile and desktop experiences.