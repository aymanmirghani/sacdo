import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  Button,
  Switch,
} from 'react-native-paper';
import { useStripe } from '@stripe/stripe-react-native';
import { Invoice } from '../../types';
import {
  getMemberInvoices,
  updateAutoPayPreference,
  createPaymentIntent,
  createSetupIntent,
} from '../../services/invoices';
import { useAuthStore } from '../../store/useAuthStore';

const STATUS_COLORS: Record<string, string> = {
  pending: '#FFF9C4',
  paid: '#C8E6C9',
  overdue: '#FFCDD2',
};

export default function InvoicesScreen() {
  const { user } = useAuthStore();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [setupId, setSetupId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const inv = await getMemberInvoices(user!.id);
      setInvoices(inv);
    } catch {
      Alert.alert('Error', 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function handlePayNow(invoice: Invoice) {
    setPayingId(invoice.id);
    try {
      const { clientSecret } = await createPaymentIntent(invoice.id);
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'SACDO',
      });
      if (initError) {
        Alert.alert('Error', initError.message);
        return;
      }
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', presentError.message);
        }
      } else {
        Alert.alert('Payment Submitted', 'Your invoice will be marked paid once the payment clears.');
        load();
      }
    } catch (err: any) {
      console.error('handlePayNow error:', err);
      Alert.alert('Error', `Failed to start payment: ${err?.message ?? err}`);
    } finally {
      setPayingId(null);
    }
  }

  async function handleToggleAutoPay(invoice: Invoice) {
    const next = !invoice.autoPayEnabled;

    if (next && !user?.stripePaymentMethodId) {
      // No saved card — collect one via SetupIntent first
      setSetupId(invoice.id);
      try {
        const { setupIntentClientSecret } = await createSetupIntent();
        const { error: initError } = await initPaymentSheet({
          setupIntentClientSecret,
          merchantDisplayName: 'SACDO',
        });
        if (initError) {
          Alert.alert('Error', initError.message);
          return;
        }
        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code !== 'Canceled') {
            Alert.alert('Setup Failed', presentError.message);
          }
          return; // Don't enable auto-pay if card setup failed or was cancelled
        }
        // Card saved — enable auto-pay on this invoice
        await updateAutoPayPreference(invoice.id, true);
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === invoice.id ? { ...inv, autoPayEnabled: true } : inv))
        );
      } catch {
        Alert.alert('Error', 'Failed to set up auto-pay. Please try again.');
      } finally {
        setSetupId(null);
      }
    } else {
      try {
        await updateAutoPayPreference(invoice.id, next);
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === invoice.id ? { ...inv, autoPayEnabled: next } : inv))
        );
      } catch {
        Alert.alert('Error', 'Failed to update auto-pay preference.');
      }
    }
  }

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.row}>
                <Text variant="titleMedium">{item.period}</Text>
                <Chip
                  mode="flat"
                  style={{ backgroundColor: STATUS_COLORS[item.status] }}
                  textStyle={{ fontSize: 11 }}
                >
                  {item.status.toUpperCase()}
                </Chip>
              </View>
              <Text variant="bodyLarge" style={styles.amount}>
                Total Due: ${item.amount.toFixed(2)}
              </Text>
              {item.pastDueAmount > 0 && (
                <View style={styles.pastDueRow}>
                  <Text variant="bodySmall" style={styles.pastDueLabel}>
                    Current: ${item.baseAmount.toFixed(2)}
                  </Text>
                  <Text variant="bodySmall" style={styles.pastDueLabel}>
                    Past Due: ${item.pastDueAmount.toFixed(2)}
                  </Text>
                </View>
              )}
              <Text variant="bodySmall" style={styles.meta}>
                Invoice Date: {item.invoiceDate?.toLocaleDateString()}
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                Due Date: {item.dueDate?.toLocaleDateString()}
              </Text>
              {item.status === 'paid' && item.paidDate && (
                <Text variant="bodySmall" style={styles.meta}>
                  Paid: {item.paidDate.toLocaleDateString()} via {item.paymentMethod}
                </Text>
              )}
              {item.status !== 'paid' && (
                <View style={styles.autoPayRow}>
                  <Text variant="bodySmall">Auto Pay</Text>
                  <Switch
                    value={item.autoPayEnabled ?? false}
                    onValueChange={() => handleToggleAutoPay(item)}
                    disabled={setupId === item.id}
                  />
                </View>
              )}
            </Card.Content>
            {item.status !== 'paid' && (
              <Card.Actions>
                <Button
                  mode="contained"
                  onPress={() => handlePayNow(item)}
                  loading={payingId === item.id}
                  disabled={payingId !== null || setupId !== null}
                >
                  Pay Now
                </Button>
              </Card.Actions>
            )}
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No invoices found.</Text>}
        refreshing={loading}
        onRefresh={load}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1 },
  list: { padding: 12, paddingBottom: 24 },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  amount: { fontWeight: 'bold', marginBottom: 2 },
  pastDueRow: { flexDirection: 'row', gap: 12, marginBottom: 2 },
  pastDueLabel: { color: '#c62828' },
  meta: { color: '#555', marginTop: 2 },
  autoPayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  empty: { textAlign: 'center', marginTop: 48, color: '#888' },
});
