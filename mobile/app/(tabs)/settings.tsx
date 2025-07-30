/**
 * NOTE: Requires @react-native-picker/picker
 * Install with: npm install @react-native-picker/picker
 */
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
  Linking,
  FlatList,
  Share // <-- Add Share API
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';
import { User } from '../../lib/types';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { colors, theme } from '../../lib/theme';

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
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);

  // Phone verification modal state
  const [phoneVerifyStep, setPhoneVerifyStep] = useState<'idle' | 'codeSent' | 'verifying'>('idle');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  // --- Contact Support Modal State ---
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSending, setSupportSending] = useState(false);

  // Timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Reset modal state when closed
  useEffect(() => {
    if (!showPhoneVerifyModal) {
      setPhoneVerifyStep('idle');
      setVerificationCode('');
      setVerifyLoading(false);
      setSendLoading(false);
      setVerifyError(null);
      setSendError(null);
      setCountdown(0);
      setResendLoading(false);
    }
  }, [showPhoneVerifyModal]);

  // Send verification code
  const handleSendVerificationCode = async () => {
    setSendLoading(true);
    setSendError(null);
    try {
      await apiRequest('POST', '/api/auth/send-verification-code', {});
      setPhoneVerifyStep('codeSent');
      setCountdown(60);
    } catch (e: any) {
      setSendError(e?.message || 'Failed to send verification code');
    } finally {
      setSendLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    setResendLoading(true);
    setSendError(null);
    try {
      await apiRequest('POST', '/api/auth/send-verification-code', {});
      setCountdown(60);
    } catch (e: any) {
      setSendError(e?.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  // Verify code
  const handleVerifyCode = async () => {
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      await apiRequest('POST', '/api/auth/verify-phone', { code: verificationCode });
      setShowPhoneVerifyModal(false);
      setPhoneVerifyStep('idle');
      setVerificationCode('');
      setCountdown(0);
      // Refresh user profile to update verified status
      await loadUserProfile();
      Alert.alert('Success', 'Your phone number has been verified!');
    } catch (e: any) {
      setVerifyError(e?.message || 'Invalid or expired verification code');
    } finally {
      setVerifyLoading(false);
    }
  };
  const queryClient = useQueryClient();
  
  // Use React Query for blocked clients
  const {
    data: blockedClients = [],
    refetch: refetchBlockedClients,
    isLoading: blockedClientsLoading,
  } = useQuery<BlockedClient[]>({
    queryKey: ['/api/anti-spam/blocked-clients'],
    queryFn: () => apiRequest<BlockedClient[]>('GET', '/api/anti-spam/blocked-clients'),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
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
    // Smart Scheduling fields
    homeBaseAddress: '',
    timezone: 'America/New_York',
    defaultGraceTime: 5,
    transportationMode: 'driving',
  });

  // Validation state for Smart Scheduling fields
  const [smartErrors, setSmartErrors] = useState({
    homeBaseAddress: '',
    timezone: '',
    defaultGraceTime: '',
    transportationMode: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [bookingLink, setBookingLink] = useState<string | null>(null);
  const [bookingLinkLoading, setBookingLinkLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  // --- Profile Photo State for Error/Preview Logic ---
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Supported types and max size (10MB)
  const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const { isAuthenticated, signOut } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadUserProfile();
      // No need to call loadBlockedClients, handled by React Query
      loadNotificationSettings();
      loadPaymentSettings();
      loadSubscriptionStatus();
    }
  }, [isAuthenticated]);
  
  // Refetch blocked clients when settings screen is focused
  useFocusEffect(
    React.useCallback(() => {
      refetchBlockedClients();
    }, [refetchBlockedClients])
  );

  const loadUserProfile = async () => {
    try {
      const data = await apiRequest<User>('GET', '/api/user/profile');
      // Fix: Map snake_case to camelCase for phoneVerified
      if (data && typeof (data as any).phone_verified !== "undefined" && typeof data.phoneVerified === "undefined") {
        (data as any).phoneVerified = (data as any).phone_verified;
      }
      setUser(data);
      setProfileForm({
        businessName: data.businessName || '',
        email: data.email || '',
        phone: data.phone || '',
        serviceArea: data.serviceArea || '',
        about: data.about || '',
        photoUrl: data.photoUrl || '',
        homeBaseAddress: data.homeBaseAddress || '',
        timezone: data.timezone || 'America/New_York',
        defaultGraceTime: typeof data.defaultGraceTime === 'number' && !isNaN(data.defaultGraceTime)
          ? data.defaultGraceTime
          : 5,
        transportationMode: data.transportationMode || 'driving',
      });
      
      // Load booking link if user has phone number
      if (data?.phone) {
        loadBookingLink();
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  /* Removed loadBlockedClients, now handled by React Query */

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

  // Smart Scheduling validation logic
  const validateSmartScheduling = () => {
    let valid = true;
    const errors: typeof smartErrors = {
      homeBaseAddress: '',
      timezone: '',
      defaultGraceTime: '',
      transportationMode: '',
    };

    // Home Base Address: required, min 10 chars
    if (!profileForm.homeBaseAddress || profileForm.homeBaseAddress.trim().length < 10) {
      errors.homeBaseAddress = 'Please enter your full address (min 10 characters)';
      valid = false;
    }
    // Timezone: required, must be one of allowed
    const allowedTimezones = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu',
    ];
    if (!profileForm.timezone || !allowedTimezones.includes(profileForm.timezone)) {
      errors.timezone = 'Please select a valid timezone';
      valid = false;
    }
    // Grace Time Buffer: required, 0-60
    const grace = Number(profileForm.defaultGraceTime);
    if (isNaN(grace) || grace < 0 || grace > 60) {
      errors.defaultGraceTime = 'Grace time must be between 0 and 60';
      valid = false;
    }
    // Transportation Mode: required, must be one of allowed
    const allowedModes = ['driving', 'walking', 'cycling', 'transit'];
    if (!profileForm.transportationMode || !allowedModes.includes(profileForm.transportationMode)) {
      errors.transportationMode = 'Please select a transportation mode';
      valid = false;
    }
    setSmartErrors(errors);
    return valid;
  };

  const handleProfileSave = async () => {
    if (!validateSmartScheduling()) {
      Alert.alert('Validation Error', 'Please correct the Smart Scheduling fields.');
      return;
    }
    try {
      await apiRequest('PATCH', '/api/user/profile', profileForm);
      setIsEditingProfile(false);
      await loadUserProfile();
      // Reload booking link if phone number changed
      if (profileForm.phone) {
        loadBookingLink();
      }
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

  // --- Unified image validation and base64 conversion ---
  const validateAndConvertImage = async (asset: any): Promise<string | null> => {
    setPhotoError(null);
    try {
      // Get file info
      const { uri, fileSize, type } = asset;
      // On iOS, type may be undefined, so infer from uri
      let mimeType = type;
      if (!mimeType && uri) {
        if (uri.endsWith('.jpg') || uri.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (uri.endsWith('.png')) mimeType = 'image/png';
        else if (uri.endsWith('.webp')) mimeType = 'image/webp';
        else if (uri.endsWith('.heic') || uri.endsWith('.heif')) mimeType = 'image/heic';
      }
      if (!mimeType || !SUPPORTED_TYPES.includes(mimeType.toLowerCase())) {
        setPhotoError('Unsupported file format. Please select a JPEG, PNG, or WEBP image.');
        return null;
      }
      // File size: try asset.fileSize, else fetch blob and check size
      let size = fileSize;
      if (!size && uri) {
        const response = await fetch(uri);
        const blob = await response.blob();
        size = blob.size;
      }
      if (size && size > MAX_FILE_SIZE) {
        setPhotoError('File is too large. Please select an image under 10MB.');
        return null;
      }
      // Convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      setPhotoError('Failed to process image. Please try again.');
      return null;
    }
  };

  const handlePhotoUpload = async () => {
    setPhotoError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const base64 = await validateAndConvertImage(asset);
      if (base64) {
        setProfileForm({ ...profileForm, photoUrl: base64 });
      }
    }
  };

  const handleCameraCapture = async () => {
    setPhotoError(null);
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const base64 = await validateAndConvertImage(asset);
      if (base64) {
        setProfileForm({ ...profileForm, photoUrl: base64 });
      }
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
      // Invalidate and refetch blocked clients list
      queryClient.invalidateQueries({ queryKey: ['/api/anti-spam/blocked-clients'] });
      Alert.alert('Success', 'Client unblocked successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to unblock client');
    }
  };

  // Load booking link from server
  const loadBookingLink = async () => {
    if (!user?.phone) return;
    
    setBookingLinkLoading(true);
    try {
      const response = await apiRequest<{ url: string; phone: string; businessName: string; shortUrl: string }>('GET', '/api/booking-link');
      setBookingLink(response.url);
    } catch (error: any) {
      console.error('Failed to load booking link:', error);
      // Fallback to placeholder if API fails
      const cleanPhone = user.phone.replace(/\D/g, '');
      const businessSlug = user.businessName?.toLowerCase().replace(/\s+/g, '') || 'clipcutman';
      setBookingLink(`https://your-domain.com/book/${cleanPhone}-${businessSlug}`);
    } finally {
      setBookingLinkLoading(false);
    }
  };

  const copyBookingLink = () => {
    const linkToCopy = bookingLink || (user?.phone ? 
      `https://your-domain.com/book/${user.phone.replace(/\D/g, '')}-${user.businessName?.toLowerCase().replace(/\s+/g, '') || 'clipcutman'}` 
      : '');
    
    if (linkToCopy) {
      Clipboard.setString(linkToCopy);
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

  // Share booking link using native share dialog
  const shareBookingLink = async () => {
    const linkToShare = bookingLink || (user?.phone ?
      `https://your-domain.com/book/${user.phone.replace(/\D/g, '')}-${user.businessName?.toLowerCase().replace(/\s+/g, '') || 'clipcutman'}`
      : '');
    if (!linkToShare) return;
    try {
      await Share.share({
        message: linkToShare,
        url: linkToShare,
        title: 'Book an appointment with me'
      });
      // Optionally, show feedback (not strictly needed, as share dialog is feedback)
      // Alert.alert('Shared', 'Booking link shared successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share booking link');
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
      // Support both url and accountLinkUrl for compatibility
      const onboardingUrl = data.url || data.accountLinkUrl;
      if (onboardingUrl) {
        Linking.openURL(onboardingUrl);
      } else {
        Alert.alert('Error', 'No onboarding URL received from server.');
      }
    } catch (error: any) {
      // Try to parse error message as JSON for setupRequired and message
      let errorData: any = {};
      try {
        errorData = JSON.parse(
          (error.message || '').replace(/^400: /, '').replace(/^500: /, '')
        );
      } catch {
        // Not JSON, fallback to string
      }
      if (errorData.setupRequired) {
        Alert.alert(
          'Stripe Connect Setup Required',
          'Please enable Stripe Connect in your Stripe dashboard first.\n\n1. Go to your Stripe Dashboard\n2. Navigate to Connect → Overview\n3. Complete the Connect setup process\n4. Return here to connect your account',
          [{ text: 'Open Stripe Connect Setup', onPress: () => Linking.openURL('https://dashboard.stripe.com/connect/overview') }, { text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Connection Failed',
          errorData.message || error.message || 'Failed to connect Stripe account'
        );
      }
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
    <ScrollView style={theme.tabContent}>
      {/* Profile Section */}
      <View style={theme.card}>
        <View style={theme.cardHeader}>
          <Text style={theme.cardTitle}>Profile & Business Info</Text>
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
            {user?.phone ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                {user.phoneVerified ? (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#10B981', fontSize: 13 }}>Verified</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#EF4444', fontSize: 13, marginRight: 8 }}>Not Verified</Text>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#F59E0B',
                        borderRadius: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        marginLeft: 4,
                      }}
                      onPress={() => setShowPhoneVerifyModal(true)}
                    >
                      <Text style={{ color: '#1F2937', fontWeight: '600', fontSize: 13 }}>Verify Phone</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Booking Link Section */}
      <View style={theme.card}>
        <Text style={theme.cardTitle}>Public Booking Link</Text>
        {user?.phone ? (
          <View style={styles.bookingLinkContainer}>
            <Text style={styles.bookingLinkText}>
              Share this link with clients to let them book appointments
            </Text>
            <View style={styles.bookingLinkBox}>
              {bookingLinkLoading ? (
                <ActivityIndicator size="small" color="#F59E0B" />
              ) : (
                <>
                  <Text style={styles.bookingLink} numberOfLines={2}>
                    {bookingLink || `https://your-domain.com/book/${user.phone.replace(/\D/g, '')}-${user.businessName?.toLowerCase().replace(/\s+/g, '') || 'clipcutman'}`}
                  </Text>
                  <TouchableOpacity onPress={copyBookingLink} style={styles.copyButton} accessibilityLabel="Copy booking link">
                    <Ionicons name="copy-outline" size={20} color="#F59E0B" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={shareBookingLink} style={styles.copyButton} accessibilityLabel="Share booking link">
                    <Ionicons name="share-social-outline" size={20} color="#F59E0B" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.noLinkText}>Add your phone number to generate your booking link</Text>
        )}
      </View>

      {/* Quick Action Messages Section */}
      <View style={theme.card}>
        <View style={theme.cardHeader}>
          <Text style={theme.cardTitle}>Quick Action Messages</Text>
        </View>
        <View style={{ gap: 12 }}>
          <View>
            <Text style={styles.quickActionLabel}>Default Messages</Text>
            <Text style={styles.quickActionSubLabel}>Pre-built messages for common situations</Text>
          </View>
          <View style={{ gap: 8 }}>
            {/* On My Way Card */}
            <View style={styles.quickActionMessageCard}>
              <View style={styles.quickActionMessageHeader}>
                <Text style={styles.quickActionMessageTitle}>On My Way</Text>
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>Default</Text>
                </View>
              </View>
              <Text style={styles.quickActionMessageText}>
                Hi [Client Name], I'm on my way to your appointment at [Time]. See you soon!
              </Text>
            </View>
            {/* Running Late Card */}
            <View style={styles.quickActionMessageCard}>
              <View style={styles.quickActionMessageHeader}>
                <Text style={styles.quickActionMessageTitle}>Running Late</Text>
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>Default</Text>
                </View>
              </View>
              <Text style={styles.quickActionMessageText}>
                Hi [Client Name], I'm running about [Minutes] minutes late for your [Time] appointment. Sorry for the delay!
              </Text>
            </View>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.highlightOnCard, paddingTop: 16 }}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => Alert.alert('Feature Coming Soon', 'Custom quick action messages will be available in a future update.')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={styles.quickActionButtonText}>Create Custom Message</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickActionInfoBox}>
            <Text style={styles.quickActionInfoTitle}>How Quick Actions Work</Text>
            <Text style={styles.quickActionInfoText}>
              Quick actions appear on your dashboard when you have appointments coming up within the next hour. Tap a message to instantly send it to your client via SMS or email.
            </Text>
          </View>
        </View>
      </View>

      {/* Security Section */}
      <View style={theme.card}>
        <Text style={theme.cardTitle}>Security</Text>
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
      <View style={theme.card}>
        <Text style={theme.cardTitle}>Push Notifications</Text>
        <View style={styles.notificationItem}>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>Push Notifications</Text>
            <Text style={styles.notificationSubtitle}>Receive notifications from this device</Text>
          </View>
          <Switch
            value={pushNotificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: colors.highlightOnCard, true: '#F59E0B' }}
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
              trackColor={{ false: colors.highlightOnCard, true: '#F59E0B' }}
              thumbColor={value ? '#FFF' : '#9CA3AF'}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderBlockedTab = () => (
    <View style={styles.tabContent}>
      {blockedClientsLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : (
        <FlatList
          data={blockedClients}
          keyExtractor={(client: BlockedClient) => client.id.toString()}
          ListHeaderComponent={
            <View style={theme.card}>
              <Text style={theme.cardTitle}>Blocked Clients</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={[theme.card, styles.emptyState]}>
              <Ionicons name="shield-checkmark-outline" size={64} color="#10B981" />
              <Text style={styles.emptyStateTitle}>No Blocked Clients</Text>
              <Text style={styles.emptyStateText}>
                You haven't blocked any clients yet. When you block a client, they will appear here.
              </Text>
            </View>
          }
          renderItem={({ item: client }: { item: BlockedClient }) => (
            <View style={theme.card}>
              <View style={styles.blockedClientItem}>
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
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </View>
  );

  const renderPaymentTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={theme.card}>
        <Text style={theme.cardTitle}>Payment Settings</Text>
        {stripeStatus?.connected ? (
          <View style={styles.paymentConnected}>
            <View style={styles.paymentStatus}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View style={styles.paymentStatusText}>
                <Text style={styles.paymentStatusTitle}>Stripe Connected</Text>
                <Text style={styles.paymentStatusSubtitle}>Ready to receive payments</Text>
              </View>
            </View>
            {/* Stripe account details */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#6B7280', fontSize: 13 }}>Account Status</Text>
                <Text style={{ color: '#fff', fontSize: 15, textTransform: 'capitalize' }}>
                  {stripeStatus?.status || 'Active'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#6B7280', fontSize: 13 }}>Country</Text>
                <Text style={{ color: '#fff', fontSize: 15 }}>
                  {stripeStatus?.country || 'US'}
                </Text>
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
            {/* Onboarding instructions */}
            <View style={[styles.paymentInfo, { backgroundColor: '#78350F20', borderRadius: 8, padding: 10, marginTop: 8 }]}>
              <Text style={[styles.paymentInfoText, { color: '#F59E0B', fontWeight: '600', marginBottom: 4 }]}>
                Setup Required:
              </Text>
              <Text style={[styles.paymentInfoText, { color: '#FBBF24', fontSize: 13 }]}>
                Before connecting, you need to enable Stripe Connect in your Stripe dashboard:
              </Text>
              <Text style={[styles.paymentInfoText, { color: '#FBBF24', fontSize: 13, marginTop: 4 }]}>
                1. Go to your Stripe Dashboard{'\n'}
                2. Navigate to Connect → Overview{'\n'}
                3. Complete the Connect setup process{'\n'}
                4. Return here to connect your account
              </Text>
              <TouchableOpacity
                style={[styles.paymentButton, styles.paymentButtonOutline, { marginTop: 8, borderColor: '#F59E0B' }]}
                onPress={() => Linking.openURL('https://dashboard.stripe.com/connect/overview')}
              >
                <Text style={[styles.paymentButtonOutlineText, { color: '#F59E0B' }]}>
                  Open Stripe Connect Setup →
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentInfoText}>
                Connect your Stripe account to start accepting credit card payments from clients. Stripe handles all payment processing securely.
              </Text>
              <View style={styles.paymentFeatures}>
                <Text style={styles.paymentFeature}>• Secure credit card processing</Text>
                <Text style={styles.paymentFeature}>• Automatic payment tracking</Text>
                <Text style={styles.paymentFeature}>• Direct deposits to your bank</Text>
                <Text style={styles.paymentFeature}>• Transaction history and reports</Text>
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
      <View style={theme.card}>
        <Text style={theme.cardTitle}>Subscription Plan</Text>
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
            <View style={styles.premiumFeatures}>
              <View style={styles.premiumFeature}>
                <Text style={styles.premiumFeatureValue}>∞</Text>
                <Text style={styles.premiumFeatureLabel}>Services</Text>
              </View>
              <View style={styles.premiumFeature}>
                <Text style={styles.premiumFeatureValue}>∞</Text>
                <Text style={styles.premiumFeatureLabel}>SMS</Text>
              </View>
            </View>
          </View>
          )}
          {/* Premium Features Card */}
          <View style={styles.premiumFeaturesCard}>
            <View style={styles.premiumFeaturesCardHeader}>
              <Ionicons name="checkmark-circle" size={40} color="#10B981" style={styles.premiumFeaturesMainCheck} />
              <Text style={styles.premiumFeaturesCardTitle}>Premium Features</Text>
            </View>
            <View style={styles.premiumFeaturesList}>
              <View style={styles.premiumFeaturesListItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" style={styles.premiumFeaturesListCheck} />
                <Text style={styles.premiumFeaturesListText}>Advanced calendar with custom working hours</Text>
              </View>
              <View style={styles.premiumFeaturesListItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" style={styles.premiumFeaturesListCheck} />
                <Text style={styles.premiumFeaturesListText}>Client analytics and business insights</Text>
              </View>
              <View style={styles.premiumFeaturesListItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" style={styles.premiumFeaturesListCheck} />
                <Text style={styles.premiumFeaturesListText}>Priority customer support</Text>
              </View>
            </View>
            <Text style={styles.premiumFeaturesGuarantee}>
              ✨ 30-day money-back guarantee • Cancel anytime
            </Text>
          </View>
        
        
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
      <View style={theme.card}>
        <Text style={theme.cardTitle}>Help & Support</Text>
        <View style={styles.helpHeader}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpSubtitle}>
            Get quick answers to common questions or contact our support team.
          </Text>
          <View style={styles.helpActions}>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowSupportModal(true)}
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

      {/* Contact Support Modal */}
      <ContactSupportModal
        visible={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        message={supportMessage}
        setMessage={setSupportMessage}
        sending={supportSending}
        setSending={setSupportSending}
      />

      {/* Profile Edit Modal */}
      <Modal
        visible={isEditingProfile}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditingProfile(false)}
      >
        <SafeAreaView style={{
          flex: 1,
          backgroundColor: 'rgba(30,30,30,0.95)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: '50%'
        }}>
          <View style={{
            backgroundColor: '#2e2e2e',
            borderRadius: 18,
            paddingVertical: 28,
            paddingHorizontal: 22,
            width: '92%',
            maxWidth: 420,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#737b89',
            marginVertical: 12,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}>
            <View style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              paddingHorizontal: 2,
            }}>
              <TouchableOpacity onPress={() => setIsEditingProfile(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={{
                color: '#fff',
                fontWeight: '700',
                letterSpacing: 0.1,
                marginBottom: 2,
                fontSize: 22,
              }}>Edit Profile</Text>
              <TouchableOpacity onPress={handleProfileSave} style={{ padding: 4 }}>
                <Ionicons name="checkmark" size={24} color="#F59E0B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center' }}>
              {/* Photo Upload */}
              <View style={styles.photoSection}>
                <Text style={styles.fieldLabel}>Profile Photo</Text>
                <View style={styles.photoContainer}>
                  {profileForm.photoUrl ? (
                    <View>
                      <Image source={{ uri: profileForm.photoUrl }} style={styles.photoPreview} />
                      <TouchableOpacity
                        style={[styles.photoButton, { alignSelf: 'center', marginTop: 8, borderColor: '#EF4444' }]}
                        onPress={() => {
                          setProfileForm({ ...profileForm, photoUrl: '' });
                          setPhotoError(null);
                        }}
                      >
                        <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                        <Text style={[styles.photoButtonText, { color: '#EF4444' }]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
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
                  {photoError ? (
                    <Text style={{ color: '#EF4444', marginTop: 8, textAlign: 'center' }}>{photoError}</Text>
                  ) : null}
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

              {/* --- SMART SCHEDULING SETTINGS SECTION --- */}
              <View style={[styles.fieldGroup, { borderTopWidth: 1, borderTopColor: colors.highlightOnCard, paddingTop: 20, marginTop: 8 }]}>
                <Text style={[styles.fieldLabel, { fontSize: 17, marginBottom: 12 }]}>Smart Scheduling Settings</Text>

                {/* Home Base Address */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.fieldLabel}>Home Base Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={profileForm.homeBaseAddress}
                    onChangeText={(text) => {
                      setProfileForm({ ...profileForm, homeBaseAddress: text });
                      setSmartErrors((e) => ({ ...e, homeBaseAddress: '' }));
                    }}
                    placeholder="Start typing your address..."
                    placeholderTextColor="#6B7280"
                    autoCapitalize="words"
                  />
                  <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
                    Starting point for calculating travel time to your first appointment. Enter your full address including city and state.
                  </Text>
                  {smartErrors.homeBaseAddress ? (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 2 }}>{smartErrors.homeBaseAddress}</Text>
                  ) : null}
                </View>

                {/* Timezone */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.fieldLabel}>Timezone</Text>
                  {/* Picker is lazy-imported to avoid breaking web */}
                  <TimezonePicker
                    value={profileForm.timezone}
                    onChange={(val) => {
                      setProfileForm({ ...profileForm, timezone: val });
                      setSmartErrors((e) => ({ ...e, timezone: '' }));
                    }}
                  />
                  <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
                    Your local timezone for appointment scheduling and display
                  </Text>
                  {smartErrors.timezone ? (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 2 }}>{smartErrors.timezone}</Text>
                  ) : null}
                </View>

                {/* Grace Time Buffer */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.fieldLabel}>Grace Time Buffer (minutes)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={String(profileForm.defaultGraceTime)}
                    onChangeText={(text) => {
                      // Only allow numbers
                      const num = text.replace(/[^0-9]/g, '');
                      setProfileForm({ ...profileForm, defaultGraceTime: num === '' ? 0 : Math.max(0, Math.min(60, parseInt(num))) });
                      setSmartErrors((e) => ({ ...e, defaultGraceTime: '' }));
                    }}
                    placeholder="5"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
                    Extra time added to travel estimates for parking, elevators, etc.
                  </Text>
                  {smartErrors.defaultGraceTime ? (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 2 }}>{smartErrors.defaultGraceTime}</Text>
                  ) : null}
                </View>

                {/* Transportation Mode */}
                <View style={{ marginBottom: 8 }}>
                  <Text style={styles.fieldLabel}>Transportation Mode</Text>
                  <TransportationModePicker
                    value={profileForm.transportationMode}
                    onChange={(val) => {
                      setProfileForm({ ...profileForm, transportationMode: val });
                      setSmartErrors((e) => ({ ...e, transportationMode: '' }));
                    }}
                  />
                  <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
                    Your preferred transportation method for calculating travel times between appointments
                  </Text>
                  {smartErrors.transportationMode ? (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 2 }}>{smartErrors.transportationMode}</Text>
                  ) : null}
                </View>
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
                  onChangeText={(text) => {
                    // Enforce max length
                    if (text.length <= 100) {
                      setProfileForm({ ...profileForm, serviceArea: text });
                    }
                  }}
                  placeholder="Your service area"
                  placeholderTextColor="#6B7280"
                  maxLength={100}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ color: '#6B7280', fontSize: 12 }}>
                    {profileForm.serviceArea.length}/100
                  </Text>
                  {(profileForm.serviceArea.length === 0) ? (
                    <Text style={{ color: '#EF4444', fontSize: 12 }}>
                      Service area is required
                    </Text>
                  ) : null}
                  {(profileForm.serviceArea.length > 100) ? (
                    <Text style={{ color: '#EF4444', fontSize: 12 }}>
                      Max 100 characters
                    </Text>
                  ) : null}
                </View>
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
          </View>
        </SafeAreaView>
      </Modal>

      {/* Phone Verification Modal */}
      <Modal
        visible={showPhoneVerifyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPhoneVerifyModal(false)}
      >
        <SafeAreaView style={{
          flex: 1,
          backgroundColor: 'rgba(30,30,30,0.95)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#2e2e2e',
            borderRadius: 18,
            paddingVertical: 28,
            paddingHorizontal: 22,
            width: '92%',
            maxWidth: 420,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#737b89',
            marginVertical: 12,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}>
            <Text style={{
              color: '#fff',
              fontWeight: '700',
              fontSize: 22,
              marginBottom: 12,
              letterSpacing: 0.1,
            }}>
              Verify Phone Number
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 15, marginBottom: 16, textAlign: 'center' }}>
              We'll send a verification code to:
              {'\n'}
              <Text style={{ color: '#fff', fontWeight: '600' }}>{user?.phone}</Text>
            </Text>
            {phoneVerifyStep === 'idle' && (
              <>
                {sendError ? (
                  <Text style={{ color: '#EF4444', fontSize: 14, marginBottom: 8, textAlign: 'center' }}>{sendError}</Text>
                ) : null}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#F59E0B',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 32,
                    marginTop: 8,
                    width: 220,
                    alignItems: 'center',
                  }}
                  onPress={handleSendVerificationCode}
                  disabled={sendLoading}
                >
                  {sendLoading ? (
                    <ActivityIndicator color="#1F2937" />
                  ) : (
                    <Text style={{ color: '#1F2937', fontWeight: '700', fontSize: 16 }}>Send Verification Code</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    marginTop: 18,
                    backgroundColor: colors.highlightOnCard,
                    borderRadius: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 24,
                  }}
                  onPress={() => setShowPhoneVerifyModal(false)}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
            {phoneVerifyStep === 'codeSent' && (
              <>
                <Text style={{ color: '#9CA3AF', fontSize: 15, marginBottom: 10, textAlign: 'center' }}>
                  Enter the 6-digit code sent to your phone.
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.highlightOnCard,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#4B5563',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 20,
                    color: '#fff',
                    letterSpacing: 8,
                    textAlign: 'center',
                    width: 180,
                    marginBottom: 8,
                  }}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="------"
                  placeholderTextColor="#6B7280"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                {verifyError ? (
                  <Text style={{ color: '#EF4444', fontSize: 14, marginBottom: 8, textAlign: 'center' }}>{verifyError}</Text>
                ) : null}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#F59E0B',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 32,
                    marginTop: 4,
                    width: 220,
                    alignItems: 'center',
                    opacity: verificationCode.length === 6 && !verifyLoading ? 1 : 0.7,
                  }}
                  onPress={handleVerifyCode}
                  disabled={verificationCode.length !== 6 || verifyLoading}
                >
                  {verifyLoading ? (
                    <ActivityIndicator color="#1F2937" />
                  ) : (
                    <Text style={{ color: '#1F2937', fontWeight: '700', fontSize: 16 }}>Verify Code</Text>
                  )}
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                  {countdown > 0 ? (
                    <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
                      Resend code in {countdown}s
                    </Text>
                  ) : (
                    <TouchableOpacity
                      onPress={handleResendCode}
                      disabled={resendLoading}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: colors.highlightOnCard,
                      }}
                    >
                      {resendLoading ? (
                        <ActivityIndicator color="#F59E0B" size="small" />
                      ) : (
                        <Text style={{ color: '#F59E0B', fontWeight: '600', fontSize: 14 }}>Resend Code</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                {sendError ? (
                  <Text style={{ color: '#EF4444', fontSize: 14, marginTop: 8, textAlign: 'center' }}>{sendError}</Text>
                ) : null}
                <TouchableOpacity
                  style={{
                    marginTop: 18,
                    backgroundColor: colors.highlightOnCard,
                    borderRadius: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 24,
                  }}
                  onPress={() => setShowPhoneVerifyModal(false)}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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

// --- Contact Support Modal Component ---
function ContactSupportModal({
  visible,
  onClose,
  message,
  setMessage,
  sending,
  setSending,
}: {
  visible: boolean;
  onClose: () => void;
  message: string;
  setMessage: (msg: string) => void;
  sending: boolean;
  setSending: (b: boolean) => void;
}) {
  // Compose mailto link
  const subject = encodeURIComponent('Clippr Support Request');
  const body = encodeURIComponent(
    message
      ? `User message:\n${message}\n\n---\n(Describe your issue above. Please include any relevant details.)`
      : ''
  );
  const mailto = `mailto:support@clippr.com?subject=${subject}&body=${body}`;

  const handleSend = async () => {
    setSending(true);
    try {
      await Linking.openURL(mailto);
      setMessage('');
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Could not open email client.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView style={{
        flex: 1,
        backgroundColor: 'rgba(17,24,39,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <View style={{
          backgroundColor: '#1F2937',
          borderRadius: 16,
          padding: 24,
          width: '90%',
          maxWidth: 400,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.highlightOnCard,
        }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>
            Contact Support
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 15, marginBottom: 16, textAlign: 'center' }}>
            Need help? Our support team is here for you. Email us at support@clippr.com or describe your issue below.
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.highlightOnCard,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#4B5563',
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: '#fff',
              minHeight: 80,
              width: '100%',
              marginBottom: 16,
              textAlignVertical: 'top',
            }}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your issue (optional)"
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={4}
            autoFocus
          />
          <TouchableOpacity
            style={{
              backgroundColor: '#F59E0B',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 32,
              width: '100%',
              alignItems: 'center',
              marginBottom: 10,
              opacity: sending ? 0.7 : 1,
            }}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#1F2937" />
            ) : (
              <Text style={{ color: '#1F2937', fontWeight: '700', fontSize: 16 }}>
                Send Email
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              marginTop: 2,
              backgroundColor: colors.highlightOnCard,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 24,
              width: '100%',
              alignItems: 'center',
            }}
            onPress={onClose}
            disabled={sending}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// --- Timezone Picker Component ---
import { Picker } from '@react-native-picker/picker';
function TimezonePicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  return (
    <View style={{
      backgroundColor: colors.highlightOnCard,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#4B5563',
      marginTop: 2,
    }}>
      <Picker
        selectedValue={value}
        onValueChange={onChange}
        style={{ color: '#fff', fontSize: 16 }}
        dropdownIconColor="#F59E0B"
      >
        <Picker.Item label="Eastern Time (ET)" value="America/New_York" />
        <Picker.Item label="Central Time (CT)" value="America/Chicago" />
        <Picker.Item label="Mountain Time (MT)" value="America/Denver" />
        <Picker.Item label="Pacific Time (PT)" value="America/Los_Angeles" />
        <Picker.Item label="Alaska Time (AKT)" value="America/Anchorage" />
        <Picker.Item label="Hawaii Time (HST)" value="Pacific/Honolulu" />
      </Picker>
    </View>
  );
}

// --- Transportation Mode Picker Component ---
const TRANSPORTATION_OPTIONS = [
  { value: 'driving', label: 'Driving', icon: 'car-outline' },
  { value: 'walking', label: 'Walking', icon: 'walk-outline' },
  { value: 'cycling', label: 'Cycling', icon: 'bicycle-outline' },
  { value: 'transit', label: 'Public Transit', icon: 'bus-outline' },
];

function TransportationModePicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  return (
    <View style={{
      backgroundColor: colors.highlightOnCard,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#4B5563',
      marginTop: 2,
    }}>
      <Picker
        selectedValue={value}
        onValueChange={onChange}
        style={{ color: '#fff', fontSize: 16 }}
        dropdownIconColor="#F59E0B"
      >
        {TRANSPORTATION_OPTIONS.map(opt => (
          <Picker.Item
            key={opt.value}
            label={`${opt.label}`}
            value={opt.value}
          />
        ))}
      </Picker>
      {/* Optionally, show icon next to selected value */}
      {/* Could add icon in label if Picker supports, or show icon above */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // '#121212'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt, // '#18181B' or '#111827'
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: colors.backgroundAlt,
    gap: 6,
    flex: 1,
    minWidth: '30%',
  },
  activeTab: {
    backgroundColor: colors.gold,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSteel,
  },
  activeTabText: {
    color: colors.textCharcoal,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: colors.backgroundDarkCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderCard,
    shadowColor: colors.shadow,
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.1,
    marginBottom: 2,
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
    backgroundColor: colors.highlightOnCard,
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
    backgroundColor: colors.highlightOnCard,
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
    backgroundColor: colors.highlightOnCard,
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
    backgroundColor: '#2e2e2e',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#232323',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 0.1,
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
    borderBottomColor: colors.highlightOnCard,
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  modalSaveButton: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  photoSection: {
    marginBottom: 28,
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
    backgroundColor: colors.highlightOnCard,
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#232323',
    gap: 8,
    backgroundColor: '#232323',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  photoButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.1,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: colors.highlightOnCard,
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
    backgroundColor: colors.highlightOnCard,
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
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  paymentButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.highlightOnCard,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  paymentButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e1e1e',
    letterSpacing: 0.1,
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
    backgroundColor: colors.highlightOnCard,
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
    backgroundColor: colors.highlightOnCard,
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
    backgroundColor: colors.highlightOnCard,
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
    backgroundColor: colors.highlightOnCard,
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
    borderColor: colors.highlightOnCard,
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
    backgroundColor: colors.highlightOnCard,
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
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 8,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  helpButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.highlightOnCard,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  helpButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e1e1e',
    letterSpacing: 0.1,
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
    backgroundColor: colors.highlightOnCard,
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
  premiumFeaturesCard: {
    backgroundColor: '#181F2A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#10B981',
    padding: 20,
    marginTop: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  premiumFeaturesCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  premiumFeaturesMainCheck: {
    marginRight: 8,
  },
  premiumFeaturesCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.2,
  },
  premiumFeaturesList: {
    width: '100%',
    marginBottom: 14,
    gap: 10,
  },
  premiumFeaturesListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  premiumFeaturesListCheck: {
    marginRight: 2,
  },
  premiumFeaturesListText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    flexShrink: 1,
  },
  premiumFeaturesGuarantee: {
    marginTop: 6,
    fontSize: 13,
    color: '#A7F3D0',
    textAlign: 'center',
    fontWeight: '400',
    opacity: 0.85,
  },
  quickActionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickActionSubLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 8,
  },
  quickActionMessageCard: {
    backgroundColor: '#232B39',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.highlightOnCard,
    padding: 12,
    marginBottom: 0,
  },
  quickActionMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickActionMessageTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  quickActionBadge: {
    backgroundColor: colors.highlightOnCard,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBadgeText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  quickActionMessageText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    borderWidth: 0,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    marginBottom: 0,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickActionButtonText: {
    color: '#1e1e1e',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  quickActionInfoBox: {
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    borderColor: '#2563EB',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  quickActionInfoTitle: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickActionInfoText: {
    color: '#BFDBFE',
    fontSize: 12,
    marginTop: 0,
  },
});

