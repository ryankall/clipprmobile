import { describe, it, expect, beforeEach } from 'vitest';

// Types for mobile service management
interface MobileService {
  id: number;
  userId: number;
  name: string;
  price: string;
  duration: number;
  category: string;
  description?: string;
  isActive: boolean;
  mobileAvailable: boolean;
  travelFee?: number;
  mobilePriceAdjustment?: number;
  equipmentRequired?: string[];
  createdAt: string;
  updatedAt: string;
}

interface MobileServiceFormData {
  name: string;
  price: string;
  duration: number;
  category: string;
  description?: string;
  isActive?: boolean;
  mobileAvailable?: boolean;
  travelFee?: number;
  mobilePriceAdjustment?: number;
  equipmentRequired?: string[];
}

interface MobileServiceSearch {
  searchTerm: string;
  categoryFilter: string;
  availabilityFilter: 'all' | 'active' | 'inactive';
  mobileFilter: 'all' | 'mobile' | 'shop-only';
  priceRange?: { min: number; max: number };
  sortBy: 'name' | 'price' | 'duration' | 'category';
  sortOrder: 'asc' | 'desc';
}

interface MobileServiceStats {
  totalServices: number;
  activeServices: number;
  mobileServices: number;
  averagePrice: number;
  averageDuration: number;
  categoryCounts: Record<string, number>;
}

const mobileServiceCategories = [
  'Mobile Haircuts',
  'Mobile Beard Services',
  'Mobile Styling',
  'Mobile Treatments',
  'Mobile Combos',
  'Express Mobile',
  'Premium Mobile',
  'Other'
];

// Mock mobile service management system
class MockMobileServiceManagementService {
  private services: MobileService[] = [];
  private nextId = 1;

  constructor() {
    this.setupMockData();
  }

  private setupMockData(): void {
    this.services = [
      {
        id: 1,
        userId: 1,
        name: 'Mobile Classic Cut',
        price: '35.00',
        duration: 45,
        category: 'Mobile Haircuts',
        description: 'Traditional haircut at your location',
        isActive: true,
        mobileAvailable: true,
        travelFee: 10.00,
        equipmentRequired: ['Clippers', 'Scissors', 'Cape'],
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-07-10T14:30:00Z'
      },
      {
        id: 2,
        userId: 1,
        name: 'Mobile Beard Trim & Style',
        price: '25.00',
        duration: 30,
        category: 'Mobile Beard Services',
        description: 'Professional beard trimming and styling',
        isActive: true,
        mobileAvailable: true,
        travelFee: 5.00,
        equipmentRequired: ['Beard Trimmer', 'Scissors'],
        createdAt: '2025-02-01T09:00:00Z',
        updatedAt: '2025-07-08T11:15:00Z'
      },
      {
        id: 3,
        userId: 1,
        name: 'Shop Only Premium Cut',
        price: '50.00',
        duration: 60,
        category: 'Premium Services',
        description: 'High-end cutting service available in shop only',
        isActive: true,
        mobileAvailable: false,
        createdAt: '2025-03-10T15:00:00Z',
        updatedAt: '2025-07-12T16:45:00Z'
      }
    ];
    this.nextId = 4;
  }

