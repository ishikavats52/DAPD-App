import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Appbar, Menu, ActivityIndicator } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../api/client';
import { useIsFocused } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Users'>;
};

const UsersScreen = ({ navigation }: Props) => {
  const { signOut } = useAuth();
  const isFocused = useIsFocused();
  const [menuVisible, setMenuVisible] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/users/employees');
      setUsers(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchUsers();
    }
  }, [isFocused]);

  const handleDelete = (id: string) => {
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
              await apiClient.delete(`/users/employees/${id}`);
              Alert.alert("Success", "User deleted successfully");
              fetchUsers();
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

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <View style={styles.userCardContent}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : 'U'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userPhone}>{item.phone}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{item.role === 'employee' ? 'Employee' : item.role}</Text>
        </View>
      </View>
      <View style={styles.cardDivider} />
      <TouchableOpacity 
        style={styles.deleteButton} 
        activeOpacity={0.7}
        onPress={() => handleDelete(item.id || item._id)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Image 
          source={require('../../../assets/emblem.png')}
          style={styles.headerEmblem}
          resizeMode="contain"
        />
        <Appbar.Content title="Users" titleStyle={styles.headerTitle} />
        
        <TouchableOpacity onPress={() => navigation.navigate('AddEmployee')} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>

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
  },
  headerEmblem: { width: 24, height: 36, marginLeft: 16 },
  headerTitle: { textAlign: 'center', fontWeight: 'bold', color: '#1C2942', fontSize: 18 },
  addButton: {
    marginRight: 12,
  },
  addButtonText: {
    color: '#1C2942',
    fontWeight: 'bold',
    fontSize: 16,
  },
  menuButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 16,
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
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#137333',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#777',
  },
  rolePill: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#137333',
    textTransform: 'capitalize',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  deleteButton: {
    backgroundColor: '#FCE8E8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#B91C1C',
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
