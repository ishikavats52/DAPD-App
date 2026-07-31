import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Text, Card, Appbar } from 'react-native-paper';
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

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY_BLUE} />
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#FFF" />
        <Appbar.Content title={['admin', 'superadmin'].includes(user?.role || '') ? "All Records" : "My Records"} titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <View style={styles.mainBackground}>
        {loading ? (
          <ActivityIndicator size="large" color={NAVY_BLUE} style={{ marginTop: 40 }} />
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
  mainBackground: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  flatListContainer: {
    paddingTop: 16,
    paddingBottom: 24,
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
