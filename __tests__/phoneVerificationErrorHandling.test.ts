import { describe, it, expect, beforeEach } from 'vitest';
import { isPhoneVerificationError, getPhoneVerificationMessage, getErrorRedirectPath } from '../client/src/lib/authUtils';

describe('Phone Verification Error Handling', () => {
  describe('isPhoneVerificationError', () => {
    it('should detect phone verification errors from message', () => {
      const error = {
        message: '403: {"error":"Phone verification required","message":"Please verify your phone number first. This keeps your client information secure.","action":"verify_phone","redirectTo":"/settings"}'
      };
      expect(isPhoneVerificationError(error)).toBe(true);
    });

    it('should detect phone verification errors from error property', () => {
      const error = {
        error: 'Phone verification required',
        message: 'Please verify your phone number first.',
        action: 'verify_phone'
      };
      expect(isPhoneVerificationError(error)).toBe(true);
    });

    it('should detect phone verification errors from action property', () => {
      const error = {
        action: 'verify_phone',
        message: 'Verification needed'
      };
      expect(isPhoneVerificationError(error)).toBe(true);
    });

    it('should return false for non-verification errors', () => {
      const error = {
        message: 'Network error',
        error: 'Connection failed'
      };
      expect(isPhoneVerificationError(error)).toBe(false);
    });

    it('should handle undefined/null errors gracefully', () => {
      expect(isPhoneVerificationError(null)).toBe(false);
      expect(isPhoneVerificationError(undefined)).toBe(false);
      expect(isPhoneVerificationError({})).toBe(false);
    });
  });

  describe('getPhoneVerificationMessage', () => {
    it('should extract message from error object', () => {
      const error = {
        message: 'Please verify your phone number first. This keeps your client information secure.'
      };
      expect(getPhoneVerificationMessage(error)).toBe('Please verify your phone number first. This keeps your client information secure.');
    });

    it('should extract message from JSON string in error message', () => {
      const error = {
        message: '403: {"error":"Phone verification required","message":"Please verify your phone number first. This keeps your appointments secure.","action":"verify_phone","redirectTo":"/settings"}'
      };
      // Should extract the message from the JSON
      expect(getPhoneVerificationMessage(error)).toBe('Please verify your phone number first. This keeps your appointments secure.');
    });

    it('should return default message when no message found', () => {
      const error = {
        error: 'Phone verification required'
      };
      expect(getPhoneVerificationMessage(error)).toBe('You must verify your phone number before proceeding. Go to Settings > Phone Verification to complete this step.');
    });

    it('should handle empty/null errors with default message', () => {
      expect(getPhoneVerificationMessage(null)).toBe('You must verify your phone number before proceeding. Go to Settings > Phone Verification to complete this step.');
      expect(getPhoneVerificationMessage({})).toBe('You must verify your phone number before proceeding. Go to Settings > Phone Verification to complete this step.');
    });
  });

  describe('getErrorRedirectPath', () => {
    it('should extract redirect path from error', () => {
      const error = {
        redirectTo: '/settings'
      };
      expect(getErrorRedirectPath(error)).toBe('/settings');
    });

    it('should return default path when no redirect found', () => {
      const error = {
        message: 'Some error'
      };
      expect(getErrorRedirectPath(error)).toBe('/settings');
    });

    it('should handle empty/null errors with default path', () => {
      expect(getErrorRedirectPath(null)).toBe('/settings');
      expect(getErrorRedirectPath({})).toBe('/settings');
    });
  });

  describe('User-Friendly Error Messages', () => {
    it('should provide user-friendly client update error message', () => {
      const error = {
        message: '403: {"error":"Phone verification required","message":"Please verify your phone number first. This keeps your client information secure.","action":"verify_phone","redirectTo":"/settings"}'
      };
      
      expect(isPhoneVerificationError(error)).toBe(true);
      const message = getPhoneVerificationMessage(error);
      expect(message).toBe('Please verify your phone number first. This keeps your client information secure.');
      expect(message).not.toContain('Go to Settings > Phone Verification to complete this step');
      expect(message).toContain('secure');
    });

    it('should provide user-friendly appointment creation error message', () => {
      const error = {
        message: '403: {"error":"Phone verification required","message":"Please verify your phone number first. This keeps your appointments secure.","action":"verify_phone","redirectTo":"/settings"}'
      };
      
      expect(isPhoneVerificationError(error)).toBe(true);
      const message = getPhoneVerificationMessage(error);
      expect(message).toBe('Please verify your phone number first. This keeps your appointments secure.');
      expect(message).not.toContain('Go to Settings > Phone Verification to complete this step');
      expect(message).toContain('secure');
    });

    it('should handle complex error message parsing', () => {
      const error = {
        message: '403: {"error":"Phone verification required","message":"Please verify your phone number first. This keeps your client information secure.","action":"verify_phone","redirectTo":"/settings"}'
      };
      
      // Should extract the inner message properly
      const message = getPhoneVerificationMessage(error);
      expect(message).toBe('Please verify your phone number first. This keeps your client information secure.');
      expect(message).not.toContain('403:');
      expect(message).not.toContain('{"error":');
    });
  });

  describe('Toast Component Integration', () => {
    it('should not contain invalid object properties for toast actions', () => {
      const error = {
        message: '403: {"error":"Phone verification required","message":"Please verify your phone number first. This keeps your client information secure.","action":"verify_phone","redirectTo":"/settings"}'
      };
      
      // Verify that we don't pass objects to toast actions
      const message = getPhoneVerificationMessage(error);
      expect(typeof message).toBe('string');
      expect(message).not.toContain('{');
      expect(message).not.toContain('}');
    });

    it('should provide clean error messages without technical details', () => {
      const error = {
        message: '403: {"error":"Phone verification required","message":"Please verify your phone number first. This keeps your appointments secure.","action":"verify_phone","redirectTo":"/settings"}'
      };
      
      const message = getPhoneVerificationMessage(error);
      expect(message).not.toContain('HTTP');
      expect(message).not.toContain('403');
      expect(message).not.toContain('API');
      expect(message).not.toContain('endpoint');
      expect(message).toBe('Please verify your phone number first. This keeps your appointments secure.');
    });
  });
});

