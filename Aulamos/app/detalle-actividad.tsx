import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  useCallback,
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
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import {
  api,
  API_URL,
} from '../services/api';

type VistaDetalle =
  | 'Alumno'
  | 'Docente';

type ArchivoEntrega = {
  id_adjunto?: number;
  nombre_archivo: string;
  tipo_archivo?: string | null;
  url_archivo: string;
  tamano_bytes?: number | null;
};

type ArchivoSeleccionado = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

type RecursoActividad = {
  id_recurso: number;
  titulo: string;
  descripcion?: string | null;
  tipo: string;
  url_recurso?: string | null;
  archivo?: string | null;
  subtitulos_disponibles?: boolean | number;
  accesible?: boolean | number;
};

type DetalleActividad = {
  id_actividad: number;
  id_curso: number;
  id_periodo: number | null;
  id_docente: number;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;

  recurso?: RecursoActividad | null;
  tipo:
    | 'Tarea'
    | 'Ejercicio'
    | 'Lectura'
    | 'Proyecto'
    | 'Evaluacion';
  fecha_publicacion: string;
  fecha_limite: string;
  puntaje_maximo: number | string;
  permite_entrega_archivo:
    | boolean
    | number;
  estado_actividad: string;
  nombre_curso: string;
  materia: string;
  grupo: string;
  periodo: string | null;

  id_actividad_estudiante?: number;
  estado_alumno?: string;
  vencida?: boolean | number;

  id_entrega?: number | null;
  texto_entrega?: string | null;
  fecha_entrega?: string | null;
  estado_entrega?: string | null;
  calificacion?:
    | number
    | string
    | null;
  retroalimentacion?: string | null;

  id_adjunto?: number | null;
  nombre_archivo?: string | null;
  tipo_archivo?: string | null;
  url_archivo?: string | null;
  tamano_bytes?: number | null;

  alumnos_asignados?:
    | number
    | string;
  alumnos_entregados?:
    | number
    | string;
  alumnos_finalizados?:
    | number
    | string;
  alumnos_pendientes?:
    | number
    | string;
};

type EntregaDocente = {
  id_actividad_estudiante: number;
  id_alumno: number;
  estado_alumno: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  correo: string;
  id_entrega?: number | null;
  texto_entrega?: string | null;
  fecha_entrega?: string | null;
  estado_entrega?: string | null;
  calificacion?:
    | number
    | string
    | null;
  retroalimentacion?: string | null;
  fuera_de_tiempo?:
    | boolean
    | number;
  vencida?: boolean | number;
  archivo?: ArchivoEntrega | null;
};

type ResumenEntregas = {
  asignados: number;
  entregados: number;
  pendientes: number;
  calificados: number;
};

type FiltroEntregas =
  | 'Todos'
  | 'Entregados'
  | 'Pendientes';

type RespuestaDetalle = {
  vista?: VistaDetalle;
  actividad?: DetalleActividad;
  mensaje?: string;
};

type RespuestaEntregas = {
  resumen?: ResumenEntregas;
  entregas?: EntregaDocente[];
  mensaje?: string;
};

type RespuestaError = {
  mensaje?: string;
  error?: string;
};

type IoniconName =
  keyof typeof Ionicons.glyphMap;

const RESUMEN_VACIO: ResumenEntregas = {
  asignados: 0,
  entregados: 0,
  pendientes: 0,
  calificados: 0,
};

const EXTENSIONES_PERMITIDAS = [
  '.doc',
  '.docx',
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.xls',
  '.xlsx',
];

const TIPOS_DOCUMENTO = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const normalizarFecha = (
  fecha?: string | null,
) => {
  if (!fecha) {
    return null;
  }

  const normalizada =
    fecha.includes('T')
      ? fecha
      : fecha.replace(' ', 'T');

  const resultado = new Date(
    normalizada,
  );

  return Number.isNaN(
    resultado.getTime(),
  )
    ? null
    : resultado;
};

