import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, ActivityIndicator, Appbar, useTheme, Button } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import apiClient from '../../api/client';
import * as ImageManipulator from 'expo-image-manipulator';
import * as SecureStore from 'expo-secure-store';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Scanner'>;
};

const CameraScreen = ({ navigation }: Props) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const theme = useTheme();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ textAlign: 'center', marginBottom: 16 }}>
          We need your permission to show the camera to scan documents.
        </Text>
        <Button mode="contained" onPress={requestPermission}>
          Grant Permission
        </Button>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo) {
          setPhotoUris(prev => [...prev, photo.uri]);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  const processImages = async () => {
    if (photoUris.length === 0) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      
      const compressedUris = [];
      for (let i = 0; i < photoUris.length; i++) {
        const manipResult = await ImageManipulator.manipulateAsync(
          photoUris[i],
          [{ resize: { width: 1280 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        compressedUris.push(manipResult.uri);
        
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
      
      navigation.replace('Verification', { 
        extractedData, 
        imageUris: compressedUris
      });

    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || 'Failed to process documents';
      Alert.alert('Scan Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={photoUris.length > 0 ? `Captured: ${photoUris.length}` : "Scan Document"} />
      </Appbar.Header>

      <View style={styles.content}>
        <CameraView 
          style={styles.camera} 
          facing="back"
          ref={cameraRef}
        >
          <View style={styles.overlay}>
            <View style={styles.frame} />
            <Text style={styles.instructions}>Align document within the frame</Text>
          </View>
        </CameraView>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Analyzing document with Gemini AI...</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
          {photoUris.length > 0 ? (
            <Button 
              mode="outlined" 
              onPress={() => setPhotoUris([])}
              disabled={loading}
              style={{ flex: 1, marginRight: 8 }}
            >
              Clear All
            </Button>
          ) : <View style={{ flex: 1 }} />}
          
          <TouchableOpacity 
            style={styles.captureButtonOuter} 
            onPress={takePicture}
            disabled={loading}
          >
            <View style={[styles.captureButtonInner, { backgroundColor: theme.colors.primary }]} />
          </TouchableOpacity>

          {photoUris.length > 0 ? (
            <Button 
              mode="contained" 
              onPress={processImages}
              loading={loading}
              disabled={loading}
              style={{ flex: 1, marginLeft: 8 }}
            >
              Process
            </Button>
          ) : <View style={{ flex: 1 }} />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  content: { flex: 1 },
  camera: { flex: 1 },
  previewContainer: { flex: 1, position: 'relative', backgroundColor: '#000' },
  preview: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: '85%',
    height: '60%',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  instructions: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#fff', marginTop: 16, fontSize: 16, fontWeight: 'bold' },
  footer: {
    padding: 24,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
  },
  captureButtonOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
});

export default CameraScreen;
