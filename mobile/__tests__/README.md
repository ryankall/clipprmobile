# Mobile Test Suite - Clippr

This comprehensive mobile test suite covers all the mobile-specific functionality of the Clippr barber management application using React Native Testing Library and mobile-friendly testing patterns.

## Test Structure

### Mobile-Specific Tests
- **Mobile Calendar Features** (`mobileCalendarFeatures.test.tsx`)
- **Mobile Appointment Expiry** (`mobileAppointmentExpiry.test.tsx`)
- **Mobile Block Functionality** (`mobileBlockFunctionality.test.tsx`)
- **Mobile Authentication Failure** (`mobileAuthenticationFailure.test.tsx`)
- **Mobile Travel Toggle** (`mobileTravelToggle.test.tsx`)
- **Mobile Notification Settings** (`mobileNotificationSettings.test.tsx`)

### Test Framework
- **Vitest** - Fast, modern testing framework
- **React Native Testing Library** - Mobile-friendly component testing
- **MSW (Mock Service Worker)** - API mocking for mobile environment
- **Expo Mocks** - Mock React Native and Expo modules

## Key Features Tested

### Mobile Calendar System
- Touch-optimized time slot generation
- Mobile view modes (timeline, list, day)
- Swipe gestures for navigation
- Portrait/landscape orientation support
- Performance optimization for mobile devices

### Mobile Appointment Management
- Push notification integration
- Mobile timezone handling
- Battery-optimized expiry checking
- Haptic feedback integration
- AsyncStorage for persistence

### Mobile Authentication
- AsyncStorage token management
- Device token registration
- Network connectivity handling
- Mobile-specific error handling
- Token refresh mechanisms

### Mobile Block Functionality
- Device info tracking
- Push notification alerts
- Mobile-optimized blocking UI
- Performance optimization for large datasets
- Battery usage optimization

### Mobile Travel Toggle
- React Native geolocation integration
- Mobile location services
- Address autocomplete for mobile
- Travel mode selection (driving, walking, transit)
- Mobile-optimized form handling

### Mobile Notification Settings
- Expo Notifications integration
- Push notification permissions
- Category-specific settings
- Notification scheduling
- Badge management
- Notification channels

## Running Tests

```bash
# Run all mobile tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test mobileCalendarFeatures.test.tsx
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- JSX transformation for React Native
- Mock setup for Expo modules
- AsyncStorage mocking
- React Native environment setup

### Mock Setup (`__tests__/setup.ts`)
- Expo modules mocking
- React Native component mocking
- AsyncStorage mocking
- MSW server setup

### API Mocking (`__tests__/mocks/server.ts`)
- Mock API responses
- Authentication endpoints
- Dashboard data
- Appointments and clients

## Mobile-Specific Testing Patterns

### React Native Testing Library Usage
```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';

// Test mobile component interactions
const { getByTestId } = render(<MobileComponent />);
fireEvent.press(getByTestId('mobile-button'));
```

### AsyncStorage Testing
```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

// Test token storage
await AsyncStorage.setItem('token', 'test_token');
const token = await AsyncStorage.getItem('token');
```

### Mobile Performance Testing
```tsx
// Test mobile-optimized performance
const startTime = performance.now();
// ... mobile operations
const endTime = performance.now();
expect(endTime - startTime).toBeLessThan(100); // Mobile-appropriate timing
```

## Mobile Device Simulation

### Screen Sizes Tested
- iPhone 5: 320x568
- iPhone 11 Pro Max: 414x896
- Various Android devices

### Orientation Testing
- Portrait mode: 375x667
- Landscape mode: 667x375

### Network Conditions
- WiFi connectivity
- Cellular connectivity
- Offline scenarios

## Performance Benchmarks

### Mobile-Optimized Expectations
- Calendar rendering: < 100ms
- Authentication flows: < 500ms
- Large dataset handling: < 1000ms
- Memory usage: < 50MB increase
- Battery optimization: Minimal background processing

## Coverage Requirements

### Minimum Coverage Targets
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 85%
- **Lines**: 80%

### Mobile-Specific Coverage
- Touch interactions
- Gesture handling
- Device capabilities
- Network states
- Performance scenarios

## Best Practices

### Mobile Test Writing
1. Use React Native Testing Library for component testing
2. Mock Expo modules appropriately
3. Test touch interactions, not just clicks
4. Consider mobile performance constraints
5. Test both online and offline scenarios

### Mobile Performance Testing
1. Test with realistic mobile performance budgets
2. Include battery usage considerations
3. Test memory management
4. Validate mobile-specific optimizations

### Mobile Integration Testing
1. Test AsyncStorage persistence
2. Validate push notification flows
3. Test location services integration
4. Verify mobile-specific UI interactions

## Continuous Integration

### Mobile CI Pipeline
```yaml
# Example GitHub Actions for mobile tests
- name: Run Mobile Tests
  run: |
    cd mobile
    npm install
    npm run test:coverage
```

### Test Reporting
- Coverage reports for mobile-specific code
- Performance benchmarks
- Mobile compatibility validation

## Debugging

### Mobile Test Debugging
```bash
# Run with verbose output
npm run test -- --verbose

# Run single test with debugging
npm run test -- --t "specific test name"

# Run with React Native logs
npm run test -- --verbose --no-coverage
```

### Common Issues
1. **AsyncStorage not mocked**: Ensure proper mocking in setup
2. **Expo modules failing**: Check mock configuration
3. **Performance tests failing**: Adjust timing expectations for mobile
4. **Network tests failing**: Verify MSW setup

## Future Enhancements

### Planned Test Additions
- E2E testing with Detox
- Visual regression testing
- Accessibility testing
- Device-specific testing
- App store validation testing

### Performance Monitoring
- Real device testing
- Battery usage monitoring
- Network performance testing
- Memory leak detection

---

This mobile test suite ensures comprehensive coverage of all mobile-specific functionality while maintaining high performance standards and mobile-first design principles.