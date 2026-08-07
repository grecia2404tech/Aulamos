import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
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
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL, api } from '../services/api';

type FiltroActividad =
  | 'Todas'
  | 'Pendientes'
  | 'Entregadas';

type TipoActividad =
  | 'Tarea'
  | 'Ejercicio'
  | 'Lectura'
  | 'Proyecto'
  | 'Evaluacion';

type TipoRecurso =
  | 'PDF'
  | 'Video'
  | 'Enlace'
  | 'Documento'
  | 'Audio'
  | 'Otro';

type ActividadAlumno = {
  id_actividad: number;
  id_curso: number;
  id_periodo: number | null;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  tipo: TipoActividad;
  fecha_publicacion: string;
  fecha_limite: string;
  puntaje_maximo: number | string;
  permite_entrega_archivo: boolean | number;
  estado_actividad: string;
  estado_alumno: string;
  nombre_curso: string;
  materia: string;
  grupo: string;
  periodo: string | null;
  vencida: boolean | number;

  id_recurso: number | null;
  recurso_titulo: string | null;
  recurso_descripcion: string | null;
  recurso_tipo: TipoRecurso | null;
  recurso_url: string | null;
};

type ResumenActividades = {
  total: number;
  pendientes: number;
  entregadas: number;
  vencidas: number;
};

type RespuestaMisActividades = {
  actividades?: ActividadAlumno[];
  resumen?: ResumenActividades;
  mensaje?: string;
};

type RespuestaError = {
  mensaje?: string;
  error?: string;
};

type IoniconName =
  keyof typeof Ionicons.glyphMap;

const ESTADOS_TERMINADOS = [
  'Entregada',
  'Calificada',
  'Completada',
];

const RESUMEN_VACIO: ResumenActividades = {
  total: 0,
  pendientes: 0,
  entregadas: 0,
  vencidas: 0,
};

const normalizarFecha = (
  fecha: string
) => {
  if (!fecha) {
    return null;
  }

  const resultado = new Date(
    fecha.includes('T')
      ? fecha
      : fecha.replace(' ', 'T')
  );

  return Number.isNaN(
    resultado.getTime()
  )
    ? null
    : resultado;
};

