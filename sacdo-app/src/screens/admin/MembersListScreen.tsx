import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Searchbar, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { User, AdminStackParamList } from '../../types';
import { getAllMembers, setMemberStatus } from '../../services/members';

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export default function MembersListScreen() {
  const navigation = useNavigation<Nav>();
  const [members, setMembers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  async function toggleStatus(member: User) {
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    Alert.alert(
      `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Member`,
      `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} ${member.firstName} ${member.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(member.id);
            try {
              await setMemberStatus(member.id, newStatus);
              setMembers((prev) =>
                prev.map((m) => (m.id === member.id ? { ...m, status: newStatus } : m))
              );
            } catch {
              Alert.alert('Error', 'Failed to update member status.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
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
                <Chip
                  mode="flat"
                  style={{ backgroundColor: item.status === 'active' ? '#C8E6C9' : '#FFCDD2' }}
                  textStyle={{ fontSize: 11 }}
                >
                  {item.status}
                </Chip>
              </View>
              <Text variant="bodySmall">{item.phone}</Text>
              <Text variant="bodySmall">{item.email}</Text>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="outlined"
                onPress={() =>
                  navigation.navigate('MemberPayments', {
                    memberId: item.id,
                    memberName: `${item.firstName} ${item.lastName}`,
                  })
                }
              >
                Payments
              </Button>
              <Button
                mode="outlined"
                onPress={() =>
                  navigation.navigate('MemberInvoices', {
                    memberId: item.id,
                    memberName: `${item.firstName} ${item.lastName}`,
                  })
                }
              >
                Invoices
              </Button>
              <Button
                mode="outlined"
                loading={actionLoading === item.id}
                disabled={!!actionLoading}
                onPress={() => toggleStatus(item)}
              >
                {item.status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
            </Card.Actions>
          </Card>
        )}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<Text style={styles.empty}>No members found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1 },
  search: { margin: 12 },
  card: { marginHorizontal: 12, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  empty: { textAlign: 'center', marginTop: 48, color: '#888' },
});
