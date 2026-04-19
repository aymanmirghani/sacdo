import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, TextInput, Portal, Dialog } from 'react-native-paper';
import { RegistrationRequest } from '../../types';
import { getPendingRequests, approveRegistration, rejectRegistration } from '../../services/members';
import { useAuthStore } from '../../store/useAuthStore';

export default function RegistrationRequestsScreen() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ visible: boolean; requestId: string | null }>({ visible: false, requestId: null });
  const [rejectionReason, setRejectionReason] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await getPendingRequests();
      setRequests(data);
    } catch {
      Alert.alert('Error', 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(requestId: string) {
    setActionLoading(requestId);
    try {
      await approveRegistration(requestId, user!.id);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      Alert.alert('Approved', 'Member has been approved and notified.');
    } catch {
      Alert.alert('Error', 'Failed to approve request.');
    } finally {
      setActionLoading(null);
    }
  }

  function openRejectDialog(requestId: string) {
    setRejectionReason('');
    setRejectDialog({ visible: true, requestId });
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please enter a reason for rejection.');
      return;
    }
    const requestId = rejectDialog.requestId!;
    setRejectDialog({ visible: false, requestId: null });
    setActionLoading(requestId);
    try {
      await rejectRegistration(requestId, user!.id, rejectionReason.trim());
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      Alert.alert('Rejected', 'The applicant has been notified.');
    } catch {
      Alert.alert('Error', 'Failed to reject request.');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      {requests.length === 0 ? (
        <Text style={styles.empty}>No pending registration requests.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium">{item.firstName} {item.lastName}</Text>
                <Text variant="bodySmall">{item.phone}</Text>
                <Text variant="bodySmall">{item.email}</Text>
                <Text variant="bodySmall" style={styles.date}>
                  Submitted: {item.submittedAt?.toLocaleDateString()}
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="contained"
                  loading={actionLoading === item.id}
                  disabled={!!actionLoading}
                  onPress={() => handleApprove(item.id)}
                >
                  Approve
                </Button>
                <Button
                  mode="outlined"
                  disabled={!!actionLoading}
                  onPress={() => openRejectDialog(item.id)}
                >
                  Reject
                </Button>
              </Card.Actions>
            </Card>
          )}
          refreshing={loading}
          onRefresh={load}
        />
      )}

      <Portal>
        <Dialog visible={rejectDialog.visible} onDismiss={() => setRejectDialog({ visible: false, requestId: null })}>
          <Dialog.Title>Reject Request</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Reason for rejection"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRejectDialog({ visible: false, requestId: null })}>Cancel</Button>
            <Button onPress={handleReject}>Confirm Reject</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 48, color: '#888' },
  card: { margin: 12, marginBottom: 0 },
  date: { color: '#888', marginTop: 4 },
});
