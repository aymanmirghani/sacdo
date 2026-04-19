import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Searchbar, Chip, Portal, Dialog, TextInput, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { User, AdminStackParamList } from '../../types';
import { getAllMembers, updateMember } from '../../services/members';

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export default function MembersListScreen() {
  const navigation = useNavigation<Nav>();
  const [members, setMembers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Edit dialog state
  const [editMember, setEditMember] = useState<User | null>(null);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getAllMembers();
      setMembers(data);
      setFiltered(data);
    } catch {
      Alert.alert('Error', 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      members.filter(
        (m) =>
          m.firstName.toLowerCase().includes(q) ||
          m.lastName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.phone.includes(q)
      )
    );
  }, [search, members]);

  function openEdit(member: User) {
    setEditFirst(member.firstName);
    setEditLast(member.lastName);
    setEditPhone(member.phone);
    setEditEmail(member.email);
    setEditIsAdmin(member.isAdmin);
    setEditStatus(member.status);
    setEditMember(member);
  }

  async function handleSaveEdit() {
    if (!editMember) return;
    if (!editFirst.trim() || !editLast.trim() || !editPhone.trim() || !editEmail.trim()) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }
    setEditSaving(true);
    try {
      await updateMember(editMember.id, {
        firstName: editFirst.trim(),
        lastName: editLast.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        isAdmin: editIsAdmin,
        status: editStatus,
      });
      setEditMember(null);
      load();
    } catch {
      Alert.alert('Error', 'Failed to update member.');
    } finally {
      setEditSaving(false);
    }
  }

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search members..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.row}>
                <Text variant="titleMedium">{item.firstName} {item.lastName}</Text>
                <View style={styles.chips}>
                  {item.isAdmin && (
                    <Chip
                      compact
                      mode="flat"
                      style={styles.adminChip}
                      textStyle={{ fontSize: 10, color: '#fff' }}
                    >
                      Admin
                    </Chip>
                  )}
                  <Chip
                    compact
                    mode="flat"
                    style={{ backgroundColor: item.status === 'active' ? '#C8E6C9' : '#FFCDD2' }}
                    textStyle={{ fontSize: 10 }}
                  >
                    {item.status}
                  </Chip>
                </View>
              </View>
              <Text variant="bodySmall">{item.phone}</Text>
              <Text variant="bodySmall">{item.email}</Text>
            </Card.Content>
            <View style={styles.actions}>
              <Button
                mode="outlined"
                style={styles.actionBtn}
                contentStyle={styles.actionBtnContent}
                onPress={() => openEdit(item)}
              >
                Edit
              </Button>
              <Button
                mode="outlined"
                style={styles.actionBtn}
                contentStyle={styles.actionBtnContent}
                onPress={() =>
                  navigation.navigate('MemberInvoices', {
                    memberId: item.id,
                    memberName: `${item.firstName} ${item.lastName}`,
                  })
                }
              >
                Invoices
              </Button>
            </View>
          </Card>
        )}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<Text style={styles.empty}>No members found.</Text>}
      />

      <Portal>
        <Dialog visible={!!editMember} onDismiss={() => setEditMember(null)}>
          <Dialog.Title>Edit Member</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput
                label="First Name"
                value={editFirst}
                onChangeText={setEditFirst}
                style={styles.input}
              />
              <TextInput
                label="Last Name"
                value={editLast}
                onChangeText={setEditLast}
                style={styles.input}
              />
              <TextInput
                label="Phone"
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                style={styles.input}
              />
              <TextInput
                label="Email"
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
              <View style={styles.switchRow}>
                <Text variant="bodyMedium">Administrator</Text>
                <Switch value={editIsAdmin} onValueChange={setEditIsAdmin} />
              </View>
              <View style={styles.switchRow}>
                <Text variant="bodyMedium">Active</Text>
                <Switch
                  value={editStatus === 'active'}
                  onValueChange={(v) => setEditStatus(v ? 'active' : 'inactive')}
                />
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setEditMember(null)}>Cancel</Button>
            <Button onPress={handleSaveEdit} loading={editSaving} disabled={editSaving}>
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
  search: { margin: 12 },
  card: { marginHorizontal: 12, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chips: { flexDirection: 'row', gap: 4, alignItems: 'center', flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },
  adminChip: { backgroundColor: '#5C6BC0' },
  actions: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 8, gap: 6 },
  actionBtn: { flex: 1 },
  actionBtnContent: { paddingHorizontal: 0 },
  empty: { textAlign: 'center', marginTop: 48, color: '#888' },
  dialogScroll: { maxHeight: 420 },
  input: { marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
});
