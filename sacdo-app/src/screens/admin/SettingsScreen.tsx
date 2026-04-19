import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.container}>
      <List.Item
        title="Fee Configuration"
        description="Manage membership fee types and amounts"
        left={(props) => <List.Icon {...props} icon="currency-usd" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => navigation.navigate('FeeConfig')}
      />
      <Divider />
      <List.Item
        title="Payment Types"
        description="Manage payment methods (e.g. Cash, Cheque, Bank Transfer)"
        left={(props) => <List.Icon {...props} icon="credit-card-outline" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => navigation.navigate('PaymentTypes')}
      />
      <Divider />
      <List.Item
        title="Invoice Configuration"
        description="Set invoice schedule, due dates, and generate invoices on demand"
        left={(props) => <List.Icon {...props} icon="calendar-clock" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => navigation.navigate('InvoiceConfig')}
      />
      <Divider />
      <List.Item
        title="Audit Log"
        description="View administrator action history"
        left={(props) => <List.Icon {...props} icon="clipboard-text-clock-outline" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => navigation.navigate('AuditLog')}
      />
      <Divider />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
