import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';

import {
  useAccessibility,
} from '../contexts/AccessibilityContext';

import {
  actualizarFotoPerfil,
  actualizarPerfil,
  cambiarPassword,
  obtenerPerfil,
  PerfilUsuario,
} from '../services/perfilService';

import {
  API_URL,
} from '../services/api';


// =====================================================
// TIPOS
// =====================================================

type ModalActivo =
  | 'editar'
  | 'password'
  | null;


// =====================================================
// PANTALLA
// =====================================================

export default function PerfilScreen() {

  const {
    width,
  } =
    useWindowDimensions();


  const {
    colores,
    escalaTexto,
    preferencias,
    leerTexto,
    detenerLectura,
  } =
    useAccessibility();


  // ===================================================
  // PERFIL
  // ===================================================

  const [
    perfil,
    setPerfil,
  ] =
    useState<PerfilUsuario | null>(
      null
    );


  const [
    cargando,
    setCargando,
  ] =
    useState(
      true
    );


  const [
    guardando,
    setGuardando,
  ] =
    useState(
      false
    );


  const [
    subiendoFoto,
    setSubiendoFoto,
  ] =
    useState(
      false
    );


  // ===================================================
  // MODAL
  // ===================================================

  const [
    modalActivo,
    setModalActivo,
  ] =
    useState<ModalActivo>(
      null
    );


  // ===================================================
  // EDITAR PERFIL
  // ===================================================

  const [
    nombre,
    setNombre,
  ] =
    useState(
      ''
    );


  const [
    apellidoPaterno,
    setApellidoPaterno,
  ] =
    useState(
      ''
    );


  const [
    apellidoMaterno,
    setApellidoMaterno,
  ] =
    useState(
      ''
    );


  const [
    correo,
    setCorreo,
  ] =
    useState(
      ''
    );


  // ===================================================
  // PASSWORD
  // ===================================================

  const [
    passwordActual,
    setPasswordActual,
  ] =
    useState(
      ''
    );


  const [
    passwordNuevo,
    setPasswordNuevo,
  ] =
    useState(
      ''
    );


  const [
    passwordConfirmar,
    setPasswordConfirmar,
  ] =
    useState(
      ''
    );


  const [
    mostrarPasswordActual,
    setMostrarPasswordActual,
  ] =
    useState(
      false
    );


  const [
    mostrarPasswordNuevo,
    setMostrarPasswordNuevo,
  ] =
    useState(
      false
    );


  const [
    mostrarPasswordConfirmar,
    setMostrarPasswordConfirmar,
  ] =
    useState(
      false
    );


  // ===================================================
  // RESPONSIVE
  // ===================================================

  const pantallaPequena =
    width < 360;


  const textoGrande =
    escalaTexto > 1.2;


  const temaOscuro =
    preferencias.modoOscuro
    ||
    preferencias.altoContraste;


  const estiloStatusBar =
    temaOscuro
      ? 'light-content'
      : 'dark-content';


  // ===================================================
  // URL FOTO
  // ===================================================

  const fotoUrl =
    useMemo(
      () => {

        if (
          !perfil?.fotoPerfil
        ) {
          return null;
        }


        if (
          perfil.fotoPerfil.startsWith(
            'http://'
          )
          ||
          perfil.fotoPerfil.startsWith(
            'https://'
          )
        ) {

          return perfil.fotoPerfil;
        }


        const baseServidor =
          API_URL.replace(
            /\/api\/?$/,
            ''
          );


        return (
          `${baseServidor}${perfil.fotoPerfil}`
        );

      },
      [
        perfil?.fotoPerfil,
      ]
    );


  // ===================================================
  // INICIALES
  // ===================================================

  const iniciales =
    useMemo(
      () => {

        if (
          !perfil
        ) {
          return 'AU';
        }


        const primera =
          perfil.nombre?.charAt(0)
          || '';


        const segunda =
          perfil.apellidoPaterno
            ?.charAt(0)
          || '';


        return (
          `${primera}${segunda}`
            .toUpperCase()
        );

      },
      [
        perfil,
      ]
    );


  // ===================================================
  // COLOR SEGÚN ROL
  // ===================================================

  const iconoRol:
    keyof typeof Ionicons.glyphMap =
    useMemo(
      () => {

        const rol =
          perfil?.rol
            ?.toLowerCase()
          || '';


        if (
          rol === 'alumno'
          ||
          rol === 'estudiante'
        ) {

          return 'school-outline';
        }


        if (
          rol === 'docente'
        ) {

          return 'briefcase-outline';
        }


        if (
          rol === 'admin'
        ) {

          return 'shield-checkmark-outline';
        }


        if (
          rol === 'investigador'
        ) {

          return 'flask-outline';
        }


        return 'person-outline';

      },
      [
        perfil?.rol,
      ]
    );


  // ===================================================
  // LECTOR
  // ===================================================

  const anunciar =
    useCallback(
      (
        mensaje: string
      ) => {

        if (
          preferencias.lectorPantalla
        ) {

          leerTexto(
            mensaje
          );
        }

      },
      [
        preferencias.lectorPantalla,
        leerTexto,
      ]
    );


  // ===================================================
  // CARGAR PERFIL
  // ===================================================

  const cargarPerfil =
    useCallback(
      async () => {

        try {

          setCargando(
            true
          );


          const datos =
            await obtenerPerfil();


          setPerfil(
            datos
          );


          setNombre(
            datos.nombre
            || ''
          );


          setApellidoPaterno(
            datos.apellidoPaterno
            || ''
          );


          setApellidoMaterno(
            datos.apellidoMaterno
            || ''
          );


          setCorreo(
            datos.correo
            || ''
          );


          anunciar(
            `Mi perfil. Usuario ${datos.nombreCompleto}. Rol ${datos.rol}.`
          );

        } catch (
          error
        ) {

          console.error(
            'Error al cargar perfil:',
            error
          );


          const mensaje =
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el perfil.';


          Alert.alert(
            'Perfil',
            mensaje
          );

        } finally {

          setCargando(
            false
          );
        }

      },
      [
        anunciar,
      ]
    );


  // ===================================================
  // AL ENTRAR
  // ===================================================

  useFocusEffect(
    useCallback(
      () => {

        void cargarPerfil();


        return () => {

          detenerLectura();
        };

      },
      [
        cargarPerfil,
        detenerLectura,
      ]
    )
  );


  // ===================================================
  // FECHA
  // ===================================================

  const formatearFecha = (
    fecha:
      string | null
  ) => {

    if (
      !fecha
    ) {
      return 'No disponible';
    }


    const fechaNormalizada =
      fecha.replace(
        ' ',
        'T'
      );


    const objetoFecha =
      new Date(
        fechaNormalizada
      );


    if (
      Number.isNaN(
        objetoFecha.getTime()
      )
    ) {

      return fecha;
    }


    return objetoFecha.toLocaleString(
      'es-MX',
      {
        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit',
      }
    );
  };


  // ===================================================
  // ABRIR EDITAR
  // ===================================================

  const abrirEditarPerfil =
    () => {

      if (
        !perfil
      ) {
        return;
      }


      setNombre(
        perfil.nombre
        || ''
      );


      setApellidoPaterno(
        perfil.apellidoPaterno
        || ''
      );


      setApellidoMaterno(
        perfil.apellidoMaterno
        || ''
      );


      setCorreo(
        perfil.correo
        || ''
      );


      setModalActivo(
        'editar'
      );


      anunciar(
        'Editar perfil.'
      );
    };


  // ===================================================
  // GUARDAR PERFIL
  // ===================================================

  const guardarPerfil =
    async () => {

      if (
        !nombre.trim()
      ) {

        Alert.alert(
          'Campo obligatorio',
          'Ingresa tu nombre.'
        );

        return;
      }


      if (
        !apellidoPaterno.trim()
      ) {

        Alert.alert(
          'Campo obligatorio',
          'Ingresa tu apellido paterno.'
        );

        return;
      }


      if (
        !correo.trim()
      ) {

        Alert.alert(
          'Campo obligatorio',
          'Ingresa tu correo electrónico.'
        );

        return;
      }


      try {

        setGuardando(
          true
        );


        await actualizarPerfil({
          nombre:
            nombre.trim(),

          apellido_paterno:
            apellidoPaterno.trim(),

          apellido_materno:
            apellidoMaterno.trim(),

          correo:
            correo.trim(),
        });


        // =================================================
        // ACTUALIZAR USUARIO LOCAL
        // =================================================

        const usuarioTexto =
          await AsyncStorage.getItem(
            'usuario'
          );


        if (
          usuarioTexto
        ) {

          try {

            const usuario =
              JSON.parse(
                usuarioTexto
              );


            const actualizado = {
              ...usuario,

              nombre:
                nombre.trim(),

              apellido_paterno:
                apellidoPaterno.trim(),

              apellido_materno:
                apellidoMaterno.trim(),

              correo:
                correo
                  .trim()
                  .toLowerCase(),
            };


            await AsyncStorage.setItem(
              'usuario',
              JSON.stringify(
                actualizado
              )
            );

          } catch (
            error
          ) {

            console.warn(
              'No se pudo actualizar el usuario local:',
              error
            );
          }
        }


        await cargarPerfil();


        setModalActivo(
          null
        );


        anunciar(
          'Perfil actualizado correctamente.'
        );


        Alert.alert(
          'Perfil actualizado',
          'Tus datos fueron guardados correctamente.'
        );

      } catch (
        error
      ) {

        Alert.alert(
          'No se pudo actualizar',
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al actualizar el perfil.'
        );

      } finally {

        setGuardando(
          false
        );
      }
    };


  // ===================================================
  // CAMBIAR PASSWORD
  // ===================================================

  const guardarPassword =
    async () => {

      if (
        !passwordActual
        ||
        !passwordNuevo
        ||
        !passwordConfirmar
      ) {

        Alert.alert(
          'Campos incompletos',
          'Completa todos los campos de contraseña.'
        );

        return;
      }


      if (
        passwordNuevo.length < 8
      ) {

        Alert.alert(
          'Contraseña no válida',
          'La nueva contraseña debe tener al menos 8 caracteres.'
        );

        return;
      }


      if (
        passwordNuevo !==
        passwordConfirmar
      ) {

        Alert.alert(
          'Contraseñas diferentes',
          'La nueva contraseña y su confirmación no coinciden.'
        );

        return;
      }


      try {

        setGuardando(
          true
        );


        await cambiarPassword({
          password_actual:
            passwordActual,

          password_nuevo:
            passwordNuevo,

          password_confirmar:
            passwordConfirmar,
        });


        setPasswordActual(
          ''
        );

        setPasswordNuevo(
          ''
        );

        setPasswordConfirmar(
          ''
        );


        setModalActivo(
          null
        );


        anunciar(
          'Contraseña actualizada correctamente.'
        );


        Alert.alert(
          'Contraseña actualizada',
          'Tu contraseña se cambió correctamente.'
        );

      } catch (
        error
      ) {

        Alert.alert(
          'No se pudo cambiar la contraseña',
          error instanceof Error
            ? error.message
            : 'Ocurrió un error.'
        );

      } finally {

        setGuardando(
          false
        );
      }
    };


  // ===================================================
  // SELECCIONAR FOTO
  // ===================================================

  const seleccionarFoto =
    async () => {

      try {

        const permiso =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();


        if (
          !permiso.granted
        ) {

          Alert.alert(
            'Permiso necesario',
            'AULAMOS necesita permiso para acceder a tus imágenes.'
          );

          return;
        }


        const resultado =
          await ImagePicker
            .launchImageLibraryAsync({

              mediaTypes: [
                'images',
              ],

              allowsEditing:
                true,

              aspect:
                [
                  1,
                  1,
                ],

              quality:
                0.8,
            });


        if (
          resultado.canceled
          ||
          resultado.assets.length === 0
        ) {

          return;
        }


        const imagen =
          resultado.assets[0];


        if (
          imagen.fileSize
          &&
          imagen.fileSize >
            5 * 1024 * 1024
        ) {

          Alert.alert(
            'Imagen demasiado grande',
            'Selecciona una imagen de máximo 5 MB.'
          );

          return;
        }


        setSubiendoFoto(
          true
        );


        await actualizarFotoPerfil({
          uri:
            imagen.uri,

          nombre:
            imagen.fileName
            ||
            `foto_${Date.now()}.jpg`,

          tipo:
            imagen.mimeType
            ||
            'image/jpeg',
        });


        await cargarPerfil();


        anunciar(
          'Foto de perfil actualizada correctamente.'
        );


        Alert.alert(
          'Foto actualizada',
          'Tu foto de perfil se guardó correctamente.'
        );

      } catch (
        error
      ) {

        console.error(
          'Error al seleccionar foto:',
          error
        );


        Alert.alert(
          'No se pudo actualizar la foto',
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al subir la imagen.'
        );

      } finally {

        setSubiendoFoto(
          false
        );
      }
    };


  // ===================================================
  // CERRAR SESIÓN
  // ===================================================

  const cerrarSesion =
    () => {

      detenerLectura();


      Alert.alert(
        'Cerrar sesión',

        '¿Seguro que deseas cerrar tu sesión?',

        [
          {
            text:
              'Cancelar',

            style:
              'cancel',
          },

          {
            text:
              'Cerrar sesión',

            style:
              'destructive',

            onPress:
              async () => {

                try {

                  await AsyncStorage.multiRemove([
                    'token',
                    'usuario',
                  ]);


                  router.replace(
                    '/' as any
                  );

                } catch (
                  error
                ) {

                  console.error(
                    'Error al cerrar sesión:',
                    error
                  );


                  Alert.alert(
                    'Error',
                    'No se pudo cerrar la sesión.'
                  );
                }
              },
          },
        ]
      );
    };


  // ===================================================
  // CARGANDO
  // ===================================================

  if (
    cargando
  ) {

    return (
      <SafeAreaView
        style={[
          styles.safeArea,

          {
            backgroundColor:
              colores.fondo,
          },
        ]}
      >

        <StatusBar
          barStyle={
            estiloStatusBar
          }

          backgroundColor={
            colores.fondo
          }
        />


        <View
          style={
            styles.cargando
          }
        >

          <ActivityIndicator
            size="large"

            color={
              colores.primario
            }
          />


          <Text
            style={[
              styles.textoCargando,

              {
                color:
                  colores.texto,

                fontSize:
                  15 *
                  escalaTexto,
              },
            ]}
          >
            Cargando perfil...
          </Text>

        </View>

      </SafeAreaView>
    );
  }


  // ===================================================
  // SIN PERFIL
  // ===================================================

  if (
    !perfil
  ) {

    return (
      <SafeAreaView
        style={[
          styles.safeArea,

          {
            backgroundColor:
              colores.fondo,
          },
        ]}
      >

        <View
          style={
            styles.cargando
          }
        >

          <Ionicons
            name="alert-circle-outline"

            size={
              48
            }

            color={
              colores.peligro
            }
          />


          <Text
            style={[
              styles.textoCargando,

              {
                color:
                  colores.texto,

                fontSize:
                  15 *
                  escalaTexto,
              },
            ]}
          >
            No se pudo cargar el perfil.
          </Text>


          <TouchableOpacity
            style={[
              styles.botonPrincipal,

              {
                backgroundColor:
                  colores.primario,
              },
            ]}

            onPress={
              () =>
                void cargarPerfil()
            }

            accessibilityRole="button"

            accessibilityLabel="Reintentar cargar perfil"
          >

            <Text
              style={[
                styles.textoBotonPrincipal,

                {
                  color:
                    colores.textoSobrePrimario,
                },
              ]}
            >
              Reintentar
            </Text>

          </TouchableOpacity>

        </View>

      </SafeAreaView>
    );
  }


  // ===================================================
  // VISTA
  // ===================================================

  return (
    <SafeAreaView
      style={[
        styles.safeArea,

        {
          backgroundColor:
            colores.fondo,
        },
      ]}
    >

      <StatusBar
        barStyle={
          estiloStatusBar
        }

        backgroundColor={
          colores.fondo
        }
      />


      {/* =================================================
          HEADER
      ================================================= */}

      <View
        style={[
          styles.header,

          {
            backgroundColor:
              colores.fondo,

            borderBottomColor:
              colores.borde,
          },
        ]}
      >

        <TouchableOpacity
          style={[
            styles.botonHeader,

            {
              backgroundColor:
                colores.tarjeta,

              borderColor:
                colores.borde,
            },
          ]}

          onPress={
            () =>
              router.back()
          }

          accessibilityRole="button"

          accessibilityLabel="Regresar"
        >

          <Ionicons
            name="arrow-back"

            size={
              24
            }

            color={
              colores.texto
            }
          />

        </TouchableOpacity>


        <View
          style={
            styles.headerTexto
          }
        >

          <Text
            style={[
              styles.tituloHeader,

              {
                color:
                  colores.texto,

                fontSize:
                  21 *
                  escalaTexto,
              },
            ]}
          >
            Mi perfil
          </Text>


          <Text
            style={[
              styles.subtituloHeader,

              {
                color:
                  colores.textoSecundario,

                fontSize:
                  11 *
                  escalaTexto,
              },
            ]}
          >
            Administra tu información personal
          </Text>

        </View>


        <BotonAccesibilidad />

      </View>


      {/* =================================================
          CONTENIDO
      ================================================= */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }

        contentContainerStyle={[
          styles.contenido,

          {
            paddingHorizontal:
              pantallaPequena
                ? 14
                : 20,
          },
        ]}
      >

        {/* ===============================================
            TARJETA PRINCIPAL
        =============================================== */}

        <View
          style={[
            styles.tarjetaPrincipal,

            {
              backgroundColor:
                colores.fondoPrimario,

              borderColor:
                colores.borde,
            },

            textoGrande
            &&
            styles.tarjetaPrincipalGrande,
          ]}
        >

          {/* =============================================
              FOTO
          ============================================= */}

          <View
            style={
              styles.contenedorFoto
            }
          >

            <View
              style={[
                styles.fotoPerfil,

                {
                  backgroundColor:
                    colores.tarjeta,

                  borderColor:
                    colores.primario,
                },
              ]}
            >

              {fotoUrl ? (

                <Image
                  source={{
                    uri:
                      fotoUrl,
                  }}

                  style={
                    styles.imagenPerfil
                  }

                  resizeMode="cover"

                  accessibilityLabel="Foto de perfil"
                />

              ) : (

                <Text
                  style={[
                    styles.iniciales,

                    {
                      color:
                        colores.primario,

                      fontSize:
                        30 *
                        escalaTexto,
                    },
                  ]}
                >
                  {
                    iniciales
                  }
                </Text>
              )}

            </View>


            <TouchableOpacity
              style={[
                styles.botonCamara,

                {
                  backgroundColor:
                    colores.primario,

                  borderColor:
                    colores.tarjeta,
                },
              ]}

              onPress={
                () =>
                  void seleccionarFoto()
              }

              disabled={
                subiendoFoto
              }

              accessibilityRole="button"

              accessibilityLabel="Cambiar foto de perfil"
            >

              {subiendoFoto ? (

                <ActivityIndicator
                  size="small"

                  color={
                    colores.textoSobrePrimario
                  }
                />

              ) : (

                <Ionicons
                  name="camera"

                  size={
                    18
                  }

                  color={
                    colores.textoSobrePrimario
                  }
                />
              )}

            </TouchableOpacity>

          </View>


          {/* =============================================
              NOMBRE
          ============================================= */}

          <Text
            style={[
              styles.nombre,

              {
                color:
                  colores.texto,

                fontSize:
                  20 *
                  escalaTexto,

                lineHeight:
                  27 *
                  escalaTexto,
              },
            ]}

            numberOfLines={
              textoGrande
                ? undefined
                : 2
            }
          >
            {
              perfil.nombreCompleto
            }
          </Text>


          <Text
            style={[
              styles.correo,

              {
                color:
                  colores.textoSecundario,

                fontSize:
                  12 *
                  escalaTexto,
              },
            ]}
          >
            {
              perfil.correo
            }
          </Text>


          {/* =============================================
              ROL
          ============================================= */}

          <View
            style={[
              styles.badgeRol,

              {
                backgroundColor:
                  colores.tarjeta,

                borderColor:
                  colores.borde,
              },
            ]}
          >

            <Ionicons
              name={
                iconoRol
              }

              size={
                16
              }

              color={
                colores.primario
              }
            />


            <Text
              style={[
                styles.textoRol,

                {
                  color:
                    colores.primario,

                  fontSize:
                    10 *
                    escalaTexto,
                },
              ]}
            >
              {
                perfil.rol
              }
            </Text>

          </View>


          <TouchableOpacity
            style={[
              styles.botonCambiarFoto,

              {
                borderColor:
                  colores.borde,

                backgroundColor:
                  colores.tarjeta,
              },
            ]}

            onPress={
              () =>
                void seleccionarFoto()
            }

            disabled={
              subiendoFoto
            }
          >

            <Ionicons
              name="image-outline"

              size={
                18
              }

              color={
                colores.primario
              }
            />


            <Text
              style={[
                styles.textoCambiarFoto,

                {
                  color:
                    colores.primario,

                  fontSize:
                    11 *
                    escalaTexto,
                },
              ]}
            >
              {
                subiendoFoto
                  ? 'Subiendo...'
                  : 'Cambiar foto'
              }
            </Text>

          </TouchableOpacity>

        </View>


        {/* ===============================================
            INFORMACIÓN
        =============================================== */}

        <Text
          style={[
            styles.tituloSeccion,

            {
              color:
                colores.texto,

              fontSize:
                16 *
                escalaTexto,
            },
          ]}
        >
          Información de la cuenta
        </Text>


        <View
          style={[
            styles.tarjeta,

            {
              backgroundColor:
                colores.tarjeta,

              borderColor:
                colores.borde,
            },
          ]}
        >

          <FilaInformacion
            icono="person-outline"
            titulo="Nombre"
            valor={
              perfil.nombreCompleto
            }
            colores={
              colores
            }
            escalaTexto={
              escalaTexto
            }
          />


          <FilaInformacion
            icono="mail-outline"
            titulo="Correo electrónico"
            valor={
              perfil.correo
            }
            colores={
              colores
            }
            escalaTexto={
              escalaTexto
            }
          />


          <FilaInformacion
            icono={
              iconoRol
            }
            titulo="Rol"
            valor={
              perfil.rol
            }
            colores={
              colores
            }
            escalaTexto={
              escalaTexto
            }
          />


          <FilaInformacion
            icono="checkmark-circle-outline"
            titulo="Estado"
            valor={
              perfil.estado
            }
            colores={
              colores
            }
            escalaTexto={
              escalaTexto
            }
          />


          <FilaInformacion
            icono="calendar-outline"
            titulo="Fecha de registro"
            valor={
              formatearFecha(
                perfil.fechaRegistro
              )
            }
            colores={
              colores
            }
            escalaTexto={
              escalaTexto
            }
          />


          <FilaInformacion
            icono="time-outline"
            titulo="Último acceso"
            valor={
              formatearFecha(
                perfil.ultimoAcceso
              )
            }
            colores={
              colores
            }
            escalaTexto={
              escalaTexto
            }
            ultima
          />

        </View>


        {/* ===============================================
            CONFIGURACIÓN
        =============================================== */}

        <Text
          style={[
            styles.tituloSeccion,

            {
              color:
                colores.texto,

              fontSize:
                16 *
                escalaTexto,
            },
          ]}
        >
          Configuración
        </Text>


        <View
          style={[
            styles.tarjeta,

            {
              backgroundColor:
                colores.tarjeta,

              borderColor:
                colores.borde,
            },
          ]}
        >

          <OpcionAccion
            icono="create-outline"

            titulo="Editar perfil"

            descripcion="Cambia tu nombre, apellidos o correo"

            colores={
              colores
            }

            escalaTexto={
              escalaTexto
            }

            onPress={
              abrirEditarPerfil
            }
          />


          <OpcionAccion
            icono="lock-closed-outline"

            titulo="Cambiar contraseña"

            descripcion="Actualiza la contraseña de tu cuenta"

            colores={
              colores
            }

            escalaTexto={
              escalaTexto
            }

            onPress={
              () => {

                setModalActivo(
                  'password'
                );

                anunciar(
                  'Cambiar contraseña.'
                );
              }
            }
          />


          <OpcionAccion
            icono="accessibility-outline"

            titulo="Accesibilidad"

            descripcion="Configura contraste, texto, lector y otras herramientas"

            colores={
              colores
            }

            escalaTexto={
              escalaTexto
            }

            ultima

            onPress={
              () =>
                router.push(
                  '/accesibilidad' as any
                )
            }
          />

        </View>


        {/* ===============================================
            CERRAR SESIÓN
        =============================================== */}

        <TouchableOpacity
          style={[
            styles.botonCerrarSesion,

            {
              backgroundColor:
                `${colores.peligro}12`,

              borderColor:
                colores.peligro,
            },
          ]}

          onPress={
            cerrarSesion
          }

          accessibilityRole="button"

          accessibilityLabel="Cerrar sesión"
        >

          <Ionicons
            name="log-out-outline"

            size={
              21
            }

            color={
              colores.peligro
            }
          />


          <Text
            style={[
              styles.textoCerrarSesion,

              {
                color:
                  colores.peligro,

                fontSize:
                  14 *
                  escalaTexto,
              },
            ]}
          >
            Cerrar sesión
          </Text>

        </TouchableOpacity>

      </ScrollView>


      {/* =================================================
          MODAL EDITAR PERFIL
      ================================================= */}

      <Modal
        visible={
          modalActivo ===
          'editar'
        }

        transparent

        animationType="fade"

        onRequestClose={
          () =>
            setModalActivo(
              null
            )
        }
      >

        <View
          style={
            styles.modalOverlay
          }
        >

          <View
            style={[
              styles.modal,

              {
                backgroundColor:
                  colores.tarjeta,

                borderColor:
                  colores.borde,
              },
            ]}
          >

            <View
              style={
                styles.modalHeader
              }
            >

              <Text
                style={[
                  styles.modalTitulo,

                  {
                    color:
                      colores.texto,

                    fontSize:
                      18 *
                      escalaTexto,
                  },
                ]}
              >
                Editar perfil
              </Text>


              <TouchableOpacity
                onPress={
                  () =>
                    setModalActivo(
                      null
                    )
                }

                style={[
                  styles.botonCerrarModal,

                  {
                    backgroundColor:
                      colores.fondoPrimario,
                  },
                ]}
              >

                <Ionicons
                  name="close"

                  size={
                    23
                  }

                  color={
                    colores.texto
                  }
                />

              </TouchableOpacity>

            </View>


            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
            >

              <CampoPerfil
                titulo="Nombre"
                valor={
                  nombre
                }
                onChange={
                  setNombre
                }
                colores={
                  colores
                }
                escalaTexto={
                  escalaTexto
                }
              />


              <CampoPerfil
                titulo="Apellido paterno"
                valor={
                  apellidoPaterno
                }
                onChange={
                  setApellidoPaterno
                }
                colores={
                  colores
                }
                escalaTexto={
                  escalaTexto
                }
              />


              <CampoPerfil
                titulo="Apellido materno"
                valor={
                  apellidoMaterno
                }
                onChange={
                  setApellidoMaterno
                }
                colores={
                  colores
                }
                escalaTexto={
                  escalaTexto
                }
              />


              <CampoPerfil
                titulo="Correo electrónico"
                valor={
                  correo
                }
                onChange={
                  setCorreo
                }
                colores={
                  colores
                }
                escalaTexto={
                  escalaTexto
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />


              <View
                style={
                  styles.accionesModal
                }
              >

                <TouchableOpacity
                  style={[
                    styles.botonCancelar,

                    {
                      borderColor:
                        colores.borde,

                      backgroundColor:
                        colores.fondoPrimario,
                    },
                  ]}

                  onPress={
                    () =>
                      setModalActivo(
                        null
                      )
                  }
                >

                  <Text
                    style={{
                      color:
                        colores.texto,

                      fontWeight:
                        '700',
                    }}
                  >
                    Cancelar
                  </Text>

                </TouchableOpacity>


                <TouchableOpacity
                  style={[
                    styles.botonGuardar,

                    {
                      backgroundColor:
                        colores.primario,
                    },
                  ]}

                  onPress={
                    () =>
                      void guardarPerfil()
                  }

                  disabled={
                    guardando
                  }
                >

                  {guardando ? (

                    <ActivityIndicator
                      color={
                        colores.textoSobrePrimario
                      }
                    />

                  ) : (

                    <Text
                      style={[
                        styles.textoGuardar,

                        {
                          color:
                            colores.textoSobrePrimario,
                        },
                      ]}
                    >
                      Guardar
                    </Text>
                  )}

                </TouchableOpacity>

              </View>

            </ScrollView>

          </View>

        </View>

      </Modal>


      {/* =================================================
          MODAL CONTRASEÑA
      ================================================= */}

      <Modal
        visible={
          modalActivo ===
          'password'
        }

        transparent

        animationType="fade"

        onRequestClose={
          () =>
            setModalActivo(
              null
            )
        }
      >

        <View
          style={
            styles.modalOverlay
          }
        >

          <View
            style={[
              styles.modal,

              {
                backgroundColor:
                  colores.tarjeta,

                borderColor:
                  colores.borde,
              },
            ]}
          >

            <View
              style={
                styles.modalHeader
              }
            >

              <Text
                style={[
                  styles.modalTitulo,

                  {
                    color:
                      colores.texto,

                    fontSize:
                      18 *
                      escalaTexto,
                  },
                ]}
              >
                Cambiar contraseña
              </Text>


              <TouchableOpacity
                onPress={
                  () =>
                    setModalActivo(
                      null
                    )
                }

                style={[
                  styles.botonCerrarModal,

                  {
                    backgroundColor:
                      colores.fondoPrimario,
                  },
                ]}
              >

                <Ionicons
                  name="close"

                  size={
                    23
                  }

                  color={
                    colores.texto
                  }
                />

              </TouchableOpacity>

            </View>


            <CampoPassword
              titulo="Contraseña actual"

              valor={
                passwordActual
              }

              onChange={
                setPasswordActual
              }

              visible={
                mostrarPasswordActual
              }

              cambiarVisible={
                setMostrarPasswordActual
              }

              colores={
                colores
              }

              escalaTexto={
                escalaTexto
              }
            />


            <CampoPassword
              titulo="Nueva contraseña"

              valor={
                passwordNuevo
              }

              onChange={
                setPasswordNuevo
              }

              visible={
                mostrarPasswordNuevo
              }

              cambiarVisible={
                setMostrarPasswordNuevo
              }

              colores={
                colores
              }

              escalaTexto={
                escalaTexto
              }
            />


            <CampoPassword
              titulo="Confirmar nueva contraseña"

              valor={
                passwordConfirmar
              }

              onChange={
                setPasswordConfirmar
              }

              visible={
                mostrarPasswordConfirmar
              }

              cambiarVisible={
                setMostrarPasswordConfirmar
              }

              colores={
                colores
              }

              escalaTexto={
                escalaTexto
              }
            />


            <View
              style={
                styles.accionesModal
              }
            >

              <TouchableOpacity
                style={[
                  styles.botonCancelar,

                  {
                    borderColor:
                      colores.borde,

                    backgroundColor:
                      colores.fondoPrimario,
                  },
                ]}

                onPress={
                  () =>
                    setModalActivo(
                      null
                    )
                }
              >

                <Text
                  style={{
                    color:
                      colores.texto,

                    fontWeight:
                      '700',
                  }}
                >
                  Cancelar
                </Text>

              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  styles.botonGuardar,

                  {
                    backgroundColor:
                      colores.primario,
                  },
                ]}

                onPress={
                  () =>
                    void guardarPassword()
                }

                disabled={
                  guardando
                }
              >

                {guardando ? (

                  <ActivityIndicator
                    color={
                      colores.textoSobrePrimario
                    }
                  />

                ) : (

                  <Text
                    style={[
                      styles.textoGuardar,

                      {
                        color:
                          colores.textoSobrePrimario,
                      },
                    ]}
                  >
                    Actualizar
                  </Text>
                )}

              </TouchableOpacity>

            </View>

          </View>

        </View>

      </Modal>

    </SafeAreaView>
  );
}


