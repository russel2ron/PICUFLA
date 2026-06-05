import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export const permissionService = {

  async requestCamera(): Promise<PermissionStatus> {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status as PermissionStatus;
  },

  async requestLocation(): Promise<PermissionStatus> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status as PermissionStatus;
  },

  async requestNotifications(): Promise<PermissionStatus> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status as PermissionStatus;
  },

  async getCameraStatus(): Promise<PermissionStatus> {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status as PermissionStatus;
  },

  async getLocationStatus(): Promise<PermissionStatus> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status as PermissionStatus;
  },

  async getNotificationStatus(): Promise<PermissionStatus> {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PermissionStatus;
  },
};