const mostrarFecha = (
  fecha: string
) => {
  const fechaConvertida =
    normalizarFecha(fecha);

  if (!fechaConvertida) {
    return 'Fecha no disponible';
  }

  return fechaConvertida.toLocaleString(
    'es-MX',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
};

const obtenerMensajeError = (
  error: unknown
) => {
  if (
    axios.isAxiosError<RespuestaError>(
      error
    )
  ) {
    if (
      error.response?.data?.mensaje
    ) {
      return error.response.data.mensaje;
    }

    if (
      error.response?.data?.error
    ) {
      return error.response.data.error;
    }

    if (!error.response) {
      return (
        'No se pudo conectar con el servidor. ' +
        'Verifica que el backend esté encendido y que ' +
        'el celular y la computadora estén en la misma red Wi-Fi.'
      );
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'No se pudieron cargar tus actividades.';
};

const esActividadTerminada = (
  actividad: ActividadAlumno
) =>
  ESTADOS_TERMINADOS.includes(
    actividad.estado_alumno
  );

const esActividadVencida = (
  actividad: ActividadAlumno
) =>
  Number(
    actividad.vencida
  ) === 1;

const construirUrlPublica = (
  direccion: string
) => {
  const ruta =
    direccion.trim();

  if (
    /^https?:\/\//i.test(
      ruta
    )
  ) {
    return ruta;
  }

  const servidor =
    API_URL.replace(
      /\/api\/?$/,
      ''
    );

  return `${servidor}${
    ruta.startsWith('/')
      ? ruta
      : `/${ruta}`
  }`;
};

const obtenerIconoRecurso = (
  tipo: TipoRecurso | null
): IoniconName => {
  switch (
    tipo
      ?.toLowerCase()
  ) {
    case 'video':
      return 'videocam-outline';

    case 'pdf':
      return 'document-text-outline';

    case 'documento':
      return 'document-outline';

    case 'enlace':
      return 'link-outline';

    case 'audio':
      return 'musical-notes-outline';

    default:
      return 'folder-open-outline';
  }
};

const abrirRecursoAdjunto =
  async (
    actividad: ActividadAlumno
  ) => {
    const idRecurso =
      Number(
        actividad.id_recurso
      );

    if (
      !Number.isInteger(
        idRecurso
      ) ||
      idRecurso <= 0
    ) {
      Alert.alert(
        'Recurso no disponible',
        'Esta actividad no tiene un recurso adjunto.'
      );

      return;
    }

    const tipo =
      actividad.recurso_tipo
        ?.trim()
        .toLowerCase() ||
      '';

    if (
      tipo === 'video'
    ) {
      router.push({
        pathname:
          '/reproductor-video',

        params: {
          idRecurso:
            String(
              idRecurso
            ),
        },
      } as never);

      return;
    }

    const direccion =
      actividad.recurso_url?.trim();

    if (!direccion) {
      Alert.alert(
        'Recurso no disponible',
        'El recurso no tiene un archivo o enlace disponible.'
      );

      return;
    }

    const urlPublica =
      construirUrlPublica(
        direccion
      );

    const extension =
      direccion
        .split('?')[0]
        .split('#')[0]
        .split('.')
        .pop()
        ?.toLowerCase();

    const esDocumento =
      tipo === 'pdf' ||
      tipo ===
        'documento' ||
      [
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'txt',
      ].includes(
        extension || ''
      );

    if (
      esDocumento
    ) {
      const nombreDesdeUrl =
        decodeURIComponent(
          direccion
            .split('?')[0]
            .split('#')[0]
            .split('/')
            .pop() ||
            'Documento'
        );

      router.push({
        pathname:
          '/visor-documento',

        params: {
          url_archivo:
            urlPublica,

          nombre_archivo:
            nombreDesdeUrl,

          titulo:
            actividad.recurso_titulo ||
            'Recurso de la actividad',
        },
      } as never);

      return;
    }

    try {
      const puedeAbrirse =
        await Linking.canOpenURL(
          urlPublica
        );

      if (!puedeAbrirse) {
        throw new Error(
          'Este dispositivo no puede abrir el recurso.'
        );
      }

      await Linking.openURL(
        urlPublica
      );
    } catch (error) {
      Alert.alert(
        'No se pudo abrir el recurso',
        error instanceof Error
          ? error.message
          : 'Intenta nuevamente.'
      );
    }
  };

const obtenerPresentacionTipo = (
  tipo: TipoActividad
): {
  icono: IoniconName;
  fondo: string;
  color: string;
  etiqueta: string;
} => {
  switch (tipo) {
    case 'Ejercicio':
      return {
        icono: 'create',
        fondo: '#DDF8F4',
        color: '#20A99D',
        etiqueta:
          'Ejercicio',
      };

    case 'Lectura':
      return {
        icono: 'book',
        fondo: '#FFF3D7',
        color: '#E89B00',
        etiqueta:
          'Lectura',
      };

    case 'Proyecto':
      return {
        icono:
          'folder-open',
        fondo: '#ECE8FF',
        color: '#7059F5',
        etiqueta:
          'Proyecto',
      };

    case 'Evaluacion':
      return {
        icono:
          'document-text',
        fondo: '#FFE5E8',
        color: '#E54859',
        etiqueta:
          'Evaluación',
      };

    default:
      return {
        icono:
          'clipboard',
        fondo: '#EAF1FF',
        color: '#4A7CFF',
        etiqueta:
          'Tarea',
      };
  }
};

export default function MisActividadesAlumnoScreen() {
  const { width } =
    useWindowDimensions();

  const insets =
    useSafeAreaInsets();

  const {
    colores,
    escalaTexto,
    preferencias,
    leerTexto,
  } = useAccessibility();

  const [
    actividades,
    setActividades,
  ] =
    useState<
      ActividadAlumno[]
    >([]);

  const [
    resumen,
    setResumen,
  ] =
    useState<ResumenActividades>(
      RESUMEN_VACIO
    );

  const [
    filtro,
    setFiltro,
  ] =
    useState<FiltroActividad>(
      'Todas'
    );

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    actualizando,
    setActualizando,
  ] = useState(false);

  const temaOscuro =
    preferencias.modoOscuro ||
    preferencias.altoContraste;

  const margenHorizontal =
    width < 360
      ? 14
      : width < 400
        ? 18
        : 22;

  const anchoContenido =
    Math.min(
      width -
        margenHorizontal *
          2,
      520
    );

  const anunciar =
    useCallback(
      (mensaje: string) => {
        if (
          preferencias.lectorPantalla
        ) {
          leerTexto(
            mensaje
          );
        }
      },
      [
        preferencias.lectorPantalla,
        leerTexto,
      ]
    );

  const cargarActividades =
    useCallback(
      async (
        esActualizacion =
          false
      ) => {
        try {
          if (
            esActualizacion
          ) {
            setActualizando(
              true
            );
          } else {
            setCargando(
              true
            );
          }

          const token =
            await AsyncStorage.getItem(
              'token'
            );

          if (!token) {
            throw new Error(
              'No se encontró tu sesión. Inicia sesión nuevamente.'
            );
          }

          const respuesta =
            await api.get<RespuestaMisActividades>(
              '/academico/actividades/mis-actividades-alumno',
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          const lista =
            respuesta.data
              .actividades ??
            [];

          const resumenNuevo =
            respuesta.data
              .resumen ??
            RESUMEN_VACIO;

          setActividades(
            lista
          );

          setResumen(
            resumenNuevo
          );

          if (
            esActualizacion
          ) {
            anunciar(
              `Actividades actualizadas. Tienes ${resumenNuevo.pendientes} pendientes y ${resumenNuevo.entregadas} entregadas.`
            );
          }
        } catch (error) {
          Alert.alert(
            'No se pudieron cargar las actividades',
            obtenerMensajeError(
              error
            )
          );
        } finally {
          setCargando(
            false
          );

          setActualizando(
            false
          );
        }
      },
      [anunciar]
    );

  useEffect(() => {
    void cargarActividades();
  }, [
    cargarActividades,
  ]);

  const actividadesFiltradas =
    useMemo(() => {
      if (
        filtro ===
        'Pendientes'
      ) {
        return actividades.filter(
          (actividad) =>
            !esActividadTerminada(
              actividad
            )
        );
      }

      if (
        filtro ===
        'Entregadas'
      ) {
        return actividades.filter(
          esActividadTerminada
        );
      }

      return actividades;
    }, [
      actividades,
      filtro,
    ]);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor:
            colores.fondo,
        },
      ]}
    >
      <ScrollView
        style={
          styles.scroll
        }
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop:
              insets.top + 8,

            paddingBottom:
              104 +
              Math.max(
                insets.bottom,
                8
              ),
          },
        ]}
        showsVerticalScrollIndicator
        refreshControl={
          <RefreshControl
            refreshing={
              actualizando
            }
            onRefresh={() =>
              void cargarActividades(
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
      >
        <View
          style={[
            styles.contentContainer,
            {
              width:
                anchoContenido,
            },
          ]}
        >
          {/* ENCABEZADO */}
          <View
            style={
              styles.header
            }
          >
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
              activeOpacity={
                0.7
              }
              accessibilityRole="button"
              accessibilityLabel="Regresar"
            >
              <Ionicons
                name="arrow-back"
                size={23}
                color={
                  colores.texto
                }
              />
            </TouchableOpacity>

            <View
              style={
                styles.headerText
              }
            >
              <Text
                style={[
                  styles.title,
                  {
                    color:
                      colores.texto,

                    fontSize:
                      21 *
                      escalaTexto,
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
                    color:
                      colores.textoSecundario,

                    fontSize:
                      12 *
                      escalaTexto,
                  },
                ]}
              >
                Consulta tus
                trabajos asignados
              </Text>
            </View>

            <BotonAccesibilidad />
          </View>

          {/* RESUMEN */}
          <View
            style={
              styles.summaryRow
            }
          >
            <SummaryCard
              label="Pendientes"
              value={
                resumen.pendientes
              }
              icon="time-outline"
              colorNormal="#4A7CFF"
              backgroundNormal="#EAF1FF"
            />

            <SummaryCard
              label="Entregadas"
              value={
                resumen.entregadas
              }
              icon="checkmark-circle-outline"
              colorNormal="#20A99D"
              backgroundNormal="#DDF8F4"
            />

            <SummaryCard
              label="Vencidas"
              value={
                resumen.vencidas
              }
              icon="alert-circle-outline"
              colorNormal="#E54859"
              backgroundNormal="#FFE5E8"
            />
          </View>

          {/* FILTROS */}
          <View
            style={[
              styles.filterRow,
              {
                backgroundColor:
                  colores.fondoPrimario,

                borderColor:
                  colores.borde,
              },
            ]}
          >
            {(
              [
                'Todas',
                'Pendientes',
                'Entregadas',
              ] as FiltroActividad[]
            ).map(
              (opcion) => {
                const seleccionado =
                  filtro ===
                  opcion;

                return (
                  <TouchableOpacity
                    key={
                      opcion
                    }
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor:
                          seleccionado
                            ? colores.tarjeta
                            : colores.fondoPrimario,

                        borderColor:
                          seleccionado
                            ? colores.primario
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setFiltro(
                        opcion
                      );

                      anunciar(
                        `Filtro ${opcion} seleccionado.`
                      );
                    }}
                    activeOpacity={
                      0.8
                    }
                    accessibilityRole="tab"
                    accessibilityLabel={
                      opcion
                    }
                    accessibilityState={{
                      selected:
                        seleccionado,
                    }}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        {
                          color:
                            seleccionado
                              ? colores.primario
                              : colores.textoSecundario,

                          fontSize:
                            12 *
                            escalaTexto,

                          fontWeight:
                            seleccionado
                              ? '800'
                              : '600',
                        },
                      ]}
                    >
                      {opcion}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          {cargando ? (
            <View
              style={
                styles.loadingContainer
              }
            >
              <ActivityIndicator
                size="large"
                color={
                  colores.primario
                }
              />

              <Text
                style={[
                  styles.loadingText,
                  {
                    color:
                      colores.textoSecundario,

                    fontSize:
                      13 *
                      escalaTexto,
                  },
                ]}
              >
                Cargando tus
                actividades...
              </Text>
            </View>
          ) : actividadesFiltradas.length ===
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
              <View
                style={[
                  styles.emptyIconBox,
                  {
                    backgroundColor:
                      colores.fondoPrimario,

                    borderColor:
                      colores.borde,
                  },
                ]}
              >
                <Ionicons
                  name="clipboard-outline"
                  size={34}
                  color={
                    colores.primario
                  }
                />
              </View>

              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color:
                      colores.texto,

                    fontSize:
                      17 *
                      escalaTexto,
                  },
                ]}
              >
                No hay actividades
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      colores.textoSecundario,

                    fontSize:
                      12 *
                      escalaTexto,
                  },
                ]}
              >
                {filtro ===
                'Todas'
                  ? 'Cuando un docente publique una actividad aparecerá aquí.'
                  : `No tienes actividades ${filtro.toLowerCase()}.`}
              </Text>
            </View>
          ) : (
            actividadesFiltradas.map(
              (
                actividad
              ) => (
                <ActividadCard
                  key={
                    actividad.id_actividad
                  }
                  actividad={
                    actividad
                  }
                />
              )
            )
          )}
        </View>
      </ScrollView>

      {/* NAVEGACIÓN INFERIOR */}
      <View
        style={[
          styles.bottomNavigation,
          {
            height:
              66 +
              Math.max(
                insets.bottom,
                5
              ),

            paddingBottom:
              Math.max(
                insets.bottom,
                5
              ),

            backgroundColor:
              colores.tarjeta,

            borderTopColor:
              colores.borde,
          },
        ]}
      >
        <View
          style={[
            styles.bottomContent,
            {
              width:
                anchoContenido,
            },
          ]}
        >
          <BottomItem
            icon="home-outline"
            activeIcon="home"
            label="Inicio"
            onPress={() =>
              router.replace(
                '/inicio-alumno' as never
              )
            }
          />

          <BottomItem
            icon="reader-outline"
            activeIcon="reader"
            label="Actividades"
            active
            onPress={() => {
              // Ya está en Mis actividades.
            }}
          />

          <BottomItem
            icon="book-outline"
            activeIcon="book"
            label="Biblioteca"
            onPress={() =>
              router.push(
                '/bibloteca-alumno' as never
              )
            }
          />

          <BottomItem
            icon="stats-chart-outline"
            activeIcon="stats-chart"
            label="Avances"
            onPress={() =>
              router.push(
                '/mis-avances' as never
              )
            }
          />

          <BottomItem
            icon="help-circle-outline"
            activeIcon="help-circle"
            label="Chatbot"
            onPress={() =>
              router.push(
                '/chatbot' as never
              )
            }
          />
        </View>
      </View>
    </View>
  );
}

