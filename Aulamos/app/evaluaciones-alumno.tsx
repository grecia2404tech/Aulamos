import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useCallback,
  useEffect,
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
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type Filtro =
  | 'Todas'
  | 'Pendientes'
  | 'Completadas';

type ConfiguracionEvaluacion = {
  modalidad?: string;
  duracion_minutos?: number;
  intentos_permitidos?: number;
  mostrar_resultado?: boolean;
  total_preguntas?: number;
};

type EvaluacionAlumno = {
  id_evaluacion: number;
  id_curso: number;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  configuracion_evaluacion:
    | ConfiguracionEvaluacion
    | null;
  fecha_publicacion: string;
  fecha_limite: string;
  puntaje_maximo: number | string;
  estado_alumno: string;
  porcentaje_avance: number | string;
  nombre_curso: string;
  materia: string;
  grupo: string;
  grado: string | number | null;
  periodo: string | null;
  calificacion: number | string | null;
  intentos_realizados?: number;
  vencida: number | boolean;
};

type Resumen = {
  total: number;
  pendientes: number;
  completadas: number;
  vencidas: number;
};

type RespuestaEvaluaciones = {
  evaluaciones?: EvaluacionAlumno[];
  resumen?: Resumen;
  mensaje?: string;
};

const AZUL = '#2D5BFF';
const AZUL_OSCURO = '#1739B7';
const AZUL_SUAVE = '#EEF3FF';
const MORADO_ACCESIBILIDAD = '#6D28D9';

const RESUMEN_VACIO: Resumen = {
  total: 0,
  pendientes: 0,
  completadas: 0,
  vencidas: 0,
};

const ESTADOS_COMPLETADOS = new Set([
  'Completada',
  'Calificada',
]);

const convertirFecha = (fecha: string) => {
  const valor = new Date(
    fecha.includes('T')
      ? fecha
      : fecha.replace(' ', 'T'),
  );

  return Number.isNaN(valor.getTime())
    ? null
    : valor;
};

