import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import { AdminTabParamList } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { saveFCMToken } from '../services/auth';
import { Collections } from '../services/firebase';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import RegistrationRequestsScreen from '../screens/admin/RegistrationRequestsScreen';
import MembersListScreen from '../screens/admin/MembersListScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import AdminEventsScreen from '../screens/admin/EventsScreen';

const Tab = createBottomTabNavigator<AdminTabParamList>();

type IconProps = { color: string; size: number };

export default function AdminTabs() {
  const { user } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);

  // Real-time listener for pending registration requests count
  useEffect(() => {
    const unsubscribe = firestore()
      .collection(Collections.REGISTRATION_REQUESTS)
      .where('status', '==', 'pending')
      .onSnapshot(
        (snap) => setPendingCount(snap.size),
        () => {} // ignore listener errors silently
      );
    return unsubscribe;
  }, []);

  // FCM: request permission, save token, handle foreground messages
  useEffect(() => {
    if (!user?.id) return;

    let unsubscribeRefresh: (() => void) | undefined;
    let unsubscribeForeground: (() => void) | undefined;

    async function setupFCM() {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) return;

      const token = await messaging().getToken();
      if (token) {
        await saveFCMToken(user!.id, token).catch(() => {});
      }

      unsubscribeRefresh = messaging().onTokenRefresh((newToken) => {
        saveFCMToken(user!.id, newToken).catch(() => {});
      });

      unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
        Alert.alert(
          remoteMessage.notification?.title ?? 'Notification',
          remoteMessage.notification?.body ?? ''
        );
      });
    }

    setupFCM();

    return () => {
      unsubscribeRefresh?.();
      unsubscribeForeground?.();
    };
  }, [user?.id]);

  const badge = pendingCount > 0 ? (pendingCount > 9 ? '9+' : pendingCount) : undefined;

  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="RegistrationRequests"
        component={RegistrationRequestsScreen}
        options={{
          title: 'Requests',
          tabBarBadge: badge,
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="account-clock" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Members"
        component={MembersListScreen}
        options={{
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="account-group" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Events"
        component={AdminEventsScreen}
        options={{
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="calendar-edit" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
