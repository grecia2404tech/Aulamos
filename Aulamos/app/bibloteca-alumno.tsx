import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BotonAccesibilidad from "../components/BotonAccesibilidad";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { API_URL } from "../services/api";

type Recurso = {
  id_recurso: number;
  id_actividad: number | null;
  id_materia: number | null;
  id_curso: number | null;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  url_recurso: string | null;
  url_subtitulos: string | null;
  accesible: number | boolean;
  subtitulos_disponibles: number | boolean;
  fecha_publicacion: string;
  materia: string | null;
  curso: string | null;
  actividad: string | null;
  docente: string | null;
};

type RespuestaBiblioteca = {
  recursos?: Recurso[];
  mensaje?: string;
};

const FILTROS = ["Todos", "PDF", "Video", "Documento"] as const;
type Filtro = (typeof FILTROS)[number];

const TIPO_VISUAL: Record<
  string,
  {
    icono: keyof typeof Ionicons.glyphMap;
    color: string;
    fondo: string;
  }
> = {
  Video: {
    icono: "play-circle",
    color: "#0F766E",
    fondo: "#CCFBF1",
  },
  PDF: {
    icono: "document-text",
    color: "#DC2626",
    fondo: "#FEE2E2",
  },
  Documento: {
    icono: "document",
    color: "#6D28D9",
    fondo: "#EDE9FE",
  },
};

