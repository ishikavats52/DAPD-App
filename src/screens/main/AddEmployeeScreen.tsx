import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Appbar, Menu } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';
import apiClient from '../../api/client';
import useAuth from '../../hooks/useAuth';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'AddEmployee'>;
};

const AddEmployeeScreen = ({ navigation }: Props) => {
  const { signOut } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    phone: '',
    email: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.designation || !formData.phone || !formData.email) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/users/employees', formData);
      Alert.alert('Success', 'Employee created successfully. A temporary password has been emailed to them.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to create employee';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Image 
          source={require('../../../assets/emblem.png')}
          style={styles.headerEmblem}
          resizeMode="contain"
        />
        <Appbar.Content title="Add Employee" titleStyle={styles.headerTitle} />
        
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
              <Text style={{ fontSize: 24, color: COLORS.primary }}>≡</Text>
            </TouchableOpacity>
          }
          contentStyle={{ backgroundColor: COLORS.surface }}
        >
          <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Home'); }} title="Home" />
          <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Search'); }} title="Search" />
          <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('AddArticle'); }} title="Add article" />
          <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }} title="Profile" />
          <Menu.Item onPress={() => { setMenuVisible(false); signOut(); }} title="Logout" />
        </Menu>
      </Appbar.Header>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.container}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.pageTitle}>Add employee</Text>
          <Text style={styles.instructionText}>
            All fields are required: name, designation, mobile, and email. A temporary password is emailed; the user changes it on first sign-in.
          </Text>

          <Text style={styles.inputLabel}>ROLE</Text>
          <View style={styles.roleBlock}>
            <Text style={styles.roleTitle}>Employee</Text>
            <Text style={styles.roleSubtitle}>Admins can only create employees</Text>
          </View>

          <Text style={styles.inputLabel}>Full name *</Text>
          <TextInput
            value={formData.name}
            onChangeText={(text) => handleChange('name', text)}
            placeholder="e.g. John Smith"
            mode="outlined"
            style={styles.input}
            outlineColor="#D0D0D0"
            activeOutlineColor="#1C2942"
          />

          <Text style={styles.inputLabel}>Designation *</Text>
          <TextInput
            value={formData.designation}
            onChangeText={(text) => handleChange('designation', text)}
            placeholder="e.g. Pharmacist"
            mode="outlined"
            style={styles.input}
            outlineColor="#D0D0D0"
            activeOutlineColor="#1C2942"
          />

          <Text style={styles.inputLabel}>Phone (mobile) *</Text>
          <TextInput
            value={formData.phone}
            onChangeText={(text) => handleChange('phone', text)}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
            outlineColor="#D0D0D0"
            activeOutlineColor="#1C2942"
          />

          <Text style={styles.inputLabel}>Email *</Text>
          <TextInput
            value={formData.email}
            onChangeText={(text) => handleChange('email', text)}
            placeholder="user@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            mode="outlined"
            style={styles.input}
            outlineColor="#D0D0D0"
            activeOutlineColor="#1C2942"
          />

          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              A temporary password is generated automatically and emailed to the user. They sign in with their mobile number and must change the password on first sign-in.
            </Text>
          </View>

          <Button 
            mode="contained" 
            onPress={handleCreate} 
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            labelStyle={styles.submitButtonText}
          >
            Create employee
          </Button>

        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Government of India · Ministry of Defence · v1.0.0
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F1' },
  header: {
    backgroundColor: '#fff',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerEmblem: { width: 24, height: 36, marginLeft: 16 },
  headerTitle: { textAlign: 'center', fontWeight: 'bold', color: '#1C2942', fontSize: 18 },
  menuButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 16,
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C2942',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  roleBlock: {
    backgroundColor: '#EAEFF8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1C2942',
    padding: 16,
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 16,
    color: '#1E3A5F',
  },
  roleSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    height: 50,
  },
  infoBanner: {
    backgroundColor: '#E5E5E0',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#1C2942',
    borderRadius: 4,
    marginTop: 32,
    paddingVertical: 6,
  },
  submitButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F5F6F1',
  },
  footerText: { fontSize: 12, color: COLORS.textSecondary },
});

export default AddEmployeeScreen;
