import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
  Alert, TextInput, Switch, Platform, Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../store/authStore';
import { reminderService } from '../services/reminderService';
import type { CollectionStackParamList, Reminder } from '../types';

type Props = {
  navigation: StackNavigationProp<CollectionStackParamList, 'Reminders'>;
  route: { params: { userPlantId: string; commonName: string } };
};

const CARE_TYPES: { key: Reminder['care_type']; label: string; icon: string }[] = [
  { key: 'water', label: 'Water', icon: 'droplet' },
  { key: 'fertilize', label: 'Fertilize', icon: 'sun' },
  { key: 'repot', label: 'Repot', icon: 'scissors' },
  { key: 'custom', label: 'Custom', icon: 'bell' },
];

const INTERVAL_OPTIONS: { key: Reminder['recurring_interval']; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

function getTomorrowMorning(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

function getCareTypeIcon(careType: Reminder['care_type']): string {
  switch (careType) {
    case 'water':
      return 'droplet';
    case 'fertilize':
      return 'sun';
    case 'repot':
      return 'scissors';
    case 'custom':
      return 'bell';
  }
}

function getCareTypeLabel(careType: Reminder['care_type'], customLabel: string | null): string {
  if (careType === 'custom' && customLabel) return customLabel;
  switch (careType) {
    case 'water':
      return 'Water';
    case 'fertilize':
      return 'Fertilize';
    case 'repot':
      return 'Repot';
    case 'custom':
      return 'Custom';
  }
}

export default function ReminderScreen({ navigation, route }: Props) {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const { userPlantId, commonName } = route.params;
  const user = useAuthStore((s) => s.user);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [careType, setCareType] = useState<Reminder['care_type']>('water');
  const [customLabel, setCustomLabel] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(getTomorrowMorning());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] =
    useState<Reminder['recurring_interval']>('weekly');
  const [isSaving, setIsSaving] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const loadReminders = useCallback(async () => {
    try {
      const data = await reminderService.getRemindersForPlant(userPlantId);
      setReminders(data);
    } catch {
      setReminders([]);
    } finally {
      setLoadingReminders(false);
    }
  }, [userPlantId]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      const updated = new Date(selectedDate);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(updated);
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (date) {
      const updated = new Date(selectedDate);
      updated.setHours(date.getHours(), date.getMinutes());
      setSelectedDate(updated);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setErrorMessage('');
    setPermissionDenied(false);

    if (selectedDate <= new Date()) {
      setErrorMessage('Reminder must be set for a future time.');
      return;
    }

    if (careType === 'custom' && !customLabel.trim()) {
      setErrorMessage('Enter a label for the custom reminder.');
      return;
    }

    setIsSaving(true);
    try {
      await reminderService.saveReminder({
        userId: user.id,
        userPlantId,
        careType,
        scheduledAt: selectedDate,
        isRecurring,
        recurringInterval,
        customLabel: careType === 'custom' ? customLabel.trim() : null,
      });

      await loadReminders();
      setCareType('water');
      setCustomLabel('');
      setSelectedDate(getTomorrowMorning());
      setIsRecurring(false);
      setRecurringInterval('weekly');
    } catch (err: any) {
      if (
        err.message &&
        err.message.toLowerCase().includes('notifications are disabled')
      ) {
        setPermissionDenied(true);
      } else {
        setErrorMessage(err.message || 'Failed to save reminder.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReminder = (reminder: Reminder) => {
    Alert.alert('Delete this reminder?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await reminderService.deleteReminder(reminder.id);
            setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
          } catch {
            Alert.alert('Error', 'Failed to delete reminder.');
          }
        },
      },
    ]);
  };

  const formatDateDisplay = (date: Date): string => {
    const dayName = date.toLocaleDateString(undefined, { weekday: 'long' });
    const monthDay = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    const time = date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${dayName}, ${monthDay} · ${time}`;
  };

  const formatReminderDate = (isoString: string): string => {
    const d = new Date(isoString);
    const monthDay = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${monthDay} at ${time}`;
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green700} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={20} color={Colors.soil} />
        </TouchableOpacity>
        <View style={styles.headerTextArea}>
          <Text style={styles.headerTitle}>Reminders</Text>
          <Text style={styles.headerSubtitle}>{commonName}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Existing Reminders</Text>
        {loadingReminders ? (
          <ActivityIndicator
            size="small"
            color={Colors.green700}
            style={styles.loadingInline}
          />
        ) : reminders.length === 0 ? (
          <Text style={styles.emptyText}>No reminders set.</Text>
        ) : (
          reminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderRow}>
              <View
                style={[
                  styles.reminderIcon,
                  {
                    backgroundColor:
                      reminder.care_type === 'custom'
                        ? Colors.warningBg
                        : Colors.green100,
                  },
                ]}
              >
                <Feather
                  name={getCareTypeIcon(reminder.care_type) as any}
                  size={16}
                  color={
                    reminder.care_type === 'custom'
                      ? Colors.warning
                      : Colors.green700
                  }
                />
              </View>
              <View style={styles.reminderMiddle}>
                <Text style={styles.reminderLabel}>
                  {getCareTypeLabel(reminder.care_type, reminder.custom_label)}
                </Text>
                <Text style={styles.reminderDate}>
                  {formatReminderDate(reminder.scheduled_at)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteReminder(reminder)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="trash-2" size={18} color={Colors.bark} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Add a Reminder</Text>

          <Text style={styles.formFieldLabel}>Care Type</Text>
          <View style={styles.segmentedRow}>
            {CARE_TYPES.map((type) => {
              const active = careType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.segment,
                    active ? styles.segmentActive : styles.segmentInactive,
                  ]}
                  onPress={() => setCareType(type.key)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={type.icon as any}
                    size={14}
                    color={active ? Colors.textOnDark : Colors.bark}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? Colors.textOnDark : Colors.soil },
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {careType === 'custom' && (
            <TextInput
              style={styles.customLabelInput}
              placeholder="Reminder label"
              placeholderTextColor={Colors.bark}
              value={customLabel}
              onChangeText={setCustomLabel}
              maxLength={50}
            />
          )}

          <Text style={styles.formFieldLabel}>Date & Time</Text>
          {Platform.OS === 'ios' ? (
            <View style={styles.dateTimeIosContainer}>
              <DateTimePicker
                value={selectedDate}
                mode="datetime"
                display="inline"
                onChange={(event, date) => {
                  if (date) setSelectedDate(date);
                }}
                accentColor={Colors.green700}
                minimumDate={new Date()}
                locale="en-US"
              />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Feather name="calendar" size={16} color={Colors.green700} />
                <Text style={styles.dateTimeButtonText}>
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Feather name="clock" size={16} color={Colors.green700} />
                <Text style={styles.dateTimeButtonText}>
                  {selectedDate.toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
            </>
          )}
          <Text style={styles.dateTimePreview}>
            {formatDateDisplay(selectedDate)}
          </Text>

          <View style={styles.recurringRow}>
            <Text style={styles.recurringLabel}>Repeat</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: Colors.stone, true: Colors.green300 }}
              thumbColor={isRecurring ? Colors.green700 : Colors.card}
            />
          </View>

          {isRecurring && (
            <View style={styles.segmentedRow}>
              {INTERVAL_OPTIONS.map((opt) => {
                const active = recurringInterval === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.segment,
                      active ? styles.segmentActive : styles.segmentInactive,
                    ]}
                    onPress={() => setRecurringInterval(opt.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: active ? Colors.textOnDark : Colors.soil },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {errorMessage !== '' && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

          {permissionDenied && (
            <View style={styles.permissionBanner}>
              <Text style={styles.permissionBannerText}>
                Notifications are disabled. Enable them in Settings.
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openSettings()}
                activeOpacity={0.7}
              >
                <Text style={styles.permissionLink}>Open Settings</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.textOnDark} />
            ) : (
              <Text style={styles.saveButtonText}>Save Reminder</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.parchment,
  },
  loadingInline: {
    marginVertical: 16,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.linen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextArea: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: Colors.soil,
  },
  headerSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.bark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
    marginBottom: 16,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.stone,
    borderRadius: 10,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderMiddle: {
    flex: 1,
  },
  reminderLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.soil,
  },
  reminderDate: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.bark,
    marginTop: 2,
  },
  formSection: {
    marginTop: 16,
    gap: 14,
  },
  formFieldLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.soil,
    marginBottom: -4,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.green700,
  },
  segmentInactive: {
    backgroundColor: Colors.linen,
  },
  segmentText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
  },
  customLabelInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.stone,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.soil,
  },
  dateTimeIosContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.stone,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateTimeButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.soil,
  },
  dateTimePreview: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.bark,
    textAlign: 'center',
  },
  recurringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recurringLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.soil,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.error,
  },
  permissionBanner: {
    backgroundColor: Colors.terraLight,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  permissionBannerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.terra,
  },
  permissionLink: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: Colors.bark,
  },
  saveButton: {
    backgroundColor: Colors.green700,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.textOnDark,
  },
});
