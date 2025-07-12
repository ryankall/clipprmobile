# Clippr Mobile Web App

A comprehensive mobile-first web application for professional barbers and stylists to manage their business operations.

## Features

- **Dashboard**: Real-time business overview with stats, appointments, and quick actions
- **Calendar**: Mobile-optimized appointment scheduling with week/day views
- **Clients**: Complete client management with search, filters, and loyalty tracking
- **Services**: Service catalog management with mobile availability settings
- **Messages**: Booking request management with SMS integration
- **Gallery**: Portfolio photo management with client consent controls
- **Settings**: Profile management, notifications, and security settings

## Mobile-First Design

This app is specifically optimized for mobile devices with:

- Touch-friendly navigation with bottom tab bar
- Responsive design that works on all screen sizes
- Mobile-optimized forms and interactions
- Golden amber theme (#F59E0B) for professional appearance
- Proper modal sizing for mobile viewports

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd mobile/web
npm install
```

### Running the App

```bash
npm run dev
```

The app will start on http://localhost:5001

### Testing

```bash
# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run
```

### Building for Production

```bash
npm run build
```

## API Integration

The mobile app connects to the main Clippr API endpoints:

- Authentication: `/api/auth/*`
- Appointments: `/api/appointments/*`
- Clients: `/api/clients/*`
- Services: `/api/services/*`
- Messages: `/api/messages/*`
- Gallery: `/api/gallery/*`
- User Profile: `/api/user/profile`

## Architecture

- **Frontend**: React 18 with TypeScript
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for lightweight routing
- **Styling**: Tailwind CSS with custom mobile theme
- **Testing**: Vitest with React Testing Library
- **Build Tool**: Vite for fast development and building

## Mobile Testing Coverage

The app includes comprehensive unit tests covering:

- Mobile booking message system
- Mobile travel toggle functionality
- Mobile appointment expiry handling
- Mobile invoice notifications
- Mobile calendar features
- Mobile client management
- Mobile service management

All tests are designed specifically for mobile workflows and user interactions.

## Independent Operation

This mobile app operates independently from the main web application:

- Separate authentication flow
- Independent routing and navigation
- Mobile-specific UI components
- Optimized for touch interactions
- Works without main app sign-in requirement

## Browser Support

- Modern mobile browsers (iOS Safari, Chrome Mobile, Firefox Mobile)
- Progressive Web App (PWA) capabilities
- Responsive design for tablets and desktop as fallback