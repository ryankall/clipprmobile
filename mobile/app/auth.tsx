import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (isSignUp && (!businessName || !phone)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // TODO: Implement actual authentication logic
    // For now, just navigate to the main app
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-6">
        <View className="bg-card rounded-lg p-6">
          <Text className="text-3xl font-bold text-center text-foreground mb-2">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Text>
          <Text className="text-center text-muted-foreground mb-8">
            {isSignUp 
              ? 'Create your barber account' 
              : 'Welcome back to Clippr'
            }
          </Text>

          {isSignUp && (
            <>
              <TextInput
                className="bg-input border border-border rounded-lg px-4 py-3 mb-4 text-foreground"
                placeholder="Business Name"
                placeholderTextColor="#666"
                value={businessName}
                onChangeText={setBusinessName}
              />
              <TextInput
                className="bg-input border border-border rounded-lg px-4 py-3 mb-4 text-foreground"
                placeholder="Phone Number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </>
          )}

          <TextInput
            className="bg-input border border-border rounded-lg px-4 py-3 mb-4 text-foreground"
            placeholder="Email"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            className="bg-input border border-border rounded-lg px-4 py-3 mb-6 text-foreground"
            placeholder="Password"
            placeholderTextColor="#666"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            className="bg-primary py-4 rounded-lg mb-4"
            onPress={handleSubmit}
          >
            <Text className="text-primary-foreground text-center font-semibold text-lg">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="py-2"
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text className="text-center text-primary">
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : "Don't have an account? Sign Up"
              }
            </Text>
          </TouchableOpacity>

          <Link href="/" asChild>
            <TouchableOpacity className="mt-4">
              <Text className="text-center text-muted-foreground">
                ← Back to Welcome
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}