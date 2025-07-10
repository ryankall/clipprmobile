import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function Calendar() {
  const timeSlots = [
    { time: '9:00 AM', appointment: null },
    { time: '10:00 AM', appointment: null },
    { time: '11:00 AM', appointment: null },
    { time: '12:00 PM', appointment: null },
    { time: '1:00 PM', appointment: null },
    { time: '2:00 PM', appointment: null },
    { time: '3:00 PM', appointment: null },
    { time: '4:00 PM', appointment: null },
    { time: '5:00 PM', appointment: null },
    { time: '6:00 PM', appointment: null },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 py-6">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-2xl font-bold text-foreground">
              Today, July 10
            </Text>
            <Text className="text-muted-foreground">
              Thursday
            </Text>
          </View>
          <TouchableOpacity className="bg-primary rounded-lg p-3">
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="bg-card rounded-lg p-4 mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">
            Today's Schedule
          </Text>
          
          {timeSlots.map((slot, index) => (
            <View key={index} className="flex-row items-center py-3 border-b border-border">
              <View className="w-20">
                <Text className="text-sm text-muted-foreground">
                  {slot.time}
                </Text>
              </View>
              <View className="flex-1 ml-4">
                {slot.appointment ? (
                  <View className="bg-primary rounded-lg p-3">
                    <Text className="text-primary-foreground font-semibold">
                      {slot.appointment}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-muted-foreground italic">
                    Available
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity className="bg-secondary rounded-lg p-4">
          <Text className="text-secondary-foreground font-semibold text-center">
            View Full Calendar
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}