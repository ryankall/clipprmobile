# Clippr - Comprehensive Unit Test Suite Documentation

## Overview

This document outlines the comprehensive unit test suite for the Clippr mobile barber management application. The test suite covers all major functionality including authentication, client management, appointment scheduling, service management, payment processing, and the public booking system.

## Test Architecture

### Technology Stack
- **Testing Framework**: Vitest (fast Vite-native test runner)
- **Testing Library**: @testing-library/react for React component testing
- **Mocking**: MSW (Mock Service Worker) for API mocking
- **Assertions**: Jest-compatible assertions via Vitest
- **Test Environment**: jsdom for browser environment simulation

### Project Structure
```
client/src/test/
├── setup.ts                    # Global test configuration
├── mocks/
│   └── server.ts              # MSW API mocking setup
├── components/
│   ├── AppointmentCard.test.tsx
│   ├── PendingAppointments.test.tsx
│   ├── ClientForm.test.tsx
│   └── ServiceForm.test.tsx
├── pages/
│   ├── Dashboard.test.tsx
│   ├── Calendar.test.tsx
│   ├── Clients.test.tsx
│   ├── ClientProfile.test.tsx        # NEW: Client deletion & VIP display tests
│   └── BookingNew.test.tsx
├── utils/
│   ├── appointmentUtils.test.ts
│   ├── authUtils.test.ts
│   ├── clientUtils.test.ts           # NEW: VIP status utility tests
│   └── dateUtils.test.ts
├── pendingSlotLocking.test.ts        # NEW: Comprehensive slot locking tests
├── appointmentConflictDetection.test.ts
├── bookingFlowEdgeCases.test.ts
├── stripeEdgeCases.test.ts
├── concurrency.test.ts
├── functional.test.ts
├── invoiceNotifications.test.ts      # NEW: Email/SMS notification system tests
├── invoiceDelivery.test.ts           # NEW: Complete invoice delivery & payment tests
├── premiumAutoChargingSystem.test.ts # NEW: Premium subscription auto-charging tests
└── components.test.ts

server/test/
├── storage.test.ts            # Database operations testing
├── routes.test.ts             # API endpoint testing
├── auth.test.ts               # Authentication testing
└── travelTimeService.test.ts  # Travel time calculations
```

## Test Categories

### 1. New Critical Business Logic Tests (Latest)

#### Booking Message Travel Information Tests
**File**: `__tests__/bookingMessage.test.ts`
**Purpose**: Validates travel information display and calculations in booking request messages

**Tests Covered**:
- ✅ Travel: No scenarios (2 tests) - Validates "Travel: No" when travel declined or address missing
- ✅ Travel: Yes scenarios (4 tests) - Tests travel time calculation from home base or previous appointment
- ✅ Email display (2 tests) - Ensures full email addresses without truncation (fixes chicken@gmail.com issue)
- ✅ Transportation modes (2 tests) - Validates driving/walking/cycling/transit mode handling
- ✅ Mapbox API integration for real travel time calculations
- ✅ Previous appointment location detection for accurate origin
- ✅ Graceful error handling when travel calculation fails

**Business Impact**: Ensures booking messages include accurate travel information and proper email display for barber review.

#### Premium Auto-Charging System Tests
**File**: `__tests__/premiumAutoChargingSystem.test.ts`
**Purpose**: Validates comprehensive premium subscription auto-charging functionality and business logic

**Tests Covered**:
- ✅ Auto-Charging Logic (5 tests) - Premium users are automatically charged at billing period end unless cancelled
- ✅ Subscription Status Checks (3 tests) - Identifies which subscriptions will auto-charge vs cancelled/past due
- ✅ Webhook Event Processing (3 tests) - Processes Stripe webhooks for payment success/failure/cancellation
- ✅ Billing Cycle Edge Cases (3 tests) - Handles billing attempts before period end, period updates, multiple cycles
- ✅ Customer Access Management (2 tests) - Maintains premium access until period ends for cancelled users
- ✅ Payment Recovery (1 test) - Attempts payment recovery for past due subscriptions

**Business Impact**: Ensures premium plan subscribers are automatically charged monthly/yearly renewals unless they cancel their subscription, preventing manual billing issues and maintaining continuous service for paying customers.

#### Pending Slot Locking Tests
**File**: `client/src/test/pendingSlotLocking.test.ts`
**Purpose**: Validates the critical bug fix for pending appointment slot blocking

