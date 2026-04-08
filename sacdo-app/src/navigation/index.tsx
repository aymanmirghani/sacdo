import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '../store/useAuthStore';
import { loadCurrentUser } from '../services/auth';
import { RootStackParamList } from '../types';
import AuthStack from './AuthStack';
import MemberTabs from './MemberTabs';
import AdminStack from './AdminStack';
import { ActivityIndicator, View } from 'react-native';

const Root = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
        try {
          if (firebaseUser) {
            const appUser = await loadCurrentUser();
            setUser(appUser);
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
