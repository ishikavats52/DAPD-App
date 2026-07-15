import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { Text, TextInput, Button, Appbar, Menu, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';
import apiClient from '../../api/client';
import useAuth from '../../hooks/useAuth';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'AddEmployee'>;
};

const AddEmployeeScreen = ({ navigation }: Props) => {
  const { signOut, user } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [role, setRole] = useState<'Employee' | 'Admin'>('Employee');
  const [modalVisible, setModalVisible] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [assignedAdminId, setAssignedAdminId] = useState('');
  const [assignedAdminName, setAssignedAdminName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    phone: '',
    email: '',
    officeName: '',
    address: '',
    location: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (user?.role === 'superadmin') {
      const fetchAdmins = async () => {
        try {
          const response = await apiClient.get('/users/admins');
          setAdmins(response.data.data || []);
        } catch (error) {
          console.error('Failed to fetch admins:', error);
        }
      };
      fetchAdmins();
    }
  }, [user]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.designation || !formData.phone || !formData.email) {
      Alert.alert('Error', 'Please fill in all required basic fields.');
      return;
    }

    try {
      setLoading(true);
      if (role === 'Employee') {
        const payload = {
          name: formData.name,
          designation: formData.designation,
          phone: formData.phone,
          email: formData.email,
          ...(assignedAdminId ? { assignedAdminId } : {})
        };
        await apiClient.post('/users/employees', payload);
      } else {
        await apiClient.post('/users/admins', formData);
      }
      
      Alert.alert('Success', `${role} created successfully. A temporary password has been emailed.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || `Failed to create ${role.toLowerCase()}`;
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const isSuperadmin = user?.role === 'superadmin';

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#1C2942" />
        <Appbar.Content title={role === 'Employee' ? "Add Employee" : "Add Admin"} titleStyle={styles.headerTitle} />
        
        <View style={styles.headerLang}>
          <Text style={[styles.langText, styles.langTextActive]}>EN</Text>
          <Text style={styles.langText}> | हिं</Text>
        </View>

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
          <Menu.Item onPress={() => { setMenuVisible(false); signOut(); }} title="Logout" />
        </Menu>
      </Appbar.Header>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.container}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.pageTitle}>Add {role.toLowerCase()}</Text>
          <Text style={styles.instructionText}>
            All fields are required. Employee: name, designation, mobile, email, and assigned admin. Admin: office, designation, address, location, state, pincode, mobile, and email.
          </Text>

          {isSuperadmin && (
            <>
              <Text style={styles.inputLabel}>ROLE</Text>
              <View style={styles.roleTabsContainer}>
                <TouchableOpacity 
                  style={[styles.roleTab, role === 'Employee' && styles.roleTabActive]}
                  onPress={() => setRole('Employee')}
                >
                  <Text style={[styles.roleTabText, role === 'Employee' && styles.roleTabTextActive]}>Employee</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.roleTab, role === 'Admin' && styles.roleTabActive]}
                  onPress={() => setRole('Admin')}
                >
                  <Text style={[styles.roleTabText, role === 'Admin' && styles.roleTabTextActive]}>Admin</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {!isSuperadmin && (
            <View style={styles.roleBlock}>
              <Text style={styles.roleTitle}>Employee</Text>
              <Text style={styles.roleSubtitle}>Admins can only create employees</Text>
            </View>
          )}

          {role === 'Employee' && isSuperadmin && (
            <>
              <Text style={styles.inputLabel}>ASSIGN TO ADMIN</Text>
              <TouchableOpacity style={styles.dropdownInput} onPress={() => setModalVisible(true)}>
                <Text style={assignedAdminName ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
                  {assignedAdminName || 'Select an admin'}
                </Text>
              </TouchableOpacity>
            </>
          )}

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
          
          {role === 'Admin' && (
            <>
              <Text style={styles.inputLabel}>Office Name *</Text>
              <TextInput
                value={formData.officeName}
                onChangeText={(text) => handleChange('officeName', text)}
                placeholder="e.g. HQ Command"
                mode="outlined"
                style={styles.input}
                outlineColor="#D0D0D0"
                activeOutlineColor="#1C2942"
              />
              
              <Text style={styles.inputLabel}>Address *</Text>
              <TextInput
                value={formData.address}
                onChangeText={(text) => handleChange('address', text)}
                placeholder="Street address"
                mode="outlined"
                style={styles.input}
                outlineColor="#D0D0D0"
                activeOutlineColor="#1C2942"
              />

              <Text style={styles.inputLabel}>Location *</Text>
              <TextInput
                value={formData.location}
                onChangeText={(text) => handleChange('location', text)}
                placeholder="City/Area"
                mode="outlined"
                style={styles.input}
                outlineColor="#D0D0D0"
                activeOutlineColor="#1C2942"
              />

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>State *</Text>
                  <TextInput
                    value={formData.state}
                    onChangeText={(text) => handleChange('state', text)}
                    placeholder="State"
                    mode="outlined"
                    style={styles.input}
                    outlineColor="#D0D0D0"
                    activeOutlineColor="#1C2942"
                  />
                </View>
                <View style={{ width: 16 }} />
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Pincode *</Text>
                  <TextInput
                    value={formData.pincode}
                    onChangeText={(text) => handleChange('pincode', text)}
                    placeholder="Pincode"
                    keyboardType="number-pad"
                    mode="outlined"
                    style={styles.input}
                    outlineColor="#D0D0D0"
                    activeOutlineColor="#1C2942"
                  />
                </View>
              </View>
            </>
          )}

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

          <Button 
            mode="contained" 
            onPress={handleCreate} 
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            labelStyle={styles.submitButtonText}
          >
            Create {role.toLowerCase()}
          </Button>

        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Government of India · Ministry of Defence · v1.0.0
          </Text>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)} activeOpacity={1}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select an admin</Text>
            {admins.length === 0 ? (
              <Text style={{ padding: 16, textAlign: 'center', color: '#666' }}>No admins found.</Text>
            ) : (
              <FlatList
                data={admins}
                keyExtractor={(item) => item.id || item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.adminListItem}
                    onPress={() => {
                      setAssignedAdminId(item.id || item._id);
                      setAssignedAdminName(item.name);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.adminListName}>{item.name}</Text>
                    <Text style={styles.adminListEmail}>{item.email}</Text>
                    <Divider style={{ marginTop: 12 }} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

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
  headerTitle: { textAlign: 'center', fontWeight: 'bold', color: '#1C2942', fontSize: 18 },
  headerLang: { flexDirection: 'row', marginRight: 16 },
  langText: { fontSize: 14, color: '#666' },
  langTextActive: { fontWeight: 'bold', color: '#1C2942' },
  menuButton: { display: 'none' }, // Hiding based on mockup, or we can leave it
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
  roleTabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#EAECEF',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 4,
    marginHorizontal: 4,
  },
  roleTabActive: {
    backgroundColor: '#E8F0FEE6',
    borderColor: '#1C2942',
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  roleTabTextActive: {
    color: '#1C2942',
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
  dropdownInput: {
    backgroundColor: '#fff',
    height: 50,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  dropdownTextPlaceholder: {
    color: '#888',
    fontSize: 16,
  },
  dropdownTextSelected: {
    color: '#111',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#fff',
    height: 50,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
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
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '85%',
    maxHeight: '70%',
    borderRadius: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  adminListItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  adminListName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  adminListEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default AddEmployeeScreen;
