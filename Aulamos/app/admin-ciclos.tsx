import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type EstadoCiclo =
  | 'Activo'
  | 'Inactivo'
  | 'Cerrado';

type CicloEscolar = {
  id_ciclo: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoCiclo;
  total_periodos: number;
  total_grupos: number;
  total_cursos: number;
};

type UsuarioGuardado = {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: string;
};

type RespuestaApi = {
  mensaje?: string;
  ciclos?: CicloEscolar[];
  ciclo?: CicloEscolar;
  campo?: string;
};

const ESTADOS: EstadoCiclo[] = [
  'Activo',
  'Inactivo',
  'Cerrado',
];

export default function AdminCiclosScreen() {
  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const [token, setToken] =
    useState('');

  const [ciclos, setCiclos] =
    useState<CicloEscolar[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [
    refrescando,
    setRefrescando,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    actualizandoId,
    setActualizandoId,
  ] = useState<number | null>(null);

  const [
    formularioVisible,
    setFormularioVisible,
  ] = useState(false);

  const [
    cicloEditando,
    setCicloEditando,
  ] = useState<CicloEscolar | null>(
    null
  );

  const [nombre, setNombre] =
    useState('');

  const [
    fechaInicio,
    setFechaInicio,
  ] = useState('');

  const [fechaFin, setFechaFin] =
    useState('');

  const [estado, setEstado] =
    useState<EstadoCiclo>('Inactivo');

  const [
    errorFormulario,
    setErrorFormulario,
  ] = useState('');

  const altoContraste =
    preferencias.altoContraste;

  const temaOscuro =
    preferencias.modoOscuro ||
    altoContraste;

  const colorPrincipal =
    altoContraste
      ? colores.primario
      : temaOscuro
        ? '#A5B4FC'
        : '#4A7CFF';

  const cicloActivo = useMemo(
    () =>
      ciclos.find(
        (ciclo) =>
          ciclo.estado === 'Activo'
      ) || null,
    [ciclos]
  );

  const cerrarSesionVencida =
    async () => {
      await AsyncStorage.multiRemove([
        'token',
        'usuario',
      ]);

      Alert.alert(
        'Sesión vencida',
        'Inicia sesión nuevamente.',
        [
          {
            text: 'Aceptar',
            onPress: () =>
              router.replace('/'),
          },
        ]
      );
    };

  const cargarCiclos = async (
    tokenActual: string,
    esRecarga = false
  ) => {
    try {
      if (esRecarga) {
        setRefrescando(true);
      }

      const respuesta = await fetch(
        `${API_URL}/academico/ciclos`,
        {
          headers: {
            Authorization:
              `Bearer ${tokenActual}`,
          },
        }
      );

      const datos =
        (await respuesta.json()) as RespuestaApi;

      if (respuesta.status === 401) {
        await cerrarSesionVencida();
        return;
      }

      if (respuesta.status === 403) {
        Alert.alert(
          'Acceso restringido',
          datos.mensaje ||
            'No tienes permiso para consultar los ciclos.'
        );

        router.replace(
          '/inicio-admin' as any
        );

        return;
      }

      if (!respuesta.ok) {
        Alert.alert(
          'No se pudieron cargar los ciclos',
          datos.mensaje ||
            'Inténtalo nuevamente.'
        );

        return;
      }

      setCiclos(datos.ciclos || []);
    } catch (error) {
      console.error(
        'Error al cargar ciclos:',
        error
      );

      Alert.alert(
        'Error de conexión',
        'No fue posible consultar los ciclos escolares.'
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  const prepararPantalla =
    async () => {
      try {
        const [
          tokenGuardado,
          usuarioTexto,
        ] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('usuario'),
        ]);

        if (
          !tokenGuardado ||
          !usuarioTexto
        ) {
          await cerrarSesionVencida();
          return;
        }

        const usuario =
          JSON.parse(
            usuarioTexto
          ) as UsuarioGuardado;

        if (usuario.rol !== 'Admin') {
          Alert.alert(
            'Acceso restringido',
            'Esta pantalla solamente está disponible para administradores.'
          );

          router.replace('/');
          return;
        }

        setToken(tokenGuardado);

        await cargarCiclos(
          tokenGuardado
        );
      } catch (error) {
        console.error(
          'Error al preparar ciclos:',
          error
        );

        Alert.alert(
          'Error',
          'No fue posible verificar la sesión.'
        );

        router.replace('/');
      }
    };

  useEffect(() => {
    prepararPantalla();
  }, []);

  const limpiarFormulario = () => {
    setNombre('');
    setFechaInicio('');
    setFechaFin('');
    setEstado('Inactivo');
    setErrorFormulario('');
    setCicloEditando(null);
  };

  const abrirNuevoCiclo = () => {
    limpiarFormulario();
    setFormularioVisible(true);
  };

  const abrirEditarCiclo = (
    ciclo: CicloEscolar
  ) => {
    setCicloEditando(ciclo);
    setNombre(ciclo.nombre);
    setFechaInicio(
      ciclo.fecha_inicio
    );
    setFechaFin(ciclo.fecha_fin);
    setEstado(ciclo.estado);
    setErrorFormulario('');
    setFormularioVisible(true);
  };

  const cerrarFormulario = () => {
    if (guardando) {
      return;
    }

    setFormularioVisible(false);
    limpiarFormulario();
  };

  const validarFormulario = () => {
    const nombreLimpio =
      nombre.trim();

    if (!nombreLimpio) {
      return 'Escribe el nombre del ciclo escolar.';
    }

    if (nombreLimpio.length < 4) {
      return 'El nombre debe tener al menos 4 caracteres.';
    }

    const expresionFecha =
      /^\d{4}-\d{2}-\d{2}$/;

    if (
      !expresionFecha.test(
        fechaInicio
      )
    ) {
      return 'La fecha de inicio debe tener el formato AAAA-MM-DD.';
    }

    if (
      !expresionFecha.test(fechaFin)
    ) {
      return 'La fecha final debe tener el formato AAAA-MM-DD.';
    }

    if (fechaInicio >= fechaFin) {
      return 'La fecha final debe ser posterior a la fecha de inicio.';
    }

    return '';
  };

  const guardarCiclo = async () => {
    const mensajeValidacion =
      validarFormulario();

    if (mensajeValidacion) {
      setErrorFormulario(
        mensajeValidacion
      );
      return;
    }

    try {
      setGuardando(true);
      setErrorFormulario('');

      const editando =
        cicloEditando !== null;

      const url = editando
        ? `${API_URL}/academico/ciclos/${cicloEditando.id_ciclo}`
        : `${API_URL}/academico/ciclos`;

      const respuesta = await fetch(
        url,
        {
          method: editando
            ? 'PUT'
            : 'POST',
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            nombre: nombre
              .trim()
              .replace(/\s+/g, ' '),
            fecha_inicio:
              fechaInicio,
            fecha_fin: fechaFin,
            estado,
          }),
        }
      );

      const datos =
        (await respuesta.json()) as RespuestaApi;

      if (respuesta.status === 401) {
        setFormularioVisible(false);
        await cerrarSesionVencida();
        return;
      }

      if (!respuesta.ok) {
        setErrorFormulario(
          datos.mensaje ||
            'No se pudo guardar el ciclo.'
        );

        return;
      }

      setFormularioVisible(false);
      limpiarFormulario();

      Alert.alert(
        'Operación correcta',
        datos.mensaje ||
          'El ciclo escolar se guardó correctamente.'
      );

      await cargarCiclos(token);
    } catch (error) {
      console.error(
        'Error al guardar ciclo:',
        error
      );

      setErrorFormulario(
        'No fue posible conectarse con la API.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const confirmarCambioEstado = (
    ciclo: CicloEscolar
  ) => {
    const nuevoEstado:
      EstadoCiclo =
      ciclo.estado === 'Activo'
        ? 'Cerrado'
        : 'Activo';

    const accion =
      nuevoEstado === 'Activo'
        ? 'activar'
        : 'cerrar';

    Alert.alert(
      `${accion === 'activar' ? 'Activar' : 'Cerrar'} ciclo`,
      `¿Deseas ${accion} el ciclo "${ciclo.nombre}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text:
            nuevoEstado === 'Activo'
              ? 'Activar'
              : 'Cerrar',
          onPress: () =>
            cambiarEstadoCiclo(
              ciclo,
              nuevoEstado
            ),
        },
      ]
    );
  };

  const cambiarEstadoCiclo = async (
    ciclo: CicloEscolar,
    nuevoEstado: EstadoCiclo
  ) => {
    try {
      setActualizandoId(
        ciclo.id_ciclo
      );

      const respuesta = await fetch(
        `${API_URL}/academico/ciclos/${ciclo.id_ciclo}/estado`,
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
        (await respuesta.json()) as RespuestaApi;

      if (respuesta.status === 401) {
        await cerrarSesionVencida();
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
          'El estado se actualizó correctamente.'
      );

      await cargarCiclos(token);
    } catch (error) {
      console.error(
        'Error al cambiar estado:',
        error
      );

      Alert.alert(
        'Error de conexión',
        'No fue posible cambiar el estado del ciclo.'
      );
    } finally {
      setActualizandoId(null);
    }
  };

  const formatearFecha = (
    fecha: string
  ) => {
    const fechaLocal = new Date(
      `${fecha}T00:00:00`
    );

    if (
      Number.isNaN(
        fechaLocal.getTime()
      )
    ) {
      return fecha;
    }

    return fechaLocal.toLocaleDateString(
      'es-MX',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  const obtenerColorEstado = (
    estadoActual: EstadoCiclo
  ) => {
    if (altoContraste) {
      return colores.primario;
    }

    switch (estadoActual) {
      case 'Activo':
        return temaOscuro
          ? '#4ADE80'
          : '#16A34A';

      case 'Cerrado':
        return temaOscuro
          ? '#FBBF24'
          : '#D97706';

      default:
        return colores.textoSecundario;
    }
  };

  const obtenerFondoEstado = (
    estadoActual: EstadoCiclo
  ) => {
    if (altoContraste) {
      return colores.fondo;
    }

    switch (estadoActual) {
      case 'Activo':
        return temaOscuro
          ? '#052E16'
          : '#DCFCE7';

      case 'Cerrado':
        return temaOscuro
          ? '#451A03'
          : '#FEF3C7';

      default:
        return temaOscuro
          ? '#334155'
          : '#F1F5F9';
    }
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
          Cargando ciclos escolares...
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
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() =>
              cargarCiclos(
                token,
                true
              )
            }
            colors={[
              colores.primario,
            ]}
            tintColor={
              colores.primario
            }
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
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
                router.back()
              }
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
                  styles.headerTitle,
                  {
                    color: colores.texto,
                    fontSize:
                      20 * escalaTexto,
                  },
                ]}
                accessibilityRole="header"
              >
                Ciclos escolares
              </Text>

              <Text
                style={[
                  styles.headerSubtitle,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      12 * escalaTexto,
                  },
                ]}
              >
                Administración académica
              </Text>
            </View>

            <BotonAccesibilidad />
          </View>

          <View
            style={[
              styles.summaryCard,
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
                styles.summaryIcon,
                {
                  backgroundColor:
                    colores.tarjeta,
                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <Ionicons
                name="calendar"
                size={29}
                color={colorPrincipal}
              />
            </View>

            <View style={styles.summaryContent}>
              <Text
                style={[
                  styles.summaryLabel,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      12 * escalaTexto,
                  },
                ]}
              >
                Ciclo actual
              </Text>

              <Text
                style={[
                  styles.summaryTitle,
                  {
                    color: colores.texto,
                    fontSize:
                      18 * escalaTexto,
                  },
                ]}
              >
                {cicloActivo
                  ? cicloActivo.nombre
                  : 'Sin ciclo activo'}
              </Text>

              <Text
                style={[
                  styles.summaryText,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      12 * escalaTexto,
                  },
                ]}
              >
                {ciclos.length}{' '}
                {ciclos.length === 1
                  ? 'ciclo registrado'
                  : 'ciclos registrados'}
              </Text>
            </View>
          </View>

          <View style={styles.titleRow}>
            <View style={styles.titleContent}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colores.texto,
                    fontSize:
                      21 * escalaTexto,
                  },
                ]}
              >
                Ciclos registrados
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
                Desliza hacia abajo para actualizar.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor:
                    colorPrincipal,
                },
              ]}
              onPress={abrirNuevoCiclo}
              accessibilityRole="button"
              accessibilityLabel="Crear nuevo ciclo escolar"
            >
              <Ionicons
                name="add"
                size={22}
                color={
                  altoContraste
                    ? '#000000'
                    : '#FFFFFF'
                }
              />

              <Text
                style={[
                  styles.addButtonText,
                  {
                    color:
                      altoContraste
                        ? '#000000'
                        : '#FFFFFF',
                    fontSize:
                      13 * escalaTexto,
                  },
                ]}
              >
                Nuevo
              </Text>
            </TouchableOpacity>
          </View>

          {ciclos.length === 0 ? (
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
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor:
                      colores.fondoPrimario,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={37}
                  color={colores.primario}
                />
              </View>

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
                No hay ciclos escolares
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      13 * escalaTexto,
                    lineHeight:
                      19 * escalaTexto,
                  },
                ]}
              >
                Crea el primer ciclo para comenzar a organizar la información académica.
              </Text>
            </View>
          ) : (
            <View style={styles.cyclesList}>
              {ciclos.map((ciclo) => {
                const colorEstado =
                  obtenerColorEstado(
                    ciclo.estado
                  );

                const fondoEstado =
                  obtenerFondoEstado(
                    ciclo.estado
                  );

                const actualizando =
                  actualizandoId ===
                  ciclo.id_ciclo;

                return (
                  <View
                    key={ciclo.id_ciclo}
                    style={[
                      styles.cycleCard,
                      {
                        backgroundColor:
                          colores.tarjeta,
                        borderColor:
                          ciclo.estado ===
                          'Activo'
                            ? colorEstado
                            : colores.borde,
                      },
                    ]}
                  >
                    <View
                      style={styles.cycleHeader}
                    >
                      <View
                        style={
                          styles.cycleHeaderText
                        }
                      >
                        <Text
                          style={[
                            styles.cycleName,
                            {
                              color:
                                colores.texto,
                              fontSize:
                                17 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {ciclo.nombre}
                        </Text>

                        <Text
                          style={[
                            styles.cycleId,
                            {
                              color:
                                colores.textoSecundario,
                              fontSize:
                                11 *
                                escalaTexto,
                            },
                          ]}
                        >
                          Identificador: {ciclo.id_ciclo}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              fondoEstado,
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
                                11 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {ciclo.estado}
                        </Text>
                      </View>
                    </View>

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
                        <Ionicons
                          name="play-circle-outline"
                          size={20}
                          color={colorPrincipal}
                        />

                        <View>
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
                            Inicio
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
                            {formatearFecha(
                              ciclo.fecha_inicio
                            )}
                          </Text>
                        </View>
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
                        <Ionicons
                          name="flag-outline"
                          size={20}
                          color={colorPrincipal}
                        />

                        <View>
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
                            Finalización
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
                            {formatearFecha(
                              ciclo.fecha_fin
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View
                      style={
                        styles.statistics
                      }
                    >
                      <View
                        style={
                          styles.statistic
                        }
                      >
                        <Text
                          style={[
                            styles.statisticNumber,
                            {
                              color:
                                colores.texto,
                              fontSize:
                                16 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {ciclo.total_periodos}
                        </Text>

                        <Text
                          style={[
                            styles.statisticLabel,
                            {
                              color:
                                colores.textoSecundario,
                              fontSize:
                                10 *
                                escalaTexto,
                            },
                          ]}
                        >
                          Periodos
                        </Text>
                      </View>

                      <View
                        style={
                          styles.statistic
                        }
                      >
                        <Text
                          style={[
                            styles.statisticNumber,
                            {
                              color:
                                colores.texto,
                              fontSize:
                                16 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {ciclo.total_grupos}
                        </Text>

                        <Text
                          style={[
                            styles.statisticLabel,
                            {
                              color:
                                colores.textoSecundario,
                              fontSize:
                                10 *
                                escalaTexto,
                            },
                          ]}
                        >
                          Grupos
                        </Text>
                      </View>

                      <View
                        style={
                          styles.statistic
                        }
                      >
                        <Text
                          style={[
                            styles.statisticNumber,
                            {
                              color:
                                colores.texto,
                              fontSize:
                                16 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {ciclo.total_cursos}
                        </Text>

                        <Text
                          style={[
                            styles.statisticLabel,
                            {
                              color:
                                colores.textoSecundario,
                              fontSize:
                                10 *
                                escalaTexto,
                            },
                          ]}
                        >
                          Cursos
                        </Text>
                      </View>
                    </View>

                    <View
                      style={styles.actions}
                    >
                      <TouchableOpacity
                        style={[
                          styles.editButton,
                          {
                            backgroundColor:
                              colores.fondo,
                            borderColor:
                              colores.borde,
                          },
                        ]}
                        onPress={() =>
                          abrirEditarCiclo(
                            ciclo
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Editar ${ciclo.nombre}`}
                      >
                        <Ionicons
                          name="create-outline"
                          size={19}
                          color={colorPrincipal}
                        />

                        <Text
                          style={[
                            styles.editButtonText,
                            {
                              color:
                                colorPrincipal,
                              fontSize:
                                12 *
                                escalaTexto,
                            },
                          ]}
                        >
                          Editar
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.stateButton,
                          {
                            backgroundColor:
                              fondoEstado,
                            borderColor:
                              colorEstado,
                          },
                        ]}
                        onPress={() =>
                          confirmarCambioEstado(
                            ciclo
                          )
                        }
                        disabled={actualizando}
                        accessibilityRole="button"
                        accessibilityLabel={
                          ciclo.estado ===
                          'Activo'
                            ? `Cerrar ${ciclo.nombre}`
                            : `Activar ${ciclo.nombre}`
                        }
                        accessibilityState={{
                          busy: actualizando,
                        }}
                      >
                        {actualizando ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              colorEstado
                            }
                          />
                        ) : (
                          <>
                            <Ionicons
                              name={
                                ciclo.estado ===
                                'Activo'
                                  ? 'lock-closed-outline'
                                  : 'checkmark-circle-outline'
                              }
                              size={18}
                              color={
                                colorEstado
                              }
                            />

                            <Text
                              style={[
                                styles.stateButtonText,
                                {
                                  color:
                                    colorEstado,
                                  fontSize:
                                    12 *
                                    escalaTexto,
                                },
                              ]}
                            >
                              {ciclo.estado ===
                              'Activo'
                                ? 'Cerrar ciclo'
                                : 'Activar'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={formularioVisible}
        transparent
        animationType="fade"
        onRequestClose={
          cerrarFormulario
        }
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor:
                  colores.tarjeta,
                borderColor:
                  colores.borde,
              },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={styles.modalHeader}
              >
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      {
                        color:
                          colores.texto,
                        fontSize:
                          20 *
                          escalaTexto,
                      },
                    ]}
                    accessibilityRole="header"
                  >
                    {cicloEditando
                      ? 'Editar ciclo'
                      : 'Nuevo ciclo'}
                  </Text>

                  <Text
                    style={[
                      styles.modalSubtitle,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          12 *
                          escalaTexto,
                      },
                    ]}
                  >
                    Completa la información escolar.
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
                  onPress={
                    cerrarFormulario
                  }
                  disabled={guardando}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar formulario"
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={colores.texto}
                  />
                </TouchableOpacity>
              </View>

              {errorFormulario ? (
                <View
                  style={[
                    styles.errorBox,
                    {
                      borderColor:
                        colores.peligro,
                    },
                  ]}
                  accessibilityLiveRegion="polite"
                >
                  <Ionicons
                    name="alert-circle"
                    size={21}
                    color={colores.peligro}
                  />

                  <Text
                    style={[
                      styles.errorText,
                      {
                        color:
                          colores.peligro,
                        fontSize:
                          12 *
                          escalaTexto,
                      },
                    ]}
                  >
                    {errorFormulario}
                  </Text>
                </View>
              ) : null}

              <Text
                style={[
                  styles.label,
                  {
                    color: colores.texto,
                    fontSize:
                      13 *
                      escalaTexto,
                  },
                ]}
              >
                Nombre del ciclo
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor:
                      colores.fondo,
                    borderColor:
                      colores.borde,
                    color:
                      colores.texto,
                    fontSize:
                      14 *
                      escalaTexto,
                  },
                ]}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej. Ciclo escolar 2026-2027"
                placeholderTextColor={
                  colores.textoSecundario
                }
                maxLength={100}
                autoCapitalize="sentences"
                editable={!guardando}
                accessibilityLabel="Nombre del ciclo escolar"
              />

              <Text
                style={[
                  styles.label,
                  {
                    color: colores.texto,
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
                  styles.input,
                  {
                    backgroundColor:
                      colores.fondo,
                    borderColor:
                      colores.borde,
                    color:
                      colores.texto,
                    fontSize:
                      14 *
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
                maxLength={10}
                editable={!guardando}
                accessibilityLabel="Fecha de inicio en formato año mes día"
              />

              <Text
                style={[
                  styles.label,
                  {
                    color: colores.texto,
                    fontSize:
                      13 *
                      escalaTexto,
                  },
                ]}
              >
                Fecha de finalización
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor:
                      colores.fondo,
                    borderColor:
                      colores.borde,
                    color:
                      colores.texto,
                    fontSize:
                      14 *
                      escalaTexto,
                  },
                ]}
                value={fechaFin}
                onChangeText={setFechaFin}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={
                  colores.textoSecundario
                }
                maxLength={10}
                editable={!guardando}
                accessibilityLabel="Fecha de finalización en formato año mes día"
              />

              <Text
                style={[
                  styles.label,
                  {
                    color: colores.texto,
                    fontSize:
                      13 *
                      escalaTexto,
                  },
                ]}
              >
                Estado
              </Text>

              <View
                style={
                  styles.statesContainer
                }
              >
                {ESTADOS.map(
                  (opcionEstado) => {
                    const seleccionado =
                      estado ===
                      opcionEstado;

                    return (
                      <TouchableOpacity
                        key={opcionEstado}
                        style={[
                          styles.stateOption,
                          {
                            backgroundColor:
                              seleccionado
                                ? colores.fondoPrimario
                                : colores.fondo,
                            borderColor:
                              seleccionado
                                ? colores.primario
                                : colores.borde,
                          },
                        ]}
                        onPress={() =>
                          setEstado(
                            opcionEstado
                          )
                        }
                        disabled={guardando}
                        accessibilityRole="radio"
                        accessibilityState={{
                          selected:
                            seleccionado,
                        }}
                      >
                        <Text
                          style={[
                            styles.stateOptionText,
                            {
                              color:
                                seleccionado
                                  ? colores.primario
                                  : colores.textoSecundario,
                              fontSize:
                                12 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {opcionEstado}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              <View
                style={
                  styles.modalActions
                }
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
                  onPress={
                    cerrarFormulario
                  }
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
                    },
                    guardando && {
                      opacity: 0.7,
                    },
                  ]}
                  onPress={guardarCiclo}
                  disabled={guardando}
                  accessibilityRole="button"
                  accessibilityState={{
                    busy: guardando,
                  }}
                >
                  {guardando ? (
                    <ActivityIndicator
                      color={
                        altoContraste
                          ? '#000000'
                          : '#FFFFFF'
                      }
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="save-outline"
                        size={19}
                        color={
                          altoContraste
                            ? '#000000'
                            : '#FFFFFF'
                        }
                      />

                      <Text
                        style={[
                          styles.saveText,
                          {
                            color:
                              altoContraste
                                ? '#000000'
                                : '#FFFFFF',
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  content: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
    marginHorizontal: 12,
  },

  headerTitle: {
    fontWeight: '900',
  },

  headerSubtitle: {
    marginTop: 2,
    fontWeight: '500',
  },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 21,
    padding: 17,
    marginTop: 24,
  },

  summaryIcon: {
    width: 57,
    height: 57,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  summaryContent: {
    flex: 1,
  },

  summaryLabel: {
    fontWeight: '600',
  },

  summaryTitle: {
    marginTop: 2,
    fontWeight: '900',
  },

  summaryText: {
    marginTop: 4,
    fontWeight: '500',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 27,
    marginBottom: 16,
  },

  titleContent: {
    flex: 1,
  },

  sectionTitle: {
    fontWeight: '900',
  },

  sectionSubtitle: {
    marginTop: 4,
    fontWeight: '500',
  },

  addButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 5,
  },

  addButtonText: {
    fontWeight: '800',
  },

  emptyCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 28,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: 15,
    fontWeight: '900',
  },

  emptyText: {
    maxWidth: 350,
    marginTop: 7,
    textAlign: 'center',
    fontWeight: '500',
  },

  cyclesList: {
    gap: 14,
  },

  cycleCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },

  cycleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  cycleHeaderText: {
    flex: 1,
  },

  cycleName: {
    fontWeight: '900',
  },

  cycleId: {
    marginTop: 3,
    fontWeight: '500',
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
    marginRight: 6,
  },

  statusText: {
    fontWeight: '800',
  },

  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 15,
  },

  dateItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  dateDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 10,
  },

  dateLabel: {
    fontWeight: '600',
  },

  dateValue: {
    marginTop: 2,
    fontWeight: '800',
  },

  statistics: {
    flexDirection: 'row',
    marginTop: 15,
  },

  statistic: {
    flex: 1,
    alignItems: 'center',
  },

  statisticNumber: {
    fontWeight: '900',
  },

  statisticLabel: {
    marginTop: 2,
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },

  editButton: {
    flex: 1,
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
    gap: 6,
  },

  editButtonText: {
    fontWeight: '800',
  },

  stateButton: {
    flex: 1,
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
    gap: 6,
  },

  stateButtonText: {
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(15,23,42,0.60)',
  },

  modalContent: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  modalTitle: {
    fontWeight: '900',
  },

  modalSubtitle: {
    marginTop: 4,
    fontWeight: '500',
  },

  closeButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    marginBottom: 15,
  },

  errorText: {
    flex: 1,
    marginLeft: 8,
    fontWeight: '700',
  },

  label: {
    fontWeight: '800',
    marginBottom: 7,
  },

  input: {
    minHeight: 51,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    marginBottom: 15,
  },

  statesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },

  stateOption: {
    flexGrow: 1,
    minHeight: 43,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
  },

  stateOptionText: {
    fontWeight: '800',
  },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    minHeight: 49,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    fontWeight: '800',
  },

  saveButton: {
    flex: 1.4,
    minHeight: 49,
    flexDirection: 'row',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  saveText: {
    fontWeight: '900',
  },
});