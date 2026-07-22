import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, FlatList, TextInput, Keyboard } from 'react-native';
import { Text, Appbar, Menu, Card, ActivityIndicator, Chip } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../api/client';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Search'>;
};

type Medicine = {
  _id: string;
  nomenclature: string;
  tag: string;
  quantity: string;
  totalValue?: string;
  createdAt: string;
};

const SearchScreen = ({ navigation }: Props) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const { user, signOut } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<string>('Tag'); // 'Tag', 'Company name', 'Nomenclature'
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const handleSearch = async (isLoadMore = false) => {
    if (!searchQuery.trim()) return;
    
    if (isLoadMore === true) {
      if (!hasMore || isFetchingMore) return;
      setIsFetchingMore(true);
    } else {
      Keyboard.dismiss();
      setLoading(true);
      setHasSearched(true);
    }
    
    try {
      const currentPage = isLoadMore === true ? page + 1 : 1;
      const response = await apiClient.get(`/medicines/search?q=${encodeURIComponent(searchQuery)}&filterBy=${encodeURIComponent(filterBy)}&limit=15&page=${currentPage}`);
      
      const newData = response.data.data || [];
      const totalPages = response.data.meta?.totalPages || 1;
      
      if (isLoadMore === true) {
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
      console.error('Failed to search medicines', error);
      if (isLoadMore !== true) setMedicines([]);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

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
          source={require('../../../assets/emblem.png')}
          style={styles.headerEmblem}
          resizeMode="contain"
        />
        <Appbar.Content title="Search" titleStyle={styles.headerTitle} />
        
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

      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <View style={styles.inputWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleSearch(false)}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.goButton} onPress={() => handleSearch(false)}>
            <Text style={styles.goButtonText}>Go</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chipRow}>
          {['Tag', 'Company name', 'Nomenclature'].map((chip) => (
            <Chip
              key={chip}
              selected={filterBy === chip}
              onPress={() => setFilterBy(chip)}
              style={[styles.chip, filterBy === chip && styles.chipSelected]}
              textStyle={[styles.chipText, filterBy === chip && styles.chipTextSelected]}
              mode={filterBy === chip ? 'flat' : 'outlined'}
            >
              {chip}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.content}>
        {!hasSearched ? (
          <View style={styles.emptyStateContainer}>
            <Card style={styles.emptyStateCard} elevation={0}>
              <Card.Content style={{ alignItems: 'center', paddingVertical: 16 }}>
                <Text style={styles.emptyStateTitle}>Search articles</Text>
                <Text style={styles.emptyStateSubtitle}>Select a filter and type to search.</Text>
              </Card.Content>
            </Card>
          </View>
        ) : loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : medicines.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={{ textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 }}>
              No articles found matching "{searchQuery}".
            </Text>
          </View>
        ) : (
          <FlatList
            data={medicines}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={() => handleSearch(true)}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingMore ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ padding: 16 }} />
              ) : null
            }
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
  searchSection: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 12,
    marginRight: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  goButton: {
    backgroundColor: '#1E3A5F', // Dark blue from the design
    borderRadius: 8,
    paddingHorizontal: 20,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.divider,
  },
  chipSelected: {
    backgroundColor: '#F0F4FF',
    borderColor: '#1E3A5F',
    borderWidth: 1,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#1E3A5F',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  emptyStateContainer: {
    padding: 16,
    paddingTop: 32,
  },
  emptyStateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
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

export default SearchScreen;
