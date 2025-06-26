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
- June 26, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```