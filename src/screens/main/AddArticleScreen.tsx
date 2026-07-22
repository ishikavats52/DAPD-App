import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Appbar, Menu, Dialog, Portal, Divider, ActivityIndicator } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import { COLORS } from '../../theme';
import useAuth from '../../hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import apiClient from '../../api/client';
import * as SecureStore from 'expo-secure-store';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'AddArticle'>;
};

const AddArticleScreen = ({ navigation }: Props) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { user, signOut } = useAuth();

  const handleCamera = () => {
    setScanModalVisible(false);
    navigation.navigate('Scanner');
  };

  const processImages = async (photoUris: string[]) => {
    setProcessing(true);
    try {
      const formData = new FormData();
      const processedUris: string[] = [];

      for (let i = 0; i < photoUris.length; i++) {
        const photoUri = photoUris[i];
        const manipResult = await ImageManipulator.manipulateAsync(
          photoUri,
          [{ resize: { width: 1280 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        processedUris.push(manipResult.uri);

        formData.append('images', {
          uri: manipResult.uri,
          name: `scan_${i}.jpg`,
          type: 'image/jpeg',
        } as any);
      }

      const response = await apiClient.post('/medicines/scan-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const extractedData = response.data.extractedData || response.data.fields || response.data;
      
      navigation.navigate('Verification', { 
        extractedData, 
        imageUris: processedUris
      });
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || 'Failed to process document';
      Alert.alert('Scan Failed', message);
    } finally {
      setProcessing(false);
    }
  };

  const handleGallery = async () => {
    setScanModalVisible(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You've refused to allow this app to access your photos!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uris = result.assets.map(asset => asset.uri);
      await processImages(uris);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Image 
          source={require('../../../assets/emblem.png')}
          style={styles.headerEmblem}
          resizeMode="contain"
        />
        <Appbar.Content title="Add article" titleStyle={styles.headerTitle} />
        
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
          {user?.role !== 'employee' && (
            <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Users'); }} title="Users" />
          )}
          <Menu.Item onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }} title="Profile" />
          <Menu.Item onPress={() => { setMenuVisible(false); signOut(); }} title="Logout" />
        </Menu>
      </Appbar.Header>

      <View style={styles.content}>
        <Text style={styles.title}>Add article</Text>
        <Text style={styles.subtitle}>Scan the article label to auto-fill the form</Text>

        <View style={styles.scanBox}>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2965/2965335.png' }} 
            style={styles.docIcon} 
          />
        </View>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Verification', { extractedData: {}, imageUris: [] })}
          disabled={processing}
        >
          <Text style={styles.actionButtonText}>Enter Manually</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setScanModalVisible(true)}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#1C2942" />
          ) : (
            <Text style={styles.actionButtonText}>Scan image</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Government of India · Ministry of Defence · v1.0.0
        </Text>
      </View>

      <Portal>
        <Dialog visible={scanModalVisible} onDismiss={() => setScanModalVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Article label</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogSubtitle}>Choose camera or gallery to capture the label.</Text>
          </Dialog.Content>
          <Divider />
          <TouchableOpacity style={styles.dialogAction} onPress={handleCamera}>
            <Text style={styles.dialogActionText}>Camera</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity style={styles.dialogAction} onPress={handleGallery}>
            <Text style={styles.dialogActionText}>Gallery</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity style={styles.dialogAction} onPress={() => setScanModalVisible(false)}>
            <Text style={styles.dialogActionCancel}>Cancel</Text>
          </TouchableOpacity>
        </Dialog>
      </Portal>
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
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C2942',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  scanBox: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#fff',
  },
  docIcon: {
    width: 80,
    height: 80,
    tintColor: '#5C85C4', 
  },
  actionButton: {
    width: '100%',
    marginBottom: 16,
    borderColor: '#1C2942',
    borderWidth: 1.5,
    borderRadius: 4,
    paddingVertical: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
  },
  actionButtonText: {
    color: '#1C2942',
    fontWeight: 'bold',
    fontSize: 18,
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
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  dialogSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  dialogAction: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogActionText: {
    color: '#1C2942',
    fontSize: 16,
    fontWeight: '600',
  },
  dialogActionCancel: {
    color: '#C63031',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddArticleScreen;
