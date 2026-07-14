import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import apiClient from '../../api/client';
import useAuth from '../../hooks/useAuth';
import DAPDHeader from '../../components/DAPDHeader';
import { COLORS } from '../../theme';

const ForceChangePasswordScreen = () => {
  const { user, setUser, signOut } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill out both fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/setup-password', { newPassword });
      Alert.alert('Success', 'Password updated successfully! Please log in with your new password.');
      
      // Log the user out so they are routed to the Login screen
      signOut();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update password';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <DAPDHeader />

        <Card style={styles.card} elevation={1}>
          <Card.Content>
            <Text style={styles.welcomeTitle}>Setup Password</Text>
            <Text style={styles.welcomeSubtitle}>
              Welcome, {user?.name}! Since this is your first time logging in, you must set a new password to secure your account.
            </Text>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Your password must contain at least 8 characters, including an uppercase letter, a number, and a special character.
              </Text>
            </View>

            <Text style={styles.inputLabel}>NEW PASSWORD</Text>
            <TextInput
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
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
            
            <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
            <TextInput
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.primary}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              labelStyle={styles.submitButtonText}
            >
              UPDATE PASSWORD
            </Button>

            <Button
              mode="text"
              onPress={signOut}
              style={styles.logoutButton}
              textColor={COLORS.error}
            >
              Logout
            </Button>
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
    paddingTop: 40,
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 40,
    marginTop: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  warningBox: {
    backgroundColor: '#FFF4E5',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    marginBottom: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#663C00',
    lineHeight: 18,
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
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    marginTop: 24,
    paddingVertical: 4,
  },
  submitButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  logoutButton: {
    marginTop: 16,
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

export default ForceChangePasswordScreen;
