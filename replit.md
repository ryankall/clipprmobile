# Clippr - Mobile Barber & Stylist Management App

## Overview

Clippr is a modern mobile-first web application designed for professional barbers and stylists to manage their business operations. The app provides comprehensive tools for appointment scheduling, client management, service tracking, invoice processing, and portfolio gallery management. Built with a focus on mobile usability and urban aesthetics, Clippr streamlines the workflow for mobile service providers.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme
- **Build Tool**: Vite with custom configuration
- **Mobile-First Design**: PWA-ready with responsive design

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Session Management**: Mock authentication (production-ready auth to be implemented)
- **File Uploads**: Multer for image handling
- **Development**: Hot reload with Vite middleware integration

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless connection
- **ORM**: Drizzle ORM with code-first schema
- **Migration**: Drizzle Kit for schema management
- **Connection Pooling**: Neon serverless pool with WebSocket support

## Key Components

### 1. Client Management System
- **Purpose**: Comprehensive client relationship management
- **Features**: Client profiles, contact information, service history, loyalty tracking
- **Data**: Photos, preferences, notes, visit statistics
- **Architecture**: Full CRUD operations with search and filtering

### 2. Appointment Scheduling
- **Purpose**: Smart appointment booking and calendar management
- **Features**: Time slot management, travel time buffers, mobile navigation
- **Integration**: Address geocoding for mobile service providers
- **Conflict Resolution**: Working hours validation and overlap prevention

### 3. Service & Pricing Management
- **Purpose**: Dynamic service catalog with pricing tiers
- **Categories**: Haircuts, beard services, combination packages, custom services
- **Pricing**: Decimal precision pricing with duration tracking
- **Status**: Active/inactive service toggles

### 4. Invoice & Payment Processing
- **Purpose**: Professional invoicing with integrated payments
- **Payment Methods**: Stripe integration for card payments, cash tracking
- **Features**: Service itemization, tip calculation, tax handling
- **Status Tracking**: Pending, paid, overdue invoice states

### 5. Portfolio Gallery
- **Purpose**: Visual showcase of work with client consent management
- **Media Types**: Before/after photos, portfolio pieces, client work
- **Privacy**: Public/private visibility controls
- **Storage**: File upload with image optimization

### 6. Dashboard Analytics
- **Purpose**: Business performance overview and quick actions
- **Metrics**: Revenue tracking, appointment statistics, client analytics
- **Quick Actions**: Automated messaging, navigation shortcuts
- **Real-time Updates**: Live appointment status and notifications

## Data Flow

### 1. Authentication Flow
- Mock authentication system (temporary)
- Session-based user identification
- Protected route middleware
- Production: JWT or session-based auth to be implemented

### 2. Data Persistence Flow
```
Client Request → Express Route Handler → Drizzle ORM → PostgreSQL → Response
```

### 3. File Upload Flow
```
Client → Multer Middleware → Memory Storage → File Processing → Database Record
```

### 4. Real-time Updates
- TanStack Query for optimistic updates
- Automatic cache invalidation
- Background data synchronization

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless
- **Payment Processing**: Stripe (v7.4.0)
- **UI Components**: Radix UI primitives
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns for date manipulation

### Development Dependencies
- **Build**: Vite with React plugin
- **Type Checking**: TypeScript with strict mode
- **Linting**: Built-in TypeScript checking
- **Development**: tsx for TypeScript execution

### Optional Integrations
- **Maps**: Google Maps integration for navigation
- **Notifications**: Push notification system (to be implemented)
- **Analytics**: Usage tracking (to be implemented)

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot reload
- **Database**: Neon development database
- **Port Configuration**: Development on port 5000
- **File Watching**: Automatic restart on server changes

### Production Deployment
- **Platform**: Replit autoscale deployment
- **Build Process**: Vite build + ESBuild server bundling
- **Static Assets**: Served from dist/public directory
- **Environment Variables**: DATABASE_URL, STRIPE_SECRET_KEY
- **Health Checks**: Express server health endpoints

### Build Configuration
```bash
# Development
npm run dev

# Production Build
npm run build

# Production Start
npm run start
```

## Changelog

```
Changelog:
- June 28, 2025. Implemented intelligent scheduling with real-time travel time calculations using Google Maps API - replaces fixed appointment buffers with dynamic travel time estimates plus grace periods, includes home base address configuration, smart buffer settings, travel time validation API endpoints, appointment conflict detection with user feedback, and automatic scheduling optimization based on actual route calculations
- June 27, 2025. Added comprehensive payment receiving functionality with Stripe Connect integration - includes payment settings section in settings page, account connection flow, status display, dashboard access, backend API endpoints for account linking and status checking, proper error handling with setup instructions, and professional onboarding workflow
- June 27, 2025. Fixed critical authentication security vulnerabilities - added requireAuth middleware to all protected routes, updated all endpoints to use authenticated user ID instead of hardcoded demo user, replaced black circle in dashboard with clickable profile picture showing user photo or initials fallback, confirmed profile updates working correctly
- June 27, 2025. Updated authentication page styling to professional dark theme - changed from light amber/orange background to dark charcoal, updated card to dark theme, made all text white for better contrast, and changed tagline to "Simplifying the business side of your style game."
- June 27, 2025. Implemented comprehensive authentication system with sign-up/sign-in pages, email/password authentication, Google OAuth (optional), Apple Sign In (optional for iOS), phone number requirement for signup, JWT token management, session handling, protected routes, and sign-out functionality
- June 27, 2025. Enhanced settings page with comprehensive profile editing functionality - added pencil edit icon, current profile display, photo upload with JPEG/PNG/WEBP support only, HEIC blocking, file size validation, and horizontal upload button layout with improved visibility
- June 27, 2025. Added user profile API endpoints (GET /api/user/profile, PATCH /api/user/profile) with proper database schema updates for profile photos, service area, and about fields
- June 27, 2025. Added validation to prevent scheduling appointments in the past - includes both frontend form validation and backend API validation
- June 27, 2025. Fixed appointment creation 400 errors by properly handling date parsing and service price/duration population
- June 27, 2025. Fixed client list display bug where "0" was appearing due to improper conditional logic in totalVisits rendering
- June 26, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```