  async createMobileService(serviceData: MobileServiceFormData): Promise<MobileService> {
    // Validate required fields
    if (!serviceData.name || !serviceData.price || !serviceData.duration || !serviceData.category) {
      throw new Error('Name, price, duration, and category are required');
    }

    // Validate price format
    const priceNum = parseFloat(serviceData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      throw new Error('Price must be a valid positive number');
    }

    // Validate duration
    if (serviceData.duration < 5) {
      throw new Error('Duration must be at least 5 minutes');
    }

    // Check for duplicate service names
    const existingService = this.services.find(service => 
      service.name.toLowerCase() === serviceData.name.toLowerCase()
    );
    if (existingService) {
      throw new Error('Service name already exists');
    }

    const newService: MobileService = {
      id: this.nextId++,
      userId: 1,
      name: serviceData.name,
      price: priceNum.toFixed(2),
      duration: serviceData.duration,
      category: serviceData.category,
      description: serviceData.description,
      isActive: serviceData.isActive !== false,
      mobileAvailable: serviceData.mobileAvailable || false,
      travelFee: serviceData.travelFee,
      mobilePriceAdjustment: serviceData.mobilePriceAdjustment,
      equipmentRequired: serviceData.equipmentRequired || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.services.push(newService);
    return newService;
  }

  async updateMobileService(serviceId: number, updateData: Partial<MobileServiceFormData>): Promise<MobileService> {
    const service = this.services.find(s => s.id === serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    // Check name uniqueness if name is being updated
    if (updateData.name && updateData.name !== service.name) {
      const existingService = this.services.find(s => 
        s.name.toLowerCase() === updateData.name!.toLowerCase() && s.id !== serviceId
      );
      if (existingService) {
        throw new Error('Service name already exists');
      }
    }

    // Validate price if being updated
    if (updateData.price) {
      const priceNum = parseFloat(updateData.price);
      if (isNaN(priceNum) || priceNum < 0) {
        throw new Error('Price must be a valid positive number');
      }
      updateData.price = priceNum.toFixed(2);
    }

    // Validate duration if being updated
    if (updateData.duration && updateData.duration < 5) {
      throw new Error('Duration must be at least 5 minutes');
    }

    // Update service data
    Object.assign(service, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });

    return service;
  }

  async deleteMobileService(serviceId: number): Promise<boolean> {
    const serviceIndex = this.services.findIndex(s => s.id === serviceId);
    if (serviceIndex === -1) {
      throw new Error('Service not found');
    }

    this.services.splice(serviceIndex, 1);
    return true;
  }

  async toggleMobileServiceStatus(serviceId: number): Promise<MobileService> {
    const service = this.services.find(s => s.id === serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    service.isActive = !service.isActive;
    service.updatedAt = new Date().toISOString();

    return service;
  }

  searchMobileServices(searchCriteria: Partial<MobileServiceSearch>): MobileService[] {
    let results = [...this.services];

    // Apply search term filter
    if (searchCriteria.searchTerm) {
      const term = searchCriteria.searchTerm.toLowerCase();
      results = results.filter(service =>
        service.name.toLowerCase().includes(term) ||
        service.category.toLowerCase().includes(term) ||
        service.description?.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (searchCriteria.categoryFilter && searchCriteria.categoryFilter !== 'all') {
      results = results.filter(service => service.category === searchCriteria.categoryFilter);
    }

    // Apply availability filter
    if (searchCriteria.availabilityFilter && searchCriteria.availabilityFilter !== 'all') {
      const isActiveFilter = searchCriteria.availabilityFilter === 'active';
      results = results.filter(service => service.isActive === isActiveFilter);
    }

    // Apply mobile filter
    if (searchCriteria.mobileFilter && searchCriteria.mobileFilter !== 'all') {
      const isMobileFilter = searchCriteria.mobileFilter === 'mobile';
      results = results.filter(service => service.mobileAvailable === isMobileFilter);
    }

    // Apply price range filter
    if (searchCriteria.priceRange) {
      results = results.filter(service => {
        const price = parseFloat(service.price);
        return price >= searchCriteria.priceRange!.min && price <= searchCriteria.priceRange!.max;
      });
    }

    // Apply sorting
    if (searchCriteria.sortBy) {
      results.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (searchCriteria.sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'price':
            aValue = parseFloat(a.price);
            bValue = parseFloat(b.price);
            break;
          case 'duration':
            aValue = a.duration;
            bValue = b.duration;
            break;
          case 'category':
            aValue = a.category.toLowerCase();
            bValue = b.category.toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return searchCriteria.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return searchCriteria.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return results;
  }

  getMobileServicesOnly(): MobileService[] {
    return this.services.filter(service => service.mobileAvailable);
  }

  getActiveServices(): MobileService[] {
    return this.services.filter(service => service.isActive);
  }

  getServicesByCategory(category: string): MobileService[] {
    return this.services.filter(service => service.category === category);
  }

  calculateMobileServicePrice(serviceId: number, includeTravelFee: boolean = false): number {
    const service = this.services.find(s => s.id === serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    let price = parseFloat(service.price);
    
    // Apply mobile price adjustment if applicable
    if (service.mobileAvailable && service.mobilePriceAdjustment) {
      price += service.mobilePriceAdjustment;
    }

    // Add travel fee if requested and service supports mobile
    if (includeTravelFee && service.mobileAvailable && service.travelFee) {
      price += service.travelFee;
    }

    return Math.round(price * 100) / 100;
  }

  getMobileServiceStats(): MobileServiceStats {
    const totalServices = this.services.length;
    const activeServices = this.services.filter(s => s.isActive).length;
    const mobileServices = this.services.filter(s => s.mobileAvailable).length;

    const prices = this.services.map(s => parseFloat(s.price));
    const averagePrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;

    const durations = this.services.map(s => s.duration);
    const averageDuration = durations.length > 0 ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0;

    const categoryCounts: Record<string, number> = {};
    this.services.forEach(service => {
      categoryCounts[service.category] = (categoryCounts[service.category] || 0) + 1;
    });

    return {
      totalServices,
      activeServices,
      mobileServices,
      averagePrice: Math.round(averagePrice * 100) / 100,
      averageDuration: Math.round(averageDuration),
      categoryCounts
    };
  }

  getMobileEquipmentList(): string[] {
    const allEquipment = new Set<string>();
    
    this.services.forEach(service => {
      if (service.mobileAvailable && service.equipmentRequired) {
        service.equipmentRequired.forEach(equipment => allEquipment.add(equipment));
      }
    });

    return Array.from(allEquipment).sort();
  }

  duplicateMobileService(serviceId: number, newName: string): Promise<MobileService> {
    const originalService = this.services.find(s => s.id === serviceId);
    if (!originalService) {
      throw new Error('Service not found');
    }

    const duplicateData: MobileServiceFormData = {
      name: newName,
      price: originalService.price,
      duration: originalService.duration,
      category: originalService.category,
      description: originalService.description,
      isActive: false, // New services start as inactive
      mobileAvailable: originalService.mobileAvailable,
      travelFee: originalService.travelFee,
      mobilePriceAdjustment: originalService.mobilePriceAdjustment,
      equipmentRequired: [...(originalService.equipmentRequired || [])]
    };

    return this.createMobileService(duplicateData);
  }

  // Test helper methods
  clearMobileServices(): void {
    this.services = [];
    this.nextId = 1;
  }

  getMobileServices(): MobileService[] {
    return this.services;
  }

  addMobileTestService(serviceData: Partial<MobileService>): MobileService {
    const testService: MobileService = {
      id: this.nextId++,
      userId: 1,
      name: 'Test Service',
      price: '30.00',
      duration: 30,
      category: 'Mobile Haircuts',
      isActive: true,
      mobileAvailable: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...serviceData
    };

    this.services.push(testService);
    return testService;
  }
}

describe('Mobile Service Management System', () => {
  let mobileServiceManagement: MockMobileServiceManagementService;

  beforeEach(() => {
    mobileServiceManagement = new MockMobileServiceManagementService();
    mobileServiceManagement.clearMobileServices();
  });

  describe('Mobile Service Creation', () => {
    it('should create a new mobile service with required fields', async () => {
      const serviceData: MobileServiceFormData = {
        name: 'Mobile Test Cut',
        price: '35.00',
        duration: 45,
        category: 'Mobile Haircuts',
        description: 'Test mobile haircut service',
        mobileAvailable: true,
        travelFee: 10.00
      };

      const service = await mobileServiceManagement.createMobileService(serviceData);

      expect(service.name).toBe('Mobile Test Cut');
      expect(service.price).toBe('35.00');
      expect(service.duration).toBe(45);
      expect(service.category).toBe('Mobile Haircuts');
      expect(service.mobileAvailable).toBe(true);
      expect(service.travelFee).toBe(10.00);
      expect(service.isActive).toBe(true);
    });

    it('should validate required fields for mobile service creation', async () => {
      const incompleteData: MobileServiceFormData = {
        name: '',
        price: '',
        duration: 0,
        category: ''
      };

      await expect(mobileServiceManagement.createMobileService(incompleteData))
        .rejects.toThrow('Name, price, duration, and category are required');
    });

    it('should validate price format for mobile services', async () => {
      const invalidPriceData: MobileServiceFormData = {
        name: 'Test Service',
        price: 'invalid',
        duration: 30,
        category: 'Mobile Haircuts'
      };

      await expect(mobileServiceManagement.createMobileService(invalidPriceData))
        .rejects.toThrow('Price must be a valid positive number');
    });

    it('should validate minimum duration for mobile services', async () => {
      const shortDurationData: MobileServiceFormData = {
        name: 'Quick Service',
        price: '20.00',
        duration: 3,
        category: 'Mobile Haircuts'
      };

      await expect(mobileServiceManagement.createMobileService(shortDurationData))
        .rejects.toThrow('Duration must be at least 5 minutes');
    });

    it('should prevent duplicate mobile service names', async () => {
      const serviceData: MobileServiceFormData = {
        name: 'Duplicate Test',
        price: '30.00',
        duration: 30,
        category: 'Mobile Haircuts'
      };

      await mobileServiceManagement.createMobileService(serviceData);
      
      await expect(mobileServiceManagement.createMobileService(serviceData))
        .rejects.toThrow('Service name already exists');
    });

    it('should format price correctly for mobile services', async () => {
      const serviceData: MobileServiceFormData = {
        name: 'Price Format Test',
        price: '35.5',
        duration: 40,
        category: 'Mobile Haircuts'
      };

      const service = await mobileServiceManagement.createMobileService(serviceData);
      expect(service.price).toBe('35.50');
    });
  });

  describe('Mobile Service Updates', () => {
    it('should update mobile service information', async () => {
      const service = mobileServiceManagement.addMobileTestService({
        name: 'Original Mobile Service',
        price: '30.00',
        mobileAvailable: false
      });

      const updateData: Partial<MobileServiceFormData> = {
        name: 'Updated Mobile Service',
        price: '35.00',
        mobileAvailable: true,
        travelFee: 15.00,
        description: 'Updated description'
      };

      const updatedService = await mobileServiceManagement.updateMobileService(service.id, updateData);

      expect(updatedService.name).toBe('Updated Mobile Service');
      expect(updatedService.price).toBe('35.00');
      expect(updatedService.mobileAvailable).toBe(true);
      expect(updatedService.travelFee).toBe(15.00);
      expect(updatedService.description).toBe('Updated description');
    });

    it('should prevent name conflicts during mobile service updates', async () => {
      const service1 = mobileServiceManagement.addMobileTestService({
        name: 'Service 1'
      });

      const service2 = mobileServiceManagement.addMobileTestService({
        name: 'Service 2'
      });

      await expect(mobileServiceManagement.updateMobileService(service2.id, { name: 'Service 1' }))
        .rejects.toThrow('Service name already exists');
    });

    it('should handle mobile service not found during update', async () => {
      await expect(mobileServiceManagement.updateMobileService(999, { name: 'Test' }))
        .rejects.toThrow('Service not found');
    });
  });

  describe('Mobile Service Status Management', () => {
    it('should toggle mobile service active status', async () => {
      const service = mobileServiceManagement.addMobileTestService({
        name: 'Toggle Test',
        isActive: true
      });

      const toggledService = await mobileServiceManagement.toggleMobileServiceStatus(service.id);
      expect(toggledService.isActive).toBe(false);

      const toggledAgain = await mobileServiceManagement.toggleMobileServiceStatus(service.id);
      expect(toggledAgain.isActive).toBe(true);
    });

    it('should delete mobile service successfully', async () => {
      const service = mobileServiceManagement.addMobileTestService({
        name: 'Delete Test'
      });

      const result = await mobileServiceManagement.deleteMobileService(service.id);
      expect(result).toBe(true);

      const services = mobileServiceManagement.getMobileServices();
      expect(services.find(s => s.id === service.id)).toBeUndefined();
    });
  });

  describe('Mobile Service Search and Filtering', () => {
    beforeEach(() => {
      mobileServiceManagement.addMobileTestService({
        name: 'Mobile Premium Cut',
        price: '45.00',
        duration: 60,
        category: 'Mobile Haircuts',
        isActive: true,
        mobileAvailable: true
      });

      mobileServiceManagement.addMobileTestService({
        name: 'Mobile Beard Trim',
        price: '25.00',
        duration: 30,
        category: 'Mobile Beard Services',
        isActive: true,
        mobileAvailable: true
      });

      mobileServiceManagement.addMobileTestService({
        name: 'Shop Only Service',
        price: '50.00',
        duration: 45,
        category: 'Premium Services',
        isActive: true,
        mobileAvailable: false
      });

      mobileServiceManagement.addMobileTestService({
        name: 'Inactive Mobile Service',
        price: '30.00',
        duration: 40,
        category: 'Mobile Haircuts',
        isActive: false,
        mobileAvailable: true
      });
    });

    it('should search mobile services by name', () => {
      const results = mobileServiceManagement.searchMobileServices({
        searchTerm: 'beard'
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Mobile Beard Trim');
    });

    it('should filter mobile services by category', () => {
      const results = mobileServiceManagement.searchMobileServices({
        categoryFilter: 'Mobile Haircuts'
      });

      expect(results.length).toBe(2);
      expect(results.every(s => s.category === 'Mobile Haircuts')).toBe(true);
    });

    it('should filter mobile services by availability status', () => {
      const activeResults = mobileServiceManagement.searchMobileServices({
        availabilityFilter: 'active'
      });

      const inactiveResults = mobileServiceManagement.searchMobileServices({
        availabilityFilter: 'inactive'
      });

      expect(activeResults.length).toBe(3);
      expect(inactiveResults.length).toBe(1);
      expect(activeResults.every(s => s.isActive)).toBe(true);
      expect(inactiveResults.every(s => !s.isActive)).toBe(true);
    });

    it('should filter services by mobile availability', () => {
      const mobileResults = mobileServiceManagement.searchMobileServices({
        mobileFilter: 'mobile'
      });

      const shopResults = mobileServiceManagement.searchMobileServices({
        mobileFilter: 'shop-only'
      });

      expect(mobileResults.length).toBe(3);
      expect(shopResults.length).toBe(1);
      expect(mobileResults.every(s => s.mobileAvailable)).toBe(true);
      expect(shopResults.every(s => !s.mobileAvailable)).toBe(true);
    });

    it('should filter mobile services by price range', () => {
      const results = mobileServiceManagement.searchMobileServices({
        priceRange: { min: 25, max: 35 }
      });

      expect(results.length).toBe(2); // Mobile Beard Trim (25) and Inactive Mobile Service (30)
      expect(results.every(s => {
        const price = parseFloat(s.price);
        return price >= 25 && price <= 35;
      })).toBe(true);
    });

    it('should sort mobile services by price', () => {
      const ascResults = mobileServiceManagement.searchMobileServices({
        sortBy: 'price',
        sortOrder: 'asc'
      });

      const descResults = mobileServiceManagement.searchMobileServices({
        sortBy: 'price',
        sortOrder: 'desc'
      });

      expect(parseFloat(ascResults[0].price)).toBeLessThanOrEqual(parseFloat(ascResults[1].price));
      expect(parseFloat(descResults[0].price)).toBeGreaterThanOrEqual(parseFloat(descResults[1].price));
    });

    it('should sort mobile services by duration', () => {
      const results = mobileServiceManagement.searchMobileServices({
        sortBy: 'duration',
        sortOrder: 'asc'
      });

      expect(results[0].duration).toBeLessThanOrEqual(results[1].duration);
    });
  });

  describe('Mobile Service Retrieval Methods', () => {
    beforeEach(() => {
      mobileServiceManagement.addMobileTestService({
        name: 'Mobile Service 1',
        mobileAvailable: true,
        isActive: true,
        category: 'Mobile Haircuts'
      });

      mobileServiceManagement.addMobileTestService({
        name: 'Shop Service 1',
        mobileAvailable: false,
        isActive: true,
        category: 'Shop Services'
      });

      mobileServiceManagement.addMobileTestService({
        name: 'Mobile Service 2',
        mobileAvailable: true,
        isActive: false,
        category: 'Mobile Haircuts'
      });
    });

    it('should get mobile services only', () => {
      const mobileServices = mobileServiceManagement.getMobileServicesOnly();
      
      expect(mobileServices.length).toBe(2);
      expect(mobileServices.every(s => s.mobileAvailable)).toBe(true);
    });

    it('should get active services only', () => {
      const activeServices = mobileServiceManagement.getActiveServices();
      
      expect(activeServices.length).toBe(2);
      expect(activeServices.every(s => s.isActive)).toBe(true);
    });

    it('should get services by category', () => {
      const mobileHaircutServices = mobileServiceManagement.getServicesByCategory('Mobile Haircuts');
      
      expect(mobileHaircutServices.length).toBe(2);
      expect(mobileHaircutServices.every(s => s.category === 'Mobile Haircuts')).toBe(true);
    });
  });

  describe('Mobile Service Price Calculations', () => {
    it('should calculate mobile service price with travel fee', () => {
      const service = mobileServiceManagement.addMobileTestService({
        name: 'Mobile Price Test',
        price: '35.00',
        mobileAvailable: true,
        travelFee: 10.00
      });

      const basePrice = mobileServiceManagement.calculateMobileServicePrice(service.id, false);
      const priceWithTravel = mobileServiceManagement.calculateMobileServicePrice(service.id, true);

      expect(basePrice).toBe(35.00);
      expect(priceWithTravel).toBe(45.00);
    });

    it('should apply mobile price adjustment', () => {
      const service = mobileServiceManagement.addMobileTestService({
        name: 'Mobile Adjustment Test',
        price: '30.00',
        mobileAvailable: true,
        mobilePriceAdjustment: 5.00,
        travelFee: 10.00
      });

      const basePrice = mobileServiceManagement.calculateMobileServicePrice(service.id, false);
      const priceWithTravel = mobileServiceManagement.calculateMobileServicePrice(service.id, true);

      expect(basePrice).toBe(35.00); // 30 + 5 adjustment
      expect(priceWithTravel).toBe(45.00); // 30 + 5 adjustment + 10 travel
    });

    it('should handle service not found in price calculation', () => {
      expect(() => mobileServiceManagement.calculateMobileServicePrice(999, false))
        .toThrow('Service not found');
    });
  });

  describe('Mobile Service Statistics', () => {
    beforeEach(() => {
      mobileServiceManagement.addMobileTestService({
        name: 'Service 1',
        price: '30.00',
        duration: 30,
        category: 'Mobile Haircuts',
        isActive: true,
        mobileAvailable: true
      });

      mobileServiceManagement.addMobileTestService({
        name: 'Service 2',
        price: '50.00',
        duration: 60,
        category: 'Mobile Haircuts',
        isActive: true,
        mobileAvailable: false
      });

      mobileServiceManagement.addMobileTestService({
        name: 'Service 3',
        price: '25.00',
        duration: 45,
        category: 'Mobile Beard Services',
        isActive: false,
        mobileAvailable: true
      });
    });

    it('should calculate mobile service statistics correctly', () => {
      const stats = mobileServiceManagement.getMobileServiceStats();

      expect(stats.totalServices).toBe(3);
      expect(stats.activeServices).toBe(2);
      expect(stats.mobileServices).toBe(2);
      expect(stats.averagePrice).toBe(35.00); // (30 + 50 + 25) / 3
      expect(stats.averageDuration).toBe(45); // (30 + 60 + 45) / 3
      expect(stats.categoryCounts['Mobile Haircuts']).toBe(2);
      expect(stats.categoryCounts['Mobile Beard Services']).toBe(1);
    });
  });

  describe('Mobile Equipment Management', () => {
    it('should get mobile equipment list from all mobile services', () => {
      mobileServiceManagement.addMobileTestService({
        name: 'Equipment Test 1',
        mobileAvailable: true,
        equipmentRequired: ['Clippers', 'Scissors', 'Cape']
      });

      mobileServiceManagement.addMobileTestService({
        name: 'Equipment Test 2',
        mobileAvailable: true,
        equipmentRequired: ['Beard Trimmer', 'Scissors', 'Towels']
      });

      mobileServiceManagement.addMobileTestService({
        name: 'Shop Service',
        mobileAvailable: false,
        equipmentRequired: ['Professional Chair'] // Should not be included
      });

      const equipmentList = mobileServiceManagement.getMobileEquipmentList();

      expect(equipmentList).toContain('Clippers');
      expect(equipmentList).toContain('Scissors');
      expect(equipmentList).toContain('Cape');
      expect(equipmentList).toContain('Beard Trimmer');
      expect(equipmentList).toContain('Towels');
      expect(equipmentList).not.toContain('Professional Chair');
      expect(equipmentList).toEqual(equipmentList.sort()); // Should be sorted
    });
  });

  describe('Mobile Service Duplication', () => {
    it('should duplicate mobile service with new name', async () => {
      const originalService = mobileServiceManagement.addMobileTestService({
        name: 'Original Mobile Service',
        price: '40.00',
        duration: 50,
        category: 'Mobile Haircuts',
        mobileAvailable: true,
        travelFee: 15.00,
        equipmentRequired: ['Clippers', 'Scissors']
      });

      const duplicatedService = await mobileServiceManagement.duplicateMobileService(
        originalService.id,
        'Duplicated Mobile Service'
      );

      expect(duplicatedService.name).toBe('Duplicated Mobile Service');
      expect(duplicatedService.price).toBe('40.00');
      expect(duplicatedService.duration).toBe(50);
      expect(duplicatedService.category).toBe('Mobile Haircuts');
      expect(duplicatedService.mobileAvailable).toBe(true);
      expect(duplicatedService.travelFee).toBe(15.00);
      expect(duplicatedService.equipmentRequired).toEqual(['Clippers', 'Scissors']);
      expect(duplicatedService.isActive).toBe(false); // New services start inactive
      expect(duplicatedService.id).not.toBe(originalService.id);
    });

    it('should handle service not found during duplication', async () => {
      await expect(mobileServiceManagement.duplicateMobileService(999, 'New Name'))
        .rejects.toThrow('Service not found');
    });
  });

  describe('Mobile Service Edge Cases', () => {
    it('should handle mobile services with minimal data', async () => {
      const minimalData: MobileServiceFormData = {
        name: 'Minimal Mobile Service',
        price: '25.00',
        duration: 30,
        category: 'Mobile Haircuts'
      };

      const service = await mobileServiceManagement.createMobileService(minimalData);

      expect(service.name).toBe('Minimal Mobile Service');
      expect(service.price).toBe('25.00');
      expect(service.isActive).toBe(true);
      expect(service.mobileAvailable).toBe(false); // Default
      expect(service.description).toBeUndefined();
      expect(service.equipmentRequired).toEqual([]);
    });

    it('should handle mobile service search with no results', () => {
      const results = mobileServiceManagement.searchMobileServices({
        searchTerm: 'nonexistent'
      });

      expect(results.length).toBe(0);
    });

    it('should handle mobile service statistics with no services', () => {
      const stats = mobileServiceManagement.getMobileServiceStats();

      expect(stats.totalServices).toBe(0);
      expect(stats.activeServices).toBe(0);
      expect(stats.mobileServices).toBe(0);
      expect(stats.averagePrice).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(Object.keys(stats.categoryCounts).length).toBe(0);
    });
  });
});