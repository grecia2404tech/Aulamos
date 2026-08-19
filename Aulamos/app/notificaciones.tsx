import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import {
  type Href,
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
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
  API_URL,
} from '../services/api';


// =====================================================
// TIPOS
// =====================================================

type TipoNotificacion =
  | 'Sistema'
  | 'Actividad'
  | 'Recurso'
  | 'Evaluacion'
  | 'Chatbot'
  | 'Soporte'
  | 'Accesibilidad';


type Notificacion = {
  id_notificacion: number;

  titulo: string;

  mensaje: string;

  tipo:
    TipoNotificacion;

  entidad_tipo:
    string | null;

  entidad_id:
    number | null;

  leida:
    boolean | number;

  fecha_envio:
    string;
};


type ResumenNotificaciones = {
  total: number;

  no_leidas: number;
};


type RespuestaNotificaciones = {
  notificaciones?:
    Notificacion[];

  resumen?:
    ResumenNotificaciones;

  mensaje?:
    string;
};


// =====================================================
// RESUMEN VACÍO
// =====================================================

const RESUMEN_VACIO:
  ResumenNotificaciones = {

  total:
    0,

  no_leidas:
    0,
};


// =====================================================
// FECHAS
// =====================================================

const convertirFecha = (
  fecha:
    string,
) => {

  const valor =
    new Date(
      fecha.includes('T')
        ? fecha
        : fecha.replace(
            ' ',
            'T',
          ),
    );


  return Number.isNaN(
    valor.getTime(),
  )
    ? null
    : valor;
};


const formatearFecha = (
  fecha:
    string,
) => {

  const valor =
    convertirFecha(
      fecha,
    );


  if (
    !valor
  ) {
    return 'Fecha no disponible';
  }


  const ahora =
    new Date();


  const diferencia =
    ahora.getTime()
    -
    valor.getTime();


  const minutos =
    Math.floor(
      diferencia /
      60000,
    );


  const horas =
    Math.floor(
      minutos /
      60,
    );


  const dias =
    Math.floor(
      horas /
      24,
    );


  if (
    minutos >= 0
    &&
    minutos < 1
  ) {
    return 'Ahora';
  }


  if (
    minutos >= 1
    &&
    minutos < 60
  ) {

    return (
      `Hace ${minutos} ${
        minutos === 1
          ? 'minuto'
          : 'minutos'
      }`
    );
  }


  if (
    horas >= 1
    &&
    horas < 24
  ) {

    return (
      `Hace ${horas} ${
        horas === 1
          ? 'hora'
          : 'horas'
      }`
    );
  }


  if (
    dias === 1
  ) {
    return 'Ayer';
  }


  if (
    dias > 1
    &&
    dias < 7
  ) {

    return (
      `Hace ${dias} días`
    );
  }


  return valor.toLocaleDateString(
    'es-MX',
    {
      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric',
    },
  );
};


// =====================================================
// PRESENTACIÓN DE TIPO
// =====================================================

const obtenerPresentacionTipo = (
  tipo:
    TipoNotificacion,
) => {

  switch (
    tipo
  ) {

    case 'Actividad':

      return {
        icono:
          'clipboard-outline' as const,

        color:
          '#2563EB',

        fondo:
          '#EAF1FF',
      };


    case 'Recurso':

      return {
        icono:
          'book-outline' as const,

        color:
          '#7C3AED',

        fondo:
          '#F0E9FF',
      };


    case 'Evaluacion':

      return {
        icono:
          'document-text-outline' as const,

        color:
          '#C93649',

        fondo:
          '#FFE7EC',
      };


    case 'Chatbot':

      return {
        icono:
          'chatbubble-ellipses-outline' as const,

        color:
          '#0F766E',

        fondo:
          '#DDF8F4',
      };


    case 'Soporte':

      return {
        icono:
          'help-buoy-outline' as const,

        color:
          '#B56F00',

        fondo:
          '#FFF3D7',
      };


    case 'Accesibilidad':

      return {
        icono:
          'accessibility-outline' as const,

        color:
          '#6D28D9',

        fondo:
          '#F0E9FF',
      };


    default:

      return {
        icono:
          'notifications-outline' as const,

        color:
          '#475569',

        fondo:
          '#EEF2F7',
      };
  }
};


