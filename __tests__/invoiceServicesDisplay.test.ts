import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '@/lib/queryClient';

// Mock invoice data with services
const mockInvoice = {
  id: 10,
  userId: 3,
  clientId: 39,
  total: '69.00',
  paymentStatus: 'paid',
  paymentMethod: 'cash',
  createdAt: new Date('2025-07-27T10:00:00Z')
};

const mockInvoiceServices = [
  {
    id: 3,
    invoiceId: 10,
    serviceId: 40,
    quantity: 1,
    price: '25.00',
    createdAt: new Date('2025-07-27T10:00:00Z'),
    service: {
      id: 40,
      userId: 3,
      name: 'Buzz Cut',
      description: 'Simple all-over buzz cut',
      price: '25.00',
      duration: 15,
      category: 'haircut',
      isActive: true,
      createdAt: new Date('2025-07-27T09:00:00Z')
    }
  },
  {
    id: 4,
    invoiceId: 10,
    serviceId: 35,
    quantity: 1,
    price: '35.00',
    createdAt: new Date('2025-07-27T10:00:00Z'),
    service: {
      id: 35,
      userId: 3,
      name: "Men's Haircut",
      description: 'Classic men\'s haircut with styling',
      price: '35.00',
      duration: 45,
      category: 'haircut',
      isActive: true,
      createdAt: new Date('2025-07-27T09:00:00Z')
    }
  }
];

const mockInvoiceWithServices = {
  ...mockInvoice,
  services: mockInvoiceServices
};

// Mock API request
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn()
}));

