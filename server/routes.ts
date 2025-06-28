import { Request, Response } from 'express';
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from './auth';
import multer from 'multer';
import { insertClientSchema, insertServiceSchema, insertAppointmentSchema, insertInvoiceSchema, insertGalleryPhotoSchema, insertMessageSchema } from "@shared/schema";
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

  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
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
      const user = await storage.updateUser(userId, req.body);
      res.json(user);
    } catch (error: any) {
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

  app.post("/api/appointments", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Get service details to populate price and duration
      const service = await storage.getService(req.body.serviceId);
      if (!service) {
        return res.status(400).json({ message: "Service not found" });
      }

      // Parse the date and validate it's not in the past
      const appointmentDate = new Date(req.body.date);
      const now = new Date();
      
      if (appointmentDate < now) {
        return res.status(400).json({ message: "Cannot schedule appointments in the past" });
      }

      const appointmentData = insertAppointmentSchema.parse({
        ...req.body,
        userId,
        price: service.price,
        duration: service.duration,
        date: appointmentDate
      });
      
      const appointment = await storage.createAppointment(appointmentData);
      
      // Send automatic confirmation message
      try {
        const client = await storage.getClient(appointment.clientId);
        if (client) {
          const appointmentTime = format(new Date(appointment.scheduledAt), "EEEE, MMMM do 'at' h:mm a");
          const confirmationMessage = `Hi ${client.name}! Your appointment for ${service.name} is confirmed for ${appointmentTime}. Please reply 'YES' to confirm or 'NO' to cancel. Thanks!`;
          
          // Prefer SMS, fallback to email
          const method = client.phone ? 'sms' : 'email';
          
          // Log the confirmation message
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
        }
      } catch (confirmationError) {
        // Don't fail appointment creation if confirmation fails
        console.warn("Failed to send appointment confirmation:", confirmationError);
      }
      
      res.json(appointment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
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
      const appointmentId = parseInt(req.params.id);
      const appointment = await storage.updateAppointment(appointmentId, req.body);
      res.json(appointment);
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
      const client = await storage.createClient(clientData);
      res.json(client);
    } catch (error: any) {
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
      const serviceData = insertServiceSchema.parse({ ...req.body, userId });
      const service = await storage.createService(serviceData);
      res.json(service);
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
      const { origin, destination } = req.body;
      
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

  const httpServer = createServer(app);
  return httpServer;
}