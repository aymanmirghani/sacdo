import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../store/useAuthStore';
import { loadCurrentUser } from '../services/auth';
import { RootStackParamList } from '../types';
import AuthStack from './AuthStack';
import MemberTabs from './MemberTabs';
import AdminStack from './AdminStack';
import BiometricLockScreen from '../screens/auth/BiometricLockScreen';
import { ActivityIndicator, View } from 'react-native';

const Root = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, loading, biometricLocked, setUser, setLoading, setBiometricLocked } = useAuthStore();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
        try {
          if (firebaseUser) {
            const appUser = await loadCurrentUser();
            setUser(appUser);
            // Check if biometric lock should be applied
            const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
            if (biometricEnabled === 'true') {
              const supported = await LocalAuthentication.hasHardwareAsync();
              const enrolled = await LocalAuthentication.isEnrolledAsync();
              if (supported && enrolled) {
                setBiometricLocked(true);
              }
            }
          } else {
            setUser(null);
          }
        } catch (e) {
          console.error('Auth state error:', e);
          setUser(null);
        } finally {
          setLoading(false);
        }
      });
    } catch (e) {
      console.error('Firebase init error:', e);
      setUser(null);
      setLoading(false);
    }
    return () => unsubscribe?.();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (biometricLocked) {
    return <BiometricLockScreen />;
  }

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Root.Screen name="Auth" component={AuthStack} />
        ) : user.role === 'Administrator' ? (
          <Root.Screen name="AdminApp" component={AdminStack} />
        ) : (
          <Root.Screen name="MemberApp" component={MemberTabs} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
