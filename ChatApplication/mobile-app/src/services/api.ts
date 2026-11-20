import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

const BASE_URL = 'http://10.0.2.2:4000/api/v1'; // Standard Android emulator loopback host, easily configurable

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAppStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAppStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: nextRefresh } = res.data.data;
          useAppStore.getState().setUser(useAppStore.getState().user, accessToken, nextRefresh);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          useAppStore.getState().logout();
        }
      }
    }
    return Promise.reject(error);
  }
);
