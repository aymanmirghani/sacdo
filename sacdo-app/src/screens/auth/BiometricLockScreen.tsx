import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Divider } from 'react-native-paper';
import * as LocalAuthentication from 'expo-local-authentication';
import { loadCurrentUser } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';

export default function BiometricLockScreen() {
  const { setUser, setBiometricLocked, clear } = useAuthStore();
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [biometricIcon, setBiometricIcon] = useState('fingerprint');

  useEffect(() => {
    LocalAuthentication.supportedAuthenticationTypesAsync().then((types) => {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricLabel('Face ID');
        setBiometricIcon('face-recognition');
      } else {
        setBiometricLabel('Fingerprint');
        setBiometricIcon('fingerprint');
      }
    });
  }, []);

  async function authenticate() {
    setAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to SACDO',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        const appUser = await loadCurrentUser();
        setUser(appUser);
        setBiometricLocked(false);
      }
    } finally {
      setAuthenticating(false);
    }
  }

  useEffect(() => {
    authenticate();
  }, []);

  function handleUseOTP() {
    // Don't sign out — keep the Firebase session alive so biometric
    // is still available on the login screen. Just release the lock.
    setBiometricLocked(false);
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>SACDO</Text>
      <Text variant="bodyLarge" style={styles.subtitle}>Member Management Portal</Text>

      <Button
        mode="contained"
        icon={biometricIcon}
        onPress={authenticate}
        loading={authenticating}
        disabled={authenticating}
        style={styles.button}
      >
        Sign in with {biometricLabel}
      </Button>

      <View style={styles.dividerRow}>
        <Divider style={styles.dividerLine} />
        <Text variant="bodySmall" style={styles.dividerText}>or</Text>
        <Divider style={styles.dividerLine} />
      </View>

      <Button
        mode="outlined"
        icon="message"
        onPress={handleUseOTP}
        style={styles.button}
      >
        Sign in with email or phone
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#666', marginBottom: 48 },
  button: { width: '100%', marginBottom: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 12 },
  dividerLine: { flex: 1 },
  dividerText: { marginHorizontal: 12, color: '#999' },
});
