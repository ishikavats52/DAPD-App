import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import apiClient from '../../api/client';
import useAuth from '../../hooks/useAuth';
import DAPDHeader from '../../components/DAPDHeader';
import { COLORS } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

const LoginScreen = ({ navigation }: Props) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');
  const { signIn } = useAuth();

const handleLogin = async () => {
  if (!phone || !password) {
    Alert.alert('Error', 'Please enter both mobile number and password');
    return;
  }

  console.log('LOGIN BUTTON PRESSED');
  console.log('Phone:', phone);

  setLoading(true);

  try {
    console.log('BEFORE API CALL');

    const response = await apiClient.post('/auth/login', {
      identifier: phone,
      password,
    });

    console.log('LOGIN RESPONSE:', response.data);

    if (response.data.otpRequired) {
      navigation.navigate('OTP', {
        loginChallengeId: response.data.loginChallengeId,
        phone,
      });
    } else if (response.data.token) {
      await signIn(response.data.token, response.data.user);
    }
  } catch (error: any) {
    console.log('LOGIN ERROR:', error?.message);
    console.log('LOGIN RESPONSE:', error?.response?.data);
    console.log('FULL ERROR:', JSON.stringify(error, null, 2));

    Alert.alert(
      'Login Error',
      JSON.stringify(error?.response?.data || error?.message)
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Language Toggle */}
        <View style={styles.langToggleContainer}>
          <View style={styles.langToggle}>
            <TouchableOpacity onPress={() => setLang('EN')}>
              <Text style={[styles.langText, lang === 'EN' && styles.langTextActive]}>EN</Text>
            </TouchableOpacity>
            <View style={styles.langDivider} />
            <TouchableOpacity onPress={() => setLang('HI')}>
              <Text style={[styles.langText, lang === 'HI' && styles.langTextActive]}>हिं</Text>
            </TouchableOpacity>
          </View>
        </View>

        <DAPDHeader />

        <Card style={styles.card} elevation={1}>
          <Card.Content>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>Sign in with your mobile number</Text>

            <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
            <TextInput
              placeholder="10-digit mobile number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />
            
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
              right={
                <TextInput.Icon 
                  icon={() => <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
              labelStyle={styles.loginButtonText}
            >
              LOGIN
            </Button>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.signUpAdmin}
              onPress={() => navigation.navigate('AdminSignup')}
            >
              <Text style={styles.signUpText}>Sign up as Admin</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Government of India · Ministry of Defence · v1.0.0
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  langToggleContainer: {
    alignItems: 'flex-end',
    marginTop: 40,
    marginBottom: -20,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.surface,
  },
  langText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingHorizontal: 8,
  },
  langTextActive: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  langDivider: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.border,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    height: 50,
  },
  showText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    marginTop: 24,
    paddingVertical: 4,
  },
  loginButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 24,
  },
  forgotText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  signUpAdmin: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  signUpText: {
    color: COLORS.accent,
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default LoginScreen;
