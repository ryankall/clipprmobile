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
- July 2, 2025. Implemented comprehensive overlap detection system with detailed logging - prevents double bookings by checking for appointment conflicts during both creation and confirmation phases, includes timezone-aware overlap calculations, blocks appointments with detailed conflict information and user-friendly error messages, comprehensive logging for debugging appointment timing issues, and robust protection against scheduling conflicts
- July 2, 2025. Added comprehensive timezone support system - added timezone field to user schema with selectable zones (ET, CT, MT, PT, AKT, HST), installed date-fns-tz library for proper timezone handling, timezone selection dropdown in settings page, fixed appointment timing issues with UTC to local conversions, and proper timezone-aware appointment scheduling
- July 1, 2025. Modified appointment creation workflow to enforce SMS confirmation system - all appointment creation (direct barber bookings and public bookings) now creates appointments with "pending" status, SMS confirmation sent to clients automatically, appointments change to "confirmed" status only after SMS confirmation, dashboard shows only confirmed appointments in current/next cards and pending appointments in separate "Pending Confirmations" section, removed reservation system in favor of appointment status-based workflow
- July 1, 2025. Fixed critical TypeScript and authentication issues - resolved dashboard loading problems by updating useAuth hook to properly type User interface from schema, fixed reservation creation bug that was failing due to empty services array validation, enhanced authentication error handling with automatic token cleanup and user redirection for expired sessions, added comprehensive logging for reservation creation debugging, restored proper current vs next appointment distinction with 30-minute detection window
- July 1, 2025. Implemented unique phone number validation across the system - added unique constraints to prevent duplicate phone numbers for both barber accounts and clients, cleaned up existing duplicate records by consolidating data (moved appointments, gallery photos, and messages to kept records), updated signup and client creation endpoints with proper duplicate detection and user-friendly error messages, enforced data integrity at database level with unique indexes
- June 30, 2025. Fixed gallery upload validation error and removed quick invoice card - corrected gallery photo endpoint to include required 'type' field in validation schema, removed quick invoice card from dashboard as requested, cleaned up home page layout
- June 30, 2025. Fixed public booking availability to prevent past time slots - updated availability API to filter out time slots that are in the past when showing today's availability, added 15-minute buffer to prevent bookings too close to current time, system now correctly shows empty availability for past dates and full availability for future dates
- June 30, 2025. Fixed booking workflow to restore correct process - client booking requests now create messages instead of direct reservations, barbers click "Book Appointment" from messages to create 30-minute reservations with SMS confirmation, updated messages page with streamlined booking action that extracts appointment details and creates reservations via new API endpoint, maintains proper workflow separation between client requests and barber confirmation actions
- June 30, 2025. Successfully implemented comprehensive reservation system to prevent double bookings - created reservations database table with temporary holds and expiration tracking, updated booking system to create 30-minute reservations instead of immediate appointments, added SMS confirmation workflow with YES/NO/CANCEL responses, implemented automatic reservation expiration after 30 minutes with background cleanup job, added pending reservations component in dashboard for barbers to manually confirm reservations, updated public availability API to exclude reserved time slots preventing overlapping bookings, and implemented SMS cancellation notifications sent to clients when barbers delete appointments with detailed logging
- June 30, 2025. Successfully implemented Google Places Autocomplete with full functionality - fixed legacy API implementation with comprehensive dark theme styling, manual click handlers for suggestion selection, maximum z-index positioning, proper event propagation control to prevent modal closure, automatic cleanup on modal close, and seamless React Hook Form integration for address field
- June 29, 2025. Implemented Google Places Autocomplete for home base address field - integrated Google Maps JavaScript API with Places library, added automatic initialization when profile edit modal opens, implemented dark theme styling for dropdown suggestions, fixed z-index positioning for modal compatibility, includes proper cleanup and error handling
- June 29, 2025. Fixed message display and scrollbar issues - made all textarea scrollbars invisible using scrollbar-hide class, fixed message content going off screen with proper word wrapping and container sizing, enhanced message dialog in messages page with break-words and max-height constraints
- June 29, 2025. Fixed sign out 404 error - corrected authentication state management in useAuth hook, improved router logic to properly show Auth component for unauthenticated users, fixed redirect path from /auth to / after signout
- June 29, 2025. Enhanced public booking system with user experience improvements - added 300 character limit with real-time counter for optional messages, included travel information (Yes/No with address) in messages sent to barbers, added SMS confirmation notice on booking success pages informing users that barber will send SMS to confirm appointment, fixed booking request phone number format matching between URL parsing and database storage
- June 29, 2025. Enhanced create invoice template modal - removed category, amount, and description fields, limited template name to 60 characters with character counter, added multi-select services section with checkboxes showing service prices and descriptions, automatic total calculation from selected services
- June 29, 2025. Added invoice to navigation bar - positioned right after clients with Receipt icon for easy access
- June 29, 2025. Enhanced create invoice modal - removed manual service amount field, added automatic calculation based on selected services, displays services summary with quantities and prices, calculates subtotal/tip/total automatically when services or tip percentage changes
- June 29, 2025. Fixed combo deletion functionality - templates now properly hide when deleted using localStorage tracking with hiddenDefaultTemplates array
- June 29, 2025. Enhanced booking system with step-by-step flow - implemented comprehensive 6-step booking process (date/time/services/phone/details/confirmation), smart client recognition by phone number that auto-fills returning customer information, working hours management dialog in calendar page, travel service options with conditional address fields, multi-service selection with custom service capability, client lookup API endpoint, and enhanced invoice template system with descriptions and delete functionality
Changelog:
- June 28, 2025. Implemented public booking website system - created shareable booking links for each barber (format: /book/6467891820-clipcutman), public booking page with real-time availability calendar, service selection, client information forms, booking request system that creates messages in barber's inbox, public API endpoints for barber profiles/services/availability, and settings page integration showing shareable booking URL with copy-to-clipboard functionality
- June 28, 2025. Added comprehensive mock data population - seeded database with 6 realistic clients with contact information and preferences, 8 professional services across different categories (haircuts, beard services, combinations), 6 appointments scheduled for today and upcoming days, 5 portfolio gallery photos, 3 unread customer messages, and sample invoices, providing full demonstration of all app features and functionality
- June 28, 2025. Enhanced settings page with Quick Action Settings section - displays default message templates for "On My Way", "Running Late", and "Appointment Confirmation" with placeholder variables, includes explanatory guide for how quick actions work, and placeholder for future custom message creation functionality
- June 28, 2025. Fixed profile edit modal UI issues - implemented hidden scrollbar while maintaining scroll functionality, added comprehensive CSS overrides to prevent white input backgrounds when typing, ensuring consistent dark theme styling across all form fields in the modal
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