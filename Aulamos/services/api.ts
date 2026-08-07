import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/*
 * Expo publica en hostUri la dirección de la computadora
 * que ejecuta Metro. Se elimina el puerto de Metro porque
 * la API de AULAMOS utiliza el puerto 3000.
 */
const hostMetro =
  Constants.expoConfig?.hostUri
    ?.split(':')[0]
    ?.trim();

/*
 * EXPO_PUBLIC_API_HOST es opcional. Si lo utilizas en .env,
 * escribe solamente la IP, por ejemplo:
 * EXPO_PUBLIC_API_HOST=192.168.1.65
 */
const hostConfigurado =
  process.env.EXPO_PUBLIC_API_HOST
    ?.trim()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];

const hostApi =
  hostConfigurado ||
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
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

if (__DEV__) {
  console.log(
    'API AULAMOS:',
    API_URL
  );
}


















/*import axios from 'axios';
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
});*/