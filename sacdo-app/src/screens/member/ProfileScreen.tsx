import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button, Chip } from 'react-native-paper';
import { useAuthStore } from '../../store/useAuthStore';
import { signOut } from '../../services/auth';

export default function ProfileScreen() {
  const { user, clear } = useAuthStore();

  async function handleSignOut() {
    await signOut();
    clear();
  }

  if (!user) return null;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.name}>
            {user.firstName} {user.lastName}
          </Text>
          <Chip
            mode="flat"
            style={{ backgroundColor: '#C8E6C9', alignSelf: 'flex-start', marginBottom: 16 }}
          >
            {user.role}
          </Chip>
          <Text variant="labelSmall" style={styles.label}>Phone</Text>
          <Text variant="bodyMedium" style={styles.value}>{user.phone}</Text>
          <Text variant="labelSmall" style={styles.label}>Email</Text>
          <Text variant="bodyMedium" style={styles.value}>{user.email}</Text>
          <Text variant="labelSmall" style={styles.label}>Member since</Text>
          <Text variant="bodyMedium">{user.createdAt?.toLocaleDateString()}</Text>
        </Card.Content>
      </Card>
      <Button mode="outlined" onPress={handleSignOut} style={styles.signOut}>
        Sign Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  card: { marginBottom: 16 },
  name: { fontWeight: 'bold', marginBottom: 8 },
  label: { color: '#888', marginTop: 8 },
  value: { marginBottom: 4 },
  signOut: { alignSelf: 'flex-start' },
});
