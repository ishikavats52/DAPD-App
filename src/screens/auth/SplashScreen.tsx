import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DAPDHeader from '../../components/DAPDHeader';
import { COLORS } from '../../theme';
import useAuth from '../../hooks/useAuth';

type Props = {
  navigation: any; // We'll type this properly in RootNavigator
};

const SplashScreen = ({ navigation }: Props) => {
  const { isLoading, user } = useAuth();

  useEffect(() => {
    // If not loading, we decide where to go
    if (!isLoading) {
      // Simulate a small delay for the splash screen so the user sees it
      const timer = setTimeout(() => {
        if (user) {
          // It's handled by RootNavigator conditional rendering, so we might not need to manually navigate
          // But if we use this screen inside AuthStack, we'd navigate to Login
          navigation.replace('Login');
        } else {
          navigation.replace('Login');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, user, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <DAPDHeader />
        
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Government of India · Ministry of Defence
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginTop: 40,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default SplashScreen;
