import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  useEffect,
  useRef,
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

import { API_URL } from '../services/api';

type CampoError =
  | 'correo'
  | 'codigo'
  | 'password'
  | 'confirmarPassword';

type Errores = Partial<
  Record<CampoError, string>
>;

export default function RestablecerPasswordScreen() {
  const parametros =
    useLocalSearchParams<{
      correo?: string | string[];
    }>();

  const correoInicial =
    Array.isArray(parametros.correo)
      ? parametros.correo[0] || ''
      : parametros.correo || '';

  const scrollRef =
    useRef<ScrollView>(null);

  /*
   * Sirve para evitar que una validación
   * anterior modifique el estado cuando
   * el usuario ya cambió el código.
   */
  const validacionActual = useRef(0);

  const [correo, setCorreo] =
    useState(correoInicial);

  const [codigo, setCodigo] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    confirmarPassword,
    setConfirmarPassword,
  ] = useState('');

  const [
    mostrarPassword,
    setMostrarPassword,
  ] = useState(false);

  const [
    mostrarConfirmacion,
    setMostrarConfirmacion,
  ] = useState(false);

  const [
    codigoValidado,
    setCodigoValidado,
  ] = useState(false);

  const [
    validandoCodigo,
    setValidandoCodigo,
  ] = useState(false);

  const [errores, setErrores] =
    useState<Errores>({});

  const [cargando, setCargando] =
    useState(false);

  const limpiarError = (
    campo: CampoError
  ) => {
    setErrores((anteriores) => ({
      ...anteriores,
      [campo]: undefined,
    }));
  };

  const desplazarHaciaAbajo = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }, 300);
  };

  /*
   * Validación automática del código.
   * Se ejecuta cuando correo o código cambian.
   */
  useEffect(() => {
    const numeroValidacion =
      validacionActual.current + 1;

    validacionActual.current =
      numeroValidacion;

    setCodigoValidado(false);

    /*
     * Esperamos hasta tener exactamente
     * seis dígitos.
     */
    if (codigo.length !== 6) {
      setValidandoCodigo(false);
      return;
    }

    const correoLimpio =
      correo.trim().toLowerCase();

    const expresionCorreo =
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (
      !correoLimpio ||
      !expresionCorreo.test(
        correoLimpio
      )
    ) {
      setValidandoCodigo(false);

      setErrores((anteriores) => ({
        ...anteriores,
        correo:
          'Ingresa un correo electrónico válido',
      }));

      return;
    }

    setValidandoCodigo(true);

    setErrores((anteriores) => ({
      ...anteriores,
      correo: undefined,
      codigo: undefined,
    }));

    /*
     * Esperamos medio segundo antes
     * de consultar el backend.
     */
    const temporizador = setTimeout(
      async () => {
        try {
          const respuesta = await fetch(
            `${API_URL}/auth/validar-codigo-recuperacion`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                correo: correoLimpio,
                codigo,
              }),
            }
          );

          const texto =
            await respuesta.text();

          /*
           * Ignoramos esta respuesta si el
           * usuario ya cambió el código.
           */
          if (
            numeroValidacion !==
            validacionActual.current
          ) {
            return;
          }

          let datos: {
            valido?: boolean;
            mensaje?: string;
          } = {};

          if (texto) {
            try {
              datos = JSON.parse(texto);
            } catch {
              datos = {
                valido: false,
                mensaje:
                  'El servidor envió una respuesta incorrecta',
              };
            }
          }

          if (
            !respuesta.ok ||
            !datos.valido
          ) {
            setCodigoValidado(false);

            setErrores(
              (anteriores) => ({
                ...anteriores,
                codigo:
                  datos.mensaje ||
                  'El código no es válido',
              })
            );

            return;
          }

          setCodigoValidado(true);

          setErrores(
            (anteriores) => ({
              ...anteriores,
              codigo: undefined,
            })
          );
        } catch (error) {
          if (
            numeroValidacion !==
            validacionActual.current
          ) {
            return;
          }

          console.error(
            'Error al validar código:',
            error
          );

          setCodigoValidado(false);

          setErrores(
            (anteriores) => ({
              ...anteriores,
              codigo:
                'No fue posible validar el código',
            })
          );
        } finally {
          if (
            numeroValidacion ===
            validacionActual.current
          ) {
            setValidandoCodigo(false);
          }
        }
      },
      500
    );

    return () => {
      clearTimeout(temporizador);
    };
  }, [codigo, correo]);

  const validarFormulario = () => {
    const nuevosErrores: Errores = {};

    const contieneLetra =
      /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;

    const contieneNumero = /\d/;

    if (!codigoValidado) {
      nuevosErrores.codigo =
        'Espera a que el código sea validado';
    }

    if (!password) {
      nuevosErrores.password =
        'Ingresa una nueva contraseña';
    } else if (
      password.length < 8
    ) {
      nuevosErrores.password =
        'La contraseña debe tener al menos 8 caracteres';
    } else if (
      password.length > 64
    ) {
      nuevosErrores.password =
        'La contraseña no puede superar los 64 caracteres';
    } else if (
      !contieneLetra.test(password) ||
      !contieneNumero.test(password)
    ) {
      nuevosErrores.password =
        'La contraseña debe contener letras y números';
    }

    if (!confirmarPassword) {
      nuevosErrores.confirmarPassword =
        'Confirma la nueva contraseña';
    } else if (
      password !== confirmarPassword
    ) {
      nuevosErrores.confirmarPassword =
        'Las contraseñas no coinciden';
    }

    setErrores((anteriores) => ({
      ...anteriores,
      ...nuevosErrores,
    }));

    return (
      Object.keys(nuevosErrores)
        .length === 0
    );
  };

  const cambiarPassword = async () => {
    if (
      !validarFormulario() ||
      cargando
    ) {
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch(
        `${API_URL}/auth/restablecer-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            correo: correo
              .trim()
              .toLowerCase(),

            codigo,

            nueva_password: password,

            confirmar_password:
              confirmarPassword,
          }),
        }
      );

      const texto =
        await respuesta.text();

      let datos: {
        mensaje?: string;
        campo?: string;
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
        if (
          datos.campo === 'correo'
        ) {
          setErrores(
            (anteriores) => ({
              ...anteriores,
              correo:
                datos.mensaje ||
                'Verifica el correo',
            })
          );
        } else if (
          datos.campo === 'codigo'
        ) {
          setCodigoValidado(false);

          setErrores(
            (anteriores) => ({
              ...anteriores,
              codigo:
                datos.mensaje ||
                'El código ya no es válido',
            })
          );
        } else if (
          datos.campo ===
          'nueva_password'
        ) {
          setErrores(
            (anteriores) => ({
              ...anteriores,
              password:
                datos.mensaje,
            })
          );
        } else if (
          datos.campo ===
          'confirmar_password'
        ) {
          setErrores(
            (anteriores) => ({
              ...anteriores,
              confirmarPassword:
                datos.mensaje,
            })
          );
        } else {
          Alert.alert(
            'No se pudo cambiar la contraseña',
            datos.mensaje ||
              'Verifica la información.'
          );
        }

        return;
      }

      Alert.alert(
        'Contraseña actualizada',
        datos.mensaje ||
          'Ya puedes iniciar sesión con tu nueva contraseña.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () =>
              router.replace('/'),
          },
        ]
      );
    } catch (error) {
      console.error(
        'Error al cambiar contraseña:',
        error
      );

      Alert.alert(
        'Error de conexión',
        'No fue posible conectarse con el servidor.'
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
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              router.back()
            }
            accessibilityRole="button"
            accessibilityLabel="Regresar"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#111827"
            />
          </TouchableOpacity>

          <View
            style={styles.accessButton}
          >
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
              name="shield-checkmark-outline"
              size={55}
              color="#16A34A"
            />
          </View>

          <Text style={styles.title}>
            Nueva contraseña
          </Text>

          <Text style={styles.subtitle}>
            Ingresa el código enviado a
            tu correo y crea una
            contraseña nueva.
          </Text>
        </View>

        <View style={styles.form}>
          {/* Correo */}

          <Text style={styles.label}>
            Correo electrónico
          </Text>

          <View
            style={[
              styles.inputBox,
              errores.correo
                ? styles.inputBoxError
                : null,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={
                errores.correo
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
                setCodigoValidado(false);
                limpiarError('correo');
                limpiarError('codigo');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!cargando}
              maxLength={150}
              accessibilityLabel="Correo electrónico"
            />
          </View>

          {errores.correo ? (
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
            >
              {errores.correo}
            </Text>
          ) : null}

          {/* Código */}

          <Text style={styles.label}>
            Código de recuperación
          </Text>

          <View
            style={[
              styles.inputBox,

              codigoValidado
                ? styles.inputBoxSuccess
                : null,

              errores.codigo
                ? styles.inputBoxError
                : null,
            ]}
          >
            <Ionicons
              name="keypad-outline"
              size={20}
              color={
                codigoValidado
                  ? '#16A34A'
                  : errores.codigo
                    ? '#DC2626'
                    : '#64748B'
              }
            />

            <TextInput
              style={[
                styles.input,
                styles.codeInput,
              ]}
              placeholder="000000"
              placeholderTextColor="#94A3B8"
              value={codigo}
              onChangeText={(texto) => {
                const codigoNumerico =
                  texto.replace(
                    /\D/g,
                    ''
                  );

                setCodigo(
                  codigoNumerico
                );

                setCodigoValidado(false);
                limpiarError('codigo');
              }}
              keyboardType="number-pad"
              maxLength={6}
              editable={!cargando}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              accessibilityLabel="Código de recuperación"
            />

            {validandoCodigo ? (
              <ActivityIndicator
                size="small"
                color="#2563EB"
              />
            ) : codigoValidado ? (
              <Ionicons
                name="checkmark-circle"
                size={23}
                color="#16A34A"
              />
            ) : null}
          </View>

          {validandoCodigo ? (
            <View
              style={
                styles.validationMessage
              }
            >
              <ActivityIndicator
                size="small"
                color="#2563EB"
              />

              <Text
                style={
                  styles.validatingText
                }
              >
                Validando código...
              </Text>
            </View>
          ) : errores.codigo ? (
            <View
              style={
                styles.validationMessage
              }
            >
              <Ionicons
                name="close-circle"
                size={18}
                color="#DC2626"
              />

              <Text
                style={styles.invalidText}
                accessibilityRole="alert"
              >
                {errores.codigo}
              </Text>
            </View>
          ) : codigoValidado ? (
            <View
              style={
                styles.validationMessage
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#15803D"
              />

              <Text
                style={styles.successText}
              >
                Código validado correctamente
              </Text>
            </View>
          ) : codigo.length > 0 ? (
            <Text style={styles.helperText}>
              Escribe los 6 dígitos del
              código
            </Text>
          ) : (
            <Text style={styles.helperText}>
              La validación será automática
            </Text>
          )}

          {/* Nueva contraseña */}

          <Text style={styles.label}>
            Nueva contraseña
          </Text>

          <View
            style={[
              styles.inputBox,
              errores.password
                ? styles.inputBoxError
                : null,
              !codigoValidado
                ? styles.inputBoxDisabled
                : null,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={
                codigoValidado
                  ? '#64748B'
                  : '#CBD5E1'
              }
            />

            <TextInput
              style={[
                styles.input,
                !codigoValidado
                  ? styles.inputDisabled
                  : null,
              ]}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={(texto) => {
                setPassword(texto);
                limpiarError('password');
              }}
              onFocus={
                desplazarHaciaAbajo
              }
              secureTextEntry={
                !mostrarPassword
              }
              autoCapitalize="none"
              autoCorrect={false}
              editable={
                !cargando &&
                codigoValidado
              }
              maxLength={64}
              autoComplete="new-password"
              accessibilityLabel="Nueva contraseña"
            />

            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() =>
                setMostrarPassword(
                  (valor) => !valor
                )
              }
              disabled={!codigoValidado}
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
                size={21}
                color={
                  codigoValidado
                    ? '#64748B'
                    : '#CBD5E1'
                }
              />
            </TouchableOpacity>
          </View>

          {errores.password ? (
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
            >
              {errores.password}
            </Text>
          ) : null}

          {/* Confirmar contraseña */}

          <Text style={styles.label}>
            Confirmar contraseña
          </Text>

          <View
            style={[
              styles.inputBox,
              errores.confirmarPassword
                ? styles.inputBoxError
                : null,
              !codigoValidado
                ? styles.inputBoxDisabled
                : null,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={
                codigoValidado
                  ? '#64748B'
                  : '#CBD5E1'
              }
            />

            <TextInput
              style={[
                styles.input,
                !codigoValidado
                  ? styles.inputDisabled
                  : null,
              ]}
              placeholder="Repite tu contraseña"
              placeholderTextColor="#94A3B8"
              value={confirmarPassword}
              onChangeText={(texto) => {
                setConfirmarPassword(
                  texto
                );

                limpiarError(
                  'confirmarPassword'
                );
              }}
              onFocus={
                desplazarHaciaAbajo
              }
              secureTextEntry={
                !mostrarConfirmacion
              }
              autoCapitalize="none"
              autoCorrect={false}
              editable={
                !cargando &&
                codigoValidado
              }
              maxLength={64}
              autoComplete="new-password"
              accessibilityLabel="Confirmar nueva contraseña"
            />

            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() =>
                setMostrarConfirmacion(
                  (valor) => !valor
                )
              }
              disabled={!codigoValidado}
              accessibilityRole="button"
              accessibilityLabel={
                mostrarConfirmacion
                  ? 'Ocultar contraseña'
                  : 'Mostrar contraseña'
              }
            >
              <Ionicons
                name={
                  mostrarConfirmacion
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={21}
                color={
                  codigoValidado
                    ? '#64748B'
                    : '#CBD5E1'
                }
              />
            </TouchableOpacity>
          </View>

          {errores.confirmarPassword ? (
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
            >
              {
                errores.confirmarPassword
              }
            </Text>
          ) : null}

          <View style={styles.infoBox}>
            <Ionicons
              name="shield-checkmark"
              size={24}
              color="#2563EB"
            />

            <Text style={styles.infoText}>
              El código se valida
              automáticamente al escribir
              los 6 dígitos. Después podrás
              crear tu nueva contraseña.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,

              (
                cargando ||
                !codigoValidado
              )
                ? styles.buttonDisabled
                : null,
            ]}
            onPress={cambiarPassword}
            disabled={
              cargando ||
              !codigoValidado
            }
            accessibilityRole="button"
            accessibilityLabel="Cambiar contraseña"
            accessibilityState={{
              disabled:
                cargando ||
                !codigoValidado,
            }}
          >
            {cargando ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.buttonText
                }
              >
                Cambiar contraseña
              </Text>
            )}
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
    paddingBottom: 120,
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
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  title: {
    color: '#111827',
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 9,
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
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    marginBottom: 6,
  },

  inputBoxError: {
    borderColor: '#DC2626',
    borderWidth: 1.5,
  },

  inputBoxSuccess: {
    borderColor: '#16A34A',
    borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },

  inputBoxDisabled: {
    backgroundColor: '#F1F5F9',
  },

  input: {
    flex: 1,
    minHeight: 52,
    color: '#111827',
    fontSize: 15,
    marginLeft: 10,
  },

  inputDisabled: {
    color: '#94A3B8',
  },

  codeInput: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 6,
  },

  eyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14,
  },

  validationMessage: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },

  validatingText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 7,
  },

  invalidText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 7,
  },

  successText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 7,
  },

  helperText: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 17,
  },

  infoBox: {
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginTop: 10,
    marginBottom: 22,
  },

  infoText: {
    flex: 1,
    color: '#1D4ED8',
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 10,
  },

  button: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: '#4A7CFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },

  buttonDisabled: {
    opacity: 0.45,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});