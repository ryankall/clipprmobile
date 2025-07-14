import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const handlers = [
  // Auth endpoints
  rest.get('/api/auth/user', (req, res, ctx) => {
    return res(ctx.json({
      id: 1,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      phone: '6467891234',
      phoneVerified: true,
    }));
  }),

  // Dashboard endpoints
  rest.get('/api/dashboard/stats', (req, res, ctx) => {
    return res(ctx.json({
      todayEarnings: 350,
      todayAppointments: 5,
      totalClients: 42,
      monthlyEarnings: 3250,
    }));
  }),

  // Appointments endpoints
  rest.get('/api/appointments/today', (req, res, ctx) => {
    return res(ctx.json([
      {
        id: 1,
        scheduledAt: new Date().toISOString(),
        status: 'confirmed',
        duration: 60,
        price: '45.00',
        client: {
          id: 1,
          name: 'John Doe',
          phone: '6467891234',
        },
        services: [
          {
            id: 1,
            name: 'Haircut',
            price: '45.00',
          },
        ],
      },
    ]));
  }),

  rest.get('/api/appointments/next', (req, res, ctx) => {
    const nextAppointment = new Date();
    nextAppointment.setHours(nextAppointment.getHours() + 1);
    
    return res(ctx.json({
      id: 2,
      scheduledAt: nextAppointment.toISOString(),
      status: 'confirmed',
      duration: 45,
      price: '35.00',
      client: {
        id: 2,
        name: 'Jane Smith',
        phone: '6467895678',
      },
      services: [
        {
          id: 2,
          name: 'Beard Trim',
          price: '35.00',
        },
      ],
    }));
  }),

  // Clients endpoints
  rest.get('/api/clients', (req, res, ctx) => {
    return res(ctx.json([
      {
        id: 1,
        name: 'John Doe',
        phone: '6467891234',
        email: 'john@example.com',
        totalSpent: '450.00',
        visits: 12,
        lastVisit: new Date().toISOString(),
        vipStatus: false,
      },
      {
        id: 2,
        name: 'Jane Smith',
        phone: '6467895678',
        email: 'jane@example.com',
        totalSpent: '750.00',
        visits: 18,
        lastVisit: new Date().toISOString(),
        vipStatus: true,
      },
    ]));
  }),

  // Services endpoints
  rest.get('/api/services', (req, res, ctx) => {
    return res(ctx.json([
      {
        id: 1,
        name: 'Haircut',
        price: '45.00',
        duration: 60,
        category: 'Haircuts',
        isActive: true,
      },
      {
        id: 2,
        name: 'Beard Trim',
        price: '35.00',
        duration: 45,
        category: 'Beard Services',
        isActive: true,
      },
    ]));
  }),
];

export const server = setupServer(...handlers);