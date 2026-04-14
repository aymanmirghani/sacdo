import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { AuthStackParamList } from '../../types';
import { verifyPhoneOTP, verifyEmailOTP, sendPhoneOTP, sendEmailOTP, getPhoneConfirmation } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
  route: RouteProp<AuthStackParamList, 'OTP'>;
};

const OTP_EXPIRY_SECONDS = 300; // 5 minutes

export default function OTPScreen({ navigation, route }: Props) {
  const { method, contact } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_EXPIRY_SECONDS);
  const confirmationRef = useRef<any>(null);
  const { setUser } = useAuthStore();

  useEffect(() => {
    if (method === 'phone') {
      confirmationRef.current = getPhoneConfirmation();
    }
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const expired = secondsLeft <= 0;

  async function handleVerify() {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the verification code.');
      return;
    }
    if (expired) {
      Alert.alert('Expired', 'Your code has expired. Please request a new one.');
      return;
    }
    setLoading(true);
    try {
      let user;
      if (method === 'phone') {
        user = await verifyPhoneOTP(confirmationRef.current, code.trim());
      } else {
        user = await verifyEmailOTP(contact, code.trim());
      }
      if (!user || user.status === 'inactive') {
        Alert.alert('Access Denied', 'Not able to validate your information.');
        return;
      }
      setUser(user);
      // Offer biometric enrollment if the device supports it and it's not already enabled
      const supported = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (supported && enrolled) {
        const current = await AsyncStorage.getItem('biometricEnabled');
        if (current !== 'true') {
          Alert.alert(
            'Enable Biometric Login',
            'Sign in faster next time using Face ID or fingerprint.',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Enable', onPress: () => AsyncStorage.setItem('biometricEnabled', 'true') },
            ]
          );
        }
      }
    } catch (e: any) {
      Alert.alert('Error', 'Not able to validate your information.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      if (method === 'phone') {
        const confirmation = await sendPhoneOTP(contact);
        confirmationRef.current = confirmation;
      } else {
        await sendEmailOTP(contact);
      }
      setSecondsLeft(OTP_EXPIRY_SECONDS);
      setCode('');
      Alert.alert('Sent', 'A new verification code has been sent.');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Enter Code</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        A verification code was sent to {contact}
      </Text>
      <TextInput
        label="Verification Code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
      />
      {!expired ? (
        <Text variant="bodySmall" style={styles.timer}>
          Code expires in {minutes}:{seconds.toString().padStart(2, '0')}
        </Text>
      ) : (
        <Text variant="bodySmall" style={styles.expired}>Code expired</Text>
      )}
      <Button
        mode="contained"
        onPress={handleVerify}
        loading={loading}
        disabled={loading || expired}
        style={styles.button}
      >
        Verify
      </Button>
      <Button mode="text" onPress={handleResend}>
        Resend Code
      </Button>
      <Button mode="text" onPress={() => navigation.goBack()}>
        Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#666', marginBottom: 24 },
  input: { marginBottom: 8 },
  timer: { color: '#888', marginBottom: 20 },
  expired: { color: 'red', marginBottom: 20 },
  button: { marginBottom: 12 },
});
