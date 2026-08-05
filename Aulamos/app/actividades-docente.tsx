import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { api } from '../services/api';

type EstadoActividad =
  | 'Borrador'
  | 'Publicada'
  | 'Cerrada'
  | 'Archivada';

type FiltroActividad =
  | 'Todas'
  | 'Publicadas'
  | 'Borradores'
  | 'Cerradas'
  | 'Archivadas';

type TipoActividad =
  | 'Tarea'
  | 'Ejercicio'
  | 'Lectura'
  | 'Proyecto'
  | 'Evaluacion';

type ActividadDocente = {
  id_actividad: number;
  id_curso: number;
  id_periodo: number | null;
  titulo: string;
  descripcion?: string | null;
  tipo: TipoActividad;
  fecha_publicacion: string;
  fecha_limite: string;
  puntaje_maximo: number | string;
  permite_entrega_archivo: boolean | number;
  estado_actividad: EstadoActividad;
  nombre_curso: string;
  materia: string;
  grupo: string;
  periodo?: string | null;
  alumnos_asignados: number | string;
  alumnos_entregados: number | string;
  alumnos_pendientes: number | string;
  alumnos_calificados: number | string;
  alumnos_por_calificar: number | string;
};

type ResumenDocente = {
  total: number;
  publicadas: number;
  borradores: number;
  cerradas: number;
  archivadas: number;
  por_calificar: number;
};

type RespuestaActividades = {
  actividades?: ActividadDocente[];
  resumen?: ResumenDocente;
  mensaje?: string;
};

type RespuestaError = {
  mensaje?: string;
  error?: string;
};

type IoniconName =
  keyof typeof Ionicons.glyphMap;

const RESUMEN_VACIO: ResumenDocente = {
  total: 0,
  publicadas: 0,
  borradores: 0,
  cerradas: 0,
  archivadas: 0,
  por_calificar: 0,
};

const FILTROS: FiltroActividad[] = [
  'Todas',
  'Publicadas',
  'Borradores',
  'Cerradas',
  'Archivadas',
];

const normalizarTexto = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizarFecha = (
  fecha?: string | null,
) => {
  if (!fecha) {
    return null;
  }

  const resultado = new Date(
    fecha.includes('T')
      ? fecha
      : fecha.replace(' ', 'T'),
  );

  return Number.isNaN(resultado.getTime())
    ? null
    : resultado;
};

