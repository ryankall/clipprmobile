import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, TextInput, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiRequest } from '../lib/api';
import { colors } from '../lib/theme';

type BreakTime = {
  start: string;
  end: string;
  label: string;
};

type DayHours = {
  start: string;
  end: string;
  enabled: boolean;
  breaks?: BreakTime[];
};

type WorkingHours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

const defaultWorkingHours: WorkingHours = {
  monday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  tuesday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  wednesday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  thursday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  friday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  saturday: { start: '10:00', end: '16:00', enabled: true, breaks: [] },
  sunday: { start: '10:00', end: '16:00', enabled: false, breaks: [] },
};

const days: Array<keyof WorkingHours> = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const dayLabels: Record<keyof WorkingHours, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function validateTimeRange(start: string, end: string): boolean {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return sh * 60 + sm < eh * 60 + em;
}

export default function WorkingHoursScreen() {
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultWorkingHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const profile = await apiRequest<any>('GET', '/api/user/profile');
        if (profile && profile.workingHours) {
          setWorkingHours({ ...defaultWorkingHours, ...profile.workingHours });
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to load working hours');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateDay = (day: keyof WorkingHours, field: keyof DayHours, value: any) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const updateBreak = (day: keyof WorkingHours, idx: number, field: keyof BreakTime, value: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day].breaks?.map((b, i) => i === idx ? { ...b, [field]: value } : b) || [],
      },
    }));
  };

  const addBreak = (day: keyof WorkingHours) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: [
          ...(prev[day].breaks || []),
          { start: '12:00', end: '13:00', label: 'Lunch Break' },
        ],
      },
    }));
  };

  const removeBreak = (day: keyof WorkingHours, idx: number) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day].breaks?.filter((_, i) => i !== idx) || [],
      },
    }));
  };

  const handleSave = async () => {
    // Validate all enabled days and breaks
    const invalidDays: string[] = [];
    const invalidBreaks: string[] = [];
    days.forEach(day => {
      const hours = workingHours[day];
      if (hours.enabled) {
        if (!validateTimeRange(hours.start, hours.end)) {
          invalidDays.push(dayLabels[day]);
        }
        hours.breaks?.forEach((b, i) => {
          if (!validateTimeRange(b.start, b.end)) {
            invalidBreaks.push(`${dayLabels[day]} - Block ${i + 1}`);
          }
        });
      }
    });
    if (invalidDays.length > 0) {
      Alert.alert('Invalid Time Range', `Start time must be before end time for: ${invalidDays.join(', ')}`);
      return;
    }
    if (invalidBreaks.length > 0) {
      Alert.alert('Invalid Block Time', `Block time start must be before end time for: ${invalidBreaks.join(', ')}`);
      return;
    }

    try {
      setSaving(true);
      await apiRequest('PATCH', '/api/user/profile', { workingHours });
      Alert.alert('Success', 'Working hours updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update working hours');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                  <Ionicons name="arrow-back" size={22} color={colors.gold} />
        </TouchableOpacity>
        <Text style={styles.title}>Working Hours</Text>
      </View>
      {days.map(day => {
        const hours = workingHours[day];
        return (
          <View key={day} style={styles.daySection}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{dayLabels[day]}</Text>
              <Switch
                value={hours.enabled}
                onValueChange={v => updateDay(day, 'enabled', v)}
                trackColor={{ false: '#374151', true: '#22C55E' }}
                thumbColor={hours.enabled ? '#22C55E' : '#9CA3AF'}
              />
            </View>
            {hours.enabled ? (
              <View style={styles.timeRow}>
                <TextInput
                  style={styles.timeInput}
                  value={hours.start}
                  onChangeText={t => updateDay(day, 'start', t)}
                  placeholder="Start"
                  keyboardType="numeric"
                  maxLength={5}
                />
                <Text style={styles.toText}>to</Text>
                <TextInput
                  style={styles.timeInput}
                  value={hours.end}
                  onChangeText={t => updateDay(day, 'end', t)}
                  placeholder="End"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            ) : (
              <Text style={styles.closedText}>Closed</Text>
            )}
            {hours.enabled && (
              <View style={styles.breaksSection}>
                <View style={styles.breaksHeader}>
                  <Text style={styles.breaksLabel}>Block Times</Text>
                  <TouchableOpacity onPress={() => addBreak(day)} style={styles.addBreakBtn}>
                    <Ionicons name="add" size={16} color="#F59E0B" />
                    <Text style={styles.addBreakText}>Add Block</Text>
                  </TouchableOpacity>
                </View>
                {hours.breaks && hours.breaks.length > 0 && hours.breaks.map((b, i) => (
                  <View key={i} style={styles.breakRow}>
                    <TextInput
                      style={styles.breakTimeInput}
                      value={b.start}
                      onChangeText={t => updateBreak(day, i, 'start', t)}
                      placeholder="Start"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                    <Text style={styles.toText}>to</Text>
                    <TextInput
                      style={styles.breakTimeInput}
                      value={b.end}
                      onChangeText={t => updateBreak(day, i, 'end', t)}
                      placeholder="End"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                    <TextInput
                      style={styles.breakLabelInput}
                      value={b.label}
                      onChangeText={t => updateBreak(day, i, 'label', t)}
                      placeholder="Label"
                      maxLength={20}
                    />
                    <TouchableOpacity onPress={() => removeBreak(day, i)} style={styles.removeBreakBtn}>
                      <Ionicons name="remove-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
      <View style={styles.saveRow}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Hours'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  iconButton: {
      backgroundColor: colors.backgroundCardAlt,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 20,
    justifyContent: 'space-between',
    backgroundColor: colors.background,
  },
  container: { flex: 1, backgroundColor: '#0F0F0F', padding: 16, paddingTop: 50, paddingBottom: 100},
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F0F' },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
    marginRight: 8,
    textAlign: 'center',
  },
  daySection: { marginBottom: 24, backgroundColor: '#18181B', borderRadius: 12, padding: 12 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayLabel: { fontSize: 18, color: '#FFFFFF', fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timeInput: { backgroundColor: '#232323', color: '#FFF', borderRadius: 6, padding: 8, width: 70, fontSize: 16, marginRight: 8 },
  toText: { color: '#9CA3AF', fontSize: 14, marginRight: 8 },
  closedText: { color: '#9CA3AF', fontStyle: 'italic', marginLeft: 4, marginBottom: 8 },
  breaksSection: { marginTop: 8 },
  breaksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  breaksLabel: { color: '#F59E0B', fontSize: 14, fontWeight: '500' },
  addBreakBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  addBreakText: { color: '#F59E0B', fontSize: 13, marginLeft: 2 },
  breakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, backgroundColor: '#232323', borderRadius: 6, padding: 6 },
  breakTimeInput: { backgroundColor: '#18181B', color: '#FFF', borderRadius: 6, padding: 6, width: 60, fontSize: 14, marginRight: 4 },
  breakLabelInput: { backgroundColor: '#18181B', color: '#FFF', borderRadius: 6, padding: 6, flex: 1, fontSize: 14, marginRight: 4 },
  removeBreakBtn: { padding: 2 },
  saveRow: { marginTop: 16, alignItems: 'center' },
  saveBtn: { backgroundColor: '#22C55E', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 },
  saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});