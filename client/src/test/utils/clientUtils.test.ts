import { describe, it, expect } from 'vitest';
import { getClientDisplayName, isVipClient, getClientBadgeText } from '@/lib/clientUtils';

describe('Client Utils', () => {
  describe('getClientDisplayName', () => {
    it('should return "Gold" for VIP clients', () => {
      const vipClient = {
        name: 'Jane Smith',
        loyaltyStatus: 'vip' as const,
      };
      
      expect(getClientDisplayName(vipClient)).toBe('Gold');
    });

    it('should return actual name for regular clients', () => {
      const regularClient = {
        name: 'John Doe',
        loyaltyStatus: 'regular' as const,
      };
      
      expect(getClientDisplayName(regularClient)).toBe('John Doe');
    });

    it('should return actual name for new clients', () => {
      const newClient = {
        name: 'Mike Johnson',
        loyaltyStatus: 'new' as const,
      };
      
      expect(getClientDisplayName(newClient)).toBe('Mike Johnson');
    });

    it('should return "Unknown Client" for clients with no name', () => {
      const clientWithoutName = {
        name: null,
        loyaltyStatus: 'regular' as const,
      };
      
      expect(getClientDisplayName(clientWithoutName)).toBe('Unknown Client');
    });

    it('should return "Unknown Client" for clients with empty name', () => {
      const clientWithEmptyName = {
        name: '',
        loyaltyStatus: 'regular' as const,
      };
      
      expect(getClientDisplayName(clientWithEmptyName)).toBe('Unknown Client');
    });
  });

  describe('isVipClient', () => {
    it('should return true for VIP clients', () => {
      const vipClient = {
        loyaltyStatus: 'vip' as const,
      };
      
      expect(isVipClient(vipClient)).toBe(true);
    });

    it('should return false for regular clients', () => {
      const regularClient = {
        loyaltyStatus: 'regular' as const,
      };
      
      expect(isVipClient(regularClient)).toBe(false);
    });

    it('should return false for new clients', () => {
      const newClient = {
        loyaltyStatus: 'new' as const,
      };
      
      expect(isVipClient(newClient)).toBe(false);
    });

    it('should return false for clients with null loyalty status', () => {
      const clientWithNullStatus = {
        loyaltyStatus: null as any,
      };
      
      expect(isVipClient(clientWithNullStatus)).toBe(false);
    });
  });

  describe('getClientBadgeText', () => {
    it('should return "Gold" for VIP clients', () => {
      const vipClient = {
        loyaltyStatus: 'vip' as const,
      };
      
      expect(getClientBadgeText(vipClient)).toBe('Gold');
    });

    it('should return "Regular" for regular clients', () => {
      const regularClient = {
        loyaltyStatus: 'regular' as const,
      };
      
      expect(getClientBadgeText(regularClient)).toBe('Regular');
    });

    it('should return "Regular" for new clients', () => {
      const newClient = {
        loyaltyStatus: 'new' as const,
      };
      
      expect(getClientBadgeText(newClient)).toBe('Regular');
    });

    it('should return "Regular" for clients with undefined loyalty status', () => {
      const clientWithUndefinedStatus = {
        loyaltyStatus: undefined as any,
      };
      
      expect(getClientBadgeText(clientWithUndefinedStatus)).toBe('Regular');
    });
  });
});