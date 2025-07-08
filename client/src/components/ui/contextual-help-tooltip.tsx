import React, { useState, useEffect } from 'react';
import { HelpCircle, X, BookOpen, Clock, Settings, Users, Calendar, DollarSign, Camera } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Types for contextual help system
interface HelpContent {
  id: string;
  title: string;
  description: string;
  detailedHelp?: string;
  category: HelpCategory;
  icon: React.ComponentType<{ className?: string }>;
  steps?: string[];
  tips?: string[];
  relatedFeatures?: string[];
  videoUrl?: string;
  priority: 'low' | 'medium' | 'high';
  userType: 'beginner' | 'intermediate' | 'advanced' | 'all';
}

type HelpCategory = 'appointments' | 'clients' | 'services' | 'invoices' | 'gallery' | 'settings' | 'general';

interface ContextualHelpProps {
  helpId: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
  variant?: 'icon' | 'text' | 'button' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  showOnFirstVisit?: boolean;
  delayMs?: number;
}

interface HelpSystemState {
  userType: 'beginner' | 'intermediate' | 'advanced';
  hasSeenTooltip: { [key: string]: boolean };
  helpEnabled: boolean;
  currentContext: string;
}

// Comprehensive help content database
const helpContentDatabase: { [key: string]: HelpContent } = {
  // Dashboard help
  'dashboard-overview': {
    id: 'dashboard-overview',
    title: 'Dashboard Overview',
    description: 'Your business overview showing today\'s appointments, revenue, and quick actions',
    detailedHelp: 'The dashboard provides a comprehensive view of your daily operations including current appointments, next scheduled appointments, pending confirmations, and quick action buttons for common tasks.',
    category: 'general',
    icon: BookOpen,
    steps: [
      'Review today\'s appointments in the Current/Next cards',
      'Check pending confirmations requiring SMS responses',
      'Use quick action buttons for common tasks',
      'Monitor revenue and client statistics'
    ],
    tips: [
      'Green dots indicate confirmed appointments',
      'Yellow dots show pending confirmations',
      'Click appointment cards for detailed actions',
      'Quick messages save time for common responses'
    ],
    priority: 'high',
    userType: 'all'
  },

  // Appointment system help
  'appointment-scheduling': {
    id: 'appointment-scheduling',
    title: 'Smart Appointment Scheduling',
    description: 'Schedule appointments with automatic conflict detection and travel time calculations',
    detailedHelp: 'Our intelligent scheduling system prevents double bookings, calculates travel time between appointments, and ensures proper working hours compliance.',
    category: 'appointments',
    icon: Calendar,
    steps: [
      'Select client or enter new client information',
      'Choose services and calculate total time',
      'Pick available time slot from calendar',
      'Add travel address if mobile service',
      'Confirm appointment details and send SMS'
    ],
    tips: [
      'Travel time is automatically calculated using Google Maps',
      'Blocked time slots indicate conflicts or breaks',
      'Working hours are enforced to prevent scheduling errors',
      'SMS confirmations are sent automatically to clients'
    ],
    relatedFeatures: ['working-hours', 'travel-time', 'sms-confirmations'],
    priority: 'high',
    userType: 'all'
  },

  'working-hours': {
    id: 'working-hours',
    title: 'Working Hours Management',
    description: 'Set your availability and break times for each day of the week',
    detailedHelp: 'Configure your working schedule including daily hours, lunch breaks, and day-specific availability. This prevents appointments from being scheduled outside your available times.',
    category: 'appointments',
    icon: Clock,
    steps: [
      'Access working hours from calendar settings',
      'Set start and end times for each day',
      'Add break periods (lunch, personal time)',
      'Toggle days on/off as needed',
      'Save changes to update availability'
    ],
    tips: [
      'Break times appear as blocked slots in calendar',
      'Sunday is typically blocked for most barbers',
      'Adjust hours seasonally or for special events',
      'Break labels help clients understand availability'
    ],
    priority: 'medium',
    userType: 'all'
  },

  'travel-time': {
    id: 'travel-time',
    title: 'Travel Time Calculation',
    description: 'Automatic travel time calculation between appointments for mobile services',
    detailedHelp: 'The system calculates real-time travel duration between your home base and client locations using Google Maps, automatically adding buffer time to prevent scheduling conflicts.',
    category: 'appointments',
    icon: Clock,
    steps: [
      'Set your home base address in settings',
      'Enter client address when booking mobile services',
      'System calculates travel time automatically',
      'Buffer time is added to prevent conflicts',
      'Appointment slots adjust accordingly'
    ],
    tips: [
      'Travel time includes traffic considerations',
      'Buffer time accounts for parking and setup',
      'Use accurate addresses for best results',
      'Consider peak traffic times when scheduling'
    ],
    priority: 'medium',
    userType: 'intermediate'
  },

  // Client management help
  'client-management': {
    id: 'client-management',
    title: 'Client Management System',
    description: 'Manage client profiles, preferences, and visit history',
    detailedHelp: 'Build detailed client profiles including contact information, service preferences, visit history, and special notes to provide personalized service.',
    category: 'clients',
    icon: Users,
    steps: [
      'Create client profiles with contact details',
      'Record service preferences and notes',
      'Track visit history and loyalty status',
      'Upload profile photos for easy recognition',
      'Set VIP status for premium clients'
    ],
    tips: [
      'Phone numbers must be unique per client',
      'Profile photos help with client recognition',
      'VIP clients get special badge treatment',
      'Visit history helps with service recommendations'
    ],
    relatedFeatures: ['vip-clients', 'client-photos', 'visit-history'],
    priority: 'high',
    userType: 'all'
  },

  'vip-clients': {
    id: 'vip-clients',
    title: 'VIP Client Management',
    description: 'Special treatment and tracking for your most valued clients',
    detailedHelp: 'VIP clients receive special designation with gold badges, priority scheduling, and enhanced profile features to recognize your most important customers.',
    category: 'clients',
    icon: Users,
    steps: [
      'Toggle VIP status in client profile',
      'VIP clients receive gold badges',
      'Priority display in client lists',
      'Special treatment notifications',
      'Enhanced profile features'
    ],
    tips: [
      'VIP status appears throughout the app',
      'Use for clients who tip well or visit frequently',
      'Helps prioritize appointment scheduling',
      'Consider offering VIP-only services'
    ],
    priority: 'low',
    userType: 'intermediate'
  },

  // Service and pricing help
  'service-management': {
    id: 'service-management',
    title: 'Service & Pricing Management',
    description: 'Manage your service catalog with pricing and duration settings',
    detailedHelp: 'Create and manage your service offerings including prices, durations, descriptions, and categories. Services can be combined for package deals.',
    category: 'services',
    icon: Settings,
    steps: [
      'Create services with names and descriptions',
      'Set pricing and duration for each service',
      'Organize into categories (haircuts, beard, etc.)',
      'Toggle active/inactive status',
      'Combine services for package deals'
    ],
    tips: [
      'Accurate duration prevents scheduling conflicts',
      'Competitive pricing research helps set rates',
      'Seasonal services can be toggled on/off',
      'Package deals encourage multiple services'
    ],
    relatedFeatures: ['service-combinations', 'pricing-strategy'],
    priority: 'medium',
    userType: 'all'
  },

  // Invoice and payment help
  'invoice-system': {
    id: 'invoice-system',
    title: 'Invoice & Payment Processing',
    description: 'Professional invoicing with integrated payment processing',
    detailedHelp: 'Generate professional invoices with service itemization, tax calculations, and integrated Stripe payment processing for seamless client transactions.',
    category: 'invoices',
    icon: DollarSign,
    steps: [
      'Select client and services provided',
      'Review service details and pricing',
      'Add tip percentage if applicable',
      'Generate invoice with payment link',
      'Send via email or SMS to client'
    ],
    tips: [
      'Payment links work with Apple Pay and cards',
      'Invoices can be saved as templates',
      'Track payment status in real-time',
      'Export invoice data for accounting'
    ],
    relatedFeatures: ['payment-processing', 'invoice-templates', 'tax-calculations'],
    priority: 'high',
    userType: 'all'
  },

  'payment-processing': {
    id: 'payment-processing',
    title: 'Payment Processing Setup',
    description: 'Configure Stripe integration for secure online payments',
    detailedHelp: 'Set up Stripe Connect to receive payments directly to your bank account. Support for credit cards, debit cards, and Apple Pay.',
    category: 'invoices',
    icon: DollarSign,
    steps: [
      'Connect your Stripe account in settings',
      'Complete business verification process',
      'Set up bank account for deposits',
      'Test payment processing',
      'Go live with real transactions'
    ],
    tips: [
      'Stripe fees are 2.9% + $0.30 per transaction',
      'Payments typically arrive in 2-7 business days',
      'Keep business information updated',
      'Monitor payment disputes and chargebacks'
    ],
    priority: 'medium',
    userType: 'intermediate'
  },

  // Gallery help
  'gallery-management': {
    id: 'gallery-management',
    title: 'Portfolio Gallery Management',
    description: 'Showcase your work with professional portfolio management',
    detailedHelp: 'Build an impressive portfolio gallery with before/after photos, client consent management, and public/private visibility controls.',
    category: 'gallery',
    icon: Camera,
    steps: [
      'Upload high-quality photos of your work',
      'Add descriptions and service tags',
      'Set visibility (public/private)',
      'Organize by service type or client',
      'Share portfolio with potential clients'
    ],
    tips: [
      'Good lighting makes photos look professional',
      'Get client consent before public sharing',
      'Before/after photos showcase your skills',
      'Regular updates keep portfolio fresh'
    ],
    relatedFeatures: ['photo-consent', 'portfolio-sharing'],
    priority: 'medium',
    userType: 'all'
  },

  // Settings help
  'settings-overview': {
    id: 'settings-overview',
    title: 'Settings & Configuration',
    description: 'Customize your app experience and business settings',
    detailedHelp: 'Configure your profile, business settings, working hours, payment processing, and app preferences to optimize your workflow.',
    category: 'settings',
    icon: Settings,
    steps: [
      'Update your profile information',
      'Set business address and contact details',
      'Configure working hours and breaks',
      'Set up payment processing',
      'Adjust app preferences and notifications'
    ],
    tips: [
      'Complete profile builds client trust',
      'Accurate business info helps with SEO',
      'Regular backups prevent data loss',
      'Update settings seasonally as needed'
    ],
    priority: 'medium',
    userType: 'all'
  },

  // SMS and notifications
  'sms-confirmations': {
    id: 'sms-confirmations',
    title: 'SMS Confirmation System',
    description: 'Automated SMS confirmations for appointment bookings',
    detailedHelp: 'All appointments require SMS confirmation from clients. System sends automatic confirmation requests and handles YES/NO responses.',
    category: 'appointments',
    icon: BookOpen,
    steps: [
      'Client books appointment online',
      'System sends SMS confirmation request',
      'Client replies YES to confirm',
      'Confirmed appointments appear in dashboard',
      'Unconfirmed appointments expire after 30 minutes'
    ],
    tips: [
      'Confirmations prevent no-shows',
      'Expired requests need manual follow-up',
      'Quick action messages save time',
      'Track confirmation rates for insights'
    ],
    priority: 'high',
    userType: 'all'
  },

  // Public booking system
  'public-booking': {
    id: 'public-booking',
    title: 'Public Booking System',
    description: 'Share your booking link for clients to schedule appointments',
    detailedHelp: 'Generate a shareable booking link that clients can use to view your availability and request appointments 24/7.',
    category: 'appointments',
    icon: Calendar,
    steps: [
      'Find your booking link in settings',
      'Share link via social media or website',
      'Clients select services and time slots',
      'System checks availability automatically',
      'Booking requests appear in your messages'
    ],
    tips: [
      'Booking links work on all devices',
      'Availability updates in real-time',
      'Returning clients get auto-filled forms',
      'Use QR codes for easy sharing'
    ],
    relatedFeatures: ['client-recognition', 'real-time-availability'],
    priority: 'high',
    userType: 'all'
  }
};

