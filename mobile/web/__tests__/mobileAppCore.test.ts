import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  reload: vi.fn(),
  href: ''
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Types
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName?: string;
  profilePhotoUrl?: string;
}

interface DashboardStats {
  dailyEarnings: string;
  appointmentCount: number;
}

interface AppointmentWithRelations {
  id: number;
  userId: number;
  clientId: number;
  scheduledAt: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'expired';
  duration: number;
  client?: { name: string; phone: string };
  service?: { name: string; price: string };
  price: string;
}

interface ClientWithRelations {
  id: number;
  userId: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalVisits?: number;
  totalSpent?: number;
  loyaltyStatus?: string;
  createdAt: string;
}

interface Service {
  id: number;
  userId: number;
  name: string;
  price: string;
  duration: number;
  category: string;
  description?: string;
  isActive: boolean;
}

interface GalleryPhoto {
  id: number;
  userId: number;
  clientId: number;
  photoUrl: string;
  description?: string;
}

interface Notification {
  id: number;
  message: string;
  time: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

interface ReservationExpiration {
  success: boolean;
  expiredCount: number;
}

// Mock mobile app service
class MockMobileAppService {
  private validToken = 'valid-mobile-token-123';
  private mockUser: User = {
    id: 3,
    email: 'ryan11432@gmail.com',
    firstName: 'Ryan',
    lastName: 'Test',
    phone: '(555) 123-4567',
    businessName: 'Test Mobile Barbershop'
  };

  private mockDashboardStats: DashboardStats = {
    dailyEarnings: '125.50',
    appointmentCount: 3
  };

  private mockAppointments: AppointmentWithRelations[] = [
    {
      id: 1,
      userId: 3,
      clientId: 1,
      scheduledAt: new Date().toISOString(), // Today
      status: 'confirmed',
      duration: 45,
      client: { name: 'John Doe', phone: '(555) 111-2222' },
      service: { name: 'Haircut', price: '25.00' },
      price: '25.00'
    },
    {
      id: 2,
      userId: 3,
      clientId: 2,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow (old pending)
      status: 'pending',
      duration: 30,
      client: { name: 'Jane Smith', phone: '(555) 333-4444' },
      service: { name: 'Beard Trim', price: '15.00' },
      price: '15.00'
    }
  ];

  private mockClients: ClientWithRelations[] = [
    {
      id: 1,
      userId: 3,
      name: 'John Doe',
      phone: '(555) 111-2222',
      email: 'john@example.com',
      address: '123 Main St',
      totalVisits: 5,
      totalSpent: 125.00,
      loyaltyStatus: 'Gold',
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      userId: 3,
      name: 'Jane Smith',
      phone: '(555) 333-4444',
      email: 'jane@example.com',
      totalVisits: 2,
      totalSpent: 50.00,
      loyaltyStatus: 'Regular',
      createdAt: new Date().toISOString()
    }
  ];

  private mockServices: Service[] = [
    {
      id: 1,
      userId: 3,
      name: 'Haircut',
      price: '25.00',
      duration: 45,
      category: 'Hair',
      description: 'Professional haircut',
      isActive: true
    },
    {
      id: 2,
      userId: 3,
      name: 'Beard Trim',
      price: '15.00',
      duration: 30,
      category: 'Beard',
      description: 'Beard trimming service',
      isActive: true
    }
  ];

  private mockGalleryPhotos: GalleryPhoto[] = [
    {
      id: 1,
      userId: 3,
      clientId: 1,
      photoUrl: '/api/gallery/photo1.jpg',
      description: 'Fresh cut'
    },
    {
      id: 2,
      userId: 3,
      clientId: 2,
      photoUrl: '/api/gallery/photo2.jpg',
      description: 'Beard styling'
    }
  ];

  private mockNotifications: Notification[] = [
    {
      id: 1,
      message: 'New appointment request from John Doe',
      time: '2 minutes ago',
      type: 'info'
    },
    {
      id: 2,
      message: 'Payment received for haircut service',
      time: '1 hour ago',
      type: 'success'
    }
  ];

