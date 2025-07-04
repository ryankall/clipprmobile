import {
  users,
  clients,
  services,
  appointments,
  appointmentServices,
  invoices,
  galleryPhotos,
  messages,
  reservations,
  notifications,
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Service,
  type InsertService,
  type Appointment,
  type InsertAppointment,
  type AppointmentService,
  type InsertAppointmentService,
  type Invoice,
  type InsertInvoice,
  type GalleryPhoto,
  type InsertGalleryPhoto,
  type Message,
  type InsertMessage,
  type Reservation,
  type InsertReservation,
  type Notification,
  type InsertNotification,
  type AppointmentWithRelations,
  type ClientWithStats,
  type DashboardStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByAppleId(appleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
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
  getPendingAppointments(userId: number): Promise<AppointmentWithRelations[]>;
  getAppointment(id: number): Promise<AppointmentWithRelations | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;
  expireAppointment(id: number): Promise<void>;
  getExpiredAppointments(): Promise<AppointmentWithRelations[]>;
  cleanupExpiredAppointments(): Promise<number>;

  // Appointment Services
  createAppointmentService(appointmentService: InsertAppointmentService): Promise<AppointmentService>;
  getAppointmentServicesByAppointmentId(appointmentId: number): Promise<(AppointmentService & { service: Service })[]>;
  deleteAppointmentServicesByAppointmentId(appointmentId: number): Promise<void>;

  // Invoices
  getInvoicesByUserId(userId: number): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;

  // Gallery
  getGalleryPhotosByUserId(userId: number): Promise<GalleryPhoto[]>;
  createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto>;
  deleteGalleryPhoto(id: number): Promise<void>;

  // Messages
  getMessagesByUserId(userId: number): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  markMessageAsRead(id: number): Promise<Message>;
  getUnreadMessageCount(userId: number): Promise<number>;

  // Reservations
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  getReservation(id: number): Promise<Reservation | undefined>;
  getReservationsByUserId(userId: number): Promise<Reservation[]>;
  updateReservation(id: number, reservation: Partial<InsertReservation>): Promise<Reservation>;
  deleteReservation(id: number): Promise<void>;
  expireReservation(id: number): Promise<void>;
  getActiveReservationsForTimeSlot(userId: number, scheduledAt: Date, duration: number): Promise<Reservation[]>;
  getExpiredReservations(): Promise<Reservation[]>;
  confirmReservation(id: number): Promise<Reservation>;

  // Notifications
  getNotificationsByUserId(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  // Dashboard
  getDashboardStats(userId: number): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.appleId, appleId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning();
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
        id: clients.id,
        userId: clients.userId,
        name: clients.name,
        phone: clients.phone,
        email: clients.email,
        address: clients.address,
        photoUrl: clients.photoUrl,
        preferredStyle: clients.preferredStyle,
        notes: clients.notes,
        loyaltyStatus: clients.loyaltyStatus,
        totalVisits: clients.totalVisits,
        lastVisit: clients.lastVisit,
        createdAt: clients.createdAt,
        totalSpent: sql<string>`COALESCE(SUM(${invoices.total}), '0')`,
        upcomingAppointments: sql<number>`CAST(COUNT(CASE WHEN ${appointments.id} IS NOT NULL THEN 1 END) AS INTEGER)`,
      })
      .from(clients)
      .leftJoin(invoices, eq(clients.id, invoices.clientId))
      .leftJoin(appointments, and(
        eq(clients.id, appointments.clientId),
        gte(appointments.scheduledAt, new Date()),
        eq(appointments.status, "scheduled")
      ))
      .where(eq(clients.userId, userId))
      .groupBy(
        clients.id,
        clients.userId,
        clients.name,
        clients.phone,
        clients.email,
        clients.address,
        clients.photoUrl,
        clients.preferredStyle,
        clients.notes,
        clients.loyaltyStatus,
        clients.totalVisits,
        clients.lastVisit,
        clients.createdAt
      )
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
    // First get appointments
    let appointmentQuery = db
      .select()
      .from(appointments)
      .where(eq(appointments.userId, userId));

    if (startDate && endDate) {
      console.log(`[DB QUERY] Getting appointments for user ${userId} between ${startDate.toISOString()} and ${endDate.toISOString()}`);
      appointmentQuery = db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.userId, userId),
            gte(appointments.scheduledAt, startDate),
            lte(appointments.scheduledAt, endDate)
          )
        );
    }

    const appointmentResults = await appointmentQuery.orderBy(appointments.scheduledAt);
    console.log(`[DB QUERY] Found ${appointmentResults.length} appointments for user ${userId}`);
    appointmentResults.forEach(apt => {
      console.log(`[DB QUERY] Appointment ${apt.id}: ${apt.scheduledAt}, Status: ${apt.status}, Duration: ${apt.duration}`);
    });
    
    // Then get related data
    const results: AppointmentWithRelations[] = [];
    for (const appointment of appointmentResults) {
      const client = await db.select().from(clients).where(eq(clients.id, appointment.clientId)).limit(1);
      const service = await db.select().from(services).where(eq(services.id, appointment.serviceId)).limit(1);
      const appointmentServicesData = await this.getAppointmentServicesByAppointmentId(appointment.id);
      
      if (client[0] && service[0]) {
        results.push({
          ...appointment,
          client: client[0],
          service: service[0],
          appointmentServices: appointmentServicesData,
        });
      }
    }
    
    return results;
  }

  async getTodayAppointments(userId: number): Promise<AppointmentWithRelations[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    console.log(`[DB QUERY] Getting today's appointments for user ${userId}`);
    console.log(`[DB QUERY] Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    // Get all today's appointments and filter out cancelled ones
    const allTodayAppointments = await this.getAppointmentsByUserId(userId, startOfDay, endOfDay);
    
    // Filter to only include confirmed and pending appointments
    const results = allTodayAppointments.filter(apt => 
      apt.status === 'confirmed' || apt.status === 'pending'
    );

    console.log(`[DB QUERY] Found ${results.length} active appointments for today`);
    results.forEach(result => {
      console.log(`[DB QUERY] Appointment ${result.id}: ${result.client.name}, Status: ${result.status}, Time: ${result.scheduledAt}`);
    });

    return results;
  }

  async getPendingAppointments(userId: number): Promise<AppointmentWithRelations[]> {
    const results = await db
      .select({
        appointment: appointments,
        client: clients,
        service: services
      })
      .from(appointments)
      .innerJoin(clients, eq(appointments.clientId, clients.id))
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.userId, userId),
          eq(appointments.status, 'pending')
        )
      )
      .orderBy(appointments.scheduledAt);

    // Load appointment services for each appointment
    const finalResults: AppointmentWithRelations[] = [];
    for (const result of results) {
      const appointmentServicesData = await this.getAppointmentServicesByAppointmentId(result.appointment.id);
      finalResults.push({
        ...result.appointment,
        client: result.client,
        service: result.service,
        appointmentServices: appointmentServicesData,
      });
    }

    return finalResults;
  }

  async getAppointment(id: number): Promise<AppointmentWithRelations | undefined> {
    const appointment = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    if (!appointment[0]) return undefined;
    
    const client = await db.select().from(clients).where(eq(clients.id, appointment[0].clientId)).limit(1);
    const service = await db.select().from(services).where(eq(services.id, appointment[0].serviceId)).limit(1);
    const appointmentServicesData = await this.getAppointmentServicesByAppointmentId(appointment[0].id);
    
    if (!client[0] || !service[0]) return undefined;
    
    return {
      ...appointment[0],
      client: client[0],
      service: service[0],
      appointmentServices: appointmentServicesData,
    };
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
    // Use a transaction to ensure all deletions succeed or fail together
    await db.transaction(async (tx) => {
      console.log('Deleting appointment with ID:', id);
      
      // First, nullify notification references to this appointment
      await tx.update(notifications)
        .set({ appointmentId: null })
        .where(eq(notifications.appointmentId, id));
      console.log('Nullified notification references for appointment:', id);
      
      // Delete appointment services (these should cascade)
      await tx.delete(appointmentServices).where(eq(appointmentServices.appointmentId, id));
      console.log('Deleted appointment services for appointment:', id);
      
      // Delete related gallery photos
      await tx.delete(galleryPhotos).where(eq(galleryPhotos.appointmentId, id));
      console.log('Deleted gallery photos for appointment:', id);
      
      // Delete related invoices
      await tx.delete(invoices).where(eq(invoices.appointmentId, id));
      console.log('Deleted invoices for appointment:', id);
      
      // Finally delete the appointment
      await tx.delete(appointments).where(eq(appointments.id, id));
      console.log('Successfully deleted appointment:', id);
    });
  }

  async expireAppointment(id: number): Promise<void> {
    await db
      .update(appointments)
      .set({ status: 'expired' })
      .where(eq(appointments.id, id));
  }

  async getExpiredAppointments(): Promise<AppointmentWithRelations[]> {
    const results = await db
      .select({
        appointment: appointments,
        client: clients,
        service: services
      })
      .from(appointments)
      .innerJoin(clients, eq(appointments.clientId, clients.id))
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.status, 'pending'),
          lte(appointments.expiresAt, new Date())
        )
      )
      .orderBy(appointments.scheduledAt);

    // Load appointment services for each appointment
    const finalResults: AppointmentWithRelations[] = [];
    for (const result of results) {
      const appointmentServicesData = await this.getAppointmentServicesByAppointmentId(result.appointment.id);
      finalResults.push({
        ...result.appointment,
        client: result.client,
        service: result.service,
        appointmentServices: appointmentServicesData
      });
    }

    return finalResults;
  }

  async cleanupExpiredAppointments(): Promise<number> {
    const expiredAppointments = await this.getExpiredAppointments();
    let expiredCount = 0;

    for (const appointment of expiredAppointments) {
      await this.expireAppointment(appointment.id);
      expiredCount++;
    }

    return expiredCount;
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



  // Messages
  async getMessagesByUserId(userId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.userId, userId)).orderBy(desc(messages.createdAt));
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message> {
    const [updatedMessage] = await db.update(messages)
      .set(message)
      .where(eq(messages.id, id))
      .returning();
    return updatedMessage;
  }

  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  async markMessageAsRead(id: number): Promise<Message> {
    const [updatedMessage] = await db.update(messages)
      .set({ 
        status: "read",
        readAt: new Date()
      })
      .where(eq(messages.id, id))
      .returning();
    return updatedMessage;
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.userId, userId), eq(messages.status, "unread")));
    return result?.count || 0;
  }

  // Appointment Services methods
  async createAppointmentService(appointmentService: InsertAppointmentService): Promise<AppointmentService> {
    const [newAppointmentService] = await db
      .insert(appointmentServices)
      .values(appointmentService)
      .returning();
    return newAppointmentService;
  }

  async getAppointmentServicesByAppointmentId(appointmentId: number): Promise<(AppointmentService & { service: Service })[]> {
    const result = await db
      .select({
        id: appointmentServices.id,
        appointmentId: appointmentServices.appointmentId,
        serviceId: appointmentServices.serviceId,
        quantity: appointmentServices.quantity,
        price: appointmentServices.price,
        createdAt: appointmentServices.createdAt,
        service: services
      })
      .from(appointmentServices)
      .innerJoin(services, eq(appointmentServices.serviceId, services.id))
      .where(eq(appointmentServices.appointmentId, appointmentId));
    
    return result;
  }

  async deleteAppointmentServicesByAppointmentId(appointmentId: number): Promise<void> {
    await db
      .delete(appointmentServices)
      .where(eq(appointmentServices.appointmentId, appointmentId));
  }

  // Reservation methods
  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    const [newReservation] = await db
      .insert(reservations)
      .values(reservation)
      .returning();
    return newReservation;
  }

  async getReservation(id: number): Promise<Reservation | undefined> {
    const [reservation] = await db.select().from(reservations).where(eq(reservations.id, id));
    return reservation || undefined;
  }

  async getReservationsByUserId(userId: number): Promise<Reservation[]> {
    return await db.select().from(reservations).where(eq(reservations.userId, userId));
  }

  async updateReservation(id: number, reservationUpdate: Partial<InsertReservation>): Promise<Reservation> {
    const [updatedReservation] = await db
      .update(reservations)
      .set(reservationUpdate)
      .where(eq(reservations.id, id))
      .returning();
    return updatedReservation;
  }

  async deleteReservation(id: number): Promise<void> {
    await db.delete(reservations).where(eq(reservations.id, id));
  }

  async expireReservation(id: number): Promise<void> {
    await db
      .update(reservations)
      .set({ status: "expired" })
      .where(eq(reservations.id, id));
  }

  async getActiveReservationsForTimeSlot(userId: number, scheduledAt: Date, duration: number): Promise<Reservation[]> {
    const endTime = new Date(scheduledAt.getTime() + duration * 60000);
    
    return await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.userId, userId),
          eq(reservations.status, "pending"),
          gte(reservations.expiresAt, new Date()), // Not expired
          // Check for time overlap
          sql`${reservations.scheduledAt} < ${endTime} AND ${reservations.scheduledAt} + INTERVAL '1 minute' * ${reservations.duration} > ${scheduledAt}`
        )
      );
  }

  async getExpiredReservations(): Promise<Reservation[]> {
    return await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.status, "pending"),
          lte(reservations.expiresAt, new Date())
        )
      );
  }

  async confirmReservation(id: number): Promise<Reservation> {
    const [confirmedReservation] = await db
      .update(reservations)
      .set({ status: "confirmed" })
      .where(eq(reservations.id, id))
      .returning();
    return confirmedReservation;
  }

  async getDashboardStats(userId: number): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get today's appointments and earnings
    const todayAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, userId),
          gte(appointments.scheduledAt, today),
          lte(appointments.scheduledAt, tomorrow)
        )
      );

    const dailyEarnings = todayAppointments.reduce((sum, apt) => sum + parseFloat(apt.price), 0);

    // Get weekly earnings
    const weeklyAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, userId),
          gte(appointments.scheduledAt, startOfWeek),
          eq(appointments.status, "confirmed")
        )
      );

    const weeklyEarnings = weeklyAppointments.reduce((sum, apt) => sum + parseFloat(apt.price), 0);

    // Get monthly earnings
    const monthlyAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, userId),
          gte(appointments.scheduledAt, startOfMonth),
          eq(appointments.status, "confirmed")
        )
      );

    const monthlyEarnings = monthlyAppointments.reduce((sum, apt) => sum + parseFloat(apt.price), 0);

    // Get total clients count
    const [clientCount] = await db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.userId, userId));

    return {
      dailyEarnings: dailyEarnings.toFixed(2),
      appointmentCount: todayAppointments.length,
      weeklyEarnings: weeklyEarnings.toFixed(2),
      monthlyEarnings: monthlyEarnings.toFixed(2),
      totalClients: clientCount?.count || 0,
    };
  }

  // Notification methods
  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const [updatedNotification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updatedNotification;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result?.count || 0;
  }
}

export const storage = new DatabaseStorage();
