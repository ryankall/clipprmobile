import {
  users,
  clients,
  services,
  appointments,
  invoices,
  galleryPhotos,
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Service,
  type InsertService,
  type Appointment,
  type InsertAppointment,
  type Invoice,
  type InsertInvoice,
  type GalleryPhoto,
  type InsertGalleryPhoto,
  type AppointmentWithRelations,
  type ClientWithStats,
  type DashboardStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User>;

  // Clients
  getClientsByUserId(userId: number): Promise<ClientWithStats[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;

  // Services
  getServicesByUserId(userId: number): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service>;
  deleteService(id: number): Promise<void>;

  // Appointments
  getAppointmentsByUserId(userId: number, startDate?: Date, endDate?: Date): Promise<AppointmentWithRelations[]>;
  getTodayAppointments(userId: number): Promise<AppointmentWithRelations[]>;
  getAppointment(id: number): Promise<AppointmentWithRelations | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;

  // Invoices
  getInvoicesByUserId(userId: number): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;

  // Gallery
  getGalleryPhotosByUserId(userId: number): Promise<GalleryPhoto[]>;
  createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto>;
  deleteGalleryPhoto(id: number): Promise<void>;

  // Dashboard
  getDashboardStats(userId: number): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId,
        ...(stripeSubscriptionId && { stripeSubscriptionId })
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getClientsByUserId(userId: number): Promise<ClientWithStats[]> {
    const result = await db
      .select({
        ...clients,
        totalSpent: sql<string>`COALESCE(SUM(${invoices.total}), 0)`,
        upcomingAppointments: sql<number>`COUNT(${appointments.id})`,
      })
      .from(clients)
      .leftJoin(invoices, eq(clients.id, invoices.clientId))
      .leftJoin(appointments, and(
        eq(clients.id, appointments.clientId),
        gte(appointments.scheduledAt, new Date()),
        eq(appointments.status, "scheduled")
      ))
      .where(eq(clients.userId, userId))
      .groupBy(clients.id)
      .orderBy(desc(clients.lastVisit));
    
    return result as ClientWithStats[];
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set(client)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async getServicesByUserId(userId: number): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .where(and(eq(services.userId, userId), eq(services.isActive, true)))
      .orderBy(services.name);
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service> {
    const [updatedService] = await db
      .update(services)
      .set(service)
      .where(eq(services.id, id))
      .returning();
    return updatedService;
  }

  async deleteService(id: number): Promise<void> {
    await db.update(services).set({ isActive: false }).where(eq(services.id, id));
  }

  async getAppointmentsByUserId(userId: number, startDate?: Date, endDate?: Date): Promise<AppointmentWithRelations[]> {
    let query = db
      .select({
        ...appointments,
        client: clients,
        service: services,
      })
      .from(appointments)
      .innerJoin(clients, eq(appointments.clientId, clients.id))
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.userId, userId));

    if (startDate && endDate) {
      query = query.where(
        and(
          eq(appointments.userId, userId),
          gte(appointments.scheduledAt, startDate),
          lte(appointments.scheduledAt, endDate)
        )
      );
    }

    const result = await query.orderBy(appointments.scheduledAt);
    return result as AppointmentWithRelations[];
  }

  async getTodayAppointments(userId: number): Promise<AppointmentWithRelations[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return await this.getAppointmentsByUserId(userId, startOfDay, endOfDay);
  }

  async getAppointment(id: number): Promise<AppointmentWithRelations | undefined> {
    const [result] = await db
      .select({
        ...appointments,
        client: clients,
        service: services,
      })
      .from(appointments)
      .innerJoin(clients, eq(appointments.clientId, clients.id))
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.id, id));
    
    return result as AppointmentWithRelations || undefined;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    
    // Update client's last visit and total visits
    await db
      .update(clients)
      .set({
        lastVisit: appointment.scheduledAt,
        totalVisits: sql`${clients.totalVisits} + 1`,
      })
      .where(eq(clients.id, appointment.clientId));

    return newAppointment;
  }

  async updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set(appointment)
      .where(eq(appointments.id, id))
      .returning();
    return updatedAppointment;
  }

  async deleteAppointment(id: number): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  async getInvoicesByUserId(userId: number): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set(invoice)
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async getGalleryPhotosByUserId(userId: number): Promise<GalleryPhoto[]> {
    return await db
      .select()
      .from(galleryPhotos)
      .where(eq(galleryPhotos.userId, userId))
      .orderBy(desc(galleryPhotos.createdAt));
  }

  async createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto> {
    const [newPhoto] = await db.insert(galleryPhotos).values(photo).returning();
    return newPhoto;
  }

  async deleteGalleryPhoto(id: number): Promise<void> {
    await db.delete(galleryPhotos).where(eq(galleryPhotos.id, id));
  }

  async getDashboardStats(userId: number): Promise<DashboardStats> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get daily stats
    const [dailyStats] = await db
      .select({
        earnings: sql<string>`COALESCE(SUM(${invoices.total}), 0)`,
        appointments: sql<number>`COUNT(${appointments.id})`,
      })
      .from(appointments)
      .leftJoin(invoices, eq(appointments.id, invoices.appointmentId))
      .where(
        and(
          eq(appointments.userId, userId),
          gte(appointments.scheduledAt, startOfDay),
          lte(appointments.scheduledAt, endOfDay)
        )
      );

    // Get weekly stats
    const [weeklyStats] = await db
      .select({
        earnings: sql<string>`COALESCE(SUM(${invoices.total}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, userId),
          gte(invoices.createdAt, startOfWeek)
        )
      );

    // Get monthly stats
    const [monthlyStats] = await db
      .select({
        earnings: sql<string>`COALESCE(SUM(${invoices.total}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, userId),
          gte(invoices.createdAt, startOfMonth)
        )
      );

    // Get total clients
    const [clientStats] = await db
      .select({
        totalClients: sql<number>`COUNT(${clients.id})`,
      })
      .from(clients)
      .where(eq(clients.userId, userId));

    return {
      dailyEarnings: dailyStats?.earnings || "0",
      appointmentCount: dailyStats?.appointments || 0,
      weeklyEarnings: weeklyStats?.earnings || "0",
      monthlyEarnings: monthlyStats?.earnings || "0",
      totalClients: clientStats?.totalClients || 0,
    };
  }
}

export const storage = new DatabaseStorage();
