import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, SectionList, ActivityIndicator, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Text, Card, Appbar, Menu, Provider } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';
import useAuth from '../../hooks/useAuth';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'MyRecords'>;
};

type Medicine = {
  _id: string;
  nomenclature: string;
  tag: string;
  quantity: string;
  totalValue?: string;
  createdAt: string;
  creator?: {
    name: string;
  };
};

const NAVY_BLUE = '#0D2340';
const CARD_BG = '#FFFFFF';

const MyRecordsScreen = ({ navigation }: Props) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Stats state
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('All Users');
  const [overallTotal, setOverallTotal] = useState<number>(0);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const isFocused = useIsFocused();
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
  const { user } = useAuth();

  const fetchMedicines = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        if (!hasMore || isFetchingMore) return;
        setIsFetchingMore(true);
      } else {
        setLoading(true);
      }

      const currentPage = isLoadMore ? page + 1 : 1;
      let url = `/medicines?limit=15&page=${currentPage}`;
      if ((user?.role === 'admin' || user?.role === 'superadmin') && selectedUserId) {
        url += `&userId=${selectedUserId}`;
      }
      
      const response = await apiClient.get(url);
      
      const newData = response.data.data || [];
      const totalPages = response.data.meta?.totalPages || 1;
      
      if (response.data.meta?.overallTotal !== undefined) {
        setOverallTotal(response.data.meta.overallTotal);
      }
      
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
  }, [navigation, selectedUserId]);

  useEffect(() => {
    if (isFocused && (user?.role === 'admin' || user?.role === 'superadmin')) {
      const fetchUsersList = async () => {
        try {
          if (user?.role === 'superadmin') {
            const [empRes, adminRes] = await Promise.all([
              apiClient.get('/users/employees'),
              apiClient.get('/users/admins')
            ]);
            setUsers([...(empRes.data.data || []), ...(adminRes.data.data || [])]);
          } else if (user?.role === 'admin') {
            const response = await apiClient.get('/users/employees');
            setUsers(response.data.data || []);
          }
        } catch (e) {
          console.error('Failed to fetch users', e);
        }
      };
      fetchUsersList();
    }
  }, [isFocused, user]);

  const renderItem = ({ item }: { item: Medicine }) => {
    const price = item.totalValue ? `₹${item.totalValue}/unit` : 'N/A';
    const scannerName = item.creator?.name || 'Unknown User';

    return (
      <Card
        style={styles.articleCard}
        onPress={() => navigation.navigate('MedicineDetail', { id: item._id })}
        elevation={0}
      >
        <Card.Content>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTag}>Tag {item.tag || 'N/A'}</Text>
            {['admin', 'superadmin'].includes(user?.role || '') && (
              <Text style={styles.scannerBadge}>By: {scannerName}</Text>
            )}
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.nomenclature || 'Unknown Item'}</Text>
          <Text style={styles.cardSubtitle}>{item.quantity || 0} · {price}</Text>
        </Card.Content>
      </Card>
    );
  };

  const groupedMedicines = useMemo(() => {
    const map: Record<string, Medicine[]> = {};
    medicines.forEach(m => {
      const creatorName = m.creator?.name || 'Unknown User';
      if (!map[creatorName]) map[creatorName] = [];
      map[creatorName].push(m);
    });
    return Object.keys(map).map(title => ({
      title,
      data: map[title]
    }));
  }, [medicines]);

  return (
    <Provider>
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY_BLUE} />
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#FFF" />
        <Appbar.Content title={['admin', 'superadmin'].includes(user?.role || '') ? "All Records" : "My Records"} titleStyle={styles.headerTitle} />
        {['admin', 'superadmin'].includes(user?.role || '') && (
          <Menu
            visible={filterMenuVisible}
            onDismiss={() => setFilterMenuVisible(false)}
            anchor={
              <TouchableOpacity onPress={() => setFilterMenuVisible(true)} style={styles.filterButton}>
                <Ionicons name="filter" size={24} color="#FFF" />
              </TouchableOpacity>
            }
          >
            <Menu.Item 
              onPress={() => { setSelectedUserId(''); setSelectedUserName('All Users'); setFilterMenuVisible(false); }} 
              title="All Users" 
            />
            {users.map((u) => (
              <Menu.Item 
                key={u.id || u._id} 
                onPress={() => { setSelectedUserId(u.id || u._id); setSelectedUserName(u.name || u.officeName || 'User'); setFilterMenuVisible(false); }} 
                title={u.name || u.officeName || 'Unknown'} 
              />
            ))}
          </Menu>
        )}
      </Appbar.Header>

      <View style={styles.mainBackground}>
        {['admin', 'superadmin'].includes(user?.role || '') && (
          <View style={styles.statsBanner}>
            <Text style={styles.statsText}>Total Scanned Documents: {overallTotal}</Text>
            {selectedUserId !== '' && (
              <Text style={styles.filterBadge}>Filtered by: {selectedUserName}</Text>
            )}
          </View>
        )}
        {loading ? (
          <ActivityIndicator size="large" color={NAVY_BLUE} style={{ marginTop: 40 }} />
        ) : ['admin', 'superadmin'].includes(user?.role || '') ? (
          <SectionList
            sections={groupedMedicines}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionHeaderContainer}>
                <Text style={styles.sectionHeaderText}>{title}</Text>
              </View>
            )}
            contentContainerStyle={styles.flatListContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={() => fetchMedicines(true)}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              <View style={styles.listFooter}>
                {isFetchingMore ? (
                  <ActivityIndicator size="small" color={NAVY_BLUE} style={{ padding: 16 }} />
                ) : null}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No records found.</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={medicines}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.flatListContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={() => fetchMedicines(true)}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              <View style={styles.listFooter}>
                {isFetchingMore ? (
                  <ActivityIndicator size="small" color={NAVY_BLUE} style={{ padding: 16 }} />
                ) : null}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No records found.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
    </Provider>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: NAVY_BLUE,
  },
  header: {
    backgroundColor: NAVY_BLUE,
    elevation: 0,
  },
  headerTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 20,
  },
  filterButton: {
    padding: 8,
    marginRight: 8,
  },
  statsBanner: {
    backgroundColor: '#E6EBF5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D0D8E8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NAVY_BLUE,
  },
  filterBadge: {
    fontSize: 12,
    color: '#0055AA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0055AA',
    overflow: 'hidden',
  },
  mainBackground: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  flatListContainer: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionHeaderContainer: {
    backgroundColor: '#E6EBF5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D2340',
  },
  articleCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scannerBadge: {
    fontSize: 11,
    color: '#0055AA',
    backgroundColor: '#E6F0FA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
    fontWeight: 'bold',
  },
  cardTag: {
    color: NAVY_BLUE,
    fontWeight: 'bold',
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  listFooter: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default MyRecordsScreen;