// Mock Server Response Error Handling
describe('Server Response Error Handling', () => {
  it('should handle client update phone verification errors', () => {
    const mockServerResponse = {
      error: 'Phone verification required',
      message: 'Please verify your phone number first. This keeps your client information secure.',
      action: 'verify_phone',
      redirectTo: '/settings'
    };
    
    expect(isPhoneVerificationError(mockServerResponse)).toBe(true);
    expect(getPhoneVerificationMessage(mockServerResponse)).toBe('Please verify your phone number first. This keeps your client information secure.');
    expect(getErrorRedirectPath(mockServerResponse)).toBe('/settings');
  });

  it('should handle appointment creation phone verification errors', () => {
    const mockServerResponse = {
      error: 'Phone verification required',
      message: 'Please verify your phone number first. This keeps your appointments secure.',
      action: 'verify_phone',
      redirectTo: '/settings'
    };
    
    expect(isPhoneVerificationError(mockServerResponse)).toBe(true);
    expect(getPhoneVerificationMessage(mockServerResponse)).toBe('Please verify your phone number first. This keeps your appointments secure.');
    expect(getErrorRedirectPath(mockServerResponse)).toBe('/settings');
  });

  it('should handle network errors properly', () => {
    const networkError = {
      message: 'Network request failed',
      code: 'NETWORK_ERROR'
    };
    
    expect(isPhoneVerificationError(networkError)).toBe(false);
    // Network errors should return their original message, not the default verification message
    expect(getPhoneVerificationMessage(networkError)).toBe('Network request failed');
  });
});