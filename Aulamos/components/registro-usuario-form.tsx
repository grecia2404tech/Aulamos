import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import type { ComponentProps } from 'react';
import {
  useCallback,
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

import BotonAccesibilidad from './BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type RolRegistro = 'Alumno' | 'Docente';

type CampoError =
  | 'nombre'
  | 'apellidoPaterno'
  | 'apellidoMaterno'
  | 'correo'
  | 'password'
  | 'confirmarPassword'
  | 'general';

type Errores = Partial<
  Record<CampoError, string>
>;

type IconoNombre =
  ComponentProps<typeof Ionicons>['name'];

interface CampoProps {
  label: string;
  icono: IconoNombre;
  value: string;
  error?: string;
  placeholder: string;
  onChangeText: (texto: string) => void;
  onFocus?: () => void;
  keyboardType?:
    | 'default'
    | 'email-address';
  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words';
  secureTextEntry?: boolean;
  onMostrarPassword?: () => void;
  maxLength?: number;
  editable?: boolean;
}

function CampoRegistro({
  label,
  icono,
  value,
  error,
  placeholder,
  onChangeText,
  onFocus,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  onMostrarPassword,
  maxLength,
  editable = true,
}: CampoProps) {
  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const colorError =
    preferencias.altoContraste
      ? colores.peligro
      : '#DC2626';

  return (
    <View style={styles.field}>
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
        {label}
      </Text>

      <View
        style={[
          styles.inputBox,
          {
            backgroundColor:
              colores.tarjeta,
            borderColor: error
              ? colorError
              : colores.borde,
            borderWidth: error
              ? 1.5
              : 1,
          },
        ]}
      >
        <Ionicons
          name={icono}
          size={20}
          color={
            error
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
          placeholder={placeholder}
          placeholderTextColor={
            colores.textoSecundario
          }
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={
            secureTextEntry
          }
          maxLength={maxLength}
          accessibilityLabel={label}
          editable={editable}
        />

        {onMostrarPassword ? (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={onMostrarPassword}
            accessibilityRole="button"
            accessibilityLabel={
              secureTextEntry
                ? 'Mostrar contraseña'
                : 'Ocultar contraseña'
            }
          >
            <Ionicons
              name={
                secureTextEntry
                  ? 'eye-outline'
                  : 'eye-off-outline'
              }
              size={21}
              color={
                colores.textoSecundario
              }
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
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
          {error}
        </Text>
      ) : null}
    </View>
  );
}

interface RegistroUsuarioFormProps {
  rol: RolRegistro;
}

export default function RegistroUsuarioForm({
  rol,
}: RegistroUsuarioFormProps) {
  const scrollRef =
    useRef<ScrollView>(null);

  const [nombre, setNombre] =
    useState('');

  const [
    apellidoPaterno,
    setApellidoPaterno,
  ] = useState('');

  const [
    apellidoMaterno,
    setApellidoMaterno,
  ] = useState('');

  const [correo, setCorreo] =
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

  const esAlumno = rol === 'Alumno';

  const altoContraste =
    preferencias.altoContraste;

  const temaOscuro =
    preferencias.modoOscuro ||
    altoContraste;

  const colorRol = altoContraste
    ? colores.primario
    : esAlumno
      ? temaOscuro
        ? '#60A5FA'
        : '#2563EB'
      : temaOscuro
        ? '#4ADE80'
        : '#16A34A';

  const fondoIcono = temaOscuro
    ? colores.fondoPrimario
    : esAlumno
      ? '#DBEAFE'
      : '#DCFCE7';

  const colorError = altoContraste
    ? colores.peligro
    : '#DC2626';

  const textoBoton = altoContraste
    ? '#000000'
    : '#FFFFFF';

  const fondoInformacion = temaOscuro
    ? colores.fondoPrimario
    : '#EFF6FF';

  const colorInformacion =
    altoContraste
      ? colores.texto
      : preferencias.modoOscuro
        ? '#93C5FD'
        : '#2563EB';

  const titulo = esAlumno
    ? 'Crear cuenta alumno'
    : 'Crear cuenta docente';

  const icono = (
    esAlumno
      ? 'school'
      : 'id-card-outline'
  ) as IconoNombre;

  useFocusEffect(
    useCallback(() => {
      if (
        preferencias.lectorPantalla
      ) {
        leerTexto(
          `${titulo}. Completa tus datos para acceder a Aulamos. Todos los campos son obligatorios.`
        );
      }

      return () => {
        detenerLectura();
      };
    }, [
      preferencias.lectorPantalla,
      titulo,
      leerTexto,
      detenerLectura,
    ])
  );

  const desplazarHaciaAbajo = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }, 300);
  };

  const limpiarError = (
    campo: CampoError
  ) => {
    setErrores((anteriores) => ({
      ...anteriores,
      [campo]: undefined,
      general: undefined,
    }));
  };

  const validarFormulario = () => {
    const nuevosErrores: Errores = {};

    const nombreLimpio = nombre
      .trim()
      .replace(/\s+/g, ' ');

    const paternoLimpio =
      apellidoPaterno
        .trim()
        .replace(/\s+/g, ' ');

    const maternoLimpio =
      apellidoMaterno
        .trim()
        .replace(/\s+/g, ' ');

    const correoLimpio = correo
      .trim()
      .toLowerCase();

    const expresionNombre =
      /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

    const expresionCorreo =
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const contieneLetra =
      /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;

    const contieneNumero = /\d/;

    if (!nombreLimpio) {
      nuevosErrores.nombre =
        'Ingresa tu nombre';
    } else if (
      nombreLimpio.length < 2
    ) {
      nuevosErrores.nombre =
        'El nombre debe tener al menos 2 caracteres';
    } else if (
      !expresionNombre.test(
        nombreLimpio
      )
    ) {
      nuevosErrores.nombre =
        'El nombre solo puede contener letras';
    }

    if (!paternoLimpio) {
      nuevosErrores.apellidoPaterno =
        'Ingresa tu apellido paterno';
    } else if (
      !expresionNombre.test(
        paternoLimpio
      )
    ) {
      nuevosErrores.apellidoPaterno =
        'El apellido solo puede contener letras';
    }

    if (!maternoLimpio) {
      nuevosErrores.apellidoMaterno =
        'Ingresa tu apellido materno';
    } else if (
      !expresionNombre.test(
        maternoLimpio
      )
    ) {
      nuevosErrores.apellidoMaterno =
        'El apellido solo puede contener letras';
    }

    if (!correoLimpio) {
      nuevosErrores.correo =
        'Ingresa tu correo electrónico';
    } else if (
      !expresionCorreo.test(
        correoLimpio
      )
    ) {
      nuevosErrores.correo =
        'Ingresa un correo electrónico válido';
    }

    if (!password) {
      nuevosErrores.password =
        'Ingresa una contraseña';
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
        'Confirma tu contraseña';
    } else if (
      password !== confirmarPassword
    ) {
      nuevosErrores.confirmarPassword =
        'Las contraseñas no coinciden';
    }

    setErrores(nuevosErrores);

    if (
      Object.keys(nuevosErrores)
        .length > 0
    ) {
      scrollRef.current?.scrollTo({
        y: 0,
        animated: true,
      });

      return false;
    }

    return true;
  };

  const crearCuenta = async () => {
    if (
      !validarFormulario() ||
      cargando
    ) {
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/registro`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            nombre: nombre
              .trim()
              .replace(/\s+/g, ' '),

            apellido_paterno:
              apellidoPaterno
                .trim()
                .replace(/\s+/g, ' '),

            apellido_materno:
              apellidoMaterno
                .trim()
                .replace(/\s+/g, ' '),

            correo: correo
              .trim()
              .toLowerCase(),

            password,

            confirmar_password:
              confirmarPassword,

            rol,
          }),
        }
      );

      const textoRespuesta =
        await response.text();

      let data: {
        mensaje?: string;
        campo?: string;
      } = {};

      if (textoRespuesta) {
        try {
          data = JSON.parse(
            textoRespuesta
          );
        } catch {
          data = {
            mensaje:
              'El servidor envió una respuesta incorrecta',
          };
        }
      }

      if (!response.ok) {
        const mapaCampos: Record<
          string,
          CampoError
        > = {
          nombre: 'nombre',
          apellido_paterno:
            'apellidoPaterno',
          apellido_materno:
            'apellidoMaterno',
          correo: 'correo',
          password: 'password',
          confirmar_password:
            'confirmarPassword',
        };

        const campoFormulario =
          data.campo
            ? mapaCampos[data.campo]
            : undefined;

        if (campoFormulario) {
          setErrores(
            (anteriores) => ({
              ...anteriores,
              [campoFormulario]:
                data.mensaje ||
                'Verifica la información ingresada',
            })
          );
        } else {
          setErrores(
            (anteriores) => ({
              ...anteriores,
              general:
                data.mensaje ||
                'No se pudo crear la cuenta',
            })
          );
        }

        return;
      }

      if (
        preferencias.lectorPantalla
      ) {
        leerTexto(
          `Cuenta de ${rol.toLowerCase()} creada correctamente.`
        );
      }

      Alert.alert(
        'Cuenta creada',
        `La cuenta de ${rol.toLowerCase()} se creó correctamente`,
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
      console.log(
        'Error de registro:',
        error
      );

      setErrores(
        (anteriores) => ({
          ...anteriores,
          general:
            'No se pudo conectar con el servidor',
        })
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
      keyboardVerticalOffset={
        Platform.OS === 'ios'
          ? 10
          : 0
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
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() =>
              router.back()
            }
            style={[
              styles.iconButton,
              {
                backgroundColor:
                  colores.tarjeta,
                borderColor:
                  colores.borde,
              },
            ]}
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
                  fondoIcono,
                borderColor:
                  altoContraste
                    ? colores.borde
                    : 'transparent',
              },
            ]}
          >
            <Ionicons
              name={icono}
              size={58}
              color={colorRol}
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
            {titulo}
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
            Completa tus datos para
            acceder a AULAMOS
          </Text>
        </View>

        <View style={styles.form}>
          <CampoRegistro
            label="Nombre"
            icono="person-outline"
            placeholder={
              esAlumno
                ? 'Ej. Juan'
                : 'Ej. Ana María'
            }
            value={nombre}
            onChangeText={(texto) => {
              setNombre(texto);
              limpiarError('nombre');
            }}
            error={errores.nombre}
            autoCapitalize="words"
            maxLength={100}
            editable={!cargando}
          />

          <CampoRegistro
            label="Apellido paterno"
            icono="person-outline"
            placeholder={
              esAlumno
                ? 'Ej. Vázquez'
                : 'Ej. López'
            }
            value={apellidoPaterno}
            onChangeText={(texto) => {
              setApellidoPaterno(texto);
              limpiarError(
                'apellidoPaterno'
              );
            }}
            error={
              errores.apellidoPaterno
            }
            autoCapitalize="words"
            maxLength={100}
            editable={!cargando}
          />

          <CampoRegistro
            label="Apellido materno"
            icono="person-outline"
            placeholder={
              esAlumno
                ? 'Ej. López'
                : 'Ej. Hernández'
            }
            value={apellidoMaterno}
            onChangeText={(texto) => {
              setApellidoMaterno(texto);
              limpiarError(
                'apellidoMaterno'
              );
            }}
            error={
              errores.apellidoMaterno
            }
            autoCapitalize="words"
            maxLength={100}
            editable={!cargando}
          />

          <CampoRegistro
            label="Correo electrónico"
            icono="mail-outline"
            placeholder="correo@gmail.com"
            value={correo}
            onChangeText={(texto) => {
              setCorreo(texto);
              limpiarError('correo');
            }}
            error={errores.correo}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={150}
            editable={!cargando}
          />

          <CampoRegistro
            label="Contraseña"
            icono="lock-closed-outline"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChangeText={(texto) => {
              setPassword(texto);
              limpiarError('password');

              if (confirmarPassword) {
                limpiarError(
                  'confirmarPassword'
                );
              }
            }}
            onFocus={
              desplazarHaciaAbajo
            }
            error={errores.password}
            autoCapitalize="none"
            secureTextEntry={
              !mostrarPassword
            }
            onMostrarPassword={() =>
              setMostrarPassword(
                (valor) => !valor
              )
            }
            maxLength={64}
            editable={!cargando}
          />

          <CampoRegistro
            label="Confirmar contraseña"
            icono="lock-closed-outline"
            placeholder="Repite tu contraseña"
            value={
              confirmarPassword
            }
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
            error={
              errores.confirmarPassword
            }
            autoCapitalize="none"
            secureTextEntry={
              !mostrarConfirmacion
            }
            onMostrarPassword={() =>
              setMostrarConfirmacion(
                (valor) => !valor
              )
            }
            maxLength={64}
            editable={!cargando}
          />

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
              size={26}
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
                    14 * escalaTexto,
                  lineHeight:
                    19 * escalaTexto,
                },
              ]}
            >
              Usa al menos 8 caracteres
              con letras y números.
            </Text>
          </View>

          {errores.general ? (
            <Text
              style={[
                styles.generalError,
                {
                  color: colorError,
                  backgroundColor:
                    temaOscuro
                      ? colores.tarjeta
                      : '#FEF2F2',
                  borderColor:
                    colorError,
                  fontSize:
                    14 * escalaTexto,
                  lineHeight:
                    20 * escalaTexto,
                },
              ]}
              accessibilityRole="alert"
            >
              {errores.general}
            </Text>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.button,
              {
                backgroundColor:
                  colores.primario,
              },
              cargando &&
                styles.buttonDisabled,
            ]}
            onPress={crearCuenta}
            disabled={cargando}
            accessibilityRole="button"
            accessibilityLabel={`Crear cuenta de ${rol.toLowerCase()}`}
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
                Crear cuenta
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
    paddingBottom: 130,
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
    textAlign: 'center',
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 8,
    textAlign: 'center',
  },

  form: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },

  field: {
    marginBottom: 17,
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
    paddingRight: 6,
    paddingVertical: 3,
  },

  input: {
    flex: 1,
    minHeight: 52,
    marginLeft: 10,
  },

  eyeButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    fontWeight: '600',
    marginTop: 6,
  },

  infoBox: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 18,
  },

  infoText: {
    marginLeft: 12,
    fontWeight: '600',
    flex: 1,
  },

  generalError: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontWeight: '600',
    marginBottom: 16,
  },

  button: {
    minHeight: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#4A7CFF',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    fontWeight: '800',
    textAlign: 'center',
  },
});