import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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

import { API_URL } from '../services/api';

export default function RecuperarPasswordScreen() {
  const [correo, setCorreo] = useState('');
  const [errorCorreo, setErrorCorreo] = useState('');
  const [cargando, setCargando] = useState(false);

  const solicitarCodigo = async () => {
    const correoLimpio = correo.trim().toLowerCase();

    const expresionCorreo =
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!correoLimpio) {
      setErrorCorreo(
        'Ingresa tu correo electrónico'
      );
      return;
    }

    if (!expresionCorreo.test(correoLimpio)) {
      setErrorCorreo(
        'Ingresa un correo electrónico válido'
      );
      return;
    }

    setErrorCorreo('');
    setCargando(true);

    try {
      const respuesta = await fetch(
        `${API_URL}/auth/solicitar-recuperacion`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            correo: correoLimpio,
          }),
        }
      );

      const texto = await respuesta.text();

      let datos: {
        mensaje?: string;
      } = {};

      if (texto) {
        try {
          datos = JSON.parse(texto);
        } catch {
          datos = {
            mensaje:
              'El servidor envió una respuesta incorrecta',
          };
        }
      }

      if (!respuesta.ok) {
        setErrorCorreo(
          datos.mensaje ||
            'No fue posible enviar el código'
        );
        return;
      }

      Alert.alert(
        'Revisa tu correo',
        datos.mensaje ||
          'Te enviamos un código de recuperación.',
        [
          {
            text: 'Ingresar código',
            onPress: () => {
              router.push({
                pathname:
                  '/restablecer-password',
                params: {
                  correo: correoLimpio,
                },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        'Error al solicitar recuperación:',
        error
      );

      Alert.alert(
        'Error de conexión',
        'No fue posible conectarse con el servidor. Verifica la IP y que el backend esté encendido.'
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Regresar"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#111827"
            />
          </TouchableOpacity>

          <View style={styles.accessButton}>
            <Ionicons
              name="accessibility"
              size={24}
              color="#7C4DFF"
            />
          </View>
        </View>

        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons
              name="key-outline"
              size={55}
              color="#2563EB"
            />
          </View>

          <Text style={styles.title}>
            Recuperar contraseña
          </Text>

          <Text style={styles.subtitle}>
            Escribe el correo asociado a tu cuenta.
            Te enviaremos un código de 6 dígitos.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            Correo electrónico
          </Text>

          <View
            style={[
              styles.inputBox,
              errorCorreo
                ? styles.inputBoxError
                : null,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={21}
              color={
                errorCorreo
                  ? '#DC2626'
                  : '#64748B'
              }
            />

            <TextInput
              style={styles.input}
              placeholder="correo@gmail.com"
              placeholderTextColor="#94A3B8"
              value={correo}
              onChangeText={(texto) => {
                setCorreo(texto);
                setErrorCorreo('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!cargando}
              maxLength={150}
              returnKeyType="send"
              onSubmitEditing={solicitarCodigo}
              accessibilityLabel="Correo electrónico"
            />
          </View>

          {errorCorreo ? (
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
            >
              {errorCorreo}
            </Text>
          ) : null}

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color="#2563EB"
            />

            <Text style={styles.infoText}>
              El código será válido durante 15
              minutos y solo podrá utilizarse una
              vez.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              cargando
                ? styles.buttonDisabled
                : null,
            ]}
            onPress={solicitarCodigo}
            disabled={cargando}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Enviar código de recuperación"
            accessibilityState={{
              disabled: cargando,
            }}
          >
            {cargando ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <>
                <Ionicons
                  name="mail-outline"
                  size={21}
                  color="#FFFFFF"
                />

                <Text style={styles.buttonText}>
                  Enviar código
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio de sesión"
          >
            <Text style={styles.loginText}>
              Volver al inicio de sesión
            </Text>
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

  scroll: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 50,
    paddingBottom: 80,
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
    marginTop: 45,
    marginBottom: 34,
  },

  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 360,
  },

  form: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },

  label: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },

  inputBox: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },

  inputBoxError: {
    borderColor: '#DC2626',
    borderWidth: 1.5,
  },

  input: {
    flex: 1,
    minHeight: 54,
    color: '#111827',
    fontSize: 15,
    marginLeft: 10,
  },

  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 7,
  },

  infoBox: {
    minHeight: 68,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 22,
    marginBottom: 24,
  },

  infoText: {
    flex: 1,
    color: '#1D4ED8',
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 11,
  },

  button: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: '#4A7CFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    elevation: 4,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  loginButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  loginText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
});