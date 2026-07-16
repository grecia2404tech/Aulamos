import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

type ModuloCardProps = {
  titulo: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  fondoIcono: string;
  disponible?: boolean;
  dosColumnas: boolean;
  onPress?: () => void;
};

function ModuloCard({
  titulo,
  descripcion,
  icono,
  color,
  fondoIcono,
  disponible = false,
  dosColumnas,
  onPress,
}: ModuloCardProps) {
  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const altoContraste =
    preferencias.altoContraste;

  return (
    <TouchableOpacity
      activeOpacity={
        disponible ? 0.8 : 1
      }
      disabled={!disponible}
      onPress={onPress}
      style={[
        styles.moduleCard,
        dosColumnas &&
          styles.moduleCardColumn,
        {
          backgroundColor:
            colores.tarjeta,
          borderColor: disponible
            ? color
            : colores.borde,
          opacity: disponible
            ? 1
            : 0.72,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={
        disponible
          ? descripcion
          : 'Esta función se agregará próximamente'
      }
      accessibilityState={{
        disabled: !disponible,
      }}
    >
      <View
        style={[
          styles.moduleIcon,
          {
            backgroundColor:
              altoContraste
                ? colores.fondo
                : fondoIcono,
            borderColor:
              colores.borde,
          },
        ]}
      >
        <Ionicons
          name={icono}
          size={27}
          color={
            disponible
              ? color
              : colores.textoSecundario
          }
        />
      </View>

      <View style={styles.moduleContent}>
        <Text
          style={[
            styles.moduleTitle,
            {
              color: colores.texto,
              fontSize:
                16 * escalaTexto,
            },
          ]}
        >
          {titulo}
        </Text>

        <Text
          style={[
            styles.moduleDescription,
            {
              color:
                colores.textoSecundario,
              fontSize:
                12 * escalaTexto,
              lineHeight:
                17 * escalaTexto,
            },
          ]}
        >
          {descripcion}
        </Text>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                disponible
                  ? fondoIcono
                  : colores.fondo,
              borderColor:
                colores.borde,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: disponible
                  ? color
                  : colores.textoSecundario,
                fontSize:
                  10 * escalaTexto,
              },
            ]}
          >
            {disponible
              ? 'Disponible'
              : 'Próximamente'}
          </Text>
        </View>
      </View>

      {disponible ? (
        <Ionicons
          name="chevron-forward"
          size={21}
          color={color}
        />
      ) : null}
    </TouchableOpacity>
  );
}

