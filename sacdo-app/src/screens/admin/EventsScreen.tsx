import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  TextInput,
  Portal,
  Dialog,
  FAB,
  IconButton,
} from 'react-native-paper';
import { Event } from '../../types';
import { getEvents, upsertEvent, deleteEvent } from '../../services/members';
import { useAuthStore } from '../../store/useAuthStore';

type EventForm = {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
};

const EMPTY_FORM: EventForm = {
  title: '',
  description: '',
  location: '',
  startDate: '',
  endDate: '',
};

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseLocalDate(str: string): Date | null {
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

export default function AdminEventsScreen() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await getEvents();
    setEvents(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditingEvent(null);
    setForm(EMPTY_FORM);
    setDialogVisible(true);
  }

  function openEdit(event: Event) {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      startDate: toDateString(event.startDate),
      endDate: event.endDate ? toDateString(event.endDate) : '',
    });
    setDialogVisible(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.startDate.trim()) {
      Alert.alert('Error', 'Title and start date are required.');
      return;
    }
    const startDate = parseLocalDate(form.startDate);
    if (!startDate) {
      Alert.alert('Error', 'Start date must be in YYYY-MM-DD format.');
      return;
    }
    const endDate = form.endDate.trim() ? parseLocalDate(form.endDate) : null;
    if (form.endDate.trim() && !endDate) {
      Alert.alert('Error', 'End date must be in YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    try {
      await upsertEvent({
        id: editingEvent?.id,
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        startDate,
        endDate: endDate ?? startDate,
        createdBy: editingEvent?.createdBy ?? user!.id,
      });
      setDialogVisible(false);
      load();
    } catch {
      Alert.alert('Error', 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(event: Event) {
    Alert.alert(
      'Delete Event',
      `Delete "${event.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(event.id);
              setEvents((prev) => prev.filter((e) => e.id !== event.id));
            } catch {
              Alert.alert('Error', 'Failed to delete event.');
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
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium">{item.title}</Text>
              <Text variant="bodySmall" style={styles.meta}>
                {item.startDate.toLocaleDateString()}
                {item.endDate && item.endDate.getTime() !== item.startDate.getTime()
                  ? ` — ${item.endDate.toLocaleDateString()}`
                  : ''}
                {item.location ? `  ·  ${item.location}` : ''}
              </Text>
              {item.description ? (
                <Text variant="bodySmall" style={styles.desc}>{item.description}</Text>
              ) : null}
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => openEdit(item)}>Edit</Button>
              <Button textColor="#c62828" onPress={() => confirmDelete(item)}>
                Delete
              </Button>
            </Card.Actions>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No events yet. Tap + to add one.</Text>
        }
        refreshing={loading}
        onRefresh={load}
      />

      <FAB icon="plus" style={styles.fab} onPress={openNew} label="Add Event" />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editingEvent ? 'Edit Event' : 'New Event'}</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput
                label="Title *"
                value={form.title}
                onChangeText={(v) => setForm({ ...form, title: v })}
                style={styles.input}
              />
              <TextInput
                label="Start Date * (YYYY-MM-DD)"
                value={form.startDate}
                onChangeText={(v) => setForm({ ...form, startDate: v })}
                placeholder="2025-01-15"
                keyboardType="numbers-and-punctuation"
                style={styles.input}
              />
              <TextInput
                label="End Date (YYYY-MM-DD)"
                value={form.endDate}
                onChangeText={(v) => setForm({ ...form, endDate: v })}
                placeholder="2025-01-15"
                keyboardType="numbers-and-punctuation"
                style={styles.input}
              />
              <TextInput
                label="Location"
                value={form.location}
                onChangeText={(v) => setForm({ ...form, location: v })}
                style={styles.input}
              />
              <TextInput
                label="Description"
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                multiline
                numberOfLines={3}
                style={styles.input}
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSave} loading={saving} disabled={saving}>
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
  list: { padding: 12, paddingBottom: 80 },
  card: { marginBottom: 8 },
  meta: { color: '#888', marginTop: 2, marginBottom: 2 },
  desc: { color: '#555', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 48, color: '#888' },
  fab: { position: 'absolute', bottom: 16, right: 16 },
  dialogScroll: { maxHeight: 400 },
  input: { marginBottom: 12 },
});
