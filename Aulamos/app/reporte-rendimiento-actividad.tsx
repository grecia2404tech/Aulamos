import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type AlumnoRendimiento = {
  id_alumno: number;
  nombre: string;
  estado: string;
  calificacion: number | null;
  porcentaje_avance: number;
};

type ReporteActividad = {
  actividad: {
    id_actividad: number;
    titulo: string;
    materia: string;
    fecha_limite: string | null;
    puntaje_maximo: number;
  } | null;
  resumen: {
    promedio: number;
    total_alumnos: number;
    entregadas: number;
    pendientes: number;
    calificadas: number;
  };
  alumnos: AlumnoRendimiento[];
};

const REPORTE_VACIO: ReporteActividad = {
  actividad: null,
  resumen: {
    promedio: 0,
    total_alumnos: 0,
    entregadas: 0,
    pendientes: 0,
    calificadas: 0,
  },
  alumnos: [],
};

export default function ReporteRendimientoActividadScreen() {
  const {
    preferencias,
    colores,
    escalaTexto,
    leerTexto,
  } = useAccessibility();

  const [reporte, setReporte] =
    useState<ReporteActividad>(REPORTE_VACIO);

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] =
    useState(false);

  const anunciar = useCallback(
    (mensaje: string) => {
      if (preferencias.lectorPantalla) {
        leerTexto(mensaje);
      }
    },
    [preferencias.lectorPantalla, leerTexto]
  );

  const cargarReporte = useCallback(
    async (cargaPrincipal = true) => {
      try {
        if (cargaPrincipal) {
          setCargando(true);
        }

        const usuarioGuardado =
          await AsyncStorage.getItem('usuario');

        const token =
          await AsyncStorage.getItem('token');

        if (!usuarioGuardado) {
          throw new Error(
            'No se encontró la sesión del docente.'
          );
        }

        const usuario = JSON.parse(usuarioGuardado);

        const idDocente =
          usuario.id_usuario ??
          usuario.id_docente ??
          usuario.id;

        if (!idDocente) {
          throw new Error(
            'No se encontró el identificador del docente.'
          );
        }

        /*
         * Este endpoint puede devolver la actividad más reciente.
         * Después puedes agregar selectores de curso y actividad.
         */
        const respuesta = await fetch(
          `${API_URL}/docente/reportes/rendimiento-actividad?id_docente=${idDocente}`,
          {
            headers: {
              Accept: 'application/json',
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : {}),
            },
          }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje ||
              'No se pudo cargar el reporte.'
          );
        }

        const datos: ReporteActividad = {
          actividad: resultado.actividad ?? null,
          resumen: {
            promedio: Number(
              resultado.resumen?.promedio ?? 0
            ),
            total_alumnos: Number(
              resultado.resumen?.total_alumnos ?? 0
            ),
            entregadas: Number(
              resultado.resumen?.entregadas ?? 0
            ),
            pendientes: Number(
              resultado.resumen?.pendientes ?? 0
            ),
            calificadas: Number(
              resultado.resumen?.calificadas ?? 0
            ),
          },
          alumnos: Array.isArray(resultado.alumnos)
            ? resultado.alumnos.map(
                (alumno: AlumnoRendimiento) => ({
                  id_alumno: Number(
                    alumno.id_alumno
                  ),
                  nombre:
                    alumno.nombre ||
                    'Alumno sin nombre',
                  estado:
                    alumno.estado || 'Pendiente',
                  calificacion:
                    alumno.calificacion === null ||
                    alumno.calificacion === undefined
                      ? null
                      : Number(
                          alumno.calificacion
                        ),
                  porcentaje_avance: Number(
                    alumno.porcentaje_avance ?? 0
                  ),
                })
              )
            : [],
        };

        setReporte(datos);

        anunciar(
          `Reporte de rendimiento actualizado. Promedio del grupo ${datos.resumen.promedio.toFixed(
            1
          )}. ${datos.resumen.entregadas} actividades entregadas y ${datos.resumen.pendientes} pendientes.`
        );
      } catch (error) {
        console.error(
          'Error al cargar rendimiento:',
          error
        );

        setReporte(REPORTE_VACIO);

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
    [anunciar]
  );

  useFocusEffect(
    useCallback(() => {
      cargarReporte();
    }, [cargarReporte])
  );

  const actualizar = () => {
    setActualizando(true);
    cargarReporte(false);
  };

  const porcentajeEntregadas = useMemo(() => {
    if (reporte.resumen.total_alumnos === 0) {
      return 0;
    }

    return Math.round(
      (reporte.resumen.entregadas /
        reporte.resumen.total_alumnos) *
        100
    );
  }, [reporte.resumen]);

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colores.fondo,
        },
      ]}
    >
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
          style={styles.botonEncabezado}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
          accessibilityHint="Regresa a la pantalla de reportes"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colores.texto}
          />
        </TouchableOpacity>

        <View style={styles.encabezadoTexto}>
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
            Rendimiento por actividad
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
            Consulta entregas y calificaciones
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
                  fontSize: 14 * escalaTexto,
                },
              ]}
            >
              Cargando rendimiento...
            </Text>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.tarjetaActividad,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
            >
              <Ionicons
                name="reader-outline"
                size={27}
                color={colores.primario}
              />

              <View style={styles.informacionActividad}>
                <Text
                  style={[
                    styles.nombreActividad,
                    {
                      color: colores.texto,
                      fontSize: 16 * escalaTexto,
                    },
                  ]}
                >
                  {reporte.actividad?.titulo ??
                    'No hay actividades registradas'}
                </Text>

                <Text
                  style={[
                    styles.detalleActividad,
                    {
                      color:
                        colores.textoSecundario,
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  {reporte.actividad?.materia ??
                    'Sin materia'}
                </Text>

                {reporte.actividad?.fecha_limite && (
                  <Text
                    style={[
                      styles.detalleActividad,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          12 * escalaTexto,
                      },
                    ]}
                  >
                    Fecha límite:{' '}
                    {reporte.actividad.fecha_limite}
                  </Text>
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
              Resumen del grupo
            </Text>

            <View style={styles.filaTarjetas}>
              <TarjetaResumen
                titulo="Promedio"
                valor={reporte.resumen.promedio.toFixed(
                  1
                )}
                icono="stats-chart"
                colores={colores}
                escalaTexto={escalaTexto}
              />

              <TarjetaResumen
                titulo="Entregadas"
                valor={String(
                  reporte.resumen.entregadas
                )}
                icono="checkmark-circle-outline"
                colores={colores}
                escalaTexto={escalaTexto}
              />
            </View>

            <View style={styles.filaTarjetas}>
              <TarjetaResumen
                titulo="Pendientes"
                valor={String(
                  reporte.resumen.pendientes
                )}
                icono="time-outline"
                colores={colores}
                escalaTexto={escalaTexto}
              />

              <TarjetaResumen
                titulo="Calificadas"
                valor={String(
                  reporte.resumen.calificadas
                )}
                icono="school-outline"
                colores={colores}
                escalaTexto={escalaTexto}
              />
            </View>

            <View
              style={[
                styles.tarjetaProgreso,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
              accessible
              accessibilityLabel={`${porcentajeEntregadas} por ciento de actividades entregadas`}
            >
              <View style={styles.filaProgreso}>
                <Text
                  style={[
                    styles.textoProgreso,
                    {
                      color: colores.texto,
                      fontSize: 13 * escalaTexto,
                    },
                  ]}
                >
                  Porcentaje de entregas
                </Text>

                <Text
                  style={[
                    styles.porcentaje,
                    {
                      color: colores.primario,
                      fontSize: 14 * escalaTexto,
                    },
                  ]}
                >
                  {porcentajeEntregadas}%
                </Text>
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
                      backgroundColor:
                        colores.primario,
                      width: `${porcentajeEntregadas}%`,
                    },
                  ]}
                />
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
              Resultados de estudiantes
            </Text>

            {reporte.alumnos.length === 0 ? (
              <View
                style={[
                  styles.estadoVacio,
                  {
                    backgroundColor: colores.tarjeta,
                    borderColor: colores.borde,
                  },
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={42}
                  color={colores.textoSecundario}
                />

                <Text
                  style={[
                    styles.textoVacio,
                    {
                      color:
                        colores.textoSecundario,
                      fontSize: 14 * escalaTexto,
                    },
                  ]}
                >
                  No existen resultados para mostrar.
                </Text>
              </View>
            ) : (
              reporte.alumnos.map((alumno) => (
                <View
                  key={alumno.id_alumno}
                  style={[
                    styles.tarjetaAlumno,
                    {
                      backgroundColor:
                        colores.tarjeta,
                      borderColor: colores.borde,
                    },
                  ]}
                  accessible
                  accessibilityLabel={`${alumno.nombre}. Estado ${alumno.estado}. Calificación ${
                    alumno.calificacion ??
                    'sin calificar'
                  }`}
                >
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor:
                          colores.fondoPrimario,
                      },
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={21}
                      color={colores.primario}
                    />
                  </View>

                  <View style={styles.datosAlumno}>
                    <Text
                      style={[
                        styles.nombreAlumno,
                        {
                          color: colores.texto,
                          fontSize:
                            14 * escalaTexto,
                        },
                      ]}
                    >
                      {alumno.nombre}
                    </Text>

                    <Text
                      style={[
                        styles.estadoAlumno,
                        {
                          color:
                            colores.textoSecundario,
                          fontSize:
                            11 * escalaTexto,
                        },
                      ]}
                    >
                      {alumno.estado}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.calificacion,
                      {
                        color:
                          alumno.calificacion === null
                            ? colores.textoSecundario
                            : colores.primario,
                        fontSize:
                          16 * escalaTexto,
                      },
                    ]}
                  >
                    {alumno.calificacion === null
                      ? 'Pendiente'
                      : alumno.calificacion.toFixed(1)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type TarjetaResumenProps = {
  titulo: string;
  valor: string;
  icono: keyof typeof Ionicons.glyphMap;
  colores: {
    tarjeta: string;
    borde: string;
    texto: string;
    textoSecundario: string;
    primario: string;
    fondoPrimario: string;
  };
  escalaTexto: number;
};

function TarjetaResumen({
  titulo,
  valor,
  icono,
  colores,
  escalaTexto,
}: TarjetaResumenProps) {
  return (
    <View
      style={[
        styles.tarjetaResumen,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${titulo}: ${valor}`}
    >
      <View
        style={[
          styles.cajaIcono,
          {
            backgroundColor: colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={icono}
          size={22}
          color={colores.primario}
        />
      </View>

      <Text
        style={[
          styles.valorResumen,
          {
            color: colores.texto,
            fontSize: 22 * escalaTexto,
          },
        ]}
      >
        {valor}
      </Text>

      <Text
        style={[
          styles.tituloResumen,
          {
            color: colores.textoSecundario,
            fontSize: 11 * escalaTexto,
          },
        ]}
      >
        {titulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  encabezado: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  botonEncabezado: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  encabezadoTexto: {
    flex: 1,
  },

  tituloPantalla: {
    fontWeight: '800',
  },

  subtituloPantalla: {
    marginTop: 3,
  },

  contenido: {
    padding: 14,
    paddingBottom: 35,
  },

  cargando: {
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoCargando: {
    marginTop: 12,
  },

  tarjetaActividad: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  informacionActividad: {
    flex: 1,
    marginLeft: 12,
  },

  nombreActividad: {
    fontWeight: '800',
  },

  detalleActividad: {
    marginTop: 4,
  },

  tituloSeccion: {
    marginTop: 18,
    marginBottom: 9,
    fontWeight: '800',
  },

  filaTarjetas: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 9,
  },

  tarjetaResumen: {
    flex: 1,
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },

  cajaIcono: {
    width: 39,
    height: 39,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  valorResumen: {
    marginTop: 9,
    fontWeight: '800',
  },

  tituloResumen: {
    marginTop: 3,
    fontWeight: '600',
  },

  tarjetaProgreso: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 3,
  },

  filaProgreso: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  textoProgreso: {
    fontWeight: '700',
  },

  porcentaje: {
    fontWeight: '800',
  },

  barraFondo: {
    height: 8,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 12,
  },

  barraValor: {
    height: '100%',
    borderRadius: 5,
  },

  estadoVacio: {
    minHeight: 170,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },

  textoVacio: {
    marginTop: 10,
    textAlign: 'center',
  },

  tarjetaAlumno: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  datosAlumno: {
    flex: 1,
    marginHorizontal: 11,
  },

  nombreAlumno: {
    fontWeight: '800',
  },

  estadoAlumno: {
    marginTop: 3,
  },

  calificacion: {
    fontWeight: '800',
  },
});