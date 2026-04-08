import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, TextInput, Portal, Dialog, FAB } from 'react-native-paper';
import { PaymentType } from '../../types';
import { getPaymentTypes, upsertPaymentType, deletePaymentType } from '../../services/members';

export default function PaymentTypesScreen() {
  const [types, setTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingType, setEditingType] = useState<PaymentType | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setTypes(await getPaymentTypes());
    } catch {
      Alert.alert('Error', 'Failed to load payment types.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditingType(null);
    setName('');
    setDialogVisible(true);
  }

  function openEdit(pt: PaymentType) {
    setEditingType(pt);
    setName(pt.name);
    setDialogVisible(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }
    setSaving(true);
    try {
      await upsertPaymentType({ id: editingType?.id, name: name.trim() });
      setDialogVisible(false);
      load();
    } catch {
      Alert.alert('Error', 'Failed to save payment type.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(pt: PaymentType) {
    Alert.alert(
      'Delete Payment Type',
      `Delete "${pt.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePaymentType(pt.id);
              setTypes((prev) => prev.filter((t) => t.id !== pt.id));
            } catch {
              Alert.alert('Error', 'Failed to delete payment type.');
            }
          },
        },
      ]
    );
  }

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={types}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium">{item.name}</Text>
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => openEdit(item)}>Edit</Button>
              <Button textColor="#c62828" onPress={() => confirmDelete(item)}>Delete</Button>
            </Card.Actions>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No payment types configured yet.</Text>}
        refreshing={loading}
        onRefresh={load}
      />

      <FAB icon="plus" style={styles.fab} onPress={openNew} label="Add Payment Type" />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editingType ? 'Edit Payment Type' : 'New Payment Type'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Cash, Cheque, Bank Transfer"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSave} loading={saving} disabled={saving}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1 },
  list: { padding: 12, paddingBottom: 80 },
  card: { marginBottom: 8 },
  empty: { textAlign: 'center', marginTop: 48, color: '#888' },
  fab: { position: 'absolute', bottom: 16, right: 16 },
  input: { marginBottom: 4 },
});
