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
  Menu,
  FAB,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList, Invoice } from '../../types';
import { getAllInvoicesForMember, markInvoicePaid, generateInvoicesOnDemand } from '../../services/invoices';
import { getPaymentTypes } from '../../services/members';
import { useAuthStore } from '../../store/useAuthStore';

type Props = NativeStackScreenProps<AdminStackParamList, 'MemberInvoices'>;

const STATUS_COLORS: Record<string, string> = {
  pending: '#FFF9C4',
  paid: '#C8E6C9',
  overdue: '#FFCDD2',
};

function getPeriodOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return options;
}

const PERIOD_OPTIONS = getPeriodOptions();

export default function MemberInvoicesScreen({ route }: Props) {
  const { memberId, memberName } = route.params;
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentTypes, setPaymentTypes] = useState<string[]>([]);

  // Mark as paid dialog
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [payMethod, setPayMethod] = useState('');
  const [payMethodMenuVisible, setPayMethodMenuVisible] = useState(false);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Generate invoice dialog
  const [generateDialogVisible, setGenerateDialogVisible] = useState(false);
  const [generatePeriod, setGeneratePeriod] = useState(PERIOD_OPTIONS[0]);
  const [generatePeriodMenuVisible, setGeneratePeriodMenuVisible] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, pt] = await Promise.all([
        getAllInvoicesForMember(memberId),
        getPaymentTypes(),
      ]);
      setInvoices(inv);
      setPaymentTypes(pt.map((t) => t.name));
    } catch {
      Alert.alert('Error', 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  function openMarkPaid(invoice: Invoice) {
    setSelected(invoice);
    setPayMethod(paymentTypes[0] ?? '');
    setReference('');
    setNotes('');
    setDialogVisible(true);
  }

  async function handleMarkPaid() {
    if (!selected || !payMethod) {
      Alert.alert('Error', 'Please select a payment method.');
      return;
    }
    setSaving(true);
    try {
      await markInvoicePaid(selected.id, {
        paymentMethod: payMethod,
        paymentReference: reference,
        notes,
        processedBy: `${user!.firstName} ${user!.lastName}`,
      });
      setDialogVisible(false);
      load();
    } catch {
      Alert.alert('Error', 'Failed to mark invoice as paid.');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generateInvoicesOnDemand(memberId, generatePeriod);
      setGenerateDialogVisible(false);
      if (result.created === 0) {
        Alert.alert('Info', `An invoice for ${generatePeriod} already exists for this member.`);
      } else {
        Alert.alert('Success', `Invoice for ${generatePeriod} generated successfully.`);
        load();
      }
    } catch {
      Alert.alert('Error', 'Failed to generate invoice. Make sure invoice configuration is set up.');
    } finally {
      setGenerating(false);
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
                ${item.amount.toFixed(2)}
              </Text>
              {item.pastDueAmount > 0 && (
                <Text variant="bodySmall" style={styles.pastDue}>
                  Includes ${item.pastDueAmount.toFixed(2)} past due
                </Text>
              )}
              <Text variant="bodySmall" style={styles.meta}>
                Invoice: {item.invoiceDate?.toLocaleDateString()}
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                Due: {item.dueDate?.toLocaleDateString()}
              </Text>
              {item.generatedBy ? (
                <Text variant="bodySmall" style={styles.meta}>
                  Generated by: {item.generatedBy}
                </Text>
              ) : null}
              {item.status === 'paid' && item.paidDate && (
                <>
                  <Text variant="bodySmall" style={styles.meta}>
                    Paid: {item.paidDate.toLocaleDateString()} via {item.paymentMethod}
                  </Text>
                  {item.processedBy ? (
                    <Text variant="bodySmall" style={styles.meta}>
                      Processed by: {item.processedBy}
                    </Text>
                  ) : null}
                  {item.paymentReference ? (
                    <Text variant="bodySmall" style={styles.meta}>
                      Ref: {item.paymentReference}
                    </Text>
                  ) : null}
                  {item.notes ? (
                    <Text variant="bodySmall" style={styles.meta}>
                      Notes: {item.notes}
                    </Text>
                  ) : null}
                </>
              )}
            </Card.Content>
            {item.status !== 'paid' && (
              <Card.Actions>
                <Button mode="outlined" onPress={() => openMarkPaid(item)}>
                  Mark as Paid
                </Button>
              </Card.Actions>
            )}
          </Card>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No invoices for {memberName}.</Text>
        }
        refreshing={loading}
        onRefresh={load}
      />

      <FAB
        icon="file-plus"
        label="Generate Invoice"
        loading={generating}
        disabled={generating}
        style={styles.fab}
        onPress={() => setGenerateDialogVisible(true)}
      />

      <Portal>
        {/* Generate invoice dialog */}
        <Dialog visible={generateDialogVisible} onDismiss={() => setGenerateDialogVisible(false)}>
          <Dialog.Title>Generate Invoice</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogSubtitle}>
              Select the period to generate an invoice for {memberName}.
            </Text>
            <Text variant="labelMedium" style={styles.fieldLabel}>Period</Text>
            <Menu
              visible={generatePeriodMenuVisible}
              onDismiss={() => setGeneratePeriodMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setGeneratePeriodMenuVisible(true)}
                  style={styles.menuBtn}
                  contentStyle={styles.menuBtnContent}
                >
                  {generatePeriod}
                </Button>
              }
            >
              {PERIOD_OPTIONS.map((p) => (
                <Menu.Item
                  key={p}
                  title={p}
                  onPress={() => { setGeneratePeriodMenuVisible(false); setGeneratePeriod(p); }}
                />
              ))}
            </Menu>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setGenerateDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleGenerate} loading={generating} disabled={generating}>
              Generate
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Mark as paid dialog */}
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Mark Invoice as Paid</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text variant="bodyMedium" style={styles.dialogAmount}>
                {selected?.period} — ${selected?.amount.toFixed(2)}
              </Text>

              <Text variant="labelMedium" style={styles.fieldLabel}>Payment Method *</Text>
              <Menu
                visible={payMethodMenuVisible}
                onDismiss={() => setPayMethodMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setPayMethodMenuVisible(true)}
                    style={styles.menuBtn}
                    contentStyle={styles.menuBtnContent}
                  >
                    {payMethod || 'Select method'}
                  </Button>
                }
              >
                {paymentTypes.map((pt) => (
                  <Menu.Item
                    key={pt}
                    title={pt}
                    onPress={() => { setPayMethodMenuVisible(false); setPayMethod(pt); }}
                  />
                ))}
                {paymentTypes.length === 0 && (
                  <Menu.Item title="No payment types configured" disabled />
                )}
              </Menu>

              <TextInput
                label="Reference Number (optional)"
                value={reference}
                onChangeText={setReference}
                style={styles.input}
              />
              <TextInput
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                multiline
                style={styles.input}
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleMarkPaid} loading={saving} disabled={saving}>
              Save
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
  list: { padding: 12, paddingBottom: 90 },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  amount: { fontWeight: 'bold', marginBottom: 2 },
  pastDue: { color: '#c62828', marginBottom: 2 },
  meta: { color: '#555', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 48, color: '#888' },
  fab: { position: 'absolute', bottom: 16, right: 16 },
  dialogSubtitle: { marginBottom: 16, color: '#555' },
  dialogScroll: { maxHeight: 380 },
  dialogAmount: { marginBottom: 12, fontWeight: 'bold' },
  fieldLabel: { color: '#555', marginBottom: 4 },
  menuBtn: { marginBottom: 12, alignSelf: 'stretch' },
  menuBtnContent: { justifyContent: 'flex-start' },
  input: { marginBottom: 12 },
});
