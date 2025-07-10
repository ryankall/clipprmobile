import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Welcome() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-4xl font-bold text-foreground mb-2">
          Welcome to Clippr
        </Text>
        <Text className="text-lg text-muted-foreground text-center mb-8">
          Simplifying the business side of your style game
        </Text>
        
        <View className="w-full space-y-4">
          <Link href="/auth" asChild>
            <TouchableOpacity className="bg-primary px-6 py-4 rounded-lg">
              <Text className="text-primary-foreground text-center font-semibold text-lg">
                Get Started
              </Text>
            </TouchableOpacity>
          </Link>
          
          <Link href="/(tabs)" asChild>
            <TouchableOpacity className="border border-border px-6 py-4 rounded-lg">
              <Text className="text-foreground text-center font-semibold text-lg">
                Continue as Guest
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}