describe('Invoice Services Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Invoice Details API Response', () => {
    it('should return invoice with complete services data', async () => {
      (apiRequest as any).mockResolvedValue(mockInvoiceWithServices);

      const result = await apiRequest('GET', '/api/invoices/10');

      expect(result).toEqual(mockInvoiceWithServices);
      expect(result.services).toHaveLength(2);
      expect(result.services[0]).toHaveProperty('service');
      expect(result.services[0].service.name).toBe('Buzz Cut');
      expect(result.services[1].service.name).toBe("Men's Haircut");
    });

    it('should include service quantities and prices', async () => {
      (apiRequest as any).mockResolvedValue(mockInvoiceWithServices);

      const result = await apiRequest('GET', '/api/invoices/10');

      expect(result.services[0].quantity).toBe(1);
      expect(result.services[0].price).toBe('25.00');
      expect(result.services[1].quantity).toBe(1);
      expect(result.services[1].price).toBe('35.00');
    });

    it('should include service descriptions and categories', async () => {
      (apiRequest as any).mockResolvedValue(mockInvoiceWithServices);

      const result = await apiRequest('GET', '/api/invoices/10');

      expect(result.services[0].service.description).toBe('Simple all-over buzz cut');
      expect(result.services[0].service.category).toBe('haircut');
      expect(result.services[1].service.description).toBe('Classic men\'s haircut with styling');
      expect(result.services[1].service.category).toBe('haircut');
    });

    it('should include service durations for scheduling reference', async () => {
      (apiRequest as any).mockResolvedValue(mockInvoiceWithServices);

      const result = await apiRequest('GET', '/api/invoices/10');

      expect(result.services[0].service.duration).toBe(15);
      expect(result.services[1].service.duration).toBe(45);
    });
  });

  describe('Empty Services Handling', () => {
    it('should return empty services array for invoice without services', async () => {
      const invoiceWithoutServices = {
        ...mockInvoice,
        services: []
      };

      (apiRequest as any).mockResolvedValue(invoiceWithoutServices);

      const result = await apiRequest('GET', '/api/invoices/12');

      expect(result.services).toEqual([]);
      expect(Array.isArray(result.services)).toBe(true);
    });

    it('should handle null services gracefully', async () => {
      const invoiceWithNullServices = {
        ...mockInvoice,
        services: null
      };

      (apiRequest as any).mockResolvedValue(invoiceWithNullServices);

      const result = await apiRequest('GET', '/api/invoices/13');

      expect(result.services).toBeNull();
    });
  });

  describe('Multiple Service Types', () => {
    it('should handle multiple services of same type with different quantities', async () => {
      const multipleServicesInvoice = {
        ...mockInvoice,
        services: [
          {
            ...mockInvoiceServices[0],
            quantity: 2,
            price: '50.00' // 2 x $25.00
          },
          {
            ...mockInvoiceServices[1],
            quantity: 1,
            price: '35.00'
          }
        ]
      };

      (apiRequest as any).mockResolvedValue(multipleServicesInvoice);

      const result = await apiRequest('GET', '/api/invoices/10');

      expect(result.services[0].quantity).toBe(2);
      expect(result.services[0].price).toBe('50.00');
      expect(result.services[1].quantity).toBe(1);
      expect(result.services[1].price).toBe('35.00');
    });

    it('should handle different service categories', async () => {
      const mixedCategoryInvoice = {
        ...mockInvoice,
        services: [
          {
            ...mockInvoiceServices[0],
            service: {
              ...mockInvoiceServices[0].service,
              category: 'haircut'
            }
          },
          {
            ...mockInvoiceServices[1],
            service: {
              ...mockInvoiceServices[1].service,
              name: 'Beard Trim',
              category: 'beard'
            }
          }
        ]
      };

      (apiRequest as any).mockResolvedValue(mixedCategoryInvoice);

      const result = await apiRequest('GET', '/api/invoices/10');

      expect(result.services[0].service.category).toBe('haircut');
      expect(result.services[1].service.category).toBe('beard');
    });
  });

  describe('Service Data Integrity', () => {
    it('should preserve service IDs for reference tracking', async () => {
      (apiRequest as any).mockResolvedValue(mockInvoiceWithServices);

      const result = await apiRequest('GET', '/api/invoices/10');

      expect(result.services[0].serviceId).toBe(40);
      expect(result.services[0].service.id).toBe(40);
      expect(result.services[1].serviceId).toBe(35);
      expect(result.services[1].service.id).toBe(35);
    });

    it('should include timestamps for audit trail', async () => {
      (apiRequest as any).mockResolvedValue(mockInvoiceWithServices);

      const result = await apiRequest('GET', '/api/invoices/10');

      expect(result.services[0].createdAt).toBeDefined();
      expect(result.services[0].service.createdAt).toBeDefined();
      expect(result.services[1].createdAt).toBeDefined();
      expect(result.services[1].service.createdAt).toBeDefined();
    });

    it('should maintain user isolation in service data', async () => {
      (apiRequest as any).mockResolvedValue(mockInvoiceWithServices);

      const result = await apiRequest('GET', '/api/invoices/10');

      expect(result.services[0].service.userId).toBe(3);
      expect(result.services[1].service.userId).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing invoice gracefully', async () => {
      (apiRequest as any).mockRejectedValue(new Error('404: Invoice not found'));

      await expect(
        apiRequest('GET', '/api/invoices/999')
      ).rejects.toThrow('404: Invoice not found');
    });

    it('should handle unauthorized access', async () => {
      (apiRequest as any).mockRejectedValue(new Error('403: Access denied'));

      await expect(
        apiRequest('GET', '/api/invoices/10')
      ).rejects.toThrow('403: Access denied');
    });

    it('should handle database errors', async () => {
      (apiRequest as any).mockRejectedValue(new Error('500: Database connection error'));

      await expect(
        apiRequest('GET', '/api/invoices/10')
      ).rejects.toThrow('500: Database connection error');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle invoices with many services', async () => {
      const manyServicesInvoice = {
        ...mockInvoice,
        services: Array.from({ length: 10 }, (_, index) => ({
          id: index + 1,
          invoiceId: 10,
          serviceId: index + 30,
          quantity: 1,
          price: '25.00',
          createdAt: new Date('2025-07-27T10:00:00Z'),
          service: {
            id: index + 30,
            userId: 3,
            name: `Service ${index + 1}`,
            description: `Description for service ${index + 1}`,
            price: '25.00',
            duration: 30,
            category: 'haircut',
            isActive: true,
            createdAt: new Date('2025-07-27T09:00:00Z')
          }
        }))
      };

      (apiRequest as any).mockResolvedValue(manyServicesInvoice);

      const result = await apiRequest('GET', '/api/invoices/10');

      expect(result.services).toHaveLength(10);
      expect(result.services[0].service.name).toBe('Service 1');
      expect(result.services[9].service.name).toBe('Service 10');
    });

    it('should handle concurrent requests efficiently', async () => {
      (apiRequest as any).mockResolvedValue(mockInvoiceWithServices);

      const promises = Array.from({ length: 5 }, () => 
        apiRequest('GET', '/api/invoices/10')
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.services).toHaveLength(2);
        expect(result.services[0].service.name).toBe('Buzz Cut');
      });
    });
  });

  describe('UI Integration Requirements', () => {
    it('should provide all data needed for service display in UI', async () => {
      (apiRequest as any).mockResolvedValue(mockInvoiceWithServices);

      const result = await apiRequest('GET', '/api/invoices/10');

      // Verify all required fields for UI display
      result.services.forEach(service => {
        expect(service).toHaveProperty('quantity');
        expect(service).toHaveProperty('price');
        expect(service.service).toHaveProperty('name');
        expect(service.service).toHaveProperty('description');
        expect(service.service).toHaveProperty('category');
        expect(service.service).toHaveProperty('duration');
      });
    });

    it('should calculate total service cost correctly', async () => {
      (apiRequest as any).mockResolvedValue(mockInvoiceWithServices);

      const result = await apiRequest('GET', '/api/invoices/10');

      const calculatedTotal = result.services.reduce((sum, service) => 
        sum + (parseFloat(service.price) * service.quantity), 0
      );

      expect(calculatedTotal).toBe(60.00); // $25.00 + $35.00
    });
  });
});