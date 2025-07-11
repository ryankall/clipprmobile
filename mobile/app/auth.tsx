import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function Auth() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Sign In Failed', result.error || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !phone || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    Alert.alert('Coming Soon', 'Sign up functionality will be available soon!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="cut" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.logo}>Clippr</Text>
          </View>
          <Text style={styles.tagline}>
            Simplifying the business side of your style game.
          </Text>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {activeTab === 'signin' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {activeTab === 'signin' 
                ? 'Sign in to manage your business'
                : 'Join Clippr to streamline your barber business'
              }
            </Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'signin' && styles.activeTab]}
              onPress={() => setActiveTab('signin')}
            >
              <Text style={[styles.tabText, activeTab === 'signin' && styles.activeTabText]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
              onPress={() => setActiveTab('signup')}
            >
              <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSignIn}
                disabled={isLoading}
              >
                <Text style={styles.primaryButtonText}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <View style={styles.form}>
              <View style={styles.nameRow}>
                <View style={styles.nameInput}>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="First name"
                      placeholderTextColor="#9CA3AF"
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </View>
                </View>
                <View style={styles.nameInput}>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Last name"
                      placeholderTextColor="#9CA3AF"
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSignUp}
                disabled={isLoading}
              >
                <Text style={styles.primaryButtonText}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Social Login */}
          <View style={styles.socialContainer}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-apple" size={20} color="#000000" />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A', // Dark charcoal background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F59E0B', // Gradient gold
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tagline: {
    fontSize: 16,
    color: '#D1D5DB', // Light gray
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#2A2A2A', // Dark card background
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#374151', // Steel border
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 8,
    marginBottom: 24,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#1A1A1A',
  },
  form: {
    marginBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  nameInput: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: '#F59E0B', // Gradient gold
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  socialContainer: {
    marginTop: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#4B5563',
  },
  orText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 12,
    textTransform: 'uppercase',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
});