import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { User, Client, Service, AppointmentWithRelations, DashboardStats, GalleryPhoto, Message, Notification } from '@shared/schema';

// Mock data
const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  password: 'hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  phone: '(555) 123-4567',
  profileImageUrl: null,
  homeBaseAddress: '123 Main St, City, ST 12345',
  serviceArea: 'Downtown area',
  about: 'Professional barber with 10 years experience',
  workingHours: {
    monday: { start: '09:00', end: '18:00', enabled: true },
    tuesday: { start: '09:00', end: '18:00', enabled: true },
    wednesday: { start: '09:00', end: '18:00', enabled: true },
    thursday: { start: '09:00', end: '18:00', enabled: true },
    friday: { start: '09:00', end: '18:00', enabled: true },
    saturday: { start: '10:00', end: '16:00', enabled: false },
    sunday: { start: '10:00', end: '16:00', enabled: false },
  },
  timezone: 'America/New_York',
  createdAt: new Date('2025-01-01'),
  stripeCustomerId: null,
  stripeSubscriptionId: null,
};

const mockClients: Client[] = [
  {
    id: 1,
    userId: 1,
    name: 'John Doe',
    phone: '(555) 987-6543',
    email: 'john@example.com',
    address: '456 Oak St, City, ST 12345',
    photoUrl: null,
    preferredStyle: 'Fade cut',
    notes: 'Regular customer',
    loyaltyStatus: 'gold',
    lastVisit: new Date('2025-07-01'),
    totalVisits: 15,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 2,
    userId: 1,
    name: 'Jane Smith',
    phone: '(555) 555-5555',
    email: 'jane@example.com',
    address: '789 Pine St, City, ST 12345',
    photoUrl: null,
    preferredStyle: 'Buzz cut',
    notes: 'Prefers short appointments',
    loyaltyStatus: 'regular',
    lastVisit: new Date('2025-06-28'),
    totalVisits: 8,
    createdAt: new Date('2024-03-20'),
  },
];

const mockServices: Service[] = [
  {
    id: 1,
    userId: 1,
    name: 'Haircut',
    description: 'Classic haircut and styling',
    price: '35.00',
    duration: 45,
    category: 'Haircuts',
    isActive: true,
    createdAt: new Date('2025-01-01'),
  },
  {
    id: 2,
    userId: 1,
    name: 'Beard Trim',
    description: 'Professional beard trimming and shaping',
    price: '20.00',
    duration: 20,
    category: 'Beard Services',
    isActive: true,
    createdAt: new Date('2025-01-01'),
  },
];

const mockAppointments: AppointmentWithRelations[] = [
  {
    id: 1,
    userId: 1,
    clientId: 1,
    serviceId: 1,
    scheduledAt: new Date('2025-07-03T10:00:00Z'),
    status: 'confirmed',
    notes: 'Regular appointment',
    address: '456 Oak St, City, ST 12345',
    price: '35.00',
    duration: 45,
    reminderSent: false,
    createdAt: new Date('2025-07-01'),
    client: mockClients[0],
    service: mockServices[0],
    appointmentServices: [],
  },
  {
    id: 2,
    userId: 1,
    clientId: 2,
    serviceId: 2,
    scheduledAt: new Date('2025-07-03T14:00:00Z'),
    status: 'pending',
    notes: 'New appointment',
    address: '789 Pine St, City, ST 12345',
    price: '20.00',
    duration: 20,
    reminderSent: false,
    createdAt: new Date('2025-07-02'),
    client: mockClients[1],
    service: mockServices[1],
    appointmentServices: [],
  },
];

const mockDashboardStats: DashboardStats = {
  dailyEarnings: '55.00',
  appointmentCount: 2,
  weeklyEarnings: '280.00',
  monthlyEarnings: '1200.00',
  totalClients: 25,
};