// =====================================================
// FILA INFORMACIÓN
// =====================================================

type ColoresPerfil = {
  fondo: string;
  tarjeta: string;
  texto: string;
  textoSecundario: string;
  borde: string;
  primario: string;
  textoSobrePrimario: string;
  fondoPrimario: string;
  peligro: string;
};


type FilaInformacionProps = {
  icono:
    keyof typeof Ionicons.glyphMap;

  titulo:
    string;

  valor:
    string;

  colores:
    ColoresPerfil;

  escalaTexto:
    number;

  ultima?:
    boolean;
};


function FilaInformacion({
  icono,
  titulo,
  valor,
  colores,
  escalaTexto,
  ultima = false,
}: FilaInformacionProps) {

  return (
    <View
      style={[
        styles.filaInformacion,

        {
          borderBottomColor:
            colores.borde,

          borderBottomWidth:
            ultima
              ? 0
              : StyleSheet.hairlineWidth,
        },
      ]}
    >

      <View
        style={[
          styles.iconoInformacion,

          {
            backgroundColor:
              colores.fondoPrimario,
          },
        ]}
      >

        <Ionicons
          name={
            icono
          }

          size={
            20
          }

          color={
            colores.primario
          }
        />

      </View>


      <View
        style={
          styles.textosInformacion
        }
      >

        <Text
          style={[
            styles.labelInformacion,

            {
              color:
                colores.textoSecundario,

              fontSize:
                10 *
                escalaTexto,
            },
          ]}
        >
          {
            titulo
          }
        </Text>


        <Text
          style={[
            styles.valorInformacion,

            {
              color:
                colores.texto,

              fontSize:
                13 *
                escalaTexto,

              lineHeight:
                18 *
                escalaTexto,
            },
          ]}
        >
          {
            valor
          }
        </Text>

      </View>

    </View>
  );
}


