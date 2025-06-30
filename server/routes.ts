import { Request, Response } from 'express';
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, setupAuth } from './auth';
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
  // Initialize authentication middleware
  setupAuth(app);

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

  app.post("/api/appointments", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      console.log('Creating appointment with data:', JSON.stringify(req.body, null, 2));
      
      // Get service details to populate price and duration
      const service = await storage.getService(req.body.serviceId);
      if (!service) {
        return res.status(400).json({ message: "Service not found" });
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

      const dataToValidate = {
        ...req.body,
        userId,
        price: service.price,
        duration: service.duration,
        scheduledAt: appointmentUTC
      };
      
      console.log('Data to validate:', JSON.stringify(dataToValidate, null, 2));
      const appointmentData = insertAppointmentSchema.parse(dataToValidate);
      
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

      // Get the day of the week
      const requestDate = new Date(date);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[requestDate.getDay()];

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
        
        // Create date object for this time slot
        const slotDateTime = new Date(requestDate);
        slotDateTime.setHours(hour, minute, 0, 0);
        
        // Check if time slot is booked (any appointment overlaps with this 15-min slot)
        const isBooked = appointments.some(apt => {
          const aptStart = new Date(apt.scheduledAt);
          const aptEnd = new Date(aptStart.getTime() + (apt.service?.duration || 60) * 60000);
          const slotEnd = new Date(slotDateTime.getTime() + 15 * 60000);
          
          // Check for overlap
          return aptStart < slotEnd && aptEnd > slotDateTime;
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
          available: !isBooked && !isBreakTime,
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

  // Submit booking request
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

      // Get service details
      const services = await storage.getServicesByUserId(user.id);
      console.log("Available services:", services.map(s => ({ id: s.id, name: s.name })));
      console.log("Selected service IDs:", selectedServices);
      
      const requestedServices = services.filter(s => selectedServices.includes(s.id.toString()));
      console.log("Matched services:", requestedServices.map(s => ({ id: s.id, name: s.name })));
      
      const serviceNames = requestedServices.map(s => s.name);
      if (customService) {
        serviceNames.push(customService);
      }
      
      console.log("Final service names for message:", serviceNames);

      // Create a message in the barber's inbox
      const messageText = `New booking request from ${clientName}

📅 Date: ${selectedDate}
⏰ Time: ${selectedTime}
💇 Services: ${serviceNames.join(', ')}
📞 Phone: ${clientPhone}
${clientEmail ? `📧 Email: ${clientEmail}` : ''}
🚗 Travel: ${needsTravel ? `Yes - ${clientAddress || 'Address pending'}` : 'No'}
${message ? `💬 Message: ${message}` : ''}

Please contact the client to confirm the appointment.`;

      const bookingMessage = await storage.createMessage({
        userId: user.id,
        customerName: clientName,
        customerPhone: clientPhone,
        customerEmail: clientEmail || undefined,
        subject: "New Booking Request",
        message: messageText,
        status: "unread",
        priority: "normal",
        serviceRequested: serviceNames.join(', '),
        preferredDate: new Date(`${selectedDate}T${selectedTime}:00`),
      });

      res.json({ 
        success: true, 
        message: "Booking request sent successfully",
        messageId: bookingMessage.id 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}