import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Text, Card, Appbar, Menu } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import apiClient from '../../api/client';
import useAuth from '../../hooks/useAuth';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Home'>;
};

type Medicine = {
  _id: string;
  nomenclature: string;
  tag: string;
  quantity: string;
  totalValue?: string;
  createdAt: string;
};

const HomeScreen = ({ navigation }: Props) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
  const { signOut, user } = useAuth();

  const fetchMedicines = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        if (!hasMore || isFetchingMore) return;
        setIsFetchingMore(true);
      } else {
        setLoading(true);
      }

      const currentPage = isLoadMore ? page + 1 : 1;
      const response = await apiClient.get(`/medicines?limit=15&page=${currentPage}`);
      
      const newData = response.data.data || [];
      const totalPages = response.data.meta?.totalPages || 1;
      
      if (isLoadMore) {
        setMedicines(prev => {
          const newItems = newData.filter((newItem: Medicine) => !prev.some(item => item._id === newItem._id));
          return [...prev, ...newItems];
        });
        setPage(currentPage);
      } else {
        setMedicines(newData);
        setPage(1);
      }
      
      setHasMore(currentPage < totalPages);
      
    } catch (error) {
      console.error('Failed to fetch medicines', error);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMedicines(false);
    });
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }: { item: Medicine }) => {
    const price = item.totalValue ? `₹${item.totalValue}/unit` : 'N/A';

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('MedicineDetail', { id: item._id })}
        elevation={0}
      >
        <Card.Content>
          <Text style={styles.cardTag}>Tag {item.tag || 'N/A'}</Text>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.nomenclature || 'Unknown Item'}</Text>
          <Text style={styles.cardSubtitle}>{item.quantity || 0} · {price}</Text>
        </Card.Content>
      </Card>
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
        <Appbar.Content title="Home" titleStyle={styles.headerTitle} />

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
            <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Users'); }} title="Users" />
          )}
          <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }} title="Profile" />
          <Menu.Item onPress={() => { setMenuVisible(false); signOut(); }} title="Logout" />
        </Menu>
      </Appbar.Header>

      <View style={styles.content}>
        <View style={styles.userInfoSection}>
          <View style={styles.badgesRow}>
            <View style={styles.badgeAdmin}>
              <Text style={styles.badgeAdminText}>
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin'}
              </Text>
            </View>
            <View style={styles.badgeDapd}><Text style={styles.badgeDapdText}>DAPD</Text></View>
          </View>
          <Text style={styles.greetingTitle}>Hi, {user?.name?.split(' ')[0] || 'User'}</Text>
          <Text style={styles.greetingSubtitle}>Tap a card for full details. Search by tag or name.</Text>

          {user?.role === 'superadmin' && (
            <TouchableOpacity 
              style={styles.auditLogCard} 
              onPress={() => navigation.navigate('AuditLog')}
              activeOpacity={0.7}
            >
              <Text style={styles.auditLogText}>A  Audit Log</Text>
              <Text style={styles.auditLogChevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {user?.role !== 'superadmin' && (
          <>
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ARTICLES</Text>
              <View style={styles.dividerLine} /> 
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={medicines}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                onEndReached={() => fetchMedicines(true)}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  isFetchingMore ? (
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ padding: 16 }} />
                  ) : null
                }
              />
            )}
          </>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
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
    color: COLORS.primary,
    fontSize: 18,
  },
  menuButton: {
    padding: 12,
  },
  content: {
    flex: 1,
  },
  userInfoSection: {
    padding: 16,
    paddingTop: 24,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  badgeAdmin: {
    backgroundColor: '#FDEAE1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeAdminText: {
    color: COLORS.accent,
    fontWeight: 'bold',
    fontSize: 12,
  },
  badgeDapd: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeDapdText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 8,
  },
  greetingSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  auditLogCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  auditLogText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C2942',
  },
  auditLogChevron: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C2942',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardTag: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
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

export default HomeScreen;
