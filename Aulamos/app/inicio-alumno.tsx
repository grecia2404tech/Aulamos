import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BotonAccesibilidad from "../components/BotonAccesibilidad";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { api } from "../services/api";

type IconoNombre = ComponentProps<typeof Ionicons>["name"];

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

interface ActividadAlumno {
  id_actividad: number;
  titulo: string;
  tipo: string;
  fecha_limite: string;
  estado_alumno: string;
  nombre_curso: string;
  materia: string;
  vencida: boolean | number;
}

interface ResumenActividades {
  total: number;
  pendientes: number;
  entregadas: number;
  vencidas: number;
}

interface RespuestaMisActividades {
  actividades?: ActividadAlumno[];
  resumen?: ResumenActividades;
}

const RESUMEN_VACIO: ResumenActividades = {
  total: 0,
  pendientes: 0,
  entregadas: 0,
  vencidas: 0,
};

const ESTADOS_TERMINADOS = ["Entregada", "Calificada", "Completada"];

const convertirFecha = (fecha: string) => {
  const fechaNormalizada = fecha.includes("T")
    ? fecha
    : fecha.replace(" ", "T");

  const fechaConvertida = new Date(fechaNormalizada);

  return Number.isNaN(fechaConvertida.getTime()) ? null : fechaConvertida;
};

const mostrarFecha = (fecha: string) => {
  const fechaConvertida = convertirFecha(fecha);

  if (!fechaConvertida) {
    return "Fecha no disponible";
  }

  return fechaConvertida.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function BotonNavegacion({
  icono,
  texto,
  activo = false,
  onPress,
}: BotonNavegacionProps) {
  const { colores, escalaTexto, preferencias } = useAccessibility();

  const colorActivo = preferencias.altoContraste
    ? colores.primario
    : preferencias.modoOscuro
      ? "#60A5FA"
      : "#2563EB";

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
        color={activo ? colorActivo : colores.textoSecundario}
      />

      <Text
        style={[
          styles.navText,
          {
            color: activo ? colorActivo : colores.textoSecundario,
            fontSize: 10 * escalaTexto,
            lineHeight: 12 * escalaTexto,
          },
          activo && styles.navTextActive,
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
  const { colores, escalaTexto } = useAccessibility();

  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
        enColumna && styles.statCardColumn,
      ]}
      accessible
      accessibilityLabel={etiquetaAccesibilidad}
    >
      <View
        style={[
          styles.statIconBox,
          {
            backgroundColor: fondoIcono,
          },
        ]}
      >
        <Ionicons name={icono} size={23} color={color} />
      </View>

      <Text
        style={[
          styles.statName,
          {
            color: colores.texto,
            fontSize: 10.5 * escalaTexto,
            lineHeight: 14 * escalaTexto,
          },
        ]}
        numberOfLines={enColumna ? undefined : 3}
      >
        {titulo}
      </Text>

      <Text
        style={[
          styles.statValue,
          {
            color: colores.textoSecundario,
            fontSize: 17 * escalaTexto,
          },
        ]}
      >
        {valor}
      </Text>
    </View>
  );
}

