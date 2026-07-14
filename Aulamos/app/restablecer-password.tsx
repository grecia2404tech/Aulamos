import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  useCallback,
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

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
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

  const colorExito = altoContraste
    ? colores.exito
    : preferencias.modoOscuro
      ? '#4ADE80'
      : '#16A34A';

  const colorValidacion =
    altoContraste
      ? colores.primario
      : preferencias.modoOscuro
        ? '#93C5FD'
        : '#2563EB';

  const fondoExito =
    altoContraste ||
    preferencias.modoOscuro
      ? colores.fondoPrimario
      : '#F0FDF4';

  const fondoDeshabilitado =
    altoContraste ||
    preferencias.modoOscuro
      ? colores.fondoPrimario
      : '#F1F5F9';

  const fondoInformacion =
    altoContraste ||
    preferencias.modoOscuro
      ? colores.fondoPrimario
      : '#EFF6FF';

  const colorInformacion =
    altoContraste
      ? colores.texto
      : preferencias.modoOscuro
        ? '#93C5FD'
        : '#1D4ED8';

  const textoBoton = altoContraste
    ? '#000000'
    : '#FFFFFF';

  useFocusEffect(
    useCallback(() => {
      if (
        preferencias.lectorPantalla
      ) {
        leerTexto(
          'Nueva contraseña. Ingresa el código enviado a tu correo. El código se validará automáticamente cuando escribas los 6 dígitos.'
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
   * Validación automática.
   * Comienza cuando existen exactamente
   * seis dígitos.
   */
  useEffect(() => {
    const numeroValidacion =
      validacionActual.current + 1;

    validacionActual.current =
      numeroValidacion;

    setCodigoValidado(false);

    if (codigo.length !== 6) {
      setValidandoCodigo(false);
      return;
    }

    const correoLimpio = correo
      .trim()
      .toLowerCase();

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

      if (
        preferencias.lectorPantalla
      ) {
        leerTexto(
          'Contraseña actualizada correctamente.'
        );
      }

      Alert.alert(
        'Contraseña actualizada',
        datos.mensaje ||
          'Ya puedes iniciar sesión con tu nueva contraseña.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () =>
              router.replace(
                '/' as any
              ),
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

  const estiloCaja = (
    error?: string,
    exito = false,
    deshabilitada = false
  ) => {
    let backgroundColor =
      colores.tarjeta;

    let borderColor =
      colores.borde;

    let borderWidth = 1;

    if (deshabilitada) {
      backgroundColor =
        fondoDeshabilitado;
    }

    if (exito) {
      backgroundColor = fondoExito;
      borderColor = colorExito;
      borderWidth = 1.5;
    }

    if (error) {
      borderColor = colorError;
      borderWidth = 1.5;
    }

    return {
      backgroundColor,
      borderColor,
      borderWidth,
    };
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
        ref={scrollRef}
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
                borderColor:
                  colores.borde,
              },
            ]}
            onPress={() =>
              router.back()
            }
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
              name="shield-checkmark-outline"
              size={55}
              color={colorExito}
            />
          </View>

          <Text
            style={[
              styles.title,
              {
                color: colores.texto,
                fontSize:
                  25 * escalaTexto,
                lineHeight:
                  31 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Nueva contraseña
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
                  21 * escalaTexto,
              },
            ]}
          >
            Ingresa el código enviado a
            tu correo y crea una
            contraseña nueva.
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
              estiloCaja(
                errores.correo
              ),
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={
                errores.correo
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
              style={[
                styles.errorText,
                {
                  color: colorError,
                  fontSize:
                    13 * escalaTexto,
                },
              ]}
              accessibilityRole="alert"
            >
              {errores.correo}
            </Text>
          ) : null}

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
            Código de recuperación
          </Text>

          <View
            style={[
              styles.inputBox,
              estiloCaja(
                errores.codigo,
                codigoValidado
              ),
            ]}
          >
            <Ionicons
              name="keypad-outline"
              size={20}
              color={
                codigoValidado
                  ? colorExito
                  : errores.codigo
                    ? colorError
                    : colores.textoSecundario
              }
            />

            <TextInput
              style={[
                styles.input,
                styles.codeInput,
                {
                  color: colores.texto,
                  fontSize:
                    20 * escalaTexto,
                },
              ]}
              placeholder="000000"
              placeholderTextColor={
                colores.textoSecundario
              }
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
              accessibilityHint="La validación será automática al escribir los seis dígitos"
            />

            {validandoCodigo ? (
              <ActivityIndicator
                size="small"
                color={colorValidacion}
              />
            ) : codigoValidado ? (
              <Ionicons
                name="checkmark-circle"
                size={23}
                color={colorExito}
              />
            ) : null}
          </View>

          {validandoCodigo ? (
            <View
              style={
                styles.validationMessage
              }
              accessibilityLiveRegion="polite"
            >
              <ActivityIndicator
                size="small"
                color={colorValidacion}
              />

              <Text
                style={[
                  styles.messageText,
                  {
                    color:
                      colorValidacion,
                    fontSize:
                      13 *
                      escalaTexto,
                  },
                ]}
              >
                Validando código...
              </Text>
            </View>
          ) : errores.codigo ? (
            <View
              style={
                styles.validationMessage
              }
              accessibilityLiveRegion="assertive"
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colorError}
              />

              <Text
                style={[
                  styles.messageText,
                  styles.flexText,
                  {
                    color: colorError,
                    fontSize:
                      13 *
                      escalaTexto,
                  },
                ]}
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
              accessibilityLiveRegion="polite"
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colorExito}
              />

              <Text
                style={[
                  styles.messageText,
                  {
                    color: colorExito,
                    fontSize:
                      13 *
                      escalaTexto,
                  },
                ]}
              >
                Código validado correctamente
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.helperText,
                {
                  color:
                    colores.textoSecundario,
                  fontSize:
                    12 * escalaTexto,
                },
              ]}
            >
              {codigo.length > 0
                ? 'Escribe los 6 dígitos del código'
                : 'La validación será automática'}
            </Text>
          )}

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
            Nueva contraseña
          </Text>

          <View
            style={[
              styles.inputBox,
              estiloCaja(
                errores.password,
                false,
                !codigoValidado
              ),
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={
                codigoValidado
                  ? colores.textoSecundario
                  : colores.borde
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  color: codigoValidado
                    ? colores.texto
                    : colores.textoSecundario,
                  fontSize:
                    15 * escalaTexto,
                },
              ]}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={
                colores.textoSecundario
              }
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
              accessibilityState={{
                disabled:
                  !codigoValidado,
              }}
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
                    ? colores.textoSecundario
                    : colores.borde
                }
              />
            </TouchableOpacity>
          </View>

          {errores.password ? (
            <Text
              style={[
                styles.errorText,
                {
                  color: colorError,
                  fontSize:
                    13 * escalaTexto,
                },
              ]}
              accessibilityRole="alert"
            >
              {errores.password}
            </Text>
          ) : null}

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
            Confirmar contraseña
          </Text>

          <View
            style={[
              styles.inputBox,
              estiloCaja(
                errores.confirmarPassword,
                false,
                !codigoValidado
              ),
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={
                codigoValidado
                  ? colores.textoSecundario
                  : colores.borde
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  color: codigoValidado
                    ? colores.texto
                    : colores.textoSecundario,
                  fontSize:
                    15 * escalaTexto,
                },
              ]}
              placeholder="Repite tu contraseña"
              placeholderTextColor={
                colores.textoSecundario
              }
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
              accessibilityState={{
                disabled:
                  !codigoValidado,
              }}
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
                    ? colores.textoSecundario
                    : colores.borde
                }
              />
            </TouchableOpacity>
          </View>

          {errores.confirmarPassword ? (
            <Text
              style={[
                styles.errorText,
                {
                  color: colorError,
                  fontSize:
                    13 * escalaTexto,
                },
              ]}
              accessibilityRole="alert"
            >
              {
                errores.confirmarPassword
              }
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
              name="shield-checkmark"
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
                    18 * escalaTexto,
                },
              ]}
            >
              El código se valida
              automáticamente al escribir
              los 6 dígitos. Después podrás
              crear tu nueva contraseña.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor:
                  colores.primario,
              },
              (
                cargando ||
                !codigoValidado
              ) &&
                styles.buttonDisabled,
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
              busy: cargando,
            }}
          >
            {cargando ? (
              <ActivityIndicator
                color={textoBoton}
              />
            ) : (
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
  },

  scroll: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 50,
    paddingBottom: 140,
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
    marginTop: 28,
    marginBottom: 28,
  },

  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  title: {
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    textAlign: 'center',
    marginTop: 9,
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
    minHeight: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },

  input: {
    flex: 1,
    minHeight: 52,
    marginLeft: 10,
  },

  codeInput: {
    fontWeight: '800',
    letterSpacing: 6,
  },

  eyeButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    fontWeight: '600',
    marginBottom: 14,
    lineHeight: 18,
  },

  validationMessage: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },

  messageText: {
    fontWeight: '700',
    marginLeft: 7,
  },

  flexText: {
    flex: 1,
  },

  helperText: {
    marginBottom: 17,
    lineHeight: 18,
  },

  infoBox: {
    minHeight: 62,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginTop: 10,
    marginBottom: 22,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
  },

  button: {
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 4,
  },

  buttonDisabled: {
    opacity: 0.45,
  },

  buttonText: {
    fontWeight: '800',
    textAlign: 'center',
  },
});