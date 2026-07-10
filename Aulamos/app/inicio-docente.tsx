import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Cambia esta IP si cambia la red de tu computadora.
const API_URL =
  'http://192.168.6.192:3000/api/docente/inicio';

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

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function InicioDocenteScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [datos, setDatos] =
    useState<InicioDocenteResponse | null>(null);

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] =
    useState(false);

  const esPantallaPequena = width < 360;

  const margenHorizontal =
    width < 350 ? 14 : width < 400 ? 18 : 22;

  const anchoContenido = Math.min(
    width - margenHorizontal * 2,
    520
  );

  const separacionTarjetas =
    esPantallaPequena ? 8 : 10;

  /*
   * Se resta:
   * 28 px del padding interno del contenedor del resumen.
   * La separación entre las dos tarjetas.
   *
   * De esta forma siempre quedan dos tarjetas por fila.
   */
  const anchoTarjetaResumen =
    (anchoContenido -
      28 -
      separacionTarjetas) /
    2;

  const anchoBotonRapido =
    (anchoContenido - separacionTarjetas) / 2;

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
          95 + Math.max(insets.bottom, 8),
      } as ViewStyle,

      barraInferior: {
        height: 66 + Math.max(insets.bottom, 5),
        paddingBottom: Math.max(insets.bottom, 5),
      } as ViewStyle,
    }),
    [
      anchoBotonRapido,
      anchoContenido,
      anchoTarjetaResumen,
      insets.bottom,
      insets.top,
    ]
  );

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async (
    mostrarCarga = true
  ) => {
    try {
      if (mostrarCarga) {
        setCargando(true);
      }

      const token = await AsyncStorage.getItem(
        'token'
      );

      if (!token) {
        Alert.alert(
          'Sesión no encontrada',
          'Inicia sesión nuevamente.'
        );

        router.replace('/');
        return;
      }

      const respuesta = await fetch(API_URL, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const resultado = await respuesta.json();

      if (respuesta.status === 401) {
        await AsyncStorage.multiRemove([
          'token',
          'usuario',
        ]);

        Alert.alert(
          'Sesión vencida',
          'Inicia sesión nuevamente.'
        );

        router.replace('/');
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

      setDatos(resultado);
    } catch (error) {
      console.error(
        'Error al cargar inicio docente:',
        error
      );

      Alert.alert(
        'Error de conexión',
        'No se pudo conectar con la API. Verifica que el servidor esté encendido, que la IP sea correcta y que ambos dispositivos estén conectados a la misma red.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  };

  const refrescar = () => {
    setActualizando(true);
    cargarDatos(false);
  };

  const navegar = (
    ruta: string,
    nombrePantalla: string
  ) => {
    try {
      router.push(ruta as never);
    } catch {
      Alert.alert(
        nombrePantalla,
        `Todavía debes crear la pantalla ${ruta}.`
      );
    }
  };

  const capitalizar = (texto: string) => {
    return (
      texto.charAt(0).toUpperCase() +
      texto.slice(1)
    );
  };

  const formatearFechaActual = () => {
    const texto = new Date().toLocaleDateString(
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
    const fecha = new Date(fechaTexto);
    const hoy = new Date();

    const esHoy =
      fecha.getDate() === hoy.getDate() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() ===
        hoy.getFullYear();

    if (esHoy) {
      return 'Publicado hoy';
    }

    const fechaFormateada =
      fecha.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
      });

    return `Publicado el ${fechaFormateada}`;
  };

  const nombreUsuario =
    datos?.docente.nombre || 'Usuario';

  if (cargando) {
    return (
      <View
        style={[
          styles.loadingScreen,
          responsive.contenedorSeguro,
        ]}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

        <View style={styles.loadingLogo}>
          <Ionicons
            name="school"
            size={34}
            color="#4A7CFF"
          />
        </View>

        <ActivityIndicator
          size="large"
          color="#4A7CFF"
        />

        <Text style={styles.loadingTitle}>
          Aulamos
        </Text>

        <Text style={styles.loadingText}>
          Preparando tu espacio docente...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F7F8FC"
      />

      <View
        style={[
          styles.safeContainer,
          responsive.contenedorSeguro,
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            responsive.contenidoScroll,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={actualizando}
              onRefresh={refrescar}
              colors={['#4A7CFF']}
              tintColor="#4A7CFF"
            />
          }
        >
          <View
            style={[
              styles.contentContainer,
              responsive.contenido,
            ]}
          >
            {/* Encabezado */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Regresar"
              >
                <Ionicons
                  name="arrow-back"
                  size={23}
                  color="#334155"
                />
              </TouchableOpacity>

              <Text style={styles.logoText}>
                Aulamos
              </Text>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.iconButton}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Notificaciones"
                >
                  <Ionicons
                    name="notifications"
                    size={22}
                    color="#273449"
                  />

                  <View
                    style={styles.notificationDot}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Opciones de accesibilidad"
                >
                  <Ionicons
                    name="accessibility"
                    size={24}
                    color="#7C3AED"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Saludo */}
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>
                ¡Hola, Profesor@ {nombreUsuario}! 👋
              </Text>

              <Text style={styles.welcomeSubtitle}>
                Bienvenid@ a tu espacio docente
              </Text>
            </View>

            {/* Resumen del día */}
            <View style={styles.summarySection}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryHeaderText}>
                  <Text style={styles.summaryTitle}>
                    Resumen del día
                  </Text>

                  <Text
                    style={styles.summaryDescription}
                  >
                    Información general de tus clases
                  </Text>
                </View>

                <View style={styles.dateBadge}>
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color="#6D5BD0"
                  />

                  <Text style={styles.summaryDate}>
                    {formatearFechaActual()}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.summaryGrid,
                  {
                    columnGap: separacionTarjetas,
                    rowGap: separacionTarjetas,
                  },
                ]}
              >
                <SummaryCard
                  style={responsive.tarjetaResumen}
                  title="Clases"
                  value={
                    datos?.resumen.clases_activas ??
                    0
                  }
                  subtitle="Activas"
                  icon="document-text"
                  iconColor="#7C3AED"
                  iconBackground="#EFE8FF"
                />

                <SummaryCard
                  style={responsive.tarjetaResumen}
                  title="Actividades"
                  value={
                    datos?.resumen
                      .actividades_pendientes ?? 0
                  }
                  subtitle="Pendientes"
                  icon="clipboard"
                  iconColor="#2563EB"
                  iconBackground="#E6F0FF"
                />

                <SummaryCard
                  style={responsive.tarjetaResumen}
                  title="Evaluaciones"
                  value={
                    datos?.resumen.evaluaciones ?? 0
                  }
                  subtitle="Publicadas"
                  icon="documents"
                  iconColor="#F43F5E"
                  iconBackground="#FFE7EC"
                />

                <SummaryCard
                  style={responsive.tarjetaResumen}
                  title="Estudiantes"
                  value={
                    datos?.resumen.estudiantes ?? 0
                  }
                  subtitle="Inscritos"
                  icon="people"
                  iconColor="#16A34A"
                  iconBackground="#E2F8E9"
                />
              </View>
            </View>

            {/* Accesos rápidos */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Accesos rápidos
              </Text>

              <Text style={styles.sectionSubtitle}>
                Administra tus cursos
              </Text>
            </View>

            <View
              style={[
                styles.quickActions,
                {
                  columnGap: separacionTarjetas,
                  rowGap: separacionTarjetas,
                },
              ]}
            >
              <QuickAction
                style={responsive.botonRapido}
                text="Crear recurso"
                subtitle="Video, PDF o enlace"
                icon="add-circle-outline"
                backgroundColor="#8247E5"
                onPress={() =>
                  navegar(
                    '/crear-recurso',
                    'Crear recurso'
                  )
                }
              />

              <QuickAction
                style={responsive.botonRapido}
                text="Crear actividad"
                subtitle="Tarea o ejercicio"
                icon="add-circle-outline"
                backgroundColor="#14B8A6"
                onPress={() =>
                  navegar(
                    '/crear-actividad',
                    'Crear actividad'
                  )
                }
              />

              <QuickAction
                style={responsive.botonRapido}
                text="Crear evaluación"
                subtitle="Examen o cuestionario"
                icon="add-circle-outline"
                backgroundColor="#F59E0B"
                onPress={() =>
                  navegar(
                    '/crear-evaluacion',
                    'Crear evaluación'
                  )
                }
              />

              <QuickAction
                style={responsive.botonRapido}
                text="Ver estudiantes"
                subtitle="Consulta avances"
                icon="people-outline"
                backgroundColor="#3B82F6"
                onPress={() =>
                  navegar(
                    '/ver-estudiantes',
                    'Ver estudiantes'
                  )
                }
              />

              <QuickAction
                style={responsive.botonRapido}
                text="Reportes"
                subtitle="Resultados generales"
                icon="bar-chart-outline"
                backgroundColor="#F28F7C"
                onPress={() =>
                  navegar(
                    '/reportes-docente',
                    'Reportes'
                  )
                }
              />
            </View>

            {/* Actividad reciente */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Actividad reciente
              </Text>

              <Text style={styles.sectionSubtitle}>
                Último contenido publicado
              </Text>
            </View>

            {datos?.actividad_reciente ? (
              <TouchableOpacity
                style={styles.recentCard}
                activeOpacity={0.82}
                accessibilityRole="button"
              >
                <View style={styles.recentIconBox}>
                  <Ionicons
                    name={
                      datos.actividad_reciente
                        .origen === 'Recurso'
                        ? 'document-text'
                        : 'clipboard'
                    }
                    size={30}
                    color="#16A34A"
                  />
                </View>

                <View style={styles.recentTextBox}>
                  <View style={styles.recentTopRow}>
                    <Text
                      style={styles.recentTitle}
                      numberOfLines={1}
                    >
                      {
                        datos.actividad_reciente
                          .titulo
                      }
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#86A090"
                    />
                  </View>

                  <Text
                    style={styles.recentSubject}
                    numberOfLines={1}
                  >
                    {
                      datos.actividad_reciente
                        .materia
                    }
                  </Text>

                  <View style={styles.recentFooter}>
                    <View style={styles.recentBadge}>
                      <Text
                        style={
                          styles.recentBadgeText
                        }
                      >
                        {
                          datos.actividad_reciente
                            .origen
                        }
                      </Text>
                    </View>

                    <Text style={styles.recentDate}>
                      {formatearFechaPublicacion(
                        datos.actividad_reciente
                          .fecha_publicacion
                      )}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyRecentCard}>
                <View style={styles.emptyIconBox}>
                  <Ionicons
                    name="file-tray-outline"
                    size={30}
                    color="#64748B"
                  />
                </View>

                <View style={styles.emptyTextBox}>
                  <Text style={styles.emptyTitle}>
                    No hay actividad reciente
                  </Text>

                  <Text
                    style={styles.emptyDescription}
                  >
                    Cuando publiques un recurso o una
                    actividad aparecerá aquí.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Barra de navegación inferior */}
        <View
          style={[
            styles.bottomNavigation,
            responsive.barraInferior,
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
  style?: ViewStyle;
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
  return (
    <View style={[styles.summaryCard, style]}>
      <View
        style={[
          styles.summaryIconBox,
          {
            backgroundColor: iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={iconColor}
        />
      </View>

      <View style={styles.summaryTextBox}>
        <Text
          style={styles.summaryCardTitle}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Text style={styles.summaryValue}>
          {value}
        </Text>

        <Text style={styles.summarySubtitle}>
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
  style?: ViewStyle;
};

function QuickAction({
  text,
  subtitle,
  icon,
  backgroundColor,
  onPress,
  style,
}: QuickActionProps) {
  return (
    <TouchableOpacity
      style={[
        styles.quickButton,
        style,
        {
          backgroundColor,
        },
      ]}
      activeOpacity={0.82}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text}
    >
      <View style={styles.quickIconBox}>
        <Ionicons
          name={icon}
          size={20}
          color="#FFFFFF"
        />
      </View>

      <View style={styles.quickTextBox}>
        <Text
          style={styles.quickButtonText}
          numberOfLines={1}
        >
          {text}
        </Text>

        <Text
          style={styles.quickButtonSubtitle}
          numberOfLines={1}
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
  return (
    <TouchableOpacity
      style={styles.bottomItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{
        selected: active,
      }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.bottomIconContainer,
          active &&
            styles.bottomIconContainerActive,
        ]}
      >
        <Ionicons
          name={active ? activeIcon : icon}
          size={21}
          color={
            active ? '#2563EB' : '#8B98AA'
          }
        />
      </View>

      <Text
        style={[
          styles.bottomLabel,
          active && styles.bottomLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },

  safeContainer: {
    flex: 1,
    backgroundColor: '#F7F8FC',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  loadingLogo: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  loadingTitle: {
    marginTop: 18,
    fontSize: 21,
    fontWeight: '800',
    color: '#1E293B',
  },

  loadingText: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748B',
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
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoText: {
    fontSize: 26,
    color: '#2563EB',
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
    borderColor: '#FFFFFF',
  },

  welcomeContainer: {
    marginTop: 24,
    marginBottom: 22,
    paddingHorizontal: 4,
  },

  welcomeTitle: {
    color: '#152033',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  welcomeSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },

  summarySection: {
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8DAFF',
    backgroundColor: '#FAF7FF',

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

  summaryHeaderText: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
  },

  summaryDescription: {
    marginTop: 3,
    fontSize: 10,
    color: '#7C8799',
  },

  dateBadge: {
    maxWidth: '52%',
    minHeight: 29,
    borderRadius: 10,
    backgroundColor: '#F0E9FF',
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 5,
  },

  summaryDate: {
    flexShrink: 1,
    fontSize: 9,
    lineHeight: 12,
    color: '#6D5BD0',
    fontWeight: '700',
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  summaryCard: {
    minHeight: 78,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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
    marginLeft: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryCardTitle: {
    fontSize: 10,
    color: '#344054',
    fontWeight: '700',
    textAlign: 'center',
  },

  summaryValue: {
    marginTop: 2,
    fontSize: 17,
    lineHeight: 20,
    color: '#111827',
    fontWeight: '900',
  },

  summarySubtitle: {
    marginTop: 1,
    fontSize: 9,
    color: '#7C8799',
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 11,
    paddingHorizontal: 3,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#8792A2',
  },

  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  quickButton: {
    minHeight: 61,
    borderRadius: 16,
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickTextBox: {
    flex: 1,
    marginLeft: 8,
  },

  quickButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  quickButtonSubtitle: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 8,
    fontWeight: '500',
  },

  recentCard: {
    minHeight: 88,
    borderRadius: 18,
    backgroundColor: '#E6F9ED',
    borderWidth: 1,
    borderColor: '#CBEED8',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  recentIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#CDF2DA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  recentTextBox: {
    flex: 1,
    marginLeft: 12,
  },

  recentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  recentTitle: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    fontWeight: '900',
  },

  recentSubject: {
    marginTop: 4,
    fontSize: 10,
    color: '#557266',
  },

  recentFooter: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },

  recentBadge: {
    borderRadius: 7,
    backgroundColor: '#C6EFD5',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  recentBadgeText: {
    fontSize: 8,
    color: '#167442',
    fontWeight: '800',
  },

  recentDate: {
    flex: 1,
    marginLeft: 8,
    fontSize: 8,
    color: '#4A725C',
  },

  emptyRecentCard: {
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE2EA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  emptyIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTextBox: {
    flex: 1,
    marginLeft: 12,
  },

  emptyTitle: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '900',
  },

  emptyDescription: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    color: '#7C8799',
  },

  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#E7EAF0',
    backgroundColor: '#FFFFFF',
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
    minWidth: 54,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomIconContainer: {
    width: 36,
    height: 29,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomIconContainerActive: {
    backgroundColor: '#EAF1FF',
  },

  bottomLabel: {
    marginTop: 2,
    fontSize: 8,
    color: '#8B98AA',
    fontWeight: '700',
  },

  bottomLabelActive: {
    color: '#2563EB',
    fontWeight: '900',
  },
});