const mostrarFecha = (
  fecha?: string | null,
) => {
  const resultado = normalizarFecha(fecha);

  if (!resultado) {
    return 'Fecha no disponible';
  }

  return resultado.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const obtenerMensajeError = (
  error: unknown,
) => {
  if (
    axios.isAxiosError<RespuestaError>(error)
  ) {
    if (error.response?.data?.mensaje) {
      return error.response.data.mensaje;
    }

    if (error.response?.data?.error) {
      return error.response.data.error;
    }

    if (!error.response) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté encendido y que el teléfono y la computadora estén en la misma red Wi-Fi.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudieron cargar las actividades.';
};

const obtenerPresentacionTipo = (
  tipo: TipoActividad,
): {
  icono: IoniconName;
  color: string;
  fondo: string;
  etiqueta: string;
} => {
  switch (tipo) {
    case 'Ejercicio':
      return {
        icono: 'create-outline',
        color: '#0F8F86',
        fondo: '#DDF8F4',
        etiqueta: 'Ejercicio',
      };

    case 'Lectura':
      return {
        icono: 'book-outline',
        color: '#B56F00',
        fondo: '#FFF3D7',
        etiqueta: 'Lectura',
      };

    case 'Proyecto':
      return {
        icono: 'folder-open-outline',
        color: '#6750D8',
        fondo: '#ECE8FF',
        etiqueta: 'Proyecto',
      };

    case 'Evaluacion':
      return {
        icono: 'document-text-outline',
        color: '#C93649',
        fondo: '#FFE5E8',
        etiqueta: 'Evaluación',
      };

    default:
      return {
        icono: 'clipboard-outline',
        color: '#2D5BFF',
        fondo: '#EAF1FF',
        etiqueta: 'Tarea',
      };
  }
};

const obtenerPresentacionEstado = (
  estado: EstadoActividad,
) => {
  switch (estado) {
    case 'Publicada':
      return {
        color: '#137A50',
        fondo: '#DCFCE7',
      };

    case 'Borrador':
      return {
        color: '#8A5A00',
        fondo: '#FEF3C7',
      };

    case 'Cerrada':
      return {
        color: '#A93342',
        fondo: '#FFE4E6',
      };

    default:
      return {
        color: '#596579',
        fondo: '#E9EDF3',
      };
  }
};

const coincideFiltro = (
  actividad: ActividadDocente,
  filtro: FiltroActividad,
) => {
  if (filtro === 'Todas') {
    return true;
  }

  const equivalencias: Record<
    Exclude<FiltroActividad, 'Todas'>,
    EstadoActividad
  > = {
    Publicadas: 'Publicada',
    Borradores: 'Borrador',
    Cerradas: 'Cerrada',
    Archivadas: 'Archivada',
  };

  return (
    actividad.estado_actividad ===
    equivalencias[filtro]
  );
};

export default function ActividadesDocenteScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const [actividades, setActividades] =
    useState<ActividadDocente[]>([]);
  const [resumen, setResumen] =
    useState<ResumenDocente>(RESUMEN_VACIO);
  const [filtro, setFiltro] =
    useState<FiltroActividad>('Todas');
  const [busqueda, setBusqueda] =
    useState('');
  const [cargando, setCargando] =
    useState(true);
  const [actualizando, setActualizando] =
    useState(false);

  const temaOscuro =
    preferencias.modoOscuro ||
    preferencias.altoContraste;

  const colorPrincipal =
    preferencias.altoContraste
      ? colores.primario
      : temaOscuro
        ? '#60A5FA'
        : '#2D5BFF';

  const margenHorizontal =
    width < 360 ? 14 : width < 400 ? 18 : 22;

  const anchoContenido = Math.min(
    width - margenHorizontal * 2,
    560,
  );

  const cargarActividades = useCallback(
    async (esActualizacion = false) => {
      try {
        if (esActualizacion) {
          setActualizando(true);
        } else {
          setCargando(true);
        }

        const token = await AsyncStorage.getItem(
          'token',
        );

        if (!token) {
          Alert.alert(
            'Sesión no encontrada',
            'Inicia sesión nuevamente.',
          );
          router.replace('/' as any);
          return;
        }

        const respuesta =
          await api.get<RespuestaActividades>(
            '/academico/actividades/mis-actividades-docente',
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

        setActividades(
          respuesta.data.actividades ?? [],
        );
        setResumen(
          respuesta.data.resumen ??
            RESUMEN_VACIO,
        );
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 ||
            error.response?.status === 403)
        ) {
          await AsyncStorage.multiRemove([
            'token',
            'usuario',
          ]);
        }

        Alert.alert(
          'No se pudieron cargar las actividades',
          obtenerMensajeError(error),
        );
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void cargarActividades();
    }, [cargarActividades]),
  );

  const actividadesFiltradas = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    return actividades.filter((actividad) => {
      if (!coincideFiltro(actividad, filtro)) {
        return false;
      }

      if (!texto) {
        return true;
      }

      const contenido = normalizarTexto(
        [
          actividad.titulo,
          actividad.materia,
          actividad.nombre_curso,
          actividad.grupo,
          actividad.tipo,
        ].join(' '),
      );

      return contenido.includes(texto);
    });
  }, [actividades, busqueda, filtro]);

  const abrirDetalle = (
    actividad: ActividadDocente,
  ) => {
    router.push({
      pathname: '/detalle-actividad',
      params: {
        id_actividad: String(
          actividad.id_actividad,
        ),
      },
    } as any);
  };

  const crearActividad = () => {
    router.push('/crear-actividad' as any);
  };

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colores.fondo },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom:
              94 + Math.max(insets.bottom, 8),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() =>
              void cargarActividades(true)
            }
            colors={[colorPrincipal]}
            tintColor={colorPrincipal}
          />
        }
      >
        <View
          style={[
            styles.content,
            { width: anchoContenido },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.iconButton,
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
                    fontSize: 21 * escalaTexto,
                  },
                ]}
                accessibilityRole="header"
              >
                Mis actividades
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color: colores.textoSecundario,
                    fontSize: 11 * escalaTexto,
                  },
                ]}
              >
                Revisa entregas y calificaciones
              </Text>
            </View>

            <BotonAccesibilidad />
          </View>

          <TouchableOpacity
            style={[
              styles.createButton,
              { backgroundColor: colorPrincipal },
            ]}
            onPress={crearActividad}
            accessibilityRole="button"
            accessibilityLabel="Crear una nueva actividad"
          >
            <Ionicons
              name="add-circle-outline"
              size={21}
              color="#FFFFFF"
            />
            <Text
              style={[
                styles.createButtonText,
                { fontSize: 13 * escalaTexto },
              ]}
            >
              Nueva actividad
            </Text>
          </TouchableOpacity>

          <View style={styles.summaryGrid}>
            <SummaryCard
              label="Total"
              value={resumen.total}
              icon="reader-outline"
              color={colorPrincipal}
              background={
                temaOscuro
                  ? colores.fondoPrimario
                  : '#EAF1FF'
              }
            />

            <SummaryCard
              label="Publicadas"
              value={resumen.publicadas}
              icon="checkmark-circle-outline"
              color="#15805A"
              background={
                temaOscuro
                  ? colores.fondoPrimario
                  : '#DCFCE7'
              }
            />

            <SummaryCard
              label="Borradores"
              value={resumen.borradores}
              icon="create-outline"
              color="#9A6500"
              background={
                temaOscuro
                  ? colores.fondoPrimario
                  : '#FEF3C7'
              }
            />

            <SummaryCard
              label="Por calificar"
              value={resumen.por_calificar}
              icon="school-outline"
              color="#C93649"
              background={
                temaOscuro
                  ? colores.fondoPrimario
                  : '#FFE5E8'
              }
            />
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
              name="search-outline"
              size={21}
              color={colores.textoSecundario}
            />
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: colores.texto,
                  fontSize: 13 * escalaTexto,
                },
              ]}
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar actividad, materia o grupo"
              placeholderTextColor={
                colores.textoSecundario
              }
              returnKeyType="search"
              accessibilityLabel="Buscar actividades"
            />
            {busqueda.length > 0 && (
              <TouchableOpacity
                onPress={() => setBusqueda('')}
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
              >
                <Ionicons
                  name="close-circle"
                  size={21}
                  color={colores.textoSecundario}
                />
              </TouchableOpacity>
            )}
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
                        ? colorPrincipal
                        : colores.tarjeta,
                      borderColor: activo
                        ? colorPrincipal
                        : colores.borde,
                    },
                  ]}
                  onPress={() => setFiltro(opcion)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color: activo
                          ? '#FFFFFF'
                          : colores.texto,
                        fontSize: 11 * escalaTexto,
                      },
                    ]}
                  >
                    {opcion}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.listHeader}>
            <Text
              style={[
                styles.listTitle,
                {
                  color: colores.texto,
                  fontSize: 15 * escalaTexto,
                },
              ]}
            >
              Actividades
            </Text>
            <Text
              style={[
                styles.resultCount,
                {
                  color: colores.textoSecundario,
                  fontSize: 11 * escalaTexto,
                },
              ]}
            >
              {actividadesFiltradas.length}{' '}
              {actividadesFiltradas.length === 1
                ? 'resultado'
                : 'resultados'}
            </Text>
          </View>

          {cargando ? (
            <View style={styles.centerState}>
              <ActivityIndicator
                size="large"
                color={colorPrincipal}
              />
              <Text
                style={[
                  styles.stateText,
                  {
                    color: colores.textoSecundario,
                    fontSize: 13 * escalaTexto,
                  },
                ]}
              >
                Cargando actividades...
              </Text>
            </View>
          ) : actividadesFiltradas.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
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
                  name="reader-outline"
                  size={34}
                  color={colorPrincipal}
                />
              </View>
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: colores.texto,
                    fontSize: 16 * escalaTexto,
                  },
                ]}
              >
                No hay actividades
              </Text>
              <Text
                style={[
                  styles.emptyDescription,
                  {
                    color: colores.textoSecundario,
                    fontSize: 12 * escalaTexto,
                  },
                ]}
              >
                {busqueda || filtro !== 'Todas'
                  ? 'No encontramos resultados con la búsqueda o el filtro seleccionado.'
                  : 'Crea tu primera actividad para asignarla a tus estudiantes.'}
              </Text>
              {!busqueda && filtro === 'Todas' && (
                <TouchableOpacity
                  style={[
                    styles.emptyButton,
                    { backgroundColor: colorPrincipal },
                  ]}
                  onPress={crearActividad}
                >
                  <Text style={styles.emptyButtonText}>
                    Crear actividad
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            actividadesFiltradas.map((actividad) => (
              <ActividadCard
                key={actividad.id_actividad}
                actividad={actividad}
                onPress={() => abrirDetalle(actividad)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomNavigation,
          {
            paddingBottom: Math.max(insets.bottom, 6),
            backgroundColor: colores.tarjeta,
            borderTopColor: colores.borde,
          },
        ]}
      >
        <BottomItem
          icon="home-outline"
          label="Inicio"
          onPress={() =>
            router.replace('/inicio-docente' as any)
          }
        />
        <BottomItem
          icon="book-outline"
          label="Recursos"
          onPress={() =>
            router.push('/recursos-docente' as any)
          }
        />
        <BottomItem
          icon="reader"
          label="Actividades"
          active
          onPress={() => {}}
        />
        <BottomItem
          icon="book-outline"
          label="Evaluaciones"
          onPress={() =>
            router.push('/crear-evaluacion' as any)
          }
        />
        <BottomItem
          icon="menu-outline"
          label="Más"
          onPress={() =>
            Alert.alert(
              'Más opciones',
              'Este menú todavía está pendiente.',
            )
          }
        />
      </View>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  background,
}: {
  label: string;
  value: number;
  icon: IoniconName;
  color: string;
  background: string;
}) {
  const { colores, escalaTexto } =
    useAccessibility();

  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <View
        style={[
          styles.summaryIcon,
          { backgroundColor: background },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={color}
        />
      </View>
      <View style={styles.summaryText}>
        <Text
          style={[
            styles.summaryValue,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.summaryLabel,
            {
              color: colores.textoSecundario,
              fontSize: 10 * escalaTexto,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function ActividadCard({
  actividad,
  onPress,
}: {
  actividad: ActividadDocente;
  onPress: () => void;
}) {
  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const tipo = obtenerPresentacionTipo(
    actividad.tipo,
  );
  const estado = obtenerPresentacionEstado(
    actividad.estado_actividad,
  );

  const asignados = Number(
    actividad.alumnos_asignados ?? 0,
  );
  const entregados = Number(
    actividad.alumnos_entregados ?? 0,
  );
  const porCalificar = Number(
    actividad.alumnos_por_calificar ?? 0,
  );

  const temaOscuro =
    preferencias.modoOscuro ||
    preferencias.altoContraste;

  const fechaLimite = normalizarFecha(
    actividad.fecha_limite,
  );

  const vencida =
    actividad.estado_actividad === 'Publicada' &&
    Boolean(
      fechaLimite &&
        fechaLimite.getTime() < Date.now(),
    );

  return (
    <TouchableOpacity
      style={[
        styles.activityCard,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`${actividad.titulo}. ${actividad.estado_actividad}. ${entregados} de ${asignados} alumnos entregaron. ${porCalificar} por calificar.`}
      accessibilityHint="Abre el detalle y las entregas de esta actividad"
    >
      <View style={styles.activityHeader}>
        <View
          style={[
            styles.typeIcon,
            {
              backgroundColor: temaOscuro
                ? colores.fondoPrimario
                : tipo.fondo,
            },
          ]}
        >
          <Ionicons
            name={tipo.icono}
            size={25}
            color={
              preferencias.altoContraste
                ? colores.primario
                : tipo.color
            }
          />
        </View>

        <View style={styles.activityHeading}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: temaOscuro
                    ? colores.fondoPrimario
                    : tipo.fondo,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  {
                    color: preferencias.altoContraste
                      ? colores.texto
                      : tipo.color,
                    fontSize: 9 * escalaTexto,
                  },
                ]}
              >
                {tipo.etiqueta}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: temaOscuro
                    ? colores.fondoPrimario
                    : estado.fondo,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: preferencias.altoContraste
                      ? colores.texto
                      : estado.color,
                    fontSize: 9 * escalaTexto,
                  },
                ]}
              >
                {actividad.estado_actividad}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.activityTitle,
              {
                color: colores.texto,
                fontSize: 15 * escalaTexto,
              },
            ]}
          >
            {actividad.titulo}
          </Text>

          <Text
            style={[
              styles.activitySubject,
              {
                color: colores.textoSecundario,
                fontSize: 11 * escalaTexto,
              },
            ]}
          >
            {actividad.materia} · {actividad.grupo}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.deadlineRow,
          {
            backgroundColor: vencida
              ? temaOscuro
                ? colores.fondoPrimario
                : '#FFF1F2'
              : colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={
            vencida
              ? 'alert-circle-outline'
              : 'calendar-outline'
          }
          size={17}
          color={vencida ? '#DC3438' : colores.primario}
        />
        <Text
          style={[
            styles.deadlineText,
            {
              color: vencida
                ? '#C62E36'
                : colores.textoSecundario,
              fontSize: 10 * escalaTexto,
            },
          ]}
        >
          {vencida ? 'Venció: ' : 'Fecha límite: '}
          {mostrarFecha(actividad.fecha_limite)}
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <Metric
          icon="people-outline"
          label="Asignados"
          value={asignados}
          color="#2D5BFF"
        />
        <Metric
          icon="cloud-done-outline"
          label="Entregaron"
          value={entregados}
          color="#138A67"
        />
        <Metric
          icon="school-outline"
          label="Por calificar"
          value={porCalificar}
          color="#C93649"
        />
      </View>

      <View
        style={[
          styles.openRow,
          { borderTopColor: colores.borde },
        ]}
      >
        <Text
          style={[
            styles.openText,
            {
              color: colores.primario,
              fontSize: 11 * escalaTexto,
            },
          ]}
        >
          {actividad.estado_actividad === 'Borrador'
            ? 'Ver detalle del borrador'
            : 'Ver entregas y calificar'}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colores.primario}
        />
      </View>
    </TouchableOpacity>
  );
}

function Metric({
  icon,
  label,
  value,
  color,
}: {
  icon: IoniconName;
  label: string;
  value: number;
  color: string;
}) {
  const { colores, escalaTexto } =
    useAccessibility();

  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={18} color={color} />
      <Text
        style={[
          styles.metricValue,
          {
            color: colores.texto,
            fontSize: 13 * escalaTexto,
          },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.metricLabel,
          {
            color: colores.textoSecundario,
            fontSize: 8 * escalaTexto,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function BottomItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const { colores, escalaTexto } =
    useAccessibility();

  return (
    <TouchableOpacity
      style={styles.bottomItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Ionicons
        name={icon}
        size={22}
        color={
          active
            ? colores.primario
            : colores.textoSecundario
        }
      />
      <Text
        style={[
          styles.bottomLabel,
          {
            color: active
              ? colores.primario
              : colores.textoSecundario,
            fontSize: 8 * escalaTexto,
          },
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
  scrollContent: {
    alignItems: 'center',
  },
  content: {
    alignSelf: 'center',
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    lineHeight: 16,
  },
  createButton: {
    minHeight: 48,
    marginTop: 18,
    borderRadius: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  summaryGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    minHeight: 76,
    borderRadius: 17,
    borderWidth: 1,
    padding: 11,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
    marginLeft: 9,
  },
  summaryValue: {
    fontWeight: '900',
  },
  summaryLabel: {
    marginTop: 2,
    fontWeight: '700',
  },
  searchBox: {
    minHeight: 50,
    marginTop: 18,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 9,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 8,
  },
  filters: {
    paddingTop: 13,
    paddingBottom: 4,
    columnGap: 8,
  },
  filterButton: {
    minHeight: 39,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontWeight: '800',
  },
  listHeader: {
    marginTop: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontWeight: '900',
  },
  resultCount: {
    fontWeight: '600',
  },
  centerState: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    marginTop: 12,
    textAlign: 'center',
  },
  emptyCard: {
    minHeight: 260,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 15,
    fontWeight: '900',
  },
  emptyDescription: {
    marginTop: 7,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyButton: {
    minHeight: 44,
    marginTop: 17,
    borderRadius: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  activityCard: {
    marginBottom: 13,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typeIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityHeading: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontWeight: '900',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontWeight: '900',
  },
  activityTitle: {
    marginTop: 7,
    fontWeight: '900',
    lineHeight: 20,
  },
  activitySubject: {
    marginTop: 4,
    lineHeight: 16,
  },
  deadlineRow: {
    marginTop: 13,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 7,
  },
  deadlineText: {
    flex: 1,
    fontWeight: '700',
    lineHeight: 15,
  },
  metricsRow: {
    marginTop: 13,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  metricValue: {
    marginTop: 3,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 1,
    textAlign: 'center',
    lineHeight: 11,
  },
  openRow: {
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    columnGap: 4,
  },
  openText: {
    fontWeight: '900',
  },
  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 67,
    borderTopWidth: 1,
    paddingTop: 7,
    paddingHorizontal: 8,
    flexDirection: 'row',
  },
  bottomItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomLabel: {
    marginTop: 4,
    fontWeight: '800',
  },
});