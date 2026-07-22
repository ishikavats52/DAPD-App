import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Appbar, Menu } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';
import useAuth from '../../hooks/useAuth';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Profile'>;
};

const ProfileScreen = ({ navigation }: Props) => {
  const { user, signOut } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  // Extract initial for avatar
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Image 
          source={require('../../../assets/emblem.png')}
          style={styles.headerEmblem}
          resizeMode="contain"
        />
        <Appbar.Content title="Profile" titleStyle={styles.headerTitle} />
        
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
        <TouchableOpacity style={styles.outlineButton} activeOpacity={0.7}>
          <Text style={styles.outlineButtonText}>Change password</Text>
        </TouchableOpacity>

        {/* Office Articles Card */}
        <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
          <View style={styles.actionIconBox}>
            <Text style={styles.actionIconText}>O</Text>
          </View>
          <Text style={styles.actionCardText}>Office Articles</Text>
          <Text style={styles.chevron}>›</Text>
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
});

export default ProfileScreen;