// =====================================================
// OPCIÓN
// =====================================================

type OpcionAccionProps = {
  icono:
    keyof typeof Ionicons.glyphMap;

  titulo:
    string;

  descripcion:
    string;

  colores:
    ColoresPerfil;

  escalaTexto:
    number;

  onPress:
    () => void;

  ultima?:
    boolean;
};


function OpcionAccion({
  icono,
  titulo,
  descripcion,
  colores,
  escalaTexto,
  onPress,
  ultima = false,
}: OpcionAccionProps) {

  return (
    <TouchableOpacity
      style={[
        styles.opcion,

        {
          borderBottomColor:
            colores.borde,

          borderBottomWidth:
            ultima
              ? 0
              : StyleSheet.hairlineWidth,
        },
      ]}

      onPress={
        onPress
      }

      accessibilityRole="button"

      accessibilityLabel={
        titulo
      }

      accessibilityHint={
        descripcion
      }
    >

      <View
        style={[
          styles.iconoOpcion,

          {
            backgroundColor:
              colores.fondoPrimario,
          },
        ]}
      >

        <Ionicons
          name={
            icono
          }

          size={
            21
          }

          color={
            colores.primario
          }
        />

      </View>


      <View
        style={
          styles.infoOpcion
        }
      >

        <Text
          style={[
            styles.tituloOpcion,

            {
              color:
                colores.texto,

              fontSize:
                13 *
                escalaTexto,
            },
          ]}
        >
          {
            titulo
          }
        </Text>


        <Text
          style={[
            styles.descripcionOpcion,

            {
              color:
                colores.textoSecundario,

              fontSize:
                10 *
                escalaTexto,

              lineHeight:
                15 *
                escalaTexto,
            },
          ]}
        >
          {
            descripcion
          }
        </Text>

      </View>


      <Ionicons
        name="chevron-forward"

        size={
          20
        }

        color={
          colores.textoSecundario
        }
      />

    </TouchableOpacity>
  );
}


