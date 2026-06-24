import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { permissionService } from './permissionService';
import type { Reminder } from '../types';

async function getExpoPushToken(): Promise<string> {
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    throw new Error(
      'Push notifications are not configured. Please set up your EAS project ID in app.json (extra.eas.projectId) to use reminders.'
    );
  }
}

async function scheduleLocalNotification(reminder: {
  id: string;
  userPlantId: string;
  careType: Reminder['care_type'];
  customLabel: string | null;
  scheduledAt: Date;
}): Promise<string> {
  let body: string;
  if (reminder.careType === 'custom' && reminder.customLabel) {
    body = `Time to ${reminder.customLabel} your plant!`;
  } else {
    body = `Time to ${reminder.careType} your plant!`;
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: reminder.id,
    content: {
      body,
      data: { userPlantId: reminder.userPlantId, careType: reminder.careType },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.scheduledAt },
  });
  return identifier;
}

async function cancelLocalNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export const reminderService = {
  async saveReminder(params: {
    userId: string;
    userPlantId: string;
    careType: Reminder['care_type'];
    scheduledAt: Date;
    isRecurring: boolean;
    recurringInterval: Reminder['recurring_interval'];
    customLabel: string | null;
  }): Promise<void> {
    if (params.scheduledAt <= new Date()) {
      throw new Error('Reminder must be set for a future time.');
    }

    const permissionStatus = await permissionService.requestNotifications();
    if (permissionStatus !== 'granted') {
      throw new Error(
        'Notifications are disabled. Enable them in Settings to use reminders.',
      );
    }

    const expoPushToken = await getExpoPushToken();

    const { data: inserted, error } = await supabase
      .from('reminders')
      .insert({
        user_plant_id: params.userPlantId,
        user_id: params.userId,
        care_type: params.careType,
        custom_label: params.customLabel,
        scheduled_at: params.scheduledAt.toISOString(),
        is_recurring: params.isRecurring,
        recurring_interval: params.recurringInterval,
        expo_push_token: expoPushToken,
        is_active: true,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      throw new Error('Failed to save reminder: ' + (error?.message ?? 'unknown'));
    }

    await scheduleLocalNotification({
      id: inserted.id,
      userPlantId: params.userPlantId,
      careType: params.careType,
      customLabel: params.customLabel,
      scheduledAt: params.scheduledAt,
    });
  },

  async deleteReminder(reminderId: string): Promise<void> {
    await cancelLocalNotification(reminderId);

    const { error } = await supabase
      .from('reminders')
      .update({ is_active: false })
      .eq('id', reminderId);

    if (error) {
      throw new Error('Failed to delete reminder: ' + error.message);
    }
  },

  async getRemindersForPlant(userPlantId: string): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_plant_id', userPlantId)
      .eq('is_active', true)
      .order('scheduled_at', { ascending: true });

    if (error) {
      throw new Error('Failed to fetch reminders: ' + error.message);
    }

    return (data as Reminder[]) ?? [];
  },
};
