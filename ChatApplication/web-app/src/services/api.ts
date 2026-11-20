import axios from 'axios';
import { useWebStore } from '../store/useWebStore';

const BASE_URL = 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = useWebStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
