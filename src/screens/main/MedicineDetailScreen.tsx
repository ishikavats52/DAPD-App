import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Appbar, Menu, ActivityIndicator, Button } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../api/client';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import * as FileSystem from 'expo-file-system/legacy';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'MedicineDetail'>;
  route: RouteProp<MainStackParamList, 'MedicineDetail'>;
};

const MedicineDetailScreen = ({ navigation, route }: Props) => {
  const { id } = route.params;
  const { signOut } = useAuth();
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<any>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/medicines/${id}`);
        setArticle(response.data.data);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch article details.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!article) return;
    
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
              h1 { color: #1E3A5F; text-align: center; }
              .section { margin-top: 30px; margin-bottom: 10px; }
              .section-title { font-size: 14px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              td { padding: 10px; border-bottom: 1px solid #eee; }
              .label { width: 35%; font-weight: bold; color: #555; }
              .value { width: 65%; color: #000; }
            </style>
          </head>
          <body>
            <h1>Article Details</h1>
            <div style="background-color: #F0F4FF; padding: 15px; text-align: center; border-radius: 8px; border: 1px solid #1E3A5F; margin-bottom: 30px;">
              <strong style="color: #1E3A5F; font-size: 18px;">Tag: ${article.tag || 'N/A'}</strong>
            </div>

            <div class="section-title">BASIC INFO</div>
            <table>
              <tr><td class="label">Nomenclature</td><td class="value">${article.nomenclature || 'N/A'}</td></tr>
              <tr><td class="label">Quantity</td><td class="value">${article.quantity || '0'}</td></tr>
              <tr><td class="label">Total value (₹)</td><td class="value">${article.totalValue || '0'}</td></tr>
              <tr><td class="label">Total value in words</td><td class="value">${article.totalValueInWords || 'N/A'}</td></tr>
              <tr><td class="label">Per unit price (₹)</td><td class="value">₹ ${article.perUnitPrice || '0'}</td></tr>
            </table>

            <div class="section-title">VENDOR</div>
            <table>
              <tr><td class="label">Company name</td><td class="value">${article.companyName || 'N/A'}</td></tr>
              <tr><td class="label">Location</td><td class="value">${article.location || 'N/A'}</td></tr>
            </table>

            <div class="section-title">ORGANISATION</div>
            <table>
              <tr><td class="label">Unit</td><td class="value">${article.organisation || 'N/A'}</td></tr>
            </table>

            <div class="section-title">SUPPLY</div>
            <table>
              <tr><td class="label">Supply order</td><td class="value">${article.supplyOrder || 'N/A'}</td></tr>
              <tr><td class="label">Supply date</td><td class="value">${article.supplyDate || 'N/A'}</td></tr>
            </table>
          </body>
        </html>
      `;

      // Use base64: true to bypass Android cache read permission issues
      const { base64 } = await Print.printToFileAsync({ html: htmlContent, base64: true });
      
      const newUri = `${FileSystem.documentDirectory}article_${article.tag || 'details'}.pdf`;
      
      if (base64) {
        await FileSystem.writeAsStringAsync(newUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      
      await Sharing.shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', `Failed to generate PDF: ${error?.message || String(error)}`);
    }
  };

  const handleEdit = () => {
    // Transform article fields to match VerificationScreen format
    const extractedData = {
      ...article,
      lineItems: [
        {
          nomenclature: article.nomenclature,
          quantity: String(article.quantity),
          lineTotal: article.totalValue,
        }
      ]
    };

    navigation.navigate('Verification', {
      extractedData,
      imageUris: article.imageUrls || (article.imageUrl ? [article.imageUrl] : []),
      isEditMode: true,
      editId: article._id
    });
  };

  if (loading || !article) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Image 
          source={require('../../../assets/emblem.png')}
          style={styles.headerEmblem}
          resizeMode="contain"
        />
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Article details" titleStyle={styles.headerTitle} />
        
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
          <Menu.Item onPress={() => { setMenuVisible(false); signOut(); }} title="Logout" />
        </Menu>
      </Appbar.Header>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Tag Banner */}
        <View style={styles.tagBanner}>
          <Text style={styles.tagText}>Tag: {article.tag}</Text>
        </View>

        {/* Image Preview Box */}
        <View style={styles.imagePreviewBox}>
          {article.imageUrls && article.imageUrls.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {article.imageUrls.map((uri: string, index: number) => (
                <Image key={index} source={{ uri: uri.replace('localhost', '10.0.2.2') }} style={{ width: 280, height: 200, borderRadius: 8, marginRight: 16 }} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : article.imageUrl ? (
            <Image source={{ uri: article.imageUrl.replace('localhost', '10.0.2.2') }} style={{ width: '100%', height: 200, borderRadius: 8 }} resizeMode="cover" />
          ) : null}
        </View>

        {/* BASIC INFO TABLE */}
        <Text style={styles.sectionTitle}>BASIC INFO</Text>
        <View style={styles.tableBlock}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Nomenclature 1</Text>
            <Text style={styles.tableValue}>{article.nomenclature}</Text>
          </View>
          <View style={styles.tableDivider} />
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Quantity</Text>
            <Text style={styles.tableValue}>{article.quantity}</Text>
          </View>
          <View style={styles.tableDivider} />
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Total value (₹)</Text>
            <Text style={styles.tableValue}>{article.totalValue}</Text>
          </View>
          <View style={styles.tableDivider} />
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Total value in words</Text>
            <Text style={styles.tableValue}>{article.totalValueInWords}</Text>
          </View>
          <View style={styles.tableDivider} />
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Per unit price (₹)</Text>
            <Text style={styles.tableValue}>₹ {article.perUnitPrice}</Text>
          </View>
        </View>

        {/* VENDOR TABLE */}
        <Text style={styles.sectionTitle}>VENDOR</Text>
        <View style={styles.tableBlock}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Company name</Text>
            <Text style={styles.tableValue}>{article.companyName}</Text>
          </View>
          <View style={styles.tableDivider} />
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Location</Text>
            <Text style={styles.tableValue}>{article.location}</Text>
          </View>
        </View>

        {/* ORGANISATION TABLE */}
        <Text style={styles.sectionTitle}>ORGANISATION</Text>
        <View style={styles.tableBlock}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Unit</Text>
            <Text style={styles.tableValue}>{article.organisation}</Text>
          </View>
        </View>

        {/* SUPPLY TABLE */}
        <Text style={styles.sectionTitle}>SUPPLY</Text>
        <View style={styles.tableBlock}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Supply order</Text>
            <Text style={styles.tableValue}>{article.supplyOrder}</Text>
          </View>
          <View style={styles.tableDivider} />
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Supply date</Text>
            <Text style={styles.tableValue}>{article.supplyDate}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionButtons}>
          <Button 
            mode="outlined" 
            onPress={handleDownloadPDF} 
            style={styles.downloadButton}
            labelStyle={styles.downloadButtonText}
          >
            Download PDF
          </Button>
          <Button 
            mode="contained" 
            onPress={handleEdit} 
            style={styles.editButton}
            labelStyle={styles.editButtonText}
          >
            Edit article
          </Button>
        </View>
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    marginLeft: 8,
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
  tagBanner: {
    backgroundColor: '#EAEFF8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4DEEE',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  tagText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  imagePreviewBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 200,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 1.5,
    marginBottom: 8,
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
    alignItems: 'flex-start',
  },
  tableLabel: {
    flex: 0.4,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  tableValue: {
    flex: 0.6,
    fontSize: 14,
    color: '#111',
    lineHeight: 20,
  },
  tableDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  actionButtons: {
    marginTop: 16,
    gap: 12,
  },
  downloadButton: {
    borderColor: '#1E3A5F',
    borderWidth: 1.5,
    borderRadius: 4,
    paddingVertical: 6,
  },
  downloadButtonText: {
    color: '#1E3A5F',
    fontWeight: 'bold',
    fontSize: 16,
  },
  editButton: {
    backgroundColor: '#1E3A5F',
    borderRadius: 4,
    paddingVertical: 6,
  },
  editButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
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

export default MedicineDetailScreen;
