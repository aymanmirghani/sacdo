import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, TextInput, SegmentedButtons, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import auth from '@react-native-firebase/auth';
import { AuthStackParamList } from '../../types';
import { sendPhoneOTP, sendEmailOTP, loadCurrentUser } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [biometricIcon, setBiometricIcon] = useState('fingerprint');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const { setUser } = useAuthStore();

  useEffect(() => {
    async function checkBiometric() {
      const enabled = await AsyncStorage.getItem('biometricEnabled');
      if (enabled !== 'true') return;
      // Only show biometric option when there is an active Firebase session
      // to load the user from. If the user signed out, there is nothing to unlock.
      if (!auth().currentUser) return;
      const supported = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!supported || !enrolled) return;
      setBiometricAvailable(true);
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricLabel('Face ID');
        setBiometricIcon('face-recognition');
      } else {
        setBiometricLabel('Fingerprint');
        setBiometricIcon('fingerprint');
      }
    }
    checkBiometric();
  }, []);

  async function handleBiometric() {
    setBiometricLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to SACDO',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (!result.success) return;
      const appUser = await loadCurrentUser();
      if (!appUser || appUser.status === 'inactive') {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please sign in with your email or phone number.'
        );
        return;
      }
      setUser(appUser);
    } catch {
      Alert.alert('Error', 'Biometric authentication failed. Please try again.');
    } finally {
      setBiometricLoading(false);
    }
  }

  async function handleSendOTP() {
    if (!contact.trim()) {
      Alert.alert('Error', `Please enter your ${method === 'phone' ? 'phone number' : 'email address'}.`);
      return;
    }
    setLoading(true);
    try {
      if (method === 'phone') {
        await sendPhoneOTP(contact.trim());
      } else {
        await sendEmailOTP(contact.trim());
      }
      navigation.navigate('OTP', { method, contact: contact.trim() });
    } catch (e: any) {
      Alert.alert('Error', `[${e.code ?? 'unknown'}] ${e.message ?? 'Not able to validate your information.'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Sign In</Text>

      {biometricAvailable && (
        <>
          <Button
            mode="contained"
            icon={biometricIcon}
            onPress={handleBiometric}
            loading={biometricLoading}
            disabled={biometricLoading}
            style={styles.button}
          >
            Sign in with {biometricLabel}
          </Button>
          <View style={styles.dividerRow}>
            <Divider style={styles.dividerLine} />
            <Text variant="bodySmall" style={styles.dividerText}>or</Text>
            <Divider style={styles.dividerLine} />
          </View>
        </>
      )}

      <SegmentedButtons
        value={method}
        onValueChange={(v) => { setMethod(v as 'phone' | 'email'); setContact(''); }}
        buttons={[
          { value: 'phone', label: 'Phone' },
          { value: 'email', label: 'Email' },
        ]}
        style={styles.segment}
      />
      <TextInput
        label={method === 'phone' ? 'US Phone Number' : 'Email Address'}
        value={contact}
        onChangeText={setContact}
        keyboardType={method === 'phone' ? 'phone-pad' : 'email-address'}
        autoCapitalize="none"
        placeholder={method === 'phone' ? '+1 555 000 0000' : 'you@example.com'}
        style={styles.input}
      />
      <Button
        mode={biometricAvailable ? 'outlined' : 'contained'}
        onPress={handleSendOTP}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Send Verification Code
      </Button>
      <Button mode="text" onPress={() => navigation.goBack()}>
        Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontWeight: 'bold', marginBottom: 24 },
  segment: { marginBottom: 20 },
  input: { marginBottom: 20 },
  button: { marginBottom: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1 },
  dividerText: { marginHorizontal: 12, color: '#999' },
});