/* =====================================================
   TARJETA RESUMEN
===================================================== */

type SummaryCardProps = {
  label: string;
  value: number;
  icon: IoniconName;
  colorNormal: string;
  backgroundNormal: string;
};

function SummaryCard({
  label,
  value,
  icon,
  colorNormal,
  backgroundNormal,
}: SummaryCardProps) {
  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const color =
    preferencias.altoContraste
      ? colores.primario
      : colorNormal;

  const background =
    preferencias.altoContraste
      ? colores.fondoPrimario
      : backgroundNormal;

  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor:
            colores.tarjeta,

          borderColor:
            colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor:
              background,

            borderColor:
              preferencias.altoContraste
                ? colores.borde
                : 'transparent',
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={color}
        />
      </View>

      <Text
        style={[
          styles.summaryValue,
          {
            color:
              colores.texto,

            fontSize:
              18 *
              escalaTexto,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.summaryLabel,
          {
            color:
              colores.textoSecundario,

            fontSize:
              10 *
              escalaTexto,
          },
        ]}
        numberOfLines={
          1
        }
      >
        {label}
      </Text>
    </View>
  );
}

/* =====================================================
   TARJETA DE ACTIVIDAD
===================================================== */

function ActividadCard({
  actividad,
}: {
  actividad: ActividadAlumno;
}) {
  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const presentacion =
    obtenerPresentacionTipo(
      actividad.tipo
    );

  const terminada =
    esActividadTerminada(
      actividad
    );

  const vencida =
    esActividadVencida(
      actividad
    );

  const altoContrasteBlanco =
    preferencias.altoContraste &&
    preferencias.colorContraste ===
      'Blanco';

  const colorSobrePrimario =
    altoContrasteBlanco
      ? '#000000'
      : '#FFFFFF';

  const estadoTexto =
    vencida
      ? 'Vencida'
      : terminada
        ? actividad.estado_alumno
        : actividad.estado_alumno ||
          'Pendiente';

  const colorEstado =
    preferencias.altoContraste
      ? colores.primario
      : vencida
        ? '#E54859'
        : terminada
          ? '#20A99D'
          : '#4A7CFF';

  const fondoEstado =
    preferencias.altoContraste
      ? colores.fondoPrimario
      : vencida
        ? '#FFE5E8'
        : terminada
          ? '#DDF8F4'
          : '#EAF1FF';

  const colorTipo =
    preferencias.altoContraste
      ? colores.primario
      : presentacion.color;

  const fondoTipo =
    preferencias.altoContraste
      ? colores.fondoPrimario
      : presentacion.fondo;

  const abrirActividad =
    () => {
      if (
        actividad.tipo ===
        'Evaluacion'
      ) {
        router.push({
          pathname:
            '/responder-evaluacion',

          params: {
            id_evaluacion:
              String(
                actividad.id_actividad
              ),
          },
        } as never);

        return;
      }

      router.push({
        pathname:
          '/detalle-actividad',

        params: {
          id_actividad:
            String(
              actividad.id_actividad
            ),
        },
      } as never);
    };

  return (
    <TouchableOpacity
      style={[
        styles.activityCard,
        {
          backgroundColor:
            colores.tarjeta,

          borderColor:
            colores.borde,
        },
      ]}
      onPress={
        abrirActividad
      }
      activeOpacity={
        0.78
      }
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${
        actividad.tipo ===
        'Evaluacion'
          ? 'evaluación'
          : 'actividad'
      } ${actividad.titulo}`}
      accessibilityHint={
        actividad.tipo ===
        'Evaluacion'
          ? 'Abre las preguntas de la evaluación'
          : 'Muestra el detalle de la actividad'
      }
    >
      <View
        style={
          styles.activityCardHeader
        }
      >
        <View
          style={[
            styles.activityIconBox,
            {
              backgroundColor:
                fondoTipo,

              borderColor:
                preferencias.altoContraste
                  ? colores.borde
                  : 'transparent',
            },
          ]}
        >
          <Ionicons
            name={
              presentacion.icono
            }
            size={22}
            color={
              colorTipo
            }
          />
        </View>

        <View
          style={
            styles.activityHeaderText
          }
        >
          <Text
            style={[
              styles.subjectText,
              {
                color:
                  colores.texto,

                fontSize:
                  12 *
                  escalaTexto,
              },
            ]}
            numberOfLines={
              1
            }
          >
            {
              actividad.materia
            }
            {' · '}
            {
              actividad.grupo
            }
          </Text>

          <Text
            style={[
              styles.typeText,
              {
                color:
                  preferencias.altoContraste
                    ? colores.primario
                    : colores.textoSecundario,

                fontSize:
                  10 *
                  escalaTexto,
              },
            ]}
          >
            {
              presentacion.etiqueta
            }
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
          <Text
            style={[
              styles.statusText,
              {
                color:
                  colorEstado,

                fontSize:
                  9 *
                  escalaTexto,
              },
            ]}
          >
            {estadoTexto}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.activityTitle,
          {
            color:
              colores.texto,

            fontSize:
              16 *
              escalaTexto,
          },
        ]}
      >
        {actividad.titulo}
      </Text>

      {!!actividad.descripcion && (
        <Text
          style={[
            styles.activityDescription,
            {
              color:
                colores.textoSecundario,

              fontSize:
                12 *
                escalaTexto,
            },
          ]}
          numberOfLines={
            2
          }
        >
          {
            actividad.descripcion
          }
        </Text>
      )}

      <View
        style={[
          styles.activityDivider,
          {
            backgroundColor:
              colores.borde,
          },
        ]}
      />

      <View
        style={
          styles.activityInfoRow
        }
      >
        <View
          style={
            styles.activityInfoItem
          }
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={
              preferencias.altoContraste
                ? colores.primario
                : vencida
                  ? '#E54859'
                  : colores.textoSecundario
            }
          />

          <Text
            style={[
              styles.activityInfoText,
              {
                color:
                  preferencias.altoContraste
                    ? colores.texto
                    : vencida
                      ? '#E54859'
                      : colores.textoSecundario,

                fontSize:
                  10 *
                  escalaTexto,
              },
            ]}
          >
            {mostrarFecha(
              actividad.fecha_limite
            )}
          </Text>
        </View>

        <View
          style={
            styles.activityInfoItem
          }
        >
          <Ionicons
            name="star-outline"
            size={16}
            color={
              preferencias.altoContraste
                ? colores.primario
                : colores.textoSecundario
            }
          />

          <Text
            style={[
              styles.activityInfoText,
              {
                color:
                  colores.textoSecundario,

                fontSize:
                  10 *
                  escalaTexto,
              },
            ]}
          >
            {Number(
              actividad.puntaje_maximo
            )}{' '}
            pts
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.courseText,
          {
            color:
              colores.textoSecundario,

            fontSize:
              10 *
              escalaTexto,
          },
        ]}
        numberOfLines={
          1
        }
      >
        {
          actividad.nombre_curso
        }

        {actividad.periodo
          ? ` · ${actividad.periodo}`
          : ''}
      </Text>

      {/* RECURSO ADJUNTO */}
      {!!actividad.id_recurso && (
        <View
          style={[
            styles.resourceContainer,
            {
              backgroundColor:
                colores.fondoPrimario,

              borderColor:
                colores.borde,
            },
          ]}
        >
          <View
            style={
              styles.resourceInformation
            }
          >
            <View
              style={[
                styles.resourceIconBox,
                {
                  backgroundColor:
                    colores.tarjeta,

                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <Ionicons
                name={obtenerIconoRecurso(
                  actividad.recurso_tipo
                )}
                size={20}
                color={
                  colores.primario
                }
              />
            </View>

            <View
              style={
                styles.resourceTextContainer
              }
            >
              <Text
                style={[
                  styles.resourceLabel,
                  {
                    color:
                      colores.primario,

                    fontSize:
                      10 *
                      escalaTexto,
                  },
                ]}
              >
                Recurso adjunto
              </Text>

              <Text
                style={[
                  styles.resourceTitle,
                  {
                    color:
                      colores.texto,

                    fontSize:
                      13 *
                      escalaTexto,
                  },
                ]}
                numberOfLines={
                  2
                }
              >
                {actividad.recurso_titulo ||
                  'Recurso de apoyo'}
              </Text>

              {!!actividad.recurso_tipo && (
                <Text
                  style={[
                    styles.resourceType,
                    {
                      color:
                        colores.textoSecundario,

                      fontSize:
                        10 *
                        escalaTexto,
                    },
                  ]}
                >
                  {
                    actividad.recurso_tipo
                  }
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.openResourceButton,
              {
                backgroundColor:
                  colores.primario,

                borderColor:
                  colores.primario,
              },
            ]}
            onPress={(
              evento
            ) => {
              evento.stopPropagation();

              void abrirRecursoAdjunto(
                actividad
              );
            }}
            activeOpacity={
              0.78
            }
            accessibilityRole="button"
            accessibilityLabel={`Abrir recurso ${
              actividad.recurso_titulo ||
              'de la actividad'
            }`}
            accessibilityHint="Abre el recurso en la pantalla correspondiente"
          >
            <Ionicons
              name="open-outline"
              size={18}
              color={
                colorSobrePrimario
              }
            />

            <Text
              style={[
                styles.openResourceText,
                {
                  color:
                    colorSobrePrimario,

                  fontSize:
                    12 *
                    escalaTexto,
                },
              ]}
            >
              Abrir recurso
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

/* =====================================================
   NAVEGACIÓN
===================================================== */

function BottomItem({
  icon,
  activeIcon,
  label,
  active = false,
  onPress,
}: {
  icon: IoniconName;
  activeIcon: IoniconName;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  return (
    <TouchableOpacity
      style={
        styles.bottomItem
      }
      onPress={
        onPress
      }
      activeOpacity={
        0.7
      }
      accessibilityRole="tab"
      accessibilityState={{
        selected:
          active,
      }}
      accessibilityLabel={
        label
      }
    >
      <View
        style={[
          styles.bottomIconContainer,
          active && {
            backgroundColor:
              colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={
            active
              ? activeIcon
              : icon
          }
          size={21}
          color={
            active
              ? colores.primario
              : colores.textoSecundario
          }
        />
      </View>

      <Text
        style={[
          styles.bottomLabel,
          {
            color:
              active
                ? colores.primario
                : colores.textoSecundario,

            fontSize:
              9 *
              escalaTexto,

            fontWeight:
              active
                ? '800'
                : '600',
          },
        ]}
        numberOfLines={
          1
        }
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* =====================================================
   ESTILOS
===================================================== */

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      alignItems:
        'center',
    },

    contentContainer: {
      alignSelf:
        'center',
    },

    header: {
      minHeight: 58,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom:
        18,
    },

    headerButton: {
      width: 44,
      height: 44,
      borderWidth: 1,
      borderRadius: 14,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    headerText: {
      flex: 1,
      paddingHorizontal:
        8,
    },

    title: {
      fontWeight:
        '800',
    },

    subtitle: {
      marginTop: 2,
    },

    summaryRow: {
      flexDirection:
        'row',
      gap: 9,
      marginBottom:
        18,
    },

    summaryCard: {
      flex: 1,
      minWidth: 0,
      paddingVertical:
        13,
      paddingHorizontal:
        8,
      borderWidth: 1,
      borderRadius: 13,
      alignItems:
        'center',
    },

    summaryIcon: {
      width: 34,
      height: 34,
      marginBottom: 7,
      borderWidth: 1,
      borderRadius: 10,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    summaryValue: {
      fontWeight:
        '800',
    },

    summaryLabel: {
      marginTop: 2,
      fontWeight:
        '600',
    },

    filterRow: {
      flexDirection:
        'row',
      padding: 4,
      marginBottom:
        16,
      borderWidth: 1,
      borderRadius: 11,
    },

    filterButton: {
      flex: 1,
      minHeight: 37,
      borderWidth: 1,
      borderRadius: 8,
      justifyContent:
        'center',
      alignItems:
        'center',
      paddingHorizontal:
        5,
    },

    filterText: {
      fontWeight:
        '600',
    },

    loadingContainer: {
      minHeight: 280,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    loadingText: {
      marginTop: 12,
    },

    emptyCard: {
      minHeight: 255,
      padding: 28,
      borderWidth: 1,
      borderRadius: 15,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    emptyIconBox: {
      width: 64,
      height: 64,
      marginBottom: 15,
      borderWidth: 1,
      borderRadius: 20,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    emptyTitle: {
      fontWeight:
        '800',
    },

    emptyText: {
      maxWidth: 280,
      marginTop: 7,
      lineHeight: 18,
      textAlign:
        'center',
    },

    activityCard: {
      marginBottom: 13,
      padding: 15,
      borderWidth: 1,
      borderRadius: 14,
    },

    activityCardHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    activityIconBox: {
      width: 43,
      height: 43,
      borderWidth: 1,
      borderRadius: 12,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    activityHeaderText: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal:
        10,
    },

    subjectText: {
      fontWeight:
        '700',
    },

    typeText: {
      marginTop: 3,
    },

    statusBadge: {
      maxWidth: 95,
      paddingVertical:
        5,
      paddingHorizontal:
        8,
      borderWidth: 1,
      borderRadius: 20,
    },

    statusText: {
      fontWeight:
        '800',
      textAlign:
        'center',
    },

    activityTitle: {
      marginTop: 13,
      lineHeight: 21,
      fontWeight:
        '800',
    },

    activityDescription: {
      marginTop: 5,
      lineHeight: 17,
    },

    activityDivider: {
      height: 1,
      marginVertical:
        12,
    },

    activityInfoRow: {
      flexDirection:
        'row',
      flexWrap: 'wrap',
      justifyContent:
        'space-between',
      gap: 8,
    },

    activityInfoItem: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 5,
    },

    activityInfoText: {
      fontWeight:
        '600',
    },

    courseText: {
      marginTop: 10,
    },

    resourceContainer: {
      marginTop: 13,
      padding: 12,
      borderWidth: 1,
      borderRadius: 12,
    },

    resourceInformation: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    resourceIconBox: {
      width: 40,
      height: 40,
      borderWidth: 1,
      borderRadius: 11,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    resourceTextContainer: {
      flex: 1,
      minWidth: 0,
      marginLeft: 10,
    },

    resourceLabel: {
      fontWeight:
        '800',
      textTransform:
        'uppercase',
    },

    resourceTitle: {
      marginTop: 2,
      lineHeight: 18,
      fontWeight:
        '700',
    },

    resourceType: {
      marginTop: 2,
    },

    openResourceButton: {
      minHeight: 42,
      marginTop: 11,
      paddingHorizontal:
        14,
      borderWidth: 1,
      borderRadius: 10,
      flexDirection:
        'row',
      justifyContent:
        'center',
      alignItems:
        'center',
      gap: 7,
    },

    openResourceText: {
      fontWeight:
        '800',
    },

    bottomNavigation: {
      position:
        'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      alignItems:
        'center',
    },

    bottomContent: {
      height: 61,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    bottomItem: {
      flex: 1,
      minWidth: 0,
      height: 58,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    bottomIconContainer: {
      width: 36,
      height: 28,
      borderRadius: 14,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    bottomLabel: {
      maxWidth: '100%',
      marginTop: 1,
    },
  });