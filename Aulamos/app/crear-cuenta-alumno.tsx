//Interfaz de creación de cuenta para alumnos
// Interfaz de creación de cuenta para alumnos
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

export default function CrearCuentaAlumnoScreen() {
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

    Alert.alert('Éxito', 'Cuenta de alumno creada correctamente');
    router.push('/');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>

      <Text style={styles.title}>Crear cuenta Alumno</Text>
      <Text style={styles.subtitle}>Completa tus datos</Text>

      <Ionicons name="school" size={74} color="#2563EB" style={styles.logo} />

      <Text style={styles.label}>Nombre Completo</Text>
      <View style={styles.inputBox}>
        <Ionicons name="person-outline" size={18} color="#64748B" />
        <TextInput
          style={styles.input}
          placeholder="Juan Vazquez"
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
          placeholder="Crea una contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
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
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="shield" size={28} color="#2563EB" />
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
    paddingHorizontal: 28,
    paddingTop: 48,
    backgroundColor: '#FFFFFF',
  },
  back: {
    position: 'absolute',
    top: 46,
    left: 22,
    zIndex: 10,
  },
  title: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    marginTop: 12,
    textAlign: 'center',
    color: '#64748B',
  },
  logo: {
    alignSelf: 'center',
    marginTop: 28,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 7,
  },
  inputBox: {
    height: 52,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 14,
    marginTop: 4,
    marginBottom: 26,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    flex: 1,
  },
  button: {
    height: 56,
    backgroundColor: '#4A7CFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});