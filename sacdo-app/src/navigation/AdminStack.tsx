import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../types';
import AdminTabs from './AdminTabs';
import MemberPaymentsScreen from '../screens/admin/MemberPaymentsScreen';
import FeeConfigScreen from '../screens/admin/FeeConfigScreen';
import PaymentTypesScreen from '../screens/admin/PaymentTypesScreen';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="MemberPayments"
        component={MemberPaymentsScreen}
        options={({ route }) => ({ title: route.params.memberName })}
      />
      <Stack.Screen name="FeeConfig" component={FeeConfigScreen} options={{ title: 'Fee Configuration' }} />
      <Stack.Screen name="PaymentTypes" component={PaymentTypesScreen} options={{ title: 'Payment Types' }} />
    </Stack.Navigator>
  );
}
