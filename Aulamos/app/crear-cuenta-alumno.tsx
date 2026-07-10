import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>

          <View style={styles.accessButton}>
            <Ionicons name="accessibility" size={24} color="#6D5DFB" />
          </View>
        </View>

        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="school" size={58} color="#2563EB" />
          </View>

          <Text style={styles.title}>Crear cuenta alumno</Text>
          <Text style={styles.subtitle}>Completa tus datos para acceder a AULAMOS</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Nombre completo</Text>
          <View style={styles.inputBox}>
            <Ionicons name="person-outline" size={20} color="#64748B" />
            <TextInput
              style={styles.input}
              placeholder="Ej. Juan Vázquez"
              placeholderTextColor="#94A3B8"
              value={nombre}
              onChangeText={setNombre}
            />
          </View>

          <Text style={styles.label}>Correo electrónico</Text>
          <View style={styles.inputBox}>
            <Ionicons name="mail-outline" size={20} color="#64748B" />
            <TextInput
              style={styles.input}
              placeholder="correo@gmail.com"
              placeholderTextColor="#94A3B8"
              value={correo}
              onChangeText={setCorreo}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
            <TextInput
              style={styles.input}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Ionicons name="eye-outline" size={20} color="#94A3B8" />
          </View>

          <Text style={styles.label}>Confirmar contraseña</Text>
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
            <TextInput
              style={styles.input}
              placeholder="Repite tu contraseña"
              placeholderTextColor="#94A3B8"
              value={confirmarPassword}
              onChangeText={setConfirmarPassword}
              secureTextEntry
            />
            <Ionicons name="eye-outline" size={20} color="#94A3B8" />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark" size={26} color="#2563EB" />
            <Text style={styles.infoText}>
              Usa al menos 8 caracteres con letras y números.
            </Text>
          </View>

          <TouchableOpacity activeOpacity={0.85} style={styles.button} onPress={crearCuenta}>
            <Text style={styles.buttonText}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 50,
    paddingBottom: 35,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 28,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    textAlign: 'center',
    fontSize: 25,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 15,
    color: '#64748B',
    lineHeight: 21,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputBox: {
    height: 54,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 17,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#1F2937',
  },
  infoBox: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 24,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    flex: 1,
    lineHeight: 19,
  },
  button: {
    height: 56,
    backgroundColor: '#4A7CFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});