// =====================================================
// CAMPO PERFIL
// =====================================================

type CampoPerfilProps = {
  titulo:
    string;

  valor:
    string;

  onChange:
    (
      valor: string
    ) => void;

  colores:
    ColoresPerfil;

  escalaTexto:
    number;

  keyboardType?:
    'default'
    | 'email-address';

  autoCapitalize?:
    'none'
    | 'sentences'
    | 'words';
};


function CampoPerfil({
  titulo,
  valor,
  onChange,
  colores,
  escalaTexto,
  keyboardType = 'default',
  autoCapitalize = 'words',
}: CampoPerfilProps) {

  return (
    <View
      style={
        styles.formGroup
      }
    >

      <Text
        style={[
          styles.labelCampo,

          {
            color:
              colores.texto,

            fontSize:
              11 *
              escalaTexto,
          },
        ]}
      >
        {
          titulo
        }
      </Text>


      <TextInput
        value={
          valor
        }

        onChangeText={
          onChange
        }

        keyboardType={
          keyboardType
        }

        autoCapitalize={
          autoCapitalize
        }

        style={[
          styles.input,

          {
            backgroundColor:
              colores.fondo,

            borderColor:
              colores.borde,

            color:
              colores.texto,

            fontSize:
              13 *
              escalaTexto,
          },
        ]}

        placeholderTextColor={
          colores.textoSecundario
        }

        accessibilityLabel={
          titulo
        }
      />

    </View>
  );
}