// =====================================================
// PANTALLA
// =====================================================

export default function NotificacionesScreen() {

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
  // ESTADOS
  // ===================================================

  const [
    notificaciones,
    setNotificaciones,
  ] =
    useState<Notificacion[]>(
      [],
    );


  const [
    resumen,
    setResumen,
  ] =
    useState<ResumenNotificaciones>(
      RESUMEN_VACIO,
    );


  const [
    cargando,
    setCargando,
  ] =
    useState(
      true,
    );


  const [
    actualizando,
    setActualizando,
  ] =
    useState(
      false,
    );


  // ===================================================
  // TEMA
  // ===================================================

  const temaOscuro =
    preferencias.modoOscuro
    ||
    preferencias.altoContraste;


  const colorPrincipal =
    preferencias.altoContraste

      ? colores.primario

      : temaOscuro
        ? '#60A5FA'
        : '#2563EB';


  // ===================================================
  // RESPONSIVE
  // ===================================================

  const margenHorizontal =
    width < 360
      ? 14
      : 20;


  const anchoContenido =
    Math.min(
      width -
      margenHorizontal *
      2,

      560,
    );


  // ===================================================
  // LECTOR
  // ===================================================

  const anunciar =
    useCallback(
      (
        mensaje:
          string,
      ) => {

        if (
          preferencias.lectorPantalla
        ) {

          leerTexto(
            mensaje,
          );
        }

      },
      [
        preferencias.lectorPantalla,
        leerTexto,
      ],
    );


  // ===================================================
  // CARGAR NOTIFICACIONES
  // ===================================================

  const cargarNotificaciones =
    useCallback(
      async (
        refrescando =
          false,
      ) => {

        try {

          if (
            refrescando
          ) {

            setActualizando(
              true,
            );

          } else {

            setCargando(
              true,
            );
          }


          const token =
            await AsyncStorage.getItem(
              'token',
            );


          if (
            !token
          ) {

            router.replace(
              '/' as Href,
            );

            return;
          }


          const respuesta =
            await fetch(
              `${API_URL}/notificaciones`,

              {
                method:
                  'GET',

                headers: {
                  Accept:
                    'application/json',

                  Authorization:
                    `Bearer ${token}`,
                },
              },
            );


          const texto =
            await respuesta.text();


          let datos:
            RespuestaNotificaciones = {};


          if (
            texto
          ) {

            try {

              datos =
                JSON.parse(
                  texto,
                );

            } catch {

              throw new Error(
                'El servidor devolvió una respuesta incorrecta.',
              );
            }
          }


          if (
            respuesta.status ===
              401
            ||
            respuesta.status ===
              403
          ) {

            await AsyncStorage.multiRemove([
              'token',
              'usuario',
            ]);


            Alert.alert(
              'Sesión vencida',
              'Inicia sesión nuevamente.',
            );


            router.replace(
              '/' as Href,
            );

            return;
          }


          if (
            !respuesta.ok
          ) {

            throw new Error(
              datos.mensaje
              ||
              'No se pudieron cargar las notificaciones.',
            );
          }


          const lista =
            Array.isArray(
              datos.notificaciones,
            )
              ? datos.notificaciones
              : [];


          setNotificaciones(
            lista,
          );


          setResumen(
            datos.resumen
            ??
            RESUMEN_VACIO,
          );


          anunciar(
            `Tienes ${datos.resumen?.no_leidas ?? 0} notificaciones sin leer.`,
          );

        } catch (
          error
        ) {

          console.error(
            'Error al consultar notificaciones:',
            error,
          );


          const mensaje =
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las notificaciones.';


          Alert.alert(
            'Notificaciones',
            mensaje,
          );

        } finally {

          setCargando(
            false,
          );


          setActualizando(
            false,
          );
        }
      },
      [
        anunciar,
      ],
    );


  // ===================================================
  // AL ENTRAR
  // ===================================================

  useFocusEffect(
    useCallback(
      () => {

        void cargarNotificaciones();


        return () => {

          detenerLectura();
        };

      },
      [
        cargarNotificaciones,
        detenerLectura,
      ],
    ),
  );


  // ===================================================
  // MARCAR UNA COMO LEÍDA
  // ===================================================

  const marcarComoLeida =
    async (
      notificacion:
        Notificacion,
    ) => {

      if (
        Boolean(
          notificacion.leida,
        )
      ) {
        return true;
      }


      try {

        const token =
          await AsyncStorage.getItem(
            'token',
          );


        if (
          !token
        ) {
          return false;
        }


        const respuesta =
          await fetch(
            `${API_URL}/notificaciones/${notificacion.id_notificacion}/leida`,

            {
              method:
                'PATCH',

              headers: {
                Accept:
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },
            },
          );


        if (
          !respuesta.ok
        ) {

          return false;
        }


        setNotificaciones(
          (
            actuales,
          ) =>
            actuales.map(
              (
                item,
              ) =>

                item.id_notificacion ===
                notificacion.id_notificacion

                  ? {
                      ...item,

                      leida:
                        true,
                    }

                  : item,
            ),
        );


        setResumen(
          (
            actual,
          ) => ({

            ...actual,

            no_leidas:
              Math.max(
                0,

                actual.no_leidas -
                1,
              ),
          }),
        );


        return true;

      } catch (
        error
      ) {

        console.error(
          'Error al marcar notificación:',
          error,
        );


        return false;
      }
    };


  // ===================================================
  // MARCAR TODAS
  // ===================================================

  const marcarTodas =
    async () => {

      if (
        resumen.no_leidas <=
        0
      ) {
        return;
      }


      try {

        const token =
          await AsyncStorage.getItem(
            'token',
          );


        if (
          !token
        ) {
          return;
        }


        const respuesta =
          await fetch(
            `${API_URL}/notificaciones/leer-todas`,

            {
              method:
                'PATCH',

              headers: {
                Accept:
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },
            },
          );


        if (
          !respuesta.ok
        ) {

          throw new Error(
            'No se pudieron marcar todas como leídas.',
          );
        }


        setNotificaciones(
          (
            actuales,
          ) =>
            actuales.map(
              (
                item,
              ) => ({

                ...item,

                leida:
                  true,
              }),
            ),
        );


        setResumen(
          (
            actual,
          ) => ({

            ...actual,

            no_leidas:
              0,
          }),
        );


        anunciar(
          'Todas las notificaciones fueron marcadas como leídas.',
        );

      } catch (
        error
      ) {

        console.error(
          error,
        );


        Alert.alert(
          'No se pudo actualizar',
          'Intenta nuevamente.',
        );
      }
    };


  // ===================================================
  // ELIMINAR
  // ===================================================

  const eliminar =
    (
      notificacion:
        Notificacion,
    ) => {

      Alert.alert(
        'Eliminar notificación',

        '¿Deseas eliminar esta notificación?',

        [
          {
            text:
              'Cancelar',

            style:
              'cancel',
          },

          {
            text:
              'Eliminar',

            style:
              'destructive',

            onPress:
              async () => {

                try {

                  const token =
                    await AsyncStorage.getItem(
                      'token',
                    );


                  if (
                    !token
                  ) {
                    return;
                  }


                  const respuesta =
                    await fetch(
                      `${API_URL}/notificaciones/${notificacion.id_notificacion}`,

                      {
                        method:
                          'DELETE',

                        headers: {
                          Accept:
                            'application/json',

                          Authorization:
                            `Bearer ${token}`,
                        },
                      },
                    );


                  if (
                    !respuesta.ok
                  ) {

                    throw new Error(
                      'No se pudo eliminar.',
                    );
                  }


                  setNotificaciones(
                    (
                      actuales,
                    ) =>
                      actuales.filter(
                        (
                          item,
                        ) =>
                          item.id_notificacion !==
                          notificacion.id_notificacion,
                      ),
                  );


                  setResumen(
                    (
                      actual,
                    ) => ({

                      total:
                        Math.max(
                          0,

                          actual.total -
                          1,
                        ),

                      no_leidas:
                        Boolean(
                          notificacion.leida,
                        )

                          ? actual.no_leidas

                          : Math.max(
                              0,

                              actual.no_leidas -
                              1,
                            ),
                    }),
                  );

                } catch (
                  error
                ) {

                  console.error(
                    error,
                  );


                  Alert.alert(
                    'Error',
                    'No se pudo eliminar la notificación.',
                  );
                }
              },
          },
        ],
      );
    };


  // ===================================================
  // NAVEGAR SEGÚN NOTIFICACIÓN
  // ===================================================

  const abrirNotificacion =
    async (
      notificacion:
        Notificacion,
    ) => {

      await marcarComoLeida(
        notificacion,
      );


      const idEntidad =
        Number(
          notificacion.entidad_id,
        );


      // ===============================================
      // ACTIVIDAD
      // ===============================================

      if (
        notificacion.tipo ===
          'Actividad'
        &&
        Number.isInteger(
          idEntidad,
        )
        &&
        idEntidad > 0
      ) {

        router.push({
          pathname:
            '/detalle-actividad',

          params: {
            id_actividad:
              String(
                idEntidad,
              ),
          },
        } as never);

        return;
      }


      // ===============================================
      // EVALUACIÓN
      // ===============================================

      if (
        notificacion.tipo ===
          'Evaluacion'
        &&
        Number.isInteger(
          idEntidad,
        )
        &&
        idEntidad > 0
      ) {

        router.push({
          pathname:
            '/responder-evaluacion',

          params: {
            id_evaluacion:
              String(
                idEntidad,
              ),
          },
        } as never);

        return;
      }


      // ===============================================
      // RECURSO
      // ===============================================

      if (
        notificacion.tipo ===
        'Recurso'
      ) {

        router.push(
          '/bibloteca-alumno' as Href,
        );

        return;
      }


      // ===============================================
      // CHATBOT
      // ===============================================

      if (
        notificacion.tipo ===
        'Chatbot'
      ) {

        router.push(
          '/chatbot' as Href,
        );

        return;
      }


      // ===============================================
      // ACCESIBILIDAD
      // ===============================================

      if (
        notificacion.tipo ===
        'Accesibilidad'
      ) {

        router.push(
          '/accesibilidad' as Href,
        );

        return;
      }


      // ===============================================
      // SISTEMA / SOPORTE
      // ===============================================

      Alert.alert(
        notificacion.titulo,
        notificacion.mensaje,
      );
    };


  // ===================================================
  // NO LEÍDAS
  // ===================================================

  const tieneNoLeidas =
    resumen.no_leidas >
    0;


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
            styles.headerButton,

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
              23
            }

            color={
              colores.texto
            }
          />

        </TouchableOpacity>


        <View
          style={
            styles.headerText
          }
        >

          <Text
            style={[
              styles.headerTitle,

              {
                color:
                  colores.texto,

                fontSize:
                  20 *
                  escalaTexto,
              },
            ]}

            accessibilityRole="header"
          >
            Notificaciones
          </Text>


          <Text
            style={[
              styles.headerSubtitle,

              {
                color:
                  colores.textoSecundario,

                fontSize:
                  10 *
                  escalaTexto,
              },
            ]}
          >
            Avisos y novedades de tu cuenta
          </Text>

        </View>


        <BotonAccesibilidad />

      </View>


      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,

          {
            width:
              anchoContenido,
          },
        ]}

        showsVerticalScrollIndicator={
          false
        }

        refreshControl={
          <RefreshControl
            refreshing={
              actualizando
            }

            onRefresh={
              () =>
                void cargarNotificaciones(
                  true,
                )
            }

            colors={[
              colorPrincipal,
            ]}

            tintColor={
              colorPrincipal
            }
          />
        }
      >

        {/* =================================================
            RESUMEN
        ================================================= */}

        <View
          style={[
            styles.summaryCard,

            {
              backgroundColor:
                temaOscuro
                  ? colores.fondoPrimario
                  : '#EEF4FF',

              borderColor:
                colores.borde,
            },
          ]}
        >

          <View
            style={[
              styles.summaryIcon,

              {
                backgroundColor:
                  colores.tarjeta,
              },
            ]}
          >

            <Ionicons
              name="notifications"

              size={
                28
              }

              color={
                colorPrincipal
              }
            />

          </View>


          <View
            style={
              styles.summaryInfo
            }
          >

            <Text
              style={[
                styles.summaryTitle,

                {
                  color:
                    colores.texto,

                  fontSize:
                    15 *
                    escalaTexto,
                },
              ]}
            >
              {
                tieneNoLeidas
                  ? `${resumen.no_leidas} sin leer`
                  : 'Estás al día'
              }
            </Text>


            <Text
              style={[
                styles.summarySubtitle,

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
                resumen.total
              }{' '}
              {
                resumen.total ===
                1
                  ? 'notificación'
                  : 'notificaciones'
              } en total
            </Text>

          </View>


          {tieneNoLeidas && (

            <TouchableOpacity
              style={[
                styles.readAllButton,

                {
                  backgroundColor:
                    colores.tarjeta,

                  borderColor:
                    colorPrincipal,
                },
              ]}

              onPress={
                () =>
                  void marcarTodas()
              }

              accessibilityRole="button"

              accessibilityLabel="Marcar todas las notificaciones como leídas"
            >

              <Ionicons
                name="checkmark-done-outline"

                size={
                  17
                }

                color={
                  colorPrincipal
                }
              />


              <Text
                style={[
                  styles.readAllText,

                  {
                    color:
                      colorPrincipal,

                    fontSize:
                      9 *
                      escalaTexto,
                  },
                ]}
              >
                Leer todas
              </Text>

            </TouchableOpacity>
          )}

        </View>


        {/* =================================================
            TÍTULO LISTA
        ================================================= */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={[
              styles.sectionTitle,

              {
                color:
                  colores.texto,

                fontSize:
                  15 *
                  escalaTexto,
              },
            ]}
          >
            Recientes
          </Text>


          {!cargando && (

            <Text
              style={[
                styles.sectionCount,

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
                notificaciones.length
              }
            </Text>
          )}

        </View>


        {/* =================================================
            CARGANDO
        ================================================= */}

        {cargando ? (

          <View
            style={
              styles.loading
            }
          >

            <ActivityIndicator
              size="large"

              color={
                colorPrincipal
              }
            />


            <Text
              style={[
                styles.loadingText,

                {
                  color:
                    colores.textoSecundario,

                  fontSize:
                    12 *
                    escalaTexto,
                },
              ]}
            >
              Cargando notificaciones...
            </Text>

          </View>

        ) : notificaciones.length ===
          0 ? (

          // =================================================
          // VACÍO
          // =================================================

          <View
            style={[
              styles.emptyCard,

              {
                backgroundColor:
                  colores.tarjeta,

                borderColor:
                  colores.borde,
              },
            ]}
          >

            <View
              style={[
                styles.emptyIcon,

                {
                  backgroundColor:
                    colores.fondoPrimario,
                },
              ]}
            >

              <Ionicons
                name="notifications-off-outline"

                size={
                  42
                }

                color={
                  colores.textoSecundario
                }
              />

            </View>


            <Text
              style={[
                styles.emptyTitle,

                {
                  color:
                    colores.texto,

                  fontSize:
                    16 *
                    escalaTexto,
                },
              ]}
            >
              No tienes notificaciones
            </Text>


            <Text
              style={[
                styles.emptyText,

                {
                  color:
                    colores.textoSecundario,

                  fontSize:
                    11 *
                    escalaTexto,
                },
              ]}
            >
              Cuando haya actividades, recursos,
              evaluaciones o avisos nuevos aparecerán aquí.
            </Text>

          </View>

        ) : (

          // =================================================
          // NOTIFICACIONES
          // =================================================

          <View
            style={
              styles.list
            }
          >

            {notificaciones.map(
              (
                notificacion,
              ) => {

                const presentacion =
                  obtenerPresentacionTipo(
                    notificacion.tipo,
                  );


                const leida =
                  Boolean(
                    notificacion.leida,
                  );


                return (
                  <TouchableOpacity
                    key={
                      notificacion.id_notificacion
                    }

                    style={[
                      styles.notificationCard,

                      {
                        backgroundColor:
                          leida
                            ? colores.tarjeta
                            : temaOscuro
                              ? colores.fondoPrimario
                              : '#F8FAFF',

                        borderColor:
                          leida
                            ? colores.borde
                            : colorPrincipal,
                      },
                    ]}

                    activeOpacity={
                      0.78
                    }

                    onPress={
                      () =>
                        void abrirNotificacion(
                          notificacion,
                        )
                    }

                    onLongPress={
                      () =>
                        eliminar(
                          notificacion,
                        )
                    }

                    accessibilityRole="button"

                    accessibilityLabel={
                      `${leida ? 'Leída' : 'Sin leer'}. ${notificacion.titulo}. ${notificacion.mensaje}`
                    }

                    accessibilityHint="Abre la notificación. Mantén presionado para eliminar."
                  >

                    {!leida && (

                      <View
                        style={[
                          styles.unreadIndicator,

                          {
                            backgroundColor:
                              colorPrincipal,
                          },
                        ]}
                      />
                    )}


                    <View
                      style={[
                        styles.notificationIcon,

                        {
                          backgroundColor:
                            temaOscuro
                              ? colores.tarjeta
                              : presentacion.fondo,
                        },
                      ]}
                    >

                      <Ionicons
                        name={
                          presentacion.icono
                        }

                        size={
                          24
                        }

                        color={
                          preferencias.altoContraste
                            ? colores.primario
                            : presentacion.color
                        }
                      />

                    </View>


                    <View
                      style={
                        styles.notificationContent
                      }
                    >

                      <View
                        style={
                          styles.notificationTop
                        }
                      >

                        <Text
                          style={[
                            styles.notificationTitle,

                            {
                              color:
                                colores.texto,

                              fontSize:
                                13 *
                                escalaTexto,
                            },
                          ]}

                          numberOfLines={
                            2
                          }
                        >
                          {
                            notificacion.titulo
                          }
                        </Text>


                        {!leida && (

                          <View
                            style={[
                              styles.newBadge,

                              {
                                backgroundColor:
                                  colorPrincipal,
                              },
                            ]}
                          >

                            <Text
                              style={
                                styles.newBadgeText
                              }
                            >
                              Nuevo
                            </Text>

                          </View>
                        )}

                      </View>


                      <Text
                        style={[
                          styles.notificationMessage,

                          {
                            color:
                              colores.textoSecundario,

                            fontSize:
                              10 *
                              escalaTexto,
                          },
                        ]}

                        numberOfLines={
                          3
                        }
                      >
                        {
                          notificacion.mensaje
                        }
                      </Text>


                      <View
                        style={
                          styles.notificationFooter
                        }
                      >

                        <View
                          style={[
                            styles.typeBadge,

                            {
                              backgroundColor:
                                temaOscuro
                                  ? colores.fondoPrimario
                                  : presentacion.fondo,
                            },
                          ]}
                        >

                          <Text
                            style={[
                              styles.typeText,

                              {
                                color:
                                  preferencias.altoContraste
                                    ? colores.texto
                                    : presentacion.color,

                                fontSize:
                                  8 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            {
                              notificacion.tipo ===
                              'Evaluacion'
                                ? 'Evaluación'
                                : notificacion.tipo
                            }
                          </Text>

                        </View>


                        <Text
                          style={[
                            styles.dateText,

                            {
                              color:
                                colores.textoSecundario,

                              fontSize:
                                8 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {
                            formatearFecha(
                              notificacion.fecha_envio,
                            )
                          }
                        </Text>

                      </View>

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
              },
            )}

          </View>
        )}

      </ScrollView>

    </SafeAreaView>
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


    // =================================================
    // HEADER
    // =================================================

    header: {
      minHeight:
        69,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        11,

      paddingVertical:
        7,

      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },


    headerButton: {
      width:
        44,

      height:
        44,

      borderRadius:
        14,

      borderWidth:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    headerText: {
      flex:
        1,

      marginHorizontal:
        10,
    },


    headerTitle: {
      fontWeight:
        '900',
    },


    headerSubtitle: {
      marginTop:
        3,
    },


    // =================================================
    // CONTENIDO
    // =================================================

    scrollContent: {
      alignSelf:
        'center',

      paddingTop:
        16,

      paddingBottom:
        35,
    },


    // =================================================
    // RESUMEN
    // =================================================

    summaryCard: {
      minHeight:
        91,

      borderWidth:
        1,

      borderRadius:
        19,

      padding:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    summaryIcon: {
      width:
        52,

      height:
        52,

      borderRadius:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    summaryInfo: {
      flex:
        1,

      marginLeft:
        11,
    },


    summaryTitle: {
      fontWeight:
        '900',
    },


    summarySubtitle: {
      marginTop:
        3,
    },


    readAllButton: {
      minHeight:
        36,

      borderWidth:
        1,

      borderRadius:
        11,

      paddingHorizontal:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      columnGap:
        4,
    },


    readAllText: {
      fontWeight:
        '900',
    },


    // =================================================
    // SECCIÓN
    // =================================================

    sectionHeader: {
      marginTop:
        22,

      marginBottom:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    sectionTitle: {
      fontWeight:
        '900',
    },


    sectionCount: {
      fontWeight:
        '700',
    },


    // =================================================
    // CARGA
    // =================================================

    loading: {
      minHeight:
        300,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    loadingText: {
      marginTop:
        12,
    },


    // =================================================
    // VACÍO
    // =================================================

    emptyCard: {
      minHeight:
        260,

      borderWidth:
        1,

      borderRadius:
        20,

      padding:
        25,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    emptyIcon: {
      width:
        78,

      height:
        78,

      borderRadius:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    emptyTitle: {
      marginTop:
        14,

      fontWeight:
        '900',
    },


    emptyText: {
      marginTop:
        7,

      textAlign:
        'center',

      lineHeight:
        18,
    },


    // =================================================
    // LISTA
    // =================================================

    list: {
      rowGap:
        10,
    },


    notificationCard: {
      minHeight:
        104,

      borderWidth:
        1,

      borderRadius:
        18,

      padding:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      position:
        'relative',
    },


    unreadIndicator: {
      position:
        'absolute',

      left:
        0,

      top:
        17,

      bottom:
        17,

      width:
        4,

      borderTopRightRadius:
        4,

      borderBottomRightRadius:
        4,
    },


    notificationIcon: {
      width:
        48,

      height:
        48,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginLeft:
        3,
    },


    notificationContent: {
      flex:
        1,

      minWidth:
        0,

      marginHorizontal:
        11,
    },


    notificationTop: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },


    notificationTitle: {
      flex:
        1,

      fontWeight:
        '900',
    },


    newBadge: {
      minHeight:
        20,

      marginLeft:
        7,

      borderRadius:
        7,

      paddingHorizontal:
        6,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    newBadgeText: {
      color:
        '#FFFFFF',

      fontSize:
        8,

      fontWeight:
        '900',
    },


    notificationMessage: {
      marginTop:
        4,

      lineHeight:
        15,
    },


    notificationFooter: {
      marginTop:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    typeBadge: {
      minHeight:
        23,

      borderRadius:
        8,

      paddingHorizontal:
        7,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    typeText: {
      fontWeight:
        '900',
    },


    dateText: {
      flex:
        1,

      marginLeft:
        8,

      textAlign:
        'right',

      fontWeight:
        '600',
    },
  });