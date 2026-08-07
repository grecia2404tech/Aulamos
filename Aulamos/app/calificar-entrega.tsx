import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { File, Paths } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
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
import { api, API_URL } from '../services/api';

type Parametro = string | string[] | undefined;

type ParametrosCalificacion = {
  id_entrega?: Parametro;
  id_actividad?: Parametro;
  nombre_alumno?: Parametro;
  titulo_actividad?: Parametro;
  materia?: Parametro;
  puntaje_maximo?: Parametro;
  fecha_entrega?: Parametro;
  estado_entrega?: Parametro;
  fuera_de_tiempo?: Parametro;
  texto_entrega?: Parametro;
  calificacion?: Parametro;
  retroalimentacion?: Parametro;
  nombre_archivo?: Parametro;
  tipo_archivo?: Parametro;
  url_archivo?: Parametro;
};

type RespuestaError = {
  mensaje?: string;
  error?: string;
};

type RespuestaCalificacion = {
  mensaje?: string;
  entrega?: {
    calificacion?: number;
    retroalimentacion?: string | null;
    estado?: string;
  };
};

type RespuestaPreguntaEvaluacion = {
  id_pregunta: number;
  orden: number;
  pregunta: string;
  tipo: string;
  puntaje: number;
  obligatoria: boolean;
  id_opcion?: number | null;
  respuesta?: string | null;
  respuesta_correcta?: string | null;
  es_correcta?: boolean | null;
  puntaje_obtenido?: number | null;
  pendiente_revision?: boolean;
};

type RespuestaEvaluacionEntrega = {
  mensaje?: string;
  es_evaluacion: boolean;
  entrega?: {
    calificacion?: number | null;
    retroalimentacion?: string | null;
  };
  evaluacion?: {
    total_preguntas?: number;
    puntaje_maximo?: number;
  };
  intento?: {
    requiere_revision?: boolean;
    puntaje_obtenido_automatico?: number;
    puntaje_total?: number;
  };
  respuestas?: RespuestaPreguntaEvaluacion[];
};

const obtenerParametro = (valor: Parametro) => {
  if (Array.isArray(valor)) {
    return valor[0] ?? '';
  }

  return valor ?? '';
};

const normalizarFecha = (fecha: string) => {
  if (!fecha) {
    return null;
  }

  const resultado = new Date(
    fecha.includes('T') ? fecha : fecha.replace(' ', 'T'),
  );

  return Number.isNaN(resultado.getTime()) ? null : resultado;
};

const mostrarFecha = (fecha: string) => {
  const valor = normalizarFecha(fecha);

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

const urlPublica = (ruta: string) => {
  if (!ruta) {
    return '';
  }

  if (/^https?:\/\//i.test(ruta)) {
    return ruta;
  }

  const servidor = API_URL.replace(/\/api\/?$/, '');

  return `${servidor}${ruta.startsWith('/') ? ruta : `/${ruta}`}`;
};

const obtenerExtension = (nombre: string) =>
  nombre.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';

const esImagen = (nombre: string, tipo: string) =>
  tipo.startsWith('image/') ||
  ['.png', '.jpg', '.jpeg'].includes(obtenerExtension(nombre));

const obtenerMime = (nombre: string, tipo: string) => {
  if (tipo) {
    return tipo;
  }

  const extension = obtenerExtension(nombre);

  const tipos: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.doc': 'application/msword',
    '.docx':
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  return tipos[extension] || 'application/octet-stream';
};

const limpiarNombreArchivo = (nombre: string) => {
  const limpio = nombre.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);

  return limpio || 'entrega';
};

