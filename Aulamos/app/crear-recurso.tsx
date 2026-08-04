import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BotonAccesibilidad from "../components/BotonAccesibilidad";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { API_URL } from "../services/api";

type TipoRecurso = "Video" | "PDF" | "Documento";

type Curso = {
  id_curso: number;
  id_materia: number;
  nombre: string;
  materia: string;
  grupo: string;
};

type Actividad = {
  id_actividad: number;
  id_curso: number;
  id_materia: number;
  titulo: string;
  estado: string;
};

type CatalogosResponse = {
  cursos?: Curso[];
  actividades?: Actividad[];
  mensaje?: string;
};

const OPCIONES_TIPO: Array<{
  tipo: TipoRecurso;
  titulo: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  fondo: string;
}> = [
  {
    tipo: "Video",
    titulo: "Video",
    descripcion: "MP4, MOV o WebM",
    icono: "videocam",
    color: "#0F766E",
    fondo: "#CCFBF1",
  },
  {
    tipo: "PDF",
    titulo: "PDF",
    descripcion: "Archivo en formato PDF",
    icono: "document-text",
    color: "#DC2626",
    fondo: "#FEE2E2",
  },
  {
    tipo: "Documento",
    titulo: "Documento",
    descripcion: "Word o PowerPoint",
    icono: "document",
    color: "#6D28D9",
    fondo: "#EDE9FE",
  },
];

const EXTENSIONES: Record<TipoRecurso, string[]> = {
  Video: ["mp4", "mov", "m4v", "webm"],
  PDF: ["pdf"],
  Documento: ["doc", "docx", "ppt", "pptx"],
};

const obtenerExtension = (nombre: string) =>
  nombre.split(".").pop()?.toLowerCase() ?? "";

