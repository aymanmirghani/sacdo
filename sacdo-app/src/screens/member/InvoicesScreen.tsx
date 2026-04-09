import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  Button,
  Portal,
  Dialog,
  TextInput,
  Switch,
} from 'react-native-paper';
import { Invoice } from '../../types';
import { getMemberInvoices, markInvoicePaid, updateAutoPayPreference } from '../../services/invoices';
import { useAuthStore } from '../../store/useAuthStore';

const STATUS_COLORS: Record<string, string> = {
  pending: '#FFF9C4',
  paid: '#C8E6C9',
  overdue: '#FFCDD2',
};

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

const EMPTY_FORM = { cardNumber: '', expiryDate: '', securityCode: '', billingAddress: '' };

export default function InvoicesScreen() {
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [saving, setSaving] = useState(false);

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

  function openPayDialog(invoice: Invoice) {
    setSelected(invoice);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogVisible(true);
  }

  function validate(): boolean {
    const newErrors: Partial<typeof EMPTY_FORM> = {};
    const digits = form.cardNumber.replace(/\D/g, '');
    if (digits.length < 13) newErrors.cardNumber = 'Enter a valid card number.';

    const expiryParts = form.expiryDate.split('/');
    const month = parseInt(expiryParts[0], 10);
    const year = parseInt(expiryParts[1], 10);
    if (!form.expiryDate || expiryParts.length !== 2 || month < 1 || month > 12 || isNaN(year)) {
      newErrors.expiryDate = 'Enter a valid expiry date (MM/YY).';
    }

    if (form.securityCode.length < 3) newErrors.securityCode = 'Enter a valid security code.';
    if (!form.billingAddress.trim()) newErrors.billingAddress = 'Billing address is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handlePay() {
    if (!selected || !validate()) return;

    setSaving(true);
    try {
      // Card details validated client-side; payment processor integration goes here
      await markInvoicePaid(selected.id, { paymentMethod: 'Credit Card' });
      setDialogVisible(false);
      Alert.alert('Success', 'Payment recorded successfully.');
      load();
    } catch {
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAutoPay(invoice: Invoice) {
    const next = !invoice.autoPayEnabled;
    try {
      await updateAutoPayPreference(invoice.id, next);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoice.id ? { ...inv, autoPayEnabled: next } : inv))
      );
    } catch {
      Alert.alert('Error', 'Failed to update auto-pay preference.');
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
                    onValueChange={() => toggleAutoPay(item)}
                  />
                </View>
              )}
            </Card.Content>
            {item.status !== 'paid' && (
              <Card.Actions>
                <Button mode="contained" onPress={() => openPayDialog(item)}>
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

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Pay Invoice — {selected?.period}</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text variant="bodyMedium" style={styles.dialogAmount}>
                Amount: ${selected?.amount.toFixed(2)}
              </Text>
              <Text variant="labelMedium" style={styles.methodLabel}>
                Payment Method: Credit Card
              </Text>

              <TextInput
                label="Card Number *"
                value={form.cardNumber}
                onChangeText={(v) => {
                  setForm({ ...form, cardNumber: formatCardNumber(v) });
                  setErrors({ ...errors, cardNumber: undefined });
                }}
                keyboardType="number-pad"
                style={styles.input}
                maxLength={19}
                error={!!errors.cardNumber}
              />
              {errors.cardNumber ? <Text style={styles.errorText}>{errors.cardNumber}</Text> : null}

              <TextInput
                label="Expiration Date * (MM/YY)"
                value={form.expiryDate}
                onChangeText={(v) => {
                  setForm({ ...form, expiryDate: formatExpiry(v) });
                  setErrors({ ...errors, expiryDate: undefined });
                }}
                keyboardType="number-pad"
                style={styles.input}
                maxLength={5}
                error={!!errors.expiryDate}
              />
              {errors.expiryDate ? <Text style={styles.errorText}>{errors.expiryDate}</Text> : null}

              <TextInput
                label="Security Code *"
                value={form.securityCode}
                onChangeText={(v) => {
                  setForm({ ...form, securityCode: v.replace(/\D/g, '').slice(0, 4) });
                  setErrors({ ...errors, securityCode: undefined });
                }}
                keyboardType="number-pad"
                style={styles.input}
                maxLength={4}
                secureTextEntry
                error={!!errors.securityCode}
              />
              {errors.securityCode ? <Text style={styles.errorText}>{errors.securityCode}</Text> : null}

              <TextInput
                label="Billing Address *"
                value={form.billingAddress}
                onChangeText={(v) => {
                  setForm({ ...form, billingAddress: v });
                  setErrors({ ...errors, billingAddress: undefined });
                }}
                style={styles.input}
                multiline
                error={!!errors.billingAddress}
              />
              {errors.billingAddress ? <Text style={styles.errorText}>{errors.billingAddress}</Text> : null}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handlePay} loading={saving} disabled={saving}>
              Pay
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  dialogScroll: { maxHeight: 480 },
  dialogAmount: { marginBottom: 4, fontWeight: 'bold' },
  methodLabel: { color: '#555', marginBottom: 12 },
  input: { marginBottom: 2 },
  errorText: { color: '#c62828', fontSize: 12, marginBottom: 10, marginTop: 2 },
});
