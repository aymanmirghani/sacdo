import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, ActivityIndicator, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/useAuthStore';
import { lockApp } from '../../services/auth';
import { getDashboardStats, DashboardStats } from '../../services/invoices';
import { AdminStackParamList, InvoiceFilter } from '../../types';

type Nav = NativeStackNavigationProp<AdminStackParamList>;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getMonthLabel(offset: 0 | -1) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return MONTHS[d.getMonth()];
}

function fmt(amount: number) {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface StatCardProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  count: number | string;
  amount?: string;
  onPress?: () => void;
  accent: string;
}

function StatCard({ icon, iconColor, iconBg, label, count, amount, onPress, accent }: StatCardProps) {
  const inner = (
    <View style={[styles.card, { borderLeftColor: accent, borderLeftWidth: 4 }]}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Icon source={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardCount}>{count}</Text>
        {amount !== undefined && <Text style={[styles.cardAmount, { color: accent }]}>{amount}</Text>}
      </View>
      {onPress && (
        <View style={styles.chevron}>
          <Icon source="chevron-right" size={20} color="#bbb" />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.cardWrapper}>
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={styles.cardWrapper}>{inner}</View>;
}

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

export default function AdminDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { user, setUser, setBiometricLocked, clear } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch {
      Alert.alert('Error', 'Failed to load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function go(filter: InvoiceFilter, title: string) {
    navigation.navigate('InvoiceList', { filter, title });
  }

  async function handleSignOut() {
    await lockApp({ setUser, setBiometricLocked, clear });
  }

  const thisMonth = getMonthLabel(0);
  const lastMonth = getMonthLabel(-1);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome, {user?.firstName}</Text>
          <Text style={styles.subtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Icon source="logout" size={20} color="#fff" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        >
          {/* Members */}
          <SectionLabel title="MEMBERS" />
          <StatCard
            icon="account-group"
            iconColor="#1565C0"
            iconBg="#E3F2FD"
            accent="#1565C0"
            label="Active Members"
            count={stats?.activeMembers ?? 0}
          />

          {/* This Month */}
          <SectionLabel title={`THIS MONTH — ${thisMonth.toUpperCase()}`} />
          <StatCard
            icon="file-document-outline"
            iconColor="#546E7A"
            iconBg="#ECEFF1"
            accent="#546E7A"
            label="Generated"
            count={`${stats?.thisMonth.count ?? 0} invoices`}
            amount={fmt(stats?.thisMonth.amount ?? 0)}
            onPress={() => go('generatedThisMonth', `Generated — ${thisMonth}`)}
          />
          <StatCard
            icon="check-circle-outline"
            iconColor="#2E7D32"
            iconBg="#E8F5E9"
            accent="#2E7D32"
            label="Paid"
            count={`${stats?.paidThisMonth.count ?? 0} invoices`}
            amount={fmt(stats?.paidThisMonth.amount ?? 0)}
            onPress={() => go('paidThisMonth', `Paid — ${thisMonth}`)}
          />

          {/* Last Month */}
          <SectionLabel title={`LAST MONTH — ${lastMonth.toUpperCase()}`} />
          <StatCard
            icon="file-document-outline"
            iconColor="#546E7A"
            iconBg="#ECEFF1"
            accent="#546E7A"
            label="Generated"
            count={`${stats?.lastMonth.count ?? 0} invoices`}
            amount={fmt(stats?.lastMonth.amount ?? 0)}
            onPress={() => go('generatedLastMonth', `Generated — ${lastMonth}`)}
          />
          <StatCard
            icon="check-circle-outline"
            iconColor="#2E7D32"
            iconBg="#E8F5E9"
            accent="#2E7D32"
            label="Paid"
            count={`${stats?.paidLastMonth.count ?? 0} invoices`}
            amount={fmt(stats?.paidLastMonth.amount ?? 0)}
            onPress={() => go('paidLastMonth', `Paid — ${lastMonth}`)}
          />

          {/* Outstanding */}
          <SectionLabel title="OUTSTANDING" />
          <StatCard
            icon="clock-outline"
            iconColor="#E65100"
            iconBg="#FFF3E0"
            accent="#E65100"
            label="Pending"
            count={`${stats?.pending.count ?? 0} invoices`}
            amount={fmt(stats?.pending.amount ?? 0)}
            onPress={() => go('pending', 'Pending Invoices')}
          />
          <StatCard
            icon="alert-circle-outline"
            iconColor="#C62828"
            iconBg="#FFEBEE"
            accent="#C62828"
            label="Past Due"
            count={`${stats?.overdue.count ?? 0} invoices`}
            amount={fmt(stats?.overdue.amount ?? 0)}
            onPress={() => go('overdue', 'Past Due Invoices')}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6F9' },

  header: {
    backgroundColor: '#1565C0',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: { fontSize: 20, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.9 },
  signOutText: { color: '#fff', fontSize: 13 },

  loader: { flex: 1, marginTop: 60 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#90A4AE',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 2,
  },

  cardWrapper: { marginBottom: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 12, color: '#78909C', marginBottom: 2 },
  cardCount: { fontSize: 15, fontWeight: '700', color: '#263238' },
  cardAmount: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  chevron: { marginLeft: 4 },
});
