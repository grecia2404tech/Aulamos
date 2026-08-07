import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import BotonAccesibilidad from "../components/BotonAccesibilidad";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { API_URL } from "../services/api";

type EstadoAcademico = "Activo" | "Inactivo" | "Cerrado";

type CicloEscolar = {
  id_ciclo: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoAcademico;
};

type PeriodoEvaluacion = {
  id_periodo: number;
  id_ciclo: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoAcademico;
  ciclo: string;
  estado_ciclo?: EstadoAcademico;
};

type RespuestaApi = {
  mensaje?: string;
  campo?: string;
  ciclos?: CicloEscolar[];
  periodos?: PeriodoEvaluacion[];
};

const ESTADOS: EstadoAcademico[] = ["Activo", "Inactivo", "Cerrado"];

const leerRespuesta = async (respuesta: Response): Promise<RespuestaApi> => {
  const texto = await respuesta.text();

  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(texto) as RespuestaApi;
  } catch {
    return {
      mensaje: "El servidor envió una respuesta no válida.",
    };
  }
};

const esFechaValida = (fecha: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const objetoFecha = new Date(`${fecha}T00:00:00Z`);

  return (
    !Number.isNaN(objetoFecha.getTime()) &&
    objetoFecha.toISOString().slice(0, 10) === fecha
  );
};

const fechaLegible = (fecha: string) => {
  const partes = fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const fechaAObjeto = (fecha: string) => {
  const [anio, mes, dia] = fecha.split("-").map(Number);

  return new Date(anio, mes - 1, dia, 12, 0, 0);
};

const fechaParaApi = (fecha: Date) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
};

const sumarDias = (fecha: Date, cantidad: number) => {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + cantidad);
  return resultado;
};

type CampoFecha = "inicio" | "fin" | null;
type IoniconName = keyof typeof Ionicons.glyphMap;

