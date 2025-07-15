import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Switch, 
  TextInput, 
  Image, 
  Modal, 
  ActivityIndicator,
  Clipboard,
  StatusBar,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';
import { User } from '../../lib/types';
import * as ImagePicker from 'expo-image-picker';

interface NotificationSettings {
  newBookingRequests: boolean;
  appointmentConfirmations: boolean;
  appointmentCancellations: boolean;
  upcomingReminders: boolean;
  soundEffects: boolean;
}

interface BlockedClient {
  id: number;
  phoneNumber: string;
  blockedAt: string;
  reason?: string;
}

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'blocked' | 'payment' | 'subscription' | 'help'>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [blockedClients, setBlockedClients] = useState<BlockedClient[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    newBookingRequests: true,
    appointmentConfirmations: true,
    appointmentCancellations: true,
    upcomingReminders: true,
    soundEffects: true,
  });
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [profileForm, setProfileForm] = useState({
    businessName: '',
    email: '',
    phone: '',
    serviceArea: '',
    about: '',
    photoUrl: '',
    timezone: 'America/New_York',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const { isAuthenticated, signOut } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadUserProfile();
      loadBlockedClients();
      loadNotificationSettings();
      loadPaymentSettings();
      loadSubscriptionStatus();
    }
  }, [isAuthenticated]);

  const loadUserProfile = async () => {
    try {
      const data = await apiRequest<User>('GET', '/api/user/profile');
      setUser(data);
      setProfileForm({
        businessName: data.businessName || '',
        email: data.email || '',
        phone: data.phone || '',
        serviceArea: data.serviceArea || '',
        about: data.about || '',
        photoUrl: data.photoUrl || '',
        timezone: (data as any).timezone || 'America/New_York',
      });
    } catch (error) {
      console.error('Failed to load user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const loadBlockedClients = async () => {
    try {
      const data = await apiRequest<BlockedClient[]>('GET', '/api/anti-spam/blocked-clients');
      setBlockedClients(data);
    } catch (error) {
      console.error('Failed to load blocked clients:', error);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      // Load notification settings from AsyncStorage or API
      const settings = {
        newBookingRequests: true,
        appointmentConfirmations: true,
        appointmentCancellations: true,
        upcomingReminders: true,
        soundEffects: true,
      };
      setNotificationSettings(settings);
      
      // Check push notification status
      const pushStatus = await apiRequest<{subscribed: boolean}>('GET', '/api/push/subscription');
      setPushNotificationsEnabled(pushStatus.subscribed);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth');
          }
        }
      ]
    );
  };

  const handleProfileSave = async () => {
    try {
      await apiRequest('PATCH', '/api/user/profile', profileForm);
      setIsEditingProfile(false);
      loadUserProfile();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    try {
      await apiRequest('POST', '/api/auth/change-password', passwordForm);
      setIsChangingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      Alert.alert('Success', 'Password changed successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    }
  };

  const handlePhotoUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      // Convert to base64 for API
      const base64 = await fetch(imageUri)
        .then(res => res.blob())
        .then(blob => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        }));
      
      setProfileForm({ ...profileForm, photoUrl: base64 as string });
    }
  };

  const handleCameraCapture = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      // Convert to base64 for API
      const base64 = await fetch(imageUri)
        .then(res => res.blob())
        .then(blob => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        }));
      
      setProfileForm({ ...profileForm, photoUrl: base64 as string });
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Request permission and subscribe
        await apiRequest('POST', '/api/push/subscribe', {});
      } else {
        // Unsubscribe
        await apiRequest('POST', '/api/push/unsubscribe', {});
      }
      setPushNotificationsEnabled(enabled);
      Alert.alert('Success', `Push notifications ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleNotificationTypeToggle = (type: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [type]: value }));
    // Store in AsyncStorage
    // AsyncStorage.setItem(`notification_${type}`, value.toString());
  };

  const handleUnblockClient = async (phoneNumber: string) => {
    try {
      await apiRequest('POST', '/api/anti-spam/unblock', { phoneNumber });
      loadBlockedClients();
      Alert.alert('Success', 'Client unblocked successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to unblock client');
    }
  };

  const copyBookingLink = () => {
    if (user?.phone) {
      const bookingUrl = `https://your-domain.com/book/${user.phone.replace(/\D/g, '')}-${user.businessName?.toLowerCase().replace(/\s+/g, '') || 'clipcutman'}`;
      Clipboard.setString(bookingUrl);
      Alert.alert('Copied', 'Booking link copied to clipboard');
    }
  };

  const loadPaymentSettings = async () => {
    try {
      const data = await apiRequest<any>('GET', '/api/stripe/status');
      setStripeStatus(data);
    } catch (error) {
      console.error('Failed to load payment settings:', error);
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      const data = await apiRequest<any>('GET', '/api/stripe/subscription-status');
      setSubscriptionStatus(data);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  const handleConnectStripe = async () => {
    setIsConnectingStripe(true);
    try {
      const data = await apiRequest<any>('POST', '/api/stripe/connect');
      if (data.accountLinkUrl) {
        Linking.openURL(data.accountLinkUrl);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect Stripe account');
    } finally {
      setIsConnectingStripe(false);
    }
  };

  const handleStripeCheckout = async (interval: 'monthly' | 'yearly') => {
    try {
      const data = await apiRequest<any>('POST', '/api/stripe/create-checkout', { interval });
      if (data.url) {
        Linking.openURL(data.url);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create checkout session');
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? Your premium access will continue until the end of your billing period.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('POST', '/api/stripe/cancel-subscription');
              loadSubscriptionStatus();
              Alert.alert('Success', 'Subscription cancelled successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel subscription');
            }
          }
        }
      ]
    );
  };

  const handleRequestRefund = async () => {
    Alert.alert(
      'Request Refund',
      'Are you sure you want to request a full refund? You will be immediately downgraded to the Basic plan.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Refund',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('POST', '/api/stripe/request-refund');
              loadSubscriptionStatus();
              Alert.alert('Success', 'Refund processed successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to process refund');
            }
          }
        }
      ]
    );
  };

  const renderTabButton = (tab: 'profile' | 'notifications' | 'blocked' | 'payment' | 'subscription' | 'help', title: string, icon: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTab]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons name={icon as any} size={16} color={activeTab === tab ? '#1F2937' : '#6B7280'} />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  );

  const renderProfileTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Profile Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Profile & Business Info</Text>
          <TouchableOpacity onPress={() => setIsEditingProfile(true)}>
            <Ionicons name="create-outline" size={20} color="#F59E0B" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.profileImageContainer}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Ionicons name="person-outline" size={32} color="#6B7280" />
              </View>
            )}
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{user?.businessName || 'Business Name'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'No email set'}</Text>
            <Text style={styles.profilePhone}>{user?.phone || 'No phone set'}</Text>
          </View>
        </View>
      </View>

      {/* Booking Link Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Public Booking Link</Text>
        {user?.phone ? (
          <View style={styles.bookingLinkContainer}>
            <Text style={styles.bookingLinkText}>
              Share this link with clients to let them book appointments
            </Text>
            <View style={styles.bookingLinkBox}>
              <Text style={styles.bookingLink} numberOfLines={2}>
                {`https://your-domain.com/book/${user.phone.replace(/\D/g, '')}-${user.businessName?.toLowerCase().replace(/\s+/g, '') || 'clipcutman'}`}
              </Text>
              <TouchableOpacity onPress={copyBookingLink} style={styles.copyButton}>
                <Ionicons name="copy-outline" size={20} color="#F59E0B" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.noLinkText}>Add your phone number to generate your booking link</Text>
        )}
      </View>

      {/* Security Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Security</Text>
        <TouchableOpacity
          style={styles.securityItem}
          onPress={() => setIsChangingPassword(true)}
        >
          <View>
            <Text style={styles.securityItemTitle}>Password</Text>
            <Text style={styles.securityItemSubtitle}>
              Last updated: {new Date().toLocaleDateString()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderNotificationsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Push Notifications</Text>
        <View style={styles.notificationItem}>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>Push Notifications</Text>
            <Text style={styles.notificationSubtitle}>Receive notifications from this device</Text>
          </View>
          <Switch
            value={pushNotificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: '#374151', true: '#F59E0B' }}
            thumbColor={pushNotificationsEnabled ? '#FFF' : '#9CA3AF'}
          />
        </View>

        {Object.entries(notificationSettings).map(([key, value]) => (
          <View key={key} style={styles.notificationItem}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </Text>
              <Text style={styles.notificationSubtitle}>
                {key === 'newBookingRequests' && 'When clients request appointments'}
                {key === 'appointmentConfirmations' && 'When clients confirm appointments'}
                {key === 'appointmentCancellations' && 'When clients cancel appointments'}
                {key === 'upcomingReminders' && 'Reminders for upcoming appointments'}
                {key === 'soundEffects' && 'Sound effects for notifications'}
              </Text>
            </View>
            <Switch
              value={value}
              onValueChange={(newValue) => handleNotificationTypeToggle(key as keyof NotificationSettings, newValue)}
              trackColor={{ false: '#374151', true: '#F59E0B' }}
              thumbColor={value ? '#FFF' : '#9CA3AF'}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderBlockedTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Blocked Clients</Text>
        {blockedClients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={64} color="#10B981" />
            <Text style={styles.emptyStateTitle}>No Blocked Clients</Text>
            <Text style={styles.emptyStateText}>
              You haven't blocked any clients yet. When you block a client, they will appear here.
            </Text>
          </View>
        ) : (
          blockedClients.map((client) => (
            <View key={client.id} style={styles.blockedClientItem}>
              <View style={styles.blockedClientInfo}>
                <View style={styles.blockedClientIcon}>
                  <Ionicons name="shield-outline" size={24} color="#EF4444" />
                </View>
                <View style={styles.blockedClientDetails}>
                  <Text style={styles.blockedClientPhone}>{client.phoneNumber}</Text>
                  <Text style={styles.blockedClientDate}>
                    Blocked {new Date(client.blockedAt).toLocaleDateString()}
                  </Text>
                  {client.reason && (
                    <Text style={styles.blockedClientReason}>Reason: {client.reason}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => handleUnblockClient(client.phoneNumber)}
              >
                <Text style={styles.unblockButtonText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderPaymentTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Settings</Text>
        {stripeStatus?.connected ? (
          <View style={styles.paymentConnected}>
            <View style={styles.paymentStatus}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View style={styles.paymentStatusText}>
                <Text style={styles.paymentStatusTitle}>Stripe Connected</Text>
                <Text style={styles.paymentStatusSubtitle}>Ready to receive payments</Text>
              </View>
            </View>
            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={[styles.paymentButton, styles.paymentButtonOutline]}
                onPress={() => stripeStatus?.dashboardUrl && Linking.openURL(stripeStatus.dashboardUrl)}
              >
                <Ionicons name="stats-chart-outline" size={16} color="#F59E0B" />
                <Text style={styles.paymentButtonOutlineText}>View Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentButton, styles.paymentButtonOutline]}
                onPress={handleConnectStripe}
                disabled={isConnectingStripe}
              >
                <Text style={styles.paymentButtonOutlineText}>
                  {isConnectingStripe ? 'Connecting...' : 'Update Settings'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.paymentDisconnected}>
            <View style={styles.paymentStatus}>
              <Ionicons name="warning-outline" size={24} color="#F59E0B" />
              <View style={styles.paymentStatusText}>
                <Text style={styles.paymentStatusTitle}>Payment Setup Required</Text>
                <Text style={styles.paymentStatusSubtitle}>Connect Stripe to receive payments</Text>
              </View>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentInfoText}>
                Connect your Stripe account to start accepting credit card payments from clients.
              </Text>
              <View style={styles.paymentFeatures}>
                <Text style={styles.paymentFeature}>• Secure credit card processing</Text>
                <Text style={styles.paymentFeature}>• Automatic payment tracking</Text>
                <Text style={styles.paymentFeature}>• Direct deposits to your bank</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.paymentButton}
              onPress={handleConnectStripe}
              disabled={isConnectingStripe}
            >
              <Text style={styles.paymentButtonText}>
                {isConnectingStripe ? 'Connecting...' : 'Connect Stripe Account'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderSubscriptionTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription Plan</Text>
        <View style={styles.currentPlan}>
          <View style={styles.planHeader}>
            <View style={styles.planIcon}>
              <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planTitle}>Basic Plan</Text>
              <Text style={styles.planSubtitle}>Currently Active</Text>
            </View>
            <View style={styles.planPrice}>
              <Text style={styles.planPriceText}>Free</Text>
              <Text style={styles.planPriceSubtext}>Forever</Text>
            </View>
          </View>
        </View>
        
        {subscriptionStatus?.status === 'basic' && (
          <View style={styles.upgradeSection}>
            <View style={styles.upgradeHeader}>
              <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
            </View>
            <View style={styles.pricingOptions}>
              <View style={styles.pricingOption}>
                <View style={styles.pricingInfo}>
                  <Text style={styles.pricingPrice}>$19.99</Text>
                  <Text style={styles.pricingInterval}>/month</Text>
                </View>
                <TouchableOpacity
                  style={styles.pricingButton}
                  onPress={() => handleStripeCheckout('monthly')}
                >
                  <Text style={styles.pricingButtonText}>Choose Monthly</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.pricingOption, styles.pricingOptionPopular]}>
                <View style={styles.pricingInfo}>
                  <Text style={styles.pricingPrice}>$199.99</Text>
                  <Text style={styles.pricingInterval}>/year - Save 16%</Text>
                </View>
                <TouchableOpacity
                  style={[styles.pricingButton, styles.pricingButtonPopular]}
                  onPress={() => handleStripeCheckout('yearly')}
                >
                  <Text style={styles.pricingButtonPopularText}>Choose Yearly</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.premiumFeatures}>
              <View style={styles.premiumFeature}>
                <Text style={styles.premiumFeatureValue}>∞</Text>
                <Text style={styles.premiumFeatureLabel}>Appointments</Text>
              </View>
              <View style={styles.premiumFeature}>
                <Text style={styles.premiumFeatureValue}>1GB</Text>
                <Text style={styles.premiumFeatureLabel}>Photo Storage</Text>
              </View>
            </View>
          </View>
        )}
        
        {subscriptionStatus?.status === 'premium' && (
          <View style={styles.premiumActive}>
            <View style={styles.premiumStatus}>
              <Text style={styles.premiumStatusTitle}>Premium Plan Active</Text>
              <Text style={styles.premiumStatusSubtitle}>
                Next billing: {subscriptionStatus.endDate ? new Date(subscriptionStatus.endDate).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            <View style={styles.premiumActions}>
              <TouchableOpacity
                style={[styles.premiumButton, styles.premiumButtonOutline]}
                onPress={handleCancelSubscription}
              >
                <Text style={styles.premiumButtonOutlineText}>Cancel Subscription</Text>
              </TouchableOpacity>
              {subscriptionStatus.isEligibleForRefund && (
                <TouchableOpacity
                  style={[styles.premiumButton, styles.premiumButtonRefund]}
                  onPress={handleRequestRefund}
                >
                  <Text style={styles.premiumButtonRefundText}>Request Refund</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderHelpTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Help & Support</Text>
        <View style={styles.helpHeader}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpSubtitle}>
            Get quick answers to common questions or contact our support team.
          </Text>
          <View style={styles.helpActions}>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => Linking.openURL('mailto:support@clippr.com')}
            >
              <Ionicons name="mail-outline" size={16} color="#1F2937" />
              <Text style={styles.helpButtonText}>Contact Support</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.helpButton, styles.helpButtonOutline]}
              onPress={() => Linking.openURL('https://docs.clippr.com')}
            >
              <Ionicons name="book-outline" size={16} color="#6B7280" />
              <Text style={styles.helpButtonOutlineText}>Documentation</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Common Questions</Text>
          
          <View style={styles.faqItem}>
            <TouchableOpacity
              style={styles.faqQuestion}
              onPress={() => setExpandedFAQ(expandedFAQ === 'billing' ? null : 'billing')}
            >
              <Text style={styles.faqQuestionText}>Billing & Subscriptions</Text>
              <Ionicons
                name={expandedFAQ === 'billing' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
            {expandedFAQ === 'billing' && (
              <View style={styles.faqAnswer}>
                <Text style={styles.faqAnswerText}>
                  Premium plans include unlimited appointments, 1GB photo storage, and priority support.
                  You can cancel anytime and get a full refund within 30 days.
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.faqItem}>
            <TouchableOpacity
              style={styles.faqQuestion}
              onPress={() => setExpandedFAQ(expandedFAQ === 'appointments' ? null : 'appointments')}
            >
              <Text style={styles.faqQuestionText}>Managing Appointments</Text>
              <Ionicons
                name={expandedFAQ === 'appointments' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
            {expandedFAQ === 'appointments' && (
              <View style={styles.faqAnswer}>
                <Text style={styles.faqAnswerText}>
                  Use the Calendar tab to view and manage appointments. You can create new appointments,
                  modify existing ones, and track client information all in one place.
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.faqItem}>
            <TouchableOpacity
              style={styles.faqQuestion}
              onPress={() => setExpandedFAQ(expandedFAQ === 'clients' ? null : 'clients')}
            >
              <Text style={styles.faqQuestionText}>Client Management</Text>
              <Ionicons
                name={expandedFAQ === 'clients' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
            {expandedFAQ === 'clients' && (
              <View style={styles.faqAnswer}>
                <Text style={styles.faqAnswerText}>
                  The Clients tab lets you store contact information, service history, and preferences
                  for each client. You can also block clients from booking if needed.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <ActivityIndicator size="large" color="#F59E0B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="settings-outline" size={24} color="#F59E0B" />
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('profile', 'Profile', 'person-outline')}
        {renderTabButton('notifications', 'Notifications', 'notifications-outline')}
        {renderTabButton('blocked', 'Blocked', 'shield-outline')}
        {renderTabButton('payment', 'Payment', 'card-outline')}
        {renderTabButton('subscription', 'Subscription', 'diamond-outline')}
        {renderTabButton('help', 'Help', 'help-circle-outline')}
      </View>

      {/* Tab Content */}
      {activeTab === 'profile' && renderProfileTab()}
      {activeTab === 'notifications' && renderNotificationsTab()}
      {activeTab === 'blocked' && renderBlockedTab()}
      {activeTab === 'payment' && renderPaymentTab()}
      {activeTab === 'subscription' && renderSubscriptionTab()}
      {activeTab === 'help' && renderHelpTab()}

      {/* Profile Edit Modal */}
      <Modal visible={isEditingProfile} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditingProfile(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleProfileSave}>
              <Text style={styles.modalSaveButton}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {/* Photo Upload */}
            <View style={styles.photoSection}>
              <Text style={styles.fieldLabel}>Profile Photo</Text>
              <View style={styles.photoContainer}>
                {profileForm.photoUrl ? (
                  <Image source={{ uri: profileForm.photoUrl }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="person-outline" size={32} color="#6B7280" />
                  </View>
                )}
                <View style={styles.photoButtons}>
                  <TouchableOpacity style={styles.photoButton} onPress={handlePhotoUpload}>
                    <Ionicons name="image-outline" size={20} color="#F59E0B" />
                    <Text style={styles.photoButtonText}>Upload</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoButton} onPress={handleCameraCapture}>
                    <Ionicons name="camera-outline" size={20} color="#F59E0B" />
                    <Text style={styles.photoButtonText}>Camera</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Form Fields */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Business Name</Text>
              <TextInput
                style={styles.textInput}
                value={profileForm.businessName}
                onChangeText={(text) => setProfileForm({ ...profileForm, businessName: text })}
                placeholder="e.g., ClipCutMan Barber Shop"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={profileForm.email}
                onChangeText={(text) => setProfileForm({ ...profileForm, email: text })}
                placeholder="your.email@example.com"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={profileForm.phone}
                onChangeText={(text) => setProfileForm({ ...profileForm, phone: text })}
                placeholder="(555) 123-4567"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Service Area</Text>
              <TextInput
                style={styles.textInput}
                value={profileForm.serviceArea}
                onChangeText={(text) => setProfileForm({ ...profileForm, serviceArea: text })}
                placeholder="e.g., Downtown Manhattan, Brooklyn"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>About You</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={profileForm.about}
                onChangeText={(text) => setProfileForm({ ...profileForm, about: text })}
                placeholder="Tell clients about your experience, specialties, and what makes you unique..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Password Change Modal */}
      <Modal visible={isChangingPassword} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsChangingPassword(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={handlePasswordChange}>
              <Text style={styles.modalSaveButton}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Current Password</Text>
              <TextInput
                style={styles.textInput}
                value={passwordForm.currentPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
                placeholder="Enter current password"
                placeholderTextColor="#6B7280"
                secureTextEntry
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>New Password</Text>
              <TextInput
                style={styles.textInput}
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                placeholder="Enter new password"
                placeholderTextColor="#6B7280"
                secureTextEntry
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.textInput}
                value={passwordForm.confirmPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                placeholder="Confirm new password"
                placeholderTextColor="#6B7280"
                secureTextEntry
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
    gap: 6,
    flex: 1,
    minWidth: '30%',
    maxWidth: '32%',
  },
  activeTab: {
    backgroundColor: '#F59E0B',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#1F2937',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  bookingLinkContainer: {
    gap: 12,
  },
  bookingLinkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  bookingLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  bookingLink: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    padding: 4,
  },
  noLinkText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    padding: 16,
  },
  securityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  securityItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  securityItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  notificationSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  blockedClientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  blockedClientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  blockedClientIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedClientDetails: {
    flex: 1,
  },
  blockedClientPhone: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  blockedClientDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  blockedClientReason: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSaveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  photoSection: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  photoContainer: {
    alignItems: 'center',
    gap: 16,
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  // Payment styles
  paymentConnected: {
    gap: 16,
  },
  paymentDisconnected: {
    gap: 16,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  paymentStatusText: {
    flex: 1,
  },
  paymentStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentStatusSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentInfo: {
    gap: 8,
  },
  paymentInfoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentFeatures: {
    gap: 4,
  },
  paymentFeature: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentButton: {
    flex: 1,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentButtonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Subscription styles
  currentPlan: {
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  planIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  planPrice: {
    alignItems: 'flex-end',
  },
  planPriceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planPriceSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  upgradeSection: {
    gap: 16,
  },
  upgradeHeader: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pricingOptions: {
    gap: 12,
  },
  pricingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  pricingOptionPopular: {
    borderWidth: 1,
    borderColor: '#10B981',
  },
  pricingInfo: {
    flex: 1,
  },
  pricingPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
  },
  pricingInterval: {
    fontSize: 14,
    color: '#6B7280',
  },
  pricingButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pricingButtonPopular: {
    backgroundColor: '#10B981',
  },
  pricingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  pricingButtonPopularText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  premiumFeatures: {
    flexDirection: 'row',
    gap: 12,
  },
  premiumFeature: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  premiumFeatureValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F59E0B',
  },
  premiumFeatureLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  premiumActive: {
    gap: 16,
  },
  premiumStatus: {
    backgroundColor: '#065F46',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  premiumStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  premiumStatusSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  premiumActions: {
    flexDirection: 'row',
    gap: 8,
  },
  premiumButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
  },
  premiumButtonRefund: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  premiumButtonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  premiumButtonRefundText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  // Help styles
  helpHeader: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  helpSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  helpActions: {
    gap: 8,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  helpButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  helpButtonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  faqSection: {
    gap: 8,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  faqItem: {
    backgroundColor: '#374151',
    borderRadius: 8,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  faqAnswer: {
    padding: 12,
    paddingTop: 0,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});