**Tests Covered**:
- ✅ Pending appointments properly block availability slots
- ✅ Confirmed appointments continue to block slots
- ✅ Cancelled appointments do NOT block slots  
- ✅ Expired appointments do NOT block slots
- ✅ Duration-based blocking works correctly (60-minute appointment blocks 4 slots)
- ✅ Multiple appointments with mixed statuses handled properly
- ✅ Specific bug case validation (jake boo boo at 9:00am pending)

**Business Impact**: Ensures the public booking system prevents double bookings by correctly excluding time slots for both pending and confirmed appointments.

#### Client Profile Management Tests
**File**: `client/src/test/pages/ClientProfile.test.tsx`
**Purpose**: Tests client deletion functionality and VIP status display

**Tests Covered**:
- ✅ Client deletion during edit mode with confirmation dialog
- ✅ Prevention of deletion without user confirmation
- ✅ VIP client name display logic
- ✅ Client status updates from regular to VIP

#### Client Utility Functions Tests
**File**: `client/src/test/utils/clientUtils.test.ts`
**Purpose**: Validates VIP status utility functions for consistent display

**Tests Covered**:
- ✅ `getClientDisplayName()` returns "Gold" for VIP clients
- ✅ `getClientDisplayName()` returns actual name for regular clients
- ✅ `isVipClient()` correctly identifies VIP status
- ✅ `getClientBadgeText()` returns appropriate badge text
- ✅ Edge cases (null names, undefined status)

### 2. Component Tests

#### AppointmentCard Component
**File**: `client/src/test/components/AppointmentCard.test.tsx`

**Test Coverage**:
- ✅ Renders appointment information correctly (client name, service, price, duration)
- ✅ Handles click events when showClickable is enabled
- ✅ Prevents click events when showClickable is disabled
- ✅ Displays appropriate status badges (confirmed, pending, cancelled)
- ✅ Shows client address when provided
- ✅ Formats appointment time correctly using locale

**Key Scenarios**:
```typescript
describe('AppointmentCard', () => {
  it('renders appointment information correctly')
  it('calls onClick when clicked and showClickable is true')
  it('does not call onClick when showClickable is false')
  it('displays status badge correctly')
  it('shows address when provided')
  it('formats time correctly')
})
```

#### PendingAppointments Component
**File**: `client/src/test/components/PendingAppointments.test.tsx`

**Test Coverage**:
- ✅ Displays loading state during data fetch
- ✅ Shows "no appointments" message when empty
- ✅ Renders pending appointments with correct information
- ✅ Handles confirm appointment action
- ✅ Handles cancel appointment action
- ✅ Updates appointment status after actions
- ✅ Displays appointment count badge

#### ClientForm Component
**Test Coverage**:
- ✅ Form validation for required fields
- ✅ Phone number format validation
- ✅ Email format validation
- ✅ Successful form submission
- ✅ Error handling for duplicate phone numbers
- ✅ Form reset after successful submission

#### ServiceForm Component
**Test Coverage**:
- ✅ Service creation with all required fields
- ✅ Price validation (must be positive number)
- ✅ Duration validation (must be positive integer)
- ✅ Category selection functionality
- ✅ Service activation/deactivation toggle

### 2. Page Tests

#### Dashboard Page
**File**: `client/src/test/pages/Dashboard.test.tsx`

**Test Coverage**:
- ✅ Displays loading state for all components initially
- ✅ Shows dashboard statistics when loaded (earnings, appointment count, clients)
- ✅ Displays "no appointments" message when empty
- ✅ Correctly identifies current vs next appointments based on timing
- ✅ Shows pending appointments section
- ✅ Handles navigation to other pages

**Key Test Scenarios**:
```typescript
describe('Dashboard', () => {
  it('displays loading state initially')
  it('displays dashboard stats when loaded')
  it('displays "no appointments" message when no appointments exist')
  it('displays current and next appointments correctly')
  it('shows pending appointments section')
})
```

#### Calendar Page
**Test Coverage**:
- ✅ Monthly calendar view rendering
- ✅ Appointment display on correct dates
- ✅ Date selection functionality
- ✅ Appointment creation from calendar
- ✅ Working hours display and management
- ✅ Appointment status filtering

#### Clients Page
**Test Coverage**:
- ✅ Client list display with search functionality
- ✅ Client creation form submission
- ✅ Client editing and updates
- ✅ Client deletion with confirmation
- ✅ Client statistics display (total visits, spent)
- ✅ Phone number uniqueness validation

#### Public Booking Page
**Test Coverage**:
- ✅ Barber profile loading by phone number
- ✅ Service selection and pricing display
- ✅ Date and time slot availability checking
- ✅ Client information form validation
- ✅ Booking request submission
- ✅ SMS confirmation flow

