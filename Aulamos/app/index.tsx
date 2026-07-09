import { Link } from 'expo-router';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="accessibility" size={22} color="#7C4DFF" style={styles.accessIcon} />

      <Text style={styles.logo}>AULAMOS</Text>
      <Text style={styles.logoSub}>Aprendemos juntos</Text>

      <Text style={styles.title}>¡Bienvenido de nuevo!</Text>
      <Text style={styles.subtitle}>Inicia sesión para continuar{'\n'}aprendiendo.</Text>

      <Text style={styles.label}>Correo electrónico</Text>
      <View style={styles.inputBox}>
        <Ionicons name="mail-outline" size={15} color="#64748B" />
        <TextInput placeholder="correo.com" placeholderTextColor="#94A3B8" style={styles.input} />
      </View>

      <Text style={styles.label}>Contraseña</Text>
      <View style={styles.inputBox}>
        <Ionicons name="lock-closed-outline" size={15} color="#64748B" />
        <TextInput placeholder="Tu contraseña" placeholderTextColor="#94A3B8" secureTextEntry style={styles.input} />
        <Ionicons name="eye-outline" size={15} color="#94A3B8" />
      </View>

      <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Iniciar sesión</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes cuenta?</Text>
        <Link href={"/crear-cuenta" as any} style={styles.link}> Crear cuenta</Link>
      </View>

      <Text style={styles.dot}>o</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessIcon: {
    position: 'absolute',
    top: 55,
    right: 38,
  },
  logo: {
    fontSize: 26,
    fontWeight: '800',
    color: '#4A7CFF',
    marginTop: 10,
  },
  logoSub: {
    fontSize: 9,
    color: '#111827',
    marginBottom: 28,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 10,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 60,
  },
  label: {
    width: '100%',
    fontSize: 10,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 5,
  },
  inputBox: {
    width: '100%',
    height: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    fontSize: 11,
    marginLeft: 7,
    color: '#111827',
  },
  forgot: {
    alignSelf: 'flex-end',
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 26,
  },
  button: {
    backgroundColor: '#4A7CFF',
    width: 118,
    height: 39,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
  },
  link: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '800',
  },
  dot: {
    position: 'absolute',
    bottom: 45,
    fontSize: 12,
    color: '#94A3B8',
  },
});