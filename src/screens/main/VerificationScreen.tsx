import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native';
import { Text, TextInput, Button, Appbar, Surface } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import apiClient from '../../api/client';
import * as SecureStore from 'expo-secure-store';
import { COLORS } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'Verification'>;

const VerificationScreen = ({ route, navigation }: Props) => {
  const { extractedData, imageUris, isEditMode, editId } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  
  // Dynamic line items (Nomenclatures)
  const initialLines = extractedData?.lineItems && extractedData.lineItems.length > 0
    ? extractedData.lineItems.map((li: any) => ({
        nomenclature: li.nomenclature || '',
        quantity: li.quantity || '',
        unitPrice: li.unitPrice ? String(li.unitPrice) : '',
        lineTotal: li.lineTotal ? String(li.lineTotal) : ''
      }))
    : [{ nomenclature: extractedData?.nomenclature || '', quantity: extractedData?.quantity || '', unitPrice: '', lineTotal: '' }];

  const [lineItems, setLineItems] = useState(initialLines);

  const [formData, setFormData] = useState({
    totalValue: extractedData?.totalValue || '',
    totalValueInWords: extractedData?.totalValueInWords || '',
    uoNumber: extractedData?.uoNumber || '',
    companyName: extractedData?.companyName || '',
    location: extractedData?.location || '',
    organisation: extractedData?.organisation || '',
    supplyOrder: extractedData?.supplyOrder || '',
    supplyDate: extractedData?.supplyDate || new Date().toISOString().slice(0, 10),
  });

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleLineChange = (index: number, key: string, value: string) => {
    const newLines = [...lineItems];
    newLines[index] = { ...newLines[index], [key]: value };
    setLineItems(newLines);
  };

  const addLine = () => {
    setLineItems([...lineItems, { nomenclature: '', quantity: '', unitPrice: '', lineTotal: '' }]);
  };

  const handleSave = async () => {
    // Basic validation
    if (!lineItems[0].nomenclature) {
      Alert.alert('Validation', 'At least one Nomenclature is required.');
      return;
    }
    if (!formData.companyName || !formData.location || !formData.organisation || !formData.supplyOrder || !formData.supplyDate) {
      Alert.alert('Validation', 'Please fill all required fields marked with *');
      return;
    }

    setLoading(true);
    try {
      // Calculate total quantity if not provided explicitly
      const totalQty = lineItems.reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);
      
      const formPayload = new FormData();
      
      if (imageUris && imageUris.length > 0) {
        imageUris.forEach((uri: string, index: number) => {
          if (!uri.startsWith('http')) {
            formPayload.append('images', {
              uri,
              name: `scanned_doc_${index}.jpg`,
              type: 'image/jpeg',
            } as any);
          }
        });
      } else if (!isEditMode) {
        throw new Error("No image found to upload.");
      }
      
      // Append all scalar fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) formPayload.append(key, formData[key]);
      });
      
      formPayload.append('quantity', totalQty > 0 ? String(totalQty) : '1');
      formPayload.append('nomenclature', lineItems[0].nomenclature);
      formPayload.append('isActive', 'true');
      formPayload.append('lineItems', JSON.stringify(lineItems));
      
      if (isEditMode && editId) {
        await apiClient.put(`/medicines/${editId}`, formPayload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await apiClient.post('/medicines', formPayload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      
      Alert.alert('Success', `Article ${isEditMode ? 'updated' : 'saved'} successfully.`, [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save document';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const isEmptyExtraction = !extractedData || Object.keys(extractedData).length === 0;

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Image 
          source={require('../../../assets/emblem.png')}
          style={styles.headerEmblem}
          resizeMode="contain"
        />
        <Appbar.Content title="Add article" titleStyle={styles.headerTitle} />
        <TouchableOpacity style={styles.menuButton}>
          <Text style={{ fontSize: 24, color: '#1C2942' }}>≡</Text>
        </TouchableOpacity>
      </Appbar.Header>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.container}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          
          {/* Top Image Preview & Scan buttons */}
          <View style={styles.topActionsRow}>
            <View style={styles.imagePreviewBox}>
              {imageUris && imageUris.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {imageUris.map((uri: string, index: number) => (
                    <Image key={index} source={{ uri: uri.replace('localhost', '10.0.2.2') }} style={{ width: 120, height: '100%', borderRadius: 8, marginRight: 8 }} />
                  ))}
                </ScrollView>
              ) : null}
            </View>
            <View style={styles.topButtonsCol}>
              <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate('Scanner')}>
                <Text style={styles.scanButtonText}>Scan image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate('Scanner')}>
                <Text style={styles.scanButtonText}>New scan</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Review Before Saving Card */}
          {extractedData && Object.keys(extractedData).length > 0 && !isEmptyExtraction && (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>{isEditMode ? 'Current Data' : 'Scanned Data (Review before saving)'}</Text>
              
              <Text style={styles.reviewText}><Text style={styles.reviewLabel}>Nomenclature:</Text> {extractedData.lineItems?.[0]?.nomenclature || 'N/A'}</Text>
              <Text style={styles.reviewText}><Text style={styles.reviewLabel}>Quantity:</Text> {extractedData.lineItems?.[0]?.quantity || 'N/A'}</Text>
              <Text style={styles.reviewText}><Text style={styles.reviewLabel}>Total Value:</Text> {extractedData.totalValue ? `₹${extractedData.totalValue}` : 'N/A'}</Text>
              <Text style={styles.reviewText}><Text style={styles.reviewLabel}>Company:</Text> {extractedData.companyName || 'N/A'}</Text>
              <Text style={styles.reviewText}><Text style={styles.reviewLabel}>Location:</Text> {extractedData.location || 'N/A'}</Text>
              <Text style={styles.reviewText}><Text style={styles.reviewLabel}>UO Number:</Text> {extractedData.uoNumber || 'N/A'}</Text>
              <Text style={styles.reviewText}><Text style={styles.reviewLabel}>Supply Order:</Text> {extractedData.supplyOrder || 'N/A'}</Text>
              <Text style={styles.reviewText}><Text style={styles.reviewLabel}>Supply Date:</Text> {extractedData.supplyDate || 'N/A'}</Text>

              <Text style={styles.reviewHelpText}>Review the extracted data above. Edit any incorrect fields below before saving.</Text>
            </View>
          )}

          {/* Warning Banner */}
          {isEmptyExtraction && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                No data could be extracted. Please fill in the fields manually.
              </Text>
            </View>
          )}

          <Text style={styles.pageTitle}>{isEditMode ? 'Edit article' : 'Add article'}</Text>
          <Text style={styles.pageSubtitle}>All fields marked * are required.</Text>
          <Text style={styles.instructionText}>
            Add more than one item with "Add line". Enter each item's quantity and amount (₹). Total value and order quantity fill automatically when every line is complete.
          </Text>

          <Text style={styles.sectionHeader}>NOMENCLATURE</Text>
          
          {/* Dynamic Line Items */}
          <Surface style={styles.surface} elevation={0}>
            {lineItems.map((item, index) => (
              <View key={index} style={styles.lineItemBlock}>
                <Text style={styles.inputLabel}>NOMENCLATURE {index + 1} *</Text>
                <TextInput
                  value={item.nomenclature}
                  onChangeText={(text) => handleLineChange(index, 'nomenclature', text)}
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#D0D0D0"
                  activeOutlineColor="#1C2942"
                />

                <Text style={styles.inputLabel}>Quantity for this item</Text>
                <TextInput
                  value={item.quantity}
                  onChangeText={(text) => handleLineChange(index, 'quantity', text)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#D0D0D0"
                  activeOutlineColor="#1C2942"
                />

                <Text style={styles.inputLabel}>Unit Price (₹)</Text>
                <TextInput
                  value={item.unitPrice}
                  onChangeText={(text) => handleLineChange(index, 'unitPrice', text)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#D0D0D0"
                  activeOutlineColor="#1C2942"
                />

                <Text style={styles.inputLabel}>Amount (₹)</Text>
                <TextInput
                  value={item.lineTotal}
                  onChangeText={(text) => handleLineChange(index, 'lineTotal', text)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#D0D0D0"
                  activeOutlineColor="#1C2942"
                />
              </View>
            ))}
          </Surface>

          <TouchableOpacity style={styles.addLineButton} onPress={addLine}>
            <Text style={styles.addLineButtonText}>Add line</Text>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Quantity *</Text>
          <TextInput
            value={String(lineItems.reduce((a, b) => a + (parseFloat(b.quantity) || 0), 0) || '')}
            editable={false}
            mode="outlined"
            style={[styles.input, { backgroundColor: '#F0F0F0' }]}
            outlineColor="#D0D0D0"
          />

          <Text style={styles.inputLabel}>Total value ₹ *</Text>
          <TextInput
            value={formData.totalValue}
            onChangeText={(text) => handleChange('totalValue', text)}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            outlineColor="#D0D0D0"
            activeOutlineColor="#1C2942"
          />


          <Text style={styles.inputLabel}>Total value in words</Text>
          <TextInput
            value={formData.totalValueInWords}
            onChangeText={(text) => handleChange('totalValueInWords', text)}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea]}
            outlineColor="#D0D0D0"
            activeOutlineColor="#1C2942"
          />

          <Text style={styles.inputLabel}>UO number (max 15)</Text>
          <TextInput
            value={formData.uoNumber}
            onChangeText={(text) => handleChange('uoNumber', text)}
            maxLength={15}
            mode="outlined"
            style={styles.input}
            outlineColor="#D0D0D0"
            activeOutlineColor="#1C2942"
          />

          <Text style={styles.inputLabel}>Company name *</Text>
          <TextInput
            value={formData.companyName}
            onChangeText={(text) => handleChange('companyName', text)}
            mode="outlined"
            style={styles.input}
            outlineColor="#D0D0D0"
            activeOutlineColor="#1C2942"
          />

          <Text style={styles.inputLabel}>Location *</Text>
          <TextInput
            value={formData.location}
            onChangeText={(text) => handleChange('location', text)}
            mode="outlined"
            style={styles.input}
            outlineColor="#D0D0D0"
            activeOutlineColor="#1C2942"
          />

          <Text style={styles.inputLabel}>ORGANISATION *</Text>
          <View style={styles.orgContainer}>
            {['R&R', 'Dental Centre', 'Bure Hospital', 'Other'].map((org) => (
              <TouchableOpacity
                key={org}
                style={[
                  styles.orgButton,
                  formData.organisation === org && styles.orgButtonActive
                ]}
                onPress={() => handleChange('organisation', org)}
              >
                <Text style={[
                  styles.orgButtonText,
                  formData.organisation === org && styles.orgButtonTextActive
                ]}>{org}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Supply order *</Text>
          <TextInput
            value={formData.supplyOrder}
            onChangeText={(text) => handleChange('supplyOrder', text)}
            mode="outlined"
            style={styles.input}
            outlineColor="#D0D0D0"
            activeOutlineColor="#1C2942"
          />

          <Text style={styles.inputLabel}>Supply date *</Text>
          <TextInput
            value={formData.supplyDate}
            onChangeText={(text) => handleChange('supplyDate', text)}
            placeholder="Tap to open calendar"
            placeholderTextColor="#888"
            mode="flat"
            style={styles.dateInput}
            textColor="#fff"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            right={<TextInput.Icon icon="chevron-right" color="#fff" />}
          />

          <Button 
            mode="contained" 
            onPress={handleSave} 
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
            labelStyle={styles.saveButtonText}
          >
            {isEditMode ? 'UPDATE ARTICLE' : 'ADD ARTICLE'}
          </Button>
          
        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Government of India · Ministry of Defence · v1.0.0
          </Text>
        </View>
      </KeyboardAvoidingView>
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
  menuButton: { paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 4, marginRight: 16 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  topActionsRow: { flexDirection: 'row', marginBottom: 16, height: 120 },
  imagePreviewBox: { flex: 1, backgroundColor: '#D0D6DF', borderRadius: 8, marginRight: 16 },
  topButtonsCol: { flex: 1, justifyContent: 'space-between' },
  scanButton: { borderWidth: 1.5, borderColor: '#1C2942', borderRadius: 4, alignItems: 'center', justifyContent: 'center', flex: 0.45, backgroundColor: '#fff' },
  scanButtonText: { color: '#1C2942', fontWeight: 'bold', fontSize: 16 },
  warningBanner: { backgroundColor: '#FDEECA', padding: 16, borderRadius: 8, marginBottom: 24, borderWidth: 1, borderColor: '#E8C488' },
  warningText: { color: '#5A4A28', fontSize: 14 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#1C2942', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  instructionText: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 24 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 8, letterSpacing: 1 },
  surface: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  lineItemBlock: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#fff', height: 50 },
  textArea: { height: 80 },
  addLineButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#1C2942', borderRadius: 4, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 24, backgroundColor: '#fff' },
  addLineButtonText: { color: '#1C2942', fontWeight: 'bold', fontSize: 14 },
  orgContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  orgButton: { borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 4, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff' },
  orgButtonActive: { borderColor: '#1C2942', backgroundColor: '#E8ECF1' },
  orgButtonText: { color: '#666', fontWeight: '500' },
  orgButtonTextActive: { color: '#1C2942', fontWeight: 'bold' },
  dateInput: { backgroundColor: '#1C2942', height: 56, borderTopLeftRadius: 4, borderTopRightRadius: 4, marginTop: 4 },
  saveButton: { backgroundColor: '#1C2942', borderRadius: 4, marginTop: 32, paddingVertical: 6 },
  saveButtonText: { fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  footer: { padding: 16, alignItems: 'center', backgroundColor: '#F5F6F1' },
  footerText: { fontSize: 12, color: COLORS.textSecondary },
  reviewCard: { backgroundColor: '#F4F7FB', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 24 },
  reviewTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 12 },
  reviewText: { fontSize: 14, color: '#333', marginBottom: 6 },
  reviewLabel: { fontWeight: 'bold', color: '#000' },
  reviewHelpText: { fontSize: 12, color: '#666', marginTop: 12 },
});

export default VerificationScreen;
