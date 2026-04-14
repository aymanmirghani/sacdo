import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useAuthStore } from '../../store/useAuthStore';
import { lockApp } from '../../services/auth';

export default function AdminDashboardScreen() {
  const { user, setUser, setBiometricLocked, clear } = useAuthStore();

  async function handleSignOut() {
    await lockApp({ setUser, setBiometricLocked, clear });
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Welcome, {user?.firstName}
      </Text>
      <Text variant="bodyLarge" style={styles.role}>Administrator</Text>
      <Text variant="bodyMedium" style={styles.hint}>
        Use the tabs below to manage members, review requests, and record payments.
      </Text>
      <Button mode="outlined" onPress={handleSignOut} style={styles.signOut}>
        Sign Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontWeight: 'bold', marginBottom: 4 },
  role: { color: '#1565C0', marginBottom: 24 },
  hint: { color: '#666', marginBottom: 32 },
  signOut: { alignSelf: 'flex-start' },
});
