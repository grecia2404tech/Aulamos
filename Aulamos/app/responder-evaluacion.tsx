import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type Opcion = {
  id_opcion: number;
  id_pregunta: number;
  texto: string;
  orden: number;
};

type Pregunta = {
  id_pregunta: number;
  texto: string;
  tipo:
    | 'OpcionMultiple'
    | 'VerdaderoFalso'
    | 'RespuestaCorta';
  puntaje: number | string;
  obligatoria: boolean;
  orden: number;
  opciones: Opcion[];
};

type Evaluacion = {
  id_evaluacion: number;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  fecha_limite: string;
  puntaje_maximo: number | string;
  curso: string;
  materia: string;
  grupo: string;
  grado: string | number | null;
  configuracion_evaluacion: {
    duracion_minutos?: number;
    intentos_permitidos?: number;
    mostrar_resultado?: boolean;
    total_preguntas?: number;
  };
  preguntas: Pregunta[];
};

type RespuestaDetalle = {
  evaluacion?: Evaluacion;
  intentos_realizados?: number;
  intentos_disponibles?: number;
  puede_responder?: boolean;
  vencida?: boolean;
  mensaje?: string;
};

type RespuestaEnvio = {
  mensaje?: string;
  requiere_revision?: boolean;
  resultado?: {
    puntaje_obtenido: number;
    puntaje_total: number;
    calificacion: number;
  } | null;
};

type RespuestaLocal = {
  id_opcion?: number;
  respuesta_texto?: string;
};

const AZUL = '#2D5BFF';
const AZUL_OSCURO = '#1739B7';
const AZUL_SUAVE = '#EEF3FF';
const MORADO_ACCESIBILIDAD = '#6D28D9';
const ROJO = '#D9363E';

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

