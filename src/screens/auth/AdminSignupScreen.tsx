import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, Menu, Provider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import apiClient from '../../api/client';
import DAPDHeader from '../../components/DAPDHeader';
import { COLORS } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'AdminSignup'>;
};

const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Goa', 
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const AdminSignupScreen = ({ navigation }: Props) => {
  const [officeName, setOfficeName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');

  const handleSignup = async () => {
    if (!officeName || !address || !location || !state || !pincode || !phone || !email || !password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Map to backend schema: name is required, we use officeName as name
      const payload = {
        name: officeName, 
        officeName,
        address,
        location,
        state,
        pincode,
        phone,
        email,
        password
      };

      const response = await apiClient.post('/auth/admin-signup', payload);
      Alert.alert('Success', 'Admin account created successfully! Please wait for superadmin approval.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to register admin';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Provider>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
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
          <Text style={styles.pageSubtitle}>Office registration — superadmin approval required</Text>

          <Card style={styles.card} elevation={1}>
            <Card.Content>
              <Text style={styles.formTitle}>Create admin account</Text>
              <Text style={styles.formSubtitle}>You will be notified after approval</Text>
              <Text style={styles.formSubtitleSmall}>All fields marked * are required.</Text>

              <Text style={styles.inputLabel}>Office name *</Text>
              <TextInput
                placeholder="Your pharmacy or clinic name"
                value={officeName}
                onChangeText={setOfficeName}
                mode="outlined"
                style={styles.input}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />

              <Text style={styles.inputLabel}>Address *</Text>
              <TextInput
                placeholder="Building / street / road name"
                value={address}
                onChangeText={setAddress}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textArea]}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />

              <Text style={styles.inputLabel}>Location *</Text>
              <TextInput
                placeholder="District / city"
                value={location}
                onChangeText={setLocation}
                mode="outlined"
                style={styles.input}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />

              <Text style={styles.inputLabel}>State *</Text>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <TextInput
                      placeholder="Select state / UT"
                      value={state}
                      editable={false}
                      mode="outlined"
                      style={styles.input}
                      outlineColor={COLORS.border}
                      activeOutlineColor={COLORS.primary}
                    />
                  </TouchableOpacity>
                }
              >
                {STATES.map(s => (
                  <Menu.Item 
                    key={s} 
                    onPress={() => { setState(s); setMenuVisible(false); }} 
                    title={s} 
                  />
                ))}
              </Menu>

              <Text style={styles.inputLabel}>Pincode *</Text>
              <TextInput
                placeholder="6-digit pincode"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="numeric"
                maxLength={6}
                mode="outlined"
                style={styles.input}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />

              <Text style={styles.inputLabel}>Phone (mobile) *</Text>
              <TextInput
                placeholder="10-digit mobile number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                mode="outlined"
                style={styles.input}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                placeholder=""
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                mode="outlined"
                style={styles.input}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />

              <Text style={styles.inputLabel}>Password *</Text>
              <TextInput
                placeholder="6+ chars: letter, number, symbol"
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
                onPress={handleSignup}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
                labelStyle={styles.submitButtonText}
              >
                Submit registration
              </Button>

              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backButtonText}>Back to login</Text>
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
    </Provider>
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
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 24,
    fontWeight: '500'
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginHorizontal: 0,
    marginBottom: 40,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  formSubtitleSmall: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.surface,
    height: 50,
  },
  textArea: {
    height: 80,
  },
  showText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    marginTop: 32,
    paddingVertical: 4,
  },
  submitButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  backButtonText: {
    color: COLORS.primary,
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

export default AdminSignupScreen;
