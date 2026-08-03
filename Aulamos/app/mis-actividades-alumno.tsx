import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BotonAccesibilidad from "../components/BotonAccesibilidad";
import { api } from "../services/api";

type FiltroActividad = "Todas" | "Pendientes" | "Entregadas";

type ActividadAlumno = {
  id_actividad: number;
  id_curso: number;
  id_periodo: number | null;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  tipo: "Tarea" | "Ejercicio" | "Lectura" | "Proyecto" | "Evaluacion";
  fecha_publicacion: string;
  fecha_limite: string;
  puntaje_maximo: number | string;
  permite_entrega_archivo: boolean | number;
  estado_actividad: string;
  estado_alumno: string;
  nombre_curso: string;
  materia: string;
  grupo: string;
  periodo: string | null;
  vencida: boolean | number;
};

type ResumenActividades = {
  total: number;
  pendientes: number;
  entregadas: number;
  vencidas: number;
};

type RespuestaMisActividades = {
  actividades?: ActividadAlumno[];
  resumen?: ResumenActividades;
  mensaje?: string;
};

type RespuestaError = {
  mensaje?: string;
  error?: string;
};

type IoniconName = keyof typeof Ionicons.glyphMap;

const ESTADOS_TERMINADOS = ["Entregada", "Calificada", "Completada"];

const RESUMEN_VACIO: ResumenActividades = {
  total: 0,
  pendientes: 0,
  entregadas: 0,
  vencidas: 0,
};

const normalizarFecha = (fecha: string) => {
  if (!fecha) {
    return null;
  }

  const fechaNormalizada = fecha.includes("T")
    ? fecha
    : fecha.replace(" ", "T");

  const resultado = new Date(fechaNormalizada);

  return Number.isNaN(resultado.getTime()) ? null : resultado;
};

