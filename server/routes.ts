import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertServiceSchema, insertAppointmentSchema, insertInvoiceSchema, insertGalleryPhotoSchema, insertMessageSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import passport from "passport";
import { setupAuth, requireAuth, generateToken, hashPassword } from "./auth";

// Initialize Stripe (will be set up by user)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Configure multer for photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Authentication routes
  
  // Sign up with email/password
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const signupSchema = insertUserSchema.extend({
        password: z.string().min(6, "Password must be at least 6 characters"),
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });

      const { password, confirmPassword, ...userData } = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Generate token
      const token = generateToken(user.id);
      
      res.json({ 
        message: "Account created successfully", 
        token,
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone 
        }
      });
    } catch (error) {
      console.error("Signup error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Sign in with email/password
  app.post("/api/auth/signin", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Invalid credentials" });
      }

      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
        }
        
        const token = generateToken(user.id);
        res.json({ 
          message: "Signed in successfully", 
          token,
          user: { 
            id: user.id, 
            email: user.email, 
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone 
          }
        });
      });
    })(req, res, next);
  });

  // Google OAuth routes
  app.get("/api/auth/google", passport.authenticate('google', { scope: ['profile', 'email'] }));
  
  app.get("/api/auth/google/callback", 
    passport.authenticate('google', { failureRedirect: '/auth?error=google_failed' }),
    (req, res) => {
      const token = generateToken((req.user as any).id);
      res.redirect(`/?token=${token}`);
    }
  );

  // Apple OAuth routes
  app.get("/api/auth/apple", passport.authenticate('apple'));
  
  app.post("/api/auth/apple/callback", 
    passport.authenticate('apple', { failureRedirect: '/auth?error=apple_failed' }),
    (req, res) => {
      const token = generateToken((req.user as any).id);
      res.redirect(`/?token=${token}`);
    }
  );

  // Sign out
  app.post("/api/auth/signout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Sign out error" });
      }
      res.json({ message: "Signed out successfully" });
    });
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
  app.get("/api/appointments", async (req, res) => {
    try {
      // Temporary: Use demo user ID until authentication is implemented
      const userId = 2;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const appointments = await storage.getAppointmentsByUserId(userId, start, end);
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/appointments/today", async (req, res) => {
    try {
      // Temporary: Use demo user ID until authentication is implemented
      const userId = 2;
      const appointments = await storage.getTodayAppointments(userId);
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      // Temporary: Use demo user ID until authentication is implemented
      const userId = 2;
      
      // Get service details to populate price and duration
      const service = await storage.getService(req.body.serviceId);
      if (!service) {
        return res.status(400).json({ message: "Service not found" });
      }
      
      // Validate appointment is not in the past
      const scheduledDate = new Date(req.body.scheduledAt);
      const now = new Date();
      if (scheduledDate <= now) {
        return res.status(400).json({ message: "Please select a future date and time for your appointment" });
      }
      
      const appointmentData = insertAppointmentSchema.parse({ 
        ...req.body, 
        userId,
        price: service.price,
        duration: service.duration,
        status: "scheduled",
        scheduledAt: scheduledDate
      });
      
      const appointment = await storage.createAppointment(appointmentData);
      res.json(appointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const appointment = await storage.updateAppointment(id, updates);
      res.json(appointment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Clients routes
  app.get("/api/clients", async (req, res) => {
    try {
      // Temporary: Use demo user ID until authentication is implemented
      const userId = 2;
      const clients = await storage.getClientsByUserId(userId);
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      // Temporary: Use demo user ID until authentication is implemented
      const userId = 2;
      const clientData = insertClientSchema.parse({ ...req.body, userId });
      const client = await storage.createClient(clientData);
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const client = await storage.updateClient(id, updates);
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Services routes
  app.get("/api/services", async (req, res) => {
    try {
      // Temporary: Use demo user ID until authentication is implemented
      const userId = 2;
      const services = await storage.getServicesByUserId(userId);
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      // Temporary: Use demo user ID until authentication is implemented
      const userId = 2;
      const serviceData = insertServiceSchema.parse({ ...req.body, userId });
      const service = await storage.createService(serviceData);
      res.json(service);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // File upload route
  app.post("/api/upload", upload.single('photo'), async (req, res) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // In production, upload to cloud storage (AWS S3, Cloudinary, etc.)
      // For now, we'll use a data URL
      const photoUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      
      res.json({ photoUrl });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Gallery routes
  app.get("/api/gallery", async (req, res) => {
    try {
      // Temporary: Use demo user ID until authentication is implemented
      const userId = 2;
      const photos = await storage.getGalleryPhotosByUserId(userId);
      res.json(photos);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gallery", upload.single('photo'), async (req, res) => {
    try {
      // Temporary: Use demo user ID until authentication is implemented
      const userId = 2;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // In production, upload to cloud storage (AWS S3, Cloudinary, etc.)
      // For now, we'll use a placeholder URL
      const photoUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      
      // Convert FormData string values to correct types
      const bodyData = {
        ...req.body,
        userId,
        photoUrl,
        clientId: req.body.clientId ? parseInt(req.body.clientId) : undefined,
        isPublic: req.body.isPublic === 'true',
      };
      
      const photoData = insertGalleryPhotoSchema.parse(bodyData);
      
      const photo = await storage.createGalleryPhoto(photoData);
      res.json(photo);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Invoice routes
  app.get("/api/invoices", async (req, res) => {
    try {
      // Temporary: Use demo user ID until authentication is implemented
      const userId = 2;
      const invoices = await storage.getInvoicesByUserId(userId);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      // Temporary: Use demo user ID until authentication is implemented
      const userId = 2;
      const invoiceData = insertInvoiceSchema.parse({ ...req.body, userId });
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Stripe payment routes
  if (stripe) {
    app.post("/api/create-payment-intent", async (req, res) => {
      try {
        const { amount, currency = "usd" } = req.body;
        
        if (!amount || amount <= 0) {
          return res.status(400).json({ message: "Invalid amount" });
        }

        const paymentIntent = await stripe!.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          metadata: {
            userId: (req as any).user.id.toString(),
          },
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error: any) {
        res.status(500).json({ message: "Error creating payment intent: " + error.message });
      }
    });

    app.post("/api/confirm-payment", async (req, res) => {
      try {
        const { paymentIntentId, invoiceId } = req.body;
        
        const paymentIntent = await stripe!.paymentIntents.retrieve(paymentIntentId);
        
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
  } else {
    // Stripe not configured, return error for payment routes
    app.post("/api/create-payment-intent", (req, res) => {
      res.status(501).json({ 
        message: "Stripe not configured. Please set STRIPE_SECRET_KEY environment variable." 
      });
    });
  }

  // Quick action routes for mobile features
  app.post("/api/quick-actions/send-message", async (req, res) => {
    try {
      const { clientId, message, type } = req.body;
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // In production, integrate with SMS service (Twilio, etc.)
      console.log(`Sending ${type} message to ${client.name} (${client.phone}): ${message}`);
      
      res.json({ success: true, message: "Message sent successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Seed default services for new users
  app.post("/api/seed-services", async (req, res) => {
    try {
      // Temporary: Use demo user ID until authentication is implemented
      const userId = 2;
      
      const defaultServices = [
        { name: "Haircut", description: "Professional haircut", price: "45.00", duration: 45, category: "haircut", userId },
        { name: "Beard Trim", description: "Beard shaping and trimming", price: "25.00", duration: 30, category: "beard", userId },
        { name: "Haircut + Beard", description: "Complete styling package", price: "65.00", duration: 60, category: "combo", userId },
        { name: "Skin Fade", description: "Precision fade cut", price: "50.00", duration: 50, category: "haircut", userId },
      ];

      const services = await Promise.all(
        defaultServices.map(service => storage.createService(service))
      );

      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Messages API
  app.get("/api/messages", async (req, res) => {
    try {
      const userId = 2; // Temporary demo user ID
      const messages = await storage.getMessagesByUserId(userId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/messages/unread-count", async (req, res) => {
    try {
      const userId = 2; // Temporary demo user ID
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/messages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const message = await storage.getMessage(parseInt(id));
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const userId = 2; // Temporary demo user ID
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        userId,
      });
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/messages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updatedMessage = await storage.updateMessage(parseInt(id), req.body);
      res.json(updatedMessage);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const updatedMessage = await storage.markMessageAsRead(parseInt(id));
      res.json(updatedMessage);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMessage(parseInt(id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public contact form endpoint (no authentication required)
  app.post("/api/contact", async (req, res) => {
    try {
      const userId = 2; // Messages go to demo user
      const contactSchema = z.object({
        customerName: z.string().min(1, "Name is required"),
        customerPhone: z.string().optional(),
        customerEmail: z.string().email().optional(),
        subject: z.string().min(1, "Subject is required"),
        message: z.string().min(1, "Message is required"),
        serviceRequested: z.string().optional(),
        preferredDate: z.string().optional(),
      });

      const validatedData = contactSchema.parse(req.body);
      
      const messageData = {
        ...validatedData,
        userId,
        preferredDate: validatedData.preferredDate ? new Date(validatedData.preferredDate) : undefined,
        priority: "normal" as const,
        status: "unread" as const,
      };

      const message = await storage.createMessage(messageData);
      res.status(201).json({ 
        success: true, 
        message: "Your message has been sent successfully! We'll get back to you soon.",
        id: message.id 
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          success: false,
          message: "Please check your information and try again", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        success: false,
        message: "Sorry, something went wrong. Please try again later." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