export default function BibliotecaAlumnoScreen() {
  const { width } = useWindowDimensions();
  const { colores, escalaTexto } = useAccessibility();

  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("Todos");
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const margenHorizontal = width < 360 ? 14 : width < 400 ? 18 : 22;
  const anchoContenido = Math.min(
    width - margenHorizontal * 2,
    560
  );
  const altoNavegacion = escalaTexto > 1.2 ? 104 : 76;

  const cargarBiblioteca = useCallback(
    async (mostrarCarga = true) => {
      try {
        if (mostrarCarga) {
          setCargando(true);
        }

        const token = await AsyncStorage.getItem("token");

        if (!token) {
          router.replace("/" as any);
          return;
        }

        const respuesta = await fetch(
          `${API_URL}/academico/recursos/biblioteca-alumno`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const resultado: RespuestaBiblioteca =
          await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje ||
              "No se pudo consultar la biblioteca."
          );
        }

        setRecursos(resultado.recursos ?? []);
      } catch (error) {
        Alert.alert(
          "No se pudo cargar la biblioteca",
          error instanceof Error
            ? error.message
            : "Verifica el servidor y la red Wi-Fi."
        );
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void cargarBiblioteca();
    }, [cargarBiblioteca])
  );

  const recursosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return recursos.filter((recurso) => {
      const coincideTipo =
        filtro === "Todos" || recurso.tipo === filtro;

      const coincideTexto =
        !texto ||
        recurso.titulo.toLowerCase().includes(texto) ||
        (recurso.materia ?? "").toLowerCase().includes(texto) ||
        (recurso.curso ?? "").toLowerCase().includes(texto) ||
        (recurso.actividad ?? "").toLowerCase().includes(texto) ||
        (recurso.docente ?? "").toLowerCase().includes(texto);

      return coincideTipo && coincideTexto;
    });
  }, [busqueda, filtro, recursos]);

  const abrirRecurso = async (recurso: Recurso) => {
    if (!recurso.url_recurso) {
      Alert.alert(
        "Archivo no disponible",
        "Este recurso no tiene un archivo asociado."
      );
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        router.replace("/" as any);
        return;
      }

      if (recurso.tipo === "Video") {
        router.push({
          pathname: "/reproductor-video" as any,
          params: {
            idRecurso: String(recurso.id_recurso),
          },
        });
        return;
      }

      /*
       * El registro es informativo. Si falla, el alumno
       * todavía puede abrir el recurso.
       */
      try {
        await fetch(
          `${API_URL}/academico/recursos/${recurso.id_recurso}/uso`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              accion_realizada: "Visualizó",
              tiempo_visualizacion_seg: 0,
              porcentaje_visualizado: 0,
            }),
          }
        );
      } catch (error) {
        console.warn(
          "No se pudo registrar el uso del recurso:",
          error
        );
      }

      await Linking.openURL(recurso.url_recurso);
    } catch {
      Alert.alert(
        "No se pudo abrir el recurso",
        "Comprueba tu conexión y que tengas una aplicación compatible con el archivo."
      );
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colores.fondo },
      ]}
    >
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={{
            alignItems: "center",
            paddingBottom: altoNavegacion + 28,
          }}
          refreshControl={
            <RefreshControl
              refreshing={actualizando}
              onRefresh={() => {
                setActualizando(true);
                void cargarBiblioteca(false);
              }}
              tintColor="#2D5BFF"
            />
          }
        >
          <View style={{ width: anchoContenido }}>
            <View style={styles.header}>
              <TouchableOpacity
                style={[
                  styles.headerButton,
                  {
                    backgroundColor: colores.tarjeta,
                    borderColor: colores.borde,
                  },
                ]}
                onPress={() => router.back()}
                accessibilityLabel="Regresar"
              >
                <Ionicons
                  name="arrow-back"
                  size={23}
                  color={colores.texto}
                />
              </TouchableOpacity>

              <View style={styles.headerText}>
                <Text
                  style={[
                    styles.title,
                    {
                      color: colores.texto,
                      fontSize: 22 * escalaTexto,
                    },
                  ]}
                >
                  Biblioteca digital
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: colores.textoSecundario },
                  ]}
                >
                  Material de tus materias y actividades
                </Text>
              </View>

              <BotonAccesibilidad />
            </View>

            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
            >
              <Ionicons
                name="search"
                size={20}
                color={colores.textoSecundario}
              />
              <TextInput
                style={[
                  styles.searchInput,
                  { color: colores.texto },
                ]}
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar recurso, materia o docente"
                placeholderTextColor={colores.textoSecundario}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {FILTROS.map((opcion) => {
                const activo = filtro === opcion;

                return (
                  <TouchableOpacity
                    key={opcion}
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor: activo
                          ? "#2D5BFF"
                          : colores.tarjeta,
                        borderColor: activo
                          ? "#2D5BFF"
                          : colores.borde,
                      },
                    ]}
                    onPress={() => setFiltro(opcion)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        {
                          color: activo ? "#FFFFFF" : colores.texto,
                        },
                      ]}
                    >
                      {opcion}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {cargando ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color="#2D5BFF" />
                <Text style={{ color: colores.textoSecundario, marginTop: 10 }}>
                  Cargando biblioteca...
                </Text>
              </View>
            ) : recursosFiltrados.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: colores.tarjeta,
                    borderColor: colores.borde,
                  },
                ]}
              >
                <Ionicons name="library-outline" size={48} color="#2D5BFF" />
                <Text style={[styles.emptyTitle, { color: colores.texto }]}>
                  Aún no hay recursos
                </Text>
                <Text style={[styles.emptyText, { color: colores.textoSecundario }]}>
                  Los materiales que publique tu docente aparecerán aquí.
                </Text>
              </View>
            ) : (
              recursosFiltrados.map((recurso) => {
                const visual = TIPO_VISUAL[recurso.tipo] ?? {
                  icono: "folder-open" as const,
                  color: "#2563EB",
                  fondo: "#DBEAFE",
                };

                return (
                  <TouchableOpacity
                    key={recurso.id_recurso}
                    style={[
                      styles.resourceCard,
                      {
                        backgroundColor: colores.tarjeta,
                        borderColor: colores.borde,
                      },
                    ]}
                    onPress={() => void abrirRecurso(recurso)}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir ${recurso.titulo}`}
                  >
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.typeIcon,
                          { backgroundColor: visual.fondo },
                        ]}
                      >
                        <Ionicons
                          name={visual.icono}
                          size={27}
                          color={visual.color}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resourceTitle, { color: colores.texto }]}>
                          {recurso.titulo}
                        </Text>
                        <Text style={[styles.resourceMeta, { color: colores.textoSecundario }]}>
                          {recurso.tipo}
                          {recurso.materia ? ` · ${recurso.materia}` : ""}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={22}
                        color={colores.textoSecundario}
                      />
                    </View>

                    {recurso.descripcion ? (
                      <Text
                        style={[styles.description, { color: colores.textoSecundario }]}
                        numberOfLines={3}
                      >
                        {recurso.descripcion}
                      </Text>
                    ) : null}

                    <View style={styles.tagsRow}>
                      {recurso.actividad ? (
                        <Tag icon="reader-outline" text={recurso.actividad} />
                      ) : (
                        <Tag
                          icon="school-outline"
                          text={recurso.curso ?? "Recurso del curso"}
                        />
                      )}
                      {recurso.docente ? (
                        <Tag icon="person-outline" text={recurso.docente} />
                      ) : null}
                      {Number(recurso.subtitulos_disponibles) === 1 ? (
                        <Tag icon="text-outline" text="Con subtítulos" />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
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
          <StudentNav icon="home-outline" label="Inicio" onPress={() => router.replace("/inicio-alumno" as any)} color={colores.textoSecundario} />
          <StudentNav icon="list-outline" label="Actividades" onPress={() => router.push("/mis-actividades-alumno" as any)} color={colores.textoSecundario} />
          <StudentNav icon="book" label="Biblioteca" active onPress={() => {}} color={colores.textoSecundario} />
          <StudentNav icon="stats-chart-outline" label="Avances"  onPress={() => router.push("/mis-avances" as any)} color={colores.textoSecundario} />
          <StudentNav icon="help-circle-outline" label="Chatbot" onPress={() => router.push("/chatbot" as any)} color={colores.textoSecundario} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Tag({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.tag}>
      <Ionicons name={icon} size={14} color="#4B5563" />
      <Text style={styles.tagText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function StudentNav({
  icon,
  label,
  active = false,
  onPress,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Ionicons
        name={icon}
        size={22}
        color={active ? "#2D5BFF" : color}
      />
      <Text
        style={[
          styles.navText,
          { color: active ? "#2D5BFF" : color },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, marginHorizontal: 12 },
  title: { fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 3 },
  searchBox: {
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  searchInput: { flex: 1, fontSize: 13 },
  filters: { gap: 8, paddingVertical: 14 },
  filterButton: {
    minHeight: 38,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: { fontSize: 12, fontWeight: "800" },
  centerState: { paddingVertical: 54, alignItems: "center" },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 30,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginTop: 12 },
  emptyText: { fontSize: 12, textAlign: "center", marginTop: 6 },
  resourceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  typeIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  resourceTitle: { fontSize: 14, fontWeight: "800" },
  resourceMeta: { fontSize: 10.5, marginTop: 4 },
  description: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  tag: {
    maxWidth: "100%",
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tagText: { maxWidth: 180, fontSize: 10, color: "#4B5563", fontWeight: "700" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 6,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  navText: { marginTop: 3, fontSize: 9.5, fontWeight: "700", textAlign: "center" },
});
