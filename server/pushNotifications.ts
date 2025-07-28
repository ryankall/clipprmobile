import { db } from "./db";
import { users, appointments, clients, appointmentServices, services } from "../shared/schema.js";
import { eq, and, gte, lte } from "drizzle-orm";
import { format } from "date-fns";

interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushNotificationService {
  sendNotification(userId: string, payload: PushNotificationPayload): Promise<boolean>;
  subscribeUser(userId: string, subscription: NotificationSubscription): Promise<boolean>;
  unsubscribeUser(userId: string): Promise<boolean>;
  getSubscription(userId: string): Promise<NotificationSubscription | null>;
}

class MockPushNotificationService implements PushNotificationService {
  private subscriptions: Map<string, NotificationSubscription> = new Map();
  private sentNotifications: Array<{
    userId: string;
    payload: PushNotificationPayload;
    timestamp: Date;
  }> = [];

  async sendNotification(userId: string, payload: PushNotificationPayload): Promise<boolean> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      console.log(`No subscription found for user ${userId}`);
      return false;
    }

    // In a real implementation, this would use web-push library
    // For now, we'll simulate sending the notification
    this.sentNotifications.push({
      userId,
      payload,
      timestamp: new Date()
    });

    console.log(`Push notification sent to user ${userId}:`, payload);
    return true;
  }

  async subscribeUser(userId: string, subscription: NotificationSubscription): Promise<boolean> {
    this.subscriptions.set(userId, subscription);
    return true;
  }

  async unsubscribeUser(userId: string): Promise<boolean> {
    return this.subscriptions.delete(userId);
  }

  async getSubscription(userId: string): Promise<NotificationSubscription | null> {
    return this.subscriptions.get(userId) || null;
  }

  // Test utility methods
  getSentNotifications(): Array<{
    userId: string;
    payload: PushNotificationPayload;
    timestamp: Date;
  }> {
    return this.sentNotifications;
  }

  clearSentNotifications(): void {
    this.sentNotifications = [];
  }

  getSubscriptionsCount(): number {
    return this.subscriptions.size;
  }
}

export const pushNotificationService = new MockPushNotificationService();

// Notification helper functions
export async function sendNewBookingRequestNotification(
  barberId: string,
  clientName: string,
  serviceRequested: string,
  preferredDate: string,
  preferredTime: string
): Promise<boolean> {
  const payload: PushNotificationPayload = {
    title: "🆕 New Booking Request Received",
    body: `New booking request from ${clientName} for a ${serviceRequested} on ${preferredDate} at ${preferredTime}. Tap to review.`,
    data: {
      type: "booking_request",
      clientName,
      serviceRequested,
      preferredDate,
      preferredTime
    },
    icon: "/icon-192x192.png",
    tag: "booking_request",
    requireInteraction: true
  };

  return await pushNotificationService.sendNotification(barberId, payload);
}

export async function sendAppointmentConfirmedNotification(
  barberId: string,
  clientName: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<boolean> {
  const payload: PushNotificationPayload = {
    title: "✅ Appointment Confirmed by Client",
    body: `${clientName} confirmed their appointment for ${appointmentDate} at ${appointmentTime}.`,
    data: {
      type: "appointment_confirmed",
      clientName,
      appointmentDate,
      appointmentTime
    },
    icon: "/icon-192x192.png",
    tag: "appointment_confirmed"
  };

  return await pushNotificationService.sendNotification(barberId, payload);
}

export async function sendAppointmentCancelledNotification(
  barberId: string,
  clientName: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<boolean> {
  const payload: PushNotificationPayload = {
    title: "❌ Appointment Cancelled by Client",
    body: `${clientName} cancelled their appointment for ${appointmentDate} at ${appointmentTime}.`,
    data: {
      type: "appointment_cancelled",
      clientName,
      appointmentDate,
      appointmentTime
    },
    icon: "/icon-192x192.png",
    tag: "appointment_cancelled"
  };

  return await pushNotificationService.sendNotification(barberId, payload);
}

export async function sendUpcomingAppointmentReminder(
  barberId: string,
  clientName: string,
  serviceType: string,
  appointmentTime: string,
  travelTime?: string
): Promise<boolean> {
  const travelInfo = travelTime ? ` (${travelTime} travel time)` : "";
  
  const payload: PushNotificationPayload = {
    title: "⏰ Upcoming Appointment Reminder",
    body: `Next up: ${serviceType} with ${clientName} at ${appointmentTime}${travelInfo}.`,
    data: {
      type: "appointment_reminder",
      clientName,
      serviceType,
      appointmentTime,
      travelTime
    },
    icon: "/icon-192x192.png",
    tag: "appointment_reminder",
    requireInteraction: true
  };

  return await pushNotificationService.sendNotification(barberId, payload);
}

// Scheduled notification system
export async function scheduleUpcomingAppointmentReminders(): Promise<void> {
  try {
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const thirtyFiveMinutesFromNow = new Date(now.getTime() + 35 * 60 * 1000);

    // Find appointments starting in 30-35 minutes  
    const upcomingAppointments = await db
      .select({
        id: appointments.id,
        userId: appointments.userId,
        scheduledAt: appointments.scheduledAt,
        client: {
          name: clients.name
        }
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .where(
        and(
          eq(appointments.status, "confirmed"),
          gte(appointments.scheduledAt, thirtyMinutesFromNow),
          lte(appointments.scheduledAt, thirtyFiveMinutesFromNow)
        )
      );

    for (const appointment of upcomingAppointments) {
      const appointmentTime = format(new Date(appointment.scheduledAt), "h:mm a");
      
      // Get service names for this appointment
      const appointmentServices = await db
        .select({
          serviceName: services.name
        })
        .from(appointmentServices)
        .leftJoin(services, eq(appointmentServices.serviceId, services.id))
        .where(eq(appointmentServices.appointmentId, appointment.id));
      
      const serviceType = appointmentServices.length > 0 
        ? appointmentServices.map(as => as.serviceName).join(", ")
        : "Appointment";
      
      await sendUpcomingAppointmentReminder(
        appointment.userId.toString(),
        appointment.client?.name || "Client",
        serviceType,
        appointmentTime
      );
    }
  } catch (error) {
    console.error("Error scheduling appointment reminders:", error);
  }
}

// Auto-schedule reminders every 5 minutes
export function startReminderScheduler(): void {
  setInterval(scheduleUpcomingAppointmentReminders, 5 * 60 * 1000);
}