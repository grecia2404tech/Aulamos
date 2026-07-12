import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import type { ComponentProps } from 'react';
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
}: CampoProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
      </Text>

      <View
        style={[
          styles.inputBox,
          error
            ? styles.inputBoxError
            : null,
        ]}
      >
        <Ionicons
          name={icono}
          size={20}
          color={
            error
              ? '#DC2626'
              : '#64748B'
          }
        />

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
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
          editable
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
              color="#64748B"
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text
          style={styles.errorText}
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

  const esAlumno = rol === 'Alumno';

  const configuracion = {
    titulo: esAlumno
      ? 'Crear cuenta alumno'
      : 'Crear cuenta docente',

    icono: (
      esAlumno
        ? 'school'
        : 'id-card-outline'
    ) as IconoNombre,

    color: esAlumno
      ? '#2563EB'
      : '#16A34A',

    fondoIcono: esAlumno
      ? '#DBEAFE'
      : '#DCFCE7',
  };

  const desplazarHaciaAbajo = () => {
    /*
     * Esperamos a que el teclado aparezca
     * y después movemos el formulario.
     */
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

  const cambiarNombre = (
    texto: string
  ) => {
    setNombre(texto);
    limpiarError('nombre');
  };

  const cambiarApellidoPaterno = (
    texto: string
  ) => {
    setApellidoPaterno(texto);
    limpiarError(
      'apellidoPaterno'
    );
  };

  const cambiarApellidoMaterno = (
    texto: string
  ) => {
    setApellidoMaterno(texto);
    limpiarError(
      'apellidoMaterno'
    );
  };

  const cambiarCorreo = (
    texto: string
  ) => {
    setCorreo(texto);
    limpiarError('correo');
  };

  const cambiarPassword = (
    texto: string
  ) => {
    setPassword(texto);
    limpiarError('password');

    if (confirmarPassword) {
      limpiarError(
        'confirmarPassword'
      );
    }
  };

  const cambiarConfirmacion = (
    texto: string
  ) => {
    setConfirmarPassword(texto);
    limpiarError(
      'confirmarPassword'
    );
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
      !contieneLetra.test(
        password
      ) ||
      !contieneNumero.test(
        password
      )
    ) {
      nuevosErrores.password =
        'La contraseña debe contener letras y números';
    }

    if (!confirmarPassword) {
      nuevosErrores.confirmarPassword =
        'Confirma tu contraseña';
    } else if (
      password !==
      confirmarPassword
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

      Alert.alert(
        'Cuenta creada',
        `La cuenta de ${rol.toLowerCase()} se creó correctamente`,
        [
          {
            text: 'Iniciar sesión',
            onPress: () =>
              router.replace('/'),
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
      style={styles.keyboard}
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
        style={styles.scroll}
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === 'ios'
            ? 'interactive'
            : 'on-drag'
        }
        automaticallyAdjustKeyboardInsets={
          Platform.OS === 'ios'
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() =>
              router.back()
            }
            style={styles.iconButton}
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
              color="#6D5DFB"
            />
          </View>
        </View>

        <View style={styles.header}>
          <View
            style={[
              styles.logoBox,
              {
                backgroundColor:
                  configuracion.fondoIcono,
              },
            ]}
          >
            <Ionicons
              name={
                configuracion.icono
              }
              size={58}
              color={
                configuracion.color
              }
            />
          </View>

          <Text style={styles.title}>
            {configuracion.titulo}
          </Text>

          <Text style={styles.subtitle}>
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
            onChangeText={
              cambiarNombre
            }
            error={errores.nombre}
            autoCapitalize="words"
            maxLength={100}
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
            onChangeText={
              cambiarApellidoPaterno
            }
            error={
              errores.apellidoPaterno
            }
            autoCapitalize="words"
            maxLength={100}
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
            onChangeText={
              cambiarApellidoMaterno
            }
            error={
              errores.apellidoMaterno
            }
            autoCapitalize="words"
            maxLength={100}
          />

          <CampoRegistro
            label="Correo electrónico"
            icono="mail-outline"
            placeholder="correo@gmail.com"
            value={correo}
            onChangeText={
              cambiarCorreo
            }
            error={errores.correo}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={150}
          />

          <CampoRegistro
            label="Contraseña"
            icono="lock-closed-outline"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChangeText={
              cambiarPassword
            }
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
          />

          <CampoRegistro
            label="Confirmar contraseña"
            icono="lock-closed-outline"
            placeholder="Repite tu contraseña"
            value={
              confirmarPassword
            }
            onChangeText={
              cambiarConfirmacion
            }
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
          />

          <View style={styles.infoBox}>
            <Ionicons
              name="shield-checkmark"
              size={26}
              color="#2563EB"
            />

            <Text style={styles.infoText}>
              Usa al menos 8 caracteres
              con letras y números.
            </Text>
          </View>

          {errores.general ? (
            <Text
              style={
                styles.generalError
              }
              accessibilityRole="alert"
            >
              {errores.general}
            </Text>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.button,

              cargando
                ? styles.buttonDisabled
                : null,
            ]}
            onPress={crearCuenta}
            disabled={cargando}
            accessibilityRole="button"
            accessibilityLabel={`Crear cuenta de ${rol.toLowerCase()}`}
            accessibilityState={{
              disabled: cargando,
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
    justifyContent:
      'space-between',
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

  field: {
    marginBottom: 17,
  },

  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },

  inputBox: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
    backgroundColor: '#FFFFFF',
  },

  inputBoxError: {
    borderColor: '#DC2626',
    borderWidth: 1.5,
  },

  input: {
    flex: 1,
    minHeight: 52,
    marginLeft: 10,
    fontSize: 15,
    color: '#1F2937',
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
    marginTop: 6,
    lineHeight: 18,
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
    marginBottom: 18,
  },

  infoText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    flex: 1,
    lineHeight: 19,
  },

  generalError: {
    color: '#B91C1C',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },

  button: {
    height: 56,
    backgroundColor: '#4A7CFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});