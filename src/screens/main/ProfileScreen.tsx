import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Text, Appbar, Menu, TextInput, Button } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../api/client';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Profile'>;
};

const ProfileScreen = ({ navigation }: Props) => {
  const { user, signOut } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [changeChallengeId, setChangeChallengeId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestChangePassword = async () => {
    setLoading(true);
    setPasswordModalVisible(true);
    try {
      const res = await apiClient.post('/auth/change-password/request-otp');
      setChangeChallengeId(res.data.changeChallengeId || res.data.loginChallengeId || res.data.id);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to request password change');
      setPasswordModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitChangePassword = async () => {
    if (!otp || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        changeChallengeId,
        otp,
        newPassword
      });
      Alert.alert('Success', 'Password changed successfully. Please log in again.');
      setPasswordModalVisible(false);
      signOut();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Extract initial for avatar
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Profile" titleStyle={styles.headerTitle} />
        
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
              <Text style={{ fontSize: 36, color: COLORS.primary }}>≡</Text>
            </TouchableOpacity>
          }
          contentStyle={{ backgroundColor: COLORS.surface }}
        >
          <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Home'); }} title="Home" />
          <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Search'); }} title="Search" />
          {user?.role !== 'superadmin' && (
            <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('AddArticle'); }} title="Add article" />
          )}
          <Menu.Item onPress={() => { setMenuVisible(false); }} title="Profile" />
          <Menu.Item onPress={() => { setMenuVisible(false); signOut(); }} title="Logout" />
        </Menu>
      </Appbar.Header>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profilePhone}>{user?.phone || 'N/A'}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{user?.role || 'User'}</Text>
            </View>
          </View>
        </View>

        {/* ACCOUNT Section */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.tableBlock}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>NAME</Text>
            <Text style={styles.tableValue}>{user?.name || 'N/A'}</Text>
          </View>
          <View style={styles.tableDivider} />
          
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>MOBILE (SIGN-IN)</Text>
            <Text style={styles.tableValue}>{user?.phone || 'N/A'}</Text>
          </View>
          <View style={styles.tableDivider} />
          
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>EMAIL</Text>
            <Text style={styles.tableValue}>{user?.email || 'N/A'}</Text>
          </View>
          <View style={styles.tableDivider} />
          
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>ROLE</Text>
            <Text style={styles.tableValue}>{user?.role || 'N/A'}</Text>
          </View>
          <View style={styles.tableDivider} />
          
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>OFFICE</Text>
            <Text style={styles.tableValue}>{user?.name || 'N/A'}</Text> 
          </View>
          <View style={styles.tableDivider} />
          
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>VERSION</Text>
            <Text style={styles.tableValue}>v1.0.0</Text>
          </View>
        </View>

        {/* ACTIONS Section */}
        <Text style={styles.sectionTitle}>ACTIONS</Text>
        
        {/* Manage Users Card */}
        {user?.role !== 'employee' && (
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.navigate('Users')}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIconText}>U</Text>
            </View>
            <Text style={styles.actionCardText}>Manage Users</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* Change Password Button */}
        <TouchableOpacity style={styles.outlineButton} activeOpacity={0.7} onPress={handleRequestChangePassword}>
          <Text style={styles.outlineButtonText}>Change password</Text>
        </TouchableOpacity>

        

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={signOut} activeOpacity={0.7}>
          <Text style={styles.logoutButtonText}>Log out</Text>
        </TouchableOpacity>

      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Government of India · Ministry of Defence · v1.0.0
        </Text>
      </View>

      {/* Change Password Modal */}
      <Modal visible={passwordModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            {loading && !changeChallengeId ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <>
                <Text style={styles.modalSubtitle}>Enter the verification code sent to your registered contact.</Text>
                <TextInput
                  label="OTP"
                  value={otp}
                  onChangeText={setOtp}
                  mode="outlined"
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
                <TextInput
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  mode="outlined"
                  secureTextEntry
                  style={styles.modalInput}
                />
                <TextInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  mode="outlined"
                  secureTextEntry
                  style={styles.modalInput}
                />
                <View style={styles.modalActions}>
                  <Button mode="text" onPress={() => setPasswordModalVisible(false)} disabled={loading}>Cancel</Button>
                  <Button mode="contained" onPress={handleSubmitChangePassword} loading={loading} disabled={loading}>Submit</Button>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F1',
  },
  header: {
    backgroundColor: '#fff',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerEmblem: {
    width: 24,
    height: 36,
    marginLeft: 16,
  },
  headerTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#1C2942',
    fontSize: 18,
  },
  menuButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF2E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D97706',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  rolePill: {
    backgroundColor: '#FFF2E5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D97706',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },
  tableBlock: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 24,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tableLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#777',
    letterSpacing: 0.5,
    flex: 0.4,
  },
  tableValue: {
    fontSize: 14,
    color: '#111',
    fontWeight: '500',
    flex: 0.6,
    textAlign: 'right',
  },
  tableDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1C2942',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C2942',
  },
  actionCardText: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C2942',
  },
  chevron: {
    fontSize: 24,
    color: '#1C2942',
    fontWeight: '300',
  },
  outlineButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#1C2942',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C2942',
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B91C1C',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F5F6F1',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 8,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
});

export default ProfileScreen;
