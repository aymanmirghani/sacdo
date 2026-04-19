import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { Text, Button, ActivityIndicator, Icon } from 'react-native-paper';
import { useAuthStore } from '../../store/useAuthStore';
import { lockApp } from '../../services/auth';
import { getMemberTotalDue } from '../../services/invoices';

export default function HomeScreen() {
  const { user, setUser, setBiometricLocked, clear } = useAuthStore();
  const [totalDue, setTotalDue] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const amount = await getMemberTotalDue(user!.id);
      setTotalDue(amount);
    } catch {
      setTotalDue(null);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function handleSignOut() {
    await lockApp({ setUser, setBiometricLocked, clear });
  }

  const fmt = (amount: number) =>
    `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <Text variant="headlineMedium" style={styles.title}>
        Welcome, {user?.firstName}!
      </Text>
      <Text variant="bodyMedium" style={styles.hint}>
        Use the tabs below to view upcoming events and your membership fees.
      </Text>

      {/* Total Due Card */}
      <View style={[styles.card, totalDue && totalDue > 0 ? styles.cardDue : styles.cardClear]}>
        <View style={[styles.iconBox, { backgroundColor: totalDue && totalDue > 0 ? '#FFEBEE' : '#E8F5E9' }]}>
          <Icon
            source={totalDue && totalDue > 0 ? 'alert-circle-outline' : 'check-circle-outline'}
            size={28}
            color={totalDue && totalDue > 0 ? '#C62828' : '#2E7D32'}
          />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardLabel}>Total Due</Text>
          {totalDue === null ? (
            <ActivityIndicator size="small" style={styles.loader} />
          ) : (
            <>
              <Text style={[styles.cardAmount, { color: totalDue > 0 ? '#C62828' : '#2E7D32' }]}>
                {fmt(totalDue)}
              </Text>
              <Text style={styles.cardSub}>
                {totalDue > 0 ? 'Outstanding balance' : 'All invoices paid'}
              </Text>
            </>
          )}
        </View>
      </View>

      <Button mode="outlined" onPress={handleSignOut} style={styles.signOut}>
        Sign Out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F4F6F9' },
  container: { padding: 24 },
  title: { fontWeight: 'bold', marginBottom: 8, color: '#263238' },
  hint: { color: '#666', marginBottom: 28 },

  card: {
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    borderLeftWidth: 5,
  },
  cardDue: { backgroundColor: '#fff', borderLeftColor: '#C62828' },
  cardClear: { backgroundColor: '#fff', borderLeftColor: '#2E7D32' },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 13, color: '#78909C', marginBottom: 4 },
  cardAmount: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  cardSub: { fontSize: 12, color: '#90A4AE', marginTop: 2 },
  loader: { alignSelf: 'flex-start', marginTop: 4 },

  signOut: { alignSelf: 'flex-start' },
});
