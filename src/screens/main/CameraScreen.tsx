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
          <View style={styles.cameraUI}>
            <View style={styles.instructionPill}>
              <Text style={styles.instructions}>Position document clearly in view</Text>
            </View>
          </View>
        </CameraView>
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size={48} color={theme.colors.primary} />
              <Text style={styles.loadingTitle}>Processing Document</Text>
              <Text style={styles.loadingSub}>Extracting data securely using AI...</Text>
            </View>
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
  cameraUI: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 40,
  },
  instructionPill: {
    backgroundColor: 'rgba(28, 41, 66, 0.85)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  instructions: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23, 43, 77, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingTitle: {
    color: '#172B4D',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
  },
  loadingSub: {
    color: '#6B778C',
    fontSize: 14,
    textAlign: 'center',
  },
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