### 3. Utility Function Tests

#### Appointment Utils
**File**: `client/src/test/utils/appointmentUtils.test.ts`

**Test Coverage**:
- ✅ Service name display formatting
- ✅ Multiple service concatenation
- ✅ Service name truncation for long names
- ✅ Fallback to primary service when no appointment services
- ✅ Character limit enforcement

**Example Tests**:
```typescript
describe('appointmentUtils', () => {
  describe('getServiceNamesDisplay', () => {
    it('returns single service name when only one service')
    it('returns multiple service names when appointment has multiple services')
    it('truncates service names when exceeding character limit')
    it('handles empty appointment services array')
  })
})
```

#### Auth Utils
**Test Coverage**:
- ✅ Token validation and expiration checking
- ✅ Unauthorized error detection
- ✅ User role and permission checking
- ✅ Session management utilities

#### Date Utils
**Test Coverage**:
- ✅ Timezone conversion accuracy
- ✅ Business hours calculation
- ✅ Appointment overlap detection
- ✅ Date formatting for different locales

### 4. Backend Tests

#### Storage Layer
**File**: `server/test/storage.test.ts`

**Test Coverage**:
- ✅ User CRUD operations (create, read, update, delete)
- ✅ Client management with unique phone validation
- ✅ Service management and pricing
- ✅ Appointment scheduling and status management
- ✅ Dashboard statistics calculation
- ✅ Gallery photo management
- ✅ Message and notification handling

**Database Operation Tests**:
```typescript
describe('DatabaseStorage', () => {
  describe('User Operations', () => {
    it('should create a user successfully')
    it('should get user by ID')
    it('should get user by email')
    it('should update user profile')
  })
  
  describe('Client Operations', () => {
    it('should create a client successfully')
    it('should get clients by user ID')
    it('should update client information')
    it('should delete client successfully')
  })
  
  describe('Appointment Operations', () => {
    it('should create an appointment successfully')
    it('should get appointments by user ID')
    it('should get pending appointments')
    it('should update appointment status')
    it('should delete appointment successfully')
  })
})
```

#### API Routes
**File**: `server/test/routes.test.ts`

**Test Coverage**:
- ✅ Authentication middleware validation
- ✅ Request body validation using Zod schemas
- ✅ Error handling and status codes
- ✅ CORS and security headers
- ✅ Rate limiting compliance
- ✅ File upload validation

#### Authentication System
**File**: `server/test/auth.test.ts`

**Test Coverage**:
- ✅ JWT token generation and validation
- ✅ Password hashing and verification
- ✅ Session management
- ✅ Google OAuth integration
- ✅ Apple Sign In integration
- ✅ Password reset flow

#### Travel Time Service
**File**: `server/test/travelTimeService.test.ts`

**Test Coverage**:
- ✅ Google Maps API integration
- ✅ Travel time calculation accuracy
- ✅ Smart buffer calculation
- ✅ Appointment conflict detection
- ✅ Available time slot generation

## Test Data Management

### Mock Data Structure
The test suite uses comprehensive mock data that mirrors production data structures:

```typescript
// User Mock Data
const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  phone: '(555) 123-4567',
  homeBaseAddress: '123 Main St',
  workingHours: { /* comprehensive schedule */ },
  timezone: 'America/New_York'
}

// Client Mock Data
const mockClients = [
  {
    id: 1,
    name: 'John Doe',
    phone: '(555) 987-6543',
    loyaltyStatus: 'gold',
    totalVisits: 15
  }
]

// Service Mock Data
const mockServices = [
  {
    id: 1,
    name: 'Haircut',
    price: '35.00',
    duration: 45,
    category: 'Haircuts'
  }
]
```

### API Mocking Strategy
Using MSW (Mock Service Worker) for realistic API behavior:

```typescript
export const handlers = [
  http.get('/api/auth/me', () => HttpResponse.json(mockUser)),
  http.post('/api/appointments', async ({ request }) => {
    const newAppointment = await request.json();
    // Validation and response logic
    return HttpResponse.json(createdAppointment);
  }),
  // Comprehensive endpoint coverage
]
```

## Test Execution

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test AppointmentCard.test.tsx

# Run tests matching pattern
npm run test appointment
```

### Test Scripts Configuration
**File**: `package.json`
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui"
  }
}
```

## Coverage Requirements

### Minimum Coverage Targets
- **Overall**: 80% line coverage
- **Components**: 85% line coverage
- **Utils**: 90% line coverage
- **API Routes**: 75% line coverage
- **Critical Paths**: 95% line coverage