const mostrarFecha = (fecha: string) => {
  const valor = convertirFecha(fecha);

  if (!valor) {
    return 'Fecha no disponible';
  }

  return valor.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const leerRespuesta = async <T,>(
  respuesta: Response,
): Promise<T> => {
  const texto = await respuesta.text();

  if (!texto) {
    return {} as T;
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new Error(
      'El servidor devolvió una respuesta no válida.',
    );
  }
};

const obtenerMensajeError = (error: unknown) => {
  if (error instanceof TypeError) {
    return (
      'No se pudo conectar con el servidor. ' +
      'Comprueba que el backend esté encendido.'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudieron cargar tus evaluaciones.';
};

export default function EvaluacionesAlumnoScreen() {
  const { width } = useWindowDimensions();

  const {
    preferencias,
    colores,
    escalaTexto,
    leerTexto,
  } = useAccessibility();

  const [evaluaciones, setEvaluaciones] =
    useState<EvaluacionAlumno[]>([]);

  const [resumen, setResumen] =
    useState<Resumen>(RESUMEN_VACIO);

  const [filtro, setFiltro] =
    useState<Filtro>('Todas');

  const [cargando, setCargando] =
    useState(true);

  const [actualizando, setActualizando] =
    useState(false);

  const margen = width < 370 ? 14 : 20;

  const anchoContenido = Math.min(
    width - margen * 2,
    560,
  );

  const cargarEvaluaciones = useCallback(
    async (refrescando = false) => {
      try {
        if (refrescando) {
          setActualizando(true);
        } else {
          setCargando(true);
        }

        const token =
          await AsyncStorage.getItem('token');

        if (!token) {
          throw new Error(
            'No se encontró tu sesión. Inicia sesión nuevamente.',
          );
        }

        const respuesta = await fetch(
          `${API_URL}/evaluaciones/alumno`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const datos =
          await leerRespuesta<RespuestaEvaluaciones>(
            respuesta,
          );

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje ||
              'No se pudieron cargar tus evaluaciones.',
          );
        }

        setEvaluaciones(
          Array.isArray(datos.evaluaciones)
            ? datos.evaluaciones
            : [],
        );

        setResumen(
          datos.resumen ?? RESUMEN_VACIO,
        );
      } catch (error) {
        Alert.alert(
          'No se pudieron cargar las evaluaciones',
          obtenerMensajeError(error),
        );
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [],
  );

  useEffect(() => {
    void cargarEvaluaciones();
  }, [cargarEvaluaciones]);

  useEffect(() => {
    if (
      preferencias.lectorPantalla &&
      !cargando
    ) {
      leerTexto(
        `Pantalla mis evaluaciones. Tienes ${resumen.pendientes} pendientes y ${resumen.completadas} completadas.`,
      );
    }
  }, [
    preferencias.lectorPantalla,
    cargando,
    resumen.pendientes,
    resumen.completadas,
  ]);

  const evaluacionesFiltradas =
    useMemo(() => {
      if (filtro === 'Pendientes') {
        return evaluaciones.filter(
          (evaluacion) =>
            !ESTADOS_COMPLETADOS.has(
              evaluacion.estado_alumno,
            ),
        );
      }

      if (filtro === 'Completadas') {
        return evaluaciones.filter(
          (evaluacion) =>
            ESTADOS_COMPLETADOS.has(
              evaluacion.estado_alumno,
            ),
        );
      }

      return evaluaciones;
    }, [evaluaciones, filtro]);

  const seleccionarFiltro = (
    nuevoFiltro: Filtro,
  ) => {
    setFiltro(nuevoFiltro);

    if (preferencias.lectorPantalla) {
      leerTexto(
        `Filtro ${nuevoFiltro} seleccionado.`,
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
      <View
        style={[
          styles.header,
          {
            backgroundColor: colores.fondo,
            borderBottomColor: colores.borde,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colores.texto}
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text
            accessibilityRole="header"
            style={[
              styles.headerTitle,
              {
                color: colores.texto,
                fontSize: 19 * escalaTexto,
              },
            ]}
          >
            Mis evaluaciones
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              {
                color:
                  colores.textoSecundario,
                fontSize: 11 * escalaTexto,
              },
            ]}
          >
            Consulta tus evaluaciones asignadas
          </Text>
        </View>

        <TouchableOpacity
          style={styles.accessibilityButton}
          onPress={() =>
            router.push(
              '/accesibilidad' as never,
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Configuración de accesibilidad"
        >
          <Ionicons
            name="accessibility"
            size={27}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() =>
              void cargarEvaluaciones(true)
            }
            tintColor={AZUL}
            colors={[AZUL]}
          />
        }
      >
        <View
          style={[
            styles.content,
            { width: anchoContenido },
          ]}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroText}>
              <Text style={styles.heroEyebrow}>
                TU PROGRESO
              </Text>

              <Text
                style={[
                  styles.heroTitle,
                  {
                    fontSize:
                      22 * escalaTexto,
                  },
                ]}
              >
                {resumen.pendientes}{' '}
                {resumen.pendientes === 1
                  ? 'pendiente'
                  : 'pendientes'}
              </Text>

              <Text style={styles.heroSubtitle}>
                Organiza tu tiempo y completa
                tus evaluaciones
              </Text>
            </View>

            <View style={styles.heroIcon}>
              <Ionicons
                name="ribbon-outline"
                size={34}
                color="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard
              value={resumen.total}
              label="Total"
              icon="documents-outline"
              color={AZUL}
              background="#EDE9FE"
            />

            <StatCard
              value={resumen.completadas}
              label="Terminadas"
              icon="checkmark-circle-outline"
              color="#16A34A"
              background="#DCFCE7"
            />

            <StatCard
              value={resumen.vencidas}
              label="Vencidas"
              icon="alert-circle-outline"
              color="#DC2626"
              background="#FEE2E2"
            />
          </View>

          <View style={styles.filters}>
            {(
              [
                'Todas',
                'Pendientes',
                'Completadas',
              ] as Filtro[]
            ).map((opcion) => {
              const seleccionada =
                filtro === opcion;

              return (
                <TouchableOpacity
                  key={opcion}
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor:
                        seleccionada
                          ? AZUL
                          : colores.tarjeta,
                      borderColor:
                        seleccionada
                          ? AZUL
                          : colores.borde,
                    },
                  ]}
                  onPress={() =>
                    seleccionarFiltro(opcion)
                  }
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: seleccionada,
                  }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color: seleccionada
                          ? '#FFFFFF'
                          : colores.texto,
                        fontSize:
                          11 * escalaTexto,
                      },
                    ]}
                  >
                    {opcion}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {cargando ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator
                size="large"
                color={AZUL}
              />

              <Text
                style={[
                  styles.loadingText,
                  {
                    color:
                      colores.textoSecundario,
                  },
                ]}
              >
                Cargando evaluaciones...
              </Text>
            </View>
          ) : evaluacionesFiltradas.length ===
            0 ? (
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
                name="document-text-outline"
                size={48}
                color={AZUL}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  { color: colores.texto },
                ]}
              >
                No hay evaluaciones aquí
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      colores.textoSecundario,
                  },
                ]}
              >
                Cuando tu docente publique una
                evaluación aparecerá aquí.
              </Text>
            </View>
          ) : (
            evaluacionesFiltradas.map(
              (evaluacion) => (
                <EvaluationCard
                  key={
                    evaluacion.id_evaluacion
                  }
                  evaluacion={evaluacion}
                  textColor={colores.texto}
                  secondaryColor={
                    colores.textoSecundario
                  }
                  cardColor={colores.tarjeta}
                  borderColor={colores.borde}
                  escalaTexto={escalaTexto}
                  onPress={() => {
                    router.push({
                      pathname:
                        '/responder-evaluacion',
                      params: {
                        id_evaluacion: String(
                          evaluacion.id_evaluacion,
                        ),
                      },
                    } as never);
                  }}
                />
              ),
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  value,
  label,
  icon,
  color,
  background,
}: {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
}) {
  return (
    <View
      style={styles.statCard}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View
        style={[
          styles.statIcon,
          { backgroundColor: background },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={color}
        />
      </View>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function EvaluationCard({
  evaluacion,
  textColor,
  secondaryColor,
  cardColor,
  borderColor,
  escalaTexto,
  onPress,
}: {
  evaluacion: EvaluacionAlumno;
  textColor: string;
  secondaryColor: string;
  cardColor: string;
  borderColor: string;
  escalaTexto: number;
  onPress: () => void;
}) {
  const completada =
    ESTADOS_COMPLETADOS.has(
      evaluacion.estado_alumno,
    );

  const vencida =
    Number(evaluacion.vencida) === 1;

  const configuracion =
    evaluacion.configuracion_evaluacion;

  const estado = completada
    ? {
        texto: 'Completada',
        fondo: '#DCFCE7',
        color: '#15803D',
      }
    : vencida
      ? {
          texto: 'Vencida',
          fondo: '#FEE2E2',
          color: '#B91C1C',
        }
      : {
          texto: 'Pendiente',
          fondo: '#FEF3C7',
          color: '#B45309',
        };

  return (
    <TouchableOpacity
      style={[
        styles.evaluationCard,
        {
          backgroundColor: cardColor,
          borderColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`${evaluacion.titulo}. ${evaluacion.materia}. ${estado.texto}.`}
      accessibilityHint="Abre las preguntas de la evaluación"
    >
      <View style={styles.evaluationTop}>
        <View style={styles.evaluationIcon}>
          <Ionicons
            name="document-text"
            size={23}
            color={AZUL}
          />
        </View>

        <View style={styles.evaluationHeading}>
          <Text style={styles.subject}>
            {evaluacion.materia.toUpperCase()}
          </Text>

          <Text
            numberOfLines={2}
            style={[
              styles.evaluationTitle,
              {
                color: textColor,
                fontSize: 15 * escalaTexto,
              },
            ]}
          >
            {evaluacion.titulo}
          </Text>
        </View>

        <View
          style={[
            styles.statusChip,
            {
              backgroundColor:
                estado.fondo,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: estado.color },
            ]}
          >
            {estado.texto}
          </Text>
        </View>
      </View>

      {!!evaluacion.descripcion && (
        <Text
          numberOfLines={2}
          style={[
            styles.description,
            { color: secondaryColor },
          ]}
        >
          {evaluacion.descripcion}
        </Text>
      )}

      <View
        style={[
          styles.metaRow,
          { borderTopColor: borderColor },
        ]}
      >
        <MetaItem
          icon="calendar-outline"
          value={mostrarFecha(
            evaluacion.fecha_limite,
          )}
          color={secondaryColor}
        />

        <MetaItem
          icon="time-outline"
          value={`${
            configuracion?.duracion_minutos ??
            60
          } min`}
          color={secondaryColor}
        />

        <MetaItem
          icon="trophy-outline"
          value={`${evaluacion.puntaje_maximo} pts`}
          color={secondaryColor}
        />
      </View>

      <View style={styles.courseRow}>
        <View style={styles.courseChip}>
          <Ionicons
            name="people-outline"
            size={14}
            color={AZUL_OSCURO}
          />

          <Text
            numberOfLines={1}
            style={styles.courseText}
          >
            {evaluacion.nombre_curso}
            {' · '}
            {evaluacion.grado}
            {' '}
            {evaluacion.grupo}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={AZUL}
        />
      </View>
    </TouchableOpacity>
  );
}

function MetaItem({
  icon,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons
        name={icon}
        size={14}
        color={color}
      />

      <Text
        numberOfLines={1}
        style={[
          styles.metaText,
          { color },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 3,
  },
  accessibilityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor:
      MORADO_ACCESIBILIDAD,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingBottom: 38,
  },
  content: {
    paddingHorizontal: 1,
  },
  heroCard: {
    minHeight: 126,
    backgroundColor: AZUL,
    borderRadius: 22,
    padding: 19,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 5,
  },
  heroText: {
    flex: 1,
  },
  heroEyebrow: {
    color: '#DCE5FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: 4,
  },
  heroSubtitle: {
    color: '#E8EDFF',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor:
      'rgba(255,255,255,0.17)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    minHeight: 104,
    borderWidth: 1,
    borderColor: '#E6EAF0',
    borderRadius: 15,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  statIcon: {
    width: 33,
    height: 33,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  statValue: {
    color: '#1F2A3A',
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    color: '#7C8798',
    fontSize: 9,
    marginTop: 2,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  filterButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterText: {
    fontWeight: '800',
  },
  loadingBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  emptyCard: {
    minHeight: 250,
    borderWidth: 1,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },
  evaluationCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
  },
  evaluationTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  evaluationIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: AZUL_SUAVE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  evaluationHeading: {
    flex: 1,
    paddingRight: 6,
  },
  subject: {
    color: AZUL,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  evaluationTitle: {
    fontWeight: '800',
    marginTop: 3,
    lineHeight: 20,
  },
  statusChip: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  description: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 11,
  },
  metaRow: {
    flexDirection: 'row',
    borderTopWidth:
      StyleSheet.hairlineWidth,
    paddingTop: 11,
    marginTop: 12,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    flex: 1,
    marginLeft: 4,
    fontSize: 9,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  courseChip: {
    flex: 1,
    minHeight: 30,
    borderRadius: 10,
    backgroundColor: AZUL_SUAVE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    marginRight: 8,
  },
  courseText: {
    flex: 1,
    color: AZUL_OSCURO,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
  },
});