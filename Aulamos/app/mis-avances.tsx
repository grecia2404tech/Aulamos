import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  type Href,
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
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type EstadoActividad = {
  nombre: string;
  cantidad: number;
  color: string;
};

type ProgresoMateria = {
  id_materia: number;
  nombre: string;
  porcentaje: number;
  total_actividades: number;
  completadas: number;
};

type ResumenAvances = {
  progreso_general: number;
  total_actividades: number;
  completadas: number;
  en_progreso: number;
  pendientes: number;
};

type RespuestaAvances = {
  mensaje?: string;
  resumen?: Partial<ResumenAvances>;
  materias?: ProgresoMateria[];
};

type DatosAvances = {
  resumen: ResumenAvances;
  materias: ProgresoMateria[];
};

const DATOS_VACIOS: DatosAvances = {
  resumen: {
    progreso_general: 0,
    total_actividades: 0,
    completadas: 0,
    en_progreso: 0,
    pendientes: 0,
  },
  materias: [],
};

const COLORES_GRAFICAS = {
  completadas: '#14B8A6',
  progreso: '#2D5BFF',
  pendientes: '#A99CF3',
  verde: '#16A34A',
  amarillo: '#F59E0B',
  morado: '#8057F5',
};

export default function MisAvancesScreen() {
  const { width } = useWindowDimensions();

  const {
    preferencias,
    colores,
    escalaTexto,
    leerTexto,
    detenerLectura,
  } = useAccessibility();

  const [datos, setDatos] =
    useState<DatosAvances>(DATOS_VACIOS);

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] =
    useState(false);

  const esPantallaEstrecha = width < 360;
  const textoGrande = escalaTexto > 1.2;

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

  const cargarAvances = useCallback(
    async (mostrarCarga = true) => {
      try {
        if (mostrarCarga) {
          setCargando(true);
        }

        const token =
          await AsyncStorage.getItem('token');

        if (!token) {
          Alert.alert(
            'Sesión no encontrada',
            'Inicia sesión nuevamente.'
          );

          router.replace('/' as Href);
          return;
        }

        const respuesta = await fetch(
          `${API_URL}/alumno/avances`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const texto = await respuesta.text();

        let resultado: RespuestaAvances = {};

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
          await AsyncStorage.multiRemove([
            'token',
            'usuario',
          ]);

          Alert.alert(
            'Sesión vencida',
            'Inicia sesión nuevamente.'
          );

          router.replace('/' as Href);
          return;
        }

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje ||
              'No se pudieron cargar tus avances.'
          );
        }

        const nuevosDatos: DatosAvances = {
          resumen: {
            progreso_general: Number(
              resultado.resumen
                ?.progreso_general ?? 0
            ),
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
          },

          materias: Array.isArray(
            resultado.materias
          )
            ? resultado.materias.map(
                (materia) => ({
                  id_materia: Number(
                    materia.id_materia
                  ),
                  nombre:
                    materia.nombre ||
                    'Materia sin nombre',
                  porcentaje: Number(
                    materia.porcentaje ?? 0
                  ),
                  total_actividades: Number(
                    materia.total_actividades ??
                      0
                  ),
                  completadas: Number(
                    materia.completadas ?? 0
                  ),
                })
              )
            : [],
        };

        setDatos(nuevosDatos);

        anunciar(
          `Tus avances se actualizaron. Tienes un progreso general de ${Math.round(
            nuevosDatos.resumen
              .progreso_general
          )} por ciento. Has completado ${
            nuevosDatos.resumen.completadas
          } actividades, tienes ${
            nuevosDatos.resumen.en_progreso
          } en progreso y ${
            nuevosDatos.resumen.pendientes
          } pendientes.`
        );
      } catch (error) {
        console.error(
          'Error al obtener avances:',
          error
        );

        setDatos(DATOS_VACIOS);

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
      cargarAvances();

      return () => {
        detenerLectura();
      };
    }, [cargarAvances, detenerLectura])
  );

  const actualizar = () => {
    setActualizando(true);
    cargarAvances(false);
  };

  const estados = useMemo<EstadoActividad[]>(
    () => [
      {
        nombre: 'Completadas',
        cantidad:
          datos.resumen.completadas,
        color:
          COLORES_GRAFICAS.completadas,
      },
      {
        nombre: 'En progreso',
        cantidad:
          datos.resumen.en_progreso,
        color: COLORES_GRAFICAS.progreso,
      },
      {
        nombre: 'Pendientes',
        cantidad:
          datos.resumen.pendientes,
        color:
          COLORES_GRAFICAS.pendientes,
      },
    ],
    [datos.resumen]
  );

  const mensajeMotivacional = useMemo(() => {
    const progreso =
      datos.resumen.progreso_general;

    if (
      datos.resumen.total_actividades === 0
    ) {
      return {
        titulo: 'Comienza tu aprendizaje',
        descripcion:
          'Cuando tengas actividades asignadas, aquí aparecerá tu progreso.',
        icono:
          'rocket-outline' as const,
      };
    }

    if (progreso >= 90) {
      return {
        titulo: '¡Excelente trabajo!',
        descripcion:
          'Tu esfuerzo está dando grandes resultados. Sigue así.',
        icono: 'trophy' as const,
      };
    }

    if (progreso >= 70) {
      return {
        titulo: '¡Vas muy bien!',
        descripcion:
          'Estás avanzando correctamente. Continúa con ese esfuerzo.',
        icono:
          'ribbon-outline' as const,
      };
    }

    if (progreso >= 40) {
      return {
        titulo: '¡Sigue avanzando!',
        descripcion:
          'Cada actividad completada te acerca más a tu meta.',
        icono:
          'trending-up-outline' as const,
      };
    }

    return {
      titulo: '¡Tú puedes!',
      descripcion:
        'Comienza con tus actividades pendientes y avanza paso a paso.',
      icono:
        'sparkles-outline' as const,
    };
  }, [datos.resumen]);

  const statusBarOscuro =
    preferencias.modoOscuro ||
    preferencias.altoContraste;

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
          statusBarOscuro
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={colores.fondo}
      />

      <View
        style={[
          styles.pantalla,
          {
            backgroundColor: colores.fondo,
          },
        ]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.contenido,
            {
              paddingHorizontal:
                esPantallaEstrecha ? 14 : 20,
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={actualizando}
              onRefresh={actualizar}
              colors={[colores.primario]}
              tintColor={colores.primario}
              progressBackgroundColor={
                colores.tarjeta
              }
            />
          }
        >
          <View style={styles.encabezado}>
            <View>
              <Text
                style={[
                  styles.titulo,
                  {
                    color: colores.texto,
                    fontSize:
                      22 * escalaTexto,
                    lineHeight:
                      28 * escalaTexto,
                  },
                ]}
                accessibilityRole="header"
              >
                Mis avances
              </Text>

              <Text
                style={[
                  styles.subtituloEncabezado,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      12 * escalaTexto,
                  },
                ]}
              >
                Consulta tu progreso académico
              </Text>
            </View>

            <BotonAccesibilidad />
          </View>

          {cargando ? (
            <View style={styles.cargando}>
              <View
                style={[
                  styles.iconoCarga,
                  {
                    backgroundColor:
                      colores.fondoPrimario,
                    borderColor:
                      colores.borde,
                  },
                ]}
              >
                <Ionicons
                  name="stats-chart"
                  size={35}
                  color={colores.primario}
                />
              </View>

              <ActivityIndicator
                size="large"
                color={colores.primario}
              />

              <Text
                style={[
                  styles.textoCargando,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      14 * escalaTexto,
                  },
                ]}
              >
                Calculando tus avances...
              </Text>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.mensajeMotivacional,
                  {
                    backgroundColor:
                      colores.fondoPrimario,
                    borderColor:
                      colores.borde,
                  },
                  textoGrande &&
                    styles.mensajeGrande,
                ]}
                accessible
                accessibilityLabel={`${mensajeMotivacional.titulo}. ${mensajeMotivacional.descripcion}`}
              >
                <View
                  style={
                    styles.informacionMensaje
                  }
                >
                  <Text
                    style={[
                      styles.tituloMensaje,
                      {
                        color:
                          colores.primario,
                        fontSize:
                          16 *
                          escalaTexto,
                      },
                    ]}
                  >
                    {
                      mensajeMotivacional.titulo
                    }
                  </Text>

                  <Text
                    style={[
                      styles.descripcionMensaje,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          12 *
                          escalaTexto,
                        lineHeight:
                          18 *
                          escalaTexto,
                      },
                    ]}
                  >
                    {
                      mensajeMotivacional.descripcion
                    }
                  </Text>
                </View>

                <View
                  style={[
                    styles.cajaTrofeo,
                    {
                      backgroundColor:
                        colores.tarjeta,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      mensajeMotivacional.icono
                    }
                    size={37}
                    color="#F59E0B"
                  />
                </View>
              </View>

              <Text
                style={[
                  styles.tituloSeccion,
                  {
                    color: colores.texto,
                    fontSize:
                      15 * escalaTexto,
                  },
                ]}
                accessibilityRole="header"
              >
                Resumen general
              </Text>

              <View
                style={[
                  styles.tarjetaResumen,
                  {
                    backgroundColor:
                      colores.tarjeta,
                    borderColor:
                      colores.borde,
                  },
                  textoGrande &&
                    styles.resumenGrande,
                ]}
              >
                <GraficaCircular
                  porcentaje={
                    datos.resumen
                      .progreso_general
                  }
                  color={colores.primario}
                  colorFondo={colores.borde}
                  escalaTexto={escalaTexto}
                />

                <View style={styles.leyenda}>
                  {estados.map((estado) => (
                    <View
                      key={estado.nombre}
                      style={
                        styles.elementoLeyenda
                      }
                      accessible
                      accessibilityLabel={`${estado.nombre}: ${estado.cantidad}`}
                    >
                      <View
                        style={[
                          styles.puntoLeyenda,
                          {
                            backgroundColor:
                              estado.color,
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.nombreEstado,
                          {
                            color:
                              colores.textoSecundario,
                            fontSize:
                              12 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {estado.nombre}
                      </Text>

                      <Text
                        style={[
                          styles.cantidadEstado,
                          {
                            color:
                              colores.texto,
                            fontSize:
                              13 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {estado.cantidad}
                      </Text>
                    </View>
                  ))}

                  <View
                    style={[
                      styles.divisor,
                      {
                        backgroundColor:
                          colores.borde,
                      },
                    ]}
                  />

                  <View
                    style={
                      styles.totalActividades
                    }
                  >
                    <Text
                      style={[
                        styles.textoTotal,
                        {
                          color:
                            colores.textoSecundario,
                          fontSize:
                            11 *
                            escalaTexto,
                        },
                      ]}
                    >
                      Total de actividades
                    </Text>

                    <Text
                      style={[
                        styles.numeroTotal,
                        {
                          color:
                            colores.primario,
                          fontSize:
                            18 *
                            escalaTexto,
                        },
                      ]}
                    >
                      {
                        datos.resumen
                          .total_actividades
                      }
                    </Text>
                  </View>
                </View>
              </View>

              <Text
                style={[
                  styles.tituloSeccion,
                  {
                    color: colores.texto,
                    fontSize:
                      15 * escalaTexto,
                  },
                ]}
                accessibilityRole="header"
              >
                Progreso por materia
              </Text>

              {datos.materias.length === 0 ? (
                <View
                  style={[
                    styles.estadoVacio,
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
                      styles.iconoVacio,
                      {
                        backgroundColor:
                          colores.fondoPrimario,
                      },
                    ]}
                  >
                    <Ionicons
                      name="school-outline"
                      size={36}
                      color={
                        colores.textoSecundario
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.tituloVacio,
                      {
                        color: colores.texto,
                        fontSize:
                          15 *
                          escalaTexto,
                      },
                    ]}
                  >
                    Aún no hay avances
                  </Text>

                  <Text
                    style={[
                      styles.descripcionVacio,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          12 *
                          escalaTexto,
                        lineHeight:
                          18 *
                          escalaTexto,
                      },
                    ]}
                  >
                    Tus materias y avances
                    aparecerán cuando tengas
                    actividades asignadas.
                  </Text>
                </View>
              ) : (
                <View style={styles.listaMaterias}>
                  {datos.materias.map(
                    (materia, index) => (
                      <BarraMateria
                        key={
                          materia.id_materia
                        }
                        materia={materia}
                        indice={index}
                        colores={colores}
                        escalaTexto={
                          escalaTexto
                        }
                      />
                    )
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>

        <BarraNavegacion
          colores={colores}
          escalaTexto={escalaTexto}
        />
      </View>
    </SafeAreaView>
  );
}

type GraficaCircularProps = {
  porcentaje: number;
  color: string;
  colorFondo: string;
  escalaTexto: number;
};

function GraficaCircular({
  porcentaje,
  color,
  colorFondo,
  escalaTexto,
}: GraficaCircularProps) {
  const tamano = 142;
  const grosor = 17;
  const radio = (tamano - grosor) / 2;
  const circunferencia =
    2 * Math.PI * radio;

  const progresoLimitado = Math.min(
    Math.max(
      Number.isFinite(porcentaje)
        ? porcentaje
        : 0,
      0
    ),
    100
  );

  const desplazamiento =
    circunferencia -
    (progresoLimitado / 100) *
      circunferencia;

  return (
    <View
      style={[
        styles.contenedorGrafica,
        {
          width: tamano,
          height: tamano,
        },
      ]}
      accessible
      accessibilityLabel={`Progreso general de ${Math.round(
        progresoLimitado
      )} por ciento`}
    >
      <Svg
        width={tamano}
        height={tamano}
        viewBox={`0 0 ${tamano} ${tamano}`}
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
          strokeLinecap="round"
          strokeDasharray={`${circunferencia} ${circunferencia}`}
          strokeDashoffset={desplazamiento}
          rotation="-90"
          origin={`${tamano / 2}, ${tamano / 2}`}
        />
      </Svg>

      <View style={styles.centroGrafica}>
        <Text
          style={[
            styles.porcentajeGrafica,
            {
              color: color,
              fontSize:
                Math.min(
                  25 * escalaTexto,
                  35
                ),
            },
          ]}
        >
          {Math.round(progresoLimitado)}%
        </Text>

        <Text
          style={[
            styles.textoProgreso,
            {
              fontSize:
                Math.min(
                  10 * escalaTexto,
                  14
                ),
            },
          ]}
        >
          completado
        </Text>
      </View>
    </View>
  );
}

type ColoresAccesibilidad = {
  fondo: string;
  tarjeta: string;
  texto: string;
  textoSecundario: string;
  borde: string;
  primario: string;
  fondoPrimario: string;
};

type BarraMateriaProps = {
  materia: ProgresoMateria;
  indice: number;
  colores: ColoresAccesibilidad;
  escalaTexto: number;
};

function BarraMateria({
  materia,
  indice,
  colores,
  escalaTexto,
}: BarraMateriaProps) {
  const porcentaje = Math.min(
    Math.max(materia.porcentaje, 0),
    100
  );

  const coloresBarras = [
    colores.primario,
    COLORES_GRAFICAS.verde,
    COLORES_GRAFICAS.amarillo,
    COLORES_GRAFICAS.morado,
    COLORES_GRAFICAS.completadas,
  ];

  const colorBarra =
    coloresBarras[
      indice % coloresBarras.length
    ];

  return (
    <View
      style={[
        styles.tarjetaMateria,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${materia.nombre}. Progreso de ${Math.round(
        porcentaje
      )} por ciento. ${
        materia.completadas
      } de ${
        materia.total_actividades
      } actividades completadas.`}
    >
      <View style={styles.encabezadoMateria}>
        <View
          style={[
            styles.iconoMateria,
            {
              backgroundColor:
                colores.fondoPrimario,
            },
          ]}
        >
          <Ionicons
            name="book-outline"
            size={21}
            color={colorBarra}
          />
        </View>

        <View style={styles.datosMateria}>
          <Text
            style={[
              styles.nombreMateria,
              {
                color: colores.texto,
                fontSize:
                  13 * escalaTexto,
              },
            ]}
            numberOfLines={2}
          >
            {materia.nombre}
          </Text>

          <Text
            style={[
              styles.detalleMateria,
              {
                color:
                  colores.textoSecundario,
                fontSize:
                  10 * escalaTexto,
              },
            ]}
          >
            {materia.completadas} de{' '}
            {materia.total_actividades}{' '}
            actividades completadas
          </Text>
        </View>

        <View
          style={[
            styles.insigniaPorcentaje,
            {
              backgroundColor:
                colores.fondoPrimario,
            },
          ]}
        >
          <Text
            style={[
              styles.porcentajeMateria,
              {
                color: colorBarra,
                fontSize:
                  12 * escalaTexto,
              },
            ]}
          >
            {Math.round(porcentaje)}%
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.fondoBarra,
          {
            backgroundColor:
              colores.borde,
          },
        ]}
      >
        <View
          style={[
            styles.progresoBarra,
            {
              width: `${porcentaje}%`,
              backgroundColor: colorBarra,
            },
          ]}
        />
      </View>
    </View>
  );
}

type SeccionAlumno =
  | 'inicio'
  | 'actividades'
  | 'biblioteca'
  | 'avances'
  | 'chatbot';

type OpcionNavegacion = {
  id: SeccionAlumno;
  titulo: string;
  icono: keyof typeof Ionicons.glyphMap;
  ruta: Href;
};

const OPCIONES_NAVEGACION: OpcionNavegacion[] = [
  {
    id: 'inicio',
    titulo: 'Inicio',
    icono: 'home-outline',
    ruta: '/inicio-alumno',
  },
  {
    id: 'actividades',
    titulo: 'Actividades',
    icono: 'document-text-outline',
    ruta: '/mis-actividades-alumno',
  },
  {
    id: 'biblioteca',
    titulo: 'Biblioteca',
    icono: 'book-outline',

    /*
     * Actualmente tu proyecto tiene este
     * nombre escrito como "bibloteca".
     * Cámbialo cuando renombres el archivo.
     */
    ruta: '/bibloteca-alumno',
  },
  {
    id: 'avances',
    titulo: 'Mis avances',
    icono: 'stats-chart',
    ruta: '/mis-avances',
  },
  {
    id: 'chatbot',
    titulo: 'Chatbot',
    icono: 'chatbubble-ellipses-outline',
    ruta: '/chatbot',
  },
];

type BarraNavegacionProps = {
  colores: ColoresAccesibilidad;
  escalaTexto: number;
};

function BarraNavegacion({
  colores,
  escalaTexto,
}: BarraNavegacionProps) {
  return (
    <View
      style={[
        styles.barraNavegacion,
        {
          backgroundColor: colores.tarjeta,
          borderTopColor: colores.borde,
        },
      ]}
      accessibilityRole="tablist"
    >
      {OPCIONES_NAVEGACION.map((opcion) => {
        const seleccionada =
          opcion.id === 'avances';

        const color = seleccionada
          ? colores.primario
          : colores.textoSecundario;

        return (
          <Pressable
            key={opcion.id}
            onPress={() =>
              router.replace(opcion.ruta)
            }
            accessibilityRole="tab"
            accessibilityLabel={opcion.titulo}
            accessibilityState={{
              selected: seleccionada,
            }}
            style={({ pressed }) => [
              styles.opcionNavegacion,
              pressed && {
                opacity: 0.65,
              },
            ]}
          >
            <View
              style={[
                styles.contenedorIconoNavegacion,
                seleccionada && {
                  backgroundColor:
                    colores.fondoPrimario,
                },
              ]}
            >
              <Ionicons
                name={opcion.icono}
                size={22}
                color={color}
              />
            </View>

            <Text
              style={[
                styles.textoNavegacion,
                {
                  color,
                  fontSize:
                    Math.min(
                      9 * escalaTexto,
                      12
                    ),
                  fontWeight: seleccionada
                    ? '800'
                    : '600',
                },
              ]}
              numberOfLines={2}
            >
              {opcion.titulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  pantalla: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  contenido: {
    paddingTop: 14,
    paddingBottom: 32,
  },

  encabezado: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  titulo: {
    fontWeight: '900',
  },

  subtituloEncabezado: {
    marginTop: 3,
  },

  cargando: {
    minHeight: 480,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconoCarga: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  textoCargando: {
    marginTop: 13,
  },

  mensajeMotivacional: {
    minHeight: 105,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 17,
    paddingVertical: 16,
    marginBottom: 23,
    flexDirection: 'row',
    alignItems: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#5B21B6',
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },

      android: {
        elevation: 2,
      },
    }),
  },

  mensajeGrande: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  informacionMensaje: {
    flex: 1,
    paddingRight: 12,
  },

  tituloMensaje: {
    fontWeight: '900',
    marginBottom: 5,
  },

  descripcionMensaje: {
    fontWeight: '500',
  },

  cajaTrofeo: {
    width: 62,
    height: 62,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tituloSeccion: {
    fontWeight: '900',
    marginBottom: 10,
  },

  tarjetaResumen: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#111827',
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },

      android: {
        elevation: 2,
      },
    }),
  },

  resumenGrande: {
    flexDirection: 'column',
  },

  contenedorGrafica: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  centroGrafica: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  porcentajeGrafica: {
    fontWeight: '900',
  },

  textoProgreso: {
    color: '#667085',
    marginTop: 1,
    fontWeight: '600',
  },

  leyenda: {
    flex: 1,
    marginLeft: 20,
  },

  elementoLeyenda: {
    minHeight: 35,
    flexDirection: 'row',
    alignItems: 'center',
  },

  puntoLeyenda: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },

  nombreEstado: {
    flex: 1,
    fontWeight: '600',
  },

  cantidadEstado: {
    minWidth: 25,
    textAlign: 'right',
    fontWeight: '900',
  },

  divisor: {
    height: 1,
    marginVertical: 8,
  },

  totalActividades: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  textoTotal: {
    flex: 1,
    fontWeight: '600',
  },

  numeroTotal: {
    fontWeight: '900',
  },

  listaMaterias: {
    marginBottom: 5,
  },

  tarjetaMateria: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
    marginBottom: 10,

    ...Platform.select({
      android: {
        elevation: 1,
      },
    }),
  },

  encabezadoMateria: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },

  iconoMateria: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  datosMateria: {
    flex: 1,
    marginHorizontal: 11,
  },

  nombreMateria: {
    fontWeight: '800',
  },

  detalleMateria: {
    marginTop: 4,
  },

  insigniaPorcentaje: {
    minWidth: 48,
    minHeight: 31,
    borderRadius: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  porcentajeMateria: {
    fontWeight: '900',
  },

  fondoBarra: {
    width: '100%',
    height: 9,
    borderRadius: 6,
    overflow: 'hidden',
  },

  progresoBarra: {
    height: '100%',
    borderRadius: 6,
  },

  estadoVacio: {
    minHeight: 210,
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconoVacio: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tituloVacio: {
    marginTop: 14,
    fontWeight: '900',
  },

  descripcionVacio: {
    marginTop: 6,
    textAlign: 'center',
  },

  barraNavegacion: {
    minHeight: 70,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: 5,
    paddingHorizontal: 3,

    ...Platform.select({
      android: {
        elevation: 9,
      },
    }),
  },

  opcionNavegacion: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },

  contenedorIconoNavegacion: {
    width: 38,
    height: 29,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoNavegacion: {
    marginTop: 3,
    textAlign: 'center',
  },
});