### Critical Path Testing
The following features require comprehensive test coverage due to business importance:

1. **Appointment Scheduling**: 95% coverage
   - Overlap detection
   - Status management
   - SMS confirmation flow

2. **Public Booking System**: 90% coverage
   - Availability calculation
   - Booking request processing
   - Client information validation

3. **Payment Processing**: 85% coverage
   - Stripe integration
   - Invoice generation
   - Payment status tracking

4. **Authentication**: 90% coverage
   - Login/logout flows
   - Session management
   - Protected route access

## Continuous Integration

### Test Pipeline
```yaml
# GitHub Actions workflow
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run lint
      - run: npm run type-check
```

### Quality Gates
- All tests must pass before merge
- Coverage must not decrease below thresholds
- No TypeScript errors allowed
- ESLint warnings addressed

## Best Practices

### Test Organization
1. **Describe blocks**: Group related tests logically
2. **Clear test names**: Describe expected behavior
3. **Arrange-Act-Assert**: Structure test logic clearly
4. **Mock isolation**: Each test should be independent

### Mock Management
1. **Realistic data**: Mock data should match production schemas
2. **Edge cases**: Include boundary conditions and error states
3. **API consistency**: Mock responses match actual API behavior
4. **State management**: Reset mocks between tests

### Performance Optimization
1. **Parallel execution**: Tests run concurrently where possible
2. **Selective imports**: Import only needed test utilities
3. **Efficient mocking**: Minimize heavy mock setups
4. **Smart watching**: Only re-run affected tests during development

## Maintenance

### Regular Updates
- Update test data when schema changes
- Refresh API mocks when endpoints evolve
- Review coverage reports monthly
- Update testing dependencies quarterly

### Documentation
- Document new test patterns
- Update coverage requirements as app grows
- Maintain mock data documentation
- Record testing decisions and rationale

## Integration Testing

While this document focuses on unit tests, the application also includes:

1. **End-to-End Tests**: Cypress tests for critical user journeys
2. **API Integration Tests**: Testing actual database operations
3. **Performance Tests**: Load testing for appointment booking
4. **Security Tests**: Authentication and authorization validation

## Edge Case Test Coverage

### Advanced Test Files

#### 1. Booking Flow Edge Cases (`bookingFlowEdgeCases.test.ts`)
**Coverage**: SMS confirmation edge cases and timing scenarios
- ✅ Lowercase and misspelled SMS replies with fuzzy matching
- ✅ SMS delay edge cases (30-minute cutoff validation)
- ✅ Duplicate SMS reply handling without errors
- ✅ No reply cleanup logic after timeout
- ✅ Status-based SMS processing (ignoring replies for confirmed/cancelled appointments)
- ✅ Barber cancellation during pending confirmation workflow

#### 2. Appointment Conflict Detection (`appointmentConflictDetection.test.ts`)
**Coverage**: Advanced time slot logic and overlap detection
- ✅ Buffer time validation between appointments
- ✅ Back-to-back appointment conflict detection
- ✅ Travel time integration with Google Maps calculations
- ✅ Daylight Saving Time (DST) transition handling
- ✅ Complex multi-appointment overlap scenarios
- ✅ Status-based conflict exclusion (cancelled/expired appointments)

#### 3. Stripe Edge Cases (`stripeEdgeCases.test.ts`)
**Coverage**: Payment processing edge cases and error handling
- ✅ Incomplete payment scenarios (modal closure, card declined)
- ✅ Multi-currency support and conversion logic
- ✅ Refund calculations with cancellation policies
- ✅ Partial payment and deposit handling
- ✅ Payment method edge cases (expired cards, 3D Secure)
- ✅ Network timeout and retry logic

#### 4. Concurrency and Race Conditions (`concurrency.test.ts`)
**Coverage**: Parallel request handling and data consistency
- ✅ Simultaneous booking attempts with conflict resolution
- ✅ Database locking and transaction management
- ✅ SMS confirmation race conditions
- ✅ Calendar refresh during booking processes
- ✅ Real-time update broadcasting via WebSockets
- ✅ Data consistency across concurrent operations

### Test Statistics
- **Total Test Files**: 8 (4 original + 4 edge case files)
- **Total Test Cases**: 62+ comprehensive tests
- **Edge Case Coverage**: 50+ specific edge cases
- **Business Logic Validation**: 100+ assertions
- **Mock Scenarios**: 20+ realistic API/service mocks

### Critical Edge Cases Covered

