import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
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

type IconoNombre =
  ComponentProps<typeof Ionicons>['name'];

interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  correo: string;
  rol: string;
}

interface BotonNavegacionProps {
  icono: IconoNombre;
  texto: string;
  activo?: boolean;
  onPress: () => void;
}

function BotonNavegacion({
  icono,
  texto,
  activo = false,
  onPress,
}: BotonNavegacionProps) {
  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{
        selected: activo,
      }}
    >
      <Ionicons
        name={icono}
        size={23}
        color={activo ? '#2563EB' : '#64748B'}
      />

      <Text
        style={[
          styles.navText,
          activo ? styles.navTextActive : null,
        ]}
        numberOfLines={1}
      >
        {texto}
      </Text>
    </TouchableOpacity>
  );
}

export default function InicioAlumnoScreen() {
  const { width } = useWindowDimensions();

  const [usuario, setUsuario] =
    useState<Usuario | null>(null);

  const [verificandoSesion, setVerificandoSesion] =
    useState(true);

  const pantallaPequena = width < 360;

  const paddingHorizontal =
    width >= 768
      ? Math.max(28, (width - 720) / 2)
      : pantallaPequena
        ? 16
        : 22;

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const token =
          await AsyncStorage.getItem('token');

        const usuarioGuardado =
          await AsyncStorage.getItem('usuario');

        if (!token || !usuarioGuardado) {
          router.replace('/');
          return;
        }

        const datosUsuario: Usuario =
          JSON.parse(usuarioGuardado);

        if (datosUsuario.rol !== 'Alumno') {
          if (datosUsuario.rol === 'Docente') {
            router.replace('/inicio-docente');
          } else {
            router.replace('/');
          }

          return;
        }

        setUsuario(datosUsuario);
      } catch (error) {
        console.error(
          'Error al recuperar la sesión:',
          error
        );

        await AsyncStorage.multiRemove([
          'token',
          'usuario',
        ]);

        router.replace('/');
      } finally {
        setVerificandoSesion(false);
      }
    };

    cargarUsuario();
  }, []);

  const mostrarProximamente = (
    seccion: string
  ) => {
    Alert.alert(
      seccion,
      'Esta sección estará disponible próximamente.'
    );
  };

  if (verificandoSesion) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Cargando tu información...
        </Text>
      </SafeAreaView>
    );
  }

  if (!usuario) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Encabezado */}

          <View style={styles.header}>
            <View style={styles.greetingContainer}>
              <Text
                style={[
                  styles.greeting,
                  pantallaPequena
                    ? styles.greetingSmall
                    : null,
                ]}
              >
                ¡Hola, {usuario.nombre}! 👋
              </Text>

              <Text style={styles.welcomeText}>
                Qué bueno verte de nuevo
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() =>
                  mostrarProximamente(
                    'Notificaciones'
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Notificaciones"
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color="#111827"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.headerButton,
                  styles.accessibilityButton,
                ]}
                onPress={() =>
                  mostrarProximamente(
                    'Accesibilidad'
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Opciones de accesibilidad"
              >
                <Ionicons
                  name="accessibility"
                  size={24}
                  color="#7C4DFF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tarjeta de bienvenida */}

          <View style={styles.progressCard}>
            <View style={styles.progressInformation}>
              <Text style={styles.progressLabel}>
                Sigue aprendiendo
              </Text>

              <Text style={styles.progressTitle}>
                Aún no tienes actividades pendientes
              </Text>
            </View>

            <Text
              style={[
                styles.studentIllustration,
                pantallaPequena
                  ? styles.studentIllustrationSmall
                  : null,
              ]}
              accessibilityElementsHidden
            >
              👩‍🎓
            </Text>
          </View>

          {/* Resumen */}

          <Text style={styles.sectionTitle}>
            Resumen de hoy
          </Text>

          <View style={styles.statsRow}>
            <View
              style={styles.statCard}
              accessible
              accessibilityLabel="Cero actividades pendientes"
            >
              <View
                style={[
                  styles.statIconBox,
                  styles.blueIconBox,
                ]}
              >
                <Ionicons
                  name="clipboard"
                  size={24}
                  color="#2563EB"
                />
              </View>

              <Text style={styles.statName}>
                Actividades pendientes
              </Text>

              <Text style={styles.statValue}>
                0
              </Text>
            </View>

            <View
              style={styles.statCard}
              accessible
              accessibilityLabel="Cero lecciones en progreso"
            >
              <View
                style={[
                  styles.statIconBox,
                  styles.greenIconBox,
                ]}
              >
                <Ionicons
                  name="book-outline"
                  size={24}
                  color="#16A34A"
                />
              </View>

              <Text style={styles.statName}>
                Lecciones en progreso
              </Text>

              <Text style={styles.statValue}>
                0
              </Text>
            </View>

            <View
              style={styles.statCard}
              accessible
              accessibilityLabel="Cero puntos totales"
            >
              <View
                style={[
                  styles.statIconBox,
                  styles.yellowIconBox,
                ]}
              >
                <Ionicons
                  name="star"
                  size={22}
                  color="#F59E0B"
                />
              </View>

              <Text style={styles.statName}>
                Puntos totales
              </Text>

              <Text style={styles.statValue}>
                0
              </Text>
            </View>
          </View>

          {/* Estado vacío */}

          <Text style={styles.sectionTitle}>
            Próxima actividad
          </Text>

          <View
            style={styles.emptyActivityCard}
            accessible
            accessibilityLabel="No tienes actividades próximas"
          >
            <View style={styles.emptyActivityIcon}>
              <Ionicons
                name="calendar-outline"
                size={32}
                color="#64748B"
              />
            </View>

            <View
              style={styles.emptyActivityInformation}
            >
              <Text
                style={styles.emptyActivityTitle}
              >
                No tienes actividades próximas
              </Text>

              <Text
                style={styles.emptyActivityText}
              >
                Las actividades que te asigne tu
                docente aparecerán aquí.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Navegación inferior */}

        <View style={styles.bottomBar}>
          <View style={styles.navContent}>
            <BotonNavegacion
              icono="home"
              texto="Inicio"
              activo
              onPress={() => {}}
            />

            <BotonNavegacion
              icono="list-outline"
              texto="Actividades"
              onPress={() =>
                mostrarProximamente(
                  'Actividades'
                )
              }
            />

            <BotonNavegacion
              icono="book-outline"
              texto="Biblioteca"
              onPress={() =>
                mostrarProximamente(
                  'Biblioteca'
                )
              }
            />

            <BotonNavegacion
              icono="stats-chart-outline"
              texto="Avances"
              onPress={() =>
                mostrarProximamente(
                  'Mis avances'
                )
              }
            />

            <BotonNavegacion
              icono="help-circle"
              texto="Chatbot"
              onPress={() =>
                mostrarProximamente(
                  'Chatbot'
                )
              }
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    color: '#475569',
    fontSize: 15,
    marginTop: 14,
  },

  content: {
    flexGrow: 1,
    paddingTop: 24,
    paddingBottom: 125,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },

  greetingContainer: {
    flex: 1,
    paddingRight: 10,
  },

  greeting: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },

  greetingSmall: {
    fontSize: 19,
  },

  welcomeText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  accessibilityButton: {
    backgroundColor: '#F3E8FF',
  },

  progressCard: {
    minHeight: 130,
    borderRadius: 17,
    backgroundColor: '#F1E8FF',
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 26,
  },

  progressInformation: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },

  progressLabel: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '800',
  },

  progressTitle: {
    maxWidth: 180,
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },

  studentIllustration: {
    fontSize: 72,
    marginLeft: 8,
  },

  studentIllustrationSmall: {
    fontSize: 58,
  },

  sectionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },

  statCard: {
    flex: 1,
    minHeight: 145,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 12,
  },

  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  blueIconBox: {
    backgroundColor: '#DBEAFE',
  },

  greenIconBox: {
    backgroundColor: '#DCFCE7',
  },

  yellowIconBox: {
    backgroundColor: '#FEF3C7',
  },

  statName: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 15,
    minHeight: 44,
  },

  statValue: {
    color: '#475569',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 5,
  },

  emptyActivityCard: {
    minHeight: 105,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  emptyActivityIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  emptyActivityInformation: {
    flex: 1,
  },

  emptyActivityTitle: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },

  emptyActivityText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 76,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingTop: 8,
  },

  navContent: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
  },

  navItem: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  navText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  navTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
});