const mostrarFecha = (fecha: string) => {
  const valor = new Date(
    fecha.includes('T')
      ? fecha
      : fecha.replace(' ', 'T'),
  );

  if (Number.isNaN(valor.getTime())) {
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

export default function ResponderEvaluacionScreen() {
  const parametros = useLocalSearchParams<{
    id_evaluacion?: string | string[];
  }>();

  const parametroId = Array.isArray(
    parametros.id_evaluacion,
  )
    ? parametros.id_evaluacion[0]
    : parametros.id_evaluacion;

  const idEvaluacion = Number(parametroId);

  const { width } = useWindowDimensions();

  const {
    preferencias,
    colores,
    escalaTexto,
    leerTexto,
  } = useAccessibility();

  const [detalle, setDetalle] =
    useState<RespuestaDetalle | null>(null);

  const [respuestas, setRespuestas] =
    useState<Record<number, RespuestaLocal>>(
      {},
    );

  const [cargando, setCargando] =
    useState(true);

  const [enviando, setEnviando] =
    useState(false);

  const margen = width < 370 ? 14 : 20;

  const anchoContenido = Math.min(
    width - margen * 2,
    600,
  );

  const evaluacion = detalle?.evaluacion;

  const respondidas = useMemo(() => {
    if (!evaluacion) {
      return 0;
    }

    return evaluacion.preguntas.filter(
      (pregunta) => {
        const respuesta =
          respuestas[pregunta.id_pregunta];

        if (
          pregunta.tipo ===
          'RespuestaCorta'
        ) {
          return Boolean(
            respuesta?.respuesta_texto?.trim(),
          );
        }

        return Boolean(
          respuesta?.id_opcion,
        );
      },
    ).length;
  }, [evaluacion, respuestas]);

  const anunciar = (texto: string) => {
    if (preferencias.lectorPantalla) {
      leerTexto(texto);
    }
  };

  useEffect(() => {
    const cargarEvaluacion = async () => {
      if (
        !Number.isInteger(idEvaluacion) ||
        idEvaluacion <= 0
      ) {
        Alert.alert(
          'Evaluación inválida',
          'No se recibió una evaluación válida.',
        );

        setCargando(false);
        return;
      }

      try {
        const token =
          await AsyncStorage.getItem('token');

        if (!token) {
          throw new Error(
            'No se encontró tu sesión. Inicia sesión nuevamente.',
          );
        }

        const respuesta = await fetch(
          `${API_URL}/evaluaciones/alumno/${idEvaluacion}`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const datos =
          await leerRespuesta<RespuestaDetalle>(
            respuesta,
          );

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje ||
              'No se pudo abrir la evaluación.',
          );
        }

        if (!datos.evaluacion) {
          throw new Error(
            'El servidor no devolvió la información de la evaluación.',
          );
        }

        /*
         * Evita errores si el servidor no
         * devuelve el arreglo de preguntas.
         */
        const evaluacionNormalizada = {
          ...datos.evaluacion,
          preguntas: Array.isArray(
            datos.evaluacion.preguntas,
          )
            ? datos.evaluacion.preguntas
            : [],
        };

        setDetalle({
          ...datos,
          evaluacion: evaluacionNormalizada,
        });

        if (
          preferencias.lectorPantalla
        ) {
          leerTexto(
            `${evaluacionNormalizada.titulo}. ${evaluacionNormalizada.preguntas.length} preguntas.`,
          );
        }
      } catch (error) {
        Alert.alert(
          'No se pudo abrir',
          error instanceof Error
            ? error.message
            : 'Ocurrió un error.',
        );
      } finally {
        setCargando(false);
      }
    };

    void cargarEvaluacion();
  }, [idEvaluacion]);

  const seleccionarOpcion = (
    idPregunta: number,
    idOpcion: number,
  ) => {
    setRespuestas((actuales) => ({
      ...actuales,
      [idPregunta]: {
        id_opcion: idOpcion,
      },
    }));

    anunciar('Respuesta seleccionada.');
  };

  const escribirRespuesta = (
    idPregunta: number,
    texto: string,
  ) => {
    setRespuestas((actuales) => ({
      ...actuales,
      [idPregunta]: {
        respuesta_texto: texto,
      },
    }));
  };

  const validarRespuestas = () => {
    if (!evaluacion) {
      return 'No se encontró la evaluación.';
    }

    if (evaluacion.preguntas.length === 0) {
      return (
        'La evaluación no tiene preguntas ' +
        'guardadas. El docente debe publicarla nuevamente.'
      );
    }

    for (
      const pregunta of evaluacion.preguntas
    ) {
      if (!pregunta.obligatoria) {
        continue;
      }

      const respuesta =
        respuestas[pregunta.id_pregunta];

      const estaVacia =
        pregunta.tipo ===
        'RespuestaCorta'
          ? !respuesta?.respuesta_texto?.trim()
          : !respuesta?.id_opcion;

      if (estaVacia) {
        return `Responde la pregunta ${pregunta.orden}.`;
      }
    }

    return null;
  };

  const confirmarEnvio = () => {
    const error = validarRespuestas();

    if (error) {
      Alert.alert(
        'Faltan respuestas',
        error,
      );

      anunciar(error);
      return;
    }

    Alert.alert(
      'Enviar evaluación',
      'Después de enviarla no podrás modificar este intento. ¿Deseas continuar?',
      [
        {
          text: 'Revisar',
          style: 'cancel',
        },
        {
          text: 'Enviar',
          onPress: () => void enviar(),
        },
      ],
    );
  };

  const enviar = async () => {
    if (!evaluacion || enviando) {
      return;
    }

    try {
      setEnviando(true);

      const token =
        await AsyncStorage.getItem('token');

      if (!token) {
        throw new Error(
          'No se encontró tu sesión. Inicia sesión nuevamente.',
        );
      }

      const respuesta = await fetch(
        `${API_URL}/evaluaciones/alumno/${idEvaluacion}/respuestas`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type':
              'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            respuestas:
              evaluacion.preguntas.map(
                (pregunta) => ({
                  id_pregunta:
                    pregunta.id_pregunta,

                  id_opcion:
                    respuestas[
                      pregunta.id_pregunta
                    ]?.id_opcion ?? null,

                  respuesta_texto:
                    respuestas[
                      pregunta.id_pregunta
                    ]?.respuesta_texto?.trim() ??
                    null,
                }),
              ),
          }),
        },
      );

      const datos =
        await leerRespuesta<RespuestaEnvio>(
          respuesta,
        );

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            'No se pudieron enviar las respuestas.',
        );
      }

      const resultado = datos.resultado;

      const detalleResultado = resultado
        ? `\n\nPuntaje: ${resultado.puntaje_obtenido} de ${resultado.puntaje_total}\nCalificación: ${resultado.calificacion}%`
        : '';

      Alert.alert(
        datos.requiere_revision
          ? 'Respuestas enviadas'
          : 'Evaluación terminada',
        `${
          datos.mensaje ??
          'Tus respuestas se enviaron.'
        }${detalleResultado}`,
        [
          {
            text: 'Aceptar',
            onPress: () =>
              router.replace(
                '/evaluaciones-alumno' as never,
              ),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'No se pudo enviar',
        error instanceof Error
          ? error.message
          : 'Ocurrió un error.',
      );
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <SafeAreaView
        style={[
          styles.center,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
      >
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
          Abriendo evaluación...
        </Text>
      </SafeAreaView>
    );
  }

  if (!evaluacion) {
    return (
      <SafeAreaView
        style={[
          styles.center,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={50}
          color={ROJO}
        />

        <Text
          style={[
            styles.emptyTitle,
            { color: colores.texto },
          ]}
        >
          No se pudo mostrar la evaluación
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>
            Regresar
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const sinPreguntas =
    evaluacion.preguntas.length === 0;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colores.fondo },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor:
                colores.fondo,
              borderBottomColor:
                colores.borde,
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
              size={25}
              color={colores.texto}
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text
              numberOfLines={1}
              style={[
                styles.headerTitle,
                {
                  color: colores.texto,
                  fontSize:
                    18 * escalaTexto,
                },
              ]}
            >
              Resolver evaluación
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                {
                  color:
                    colores.textoSecundario,
                },
              ]}
            >
              {respondidas} de{' '}
              {evaluacion.preguntas.length}{' '}
              respondidas
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.accessibilityButton
            }
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

        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor:
                colores.borde,
            },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${
                  evaluacion.preguntas.length
                    ? (respondidas /
                        evaluacion.preguntas
                          .length) *
                      100
                    : 0
                }%`,
              },
            ]}
          />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.scroll
          }
        >
          <View
            style={[
              styles.content,
              { width: anchoContenido },
            ]}
          >
            <View style={styles.titleCard}>
              <Text style={styles.subject}>
                {evaluacion.materia.toUpperCase()}
              </Text>

              <Text
                style={[
                  styles.title,
                  {
                    color: colores.texto,
                    fontSize:
                      21 * escalaTexto,
                  },
                ]}
              >
                {evaluacion.titulo}
              </Text>

              {!!evaluacion.descripcion && (
                <Text
                  style={[
                    styles.description,
                    {
                      color:
                        colores.textoSecundario,
                    },
                  ]}
                >
                  {evaluacion.descripcion}
                </Text>
              )}

              <View style={styles.metaRow}>
                <Meta
                  icon="time-outline"
                  text={`${
                    evaluacion
                      .configuracion_evaluacion
                      ?.duracion_minutos ?? 60
                  } min`}
                />

                <Meta
                  icon="trophy-outline"
                  text={`${evaluacion.puntaje_maximo} pts`}
                />

                <Meta
                  icon="refresh-outline"
                  text={`${
                    detalle?.intentos_disponibles ??
                    0
                  } intentos`}
                />
              </View>

              <View
                style={styles.deadlineRow}
              >
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={AZUL}
                />

                <Text
                  style={styles.deadlineText}
                >
                  Límite:{' '}
                  {mostrarFecha(
                    evaluacion.fecha_limite,
                  )}
                </Text>
              </View>

              {!!evaluacion.instrucciones && (
                <View
                  style={
                    styles.instructionsBox
                  }
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={AZUL}
                  />

                  <Text
                    style={
                      styles.instructionsText
                    }
                  >
                    {evaluacion.instrucciones}
                  </Text>
                </View>
              )}
            </View>

            {sinPreguntas && (
              <View style={styles.blockedBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={22}
                  color={ROJO}
                />

                <Text
                  style={styles.blockedText}
                >
                  Esta evaluación no tiene
                  preguntas guardadas. El docente
                  debe crearla o publicarla
                  nuevamente.
                </Text>
              </View>
            )}

            {!sinPreguntas &&
              !detalle?.puede_responder && (
                <View
                  style={styles.blockedBox}
                >
                  <Ionicons
                    name={
                      detalle?.vencida
                        ? 'time-outline'
                        : 'lock-closed-outline'
                    }
                    size={22}
                    color={ROJO}
                  />

                  <Text
                    style={
                      styles.blockedText
                    }
                  >
                    {detalle?.vencida
                      ? 'La fecha límite ya terminó.'
                      : 'Ya utilizaste los intentos permitidos.'}
                  </Text>
                </View>
              )}

            {evaluacion.preguntas.map(
              (pregunta, indice) => (
                <View
                  key={pregunta.id_pregunta}
                  style={[
                    styles.questionCard,
                    {
                      backgroundColor:
                        colores.tarjeta,
                      borderColor:
                        colores.borde,
                    },
                  ]}
                >
                  <View
                    style={styles.questionTop}
                  >
                    <View
                      style={
                        styles.questionNumber
                      }
                    >
                      <Text
                        style={
                          styles.questionNumberText
                        }
                      >
                        {indice + 1}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.questionText,
                        {
                          color:
                            colores.texto,
                          fontSize:
                            15 *
                            escalaTexto,
                        },
                      ]}
                    >
                      {pregunta.texto}
                      {pregunta.obligatoria && (
                        <Text
                          style={
                            styles.required
                          }
                        >
                          {' '}
                          *
                        </Text>
                      )}
                    </Text>

                    <View
                      style={
                        styles.pointsChip
                      }
                    >
                      <Text
                        style={
                          styles.pointsText
                        }
                      >
                        {pregunta.puntaje} pts
                      </Text>
                    </View>
                  </View>

                  {pregunta.tipo ===
                  'RespuestaCorta' ? (
                    <TextInput
                      value={
                        respuestas[
                          pregunta.id_pregunta
                        ]?.respuesta_texto ??
                        ''
                      }
                      onChangeText={(texto) =>
                        escribirRespuesta(
                          pregunta.id_pregunta,
                          texto,
                        )
                      }
                      editable={Boolean(
                        detalle?.puede_responder,
                      )}
                      multiline
                      maxLength={2000}
                      placeholder="Escribe tu respuesta"
                      placeholderTextColor={
                        colores.textoSecundario
                      }
                      style={[
                        styles.answerInput,
                        {
                          color:
                            colores.texto,
                          backgroundColor:
                            colores.fondo,
                          borderColor:
                            colores.borde,
                        },
                      ]}
                    />
                  ) : (
                    <View
                      style={styles.options}
                    >
                      {pregunta.opciones.map(
                        (opcion) => {
                          const seleccionada =
                            respuestas[
                              pregunta
                                .id_pregunta
                            ]?.id_opcion ===
                            opcion.id_opcion;

                          return (
                            <TouchableOpacity
                              key={
                                opcion.id_opcion
                              }
                              style={[
                                styles.option,
                                {
                                  backgroundColor:
                                    seleccionada
                                      ? AZUL_SUAVE
                                      : colores.fondo,
                                  borderColor:
                                    seleccionada
                                      ? AZUL
                                      : colores.borde,
                                },
                              ]}
                              onPress={() =>
                                seleccionarOpcion(
                                  pregunta.id_pregunta,
                                  opcion.id_opcion,
                                )
                              }
                              disabled={
                                !detalle?.puede_responder
                              }
                              accessibilityRole="radio"
                              accessibilityState={{
                                checked:
                                  seleccionada,
                                disabled:
                                  !detalle?.puede_responder,
                              }}
                            >
                              <Ionicons
                                name={
                                  seleccionada
                                    ? 'radio-button-on'
                                    : 'radio-button-off'
                                }
                                size={22}
                                color={
                                  seleccionada
                                    ? AZUL
                                    : '#94A3B8'
                                }
                              />

                              <Text
                                style={[
                                  styles.optionText,
                                  {
                                    color:
                                      seleccionada
                                        ? AZUL_OSCURO
                                        : colores.texto,
                                  },
                                ]}
                              >
                                {opcion.texto}
                              </Text>
                            </TouchableOpacity>
                          );
                        },
                      )}
                    </View>
                  )}
                </View>
              ),
            )}

            {detalle?.puede_responder &&
            !sinPreguntas ? (
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  enviando &&
                    styles.disabled,
                ]}
                onPress={confirmarEnvio}
                disabled={enviando}
                accessibilityRole="button"
                accessibilityLabel="Enviar respuestas"
              >
                {enviando ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="paper-plane"
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.submitText
                      }
                    >
                      Enviar respuestas
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                accessibilityRole="button"
              >
                <Text
                  style={
                    styles.backButtonText
                  }
                >
                  Regresar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Meta({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons
        name={icon}
        size={15}
        color={AZUL}
      />

      <Text style={styles.metaText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },
  header: {
    minHeight: 72,
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
    paddingHorizontal: 5,
  },
  headerTitle: {
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 10,
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
  progressTrack: {
    height: 4,
    width: '100%',
  },
  progressFill: {
    height: 4,
    backgroundColor: AZUL,
  },
  scroll: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingBottom: 42,
  },
  content: {
    paddingHorizontal: 1,
  },
  titleCard: {
    backgroundColor: AZUL_SUAVE,
    borderWidth: 1,
    borderColor: '#CFDAFF',
    borderRadius: 20,
    padding: 17,
    marginBottom: 14,
  },
  subject: {
    color: AZUL,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  title: {
    fontWeight: '900',
    lineHeight: 27,
    marginTop: 5,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 13,
  },
  metaItem: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  metaText: {
    color: AZUL_OSCURO,
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 4,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
  },
  deadlineText: {
    color: AZUL_OSCURO,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 11,
    marginTop: 12,
  },
  instructionsText: {
    flex: 1,
    color: '#3E527F',
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 7,
  },
  blockedBox: {
    backgroundColor: '#FFF0F1',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    marginBottom: 13,
  },
  blockedText: {
    flex: 1,
    color: '#922B32',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  questionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderTopWidth: 4,
    borderTopColor: AZUL,
  },
  questionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  questionNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: AZUL,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  questionNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  questionText: {
    flex: 1,
    fontWeight: '800',
    lineHeight: 21,
  },
  required: {
    color: ROJO,
  },
  pointsChip: {
    backgroundColor: AZUL_SUAVE,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginLeft: 6,
  },
  pointsText: {
    color: AZUL_OSCURO,
    fontSize: 9,
    fontWeight: '900',
  },
  options: {
    marginTop: 13,
  },
  option: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginLeft: 9,
  },
  answerInput: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 13,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: AZUL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.55,
  },
  backButton: {
    minWidth: 160,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: AZUL,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});