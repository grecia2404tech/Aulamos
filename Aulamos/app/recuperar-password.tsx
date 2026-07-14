import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
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

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

export default function RecuperarPasswordScreen() {
  const [correo, setCorreo] =
    useState('');
  const [errorCorreo, setErrorCorreo] =
    useState('');
  const [cargando, setCargando] =
    useState(false);

  const {
    colores,
    escalaTexto,
    preferencias,
    leerTexto,
    detenerLectura,
  } = useAccessibility();

  const altoContraste =
    preferencias.altoContraste;

  const colorError = altoContraste
    ? colores.peligro
    : '#DC2626';

  const textoBoton = altoContraste
    ? '#000000'
    : '#FFFFFF';

  const fondoInformacion = altoContraste
    ? colores.tarjeta
    : preferencias.modoOscuro
      ? colores.fondoPrimario
      : '#EFF6FF';

  const colorInformacion = altoContraste
    ? colores.texto
    : preferencias.modoOscuro
      ? '#93C5FD'
      : '#1D4ED8';

  /*
   * Si la lectura de pantalla está activada,
   * se leen las indicaciones al abrir la pantalla.
   */
  useFocusEffect(
    useCallback(() => {
      if (
        preferencias.lectorPantalla
      ) {
        leerTexto(
          'Recuperar contraseña. Escribe el correo asociado a tu cuenta. Te enviaremos un código de recuperación de 6 dígitos.'
        );
      }

      return () => {
        detenerLectura();
      };
    }, [
      preferencias.lectorPantalla,
      leerTexto,
      detenerLectura,
    ])
  );

  const solicitarCodigo = async () => {
    const correoLimpio = correo
      .trim()
      .toLowerCase();

    const expresionCorreo =
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!correoLimpio) {
      setErrorCorreo(
        'Ingresa tu correo electrónico'
      );
      return;
    }

    if (
      !expresionCorreo.test(
        correoLimpio
      )
    ) {
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
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            correo: correoLimpio,
          }),
        }
      );

      const texto =
        await respuesta.text();

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

      if (
        preferencias.lectorPantalla
      ) {
        leerTexto(
          'Código enviado correctamente. Revisa tu correo electrónico.'
        );
      }

      Alert.alert(
        'Revisa tu correo',
        datos.mensaje ||
          'Te enviamos un código de recuperación.',
        [
          {
            text: 'Ingresar código',
            onPress: () => {
              router.push(
                {
                  pathname:
                    '/restablecer-password',
                  params: {
                    correo: correoLimpio,
                  },
                } as any
              );
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
    >
      <ScrollView
        style={[
          styles.scroll,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
        contentContainerStyle={[
          styles.container,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor:
                  colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Regresar"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colores.texto}
            />
          </TouchableOpacity>

          <BotonAccesibilidad />
        </View>

        <View style={styles.header}>
          <View
            style={[
              styles.logoBox,
              {
                backgroundColor:
                  colores.fondoPrimario,
                borderColor:
                  altoContraste
                    ? colores.borde
                    : 'transparent',
              },
            ]}
          >
            <Ionicons
              name="key-outline"
              size={55}
              color={colores.primario}
            />
          </View>

          <Text
            style={[
              styles.title,
              {
                color: colores.texto,
                fontSize:
                  26 * escalaTexto,
                lineHeight:
                  32 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Recuperar contraseña
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
            Escribe el correo asociado a
            tu cuenta. Te enviaremos un
            código de 6 dígitos.
          </Text>
        </View>

        <View style={styles.form}>
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
                borderColor: errorCorreo
                  ? colorError
                  : colores.borde,
                borderWidth: errorCorreo
                  ? 1.5
                  : 1,
              },
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={21}
              color={
                errorCorreo
                  ? colorError
                  : colores.textoSecundario
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
              onSubmitEditing={
                solicitarCodigo
              }
              accessibilityLabel="Correo electrónico"
              accessibilityHint="Escribe el correo asociado a tu cuenta"
            />
          </View>

          {errorCorreo ? (
            <Text
              style={[
                styles.errorText,
                {
                  color: colorError,
                  fontSize:
                    13 * escalaTexto,
                  lineHeight:
                    18 * escalaTexto,
                },
              ]}
              accessibilityRole="alert"
            >
              {errorCorreo}
            </Text>
          ) : null}

          <View
            style={[
              styles.infoBox,
              {
                backgroundColor:
                  fondoInformacion,
                borderColor:
                  altoContraste
                    ? colores.borde
                    : 'transparent',
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={
                altoContraste
                  ? colores.primario
                  : colorInformacion
              }
            />

            <Text
              style={[
                styles.infoText,
                {
                  color:
                    colorInformacion,
                  fontSize:
                    13 * escalaTexto,
                  lineHeight:
                    19 * escalaTexto,
                },
              ]}
            >
              El código será válido
              durante 15 minutos y solo
              podrá utilizarse una vez.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor:
                  colores.primario,
              },
              cargando &&
                styles.buttonDisabled,
            ]}
            onPress={solicitarCodigo}
            disabled={cargando}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Enviar código de recuperación"
            accessibilityState={{
              disabled: cargando,
              busy: cargando,
            }}
          >
            {cargando ? (
              <ActivityIndicator
                color={textoBoton}
              />
            ) : (
              <>
                <Ionicons
                  name="mail-outline"
                  size={21}
                  color={textoBoton}
                />

                <Text
                  style={[
                    styles.buttonText,
                    {
                      color: textoBoton,
                      fontSize:
                        16 *
                        escalaTexto,
                    },
                  ]}
                >
                  Enviar código
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() =>
              router.replace('/' as any)
            }
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio de sesión"
          >
            <Text
              style={[
                styles.loginText,
                {
                  color:
                    colores.primario,
                  fontSize:
                    14 * escalaTexto,
                },
              ]}
            >
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
  },

  scroll: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 50,
    paddingBottom: 80,
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
    borderWidth: 1,
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  title: {
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
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
    fontWeight: '700',
    marginBottom: 8,
  },

  inputBox: {
    minHeight: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 3,
  },

  input: {
    flex: 1,
    minHeight: 54,
    marginLeft: 10,
  },

  errorText: {
    fontWeight: '600',
    marginTop: 7,
  },

  infoBox: {
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 22,
    marginBottom: 24,
  },

  infoText: {
    flex: 1,
    marginLeft: 11,
  },

  button: {
    minHeight: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 4,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    fontWeight: '800',
    textAlign: 'center',
  },

  loginButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
  },

  loginText: {
    fontWeight: '700',
    textAlign: 'center',
  },
});