const mostrarFecha = (
  fecha?: string | null,
) => {
  const fechaConvertida =
    normalizarFecha(fecha);

  if (!fechaConvertida) {
    return 'No disponible';
  }

  return fechaConvertida.toLocaleString(
    'es-MX',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
};

const limpiarEstado = (
  estado?: string | null,
) =>
  estado
    ? estado.replace(/_/g, ' ')
    : 'Sin estado';

const obtenerNombreAlumno = (
  entrega: EntregaDocente,
) =>
  [
    entrega.nombre,
    entrega.apellido_paterno,
    entrega.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ');

const mostrarTamano = (
  bytes?: number | null,
) => {
  if (!bytes) {
    return 'Tamaño no disponible';
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
};

const obtenerMime = (
  nombre: string,
) => {
  const extension = nombre
    .toLowerCase()
    .slice(nombre.lastIndexOf('.'));

  const tipos: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.doc': 'application/msword',
    '.docx':
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls':
      'application/vnd.ms-excel',
    '.xlsx':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  return (
    tipos[extension] ||
    'application/octet-stream'
  );
};

const esExtensionPermitida = (
  nombre: string,
) => {
  const nombreNormalizado =
    nombre.toLowerCase();

  return EXTENSIONES_PERMITIDAS.some(
    (extension) =>
      nombreNormalizado.endsWith(
        extension,
      ),
  );
};

const obtenerMensajeError = (
  error: unknown,
) => {
  if (
    axios.isAxiosError<RespuestaError>(
      error,
    )
  ) {
    if (
      error.response?.data?.mensaje
    ) {
      return error.response.data.mensaje;
    }

    if (error.response?.data?.error) {
      return error.response.data.error;
    }

    if (!error.response) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté encendido y que el celular y la computadora estén en la misma red Wi-Fi.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado.';
};

const urlPublica = (
  ruta: string,
) => {
  if (/^https?:\/\//i.test(ruta)) {
    return ruta;
  }

  const servidor = API_URL.replace(
    /\/api\/?$/,
    '',
  );

  return `${servidor}${
    ruta.startsWith('/')
      ? ruta
      : `/${ruta}`
  }`;
};

export default function DetalleActividadScreen() {
  const parametros =
    useLocalSearchParams<{
      id_actividad?:
        | string
        | string[];
    }>();

  const idRecibido =
    Array.isArray(
      parametros.id_actividad,
    )
      ? parametros.id_actividad[0]
      : parametros.id_actividad;

  const idActividad = Number(
    idRecibido,
  );

  const { width } =
    useWindowDimensions();

  const insets =
    useSafeAreaInsets();

  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const [actividad, setActividad] =
    useState<DetalleActividad | null>(
      null,
    );

  const [vista, setVista] =
    useState<VistaDetalle | null>(
      null,
    );

  const [entregas, setEntregas] =
    useState<EntregaDocente[]>([]);

  const [resumen, setResumen] =
    useState<ResumenEntregas>(
      RESUMEN_VACIO,
    );

  const [filtro, setFiltro] =
    useState<FiltroEntregas>('Todos');

  const [archivo, setArchivo] =
    useState<ArchivoSeleccionado | null>(
      null,
    );

  const [comentario, setComentario] =
    useState('');

  const [cargando, setCargando] =
    useState(true);

  const [actualizando, setActualizando] =
    useState(false);

  const [enviando, setEnviando] =
    useState(false);

  const altoContraste =
    preferencias.altoContraste;

  const temaOscuro =
    preferencias.modoOscuro ||
    altoContraste;

  const colorPrincipal = altoContraste
    ? colores.primario
    : temaOscuro
      ? '#60A5FA'
      : '#2D5BFF';

  const colorExito = altoContraste
    ? colores.primario
    : temaOscuro
      ? '#4ADE80'
      : '#16865B';

  const colorAlerta = altoContraste
    ? colores.primario
    : temaOscuro
      ? '#FCD34D'
      : '#B66A00';

  const margenHorizontal =
    width < 360
      ? 14
      : width < 400
        ? 18
        : 22;

  const anchoContenido = Math.min(
    width - margenHorizontal * 2,
    620,
  );

  const cargarDetalle =
    useCallback(
      async (
        esActualizacion = false,
      ) => {
        try {
          if (
            !Number.isInteger(
              idActividad,
            ) ||
            idActividad <= 0
          ) {
            throw new Error(
              'No se recibió una actividad válida.',
            );
          }

          if (esActualizacion) {
            setActualizando(true);
          } else {
            setCargando(true);
          }

          const token =
            await AsyncStorage.getItem(
              'token',
            );

          if (!token) {
            throw new Error(
              'No se encontró tu sesión. Inicia sesión nuevamente.',
            );
          }

          const detalle =
            await api.get<RespuestaDetalle>(
              `/academico/actividades/${idActividad}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              },
            );

          if (
            !detalle.data.actividad ||
            !detalle.data.vista
          ) {
            throw new Error(
              'El servidor no devolvió el detalle completo de la actividad.',
            );
          }

          setActividad(
            detalle.data.actividad,
          );

          setVista(detalle.data.vista);

          if (
            detalle.data.vista ===
            'Docente'
          ) {
            const trabajos =
              await api.get<RespuestaEntregas>(
                `/academico/actividades/${idActividad}/entregas`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                },
              );

            setEntregas(
              trabajos.data.entregas ?? [],
            );

            setResumen(
              trabajos.data.resumen ??
                RESUMEN_VACIO,
            );
          } else {
            setEntregas([]);
            setResumen(RESUMEN_VACIO);
          }
        } catch (error) {
          Alert.alert(
            'No se pudo abrir la actividad',
            obtenerMensajeError(error),
          );
        } finally {
          setCargando(false);
          setActualizando(false);
        }
      },
      [idActividad],
    );

  useFocusEffect(
    useCallback(() => {
      void cargarDetalle();
    }, [cargarDetalle]),
  );

  const seleccionarArchivo = async () => {
    try {
      const resultado =
        await DocumentPicker.getDocumentAsync({
          type: TIPOS_DOCUMENTO,
          multiple: false,
          copyToCacheDirectory: true,
        });

      if (resultado.canceled) {
        return;
      }

      const seleccionado =
        resultado.assets[0];

      if (
        !esExtensionPermitida(
          seleccionado.name,
        )
      ) {
        Alert.alert(
          'Archivo no permitido',
          'Selecciona un archivo Word, PDF, PNG, JPG o Excel.',
        );
        return;
      }

      if (
        seleccionado.size &&
        seleccionado.size >
          10 * 1024 * 1024
      ) {
        Alert.alert(
          'Archivo demasiado grande',
          'El archivo no puede superar los 10 MB.',
        );
        return;
      }

      setArchivo({
        uri: seleccionado.uri,
        name: seleccionado.name,
        mimeType:
          seleccionado.mimeType,
        size: seleccionado.size,
      });
    } catch (error) {
      Alert.alert(
        'No se pudo seleccionar el archivo',
        obtenerMensajeError(error),
      );
    }
  };

  const enviarEntrega = async () => {
    try {
      if (!actividad) {
        return;
      }

      if (!archivo && !comentario.trim()) {
        Alert.alert(
          'Entrega incompleta',
          'Adjunta un archivo o escribe un comentario.',
        );
        return;
      }

      const token =
        await AsyncStorage.getItem(
          'token',
        );

      if (!token) {
        throw new Error(
          'No se encontró tu sesión. Inicia sesión nuevamente.',
        );
      }

      setEnviando(true);

      const datos = new FormData();

      if (comentario.trim()) {
        datos.append(
          'texto_entrega',
          comentario.trim(),
        );
      }

      if (archivo) {
        datos.append(
          'archivo',
          {
            uri: archivo.uri,
            name: archivo.name,
            type:
              archivo.mimeType ||
              obtenerMime(archivo.name),
          } as never,
        );
      }

      const respuesta =
        await api.post<{
          mensaje?: string;
        }>(
          `/academico/actividades/${idActividad}/entrega`,
          datos,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
              'Content-Type':
                'multipart/form-data',
            },
          },
        );

      setArchivo(null);
      setComentario('');

      Alert.alert(
        'Entrega enviada',
        respuesta.data.mensaje ||
          'Tu trabajo se envió correctamente.',
      );

      await cargarDetalle(true);
    } catch (error) {
      Alert.alert(
        'No se pudo enviar la entrega',
        obtenerMensajeError(error),
      );
    } finally {
      setEnviando(false);
    }
  };

  const confirmarEntrega = () => {
    const esReentrega =
      Number(
        actividad?.id_entrega ?? 0,
      ) > 0;

    Alert.alert(
      esReentrega
        ? 'Volver a entregar'
        : 'Entregar actividad',
      esReentrega
        ? 'Se guardará un nuevo intento con el archivo seleccionado.'
        : '¿Deseas enviar este trabajo al docente?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Enviar',
          onPress: () =>
            void enviarEntrega(),
        },
      ],
    );
  };

  const abrirArchivo = async (
    ruta?: string | null,
  ) => {
    if (!ruta) {
      return;
    }

    try {
      await Linking.openURL(
        urlPublica(ruta),
      );
    } catch {
      Alert.alert(
        'No se pudo abrir el archivo',
        'Verifica que tengas una aplicación compatible con este tipo de documento.',
      );
    }
  };

  const revisarEntrega = (
    entrega: EntregaDocente,
  ) => {
    if (!entrega.id_entrega) {
      Alert.alert(
        'Entrega pendiente',
        'Este alumno todavía no ha enviado un trabajo para calificar.',
      );
      return;
    }

    router.push({
      pathname: '/calificar-entrega',
      params: {
        id_entrega: String(
          entrega.id_entrega,
        ),
        id_actividad: String(
          idActividad,
        ),
        nombre_alumno:
          obtenerNombreAlumno(
            entrega,
          ),
        titulo_actividad:
          actividad?.titulo ?? '',
        materia:
          actividad?.materia ?? '',
        puntaje_maximo: String(
          actividad?.puntaje_maximo ??
            100,
        ),
        fecha_entrega:
          entrega.fecha_entrega ?? '',
        estado_entrega:
          entrega.estado_entrega ??
          'Entregada',
        fuera_de_tiempo: String(
          Number(
            entrega.fuera_de_tiempo ??
              0,
          ),
        ),
        texto_entrega:
          entrega.texto_entrega ?? '',
        calificacion: String(
          entrega.calificacion ?? '',
        ),
        retroalimentacion:
          entrega.retroalimentacion ??
          '',
        nombre_archivo:
          entrega.archivo
            ?.nombre_archivo ?? '',
        tipo_archivo:
          entrega.archivo
            ?.tipo_archivo ?? '',
        url_archivo:
          entrega.archivo
            ?.url_archivo ?? '',
      },
    });
  };

  const entregasFiltradas = useMemo(
    () =>
      entregas.filter((entrega) => {
        if (filtro === 'Entregados') {
          return Boolean(
            entrega.id_entrega,
          );
        }

        if (filtro === 'Pendientes') {
          return !entrega.id_entrega;
        }

        return true;
      }),
    [entregas, filtro],
  );

  const vencida =
    Number(
      actividad?.vencida ?? 0,
    ) === 1;

  const tieneEntrega =
    Number(
      actividad?.id_entrega ?? 0,
    ) > 0;

  const entregaCalificada =
    actividad?.estado_entrega ===
    'Calificada';

  const puedeAdjuntar =
    Number(
      actividad?.permite_entrega_archivo ??
        0,
    ) === 1;

  const archivoAnterior:
    | ArchivoEntrega
    | null =
    actividad?.nombre_archivo &&
    actividad.url_archivo
      ? {
          id_adjunto:
            actividad.id_adjunto ??
            undefined,
          nombre_archivo:
            actividad.nombre_archivo,
          tipo_archivo:
            actividad.tipo_archivo,
          url_archivo:
            actividad.url_archivo,
          tamano_bytes:
            actividad.tamano_bytes,
        }
      : null;

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
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom:
              (vista === 'Docente'
                ? 94
                : 32) +
              Math.max(
                insets.bottom,
                8,
              ),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() =>
              void cargarDetalle(true)
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
                styles.headerButton,
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

            <View style={styles.headerTitle}>
              <Text
                style={[
                  styles.headerTitleText,
                  {
                    color: colores.texto,
                    fontSize:
                      20 * escalaTexto,
                  },
                ]}
                numberOfLines={1}
              >
                Actividad
              </Text>

              <Text
                style={[
                  styles.headerSubtitle,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      11 * escalaTexto,
                  },
                ]}
              >
                {vista === 'Docente'
                  ? 'Seguimiento del grupo'
                  : 'Trabajo asignado'}
              </Text>
            </View>

            <BotonAccesibilidad />
          </View>

          {cargando ? (
            <View style={styles.loading}>
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
                Cargando actividad...
              </Text>
            </View>
          ) : !actividad ? (
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
                name="alert-circle-outline"
                size={38}
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
                Actividad no disponible
              </Text>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.classBanner,
                  {
                    backgroundColor:
                      colorPrincipal,
                  },
                ]}
              >
                <View
                  style={styles.bannerCircleOne}
                />
                <View
                  style={styles.bannerCircleTwo}
                />

                <View
                  style={styles.bannerTop}
                >
                  <View
                    style={styles.typeBadge}
                  >
                    <Ionicons
                      name="clipboard-outline"
                      size={16}
                      color="#FFFFFF"
                    />

                    <Text
                      style={[
                        styles.typeBadgeText,
                        {
                          fontSize:
                            11 * escalaTexto,
                        },
                      ]}
                    >
                      {actividad.tipo ===
                      'Evaluacion'
                        ? 'Evaluación'
                        : actividad.tipo}
                    </Text>
                  </View>

                  <View
                    style={styles.stateBadge}
                  >
                    <Text
                      style={[
                        styles.stateBadgeText,
                        {
                          fontSize:
                            10 * escalaTexto,
                        },
                      ]}
                    >
                      {vista === 'Alumno'
                        ? vencida
                          ? 'Vencida'
                          : limpiarEstado(
                              actividad.estado_alumno,
                            )
                        : limpiarEstado(
                            actividad.estado_actividad,
                          )}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.bannerTitle,
                    {
                      fontSize:
                        25 * escalaTexto,
                      lineHeight:
                        31 * escalaTexto,
                    },
                  ]}
                >
                  {actividad.titulo}
                </Text>

                <Text
                  style={[
                    styles.bannerCourse,
                    {
                      fontSize:
                        13 * escalaTexto,
                    },
                  ]}
                >
                  {actividad.materia}
                  {' · '}
                  {actividad.grupo}
                </Text>

                <Text
                  style={[
                    styles.bannerCourse,
                    {
                      fontSize:
                        12 * escalaTexto,
                    },
                  ]}
                >
                  {actividad.nombre_curso}
                  {actividad.periodo
                    ? ` · ${actividad.periodo}`
                    : ''}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <InfoPill
                  icon="calendar-outline"
                  label="Fecha límite"
                  value={mostrarFecha(
                    actividad.fecha_limite,
                  )}
                  danger={vencida}
                  colores={colores}
                  escala={escalaTexto}
                  colorPrincipal={
                    colorPrincipal
                  }
                />

                <InfoPill
                  icon="star-outline"
                  label="Puntaje"
                  value={`${Number(
                    actividad.puntaje_maximo,
                  )} puntos`}
                  colores={colores}
                  escala={escalaTexto}
                  colorPrincipal={
                    colorPrincipal
                  }
                />
              </View>

              <ContentCard
                title="Descripción"
                icon="information-circle-outline"
                text={
                  actividad.descripcion ||
                  'El docente no agregó una descripción.'
                }
                colores={colores}
                escala={escalaTexto}
                colorPrincipal={
                  colorPrincipal
                }
              />

              <ContentCard
                title="Instrucciones"
                icon="list-outline"
                text={
                  actividad.instrucciones ||
                  'El docente no agregó instrucciones adicionales.'
                }
                colores={colores}
                escala={escalaTexto}
                colorPrincipal={
                  colorPrincipal
                }
              />

              {vista === 'Alumno' ? (
                <View
                  style={[
                    styles.workCard,
                    {
                      backgroundColor:
                        colores.tarjeta,
                      borderColor:
                        colores.borde,
                    },
                  ]}
                >
                  <View
                    style={styles.sectionHeading}
                  >
                    <View>
                      <Text
                        style={[
                          styles.sectionTitle,
                          {
                            color:
                              colores.texto,
                            fontSize:
                              18 *
                              escalaTexto,
                          },
                        ]}
                      >
                        Tu trabajo
                      </Text>

                      <Text
                        style={[
                          styles.sectionCaption,
                          {
                            color:
                              colores.textoSecundario,
                            fontSize:
                              11 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {tieneEntrega
                          ? `Enviado ${mostrarFecha(
                              actividad.fecha_entrega,
                            )}`
                          : 'Aún no has realizado la entrega'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.deliveryBadge,
                        {
                          backgroundColor:
                            tieneEntrega
                              ? temaOscuro
                                ? colores.fondoPrimario
                                : '#E4F7EF'
                              : temaOscuro
                                ? colores.fondoPrimario
                                : '#FFF2D8',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.deliveryBadgeText,
                          {
                            color: tieneEntrega
                              ? colorExito
                              : colorAlerta,
                            fontSize:
                              10 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {tieneEntrega
                          ? limpiarEstado(
                              actividad.estado_entrega,
                            )
                          : 'Pendiente'}
                      </Text>
                    </View>
                  </View>

                  {archivoAnterior ? (
                    <FileRow
                      archivo={archivoAnterior}
                      onPress={() =>
                        void abrirArchivo(
                          archivoAnterior.url_archivo,
                        )
                      }
                      colores={colores}
                      escala={escalaTexto}
                      colorPrincipal={
                        colorPrincipal
                      }
                    />
                  ) : null}

                  {actividad.texto_entrega ? (
                    <View
                      style={[
                        styles.savedComment,
                        {
                          backgroundColor:
                            colores.fondoPrimario,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.savedCommentLabel,
                          {
                            color:
                              colores.textoSecundario,
                            fontSize:
                              10 *
                              escalaTexto,
                          },
                        ]}
                      >
                        Comentario enviado
                      </Text>

                      <Text
                        style={[
                          styles.savedCommentText,
                          {
                            color:
                              colores.texto,
                            fontSize:
                              13 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {actividad.texto_entrega}
                      </Text>
                    </View>
                  ) : null}

                  {actividad.calificacion !==
                    null &&
                  actividad.calificacion !==
                    undefined ? (
                    <View
                      style={[
                        styles.gradeBox,
                        {
                          backgroundColor:
                            temaOscuro
                              ? colores.fondoPrimario
                              : '#EAF1FF',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.gradeLabel,
                          {
                            color:
                              colores.textoSecundario,
                            fontSize:
                              11 *
                              escalaTexto,
                          },
                        ]}
                      >
                        Calificación
                      </Text>

                      <Text
                        style={[
                          styles.gradeValue,
                          {
                            color:
                              colorPrincipal,
                            fontSize:
                              23 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {Number(
                          actividad.calificacion,
                        )}
                        {' / '}
                        {Number(
                          actividad.puntaje_maximo,
                        )}
                      </Text>
                    </View>
                  ) : null}

                  {actividad.retroalimentacion ? (
                    <View
                      style={[
                        styles.feedbackBox,
                        {
                          backgroundColor:
                            temaOscuro
                              ? colores.fondoPrimario
                              : '#E4F7EF',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.feedbackTitle,
                          {
                            color: colorExito,
                            fontSize:
                              11 *
                              escalaTexto,
                          },
                        ]}
                      >
                        Retroalimentación
                      </Text>

                      <Text
                        style={[
                          styles.feedbackText,
                          {
                            color:
                              colores.texto,
                            fontSize:
                              13 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {
                          actividad.retroalimentacion
                        }
                      </Text>
                    </View>
                  ) : null}

                  {!entregaCalificada ? (
                    <>
                      {puedeAdjuntar ? (
                        <TouchableOpacity
                          style={[
                            styles.attachButton,
                            {
                              borderColor:
                                colorPrincipal,
                            },
                          ]}
                          onPress={() =>
                            void seleccionarArchivo()
                          }
                          accessibilityRole="button"
                          accessibilityLabel="Adjuntar archivo de la actividad"
                        >
                          <Ionicons
                            name="attach-outline"
                            size={21}
                            color={
                              colorPrincipal
                            }
                          />

                          <Text
                            style={[
                              styles.attachButtonText,
                              {
                                color:
                                  colorPrincipal,
                                fontSize:
                                  13 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            Adjuntar archivo
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      <Text
                        style={[
                          styles.formatsText,
                          {
                            color:
                              colores.textoSecundario,
                            fontSize:
                              10 *
                              escalaTexto,
                          },
                        ]}
                      >
                        Word, PDF, PNG, JPG o Excel · Máximo 10 MB
                      </Text>

                      {archivo ? (
                        <View
                          style={[
                            styles.selectedFile,
                            {
                              backgroundColor:
                                colores.fondoPrimario,
                              borderColor:
                                colores.borde,
                            },
                          ]}
                        >
                          <Ionicons
                            name="document-text-outline"
                            size={23}
                            color={
                              colorPrincipal
                            }
                          />

                          <View
                            style={styles.fileInfo}
                          >
                            <Text
                              style={[
                                styles.fileName,
                                {
                                  color:
                                    colores.texto,
                                  fontSize:
                                    12 *
                                    escalaTexto,
                                },
                              ]}
                              numberOfLines={2}
                            >
                              {archivo.name}
                            </Text>

                            <Text
                              style={[
                                styles.fileSize,
                                {
                                  color:
                                    colores.textoSecundario,
                                  fontSize:
                                    10 *
                                    escalaTexto,
                                },
                              ]}
                            >
                              {mostrarTamano(
                                archivo.size,
                              )}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.removeFile}
                            onPress={() =>
                              setArchivo(null)
                            }
                            accessibilityRole="button"
                            accessibilityLabel="Quitar archivo seleccionado"
                          >
                            <Ionicons
                              name="close-circle"
                              size={23}
                              color={
                                colores.textoSecundario
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      <TextInput
                        style={[
                          styles.commentInput,
                          {
                            backgroundColor:
                              colores.fondoPrimario,
                            borderColor:
                              colores.borde,
                            color:
                              colores.texto,
                            fontSize:
                              13 *
                              escalaTexto,
                          },
                        ]}
                        value={comentario}
                        onChangeText={setComentario}
                        placeholder="Comentario para el docente (opcional)"
                        placeholderTextColor={
                          colores.textoSecundario
                        }
                        multiline
                        maxLength={5000}
                        textAlignVertical="top"
                        accessibilityLabel="Comentario para el docente"
                      />

                      <TouchableOpacity
                        style={[
                          styles.submitButton,
                          {
                            backgroundColor:
                              colorPrincipal,
                          },
                          enviando &&
                            styles.disabledButton,
                        ]}
                        onPress={confirmarEntrega}
                        disabled={enviando}
                        accessibilityRole="button"
                        accessibilityLabel={
                          tieneEntrega
                            ? 'Volver a entregar actividad'
                            : 'Entregar actividad'
                        }
                      >
                        {enviando ? (
                          <ActivityIndicator
                            color="#FFFFFF"
                          />
                        ) : (
                          <>
                            <Ionicons
                              name="send"
                              size={18}
                              color="#FFFFFF"
                            />

                            <Text
                              style={[
                                styles.submitButtonText,
                                {
                                  fontSize:
                                    14 *
                                    escalaTexto,
                                },
                              ]}
                            >
                              {tieneEntrega
                                ? 'Volver a entregar'
                                : 'Entregar'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              ) : (
                <View
                  style={[
                    styles.workCard,
                    {
                      backgroundColor:
                        colores.tarjeta,
                      borderColor:
                        colores.borde,
                    },
                  ]}
                >
                  <View
                    style={styles.sectionHeading}
                  >
                    <View>
                      <Text
                        style={[
                          styles.sectionTitle,
                          {
                            color:
                              colores.texto,
                            fontSize:
                              18 *
                              escalaTexto,
                          },
                        ]}
                      >
                        Trabajo de los alumnos
                      </Text>

                      <Text
                        style={[
                          styles.sectionCaption,
                          {
                            color:
                              colores.textoSecundario,
                            fontSize:
                              11 *
                              escalaTexto,
                          },
                        ]}
                      >
                        Consulta quién entregó y abre sus archivos
                      </Text>
                    </View>
                  </View>

                  <View
                    style={styles.statsGrid}
                  >
                    <StatCard
                      label="Asignados"
                      value={resumen.asignados}
                      color={colorPrincipal}
                      icon="people-outline"
                      colores={colores}
                      escala={escalaTexto}
                    />

                    <StatCard
                      label="Entregados"
                      value={resumen.entregados}
                      color={colorExito}
                      icon="checkmark-circle-outline"
                      colores={colores}
                      escala={escalaTexto}
                    />

                    <StatCard
                      label="Pendientes"
                      value={resumen.pendientes}
                      color={colorAlerta}
                      icon="time-outline"
                      colores={colores}
                      escala={escalaTexto}
                    />

                    <StatCard
                      label="Calificados"
                      value={resumen.calificados}
                      color="#8A4832"
                      icon="ribbon-outline"
                      colores={colores}
                      escala={escalaTexto}
                    />
                  </View>

                  <View style={styles.filters}>
                    {(
                      [
                        'Todos',
                        'Entregados',
                        'Pendientes',
                      ] as FiltroEntregas[]
                    ).map((opcion) => (
                      <TouchableOpacity
                        key={opcion}
                        style={[
                          styles.filterChip,
                          {
                            borderColor:
                              filtro === opcion
                                ? colorPrincipal
                                : colores.borde,
                            backgroundColor:
                              filtro === opcion
                                ? temaOscuro
                                  ? colores.fondoPrimario
                                  : '#EAF1FF'
                                : colores.tarjeta,
                          },
                        ]}
                        onPress={() =>
                          setFiltro(opcion)
                        }
                        accessibilityRole="button"
                        accessibilityState={{
                          selected:
                            filtro === opcion,
                        }}
                      >
                        <Text
                          style={[
                            styles.filterText,
                            {
                              color:
                                filtro === opcion
                                  ? colorPrincipal
                                  : colores.textoSecundario,
                              fontSize:
                                11 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {opcion}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {entregasFiltradas.length ===
                  0 ? (
                    <View
                      style={styles.noStudents}
                    >
                      <Ionicons
                        name="file-tray-outline"
                        size={28}
                        color={
                          colores.textoSecundario
                        }
                      />

                      <Text
                        style={[
                          styles.noStudentsText,
                          {
                            color:
                              colores.textoSecundario,
                            fontSize:
                              12 *
                              escalaTexto,
                          },
                        ]}
                      >
                        No hay estudiantes en este filtro.
                      </Text>
                    </View>
                  ) : (
                    entregasFiltradas.map(
                      (entrega) => (
                        <StudentRow
                          key={
                            entrega.id_actividad_estudiante
                          }
                          entrega={entrega}
                          onOpenFile={() =>
                            void abrirArchivo(
                              entrega.archivo
                                ?.url_archivo,
                            )
                          }
                          onReview={() =>
                            revisarEntrega(
                              entrega,
                            )
                          }
                          colores={colores}
                          escala={escalaTexto}
                          colorPrincipal={
                            colorPrincipal
                          }
                          colorExito={
                            colorExito
                          }
                          colorAlerta={
                            colorAlerta
                          }
                          temaOscuro={
                            temaOscuro
                          }
                        />
                      ),
                    )
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {vista === 'Docente' ? (
        <View
          style={[
            styles.bottomNavigation,
            {
              paddingBottom: Math.max(
                insets.bottom,
                6,
              ),
              backgroundColor:
                colores.tarjeta,
              borderTopColor:
                colores.borde,
            },
          ]}
        >
          <BottomItem
            icon="home-outline"
            label="Inicio"
            onPress={() =>
              router.replace(
                '/inicio-docente' as any,
              )
            }
          />

          <BottomItem
            icon="book-outline"
            label="Recursos"
            onPress={() =>
              router.push(
                '/crear-recurso' as any,
              )
            }
          />

          <BottomItem
            icon="reader"
            label="Actividades"
            active
            onPress={() =>
              router.replace(
                '/actividades-docente' as any,
              )
            }
          />

          <BottomItem
            icon="document-text-outline"
            label="Evaluaciones"
            onPress={() =>
              Alert.alert(
                'Evaluaciones',
                'Esta pantalla todavía está pendiente.',
              )
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
      ) : null}
    </View>
  );
}

type Colores =
  ReturnType<
    typeof useAccessibility
  >['colores'];

function InfoPill({
  icon,
  label,
  value,
  danger = false,
  colores,
  escala,
  colorPrincipal,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  danger?: boolean;
  colores: Colores;
  escala: number;
  colorPrincipal: string;
}) {
  return (
    <View
      style={[
        styles.infoPill,
        {
          backgroundColor:
            colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={
        `${label}: ${value}`
      }
    >
      <View
        style={[
          styles.infoPillIcon,
          {
            backgroundColor:
              colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            danger
              ? '#DC3438'
              : colorPrincipal
          }
        />
      </View>

      <View style={styles.infoPillText}>
        <Text
          style={[
            styles.infoPillLabel,
            {
              color:
                colores.textoSecundario,
              fontSize: 10 * escala,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.infoPillValue,
            {
              color: danger
                ? '#DC3438'
                : colores.texto,
              fontSize: 12 * escala,
            },
          ]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
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
      accessibilityLabel={label}
      accessibilityState={{
        selected: active,
      }}
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

function ContentCard({
  title,
  icon,
  text,
  colores,
  escala,
  colorPrincipal,
}: {
  title: string;
  icon: IoniconName;
  text: string;
  colores: Colores;
  escala: number;
  colorPrincipal: string;
}) {
  return (
    <View
      style={[
        styles.contentCard,
        {
          backgroundColor:
            colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
    >
      <View
        style={styles.contentCardHeader}
      >
        <Ionicons
          name={icon}
          size={21}
          color={colorPrincipal}
        />

        <Text
          style={[
            styles.contentCardTitle,
            {
              color: colores.texto,
              fontSize: 16 * escala,
            },
          ]}
        >
          {title}
        </Text>
      </View>

      <Text
        style={[
          styles.contentCardText,
          {
            color:
              colores.textoSecundario,
            fontSize: 14 * escala,
            lineHeight: 21 * escala,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function FileRow({
  archivo,
  onPress,
  colores,
  escala,
  colorPrincipal,
}: {
  archivo: ArchivoEntrega;
  onPress: () => void;
  colores: Colores;
  escala: number;
  colorPrincipal: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.fileRow,
        {
          backgroundColor:
            colores.fondoPrimario,
          borderColor: colores.borde,
        },
      ]}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={
        `Abrir archivo ${archivo.nombre_archivo}`
      }
    >
      <Ionicons
        name="document-text-outline"
        size={25}
        color={colorPrincipal}
      />

      <View style={styles.fileInfo}>
        <Text
          style={[
            styles.fileName,
            {
              color: colores.texto,
              fontSize: 12 * escala,
            },
          ]}
          numberOfLines={2}
        >
          {archivo.nombre_archivo}
        </Text>

        <Text
          style={[
            styles.fileSize,
            {
              color:
                colores.textoSecundario,
              fontSize: 10 * escala,
            },
          ]}
        >
          {mostrarTamano(
            archivo.tamano_bytes,
          )}
        </Text>
      </View>

      <Ionicons
        name="open-outline"
        size={20}
        color={colorPrincipal}
      />
    </TouchableOpacity>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
  colores,
  escala,
}: {
  label: string;
  value: number;
  color: string;
  icon: IoniconName;
  colores: Colores;
  escala: number;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor:
            colores.fondoPrimario,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={
        `${label}: ${value}`
      }
    >
      <Ionicons
        name={icon}
        size={19}
        color={color}
      />

      <Text
        style={[
          styles.statValue,
          {
            color,
            fontSize: 20 * escala,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.statLabel,
          {
            color:
              colores.textoSecundario,
            fontSize: 10 * escala,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function StudentRow({
  entrega,
  onOpenFile,
  onReview,
  colores,
  escala,
  colorPrincipal,
  colorExito,
  colorAlerta,
  temaOscuro,
}: {
  entrega: EntregaDocente;
  onOpenFile: () => void;
  onReview: () => void;
  colores: Colores;
  escala: number;
  colorPrincipal: string;
  colorExito: string;
  colorAlerta: string;
  temaOscuro: boolean;
}) {
  const entregada = Boolean(
    entrega.id_entrega,
  );

  const nombreCompleto =
    obtenerNombreAlumno(entrega);

  const iniciales = [
    entrega.nombre,
    entrega.apellido_paterno,
  ]
    .filter(Boolean)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();

  return (
    <View
      style={[
        styles.studentRow,
        {
          borderColor: colores.borde,
        },
      ]}
    >
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: temaOscuro
              ? colores.fondoPrimario
              : '#EAF1FF',
          },
        ]}
      >
        <Text
          style={[
            styles.avatarText,
            {
              color: colorPrincipal,
              fontSize: 12 * escala,
            },
          ]}
        >
          {iniciales}
        </Text>
      </View>

      <View style={styles.studentInfo}>
        <View
          style={styles.studentNameRow}
        >
          <Text
            style={[
              styles.studentName,
              {
                color: colores.texto,
                fontSize: 13 * escala,
              },
            ]}
            numberOfLines={2}
          >
            {nombreCompleto}
          </Text>

          <Text
            style={[
              styles.studentState,
              {
                color: entregada
                  ? colorExito
                  : colorAlerta,
                fontSize: 10 * escala,
              },
            ]}
          >
            {entregada
              ? limpiarEstado(
                  entrega.estado_entrega,
                )
              : Number(
                    entrega.vencida ?? 0,
                  ) === 1
                ? 'Sin entregar · vencida'
                : 'Pendiente'}
          </Text>
        </View>

        {entregada ? (
          <Text
            style={[
              styles.deliveryDate,
              {
                color:
                  colores.textoSecundario,
                fontSize: 10 * escala,
              },
            ]}
          >
            {mostrarFecha(
              entrega.fecha_entrega,
            )}
            {Number(
              entrega.fuera_de_tiempo ??
                0,
            ) === 1
              ? ' · Fuera de tiempo'
              : ''}
          </Text>
        ) : null}

        {entrega.archivo ? (
          <TouchableOpacity
            style={styles.studentFileButton}
            onPress={onOpenFile}
            accessibilityRole="link"
            accessibilityLabel={
              `Abrir entrega de ${nombreCompleto}`
            }
          >
            <Ionicons
              name="document-attach-outline"
              size={17}
              color={colorPrincipal}
            />

            <Text
              style={[
                styles.studentFileText,
                {
                  color: colorPrincipal,
                  fontSize: 11 * escala,
                },
              ]}
              numberOfLines={1}
            >
              {
                entrega.archivo
                  .nombre_archivo
              }
            </Text>
          </TouchableOpacity>
        ) : entregada &&
          entrega.texto_entrega ? (
          <Text
            style={[
              styles.textSubmission,
              {
                color:
                  colores.textoSecundario,
                fontSize: 11 * escala,
              },
            ]}
            numberOfLines={3}
          >
            {entrega.texto_entrega}
          </Text>
        ) : null}

        {entregada &&
        entrega.calificacion !== null &&
        entrega.calificacion !==
          undefined ? (
          <View
            style={styles.studentGrade}
          >
            <Ionicons
              name="ribbon-outline"
              size={16}
              color={colorExito}
            />

            <Text
              style={[
                styles.studentGradeText,
                {
                  color: colorExito,
                  fontSize:
                    11 * escala,
                },
              ]}
            >
              Calificación:{' '}
              {entrega.calificacion}
            </Text>
          </View>
        ) : null}

        {entregada ? (
          <TouchableOpacity
            style={[
              styles.reviewButton,
              {
                backgroundColor:
                  colorPrincipal,
              },
            ]}
            onPress={onReview}
            accessibilityRole="button"
            accessibilityLabel={
              `Revisar y calificar la entrega de ${nombreCompleto}`
            }
          >
            <Ionicons
              name={
                entrega.estado_entrega ===
                'Calificada'
                  ? 'create-outline'
                  : 'checkmark-done-outline'
              }
              size={17}
              color="#FFFFFF"
            />

            <Text
              style={[
                styles.reviewButtonText,
                {
                  fontSize:
                    11 * escala,
                },
              ]}
            >
              {entrega.estado_entrega ===
              'Calificada'
                ? 'Editar calificación'
                : 'Revisar y calificar'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  content: {
    alignSelf: 'center',
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
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerButton: {
    width: 43,
    height: 43,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitleText: {
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 2,
  },
  loading: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  emptyCard: {
    minHeight: 260,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontWeight: '800',
  },
  classBanner: {
    minHeight: 205,
    padding: 20,
    borderRadius: 21,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bannerCircleOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -42,
    top: -58,
    backgroundColor:
      'rgba(255,255,255,0.10)',
  },
  bannerCircleTwo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    right: 52,
    bottom: -42,
    backgroundColor:
      'rgba(255,255,255,0.08)',
  },
  bannerTop: {
    position: 'absolute',
    top: 17,
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor:
      'rgba(255,255,255,0.18)',
  },
  typeBadgeText: {
    marginLeft: 5,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  stateBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  stateBadgeText: {
    color: '#2348C7',
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  bannerCourse: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  infoPill: {
    minWidth: 145,
    flex: 1,
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 15,
  },
  infoPillIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPillText: {
    flex: 1,
    marginLeft: 10,
  },
  infoPillLabel: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoPillValue: {
    marginTop: 4,
    fontWeight: '800',
  },
  contentCard: {
    marginTop: 12,
    padding: 17,
    borderWidth: 1,
    borderRadius: 17,
  },
  contentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contentCardTitle: {
    marginLeft: 8,
    fontWeight: '800',
  },
  contentCardText: {},
  workCard: {
    marginTop: 12,
    padding: 17,
    borderWidth: 1,
    borderRadius: 17,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontWeight: '900',
  },
  sectionCaption: {
    marginTop: 3,
  },
  deliveryBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  deliveryBadgeText: {
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  fileRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    borderWidth: 1,
    borderRadius: 13,
    marginBottom: 12,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 10,
  },
  fileName: {
    fontWeight: '700',
  },
  fileSize: {
    marginTop: 3,
  },
  savedComment: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  savedCommentLabel: {
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  savedCommentText: {
    marginTop: 5,
    lineHeight: 20,
  },
  gradeBox: {
    padding: 13,
    borderRadius: 13,
    marginBottom: 12,
  },
  gradeLabel: {
    fontWeight: '700',
  },
  gradeValue: {
    marginTop: 3,
    fontWeight: '900',
  },
  feedbackBox: {
    padding: 13,
    borderRadius: 13,
    marginBottom: 12,
  },
  feedbackTitle: {
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  feedbackText: {
    marginTop: 5,
    lineHeight: 20,
  },
  attachButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 13,
  },
  attachButtonText: {
    marginLeft: 7,
    fontWeight: '800',
  },
  formatsText: {
    marginTop: 7,
    textAlign: 'center',
  },
  selectedFile: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    borderWidth: 1,
    borderRadius: 13,
  },
  removeFile: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInput: {
    minHeight: 92,
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 13,
  },
  submitButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 13,
  },
  submitButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.65,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  statCard: {
    minWidth: 110,
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 92,
    padding: 11,
    borderWidth: 1,
    borderRadius: 13,
  },
  statValue: {
    marginTop: 4,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 2,
    fontWeight: '700',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 4,
  },
  filterChip: {
    minHeight: 39,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontWeight: '800',
  },
  noStudents: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noStudentsText: {
    marginTop: 8,
    textAlign: 'center',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '900',
  },
  studentInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  studentName: {
    flex: 1,
    fontWeight: '800',
  },
  studentState: {
    fontWeight: '800',
    textAlign: 'right',
  },
  deliveryDate: {
    marginTop: 3,
  },
  studentFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  studentFileText: {
    flex: 1,
    marginLeft: 6,
    fontWeight: '700',
  },
  textSubmission: {
    marginTop: 7,
    lineHeight: 17,
  },
  studentGrade: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },
  studentGradeText: {
    marginLeft: 5,
    fontWeight: '800',
  },
  reviewButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    borderRadius: 11,
  },
  reviewButtonText: {
    marginLeft: 7,
    color: '#FFFFFF',
    fontWeight: '900',
  },
});