import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type AlumnoDetalle = {
  id_alumno: number;
  nombre_completo: string;
  correo: string;
  grupos?: string | null;
};

type ResumenProgreso = {
  total_actividades: number;
  completadas: number;
  en_progreso: number;
  pendientes: number;
  progreso_general: number;
  promedio_calificaciones: number;
};

type ActividadAlumno = {
  id_actividad: number;
  titulo: string;
  descripcion?: string | null;
  tipo: string;
  fecha_limite?: string | null;
  estado_alumno: string;
  porcentaje_avance: number;
  calificacion?: number | null;
  materia: string;
  curso: string;
};

type RespuestaProgreso = {
  mensaje?: string;
  error?: string;
  alumno?: AlumnoDetalle;
  resumen?: Partial<ResumenProgreso>;
  actividades?: ActividadAlumno[];
};

const RESUMEN_VACIO: ResumenProgreso = {
  total_actividades: 0,
  completadas: 0,
  en_progreso: 0,
  pendientes: 0,
  progreso_general: 0,
  promedio_calificaciones: 0,
};

export default function DetalleEstudianteScreen() {
  const { id_alumno } =
    useLocalSearchParams<{
      id_alumno?: string;
    }>();

  const {
    colores,
    escalaTexto,
    preferencias,
    leerTexto,
    detenerLectura,
  } = useAccessibility();

  const [alumno, setAlumno] =
    useState<AlumnoDetalle | null>(null);

  const [resumen, setResumen] =
    useState<ResumenProgreso>(RESUMEN_VACIO);

  const [actividades, setActividades] =
    useState<ActividadAlumno[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [actualizando, setActualizando] =
    useState(false);

  const temaOscuro =
    preferencias.modoOscuro ||
    preferencias.altoContraste;

  const anunciar = useCallback(
    (mensaje: string) => {
      if (preferencias.lectorPantalla) {
        leerTexto(mensaje);
      }
    },
    [
      preferencias.lectorPantalla,
      leerTexto,
    ]
  );

  const cargarProgreso = useCallback(
    async (mostrarCarga = true) => {
      try {
        if (mostrarCarga) {
          setCargando(true);
        }

        const idAlumnoNumero =
          Number(id_alumno);

        if (
          !Number.isInteger(idAlumnoNumero) ||
          idAlumnoNumero <= 0
        ) {
          throw new Error(
            'No se recibió un estudiante válido.'
          );
        }

        const token =
          await AsyncStorage.getItem('token');

        if (!token) {
          throw new Error(
            'No se encontró la sesión del docente.'
          );
        }

        const respuesta = await fetch(
          `${API_URL}/docente/estudiantes/${idAlumnoNumero}/progreso`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const texto = await respuesta.text();

        let resultado: RespuestaProgreso = {};

        if (texto) {
          try {
            resultado = JSON.parse(texto);
          } catch {
            throw new Error(
              'El servidor envió una respuesta incorrecta.'
            );
          }
        }

        if (
          respuesta.status === 401 ||
          respuesta.status === 403
        ) {
          throw new Error(
            resultado.mensaje ||
              'No tienes permiso para consultar este estudiante.'
          );
        }

        if (!respuesta.ok) {
  throw new Error(
    resultado.error ||
      resultado.mensaje ||
      `No se pudo obtener el progreso. Código ${respuesta.status}`
  );
}

        const nuevoResumen: ResumenProgreso = {
          total_actividades: Number(
            resultado.resumen
              ?.total_actividades ?? 0
          ),
          completadas: Number(
            resultado.resumen
              ?.completadas ?? 0
          ),
          en_progreso: Number(
            resultado.resumen
              ?.en_progreso ?? 0
          ),
          pendientes: Number(
            resultado.resumen
              ?.pendientes ?? 0
          ),
          progreso_general: Number(
            resultado.resumen
              ?.progreso_general ?? 0
          ),
          promedio_calificaciones: Number(
            resultado.resumen
              ?.promedio_calificaciones ?? 0
          ),
        };

        const listaActividades =
          Array.isArray(resultado.actividades)
            ? resultado.actividades.map(
                (actividad) => ({
                  ...actividad,
                  porcentaje_avance: Number(
                    actividad.porcentaje_avance ?? 0
                  ),
                  calificacion:
                    actividad.calificacion === null ||
                    actividad.calificacion === undefined
                      ? null
                      : Number(
                          actividad.calificacion
                        ),
                })
              )
            : [];

        setAlumno(resultado.alumno ?? null);
        setResumen(nuevoResumen);
        setActividades(listaActividades);

        if (resultado.alumno) {
          anunciar(
            `Progreso de ${resultado.alumno.nombre_completo}. Progreso general ${Math.round(
              nuevoResumen.progreso_general
            )} por ciento. ${nuevoResumen.completadas} actividades completadas, ${nuevoResumen.en_progreso} en progreso y ${nuevoResumen.pendientes} pendientes.`
          );
        }
      } catch (error) {
        console.error(
          'Error al cargar progreso:',
          error
        );

        const mensaje =
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado.';

        Alert.alert('Error', mensaje);
        anunciar(`Error. ${mensaje}`);
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [id_alumno, anunciar]
  );

  useFocusEffect(
    useCallback(() => {
      cargarProgreso();

      return () => {
        detenerLectura();
      };
    }, [cargarProgreso, detenerLectura])
  );

  const actualizar = () => {
    setActualizando(true);
    cargarProgreso(false);
  };

  const porcentajeGeneral = Math.min(
    100,
    Math.max(0, resumen.progreso_general)
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colores.fondo,
        },
      ]}
    >
      <StatusBar
        barStyle={
          temaOscuro
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={colores.fondo}
      />

      <View
        style={[
          styles.encabezado,
          {
            backgroundColor: colores.fondo,
            borderBottomColor: colores.borde,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.botonRegresar,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
          accessibilityHint="Regresa a la lista de estudiantes"
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colores.texto}
          />
        </TouchableOpacity>

        <View style={styles.textoEncabezado}>
          <Text
            style={[
              styles.tituloPantalla,
              {
                color: colores.texto,
                fontSize: 19 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Progreso del estudiante
          </Text>

          <Text
            style={[
              styles.subtituloPantalla,
              {
                color: colores.textoSecundario,
                fontSize: 11 * escalaTexto,
              },
            ]}
          >
            Actividades y resultados académicos
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizar}
            colors={[colores.primario]}
            tintColor={colores.primario}
          />
        }
      >
        {cargando ? (
          <View style={styles.cargando}>
            <ActivityIndicator
              size="large"
              color={colores.primario}
            />

            <Text
              style={[
                styles.textoCargando,
                {
                  color: colores.textoSecundario,
                  fontSize: 13 * escalaTexto,
                },
              ]}
            >
              Cargando progreso...
            </Text>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.tarjetaAlumno,
                {
                  backgroundColor:
                    colores.fondoPrimario,
                  borderColor: colores.borde,
                },
              ]}
              accessible
              accessibilityLabel={`${alumno?.nombre_completo ?? 'Estudiante'}. ${alumno?.correo ?? ''}. Grupo ${alumno?.grupos ?? 'no disponible'}.`}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: colores.tarjeta,
                    borderColor: colores.borde,
                  },
                ]}
              >
                <Ionicons
                  name="person"
                  size={34}
                  color={colores.primario}
                />
              </View>

              <View style={styles.datosAlumno}>
                <Text
                  style={[
                    styles.nombreAlumno,
                    {
                      color: colores.texto,
                      fontSize: 16 * escalaTexto,
                    },
                  ]}
                >
                  {alumno?.nombre_completo ??
                    'Estudiante'}
                </Text>

                <Text
                  style={[
                    styles.correoAlumno,
                    {
                      color:
                        colores.textoSecundario,
                      fontSize: 11 * escalaTexto,
                    },
                  ]}
                >
                  {alumno?.correo ??
                    'Correo no disponible'}
                </Text>

                {alumno?.grupos && (
                  <View
                    style={[
                      styles.insigniaGrupo,
                      {
                        backgroundColor:
                          colores.tarjeta,
                        borderColor: colores.borde,
                      },
                    ]}
                  >
                    <Ionicons
                      name="school-outline"
                      size={14}
                      color={colores.primario}
                    />

                    <Text
                      style={[
                        styles.textoGrupo,
                        {
                          color: colores.primario,
                          fontSize: 10 * escalaTexto,
                        },
                      ]}
                    >
                      {alumno.grupos}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text
              style={[
                styles.tituloSeccion,
                {
                  color: colores.texto,
                  fontSize: 15 * escalaTexto,
                },
              ]}
              accessibilityRole="header"
            >
              Resumen general
            </Text>

            <View
              style={[
                styles.tarjetaProgreso,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
              accessible
              accessibilityLabel={`Progreso general ${Math.round(
                porcentajeGeneral
              )} por ciento`}
            >
              <View style={styles.filaProgreso}>
                <View>
                  <Text
                    style={[
                      styles.valorProgreso,
                      {
                        color: colores.primario,
                        fontSize: 30 * escalaTexto,
                      },
                    ]}
                  >
                    {Math.round(porcentajeGeneral)}%
                  </Text>

                  <Text
                    style={[
                      styles.textoProgreso,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize: 11 * escalaTexto,
                      },
                    ]}
                  >
                    Progreso general
                  </Text>
                </View>

                <View
                  style={[
                    styles.iconoProgreso,
                    {
                      backgroundColor:
                        colores.fondoPrimario,
                    },
                  ]}
                >
                  <Ionicons
                    name="trending-up-outline"
                    size={30}
                    color={colores.primario}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.barraFondo,
                  {
                    backgroundColor: colores.borde,
                  },
                ]}
              >
                <View
                  style={[
                    styles.barraValor,
                    {
                      width: `${porcentajeGeneral}%`,
                      backgroundColor:
                        colores.primario,
                    },
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.totalActividades,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize: 10 * escalaTexto,
                  },
                ]}
              >
                {resumen.total_actividades}{' '}
                actividades asignadas
              </Text>
            </View>

            <View style={styles.filaResumen}>
              <ResumenCard
                titulo="Completadas"
                valor={resumen.completadas}
                icono="checkmark-circle-outline"
                colores={colores}
                escalaTexto={escalaTexto}
              />

              <ResumenCard
                titulo="En progreso"
                valor={resumen.en_progreso}
                icono="time-outline"
                colores={colores}
                escalaTexto={escalaTexto}
              />

              <ResumenCard
                titulo="Pendientes"
                valor={resumen.pendientes}
                icono="alert-circle-outline"
                colores={colores}
                escalaTexto={escalaTexto}
              />
            </View>

            <View
              style={[
                styles.tarjetaPromedio,
                {
                  backgroundColor:
                    colores.fondoPrimario,
                  borderColor: colores.borde,
                },
              ]}
              accessible
              accessibilityLabel={`Promedio de calificaciones ${resumen.promedio_calificaciones.toFixed(
                1
              )}`}
            >
              <View
                style={[
                  styles.iconoPromedio,
                  {
                    backgroundColor: colores.tarjeta,
                  },
                ]}
              >
                <Ionicons
                  name="school-outline"
                  size={25}
                  color={colores.primario}
                />
              </View>

              <View style={styles.datosPromedio}>
                <Text
                  style={[
                    styles.etiquetaPromedio,
                    {
                      color:
                        colores.textoSecundario,
                      fontSize: 10 * escalaTexto,
                    },
                  ]}
                >
                  Promedio de calificaciones
                </Text>

                <Text
                  style={[
                    styles.valorPromedio,
                    {
                      color: colores.texto,
                      fontSize: 21 * escalaTexto,
                    },
                  ]}
                >
                  {resumen.promedio_calificaciones.toFixed(
                    1
                  )}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.tituloSeccion,
                {
                  color: colores.texto,
                  fontSize: 15 * escalaTexto,
                },
              ]}
              accessibilityRole="header"
            >
              Actividades
            </Text>

            {actividades.length === 0 ? (
              <View
                style={[
                  styles.estadoVacio,
                  {
                    backgroundColor:
                      colores.tarjeta,
                    borderColor: colores.borde,
                  },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={43}
                  color={colores.textoSecundario}
                />

                <Text
                  style={[
                    styles.tituloVacio,
                    {
                      color: colores.texto,
                      fontSize: 14 * escalaTexto,
                    },
                  ]}
                >
                  Sin actividades
                </Text>

                <Text
                  style={[
                    styles.textoVacio,
                    {
                      color:
                        colores.textoSecundario,
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  Este estudiante todavía no tiene
                  actividades asignadas.
                </Text>
              </View>
            ) : (
              actividades.map((actividad) => (
                <TarjetaActividad
                  key={actividad.id_actividad}
                  actividad={actividad}
                  colores={colores}
                  escalaTexto={escalaTexto}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type ColoresPantalla = {
  tarjeta: string;
  borde: string;
  texto: string;
  textoSecundario: string;
  primario: string;
  fondoPrimario: string;
};

type ResumenCardProps = {
  titulo: string;
  valor: number;
  icono: keyof typeof Ionicons.glyphMap;
  colores: ColoresPantalla;
  escalaTexto: number;
};

function ResumenCard({
  titulo,
  valor,
  icono,
  colores,
  escalaTexto,
}: ResumenCardProps) {
  return (
    <View
      style={[
        styles.resumenCard,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${titulo}: ${valor}`}
    >
      <Ionicons
        name={icono}
        size={22}
        color={colores.primario}
      />

      <Text
        style={[
          styles.valorResumen,
          {
            color: colores.texto,
            fontSize: 20 * escalaTexto,
          },
        ]}
      >
        {valor}
      </Text>

      <Text
        style={[
          styles.textoResumen,
          {
            color: colores.textoSecundario,
            fontSize: 9 * escalaTexto,
          },
        ]}
      >
        {titulo}
      </Text>
    </View>
  );
}

type TarjetaActividadProps = {
  actividad: ActividadAlumno;
  colores: ColoresPantalla;
  escalaTexto: number;
};

function TarjetaActividad({
  actividad,
  colores,
  escalaTexto,
}: TarjetaActividadProps) {
  const porcentaje = Math.min(
    100,
    Math.max(0, actividad.porcentaje_avance)
  );

  const fechaLimite = actividad.fecha_limite
    ? new Date(
        actividad.fecha_limite
      ).toLocaleDateString('es-MX')
    : null;

  return (
    <View
      style={[
        styles.tarjetaActividad,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${actividad.titulo}. ${actividad.materia}. Estado ${actividad.estado_alumno}. Progreso ${Math.round(
        porcentaje
      )} por ciento. ${
        actividad.calificacion === null ||
        actividad.calificacion === undefined
          ? 'Sin calificar'
          : `Calificación ${actividad.calificacion}`
      }.`}
    >
      <View style={styles.filaActividad}>
        <View
          style={[
            styles.iconoActividad,
            {
              backgroundColor:
                colores.fondoPrimario,
            },
          ]}
        >
          <Ionicons
            name={
              actividad.tipo === 'Evaluacion'
                ? 'clipboard-outline'
                : 'document-text-outline'
            }
            size={22}
            color={colores.primario}
          />
        </View>

        <View style={styles.datosActividad}>
          <Text
            style={[
              styles.tituloActividad,
              {
                color: colores.texto,
                fontSize: 13 * escalaTexto,
              },
            ]}
          >
            {actividad.titulo}
          </Text>

          <Text
            style={[
              styles.materiaActividad,
              {
                color: colores.textoSecundario,
                fontSize: 10 * escalaTexto,
              },
            ]}
          >
            {actividad.materia} · {actividad.tipo}
          </Text>

          {fechaLimite && (
            <Text
              style={[
                styles.fechaActividad,
                {
                  color:
                    colores.textoSecundario,
                  fontSize: 9 * escalaTexto,
                },
              ]}
            >
              Fecha límite: {fechaLimite}
            </Text>
          )}
        </View>

        <Text
          style={[
            styles.porcentajeActividad,
            {
              color: colores.primario,
              fontSize: 12 * escalaTexto,
            },
          ]}
        >
          {Math.round(porcentaje)}%
        </Text>
      </View>

      <View
        style={[
          styles.barraActividadFondo,
          {
            backgroundColor: colores.borde,
          },
        ]}
      >
        <View
          style={[
            styles.barraActividadValor,
            {
              width: `${porcentaje}%`,
              backgroundColor: colores.primario,
            },
          ]}
        />
      </View>

      <View style={styles.pieActividad}>
        <Text
          style={[
            styles.estadoActividad,
            {
              color: colores.textoSecundario,
              fontSize: 10 * escalaTexto,
            },
          ]}
        >
          {actividad.estado_alumno}
        </Text>

        <Text
          style={[
            styles.calificacionActividad,
            {
              color: colores.texto,
              fontSize: 10 * escalaTexto,
            },
          ]}
        >
          {actividad.calificacion === null ||
          actividad.calificacion === undefined
            ? 'Sin calificar'
            : `Calificación: ${actividad.calificacion}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  encabezado: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  botonRegresar: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoEncabezado: {
    flex: 1,
    marginHorizontal: 11,
  },

  tituloPantalla: {
    fontWeight: '900',
  },

  subtituloPantalla: {
    marginTop: 3,
  },

  contenido: {
    padding: 14,
    paddingBottom: 35,
  },

  cargando: {
    minHeight: 450,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoCargando: {
    marginTop: 11,
  },

  tarjetaAlumno: {
    minHeight: 108,
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  datosAlumno: {
    flex: 1,
    marginLeft: 13,
  },

  nombreAlumno: {
    fontWeight: '900',
  },

  correoAlumno: {
    marginTop: 4,
  },

  insigniaGrupo: {
    alignSelf: 'flex-start',
    minHeight: 27,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 8,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 5,
  },

  textoGrupo: {
    fontWeight: '800',
  },

  tituloSeccion: {
    marginTop: 20,
    marginBottom: 10,
    fontWeight: '900',
  },

  tarjetaProgreso: {
    minHeight: 145,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },

  filaProgreso: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  valorProgreso: {
    fontWeight: '900',
  },

  textoProgreso: {
    marginTop: 3,
  },

  iconoProgreso: {
    width: 55,
    height: 55,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  barraFondo: {
    height: 9,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 15,
  },

  barraValor: {
    height: '100%',
    borderRadius: 6,
  },

  totalActividades: {
    marginTop: 8,
  },

  filaResumen: {
    flexDirection: 'row',
    columnGap: 7,
    marginTop: 9,
  },

  resumenCard: {
    flex: 1,
    minHeight: 108,
    borderWidth: 1,
    borderRadius: 15,
    padding: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  valorResumen: {
    marginTop: 5,
    fontWeight: '900',
  },

  textoResumen: {
    marginTop: 3,
    textAlign: 'center',
    fontWeight: '700',
  },

  tarjetaPromedio: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoPromedio: {
    width: 47,
    height: 47,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  datosPromedio: {
    marginLeft: 11,
  },

  etiquetaPromedio: {
    fontWeight: '700',
  },

  valorPromedio: {
    marginTop: 3,
    fontWeight: '900',
  },

  tarjetaActividad: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
  },

  filaActividad: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoActividad: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  datosActividad: {
    flex: 1,
    marginHorizontal: 10,
  },

  tituloActividad: {
    fontWeight: '900',
  },

  materiaActividad: {
    marginTop: 4,
  },

  fechaActividad: {
    marginTop: 4,
  },

  porcentajeActividad: {
    fontWeight: '900',
  },

  barraActividadFondo: {
    height: 7,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 12,
  },

  barraActividadValor: {
    height: '100%',
    borderRadius: 5,
  },

  pieActividad: {
    marginTop: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  estadoActividad: {
    fontWeight: '700',
  },

  calificacionActividad: {
    fontWeight: '800',
  },

  estadoVacio: {
    minHeight: 185,
    borderWidth: 1,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  tituloVacio: {
    marginTop: 11,
    fontWeight: '900',
  },

  textoVacio: {
    marginTop: 6,
    textAlign: 'center',
  },
});