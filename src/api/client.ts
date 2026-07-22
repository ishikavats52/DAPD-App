import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'http://192.168.1.54:5050/api';

console.log('BASE_URL =', BASE_URL);

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
  async (error) => {
    const config = error.config;
    
    // Set up retry state
    if (!config || (config._retryCount && config._retryCount >= 3)) {
      return Promise.reject(error);
    }
    
    // Retry on Network Errors or 5xx (Server) Errors
    if (error.code === 'ERR_NETWORK' || (error.response && error.response.status >= 500)) {
      config._retryCount = config._retryCount ? config._retryCount + 1 : 1;
      
      // Delay before retrying: 1s, 2s, 3s
      const delay = config._retryCount * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retrying request to ${config.url} (Attempt ${config._retryCount})...`);
      return apiClient(config);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;