const obtenerMensajeError = (error: unknown) => {
  if (axios.isAxiosError<RespuestaError>(error)) {
    return (
      error.response?.data?.mensaje ||
      error.response?.data?.error ||
      (error.code === 'ECONNABORTED'
        ? 'La solicitud tardó demasiado. Inténtalo nuevamente.'
        : 'No se pudo conectar con el servidor.')
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado.';
};

export default function CalificarEntregaScreen() {
  const parametros = useLocalSearchParams<ParametrosCalificacion>();

  const idEntrega = Number(obtenerParametro(parametros.id_entrega));

  const nombreAlumno = obtenerParametro(parametros.nombre_alumno) || 'Alumno';

  const tituloActividad =
    obtenerParametro(parametros.titulo_actividad) || 'Actividad';

  const materia = obtenerParametro(parametros.materia);

  const puntajeRecibido = Number(obtenerParametro(parametros.puntaje_maximo));

  const puntajeMaximo =
    Number.isFinite(puntajeRecibido) && puntajeRecibido > 0
      ? puntajeRecibido
      : 100;

  const fechaEntrega = obtenerParametro(parametros.fecha_entrega);

  const estadoInicial =
    obtenerParametro(parametros.estado_entrega) || 'Entregada';

  const fueraDeTiempo = obtenerParametro(parametros.fuera_de_tiempo) === '1';

  const textoEntrega = obtenerParametro(parametros.texto_entrega);

  const nombreArchivo = obtenerParametro(parametros.nombre_archivo);

  const tipoArchivo = obtenerParametro(parametros.tipo_archivo);

  const rutaArchivo = obtenerParametro(parametros.url_archivo);

  const archivoPublico = urlPublica(rutaArchivo);

  const tieneImagen = Boolean(
    archivoPublico && esImagen(nombreArchivo, tipoArchivo),
  );

  const [calificacion, setCalificacion] = useState(
    obtenerParametro(parametros.calificacion),
  );

  const [retroalimentacion, setRetroalimentacion] = useState(
    obtenerParametro(parametros.retroalimentacion),
  );

  const [estadoEntrega, setEstadoEntrega] = useState(estadoInicial);

  const [guardando, setGuardando] = useState(false);

  const [abriendo, setAbriendo] = useState(false);

  const [cargandoRespuestas, setCargandoRespuestas] = useState(true);

  const [errorRespuestas, setErrorRespuestas] = useState('');

  const [esEvaluacion, setEsEvaluacion] = useState<boolean | null>(null);

  const [respuestasEvaluacion, setRespuestasEvaluacion] = useState<
    RespuestaPreguntaEvaluacion[]
  >([]);

  const [requiereRevision, setRequiereRevision] = useState(false);

  const [puntajeAutomatico, setPuntajeAutomatico] = useState<number | null>(
    null,
  );

  const { width } = useWindowDimensions();

  const insets = useSafeAreaInsets();

  const { colores, escalaTexto, preferencias } = useAccessibility();

  const altoContraste = preferencias.altoContraste;

  const temaOscuro = preferencias.modoOscuro || altoContraste;

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

  const margenHorizontal = width < 360 ? 14 : 20;

  const anchoContenido = Math.min(width - margenHorizontal * 2, 620);

  const iniciales = nombreAlumno
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();

  const cargarRespuestasEvaluacion = useCallback(async () => {
    if (!Number.isInteger(idEntrega) || idEntrega <= 0) {
      setCargandoRespuestas(false);
      setErrorRespuestas(
        'No se recibió una entrega válida para consultar sus respuestas.',
      );
      return;
    }

    try {
      setCargandoRespuestas(true);
      setErrorRespuestas('');

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        throw new Error('No se encontró tu sesión. Inicia sesión nuevamente.');
      }

      const respuesta = await api.get<RespuestaEvaluacionEntrega>(
        `/academico/entregas/${idEntrega}/respuestas-evaluacion`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const datos = respuesta.data;

      setEsEvaluacion(Boolean(datos.es_evaluacion));

      setRespuestasEvaluacion(
        Array.isArray(datos.respuestas) ? datos.respuestas : [],
      );

      setRequiereRevision(Boolean(datos.intento?.requiere_revision));

      const automatico = Number(datos.intento?.puntaje_obtenido_automatico);

      setPuntajeAutomatico(Number.isFinite(automatico) ? automatico : null);

      if (
        datos.entrega?.calificacion !== null &&
        datos.entrega?.calificacion !== undefined
      ) {
        setCalificacion(String(datos.entrega.calificacion));
      }

      if (datos.entrega?.retroalimentacion) {
        setRetroalimentacion(datos.entrega.retroalimentacion);
      }
    } catch (error) {
      setErrorRespuestas(obtenerMensajeError(error));
      setEsEvaluacion(null);
      setRespuestasEvaluacion([]);
    } finally {
      setCargandoRespuestas(false);
    }
  }, [idEntrega]);

  useEffect(() => {
    void cargarRespuestasEvaluacion();
  }, [cargarRespuestasEvaluacion]);

  const abrirODescargarArchivo = async () => {
    if (!archivoPublico) {
      Alert.alert(
        'Sin archivo',
        'Esta entrega no contiene un archivo adjunto.',
      );
      return;
    }

    try {
      setAbriendo(true);

      if (Platform.OS === 'web') {
        await Linking.openURL(archivoPublico);
        return;
      }

      const nombreSeguro = limpiarNombreArchivo(nombreArchivo);

      const destino = new File(
        Paths.cache,
        `aulamos-${idEntrega}-${nombreSeguro}`,
      );

      const archivoDescargado = await File.downloadFileAsync(
        archivoPublico,
        destino,
        {
          idempotent: true,
        },
      );

      const compartirDisponible = await Sharing.isAvailableAsync();

      if (!compartirDisponible) {
        await Linking.openURL(archivoPublico);
        return;
      }

      await Sharing.shareAsync(archivoDescargado.uri, {
        dialogTitle: 'Abrir o guardar entrega',
        mimeType: obtenerMime(nombreArchivo, tipoArchivo),
      });
    } catch (error) {
      Alert.alert('No se pudo abrir el archivo', obtenerMensajeError(error));
    } finally {
      setAbriendo(false);
    }
  };

  const guardarCalificacion = async () => {
    const textoCalificacion = calificacion.trim().replace(',', '.');

    const valor = Number(textoCalificacion);

    if (!Number.isInteger(idEntrega) || idEntrega <= 0) {
      Alert.alert(
        'Entrega no válida',
        'No se recibió una entrega válida para calificar.',
      );
      return;
    }

    if (!textoCalificacion || !Number.isFinite(valor)) {
      Alert.alert('Calificación requerida', 'Escribe una calificación válida.');
      return;
    }

    if (valor < 0) {
      Alert.alert(
        'Calificación no válida',
        'La calificación no puede ser menor que cero.',
      );
      return;
    }

    if (valor > puntajeMaximo) {
      Alert.alert(
        'Calificación no válida',
        `La calificación no puede superar ${puntajeMaximo} puntos.`,
      );
      return;
    }

    if (retroalimentacion.trim().length > 5000) {
      Alert.alert(
        'Retroalimentación muy larga',
        'La retroalimentación no puede superar los 5000 caracteres.',
      );
      return;
    }

    try {
      setGuardando(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        throw new Error('No se encontró tu sesión. Inicia sesión nuevamente.');
      }

      const respuesta = await api.patch<RespuestaCalificacion>(
        `/academico/entregas/${idEntrega}/calificar`,
        {
          calificacion: valor,
          retroalimentacion: retroalimentacion.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setCalificacion(String(valor));
      setEstadoEntrega('Calificada');

      Alert.alert(
        'Calificación guardada',
        respuesta.data.mensaje || 'La entrega se calificó correctamente.',
        [
          {
            text: 'Volver a la actividad',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      Alert.alert('No se pudo guardar', obtenerMensajeError(error));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        {
          backgroundColor: colores.fondo,
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: 92 + Math.max(insets.bottom, 8),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, { width: anchoContenido }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.headerButton,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Regresar al detalle de la actividad"
            >
              <Ionicons name="arrow-back" size={23} color={colores.texto} />
            </TouchableOpacity>

            <View style={styles.headerTitle}>
              <Text
                style={[
                  styles.headerTitleText,
                  {
                    color: colores.texto,
                    fontSize: 20 * escalaTexto,
                  },
                ]}
                numberOfLines={1}
              >
                Calificar entrega
              </Text>

              <Text
                style={[
                  styles.headerSubtitle,
                  {
                    color: colores.textoSecundario,
                    fontSize: 11 * escalaTexto,
                  },
                ]}
              >
                Revisión del trabajo
              </Text>
            </View>

            <BotonAccesibilidad />
          </View>

          <View
            style={[
              styles.studentCard,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: colores.fondoPrimario,
                },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  {
                    color: colorPrincipal,
                    fontSize: 15 * escalaTexto,
                  },
                ]}
              >
                {iniciales}
              </Text>
            </View>

            <View style={styles.studentInfo}>
              <Text
                style={[
                  styles.studentName,
                  {
                    color: colores.texto,
                    fontSize: 16 * escalaTexto,
                  },
                ]}
              >
                {nombreAlumno}
              </Text>

              <Text
                style={[
                  styles.activityName,
                  {
                    color: colores.textoSecundario,
                    fontSize: 11 * escalaTexto,
                  },
                ]}
              >
                {tituloActividad}
                {materia ? ` · ${materia}` : ''}
              </Text>

              <View style={styles.deliveryMeta}>
                <Text
                  style={[
                    styles.deliveryState,
                    {
                      color:
                        estadoEntrega === 'Calificada'
                          ? colorExito
                          : colorPrincipal,
                      fontSize: 10 * escalaTexto,
                    },
                  ]}
                >
                  {estadoEntrega}
                </Text>

                {fueraDeTiempo ? (
                  <Text
                    style={[
                      styles.lateText,
                      {
                        fontSize: 10 * escalaTexto,
                      },
                    ]}
                  >
                    Fuera de tiempo
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Ionicons
                name="help-circle-outline"
                size={21}
                color={colorPrincipal}
              />

              <View style={styles.cardTitleBox}>
                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: colores.texto,
                      fontSize: 17 * escalaTexto,
                    },
                  ]}
                >
                  Preguntas y respuestas
                </Text>

                <Text
                  style={[
                    styles.cardCaption,
                    {
                      color: colores.textoSecundario,
                      fontSize: 10 * escalaTexto,
                    },
                  ]}
                >
                  Respuestas enviadas por el alumno
                </Text>
              </View>
            </View>

            {cargandoRespuestas ? (
              <View style={styles.loadingAnswers}>
                <ActivityIndicator size="small" color={colorPrincipal} />

                <Text
                  style={[
                    styles.answersMessage,
                    {
                      color: colores.textoSecundario,
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  Cargando preguntas y respuestas...
                </Text>
              </View>
            ) : errorRespuestas ? (
              <View
                style={[
                  styles.answersNotice,
                  {
                    borderColor: '#DC3438',
                    backgroundColor: temaOscuro
                      ? colores.fondoPrimario
                      : '#FFF1F2',
                  },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={22}
                  color="#DC3438"
                />

                <Text
                  style={[
                    styles.answersNoticeText,
                    {
                      color: colores.texto,
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  {errorRespuestas}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.retryButton,
                    {
                      backgroundColor: colorPrincipal,
                    },
                  ]}
                  onPress={() => void cargarRespuestasEvaluacion()}
                  accessibilityRole="button"
                  accessibilityLabel="Volver a cargar las respuestas"
                >
                  <Text
                    style={[
                      styles.retryButtonText,
                      {
                        fontSize: 11 * escalaTexto,
                      },
                    ]}
                  >
                    Reintentar
                  </Text>
                </TouchableOpacity>
              </View>
            ) : esEvaluacion === false ? (
              <View
                style={[
                  styles.answersNotice,
                  {
                    borderColor: colores.borde,
                    backgroundColor: colores.fondoPrimario,
                  },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={colores.textoSecundario}
                />

                <Text
                  style={[
                    styles.answersNoticeText,
                    {
                      color: colores.textoSecundario,
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  Esta entrega no corresponde a una evaluación con preguntas.
                </Text>
              </View>
            ) : respuestasEvaluacion.length === 0 ? (
              <View
                style={[
                  styles.answersNotice,
                  {
                    borderColor: colores.borde,
                    backgroundColor: colores.fondoPrimario,
                  },
                ]}
              >
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={22}
                  color={colores.textoSecundario}
                />

                <Text
                  style={[
                    styles.answersNoticeText,
                    {
                      color: colores.textoSecundario,
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  La evaluación no devolvió preguntas o respuestas guardadas.
                </Text>
              </View>
            ) : (
              <>
                <View
                  style={[
                    styles.answersSummary,
                    {
                      backgroundColor: colores.fondoPrimario,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.answersSummaryText,
                      {
                        color: colores.texto,
                        fontSize: 11 * escalaTexto,
                      },
                    ]}
                  >
                    {respuestasEvaluacion.length}{' '}
                    {respuestasEvaluacion.length === 1
                      ? 'pregunta'
                      : 'preguntas'}
                    {puntajeAutomatico !== null
                      ? ` · Puntaje automático: ${puntajeAutomatico}`
                      : ''}
                  </Text>

                  {requiereRevision ? (
                    <Text
                      style={[
                        styles.reviewPendingText,
                        {
                          fontSize: 10 * escalaTexto,
                        },
                      ]}
                    >
                      Requiere revisión manual
                    </Text>
                  ) : null}
                </View>

                {respuestasEvaluacion.map((respuesta, indice) => {
                  const tieneRespuesta = Boolean(respuesta.respuesta?.trim());

                  const estadoRespuesta =
                    respuesta.es_correcta === true
                      ? 'Correcta'
                      : respuesta.es_correcta === false
                        ? 'Incorrecta'
                        : tieneRespuesta
                          ? 'Pendiente de revisión'
                          : 'Sin responder';

                  const colorEstado =
                    respuesta.es_correcta === true
                      ? colorExito
                      : respuesta.es_correcta === false
                        ? '#DC3438'
                        : respuesta.pendiente_revision || tieneRespuesta
                          ? '#B56A00'
                          : colores.textoSecundario;

                  return (
                    <View
                      key={respuesta.id_pregunta || indice}
                      style={[
                        styles.questionBox,
                        {
                          borderColor: colores.borde,
                          backgroundColor: colores.fondoPrimario,
                        },
                      ]}
                    >
                      <View style={styles.questionHeader}>
                        <Text
                          style={[
                            styles.questionNumber,
                            {
                              color: colorPrincipal,
                              fontSize: 11 * escalaTexto,
                            },
                          ]}
                        >
                          Pregunta {respuesta.orden || indice + 1}
                        </Text>

                        <Text
                          style={[
                            styles.questionPoints,
                            {
                              color: colores.textoSecundario,
                              fontSize: 10 * escalaTexto,
                            },
                          ]}
                        >
                          {respuesta.puntaje_obtenido !== null &&
                          respuesta.puntaje_obtenido !== undefined
                            ? `${respuesta.puntaje_obtenido} / `
                            : ''}
                          {respuesta.puntaje} pts.
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.questionText,
                          {
                            color: colores.texto,
                            fontSize: 13 * escalaTexto,
                          },
                        ]}
                      >
                        {respuesta.pregunta || 'Pregunta sin texto'}
                      </Text>

                      <Text
                        style={[
                          styles.answerLabel,
                          {
                            color: colores.textoSecundario,
                            fontSize: 9 * escalaTexto,
                          },
                        ]}
                      >
                        RESPUESTA DEL ALUMNO
                      </Text>

                      <Text
                        style={[
                          styles.answerText,
                          {
                            color: tieneRespuesta
                              ? colores.texto
                              : colores.textoSecundario,
                            fontSize: 12 * escalaTexto,
                          },
                        ]}
                      >
                        {respuesta.respuesta || 'Sin respuesta'}
                      </Text>

                      {respuesta.respuesta_correcta &&
                      respuesta.es_correcta !== true ? (
                        <View style={styles.correctAnswerBox}>
                          <Text
                            style={[
                              styles.answerLabel,
                              {
                                color: colorExito,
                                fontSize: 9 * escalaTexto,
                              },
                            ]}
                          >
                            RESPUESTA CORRECTA
                          </Text>

                          <Text
                            style={[
                              styles.answerText,
                              {
                                color: colores.texto,
                                fontSize: 12 * escalaTexto,
                              },
                            ]}
                          >
                            {respuesta.respuesta_correcta}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.answerStatusRow}>
                        <Ionicons
                          name={
                            respuesta.es_correcta === true
                              ? 'checkmark-circle'
                              : respuesta.es_correcta === false
                                ? 'close-circle'
                                : 'time-outline'
                          }
                          size={17}
                          color={colorEstado}
                        />

                        <Text
                          style={[
                            styles.answerStatusText,
                            {
                              color: colorEstado,
                              fontSize: 10 * escalaTexto,
                            },
                          ]}
                        >
                          {estadoRespuesta}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Ionicons
                name="document-text-outline"
                size={21}
                color={colorPrincipal}
              />

              <View style={styles.cardTitleBox}>
                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: colores.texto,
                      fontSize: 17 * escalaTexto,
                    },
                  ]}
                >
                  Trabajo entregado
                </Text>

                <Text
                  style={[
                    styles.cardCaption,
                    {
                      color: colores.textoSecundario,
                      fontSize: 10 * escalaTexto,
                    },
                  ]}
                >
                  {mostrarFecha(fechaEntrega)}
                </Text>
              </View>
            </View>

            {textoEntrega ? (
              <View
                style={[
                  styles.commentBox,
                  {
                    backgroundColor: colores.fondoPrimario,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.commentLabel,
                    {
                      color: colores.textoSecundario,
                      fontSize: 10 * escalaTexto,
                    },
                  ]}
                >
                  COMENTARIO DEL ALUMNO
                </Text>

                <Text
                  style={[
                    styles.commentText,
                    {
                      color: colores.texto,
                      fontSize: 13 * escalaTexto,
                    },
                  ]}
                >
                  {textoEntrega}
                </Text>
              </View>
            ) : null}

            {tieneImagen ? (
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: colores.fondoPrimario,
                    borderColor: colores.borde,
                  },
                ]}
              >
                <Image
                  source={{
                    uri: archivoPublico,
                  }}
                  style={styles.previewImage}
                  resizeMode="contain"
                  accessibilityLabel={`Vista previa de ${nombreArchivo}`}
                />
              </View>
            ) : null}

            {archivoPublico ? (
              <View
                style={[
                  styles.fileRow,
                  {
                    borderColor: colores.borde,
                    backgroundColor: colores.fondoPrimario,
                  },
                ]}
              >
                <View
                  style={[
                    styles.fileIcon,
                    {
                      backgroundColor: temaOscuro ? colores.tarjeta : '#EAF1FF',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      tieneImagen ? 'image-outline' : 'document-attach-outline'
                    }
                    size={24}
                    color={colorPrincipal}
                  />
                </View>

                <View style={styles.fileInfo}>
                  <Text
                    style={[
                      styles.fileName,
                      {
                        color: colores.texto,
                        fontSize: 12 * escalaTexto,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {nombreArchivo || 'Archivo de entrega'}
                  </Text>

                  <Text
                    style={[
                      styles.fileType,
                      {
                        color: colores.textoSecundario,
                        fontSize: 10 * escalaTexto,
                      },
                    ]}
                  >
                    {tipoArchivo || 'Documento adjunto'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.openButton,
                    {
                      backgroundColor: colorPrincipal,
                    },
                  ]}
                  onPress={() => void abrirODescargarArchivo()}
                  disabled={abriendo}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir o guardar ${nombreArchivo}`}
                >
                  {abriendo ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="open-outline" size={19} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noFileBox}>
                <Ionicons
                  name="document-outline"
                  size={21}
                  color={colores.textoSecundario}
                />

                <Text
                  style={[
                    styles.noFileText,
                    {
                      color: colores.textoSecundario,
                      fontSize: 11 * escalaTexto,
                    },
                  ]}
                >
                  El alumno realizó una entrega sin archivo adjunto.
                </Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Ionicons
                name="ribbon-outline"
                size={21}
                color={colorPrincipal}
              />

              <View style={styles.cardTitleBox}>
                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: colores.texto,
                      fontSize: 17 * escalaTexto,
                    },
                  ]}
                >
                  Calificación
                </Text>

                <Text
                  style={[
                    styles.cardCaption,
                    {
                      color: colores.textoSecundario,
                      fontSize: 10 * escalaTexto,
                    },
                  ]}
                >
                  Puntaje máximo: {puntajeMaximo}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.inputLabel,
                {
                  color: colores.texto,
                  fontSize: 12 * escalaTexto,
                },
              ]}
            >
              Puntos obtenidos
            </Text>

            <View style={styles.gradeInputRow}>
              <TextInput
                style={[
                  styles.gradeInput,
                  {
                    color: colores.texto,
                    borderColor: colores.borde,
                    backgroundColor: colores.fondoPrimario,
                    fontSize: 20 * escalaTexto,
                  },
                ]}
                value={calificacion}
                onChangeText={setCalificacion}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colores.textoSecundario}
                maxLength={8}
                editable={!guardando}
                accessibilityLabel={`Calificación de cero a ${puntajeMaximo}`}
              />

              <Text
                style={[
                  styles.gradeMaximum,
                  {
                    color: colores.textoSecundario,
                    fontSize: 15 * escalaTexto,
                  },
                ]}
              >
                / {puntajeMaximo}
              </Text>
            </View>

            <Text
              style={[
                styles.inputLabel,
                styles.feedbackLabel,
                {
                  color: colores.texto,
                  fontSize: 12 * escalaTexto,
                },
              ]}
            >
              Retroalimentación
            </Text>

            <TextInput
              style={[
                styles.feedbackInput,
                {
                  color: colores.texto,
                  borderColor: colores.borde,
                  backgroundColor: colores.fondoPrimario,
                  fontSize: 13 * escalaTexto,
                },
              ]}
              value={retroalimentacion}
              onChangeText={setRetroalimentacion}
              placeholder="Escribe comentarios para ayudar al alumno a mejorar..."
              placeholderTextColor={colores.textoSecundario}
              multiline
              textAlignVertical="top"
              maxLength={5000}
              editable={!guardando}
              accessibilityLabel="Retroalimentación para el alumno"
            />

            <Text
              style={[
                styles.characterCount,
                {
                  color: colores.textoSecundario,
                  fontSize: 9 * escalaTexto,
                },
              ]}
            >
              {retroalimentacion.length}
              /5000
            </Text>

            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: colorPrincipal,
                },
                guardando && styles.disabledButton,
              ]}
              onPress={() => void guardarCalificacion()}
              disabled={guardando}
              accessibilityRole="button"
              accessibilityLabel={
                estadoEntrega === 'Calificada'
                  ? 'Actualizar calificación'
                  : 'Guardar calificación'
              }
            >
              {guardando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color="#FFFFFF"
                />
              )}

              <Text
                style={[
                  styles.saveButtonText,
                  {
                    fontSize: 13 * escalaTexto,
                  },
                ]}
              >
                {guardando
                  ? 'Guardando...'
                  : estadoEntrega === 'Calificada'
                    ? 'Actualizar calificación'
                    : 'Guardar calificación'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomNavigation,
          {
            minHeight: 68 + Math.max(insets.bottom, 5),
            paddingBottom: Math.max(insets.bottom, 5),
            backgroundColor: colores.tarjeta,
            borderTopColor: colores.borde,
          },
        ]}
        accessibilityRole="tablist"
      >
        <BottomItem
          icon="home-outline"
          activeIcon="home"
          label="Inicio"
          onPress={() => router.replace('/inicio-docente' as never)}
        />

        <BottomItem
          icon="book-outline"
          activeIcon="book"
          label="Recursos"
          onPress={() => router.push('/crear-recurso' as never)}
        />

        <BottomItem
          icon="reader-outline"
          activeIcon="reader"
          label="Actividades"
          active
          onPress={() => router.replace('/actividades-docente' as never)}
        />

        <BottomItem
          icon="document-text-outline"
          activeIcon="document-text"
          label="Evaluaciones"
          onPress={() => router.push('/crear-evaluacion' as never)}
        />

        <BottomItem
          icon="menu-outline"
          activeIcon="menu"
          label="Más"
          onPress={() => router.push('/menu-docente' as never)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

type BottomItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
};

function BottomItem({
  icon,
  activeIcon,
  label,
  active = false,
  onPress,
}: BottomItemProps) {
  const { colores, escalaTexto, preferencias } = useAccessibility();

  const colorActivo = preferencias.altoContraste
    ? colores.primario
    : preferencias.modoOscuro
      ? '#749ccc'
      : '#2563EB';

  return (
    <TouchableOpacity
      style={styles.bottomItem}
      onPress={onPress}
      activeOpacity={0.7}
      focusable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.bottomIconContainer,
          active && {
            backgroundColor: colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={active ? activeIcon : icon}
          size={21}
          color={active ? colorActivo : colores.textoSecundario}
        />
      </View>

      <Text
        style={[
          styles.bottomLabel,
          {
            color: active ? colorActivo : colores.textoSecundario,
            fontSize: 8 * escalaTexto,
            lineHeight: 10 * escalaTexto,
          },
          active && styles.bottomLabelActive,
        ]}
        numberOfLines={2}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  content: {
    alignSelf: 'center',
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
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 2,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 18,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '900',
  },
  studentInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },
  studentName: {
    fontWeight: '900',
  },
  activityName: {
    marginTop: 3,
    lineHeight: 17,
  },
  deliveryMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },
  deliveryState: {
    fontWeight: '900',
  },
  lateText: {
    color: '#DC3438',
    fontWeight: '800',
  },
  card: {
    marginTop: 12,
    padding: 17,
    borderWidth: 1,
    borderRadius: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitleBox: {
    flex: 1,
    marginLeft: 9,
  },
  cardTitle: {
    fontWeight: '900',
  },
  cardCaption: {
    marginTop: 2,
  },
  commentBox: {
    padding: 13,
    borderRadius: 13,
    marginBottom: 12,
  },
  commentLabel: {
    fontWeight: '900',
  },
  commentText: {
    marginTop: 6,
    lineHeight: 20,
  },
  previewBox: {
    width: '100%',
    height: 310,
    borderWidth: 1,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  fileRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    borderWidth: 1,
    borderRadius: 14,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 10,
  },
  fileName: {
    fontWeight: '800',
  },
  fileType: {
    marginTop: 3,
  },
  openButton: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noFileBox: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noFileText: {
    flex: 1,
  },
  loadingAnswers: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answersMessage: {
    marginLeft: 9,
  },
  answersNotice: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 13,
  },
  answersNoticeText: {
    flex: 1,
    marginHorizontal: 9,
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  answersSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    marginBottom: 10,
  },
  answersSummaryText: {
    fontWeight: '800',
  },
  reviewPendingText: {
    color: '#B56A00',
    fontWeight: '900',
  },
  questionBox: {
    padding: 13,
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 10,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  questionNumber: {
    flex: 1,
    fontWeight: '900',
  },
  questionPoints: {
    fontWeight: '800',
  },
  questionText: {
    marginTop: 9,
    lineHeight: 20,
    fontWeight: '800',
  },
  answerLabel: {
    marginTop: 13,
    fontWeight: '900',
  },
  answerText: {
    marginTop: 5,
    lineHeight: 19,
  },
  correctAnswerBox: {
    marginTop: 2,
  },
  answerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  answerStatusText: {
    marginLeft: 6,
    fontWeight: '900',
  },
  inputLabel: {
    fontWeight: '800',
    marginBottom: 7,
  },
  gradeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeInput: {
    width: 120,
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  gradeMaximum: {
    marginLeft: 10,
    fontWeight: '800',
  },
  feedbackLabel: {
    marginTop: 18,
  },
  feedbackInput: {
    minHeight: 128,
    padding: 13,
    borderWidth: 1,
    borderRadius: 13,
    lineHeight: 20,
  },
  characterCount: {
    marginTop: 5,
    textAlign: 'right',
  },
  saveButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    borderRadius: 13,
  },
  saveButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.65,
  },
  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 6,
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#111827',
        shadowOffset: {
          width: 0,
          height: -3,
        },
        shadowOpacity: 0.08,
        shadowRadius: 9,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  bottomItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomIconContainer: {
    width: 36,
    height: 29,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomLabel: {
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '700',
  },
  bottomLabelActive: {
    fontWeight: '900',
  },
});