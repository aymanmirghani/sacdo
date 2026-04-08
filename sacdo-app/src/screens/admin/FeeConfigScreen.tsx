import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, TextInput, Portal, Dialog, FAB } from 'react-native-paper';
import { MembershipFee } from '../../types';
import { getMembershipFees, upsertMembershipFee } from '../../services/members';

export default function FeeConfigScreen() {
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingFee, setEditingFee] = useState<MembershipFee | null>(null);
  const [form, setForm] = useState({ membershipType: '', amount: '', description: '' });

  async function load() {
    setLoading(true);
    const data = await getMembershipFees();
    setFees(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditingFee(null);
    setForm({ membershipType: '', amount: '', description: '' });
    setDialogVisible(true);
  }

  function openEdit(fee: MembershipFee) {
    setEditingFee(fee);
    setForm({ membershipType: fee.membershipType, amount: fee.amount.toString(), description: fee.description });
    setDialogVisible(true);
  }

  async function handleSave() {
    if (!form.membershipType.trim() || !form.amount.trim()) {
      Alert.alert('Error', 'Membership type and amount are required.');
      return;
    }
    try {
      await upsertMembershipFee({
        id: editingFee?.id,
        membershipType: form.membershipType.trim(),
        amount: parseFloat(form.amount),
        description: form.description.trim(),
      });
      setDialogVisible(false);
      load();
    } catch {
      Alert.alert('Error', 'Failed to save fee configuration.');
    }
  }

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={fees}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium">{item.membershipType}</Text>
              <Text variant="bodyLarge">${item.amount.toFixed(2)}</Text>
              {item.description ? <Text variant="bodySmall">{item.description}</Text> : null}
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => openEdit(item)}>Edit</Button>
            </Card.Actions>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No fee types configured yet.</Text>}
        refreshing={loading}
        onRefresh={load}
      />
      <FAB icon="plus" style={styles.fab} onPress={openNew} label="Add Fee Type" />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editingFee ? 'Edit Fee' : 'New Fee Type'}</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Membership Type" value={form.membershipType} onChangeText={(v) => setForm({ ...form, membershipType: v })} style={styles.input} />
            <TextInput label="Amount ($)" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} keyboardType="decimal-pad" style={styles.input} />
            <TextInput label="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} style={styles.input} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSave}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1 },
  card: { margin: 12, marginBottom: 0 },
  empty: { textAlign: 'center', marginTop: 48, color: '#888' },
  fab: { position: 'absolute', bottom: 16, right: 16 },
  input: { marginBottom: 12 },
});