export const handlers = [
  // Auth endpoints
  http.get('/api/auth/me', () => {
    return HttpResponse.json(mockUser);
  }),

  // User profile endpoints
  http.get('/api/user/profile', () => {
    return HttpResponse.json(mockUser);
  }),

  http.patch('/api/user/profile', async ({ request }) => {
    const updates = await request.json();
    return HttpResponse.json({ ...mockUser, ...updates });
  }),

  // Dashboard endpoints
  http.get('/api/dashboard', () => {
    return HttpResponse.json(mockDashboardStats);
  }),

  // Client endpoints
  http.get('/api/clients', () => {
    return HttpResponse.json(mockClients);
  }),

  http.post('/api/clients', async ({ request }) => {
    const newClient = await request.json();
    const client = { ...newClient, id: mockClients.length + 1, userId: 1, createdAt: new Date() };
    mockClients.push(client);
    return HttpResponse.json(client);
  }),

  http.patch('/api/clients/:id', async ({ params, request }) => {
    const id = parseInt(params.id as string);
    const updates = await request.json();
    const clientIndex = mockClients.findIndex(c => c.id === id);
    if (clientIndex >= 0) {
      mockClients[clientIndex] = { ...mockClients[clientIndex], ...updates };
      return HttpResponse.json(mockClients[clientIndex]);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.delete('/api/clients/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const clientIndex = mockClients.findIndex(c => c.id === id);
    if (clientIndex >= 0) {
      mockClients.splice(clientIndex, 1);
      return new HttpResponse(null, { status: 204 });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Service endpoints
  http.get('/api/services', () => {
    return HttpResponse.json(mockServices);
  }),

  http.post('/api/services', async ({ request }) => {
    const newService = await request.json();
    const service = { ...newService, id: mockServices.length + 1, userId: 1, createdAt: new Date() };
    mockServices.push(service);
    return HttpResponse.json(service);
  }),

  http.patch('/api/services/:id', async ({ params, request }) => {
    const id = parseInt(params.id as string);
    const updates = await request.json();
    const serviceIndex = mockServices.findIndex(s => s.id === id);
    if (serviceIndex >= 0) {
      mockServices[serviceIndex] = { ...mockServices[serviceIndex], ...updates };
      return HttpResponse.json(mockServices[serviceIndex]);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.delete('/api/services/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const serviceIndex = mockServices.findIndex(s => s.id === id);
    if (serviceIndex >= 0) {
      mockServices.splice(serviceIndex, 1);
      return new HttpResponse(null, { status: 204 });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Appointment endpoints
  http.get('/api/appointments', () => {
    return HttpResponse.json(mockAppointments);
  }),

  http.get('/api/appointments/today', () => {
    const today = new Date();
    const todayAppointments = mockAppointments.filter(apt => {
      const aptDate = new Date(apt.scheduledAt);
      return aptDate.toDateString() === today.toDateString() && apt.status === 'confirmed';
    });
    return HttpResponse.json(todayAppointments);
  }),

  http.get('/api/appointments/pending', () => {
    const pendingAppointments = mockAppointments.filter(apt => apt.status === 'pending');
    return HttpResponse.json(pendingAppointments);
  }),

  http.post('/api/appointments', async ({ request }) => {
    const newAppointment = await request.json();
    const appointment = {
      ...newAppointment,
      id: mockAppointments.length + 1,
      userId: 1,
      createdAt: new Date(),
      client: mockClients.find(c => c.id === newAppointment.clientId),
      service: mockServices.find(s => s.id === newAppointment.serviceId),
      appointmentServices: [],
    };
    mockAppointments.push(appointment);
    return HttpResponse.json(appointment);
  }),

  http.patch('/api/appointments/:id', async ({ params, request }) => {
    const id = parseInt(params.id as string);
    const updates = await request.json();
    const appointmentIndex = mockAppointments.findIndex(a => a.id === id);
    if (appointmentIndex >= 0) {
      mockAppointments[appointmentIndex] = { ...mockAppointments[appointmentIndex], ...updates };
      return HttpResponse.json(mockAppointments[appointmentIndex]);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.delete('/api/appointments/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const appointmentIndex = mockAppointments.findIndex(a => a.id === id);
    if (appointmentIndex >= 0) {
      mockAppointments.splice(appointmentIndex, 1);
      return new HttpResponse(null, { status: 204 });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Gallery endpoints
  http.get('/api/gallery', () => {
    return HttpResponse.json([]);
  }),

  // Messages endpoints
  http.get('/api/messages', () => {
    return HttpResponse.json([]);
  }),

  http.get('/api/messages/unread-count', () => {
    return HttpResponse.json({ count: 0 });
  }),

  // Public booking endpoints
  http.get('/api/public/barber/:phone', ({ params }) => {
    return HttpResponse.json(mockUser);
  }),

  http.get('/api/public/barber/:phone/services', ({ params }) => {
    return HttpResponse.json(mockServices);
  }),

  http.get('/api/public/barber/:phone/availability', ({ request }) => {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    
    // Return mock availability slots
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time: timeString,
          available: true,
        });
      }
    }
    return HttpResponse.json(slots);
  }),

  // Stripe endpoints
  http.get('/api/stripe/status', () => {
    return HttpResponse.json({ connected: false });
  }),
];

export const server = setupServer(...handlers);