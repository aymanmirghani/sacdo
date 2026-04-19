import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, Card, ActivityIndicator, Chip } from 'react-native-paper';
import { AuditLogEntry } from '../../types';
import { getAuditLog } from '../../services/audit';

const ACTION_LABELS: Record<string, string> = {
  fee_created: 'Fee Created',
  fee_updated: 'Fee Updated',
  payment_type_created: 'Payment Type Created',
  payment_type_updated: 'Payment Type Updated',
  payment_type_deleted: 'Payment Type Deleted',
  invoice_config_updated: 'Invoice Config Updated',
};

const ACTION_COLORS: Record<string, string> = {
  fee_created: '#C8E6C9',
  fee_updated: '#FFF9C4',
  payment_type_created: '#C8E6C9',
  payment_type_updated: '#FFF9C4',
  payment_type_deleted: '#FFCDD2',
  invoice_config_updated: '#E3F2FD',
};

function formatValue(value: string | number | null): string {
  if (value === null || value === undefined) return '—';
  return String(value);
}

export default function AuditLogScreen() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await getAuditLog(200));
    } catch {
      Alert.alert('Error', 'Failed to load audit log.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <FlatList
      style={styles.container}
      data={entries}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <Chip
                compact
                mode="flat"
                style={{ backgroundColor: ACTION_COLORS[item.action] ?? '#F5F5F5' }}
                textStyle={styles.chipText}
              >
                {ACTION_LABELS[item.action] ?? item.action}
              </Chip>
              <Text variant="bodySmall" style={styles.timestamp}>
                {item.timestamp?.toLocaleDateString()} {item.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <View style={styles.row}>
              <Text variant="bodySmall" style={styles.label}>Admin: </Text>
              <Text variant="bodySmall" style={styles.value}>{item.adminName}</Text>
            </View>

            {item.itemDescription && (
              <View style={styles.row}>
                <Text variant="bodySmall" style={styles.label}>Item: </Text>
                <Text variant="bodySmall" style={styles.value}>{item.itemDescription}</Text>
              </View>
            )}

            {item.changes.map((change, i) => (
              <View key={i} style={styles.changeRow}>
                <Text variant="bodySmall" style={styles.fieldName}>{change.field}</Text>
                <View style={styles.changeValues}>
                  {change.oldValue !== null && (
                    <Text variant="bodySmall" style={styles.oldValue}>{formatValue(change.oldValue)}</Text>
                  )}
                  {change.oldValue !== null && change.newValue !== null && (
                    <Text variant="bodySmall" style={styles.arrow}> → </Text>
                  )}
                  {change.newValue !== null && (
                    <Text variant="bodySmall" style={styles.newValue}>{formatValue(change.newValue)}</Text>
                  )}
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}
      refreshing={loading}
      onRefresh={load}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No audit log entries yet.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  center: { flex: 1 },
  list: { padding: 12, paddingBottom: 24 },
  card: { marginBottom: 8, borderRadius: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chipText: { fontSize: 10 },
  timestamp: { color: '#90A4AE', fontSize: 11 },
  row: { flexDirection: 'row', marginBottom: 2 },
  label: { color: '#78909C', fontWeight: '600' },
  value: { color: '#37474F', flex: 1 },
  changeRow: { marginTop: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E0E0' },
  fieldName: { color: '#546E7A', fontWeight: '600', marginBottom: 2, textTransform: 'capitalize' },
  changeValues: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  oldValue: { color: '#B71C1C', backgroundColor: '#FFEBEE', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  arrow: { color: '#90A4AE' },
  newValue: { color: '#1B5E20', backgroundColor: '#E8F5E9', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 60 },
  empty: { color: '#90A4AE', fontSize: 15 },
});