  async validateToken(token: string): Promise<User | null> {
    if (token === this.validToken) {
      return this.mockUser;
    }
    return null;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.mockDashboardStats;
  }

  async getTodaysAppointments(): Promise<AppointmentWithRelations[]> {
    const today = new Date().toDateString();
    return this.mockAppointments.filter(apt => 
      new Date(apt.scheduledAt).toDateString() === today
    );
  }

  async getPendingAppointments(): Promise<AppointmentWithRelations[]> {
    return this.mockAppointments.filter(apt => apt.status === 'pending');
  }

  async getClients(): Promise<ClientWithRelations[]> {
    return this.mockClients;
  }

  async getServices(): Promise<Service[]> {
    return this.mockServices;
  }

  async getGalleryPhotos(): Promise<GalleryPhoto[]> {
    return this.mockGalleryPhotos;
  }

  async getNotifications(): Promise<Notification[]> {
    return this.mockNotifications;
  }

  async createClient(clientData: Partial<ClientWithRelations>): Promise<ClientWithRelations> {
    const newClient: ClientWithRelations = {
      id: this.mockClients.length + 1,
      userId: 3,
      name: clientData.name || '',
      phone: clientData.phone || '',
      email: clientData.email,
      address: clientData.address,
      totalVisits: 0,
      totalSpent: 0,
      loyaltyStatus: 'Regular',
      createdAt: new Date().toISOString()
    };
    this.mockClients.push(newClient);
    return newClient;
  }

  async updateClient(id: number, updates: Partial<ClientWithRelations>): Promise<ClientWithRelations | null> {
    const clientIndex = this.mockClients.findIndex(c => c.id === id);
    if (clientIndex === -1) return null;

    this.mockClients[clientIndex] = { ...this.mockClients[clientIndex], ...updates };
    return this.mockClients[clientIndex];
  }

  async deleteClient(id: number): Promise<boolean> {
    const initialLength = this.mockClients.length;
    this.mockClients = this.mockClients.filter(c => c.id !== id);
    return this.mockClients.length < initialLength;
  }

  async expireReservations(): Promise<ReservationExpiration> {
    // Mock reservation expiration logic - expire future pending appointments that were created >30 mins ago
    const expiredAppointments = this.mockAppointments.filter(apt => 
      apt.status === 'pending'
      // In real system, would check appointment creation time vs 30 minutes
      // For test, we'll just expire all pending appointments
    );

    expiredAppointments.forEach(apt => {
      const index = this.mockAppointments.findIndex(a => a.id === apt.id);
      if (index !== -1) {
        this.mockAppointments[index].status = 'expired';
      }
    });

    return {
      success: true,
      expiredCount: expiredAppointments.length
    };
  }

  async searchClients(searchTerm: string): Promise<ClientWithRelations[]> {
    if (!searchTerm.trim()) return this.mockClients;

    return this.mockClients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  async getUnreadNotificationsCount(): Promise<number> {
    return this.mockNotifications.filter(n => n.type === 'info').length;
  }

  getMockUser(): User {
    return this.mockUser;
  }

  getValidToken(): string {
    return this.validToken;
  }

  getMockClients(): ClientWithRelations[] {
    return this.mockClients;
  }

  getMockServices(): Service[] {
    return this.mockServices;
  }

  getMockAppointments(): AppointmentWithRelations[] {
    return this.mockAppointments;
  }

  clearMockData(): void {
    this.mockClients = [];
    this.mockAppointments = [];
    this.mockServices = [];
    this.mockGalleryPhotos = [];
    this.mockNotifications = [];
  }
}

// Mock mobile app handlers
class MockMobileAppHandlers {
  private mobileService: MockMobileAppService;
  private activeTab: 'dashboard' | 'calendar' | 'clients' | 'services' | 'settings' = 'dashboard';

  constructor() {
    this.mobileService = new MockMobileAppService();
  }

  async initializeApp(): Promise<{ isAuthenticated: boolean; user?: User }> {
    const token = localStorage.getItem('token');
    if (!token) {
      return { isAuthenticated: false };
    }

    const user = await this.mobileService.validateToken(token);
    return {
      isAuthenticated: !!user,
      user: user || undefined
    };
  }

