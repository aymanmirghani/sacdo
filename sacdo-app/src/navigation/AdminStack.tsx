import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../types';
import AdminTabs from './AdminTabs';
import MemberPaymentsScreen from '../screens/admin/MemberPaymentsScreen';
import MemberInvoicesScreen from '../screens/admin/MemberInvoicesScreen';
import FeeConfigScreen from '../screens/admin/FeeConfigScreen';
import PaymentTypesScreen from '../screens/admin/PaymentTypesScreen';
import InvoiceConfigScreen from '../screens/admin/InvoiceConfigScreen';
import InvoiceListScreen from '../screens/admin/InvoiceListScreen';
import AuditLogScreen from '../screens/admin/AuditLogScreen';

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
      <Stack.Screen
        name="MemberInvoices"
        component={MemberInvoicesScreen}
        options={({ route }) => ({ title: `${route.params.memberName} — Invoices` })}
      />
      <Stack.Screen
        name="InvoiceList"
        component={InvoiceListScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
      <Stack.Screen name="FeeConfig" component={FeeConfigScreen} options={{ title: 'Fee Configuration' }} />
      <Stack.Screen name="PaymentTypes" component={PaymentTypesScreen} options={{ title: 'Payment Types' }} />
      <Stack.Screen name="InvoiceConfig" component={InvoiceConfigScreen} options={{ title: 'Invoice Configuration' }} />
      <Stack.Screen name="AuditLog" component={AuditLogScreen} options={{ title: 'Audit Log' }} />
    </Stack.Navigator>
  );
}
