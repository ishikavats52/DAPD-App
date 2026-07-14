import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { MainTabNavigator } from './MainTabNavigator';
import useAuth from '../hooks/useAuth';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import ForceChangePasswordScreen from '../screens/auth/ForceChangePasswordScreen';

export const RootNavigator = () => {
  const { user, isLoading } = useAuth();
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        user.mustChangePassword ? <ForceChangePasswordScreen /> : <MainTabNavigator />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};
