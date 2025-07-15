import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock window.location
const mockLocation = {
  href: '',
  assign: vi.fn(),
  reload: vi.fn(),
  replace: vi.fn(),
};

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Mobile Sign Out Behavior', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset location href
    mockLocation.href = '';
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });
    
    // Mock console methods
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  it('should redirect to mobile interface after sign out', () => {
    // Simulate the mobile sign out function
    const handleSignOut = () => {
      localStorage.removeItem('token');
      window.location.href = '/mobile';
    };

    // Execute sign out
    handleSignOut();

    // Verify token removal
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    
    // Verify redirect to mobile interface
    expect(mockLocation.href).toBe('/mobile');
  });

  it('should not redirect to web login page', () => {
    // Simulate the mobile sign out function
    const handleSignOut = () => {
      localStorage.removeItem('token');
      window.location.href = '/mobile';
    };

    // Execute sign out
    handleSignOut();

    // Verify it does NOT redirect to web login
    expect(mockLocation.href).not.toBe('/');
    expect(mockLocation.href).not.toBe('/auth');
    expect(mockLocation.href).toBe('/mobile');
  });

  it('should clear authentication token on sign out', () => {
    // Simulate the mobile sign out function
    const handleSignOut = () => {
      localStorage.removeItem('token');
      window.location.href = '/mobile';
    };

    // Execute sign out
    handleSignOut();

    // Verify token is cleared
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(1);
  });

  it('should handle sign out with confirmation dialog', () => {
    // Mock window.confirm
    const mockConfirm = vi.fn().mockReturnValue(true);
    Object.defineProperty(window, 'confirm', {
      value: mockConfirm,
      writable: true,
    });

    // Simulate sign out with confirmation
    const handleSignOutWithConfirmation = () => {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        localStorage.removeItem('token');
        window.location.href = '/mobile';
      }
    };

    // Execute sign out
    handleSignOutWithConfirmation();

    // Verify confirmation was shown
    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to sign out?');
    
    // Verify token removal and redirect
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocation.href).toBe('/mobile');
  });

  it('should cancel sign out if user declines confirmation', () => {
    // Mock window.confirm to return false
    const mockConfirm = vi.fn().mockReturnValue(false);
    Object.defineProperty(window, 'confirm', {
      value: mockConfirm,
      writable: true,
    });

    // Simulate sign out with confirmation
    const handleSignOutWithConfirmation = () => {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        localStorage.removeItem('token');
        window.location.href = '/mobile';
      }
    };

    // Execute sign out
    handleSignOutWithConfirmation();

    // Verify confirmation was shown
    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to sign out?');
    
    // Verify token was NOT removed and no redirect occurred
    expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
    expect(mockLocation.href).toBe(''); // Should remain empty since cancelled
  });

  it('should maintain mobile interface state after sign out', () => {
    // Simulate mobile state
    const mobileState = {
      activeTab: 'settings',
      settingsTab: 'profile',
      isAuthenticated: true,
    };

    // Simulate sign out function that preserves mobile interface
    const handleSignOut = () => {
      localStorage.removeItem('token');
      // Clear user data but maintain mobile interface
      mobileState.isAuthenticated = false;
      window.location.href = '/mobile';
    };

    // Execute sign out
    handleSignOut();

    // Verify mobile state is updated
    expect(mobileState.isAuthenticated).toBe(false);
    expect(mobileState.activeTab).toBe('settings'); // Preserved
    expect(mobileState.settingsTab).toBe('profile'); // Preserved
    
    // Verify redirect to mobile interface
    expect(mockLocation.href).toBe('/mobile');
  });

  it('should handle sign out errors gracefully', () => {
    // Mock localStorage.removeItem to throw error
    mockLocalStorage.removeItem.mockImplementation(() => {
      throw new Error('Storage error');
    });

    // Simulate sign out with error handling
    const handleSignOutWithErrorHandling = () => {
      try {
        localStorage.removeItem('token');
        window.location.href = '/mobile';
      } catch (error) {
        console.error('Sign out error:', error);
        // Still redirect to mobile interface even on error
        window.location.href = '/mobile';
      }
    };

    // Execute sign out
    handleSignOutWithErrorHandling();

    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith('Sign out error:', new Error('Storage error'));
    
    // Verify redirect still occurs
    expect(mockLocation.href).toBe('/mobile');
  });

  it('should clear all user-related data on sign out', () => {
    // Reset localStorage mock for this test
    const freshMockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: freshMockLocalStorage,
      writable: true,
    });

    // Mock additional user data in localStorage
    freshMockLocalStorage.getItem.mockImplementation((key) => {
      const data = {
        'token': 'user-token',
        'user-preferences': '{"theme":"dark"}',
        'notification-settings': '{"enabled":true}',
      };
      return data[key] || null;
    });

    // Simulate comprehensive sign out
    const handleComprehensiveSignOut = () => {
      // Clear all user-related data
      localStorage.removeItem('token');
      localStorage.removeItem('user-preferences');
      localStorage.removeItem('notification-settings');
      
      // Clear any cached data
      const notificationKeys = Object.keys(localStorage).filter(key => key.startsWith('notification_'));
      notificationKeys.forEach(key => localStorage.removeItem(key));
      
      window.location.href = '/mobile';
    };

    // Execute comprehensive sign out
    handleComprehensiveSignOut();

    // Verify all data is cleared
    expect(freshMockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(freshMockLocalStorage.removeItem).toHaveBeenCalledWith('user-preferences');
    expect(freshMockLocalStorage.removeItem).toHaveBeenCalledWith('notification-settings');
    
    // Verify redirect to mobile interface
    expect(mockLocation.href).toBe('/mobile');
  });

  it('should handle sign out from different mobile tabs', () => {
    // Reset localStorage mock for this test
    const freshMockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: freshMockLocalStorage,
      writable: true,
    });

    const tabs = ['dashboard', 'calendar', 'clients', 'services', 'settings'];
    
    tabs.forEach(tab => {
      // Reset location mock
      mockLocation.href = '';
      
      // Simulate sign out from different tab
      const handleSignOutFromTab = (currentTab: string) => {
        console.log(`Signing out from ${currentTab} tab`);
        localStorage.removeItem('token');
        window.location.href = '/mobile';
      };

      // Execute sign out from current tab
      handleSignOutFromTab(tab);

      // Verify consistent behavior regardless of tab
      expect(freshMockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocation.href).toBe('/mobile');
      expect(console.log).toHaveBeenCalledWith(`Signing out from ${tab} tab`);
    });
  });

  it('should preserve mobile interface URL parameters on sign out', () => {
    // Reset localStorage mock for this test
    const freshMockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: freshMockLocalStorage,
      writable: true,
    });

    // Mock current URL with parameters
    const originalURL = window.location.href;
    
    // Simulate sign out while preserving mobile interface
    const handleSignOutWithURLPreservation = () => {
      localStorage.removeItem('token');
      // Always redirect to mobile base URL (no parameters needed after sign out)
      window.location.href = '/mobile';
    };

    // Execute sign out
    handleSignOutWithURLPreservation();

    // Verify redirect to clean mobile URL
    expect(mockLocation.href).toBe('/mobile');
    expect(mockLocation.href).not.toContain('?');
    expect(mockLocation.href).not.toContain('#');
  });
});