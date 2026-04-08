import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>SACDO</Text>
      <Text variant="bodyLarge" style={styles.subtitle}>Member Management Portal</Text>
      <Button
        mode="contained"
        style={styles.button}
        onPress={() => navigation.navigate('Login')}
      >
        Sign In
      </Button>
      <Button
        mode="outlined"
        style={styles.button}
        onPress={() => navigation.navigate('Register')}
      >
        Request Membership
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    marginBottom: 48,
  },
  button: {
    width: '100%',
    marginBottom: 12,
  },
});