// Help system state management
class HelpSystemManager {
  private state: HelpSystemState;
  private storageKey = 'clippr-help-system-state';

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): HelpSystemState {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load help system state:', error);
    }

    return {
      userType: 'beginner',
      hasSeenTooltip: {},
      helpEnabled: true,
      currentContext: 'dashboard'
    };
  }

  private saveState(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save help system state:', error);
    }
  }

  getUserType(): 'beginner' | 'intermediate' | 'advanced' {
    return this.state.userType;
  }

  setUserType(type: 'beginner' | 'intermediate' | 'advanced'): void {
    this.state.userType = type;
    this.saveState();
  }

  hasSeenTooltip(helpId: string): boolean {
    return this.state.hasSeenTooltip[helpId] || false;
  }

  markTooltipAsSeen(helpId: string): void {
    this.state.hasSeenTooltip[helpId] = true;
    this.saveState();
  }

  isHelpEnabled(): boolean {
    return this.state.helpEnabled;
  }

  setHelpEnabled(enabled: boolean): void {
    this.state.helpEnabled = enabled;
    this.saveState();
  }

  getCurrentContext(): string {
    return this.state.currentContext;
  }

  setCurrentContext(context: string): void {
    this.state.currentContext = context;
    this.saveState();
  }

  getRelevantHelp(context: string): HelpContent[] {
    const userType = this.getUserType();
    return Object.values(helpContentDatabase).filter(help => 
      (help.userType === 'all' || help.userType === userType) &&
      (help.category === context || help.relatedFeatures?.includes(context))
    ).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  resetHelpState(): void {
    this.state = {
      userType: 'beginner',
      hasSeenTooltip: {},
      helpEnabled: true,
      currentContext: 'dashboard'
    };
    this.saveState();
  }
}

