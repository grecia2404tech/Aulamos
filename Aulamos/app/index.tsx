import { Link } from 'expo-router';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="accessibility" size={26} color="#6C4DFF" style={styles.iconTop} />

      <Text style={styles.logo}>AULAMOS</Text>
      <Text style={styles.subtitle}>Aprendemos juntos</Text>

      <Text style={styles.title}>¡Bienvenido de nuevo!</Text>
      <Text style={styles.text}>Inicia sesión para continuar aprendiendo.</Text>

      <Text style={styles.label}>Correo electrónico</Text>
      <View style={styles.inputBox}>
        <Ionicons name="mail-outline" size={18} color="#7A8794" />
        <TextInput placeholder="correo.com" style={styles.input} />
      </View>

      <Text style={styles.label}>Contraseña</Text>
      <View style={styles.inputBox}>
        <Ionicons name="lock-closed-outline" size={18} color="#7A8794" />
        <TextInput placeholder="Tu contraseña" secureTextEntry style={styles.input} />
        <Ionicons name="eye-outline" size={18} color="#7A8794" />
      </View>

      <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Iniciar sesión</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text>¿No tienes cuenta?</Text>
        <Link href={"/crear-cuenta" as any} style={styles.link}> Crear cuenta</Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTop: {
    marginBottom: 25,
  },
  logo: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#4A7CFF',
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  text: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 35,
    color: '#374151',
  },
  label: {
    width: '100%',
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#374151',
  },
  inputBox: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    marginLeft: 8,
  },
  forgot: {
    color: '#2563EB',
    fontWeight: 'bold',
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  button: {
    backgroundColor: '#4A7CFF',
    paddingVertical: 13,
    paddingHorizontal: 35,
    borderRadius: 8,
    marginBottom: 35,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
  },
  link: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
});