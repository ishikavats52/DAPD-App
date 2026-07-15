import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Appbar, Card } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import apiClient from '../../api/client';
import { COLORS } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'AuditLog'>;
};

type AuditLogEntry = {
  _id: string;
  action: string;
  user: string; // The user ID it was performed on
  resource: string;
  resourceId: string;
  details: string;
  ip: string;
  createdAt: string;
  // Based on your backend, 'user' might be the user object or just ID. If you have "By Neeraj", it might need user population.
  // We'll map what we have from the backend. The backend currently stores `user` as the acting user's ID.
  actorName?: string;
  targetEmail?: string;
  payload?: any;
};

// Map action to style colors
const getPillStyle = (action: string) => {
  const normalized = action.toUpperCase();
  if (normalized.includes('CREATE') || normalized.includes('ADD') || normalized.includes('APPROVE')) {
    return { bg: '#DCFCE7', text: '#166534' }; // Green
  }
  if (normalized.includes('DELETE')) {
    return { bg: '#FEE2E2', text: '#991B1B' }; // Red
  }
  if (normalized.includes('ROLE')) {
    return { bg: '#FFEDD5', text: '#9A3412' }; // Saffron
  }
  if (normalized === 'LOGOUT') {
    return { bg: '#F3E8FF', text: '#7E22CE' }; // Purple
  }
  if (normalized === 'LOGIN') {
    return { bg: '#E6F4FE', text: '#1E3A8A' }; // Light blue
  }
  // Default (Update, etc.) - Navy/Blue
  return { bg: '#DBEAFE', text: '#1E3A8A' };
};

const formatDate = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  // e.g., Wed, 15 Jul 2026, 11:25:47 am IST
  // Just approximate formatting for React Native without heavy libraries
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZoneName: 'short'
  };
  return date.toLocaleString('en-IN', options);
};

const AuditLogScreen = ({ navigation }: Props) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        // Assuming the backend has this endpoint.
        // Also note: the backend currently might not fully populate the 'actorName', 
        // we will display the ID or details as available.
        const response = await apiClient.get('/audit?limit=100');
        setLogs(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch audit logs', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const renderItem = ({ item }: { item: AuditLogEntry }) => {
    const style = getPillStyle(item.action);
    const shortUserId = item.user ? `...${item.user.slice(-6)}` : 'System';
    const displayAction = item.action.replace(/_/g, ' ').toLowerCase();
    const capitalizedAction = displayAction.charAt(0).toUpperCase() + displayAction.slice(1);

    // Mocking details based on screenshot
    let payloadStr = '';
    if (item.action === 'CREATE_USER' || item.action === 'DELETE_USER') {
      try {
        // if details contains JSON
        if (item.details && item.details.startsWith('{')) {
          payloadStr = item.details;
        } else {
          // just an example fallback
          payloadStr = item.details ? `{"details": "${item.details}"}` : '';
        }
      } catch(e) {}
    }

    return (
      <Card style={styles.card} elevation={0}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.pill, { backgroundColor: style.bg }]}>
              <Text style={[styles.pillText, { color: style.text }]}>{capitalizedAction}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>

          <Text style={styles.userText}>User · {shortUserId}</Text>
          <Text style={styles.byText}>By {item.actorName || 'User'}</Text>
          <Text style={styles.ipText}>IP {item.ip || 'Unknown'}</Text>

          {payloadStr ? (
            <Text style={styles.payloadText}>{payloadStr}</Text>
          ) : null}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Audit log" titleStyle={styles.headerTitle} />
        
        <View style={styles.langToggle}>
          <TouchableOpacity onPress={() => setLang('EN')}>
            <Text style={[styles.langText, lang === 'EN' && styles.langTextActive]}>EN</Text>
          </TouchableOpacity>
          <View style={styles.langDivider} />
          <TouchableOpacity onPress={() => setLang('HI')}>
            <Text style={[styles.langText, lang === 'HI' && styles.langTextActive]}>हिं</Text>
          </TouchableOpacity>
        </View>
      </Appbar.Header>

      <View style={styles.content}>
        <Text style={styles.pageTitle}>Activity log</Text>
        <Text style={styles.subtitle}>
          Newest first. Green: create/add; navy: update; saffron: role change; red: delete.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
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
    backgroundColor: '#FFFFFF',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#1C2942',
    fontSize: 18,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  langText: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 8,
  },
  langTextActive: {
    fontWeight: 'bold',
    color: '#1C2942',
  },
  langDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E0E0E0',
  },
  content: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C2942',
    paddingHorizontal: 16,
    paddingTop: 24,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    paddingHorizontal: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  userText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  byText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ipText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  payloadText: {
    fontSize: 13,
    color: '#444',
    fontFamily: 'monospace',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});

export default AuditLogScreen;
