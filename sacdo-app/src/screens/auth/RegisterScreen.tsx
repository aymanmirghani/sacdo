import React, { useState } from 'react';
import { StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { submitRegistrationRequest } from '../../services/members';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)})${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function RegisterScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim()) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      Alert.alert('Error', 'Please enter a complete 10-digit US phone number.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    const e164Phone = `+1${phoneDigits}`;
    setLoading(true);
    try {
      await submitRegistrationRequest({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: e164Phone,
        email: email.trim(),
      });
      Alert.alert(
        'Request Submitted',
        'Your membership request has been submitted. You will receive a text and email once it has been reviewed.',
        [{ text: 'OK', onPress: () => navigation.navigate('Welcome') }]
      );
    } catch (e: any) {
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="headlineMedium" style={styles.title}>Request Membership</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Fill in your details below. An administrator will review your request.
      </Text>
      <TextInput label="First Name" value={firstName} onChangeText={setFirstName} style={styles.input} />
      <TextInput label="Last Name" value={lastName} onChangeText={setLastName} style={styles.input} />
      <TextInput
        label="US Phone Number"
        value={phone}
        onChangeText={(v) => setPhone(formatPhone(v))}
        keyboardType="phone-pad"
        placeholder="(555)555-5555"
        maxLength={13}
        style={styles.input}
      />
      <TextInput
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Submit Request
      </Button>
      <Button mode="text" onPress={() => navigation.goBack()}>
        Back
      </Button>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1, paddingTop: 40 },
  title: { fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#666', marginBottom: 24 },
  input: { marginBottom: 16 },
  button: { marginBottom: 12 },
});
