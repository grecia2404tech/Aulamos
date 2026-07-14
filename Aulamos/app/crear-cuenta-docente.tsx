// Interfaz de creación de cuenta para docentes
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CrearDocenteScreen() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const crearCuenta = () => {
    if (!nombre || !correo || !password || !confirmarPassword) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    if (password !== confirmarPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    Alert.alert('Éxito', 'Cuenta de docente creada correctamente');
    router.push('/');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>

      <Ionicons name="accessibility" size={26} color="#6D5DFB" style={styles.accessibility} />

      <Text style={styles.title}>Crear cuenta docente</Text>
      <Text style={styles.subtitle}>Completa tus datos</Text>

      <Ionicons name="id-card-outline" size={82} color="#5FCB72" style={styles.logo} />

      <Text style={styles.label}>Nombre Completo</Text>
      <View style={styles.inputBox}>
        <Ionicons name="person-outline" size={18} color="#64748B" />
        <TextInput
          style={styles.input}
          placeholder="Ej. Ana María López"
          value={nombre}
          onChangeText={setNombre}
        />
      </View>

      <Text style={styles.label}>Correo electrónico</Text>
      <View style={styles.inputBox}>
        <Ionicons name="mail-outline" size={18} color="#64748B" />
        <TextInput
          style={styles.input}
          placeholder="correo.com"
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.label}>Contraseña</Text>
      <View style={styles.inputBox}>
        <Ionicons name="lock-closed-outline" size={18} color="#64748B" />
        <TextInput
          style={styles.input}
          placeholder="********"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Ionicons name="eye-outline" size={18} color="#94A3B8" />
      </View>

      <Text style={styles.label}>Confirmar contraseña</Text>
      <View style={styles.inputBox}>
        <Ionicons name="lock-closed-outline" size={18} color="#64748B" />
        <TextInput
          style={styles.input}
          placeholder="********"
          value={confirmarPassword}
          onChangeText={setConfirmarPassword}
          secureTextEntry
        />
        <Ionicons name="eye-outline" size={18} color="#94A3B8" />
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="shield" size={30} color="#2563EB" />
        <Text style={styles.infoText}>
          Usa al menos 8 caracteres con letras y números.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={crearCuenta}>
        <Text style={styles.buttonText}>Crear cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 42,
    backgroundColor: '#FFFFFF',
  },
  back: {
    position: 'absolute',
    top: 42,
    left: 18,
    zIndex: 10,
  },
  accessibility: {
    position: 'absolute',
    top: 38,
    right: 18,
  },
  title: {
    marginTop: 28,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
  },
  logo: {
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 34,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 7,
  },
  inputBox: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#1F2937',
  },
  infoBox: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 54,
  },
  infoText: {
    marginLeft: 18,
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
    flex: 1,
  },
  button: {
    height: 56,
    backgroundColor: '#4A7CFF',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});