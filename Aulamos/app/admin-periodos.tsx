import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type EstadoAcademico = 'Activo' | 'Inactivo' | 'Cerrado';

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

const ESTADOS: EstadoAcademico[] = [
  'Activo',
  'Inactivo',
  'Cerrado',
];

const leerRespuesta = async (
  respuesta: Response
): Promise<RespuestaApi> => {
  const texto = await respuesta.text();

  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(texto) as RespuestaApi;
  } catch {
    return {
      mensaje: 'El servidor envió una respuesta no válida.',
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
  const partes = fecha.split('-');

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

export default function AdminPeriodosScreen() {
  const { width } = useWindowDimensions();

  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const [ciclos, setCiclos] = useState<CicloEscolar[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoEvaluacion[]>([]);

  const [idCicloSeleccionado, setIdCicloSeleccionado] =
    useState<number | null>(null);

  const [idCicloFormulario, setIdCicloFormulario] =
    useState<number | null>(null);

  const [nombre, setNombre] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [estado, setEstado] =
    useState<EstadoAcademico>('Inactivo');

  const [periodoEditando, setPeriodoEditando] =
    useState<PeriodoEvaluacion | null>(null);

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const altoContraste = preferencias.altoContraste;
  const modoOscuro =
    preferencias.modoOscuro || altoContraste;

  const dosColumnas =
    width >= 720 && escalaTexto <= 1.15;

  const colorPrincipal = altoContraste
    ? colores.primario
    : modoOscuro
      ? '#FBBF24'
      : '#D97706';

  const fondoSuave = altoContraste
    ? colores.tarjeta
    : modoOscuro
      ? '#451A03'
      : '#FFFBEB';

  const cicloSeleccionado = useMemo(() => {
    return (
      ciclos.find(
        (ciclo) =>
          ciclo.id_ciclo === idCicloSeleccionado
      ) ?? null
    );
  }, [ciclos, idCicloSeleccionado]);

  const cicloFormulario = useMemo(() => {
    return (
      ciclos.find(
        (ciclo) =>
          ciclo.id_ciclo === idCicloFormulario
      ) ?? null
    );
  }, [ciclos, idCicloFormulario]);

  const periodosFiltrados = useMemo(() => {
    if (idCicloSeleccionado === null) {
      return periodos;
    }

    return periodos.filter(
      (periodo) =>
        periodo.id_ciclo === idCicloSeleccionado
    );
  }, [idCicloSeleccionado, periodos]);

  const cerrarSesion = async () => {
    await AsyncStorage.multiRemove([
      'token',
      'usuario',
    ]);

    Alert.alert(
      'Sesión vencida',
      'Inicia sesión nuevamente.'
    );

    router.replace('/');
  };

  const cargarDatos = async (
    mostrarCarga = true
  ) => {
    try {
      if (mostrarCarga) {
        setCargando(true);
      }

      const token =
        await AsyncStorage.getItem('token');

      if (!token) {
        await cerrarSesion();
        return;
      }

      const [
        respuestaCiclos,
        respuestaPeriodos,
      ] = await Promise.all([
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

      if (
        respuestaCiclos.status === 401 ||
        respuestaPeriodos.status === 401
      ) {
        await cerrarSesion();
        return;
      }

      const [
        datosCiclos,
        datosPeriodos,
      ] = await Promise.all([
        leerRespuesta(respuestaCiclos),
        leerRespuesta(respuestaPeriodos),
      ]);

      if (!respuestaCiclos.ok) {
        throw new Error(
          datosCiclos.mensaje ||
            'No fue posible cargar los ciclos.'
        );
      }

      if (!respuestaPeriodos.ok) {
        throw new Error(
          datosPeriodos.mensaje ||
            'No fue posible cargar los periodos.'
        );
      }

      const ciclosRecibidos =
        datosCiclos.ciclos ?? [];

      setCiclos(ciclosRecibidos);
      setPeriodos(
        datosPeriodos.periodos ?? []
      );

      setIdCicloSeleccionado((actual) => {
        const cicloActualExiste =
          actual !== null &&
          ciclosRecibidos.some(
            (ciclo) =>
              ciclo.id_ciclo === actual
          );

        if (cicloActualExiste) {
          return actual;
        }

        const cicloActivo =
          ciclosRecibidos.find(
            (ciclo) =>
              ciclo.estado === 'Activo'
          );

        return (
          cicloActivo?.id_ciclo ??
          ciclosRecibidos[0]?.id_ciclo ??
          null
        );
      });
    } catch (error) {
      console.error(
        'Error al cargar periodos:',
        error
      );

      Alert.alert(
        'No se pudieron cargar los datos',
        error instanceof Error
          ? error.message
          : 'Verifica la conexión con la API.'
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
    setNombre('');
    setFechaInicio('');
    setFechaFin('');
    setEstado('Inactivo');
    setPeriodoEditando(null);
  };

  const abrirNuevoPeriodo = () => {
    if (!cicloSeleccionado) {
      Alert.alert(
        'Ciclo requerido',
        'Primero selecciona un ciclo escolar.'
      );
      return;
    }

    if (
      cicloSeleccionado.estado === 'Cerrado'
    ) {
      Alert.alert(
        'Ciclo cerrado',
        'No puedes agregar periodos a un ciclo cerrado.'
      );
      return;
    }

    limpiarFormulario();

    setIdCicloFormulario(
      cicloSeleccionado.id_ciclo
    );

    setModalVisible(true);
  };

  const abrirEdicion = (
    periodo: PeriodoEvaluacion
  ) => {
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

  const validarFormulario = () => {
    const nombreLimpio = nombre
      .trim()
      .replace(/\s+/g, ' ');

    if (
      !idCicloFormulario ||
      !cicloFormulario
    ) {
      Alert.alert(
        'Ciclo requerido',
        'Selecciona un ciclo escolar.'
      );
      return false;
    }

    if (
      nombreLimpio.length < 2 ||
      nombreLimpio.length > 100
    ) {
      Alert.alert(
        'Nombre no válido',
        'El nombre debe tener entre 2 y 100 caracteres.'
      );
      return false;
    }

    if (!esFechaValida(fechaInicio)) {
      Alert.alert(
        'Fecha no válida',
        'Escribe la fecha de inicio con el formato AAAA-MM-DD.'
      );
      return false;
    }

    if (!esFechaValida(fechaFin)) {
      Alert.alert(
        'Fecha no válida',
        'Escribe la fecha final con el formato AAAA-MM-DD.'
      );
      return false;
    }

    if (fechaInicio >= fechaFin) {
      Alert.alert(
        'Rango incorrecto',
        'La fecha final debe ser posterior a la fecha de inicio.'
      );
      return false;
    }

    if (
      fechaInicio <
        cicloFormulario.fecha_inicio ||
      fechaFin > cicloFormulario.fecha_fin
    ) {
      Alert.alert(
        'Fechas fuera del ciclo',
        `Las fechas deben estar entre ${fechaLegible(
          cicloFormulario.fecha_inicio
        )} y ${fechaLegible(
          cicloFormulario.fecha_fin
        )}.`
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

      const token =
        await AsyncStorage.getItem('token');

      if (!token) {
        await cerrarSesion();
        return;
      }

      const esEdicion =
        periodoEditando !== null;

      const url = esEdicion
        ? `${API_URL}/academico/periodos/${periodoEditando.id_periodo}`
        : `${API_URL}/academico/periodos`;

      const respuesta = await fetch(url, {
        method: esEdicion ? 'PUT' : 'POST',
        headers: {
          'Content-Type':
            'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_ciclo: idCicloFormulario,
          nombre: nombre
            .trim()
            .replace(/\s+/g, ' '),
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          estado,
        }),
      });

      const datos =
        await leerRespuesta(respuesta);

      if (respuesta.status === 401) {
        await cerrarSesion();
        return;
      }

      if (!respuesta.ok) {
        Alert.alert(
          'No se pudo guardar',
          datos.mensaje ||
            'Revisa los datos ingresados.'
        );
        return;
      }

      setModalVisible(false);
      limpiarFormulario();

      Alert.alert(
        'Operación correcta',
        datos.mensaje ||
          'El periodo fue guardado correctamente.'
      );

      await cargarDatos(false);
    } catch (error) {
      console.error(
        'Error al guardar periodo:',
        error
      );

      Alert.alert(
        'Error de conexión',
        'No fue posible comunicarse con la API.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (
    periodo: PeriodoEvaluacion,
    nuevoEstado: EstadoAcademico
  ) => {
    try {
      const token =
        await AsyncStorage.getItem('token');

      if (!token) {
        await cerrarSesion();
        return;
      }

      const respuesta = await fetch(
        `${API_URL}/academico/periodos/${periodo.id_periodo}/estado`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            estado: nuevoEstado,
          }),
        }
      );

      const datos =
        await leerRespuesta(respuesta);

      if (respuesta.status === 401) {
        await cerrarSesion();
        return;
      }

      if (!respuesta.ok) {
        Alert.alert(
          'No se pudo cambiar el estado',
          datos.mensaje ||
            'Inténtalo nuevamente.'
        );
        return;
      }

      Alert.alert(
        'Estado actualizado',
        datos.mensaje ||
          'El estado fue actualizado.'
      );

      await cargarDatos(false);
    } catch (error) {
      console.error(
        'Error al cambiar estado:',
        error
      );

      Alert.alert(
        'Error de conexión',
        'No fue posible comunicarse con la API.'
      );
    }
  };

  const confirmarCambioEstado = (
    periodo: PeriodoEvaluacion,
    nuevoEstado: EstadoAcademico
  ) => {
    Alert.alert(
      'Cambiar estado',
      `¿Deseas cambiar "${periodo.nombre}" al estado ${nuevoEstado}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          style:
            nuevoEstado === 'Cerrado'
              ? 'destructive'
              : 'default',
          onPress: () =>
            cambiarEstado(
              periodo,
              nuevoEstado
            ),
        },
      ]
    );
  };

  const obtenerColorEstado = (
    estadoPeriodo: EstadoAcademico
  ) => {
    if (altoContraste) {
      return colores.primario;
    }

    if (estadoPeriodo === 'Activo') {
      return colores.exito;
    }

    if (estadoPeriodo === 'Cerrado') {
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
            backgroundColor:
              colores.fondo,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colorPrincipal}
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
          Cargando periodos...
        </Text>
      </SafeAreaView>
    );
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
      <ScrollView
        contentContainerStyle={
          styles.container
        }
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
                  backgroundColor:
                    colores.tarjeta,
                  borderColor:
                    colores.borde,
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

            <BotonAccesibilidad />
          </View>

          <View style={styles.headingRow}>
            <View style={styles.headingText}>
              <Text
                style={[
                  styles.title,
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
                Periodos de evaluación
              </Text>

              <Text
                style={[
                  styles.subtitle,
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
                Administra los periodos de
                cada ciclo escolar.
              </Text>
            </View>

            <View
              style={[
                styles.headerIcon,
                {
                  backgroundColor:
                    fondoSuave,
                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={31}
                color={colorPrincipal}
              />
            </View>
          </View>

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor:
                  fondoSuave,
                borderColor:
                  colores.borde,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={25}
              color={colorPrincipal}
            />

            <Text
              style={[
                styles.infoText,
                {
                  color: colores.texto,
                  fontSize:
                    13 * escalaTexto,
                  lineHeight:
                    19 * escalaTexto,
                },
              ]}
            >
              Las fechas deben estar dentro
              del ciclo escolar y no pueden
              cruzarse con otro periodo.
            </Text>
          </View>

          <Text
            style={[
              styles.sectionTitle,
              {
                color: colores.texto,
                fontSize:
                  18 * escalaTexto,
              },
            ]}
          >
            Ciclo escolar
          </Text>

          <Text
            style={[
              styles.sectionSubtitle,
              {
                color:
                  colores.textoSecundario,
                fontSize:
                  12 * escalaTexto,
              },
            ]}
          >
            Selecciona el ciclo que deseas
            consultar.
          </Text>

          {ciclos.length === 0 ? (
            <View
              style={[
                styles.emptyCompact,
                {
                  backgroundColor:
                    colores.tarjeta,
                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    colores.textoSecundario,
                  fontSize:
                    13 * escalaTexto,
                }}
              >
                Primero crea un ciclo escolar.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.cycleList
              }
            >
              {ciclos.map((ciclo) => {
                const seleccionado =
                  ciclo.id_ciclo ===
                  idCicloSeleccionado;

                return (
                  <TouchableOpacity
                    key={ciclo.id_ciclo}
                    style={[
                      styles.cycleChip,
                      {
                        backgroundColor:
                          seleccionado
                            ? fondoSuave
                            : colores.tarjeta,
                        borderColor:
                          seleccionado
                            ? colorPrincipal
                            : colores.borde,
                      },
                    ]}
                    onPress={() =>
                      setIdCicloSeleccionado(
                        ciclo.id_ciclo
                      )
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      selected:
                        seleccionado,
                    }}
                  >
                    <Ionicons
                      name={
                        ciclo.estado ===
                        'Activo'
                          ? 'radio-button-on'
                          : 'calendar-outline'
                      }
                      size={18}
                      color={
                        seleccionado
                          ? colorPrincipal
                          : colores.textoSecundario
                      }
                    />

                    <View
                      style={
                        styles.cycleChipText
                      }
                    >
                      <Text
                        style={[
                          styles.cycleName,
                          {
                            color:
                              colores.texto,
                            fontSize:
                              13 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {ciclo.nombre}
                      </Text>

                      <Text
                        style={[
                          styles.cycleDates,
                          {
                            color:
                              colores.textoSecundario,
                            fontSize:
                              10 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {fechaLegible(
                          ciclo.fecha_inicio
                        )}
                        {' – '}
                        {fechaLegible(
                          ciclo.fecha_fin
                        )}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.periodHeader}>
            <View>
              <Text
                style={[
                  styles.periodHeaderTitle,
                  {
                    color: colores.texto,
                    fontSize:
                      20 * escalaTexto,
                  },
                ]}
              >
                Periodos registrados
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      12 * escalaTexto,
                  },
                ]}
              >
                {periodosFiltrados.length}{' '}
                {periodosFiltrados.length ===
                1
                  ? 'periodo encontrado'
                  : 'periodos encontrados'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor:
                    colorPrincipal,
                  opacity:
                    !cicloSeleccionado ||
                    cicloSeleccionado.estado ===
                      'Cerrado'
                      ? 0.55
                      : 1,
                },
              ]}
              onPress={abrirNuevoPeriodo}
              accessibilityRole="button"
            >
              <Ionicons
                name="add"
                size={22}
                color="#FFFFFF"
              />

              <Text
                style={[
                  styles.addButtonText,
                  {
                    fontSize:
                      13 * escalaTexto,
                  },
                ]}
              >
                Nuevo
              </Text>
            </TouchableOpacity>
          </View>

          {periodosFiltrados.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor:
                    colores.tarjeta,
                  borderColor:
                    colores.borde,
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
                    fontSize:
                      17 * escalaTexto,
                  },
                ]}
              >
                Aún no hay periodos
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      13 * escalaTexto,
                  },
                ]}
              >
                Crea el primer periodo para
                este ciclo escolar.
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.cardsGrid,
                dosColumnas &&
                  styles.cardsGridTwoColumns,
              ]}
            >
              {periodosFiltrados.map(
                (periodo) => {
                  const colorEstado =
                    obtenerColorEstado(
                      periodo.estado
                    );

                  return (
                    <View
                      key={
                        periodo.id_periodo
                      }
                      style={[
                        styles.periodCard,
                        dosColumnas &&
                          styles.periodCardColumn,
                        {
                          backgroundColor:
                            colores.tarjeta,
                          borderColor:
                            periodo.estado ===
                            'Activo'
                              ? colorEstado
                              : colores.borde,
                        },
                      ]}
                    >
                      <View
                        style={styles.cardTop}
                      >
                        <View
                          style={[
                            styles.periodIcon,
                            {
                              backgroundColor:
                                fondoSuave,
                              borderColor:
                                colores.borde,
                            },
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={24}
                            color={
                              colorPrincipal
                            }
                          />
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              borderColor:
                                colorEstado,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              {
                                backgroundColor:
                                  colorEstado,
                              },
                            ]}
                          />

                          <Text
                            style={[
                              styles.statusText,
                              {
                                color:
                                  colorEstado,
                                fontSize:
                                  10 *
                                  escalaTexto,
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
                            color:
                              colores.texto,
                            fontSize:
                              17 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {periodo.nombre}
                      </Text>

                      <Text
                        style={[
                          styles.cycleCaption,
                          {
                            color:
                              colores.textoSecundario,
                            fontSize:
                              11 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {periodo.ciclo}
                      </Text>

                      <View
                        style={[
                          styles.dateBox,
                          {
                            backgroundColor:
                              colores.fondo,
                            borderColor:
                              colores.borde,
                          },
                        ]}
                      >
                        <View
                          style={styles.dateItem}
                        >
                          <Text
                            style={[
                              styles.dateLabel,
                              {
                                color:
                                  colores.textoSecundario,
                                fontSize:
                                  10 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            INICIO
                          </Text>

                          <Text
                            style={[
                              styles.dateValue,
                              {
                                color:
                                  colores.texto,
                                fontSize:
                                  12 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            {fechaLegible(
                              periodo.fecha_inicio
                            )}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.dateDivider,
                            {
                              backgroundColor:
                                colores.borde,
                            },
                          ]}
                        />

                        <View
                          style={styles.dateItem}
                        >
                          <Text
                            style={[
                              styles.dateLabel,
                              {
                                color:
                                  colores.textoSecundario,
                                fontSize:
                                  10 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            FIN
                          </Text>

                          <Text
                            style={[
                              styles.dateValue,
                              {
                                color:
                                  colores.texto,
                                fontSize:
                                  12 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            {fechaLegible(
                              periodo.fecha_fin
                            )}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={styles.cardActions}
                      >
                        <TouchableOpacity
                          style={[
                            styles.secondaryAction,
                            {
                              backgroundColor:
                                colores.fondo,
                              borderColor:
                                colores.borde,
                            },
                          ]}
                          onPress={() =>
                            abrirEdicion(
                              periodo
                            )
                          }
                        >
                          <Ionicons
                            name="create-outline"
                            size={18}
                            color={
                              colorPrincipal
                            }
                          />

                          <Text
                            style={[
                              styles.actionText,
                              {
                                color:
                                  colores.texto,
                                fontSize:
                                  11 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            Editar
                          </Text>
                        </TouchableOpacity>

                        {periodo.estado ===
                        'Inactivo' ? (
                          <TouchableOpacity
                            style={[
                              styles.primaryAction,
                              {
                                backgroundColor:
                                  colores.exito,
                              },
                            ]}
                            onPress={() =>
                              confirmarCambioEstado(
                                periodo,
                                'Activo'
                              )
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
                                  color:
                                    '#FFFFFF',
                                  fontSize:
                                    11 *
                                    escalaTexto,
                                },
                              ]}
                            >
                              Activar
                            </Text>
                          </TouchableOpacity>
                        ) : null}

                        {periodo.estado ===
                        'Activo' ? (
                          <TouchableOpacity
                            style={[
                              styles.primaryAction,
                              {
                                backgroundColor:
                                  colores.peligro,
                              },
                            ]}
                            onPress={() =>
                              confirmarCambioEstado(
                                periodo,
                                'Cerrado'
                              )
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
                                  color:
                                    '#FFFFFF',
                                  fontSize:
                                    11 *
                                    escalaTexto,
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
                }
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor:
                    colores.tarjeta,
                  borderColor:
                    colores.borde,
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
                        fontSize:
                          21 * escalaTexto,
                      },
                    ]}
                  >
                    {periodoEditando
                      ? 'Editar periodo'
                      : 'Nuevo periodo'}
                  </Text>

                  <Text
                    style={[
                      styles.modalSubtitle,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          12 * escalaTexto,
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
                      backgroundColor:
                        colores.fondo,
                      borderColor:
                        colores.borde,
                    },
                  ]}
                  onPress={cerrarModal}
                >
                  <Ionicons
                    name="close"
                    size={23}
                    color={colores.texto}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.modalContent
                }
              >
                <Text
                  style={[
                    styles.label,
                    {
                      color: colores.texto,
                      fontSize:
                        13 * escalaTexto,
                    },
                  ]}
                >
                  Ciclo escolar
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.formCycleList
                  }
                >
                  {ciclos
                    .filter(
                      (ciclo) =>
                        ciclo.estado !==
                        'Cerrado'
                    )
                    .map((ciclo) => {
                      const seleccionado =
                        ciclo.id_ciclo ===
                        idCicloFormulario;

                      return (
                        <TouchableOpacity
                          key={ciclo.id_ciclo}
                          style={[
                            styles.formCycleChip,
                            {
                              backgroundColor:
                                seleccionado
                                  ? fondoSuave
                                  : colores.fondo,
                              borderColor:
                                seleccionado
                                  ? colorPrincipal
                                  : colores.borde,
                            },
                          ]}
                          onPress={() =>
                            setIdCicloFormulario(
                              ciclo.id_ciclo
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.formCycleText,
                              {
                                color:
                                  seleccionado
                                    ? colorPrincipal
                                    : colores.texto,
                                fontSize:
                                  12 *
                                  escalaTexto,
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
                        color:
                          colores.textoSecundario,
                        fontSize:
                          11 * escalaTexto,
                      },
                    ]}
                  >
                    Fechas permitidas:{' '}
                    {fechaLegible(
                      cicloFormulario.fecha_inicio
                    )}
                    {' – '}
                    {fechaLegible(
                      cicloFormulario.fecha_fin
                    )}
                  </Text>
                ) : null}

                <Text
                  style={[
                    styles.label,
                    {
                      color: colores.texto,
                      fontSize:
                        13 * escalaTexto,
                    },
                  ]}
                >
                  Nombre del periodo
                </Text>

                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor:
                        colores.fondo,
                      borderColor:
                        colores.borde,
                    },
                  ]}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={
                      colores.textoSecundario
                    }
                  />

                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colores.texto,
                        fontSize:
                          14 * escalaTexto,
                      },
                    ]}
                    value={nombre}
                    onChangeText={setNombre}
                    placeholder="Ej. Primer periodo"
                    placeholderTextColor={
                      colores.textoSecundario
                    }
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
                          color:
                            colores.texto,
                          fontSize:
                            13 *
                            escalaTexto,
                        },
                      ]}
                    >
                      Fecha de inicio
                    </Text>

                    <TextInput
                      style={[
                        styles.dateInput,
                        {
                          color:
                            colores.texto,
                          backgroundColor:
                            colores.fondo,
                          borderColor:
                            colores.borde,
                          fontSize:
                            13 *
                            escalaTexto,
                        },
                      ]}
                      value={fechaInicio}
                      onChangeText={
                        setFechaInicio
                      }
                      placeholder="AAAA-MM-DD"
                      placeholderTextColor={
                        colores.textoSecundario
                      }
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                      editable={!guardando}
                    />
                  </View>

                  <View style={styles.dateField}>
                    <Text
                      style={[
                        styles.label,
                        {
                          color:
                            colores.texto,
                          fontSize:
                            13 *
                            escalaTexto,
                        },
                      ]}
                    >
                      Fecha final
                    </Text>

                    <TextInput
                      style={[
                        styles.dateInput,
                        {
                          color:
                            colores.texto,
                          backgroundColor:
                            colores.fondo,
                          borderColor:
                            colores.borde,
                          fontSize:
                            13 *
                            escalaTexto,
                        },
                      ]}
                      value={fechaFin}
                      onChangeText={setFechaFin}
                      placeholder="AAAA-MM-DD"
                      placeholderTextColor={
                        colores.textoSecundario
                      }
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                      editable={!guardando}
                    />
                  </View>
                </View>

                <Text
                  style={[
                    styles.label,
                    {
                      color: colores.texto,
                      fontSize:
                        13 * escalaTexto,
                    },
                  ]}
                >
                  Estado
                </Text>

                <View
                  style={styles.stateOptions}
                >
                  {ESTADOS.map((opcion) => {
                    const seleccionado =
                      estado === opcion;

                    const colorEstado =
                      obtenerColorEstado(
                        opcion
                      );

                    return (
                      <TouchableOpacity
                        key={opcion}
                        style={[
                          styles.stateOption,
                          {
                            backgroundColor:
                              seleccionado
                                ? colores.fondo
                                : colores.tarjeta,
                            borderColor:
                              seleccionado
                                ? colorEstado
                                : colores.borde,
                          },
                        ]}
                        onPress={() =>
                          setEstado(opcion)
                        }
                      >
                        <View
                          style={[
                            styles.stateRadio,
                            {
                              borderColor:
                                colorEstado,
                            },
                          ]}
                        >
                          {seleccionado ? (
                            <View
                              style={[
                                styles.stateRadioDot,
                                {
                                  backgroundColor:
                                    colorEstado,
                                },
                              ]}
                            />
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.stateText,
                            {
                              color:
                                colores.texto,
                              fontSize:
                                11 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {opcion}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View
                  style={styles.modalActions}
                >
                  <TouchableOpacity
                    style={[
                      styles.cancelButton,
                      {
                        backgroundColor:
                          colores.fondo,
                        borderColor:
                          colores.borde,
                      },
                    ]}
                    onPress={cerrarModal}
                    disabled={guardando}
                  >
                    <Text
                      style={[
                        styles.cancelText,
                        {
                          color:
                            colores.texto,
                          fontSize:
                            13 *
                            escalaTexto,
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
                        backgroundColor:
                          colorPrincipal,
                        opacity: guardando
                          ? 0.7
                          : 1,
                      },
                    ]}
                    onPress={guardarPeriodo}
                    disabled={guardando}
                  >
                    {guardando ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                      />
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
                              fontSize:
                                13 *
                                escalaTexto,
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loading: {
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
    paddingBottom: 45,
  },
  content: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
  },
  headingText: {
    flex: 1,
    paddingRight: 15,
  },
  title: {
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 7,
    fontWeight: '500',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginTop: 22,
    marginBottom: 27,
  },
  infoText: {
    flex: 1,
    marginLeft: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    fontWeight: '900',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontWeight: '500',
  },
  emptyCompact: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 16,
    marginTop: 13,
  },
  cycleList: {
    gap: 10,
    paddingTop: 13,
    paddingRight: 12,
  },
  cycleChip: {
    minWidth: 210,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  cycleChipText: {
    marginLeft: 9,
  },
  cycleName: {
    fontWeight: '800',
  },
  cycleDates: {
    marginTop: 3,
    fontWeight: '600',
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 15,
  },
  periodHeaderTitle: {
    fontWeight: '900',
  },
  addButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 4,
  },
  emptyCard: {
    minHeight: 220,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    marginTop: 14,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 7,
    textAlign: 'center',
    fontWeight: '500',
  },
  cardsGrid: {
    gap: 13,
  },
  cardsGridTwoColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  periodCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  periodCardColumn: {
    width: '49%',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '900',
  },
  periodName: {
    marginTop: 15,
    fontWeight: '900',
  },
  cycleCaption: {
    marginTop: 4,
    fontWeight: '600',
  },
  dateBox: {
    flexDirection: 'row',
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
    fontWeight: '900',
  },
  dateValue: {
    marginTop: 4,
    fontWeight: '800',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 15,
  },
  secondaryAction: {
    minHeight: 42,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
  },
  primaryAction: {
    minHeight: 42,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  actionText: {
    marginLeft: 5,
    fontWeight: '900',
  },
  modalKeyboard: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor:
      'rgba(15, 23, 42, 0.58)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '92%',
    alignSelf: 'center',
    borderWidth: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 21,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 13,
  },
  modalTitle: {
    fontWeight: '900',
  },
  modalSubtitle: {
    marginTop: 4,
    fontWeight: '500',
  },
  closeButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingBottom: 30,
  },
  label: {
    marginTop: 16,
    marginBottom: 7,
    fontWeight: '800',
  },
  formCycleList: {
    gap: 8,
    paddingRight: 12,
  },
  formCycleChip: {
    minHeight: 42,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
  },
  formCycleText: {
    fontWeight: '800',
  },
  helpText: {
    marginTop: 8,
    fontWeight: '600',
  },
  inputBox: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
  dateInput: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  stateOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stateOption: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 11,
  },
  stateRadio: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  stateText: {
    marginLeft: 7,
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 25,
  },
  cancelButton: {
    minHeight: 52,
    flex: 1,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontWeight: '900',
  },
  saveButton: {
    minHeight: 52,
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 6,
  },
});