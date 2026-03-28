import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../store/useAuthStore';

const JWT_KEY = 'pra_frente_jwt';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(JWT_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const body = config.data ? JSON.parse(JSON.stringify(config.data)) : undefined;
  if (body?.password) body.password = '***';
  console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, body ?? '');
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log(`[API] ✅ ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  async (error) => {
    if (!error.response) {
      console.log(`[API] ❌ sem resposta — baseURL: ${error.config?.baseURL}, url: ${error.config?.url}, msg: ${error.message}`);
      Toast.show({
        type: 'error',
        text1: 'Sem conexão',
        text2: 'Verifique sua internet e tente novamente.',
        position: 'bottom',
      });
      return Promise.reject(error);
    }

    console.log(`[API] ⚠️ ${error.response.status} ${error.config?.url}`, error.response.data);
    if (error.response.status === 401) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);
