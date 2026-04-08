import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Card, Button, ActivityIndicator, TextInput, Portal, Dialog, Menu } from 'react-native-paper';
import { Payment, User } from '../../types';
import { getMemberPayments, recordPayment, getAllMembers, getMembershipFees, getPaymentTypes } from '../../services/members';
import { useAuthStore } from '../../store/useAuthStore';

export default function PaymentsScreen() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<User[]>([]);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [memberMenuVisible, setMemberMenuVisible] = useState(false);
  const [feeTypeMenuVisible, setFeeTypeMenuVisible] = useState(false);
  const [paymentTypeMenuVisible, setPaymentTypeMenuVisible] = useState(false);
  const [feeTypes, setFeeTypes] = useState<string[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<string[]>([]);
  const [form, setForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    membershipType: '',
    paymentType: '',
    notes: '',
  });

  useEffect(() => {
    Promise.all([getAllMembers(), getMembershipFees(), getPaymentTypes()])
      .then(([m, f, pt]) => {
        setMembers(m);
        setFeeTypes(f.map((fee) => fee.membershipType));
        setPaymentTypes(pt.map((t) => t.name));
      })
      .catch(() => Alert.alert('Error', 'Failed to load members.'))
      .finally(() => setLoadingMembers(false));
  }, []);

  async function loadPayments(member: User) {
    setSelectedMember(member);
    setLoadingPayments(true);
    const data = await getMemberPayments(member.id);
    setPayments(data);
    setLoadingPayments(false);
  }

  function openDialog() {
    setForm({
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      membershipType: feeTypes[0] ?? '',
      paymentType: paymentTypes[0] ?? '',
      notes: '',
    });
    setDialogVisible(true);
  }

  async function handleRecord() {
    if (!selectedMember || !form.amount || !form.paymentDate || !form.membershipType) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    try {
      await recordPayment({
        memberId: selectedMember.id,
        amount: parseFloat(form.amount),
        paymentDate: new Date(form.paymentDate + 'T00:00:00'),
        recordedBy: user!.id,
        membershipType: form.membershipType,
        paymentType: form.paymentType || undefined,
        notes: form.notes,
      });
      setDialogVisible(false);
      Alert.alert('Success', 'Payment recorded.');
      loadPayments(selectedMember);
    } catch {
      Alert.alert('Error', 'Failed to record payment.');
    }
  }

  if (loadingMembers) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <View style={styles.selector}>
        <Text variant="labelLarge">Member:</Text>
        <Menu
          visible={memberMenuVisible}
          onDismiss={() => setMemberMenuVisible(false)}
          anchor={
            <Button mode="outlined" onPress={() => setMemberMenuVisible(true)} style={styles.memberBtn}>
              {selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : 'Select member'}
            </Button>
          }
        >
          {members.map((m) => (
            <Menu.Item
              key={m.id}
              title={`${m.firstName} ${m.lastName}`}
              onPress={() => { setMemberMenuVisible(false); loadPayments(m); }}
            />
          ))}
        </Menu>
      </View>

      {selectedMember && (
        <Button mode="contained" onPress={openDialog} style={styles.recordBtn}>
          Record Payment
        </Button>
      )}

      {loadingPayments ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleSmall">{item.membershipType}</Text>
                <Text variant="bodyLarge">${item.amount.toFixed(2)}</Text>
                <Text variant="bodySmall">Date: {item.paymentDate?.toLocaleDateString()}</Text>
                {item.notes ? <Text variant="bodySmall">Notes: {item.notes}</Text> : null}
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            selectedMember ? <Text style={styles.empty}>No payments recorded.</Text> : null
          }
        />
      )}

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Record Payment</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput
                label="Amount ($) *"
                value={form.amount}
                onChangeText={(v) => setForm({ ...form, amount: v })}
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <TextInput
                label="Payment Date * (YYYY-MM-DD)"
                value={form.paymentDate}
                onChangeText={(v) => setForm({ ...form, paymentDate: v })}
                keyboardType="numbers-and-punctuation"
                style={styles.input}
              />
              <Text variant="labelMedium" style={styles.fieldLabel}>Membership Type *</Text>
              <Menu
                visible={feeTypeMenuVisible}
                onDismiss={() => setFeeTypeMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setFeeTypeMenuVisible(true)}
                    style={styles.feeTypeBtn}
                    contentStyle={styles.feeTypeBtnContent}
                  >
                    {form.membershipType || 'Select type'}
                  </Button>
                }
              >
                {feeTypes.map((ft) => (
                  <Menu.Item
                    key={ft}
                    title={ft}
                    onPress={() => { setFeeTypeMenuVisible(false); setForm({ ...form, membershipType: ft }); }}
                  />
                ))}
                {feeTypes.length === 0 && (
                  <Menu.Item title="No fee types configured" disabled />
                )}
              </Menu>
              <Text variant="labelMedium" style={styles.fieldLabel}>Payment Type</Text>
              <Menu
                visible={paymentTypeMenuVisible}
                onDismiss={() => setPaymentTypeMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setPaymentTypeMenuVisible(true)}
                    style={styles.feeTypeBtn}
                    contentStyle={styles.feeTypeBtnContent}
                  >
                    {form.paymentType || 'Select payment type'}
                  </Button>
                }
              >
                {paymentTypes.map((pt) => (
                  <Menu.Item
                    key={pt}
                    title={pt}
                    onPress={() => { setPaymentTypeMenuVisible(false); setForm({ ...form, paymentType: pt }); }}
                  />
                ))}
                {paymentTypes.length === 0 && (
                  <Menu.Item title="No payment types configured" disabled />
                )}
              </Menu>
              <TextInput
                label="Notes (optional)"
                value={form.notes}
                onChangeText={(v) => setForm({ ...form, notes: v })}
                multiline
                style={[styles.input, styles.notesInput]}
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleRecord}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1 },
  selector: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  memberBtn: { flex: 1 },
  recordBtn: { marginHorizontal: 12, marginBottom: 8 },
  card: { marginHorizontal: 12, marginBottom: 8 },
  empty: { textAlign: 'center', marginTop: 48, color: '#888' },
  dialogScroll: { maxHeight: 400 },
  input: { marginBottom: 12 },
  notesInput: { marginTop: 12 },
  fieldLabel: { color: '#555', marginBottom: 4 },
  feeTypeBtn: { marginBottom: 4, alignSelf: 'stretch' },
  feeTypeBtnContent: { justifyContent: 'flex-start' },
});
