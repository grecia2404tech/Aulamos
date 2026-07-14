import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type InicioDocenteResponse = {
  docente: {
    id_usuario: number;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string;
  };

  resumen: {
    clases_activas: number;
    actividades_pendientes: number;
    evaluaciones: number;
    estudiantes: number;
  };

  actividad_reciente: {
    id: number;
    titulo: string;
    materia: string;
    tipo: string;
    fecha_publicacion: string;
    origen: string;
  } | null;
};

type IoniconName =
  keyof typeof Ionicons.glyphMap;

export default function InicioDocenteScreen() {
  const { width } =
    useWindowDimensions();

  const insets =
    useSafeAreaInsets();

  const [datos, setDatos] =
    useState<InicioDocenteResponse | null>(
      null
    );

  const [cargando, setCargando] =
    useState(true);

  const [
    actualizando,
    setActualizando,
  ] = useState(false);

  const {
    colores,
    escalaTexto,
    preferencias,
    leerTexto,
    detenerLectura,
  } = useAccessibility();

  const altoContraste =
    preferencias.altoContraste;

  const temaOscuro =
    preferencias.modoOscuro ||
    altoContraste;

  const contenidoGrande =
    escalaTexto > 1.2;

  /*
   * En tamaño normal se muestran dos
   * tarjetas por fila.
   *
   * Con texto grande o en pantallas muy
   * estrechas se muestra una por fila.
   */
  const unaTarjetaPorFila =
    contenidoGrande || width < 340;

  const margenHorizontal =
    width < 350
      ? 14
      : width < 400
        ? 18
        : 22;

  const anchoContenido = Math.min(
    width - margenHorizontal * 2,
    520
  );

  const separacionTarjetas =
    width < 360 ? 8 : 10;

  const anchoTarjetaResumen =
    unaTarjetaPorFila
      ? anchoContenido - 28
      : (
          anchoContenido -
          28 -
          separacionTarjetas
        ) / 2;

  const anchoBotonRapido =
    unaTarjetaPorFila
      ? anchoContenido
      : (
          anchoContenido -
          separacionTarjetas
        ) / 2;

  const altoBarraInferior =
    contenidoGrande ? 94 : 66;

  const colorPrincipal =
    altoContraste
      ? colores.primario
      : temaOscuro
        ? '#60A5FA'
        : '#2563EB';

  const colorVerde =
    altoContraste
      ? colores.exito
      : temaOscuro
        ? '#4ADE80'
        : '#16A34A';

  const fondoInformacion =
    temaOscuro
      ? colores.fondoPrimario
      : '#FAF7FF';

  const textoBotonContraste =
    altoContraste
      ? '#000000'
      : '#FFFFFF';

  const responsive = useMemo(
    () => ({
      contenido: {
        width: anchoContenido,
      } as ViewStyle,

      tarjetaResumen: {
        width: anchoTarjetaResumen,
      } as ViewStyle,

      botonRapido: {
        width: anchoBotonRapido,
      } as ViewStyle,

      contenedorSeguro: {
        paddingTop: insets.top,
      } as ViewStyle,

      contenidoScroll: {
        paddingBottom:
          altoBarraInferior +
          35 +
          Math.max(
            insets.bottom,
            8
          ),
      } as ViewStyle,

      barraInferior: {
        height:
          altoBarraInferior +
          Math.max(
            insets.bottom,
            5
          ),

        paddingBottom:
          Math.max(
            insets.bottom,
            5
          ),
      } as ViewStyle,
    }),
    [
      anchoBotonRapido,
      anchoContenido,
      anchoTarjetaResumen,
      altoBarraInferior,
      insets.bottom,
      insets.top,
    ]
  );

  const cargarDatos = useCallback(
    async (
      mostrarCarga = true
    ) => {
      try {
        if (mostrarCarga) {
          setCargando(true);
        }

        const token =
          await AsyncStorage.getItem(
            'token'
          );

        if (!token) {
          Alert.alert(
            'Sesión no encontrada',
            'Inicia sesión nuevamente.'
          );

          router.replace('/' as any);
          return;
        }

        const respuesta = await fetch(
          `${API_URL}/docente/inicio`,
          {
            method: 'GET',
            headers: {
              Accept:
                'application/json',
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        const texto =
          await respuesta.text();

        let resultado: {
          mensaje?: string;
          docente?: InicioDocenteResponse['docente'];
          resumen?: InicioDocenteResponse['resumen'];
          actividad_reciente?:
            InicioDocenteResponse['actividad_reciente'];
        } = {};

        if (texto) {
          try {
            resultado =
              JSON.parse(texto);
          } catch {
            resultado = {
              mensaje:
                'El servidor envió una respuesta incorrecta',
            };
          }
        }

        if (
          respuesta.status === 401 ||
          respuesta.status === 403
        ) {
          await AsyncStorage.multiRemove(
            ['token', 'usuario']
          );

          Alert.alert(
            respuesta.status === 403
              ? 'Acceso no permitido'
              : 'Sesión vencida',

            respuesta.status === 403
              ? 'Tu usuario no tiene permiso para acceder al panel docente.'
              : 'Inicia sesión nuevamente.'
          );

          router.replace('/' as any);
          return;
        }

        if (!respuesta.ok) {
          Alert.alert(
            'No se pudo cargar la información',
            resultado.mensaje ||
              'Intenta nuevamente.'
          );

          return;
        }

        if (
          !resultado.docente ||
          !resultado.resumen
        ) {
          Alert.alert(
            'Respuesta incorrecta',
            'La API no devolvió los datos del docente.'
          );

          return;
        }

        setDatos({
          docente:
            resultado.docente,

          resumen:
            resultado.resumen,

          actividad_reciente:
            resultado.actividad_reciente ??
            null,
        });
      } catch (error) {
        console.error(
          'Error al cargar inicio docente:',
          error
        );

        Alert.alert(
          'Error de conexión',
          'No se pudo conectar con la API. Verifica el servidor, la IP y la red Wi-Fi.'
        );
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    []
  );

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useFocusEffect(
    useCallback(() => {
      if (
        preferencias.lectorPantalla &&
        datos
      ) {
        leerTexto(
          `Hola profesor o profesora ${datos.docente.nombre}. Tienes ${datos.resumen.clases_activas} clases activas, ${datos.resumen.actividades_pendientes} actividades pendientes, ${datos.resumen.evaluaciones} evaluaciones publicadas y ${datos.resumen.estudiantes} estudiantes inscritos.`
        );
      }

      return () => {
        detenerLectura();
      };
    }, [
      preferencias.lectorPantalla,
      datos,
      leerTexto,
      detenerLectura,
    ])
  );

  const refrescar = () => {
    setActualizando(true);
    cargarDatos(false);
  };

  const navegar = (
    ruta: string,
    nombrePantalla: string
  ) => {
    try {
      router.push(ruta as any);
    } catch {
      Alert.alert(
        nombrePantalla,
        `Todavía debes crear la pantalla ${ruta}.`
      );
    }
  };

  const capitalizar = (
    texto: string
  ) => {
    return (
      texto.charAt(0).toUpperCase() +
      texto.slice(1)
    );
  };

  const formatearFechaActual =
    () => {
      const texto =
        new Date().toLocaleDateString(
          'es-MX',
          {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }
        );

      return capitalizar(texto);
    };

  const formatearFechaPublicacion = (
    fechaTexto: string
  ) => {
    const fecha =
      new Date(fechaTexto);

    const hoy = new Date();

    const esHoy =
      fecha.getDate() ===
        hoy.getDate() &&
      fecha.getMonth() ===
        hoy.getMonth() &&
      fecha.getFullYear() ===
        hoy.getFullYear();

    if (esHoy) {
      return 'Publicado hoy';
    }

    const fechaFormateada =
      fecha.toLocaleDateString(
        'es-MX',
        {
          day: 'numeric',
          month: 'long',
        }
      );

    return `Publicado el ${fechaFormateada}`;
  };

  const nombreUsuario =
    datos?.docente.nombre ||
    'Usuario';

  const estiloStatusBar =
    temaOscuro
      ? 'light-content'
      : 'dark-content';

  if (cargando) {
    return (
      <View
        style={[
          styles.loadingScreen,
          responsive.contenedorSeguro,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
      >
        <StatusBar
          barStyle={estiloStatusBar}
          backgroundColor={
            colores.fondo
          }
        />

        <View
          style={[
            styles.loadingLogo,
            {
              backgroundColor:
                colores.fondoPrimario,
              borderColor:
                colores.borde,
            },
          ]}
        >
          <Ionicons
            name="school"
            size={34}
            color={colorPrincipal}
          />
        </View>

        <ActivityIndicator
          size="large"
          color={colorPrincipal}
        />

        <Text
          style={[
            styles.loadingTitle,
            {
              color: colores.texto,
              fontSize:
                21 * escalaTexto,
            },
          ]}
        >
          Aulamos
        </Text>

        <Text
          style={[
            styles.loadingText,
            {
              color:
                colores.textoSecundario,
              fontSize:
                14 * escalaTexto,
              lineHeight:
                20 * escalaTexto,
            },
          ]}
        >
          Preparando tu espacio
          docente...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor:
            colores.fondo,
        },
      ]}
    >
      <StatusBar
        barStyle={estiloStatusBar}
        backgroundColor={
          colores.fondo
        }
      />

      <View
        style={[
          styles.safeContainer,
          responsive.contenedorSeguro,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={[
            styles.scrollContent,
            responsive.contenidoScroll,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={actualizando}
              onRefresh={refrescar}
              colors={[colorPrincipal]}
              tintColor={colorPrincipal}
              progressBackgroundColor={
                colores.tarjeta
              }
            />
          }
        >
          <View
            style={[
              styles.contentContainer,
              responsive.contenido,
            ]}
          >
            <View style={styles.header}>
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
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Regresar"
              >
                <Ionicons
                  name="arrow-back"
                  size={23}
                  color={colores.texto}
                />
              </TouchableOpacity>

              <Text
                style={[
                  styles.logoText,
                  {
                    color:
                      colorPrincipal,
                    fontSize:
                      Math.min(
                        26 *
                          escalaTexto,
                        36
                      ),
                  },
                ]}
              >
                Aulamos
              </Text>

              <View
                style={
                  styles.headerActions
                }
              >
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
                  activeOpacity={0.7}
                  onPress={() =>
                    Alert.alert(
                      'Notificaciones',
                      'No tienes notificaciones nuevas.'
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Notificaciones"
                >
                  <Ionicons
                    name="notifications"
                    size={22}
                    color={colores.texto}
                  />

                  <View
                    style={[
                      styles.notificationDot,
                      {
                        borderColor:
                          colores.tarjeta,
                      },
                    ]}
                  />
                </TouchableOpacity>

                <BotonAccesibilidad
                  style={
                    styles.accessibilityButton
                  }
                />
              </View>
            </View>

            <View
              style={
                styles.welcomeContainer
              }
            >
              <Text
                style={[
                  styles.welcomeTitle,
                  {
                    color: colores.texto,
                    fontSize:
                      19 *
                      escalaTexto,
                    lineHeight:
                      25 *
                      escalaTexto,
                  },
                ]}
                accessibilityRole="header"
              >
                ¡Hola, Profesor@{' '}
                {nombreUsuario}! 👋
              </Text>

              <Text
                style={[
                  styles.welcomeSubtitle,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      13 *
                      escalaTexto,
                    lineHeight:
                      19 *
                      escalaTexto,
                  },
                ]}
              >
                Bienvenid@ a tu espacio
                docente
              </Text>
            </View>

            <View
              style={[
                styles.summarySection,
                {
                  backgroundColor:
                    fondoInformacion,
                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <View
                style={[
                  styles.summaryHeader,
                  contenidoGrande &&
                    styles.summaryHeaderColumn,
                ]}
              >
                <View
                  style={
                    styles.summaryHeaderText
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
                    accessibilityRole="header"
                  >
                    Resumen del día
                  </Text>

                  <Text
                    style={[
                      styles.summaryDescription,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          10 *
                          escalaTexto,
                        lineHeight:
                          14 *
                          escalaTexto,
                      },
                    ]}
                  >
                    Información general de
                    tus clases
                  </Text>
                </View>

                <View
                  style={[
                    styles.dateBadge,
                    {
                      backgroundColor:
                        colores.fondoPrimario,
                    },
                    contenidoGrande &&
                      styles.dateBadgeLarge,
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={
                      colores.primario
                    }
                  />

                  <Text
                    style={[
                      styles.summaryDate,
                      {
                        color:
                          colores.primario,
                        fontSize:
                          9 *
                          escalaTexto,
                        lineHeight:
                          12 *
                          escalaTexto,
                      },
                    ]}
                  >
                    {formatearFechaActual()}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.summaryGrid,
                  {
                    columnGap:
                      separacionTarjetas,
                    rowGap:
                      separacionTarjetas,
                  },
                ]}
              >
                <SummaryCard
                  style={
                    responsive.tarjetaResumen
                  }
                  title="Clases"
                  value={
                    datos?.resumen
                      .clases_activas ?? 0
                  }
                  subtitle="Activas"
                  icon="document-text"
                  iconColor="#7C3AED"
                  iconBackground="#EFE8FF"
                />

                <SummaryCard
                  style={
                    responsive.tarjetaResumen
                  }
                  title="Actividades"
                  value={
                    datos?.resumen
                      .actividades_pendientes ??
                    0
                  }
                  subtitle="Pendientes"
                  icon="clipboard"
                  iconColor="#2563EB"
                  iconBackground="#E6F0FF"
                />

                <SummaryCard
                  style={
                    responsive.tarjetaResumen
                  }
                  title="Evaluaciones"
                  value={
                    datos?.resumen
                      .evaluaciones ?? 0
                  }
                  subtitle="Publicadas"
                  icon="documents"
                  iconColor="#E11D48"
                  iconBackground="#FFE7EC"
                />

                <SummaryCard
                  style={
                    responsive.tarjetaResumen
                  }
                  title="Estudiantes"
                  value={
                    datos?.resumen
                      .estudiantes ?? 0
                  }
                  subtitle="Inscritos"
                  icon="people"
                  iconColor="#16A34A"
                  iconBackground="#E2F8E9"
                />
              </View>
            </View>

            <View
              style={
                styles.sectionHeader
              }
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colores.texto,
                    fontSize:
                      15 *
                      escalaTexto,
                  },
                ]}
                accessibilityRole="header"
              >
                Accesos rápidos
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      11 *
                      escalaTexto,
                  },
                ]}
              >
                Administra tus cursos
              </Text>
            </View>

            <View
              style={[
                styles.quickActions,
                {
                  columnGap:
                    separacionTarjetas,
                  rowGap:
                    separacionTarjetas,
                },
              ]}
            >
              <QuickAction
                style={
                  responsive.botonRapido
                }
                text="Crear recurso"
                subtitle="Video, PDF o enlace"
                icon="add-circle-outline"
                backgroundColor="#6D28D9"
                onPress={() =>
                  navegar(
                    '/crear-recurso',
                    'Crear recurso'
                  )
                }
              />

              <QuickAction
                style={
                  responsive.botonRapido
                }
                text="Crear actividad"
                subtitle="Tarea o ejercicio"
                icon="add-circle-outline"
                backgroundColor="#0F766E"
                onPress={() =>
                  navegar(
                    '/crear-actividad',
                    'Crear actividad'
                  )
                }
              />

              <QuickAction
                style={
                  responsive.botonRapido
                }
                text="Crear evaluación"
                subtitle="Examen o cuestionario"
                icon="add-circle-outline"
                backgroundColor="#A16207"
                onPress={() =>
                  navegar(
                    '/crear-evaluacion',
                    'Crear evaluación'
                  )
                }
              />

              <QuickAction
                style={
                  responsive.botonRapido
                }
                text="Ver estudiantes"
                subtitle="Consulta avances"
                icon="people-outline"
                backgroundColor="#2563EB"
                onPress={() =>
                  navegar(
                    '/ver-estudiantes',
                    'Ver estudiantes'
                  )
                }
              />

              <QuickAction
                style={
                  responsive.botonRapido
                }
                text="Reportes"
                subtitle="Resultados generales"
                icon="bar-chart-outline"
                backgroundColor="#9F3A38"
                onPress={() =>
                  navegar(
                    '/reportes-docente',
                    'Reportes'
                  )
                }
              />
            </View>

            <View
              style={
                styles.sectionHeader
              }
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colores.texto,
                    fontSize:
                      15 *
                      escalaTexto,
                  },
                ]}
                accessibilityRole="header"
              >
                Actividad reciente
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      11 *
                      escalaTexto,
                  },
                ]}
              >
                Último contenido publicado
              </Text>
            </View>

            {datos?.actividad_reciente ? (
              <TouchableOpacity
                style={[
                  styles.recentCard,
                  {
                    backgroundColor:
                      temaOscuro
                        ? colores.tarjeta
                        : '#E6F9ED',

                    borderColor:
                      temaOscuro
                        ? colores.borde
                        : '#CBEED8',
                  },
                  contenidoGrande &&
                    styles.recentCardColumn,
                ]}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={`Actividad reciente: ${datos.actividad_reciente.titulo}`}
              >
                <View
                  style={[
                    styles.recentIconBox,
                    {
                      backgroundColor:
                        temaOscuro
                          ? colores.fondoPrimario
                          : '#CDF2DA',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      datos
                        .actividad_reciente
                        .origen ===
                      'Recurso'
                        ? 'document-text'
                        : 'clipboard'
                    }
                    size={30}
                    color={colorVerde}
                  />
                </View>

                <View
                  style={[
                    styles.recentTextBox,
                    contenidoGrande &&
                      styles.recentTextBoxColumn,
                  ]}
                >
                  <View
                    style={
                      styles.recentTopRow
                    }
                  >
                    <Text
                      style={[
                        styles.recentTitle,
                        {
                          color:
                            colores.texto,
                          fontSize:
                            13 *
                            escalaTexto,
                        },
                      ]}
                      numberOfLines={
                        contenidoGrande
                          ? undefined
                          : 1
                      }
                    >
                      {
                        datos
                          .actividad_reciente
                          .titulo
                      }
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={
                        colores.textoSecundario
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.recentSubject,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          10 *
                          escalaTexto,
                      },
                    ]}
                    numberOfLines={
                      contenidoGrande
                        ? undefined
                        : 1
                    }
                  >
                    {
                      datos
                        .actividad_reciente
                        .materia
                    }
                  </Text>

                  <View
                    style={[
                      styles.recentFooter,
                      contenidoGrande &&
                        styles.recentFooterLarge,
                    ]}
                  >
                    <View
                      style={[
                        styles.recentBadge,
                        {
                          backgroundColor:
                            colores.fondoPrimario,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.recentBadgeText,
                          {
                            color:
                              colorVerde,
                            fontSize:
                              8 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {
                          datos
                            .actividad_reciente
                            .origen
                        }
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.recentDate,
                        {
                          color:
                            colores.textoSecundario,
                          fontSize:
                            8 *
                            escalaTexto,
                        },
                      ]}
                    >
                      {formatearFechaPublicacion(
                        datos
                          .actividad_reciente
                          .fecha_publicacion
                      )}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.emptyRecentCard,
                  {
                    backgroundColor:
                      colores.tarjeta,
                    borderColor:
                      colores.borde,
                  },
                  contenidoGrande &&
                    styles.recentCardColumn,
                ]}
              >
                <View
                  style={[
                    styles.emptyIconBox,
                    {
                      backgroundColor:
                        colores.fondoPrimario,
                    },
                  ]}
                >
                  <Ionicons
                    name="file-tray-outline"
                    size={30}
                    color={
                      colores.textoSecundario
                    }
                  />
                </View>

                <View
                  style={[
                    styles.emptyTextBox,
                    contenidoGrande &&
                      styles.recentTextBoxColumn,
                  ]}
                >
                  <Text
                    style={[
                      styles.emptyTitle,
                      {
                        color:
                          colores.texto,
                        fontSize:
                          13 *
                          escalaTexto,
                      },
                    ]}
                  >
                    No hay actividad reciente
                  </Text>

                  <Text
                    style={[
                      styles.emptyDescription,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          10 *
                          escalaTexto,
                        lineHeight:
                          14 *
                          escalaTexto,
                      },
                    ]}
                  >
                    Cuando publiques un recurso
                    o una actividad aparecerá
                    aquí.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomNavigation,
            responsive.barraInferior,
            {
              backgroundColor:
                colores.tarjeta,
              borderTopColor:
                colores.borde,
            },
          ]}
        >
          <View
            style={[
              styles.bottomContent,
              responsive.contenido,
            ]}
          >
            <BottomNavigationItem
              icon="home-outline"
              activeIcon="home"
              label="Inicio"
              active
              onPress={() => {}}
            />

            <BottomNavigationItem
              icon="book-outline"
              activeIcon="book"
              label="Recursos"
              onPress={() =>
                navegar(
                  '/recursos-docente',
                  'Recursos'
                )
              }
            />

            <BottomNavigationItem
              icon="reader-outline"
              activeIcon="reader"
              label="Actividades"
              onPress={() =>
                navegar(
                  '/actividades-docente',
                  'Actividades'
                )
              }
            />

            <BottomNavigationItem
              icon="document-text-outline"
              activeIcon="document-text"
              label="Evaluaciones"
              onPress={() =>
                navegar(
                  '/evaluaciones-docente',
                  'Evaluaciones'
                )
              }
            />

            <BottomNavigationItem
              icon="menu-outline"
              activeIcon="menu"
              label="Más"
              onPress={() =>
                navegar(
                  '/menu-docente',
                  'Más'
                )
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}

type SummaryCardProps = {
  title: string;
  value: number;
  subtitle: string;
  icon: IoniconName;
  iconColor: string;
  iconBackground: string;
  style?: StyleProp<ViewStyle>;
};

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  iconBackground,
  style,
}: SummaryCardProps) {
  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const altoContraste =
    preferencias.altoContraste;

  const temaOscuro =
    preferencias.modoOscuro ||
    altoContraste;

  const colorIcono =
    altoContraste
      ? colores.primario
      : iconColor;

  const fondoIcono =
    temaOscuro
      ? colores.fondoPrimario
      : iconBackground;

  return (
    <View
      style={[
        styles.summaryCard,
        style,
        {
          backgroundColor:
            colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${title}: ${value} ${subtitle}`}
    >
      <View
        style={[
          styles.summaryIconBox,
          {
            backgroundColor:
              fondoIcono,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={colorIcono}
        />
      </View>

      <View
        style={styles.summaryTextBox}
      >
        <Text
          style={[
            styles.summaryCardTitle,
            {
              color: colores.texto,
              fontSize:
                10 * escalaTexto,
            },
          ]}
          numberOfLines={
            escalaTexto > 1.2
              ? undefined
              : 2
          }
        >
          {title}
        </Text>

        <Text
          style={[
            styles.summaryValue,
            {
              color: colores.texto,
              fontSize:
                17 * escalaTexto,
              lineHeight:
                20 * escalaTexto,
            },
          ]}
        >
          {value}
        </Text>

        <Text
          style={[
            styles.summarySubtitle,
            {
              color:
                colores.textoSecundario,
              fontSize:
                9 * escalaTexto,
            },
          ]}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

type QuickActionProps = {
  text: string;
  subtitle: string;
  icon: IoniconName;
  backgroundColor: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

function QuickAction({
  text,
  subtitle,
  icon,
  backgroundColor,
  onPress,
  style,
}: QuickActionProps) {
  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const altoContraste =
    preferencias.altoContraste;

  const fondoFinal =
    altoContraste
      ? colores.primario
      : backgroundColor;

  const colorTexto =
    altoContraste
      ? '#000000'
      : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[
        styles.quickButton,
        style,
        {
          backgroundColor:
            fondoFinal,
          borderColor:
            altoContraste
              ? colores.borde
              : fondoFinal,
        },
      ]}
      activeOpacity={0.82}
      onPress={onPress}
      focusable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint={subtitle}
    >
      <View
        style={[
          styles.quickIconBox,
          altoContraste && {
            backgroundColor:
              'rgba(0,0,0,0.12)',
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={colorTexto}
        />
      </View>

      <View
        style={
          styles.quickTextBox
        }
      >
        <Text
          style={[
            styles.quickButtonText,
            {
              color: colorTexto,
              fontSize:
                11 * escalaTexto,
            },
          ]}
          numberOfLines={
            escalaTexto > 1.2
              ? undefined
              : 2
          }
        >
          {text}
        </Text>

        <Text
          style={[
            styles.quickButtonSubtitle,
            {
              color:
                altoContraste
                  ? '#000000'
                  : 'rgba(255,255,255,0.88)',

              fontSize:
                8 * escalaTexto,
            },
          ]}
          numberOfLines={
            escalaTexto > 1.2
              ? undefined
              : 2
          }
        >
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

type BottomNavigationItemProps = {
  icon: IoniconName;
  activeIcon: IoniconName;
  label: string;
  active?: boolean;
  onPress: () => void;
};

function BottomNavigationItem({
  icon,
  activeIcon,
  label,
  active = false,
  onPress,
}: BottomNavigationItemProps) {
  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const colorActivo =
    preferencias.altoContraste
      ? colores.primario
      : preferencias.modoOscuro
        ? '#60A5FA'
        : '#2563EB';

  return (
    <TouchableOpacity
      style={styles.bottomItem}
      onPress={onPress}
      activeOpacity={0.7}
      focusable
      accessibilityRole="button"
      accessibilityState={{
        selected: active,
      }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.bottomIconContainer,
          active && {
            backgroundColor:
              colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={
            active
              ? activeIcon
              : icon
          }
          size={21}
          color={
            active
              ? colorActivo
              : colores.textoSecundario
          }
        />
      </View>

      <Text
        style={[
          styles.bottomLabel,
          {
            color: active
              ? colorActivo
              : colores.textoSecundario,

            fontSize:
              8 * escalaTexto,
            lineHeight:
              10 * escalaTexto,
          },
          active &&
            styles.bottomLabelActive,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  safeContainer: {
    flex: 1,
  },

  scrollContent: {
    alignItems: 'center',
    paddingTop: 4,
  },

  contentContainer: {
    alignSelf: 'center',
  },

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  loadingLogo: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  loadingTitle: {
    marginTop: 18,
    fontWeight: '800',
  },

  loadingText: {
    marginTop: 6,
    textAlign: 'center',
  },

  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  accessibilityButton: {
    marginLeft: 2,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoText: {
    fontWeight: '900',
    letterSpacing: -0.6,
  },

  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
  },

  welcomeContainer: {
    marginTop: 24,
    marginBottom: 22,
    paddingHorizontal: 4,
  },

  welcomeTitle: {
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  welcomeSubtitle: {
    marginTop: 6,
  },

  summarySection: {
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,

    ...Platform.select({
      ios: {
        shadowColor: '#553C9A',
        shadowOffset: {
          width: 0,
          height: 7,
        },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },

      android: {
        elevation: 2,
      },
    }),
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 13,
    columnGap: 10,
  },

  summaryHeaderColumn: {
    flexDirection: 'column',
  },

  summaryHeaderText: {
    flex: 1,
  },

  summaryTitle: {
    fontWeight: '900',
  },

  summaryDescription: {
    marginTop: 3,
  },

  dateBadge: {
    maxWidth: '52%',
    minHeight: 29,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 5,
  },

  dateBadgeLarge: {
    maxWidth: '100%',
    marginTop: 12,
  },

  summaryDate: {
    flexShrink: 1,
    fontWeight: '700',
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  summaryCard: {
    minHeight: 82,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },

      android: {
        elevation: 1,
      },
    }),
  },

  summaryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryTextBox: {
    flex: 1,
    minWidth: 0,
    marginLeft: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryCardTitle: {
    width: '100%',
    fontWeight: '700',
    textAlign: 'center',
  },

  summaryValue: {
    marginTop: 2,
    fontWeight: '900',
  },

  summarySubtitle: {
    marginTop: 1,
    textAlign: 'center',
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 11,
    paddingHorizontal: 3,
  },

  sectionTitle: {
    fontWeight: '900',
  },

  sectionSubtitle: {
    marginTop: 3,
  },

  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  quickButton: {
    minHeight: 65,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#1E293B',
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },

      android: {
        elevation: 3,
      },
    }),
  },

  quickIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor:
      'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickTextBox: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
  },

  quickButtonText: {
    fontWeight: '900',
  },

  quickButtonSubtitle: {
    marginTop: 3,
    fontWeight: '500',
  },

  recentCard: {
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  recentCardColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  recentIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recentTextBox: {
    flex: 1,
    marginLeft: 12,
  },

  recentTextBoxColumn: {
    width: '100%',
    marginLeft: 0,
    marginTop: 12,
  },

  recentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  recentTitle: {
    flex: 1,
    fontWeight: '900',
  },

  recentSubject: {
    marginTop: 4,
  },

  recentFooter: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },

  recentFooterLarge: {
    flexWrap: 'wrap',
    rowGap: 6,
  },

  recentBadge: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  recentBadgeText: {
    fontWeight: '800',
  },

  recentDate: {
    flex: 1,
    marginLeft: 8,
  },

  emptyRecentCard: {
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  emptyIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTextBox: {
    flex: 1,
    marginLeft: 12,
  },

  emptyTitle: {
    fontWeight: '900',
  },

  emptyDescription: {
    marginTop: 4,
  },

  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    alignItems: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#111827',
        shadowOffset: {
          width: 0,
          height: -4,
        },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },

      android: {
        elevation: 10,
      },
    }),
  },

  bottomContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  bottomItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },

  bottomIconContainer: {
    width: 36,
    height: 29,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomLabel: {
    marginTop: 2,
    fontWeight: '700',
    textAlign: 'center',
  },

  bottomLabelActive: {
    fontWeight: '900',
  },
});