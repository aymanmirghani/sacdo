import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import { getMembershipFees } from '../../services/members';
import { getInvoiceConfig, saveInvoiceConfig, generateInvoicesOnDemand } from '../../services/invoices';
import { useAuthStore } from '../../store/useAuthStore';

function getPeriodOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return options;
}

const PERIOD_OPTIONS = getPeriodOptions();

export default function InvoiceConfigScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [feeTypes, setFeeTypes] = useState<string[]>([]);
  const [feeTypeMenuVisible, setFeeTypeMenuVisible] = useState(false);
  const [periodMenuVisible, setPeriodMenuVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [form, setForm] = useState({
    generationDay: '1',
    dueDay: '15',
    membershipType: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const [config, fees] = await Promise.all([getInvoiceConfig(), getMembershipFees()]);
        const types = fees.map((f) => f.membershipType);
        setFeeTypes(types);
        if (config) {
          setForm({
            generationDay: String(config.generationDay),
            dueDay: String(config.dueDay),
            membershipType: config.membershipType,
          });
        } else if (types.length > 0) {
          setForm((prev) => ({ ...prev, membershipType: types[0] }));
        }
      } catch {
        Alert.alert('Error', 'Failed to load configuration.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    const genDay = parseInt(form.generationDay, 10);
    const dueDay = parseInt(form.dueDay, 10);

    if (isNaN(genDay) || genDay < 1 || genDay > 28) {
      Alert.alert('Error', 'Generation day must be between 1 and 28.');
      return;
    }
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 28) {
      Alert.alert('Error', 'Due day must be between 1 and 28.');
      return;
    }
    if (!form.membershipType) {
      Alert.alert('Error', 'Please select a membership type.');
      return;
    }

    setSaving(true);
    try {
      await saveInvoiceConfig(
        { generationDay: genDay, dueDay: dueDay, membershipType: form.membershipType },
        user!.id
      );
      Alert.alert('Success', 'Invoice configuration saved.');
    } catch {
      Alert.alert('Error', 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateAll() {
    Alert.alert(
      'Generate Invoices for All Members',
      `Generate invoices for ${selectedPeriod} for all active members who do not already have one. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setGenerating(true);
            try {
              const result = await generateInvoicesOnDemand(undefined, selectedPeriod);
              Alert.alert('Done', `${result.created} invoice(s) generated.`);
            } catch {
              Alert.alert('Error', 'Failed to generate invoices. Make sure the configuration is saved first.');
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  }

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text variant="titleMedium" style={styles.section}>Schedule</Text>

      <TextInput
        label="Generation Day of Month (1–28)"
        value={form.generationDay}
        onChangeText={(v) => setForm({ ...form, generationDay: v })}
        keyboardType="number-pad"
        style={styles.input}
      />
      <Text variant="bodySmall" style={styles.hint}>
        Invoices will be automatically generated on this day each month.
      </Text>

      <TextInput
        label="Due Day of Month (1–28)"
        value={form.dueDay}
        onChangeText={(v) => setForm({ ...form, dueDay: v })}
        keyboardType="number-pad"
        style={styles.input}
      />
      <Text variant="bodySmall" style={styles.hint}>
        The day each invoice will be due.
      </Text>

      <Text variant="labelMedium" style={styles.fieldLabel}>Membership Type for Invoices</Text>
      <Menu
        visible={feeTypeMenuVisible}
        onDismiss={() => setFeeTypeMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setFeeTypeMenuVisible(true)}
            style={styles.menuBtn}
            contentStyle={styles.menuBtnContent}
          >
            {form.membershipType || 'Select membership type'}
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
      <Text variant="bodySmall" style={styles.hint}>
        The fee amount for this type will be used as the base invoice amount.
      </Text>

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveBtn}
      >
        Save Configuration
      </Button>

      <Divider style={styles.divider} />

      <Text variant="titleMedium" style={styles.section}>Generate Invoices Now</Text>
      <Text variant="bodySmall" style={styles.hint}>
        Generate invoices for all active members. Members who already have an invoice for the selected period will be skipped.
      </Text>

      <Text variant="labelMedium" style={styles.fieldLabel}>Period</Text>
      <Menu
        visible={periodMenuVisible}
        onDismiss={() => setPeriodMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setPeriodMenuVisible(true)}
            style={styles.menuBtn}
            contentStyle={styles.menuBtnContent}
          >
            {selectedPeriod}
          </Button>
        }
      >
        {PERIOD_OPTIONS.map((p) => (
          <Menu.Item
            key={p}
            title={p}
            onPress={() => { setPeriodMenuVisible(false); setSelectedPeriod(p); }}
          />
        ))}
      </Menu>

      <Button
        mode="outlined"
        icon="file-multiple"
        onPress={handleGenerateAll}
        loading={generating}
        disabled={generating}
        style={styles.generateBtn}
      >
        Generate for All Members
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1 },
  section: { fontWeight: 'bold', marginBottom: 12, marginTop: 4 },
  input: { marginBottom: 4 },
  hint: { color: '#777', marginBottom: 16 },
  fieldLabel: { color: '#555', marginBottom: 6, marginTop: 4 },
  menuBtn: { marginBottom: 4, alignSelf: 'stretch' },
  menuBtnContent: { justifyContent: 'flex-start' },
  saveBtn: { marginTop: 8 },
  divider: { marginVertical: 24 },
  generateBtn: { marginTop: 8 },
});
