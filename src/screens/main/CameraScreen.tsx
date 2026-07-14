import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, ActivityIndicator, Appbar, useTheme, Button } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainTabNavigator';
import apiClient from '../../api/client';
import * as ImageManipulator from 'expo-image-manipulator';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Scanner'>;
};

const CameraScreen = ({ navigation }: Props) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
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
          setPhotoUri(photo.uri);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  const processImage = async () => {
    if (!photoUri) return;
    
    setLoading(true);
    try {
      // Compress image before upload
      const manipResult = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 1280 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const formData = new FormData();
      formData.append('image', {
        uri: manipResult.uri,
        name: 'scan.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await apiClient.post('/medicines/scan-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // The backend uses Gemini to parse fields. 
      const extractedData = response.data.extractedData || response.data.fields || response.data;
      
      navigation.replace('Verification', { 
        extractedData, 
        imageUri: manipResult.uri 
      });

    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || 'Failed to process document';
      Alert.alert('Scan Failed', message);
      setPhotoUri(null); // Reset to try again
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={photoUri ? "Confirm Photo" : "Scan Document"} />
      </Appbar.Header>

      <View style={styles.content}>
        {photoUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="contain" />
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Analyzing document with Gemini AI...</Text>
              </View>
            )}
          </View>
        ) : (
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
        )}
      </View>

      <View style={styles.footer}>
        {photoUri ? (
          <>
            <Button 
              mode="outlined" 
              onPress={() => setPhotoUri(null)}
              disabled={loading}
              style={{ flex: 1, marginRight: 8 }}
            >
              Retake
            </Button>
            <Button 
              mode="contained" 
              onPress={processImage}
              loading={loading}
              disabled={loading}
              style={{ flex: 1, marginLeft: 8 }}
            >
              Process
            </Button>
          </>
        ) : (
          <TouchableOpacity 
            style={styles.captureButtonOuter} 
            onPress={takePicture}
          >
            <View style={[styles.captureButtonInner, { backgroundColor: theme.colors.primary }]} />
          </TouchableOpacity>
        )}
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
