import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import apiClient from '../../api/client';
import useAuth from '../../hooks/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

const OTPScreen = ({ route, navigation }: Props) => {
  const { loginChallengeId, phone } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const { signIn } = useAuth();

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/verify-login-otp', { 
        loginChallengeId, 
        otp 
      });
      
      if (response.data.token) {
        await signIn(response.data.token, response.data.user);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to verify OTP';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const response = await apiClient.post('/auth/resend-login-otp', { loginChallengeId });
      Alert.alert('Success', 'A new OTP has been sent.');
      // Need to update route params with new challenge ID if the backend issues a new one
      if (response.data.loginChallengeId) {
        navigation.setParams({ loginChallengeId: response.data.loginChallengeId, phone });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to resend OTP';
      Alert.alert('Error', message);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text variant="displaySmall" style={[styles.title, { color: theme.colors.primary }]}>
          Verification
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Enter the 6-digit code sent to {phone}
        </Text>

        <TextInput
          label="6-Digit OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          mode="outlined"
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleVerify}
          loading={loading}
          disabled={loading || otp.length !== 6}
          style={styles.button}
        >
          Verify
        </Button>

        <Button
          mode="text"
          onPress={handleResend}
          disabled={loading}
          style={styles.resendButton}
        >
          Resend Code
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  input: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 4,
  },
  button: {
    marginTop: 8,
    paddingVertical: 4,
  },
  resendButton: {
    marginTop: 16,
  },
});

export default OTPScreen;
