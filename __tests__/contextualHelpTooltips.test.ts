import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types for contextual help tooltips testing
interface HelpContent {
  id: string;
  title: string;
  description: string;
  detailedHelp?: string;
  category: HelpCategory;
  icon: string;
  steps?: string[];
  tips?: string[];
  relatedFeatures?: string[];
  priority: 'low' | 'medium' | 'high';
  userType: 'beginner' | 'intermediate' | 'advanced' | 'all';
}

type HelpCategory = 'appointments' | 'clients' | 'services' | 'invoices' | 'gallery' | 'settings' | 'general';

interface HelpSystemState {
  userType: 'beginner' | 'intermediate' | 'advanced';
  hasSeenTooltip: { [key: string]: boolean };
  helpEnabled: boolean;
  currentContext: string;
}

interface TooltipDisplayConditions {
  shouldShow: boolean;
  reason: string;
  userTypeMismatch: boolean;
  alreadySeen: boolean;
  helpDisabled: boolean;
}

// Mock help content database
const mockHelpContent: { [key: string]: HelpContent } = {
  'dashboard-overview': {
    id: 'dashboard-overview',
    title: 'Dashboard Overview',
    description: 'Your business overview showing today\'s appointments and revenue',
    detailedHelp: 'The dashboard provides a comprehensive view of your daily operations',
    category: 'general',
    icon: 'BookOpen',
    steps: ['Review today\'s appointments', 'Check pending confirmations', 'Use quick actions'],
    tips: ['Green dots indicate confirmed appointments', 'Click cards for details'],
    priority: 'high',
    userType: 'all'
  },
  'appointment-scheduling': {
    id: 'appointment-scheduling',
    title: 'Smart Appointment Scheduling',
    description: 'Schedule appointments with automatic conflict detection',
    category: 'appointments',
    icon: 'Calendar',
    steps: ['Select client', 'Choose services', 'Pick time slot', 'Confirm appointment'],
    tips: ['Travel time is calculated automatically', 'Blocked slots indicate conflicts'],
    relatedFeatures: ['working-hours', 'travel-time', 'sms-confirmations'],
    priority: 'high',
    userType: 'all'
  },
  'client-management': {
    id: 'client-management',
    title: 'Client Management System',
    description: 'Manage client profiles and preferences',
    category: 'clients',
    icon: 'Users',
    priority: 'medium',
    userType: 'intermediate'
  },
  'advanced-features': {
    id: 'advanced-features',
    title: 'Advanced Features',
    description: 'Complex functionality for power users',
    category: 'settings',
    icon: 'Settings',
    priority: 'low',
    userType: 'advanced'
  }
};

// Mock help system manager
class MockHelpSystemManager {
  private state: HelpSystemState;
  private storageKey = 'clippr-help-system-state';

  constructor() {
    this.state = {
      userType: 'beginner',
      hasSeenTooltip: {},
      helpEnabled: true,
      currentContext: 'dashboard'
    };
  }

  getUserType(): 'beginner' | 'intermediate' | 'advanced' {
    return this.state.userType;
  }

  setUserType(type: 'beginner' | 'intermediate' | 'advanced'): void {
    this.state.userType = type;
  }

  hasSeenTooltip(helpId: string): boolean {
    return this.state.hasSeenTooltip[helpId] || false;
  }

  markTooltipAsSeen(helpId: string): void {
    this.state.hasSeenTooltip[helpId] = true;
  }

  isHelpEnabled(): boolean {
    return this.state.helpEnabled;
  }

  setHelpEnabled(enabled: boolean): void {
    this.state.helpEnabled = enabled;
  }

  getCurrentContext(): string {
    return this.state.currentContext;
  }

  setCurrentContext(context: string): void {
    this.state.currentContext = context;
  }

  getRelevantHelp(context: string): HelpContent[] {
    const userType = this.getUserType();
    return Object.values(mockHelpContent).filter(help => 
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
  }
}

// Mock contextual help tooltip service
class MockContextualHelpService {
  private helpManager: MockHelpSystemManager;