export default function AdminPeriodosScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { colores, escalaTexto, preferencias } = useAccessibility();

  const [ciclos, setCiclos] = useState<CicloEscolar[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoEvaluacion[]>([]);

  const [idCicloSeleccionado, setIdCicloSeleccionado] = useState<number | null>(
    null,
  );

  const [idCicloFormulario, setIdCicloFormulario] = useState<number | null>(
    null,
  );

  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [estado, setEstado] = useState<EstadoAcademico>("Activo");

  const [periodoEditando, setPeriodoEditando] =
    useState<PeriodoEvaluacion | null>(null);

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectorCicloVisible, setSelectorCicloVisible] = useState(false);

  const [campoFechaVisible, setCampoFechaVisible] = useState<CampoFecha>(null);

  const altoContraste = preferencias.altoContraste;
  const modoOscuro = preferencias.modoOscuro || altoContraste;

  const dosColumnas = width >= 720 && escalaTexto <= 1.15;
  const altoBarraInferior = escalaTexto > 1.2 ? 94 : 66;

  const colorPrincipal = altoContraste
    ? colores.primario
    : modoOscuro
      ? "#9BCDC2"
      : "#3E6B62";

  const fondoSuave = altoContraste
    ? colores.tarjeta
    : modoOscuro
      ? "#173A34"
      : "#EAF2EF";

  const cicloSeleccionado = useMemo(() => {
    return (
      ciclos.find((ciclo) => ciclo.id_ciclo === idCicloSeleccionado) ?? null
    );
  }, [ciclos, idCicloSeleccionado]);

  const cicloFormulario = useMemo(() => {
    return ciclos.find((ciclo) => ciclo.id_ciclo === idCicloFormulario) ?? null;
  }, [ciclos, idCicloFormulario]);

  const periodosFiltrados = useMemo(() => {
    if (idCicloSeleccionado === null) {
      return [];
    }

    return periodos.filter(
      (periodo) =>
        periodo.estado === "Activo" &&
        periodo.id_ciclo === idCicloSeleccionado,
    );
  }, [idCicloSeleccionado, periodos]);

  const cerrarSesion = async () => {
    await AsyncStorage.multiRemove(["token", "usuario"]);

    Alert.alert("Sesión vencida", "Inicia sesión nuevamente.");

    router.replace("/");
  };

  const cargarDatos = async (mostrarCarga = true) => {
    try {
      if (mostrarCarga) {
        setCargando(true);
      }

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        await cerrarSesion();
        return;
      }

      const [respuestaCiclos, respuestaPeriodos] = await Promise.all([
        fetch(`${API_URL}/academico/ciclos`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        fetch(`${API_URL}/academico/periodos`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (respuestaCiclos.status === 401 || respuestaPeriodos.status === 401) {
        await cerrarSesion();
        return;
      }

      const [datosCiclos, datosPeriodos] = await Promise.all([
        leerRespuesta(respuestaCiclos),
        leerRespuesta(respuestaPeriodos),
      ]);

      if (!respuestaCiclos.ok) {
        throw new Error(
          datosCiclos.mensaje || "No fue posible cargar los ciclos.",
        );
      }

      if (!respuestaPeriodos.ok) {
        throw new Error(
          datosPeriodos.mensaje || "No fue posible cargar los periodos.",
        );
      }

      const ciclosRecibidos = datosCiclos.ciclos ?? [];
      const cicloActivo = ciclosRecibidos.find(
        (ciclo) => ciclo.estado === "Activo",
      );
      const ciclosActivos = cicloActivo ? [cicloActivo] : [];

      setCiclos(ciclosActivos);
      setPeriodos(datosPeriodos.periodos ?? []);
      setIdCicloSeleccionado(cicloActivo?.id_ciclo ?? null);
    } catch (error) {
      console.error("Error al cargar periodos:", error);

      Alert.alert(
        "No se pudieron cargar los datos",
        error instanceof Error
          ? error.message
          : "Verifica la conexión con la API.",
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const actualizarDatos = () => {
    setActualizando(true);
    cargarDatos(false);
  };

  const limpiarFormulario = () => {
    setNombre("");
    setFechaInicio("");
    setFechaFin("");
    setEstado("Activo");
    setPeriodoEditando(null);
    setCampoFechaVisible(null);
  };

  const abrirNuevoPeriodo = () => {
    if (!cicloSeleccionado) {
      Alert.alert("Ciclo requerido", "Primero selecciona un ciclo escolar.");
      return;
    }

    if (cicloSeleccionado.estado === "Cerrado") {
      Alert.alert(
        "Ciclo cerrado",
        "No puedes agregar periodos a un ciclo cerrado.",
      );
      return;
    }

    limpiarFormulario();

    setIdCicloFormulario(cicloSeleccionado.id_ciclo);

    setModalVisible(true);
  };

  const abrirEdicion = (periodo: PeriodoEvaluacion) => {
    setCampoFechaVisible(null);
    setPeriodoEditando(periodo);
    setIdCicloFormulario(periodo.id_ciclo);
    setNombre(periodo.nombre);
    setFechaInicio(periodo.fecha_inicio);
    setFechaFin(periodo.fecha_fin);
    setEstado(periodo.estado);
    setModalVisible(true);
  };

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setModalVisible(false);
    limpiarFormulario();
  };

  const seleccionarCicloFormulario = (idCiclo: number) => {
    if (idCiclo === idCicloFormulario) {
      return;
    }

    setIdCicloFormulario(idCiclo);
    setFechaInicio("");
    setFechaFin("");
    setCampoFechaVisible(null);
  };

  const abrirCalendario = (campo: Exclude<CampoFecha, null>) => {
    if (!cicloFormulario) {
      Alert.alert("Ciclo requerido", "Primero selecciona un ciclo escolar.");
      return;
    }

    setCampoFechaVisible(campo);
  };

  const obtenerFechaDelCalendario = () => {
    if (campoFechaVisible === "inicio" && esFechaValida(fechaInicio)) {
      return fechaAObjeto(fechaInicio);
    }

    if (campoFechaVisible === "fin" && esFechaValida(fechaFin)) {
      return fechaAObjeto(fechaFin);
    }

    if (campoFechaVisible === "fin" && esFechaValida(fechaInicio)) {
      return sumarDias(fechaAObjeto(fechaInicio), 1);
    }

    if (cicloFormulario) {
      return fechaAObjeto(cicloFormulario.fecha_inicio);
    }

    return new Date();
  };

  const obtenerFechaMinima = () => {
    if (!cicloFormulario) {
      return undefined;
    }

    if (campoFechaVisible === "fin" && esFechaValida(fechaInicio)) {
      return sumarDias(fechaAObjeto(fechaInicio), 1);
    }

    return fechaAObjeto(cicloFormulario.fecha_inicio);
  };

  const obtenerFechaMaxima = () => {
    if (!cicloFormulario) {
      return undefined;
    }

    if (campoFechaVisible === "inicio" && esFechaValida(fechaFin)) {
      return sumarDias(fechaAObjeto(fechaFin), -1);
    }

    if (campoFechaVisible === "inicio") {
      return sumarDias(fechaAObjeto(cicloFormulario.fecha_fin), -1);
    }

    return fechaAObjeto(cicloFormulario.fecha_fin);
  };

  const seleccionarFecha = (
    evento: DateTimePickerEvent,
    fechaSeleccionada?: Date,
  ) => {
    if (Platform.OS === "android") {
      setCampoFechaVisible(null);
    }

    if (evento.type === "dismissed" || !fechaSeleccionada) {
      return;
    }

    const nuevaFecha = fechaParaApi(fechaSeleccionada);

    if (campoFechaVisible === "inicio") {
      setFechaInicio(nuevaFecha);

      if (esFechaValida(fechaFin) && fechaFin <= nuevaFecha) {
        setFechaFin("");
      }

      return;
    }

    if (campoFechaVisible === "fin") {
      setFechaFin(nuevaFecha);
    }
  };

  const validarFormulario = () => {
    const nombreLimpio = nombre.trim().replace(/\s+/g, " ");

    if (!idCicloFormulario || !cicloFormulario) {
      Alert.alert("Ciclo requerido", "Selecciona un ciclo escolar.");
      return false;
    }

    if (nombreLimpio.length < 2 || nombreLimpio.length > 100) {
      Alert.alert(
        "Nombre no válido",
        "El nombre debe tener entre 2 y 100 caracteres.",
      );
      return false;
    }

    if (!esFechaValida(fechaInicio)) {
      Alert.alert(
        "Fecha no válida",
        "Selecciona la fecha de inicio en el calendario.",
      );
      return false;
    }

    if (!esFechaValida(fechaFin)) {
      Alert.alert(
        "Fecha no válida",
        "Selecciona la fecha final en el calendario.",
      );
      return false;
    }

    if (fechaInicio >= fechaFin) {
      Alert.alert(
        "Rango incorrecto",
        "La fecha final debe ser posterior a la fecha de inicio.",
      );
      return false;
    }

    if (
      fechaInicio < cicloFormulario.fecha_inicio ||
      fechaFin > cicloFormulario.fecha_fin
    ) {
      Alert.alert(
        "Fechas fuera del ciclo",
        `Las fechas deben estar entre ${fechaLegible(
          cicloFormulario.fecha_inicio,
        )} y ${fechaLegible(cicloFormulario.fecha_fin)}.`,
      );

      return false;
    }

    return true;
  };

  const guardarPeriodo = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setGuardando(true);

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        await cerrarSesion();
        return;
      }

      const esEdicion = periodoEditando !== null;

      const url = esEdicion
        ? `${API_URL}/academico/periodos/${periodoEditando.id_periodo}`
        : `${API_URL}/academico/periodos`;

      const respuesta = await fetch(url, {
        method: esEdicion ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_ciclo: idCicloFormulario,
          nombre: nombre.trim().replace(/\s+/g, " "),
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          estado,
        }),
      });

      const datos = await leerRespuesta(respuesta);

      if (respuesta.status === 401) {
        await cerrarSesion();
        return;
      }

      if (!respuesta.ok) {
        Alert.alert(
          "No se pudo guardar",
          datos.mensaje || "Revisa los datos ingresados.",
        );
        return;
      }

      setModalVisible(false);
      limpiarFormulario();

      Alert.alert(
        "Operación correcta",
        datos.mensaje || "El periodo fue guardado correctamente.",
      );

      await cargarDatos(false);
    } catch (error) {
      console.error("Error al guardar periodo:", error);

      Alert.alert(
        "Error de conexión",
        "No fue posible comunicarse con la API.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (
    periodo: PeriodoEvaluacion,
    nuevoEstado: EstadoAcademico,
  ) => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        await cerrarSesion();
        return;
      }

      const respuesta = await fetch(
        `${API_URL}/academico/periodos/${periodo.id_periodo}/estado`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            estado: nuevoEstado,
          }),
        },
      );

      const datos = await leerRespuesta(respuesta);

      if (respuesta.status === 401) {
        await cerrarSesion();
        return;
      }

      if (!respuesta.ok) {
        Alert.alert(
          "No se pudo cambiar el estado",
          datos.mensaje || "Inténtalo nuevamente.",
        );
        return;
      }

      Alert.alert(
        "Estado actualizado",
        datos.mensaje || "El estado fue actualizado.",
      );

      await cargarDatos(false);
    } catch (error) {
      console.error("Error al cambiar estado:", error);

      Alert.alert(
        "Error de conexión",
        "No fue posible comunicarse con la API.",
      );
    }
  };

  const confirmarCambioEstado = (
    periodo: PeriodoEvaluacion,
    nuevoEstado: EstadoAcademico,
  ) => {
    Alert.alert(
      "Cambiar estado",
      `¿Deseas cambiar "${periodo.nombre}" al estado ${nuevoEstado}?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Confirmar",
          style: nuevoEstado === "Cerrado" ? "destructive" : "default",
          onPress: () => cambiarEstado(periodo, nuevoEstado),
        },
      ],
    );
  };

  const obtenerColorEstado = (estadoPeriodo: EstadoAcademico) => {
    if (altoContraste) {
      return colores.primario;
    }

    if (estadoPeriodo === "Activo") {
      return colores.exito;
    }

    if (estadoPeriodo === "Cerrado") {
      return colores.peligro;
    }

    return colores.textoSecundario;
  };

  if (cargando) {
    return (
      <SafeAreaView
        style={[
          styles.loading,
          {
            backgroundColor: colores.fondo,
          },
        ]}
      >
        <ActivityIndicator size="large" color={colorPrincipal} />

        <Text
          style={[
            styles.loadingText,
            {
              color: colores.textoSecundario,
              fontSize: 14 * escalaTexto,
            },
          ]}
        >
          Cargando periodos...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[
        styles.safeArea,
        {
          backgroundColor: colores.fondo,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom:
              altoBarraInferior + Math.max(insets.bottom, 5) + 30,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizarDatos}
            colors={[colorPrincipal]}
            tintColor={colorPrincipal}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[
                styles.circleButton,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Regresar"
            >
              <Ionicons name="arrow-back" size={23} color={colores.texto} />
            </TouchableOpacity>

            <BotonAccesibilidad />
          </View>

          <View
            style={[
              styles.headingRow,
              {
                backgroundColor: colorPrincipal,
              },
            ]}
          >
            <View style={styles.headingText}>
              <Text
                style={[
                  styles.title,
                  {
                    color: "#FFFFFF",
                    fontSize: 27 * escalaTexto,
                    lineHeight: 33 * escalaTexto,
                  },
                ]}
                accessibilityRole="header"
              >
                Periodos de evaluación
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color: "#E8F2EF",
                    fontSize: 14 * escalaTexto,
                    lineHeight: 20 * escalaTexto,
                  },
                ]}
              >
                Organiza el ciclo escolar en etapas para evaluar el avance.
              </Text>
            </View>

            <View
              style={[
                styles.headerIcon,
                {
                  backgroundColor: "rgba(255, 255, 255, 0.16)",
                  borderColor: "rgba(255, 255, 255, 0.32)",
                },
              ]}
            >
              <Ionicons name="time-outline" size={31} color="#FFFFFF" />
            </View>
          </View>

          <Text
            style={[
              styles.sectionTitle,
              {
                color: colores.texto,
                fontSize: 18 * escalaTexto,
              },
            ]}
          >
            Ciclo escolar
          </Text>

          <Text
            style={[
              styles.sectionSubtitle,
              {
                color: colores.textoSecundario,
                fontSize: 12 * escalaTexto,
              },
            ]}
          >
            Solo se muestra el ciclo escolar que está activo.
          </Text>

          {ciclos.length === 0 ? (
            <View
              style={[
                styles.emptyCompact,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
            >
              <Text
                style={{
                  color: colores.textoSecundario,
                  fontSize: 13 * escalaTexto,
                }}
              >
                No hay un ciclo escolar activo. Activa uno desde la sección de
                Ciclos.
              </Text>
            </View>
          ) : cicloSeleccionado ? (
            <TouchableOpacity
              style={[
                styles.cycleSelector,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
              onPress={() => setSelectorCicloVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={`Ciclo escolar activo: ${cicloSeleccionado.nombre}. Toca para consultar sus fechas.`}
            >
              <View
                style={[
                  styles.cycleSelectorIcon,
                  {
                    backgroundColor: fondoSuave,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={colorPrincipal}
                />
              </View>

              <View style={styles.cycleSelectorText}>
                <Text
                  style={[
                    styles.cycleSelectorLabel,
                    {
                      color: colores.textoSecundario,
                      fontSize: 10 * escalaTexto,
                    },
                  ]}
                >
                  CICLO ACTIVO
                </Text>

                <Text
                  style={[
                    styles.cycleName,
                    {
                      color: colores.texto,
                      fontSize: 15 * escalaTexto,
                    },
                  ]}
                >
                  {cicloSeleccionado.nombre}
                </Text>

                <Text
                  style={[
                    styles.cycleDates,
                    {
                      color: colores.textoSecundario,
                      fontSize: 11 * escalaTexto,
                    },
                  ]}
                >
                  {fechaLegible(cicloSeleccionado.fecha_inicio)}
                  {" – "}
                  {fechaLegible(cicloSeleccionado.fecha_fin)}
                </Text>
              </View>

              <View style={styles.changeCycle}>
                <Text
                  style={[
                    styles.changeCycleText,
                    {
                      color: colorPrincipal,
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  Ver
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={colorPrincipal}
                />
              </View>
            </TouchableOpacity>
          ) : null}

          <View style={styles.periodHeader}>
            <View>
              <Text
                style={[
                  styles.periodHeaderTitle,
                  {
                    color: colores.texto,
                    fontSize: 20 * escalaTexto,
                  },
                ]}
              >
                Periodos activos
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color: colores.textoSecundario,
                    fontSize: 12 * escalaTexto,
                  },
                ]}
              >
                {periodosFiltrados.length}{" "}
                {periodosFiltrados.length === 1
                  ? "periodo encontrado"
                  : "periodos encontrados"}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor: colorPrincipal,
                  opacity:
                    !cicloSeleccionado || cicloSeleccionado.estado === "Cerrado"
                      ? 0.55
                      : 1,
                },
              ]}
              onPress={abrirNuevoPeriodo}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />

              <Text
                style={[
                  styles.addButtonText,
                  {
                    fontSize: 13 * escalaTexto,
                  },
                ]}
              >
                Crear periodo
              </Text>
            </TouchableOpacity>
          </View>

          {periodosFiltrados.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
            >
              <Ionicons
                name="calendar-clear-outline"
                size={42}
                color={colorPrincipal}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: colores.texto,
                    fontSize: 17 * escalaTexto,
                  },
                ]}
              >
                No hay periodos activos
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color: colores.textoSecundario,
                    fontSize: 13 * escalaTexto,
                  },
                ]}
              >
                Crea un periodo activo para este ciclo escolar.
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.cardsGrid,
                dosColumnas && styles.cardsGridTwoColumns,
              ]}
            >
              {periodosFiltrados.map((periodo, indice) => {
                const colorEstado = obtenerColorEstado(periodo.estado);

                return (
                  <View
                    key={periodo.id_periodo}
                    style={[
                      styles.periodCard,
                      dosColumnas && styles.periodCardColumn,
                      {
                        backgroundColor: colores.tarjeta,
                        borderColor: colorPrincipal,
                      },
                    ]}
                  >
                    <View style={styles.cardTop}>
                      <View
                        style={[
                          styles.periodIcon,
                          {
                            backgroundColor: fondoSuave,
                            borderColor: colores.borde,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.periodNumber,
                            {
                              color: colorPrincipal,
                              fontSize: 17 * escalaTexto,
                            },
                          ]}
                        >
                          {indice + 1}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            borderColor: colorEstado,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor: colorEstado,
                            },
                          ]}
                        />

                        <Text
                          style={[
                            styles.statusText,
                            {
                              color: colorEstado,
                              fontSize: 10 * escalaTexto,
                            },
                          ]}
                        >
                          {periodo.estado}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.periodName,
                        {
                          color: colores.texto,
                          fontSize: 17 * escalaTexto,
                        },
                      ]}
                    >
                      {periodo.nombre}
                    </Text>

                    <Text
                      style={[
                        styles.cycleCaption,
                        {
                          color: colores.textoSecundario,
                          fontSize: 11 * escalaTexto,
                        },
                      ]}
                    >
                      {periodo.ciclo}
                    </Text>

                    <View
                      style={[
                        styles.dateBox,
                        {
                          backgroundColor: colores.fondo,
                          borderColor: colores.borde,
                        },
                      ]}
                    >
                      <View style={styles.dateItem}>
                        <Text
                          style={[
                            styles.dateLabel,
                            {
                              color: colores.textoSecundario,
                              fontSize: 10 * escalaTexto,
                            },
                          ]}
                        >
                          INICIO
                        </Text>

                        <Text
                          style={[
                            styles.dateValue,
                            {
                              color: colores.texto,
                              fontSize: 12 * escalaTexto,
                            },
                          ]}
                        >
                          {fechaLegible(periodo.fecha_inicio)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.dateDivider,
                          {
                            backgroundColor: colores.borde,
                          },
                        ]}
                      />

                      <View style={styles.dateItem}>
                        <Text
                          style={[
                            styles.dateLabel,
                            {
                              color: colores.textoSecundario,
                              fontSize: 10 * escalaTexto,
                            },
                          ]}
                        >
                          FIN
                        </Text>

                        <Text
                          style={[
                            styles.dateValue,
                            {
                              color: colores.texto,
                              fontSize: 12 * escalaTexto,
                            },
                          ]}
                        >
                          {fechaLegible(periodo.fecha_fin)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[
                          styles.secondaryAction,
                          {
                            backgroundColor: colores.fondo,
                            borderColor: colores.borde,
                          },
                        ]}
                        onPress={() => abrirEdicion(periodo)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={colorPrincipal}
                        />

                        <Text
                          style={[
                            styles.actionText,
                            {
                              color: colores.texto,
                              fontSize: 11 * escalaTexto,
                            },
                          ]}
                        >
                          Editar
                        </Text>
                      </TouchableOpacity>

                      {periodo.estado === "Inactivo" ? (
                        <TouchableOpacity
                          style={[
                            styles.primaryAction,
                            {
                              backgroundColor: colores.exito,
                            },
                          ]}
                          onPress={() =>
                            confirmarCambioEstado(periodo, "Activo")
                          }
                        >
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={18}
                            color="#FFFFFF"
                          />

                          <Text
                            style={[
                              styles.actionText,
                              {
                                color: "#FFFFFF",
                                fontSize: 11 * escalaTexto,
                              },
                            ]}
                          >
                            Activar
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      {periodo.estado === "Activo" ? (
                        <TouchableOpacity
                          style={[
                            styles.primaryAction,
                            {
                              backgroundColor: colores.peligro,
                            },
                          ]}
                          onPress={() =>
                            confirmarCambioEstado(periodo, "Cerrado")
                          }
                        >
                          <Ionicons
                            name="lock-closed-outline"
                            size={17}
                            color="#FFFFFF"
                          />

                          <Text
                            style={[
                              styles.actionText,
                              {
                                color: "#FFFFFF",
                                fontSize: 11 * escalaTexto,
                              },
                            ]}
                          >
                            Cerrar
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomNavigation,
          {
            height: altoBarraInferior + Math.max(insets.bottom, 5),
            paddingBottom: Math.max(insets.bottom, 5),
            backgroundColor: colores.tarjeta,
            borderTopColor: colores.borde,
          },
        ]}
      >
        <View style={styles.bottomContent}>
          <BottomNavigationItem
            icon="home-outline"
            activeIcon="home"
            label="Inicio"
            onPress={() => router.push("/inicio-admin" as any)}
          />

          <BottomNavigationItem
            icon="calendar-outline"
            activeIcon="calendar"
            label="Ciclos"
            active
            onPress={() => router.push("/admin-ciclos" as any)}
          />

          <BottomNavigationItem
            icon="book-outline"
            activeIcon="book"
            label="Materias"
            onPress={() => router.push("/admin-materias" as any)}
          />

          <BottomNavigationItem
            icon="people-outline"
            activeIcon="people"
            label="Grupos"
            onPress={() => router.push("/admin-grupos" as any)}
          />

          <BottomNavigationItem
            icon="grid-outline"
            activeIcon="grid"
            label="Cursos"
            onPress={() => router.push("/admin-cursos" as any)}
          />
        </View>
      </View>

      <Modal
        visible={selectorCicloVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectorCicloVisible(false)}
      >
        <View style={styles.selectorOverlay}>
          <View
            style={[
              styles.selectorCard,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <View style={styles.selectorHeader}>
              <View style={styles.selectorHeadingText}>
                <Text
                  style={[
                    styles.selectorTitle,
                    {
                      color: colores.texto,
                      fontSize: 20 * escalaTexto,
                    },
                  ]}
                  accessibilityRole="header"
                >
                  Ciclo escolar activo
                </Text>

                <Text
                  style={[
                    styles.selectorSubtitle,
                    {
                      color: colores.textoSecundario,
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  Este es el único ciclo disponible para administrar periodos.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: colores.fondo,
                    borderColor: colores.borde,
                  },
                ]}
                onPress={() => setSelectorCicloVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar selector de ciclo escolar"
              >
                <Ionicons name="close" size={23} color={colores.texto} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.selectorOptions}
            >
              {ciclos.map((ciclo) => {
                const seleccionado = ciclo.id_ciclo === idCicloSeleccionado;

                return (
                  <TouchableOpacity
                    key={ciclo.id_ciclo}
                    style={[
                      styles.selectorOption,
                      {
                        backgroundColor: seleccionado
                          ? fondoSuave
                          : colores.fondo,
                        borderColor: seleccionado
                          ? colorPrincipal
                          : colores.borde,
                      },
                    ]}
                    onPress={() => {
                      setIdCicloSeleccionado(ciclo.id_ciclo);
                      setSelectorCicloVisible(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: seleccionado }}
                    accessibilityLabel={`${ciclo.nombre}, del ${fechaLegible(
                      ciclo.fecha_inicio,
                    )} al ${fechaLegible(ciclo.fecha_fin)}`}
                  >
                    <View
                      style={[
                        styles.selectorRadio,
                        {
                          borderColor: seleccionado
                            ? colorPrincipal
                            : colores.textoSecundario,
                        },
                      ]}
                    >
                      {seleccionado ? (
                        <View
                          style={[
                            styles.selectorRadioDot,
                            {
                              backgroundColor: colorPrincipal,
                            },
                          ]}
                        />
                      ) : null}
                    </View>

                    <View style={styles.selectorOptionText}>
                      <Text
                        style={[
                          styles.selectorOptionName,
                          {
                            color: colores.texto,
                            fontSize: 14 * escalaTexto,
                          },
                        ]}
                      >
                        {ciclo.nombre}
                      </Text>

                      <Text
                        style={[
                          styles.selectorOptionDates,
                          {
                            color: colores.textoSecundario,
                            fontSize: 11 * escalaTexto,
                          },
                        ]}
                      >
                        {fechaLegible(ciclo.fecha_inicio)}
                        {" – "}
                        {fechaLegible(ciclo.fecha_fin)}
                      </Text>
                    </View>

                    {seleccionado ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={colorPrincipal}
                      />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={colores.textoSecundario}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      {
                        color: colores.texto,
                        fontSize: 21 * escalaTexto,
                      },
                    ]}
                  >
                    {periodoEditando ? "Editar periodo" : "Nuevo periodo"}
                  </Text>

                  <Text
                    style={[
                      styles.modalSubtitle,
                      {
                        color: colores.textoSecundario,
                        fontSize: 12 * escalaTexto,
                      },
                    ]}
                  >
                    Completa todos los campos.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: colores.fondo,
                      borderColor: colores.borde,
                    },
                  ]}
                  onPress={cerrarModal}
                >
                  <Ionicons name="close" size={23} color={colores.texto} />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalContent}
              >
                <Text
                  style={[
                    styles.label,
                    {
                      color: colores.texto,
                      fontSize: 13 * escalaTexto,
                    },
                  ]}
                >
                  Ciclo escolar
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.formCycleList}
                >
                  {ciclos
                    .filter((ciclo) => ciclo.estado !== "Cerrado")
                    .map((ciclo) => {
                      const seleccionado = ciclo.id_ciclo === idCicloFormulario;

                      return (
                        <TouchableOpacity
                          key={ciclo.id_ciclo}
                          style={[
                            styles.formCycleChip,
                            {
                              backgroundColor: seleccionado
                                ? fondoSuave
                                : colores.fondo,
                              borderColor: seleccionado
                                ? colorPrincipal
                                : colores.borde,
                            },
                          ]}
                          onPress={() =>
                            seleccionarCicloFormulario(ciclo.id_ciclo)
                          }
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: seleccionado,
                          }}
                        >
                          <Text
                            style={[
                              styles.formCycleText,
                              {
                                color: seleccionado
                                  ? colorPrincipal
                                  : colores.texto,
                                fontSize: 12 * escalaTexto,
                              },
                            ]}
                          >
                            {ciclo.nombre}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>

                {cicloFormulario ? (
                  <Text
                    style={[
                      styles.helpText,
                      {
                        color: colores.textoSecundario,
                        fontSize: 11 * escalaTexto,
                      },
                    ]}
                  >
                    Fechas permitidas:{" "}
                    {fechaLegible(cicloFormulario.fecha_inicio)}
                    {" – "}
                    {fechaLegible(cicloFormulario.fecha_fin)}
                  </Text>
                ) : null}

                <Text
                  style={[
                    styles.label,
                    {
                      color: colores.texto,
                      fontSize: 13 * escalaTexto,
                    },
                  ]}
                >
                  Nombre del periodo
                </Text>

                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: colores.fondo,
                      borderColor: colores.borde,
                    },
                  ]}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={colores.textoSecundario}
                  />

                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colores.texto,
                        fontSize: 14 * escalaTexto,
                      },
                    ]}
                    value={nombre}
                    onChangeText={setNombre}
                    placeholder="Ej. Primer periodo"
                    placeholderTextColor={colores.textoSecundario}
                    maxLength={100}
                    editable={!guardando}
                  />
                </View>

                <View style={styles.datesRow}>
                  <View style={styles.dateField}>
                    <Text
                      style={[
                        styles.label,
                        {
                          color: colores.texto,
                          fontSize: 13 * escalaTexto,
                        },
                      ]}
                    >
                      Fecha de inicio
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.dateInput,
                        {
                          backgroundColor: colores.fondo,
                          borderColor: colores.borde,
                        },
                      ]}
                      onPress={() => abrirCalendario("inicio")}
                      disabled={guardando}
                      accessibilityRole="button"
                      accessibilityLabel="Seleccionar fecha de inicio"
                    >
                      <Text
                        style={[
                          styles.dateInputText,
                          {
                            color: fechaInicio
                              ? colores.texto
                              : colores.textoSecundario,
                            fontSize: 13 * escalaTexto,
                          },
                        ]}
                      >
                        {fechaInicio
                          ? fechaLegible(fechaInicio)
                          : "Seleccionar fecha"}
                      </Text>

                      <Ionicons
                        name="calendar-outline"
                        size={21}
                        color={colorPrincipal}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateField}>
                    <Text
                      style={[
                        styles.label,
                        {
                          color: colores.texto,
                          fontSize: 13 * escalaTexto,
                        },
                      ]}
                    >
                      Fecha final
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.dateInput,
                        {
                          backgroundColor: colores.fondo,
                          borderColor: colores.borde,
                        },
                      ]}
                      onPress={() => abrirCalendario("fin")}
                      disabled={guardando}
                      accessibilityRole="button"
                      accessibilityLabel="Seleccionar fecha final"
                    >
                      <Text
                        style={[
                          styles.dateInputText,
                          {
                            color: fechaFin
                              ? colores.texto
                              : colores.textoSecundario,
                            fontSize: 13 * escalaTexto,
                          },
                        ]}
                      >
                        {fechaFin
                          ? fechaLegible(fechaFin)
                          : "Seleccionar fecha"}
                      </Text>

                      <Ionicons
                        name="calendar-outline"
                        size={21}
                        color={colorPrincipal}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {campoFechaVisible && cicloFormulario ? (
                  <View
                    style={[
                      styles.calendarBox,
                      {
                        backgroundColor: colores.fondo,
                        borderColor: colores.borde,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarTitle,
                        {
                          color: colores.texto,
                          fontSize: 13 * escalaTexto,
                        },
                      ]}
                    >
                      {campoFechaVisible === "inicio"
                        ? "Selecciona la fecha de inicio"
                        : "Selecciona la fecha final"}
                    </Text>

                    <DateTimePicker
                      value={obtenerFechaDelCalendario()}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      minimumDate={obtenerFechaMinima()}
                      maximumDate={obtenerFechaMaxima()}
                      onChange={seleccionarFecha}
                      locale="es-MX"
                    />

                    {Platform.OS === "ios" ? (
                      <TouchableOpacity
                        style={[
                          styles.calendarConfirmButton,
                          {
                            backgroundColor: colorPrincipal,
                          },
                        ]}
                        onPress={() => setCampoFechaVisible(null)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.calendarConfirmText}>Aceptar</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                <Text
                  style={[
                    styles.label,
                    {
                      color: colores.texto,
                      fontSize: 13 * escalaTexto,
                    },
                  ]}
                >
                  Estado
                </Text>

                <View style={styles.stateOptions}>
                  {ESTADOS.map((opcion) => {
                    const seleccionado = estado === opcion;

                    const colorEstado = obtenerColorEstado(opcion);

                    return (
                      <TouchableOpacity
                        key={opcion}
                        style={[
                          styles.stateOption,
                          {
                            backgroundColor: seleccionado
                              ? colores.fondo
                              : colores.tarjeta,
                            borderColor: seleccionado
                              ? colorEstado
                              : colores.borde,
                          },
                        ]}
                        onPress={() => setEstado(opcion)}
                      >
                        <View
                          style={[
                            styles.stateRadio,
                            {
                              borderColor: colorEstado,
                            },
                          ]}
                        >
                          {seleccionado ? (
                            <View
                              style={[
                                styles.stateRadioDot,
                                {
                                  backgroundColor: colorEstado,
                                },
                              ]}
                            />
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.stateText,
                            {
                              color: colores.texto,
                              fontSize: 11 * escalaTexto,
                            },
                          ]}
                        >
                          {opcion}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.cancelButton,
                      {
                        backgroundColor: colores.fondo,
                        borderColor: colores.borde,
                      },
                    ]}
                    onPress={cerrarModal}
                    disabled={guardando}
                  >
                    <Text
                      style={[
                        styles.cancelText,
                        {
                          color: colores.texto,
                          fontSize: 13 * escalaTexto,
                        },
                      ]}
                    >
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      {
                        backgroundColor: colorPrincipal,
                        opacity: guardando ? 0.7 : 1,
                      },
                    ]}
                    onPress={guardarPeriodo}
                    disabled={guardando}
                  >
                    {guardando ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons
                          name="save-outline"
                          size={19}
                          color="#FFFFFF"
                        />

                        <Text
                          style={[
                            styles.saveText,
                            {
                              fontSize: 13 * escalaTexto,
                            },
                          ]}
                        >
                          Guardar
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
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
  const { colores, escalaTexto, preferencias } = useAccessibility();

  const colorMenuActivo = preferencias.altoContraste
    ? colores.primario
    : preferencias.modoOscuro
      ? "#9BCDC2"
      : "#3E6B62";

  const fondoMenuActivo = preferencias.altoContraste
    ? colores.fondoPrimario
    : preferencias.modoOscuro
      ? "#173A34"
      : "#EAF2EF";

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
            backgroundColor: fondoMenuActivo,
          },
        ]}
      >
        <Ionicons
          name={active ? activeIcon : icon}
          size={22}
          color={active ? colorMenuActivo : colores.textoSecundario}
        />
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.bottomLabel,
          {
            color: active ? colorMenuActivo : colores.textoSecundario,
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
  safeArea: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontWeight: "600",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 45,
  },
  content: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 25,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: "#3E6B62",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  headingText: {
    flex: 1,
    paddingRight: 15,
  },
  title: {
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 7,
    fontWeight: "500",
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    marginTop: 28,
    fontWeight: "900",
  },
  sectionSubtitle: {
    marginTop: 4,
    fontWeight: "500",
  },
  emptyCompact: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 16,
    marginTop: 13,
  },
  cycleSelector: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginTop: 13,
  },
  cycleSelectorIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  cycleSelectorText: {
    flex: 1,
    marginLeft: 12,
  },
  cycleSelectorLabel: {
    marginBottom: 3,
    fontWeight: "900",
  },
  cycleName: {
    fontWeight: "900",
  },
  cycleDates: {
    marginTop: 3,
    fontWeight: "600",
  },
  changeCycle: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  changeCycleText: {
    marginRight: 2,
    fontWeight: "900",
  },
  periodHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 32,
    marginBottom: 15,
  },
  periodHeaderTitle: {
    fontWeight: "900",
  },
  addButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginLeft: 4,
  },
  emptyCard: {
    minHeight: 220,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    marginTop: 14,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 7,
    textAlign: "center",
    fontWeight: "500",
  },
  cardsGrid: {
    gap: 13,
  },
  cardsGridTwoColumns: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  periodCard: {
    width: "100%",
    borderWidth: 1,
    borderLeftWidth: 6,
    borderRadius: 20,
    padding: 16,
  },
  periodCardColumn: {
    width: "49%",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  periodIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  periodNumber: {
    fontWeight: "900",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontWeight: "900",
  },
  periodName: {
    marginTop: 15,
    fontWeight: "900",
  },
  cycleCaption: {
    marginTop: 4,
    fontWeight: "600",
  },
  dateBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 15,
  },
  dateItem: {
    flex: 1,
  },
  dateDivider: {
    width: 1,
    marginHorizontal: 11,
  },
  dateLabel: {
    fontWeight: "900",
  },
  dateValue: {
    marginTop: 4,
    fontWeight: "800",
  },
  cardActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 15,
  },
  secondaryAction: {
    minHeight: 42,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 13,
  },
  primaryAction: {
    minHeight: 42,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
  },
  actionText: {
    marginLeft: 5,
    fontWeight: "900",
  },
  selectorOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.58)",
    padding: 22,
  },
  selectorCard: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "76%",
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 15,
  },
  selectorHeadingText: {
    flex: 1,
    paddingRight: 12,
  },
  selectorTitle: {
    fontWeight: "900",
  },
  selectorSubtitle: {
    marginTop: 4,
    fontWeight: "500",
  },
  selectorOptions: {
    gap: 9,
    paddingBottom: 2,
  },
  selectorOption: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  selectorRadio: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  selectorOptionText: {
    flex: 1,
    marginHorizontal: 11,
  },
  selectorOptionName: {
    fontWeight: "900",
  },
  selectorOptionDates: {
    marginTop: 4,
    fontWeight: "600",
  },
  modalKeyboard: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.58)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "92%",
    alignSelf: "center",
    borderWidth: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 21,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 13,
  },
  modalTitle: {
    fontWeight: "900",
  },
  modalSubtitle: {
    marginTop: 4,
    fontWeight: "500",
  },
  closeButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    paddingBottom: 30,
  },
  label: {
    marginTop: 16,
    marginBottom: 7,
    fontWeight: "800",
  },
  formCycleList: {
    gap: 8,
    paddingRight: 12,
  },
  formCycleChip: {
    minHeight: 42,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
  },
  formCycleText: {
    fontWeight: "800",
  },
  helpText: {
    marginTop: 8,
    fontWeight: "600",
  },
  inputBox: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    minHeight: 50,
    marginLeft: 9,
  },
  datesRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
  dateInput: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  dateInputText: {
    flex: 1,
    marginRight: 8,
    fontWeight: "600",
  },
  calendarBox: {
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 12,
    padding: 12,
  },
  calendarTitle: {
    marginBottom: 6,
    fontWeight: "800",
    textAlign: "center",
  },
  calendarConfirmButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginTop: 8,
  },
  calendarConfirmText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  stateOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stateOption: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 11,
  },
  stateRadio: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  stateRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  stateText: {
    marginLeft: 7,
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 25,
  },
  cancelButton: {
    minHeight: 52,
    flex: 1,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontWeight: "900",
  },
  saveButton: {
    minHeight: 52,
    flex: 1.25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginLeft: 6,
  },
  bottomNavigation: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },
  bottomContent: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  bottomItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  bottomIconContainer: {
    minWidth: 35,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomLabel: {
    marginTop: 2,
    fontWeight: "600",
  },
  bottomLabelActive: {
    fontWeight: "900",
  },
});
