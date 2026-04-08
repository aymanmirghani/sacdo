import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, ActivityIndicator, Divider } from 'react-native-paper';
import { MembershipFee, Payment } from '../../types';
import { getMembershipFees, getMemberPayments } from '../../services/members';
import { useAuthStore } from '../../store/useAuthStore';

export default function MembershipFeesScreen() {
  const { user } = useAuthStore();
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMembershipFees(), getMemberPayments(user!.id)]).then(([f, p]) => {
      setFees(f);
      setPayments(p);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.section}>Fee Schedule</Text>
      {fees.map((fee) => (
        <Card key={fee.id} style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">{fee.membershipType}</Text>
            <Text variant="bodyLarge">${fee.amount.toFixed(2)}</Text>
            {fee.description ? <Text variant="bodySmall">{fee.description}</Text> : null}
          </Card.Content>
        </Card>
      ))}

      <Divider style={styles.divider} />

      <Text variant="titleLarge" style={styles.section}>My Payment History</Text>
      {payments.length === 0 ? (
        <Text style={styles.empty}>No payments recorded.</Text>
      ) : (
        payments.map((p) => (
          <Card key={p.id} style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall">{p.membershipType}</Text>
              <Text variant="bodyLarge">${p.amount.toFixed(2)}</Text>
              <Text variant="bodySmall">{p.paymentDate?.toLocaleDateString()}</Text>
              {p.notes ? <Text variant="bodySmall">{p.notes}</Text> : null}
            </Card.Content>
          </Card>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  center: { flex: 1 },
  section: { fontWeight: 'bold', marginBottom: 8, marginTop: 4 },
  card: { marginBottom: 8 },
  divider: { marginVertical: 16 },
  empty: { color: '#888', textAlign: 'center', marginTop: 8 },
});
