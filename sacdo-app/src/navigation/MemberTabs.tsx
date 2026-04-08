import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { MemberTabParamList } from '../types';
import HomeScreen from '../screens/member/HomeScreen';
import EventsScreen from '../screens/member/EventsScreen';
import MembershipFeesScreen from '../screens/member/MembershipFeesScreen';
import ProfileScreen from '../screens/member/ProfileScreen';

const Tab = createBottomTabNavigator<MemberTabParamList>();

type IconProps = { color: string; size: number };

export default function MemberTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="calendar-month" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MembershipFees"
        component={MembershipFeesScreen}
        options={{
          title: 'Fees',
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="receipt" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }: IconProps) => (
            <MaterialCommunityIcons name="account-circle" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