// =====================================================
// CAMPO PASSWORD
// =====================================================

type CampoPasswordProps = {
  titulo:
    string;

  valor:
    string;

  onChange:
    (
      valor: string
    ) => void;

  visible:
    boolean;

  cambiarVisible:
    (
      visible: boolean
    ) => void;

  colores:
    ColoresPerfil;

  escalaTexto:
    number;
};


function CampoPassword({
  titulo,
  valor,
  onChange,
  visible,
  cambiarVisible,
  colores,
  escalaTexto,
}: CampoPasswordProps) {

  return (
    <View
      style={
        styles.formGroup
      }
    >

      <Text
        style={[
          styles.labelCampo,

          {
            color:
              colores.texto,

            fontSize:
              11 *
              escalaTexto,
          },
        ]}
      >
        {
          titulo
        }
      </Text>


      <View
        style={[
          styles.passwordContainer,

          {
            backgroundColor:
              colores.fondo,

            borderColor:
              colores.borde,
          },
        ]}
      >

        <TextInput
          value={
            valor
          }

          onChangeText={
            onChange
          }

          secureTextEntry={
            !visible
          }

          autoCapitalize="none"

          style={[
            styles.passwordInput,

            {
              color:
                colores.texto,

              fontSize:
                13 *
                escalaTexto,
            },
          ]}

          accessibilityLabel={
            titulo
          }
        />


        <TouchableOpacity
          onPress={
            () =>
              cambiarVisible(
                !visible
              )
          }

          accessibilityRole="button"

          accessibilityLabel={
            visible
              ? 'Ocultar contraseña'
              : 'Mostrar contraseña'
          }
        >

          <Ionicons
            name={
              visible
                ? 'eye-off-outline'
                : 'eye-outline'
            }

            size={
              21
            }

            color={
              colores.textoSecundario
            }
          />

        </TouchableOpacity>

      </View>

    </View>
  );
}


