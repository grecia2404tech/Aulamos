import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type RutaInicio =
  | '/inicio-alumno'
  | '/inicio-docente'
  | '/inicio-admin';

type UsuarioRespuesta = {
  id_usuario: number;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  correo: string;
  rol: string;
};

type RespuestaLogin = {
  mensaje?: string;
  token?: string;
  usuario?: UsuarioRespuesta;
};

export default function LoginScreen() {
  const [correo, setCorreo] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    mostrarPassword,
    setMostrarPassword,
  ] = useState(false);

  const [cargando, setCargando] =
    useState(false);

  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const iniciarSesion = async () => {
    const correoLimpio = correo
      .trim()
      .toLowerCase();

    if (!correoLimpio || !password) {
      Alert.alert(
        'Campos incompletos',
        'Ingresa tu correo y contraseña.'
      );

      return;
    }

    try {
      setCargando(true);

      const respuesta = await fetch(
        `${API_URL}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            correo: correoLimpio,
            password,
          }),
        }
      );

      let datos: RespuestaLogin;

      try {
        datos =
          (await respuesta.json()) as RespuestaLogin;
      } catch {
        Alert.alert(
          'Respuesta incorrecta',
          'El servidor envió una respuesta que no se pudo interpretar.'
        );

        return;
      }

      if (!respuesta.ok) {
        Alert.alert(
          'No se pudo iniciar sesión',
          datos.mensaje ||
            'Verifica tu correo y contraseña.'
        );

        return;
      }

      if (
        !datos.token ||
        !datos.usuario ||
        !datos.usuario.rol
      ) {
        Alert.alert(
          'Respuesta incorrecta',
          'La API no devolvió el token o el rol del usuario.'
        );

        return;
      }

      const rutasInicio: Record<
        string,
        RutaInicio
      > = {
        Alumno: '/inicio-alumno',
        Docente: '/inicio-docente',
        Admin: '/inicio-admin',
      };

      const rutaInicio =
        rutasInicio[
          datos.usuario.rol
        ];

      if (!rutaInicio) {
        Alert.alert(
          'Panel no disponible',
          `El panel para el rol ${datos.usuario.rol} todavía no está disponible.`
        );

        return;
      }

      await AsyncStorage.multiSet([
        ['token', datos.token],
        [
          'usuario',
          JSON.stringify(
            datos.usuario
          ),
        ],
      ]);

      Alert.alert(
        'Inicio de sesión correcto',
        `¡Hola, ${datos.usuario.nombre}!`,
        [
          {
            text: 'Continuar',
            onPress: () => {
              router.replace(
                rutaInicio as any
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        'Error de conexión:',
        error
      );

      Alert.alert(
        'Error de conexión',
        'No fue posible conectarse con la API. Verifica que el servidor esté encendido, que la IP sea correcta y que los dispositivos estén en la misma red.'
      );
    } finally {
      setCargando(false);
    }
  };

  const colorContenidoBoton =
    preferencias.altoContraste
      ? '#000000'
      : '#FFFFFF';

  return (
    <KeyboardAvoidingView
      style={[
        styles.keyboard,
        {
          backgroundColor:
            colores.fondo,
        },
      ]}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
      keyboardVerticalOffset={
        Platform.OS === 'ios'
          ? 10
          : 0
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === 'ios'
            ? 'interactive'
            : 'on-drag'
        }
        automaticallyAdjustKeyboardInsets={
          Platform.OS === 'ios'
        }
        showsVerticalScrollIndicator={false}
      >
        <BotonAccesibilidad
          style={styles.accessButton}
        />

        <Image
          source={require(
            '../assets/images/logo-aulamos.png'
          )}
          style={styles.logoImage}
          accessibilityLabel="Logotipo de Aulamos"
        />

        <Text
          style={[
            styles.title,
            {
              color: colores.texto,
              fontSize:
                22 * escalaTexto,
              lineHeight:
                28 * escalaTexto,
            },
          ]}
          accessibilityRole="header"
        >
          ¡Bienvenido de nuevo!
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color:
                colores.textoSecundario,
              fontSize:
                15 * escalaTexto,
              lineHeight:
                22 * escalaTexto,
            },
          ]}
        >
          Inicia sesión para continuar
          aprendiendo
        </Text>

        <Text
          style={[
            styles.label,
            {
              color: colores.texto,
              fontSize:
                15 * escalaTexto,
            },
          ]}
        >
          Correo electrónico
        </Text>

        <View
          style={[
            styles.inputBox,
            {
              backgroundColor:
                colores.tarjeta,
              borderColor:
                colores.borde,
            },
          ]}
        >
          <Ionicons
            name="mail-outline"
            size={20}
            color={
              colores.textoSecundario
            }
          />

          <TextInput
            style={[
              styles.input,
              {
                color: colores.texto,
                fontSize:
                  15 * escalaTexto,
              },
            ]}
            placeholder="correo@gmail.com"
            placeholderTextColor={
              colores.textoSecundario
            }
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!cargando}
            returnKeyType="next"
            accessibilityLabel="Correo electrónico"
          />
        </View>

        <Text
          style={[
            styles.label,
            {
              color: colores.texto,
              fontSize:
                15 * escalaTexto,
            },
          ]}
        >
          Contraseña
        </Text>

        <View
          style={[
            styles.inputBox,
            {
              backgroundColor:
                colores.tarjeta,
              borderColor:
                colores.borde,
            },
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={
              colores.textoSecundario
            }
          />

          <TextInput
            style={[
              styles.input,
              {
                color: colores.texto,
                fontSize:
                  15 * escalaTexto,
              },
            ]}
            placeholder="Tu contraseña"
            placeholderTextColor={
              colores.textoSecundario
            }
            secureTextEntry={
              !mostrarPassword
            }
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!cargando}
            returnKeyType="done"
            onSubmitEditing={
              iniciarSesion
            }
            accessibilityLabel="Contraseña"
          />

          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() =>
              setMostrarPassword(
                (valorActual) =>
                  !valorActual
              )
            }
            accessibilityRole="button"
            accessibilityLabel={
              mostrarPassword
                ? 'Ocultar contraseña'
                : 'Mostrar contraseña'
            }
          >
            <Ionicons
              name={
                mostrarPassword
                  ? 'eye-off-outline'
                  : 'eye-outline'
              }
              size={22}
              color={
                colores.textoSecundario
              }
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() =>
            router.push(
              '/recuperar-password'
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Recuperar contraseña"
        >
          <Text
            style={[
              styles.forgot,
              {
                color:
                  colores.primario,
                fontSize:
                  14 * escalaTexto,
              },
            ]}
          >
            ¿Olvidaste tu contraseña?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.button,
            {
              backgroundColor:
                colores.primario,
            },
            cargando &&
              styles.buttonDisabled,
          ]}
          onPress={iniciarSesion}
          disabled={cargando}
          accessibilityRole="button"
          accessibilityLabel="Iniciar sesión"
          accessibilityState={{
            disabled: cargando,
            busy: cargando,
          }}
        >
          {cargando ? (
            <ActivityIndicator
              color={
                colorContenidoBoton
              }
            />
          ) : (
            <Text
              style={[
                styles.buttonText,
                {
                  color:
                    colorContenidoBoton,
                  fontSize:
                    16 * escalaTexto,
                },
              ]}
            >
              Iniciar sesión
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.separator}>
          <View
            style={[
              styles.line,
              {
                backgroundColor:
                  colores.borde,
              },
            ]}
          />

          <Text
            style={[
              styles.or,
              {
                color:
                  colores.textoSecundario,
                fontSize:
                  14 * escalaTexto,
              },
            ]}
          >
            o
          </Text>

          <View
            style={[
              styles.line,
              {
                backgroundColor:
                  colores.borde,
              },
            ]}
          />
        </View>

        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              {
                color: colores.texto,
                fontSize:
                  15 * escalaTexto,
              },
            ]}
          >
            ¿No tienes cuenta?
          </Text>

          <Link
            href="/crear-cuenta"
            style={[
              styles.link,
              {
                color:
                  colores.primario,
                fontSize:
                  15 * escalaTexto,
              },
            ]}
            accessibilityLabel="Crear una cuenta"
          >
            Crear cuenta
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 115,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  accessButton: {
    position: 'absolute',
    top: 55,
    right: 28,
  },

  logoImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 18,
  },

  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    textAlign: 'center',
    marginBottom: 35,
  },

  label: {
    width: '100%',
    fontWeight: '700',
    marginBottom: 8,
  },

  inputBox: {
    width: '100%',
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 18,
  },

  input: {
    flex: 1,
    minHeight: 48,
    marginLeft: 10,
  },

  eyeButton: {
    width: 42,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  forgotButton: {
    alignSelf: 'stretch',
  },

  forgot: {
    width: '100%',
    textAlign: 'right',
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 25,
  },

  button: {
    width: '100%',
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A7CFF',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    fontWeight: '800',
    textAlign: 'center',
  },

  separator: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
  },

  line: {
    flex: 1,
    height: 1,
  },

  or: {
    marginHorizontal: 12,
    fontWeight: '600',
  },

  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  footerText: {
    fontWeight: '600',
  },

  link: {
    fontWeight: '800',
  },
});