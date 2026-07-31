import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, SafeAreaView, StatusBar, Platform, ScrollView, Alert } from 'react-native';
import { Text, Menu } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../../hooks/useAuth';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Home'>;
};

const NAVY_BLUE = '#0D2340';
const GOLD = '#F3B718'; 
const CARD_BG = '#FFFFFF';

const HomeScreen = ({ navigation }: Props) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const { signOut, user } = useAuth();

  const handleNotImplemented = (feature: string) => {
    Alert.alert("Coming Soon", `${feature} will be implemented vastly later.`);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY_BLUE} />
      
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.userInfoContainer}>
          <Text style={styles.welcomeText} numberOfLines={1}>Welcome,</Text>
          <Text style={styles.userOfficeText} numberOfLines={1}>{user?.officeName || 'HQs'}</Text>
          <Text style={styles.userNameText} numberOfLines={1}>{user?.name || 'User'}</Text>
        </View>

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
              <Ionicons name="menu" size={32} color="#FFF" />
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
            <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Users'); }} title="Users" />
          )}
          <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }} title="Profile" />
          <Menu.Item onPress={() => { setMenuVisible(false); signOut(); }} title="Logout" />
        </Menu>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* Top Blue Header Section */}
        <View style={styles.topBlueSection}>
          <Image
            source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/250px-Emblem_of_India.svg.png' }}
            style={styles.emblem}
            resizeMode="contain"
            tintColor={GOLD}
          />
          <Text style={styles.dapdTitle}>DAPD</Text>
          <Text style={styles.dapdSubtitle}>DEFENCE ARTICLES{'\n'}PRICING DEPOSITORY</Text>
          <Text style={styles.tagline}>Powering Strategic Financial Oversight</Text>
        </View>

        {/* White Card Layout overlaying the bottom of the blue section */}
        <View style={styles.whiteContainerWrapper}>
          <View style={styles.whiteCardContainer}>
            
            <View style={styles.actionMenuContainer}>
              {user?.role !== 'superadmin' && (
                <>
                  {/* Scan Document */}
                  <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => navigation.navigate('AddArticle')}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons name="scan-outline" size={28} color="#FFF" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>Scan Document</Text>
                      <Text style={styles.actionSubtitle}>Scan Supply Order / BBQR using camera</Text>
                    </View>
                  </TouchableOpacity>

                  {/* My Records */}
                  <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => navigation.navigate('MyRecords')}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons name="document-text-outline" size={28} color="#FFF" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>{user?.role === 'admin' ? 'All Records' : 'My Records'}</Text>
                      <Text style={styles.actionSubtitle}>{user?.role === 'admin' ? 'View all scanned documents' : 'View & search scanned documents'}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Search */}
                  <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => navigation.navigate('Search')}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons name="search-outline" size={28} color="#FFF" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>Search</Text>
                      <Text style={styles.actionSubtitle}>Search by keyword or rescan similar document</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {/* Analytics */}
              <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => navigation.navigate('MISReport')}>
                <View style={styles.actionIconContainer}>
                  <Ionicons name="bar-chart-outline" size={28} color="#FFF" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Analytics</Text>
                  <Text style={styles.actionSubtitle}>Insights & benchmarking reports</Text>
                </View>
              </TouchableOpacity>

              {/* Audit Report */}
              {user?.role === 'superadmin' && (
                <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => navigation.navigate('AuditLog')}>
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="shield-checkmark-outline" size={28} color="#FFF" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Audit Report</Text>
                    <Text style={styles.actionSubtitle}>Monitor login and user activity</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

          </View>
        </View>
      </ScrollView>
      
      {/* Footer pinned to bottom */}
      <View style={styles.footerContainer}>
        <Ionicons name="lock-closed" size={14} color={GOLD} />
        <Text style={styles.bottomBrandingText}> Secure  •  Reliable  •  Strategic</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: NAVY_BLUE,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 30 : 10,
    paddingBottom: 0,
    backgroundColor: NAVY_BLUE,
  },
  userInfoContainer: {
    flex: 1,
    marginRight: 16,
    justifyContent: 'center',
  },
  welcomeText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 2,
  },
  userOfficeText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userNameText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  menuButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  topBlueSection: {
    backgroundColor: NAVY_BLUE,
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  emblem: {
    width: 60,
    height: 80,
    marginBottom: 8,
  },
  dapdTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
    marginBottom: 4,
  },
  dapdSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 16,
    lineHeight: 20,
  },
  tagline: {
    fontSize: 14,
    color: GOLD,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  whiteContainerWrapper: {
    backgroundColor: NAVY_BLUE,
    flex: 1,
  },
  whiteCardContainer: {
    backgroundColor: '#F5F7FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  actionMenuContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: NAVY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C2942',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  footerContainer: {
    backgroundColor: NAVY_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  bottomBrandingText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default HomeScreen;