export default function InicioAlumnoScreen() {
  const { width } = useWindowDimensions();

  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const [verificandoSesion, setVerificandoSesion] = useState(true);

  const [resumenActividades, setResumenActividades] =
    useState<ResumenActividades>(RESUMEN_VACIO);

  const [proximaActividad, setProximaActividad] =
    useState<ActividadAlumno | null>(null);

  const [cargandoActividades, setCargandoActividades] = useState(true);

  const { colores, escalaTexto, preferencias, leerTexto, detenerLectura } =
    useAccessibility();

  const pantallaPequena = width < 360;

  /*
   * Se utiliza para el encabezado,
   * la bienvenida y la actividad.
   */
  const contenidoEnColumna = pantallaPequena || escalaTexto > 1.2;

  /*
   * En tamaño normal siempre se muestran
   * las tres tarjetas en una fila.
   *
   * Solo cambian a columna cuando el usuario
   * selecciona texto grande o muy grande.
   */
  const tarjetasResumenEnColumna = escalaTexto > 1.2;

  const paddingHorizontal =
    width >= 768 ? Math.max(28, (width - 720) / 2) : pantallaPequena ? 14 : 22;

  const altoNavegacion = escalaTexto > 1.2 ? 104 : 76;

  const altoContraste = preferencias.altoContraste;

  const temaOscuro = preferencias.modoOscuro || altoContraste;

  const colorAzul = altoContraste
    ? colores.primario
    : temaOscuro
      ? "#60A5FA"
      : "#2563EB";

  const colorVerde = altoContraste
    ? colores.primario
    : temaOscuro
      ? "#4ADE80"
      : "#16A34A";

  const colorAmarillo = altoContraste
    ? colores.primario
    : temaOscuro
      ? "#FCD34D"
      : "#F59E0B";

  const fondoAzul = temaOscuro ? colores.fondoPrimario : "#DBEAFE";

  const fondoVerde = temaOscuro ? colores.fondoPrimario : "#DCFCE7";

  const fondoAmarillo = temaOscuro ? colores.fondoPrimario : "#FEF3C7";

  const cargarActividadesInicio = useCallback(async () => {
    try {
      setCargandoActividades(true);

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        return;
      }

      const respuesta = await api.get<RespuestaMisActividades>(
        "/academico/actividades/mis-actividades-alumno",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const actividades = respuesta.data.actividades ?? [];

      setResumenActividades(respuesta.data.resumen ?? RESUMEN_VACIO);

      const actividadesPendientes = actividades
        .filter((actividad) => {
          const estaTerminada = ESTADOS_TERMINADOS.includes(
            actividad.estado_alumno,
          );

          const estaVencida = Number(actividad.vencida) === 1;

          return !estaTerminada && !estaVencida;
        })
        .sort((primeraActividad, segundaActividad) => {
          const primeraFecha = convertirFecha(primeraActividad.fecha_limite);

          const segundaFecha = convertirFecha(segundaActividad.fecha_limite);

          return (
            (primeraFecha?.getTime() ?? Number.MAX_SAFE_INTEGER) -
            (segundaFecha?.getTime() ?? Number.MAX_SAFE_INTEGER)
          );
        });

      setProximaActividad(actividadesPendientes[0] ?? null);
    } catch (error) {
      console.error("Error al cargar el resumen del alumno:", error);

      Alert.alert(
        "No se pudo actualizar el inicio",
        "Verifica que el backend esté encendido y que el celular y la computadora estén conectados a la misma red Wi-Fi.",
      );
    } finally {
      setCargandoActividades(false);
    }
  }, []);

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        const usuarioGuardado = await AsyncStorage.getItem("usuario");

        if (!token || !usuarioGuardado) {
          router.replace("/" as any);
          return;
        }

        const datosUsuario: Usuario = JSON.parse(usuarioGuardado);

        if (datosUsuario.rol !== "Alumno") {
          if (datosUsuario.rol === "Docente") {
            router.replace("/inicio-docente" as any);
          } else {
            router.replace("/" as any);
          }

          return;
        }

        setUsuario(datosUsuario);
      } catch (error) {
        console.error("Error al recuperar la sesión:", error);

        await AsyncStorage.multiRemove(["token", "usuario"]);

        router.replace("/" as any);
      } finally {
        setVerificandoSesion(false);
      }
    };

    cargarUsuario();
  }, []);

  /*
   * Actualiza el resumen al abrir Inicio y
   * también cuando el alumno regresa desde
   * la pantalla de Mis actividades.
   */
  useFocusEffect(
    useCallback(() => {
      void cargarActividadesInicio();
    }, [cargarActividadesInicio]),
  );

  useFocusEffect(
    useCallback(() => {
      if (preferencias.lectorPantalla && usuario && !cargandoActividades) {
        const mensajeProximaActividad = proximaActividad
          ? `La próxima actividad es ${proximaActividad.titulo}, con fecha límite ${mostrarFecha(proximaActividad.fecha_limite)}.`
          : "No tienes actividades próximas.";

        leerTexto(
          `Hola ${usuario.nombre}. Qué bueno verte de nuevo. Tienes ${resumenActividades.pendientes} actividades pendientes. ${mensajeProximaActividad}`,
        );
      }

      return () => {
        detenerLectura();
      };
    }, [
      preferencias.lectorPantalla,
      usuario,
      cargandoActividades,
      resumenActividades.pendientes,
      proximaActividad,
      leerTexto,
      detenerLectura,
    ]),
  );

  const mostrarProximamente = (seccion: string) => {
    Alert.alert(seccion, "Esta sección estará disponible próximamente.");
  };

  const cerrarSesion = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro de que deseas cerrar sesión?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          try {
            detenerLectura();

            await AsyncStorage.multiRemove(["token", "usuario"]);

            router.replace("/" as any);
          } catch (error) {
            console.error("Error al cerrar sesión:", error);

            Alert.alert("No se pudo cerrar sesión", "Inténtalo nuevamente.");
          }
        },
      },
    ]);
  };

  if (verificandoSesion) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          {
            backgroundColor: colores.fondo,
          },
        ]}
      >
        <ActivityIndicator size="large" color={colorAzul} />

        <Text
          style={[
            styles.loadingText,
            {
              color: colores.textoSecundario,
              fontSize: 15 * escalaTexto,
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
          backgroundColor: colores.fondo,
        },
      ]}
    >
      <View
        style={[
          styles.screen,
          {
            backgroundColor: colores.fondo,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal,
              paddingBottom: altoNavegacion + 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[styles.header, contenidoEnColumna && styles.headerColumn]}
          >
            <View style={styles.greetingContainer}>
              <Text
                style={[
                  styles.greeting,
                  {
                    color: colores.texto,
                    fontSize: 22 * escalaTexto,
                    lineHeight: 28 * escalaTexto,
                  },
                  pantallaPequena && escalaTexto === 1 && styles.greetingSmall,
                ]}
                accessibilityRole="header"
              >
                ¡Hola, {usuario.nombre}! 👋
              </Text>

              <Text
                style={[
                  styles.welcomeText,
                  {
                    color: colores.textoSecundario,
                    fontSize: 13 * escalaTexto,
                    lineHeight: 18 * escalaTexto,
                  },
                ]}
              >
                Qué bueno verte de nuevo
              </Text>
            </View>

            <View
              style={[
                styles.headerActions,
                contenidoEnColumna && styles.headerActionsColumn,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.headerButton,
                  {
                    backgroundColor: colores.tarjeta,
                    borderColor: colores.borde,
                  },
                ]}
                onPress={() => mostrarProximamente("Notificaciones")}
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

          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                backgroundColor: colores.tarjeta,
                borderColor: altoContraste ? colores.texto : "#DC2626",
              },
            ]}
            onPress={cerrarSesion}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            accessibilityHint="Cierra tu sesión y regresa a la pantalla de inicio"
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={altoContraste ? colores.texto : "#DC2626"}
            />

            <Text
              style={[
                styles.logoutButtonText,
                {
                  color: altoContraste ? colores.texto : "#DC2626",
                  fontSize: 13 * escalaTexto,
                  lineHeight: 18 * escalaTexto,
                },
              ]}
            >
              Cerrar sesión
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.progressCard,
              {
                backgroundColor: temaOscuro ? colores.fondoPrimario : "#F1E8FF",
                borderColor: altoContraste ? colores.borde : "transparent",
              },
              contenidoEnColumna && styles.progressCardColumn,
            ]}
          >
            <View style={styles.progressInformation}>
              <Text
                style={[
                  styles.progressLabel,
                  {
                    color: colorAzul,
                    fontSize: 14 * escalaTexto,
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
                    fontSize: 16 * escalaTexto,
                    lineHeight: 21 * escalaTexto,
                  },
                  contenidoEnColumna && {
                    maxWidth: "100%",
                    marginTop: 16,
                  },
                ]}
              >
                {cargandoActividades
                  ? "Cargando tus actividades..."
                  : resumenActividades.pendientes > 0
                    ? `Tienes ${resumenActividades.pendientes} ${
                        resumenActividades.pendientes === 1
                          ? "actividad pendiente"
                          : "actividades pendientes"
                      }`
                    : "Aún no tienes actividades pendientes"}
              </Text>
            </View>

            <Text
              style={[
                styles.studentIllustration,
                pantallaPequena && styles.studentIllustrationSmall,
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
                fontSize: 17 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Resumen de hoy
          </Text>

          <View
            style={[
              styles.statsRow,
              tarjetasResumenEnColumna && styles.statsColumn,
            ]}
          >
            <TarjetaResumen
              icono="clipboard"
              titulo="Actividades pendientes"
              valor={resumenActividades.pendientes}
              color={colorAzul}
              fondoIcono={fondoAzul}
              enColumna={tarjetasResumenEnColumna}
              etiquetaAccesibilidad={`${resumenActividades.pendientes} actividades pendientes`}
            />

            <TarjetaResumen
              icono="book-outline"
              titulo="Lecciones en progreso"
              valor={0}
              color={colorVerde}
              fondoIcono={fondoVerde}
              enColumna={tarjetasResumenEnColumna}
              etiquetaAccesibilidad="Cero lecciones en progreso"
            />

            <TarjetaResumen
              icono="star"
              titulo="Puntos totales"
              valor={0}
              color={colorAmarillo}
              fondoIcono={fondoAmarillo}
              enColumna={tarjetasResumenEnColumna}
              etiquetaAccesibilidad="Cero puntos totales"
            />
          </View>

          <Text
            style={[
              styles.sectionTitle,
              {
                color: colores.texto,
                fontSize: 17 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Próxima actividad
          </Text>

          {cargandoActividades ? (
            <View
              style={[
                styles.emptyActivityCard,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                  justifyContent: "center",
                },
              ]}
              accessible
              accessibilityLabel="Cargando la próxima actividad"
            >
              <ActivityIndicator size="small" color={colorAzul} />

              <Text
                style={[
                  styles.loadingActivityText,
                  {
                    color: colores.textoSecundario,
                    fontSize: 13 * escalaTexto,
                  },
                ]}
              >
                Cargando actividad...
              </Text>
            </View>
          ) : proximaActividad ? (
            <TouchableOpacity
              style={[
                styles.emptyActivityCard,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
                contenidoEnColumna && styles.emptyActivityColumn,
              ]}
              onPress={() =>
                router.push({
                  pathname:
                    "/detalle-actividad",
                  params: {
                    id_actividad:
                      String(
                        proximaActividad.id_actividad,
                      ),
                  },
                } as never)
              }
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Próxima actividad: ${proximaActividad.titulo}. ${proximaActividad.materia}. Fecha límite ${mostrarFecha(proximaActividad.fecha_limite)}. Abrir detalle de la actividad.`}
            >
              <View
                style={[
                  styles.emptyActivityIcon,
                  {
                    backgroundColor: fondoAzul,
                  },
                ]}
              >
                <Ionicons
                  name="clipboard-outline"
                  size={32}
                  color={colorAzul}
                />
              </View>

              <View
                style={[
                  styles.emptyActivityInformation,
                  contenidoEnColumna && styles.emptyInformationColumn,
                ]}
              >
                <Text
                  style={[
                    styles.activityType,
                    {
                      color: colorAzul,
                      fontSize: 11 * escalaTexto,
                    },
                  ]}
                >
                  {proximaActividad.tipo}
                  {" · "}
                  {proximaActividad.materia}
                </Text>

                <Text
                  style={[
                    styles.emptyActivityTitle,
                    {
                      color: colores.texto,
                      fontSize: 15 * escalaTexto,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {proximaActividad.titulo}
                </Text>

                <Text
                  style={[
                    styles.emptyActivityText,
                    {
                      color: colores.textoSecundario,
                      fontSize: 12 * escalaTexto,
                      lineHeight: 17 * escalaTexto,
                    },
                  ]}
                >
                  Entrega: {mostrarFecha(proximaActividad.fecha_limite)}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={24}
                color={colorAzul}
                style={styles.activityChevron}
              />
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.emptyActivityCard,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
                contenidoEnColumna && styles.emptyActivityColumn,
              ]}
              accessible
              accessibilityLabel="No tienes actividades próximas. Las actividades que te asigne tu docente aparecerán aquí."
            >
              <View
                style={[
                  styles.emptyActivityIcon,
                  {
                    backgroundColor: colores.fondoPrimario,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={32}
                  color={colores.textoSecundario}
                />
              </View>

              <View
                style={[
                  styles.emptyActivityInformation,
                  contenidoEnColumna && styles.emptyInformationColumn,
                ]}
              >
                <Text
                  style={[
                    styles.emptyActivityTitle,
                    {
                      color: colores.texto,
                      fontSize: 15 * escalaTexto,
                    },
                  ]}
                >
                  No tienes actividades próximas
                </Text>

                <Text
                  style={[
                    styles.emptyActivityText,
                    {
                      color: colores.textoSecundario,
                      fontSize: 12 * escalaTexto,
                      lineHeight: 17 * escalaTexto,
                    },
                  ]}
                >
                  Las actividades que te asigne tu docente aparecerán aquí.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            {
              minHeight: altoNavegacion,
              backgroundColor: colores.tarjeta,
              borderTopColor: colores.borde,
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
              onPress={() => router.push("/mis-actividades-alumno")}
            />

            <BotonNavegacion
              icono="book-outline"
              texto="Biblioteca"
              onPress={() => router.push("/bibloteca-alumno")}
            />

            <BotonNavegacion
              icono="stats-chart-outline"
              texto="Avances"
              onPress={() => router.push("/mis-avances")}
            />
            
            <BotonNavegacion
              icono="help-circle"
              texto="Chatbot"
              onPress={() => router.push("/chatbot")}
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
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 14,
  },

  content: {
    flexGrow: 1,
    paddingTop: 24,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },

  headerColumn: {
    flexDirection: "column",
  },

  greetingContainer: {
    flex: 1,
    paddingRight: 10,
  },

  greeting: {
    fontWeight: "800",
  },

  greetingSmall: {
    fontSize: 19,
  },

  welcomeText: {
    fontWeight: "600",
    marginTop: 8,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  headerActionsColumn: {
    alignSelf: "flex-end",
    marginTop: 14,
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  logoutButton: {
    minHeight: 44,
    alignSelf: "flex-end",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -10,
    marginBottom: 18,
  },

  logoutButtonText: {
    fontWeight: "800",
    marginLeft: 7,
  },

  progressCard: {
    minHeight: 130,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 26,
  },

  progressCardColumn: {
    flexDirection: "column",
    alignItems: "stretch",
  },

  progressInformation: {
    flex: 1,
    alignSelf: "stretch",
    justifyContent: "space-between",
    paddingVertical: 2,
  },

  progressLabel: {
    fontWeight: "800",
  },

  progressTitle: {
    maxWidth: 180,
    fontWeight: "800",
  },

  studentIllustration: {
    fontSize: 72,
    marginLeft: 8,
  },

  studentIllustrationSmall: {
    fontSize: 58,
  },

  sectionTitle: {
    fontWeight: "800",
    marginBottom: 14,
  },

  /*
   * Las tarjetas ocupan exactamente el
   * ancho disponible de la pantalla.
   */
  statsRow: {
    width: "100%",
    flexDirection: "row",
    gap: 6,
    marginBottom: 28,
  },

  statsColumn: {
    flexDirection: "column",
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
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 3,
    paddingVertical: 12,
  },

  statCardColumn: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    width: "100%",
    minHeight: 130,
  },

  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  statName: {
    width: "100%",
    minWidth: 0,
    flexShrink: 1,
    fontWeight: "700",
    textAlign: "center",
    minHeight: 44,
  },

  statValue: {
    fontWeight: "800",
    marginTop: 5,
  },

  emptyActivityCard: {
    minHeight: 105,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  emptyActivityColumn: {
    flexDirection: "column",
    alignItems: "flex-start",
  },

  emptyActivityIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  emptyActivityInformation: {
    flex: 1,
  },

  emptyInformationColumn: {
    marginTop: 12,
  },

  emptyActivityTitle: {
    fontWeight: "800",
    marginBottom: 6,
  },

  emptyActivityText: {},

  loadingActivityText: {
    marginLeft: 10,
    fontWeight: "700",
  },

  activityType: {
    fontWeight: "800",
    marginBottom: 5,
  },

  activityChevron: {
    marginLeft: 8,
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 5,
  },

  navContent: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    flexDirection: "row",
  },

  navItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 1,
  },

  navText: {
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },

  navTextActive: {
    fontWeight: "800",
  },
});
