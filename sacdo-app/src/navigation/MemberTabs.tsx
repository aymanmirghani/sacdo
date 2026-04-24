import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { MemberTabParamList } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { Collections } from '../services/firebase';
import HomeScreen from '../screens/member/HomeScreen';
import EventsScreen from '../screens/member/EventsScreen';
import MembershipFeesScreen from '../screens/member/MembershipFeesScreen';
import InvoicesScreen from '../screens/member/InvoicesScreen';
import ProfileScreen from '../screens/member/ProfileScreen';

const Tab = createBottomTabNavigator<MemberTabParamList>();

type IconProps = { color: string; size: number };

export default function MemberTabs() {
  const { user } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = firestore()
      .collection(Collections.INVOICES)
      .where('memberId', '==', user.id)
      .where('status', 'in', ['pending', 'overdue'])
      .onSnapshot(
        (snap) => setPendingCount(snap.size),
        () => {}
      );
    return unsubscribe;
  }, [user?.id]);

  const badge = pendingCount > 0 ? (pendingCount > 5 ? '5+' : pendingCount) : undefined;

  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="calendar-star" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MembershipFees"
        component={MembershipFeesScreen}
        options={{
          title: 'Fees',
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="cash-multiple" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{
          tabBarBadge: badge,
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="clipboard-text-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="account-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
