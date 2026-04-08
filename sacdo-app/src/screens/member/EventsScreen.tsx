import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { Event } from '../../types';
import { getEvents } from '../../services/members';

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    getEvents().then((data) => { setEvents(data); setLoading(false); });
  }, []);

  const markedDates: Record<string, any> = {};
  events.forEach((e) => {
    const key = toDateString(e.startDate);
    markedDates[key] = { marked: true, dotColor: '#1565C0' };
  });
  if (selectedDate) {
    markedDates[selectedDate] = { ...(markedDates[selectedDate] || {}), selected: true };
  }

  const selectedEvents = selectedDate
    ? events.filter((e) => toDateString(e.startDate) === selectedDate)
    : events;

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <ScrollView style={styles.container}>
      <Calendar
        markedDates={markedDates}
        onDayPress={(day: any) => setSelectedDate(day.dateString === selectedDate ? '' : day.dateString)}
      />
      <View style={styles.list}>
        {selectedEvents.length === 0 ? (
          <Text style={styles.empty}>{selectedDate ? 'No events on this date.' : 'No upcoming events.'}</Text>
        ) : (
          selectedEvents.map((event) => (
            <Card key={event.id} style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium">{event.title}</Text>
                <Text variant="bodySmall" style={styles.meta}>
                  {event.startDate.toLocaleDateString()} — {event.location}
                </Text>
                {event.description ? <Text variant="bodyMedium">{event.description}</Text> : null}
              </Card.Content>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1 },
  list: { padding: 12 },
  card: { marginBottom: 8 },
  meta: { color: '#888', marginBottom: 4 },
  empty: { textAlign: 'center', marginTop: 24, color: '#888' },
});
