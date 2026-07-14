import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import type { ComponentProps } from 'react';
import {
  useCallback,
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

interface TarjetaResumenProps {
  icono: IconoNombre;
  titulo: string;
  valor: number;
  color: string;
  fondoIcono: string;
  enColumna: boolean;
  etiquetaAccesibilidad: string;
}

function BotonNavegacion({
  icono,
  texto,
  activo = false,
  onPress,
}: BotonNavegacionProps) {
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
      style={styles.navItem}
      onPress={onPress}
      focusable
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{
        selected: activo,
      }}
    >
      <Ionicons
        name={icono}
        size={23}
        color={
          activo
            ? colorActivo
            : colores.textoSecundario
        }
      />

      <Text
        style={[
          styles.navText,
          {
            color: activo
              ? colorActivo
              : colores.textoSecundario,
            fontSize:
              10 * escalaTexto,
            lineHeight:
              12 * escalaTexto,
          },
          activo &&
            styles.navTextActive,
        ]}
        numberOfLines={2}
      >
        {texto}
      </Text>
    </TouchableOpacity>
  );
}

function TarjetaResumen({
  icono,
  titulo,
  valor,
  color,
  fondoIcono,
  enColumna,
  etiquetaAccesibilidad,
}: TarjetaResumenProps) {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor:
            colores.tarjeta,
          borderColor: colores.borde,
        },
        enColumna &&
          styles.statCardColumn,
      ]}
      accessible
      accessibilityLabel={
        etiquetaAccesibilidad
      }
    >
      <View
        style={[
          styles.statIconBox,
          {
            backgroundColor:
              fondoIcono,
          },
        ]}
      >
        <Ionicons
          name={icono}
          size={23}
          color={color}
        />
      </View>

      <Text
        style={[
          styles.statName,
          {
            color: colores.texto,
            fontSize:
              10.5 * escalaTexto,
            lineHeight:
              14 * escalaTexto,
          },
        ]}
        numberOfLines={
          enColumna ? undefined : 3
        }
      >
        {titulo}
      </Text>

      <Text
        style={[
          styles.statValue,
          {
            color:
              colores.textoSecundario,
            fontSize:
              17 * escalaTexto,
          },
        ]}
      >
        {valor}
      </Text>
    </View>
  );
}