// Global help system manager instance
const helpSystemManager = new HelpSystemManager();

// Context-aware help tooltip component
export function ContextualHelpTooltip({
  helpId,
  side = 'top',
  align = 'center',
  className,
  variant = 'icon',
  size = 'md',
  disabled = false,
  showOnFirstVisit = false,
  delayMs = 0
}: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);

  const helpContent = helpContentDatabase[helpId];
  const userType = helpSystemManager.getUserType();
  const helpEnabled = helpSystemManager.isHelpEnabled();

  useEffect(() => {
    const seen = helpSystemManager.hasSeenTooltip(helpId);
    setHasBeenSeen(seen);

    if (showOnFirstVisit && !seen && helpEnabled) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, delayMs);
      return () => clearTimeout(timer);
    }
  }, [helpId, showOnFirstVisit, delayMs, helpEnabled]);

  const handleTooltipOpen = () => {
    if (!hasBeenSeen) {
      helpSystemManager.markTooltipAsSeen(helpId);
      setHasBeenSeen(true);
    }
    setIsOpen(true);
  };

  if (!helpContent || disabled || !helpEnabled) {
    return null;
  }

  // Filter content based on user type
  if (helpContent.userType !== 'all' && helpContent.userType !== userType) {
    return null;
  }

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const IconComponent = helpContent.icon;

  const TriggerComponent = () => {
    switch (variant) {
      case 'text':
        return (
          <span className={cn(
            'text-muted-foreground hover:text-foreground cursor-help underline decoration-dotted',
            className
          )}>
            {helpContent.title}
          </span>
        );
      case 'button':
        return (
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-auto p-1', className)}
          >
            <HelpCircle className={iconSizeClasses[size]} />
          </Button>
        );
      case 'inline':
        return (
          <span className={cn(
            'inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-help',
            className
          )}>
            <HelpCircle className={iconSizeClasses[size]} />
            <span className="text-sm">{helpContent.title}</span>
          </span>
        );
      default:
        return (
          <button
            className={cn(
              'inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors',
              'rounded-full p-1 hover:bg-muted',
              !hasBeenSeen && 'animate-pulse',
              className
            )}
          >
            <HelpCircle className={iconSizeClasses[size]} />
          </button>
        );
    }
  };

  return (
    <TooltipProvider>
      <HoverCard open={isOpen} onOpenChange={setIsOpen}>
        <HoverCardTrigger asChild>
          <div onClick={handleTooltipOpen}>
            <TriggerComponent />
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          side={side}
          align={align}
          className="w-80 p-0"
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">{helpContent.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {helpContent.category}
                      </Badge>
                      <Badge 
                        variant={helpContent.priority === 'high' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {helpContent.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription className="text-sm">
                {helpContent.description}
              </CardDescription>
              
              {helpContent.detailedHelp && (
                <div className="text-sm text-muted-foreground">
                  {helpContent.detailedHelp}
                </div>
              )}

              {helpContent.steps && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Steps:</h4>
                  <ol className="space-y-1 text-sm text-muted-foreground">
                    {helpContent.steps.map((step, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-primary font-medium">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {helpContent.tips && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Tips:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {helpContent.tips.map((tip, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-amber-500">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {helpContent.relatedFeatures && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Related Features:</h4>
                  <div className="flex flex-wrap gap-1">
                    {helpContent.relatedFeatures.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </HoverCardContent>
      </HoverCard>
    </TooltipProvider>
  );
}

// Quick tooltip component for simple help
export function QuickHelpTooltip({ 
  content, 
  side = 'top', 
  className 
}: { 
  content: string; 
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className={cn(
            'inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors',
            'rounded-full p-1 hover:bg-muted',
            className
          )}>
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side}>
          <p className="max-w-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Help system settings component
export function HelpSystemSettings() {
  const [userType, setUserType] = useState(helpSystemManager.getUserType());
  const [helpEnabled, setHelpEnabled] = useState(helpSystemManager.isHelpEnabled());

  const handleUserTypeChange = (type: 'beginner' | 'intermediate' | 'advanced') => {
    setUserType(type);
    helpSystemManager.setUserType(type);
  };

  const handleHelpEnabledChange = (enabled: boolean) => {
    setHelpEnabled(enabled);
    helpSystemManager.setHelpEnabled(enabled);
  };

  const handleResetHelp = () => {
    helpSystemManager.resetHelpState();
    setUserType('beginner');
    setHelpEnabled(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Help System Settings
        </CardTitle>
        <CardDescription>
          Customize your help experience and tooltip behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-medium mb-3">Experience Level</h4>
          <div className="grid grid-cols-3 gap-2">
            {['beginner', 'intermediate', 'advanced'].map((type) => (
              <Button
                key={type}
                variant={userType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleUserTypeChange(type as any)}
                className="capitalize"
              >
                {type}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {userType === 'beginner' && 'Show all help content and step-by-step guides'}
            {userType === 'intermediate' && 'Show relevant tips and advanced features'}
            {userType === 'advanced' && 'Show only complex features and shortcuts'}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Help Tooltips</h4>
            <p className="text-sm text-muted-foreground">
              Show contextual help throughout the app
            </p>
          </div>
          <Button
            variant={helpEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleHelpEnabledChange(!helpEnabled)}
          >
            {helpEnabled ? 'Enabled' : 'Disabled'}
          </Button>
        </div>

        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetHelp}
            className="w-full"
          >
            Reset Help System
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            This will reset all seen tooltips and restore default settings
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Export help system manager for external use
export { helpSystemManager, helpContentDatabase };
export type { HelpContent, HelpCategory, ContextualHelpProps };