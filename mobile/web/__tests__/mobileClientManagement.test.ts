import { describe, it, expect, beforeEach } from 'vitest';

// Types for mobile client management
interface MobileClient {
  id: number;
  userId: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  preferredStyle?: string;
  notes?: string;
  loyaltyStatus?: string;
  photoUrl?: string;
  mobilePreferred: boolean;
  totalVisits: number;
  totalSpent: number;
  lastVisit?: string;
  createdAt: string;
  updatedAt: string;
}

interface MobileClientFormData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  preferredStyle?: string;
  notes?: string;
  loyaltyStatus?: string;
  mobilePreferred?: boolean;
}

interface MobileClientSearch {
  searchTerm: string;
  loyaltyFilter: 'all' | 'regular' | 'vip' | 'favorite' | 'premium';
  mobilePreferredFilter: 'all' | 'mobile' | 'shop';
  sortBy: 'name' | 'totalVisits' | 'totalSpent' | 'lastVisit';
  sortOrder: 'asc' | 'desc';
}

interface MobileClientStats {
  totalClients: number;
  mobilePreferred: number;
  vipClients: number;
  averageSpending: number;
  topClient: MobileClient | null;
}

// Mock mobile client management service
class MockMobileClientManagementService {
  private clients: MobileClient[] = [];
  private nextId = 1;

  constructor() {
    this.setupMockData();
  }

  private setupMockData(): void {
    this.clients = [
      {
        id: 1,
        userId: 1,
        name: 'John Mobile',
        phone: '(555) 111-1111',
        email: 'john@mobile.com',
        address: '123 Mobile St, Downtown',
        preferredStyle: 'Fade with beard trim',
        notes: 'Prefers mobile service at home',
        loyaltyStatus: 'vip',
        mobilePreferred: true,
        totalVisits: 15,
        totalSpent: 750.00,
        lastVisit: '2025-07-10',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-07-10T14:30:00Z'
      },
      {
        id: 2,
        userId: 1,
        name: 'Sarah Style',
        phone: '(555) 222-2222',
        email: 'sarah@style.com',
        preferredStyle: 'Layered cut',
        loyaltyStatus: 'regular',
        mobilePreferred: false,
        totalVisits: 8,
        totalSpent: 320.00,
        lastVisit: '2025-07-08',
        createdAt: '2025-03-20T09:00:00Z',
        updatedAt: '2025-07-08T11:15:00Z'
      },
      {
        id: 3,
        userId: 1,
        name: 'Mike Mobile',
        phone: '(555) 333-3333',
        address: '456 App Ave, Midtown',
        notes: 'Executive client, travels frequently',
        loyaltyStatus: 'premium',
        mobilePreferred: true,
        totalVisits: 22,
        totalSpent: 1320.00,
        lastVisit: '2025-07-12',
        createdAt: '2024-11-10T15:00:00Z',
        updatedAt: '2025-07-12T16:45:00Z'
      }
    ];
    this.nextId = 4;
  }

