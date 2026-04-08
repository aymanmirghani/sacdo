import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, TextInput, SegmentedButtons } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { sendPhoneOTP, sendEmailOTP } from '../../services/auth';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);

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
        mode="contained"
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
});
