import { Request, Response } from 'express';
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, setupAuth } from './auth';
import multer from 'multer';
import { insertClientSchema, insertServiceSchema, insertAppointmentSchema, insertInvoiceSchema, insertGalleryPhotoSchema, insertMessageSchema, appointments, reservations } from "@shared/schema";
import { db } from "./db";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import passport from 'passport';
import Stripe from 'stripe';
import { travelTimeService } from "./travelTimeService";
import { format } from "date-fns";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Only allow JPEG, PNG, and WEBP images
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error('Only JPEG, PNG, and WEBP images are allowed') as any;
      cb(error, false);
    }
  }
});

// Initialize Stripe if secret key is provided
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
}) : null;

if (!stripe) {
  console.warn('Stripe not configured. Set STRIPE_SECRET_KEY environment variable to enable payments.');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize authentication middleware
  setupAuth(app);

  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email address is already registered" });
      }

      // Check for existing phone number
      const existingPhoneUser = await storage.getUserByPhone(phone);
      if (existingPhoneUser) {
        return res.status(400).json({ message: "Phone number is already registered" });
      }

      const user = await storage.createUser({
        email,
        password,
        firstName,
        lastName,
        phone
      });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          businessName: user.businessName,
          photoUrl: user.photoUrl,
          serviceArea: user.serviceArea,
          about: user.about,
        },
        message: "User created successfully"
      });
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === '23505') {
        if (error.constraint === 'users_email_unique') {
          return res.status(400).json({ message: "Email address is already registered" });
        }
        if (error.constraint === 'users_phone_unique') {
          return res.status(400).json({ message: "Phone number is already registered" });
        }
      }
      console.error("Signup error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // In a real app, you'd verify the password hash here
      // For now, we'll just check if password exists
      if (!password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const { generateToken } = await import('./auth');
      const token = generateToken(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          businessName: user.businessName,
          photoUrl: user.photoUrl,
          serviceArea: user.serviceArea,
          about: user.about,
        },
        token,
        message: "Sign in successful"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/signout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Signed out successfully" });
    });
  });

  // Google OAuth routes
  app.get("/api/auth/google", passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get("/api/auth/google/callback", 
    passport.authenticate('google', { failureRedirect: '/auth' }),
    async (req, res) => {
      const { generateToken } = await import('./auth');
      const token = generateToken((req.user as any).id);
      
      // Redirect to frontend with token
      res.redirect(`/?token=${token}`);
    }
  );

  // Apple OAuth routes
  app.get("/api/auth/apple", passport.authenticate('apple'));

  app.post("/api/auth/apple/callback", 
    passport.authenticate('apple', { failureRedirect: '/auth' }),
    async (req, res) => {
      const { generateToken } = await import('./auth');
      const token = generateToken((req.user as any).id);
      
      // Redirect to frontend with token
      res.redirect(`/?token=${token}`);
    }
  );

  // Contact form route (public)
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, message } = req.body;
      
      // In a real app, you'd send this to your email service
      console.log('Contact form submission:', { name, email, message });
      
      res.json({ message: "Message sent successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser((req.user as any).id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        businessName: user.businessName,
        photoUrl: user.photoUrl,
        serviceArea: user.serviceArea,
        about: user.about,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User profile routes
  app.get("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      console.log('Updating user profile:', userId, JSON.stringify(req.body, null, 2));
      const user = await storage.updateUser(userId, req.body);
      console.log('Updated user successfully');
      res.json(user);
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Appointments routes
  app.get("/api/appointments", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const appointments = await storage.getAppointmentsByUserId(userId, start, end);
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/appointments/today", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointments = await storage.getTodayAppointments(userId);
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get pending appointments awaiting confirmation
  app.get("/api/appointments/pending", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const pendingAppointments = await storage.getPendingAppointments(userId);
      res.json(pendingAppointments);
    } catch (error: any) {
      console.error('Pending appointments fetch error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Cleanup expired appointments
  app.post("/api/appointments/expire", requireAuth, async (req, res) => {
    try {
      const expiredCount = await storage.cleanupExpiredAppointments();
      console.log(`Expired ${expiredCount} appointments`);
      res.json({ success: true, expiredCount });
    } catch (error: any) {
      console.error('Error expiring appointments:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/appointments", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      console.log('Creating appointment with data:', JSON.stringify(req.body, null, 2));
      
      // Handle both old single service format and new multiple services format
      let services = [];
      if (req.body.services && Array.isArray(req.body.services)) {
        // New format with multiple services
        services = req.body.services;
      } else if (req.body.serviceId) {
        // Old format with single service - convert to new format
        services = [{ serviceId: req.body.serviceId, quantity: 1 }];
      } else {
        return res.status(400).json({ message: "Services are required" });
      }

      if (services.length === 0) {
        return res.status(400).json({ message: "At least one service is required" });
      }

      // Get all service details and calculate totals
      let totalPrice = 0;
      let totalDuration = 0;
      const serviceDetails = [];

      for (const serviceSelection of services) {
        const service = await storage.getService(serviceSelection.serviceId);
        if (!service) {
          return res.status(400).json({ message: `Service with ID ${serviceSelection.serviceId} not found` });
        }
        
        const quantity = serviceSelection.quantity || 1;
        const serviceTotalPrice = parseFloat(service.price) * quantity;
        const serviceTotalDuration = service.duration * quantity;
        
        totalPrice += serviceTotalPrice;
        totalDuration += serviceTotalDuration;
        
        serviceDetails.push({
          service,
          quantity,
          price: serviceTotalPrice.toFixed(2)
        });
      }

      // Parse the datetime and store as UTC
      const appointmentDate = new Date(req.body.scheduledAt);
      const nowUTC = new Date();
      
      console.log('Appointment date (UTC):', appointmentDate.toISOString());
      console.log('Current server time (UTC):', nowUTC.toISOString());
      
      // Convert to UTC for storage and comparison
      const appointmentUTC = new Date(appointmentDate.toISOString());
      
      // Add a small buffer (2 minutes) to account for network delays and timezone conversion
      const twoMinutesAgo = new Date(nowUTC.getTime() - 2 * 60 * 1000);
      
      if (appointmentUTC < twoMinutesAgo) {
        return res.status(400).json({ 
          message: `Cannot schedule appointments in the past. Please select a future time.` 
        });
      }

      // Use the first service as the primary service for backward compatibility
      const primaryService = serviceDetails[0].service;

      const dataToValidate = {
        ...req.body,
        userId,
        serviceId: primaryService.id, // Keep for backward compatibility
        price: totalPrice.toFixed(2),
        duration: totalDuration,
        scheduledAt: appointmentUTC,
        travelTime: req.body.travelTime || 0
      };
      
      console.log('Data to validate:', JSON.stringify(dataToValidate, null, 2));
      const appointmentData = insertAppointmentSchema.parse(dataToValidate);
      
      // OVERLAP DETECTION: Check for overlapping appointments
      const appointmentStart = new Date(appointmentUTC);
      const travelTime = req.body.travelTime || 0;
      // Include travel time in overlap calculation only when travel is enabled
      const totalCalendarDuration = totalDuration + travelTime;
      const appointmentEnd = new Date(appointmentStart.getTime() + totalCalendarDuration * 60 * 1000);
      
      console.log('=== OVERLAP DETECTION ===');
      console.log('New appointment window:', {
        start: appointmentStart.toISOString(),
        end: appointmentEnd.toISOString(),
        serviceDuration: totalDuration + ' minutes',
        travelTime: travelTime + ' minutes',
        totalCalendarDuration: totalCalendarDuration + ' minutes'
      });
      
      // Get existing appointments for this user around the same time
      const existingAppointments = await storage.getAppointmentsByUserId(
        userId, 
        new Date(appointmentStart.getTime() - 24 * 60 * 60 * 1000), // 24 hours before
        new Date(appointmentEnd.getTime() + 24 * 60 * 60 * 1000)     // 24 hours after
      );
      
      // Filter to only appointments that block time slots (exclude cancelled, expired, no_show)
      const blockingAppointments = existingAppointments.filter(apt => 
        apt.status === 'confirmed' || apt.status === 'pending'
      );
      
      console.log('Existing confirmed/pending appointments:', blockingAppointments.map(apt => ({
        id: apt.id,
        clientName: apt.client.name,
        scheduledAt: apt.scheduledAt,
        duration: apt.duration,
        status: apt.status,
        endTime: new Date(new Date(apt.scheduledAt).getTime() + apt.duration * 60 * 1000).toISOString()
      })));
      
      // Check for overlaps
      const overlappingAppointments = blockingAppointments.filter(existingApt => {
        const existingStart = new Date(existingApt.scheduledAt);
        const existingEnd = new Date(existingStart.getTime() + existingApt.duration * 60 * 1000);
        
        // Check if appointments overlap
        const overlap = (appointmentStart < existingEnd && appointmentEnd > existingStart);
        
        if (overlap) {
          console.log('OVERLAP DETECTED with appointment:', {
            existingId: existingApt.id,
            existingClient: existingApt.client.name,
            existingStart: existingStart.toISOString(),
            existingEnd: existingEnd.toISOString(),
            newStart: appointmentStart.toISOString(),
            newEnd: appointmentEnd.toISOString()
          });
        }
        
        return overlap;
      });
      
      if (overlappingAppointments.length > 0) {
        const conflictDetails = overlappingAppointments.map(apt => {
          const start = new Date(apt.scheduledAt);
          const end = new Date(start.getTime() + apt.duration * 60 * 1000);
          return `${apt.client.name} (${format(start, 'h:mm a')} - ${format(end, 'h:mm a')})`;
        }).join(', ');
        
        console.log('BLOCKING APPOINTMENT CREATION due to overlap with:', conflictDetails);
        return res.status(409).json({ 
          message: `Time slot conflicts with existing appointment(s): ${conflictDetails}. Please choose a different time.`,
          conflicts: overlappingAppointments.map(apt => ({
            id: apt.id,
            clientName: apt.client.name,
            startTime: apt.scheduledAt,
            duration: apt.duration
          }))
        });
      }
      
      console.log('✅ NO OVERLAPS DETECTED - Proceeding with appointment creation');
      
      // Create appointment with pending status (requires SMS confirmation)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // Expires in 30 minutes
      const appointment = await storage.createAppointment({
        ...appointmentData,
        userId,
        scheduledAt: appointmentUTC,
        duration: totalDuration,
        price: totalPrice.toFixed(2),
        status: 'pending', // Pending until SMS confirmation
        expiresAt
      });
      
      console.log(`✅ Appointment created successfully with ID: ${appointment.id}`);
      
      // Create appointment services records for each service
      console.log(`Creating ${serviceDetails.length} appointment services for appointment ${appointment.id}`);
      for (const serviceDetail of serviceDetails) {
        try {
          console.log(`Creating appointment service: appointmentId=${appointment.id}, serviceId=${serviceDetail.service.id}, quantity=${serviceDetail.quantity}, price=${serviceDetail.price}`);
          await storage.createAppointmentService({
            appointmentId: appointment.id,
            serviceId: serviceDetail.service.id,
            quantity: serviceDetail.quantity,
            price: serviceDetail.price
          });
          console.log(`✅ Appointment service created successfully`);
        } catch (serviceError) {
          console.error(`❌ Failed to create appointment service:`, serviceError);
          throw serviceError; // Re-throw to fail the entire appointment creation
        }
      }
      
      // Send automatic confirmation message
      try {
        const client = await storage.getClient(appointmentData.clientId);
        if (client && client.phone) {
          const appointmentTime = format(new Date(appointment.scheduledAt), "EEEE, MMMM do 'at' h:mm a");
          
          // Create service list for confirmation message
          let serviceText;
          if (serviceDetails.length === 1) {
            serviceText = serviceDetails[0].service.name;
          } else {
            const serviceNames = serviceDetails.map(sd => sd.service.name);
            serviceText = serviceNames.join(', ');
          }
          
          const confirmationMessage = `Hi ${client.name}! Your appointment for ${serviceText} is scheduled for ${appointmentTime}. Please reply 'YES' to confirm or 'NO' to cancel. Thanks!`;
          
          // Create a notification for SMS confirmation needed
          await storage.createNotification({
            userId,
            type: 'appointment_confirmation_needed',
            title: 'Appointment Confirmation Needed',
            message: `SMS confirmation sent to ${client.name} for appointment on ${appointmentTime}`,
            appointmentId: appointment.id,
            clientName: client.name,
          });
          
          // Log the confirmation message
          await storage.createMessage({
            userId,
            clientId: appointmentData.clientId,
            customerName: client.name,
            customerPhone: client.phone || '',
            customerEmail: client.email || '',
            subject: 'Appointment Confirmation Required',
            message: confirmationMessage,
            status: 'sent',
          });
        }
      } catch (confirmationError) {
        // Don't fail appointment creation if confirmation fails
        console.warn("Failed to send appointment confirmation:", confirmationError);
      }
      
      res.json(appointment);
    } catch (error: any) {
      console.error('Appointment creation error:', error);
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.errors);
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointmentId = parseInt(req.params.id);
      
      console.log('=== APPOINTMENT UPDATE ===');
      console.log('Appointment ID:', appointmentId);
      console.log('User ID:', userId);
      console.log('Update data:', JSON.stringify(req.body, null, 2));
      
      // Get current appointment details
      const currentAppointment = await storage.getAppointment(appointmentId);
      if (!currentAppointment || currentAppointment.userId !== userId) {
        console.log('❌ Appointment not found or unauthorized');
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      console.log('Current appointment status:', currentAppointment.status);
      console.log('Client:', currentAppointment.client.name);
      console.log('Scheduled at:', currentAppointment.scheduledAt);
      console.log('Duration:', currentAppointment.duration, 'minutes');
      
      // If confirming appointment, check for overlaps again
      if (req.body.status === 'confirmed' && currentAppointment.status === 'pending') {
        console.log('🔄 CONFIRMING PENDING APPOINTMENT - Running overlap check');
        
        const appointmentStart = new Date(currentAppointment.scheduledAt);
        const appointmentEnd = new Date(appointmentStart.getTime() + currentAppointment.duration * 60 * 1000);
        
        // Get existing confirmed appointments (excluding this pending one)
        const existingAppointments = await storage.getAppointmentsByUserId(
          userId, 
          new Date(appointmentStart.getTime() - 24 * 60 * 60 * 1000),
          new Date(appointmentEnd.getTime() + 24 * 60 * 60 * 1000)
        );
        
        const confirmedAppointments = existingAppointments.filter(apt => 
          apt.status === 'confirmed' && apt.id !== appointmentId
        );
        
        console.log('Checking against confirmed appointments:', confirmedAppointments.map(apt => ({
          id: apt.id,
          client: apt.client.name,
          start: apt.scheduledAt,
          duration: apt.duration
        })));
        
        // Check for overlaps with confirmed appointments
        const overlappingAppointments = confirmedAppointments.filter(existingApt => {
          const existingStart = new Date(existingApt.scheduledAt);
          const existingEnd = new Date(existingStart.getTime() + existingApt.duration * 60 * 1000);
          
          const overlap = (appointmentStart < existingEnd && appointmentEnd > existingStart);
          
          if (overlap) {
            console.log('⚠️  OVERLAP with confirmed appointment:', {
              existingId: existingApt.id,
              existingClient: existingApt.client.name,
              thisStart: appointmentStart.toISOString(),
              thisEnd: appointmentEnd.toISOString(),
              existingStart: existingStart.toISOString(),
              existingEnd: existingEnd.toISOString()
            });
          }
          
          return overlap;
        });
        
        if (overlappingAppointments.length > 0) {
          console.log('❌ BLOCKING CONFIRMATION due to overlap');
          const conflictDetails = overlappingAppointments.map(apt => {
            const start = new Date(apt.scheduledAt);
            const end = new Date(start.getTime() + apt.duration * 60 * 1000);
            return `${apt.client.name} (${format(start, 'h:mm a')} - ${format(end, 'h:mm a')})`;
          }).join(', ');
          
          return res.status(409).json({ 
            message: `Cannot confirm: Time slot now conflicts with ${conflictDetails}. Please reschedule.`,
            conflicts: overlappingAppointments
          });
        }
        
        console.log('✅ No overlaps found - proceeding with confirmation');
      }
      
      const appointment = await storage.updateAppointment(appointmentId, req.body);
      
      console.log('✅ Appointment updated successfully');
      console.log('New status:', appointment.status);
      
      res.json(appointment);
    } catch (error: any) {
      console.error('❌ Error updating appointment:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointmentId = parseInt(req.params.id);
      
      // Get appointment details before deletion for SMS notification
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.userId !== userId) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Delete the appointment
      await storage.deleteAppointment(appointmentId);

      // Send SMS notification to client about cancellation
      const appointmentDate = format(new Date(appointment.scheduledAt), 'EEEE, MMMM d');
      const appointmentTime = format(new Date(appointment.scheduledAt), 'h:mm a');
      
      const cancellationMessage = `Your appointment on ${appointmentDate} at ${appointmentTime} has been cancelled by your barber. Please contact them to reschedule if needed.`;

      // Log the cancellation notification (SMS would be sent via Twilio in production)
      await storage.createMessage({
        userId: userId,
        customerName: appointment.client.name,
        customerPhone: appointment.client.phone || "",
        customerEmail: appointment.client.email || undefined,
        subject: "Appointment Cancelled",
        message: `SMS sent to ${appointment.client.name}: ${cancellationMessage}`,
        status: "sent",
        priority: "high",
      });

      console.log(`Appointment ${appointmentId} deleted. SMS cancellation notice sent to ${appointment.client.name} at ${appointment.client.phone}`);
      console.log(`SMS content: ${cancellationMessage}`);

      res.json({ 
        message: "Appointment deleted successfully and client notified via SMS",
        clientNotified: true,
        smsContent: cancellationMessage
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Appointment confirmation endpoint
  app.patch("/api/appointments/:id/confirm", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointmentId = parseInt(req.params.id);
      
      // Get the appointment with client details
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.userId !== userId) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      if (appointment.status !== 'pending') {
        return res.status(400).json({ message: "Appointment is not pending confirmation" });
      }
      
      // Update appointment status to confirmed
      const updatedAppointment = await storage.updateAppointment(appointmentId, { 
        status: 'confirmed' 
      });
      
      // Create notification for confirmation
      await storage.createNotification({
        userId,
        type: 'appointment_confirmed',
        title: 'Appointment Confirmed',
        message: `${appointment.client.name}'s appointment on ${format(new Date(appointment.scheduledAt), "EEEE, MMMM do 'at' h:mm a")} has been confirmed`,
        appointmentId: appointment.id,
        clientName: appointment.client.name,
      });
      
      res.json({ 
        message: "Appointment confirmed successfully",
        appointment: updatedAppointment 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Appointment cancellation endpoint (for SMS responses)
  app.patch("/api/appointments/:id/cancel", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointmentId = parseInt(req.params.id);
      
      // Get the appointment with client details
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.userId !== userId) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Update appointment status to cancelled
      const updatedAppointment = await storage.updateAppointment(appointmentId, { 
        status: 'cancelled' 
      });
      
      // Create notification for cancellation
      await storage.createNotification({
        userId,
        type: 'appointment_cancelled',
        title: 'Appointment Cancelled',
        message: `${appointment.client.name} cancelled their appointment on ${format(new Date(appointment.scheduledAt), "EEEE, MMMM do 'at' h:mm a")}`,
        appointmentId: appointment.id,
        clientName: appointment.client.name,
      });
      
      res.json({ 
        message: "Appointment cancelled successfully",
        appointment: updatedAppointment 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Clients routes
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const clients = await storage.getClientsByUserId(userId);
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const clientData = insertClientSchema.parse({ ...req.body, userId });
      
      // Check if a client with this phone number already exists
      if (clientData.phone) {
        const clients = await storage.getClientsByUserId(userId);
        const existingClient = clients.find(c => c.phone === clientData.phone);
        
        if (existingClient) {
          return res.status(409).json({ 
            message: `Client already exists with this phone number: ${existingClient.name}`,
            existingClient: existingClient
          });
        }
      }
      
      const client = await storage.createClient(clientData);
      res.json(client);
    } catch (error: any) {
      // Handle unique constraint violations from database
      if (error.code === '23505' && error.constraint === 'clients_phone_unique') {
        return res.status(409).json({ 
          message: "A client with this phone number already exists"
        });
      }
      console.error("Create client error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.updateClient(clientId, req.body);
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      await storage.deleteClient(clientId);
      res.json({ message: "Client deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Services routes
  app.get("/api/services", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const services = await storage.getServicesByUserId(userId);
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/services", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      console.log("Creating service with data:", { ...req.body, userId });
      const serviceData = insertServiceSchema.parse({ ...req.body, userId });
      console.log("Parsed service data:", serviceData);
      const service = await storage.createService(serviceData);
      res.json(service);
    } catch (error: any) {
      console.error("Service creation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      // Check if service belongs to user
      const existingService = await storage.getService(serviceId);
      if (!existingService || existingService.userId !== userId) {
        return res.status(404).json({ message: "Service not found" });
      }

      // Check if service is used in existing appointments
      const appointments = await storage.getAppointmentsByUserId(userId);
      const serviceInUse = appointments.some(apt => apt.serviceId === serviceId);
      
      if (serviceInUse) {
        return res.status(400).json({ 
          message: "Cannot edit service that is referenced in existing appointments. Please complete or cancel those appointments first." 
        });
      }

      const service = await storage.updateService(serviceId, req.body);
      res.json(service);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      // Check if service belongs to user
      const existingService = await storage.getService(serviceId);
      if (!existingService || existingService.userId !== userId) {
        return res.status(404).json({ message: "Service not found" });
      }

      // Check if service is used in existing appointments
      const appointments = await storage.getAppointmentsByUserId(userId);
      const serviceInUse = appointments.some(apt => apt.serviceId === serviceId);
      
      if (serviceInUse) {
        return res.status(400).json({ 
          message: "Cannot delete service that is referenced in existing appointments. Please complete or cancel those appointments first." 
        });
      }

      await storage.deleteService(serviceId);
      res.json({ message: "Service deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // File upload route
  app.post("/api/upload", requireAuth, upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // In a real app, you'd upload to cloud storage (AWS S3, Cloudinary, etc.)
      // For now, we'll just store the buffer in memory and return a data URL
      const base64 = req.file.buffer.toString('base64');
      const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
      
      res.json({ 
        url: dataUrl,
        message: "File uploaded successfully" 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Gallery routes
  app.get("/api/gallery", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const photos = await storage.getGalleryPhotosByUserId(userId);
      res.json(photos);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gallery", requireAuth, upload.single('photo'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }

      // Convert to base64 data URL
      const base64 = req.file.buffer.toString('base64');
      const photoUrl = `data:${req.file.mimetype};base64,${base64}`;
      
      const photoData = insertGalleryPhotoSchema.parse({
        userId,
        photoUrl,
        type: req.body.type || 'portfolio',
        description: req.body.description || '',
        isPublic: req.body.isPublic === 'true',
        clientId: req.body.clientId ? parseInt(req.body.clientId) : null,
        appointmentId: req.body.appointmentId ? parseInt(req.body.appointmentId) : null,
      });
      
      const photo = await storage.createGalleryPhoto(photoData);
      res.json(photo);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/gallery/:id", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      await storage.deleteGalleryPhoto(photoId);
      res.json({ message: "Photo deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Invoices routes
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const invoices = await storage.getInvoicesByUserId(userId);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const invoiceData = insertInvoiceSchema.parse({ ...req.body, userId });
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.updateInvoice(invoiceId, req.body);
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe payment routes (if configured)
  if (stripe) {
    app.post("/api/create-payment-intent", requireAuth, async (req, res) => {
      try {
        const { amount, currency = 'usd', invoiceId } = req.body;
        
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          metadata: {
            invoiceId: invoiceId?.toString() || '',
          },
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error: any) {
        res.status(500).json({ message: "Error creating payment intent: " + error.message });
      }
    });

    app.post("/api/confirm-payment", requireAuth, async (req, res) => {
      try {
        const { paymentIntentId, invoiceId } = req.body;
        
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status === "succeeded") {
          await storage.updateInvoice(invoiceId, {
            status: "paid",
            paymentMethod: "stripe",
            stripePaymentIntentId: paymentIntentId,
            paidAt: new Date(),
          });
          
          res.json({ success: true });
        } else {
          res.status(400).json({ message: "Payment not successful" });
        }
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    });

    // Stripe Connect routes
    app.post("/api/stripe/connect", requireAuth, async (req, res) => {
      try {
        const userId = (req.user as any).id;
        
        // Create Stripe Connect account
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: (req.user as any).email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });

        // Update user with Stripe account ID
        await storage.updateUserStripeInfo(userId, account.id);

        // Create account link for onboarding
        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${req.protocol}://${req.get('host')}/settings`,
          return_url: `${req.protocol}://${req.get('host')}/settings?stripe=connected`,
          type: 'account_onboarding',
        });

        res.json({ url: accountLink.url });
      } catch (error: any) {
        console.error('Stripe Connect error:', error);
        
        // Handle specific Stripe Connect setup error
        if (error.message.includes('signed up for Connect')) {
          res.status(400).json({ 
            message: "Stripe Connect setup required",
            details: "Please enable Stripe Connect in your Stripe dashboard first. Go to https://dashboard.stripe.com/connect/overview and complete the setup process.",
            setupRequired: true
          });
        } else {
          res.status(500).json({ message: "Error creating Stripe account: " + error.message });
        }
      }
    });

    app.get("/api/stripe/status", requireAuth, async (req, res) => {
      try {
        const userId = (req.user as any).id;
        const user = await storage.getUser(userId);
        
        if (!user?.stripeCustomerId) {
          return res.json({ connected: false });
        }

        // Get account details from Stripe
        const account = await stripe.accounts.retrieve(user.stripeCustomerId);
        
        res.json({
          connected: true,
          status: account.charges_enabled ? 'active' : 'pending',
          country: account.country,
          dashboardUrl: `https://dashboard.stripe.com/express/accounts/${account.id}`,
          capabilities: account.capabilities,
        });
      } catch (error: any) {
        res.json({ connected: false });
      }
    });
  } else {
    // Stripe not configured, return error for payment routes
    app.post("/api/create-payment-intent", (req, res) => {
      res.status(501).json({ 
        message: "Stripe not configured. Please set STRIPE_SECRET_KEY environment variable." 
      });
    });

    app.post("/api/stripe/connect", (req, res) => {
      res.status(501).json({ 
        message: "Stripe not configured. Please set STRIPE_SECRET_KEY environment variable." 
      });
    });

    app.get("/api/stripe/status", (req, res) => {
      res.status(501).json({ 
        message: "Stripe not configured. Please set STRIPE_SECRET_KEY environment variable." 
      });
    });
  }

  // Travel time and scheduling routes
  app.post("/api/travel-time/calculate", requireAuth, async (req, res) => {
    try {
      const { origin, destination, clientAddress, appointmentTime } = req.body;
      
      // Handle appointment-based travel time calculation
      if (clientAddress && appointmentTime) {
        const userId = req.user.id;
        
        // Get user info for home base address and transportation mode
        const user = await storage.getUser(userId);
        if (!user) {
          return res.json({ success: false, travelTime: 0 });
        }
        
        // Get appointments for the day to find previous appointment location
        const appointmentStart = new Date(appointmentTime);
        const dayStart = new Date(appointmentStart);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(appointmentStart);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayAppointments = await storage.getAppointmentsByUserId(userId, dayStart, dayEnd);
        const confirmedAppointments = dayAppointments.filter(apt => 
          apt.status === 'confirmed' && new Date(apt.scheduledAt) < appointmentStart
        );
        
        let originAddress = user.homeBaseAddress || user.address || '';
        
        // If there's a previous appointment, use its location
        if (confirmedAppointments.length > 0) {
          const lastAppointment = confirmedAppointments
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
          
          if (lastAppointment.address) {
            originAddress = lastAppointment.address;
          }
        }
        
        if (!originAddress || !process.env.MAPBOX_ACCESS_TOKEN) {
          return res.json({ success: false, travelTime: 0 });
        }
        
        const { mapboxService } = await import('./mapboxService');
        const travelResult = await mapboxService.calculateTravelTime(
          originAddress,
          clientAddress,
          user.transportationMode as 'driving' | 'walking' | 'cycling' | 'transit' || 'driving'
        );
        
        if (travelResult.status === 'OK') {
          return res.json({ 
            success: true, 
            travelTime: travelResult.duration,
            origin: originAddress,
            destination: clientAddress
          });
        } else {
          return res.json({ success: false, travelTime: 0 });
        }
      }
      
      // Handle direct origin/destination travel time calculation
      if (!origin || !destination) {
        return res.status(400).json({ message: "Origin and destination are required" });
      }

      const result = await travelTimeService.calculateTravelTime(origin, destination);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/appointments/:date/travel-buffers", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const dateParam = req.params.date;
      const appointmentDate = new Date(dateParam);

      if (isNaN(appointmentDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const travelBuffers = await travelTimeService.calculateDayTravelBuffers(userId, appointmentDate);
      res.json(travelBuffers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/appointments/available-slots", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { date, clientAddress, serviceDuration } = req.body;
      
      if (!date || !clientAddress) {
        return res.status(400).json({ message: "Date and client address are required" });
      }

      const appointmentDate = new Date(date);
      if (isNaN(appointmentDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const availableSlots = await travelTimeService.getAvailableTimeSlots(
        userId, 
        appointmentDate, 
        clientAddress,
        serviceDuration || 60
      );
      
      res.json(availableSlots);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/appointments/validate-scheduling", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { proposedStart, proposedEnd, clientAddress } = req.body;
      
      if (!proposedStart || !proposedEnd || !clientAddress) {
        return res.status(400).json({ message: "Proposed start time, end time, and client address are required" });
      }

      const startTime = new Date(proposedStart);
      const endTime = new Date(proposedEnd);
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      // Get travel buffers for the day
      const travelBuffers = await travelTimeService.calculateDayTravelBuffers(userId, startTime);
      
      // Check for conflicts with existing appointments
      const existingAppointments = await storage.getAppointmentsByUserId(userId, startTime, endTime);
      
      let conflictMessage = null;
      let suggestedTimes = [];

      // Check if the proposed time conflicts with existing appointments + travel times
      for (const appointment of existingAppointments) {
        const appointmentStart = new Date(appointment.scheduledAt);
        const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.service.duration || 60) * 60 * 1000);
        
        const buffer = travelBuffers.find(b => b.appointmentId === appointment.id);
        const bufferTime = buffer?.totalBuffer || 15;

        const bufferStart = new Date(appointmentStart.getTime() - bufferTime * 60 * 1000);
        const bufferEnd = new Date(appointmentEnd.getTime() + bufferTime * 60 * 1000);

        if (
          (startTime >= bufferStart && startTime < bufferEnd) ||
          (endTime > bufferStart && endTime <= bufferEnd) ||
          (startTime < bufferStart && endTime > bufferEnd)
        ) {
          conflictMessage = `⚠️ Travel time between appointments is ${bufferTime} mins — try a later time or different location.`;
          break;
        }
      }

      res.json({
        isValid: !conflictMessage,
        conflictMessage,
        travelBuffers,
        suggestedTimes
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Messages routes
  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const messages = await storage.getMessagesByUserId(userId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/messages/unread-count", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const messageData = insertMessageSchema.parse({ ...req.body, userId });
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const message = await storage.markMessageAsRead(messageId);
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const message = await storage.updateMessage(messageId, req.body);
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      // Verify message belongs to user
      const message = await storage.getMessage(messageId);
      if (!message || message.userId !== userId) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      await storage.deleteMessage(messageId);
      res.json({ message: "Message deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Notification routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const notifications = await storage.getNotificationsByUserId(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Google Places autocomplete endpoint
  app.get("/api/places/autocomplete", requireAuth, async (req, res) => {
    try {
      const { input } = req.query;
      
      if (!input || typeof input !== 'string') {
        return res.status(400).json({ message: "Input parameter is required" });
      }

      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Maps API key not configured" });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&types=address`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK') {
        res.json({ predictions: data.predictions || [] });
      } else {
        res.json({ predictions: [], error: data.status });
      }
    } catch (error: any) {
      console.error('Google Places API error:', error);
      res.status(500).json({ message: "Failed to fetch address suggestions" });
    }
  });

  // Communications endpoints
  app.post("/api/communications/send-message", requireAuth, async (req, res) => {
    try {
      const { appointmentId, message, method } = req.body;
      const userId = (req.user as any).id;

      // Get appointment details
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.userId !== userId) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Mock sending message (in production, integrate with Twilio/SendGrid)
      const success = Math.random() > 0.1; // 90% success rate for demo
      
      if (!success) {
        return res.status(500).json({ message: "Failed to send message" });
      }

      // Log the communication
      await storage.createMessage({
        userId,
        clientId: appointment.clientId,
        customerName: appointment.client.name,
        customerPhone: appointment.client.phone || '',
        customerEmail: appointment.client.email || '',
        subject: method === 'sms' ? 'SMS Message' : 'Email Message',
        message: message,
        status: 'sent',
      });

      res.json({ 
        success: true, 
        method,
        message: "Message sent successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Appointment confirmation endpoints
  app.post("/api/communications/send-confirmation", requireAuth, async (req, res) => {
    try {
      const { appointmentId } = req.body;
      const userId = (req.user as any).id;

      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.userId !== userId) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const client = appointment.client;
      const service = appointment.service;
      const appointmentTime = format(new Date(appointment.scheduledAt), "EEEE, MMMM do 'at' h:mm a");

      // Create confirmation message
      const confirmationMessage = `Hi ${client.name}! Your appointment for ${service.name} is confirmed for ${appointmentTime}. Please reply 'YES' to confirm or 'NO' to cancel. Thanks!`;

      // Prefer SMS for confirmations
      const method = client.phone ? 'sms' : 'email';

      // Mock sending (in production: integrate with Twilio/SendGrid)
      const success = Math.random() > 0.1;
      
      if (!success) {
        return res.status(500).json({ message: "Failed to send confirmation" });
      }

      // Log the communication
      await storage.createMessage({
        userId,
        clientId: appointment.clientId,
        customerName: client.name,
        customerPhone: client.phone || '',
        customerEmail: client.email || '',
        subject: 'Appointment Confirmation',
        message: confirmationMessage,
        status: 'sent',
      });

      res.json({
        success: true,
        method,
        message: "Confirmation sent successfully",
        confirmationMessage
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public booking API endpoints (no authentication required)
  
  // Get barber profile by phone number
  app.get("/api/public/barber/:phone", async (req, res) => {
    try {
      const phoneParam = req.params.phone;
      // Extract phone number from format like "6467891820-clipcutman"
      const phoneDigits = phoneParam.split('-')[0];
      // Convert to formatted phone number like "(646) 789-1820"
      const formattedPhone = `(${phoneDigits.slice(0,3)}) ${phoneDigits.slice(3,6)}-${phoneDigits.slice(6)}`;
      
      const user = await storage.getUserByPhone(formattedPhone);
      
      if (!user) {
        return res.status(404).json({ message: "Barber not found" });
      }

      // Return only public profile data
      const publicProfile = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        serviceArea: user.serviceArea,
        about: user.about,
        photoUrl: user.photoUrl,
      };

      res.json(publicProfile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get barber services by phone number
  app.get("/api/public/barber/:phone/services", async (req, res) => {
    try {
      const phoneParam = req.params.phone;
      const phoneDigits = phoneParam.split('-')[0];
      const formattedPhone = `(${phoneDigits.slice(0,3)}) ${phoneDigits.slice(3,6)}-${phoneDigits.slice(6)}`;
      const user = await storage.getUserByPhone(formattedPhone);
      
      if (!user) {
        return res.status(404).json({ message: "Barber not found" });
      }

      const services = await storage.getServicesByUserId(user.id);
      // Return only active services with public data
      const publicServices = services
        .filter(service => service.isActive)
        .map(service => ({
          id: service.id,
          name: service.name,
          description: service.description,
          price: service.price,
          duration: service.duration,
          category: service.category,
        }));

      res.json(publicServices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get available time slots for a date
  app.get("/api/public/barber/:phone/availability", async (req, res) => {
    try {
      const phoneParam = req.params.phone;
      const phoneDigits = phoneParam.split('-')[0];
      const formattedPhone = `(${phoneDigits.slice(0,3)}) ${phoneDigits.slice(3,6)}-${phoneDigits.slice(6)}`;
      const date = req.query.date as string;
      
      if (!date) {
        return res.status(400).json({ message: "Date parameter is required" });
      }

      const user = await storage.getUserByPhone(formattedPhone);
      
      if (!user) {
        return res.status(404).json({ message: "Barber not found" });
      }

      // Get the day of the week in user's timezone
      const userTimezone = user.timezone || 'America/New_York';
      const requestDate = new Date(date);
      
      // Get the correct day of week for the requested date  
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      // Parse date correctly to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number);
      const localDate = new Date(year, month - 1, day); // month is 0-indexed
      const dayOfWeek = dayNames[localDate.getDay()];

      // Get working hours for this day
      const workingHours = user.workingHours as any;
      const dayHours = workingHours?.[dayOfWeek];
      
      if (!dayHours || !dayHours.enabled) {
        return res.json([]); // Not working this day
      }

      // Get existing appointments for the date
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      const appointments = await storage.getAppointmentsByUserId(user.id, startDate, endDate);
      

      
      // Get active reservations for the date
      const activeReservations = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.userId, user.id),
            eq(reservations.status, "pending"),
            sql`DATE(${reservations.scheduledAt}) = DATE(${startDate})`
          )
        );
      
      // Parse working hours
      const [startHour, startMinute] = dayHours.start.split(':').map(Number);
      const [endHour, endMinute] = dayHours.end.split(':').map(Number);
      
      // Generate 15-minute time slots
      const timeSlots = [];
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      // Skip if invalid time range (start after end)
      if (startMinutes >= endMinutes) {
        return res.json([]);
      }
      
      for (let minutes = startMinutes; minutes < endMinutes; minutes += 15) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        
        // Create time string in format HH:MM
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Create date object for this time slot in UTC
        // Since the API displays times in user's timezone but appointments are stored in UTC,
        // we need to convert user's local time slot to UTC for proper comparison
        const userTimezone = user.timezone || 'America/New_York';
        
        // For Eastern Time: UTC = Local Time + 4 hours (EDT) or + 5 hours (EST)
        // July 3rd is during EDT (UTC-4), so 9:00 AM ET = 13:00 UTC
        const slotDateTimeLocal = new Date(date + 'T' + timeString + ':00');
        
        // Get the timezone offset in hours for Eastern Time in July (EDT = UTC-4)
        const timezoneOffsetHours = 4; // EDT offset
        const slotDateTime = new Date(slotDateTimeLocal.getTime() + (timezoneOffsetHours * 60 * 60 * 1000));
        
        // Skip past time slots if the date is today (with 15-minute buffer)
        // Use user's timezone for accurate comparison
        const now = new Date();
        
        // Get current date and time in user's timezone
        const nowInUserTZ = new Date(now.toLocaleString("en-US", {timeZone: userTimezone}));
        const todayInUserTZ = nowInUserTZ.toISOString().split('T')[0]; // YYYY-MM-DD format
        const requestDateStr = date; // The date parameter passed to the API
        const isToday = requestDateStr === todayInUserTZ;
        

        
        if (isToday) {
          // Create current time in user timezone with 15-minute buffer
          const currentHour = nowInUserTZ.getHours();
          const currentMinute = nowInUserTZ.getMinutes();
          const currentTotalMinutes = currentHour * 60 + currentMinute + 15; // Add 15-minute buffer
          
          // Skip slots that are in the past or too close to current time
          if (minutes < currentTotalMinutes) {
            continue;
          }
        }
        
        // Check if time slot is booked (any confirmed or pending appointment overlaps with this 15-min slot)
        const isBooked = appointments.some(apt => {
          // Only block time slots for confirmed and pending appointments
          if (apt.status !== 'confirmed' && apt.status !== 'pending') {
            return false;
          }
          
          // For pending appointments, check if they've expired (30 minutes after creation)
          if (apt.status === 'pending') {
            const createdAt = apt.createdAt ? new Date(apt.createdAt) : new Date();
            const expiryTime = new Date(createdAt.getTime() + 30 * 60 * 1000); // 30 minutes expiry
            if (new Date() > expiryTime) {
              return false; // Expired pending appointment doesn't block slots
            }
          }
          
          const aptStart = new Date(apt.scheduledAt);
          const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000); // Use appointment's duration field
          const slotEnd = new Date(slotDateTime.getTime() + 15 * 60000);
          
          // Add travel time buffers (15 minutes before and after appointment)
          const bufferStart = new Date(aptStart.getTime() - 15 * 60000); // 15 min before
          const bufferEnd = new Date(aptEnd.getTime() + 15 * 60000); // 15 min after
          
          // Check for overlap with travel time buffers: appointment block and time slot overlap if:
          // - appointment block starts before slot ends AND
          // - appointment block ends after slot starts
          const hasOverlap = bufferStart < slotEnd && bufferEnd > slotDateTime;
          

          

          
          return hasOverlap;
        });
        
        // Check if time slot is reserved (any reservation overlaps with this 15-min slot)
        const isReserved = activeReservations.some(res => {
          const resStart = new Date(res.scheduledAt);
          const resEnd = new Date(resStart.getTime() + res.duration * 60000);
          const slotEnd = new Date(slotDateTime.getTime() + 15 * 60000);
          
          // Check for overlap
          return resStart < slotEnd && resEnd > slotDateTime;
        });
        
        // Check for break times (if they exist)
        let isBreakTime = false;
        if (dayHours.breaks && Array.isArray(dayHours.breaks)) {
          isBreakTime = dayHours.breaks.some((breakTime: any) => {
            const [breakStartHour, breakStartMinute] = breakTime.start.split(':').map(Number);
            const [breakEndHour, breakEndMinute] = breakTime.end.split(':').map(Number);
            const breakStartMinutes = breakStartHour * 60 + breakStartMinute;
            const breakEndMinutes = breakEndHour * 60 + breakEndMinute;
            
            return minutes >= breakStartMinutes && minutes < breakEndMinutes;
          });
        }
        
        timeSlots.push({
          time: timeString,
          available: !isBooked && !isReserved && !isBreakTime,
        });
      }

      res.json(timeSlots);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get client by phone for barber
  app.get("/api/public/barber/:phone/client-lookup", async (req, res) => {
    try {
      const phoneParam = req.params.phone;
      const phoneDigits = phoneParam.split('-')[0];
      const barberPhone = `(${phoneDigits.slice(0,3)}) ${phoneDigits.slice(3,6)}-${phoneDigits.slice(6)}`;
      const clientPhone = req.query.phone as string;
      
      if (!clientPhone) {
        return res.status(400).json({ message: "Client phone number required" });
      }

      const barber = await storage.getUserByPhone(barberPhone);
      if (!barber) {
        return res.status(404).json({ message: "Barber not found" });
      }

      // Find client by phone number for this barber
      const clients = await storage.getClientsByUserId(barber.id);
      const client = clients.find(c => c.phone === clientPhone);
      
      if (client) {
        res.json({
          name: client.name,
          phone: client.phone,
          email: client.email,
          address: client.address
        });
      } else {
        res.json(null);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Submit booking request - creates temporary reservation
  app.post("/api/public/booking-request", async (req, res) => {
    try {
      const {
        barberPhone,
        clientName,
        clientPhone,
        clientEmail,
        selectedDate,
        selectedTime,
        selectedServices,
        customService,
        needsTravel,
        clientAddress,
        message
      } = req.body;

      console.log("Booking request received:", {
        barberPhone,
        clientName,
        clientPhone,
        selectedDate,
        selectedTime,
        selectedServices,
        customService,
        needsTravel,
        clientAddress,
        message
      });

      // Validate required fields
      if (!barberPhone || !clientName || !clientPhone || !selectedDate || !selectedTime || !selectedServices?.length) {
        console.log("Missing required fields:", { barberPhone, clientName, clientPhone, selectedDate, selectedTime, selectedServices });
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Try to find user by different phone formats
      let user = await storage.getUserByPhone(barberPhone);
      console.log("First phone lookup result:", user ? "Found" : "Not found", "for phone:", barberPhone);
      
      if (!user) {
        // Try extracting digits and reformatting
        const phoneDigits = barberPhone.replace(/[^\d]/g, '');
        console.log("Extracted phone digits:", phoneDigits);
        
        if (phoneDigits.length === 10) {
          const formattedPhone = `(${phoneDigits.slice(0,3)}) ${phoneDigits.slice(3,6)}-${phoneDigits.slice(6)}`;
          console.log("Trying formatted phone:", formattedPhone);
          user = await storage.getUserByPhone(formattedPhone);
          console.log("Formatted phone lookup result:", user ? "Found" : "Not found");
        }
      }
      
      if (!user) {
        console.log("Barber not found after all phone format attempts");
        return res.status(404).json({ message: "Barber not found" });
      }

      console.log("Found barber:", { id: user.id, name: `${user.firstName} ${user.lastName}`, phone: user.phone });

      // Create appointment datetime
      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      
      // Get service details and calculate total duration
      const services = await storage.getServicesByUserId(user.id);
      const requestedServices = services.filter(s => selectedServices.includes(s.name));
      
      let totalDuration = 0;
      const serviceIds = [];
      
      for (const service of requestedServices) {
        totalDuration += service.duration;
        serviceIds.push(service.id.toString());
      }
      
      // Default to 60 minutes if no services found or custom service
      if (totalDuration === 0 || customService) {
        totalDuration = 60;
      }

      // Format the booking request message
      let requestMessage = `📅 Date: ${selectedDate}\n⏰ Time: ${selectedTime}\n`;
      
      // Add services
      if (selectedServices.length > 0) {
        const serviceNames = services.filter(s => selectedServices.includes(s.name)).map(s => s.name);
        requestMessage += `✂️ Services: ${serviceNames.join(', ')}\n`;
      }
      
      if (customService) {
        requestMessage += `✂️ Custom Service: ${customService}\n`;
      }
      
      // Add travel information with travel time calculation
      if (needsTravel && clientAddress) {
        requestMessage += `🚗 Travel: Yes - ${clientAddress}\n`;
        
        // Calculate travel time from previous appointment or home base
        try {
          // Get the appointment immediately before this one
          const appointmentStart = new Date(`${selectedDate}T${selectedTime}:00`);
          const dayStart = new Date(selectedDate + 'T00:00:00');
          const dayEnd = new Date(selectedDate + 'T23:59:59');
          
          const dayAppointments = await storage.getAppointmentsByUserId(user.id, dayStart, dayEnd);
          const confirmedAppointments = dayAppointments.filter(apt => 
            apt.status === 'confirmed' && new Date(apt.scheduledAt) < appointmentStart
          );
          
          let originAddress = user.homeBaseAddress || user.address || '';
          
          // If there's a previous appointment, use its location
          if (confirmedAppointments.length > 0) {
            const lastAppointment = confirmedAppointments
              .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
            
            if (lastAppointment.address) {
              originAddress = lastAppointment.address;
            }
          }
          
          if (originAddress && process.env.MAPBOX_ACCESS_TOKEN) {
            const { mapboxService } = await import('./mapboxService');
            const travelResult = await mapboxService.calculateTravelTime(
              originAddress,
              clientAddress,
              user.transportationMode || 'driving'
            );
            
            if (travelResult.status === 'OK') {
              requestMessage += `⏱️ Travel Time: ${travelResult.duration} minutes from ${originAddress}\n`;
            }
          }
        } catch (error) {
          console.log("Could not calculate travel time:", error);
        }
      } else {
        requestMessage += `🚗 Travel: No\n`;
      }
      
      // Add client details
      requestMessage += `📞 Phone: ${clientPhone}\n`;
      if (clientEmail) {
        requestMessage += `📧 Email: ${clientEmail}\n`;
      }
      
      // Add optional message
      if (message) {
        requestMessage += `💬 Message: ${message}\n`;
      }

      // Create a message for the barber to review
      await storage.createMessage({
        userId: user.id,
        customerName: clientName,
        customerPhone: clientPhone,
        customerEmail: clientEmail || undefined,
        subject: "New Booking Request",
        message: requestMessage,
        status: "unread",
        priority: "normal",
        serviceRequested: selectedServices.join(', '),
        preferredDate: appointmentDateTime,
        notes: message || undefined,
      });

      console.log("Booking request message created for barber:", user.id);

      res.json({ 
        success: true, 
        message: "Booking request sent successfully. The barber will review and confirm your appointment.",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // SMS Reply Handler (webhook for SMS service)
  app.post("/api/sms/reply", async (req, res) => {
    try {
      const { From: customerPhone, Body: messageBody } = req.body;
      
      // Normalize message (handle case-insensitive YES/NO/CANCEL)
      const normalizedMessage = messageBody.trim().toLowerCase();
      
      if (normalizedMessage === 'yes') {
        // Find pending reservation for this phone number
        const pendingReservations = await db
          .select()
          .from(reservations)
          .where(
            and(
              eq(reservations.customerPhone, customerPhone),
              eq(reservations.status, "pending")
            )
          );

        if (pendingReservations.length > 0) {
          const reservation = pendingReservations[0];
          
          // Convert reservation to confirmed appointment
          const user = await storage.getUser(reservation.userId);
          if (!user) {
            return res.status(404).json({ message: "Barber not found" });
          }

          // Find or create client
          let client = await storage.getClientsByUserId(user.id)
            .then(clients => clients.find(c => c.phone === customerPhone));
          
          if (!client) {
            client = await storage.createClient({
              userId: user.id,
              name: reservation.customerName,
              phone: customerPhone,
              email: reservation.customerEmail || undefined,
              address: reservation.address || undefined,
            });
          }

          // Create confirmed appointment
          const appointment = await storage.createAppointment({
            userId: user.id,
            clientId: client.id,
            serviceId: (reservation.services && reservation.services.length > 0) 
              ? parseInt(reservation.services[0]) || 1 
              : 1, // Use first service or default
            scheduledAt: reservation.scheduledAt,
            status: "confirmed",
            address: reservation.address || "",
            notes: reservation.notes || "",
            price: "0", // Will be updated based on services
            duration: reservation.duration,
          });

          // Mark reservation as confirmed
          await storage.confirmReservation(reservation.id);

          // Send confirmation to customer
          const confirmationMessage = `Great! Your appointment is confirmed for ${format(reservation.scheduledAt, 'EEEE, MMMM d')} at ${format(reservation.scheduledAt, 'h:mm a')}. You can text CANCEL at any time to cancel your upcoming appointment.`;

          // Notify barber
          await storage.createMessage({
            userId: user.id,
            customerName: reservation.customerName,
            customerPhone: customerPhone,
            subject: "Appointment Confirmed",
            message: `Customer confirmed appointment for ${format(reservation.scheduledAt, 'EEEE, MMMM d')} at ${format(reservation.scheduledAt, 'h:mm a')}.`,
            status: "unread",
            priority: "normal",
          });

          console.log("Appointment confirmed:", appointment.id);
        }
      } else if (normalizedMessage === 'no' || normalizedMessage === 'cancel') {
        // Find and cancel reservation
        const customerReservations = await db
          .select()
          .from(reservations)
          .where(
            and(
              eq(reservations.customerPhone, customerPhone),
              eq(reservations.status, "pending")
            )
          );

        if (customerReservations.length > 0) {
          await storage.updateReservation(customerReservations[0].id, { status: "cancelled" });
          console.log("Reservation cancelled by customer");
        }
      }

      res.status(200).send('OK');
    } catch (error: any) {
      console.error("SMS reply error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Expire old reservations (can be called by a cron job)
  app.post("/api/reservations/expire", async (req, res) => {
    try {
      const expiredReservations = await storage.getExpiredReservations();
      
      for (const reservation of expiredReservations) {
        await storage.expireReservation(reservation.id);
        
        // Notify barber that time slot is available again
        await storage.createMessage({
          userId: reservation.userId,
          customerName: reservation.customerName,
          customerPhone: reservation.customerPhone,
          subject: "Reservation Expired",
          message: `Reservation for ${reservation.customerName} on ${format(reservation.scheduledAt, 'EEEE, MMMM d')} at ${format(reservation.scheduledAt, 'h:mm a')} has expired. Time slot is now available.`,
          status: "unread",
          priority: "low",
        });
      }

      res.json({ 
        success: true, 
        expiredCount: expiredReservations.length 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create reservation from message booking (barber action)
  app.post("/api/reservations", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const {
        customerName,
        customerPhone,
        customerEmail,
        scheduledAt,
        services,
        address,
        notes
      } = req.body;

      console.log("Reservation creation request received:", {
        userId,
        customerName,
        customerPhone,
        customerEmail,
        scheduledAt,
        services,
        address,
        notes,
        fullBody: req.body
      });

      // Validate required fields
      if (!customerName || !customerPhone || !scheduledAt) {
        console.log("Missing required fields:", { 
          customerName: !!customerName, 
          customerPhone: !!customerPhone, 
          scheduledAt: !!scheduledAt, 
          services: services?.length || 0 
        });
        return res.status(400).json({ 
          message: "Missing required fields", 
          details: {
            customerName: !!customerName,
            customerPhone: !!customerPhone,
            scheduledAt: !!scheduledAt,
            services: services?.length || 0
          }
        });
      }

      // Parse the datetime
      const appointmentDateTime = new Date(scheduledAt);
      
      // Get service details and calculate total duration
      const userServices = await storage.getServicesByUserId(userId);
      let requestedServices = [];
      let totalDuration = 60; // Default duration
      const serviceIds = [];
      
      if (services && services.length > 0) {
        requestedServices = userServices.filter(s => services.includes(s.name));
        
        totalDuration = 0;
        for (const service of requestedServices) {
          totalDuration += service.duration;
          serviceIds.push(service.id.toString());
        }
        
        // If no matching services found, use default duration
        if (totalDuration === 0) {
          totalDuration = 60;
        }
      }

      // Check for conflicts
      const existingAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.userId, userId),
            sql`${appointments.scheduledAt} < ${new Date(appointmentDateTime.getTime() + totalDuration * 60000)} AND ${appointments.scheduledAt} + INTERVAL '1 minute' * ${appointments.duration} > ${appointmentDateTime}`
          )
        );

      const activeReservations = await storage.getActiveReservationsForTimeSlot(
        userId, 
        appointmentDateTime, 
        totalDuration
      );

      if (existingAppointments.length > 0 || activeReservations.length > 0) {
        return res.status(409).json({ 
          message: "This time slot is no longer available. Please select a different time." 
        });
      }

      // Create 30-minute reservation
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      
      const reservation = await storage.createReservation({
        userId,
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        scheduledAt: appointmentDateTime,
        duration: totalDuration,
        services: serviceIds,
        address: address || undefined,
        notes: notes || undefined,
        expiresAt: expiresAt,
        status: "pending",
      });

      // Send SMS confirmation request
      const smsMessage = `Hi ${customerName}! This time is being held for you for 30 minutes. Please confirm by replying YES to keep it. Time: ${format(appointmentDateTime, 'EEEE, MMMM d')} at ${format(appointmentDateTime, 'h:mm a')}`;

      console.log(`SMS confirmation sent to ${customerPhone}:`, smsMessage);

      res.json({ 
        success: true, 
        message: "Reservation created with SMS confirmation sent",
        reservationId: reservation.id,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get pending reservations for barber
  app.get("/api/reservations/pending", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      console.log(`Fetching pending reservations for user ${userId}`);
      
      const pendingReservations = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.userId, userId),
            eq(reservations.status, "pending")
          )
        )
        .orderBy(reservations.scheduledAt);

      console.log(`Found ${pendingReservations.length} pending reservations:`, pendingReservations);

      res.json(pendingReservations);
    } catch (error: any) {
      console.error("Error fetching pending reservations:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Manual confirmation by barber
  app.post("/api/reservations/:id/confirm", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const reservationId = parseInt(req.params.id);
      
      const reservation = await storage.getReservation(reservationId);
      if (!reservation || reservation.userId !== userId) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (reservation.status !== "pending") {
        return res.status(400).json({ message: "Reservation is not pending" });
      }

      // Create confirmed appointment (similar to SMS YES logic)
      let client = await storage.getClientsByUserId(userId)
        .then(clients => clients.find(c => c.phone === reservation.customerPhone));
      
      if (!client) {
        client = await storage.createClient({
          userId: userId,
          name: reservation.customerName,
          phone: reservation.customerPhone,
          email: reservation.customerEmail || undefined,
          address: reservation.address || undefined,
        });
      }

      const appointment = await storage.createAppointment({
        userId: userId,
        clientId: client.id,
        serviceId: (reservation.services && Array.isArray(reservation.services) && reservation.services.length > 0) 
          ? parseInt(reservation.services[0]) || 1 
          : 1, // Use first service or default
        scheduledAt: reservation.scheduledAt,
        status: "confirmed",
        address: reservation.address || "",
        notes: reservation.notes || "",
        price: "0",
        duration: reservation.duration,
      });

      await storage.confirmReservation(reservationId);

      // Send confirmation SMS to customer
      const confirmationMessage = `Your appointment has been confirmed for ${format(reservation.scheduledAt, 'EEEE, MMMM d')} at ${format(reservation.scheduledAt, 'h:mm a')}. You can text CANCEL at any time to cancel your upcoming appointment.`;

      res.json({ 
        success: true, 
        appointmentId: appointment.id,
        message: "Reservation confirmed and appointment created"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Auto-expire old reservations (called by background process)
  setInterval(async () => {
    try {
      console.log("Running reservation expiration check...");
      const response = await fetch("http://localhost:5000/api/reservations/expire", {
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        if (result.expiredCount > 0) {
          console.log(`Expired ${result.expiredCount} reservations`);
        }
      }
    } catch (error) {
      console.error("Error in reservation expiration job:", error);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes

  const httpServer = createServer(app);
  return httpServer;
}