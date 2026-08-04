import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
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

type UsuarioAdmin = {
  id_usuario: number;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  correo: string;
  rol: string;
};

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function InicioAdminScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const [usuario, setUsuario] =
    useState<UsuarioAdmin | null>(null);
  const [cargando, setCargando] =
    useState(true);
  const [actualizando, setActualizando] =
    useState(false);

  const altoContraste =
    preferencias.altoContraste;
  const temaOscuro =
    preferencias.modoOscuro || altoContraste;
  const contenidoGrande = escalaTexto > 1.2;
  const unaTarjetaPorFila =
    contenidoGrande || width < 340;

  const margenHorizontal =
    width < 350 ? 14 : width < 400 ? 18 : 22;
  const anchoContenido = Math.min(
    width - margenHorizontal * 2,
    520
  );
  const separacionTarjetas = width < 360 ? 8 : 10;
  const anchoTarjetaResumen = unaTarjetaPorFila
    ? anchoContenido - 28
    : (anchoContenido - 28 - separacionTarjetas) / 2;
  const anchoBotonRapido = unaTarjetaPorFila
    ? anchoContenido
    : (anchoContenido - separacionTarjetas) / 2;
  const altoBarraInferior = contenidoGrande ? 94 : 66;

  const colorPrincipal = altoContraste
    ? colores.primario
    : temaOscuro
      ? '#60A5FA'
      : '#2563EB';

  const fondoInformacion = temaOscuro
    ? colores.fondoPrimario
    : '#FAF7FF';

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
          altoBarraInferior + 35 + Math.max(insets.bottom, 8),
      } as ViewStyle,
      barraInferior: {
        height:
          altoBarraInferior + Math.max(insets.bottom, 5),
        paddingBottom: Math.max(insets.bottom, 5),
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

  const cargarAdministrador = async (
    mostrarCarga = true
  ) => {
    try {
      if (mostrarCarga) {
        setCargando(true);
      }

      const [token, usuarioGuardado] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('usuario'),
      ]);

      if (!token || !usuarioGuardado) {
        Alert.alert(
          'Sesión no disponible',
          'Inicia sesión nuevamente.'
        );
        router.replace('/' as any);
        return;
      }

      const datosUsuario = JSON.parse(
        usuarioGuardado
      ) as UsuarioAdmin;

      if (datosUsuario.rol?.toLowerCase() !== 'admin') {
        Alert.alert(
          'Acceso restringido',
          'No tienes permiso para ingresar al panel administrativo.'
        );
        router.replace('/' as any);
        return;
      }

      setUsuario(datosUsuario);
    } catch (error) {
      console.error(
        'Error al cargar administrador:',
        error
      );
      Alert.alert(
        'Error',
        'No fue posible cargar la sesión.'
      );
      router.replace('/' as any);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    cargarAdministrador();
  }, []);

  const refrescar = () => {
    setActualizando(true);
    cargarAdministrador(false);
  };

  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que deseas cerrar tu sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'token',
                'usuario',
              ]);
              router.replace('/' as any);
            } catch (error) {
              console.error(
                'Error al cerrar sesión:',
                error
              );
              Alert.alert(
                'No se pudo cerrar sesión',
                'Intenta nuevamente.'
              );
            }
          },
        },
      ]
    );
  };

  const navegar = (ruta: string) => {
    router.push(ruta as any);
  };

  const capitalizar = (texto: string) =>
    texto.charAt(0).toUpperCase() + texto.slice(1);

  const formatearFechaActual = () => {
    const fecha = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return capitalizar(fecha);
  };

  const estiloStatusBar = temaOscuro
    ? 'light-content'
    : 'dark-content';

  if (cargando) {
    return (
      <View
        style={[
          styles.loadingScreen,
          responsive.contenedorSeguro,
          { backgroundColor: colores.fondo },
        ]}
      >
        <StatusBar
          barStyle={estiloStatusBar}
          backgroundColor={colores.fondo}
        />

        <View
          style={[
            styles.loadingLogo,
            {
              backgroundColor: colores.fondoPrimario,
              borderColor: colores.borde,
            },
          ]}
        >
          <Ionicons
            name="shield-checkmark"
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
              fontSize: 21 * escalaTexto,
            },
          ]}
        >
          Aulamos
        </Text>

        <Text
          style={[
            styles.loadingText,
            {
              color: colores.textoSecundario,
              fontSize: 14 * escalaTexto,
              lineHeight: 20 * escalaTexto,
            },
          ]}
        >
          Preparando el panel administrativo...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colores.fondo },
      ]}
    >
      <StatusBar
        barStyle={estiloStatusBar}
        backgroundColor={colores.fondo}
      />

      <View
        style={[
          styles.safeContainer,
          responsive.contenedorSeguro,
          { backgroundColor: colores.fondo },
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
              colors={[colorPrincipal]}
              tintColor={colorPrincipal}
              progressBackgroundColor={colores.tarjeta}
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
                    backgroundColor: colores.tarjeta,
                    borderColor: colores.borde,
                  },
                ]}
                onPress={() => router.back()}
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
                    color: colorPrincipal,
                    fontSize: Math.min(26 * escalaTexto, 36),
                  },
                ]}
              >
                Aulamos
              </Text>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: colores.tarjeta,
                      borderColor: colores.borde,
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
                      { borderColor: colores.tarjeta },
                    ]}
                  />
                </TouchableOpacity>

                <BotonAccesibilidad />
              </View>
            </View>

            <View style={styles.welcomeContainer}>
              <Text
                style={[
                  styles.welcomeTitle,
                  {
                    color: colores.texto,
                    fontSize: 19 * escalaTexto,
                    lineHeight: 25 * escalaTexto,
                  },
                ]}
                accessibilityRole="header"
              >
                ¡Hola, {usuario?.nombre || 'Administrador'}! 👋
              </Text>

              <Text
                style={[
                  styles.welcomeSubtitle,
                  {
                    color: colores.textoSecundario,
                    fontSize: 13 * escalaTexto,
                    lineHeight: 19 * escalaTexto,
                  },
                ]}
              >
                Bienvenid@ a tu espacio administrativo
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.logoutButton,
                {
                  backgroundColor: temaOscuro
                    ? colores.tarjeta
                    : '#FFF1F2',
                  borderColor: altoContraste
                    ? colores.borde
                    : '#FCA5A5',
                },
              ]}
              activeOpacity={0.75}
              onPress={cerrarSesion}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              accessibilityHint="Cierra tu sesión y regresa al inicio de sesión"
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={altoContraste ? colores.texto : '#DC2626'}
              />
              <Text
                style={[
                  styles.logoutButtonText,
                  {
                    color: altoContraste
                      ? colores.texto
                      : '#DC2626',
                    fontSize: 12 * escalaTexto,
                  },
                ]}
              >
                Cerrar sesión
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.summarySection,
                {
                  backgroundColor: fondoInformacion,
                  borderColor: colores.borde,
                },
              ]}
            >
              <View
                style={[
                  styles.summaryHeader,
                  contenidoGrande && styles.summaryHeaderColumn,
                ]}
              >
                <View style={styles.summaryHeaderText}>
                  <Text
                    style={[
                      styles.summaryTitle,
                      {
                        color: colores.texto,
                        fontSize: 15 * escalaTexto,
                      },
                    ]}
                    accessibilityRole="header"
                  >
                    Panel académico
                  </Text>
                  <Text
                    style={[
                      styles.summaryDescription,
                      {
                        color: colores.textoSecundario,
                        fontSize: 10 * escalaTexto,
                        lineHeight: 14 * escalaTexto,
                      },
                    ]}
                  >
                    Organización general de AULAMOS
                  </Text>
                </View>

                <View
                  style={[
                    styles.dateBadge,
                    { backgroundColor: colores.fondoPrimario },
                    contenidoGrande && styles.dateBadgeLarge,
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={colores.primario}
                  />
                  <Text
                    style={[
                      styles.summaryDate,
                      {
                        color: colores.primario,
                        fontSize: 9 * escalaTexto,
                        lineHeight: 12 * escalaTexto,
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
                    columnGap: separacionTarjetas,
                    rowGap: separacionTarjetas,
                  },
                ]}
              >
                <SummaryCard
                  style={responsive.tarjetaResumen}
                  title="Planeación"
                  value={2}
                  subtitle="Ciclos y periodos"
                  icon="calendar"
                  iconColor="#7C3AED"
                  iconBackground="#EFE8FF"
                />
                <SummaryCard
                  style={responsive.tarjetaResumen}
                  title="Académico"
                  value={3}
                  subtitle="Materias, grupos y cursos"
                  icon="school"
                  iconColor="#2563EB"
                  iconBackground="#E6F0FF"
                />
                <SummaryCard
                  style={responsive.tarjetaResumen}
                  title="Estudiantes"
                  value={1}
                  subtitle="Módulo de inscripciones"
                  icon="people"
                  iconColor="#16A34A"
                  iconBackground="#E2F8E9"
                />
                <SummaryCard
                  style={responsive.tarjetaResumen}
                  title="Módulos"
                  value={6}
                  subtitle="Accesos disponibles"
                  icon="grid"
                  iconColor="#E11D48"
                  iconBackground="#FFE7EC"
                />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colores.texto,
                    fontSize: 15 * escalaTexto,
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
                    color: colores.textoSecundario,
                    fontSize: 11 * escalaTexto,
                  },
                ]}
              >
                Administra la información académica
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
                text="Ciclos escolares"
                subtitle="Gestiona los ciclos"
                icon="calendar-outline"
                backgroundColor="#6D28D9"
                onPress={() => navegar('/admin-ciclos')}
              />
              <QuickAction
                style={responsive.botonRapido}
                text="Periodos"
                subtitle="Periodos de evaluación"
                icon="time-outline"
                backgroundColor="#A16207"
                onPress={() => navegar('/admin-periodos')}
              />
              <QuickAction
                style={responsive.botonRapido}
                text="Materias"
                subtitle="Materias y campos"
                icon="book-outline"
                backgroundColor="#0F766E"
                onPress={() => navegar('/admin-materias')}
              />
              <QuickAction
                style={responsive.botonRapido}
                text="Grupos"
                subtitle="Grados, turnos y cupos"
                icon="people-outline"
                backgroundColor="#2563EB"
                onPress={() => navegar('/admin-grupos')}
              />
              <QuickAction
                style={responsive.botonRapido}
                text="Cursos"
                subtitle="Materias, grupos y docentes"
                icon="git-network-outline"
                backgroundColor="#7C3AED"
                onPress={() => navegar('/admin-cursos')}
              />
              <QuickAction
                style={responsive.botonRapido}
                text="Inscripciones"
                subtitle="Asigna estudiantes"
                icon="person-add-outline"
                backgroundColor="#0E7490"
                onPress={() => navegar('/admin-inscripciones')}
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colores.texto,
                    fontSize: 15 * escalaTexto,
                  },
                ]}
                accessibilityRole="header"
              >
                Gestión académica
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color: colores.textoSecundario,
                    fontSize: 11 * escalaTexto,
                  },
                ]}
              >
                Mantén actualizada la información escolar
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.managementCard,
                {
                  backgroundColor: temaOscuro
                    ? colores.tarjeta
                    : '#E6F0FF',
                  borderColor: temaOscuro
                    ? colores.borde
                    : '#C9DCFF',
                },
                contenidoGrande && styles.managementCardColumn,
              ]}
              activeOpacity={0.82}
              onPress={() => navegar('/admin-ciclos')}
              accessibilityRole="button"
              accessibilityLabel="Revisar configuración académica"
              accessibilityHint="Abre la administración de ciclos escolares"
            >
              <View
                style={[
                  styles.managementIconBox,
                  {
                    backgroundColor: temaOscuro
                      ? colores.fondoPrimario
                      : '#D7E6FF',
                  },
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={30}
                  color={colorPrincipal}
                />
              </View>

              <View style={styles.managementTextBox}>
                <Text
                  style={[
                    styles.managementTitle,
                    {
                      color: colores.texto,
                      fontSize: 13 * escalaTexto,
                    },
                  ]}
                >
                  Revisa la configuración del ciclo escolar
                </Text>
                <Text
                  style={[
                    styles.managementDescription,
                    {
                      color: colores.textoSecundario,
                      fontSize: 10 * escalaTexto,
                      lineHeight: 15 * escalaTexto,
                    },
                  ]}
                >
                  Verifica el ciclo, los periodos y los datos académicos antes de realizar inscripciones.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={19}
                color={colores.textoSecundario}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomNavigation,
            responsive.barraInferior,
            {
              backgroundColor: colores.tarjeta,
              borderTopColor: colores.borde,
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
              icon="calendar-outline"
              activeIcon="calendar"
              label="Ciclos"
              onPress={() => navegar('/admin-ciclos')}
            />
            <BottomNavigationItem
              icon="book-outline"
              activeIcon="book"
              label="Materias"
              onPress={() => navegar('/admin-materias')}
            />
            <BottomNavigationItem
              icon="people-outline"
              activeIcon="people"
              label="Grupos"
              onPress={() => navegar('/admin-grupos')}
            />
            <BottomNavigationItem
              icon="grid-outline"
              activeIcon="grid"
              label="Cursos"
              onPress={() => navegar('/admin-cursos')}
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

  return (
    <View
      style={[
        styles.summaryCard,
        style,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${title}: ${value}. ${subtitle}`}
    >
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor: preferencias.altoContraste
              ? colores.fondoPrimario
              : iconBackground,
          },
        ]}
      >
        <Ionicons name={icon} size={21} color={iconColor} />
      </View>

      <View style={styles.summaryCardText}>
        <Text
          style={[
            styles.summaryCardTitle,
            {
              color: colores.textoSecundario,
              fontSize: 9 * escalaTexto,
            },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.summaryValue,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.summarySubtitle,
            {
              color: colores.textoSecundario,
              fontSize: 8 * escalaTexto,
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

  const fondo = preferencias.altoContraste
    ? colores.primario
    : backgroundColor;
  const colorTexto = preferencias.altoContraste
    ? '#000000'
    : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[
        styles.quickAction,
        style,
        { backgroundColor: fondo },
      ]}
      activeOpacity={0.82}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint={subtitle}
    >
      <View style={styles.quickActionTop}>
        <Ionicons name={icon} size={24} color={colorTexto} />
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colorTexto}
        />
      </View>
      <Text
        style={[
          styles.quickActionText,
          {
            color: colorTexto,
            fontSize: 12 * escalaTexto,
          },
        ]}
      >
        {text}
      </Text>
      <Text
        style={[
          styles.quickActionSubtitle,
          {
            color: colorTexto,
            fontSize: 9 * escalaTexto,
          },
        ]}
      >
        {subtitle}
      </Text>
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
  } = useAccessibility();

  return (
    <TouchableOpacity
      style={styles.bottomItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <View
        style={[
          styles.bottomIconContainer,
          active && {
            backgroundColor: colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={active ? activeIcon : icon}
          size={22}
          color={active ? colores.primario : colores.textoSecundario}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.bottomLabel,
          {
            color: active
              ? colores.primario
              : colores.textoSecundario,
            fontSize: Math.min(10 * escalaTexto, 13),
          },
          active && styles.bottomLabelActive,
        ]}
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
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingLogo: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  loadingTitle: {
    marginTop: 17,
    fontWeight: '900',
  },
  loadingText: {
    marginTop: 7,
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 10,
  },
  contentContainer: {
    alignSelf: 'center',
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    flex: 1,
    marginLeft: 13,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: '#EF4444',
  },
  welcomeContainer: {
    marginBottom: 13,
  },
  welcomeTitle: {
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  welcomeSubtitle: {
    marginTop: 3,
    fontWeight: '500',
  },
  logoutButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 18,
  },
  logoutButtonText: {
    fontWeight: '800',
  },
  summarySection: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
    gap: 10,
  },
  summaryHeaderColumn: {
    alignItems: 'flex-start',
    flexDirection: 'column',
  },
  summaryHeaderText: {
    flex: 1,
  },
  summaryTitle: {
    fontWeight: '900',
  },
  summaryDescription: {
    marginTop: 2,
    fontWeight: '500',
  },
  dateBadge: {
    maxWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  dateBadgeLarge: {
    maxWidth: '100%',
  },
  summaryDate: {
    flexShrink: 1,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryCard: {
    minHeight: 91,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
    padding: 10,
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  summaryCardText: {
    flex: 1,
  },
  summaryCardTitle: {
    fontWeight: '700',
  },
  summaryValue: {
    marginTop: 1,
    fontWeight: '900',
  },
  summarySubtitle: {
    marginTop: 1,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 11,
  },
  sectionTitle: {
    fontWeight: '900',
  },
  sectionSubtitle: {
    marginTop: 2,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickAction: {
    minHeight: 105,
    borderRadius: 17,
    padding: 13,
    justifyContent: 'space-between',
  },
  quickActionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickActionText: {
    marginTop: 11,
    fontWeight: '900',
  },
  quickActionSubtitle: {
    marginTop: 2,
    fontWeight: '600',
    opacity: 0.88,
  },
  managementCard: {
    minHeight: 105,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  managementCardColumn: {
    alignItems: 'flex-start',
  },
  managementIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  managementTextBox: {
    flex: 1,
    paddingRight: 8,
  },
  managementTitle: {
    fontWeight: '900',
  },
  managementDescription: {
    marginTop: 4,
    fontWeight: '500',
  },
  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },
  bottomContent: {
    flex: 1,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  bottomItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  bottomIconContainer: {
    minWidth: 35,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomLabel: {
    marginTop: 2,
    fontWeight: '600',
  },
  bottomLabelActive: {
    fontWeight: '900',
  },
});