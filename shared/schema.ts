import { pgTable, text, serial, integer, boolean, timestamp, decimal, numeric, json, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, isNotNull } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password"), // nullable for OAuth users
  phone: text("phone").notNull().unique(), // required for signup
  businessName: text("business_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  address: text("address"),
  homeBaseAddress: text("home_base_address"), // starting point for first appointment
  photoUrl: text("photo_url"),
  serviceArea: text("service_area"),
  about: text("about"),
  workingHours: json("working_hours").default({}),
  timezone: text("timezone").default("America/New_York"), // user's timezone for appointment scheduling
  travelTimeBuffer: integer("travel_time_buffer").default(15), // minutes (fallback)
  defaultGraceTime: integer("default_grace_time").default(5), // minutes to add to calculated travel time
  transportationMode: text("transportation_mode").default("driving"), // driving, walking, cycling, transit
  
  // OAuth fields
  googleId: text("google_id"),
  appleId: text("apple_id"),
  
  // Stripe integration
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("basic"), // basic, premium, cancelled
  subscriptionStartDate: timestamp("subscription_start_date"), // for refund eligibility
  subscriptionEndDate: timestamp("subscription_end_date"), // when premium access ends
  subscriptionInterval: text("subscription_interval"), // monthly, yearly
  lastPaymentIntentId: text("last_payment_intent_id"), // for refunds
  
  // Account verification
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false), // required for appointment booking
  phoneVerificationCode: text("phone_verification_code"), // SMS verification code
  phoneVerificationExpiry: timestamp("phone_verification_expiry"), // expiry time for code
  phoneVerificationAttempts: integer("phone_verification_attempts").default(0), // rate limiting
  
  // Photo storage limits
  totalPhotoSize: integer("total_photo_size").default(0), // total photo size in bytes
  maxPhotoSize: integer("max_photo_size").default(524288000), // 500MB limit
  
  // Quick action message templates
  quickActionMessages: json("quick_action_messages").default({
    onMyWay: "Hi {client_name}, I'm on my way to your {appointment_time} appointment for {service}. See you soon!",
    runningLate: "Hi {client_name}, I'm running a few minutes late for your {appointment_time} appointment. Will be there shortly!",
    confirmation: "Hi {client_name}, confirming your appointment for {appointment_time} at {address} for {service}."
  }),
  
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
  totalVisits: integer("total_visits").default(0),
  lastVisit: timestamp("last_visit"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userPhoneIndex: uniqueIndex("clients_user_phone_idx").on(table.userId, table.phone),
}));

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
  status: text("status").notNull().default("pending"), // pending, confirmed, cancelled, expired, no_show
  notes: text("notes"),
  address: text("address"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(),
  travelTime: integer("travel_time").default(0), // travel time in minutes
  reminderSent: boolean("reminder_sent").default(false),
  expiresAt: timestamp("expires_at"), // For pending appointments, auto-expire after 30 minutes
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
  paymentStatus: text("payment_status").notNull().default("unpaid"), // paid, unpaid
  paymentMethod: text("payment_method"), // stripe, apple_pay, cash, card
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  sendEmail: boolean("send_email").default(false),
  sendSMS: boolean("send_sms").default(false),
  emailSent: boolean("email_sent").default(false),
  smsSent: boolean("sms_sent").default(false),
  paidAt: timestamp("paid_at"),
  paidBy: text("paid_by"), // who marked it as paid (for cash payments)
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoiceServices = pgTable("invoice_services", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").notNull().references(() => services.id),
  quantity: integer("quantity").notNull().default(1),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const defaultInvoiceTemplates = pgTable("default_invoice_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").default("receipt-outline"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  serviceIds: json("service_ids").$type<number[]>().default([]), // array of service IDs
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
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
  fileSize: integer("file_size").default(0), // file size in bytes
  createdAt: timestamp("created_at").defaultNow(),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull(), // in minutes
  services: text("services").array().default([]), // service IDs as strings
  address: text("address"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // pending, confirmed, expired, cancelled
  expiresAt: timestamp("expires_at").notNull(),
  confirmationSent: boolean("confirmation_sent").default(false),
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
  serviceIds: text("service_ids").array().default([]), // service IDs for booking requests
  preferredDate: timestamp("preferred_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
  repliedAt: timestamp("replied_at"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // appointment_confirmed, appointment_cancelled, appointment_expired
  title: text("title").notNull(),
  message: text("message").notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  clientName: text("client_name"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Anti-spam protection tables
export const rateLimitEntries = pgTable("rate_limit_entries", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  requestCount: integer("request_count").notNull().default(1),
  firstRequestAt: timestamp("first_request_at").notNull().defaultNow(),
  lastRequestAt: timestamp("last_request_at").notNull().defaultNow(),
  resetAt: timestamp("reset_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  phoneNumberIndex: uniqueIndex("rate_limit_phone_idx").on(table.phoneNumber),
}));

export const blockedClients = pgTable("blocked_clients", {
  id: serial("id").primaryKey(),
  barberId: integer("barber_id").notNull().references(() => users.id),
  phoneNumber: text("phone_number").notNull(),
  reason: text("reason"),
  blockedAt: timestamp("blocked_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  barberPhoneIndex: uniqueIndex("blocked_clients_barber_phone_idx").on(table.barberId, table.phoneNumber),
}));

export const bookingRequestLogs = pgTable("booking_request_logs", {
  id: serial("id").primaryKey(),
  barberId: integer("barber_id").notNull().references(() => users.id),
  phoneNumber: text("phone_number").notNull(),
  clientName: text("client_name"),
  requestType: text("request_type").notNull(), // booking_request, rate_limited, blocked
  allowed: boolean("allowed").notNull(),
  errorMessage: text("error_message"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  services: many(services),
  appointments: many(appointments),
  invoices: many(invoices),
  galleryPhotos: many(galleryPhotos),
  messages: many(messages),
  reservations: many(reservations),
  notifications: many(notifications),
  blockedClients: many(blockedClients),
  bookingRequestLogs: many(bookingRequestLogs),
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

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
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
  invoiceServices: many(invoiceServices),
}));

export const invoiceServicesRelations = relations(invoiceServices, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceServices.invoiceId],
    references: [invoices.id],
  }),
  service: one(services, {
    fields: [invoiceServices.serviceId],
    references: [services.id],
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

export const reservationsRelations = relations(reservations, ({ one }) => ({
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  appointment: one(appointments, {
    fields: [notifications.appointmentId],
    references: [appointments.id],
  }),
}));

export const blockedClientsRelations = relations(blockedClients, ({ one }) => ({
  barber: one(users, {
    fields: [blockedClients.barberId],
    references: [users.id],
  }),
}));

export const bookingRequestLogsRelations = relations(bookingRequestLogs, ({ one }) => ({
  barber: one(users, {
    fields: [bookingRequestLogs.barberId],
    references: [users.id],
  }),
}));

export const defaultInvoiceTemplatesRelations = relations(defaultInvoiceTemplates, ({ one }) => ({
  user: one(users, {
    fields: [defaultInvoiceTemplates.userId],
    references: [users.id],
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

export const insertInvoiceServiceSchema = createInsertSchema(invoiceServices).omit({
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

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertRateLimitEntrySchema = createInsertSchema(rateLimitEntries).omit({
  id: true,
  createdAt: true,
});

export const insertBlockedClientSchema = createInsertSchema(blockedClients).omit({
  id: true,
  createdAt: true,
});

export const insertBookingRequestLogSchema = createInsertSchema(bookingRequestLogs).omit({
  id: true,
  createdAt: true,
});

export const insertDefaultInvoiceTemplateSchema = createInsertSchema(defaultInvoiceTemplates).omit({
  id: true,
  createdAt: true,
});

// Invoice Templates table
export const invoiceTemplates = pgTable("invoice_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  serviceIds: jsonb("service_ids").default([]).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvoiceTemplateSchema = createInsertSchema(invoiceTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type InsertInvoiceService = z.infer<typeof insertInvoiceServiceSchema>;
export type InvoiceService = typeof invoiceServices.$inferSelect;

export type InsertGalleryPhoto = z.infer<typeof insertGalleryPhotoSchema>;
export type GalleryPhoto = typeof galleryPhotos.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservations.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertRateLimitEntry = z.infer<typeof insertRateLimitEntrySchema>;
export type RateLimitEntry = typeof rateLimitEntries.$inferSelect;

export type InsertBlockedClient = z.infer<typeof insertBlockedClientSchema>;
export type BlockedClient = typeof blockedClients.$inferSelect;

export type InsertBookingRequestLog = z.infer<typeof insertBookingRequestLogSchema>;
export type BookingRequestLog = typeof bookingRequestLogs.$inferSelect;

export type InsertDefaultInvoiceTemplate = z.infer<typeof insertDefaultInvoiceTemplateSchema>;
export type DefaultInvoiceTemplate = typeof defaultInvoiceTemplates.$inferSelect;

export type InsertInvoiceTemplate = z.infer<typeof insertInvoiceTemplateSchema>;
export type InvoiceTemplate = typeof invoiceTemplates.$inferSelect;

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
