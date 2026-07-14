import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Change this to your local machine IP address (e.g. 192.168.x.x) or production URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.53:5050/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token for request', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global API errors here (e.g. 401 Unauthorized -> logout user)
    return Promise.reject(error);
  }
);

export default apiClient;