const mostrarTamano = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) {
    return "Tamaño no disponible";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function CrearRecursoScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colores, escalaTexto, preferencias } = useAccessibility();

  const [tipo, setTipo] = useState<TipoRecurso | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [archivoSubtitulos, setArchivoSubtitulos] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [idActividad, setIdActividad] = useState<number | null>(null);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [publicando, setPublicando] = useState(false);

  const temaOscuro =
    preferencias.modoOscuro || preferencias.altoContraste;

  const margenHorizontal = width < 360 ? 14 : width < 400 ? 18 : 22;
  const anchoContenido = Math.min(
    width - margenHorizontal * 2,
    560
  );

  const actividadesCurso = useMemo(
    () =>
      actividades.filter(
        (actividad) => actividad.id_curso === idCurso
      ),
    [actividades, idCurso]
  );

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
          Alert.alert(
            "Sesión vencida",
            "Inicia sesión nuevamente."
          );
          router.replace("/" as any);
          return;
        }

        const respuesta = await fetch(
          `${API_URL}/academico/recursos/catalogos`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const resultado: CatalogosResponse =
          await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje ||
              "No se pudieron cargar los cursos."
          );
        }

        setCursos(resultado.cursos ?? []);
        setActividades(resultado.actividades ?? []);
      } catch (error) {
        Alert.alert(
          "No se pudo cargar la información",
          error instanceof Error
            ? error.message
            : "Verifica el servidor y la red Wi-Fi."
        );
      } finally {
        setCargandoCatalogos(false);
      }
    };

    void cargarCatalogos();
  }, []);

  const cambiarTipo = (nuevoTipo: TipoRecurso) => {
    setTipo(nuevoTipo);
    setArchivo(null);
    setArchivoSubtitulos(null);
  };

  const seleccionarArchivo = async () => {
    if (!tipo) {
      Alert.alert(
        "Selecciona el tipo",
        "Primero indica si subirás un video, PDF o documento."
      );
      return;
    }

    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (resultado.canceled) {
        return;
      }

      const seleccionado = resultado.assets[0];
      const extension = obtenerExtension(seleccionado.name);

      if (!EXTENSIONES[tipo].includes(extension)) {
        Alert.alert(
          "Archivo incorrecto",
          `Para ${tipo} selecciona: ${EXTENSIONES[tipo]
            .map((item) => `.${item}`)
            .join(", ")}.`
        );
        return;
      }

      if (
        seleccionado.size &&
        seleccionado.size > 200 * 1024 * 1024
      ) {
        Alert.alert(
          "Archivo demasiado grande",
          "El recurso no puede superar los 200 MB."
        );
        return;
      }

      setArchivo(seleccionado);
    } catch {
      Alert.alert(
        "No se pudo seleccionar el archivo",
        "Inténtalo nuevamente."
      );
    }
  };

  const seleccionarArchivoSubtitulos = async () => {
    if (tipo !== "Video") {
      return;
    }

    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: ["text/vtt", "application/x-subrip", "text/plain"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (resultado.canceled) {
        return;
      }

      const seleccionado = resultado.assets[0];
      const extension = obtenerExtension(seleccionado.name);

      if (!["vtt", "srt"].includes(extension)) {
        Alert.alert(
          "Archivo de subtítulos incorrecto",
          "Selecciona un archivo .vtt o .srt."
        );
        return;
      }

      if (
        seleccionado.size &&
        seleccionado.size > 2 * 1024 * 1024
      ) {
        Alert.alert(
          "Archivo demasiado grande",
          "Los subtítulos no pueden superar los 2 MB."
        );
        return;
      }

      setArchivoSubtitulos(seleccionado);
    } catch {
      Alert.alert(
        "No se pudieron seleccionar los subtítulos",
        "Inténtalo nuevamente."
      );
    }
  };

  const publicarRecurso = async () => {
    if (!tipo) {
      Alert.alert(
        "Tipo requerido",
        "Selecciona Video, PDF o Documento."
      );
      return;
    }

    if (!titulo.trim()) {
      Alert.alert(
        "Título requerido",
        "Escribe el título del recurso."
      );
      return;
    }

    if (!idCurso) {
      Alert.alert(
        "Curso requerido",
        "Selecciona el curso que recibirá el recurso."
      );
      return;
    }

    if (!archivo) {
      Alert.alert(
        "Archivo requerido",
        "Selecciona el archivo que deseas publicar."
      );
      return;
    }

    try {
      setPublicando(true);

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert(
          "Sesión vencida",
          "Inicia sesión nuevamente."
        );
        router.replace("/" as any);
        return;
      }

      const formulario = new FormData();
      formulario.append("titulo", titulo.trim());
      formulario.append("descripcion", descripcion.trim());
      formulario.append("tipo", tipo);
      formulario.append("id_curso", String(idCurso));
      formulario.append(
        "id_actividad",
        idActividad ? String(idActividad) : ""
      );
      formulario.append(
        "accesible",
        tipo !== "Video" || archivoSubtitulos ? "true" : "false"
      );
      formulario.append(
        "subtitulos_disponibles",
        archivoSubtitulos ? "true" : "false"
      );
      formulario.append(
        "archivo",
        {
          uri: archivo.uri,
          name: archivo.name,
          type:
            archivo.mimeType ||
            "application/octet-stream",
        } as any
      );

      if (tipo === "Video" && archivoSubtitulos) {
        formulario.append(
          "subtitulos",
          {
            uri: archivoSubtitulos.uri,
            name: archivoSubtitulos.name,
            type:
              archivoSubtitulos.mimeType ||
              (obtenerExtension(archivoSubtitulos.name) === "vtt"
                ? "text/vtt"
                : "application/x-subrip"),
          } as any
        );
      }

      const respuesta = await fetch(
        `${API_URL}/academico/recursos`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: formulario,
        }
      );

      const texto = await respuesta.text();
      const resultado = texto
        ? JSON.parse(texto)
        : {};

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje ||
            "No se pudo publicar el recurso."
        );
      }

      Alert.alert(
        "Recurso publicado",
        resultado.mensaje ||
          "El recurso se publicó correctamente.",
        [
          {
            text: "Aceptar",
            onPress: () =>
              router.replace("/recursos-docente" as any),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "No se pudo publicar",
        error instanceof Error
          ? error.message
          : "Verifica el servidor y la red Wi-Fi."
      );
    } finally {
      setPublicando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.screen,
          { backgroundColor: colores.fondo },
        ]}
      >
        <ScrollView
          contentContainerStyle={{
            alignItems: "center",
            paddingTop: insets.top + 8,
            paddingBottom: 110 + Math.max(insets.bottom, 8),
          }}
          keyboardShouldPersistTaps="handled"
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
                  Crear recurso
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: colores.textoSecundario,
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  Comparte material con tus estudiantes
                </Text>
              </View>

              <BotonAccesibilidad />
            </View>

            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colores.texto,
                  fontSize: 15 * escalaTexto,
                },
              ]}
            >
              1. Tipo de recurso
            </Text>

            {OPCIONES_TIPO.map((opcion) => {
              const seleccionado = tipo === opcion.tipo;

              return (
                <TouchableOpacity
                  key={opcion.tipo}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: colores.tarjeta,
                      borderColor: seleccionado
                        ? "#2D5BFF"
                        : colores.borde,
                    },
                  ]}
                  onPress={() => cambiarTipo(opcion.tipo)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: seleccionado }}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: opcion.fondo },
                    ]}
                  >
                    <Ionicons
                      name={opcion.icono}
                      size={24}
                      color={opcion.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.optionTitle,
                        {
                          color: colores.texto,
                          fontSize: 14 * escalaTexto,
                        },
                      ]}
                    >
                      {opcion.titulo}
                    </Text>
                    <Text
                      style={[
                        styles.optionDescription,
                        {
                          color: colores.textoSecundario,
                          fontSize: 11 * escalaTexto,
                        },
                      ]}
                    >
                      {opcion.descripcion}
                    </Text>
                  </View>
                  <Ionicons
                    name={
                      seleccionado
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={23}
                    color={seleccionado ? "#2D5BFF" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              );
            })}

            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colores.texto,
                  fontSize: 15 * escalaTexto,
                },
              ]}
            >
              2. Información
            </Text>

            <Text style={[styles.label, { color: colores.texto }]}>Título</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colores.texto,
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                  fontSize: 14 * escalaTexto,
                },
              ]}
              placeholder="Ej. La fotosíntesis"
              placeholderTextColor={colores.textoSecundario}
              value={titulo}
              onChangeText={setTitulo}
              maxLength={150}
            />

            <Text style={[styles.label, { color: colores.texto }]}>Descripción</Text>
            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
                {
                  color: colores.texto,
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                  fontSize: 14 * escalaTexto,
                },
              ]}
              placeholder="Describe brevemente el contenido"
              placeholderTextColor={colores.textoSecundario}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />

            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colores.texto,
                  fontSize: 15 * escalaTexto,
                },
              ]}
            >
              3. Curso y actividad
            </Text>

            {cargandoCatalogos ? (
              <ActivityIndicator color="#2D5BFF" />
            ) : cursos.length === 0 ? (
              <Text style={{ color: colores.textoSecundario }}>
                No tienes cursos activos. Un administrador debe asignarte uno.
              </Text>
            ) : (
              cursos.map((curso) => {
                const seleccionado = idCurso === curso.id_curso;

                return (
                  <TouchableOpacity
                    key={curso.id_curso}
                    style={[
                      styles.choiceCard,
                      {
                        backgroundColor: colores.tarjeta,
                        borderColor: seleccionado
                          ? "#2D5BFF"
                          : colores.borde,
                      },
                    ]}
                    onPress={() => {
                      setIdCurso(curso.id_curso);
                      setIdActividad(null);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: seleccionado }}
                  >
                    <Ionicons
                      name={seleccionado ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={seleccionado ? "#2D5BFF" : colores.textoSecundario}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.choiceTitle, { color: colores.texto }]}>
                        {curso.materia}
                      </Text>
                      <Text style={[styles.choiceSubtitle, { color: colores.textoSecundario }]}>
                        {curso.nombre} · {curso.grupo}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {idCurso ? (
              <>
                <Text style={[styles.label, { color: colores.texto }]}>Actividad relacionada (opcional)</Text>

                <TouchableOpacity
                  style={[
                    styles.choiceCard,
                    {
                      backgroundColor: colores.tarjeta,
                      borderColor:
                        idActividad === null ? "#2D5BFF" : colores.borde,
                    },
                  ]}
                  onPress={() => setIdActividad(null)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: idActividad === null }}
                >
                  <Ionicons
                    name={idActividad === null ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={idActividad === null ? "#2D5BFF" : colores.textoSecundario}
                  />
                  <Text style={[styles.choiceTitle, { color: colores.texto }]}>
                    Recurso general del curso
                  </Text>
                </TouchableOpacity>

                {actividadesCurso.map((actividad) => (
                  <TouchableOpacity
                    key={actividad.id_actividad}
                    style={[
                      styles.choiceCard,
                      {
                        backgroundColor: colores.tarjeta,
                        borderColor:
                          idActividad === actividad.id_actividad
                            ? "#2D5BFF"
                            : colores.borde,
                      },
                    ]}
                    onPress={() => setIdActividad(actividad.id_actividad)}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: idActividad === actividad.id_actividad,
                    }}
                  >
                    <Ionicons
                      name={
                        idActividad === actividad.id_actividad
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={22}
                      color={
                        idActividad === actividad.id_actividad
                          ? "#2D5BFF"
                          : colores.textoSecundario
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.choiceTitle, { color: colores.texto }]}>
                        {actividad.titulo}
                      </Text>
                      <Text style={[styles.choiceSubtitle, { color: colores.textoSecundario }]}>
                        {actividad.estado}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}

            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colores.texto,
                  fontSize: 15 * escalaTexto,
                },
              ]}
            >
              4. Archivo
            </Text>

            <TouchableOpacity
              style={[
                styles.uploadBox,
                {
                  backgroundColor: temaOscuro
                    ? colores.tarjeta
                    : "#F8FAFC",
                  borderColor: archivo ? "#2D5BFF" : colores.borde,
                },
              ]}
              onPress={seleccionarArchivo}
              accessibilityRole="button"
              accessibilityLabel="Seleccionar archivo"
            >
              <Ionicons
                name={archivo ? "checkmark-circle" : "cloud-upload-outline"}
                size={38}
                color={archivo ? "#2D5BFF" : colores.texto}
              />
              <Text style={[styles.uploadTitle, { color: colores.texto }]}>
                {archivo?.name ?? "Toca para seleccionar un archivo"}
              </Text>
              <Text style={[styles.uploadSubtitle, { color: colores.textoSecundario }]}>
                {archivo ? mostrarTamano(archivo.size) : "Máximo 200 MB"}
              </Text>
            </TouchableOpacity>

            {tipo === "Video" ? (
              <View
                style={[
                  styles.subtitleSection,
                  {
                    backgroundColor: colores.tarjeta,
                    borderColor: archivoSubtitulos
                      ? "#2D5BFF"
                      : colores.borde,
                  },
                ]}
              >
                <View style={styles.subtitleHeader}>
                  <Ionicons
                    name="text-outline"
                    size={24}
                    color="#2D5BFF"
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.checkText,
                        { color: colores.texto },
                      ]}
                    >
                      Subtítulos del video (opcional)
                    </Text>
                    <Text
                      style={[
                        styles.uploadSubtitle,
                        { color: colores.textoSecundario },
                      ]}
                    >
                      Formato .vtt o .srt · máximo 2 MB
                    </Text>
                  </View>
                </View>

                {archivoSubtitulos ? (
                  <View style={styles.selectedSubtitleRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#15803D"
                    />
                    <Text
                      style={[
                        styles.selectedSubtitleName,
                        { color: colores.texto },
                      ]}
                      numberOfLines={2}
                    >
                      {archivoSubtitulos.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setArchivoSubtitulos(null)}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar archivo de subtítulos"
                    >
                      <Ionicons
                        name="close-circle"
                        size={25}
                        color="#DC2626"
                      />
                    </TouchableOpacity>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.subtitleButton}
                  onPress={seleccionarArchivoSubtitulos}
                  accessibilityRole="button"
                  accessibilityLabel="Seleccionar archivo de subtítulos"
                >
                  <Ionicons
                    name="folder-open-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.subtitleButtonText}>
                    {archivoSubtitulos
                      ? "Cambiar subtítulos"
                      : "Seleccionar subtítulos"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: colores.borde },
                ]}
                onPress={() => router.back()}
                disabled={publicando}
              >
                <Text style={[styles.secondaryText, { color: colores.texto }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  publicando && styles.buttonDisabled,
                ]}
                onPress={publicarRecurso}
                disabled={publicando}
              >
                {publicando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryText}>Publicar recurso</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            {
              minHeight: 68 + Math.max(insets.bottom, 5),
              paddingBottom: Math.max(insets.bottom, 5),
              backgroundColor: colores.tarjeta,
              borderTopColor: colores.borde,
            },
          ]}
        >
          <NavItem icon="home-outline" label="Inicio" onPress={() => router.replace("/inicio-docente" as any)} color={colores.textoSecundario} />
          <NavItem icon="book" label="Recursos" active onPress={() => router.replace("/crear-recurso" as any)} color={colores.textoSecundario} />
          <NavItem icon="reader-outline" label="Actividades" onPress={() => router.push("/actividades-docente" as any)} color={colores.textoSecundario} />
          <NavItem icon="document-text-outline" label="Evaluaciones" onPress={() => router.push("/crear-evaluacion" as any)} color={colores.textoSecundario} />
          <NavItem icon="menu-outline" label="Más" onPress={() => router.push("/menu-docente" as any)} color={colores.textoSecundario} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function NavItem({
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
  const activeColor = "#2D5BFF";

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
        color={active ? activeColor : color}
      />
      <Text
        style={[
          styles.navText,
          { color: active ? activeColor : color },
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerText: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 3,
    lineHeight: 17,
  },
  sectionTitle: {
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 12,
  },
  optionCard: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontWeight: "800",
  },
  optionDescription: {
    marginTop: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 10,
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  descriptionInput: {
    minHeight: 105,
  },
  choiceCard: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  choiceTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  choiceSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },
  uploadBox: {
    minHeight: 145,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  uploadSubtitle: {
    marginTop: 5,
    fontSize: 11,
  },
  subtitleSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
  },
  subtitleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  selectedSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
    padding: 10,
    borderRadius: 11,
    backgroundColor: "#ECFDF5",
  },
  selectedSubtitleName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  subtitleButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#2D5BFF",
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  subtitleButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    flex: 1.4,
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: "#2D5BFF",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: "800",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 6,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  navText: {
    marginTop: 3,
    fontSize: 9.5,
    fontWeight: "700",
  },
});
