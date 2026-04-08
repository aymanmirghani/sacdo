import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { submitRegistrationRequest } from '../../services/members';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

const US_PHONE_REGEX = /^\+1[2-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    if (!US_PHONE_REGEX.test(phone.trim())) {
      Alert.alert('Error', 'Please enter a valid US phone number (e.g. +15550001234).');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await submitRegistrationRequest({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Request Membership</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Fill in your details below. An administrator will review your request.
      </Text>
      <TextInput label="First Name" value={firstName} onChangeText={setFirstName} style={styles.input} />
      <TextInput label="Last Name" value={lastName} onChangeText={setLastName} style={styles.input} />
      <TextInput
        label="US Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+15550001234"
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
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1, justifyContent: 'center' },
  title: { fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#666', marginBottom: 24 },
  input: { marginBottom: 16 },
  button: { marginBottom: 12 },
});
