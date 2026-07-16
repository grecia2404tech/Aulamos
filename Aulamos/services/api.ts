import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const hostMetro =
  Constants.expoConfig?.hostUri?.split(':')[0];

const hostApi =
  process.env.EXPO_PUBLIC_API_HOST ||
  hostMetro ||
  'localhost';

export const API_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000/api'
    : `http://${hostApi}:3000/api`;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});