1. **Timing and Scheduling**
   - DST transitions and timezone handling
   - Buffer time calculations with travel integration
   - Appointment overlap detection with status exclusions
   - 30-minute SMS confirmation timeouts

2. **Payment Processing**
   - Multi-currency support and formatting
   - Partial payments with deposit logic
   - Refund policies with time-based rules
   - Payment method failures and retries

3. **Concurrency Management**
   - Race condition prevention in booking systems
   - Database transaction rollbacks
   - SMS confirmation deduplication
   - Real-time update synchronization

4. **Error Recovery**
   - Network timeout handling
   - Invalid payment method recovery
   - Appointment status conflict resolution
   - User input validation with fuzzy matching

### Testing Best Practices Implemented

1. **Realistic Mock Data**: All test scenarios use data structures that mirror production schemas
2. **Edge Case Priority**: Focus on business-critical failure scenarios
3. **Async Handling**: Proper Promise.allSettled usage for concurrent operation testing
4. **Error Boundary Testing**: Comprehensive error state validation
5. **Time-based Logic**: Accurate date/time calculations with timezone awareness

## NEW: Invoice Notification System Tests

### File: `__tests__/invoiceNotifications.test.ts`

**Purpose**: Validates email and SMS notification system for invoice delivery

**Test Coverage (21 tests)**:

#### Notification Preferences Validation
- ✅ Validates email preferences when client has email
- ✅ Validates SMS preferences when client has phone
- ✅ Fails validation when email requested but no email available
- ✅ Fails validation when SMS requested but no phone available
- ✅ Validates multiple notification methods together

#### Available Notification Methods Detection
- ✅ Detects email availability for clients with email addresses
- ✅ Detects SMS availability for clients with phone numbers
- ✅ Detects both methods when client has both email and phone
- ✅ Handles clients with no contact methods gracefully

#### Notification Sending Logic
- ✅ Sends email notifications successfully to clients with email
- ✅ Sends SMS notifications successfully to clients with phone
- ✅ Sends both email and SMS notifications when both are available
- ✅ Handles missing email gracefully (skips email, sends SMS)
- ✅ Handles missing phone gracefully (skips SMS, sends email)

#### Notification Cost Calculation
- ✅ Calculates email costs correctly ($0.01 per email)
- ✅ Calculates SMS costs correctly ($0.03 per SMS)
- ✅ Calculates combined costs for multiple notification methods
- ✅ Returns zero cost when no notifications are selected

#### Edge Cases
- ✅ Handles empty client data without errors
- ✅ Handles invalid email format (considers available for service-level validation)
- ✅ Handles invalid phone format (considers available for service-level validation)

**Key Features Tested**:
- Email and SMS notification preference validation
- Client contact method availability detection
- Mock notification service integration
- Cost calculation for notification services
- Graceful handling of missing contact information
- Content generation for email and SMS messages

## NEW: Invoice Delivery & Payment Integration Tests

### File: `__tests__/invoiceDelivery.test.ts`

**Purpose**: Validates complete invoice delivery system with Stripe payment link integration

**Test Coverage (16 tests)**:

#### Stripe Payment Link Generation
- ✅ Generates payment links for stripe payment method
- ✅ Defaults to stripe when payment method is undefined
- ✅ Skips payment link generation for cash payments

#### Email Delivery with Payment Links
- ✅ Sends email with stripe payment link included
- ✅ Sends email with cash payment instructions
- ✅ Handles email delivery failures gracefully

#### SMS Delivery with Payment Links
- ✅ Sends SMS with stripe payment link included
- ✅ Sends SMS with cash payment instructions

#### Multi-Method Delivery
- ✅ Delivers to both email and SMS with stripe payment links
- ✅ Handles partial delivery when one method fails

#### Delivery Validation
- ✅ Validates delivery capabilities correctly
- ✅ Detects missing contact methods

#### Delivery Cost Calculation
- ✅ Calculates email delivery costs ($0.01 per email)
- ✅ Calculates SMS delivery costs ($0.03 per SMS)
- ✅ Calculates Stripe processing fees (2.9% + $0.30)
- ✅ Calculates combined costs for multiple methods

**Key Features Tested**:
- Stripe payment link generation and validation
- Dynamic payment instructions based on payment method
- Email and SMS delivery with payment links
- Multi-channel delivery coordination
- Cost calculation including processing fees
- Error handling for invalid contact information
- Partial delivery scenarios

This comprehensive unit test suite ensures the reliability, maintainability, and quality of the Clippr application across all its features, user interactions, and critical edge cases.