// =====================================================
// ESTILOS
// =====================================================

const styles =
  StyleSheet.create({

    safeArea: {
      flex:
        1,
    },


    header: {
      minHeight:
        68,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        12,

      paddingVertical:
        7,

      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },


    botonHeader: {
      width:
        44,

      height:
        44,

      borderWidth:
        1,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    headerTexto: {
      flex:
        1,

      marginHorizontal:
        11,
    },


    tituloHeader: {
      fontWeight:
        '900',
    },


    subtituloHeader: {
      marginTop:
        2,
    },


    contenido: {
      paddingTop:
        18,

      paddingBottom:
        40,
    },


    cargando: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        30,
    },


    textoCargando: {
      marginTop:
        15,

      textAlign:
        'center',

      fontWeight:
        '600',
    },


    botonPrincipal: {
      minHeight:
        46,

      borderRadius:
        13,

      paddingHorizontal:
        24,

      marginTop:
        20,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    textoBotonPrincipal: {
      fontWeight:
        '800',
    },


    tarjetaPrincipal: {
      borderWidth:
        1,

      borderRadius:
        24,

      padding:
        20,

      alignItems:
        'center',
    },


    tarjetaPrincipalGrande: {
      paddingVertical:
        25,
    },


    contenedorFoto: {
      position:
        'relative',
    },


    fotoPerfil: {
      width:
        104,

      height:
        104,

      borderRadius:
        52,

      borderWidth:
        3,

      overflow:
        'hidden',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    imagenPerfil: {
      width:
        '100%',

      height:
        '100%',
    },


    iniciales: {
      fontWeight:
        '900',
    },


    botonCamara: {
      position:
        'absolute',

      width:
        36,

      height:
        36,

      borderRadius:
        18,

      right:
        -2,

      bottom:
        1,

      borderWidth:
        3,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    nombre: {
      marginTop:
        15,

      textAlign:
        'center',

      fontWeight:
        '900',
    },


    correo: {
      marginTop:
        5,

      textAlign:
        'center',
    },


    badgeRol: {
      minHeight:
        30,

      borderRadius:
        10,

      borderWidth:
        1,

      paddingHorizontal:
        10,

      marginTop:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      columnGap:
        6,
    },


    textoRol: {
      fontWeight:
        '800',
    },


    botonCambiarFoto: {
      minHeight:
        40,

      borderRadius:
        12,

      borderWidth:
        1,

      paddingHorizontal:
        14,

      marginTop:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      columnGap:
        7,
    },


    textoCambiarFoto: {
      fontWeight:
        '800',
    },


    tituloSeccion: {
      marginTop:
        24,

      marginBottom:
        10,

      fontWeight:
        '900',
    },


    tarjeta: {
      borderWidth:
        1,

      borderRadius:
        20,

      overflow:
        'hidden',

      ...Platform.select({

        android: {
          elevation:
            1,
        },
      }),
    },


    filaInformacion: {
      minHeight:
        72,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        14,

      paddingVertical:
        11,
    },


    iconoInformacion: {
      width:
        42,

      height:
        42,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    textosInformacion: {
      flex:
        1,

      marginLeft:
        12,
    },


    labelInformacion: {
      fontWeight:
        '600',
    },


    valorInformacion: {
      marginTop:
        3,

      fontWeight:
        '700',
    },


    opcion: {
      minHeight:
        76,

      paddingHorizontal:
        14,

      paddingVertical:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    iconoOpcion: {
      width:
        45,

      height:
        45,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    infoOpcion: {
      flex:
        1,

      marginHorizontal:
        12,
    },


    tituloOpcion: {
      fontWeight:
        '800',
    },


    descripcionOpcion: {
      marginTop:
        4,
    },


    botonCerrarSesion: {
      minHeight:
        52,

      borderWidth:
        1,

      borderRadius:
        15,

      marginTop:
        24,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      columnGap:
        9,
    },


    textoCerrarSesion: {
      fontWeight:
        '900',
    },


    modalOverlay: {
      flex:
        1,

      backgroundColor:
        'rgba(0,0,0,0.55)',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        18,
    },


    modal: {
      width:
        '100%',

      maxWidth:
        520,

      maxHeight:
        '88%',

      borderRadius:
        22,

      borderWidth:
        1,

      padding:
        18,
    },


    modalHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        16,
    },


    modalTitulo: {
      flex:
        1,

      fontWeight:
        '900',
    },


    botonCerrarModal: {
      width:
        40,

      height:
        40,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    formGroup: {
      marginBottom:
        14,
    },


    labelCampo: {
      marginBottom:
        7,

      fontWeight:
        '700',
    },


    input: {
      minHeight:
        48,

      borderWidth:
        1,

      borderRadius:
        12,

      paddingHorizontal:
        13,

      paddingVertical:
        10,
    },


    passwordContainer: {
      minHeight:
        48,

      borderWidth:
        1,

      borderRadius:
        12,

      paddingHorizontal:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    passwordInput: {
      flex:
        1,

      paddingVertical:
        10,
    },


    accionesModal: {
      flexDirection:
        'row',

      columnGap:
        10,

      marginTop:
        10,
    },


    botonCancelar: {
      flex:
        1,

      minHeight:
        47,

      borderRadius:
        12,

      borderWidth:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    botonGuardar: {
      flex:
        1,

      minHeight:
        47,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    textoGuardar: {
      fontWeight:
        '900',
    },
  });