  async loadDashboardData(): Promise<{
    stats: DashboardStats;
    todaysAppointments: AppointmentWithRelations[];
    galleryPhotos: GalleryPhoto[];
    notifications: Notification[];
  }> {
    const [stats, todaysAppointments, galleryPhotos, notifications] = await Promise.all([
      this.mobileService.getDashboardStats(),
      this.mobileService.getTodaysAppointments(),
      this.mobileService.getGalleryPhotos(),
      this.mobileService.getNotifications()
    ]);

    return { stats, todaysAppointments, galleryPhotos, notifications };
  }

  async loadClientsData(): Promise<{
    clients: ClientWithRelations[];
    services: Service[];
  }> {
    const [clients, services] = await Promise.all([
      this.mobileService.getClients(),
      this.mobileService.getServices()
    ]);

    return { clients, services };
  }

  async handleClientSearch(searchTerm: string): Promise<ClientWithRelations[]> {
    return this.mobileService.searchClients(searchTerm);
  }

  async handleClientCreation(clientData: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
  }): Promise<ClientWithRelations> {
    return this.mobileService.createClient(clientData);
  }

  async handleClientUpdate(id: number, updates: Partial<ClientWithRelations>): Promise<ClientWithRelations | null> {
    return this.mobileService.updateClient(id, updates);
  }

  async handleClientDeletion(id: number): Promise<boolean> {
    return this.mobileService.deleteClient(id);
  }

  async handleTabSwitch(newTab: 'dashboard' | 'calendar' | 'clients' | 'services' | 'settings'): Promise<void> {
    this.activeTab = newTab;
  }

  async handleReservationExpiration(): Promise<ReservationExpiration> {
    return this.mobileService.expireReservations();
  }

  async handleNotificationCheck(): Promise<number> {
    return this.mobileService.getUnreadNotificationsCount();
  }

  getActiveTab(): string {
    return this.activeTab;
  }

