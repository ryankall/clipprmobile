import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password"), // nullable for OAuth users
  phone: text("phone").notNull(), // required for signup
  businessName: text("business_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  address: text("address"),
  homeBaseAddress: text("home_base_address"), // starting point for first appointment
  photoUrl: text("photo_url"),
  serviceArea: text("service_area"),
  about: text("about"),
  workingHours: json("working_hours").default({}),
  travelTimeBuffer: integer("travel_time_buffer").default(15), // minutes (fallback)
  defaultGraceTime: integer("default_grace_time").default(5), // minutes to add to calculated travel time
  
  // OAuth fields
  googleId: text("google_id"),
  appleId: text("apple_id"),
  
  // Stripe integration
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  
  // Account verification
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  photoUrl: text("photo_url"),
  preferredStyle: text("preferred_style"),
  notes: text("notes"),
  loyaltyStatus: text("loyalty_status").default("regular"), // regular, vip
  lastVisit: timestamp("last_visit"),
  totalVisits: integer("total_visits").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(), // minutes
  category: text("category").notNull(), // haircut, beard, combo, custom
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  serviceId: integer("service_id").notNull().references(() => services.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, confirmed, in_progress, completed, cancelled
  notes: text("notes"),
  address: text("address"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointmentServices = pgTable("appointment_services", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").notNull().references(() => services.id),
  quantity: integer("quantity").notNull().default(1),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tip: decimal("tip", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, paid, cancelled
  paymentMethod: text("payment_method"), // stripe, apple_pay, cash
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const galleryPhotos = pgTable("gallery_photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").references(() => clients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  photoUrl: text("photo_url").notNull(),
  type: text("type").notNull(), // before, after, portfolio
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").references(() => clients.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("unread"), // unread, read, replied, archived
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  serviceRequested: text("service_requested"),
  preferredDate: timestamp("preferred_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
  repliedAt: timestamp("replied_at"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  services: many(services),
  appointments: many(appointments),
  invoices: many(invoices),
  galleryPhotos: many(galleryPhotos),
  messages: many(messages),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  appointments: many(appointments),
  invoices: many(invoices),
  galleryPhotos: many(galleryPhotos),
  messages: many(messages),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  user: one(users, {
    fields: [services.userId],
    references: [users.id],
  }),
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  user: one(users, {
    fields: [appointments.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [appointments.clientId],
    references: [clients.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  appointmentServices: many(appointmentServices),
  invoice: one(invoices),
  galleryPhotos: many(galleryPhotos),
}));

export const appointmentServicesRelations = relations(appointmentServices, ({ one }) => ({
  appointment: one(appointments, {
    fields: [appointmentServices.appointmentId],
    references: [appointments.id],
  }),
  service: one(services, {
    fields: [appointmentServices.serviceId],
    references: [services.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  appointment: one(appointments, {
    fields: [invoices.appointmentId],
    references: [appointments.id],
  }),
}));

export const galleryPhotosRelations = relations(galleryPhotos, ({ one }) => ({
  user: one(users, {
    fields: [galleryPhotos.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [galleryPhotos.clientId],
    references: [clients.id],
  }),
  appointment: one(appointments, {
    fields: [galleryPhotos.appointmentId],
    references: [appointments.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [messages.clientId],
    references: [clients.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  totalVisits: true,
  lastVisit: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  reminderSent: true,
});

export const insertAppointmentServiceSchema = createInsertSchema(appointmentServices).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertGalleryPhotoSchema = createInsertSchema(galleryPhotos).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  readAt: true,
  repliedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertAppointmentService = z.infer<typeof insertAppointmentServiceSchema>;
export type AppointmentService = typeof appointmentServices.$inferSelect;

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export type InsertGalleryPhoto = z.infer<typeof insertGalleryPhotoSchema>;
export type GalleryPhoto = typeof galleryPhotos.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Extended types for API responses
export type AppointmentWithRelations = Appointment & {
  client: Client;
  service: Service;
  appointmentServices?: (AppointmentService & { service: Service })[];
};

export type ClientWithStats = Client & {
  totalSpent?: string;
  upcomingAppointments?: number;
};

export type DashboardStats = {
  dailyEarnings: string;
  appointmentCount: number;
  weeklyEarnings: string;
  monthlyEarnings: string;
  totalClients: number;
};