const mostrarFecha = (fecha: string) => {
  const fechaConvertida = normalizarFecha(fecha);

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

const obtenerMensajeError = (error: unknown) => {
  if (axios.isAxiosError<RespuestaError>(error)) {
    if (error.response?.data?.mensaje) {
      return error.response.data.mensaje;
    }

    if (error.response?.data?.error) {
      return error.response.data.error;
    }

    if (!error.response) {
      return "No se pudo conectar con el servidor. Verifica que el backend esté encendido y que el celular y la computadora estén en la misma red Wi-Fi.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudieron cargar tus actividades.";
};

const esActividadTerminada = (actividad: ActividadAlumno) =>
  ESTADOS_TERMINADOS.includes(actividad.estado_alumno);

const esActividadVencida = (actividad: ActividadAlumno) =>
  Number(actividad.vencida) === 1;

const obtenerPresentacionTipo = (
  tipo: ActividadAlumno["tipo"],
): {
  icono: IoniconName;
  fondo: string;
  color: string;
  etiqueta: string;
} => {
  switch (tipo) {
    case "Ejercicio":
      return {
        icono: "create",
        fondo: "#DDF8F4",
        color: "#20A99D",
        etiqueta: "Ejercicio",
      };

    case "Lectura":
      return {
        icono: "book",
        fondo: "#FFF3D7",
        color: "#E89B00",
        etiqueta: "Lectura",
      };

    case "Proyecto":
      return {
        icono: "folder-open",
        fondo: "#ECE8FF",
        color: "#7059F5",
        etiqueta: "Proyecto",
      };

    case "Evaluacion":
      return {
        icono: "document-text",
        fondo: "#FFE5E8",
        color: "#E54859",
        etiqueta: "Evaluación",
      };

    default:
      return {
        icono: "clipboard",
        fondo: "#EAF1FF",
        color: "#4A7CFF",
        etiqueta: "Tarea",
      };
  }
};

export default function MisActividadesAlumnoScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [actividades, setActividades] = useState<ActividadAlumno[]>([]);

  const [resumen, setResumen] = useState<ResumenActividades>(RESUMEN_VACIO);

  const [filtro, setFiltro] = useState<FiltroActividad>("Todas");

  const [cargando, setCargando] = useState(true);

  const [actualizando, setActualizando] = useState(false);

  const margenHorizontal = width < 360 ? 14 : width < 400 ? 18 : 22;

  const anchoContenido = Math.min(width - margenHorizontal * 2, 520);

  const cargarActividades = useCallback(async (esActualizacion = false) => {
    try {
      if (esActualizacion) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        throw new Error("No se encontró tu sesión. Inicia sesión nuevamente.");
      }

      const respuesta = await api.get<RespuestaMisActividades>(
        "/academico/actividades/mis-actividades-alumno",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setActividades(respuesta.data.actividades ?? []);

      setResumen(respuesta.data.resumen ?? RESUMEN_VACIO);
    } catch (error) {
      Alert.alert(
        "No se pudieron cargar las actividades",
        obtenerMensajeError(error),
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    void cargarActividades();
  }, [cargarActividades]);

  const actividadesFiltradas = useMemo(() => {
    if (filtro === "Pendientes") {
      return actividades.filter(
        (actividad) => !esActividadTerminada(actividad),
      );
    }

    if (filtro === "Entregadas") {
      return actividades.filter(esActividadTerminada);
    }

    return actividades;
  }, [actividades, filtro]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: 104 + Math.max(insets.bottom, 8),
          },
        ]}
        showsVerticalScrollIndicator
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => void cargarActividades(true)}
            colors={["#4A7CFF"]}
            tintColor="#4A7CFF"
          />
        }
      >
        <View
          style={[
            styles.contentContainer,
            {
              width: anchoContenido,
            },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Regresar"
            >
              <Ionicons name="arrow-back" size={23} color="#273449" />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.title}>Mis actividades</Text>

              <Text style={styles.subtitle}>
                Consulta tus trabajos asignados
              </Text>
            </View>

            <BotonAccesibilidad />
          </View>

          <View style={styles.summaryRow}>
            <SummaryCard
              label="Pendientes"
              value={resumen.pendientes}
              icon="time-outline"
              color="#4A7CFF"
              background="#EAF1FF"
            />

            <SummaryCard
              label="Entregadas"
              value={resumen.entregadas}
              icon="checkmark-circle-outline"
              color="#20A99D"
              background="#DDF8F4"
            />

            <SummaryCard
              label="Vencidas"
              value={resumen.vencidas}
              icon="alert-circle-outline"
              color="#E54859"
              background="#FFE5E8"
            />
          </View>

          <View style={styles.filterRow}>
            {(["Todas", "Pendientes", "Entregadas"] as FiltroActividad[]).map(
              (opcion) => (
                <TouchableOpacity
                  key={opcion}
                  style={[
                    styles.filterButton,
                    filtro === opcion && styles.filterButtonActive,
                  ]}
                  onPress={() => setFiltro(opcion)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: filtro === opcion,
                  }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filtro === opcion && styles.filterTextActive,
                    ]}
                  >
                    {opcion}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>

          {cargando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A7CFF" />

              <Text style={styles.loadingText}>
                Cargando tus actividades...
              </Text>
            </View>
          ) : actividadesFiltradas.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="clipboard-outline" size={34} color="#4A7CFF" />
              </View>

              <Text style={styles.emptyTitle}>No hay actividades</Text>

              <Text style={styles.emptyText}>
                {filtro === "Todas"
                  ? "Cuando un docente publique una actividad aparecerá aquí."
                  : `No tienes actividades ${filtro.toLowerCase()}.`}
              </Text>
            </View>
          ) : (
            actividadesFiltradas.map((actividad) => (
              <ActividadCard
                key={actividad.id_actividad}
                actividad={actividad}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomNavigation,
          {
            height: 66 + Math.max(insets.bottom, 5),
            paddingBottom: Math.max(insets.bottom, 5),
          },
        ]}
      >
        <View
          style={[
            styles.bottomContent,
            {
              width: anchoContenido,
            },
          ]}
        >
          <BottomItem
            icon="home-outline"
            activeIcon="home"
            label="Inicio"
            onPress={() => router.replace("/inicio-alumno" as never)}
          />

          <BottomItem
            icon="reader-outline"
            activeIcon="reader"
            label="Actividades"
            active
            onPress={() => {
              // Ya está en Mis actividades.
            }}
          />

          <BottomItem
            icon="book-outline"
            activeIcon="book"
            label="Biblioteca"
            onPress={() => {
              router.push("/bibloteca-alumno" as never);
            }}
          />

          <BottomItem
            icon="stats-chart-outline"
            activeIcon="stats-chart"
            label="Avances"
            onPress={() => router.push("/mis-avances" as never)}
          />

          <BottomItem
            icon="menu-outline"
            activeIcon="menu"
            label="Más"
            onPress={() => router.push("/menu-alumno" as never)}
          />
        </View>
      </View>
    </View>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  icon: IoniconName;
  color: string;
  background: string;
};

function SummaryCard({
  label,
  value,
  icon,
  color,
  background,
}: SummaryCardProps) {
  return (
    <View style={styles.summaryCard} accessibilityLabel={`${label}: ${value}`}>
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor: background,
          },
        ]}
      >
        <Ionicons name={icon} size={19} color={color} />
      </View>

      <Text style={styles.summaryValue}>{value}</Text>

      <Text style={styles.summaryLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

type ActividadCardProps = {
  actividad: ActividadAlumno;
};

function ActividadCard({ actividad }: ActividadCardProps) {
  const presentacion = obtenerPresentacionTipo(actividad.tipo);

  const terminada = esActividadTerminada(actividad);

  const vencida = esActividadVencida(actividad);

  const estadoTexto = vencida
    ? "Vencida"
    : terminada
      ? actividad.estado_alumno
      : actividad.estado_alumno || "Pendiente";

  const estadoEstilo = vencida
    ? styles.statusExpired
    : terminada
      ? styles.statusCompleted
      : styles.statusPending;

  return (
    <TouchableOpacity
      style={styles.activityCard}
      onPress={() =>
        router.push({
          pathname: "/detalle-actividad",
          params: {
            id_actividad: String(actividad.id_actividad),
          },
        } as never)
      }
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={`Abrir actividad ${actividad.titulo}`}
      accessibilityHint="Muestra la descripción, instrucciones, fecha límite y estado de la actividad"
    >
      <View style={styles.activityCardHeader}>
        <View
          style={[
            styles.activityIconBox,
            {
              backgroundColor: presentacion.fondo,
            },
          ]}
        >
          <Ionicons
            name={presentacion.icono}
            size={22}
            color={presentacion.color}
          />
        </View>

        <View style={styles.activityHeaderText}>
          <Text style={styles.subjectText} numberOfLines={1}>
            {actividad.materia}
            {" · "}
            {actividad.grupo}
          </Text>

          <Text style={styles.typeText}>{presentacion.etiqueta}</Text>
        </View>

        <View style={[styles.statusBadge, estadoEstilo]}>
          <Text style={styles.statusText}>{estadoTexto}</Text>
        </View>
      </View>

      <Text style={styles.activityTitle}>{actividad.titulo}</Text>

      {!!actividad.descripcion && (
        <Text style={styles.activityDescription} numberOfLines={2}>
          {actividad.descripcion}
        </Text>
      )}

      <View style={styles.activityDivider} />

      <View style={styles.activityInfoRow}>
        <View style={styles.activityInfoItem}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={vencida ? "#E54859" : "#697589"}
          />

          <Text
            style={[styles.activityInfoText, vencida && styles.expiredText]}
          >
            {mostrarFecha(actividad.fecha_limite)}
          </Text>
        </View>

        <View style={styles.activityInfoItem}>
          <Ionicons name="star-outline" size={16} color="#697589" />

          <Text style={styles.activityInfoText}>
            {Number(actividad.puntaje_maximo)}
            {" pts"}
          </Text>
        </View>
      </View>

      <Text style={styles.courseText} numberOfLines={1}>
        {actividad.nombre_curso}
        {actividad.periodo ? ` · ${actividad.periodo}` : ""}
      </Text>
    </TouchableOpacity>
  );
}

type BottomItemProps = {
  icon: IoniconName;
  activeIcon: IoniconName;
  label: string;
  active?: boolean;
  onPress: () => void;
};

function BottomItem({
  icon,
  activeIcon,
  label,
  active = false,
  onPress,
}: BottomItemProps) {
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
          active && styles.bottomIconContainerActive,
        ]}
      >
        <Ionicons
          name={active ? activeIcon : icon}
          size={21}
          color={active ? "#2563EB" : "#8B98AA"}
        />
      </View>

      <Text
        style={[styles.bottomLabel, active && styles.bottomLabelActive]}
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
    backgroundColor: "#F8FAFC",
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    alignItems: "center",
  },

  contentContainer: {
    alignSelf: "center",
  },

  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  headerButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },

  headerText: {
    flex: 1,
    paddingHorizontal: 4,
  },

  title: {
    color: "#1F2A3A",
    fontSize: 21,
    fontWeight: "800",
  },

  subtitle: {
    marginTop: 2,
    color: "#7C8798",
    fontSize: 12,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 18,
  },

  summaryCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E6EAF0",
    borderRadius: 13,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  summaryIcon: {
    width: 34,
    height: 34,
    marginBottom: 7,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  summaryValue: {
    color: "#1F2A3A",
    fontSize: 18,
    fontWeight: "800",
  },

  summaryLabel: {
    marginTop: 2,
    color: "#7C8798",
    fontSize: 10,
    fontWeight: "600",
  },

  filterRow: {
    flexDirection: "row",
    padding: 4,
    marginBottom: 16,
    borderRadius: 11,
    backgroundColor: "#EDEFF4",
  },

  filterButton: {
    flex: 1,
    minHeight: 37,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },

  filterButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F2937",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },

  filterText: {
    color: "#7C8798",
    fontSize: 12,
    fontWeight: "600",
  },

  filterTextActive: {
    color: "#2563EB",
    fontWeight: "800",
  },

  loadingContainer: {
    minHeight: 280,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#7C8798",
    fontSize: 13,
  },

  emptyCard: {
    minHeight: 255,
    padding: 28,
    borderWidth: 1,
    borderColor: "#E6EAF0",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  emptyIconBox: {
    width: 64,
    height: 64,
    marginBottom: 15,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EAF1FF",
  },

  emptyTitle: {
    color: "#1F2A3A",
    fontSize: 17,
    fontWeight: "800",
  },

  emptyText: {
    maxWidth: 280,
    marginTop: 7,
    color: "#7C8798",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  activityCard: {
    marginBottom: 13,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E6EAF0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    shadowColor: "#26334A",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },

  activityCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  activityIconBox: {
    width: 43,
    height: 43,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  activityHeaderText: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
  },

  subjectText: {
    color: "#344054",
    fontSize: 12,
    fontWeight: "700",
  },

  typeText: {
    marginTop: 3,
    color: "#8A94A4",
    fontSize: 10,
  },

  statusBadge: {
    maxWidth: 82,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 20,
  },

  statusPending: {
    backgroundColor: "#EAF1FF",
  },

  statusCompleted: {
    backgroundColor: "#DDF8F4",
  },

  statusExpired: {
    backgroundColor: "#FFE5E8",
  },

  statusText: {
    color: "#344054",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },

  activityTitle: {
    marginTop: 13,
    color: "#1F2A3A",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },

  activityDescription: {
    marginTop: 5,
    color: "#697589",
    fontSize: 12,
    lineHeight: 17,
  },

  activityDivider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: "#EEF0F4",
  },

  activityInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },

  activityInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  activityInfoText: {
    color: "#697589",
    fontSize: 10,
    fontWeight: "600",
  },

  expiredText: {
    color: "#E54859",
  },

  courseText: {
    marginTop: 10,
    color: "#8A94A4",
    fontSize: 10,
  },

  bottomNavigation: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "#E7EAF0",
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "#FFFFFF",
  },

  bottomContent: {
    height: 61,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  bottomItem: {
    flex: 1,
    minWidth: 0,
    height: 58,
    justifyContent: "center",
    alignItems: "center",
  },

  bottomIconContainer: {
    width: 36,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  bottomIconContainerActive: {
    backgroundColor: "#EAF1FF",
  },

  bottomLabel: {
    maxWidth: "100%",
    marginTop: 1,
    color: "#8B98AA",
    fontSize: 9,
    fontWeight: "600",
  },

  bottomLabelActive: {
    color: "#2563EB",
    fontWeight: "800",
  },
});