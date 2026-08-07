import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useEvent, useEventListener } from "expo";
import { router, useLocalSearchParams } from "expo-router";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useVideoPlayer, VideoView } from "expo-video";
import { SafeAreaView } from "react-native-safe-area-context";

import BotonAccesibilidad from "../components/BotonAccesibilidad";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { API_URL } from "../services/api";

type RecursoVideo = {
  id_recurso: number;
  titulo: string;
  descripcion: string | null;
  tipo: "Video";
  url_recurso: string;
  url_subtitulos: string | null;
  subtitulos_disponibles: number | boolean;
  materia: string | null;
  curso: string | null;
  docente: string | null;
};

type Cue = {
  inicio: number;
  fin: number;
  texto: string;
};

type PosicionSubtitulo = "Arriba" | "Centro" | "Abajo";
type TamanoSubtitulo = "Pequeño" | "Mediano" | "Grande";

const TAMANOS: Record<TamanoSubtitulo, number> = {
  Pequeño: 16,
  Mediano: 21,
  Grande: 27,
};

const convertirTiempo = (valor: string) => {
  const partes = valor
    .trim()
    .replace(",", ".")
    .split(":")
    .map(Number);

  if (partes.some((parte) => !Number.isFinite(parte))) {
    return Number.NaN;
  }

  if (partes.length === 3) {
    return partes[0] * 3600 + partes[1] * 60 + partes[2];
  }

  if (partes.length === 2) {
    return partes[0] * 60 + partes[1];
  }

  return Number.NaN;
};

const limpiarTextoSubtitulo = (texto: string) =>
  texto
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .trim();

const analizarSubtitulos = (contenido: string): Cue[] => {
  const normalizado = contenido
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  return normalizado
    .split(/\n{2,}/)
    .map((bloque) => bloque.split("\n"))
    .map((lineas) => {
      const indiceTiempo = lineas.findIndex((linea) =>
        linea.includes("-->")
      );

      if (indiceTiempo < 0) {
        return null;
      }

      const [inicioTexto, finConOpciones] =
        lineas[indiceTiempo].split("-->");
      const finTexto = finConOpciones
        ?.trim()
        .split(/\s+/)[0];

      const inicio = convertirTiempo(inicioTexto ?? "");
      const fin = convertirTiempo(finTexto ?? "");
      const texto = limpiarTextoSubtitulo(
        lineas.slice(indiceTiempo + 1).join("\n")
      );

      if (
        !Number.isFinite(inicio) ||
        !Number.isFinite(fin) ||
        fin <= inicio ||
        !texto
      ) {
        return null;
      }

      return { inicio, fin, texto };
    })
    .filter((cue): cue is Cue => cue !== null)
    .sort((a, b) => a.inicio - b.inicio);
};

const mostrarTiempo = (segundos: number) => {
  const valor = Math.max(0, Math.floor(segundos || 0));
  const minutos = Math.floor(valor / 60);
  const resto = valor % 60;

  return `${minutos}:${String(resto).padStart(2, "0")}`;
};