  async createMobileClient(clientData: MobileClientFormData): Promise<MobileClient> {
    // Validate phone number uniqueness
    const existingClient = this.clients.find(client => client.phone === clientData.phone);
    if (existingClient) {
      throw new Error('Phone number already exists');
    }

    // Validate required fields
    if (!clientData.name || !clientData.phone) {
      throw new Error('Name and phone number are required');
    }

    const newClient: MobileClient = {
      id: this.nextId++,
      userId: 1,
      name: clientData.name,
      phone: this.formatPhoneNumber(clientData.phone),
      email: clientData.email,
      address: clientData.address,
      preferredStyle: clientData.preferredStyle,
      notes: clientData.notes,
      loyaltyStatus: clientData.loyaltyStatus || 'regular',
      mobilePreferred: clientData.mobilePreferred || false,
      totalVisits: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.clients.push(newClient);
    return newClient;
  }

  async updateMobileClient(clientId: number, updateData: Partial<MobileClientFormData>): Promise<MobileClient> {
    const client = this.clients.find(c => c.id === clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Check phone uniqueness if phone is being updated
    if (updateData.phone && updateData.phone !== client.phone) {
      const existingClient = this.clients.find(c => c.phone === updateData.phone && c.id !== clientId);
      if (existingClient) {
        throw new Error('Phone number already exists');
      }
    }

    // Update client data
    Object.assign(client, {
      ...updateData,
      phone: updateData.phone ? this.formatPhoneNumber(updateData.phone) : client.phone,
      updatedAt: new Date().toISOString()
    });

    return client;
  }

  async deleteMobileClient(clientId: number): Promise<boolean> {
    const clientIndex = this.clients.findIndex(c => c.id === clientId);
    if (clientIndex === -1) {
      throw new Error('Client not found');
    }

    this.clients.splice(clientIndex, 1);
    return true;
  }

  searchMobileClients(searchCriteria: Partial<MobileClientSearch>): MobileClient[] {
    let results = [...this.clients];

    // Apply search term filter
    if (searchCriteria.searchTerm) {
      const term = searchCriteria.searchTerm.toLowerCase();
      results = results.filter(client =>
        client.name.toLowerCase().includes(term) ||
        client.phone.includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.preferredStyle?.toLowerCase().includes(term)
      );
    }

    // Apply loyalty filter
    if (searchCriteria.loyaltyFilter && searchCriteria.loyaltyFilter !== 'all') {
      results = results.filter(client => client.loyaltyStatus === searchCriteria.loyaltyFilter);
    }

    // Apply mobile preference filter
    if (searchCriteria.mobilePreferredFilter && searchCriteria.mobilePreferredFilter !== 'all') {
      const isMobileFilter = searchCriteria.mobilePreferredFilter === 'mobile';
      results = results.filter(client => client.mobilePreferred === isMobileFilter);
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
          case 'totalVisits':
            aValue = a.totalVisits;
            bValue = b.totalVisits;
            break;
          case 'totalSpent':
            aValue = a.totalSpent;
            bValue = b.totalSpent;
            break;
          case 'lastVisit':
            aValue = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
            bValue = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
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

  getMobileClientById(clientId: number): MobileClient | null {
    return this.clients.find(c => c.id === clientId) || null;
  }

  getMobileClientByPhone(phone: string): MobileClient | null {
    const formattedPhone = this.formatPhoneNumber(phone);
    return this.clients.find(c => c.phone === formattedPhone) || null;
  }

  updateMobileClientVisit(clientId: number, serviceAmount: number): MobileClient {
    const client = this.clients.find(c => c.id === clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    client.totalVisits += 1;
    client.totalSpent += serviceAmount;
    client.lastVisit = new Date().toISOString().split('T')[0];
    client.updatedAt = new Date().toISOString();

    // Auto-upgrade loyalty status based on spending
    if (client.totalSpent >= 1000 && client.loyaltyStatus === 'regular') {
      client.loyaltyStatus = 'vip';
    } else if (client.totalSpent >= 500 && client.loyaltyStatus === 'regular') {
      client.loyaltyStatus = 'favorite';
    }

    return client;
  }

  getMobileClientStats(): MobileClientStats {
    const totalClients = this.clients.length;
    const mobilePreferred = this.clients.filter(c => c.mobilePreferred).length;
    const vipClients = this.clients.filter(c => c.loyaltyStatus === 'vip' || c.loyaltyStatus === 'premium').length;
    
    const totalSpent = this.clients.reduce((sum, client) => sum + client.totalSpent, 0);
    const averageSpending = totalClients > 0 ? totalSpent / totalClients : 0;
    
    const topClient = this.clients.reduce((top, client) => {
      return (!top || client.totalSpent > top.totalSpent) ? client : top;
    }, null as MobileClient | null);

    return {
      totalClients,
      mobilePreferred,
      vipClients,
      averageSpending: Math.round(averageSpending * 100) / 100,
      topClient
    };
  }

  exportMobileClientData(): string {
    const headers = ['Name', 'Phone', 'Email', 'Mobile Preferred', 'Loyalty Status', 'Total Visits', 'Total Spent', 'Last Visit'];
    const csvData = [headers.join(',')];

    this.clients.forEach(client => {
      const row = [
        `"${client.name}"`,
        `"${client.phone}"`,
        `"${client.email || ''}"`,
        client.mobilePreferred ? 'Yes' : 'No',
        client.loyaltyStatus || 'regular',
        client.totalVisits.toString(),
        client.totalSpent.toFixed(2),
        client.lastVisit || ''
      ];
      csvData.push(row.join(','));
    });

    return csvData.join('\n');
  }

  private formatPhoneNumber(phone: string): string {
    if (!phone) return phone;
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 10) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    }
    return phone;
  }

  // Test helper methods
  clearMobileClients(): void {
    this.clients = [];
    this.nextId = 1;
  }

  getMobileClients(): MobileClient[] {
    return this.clients;
  }

  addMobileTestClient(clientData: Partial<MobileClient>): MobileClient {
    const testClient: MobileClient = {
      id: this.nextId++,
      userId: 1,
      name: 'Test Client',
      phone: '(555) 000-0000',
      mobilePreferred: false,
      totalVisits: 0,
      totalSpent: 0,
      loyaltyStatus: 'regular',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...clientData
    };

    this.clients.push(testClient);
    return testClient;
  }
}

describe('Mobile Client Management System', () => {
  let mobileClientService: MockMobileClientManagementService;

  beforeEach(() => {
    mobileClientService = new MockMobileClientManagementService();
    mobileClientService.clearMobileClients();
  });

  describe('Mobile Client Creation', () => {
    it('should create a new mobile client with required fields', async () => {
      const clientData: MobileClientFormData = {
        name: 'Mobile Client Test',
        phone: '5551234567',
        email: 'test@mobile.com',
        mobilePreferred: true
      };

      const client = await mobileClientService.createMobileClient(clientData);

      expect(client.name).toBe('Mobile Client Test');
      expect(client.phone).toBe('(555) 123-4567');
      expect(client.email).toBe('test@mobile.com');
      expect(client.mobilePreferred).toBe(true);
      expect(client.totalVisits).toBe(0);
      expect(client.totalSpent).toBe(0);
      expect(client.loyaltyStatus).toBe('regular');
    });

    it('should format phone numbers correctly for mobile clients', async () => {
      const clientData: MobileClientFormData = {
        name: 'Phone Test',
        phone: '555-987-6543'
      };

      const client = await mobileClientService.createMobileClient(clientData);
      expect(client.phone).toBe('(555) 987-6543');
    });

    it('should prevent duplicate phone numbers for mobile clients', async () => {
      const clientData1: MobileClientFormData = {
        name: 'Client 1',
        phone: '(555) 111-1111'
      };

      const clientData2: MobileClientFormData = {
        name: 'Client 2',
        phone: '5551111111' // Same number, different format
      };

      await mobileClientService.createMobileClient(clientData1);
      
      await expect(mobileClientService.createMobileClient(clientData2))
        .rejects.toThrow('Phone number already exists');
    });

    it('should require name and phone for mobile client creation', async () => {
      const incompleteData: MobileClientFormData = {
        name: '',
        phone: ''
      };

      await expect(mobileClientService.createMobileClient(incompleteData))
        .rejects.toThrow('Name and phone number are required');
    });
  });

  describe('Mobile Client Updates', () => {
    it('should update mobile client information', async () => {
      const client = mobileClientService.addMobileTestClient({
        name: 'Original Name',
        phone: '(555) 111-1111',
        mobilePreferred: false
      });

      const updateData: Partial<MobileClientFormData> = {
        name: 'Updated Name',
        preferredStyle: 'Mobile Cut',
        mobilePreferred: true,
        notes: 'Prefers mobile service'
      };

      const updatedClient = await mobileClientService.updateMobileClient(client.id, updateData);

      expect(updatedClient.name).toBe('Updated Name');
      expect(updatedClient.preferredStyle).toBe('Mobile Cut');
      expect(updatedClient.mobilePreferred).toBe(true);
      expect(updatedClient.notes).toBe('Prefers mobile service');
      expect(updatedClient.phone).toBe('(555) 111-1111'); // Unchanged
    });

    it('should prevent phone number conflicts during mobile client updates', async () => {
      const client1 = mobileClientService.addMobileTestClient({
        name: 'Client 1',
        phone: '(555) 111-1111'
      });

      const client2 = mobileClientService.addMobileTestClient({
        name: 'Client 2',
        phone: '(555) 222-2222'
      });

      await expect(mobileClientService.updateMobileClient(client2.id, { phone: '(555) 111-1111' }))
        .rejects.toThrow('Phone number already exists');
    });

    it('should handle mobile client not found during update', async () => {
      await expect(mobileClientService.updateMobileClient(999, { name: 'Test' }))
        .rejects.toThrow('Client not found');
    });
  });

  describe('Mobile Client Deletion', () => {
    it('should delete mobile client successfully', async () => {
      const client = mobileClientService.addMobileTestClient({
        name: 'Delete Test',
        phone: '(555) 999-9999'
      });

      const result = await mobileClientService.deleteMobileClient(client.id);
      expect(result).toBe(true);

      const deletedClient = mobileClientService.getMobileClientById(client.id);
      expect(deletedClient).toBeNull();
    });

    it('should handle mobile client not found during deletion', async () => {
      await expect(mobileClientService.deleteMobileClient(999))
        .rejects.toThrow('Client not found');
    });
  });

  describe('Mobile Client Search and Filtering', () => {
    beforeEach(() => {
      mobileClientService.addMobileTestClient({
        name: 'John Mobile',
        phone: '(555) 111-1111',
        email: 'john@mobile.com',
        loyaltyStatus: 'vip',
        mobilePreferred: true,
        totalVisits: 15,
        totalSpent: 750
      });

      mobileClientService.addMobileTestClient({
        name: 'Sarah Shop',
        phone: '(555) 222-2222',
        email: 'sarah@shop.com',
        loyaltyStatus: 'regular',
        mobilePreferred: false,
        totalVisits: 5,
        totalSpent: 200
      });

      mobileClientService.addMobileTestClient({
        name: 'Mike Premium',
        phone: '(555) 333-3333',
        loyaltyStatus: 'premium',
        mobilePreferred: true,
        totalVisits: 25,
        totalSpent: 1200
      });
    });

    it('should search mobile clients by name', () => {
      const results = mobileClientService.searchMobileClients({
        searchTerm: 'mobile'
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('John Mobile');
    });

    it('should search mobile clients by phone', () => {
      const results = mobileClientService.searchMobileClients({
        searchTerm: '222'
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Sarah Shop');
    });

    it('should filter mobile clients by loyalty status', () => {
      const vipResults = mobileClientService.searchMobileClients({
        loyaltyFilter: 'vip'
      });

      const premiumResults = mobileClientService.searchMobileClients({
        loyaltyFilter: 'premium'
      });

      expect(vipResults.length).toBe(1);
      expect(vipResults[0].name).toBe('John Mobile');
      expect(premiumResults.length).toBe(1);
      expect(premiumResults[0].name).toBe('Mike Premium');
    });

    it('should filter mobile clients by mobile preference', () => {
      const mobileResults = mobileClientService.searchMobileClients({
        mobilePreferredFilter: 'mobile'
      });

      const shopResults = mobileClientService.searchMobileClients({
        mobilePreferredFilter: 'shop'
      });

      expect(mobileResults.length).toBe(2);
      expect(mobileResults.every(c => c.mobilePreferred)).toBe(true);
      expect(shopResults.length).toBe(1);
      expect(shopResults[0].mobilePreferred).toBe(false);
    });

    it('should sort mobile clients by total spent', () => {
      const results = mobileClientService.searchMobileClients({
        sortBy: 'totalSpent',
        sortOrder: 'desc'
      });

      expect(results[0].name).toBe('Mike Premium');
      expect(results[1].name).toBe('John Mobile');
      expect(results[2].name).toBe('Sarah Shop');
    });

    it('should sort mobile clients by total visits ascending', () => {
      const results = mobileClientService.searchMobileClients({
        sortBy: 'totalVisits',
        sortOrder: 'asc'
      });

      expect(results[0].name).toBe('Sarah Shop');
      expect(results[1].name).toBe('John Mobile');
      expect(results[2].name).toBe('Mike Premium');
    });
  });

  describe('Mobile Client Retrieval', () => {
    it('should get mobile client by ID', () => {
      const client = mobileClientService.addMobileTestClient({
        name: 'ID Test',
        phone: '(555) 777-7777'
      });

      const retrieved = mobileClientService.getMobileClientById(client.id);
      expect(retrieved?.name).toBe('ID Test');
    });

    it('should get mobile client by phone', () => {
      mobileClientService.addMobileTestClient({
        name: 'Phone Lookup',
        phone: '(555) 888-8888'
      });

      const retrieved = mobileClientService.getMobileClientByPhone('5558888888');
      expect(retrieved?.name).toBe('Phone Lookup');
    });

    it('should return null for non-existent mobile client', () => {
      const retrieved = mobileClientService.getMobileClientById(999);
      expect(retrieved).toBeNull();
    });
  });

  describe('Mobile Client Visit Tracking', () => {
    it('should update mobile client visit and spending data', () => {
      const client = mobileClientService.addMobileTestClient({
        name: 'Visit Test',
        phone: '(555) 666-6666',
        totalVisits: 0,
        totalSpent: 0,
        loyaltyStatus: 'regular'
      });

      const updatedClient = mobileClientService.updateMobileClientVisit(client.id, 50.00);

      expect(updatedClient.totalVisits).toBe(1);
      expect(updatedClient.totalSpent).toBe(50.00);
      expect(updatedClient.lastVisit).toBe(new Date().toISOString().split('T')[0]);
    });

    it('should auto-upgrade mobile client loyalty status based on spending', () => {
      const client = mobileClientService.addMobileTestClient({
        name: 'Loyalty Test',
        phone: '(555) 555-5555',
        totalSpent: 450,
        loyaltyStatus: 'regular'
      });

      // This should push total to 500, triggering favorite status
      mobileClientService.updateMobileClientVisit(client.id, 50.00);
      expect(client.loyaltyStatus).toBe('favorite');

      // This should push total to 1050, triggering VIP status
      mobileClientService.updateMobileClientVisit(client.id, 500.00);
      expect(client.loyaltyStatus).toBe('vip');
    });
  });

  describe('Mobile Client Statistics', () => {
    beforeEach(() => {
      mobileClientService.addMobileTestClient({
        name: 'Stats Client 1',
        mobilePreferred: true,
        loyaltyStatus: 'vip',
        totalSpent: 800
      });

      mobileClientService.addMobileTestClient({
        name: 'Stats Client 2',
        mobilePreferred: false,
        loyaltyStatus: 'regular',
        totalSpent: 300
      });

      mobileClientService.addMobileTestClient({
        name: 'Stats Client 3',
        mobilePreferred: true,
        loyaltyStatus: 'premium',
        totalSpent: 1200
      });
    });

    it('should calculate mobile client statistics correctly', () => {
      const stats = mobileClientService.getMobileClientStats();

      expect(stats.totalClients).toBe(3);
      expect(stats.mobilePreferred).toBe(2);
      expect(stats.vipClients).toBe(2); // VIP + Premium
      expect(stats.averageSpending).toBe(766.67); // (800 + 300 + 1200) / 3
      expect(stats.topClient?.name).toBe('Stats Client 3');
    });
  });

  describe('Mobile Client Data Export', () => {
    it('should export mobile client data as CSV', () => {
      mobileClientService.addMobileTestClient({
        name: 'Export Test',
        phone: '(555) 999-9999',
        email: 'export@test.com',
        mobilePreferred: true,
        loyaltyStatus: 'vip',
        totalVisits: 10,
        totalSpent: 500.50,
        lastVisit: '2025-07-15'
      });

      const csvData = mobileClientService.exportMobileClientData();
      const lines = csvData.split('\n');

      expect(lines[0]).toContain('Name,Phone,Email');
      expect(lines[1]).toContain('"Export Test"');
      expect(lines[1]).toContain('"(555) 999-9999"');
      expect(lines[1]).toContain('Yes'); // Mobile Preferred
      expect(lines[1]).toContain('vip');
      expect(lines[1]).toContain('500.50');
    });
  });

  describe('Mobile Client Edge Cases', () => {
    it('should handle mobile clients with minimal data', async () => {
      const minimalData: MobileClientFormData = {
        name: 'Minimal Client',
        phone: '5551234567'
      };

      const client = await mobileClientService.createMobileClient(minimalData);

      expect(client.name).toBe('Minimal Client');
      expect(client.phone).toBe('(555) 123-4567');
      expect(client.email).toBeUndefined();
      expect(client.mobilePreferred).toBe(false);
      expect(client.loyaltyStatus).toBe('regular');
    });

    it('should handle mobile client search with no results', () => {
      const results = mobileClientService.searchMobileClients({
        searchTerm: 'nonexistent'
      });

      expect(results.length).toBe(0);
    });

    it('should handle mobile client statistics with no clients', () => {
      const stats = mobileClientService.getMobileClientStats();

      expect(stats.totalClients).toBe(0);
      expect(stats.mobilePreferred).toBe(0);
      expect(stats.vipClients).toBe(0);
      expect(stats.averageSpending).toBe(0);
      expect(stats.topClient).toBeNull();
    });
  });
});