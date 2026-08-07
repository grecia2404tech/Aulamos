import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  useCallback,
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
import Svg, {
  Circle,
} from 'react-native-svg';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type AsistenciaAlumno = {
  id_alumno: number;
  nombre: string;
  asistencias: number;
  faltas: number;
  retardos: number;
  porcentaje: number;
};

type ReporteAsistencia = {
  resumen: {
    porcentaje_asistencia: number;
    asistencias: number;
    faltas: number;
    retardos: number;
    total_registros: number;
  };
  alumnos: AsistenciaAlumno[];
};

const REPORTE_VACIO: ReporteAsistencia = {
  resumen: {
    porcentaje_asistencia: 0,
    asistencias: 0,
    faltas: 0,
    retardos: 0,
    total_registros: 0,
  },
  alumnos: [],
};

export default function ReporteAsistenciaScreen() {
  const {
    preferencias,
    colores,
    escalaTexto,
    leerTexto,
  } = useAccessibility();

  const [reporte, setReporte] =
    useState<ReporteAsistencia>(REPORTE_VACIO);

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

  const cargarAsistencia = useCallback(
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

        const respuesta = await fetch(
         `${API_URL}/docente/reportes/asistencia`,
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
              'No se pudo obtener el reporte de asistencia.'
          );
        }

        const datos: ReporteAsistencia = {
          resumen: {
            porcentaje_asistencia: Number(
              resultado.resumen
                ?.porcentaje_asistencia ?? 0
            ),
            asistencias: Number(
              resultado.resumen?.asistencias ?? 0
            ),
            faltas: Number(
              resultado.resumen?.faltas ?? 0
            ),
            retardos: Number(
              resultado.resumen?.retardos ?? 0
            ),
            total_registros: Number(
              resultado.resumen
                ?.total_registros ?? 0
            ),
          },

          alumnos: Array.isArray(resultado.alumnos)
            ? resultado.alumnos.map(
                (alumno: AsistenciaAlumno) => ({
                  id_alumno: Number(
                    alumno.id_alumno
                  ),
                  nombre:
                    alumno.nombre ||
                    'Alumno sin nombre',
                  asistencias: Number(
                    alumno.asistencias ?? 0
                  ),
                  faltas: Number(
                    alumno.faltas ?? 0
                  ),
                  retardos: Number(
                    alumno.retardos ?? 0
                  ),
                  porcentaje: Number(
                    alumno.porcentaje ?? 0
                  ),
                })
              )
            : [],
        };

        setReporte(datos);

        anunciar(
          `Reporte de asistencia actualizado. Asistencia general ${datos.resumen.porcentaje_asistencia} por ciento. ${datos.resumen.asistencias} asistencias, ${datos.resumen.faltas} faltas y ${datos.resumen.retardos} retardos.`
        );
      } catch (error) {
        console.error(
          'Error al obtener asistencia:',
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
      cargarAsistencia();
    }, [cargarAsistencia])
  );

  const actualizar = () => {
    setActualizando(true);
    cargarAsistencia(false);
  };

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
            Asistencia y participación
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
            Consulta la asistencia del grupo
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
              Cargando asistencia...
            </Text>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.tarjetaPrincipal,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
              accessible
              accessibilityLabel={`Asistencia general ${reporte.resumen.porcentaje_asistencia} por ciento`}
            >
              <View>
                <Text
                  style={[
                    styles.tituloTarjeta,
                    {
                      color: colores.texto,
                      fontSize: 14 * escalaTexto,
                    },
                  ]}
                >
                  Asistencia general
                </Text>

                <Text
                  style={[
                    styles.porcentajePrincipal,
                    {
                      color: colores.texto,
                      fontSize: 31 * escalaTexto,
                    },
                  ]}
                >
                  {Math.round(
                    reporte.resumen
                      .porcentaje_asistencia
                  )}
                  %
                </Text>

                <Text
                  style={[
                    styles.textoRegistros,
                    {
                      color:
                        colores.textoSecundario,
                      fontSize: 11 * escalaTexto,
                    },
                  ]}
                >
                  {
                    reporte.resumen
                      .total_registros
                  }{' '}
                  registros
                </Text>
              </View>

              <GraficaCircular
                porcentaje={
                  reporte.resumen
                    .porcentaje_asistencia
                }
                color={colores.primario}
                colorFondo={colores.borde}
              />
            </View>

            <View style={styles.filaTarjetas}>
              <TarjetaAsistencia
                titulo="Asistencias"
                cantidad={
                  reporte.resumen.asistencias
                }
                icono="checkmark-circle-outline"
                colores={colores}
                escalaTexto={escalaTexto}
              />

              <TarjetaAsistencia
                titulo="Faltas"
                cantidad={reporte.resumen.faltas}
                icono="close-circle-outline"
                colores={colores}
                escalaTexto={escalaTexto}
              />

              <TarjetaAsistencia
                titulo="Retardos"
                cantidad={
                  reporte.resumen.retardos
                }
                icono="time-outline"
                colores={colores}
                escalaTexto={escalaTexto}
              />
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
              Asistencia por estudiante
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
                  name="calendar-outline"
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
                  No existen registros de asistencia.
                </Text>
              </View>
            ) : (
              reporte.alumnos.map((alumno) => {
                const porcentajeSeguro = Math.min(
                  100,
                  Math.max(0, alumno.porcentaje)
                );

                return (
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
                    accessibilityLabel={`${alumno.nombre}. ${porcentajeSeguro} por ciento de asistencia. ${alumno.asistencias} asistencias, ${alumno.faltas} faltas y ${alumno.retardos} retardos.`}
                  >
                    <View style={styles.filaAlumno}>
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

                      <View
                        style={styles.datosAlumno}
                      >
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
                            styles.detalleAlumno,
                            {
                              color:
                                colores.textoSecundario,
                              fontSize:
                                10 * escalaTexto,
                            },
                          ]}
                        >
                          {alumno.asistencias} asistencias ·{' '}
                          {alumno.faltas} faltas ·{' '}
                          {alumno.retardos} retardos
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.porcentajeAlumno,
                          {
                            color: colores.primario,
                            fontSize:
                              15 * escalaTexto,
                          },
                        ]}
                      >
                        {porcentajeSeguro}%
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.barraFondo,
                        {
                          backgroundColor:
                            colores.borde,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.barraValor,
                          {
                            backgroundColor:
                              colores.primario,
                            width: `${porcentajeSeguro}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type TarjetaAsistenciaProps = {
  titulo: string;
  cantidad: number;
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

function TarjetaAsistencia({
  titulo,
  cantidad,
  icono,
  colores,
  escalaTexto,
}: TarjetaAsistenciaProps) {
  return (
    <View
      style={[
        styles.tarjetaPequena,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${titulo}: ${cantidad}`}
    >
      <View
        style={[
          styles.iconoPequeno,
          {
            backgroundColor: colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={icono}
          size={21}
          color={colores.primario}
        />
      </View>

      <Text
        style={[
          styles.numeroTarjeta,
          {
            color: colores.texto,
            fontSize: 21 * escalaTexto,
          },
        ]}
      >
        {cantidad}
      </Text>

      <Text
        style={[
          styles.nombreTarjeta,
          {
            color: colores.textoSecundario,
            fontSize: 10 * escalaTexto,
          },
        ]}
      >
        {titulo}
      </Text>
    </View>
  );
}

type GraficaCircularProps = {
  porcentaje: number;
  color: string;
  colorFondo: string;
};

function GraficaCircular({
  porcentaje,
  color,
  colorFondo,
}: GraficaCircularProps) {
  const tamano = 82;
  const grosor = 11;
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;

  const porcentajeSeguro = Math.min(
    100,
    Math.max(0, porcentaje)
  );

  const desplazamiento =
    circunferencia -
    (porcentajeSeguro / 100) * circunferencia;

  return (
    <Svg
      width={tamano}
      height={tamano}
      accessibilityLabel={`Gráfica de asistencia de ${porcentajeSeguro} por ciento`}
    >
      <Circle
        cx={tamano / 2}
        cy={tamano / 2}
        r={radio}
        stroke={colorFondo}
        strokeWidth={grosor}
        fill="none"
      />

      <Circle
        cx={tamano / 2}
        cy={tamano / 2}
        r={radio}
        stroke={color}
        strokeWidth={grosor}
        fill="none"
        strokeDasharray={`${circunferencia} ${circunferencia}`}
        strokeDashoffset={desplazamiento}
        strokeLinecap="round"
        rotation="-90"
        origin={`${tamano / 2}, ${tamano / 2}`}
      />
    </Svg>
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

  tarjetaPrincipal: {
    minHeight: 130,
    borderWidth: 1,
    borderRadius: 15,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  tituloTarjeta: {
    fontWeight: '700',
  },

  porcentajePrincipal: {
    marginTop: 8,
    fontWeight: '800',
  },

  textoRegistros: {
    marginTop: 3,
  },

  filaTarjetas: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  tarjetaPequena: {
    flex: 1,
    minHeight: 127,
    borderWidth: 1,
    borderRadius: 13,
    padding: 10,
  },

  iconoPequeno: {
    width: 37,
    height: 37,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  numeroTarjeta: {
    marginTop: 8,
    fontWeight: '800',
  },

  nombreTarjeta: {
    marginTop: 2,
    fontWeight: '600',
  },

  tituloSeccion: {
    marginTop: 19,
    marginBottom: 9,
    fontWeight: '800',
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
    borderWidth: 1,
    borderRadius: 13,
    padding: 12,
    marginBottom: 9,
  },

  filaAlumno: {
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
    marginHorizontal: 10,
  },

  nombreAlumno: {
    fontWeight: '800',
  },

  detalleAlumno: {
    marginTop: 4,
  },

  porcentajeAlumno: {
    fontWeight: '800',
  },

  barraFondo: {
    height: 7,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 12,
  },

  barraValor: {
    height: '100%',
    borderRadius: 5,
  },
});