export default function ReproductorVideoScreen() {
  const { idRecurso } = useLocalSearchParams<{
    idRecurso?: string;
  }>();
  const { width } = useWindowDimensions();
  const { colores, escalaTexto } = useAccessibility();

  const idRecursoNumero = Number(idRecurso);
  const anchoContenido = Math.min(width - 28, 680);
  const altoVideo = Math.min(
    (anchoContenido * 9) / 16,
    380
  );

  const [recurso, setRecurso] = useState<RecursoVideo | null>(null);
  const [cues, setCues] = useState<Cue[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorSubtitulos, setErrorSubtitulos] = useState<string | null>(null);
  const [mostrarSubtitulos, setMostrarSubtitulos] = useState(true);
  const [tamanoSubtitulos, setTamanoSubtitulos] =
    useState<TamanoSubtitulo>("Mediano");
  const [altoContraste, setAltoContraste] = useState(false);
  const [posicion, setPosicion] =
    useState<PosicionSubtitulo>("Abajo");
  const [tiempoActual, setTiempoActual] = useState(0);

  const tiempoActualRef = useRef(0);
  const duracionRef = useRef(0);
  const registroFinalEnviadoRef = useRef(false);
  const puedeRegistrarUsoRef = useRef(false);

  const player = useVideoPlayer(null, (instancia) => {
    instancia.loop = false;
    instancia.timeUpdateEventInterval = 0.25;
  });

  const { isPlaying } = useEvent(
    player,
    "playingChange",
    { isPlaying: player.playing }
  );

 const { status, error } = useEvent(
  player,
  "statusChange",
  { status: player.status }
);

  const registrarUso = useCallback(
    async (
      accion: "Visualizó" | "Completó" | "Abandonó",
      tiempo: number,
      porcentaje: number
    ) => {
      if (
        !puedeRegistrarUsoRef.current ||
        !Number.isInteger(idRecursoNumero) ||
        idRecursoNumero <= 0
      ) {
        return;
      }

      try {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
          return;
        }

        await fetch(
          `${API_URL}/academico/recursos/${idRecursoNumero}/uso`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              accion_realizada: accion,
              tiempo_visualizacion_seg: Math.max(
                0,
                Math.round(tiempo)
              ),
              porcentaje_visualizado: Math.min(
                100,
                Math.max(0, porcentaje)
              ),
            }),
          }
        );
      } catch (errorRegistro) {
        console.warn(
          "No se pudo registrar la reproducción:",
          errorRegistro
        );
      }
    },
    [idRecursoNumero]
  );

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    tiempoActualRef.current = currentTime;
    duracionRef.current = player.duration || 0;
    setTiempoActual(currentTime);
  });

  useEventListener(player, "playToEnd", () => {
    registroFinalEnviadoRef.current = true;
    const duracion = player.duration || duracionRef.current;
    void registrarUso("Completó", duracion, 100);
  });

  useEffect(() => {
    let pantallaActiva = true;

    const cargarVideo = async () => {
      if (!Number.isInteger(idRecursoNumero) || idRecursoNumero <= 0) {
        Alert.alert("Video no válido", "Regresa a la Biblioteca.");
        router.back();
        return;
      }

      try {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
          router.replace("/" as any);
          return;
        }

        const respuesta = await fetch(
          `${API_URL}/academico/recursos/${idRecursoNumero}/reproductor`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje ||
              "No se pudo consultar el video."
          );
        }

        const video = resultado.recurso as RecursoVideo;

        puedeRegistrarUsoRef.current =
          resultado.puede_registrar_uso === true;

        if (!video.url_recurso) {
          throw new Error(
            "El video no tiene un archivo disponible."
          );
        }

        if (!pantallaActiva) {
          return;
        }

        setRecurso(video);
        await player.replaceAsync({
          uri: video.url_recurso,
          useCaching: true,
        });

        if (video.url_subtitulos) {
          try {
            const respuestaSubtitulos = await fetch(
              video.url_subtitulos
            );

            if (!respuestaSubtitulos.ok) {
              throw new Error();
            }

            const contenido = await respuestaSubtitulos.text();
            const cuesAnalizados = analizarSubtitulos(contenido);

            if (pantallaActiva) {
              setCues(cuesAnalizados);

              if (cuesAnalizados.length === 0) {
                setErrorSubtitulos(
                  "El archivo no contiene subtítulos válidos."
                );
              }
            }
          } catch {
            if (pantallaActiva) {
              setErrorSubtitulos(
                "No se pudieron cargar los subtítulos."
              );
            }
          }
        }

        void registrarUso("Visualizó", 0, 0);
      } catch (errorCarga) {
        Alert.alert(
          "No se pudo abrir el video",
          errorCarga instanceof Error
            ? errorCarga.message
            : "Verifica el servidor y la red Wi-Fi."
        );
      } finally {
        if (pantallaActiva) {
          setCargando(false);
        }
      }
    };

    void cargarVideo();

    return () => {
      pantallaActiva = false;
    };
  }, [idRecursoNumero, player, registrarUso]);

  useEffect(
    () => () => {
      if (
        registroFinalEnviadoRef.current ||
        tiempoActualRef.current <= 0
      ) {
        return;
      }

      const duracion = duracionRef.current;
      const porcentaje = duracion > 0
        ? Math.min(
            100,
            (tiempoActualRef.current / duracion) * 100
          )
        : 0;

      void registrarUso(
        "Abandonó",
        tiempoActualRef.current,
        porcentaje
      );
    },
    [registrarUso]
  );

  const subtituloActual = useMemo(
    () =>
      cues.find(
        (cue) =>
          tiempoActual >= cue.inicio &&
          tiempoActual <= cue.fin
      )?.texto ?? "",
    [cues, tiempoActual]
  );

  const posicionVertical =
    posicion === "Arriba"
      ? "flex-start"
      : posicion === "Centro"
        ? "center"
        : "flex-end";

  const saltar = (segundos: number) => {
    const duracion = player.duration || 0;
    player.currentTime = Math.min(
      duracion || Number.MAX_SAFE_INTEGER,
      Math.max(0, player.currentTime + segundos)
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colores.fondo },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
              accessibilityRole="button"
              accessibilityLabel="Regresar a la Biblioteca"
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
                    fontSize: 21 * escalaTexto,
                  },
                ]}
                numberOfLines={2}
              >
                {recurso?.titulo ?? "Reproductor de video"}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: colores.textoSecundario },
                ]}
              >
                {recurso?.materia ?? "Biblioteca digital"}
              </Text>
            </View>

            <BotonAccesibilidad />
          </View>

          {cargando ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator
                size="large"
                color="#2D5BFF"
              />
              <Text
                style={{
                  color: colores.textoSecundario,
                  marginTop: 10,
                }}
              >
                Cargando video...
              </Text>
            </View>
          ) : recurso ? (
            <>
              <View
                style={[
                  styles.videoFrame,
                  { height: altoVideo },
                ]}
              >
                <VideoView
                  style={styles.video}
                  player={player}
                  nativeControls
                  contentFit="contain"
                  surfaceType="textureView"
                  allowsFullscreen={false}
                />

                {mostrarSubtitulos && subtituloActual ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.subtitleLayer,
                      { justifyContent: posicionVertical },
                    ]}
                  >
                    <Text
                      accessibilityLiveRegion="polite"
                      style={[
                        styles.subtitleText,
                        {
                          fontSize: TAMANOS[tamanoSubtitulos],
                          color: altoContraste
                            ? "#FFFF00"
                            : "#FFFFFF",
                          backgroundColor: altoContraste
                            ? "#000000"
                            : "rgba(0, 0, 0, 0.78)",
                          borderColor: altoContraste
                            ? "#FFFFFF"
                            : "transparent",
                          borderWidth: altoContraste ? 2 : 0,
                        },
                      ]}
                    >
                      {subtituloActual}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View
                style={[
                  styles.playbackControls,
                  {
                    backgroundColor: colores.tarjeta,
                    borderColor: colores.borde,
                  },
                ]}
              >
                <ControlButton
                  icon="play-back"
                  label="10 segundos atrás"
                  onPress={() => saltar(-10)}
                />
                <ControlButton
                  icon={isPlaying ? "pause" : "play"}
                  label={isPlaying ? "Pausar" : "Reproducir"}
                  primary
                  onPress={() => {
                    if (isPlaying) {
                      player.pause();
                    } else {
                      player.play();
                    }
                  }}
                />
                <ControlButton
                  icon="play-forward"
                  label="10 segundos adelante"
                  onPress={() => saltar(10)}
                />
              </View>

              <Text
                style={[
                  styles.timeText,
                  { color: colores.textoSecundario },
                ]}
              >
                {mostrarTiempo(tiempoActual)} / {mostrarTiempo(player.duration)}
              </Text>

              {status === "error" ? (
                <Text style={styles.errorText}>
                  {error?.message ||
                    "No se pudo reproducir el video."}
                </Text>
              ) : null}

              <View
                style={[
                  styles.settingsCard,
                  {
                    backgroundColor: colores.tarjeta,
                    borderColor: colores.borde,
                  },
                ]}
              >
                <View style={styles.settingsTitleRow}>
                  <Ionicons
                    name="options-outline"
                    size={24}
                    color="#2D5BFF"
                  />
                  <Text
                    style={[
                      styles.settingsTitle,
                      { color: colores.texto },
                    ]}
                  >
                    Configuración de subtítulos
                  </Text>
                </View>

                {cues.length > 0 ? (
                  <>
                    <Text
                      style={[
                        styles.settingLabel,
                        { color: colores.texto },
                      ]}
                    >
                      Visibilidad
                    </Text>
                    <OptionRow>
                      <OptionButton
                        label="Mostrar"
                        active={mostrarSubtitulos}
                        onPress={() => setMostrarSubtitulos(true)}
                      />
                      <OptionButton
                        label="Ocultar"
                        active={!mostrarSubtitulos}
                        onPress={() => setMostrarSubtitulos(false)}
                      />
                    </OptionRow>

                    <Text
                      style={[
                        styles.settingLabel,
                        { color: colores.texto },
                      ]}
                    >
                      Tamaño
                    </Text>
                    <OptionRow>
                      {(["Pequeño", "Mediano", "Grande"] as const).map(
                        (opcion) => (
                          <OptionButton
                            key={opcion}
                            label={opcion}
                            active={tamanoSubtitulos === opcion}
                            onPress={() => setTamanoSubtitulos(opcion)}
                          />
                        )
                      )}
                    </OptionRow>

                    <Text
                      style={[
                        styles.settingLabel,
                        { color: colores.texto },
                      ]}
                    >
                      Contraste
                    </Text>
                    <OptionRow>
                      <OptionButton
                        label="Normal"
                        active={!altoContraste}
                        onPress={() => setAltoContraste(false)}
                      />
                      <OptionButton
                        label="Alto contraste"
                        active={altoContraste}
                        onPress={() => setAltoContraste(true)}
                      />
                    </OptionRow>

                    <Text
                      style={[
                        styles.settingLabel,
                        { color: colores.texto },
                      ]}
                    >
                      Posición
                    </Text>
                    <OptionRow>
                      {(["Arriba", "Centro", "Abajo"] as const).map(
                        (opcion) => (
                          <OptionButton
                            key={opcion}
                            label={opcion}
                            active={posicion === opcion}
                            onPress={() => setPosicion(opcion)}
                          />
                        )
                      )}
                    </OptionRow>
                  </>
                ) : (
                  <Text
                    style={[
                      styles.noSubtitlesText,
                      { color: colores.textoSecundario },
                    ]}
                  >
                    {errorSubtitulos ||
                      "Este video no incluye un archivo de subtítulos."}
                  </Text>
                )}
              </View>

              {recurso.descripcion ? (
                <View
                  style={[
                    styles.descriptionCard,
                    {
                      backgroundColor: colores.tarjeta,
                      borderColor: colores.borde,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.descriptionTitle,
                      { color: colores.texto },
                    ]}
                  >
                    Descripción
                  </Text>
                  <Text
                    style={[
                      styles.descriptionText,
                      { color: colores.textoSecundario },
                    ]}
                    selectable
                  >
                    {recurso.descripcion}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ControlButton({
  icon,
  label,
  primary = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.controlButton,
        primary && styles.controlButtonPrimary,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons
        name={icon}
        size={primary ? 25 : 22}
        color={primary ? "#FFFFFF" : "#2D5BFF"}
      />
      <Text
        style={[
          styles.controlLabel,
          primary && styles.controlLabelPrimary,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function OptionRow({ children }: { children: ReactNode }) {
  return <View style={styles.optionRow}>{children}</View>;
}

function OptionButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.optionButton,
        active && styles.optionButtonActive,
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.optionButtonText,
          active && styles.optionButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: { fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 3 },
  loadingCard: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  videoFrame: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  subtitleLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  subtitleText: {
    maxWidth: "96%",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: "center",
    fontWeight: "800",
    lineHeight: 34,
  },
  playbackControls: {
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 12,
    padding: 8,
    flexDirection: "row",
    gap: 7,
  },
  controlButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  controlButtonPrimary: {
    backgroundColor: "#2D5BFF",
  },
  controlLabel: {
    color: "#2D5BFF",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 3,
  },
  controlLabelPrimary: { color: "#FFFFFF" },
  timeText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  settingsCard: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 15,
    marginTop: 18,
  },
  settingsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 4,
  },
  settingsTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 7,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  optionButton: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionButtonActive: {
    borderColor: "#2D5BFF",
    backgroundColor: "#2D5BFF",
  },
  optionButtonText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "800",
  },
  optionButtonTextActive: { color: "#FFFFFF" },
  noSubtitlesText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  descriptionCard: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 15,
    marginTop: 14,
  },
  descriptionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
});