export default function InicioAlumnoScreen() {
  const { width } =
    useWindowDimensions();

  const [usuario, setUsuario] =
    useState<Usuario | null>(null);

  const [
    verificandoSesion,
    setVerificandoSesion,
  ] = useState(true);

  const {
    colores,
    escalaTexto,
    preferencias,
    leerTexto,
    detenerLectura,
  } = useAccessibility();

  const pantallaPequena = width < 360;

  /*
   * Se utiliza para el encabezado,
   * la bienvenida y la actividad.
   */
  const contenidoEnColumna =
    pantallaPequena ||
    escalaTexto > 1.2;

  /*
   * En tamaño normal siempre se muestran
   * las tres tarjetas en una fila.
   *
   * Solo cambian a columna cuando el usuario
   * selecciona texto grande o muy grande.
   */
  const tarjetasResumenEnColumna =
    escalaTexto > 1.2;

  const paddingHorizontal =
    width >= 768
      ? Math.max(
          28,
          (width - 720) / 2
        )
      : pantallaPequena
        ? 14
        : 22;

  const altoNavegacion =
    escalaTexto > 1.2 ? 104 : 76;

  const altoContraste =
    preferencias.altoContraste;

  const temaOscuro =
    preferencias.modoOscuro ||
    altoContraste;

  const colorAzul = altoContraste
    ? colores.primario
    : temaOscuro
      ? '#60A5FA'
      : '#2563EB';

  const colorVerde = altoContraste
    ? colores.primario
    : temaOscuro
      ? '#4ADE80'
      : '#16A34A';

  const colorAmarillo =
    altoContraste
      ? colores.primario
      : temaOscuro
        ? '#FCD34D'
        : '#F59E0B';

  const fondoAzul = temaOscuro
    ? colores.fondoPrimario
    : '#DBEAFE';

  const fondoVerde = temaOscuro
    ? colores.fondoPrimario
    : '#DCFCE7';

  const fondoAmarillo = temaOscuro
    ? colores.fondoPrimario
    : '#FEF3C7';

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const token =
          await AsyncStorage.getItem(
            'token'
          );

        const usuarioGuardado =
          await AsyncStorage.getItem(
            'usuario'
          );

        if (
          !token ||
          !usuarioGuardado
        ) {
          router.replace('/' as any);
          return;
        }

        const datosUsuario: Usuario =
          JSON.parse(usuarioGuardado);

        if (
          datosUsuario.rol !== 'Alumno'
        ) {
          if (
            datosUsuario.rol ===
            'Docente'
          ) {
            router.replace(
              '/inicio-docente' as any
            );
          } else {
            router.replace(
              '/' as any
            );
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

        router.replace('/' as any);
      } finally {
        setVerificandoSesion(false);
      }
    };

    cargarUsuario();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (
        preferencias.lectorPantalla &&
        usuario
      ) {
        leerTexto(
          `Hola ${usuario.nombre}. Qué bueno verte de nuevo. No tienes actividades pendientes, lecciones en progreso ni actividades próximas.`
        );
      }

      return () => {
        detenerLectura();
      };
    }, [
      preferencias.lectorPantalla,
      usuario,
      leerTexto,
      detenerLectura,
    ])
  );

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
      <SafeAreaView
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colorAzul}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                colores.textoSecundario,
              fontSize:
                15 * escalaTexto,
            },
          ]}
        >
          Cargando tu información...
        </Text>
      </SafeAreaView>
    );
  }

  if (!usuario) {
    return null;
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
      <View
        style={[
          styles.screen,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal,
              paddingBottom:
                altoNavegacion + 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.header,
              contenidoEnColumna &&
                styles.headerColumn,
            ]}
          >
            <View
              style={
                styles.greetingContainer
              }
            >
              <Text
                style={[
                  styles.greeting,
                  {
                    color: colores.texto,
                    fontSize:
                      22 *
                      escalaTexto,
                    lineHeight:
                      28 *
                      escalaTexto,
                  },
                  pantallaPequena &&
                    escalaTexto === 1 &&
                    styles.greetingSmall,
                ]}
                accessibilityRole="header"
              >
                ¡Hola, {usuario.nombre}! 👋
              </Text>

              <Text
                style={[
                  styles.welcomeText,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      13 *
                      escalaTexto,
                    lineHeight:
                      18 *
                      escalaTexto,
                  },
                ]}
              >
                Qué bueno verte de nuevo
              </Text>
            </View>

            <View
              style={[
                styles.headerActions,
                contenidoEnColumna &&
                  styles.headerActionsColumn,
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
                  color={colores.texto}
                />
              </TouchableOpacity>

              <BotonAccesibilidad />
            </View>
          </View>

          <View
            style={[
              styles.progressCard,
              {
                backgroundColor:
                  temaOscuro
                    ? colores.fondoPrimario
                    : '#F1E8FF',
                borderColor:
                  altoContraste
                    ? colores.borde
                    : 'transparent',
              },
              contenidoEnColumna &&
                styles.progressCardColumn,
            ]}
          >
            <View
              style={
                styles.progressInformation
              }
            >
              <Text
                style={[
                  styles.progressLabel,
                  {
                    color: colorAzul,
                    fontSize:
                      14 *
                      escalaTexto,
                  },
                ]}
              >
                Sigue aprendiendo
              </Text>

              <Text
                style={[
                  styles.progressTitle,
                  {
                    color: colores.texto,
                    fontSize:
                      16 *
                      escalaTexto,
                    lineHeight:
                      21 *
                      escalaTexto,
                  },
                  contenidoEnColumna && {
                    maxWidth: '100%',
                    marginTop: 16,
                  },
                ]}
              >
                Aún no tienes actividades
                pendientes
              </Text>
            </View>

            <Text
              style={[
                styles.studentIllustration,
                pantallaPequena &&
                  styles.studentIllustrationSmall,
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              👩‍🎓
            </Text>
          </View>

          <Text
            style={[
              styles.sectionTitle,
              {
                color: colores.texto,
                fontSize:
                  17 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Resumen de hoy
          </Text>

          <View
            style={[
              styles.statsRow,
              tarjetasResumenEnColumna &&
                styles.statsColumn,
            ]}
          >
            <TarjetaResumen
              icono="clipboard"
              titulo="Actividades pendientes"
              valor={0}
              color={colorAzul}
              fondoIcono={fondoAzul}
              enColumna={
                tarjetasResumenEnColumna
              }
              etiquetaAccesibilidad="Cero actividades pendientes"
            />

            <TarjetaResumen
              icono="book-outline"
              titulo="Lecciones en progreso"
              valor={0}
              color={colorVerde}
              fondoIcono={fondoVerde}
              enColumna={
                tarjetasResumenEnColumna
              }
              etiquetaAccesibilidad="Cero lecciones en progreso"
            />

            <TarjetaResumen
              icono="star"
              titulo="Puntos totales"
              valor={0}
              color={colorAmarillo}
              fondoIcono={fondoAmarillo}
              enColumna={
                tarjetasResumenEnColumna
              }
              etiquetaAccesibilidad="Cero puntos totales"
            />
          </View>

          <Text
            style={[
              styles.sectionTitle,
              {
                color: colores.texto,
                fontSize:
                  17 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Próxima actividad
          </Text>

          <View
            style={[
              styles.emptyActivityCard,
              {
                backgroundColor:
                  colores.tarjeta,
                borderColor:
                  colores.borde,
              },
              contenidoEnColumna &&
                styles.emptyActivityColumn,
            ]}
            accessible
            accessibilityLabel="No tienes actividades próximas. Las actividades que te asigne tu docente aparecerán aquí."
          >
            <View
              style={[
                styles.emptyActivityIcon,
                {
                  backgroundColor:
                    colores.fondoPrimario,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={32}
                color={
                  colores.textoSecundario
                }
              />
            </View>

            <View
              style={[
                styles.emptyActivityInformation,
                contenidoEnColumna &&
                  styles.emptyInformationColumn,
              ]}
            >
              <Text
                style={[
                  styles.emptyActivityTitle,
                  {
                    color: colores.texto,
                    fontSize:
                      15 *
                      escalaTexto,
                  },
                ]}
              >
                No tienes actividades
                próximas
              </Text>

              <Text
                style={[
                  styles.emptyActivityText,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      12 *
                      escalaTexto,
                    lineHeight:
                      17 *
                      escalaTexto,
                  },
                ]}
              >
                Las actividades que te
                asigne tu docente
                aparecerán aquí.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            {
              minHeight:
                altoNavegacion,
              backgroundColor:
                colores.tarjeta,
              borderTopColor:
                colores.borde,
            },
          ]}
        >
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
  },

  screen: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 14,
  },

  content: {
    flexGrow: 1,
    paddingTop: 24,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },

  headerColumn: {
    flexDirection: 'column',
  },

  greetingContainer: {
    flex: 1,
    paddingRight: 10,
  },

  greeting: {
    fontWeight: '800',
  },

  greetingSmall: {
    fontSize: 19,
  },

  welcomeText: {
    fontWeight: '600',
    marginTop: 8,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  headerActionsColumn: {
    alignSelf: 'flex-end',
    marginTop: 14,
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressCard: {
    minHeight: 130,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 26,
  },

  progressCardColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },

  progressInformation: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },

  progressLabel: {
    fontWeight: '800',
  },

  progressTitle: {
    maxWidth: 180,
    fontWeight: '800',
  },

  studentIllustration: {
    fontSize: 72,
    marginLeft: 8,
  },

  studentIllustrationSmall: {
    fontSize: 58,
  },

  sectionTitle: {
    fontWeight: '800',
    marginBottom: 14,
  },

  /*
   * Las tarjetas ocupan exactamente el
   * ancho disponible de la pantalla.
   */
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },

  statsColumn: {
    flexDirection: 'column',
    gap: 10,
  },

  statCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 145,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 3,
    paddingVertical: 12,
  },

  statCardColumn: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: '100%',
    minHeight: 130,
  },

  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  statName: {
    width: '100%',
    minWidth: 0,
    flexShrink: 1,
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 44,
  },

  statValue: {
    fontWeight: '800',
    marginTop: 5,
  },

  emptyActivityCard: {
    minHeight: 105,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  emptyActivityColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  emptyActivityIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  emptyActivityInformation: {
    flex: 1,
  },

  emptyInformationColumn: {
    marginTop: 12,
  },

  emptyActivityTitle: {
    fontWeight: '800',
    marginBottom: 6,
  },

  emptyActivityText: {},

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 5,
  },

  navContent: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
  },

  navItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },

  navText: {
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },

  navTextActive: {
    fontWeight: '800',
  },
});