export default function InicioAdminScreen() {
  const { width } =
    useWindowDimensions();

  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const [usuario, setUsuario] =
    useState<UsuarioAdmin | null>(null);

  const [cargando, setCargando] =
    useState(true);

  const altoContraste =
    preferencias.altoContraste;

  const temaOscuro =
    preferencias.modoOscuro ||
    altoContraste;

  const dosColumnas =
    width >= 650 &&
    escalaTexto <= 1.15;

  const colorPrincipal =
    altoContraste
      ? colores.primario
      : temaOscuro
        ? '#A5B4FC'
        : '#4A7CFF';

  const cargarAdministrador =
    async () => {
      try {
        const [
          token,
          usuarioGuardado,
        ] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('usuario'),
        ]);

        if (
          !token ||
          !usuarioGuardado
        ) {
          Alert.alert(
            'Sesión no disponible',
            'Inicia sesión nuevamente.'
          );

          router.replace('/');
          return;
        }

        const datosUsuario =
          JSON.parse(
            usuarioGuardado
          ) as UsuarioAdmin;

        if (
          datosUsuario.rol !== 'Admin'
        ) {
          Alert.alert(
            'Acceso restringido',
            'No tienes permiso para ingresar al panel administrativo.'
          );

          router.replace('/');
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

        router.replace('/');
      } finally {
        setCargando(false);
      }
    };

  useEffect(() => {
    cargarAdministrador();
  }, []);

  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Deseas salir del panel administrativo?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              'token',
              'usuario',
            ]);

            router.replace('/');
          },
        },
      ]
    );
  };

  if (cargando) {
    return (
      <SafeAreaView
        style={[
          styles.loadingScreen,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colores.primario}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                colores.textoSecundario,
              fontSize:
                14 * escalaTexto,
            },
          ]}
        >
          Cargando panel...
        </Text>
      </SafeAreaView>
    );
  }

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
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.topBar}>
            <View
              style={[
                styles.brandIcon,
                {
                  backgroundColor:
                    colores.fondoPrimario,
                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={25}
                color={colores.primario}
              />
            </View>

            <View style={styles.topActions}>
              <BotonAccesibilidad />

              <TouchableOpacity
                style={[
                  styles.logoutButton,
                  {
                    backgroundColor:
                      colores.tarjeta,
                    borderColor:
                      colores.borde,
                  },
                ]}
                onPress={cerrarSesion}
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
              >
                <Ionicons
                  name="log-out-outline"
                  size={23}
                  color={colores.peligro}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.greeting}>
            <Text
              style={[
                styles.greetingTitle,
                {
                  color: colores.texto,
                  fontSize:
                    27 * escalaTexto,
                  lineHeight:
                    33 * escalaTexto,
                },
              ]}
              accessibilityRole="header"
            >
              Hola, {usuario?.nombre}
            </Text>

            <Text
              style={[
                styles.greetingSubtitle,
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
              Administra la información académica de AULAMOS.
            </Text>
          </View>

          <View
            style={[
              styles.heroCard,
              {
                backgroundColor:
                  altoContraste
                    ? colores.tarjeta
                    : temaOscuro
                      ? '#1E293B'
                      : '#EEF2FF',
                borderColor:
                  colores.borde,
              },
            ]}
          >
            <View
              style={[
                styles.heroIcon,
                {
                  backgroundColor:
                    colores.tarjeta,
                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <Ionicons
                name="school-outline"
                size={32}
                color={colorPrincipal}
              />
            </View>

            <View style={styles.heroContent}>
              <Text
                style={[
                  styles.heroTitle,
                  {
                    color: colores.texto,
                    fontSize:
                      18 * escalaTexto,
                  },
                ]}
              >
                Módulo académico
              </Text>

              <Text
                style={[
                  styles.heroText,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      13 * escalaTexto,
                    lineHeight:
                      18 * escalaTexto,
                  },
                ]}
              >
                Configura los ciclos, materias, grupos, cursos e inscripciones.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      colores.texto,
                    fontSize:
                      21 * escalaTexto,
                  },
                ]}
              >
                Administración
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      13 * escalaTexto,
                  },
                ]}
              >
                Selecciona una sección.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.modulesGrid,
              dosColumnas &&
                styles.modulesGridColumn,
            ]}
          >
            <ModuloCard
              titulo="Ciclos escolares"
              descripcion="Crea y administra los periodos escolares."
              icono="calendar-outline"
              color={colorPrincipal}
              fondoIcono={
                temaOscuro
                  ? '#312E81'
                  : '#E0E7FF'
              }
              disponible
              dosColumnas={dosColumnas}
              onPress={() =>
  router.push(
    '/admin-ciclos' as any
  )
}
            />

            <ModuloCard
              titulo="Periodos de evaluación"
              descripcion="Organiza los periodos de cada ciclo."
              icono="time-outline"
              color="#D97706"
              fondoIcono={
                temaOscuro
                  ? '#451A03'
                  : '#FEF3C7'
              }
              dosColumnas={dosColumnas}
            />

            <ModuloCard
              titulo="Materias"
              descripcion="Administra las materias y campos formativos."
              icono="book-outline"
              color="#2563EB"
              fondoIcono={
                temaOscuro
                  ? '#172554'
                  : '#DBEAFE'
              }
              dosColumnas={dosColumnas}
            />

            <ModuloCard
              titulo="Grupos"
              descripcion="Configura grados, turnos y cupos."
              icono="people-outline"
              color="#059669"
              fondoIcono={
                temaOscuro
                  ? '#052E16'
                  : '#D1FAE5'
              }
              dosColumnas={dosColumnas}
            />

            <ModuloCard
              titulo="Cursos y asignaciones"
              descripcion="Relaciona materias, grupos y docentes."
              icono="git-network-outline"
              color="#7C3AED"
              fondoIcono={
                temaOscuro
                  ? '#2E1065'
                  : '#EDE9FE'
              }
              dosColumnas={dosColumnas}
            />

            <ModuloCard
              titulo="Inscripciones"
              descripcion="Inscribe estudiantes en sus cursos."
              icono="person-add-outline"
              color="#DC2626"
              fondoIcono={
                temaOscuro
                  ? '#450A0A'
                  : '#FEE2E2'
              }
              dosColumnas={dosColumnas}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontWeight: '600',
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 40,
  },

  content: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brandIcon: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  logoutButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  greeting: {
    marginTop: 27,
  },

  greetingTitle: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  greetingSubtitle: {
    marginTop: 6,
    fontWeight: '500',
  },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginTop: 23,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  heroContent: {
    flex: 1,
  },

  heroTitle: {
    fontWeight: '900',
  },

  heroText: {
    marginTop: 4,
    fontWeight: '500',
  },

  sectionHeader: {
    marginTop: 29,
    marginBottom: 16,
  },

  sectionTitle: {
    fontWeight: '900',
  },

  sectionSubtitle: {
    marginTop: 5,
    fontWeight: '500',
  },

  modulesGrid: {
    gap: 13,
  },

  modulesGridColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  moduleCard: {
    width: '100%',
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
  },

  moduleCardColumn: {
    width: '48.8%',
  },

  moduleIcon: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  moduleContent: {
    flex: 1,
    marginHorizontal: 12,
  },

  moduleTitle: {
    fontWeight: '900',
  },

  moduleDescription: {
    marginTop: 4,
    fontWeight: '500',
  },

  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 9,
  },

  statusText: {
    fontWeight: '800',
  },
});