  constructor() {
    this.helpManager = new MockHelpSystemManager();
  }

  shouldShowTooltip(helpId: string, options: {
    showOnFirstVisit?: boolean;
    disabled?: boolean;
  } = {}): TooltipDisplayConditions {
    const helpContent = mockHelpContent[helpId];
    const userType = this.helpManager.getUserType();
    const helpEnabled = this.helpManager.isHelpEnabled();
    const alreadySeen = this.helpManager.hasSeenTooltip(helpId);

    const conditions: TooltipDisplayConditions = {
      shouldShow: true,
      reason: '',
      userTypeMismatch: false,
      alreadySeen: false,
      helpDisabled: false
    };

    if (!helpContent) {
      conditions.shouldShow = false;
      conditions.reason = 'Help content not found';
      return conditions;
    }

    if (options.disabled) {
      conditions.shouldShow = false;
      conditions.reason = 'Tooltip disabled via props';
      return conditions;
    }

    if (!helpEnabled) {
      conditions.shouldShow = false;
      conditions.reason = 'Help system disabled';
      conditions.helpDisabled = true;
      return conditions;
    }

    // Check user type compatibility (advanced users can see intermediate content)
    if (helpContent.userType !== 'all' && helpContent.userType !== userType) {
      // Advanced users can see intermediate content
      if (!(userType === 'advanced' && helpContent.userType === 'intermediate')) {
        conditions.shouldShow = false;
        conditions.reason = `User type mismatch: ${userType} vs ${helpContent.userType}`;
        conditions.userTypeMismatch = true;
        return conditions;
      }
    }

    // Check if already seen (for first visit tooltips)
    if (options.showOnFirstVisit && alreadySeen) {
      conditions.shouldShow = false;
      conditions.reason = 'Already seen on first visit';
      conditions.alreadySeen = true;
      return conditions;
    }

    conditions.reason = 'All conditions met';
    return conditions;
  }

  getTooltipContent(helpId: string): HelpContent | null {
    return mockHelpContent[helpId] || null;
  }