  getMobileService(): MockMobileAppService {
    return this.mobileService;
  }
}

describe('Mobile App Core Functionality', () => {
  let mobileHandlers: MockMobileAppHandlers;
  let mobileService: MockMobileAppService;

  beforeEach(() => {
    vi.clearAllMocks();
    mobileHandlers = new MockMobileAppHandlers();
    mobileService = mobileHandlers.getMobileService();
  });

  describe('App Initialization', () => {
    it('should initialize app with valid token', async () => {
      localStorage.getItem.mockReturnValue(mobileService.getValidToken());
      
      const result = await mobileHandlers.initializeApp();
      
      expect(result.isAuthenticated).toBe(true);
      expect(result.user).toEqual(mobileService.getMockUser());
    });

    it('should handle initialization without token', async () => {
      localStorage.getItem.mockReturnValue(null);
      
      const result = await mobileHandlers.initializeApp();
      
      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should handle invalid token during initialization', async () => {
      localStorage.getItem.mockReturnValue('invalid-token');
      
      const result = await mobileHandlers.initializeApp();
      
      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeUndefined();
    });
  });

  describe('Dashboard Functionality', () => {
    it('should load dashboard data successfully', async () => {
      const dashboardData = await mobileHandlers.loadDashboardData();
      
      expect(dashboardData.stats.dailyEarnings).toBe('125.50');
      expect(dashboardData.stats.appointmentCount).toBe(3);
      expect(dashboardData.todaysAppointments).toHaveLength(1);
      expect(dashboardData.galleryPhotos).toHaveLength(2);
      expect(dashboardData.notifications).toHaveLength(2);
    });

    it('should handle empty dashboard data', async () => {
      mobileService.clearMockData();
      
      const dashboardData = await mobileHandlers.loadDashboardData();
      
      expect(dashboardData.todaysAppointments).toHaveLength(0);
      expect(dashboardData.galleryPhotos).toHaveLength(0);
      expect(dashboardData.notifications).toHaveLength(0);
    });

    it('should calculate correct appointment counts', async () => {
      const dashboardData = await mobileHandlers.loadDashboardData();
      
      expect(dashboardData.stats.appointmentCount).toBe(3);
      expect(dashboardData.todaysAppointments).toHaveLength(1);
    });
  });

  describe('Client Management', () => {
    it('should load clients data successfully', async () => {
      const clientsData = await mobileHandlers.loadClientsData();
      
      expect(clientsData.clients).toHaveLength(2);
      expect(clientsData.services).toHaveLength(2);
      expect(clientsData.clients[0].name).toBe('John Doe');
      expect(clientsData.clients[1].name).toBe('Jane Smith');
    });

    it('should create new client successfully', async () => {
      const newClientData = {
        name: 'Bob Johnson',
        phone: '(555) 555-5555',
        email: 'bob@example.com',
        address: '456 Oak Ave',
        notes: 'Regular customer'
      };
      
      const createdClient = await mobileHandlers.handleClientCreation(newClientData);
      
      expect(createdClient.name).toBe('Bob Johnson');
      expect(createdClient.phone).toBe('(555) 555-5555');
      expect(createdClient.email).toBe('bob@example.com');
      expect(createdClient.loyaltyStatus).toBe('Regular');
    });

    it('should update existing client successfully', async () => {
      const updates = {
        name: 'John Updated',
        email: 'john.updated@example.com'
      };
      
      const updatedClient = await mobileHandlers.handleClientUpdate(1, updates);
      
      expect(updatedClient?.name).toBe('John Updated');
      expect(updatedClient?.email).toBe('john.updated@example.com');
      expect(updatedClient?.phone).toBe('(555) 111-2222'); // Should remain unchanged
    });

    it('should delete client successfully', async () => {
      const initialClients = mobileService.getMockClients();
      const initialCount = initialClients.length;
      
      const deleteResult = await mobileHandlers.handleClientDeletion(1);
      
      expect(deleteResult).toBe(true);
      expect(mobileService.getMockClients()).toHaveLength(initialCount - 1);
    });

    it('should handle client search functionality', async () => {
      const searchResults = await mobileHandlers.handleClientSearch('John');
      
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('John Doe');
    });

    it('should handle phone number search', async () => {
      const searchResults = await mobileHandlers.handleClientSearch('(555) 333-4444');
      
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Jane Smith');
    });

    it('should handle empty search results', async () => {
      const searchResults = await mobileHandlers.handleClientSearch('NonExistent');
      
      expect(searchResults).toHaveLength(0);
    });
  });

  describe('Navigation and Tab Management', () => {
    it('should switch between tabs correctly', async () => {
      await mobileHandlers.handleTabSwitch('clients');
      expect(mobileHandlers.getActiveTab()).toBe('clients');
      
      await mobileHandlers.handleTabSwitch('services');
      expect(mobileHandlers.getActiveTab()).toBe('services');
      
      await mobileHandlers.handleTabSwitch('settings');
      expect(mobileHandlers.getActiveTab()).toBe('settings');
    });

    it('should default to dashboard tab', () => {
      expect(mobileHandlers.getActiveTab()).toBe('dashboard');
    });
  });

  describe('Reservation and Appointment Management', () => {
    it('should handle reservation expiration successfully', async () => {
      const expirationResult = await mobileHandlers.handleReservationExpiration();
      
      expect(expirationResult.success).toBe(true);
      expect(typeof expirationResult.expiredCount).toBe('number');
    });

    it('should get pending appointments', async () => {
      const pendingAppointments = await mobileService.getPendingAppointments();
      
      expect(pendingAppointments).toHaveLength(1);
      expect(pendingAppointments[0].status).toBe('pending');
      expect(pendingAppointments[0].client?.name).toBe('Jane Smith');
    });

    it('should handle appointment status changes', async () => {
      const appointments = mobileService.getMockAppointments();
      const pendingAppointment = appointments.find(apt => apt.status === 'pending');
      
      expect(pendingAppointment).toBeDefined();
      expect(pendingAppointment?.status).toBe('pending');
      
      // Simulate expiration
      await mobileHandlers.handleReservationExpiration();
      
      const updatedAppointments = mobileService.getMockAppointments();
      expect(updatedAppointments.some(apt => apt.status === 'expired')).toBe(true);
    });
  });

  describe('Notification Management', () => {
    it('should get unread notifications count', async () => {
      const unreadCount = await mobileHandlers.handleNotificationCheck();
      
      expect(typeof unreadCount).toBe('number');
      expect(unreadCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle notification display', async () => {
      const notifications = await mobileService.getNotifications();
      
      expect(notifications).toHaveLength(2);
      expect(notifications[0].type).toBe('info');
      expect(notifications[1].type).toBe('success');
    });
  });

  describe('Service Management', () => {
    it('should load services correctly', async () => {
      const services = await mobileService.getServices();
      
      expect(services).toHaveLength(2);
      expect(services[0].name).toBe('Haircut');
      expect(services[1].name).toBe('Beard Trim');
      expect(services[0].isActive).toBe(true);
      expect(services[1].isActive).toBe(true);
    });

    it('should handle service categories', async () => {
      const services = await mobileService.getServices();
      
      expect(services[0].category).toBe('Hair');
      expect(services[1].category).toBe('Beard');
    });

    it('should handle service pricing', async () => {
      const services = await mobileService.getServices();
      
      expect(services[0].price).toBe('25.00');
      expect(services[1].price).toBe('15.00');
      expect(services[0].duration).toBe(45);
      expect(services[1].duration).toBe(30);
    });
  });

  describe('Gallery and Photo Management', () => {
    it('should load gallery photos', async () => {
      const photos = await mobileService.getGalleryPhotos();
      
      expect(photos).toHaveLength(2);
      expect(photos[0].description).toBe('Fresh cut');
      expect(photos[1].description).toBe('Beard styling');
    });

    it('should handle photo metadata', async () => {
      const photos = await mobileService.getGalleryPhotos();
      
      expect(photos[0].userId).toBe(3);
      expect(photos[0].clientId).toBe(1);
      expect(photos[0].photoUrl).toContain('/api/gallery/');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent client update', async () => {
      const result = await mobileHandlers.handleClientUpdate(999, { name: 'Updated' });
      
      expect(result).toBeNull();
    });

    it('should handle non-existent client deletion', async () => {
      const result = await mobileHandlers.handleClientDeletion(999);
      
      expect(result).toBe(false);
    });

    it('should handle empty client creation', async () => {
      const emptyClient = await mobileHandlers.handleClientCreation({
        name: '',
        phone: ''
      });
      
      expect(emptyClient.name).toBe('');
      expect(emptyClient.phone).toBe('');
      expect(emptyClient.loyaltyStatus).toBe('Regular');
    });

    it('should handle cleared data gracefully', async () => {
      mobileService.clearMockData();
      
      const clients = await mobileService.getClients();
      const services = await mobileService.getServices();
      const appointments = await mobileService.getTodaysAppointments();
      
      expect(clients).toHaveLength(0);
      expect(services).toHaveLength(0);
      expect(appointments).toHaveLength(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large client datasets', async () => {
      // Add many clients for performance testing
      const clientPromises = [];
      for (let i = 0; i < 100; i++) {
        clientPromises.push(mobileHandlers.handleClientCreation({
          name: `Client ${i}`,
          phone: `(555) ${i.toString().padStart(3, '0')}-${i.toString().padStart(4, '0')}`,
          email: `client${i}@example.com`
        }));
      }
      
      await Promise.all(clientPromises);
      
      const clients = await mobileService.getClients();
      expect(clients.length).toBeGreaterThan(100);
    });

    it('should handle concurrent operations', async () => {
      const operations = [
        mobileHandlers.loadDashboardData(),
        mobileHandlers.loadClientsData(),
        mobileHandlers.handleNotificationCheck(),
        mobileHandlers.handleReservationExpiration()
      ];
      
      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(4);
      expect(results[0].stats).toBeDefined();
      expect(results[1].clients).toBeDefined();
      expect(typeof results[2]).toBe('number');
      expect(results[3].success).toBe(true);
    });
  });
});