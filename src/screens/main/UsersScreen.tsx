import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Appbar, Menu, ActivityIndicator, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../api/client';
import { useIsFocused } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Users'>;
};

const getAvatarStyle = (name: string) => {
  const char = (name || 'U').charAt(0).toUpperCase();
  // Simple check based on mockup (L is green, I/Y orange)
  if (['L', 'A', 'E', 'O', 'U'].includes(char)) {
    return { bg: '#E6F4EA', text: '#137333' }; // Green
  }
  return { bg: '#FFF3E0', text: '#E65100' }; // Orange
};

const getRoleStyle = (role: string) => {
  if (role === 'employee') return { bg: '#E6F4EA', text: '#137333' }; // Green
  return { bg: '#FFF3E0', text: '#E65100' }; // Orange
};

const UsersScreen = ({ navigation }: Props) => {
  const { signOut, user } = useAuth();
  const isFocused = useIsFocused();
  const [menuVisible, setMenuVisible] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'approved' | 'pending'>('approved');
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');

  const fetchUsers = async (mode: 'approved' | 'pending') => {
    try {
      setLoading(true);
      if (mode === 'pending') {
        const response = await apiClient.get('/users/pending-admins');
        setUsers(response.data.data || []);
      } else {
        if (user?.role === 'superadmin') {
          const [empRes, adminRes] = await Promise.all([
            apiClient.get('/users/employees'),
            apiClient.get('/users/admins')
          ]);
          const emps = empRes.data.data || [];
          const admins = adminRes.data.data || [];
          setUsers([...emps, ...admins]);
        } else {
          const response = await apiClient.get('/users/employees');
          setUsers(response.data.data || []);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchUsers(viewMode);
    }
  }, [isFocused, viewMode]);

  const handleApprove = async (id: string) => {
    try {
      setLoading(true);
      await apiClient.post(`/users/admins/${id}/approve`);
      Alert.alert("Success", "Admin approved successfully");
      fetchUsers(viewMode);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.response?.data?.message || "Failed to approve admin");
      setLoading(false);
    }
  };

  const handleReject = (id: string) => {
    Alert.alert(
      "Reject Admin",
      "Are you sure you want to reject this admin request?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reject", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await apiClient.post(`/users/admins/${id}/reject`);
              Alert.alert("Success", "Admin rejected");
              fetchUsers(viewMode);
            } catch (error: any) {
              console.error(error);
              Alert.alert("Error", error.response?.data?.message || "Failed to reject admin");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDelete = (id: string, role: string) => {
    Alert.alert(
      "Delete User",
      "Are you sure you want to delete this user? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              // Currently backend has /employees/:id, if admin, we might need a different route or just reject
              if (role === 'admin') {
                 await apiClient.post(`/users/admins/${id}/reject`); // Also deletes them
              } else {
                 await apiClient.delete(`/users/employees/${id}`);
              }
              Alert.alert("Success", "User deleted successfully");
              fetchUsers(viewMode);
            } catch (error: any) {
              console.error(error);
              Alert.alert("Error", error.response?.data?.message || "Failed to delete user");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const avatarStyle = getAvatarStyle(item.name);
    const roleStyle = getRoleStyle(item.role);

    return (
      <View style={styles.userCard}>
        <View style={styles.userCardContent}>
          <View style={[styles.avatarContainer, { backgroundColor: avatarStyle.bg }]}>
            <Text style={[styles.avatarText, { color: avatarStyle.text }]}>
              {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userPhone}>{item.phone}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={[styles.rolePill, { backgroundColor: roleStyle.bg }]}>
            <Text style={[styles.rolePillText, { color: roleStyle.text }]}>
              {item.role === 'employee' ? 'Employee' : 'Admin'}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardDivider} />
        
        <View style={styles.actionRow}>
          {viewMode === 'pending' ? (
            <>
              <TouchableOpacity 
                style={styles.approveButton} 
                activeOpacity={0.7}
                onPress={() => handleApprove(item.id || item._id)}
              >
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton} 
                activeOpacity={0.7}
                onPress={() => handleReject(item.id || item._id)}
              >
                <Text style={styles.deleteButtonText}>Reject</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.deleteButton} 
                activeOpacity={0.7}
                onPress={() => handleDelete(item.id || item._id, item.role)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Image 
          source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/250px-Emblem_of_India.svg.png' }}
          style={styles.headerEmblem}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Users</Text>
        
        <View style={styles.headerActions}>
          {user?.role === 'superadmin' && (
            <TouchableOpacity 
              onPress={() => setViewMode(viewMode === 'pending' ? 'approved' : 'pending')} 
              style={[styles.pillButton, viewMode === 'pending' ? styles.pillButtonActive : null]}
            >
              <Text style={styles.pillButtonText}>Pending</Text>
            </TouchableOpacity>
          )}
          
          {user?.role !== 'employee' && (
            <TouchableOpacity 
              onPress={() => navigation.navigate('AddEmployee')} 
              style={styles.pillButton}
            >
              <Text style={styles.pillButtonText}>+ Add</Text>
            </TouchableOpacity>
          )}
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
          <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Search'); }} title="Search" />
          {user?.role !== 'superadmin' && (
            <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('AddArticle'); }} title="Add article" />
          )}
          {user?.role !== 'employee' && (
            <Menu.Item onPress={() => { setMenuVisible(false); }} title="Users" />
          )}
          <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }} title="Profile" />
          
          <Divider />
          <View style={styles.langToggleMenu}>
            <TouchableOpacity onPress={() => setLang('EN')} style={styles.langBtn}>
              <Text style={[styles.langText, lang === 'EN' && styles.langTextActive]}>EN</Text>
            </TouchableOpacity>
            <View style={styles.langDivider} />
            <TouchableOpacity onPress={() => setLang('HI')} style={styles.langBtn}>
              <Text style={[styles.langText, lang === 'HI' && styles.langTextActive]}>हिं</Text>
            </TouchableOpacity>
          </View>
          <Divider />

          <Menu.Item onPress={() => setMenuVisible(false)} title="Help" />
          <Menu.Item onPress={() => { setMenuVisible(false); signOut(); }} title="Logout" />
        </Menu>
      </Appbar.Header>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found.</Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id || item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Government of India · Ministry of Defence · v1.0.0
        </Text>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEmblem: { width: 24, height: 36, marginLeft: 16 },
  headerTitle: { 
    fontWeight: 'bold', 
    color: '#1C2942', 
    fontSize: 18, 
    marginLeft: 12,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    marginRight: 8,
  },
  pillButton: {
    backgroundColor: '#1C2942',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  pillButtonActive: {
    backgroundColor: '#374151', // slightly lighter to indicate active if needed
  },
  pillButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  menuButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 16,
    marginLeft: 8,
  },
  langToggleMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  langBtn: {
    paddingHorizontal: 12,
  },
  langText: {
    fontSize: 14,
    color: '#666',
  },
  langTextActive: {
    fontWeight: 'bold',
    color: '#1C2942',
  },
  langDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E0E0E0',
  },
  content: { flex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    marginBottom: 12,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  changeRoleButton: {
    flex: 1,
    backgroundColor: '#E8EDF5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  changeRoleText: {
    color: '#1C2942',
    fontWeight: 'bold',
    fontSize: 14,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FCE8E8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontWeight: 'bold',
    fontSize: 14,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#DEF7EC',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  approveButtonText: {
    color: '#03543F',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F5F6F1',
  },
  footerText: { fontSize: 12, color: COLORS.textSecondary },
});

export default UsersScreen;