  getHelpManager(): MockHelpSystemManager {
    return this.helpManager;
  }
}

describe('Contextual Help Tooltips System', () => {
  let helpService: MockContextualHelpService;
  let helpManager: MockHelpSystemManager;

  beforeEach(() => {
    helpService = new MockContextualHelpService();
    helpManager = helpService.getHelpManager();
  });

  describe('Help Content Database', () => {
    it('should contain comprehensive help content for all major features', () => {
      const dashboardHelp = helpService.getTooltipContent('dashboard-overview');
      expect(dashboardHelp).toBeTruthy();
      expect(dashboardHelp?.title).toBe('Dashboard Overview');
      expect(dashboardHelp?.category).toBe('general');
      expect(dashboardHelp?.steps).toHaveLength(3);
      expect(dashboardHelp?.tips).toHaveLength(2);
    });

    it('should include appointment scheduling help with detailed steps', () => {
      const appointmentHelp = helpService.getTooltipContent('appointment-scheduling');
      expect(appointmentHelp).toBeTruthy();
      expect(appointmentHelp?.title).toBe('Smart Appointment Scheduling');
      expect(appointmentHelp?.category).toBe('appointments');
      expect(appointmentHelp?.steps).toHaveLength(4);
      expect(appointmentHelp?.relatedFeatures).toContain('working-hours');
      expect(appointmentHelp?.relatedFeatures).toContain('travel-time');
    });

    it('should categorize help content correctly', () => {
      const categories = Object.values(mockHelpContent).map(help => help.category);
      expect(categories).toContain('general');
      expect(categories).toContain('appointments');
      expect(categories).toContain('clients');
      expect(categories).toContain('settings');
    });

    it('should assign appropriate priority levels', () => {
      const dashboardHelp = helpService.getTooltipContent('dashboard-overview');
      const appointmentHelp = helpService.getTooltipContent('appointment-scheduling');
      const clientHelp = helpService.getTooltipContent('client-management');

      expect(dashboardHelp?.priority).toBe('high');
      expect(appointmentHelp?.priority).toBe('high');
      expect(clientHelp?.priority).toBe('medium');
    });
  });

  describe('User Type Filtering', () => {
    it('should show "all" user type content to all users', () => {
      const conditions = helpService.shouldShowTooltip('dashboard-overview');
      expect(conditions.shouldShow).toBe(true);
      expect(conditions.userTypeMismatch).toBe(false);

      helpManager.setUserType('intermediate');
      const conditionsIntermediate = helpService.shouldShowTooltip('dashboard-overview');
      expect(conditionsIntermediate.shouldShow).toBe(true);

      helpManager.setUserType('advanced');
      const conditionsAdvanced = helpService.shouldShowTooltip('dashboard-overview');
      expect(conditionsAdvanced.shouldShow).toBe(true);
    });

    it('should filter intermediate content for beginner users', () => {
      helpManager.setUserType('beginner');
      const conditions = helpService.shouldShowTooltip('client-management');
      expect(conditions.shouldShow).toBe(false);
      expect(conditions.userTypeMismatch).toBe(true);
      expect(conditions.reason).toContain('User type mismatch');
    });

    it('should filter advanced content for non-advanced users', () => {
      helpManager.setUserType('beginner');
      const conditions = helpService.shouldShowTooltip('advanced-features');
      expect(conditions.shouldShow).toBe(false);
      expect(conditions.userTypeMismatch).toBe(true);

      helpManager.setUserType('intermediate');
      const conditionsIntermediate = helpService.shouldShowTooltip('advanced-features');
      expect(conditionsIntermediate.shouldShow).toBe(false);
      expect(conditionsIntermediate.userTypeMismatch).toBe(true);
    });

    it('should show appropriate content for intermediate users', () => {
      helpManager.setUserType('intermediate');
      const conditions = helpService.shouldShowTooltip('client-management');
      expect(conditions.shouldShow).toBe(true);
      expect(conditions.userTypeMismatch).toBe(false);
    });

    it('should show all content for advanced users', () => {
      helpManager.setUserType('advanced');
      const dashboardConditions = helpService.shouldShowTooltip('dashboard-overview');
      const clientConditions = helpService.shouldShowTooltip('client-management');
      const advancedConditions = helpService.shouldShowTooltip('advanced-features');

      expect(dashboardConditions.shouldShow).toBe(true);
      // Client management is for intermediate users, so advanced users should also see it
      expect(clientConditions.shouldShow).toBe(true);
      expect(advancedConditions.shouldShow).toBe(true);
    });
  });

  describe('Help System State Management', () => {
    it('should track seen tooltips correctly', () => {
      expect(helpManager.hasSeenTooltip('dashboard-overview')).toBe(false);
      
      helpManager.markTooltipAsSeen('dashboard-overview');
      expect(helpManager.hasSeenTooltip('dashboard-overview')).toBe(true);
    });

    it('should respect help system enabled/disabled state', () => {
      helpManager.setHelpEnabled(false);
      const conditions = helpService.shouldShowTooltip('dashboard-overview');
      expect(conditions.shouldShow).toBe(false);
      expect(conditions.helpDisabled).toBe(true);
      expect(conditions.reason).toBe('Help system disabled');
    });

    it('should handle first visit tooltips properly', () => {
      // First visit should show
      const firstVisit = helpService.shouldShowTooltip('dashboard-overview', { showOnFirstVisit: true });
      expect(firstVisit.shouldShow).toBe(true);

      // Mark as seen
      helpManager.markTooltipAsSeen('dashboard-overview');

      // Second visit should not show for first-visit tooltips
      const secondVisit = helpService.shouldShowTooltip('dashboard-overview', { showOnFirstVisit: true });
      expect(secondVisit.shouldShow).toBe(false);
      expect(secondVisit.alreadySeen).toBe(true);
    });

    it('should handle disabled tooltips via props', () => {
      const conditions = helpService.shouldShowTooltip('dashboard-overview', { disabled: true });
      expect(conditions.shouldShow).toBe(false);
      expect(conditions.reason).toBe('Tooltip disabled via props');
    });

    it('should maintain current context state', () => {
      helpManager.setCurrentContext('appointments');
      expect(helpManager.getCurrentContext()).toBe('appointments');
      
      helpManager.setCurrentContext('clients');
      expect(helpManager.getCurrentContext()).toBe('clients');
    });
  });

  describe('Contextual Help Filtering', () => {
    it('should filter relevant help by context', () => {
      helpManager.setUserType('all' as any); // Show all content
      const appointmentHelp = helpManager.getRelevantHelp('appointments');
      
      expect(appointmentHelp.length).toBeGreaterThan(0);
      expect(appointmentHelp.some(help => help.category === 'appointments')).toBe(true);
    });

    it('should include related features in context filtering', () => {
      const appointmentHelp = helpManager.getRelevantHelp('working-hours');
      
      // Should include appointment-scheduling because it has 'working-hours' in relatedFeatures
      expect(appointmentHelp.some(help => help.id === 'appointment-scheduling')).toBe(true);
    });

    it('should sort help content by priority', () => {
      helpManager.setUserType('all' as any);
      const allHelp = helpManager.getRelevantHelp('general');
      
      if (allHelp.length > 1) {
        // High priority should come first
        expect(allHelp[0].priority).toBe('high');
      }
    });
  });

  describe('Help System Reset Functionality', () => {
    it('should reset all help state correctly', () => {
      // Change state
      helpManager.setUserType('advanced');
      helpManager.setHelpEnabled(false);
      helpManager.markTooltipAsSeen('dashboard-overview');
      helpManager.setCurrentContext('clients');

      // Reset
      helpManager.resetHelpState();

      // Verify reset
      expect(helpManager.getUserType()).toBe('beginner');
      expect(helpManager.isHelpEnabled()).toBe(true);
      expect(helpManager.hasSeenTooltip('dashboard-overview')).toBe(false);
      expect(helpManager.getCurrentContext()).toBe('dashboard');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent help content gracefully', () => {
      const conditions = helpService.shouldShowTooltip('non-existent-help');
      expect(conditions.shouldShow).toBe(false);
      expect(conditions.reason).toBe('Help content not found');
    });

    it('should return null for non-existent help content', () => {
      const content = helpService.getTooltipContent('non-existent-help');
      expect(content).toBeNull();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex display logic correctly', () => {
      // Scenario: Advanced user with help enabled, first visit
      helpManager.setUserType('advanced');
      helpManager.setHelpEnabled(true);
      
      const conditions = helpService.shouldShowTooltip('advanced-features', { showOnFirstVisit: true });
      expect(conditions.shouldShow).toBe(true);
      expect(conditions.reason).toBe('All conditions met');
    });

    it('should handle user type changes dynamically', () => {
      // Start as beginner
      helpManager.setUserType('beginner');
      expect(helpService.shouldShowTooltip('client-management').shouldShow).toBe(false);

      // Upgrade to intermediate
      helpManager.setUserType('intermediate');
      expect(helpService.shouldShowTooltip('client-management').shouldShow).toBe(true);

      // Upgrade to advanced
      helpManager.setUserType('advanced');
      expect(helpService.shouldShowTooltip('advanced-features').shouldShow).toBe(true);
    });

    it('should maintain seen state across user type changes', () => {
      helpManager.setUserType('intermediate');
      helpManager.markTooltipAsSeen('client-management');
      
      // Change user type
      helpManager.setUserType('advanced');
      
      // Should still remember it was seen
      expect(helpManager.hasSeenTooltip('client-management')).toBe(true);
    });
  });
});