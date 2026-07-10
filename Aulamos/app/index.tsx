import { Link } from 'expo-router';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.accessButton}>
        <Ionicons name="accessibility" size={24} color="#7C4DFF" />
      </View>

      <Image
        source={require('../assets/images/logo-aulamos.png')}
        style={styles.logoImage}
      />

      <Text style={styles.title}>¡Bienvenido de nuevo!</Text>
      <Text style={styles.subtitle}>Inicia sesión para continuar aprendiendo</Text>

      <Text style={styles.label}>Correo electrónico</Text>
      <View style={styles.inputBox}>
        <Ionicons name="mail-outline" size={20} color="#64748B" />
        <TextInput
          placeholder="correo@gmail.com"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />
      </View>

      <Text style={styles.label}>Contraseña</Text>
      <View style={styles.inputBox}>
        <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
        <TextInput
          placeholder="Tu contraseña"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          style={styles.input}
        />
        <Ionicons name="eye-outline" size={20} color="#94A3B8" />
      </View>

      <TouchableOpacity>
        <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.8} style={styles.button}>
        <Text style={styles.buttonText}>Iniciar sesión</Text>
      </TouchableOpacity>

      <View style={styles.separator}>
        <View style={styles.line} />
        <Text style={styles.or}>o</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes cuenta?</Text>
        <Link href={"/crear-cuenta" as any} style={styles.link}>
          Crear cuenta
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 30,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessButton: {
    position: 'absolute',
    top: 55,
    right: 28,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 35,
  },
  label: {
    width: '100%',
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputBox: {
    width: '100%',
    height: 54,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 18,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontSize: 15,
    marginLeft: 10,
    color: '#111827',
  },
  forgot: {
    alignSelf: 'flex-end',
    width: '100%',
    textAlign: 'right',
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 25,
  },
  button: {
    width: '100%',
    height: 54,
    backgroundColor: '#4A7CFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A7CFF',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 28,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  or: {
    marginHorizontal: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  link: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '800',
  },
});