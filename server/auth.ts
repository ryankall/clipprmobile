import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import session from 'express-session';
import type { Express, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import type { User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret';

// Configure session middleware
export const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

// Configure passport
export function configurePassport() {
  // Local strategy for email/password authentication
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email: string, password: string, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        if (!user.password) {
          return done(null, false, { message: 'Please use social login' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Google OAuth strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with Google ID
          let user = await storage.getUserByGoogleId(profile.id);
          
          if (!user && profile.emails?.[0]?.value) {
            // Check if user exists with email
            user = await storage.getUserByEmail(profile.emails[0].value);
            if (user) {
              // Link Google account to existing user
              await storage.updateUser(user.id, { googleId: profile.id });
              user = await storage.getUser(user.id);
            }
          }

          if (!user) {
            // Create new user - but we need phone number for signup
            return done(null, false, { message: 'Phone number required for signup' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }

  // Apple OAuth strategy
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    passport.use(new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKey: process.env.APPLE_PRIVATE_KEY,
        callbackURL: '/api/auth/apple/callback',
      },
      async (accessToken, refreshToken, idToken, profile, done) => {
        try {
          // Check if user exists with Apple ID
          let user = await storage.getUserByAppleId(profile.id);
          
          if (!user && profile.email) {
            // Check if user exists with email
            user = await storage.getUserByEmail(profile.email);
            if (user) {
              // Link Apple account to existing user
              await storage.updateUser(user.id, { appleId: profile.id });
              user = await storage.getUser(user.id);
            }
          }

          if (!user) {
            // Create new user - but we need phone number for signup
            return done(null, false, { message: 'Phone number required for signup' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Check JWT token as fallback
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      req.user = { id: decoded.userId } as User;
      return next();
    } catch (error) {
      // Invalid token
    }
  }
  
  res.status(401).json({ message: 'Authentication required' });
}

// Generate JWT token
export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Setup authentication middleware
export function setupAuth(app: Express) {
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());
  configurePassport();
}