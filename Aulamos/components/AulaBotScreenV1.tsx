import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccessibility } from '../contexts/AccessibilityContext';

import {
  activarConversacionChatbot,
  enviarMensajeChatbot,
  iniciarNuevaConversacionChatbot,
  listarConversacionesChatbot,
  obtenerHistorialChatbot,
  regenerarRespuestaChatbot,
  valorarRespuestaChatbot,
  type AccionChatbot,
  type ConversacionChatbot,
  type InteraccionChatbot,
  type RolChatbot,
  type UtilidadChatbot,
} from '../services/chatbot';

type Mensaje = {
  id: string;
  autor: 'usuario' | 'bot';
  texto: string;
  idMensaje?: number;
  utilidad?: UtilidadChatbot | null;
  acciones?: AccionChatbot[];
  error?: boolean;
};

const ROLES: RolChatbot[] = [
  'alumno',
  'docente',
  'admin',
  'investigador',
];

const PREGUNTAS: Record<RolChatbot, string[]> = {
  alumno: [
    '¿Qué actividades tengo pendientes?',
    '¿Cómo voy en mis cursos?',
    '¿Qué calificaciones tengo?',
  ],

  docente: [
    '¿Cómo van mis cursos?',
    '¿Qué estudiantes tengo?',
    '¿Qué actividades tengo publicadas?',
  ],

  admin: [
    '¿Cuántos usuarios hay registrados?',
    '¿Cuántos cursos están activos?',
    '¿Cuántos grupos hay registrados?',
  ],

  investigador: [
    '¿Cuántos mensajes de AulaBot hay registrados?',
    '¿Qué datos de accesibilidad existen?',
    '¿Qué métricas de investigación hay?',
  ],
};

const ACCIONES: Record<RolChatbot, AccionChatbot[]> = {
  alumno: [
    {
      clave: 'mis_actividades',
      texto: 'Mis actividades',
    },
    {
      clave: 'mis_avances',
      texto: 'Mis avances',
    },
    {
      clave: 'biblioteca',
      texto: 'Biblioteca',
    },
  ],

  docente: [
    {
      clave: 'crear_actividad',
      texto: 'Crear actividad',
    },
    {
      clave: 'estudiantes',
      texto: 'Estudiantes',
    },
    {
      clave: 'reportes',
      texto: 'Reportes',
    },
  ],

  admin: [
    {
      clave: 'admin_cursos',
      texto: 'Cursos',
    },
    {
      clave: 'admin_grupos',
      texto: 'Grupos',
    },
    {
      clave: 'admin_inscripciones',
      texto: 'Inscripciones',
    },
  ],

  investigador: [
    {
      clave: 'metricas_chatbot',
      texto: 'Métricas AulaBot',
    },
    {
      clave: 'metricas_uso',
      texto: 'Métricas de uso',
    },
    {
      clave: 'reportes_investigacion',
      texto: 'Reportes',
    },
  ],
};

const RUTAS: Record<string, string> = {
  mis_actividades:
    '/mis-actividades-alumno',

  mis_avances:
    '/mis-avances',

  biblioteca:
    '/bibloteca-alumno',

  crear_actividad:
    '/crear-actividad',

  estudiantes:
    '/estudiantes-docente',

  reportes:
    '/reportes',

  admin_cursos:
    '/admin-cursos',

  admin_grupos:
    '/admin-grupos',

  admin_inscripciones:
    '/admin-inscripciones',

  metricas_chatbot:
    '/investigador/metricas-chatbot',

  metricas_uso:
    '/investigador/metricas-uso',

  reportes_investigacion:
    '/investigador/reportes-investigacion',
};

function convertirHistorial(
  interacciones: InteraccionChatbot[],
  rol: RolChatbot
): Mensaje[] {
  const resultado: Mensaje[] = [];

  interacciones.forEach(
    (
      item,
      indice
    ) => {
      resultado.push({
        id:
          `usuario-${item.id_mensaje}`,
        autor:
          'usuario',
        texto:
          item.pregunta,
      });

      resultado.push({
        id:
          `bot-${item.id_mensaje}`,
        autor:
          'bot',
        texto:
          item.respuesta,
        idMensaje:
          item.id_mensaje,
        utilidad:
          item.utilidad_usuario,
        acciones:
          indice ===
          interacciones.length - 1
            ? ACCIONES[rol]
            : [],
      });
    }
  );

  return resultado;
}

function textoError(
  error: unknown
): string {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return 'Ocurrió un problema con AulaBot.';
}

export default function AulaBotScreenV1() {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  const [
    rol,
    setRol,
  ] =
    useState<RolChatbot>(
      'alumno'
    );

  const [
    rolListo,
    setRolListo,
  ] =
    useState(false);

  const [
    mensajes,
    setMensajes,
  ] =
    useState<Mensaje[]>([]);

  const [
    texto,
    setTexto,
  ] =
    useState('');

  const [
    enviando,
    setEnviando,
  ] =
    useState(false);

  const [
    sincronizando,
    setSincronizando,
  ] =
    useState(true);

  const [
    conectado,
    setConectado,
  ] =
    useState(true);

  const [
    conversaciones,
    setConversaciones,
  ] =
    useState<ConversacionChatbot[]>([]);

  const [
    historialVisible,
    setHistorialVisible,
  ] =
    useState(false);

  const [
    cargandoConversaciones,
    setCargandoConversaciones,
  ] =
    useState(false);

  const [
    ultimoFallido,
    setUltimoFallido,
  ] =
    useState<string | null>(
      null
    );

  const scrollRef =
    useRef<ScrollView | null>(
      null
    );

  const enviandoRef =
    useRef(false);

  const firmaRef =
    useRef('');

  useEffect(() => {
    let activo =
      true;

    void (
      async () => {
        try {
          const guardado =
            await AsyncStorage.getItem(
              'usuario'
            );

          if (!guardado) {
            return;
          }

          const usuario =
            JSON.parse(
              guardado
            ) as {
              rol?: string;
            };

          const rolUsuario =
            String(
              usuario.rol || ''
            )
              .trim()
              .toLowerCase() as RolChatbot;

          if (
            activo &&
            ROLES.includes(
              rolUsuario
            )
          ) {
            setRol(
              rolUsuario
            );
          }
        } catch (error) {
          console.error(
            'Error recuperando rol de AulaBot:',
            error
          );
        } finally {
          if (activo) {
            setRolListo(
              true
            );
          }
        }
      }
    )();

    return () => {
      activo =
        false;
    };
  }, []);

  const bajar =
    useCallback(() => {
      setTimeout(
        () => {
          scrollRef.current
            ?.scrollToEnd({
              animated:
                true,
            });
        },
        120
      );
    }, []);

  const cargarHistorial =
    useCallback(
      async (
        silencioso = false
      ) => {
        if (
          !rolListo ||
          (
            silencioso &&
            enviandoRef.current
          )
        ) {
          return;
        }

        try {
          if (!silencioso) {
            setSincronizando(
              true
            );
          }

          const datos =
            await obtenerHistorialChatbot();

          const lista =
            datos.interacciones ||
            [];

          const firma =
            JSON.stringify(
              lista.map(
                (item) => [
                  item.id_mensaje,
                  item.pregunta,
                  item.respuesta,
                  item.utilidad_usuario,
                ]
              )
            );

          if (
            silencioso &&
            firma ===
              firmaRef.current
          ) {
            setConectado(
              true
            );

            return;
          }

          firmaRef.current =
            firma;

          setMensajes(
            convertirHistorial(
              lista,
              rol
            )
          );

          setConectado(
            true
          );

          bajar();
        } catch (error) {
          setConectado(
            false
          );

          if (!silencioso) {
            console.error(
              'Error cargando historial:',
              error
            );
          }
        } finally {
          if (!silencioso) {
            setSincronizando(
              false
            );
          }
        }
      },
      [
        rolListo,
        rol,
        bajar,
      ]
    );

  useFocusEffect(
    useCallback(() => {
      if (!rolListo) {
        return undefined;
      }

      void cargarHistorial(
        false
      );

      const intervalo =
        setInterval(
          () => {
            void cargarHistorial(
              true
            );
          },
          3000
        );

      return () => {
        clearInterval(
          intervalo
        );

        Speech.stop();
      };
    }, [
      rolListo,
      cargarHistorial,
    ])
  );

  const abrirHistorial =
    async () => {
      setHistorialVisible(
        true
      );

      setCargandoConversaciones(
        true
      );

      try {
        const datos =
          await listarConversacionesChatbot();

        setConversaciones(
          datos.conversaciones ||
            []
        );
      } catch (error) {
        Alert.alert(
          'AulaBot',
          textoError(
            error
          )
        );
      } finally {
        setCargandoConversaciones(
          false
        );
      }
    };

  const abrirConversacion =
    async (
      idSesion: number
    ) => {
      try {
        setSincronizando(
          true
        );

        await activarConversacionChatbot(
          idSesion
        );

        firmaRef.current =
          '';

        setHistorialVisible(
          false
        );

        await cargarHistorial(
          false
        );
      } catch (error) {
        Alert.alert(
          'AulaBot',
          textoError(
            error
          )
        );
      } finally {
        setSincronizando(
          false
        );
      }
    };

  const nuevaConversacion =
    () => {
      Alert.alert(
        'Nueva conversación',
        '¿Deseas iniciar una nueva conversación?',
        [
          {
            text:
              'Cancelar',
            style:
              'cancel',
          },

          {
            text:
              'Nueva conversación',

            onPress:
              async () => {
                try {
                  setSincronizando(
                    true
                  );

                  Speech.stop();

                  await iniciarNuevaConversacionChatbot();

                  firmaRef.current =
                    '';

                  setMensajes(
                    []
                  );

                  await cargarHistorial(
                    false
                  );
                } catch (error) {
                  Alert.alert(
                    'AulaBot',
                    textoError(
                      error
                    )
                  );
                } finally {
                  setSincronizando(
                    false
                  );
                }
              },
          },
        ]
      );
    };

  const enviar =
    async (
      recibido?: string
    ) => {
      const mensaje =
        (
          recibido ??
          texto
        ).trim();

      if (
        !mensaje ||
        enviandoRef.current ||
        sincronizando
      ) {
        return;
      }

      enviandoRef.current =
        true;

      setEnviando(
        true
      );

      setTexto('');

      setUltimoFallido(
        null
      );

      setMensajes(
        (anteriores) => [
          ...anteriores,

          {
            id:
              `temp-u-${Date.now()}`,
            autor:
              'usuario',
            texto:
              mensaje,
          },
        ]
      );

      bajar();

      try {
        const datos =
          await enviarMensajeChatbot(
            mensaje,
            rol
          );

        setMensajes(
          (anteriores) => [
            ...anteriores,

            {
              id:
                `temp-b-${Date.now()}`,
              autor:
                'bot',
              texto:
                datos.respuesta,
              idMensaje:
                datos.idMensaje ??
                undefined,
              acciones:
                datos.acciones ??
                ACCIONES[rol],
            },
          ]
        );

        firmaRef.current =
          '';

        setConectado(
          true
        );
      } catch (error) {
        setConectado(
          false
        );

        setUltimoFallido(
          mensaje
        );

        setMensajes(
          (anteriores) => [
            ...anteriores,

            {
              id:
                `error-${Date.now()}`,
              autor:
                'bot',
              texto:
                textoError(
                  error
                ),
              error:
                true,
            },
          ]
        );
      } finally {
        enviandoRef.current =
          false;

        setEnviando(
          false
        );

        bajar();
      }
    };

  const valorar =
    async (
      idMensaje: number,
      utilidad: UtilidadChatbot
    ) => {
      try {
        await valorarRespuestaChatbot(
          idMensaje,
          utilidad
        );

        setMensajes(
          (anteriores) =>
            anteriores.map(
              (item) =>
                item.idMensaje ===
                idMensaje
                  ? {
                      ...item,
                      utilidad,
                    }
                  : item
            )
        );

        firmaRef.current =
          '';
      } catch (error) {
        Alert.alert(
          'AulaBot',
          textoError(
            error
          )
        );
      }
    };

  const regenerar =
    async (
      idMensaje: number
    ) => {
      if (
        enviandoRef.current
      ) {
        return;
      }

      try {
        enviandoRef.current =
          true;

        setEnviando(
          true
        );

        const datos =
          await regenerarRespuestaChatbot(
            idMensaje
          );

        setMensajes(
          (anteriores) =>
            anteriores.map(
              (item) =>
                item.idMensaje ===
                idMensaje
                  ? {
                      ...item,
                      texto:
                        datos.respuesta,
                    }
                  : item
            )
        );

        firmaRef.current =
          '';
      } catch (error) {
        Alert.alert(
          'AulaBot',
          textoError(
            error
          )
        );
      } finally {
        enviandoRef.current =
          false;

        setEnviando(
          false
        );
      }
    };

  const escuchar =
    (
      respuesta: string
    ) => {
      Speech.stop();

      Speech.speak(
        respuesta,
        {
          language:
            'es-MX',

          rate:
            0.9,

          pitch:
            1,
        }
      );
    };

  const ejecutarAccion =
    (
      accion: AccionChatbot
    ) => {
      const ruta =
        RUTAS[
          accion.clave
        ];

      if (!ruta) {
        Alert.alert(
          'AulaBot',
          'Esta acción todavía no tiene una pantalla asociada.'
        );

        return;
      }

      router.push(
        ruta as never
      );
    };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,

        {
          backgroundColor:
            colores.fondo,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={
          styles.contenedor
        }
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }
      >
        <View
          style={[
            styles.header,

            {
              backgroundColor:
                colores.primario,
            },
          ]}
        >
          <Pressable
            style={
              styles.headerButton
            }
            onPress={() =>
              router.back()
            }
            accessibilityRole="button"
            accessibilityLabel="Regresar"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#FFFFFF"
            />
          </Pressable>

          <View
            style={
              styles.headerCenter
            }
          >
            <Text
              style={[
                styles.headerTitle,

                {
                  fontSize:
                    19 *
                    escalaTexto,
                },
              ]}
            >
              AulaBot
            </Text>

            <Text
              style={[
                styles.headerStatus,

                {
                  fontSize:
                    11 *
                    escalaTexto,
                },
              ]}
            >
              {conectado
                ? '● Conectado'
                : '● Sin conexión'}
            </Text>
          </View>

          <Pressable
            style={
              styles.headerButton
            }
            onPress={() =>
              void abrirHistorial()
            }
            accessibilityRole="button"
            accessibilityLabel="Historial de conversaciones"
          >
            <Ionicons
              name="time-outline"
              size={24}
              color="#FFFFFF"
            />
          </Pressable>

          <Pressable
            style={
              styles.headerButton
            }
            onPress={
              nuevaConversacion
            }
            accessibilityRole="button"
            accessibilityLabel="Nueva conversación"
          >
            <Ionicons
              name="add-circle-outline"
              size={25}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        <ScrollView
          ref={
            scrollRef
          }
          style={{
            flex: 1,
            backgroundColor:
              colores.fondo,
          }}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.presentacion,

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
                styles.robot,

                {
                  backgroundColor:
                    colores.primario,
                },
              ]}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={27}
                color="#FFFFFF"
              />
            </View>

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={{
                  color:
                    colores.texto,

                  fontWeight:
                    '800',

                  fontSize:
                    16 *
                    escalaTexto,
                }}
              >
                ¿En qué puedo ayudarte?
              </Text>

              <Text
                style={{
                  color:
                    colores.textoSecundario,

                  marginTop:
                    3,

                  fontSize:
                    12 *
                    escalaTexto,
                }}
              >
                Tu conversación se sincroniza entre Web y Móvil.
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            style={
              styles.quickScroll
            }
          >
            {PREGUNTAS[
              rol
            ].map(
              (pregunta) => (
                <Pressable
                  key={
                    pregunta
                  }
                  style={[
                    styles.quickButton,

                    {
                      backgroundColor:
                        colores.tarjeta,

                      borderColor:
                        colores.borde,
                    },
                  ]}
                  disabled={
                    enviando ||
                    sincronizando
                  }
                  onPress={() =>
                    void enviar(
                      pregunta
                    )
                  }
                >
                  <Text
                    style={{
                      color:
                        colores.primario,

                      fontWeight:
                        '700',

                      fontSize:
                        12 *
                        escalaTexto,
                    }}
                  >
                    {pregunta}
                  </Text>
                </Pressable>
              )
            )}
          </ScrollView>

          {sincronizando && (
            <View
              style={
                styles.cargando
              }
            >
              <ActivityIndicator
                size="small"
                color={
                  colores.primario
                }
              />

              <Text
                style={{
                  marginLeft:
                    8,

                  color:
                    colores.textoSecundario,
                }}
              >
                Sincronizando...
              </Text>
            </View>
          )}

          {!sincronizando &&
            mensajes.length ===
              0 && (
              <Text
                style={{
                  color:
                    colores.textoSecundario,

                  textAlign:
                    'center',

                  paddingVertical:
                    30,
                }}
              >
                Inicia una conversación con AulaBot.
              </Text>
            )}

          {mensajes.map(
            (item) => {
              const bot =
                item.autor ===
                'bot';

              return (
                <View
                  key={
                    item.id
                  }
                  style={[
                    styles.messageRow,

                    bot
                      ? styles.botRow
                      : styles.userRow,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,

                      bot
                        ? {
                            backgroundColor:
                              colores.tarjeta,

                            borderColor:
                              item.error
                                ? '#D9534F'
                                : colores.borde,
                          }
                        : {
                            backgroundColor:
                              colores.primario,

                            borderColor:
                              colores.primario,
                          },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          bot
                            ? colores.texto
                            : '#FFFFFF',

                        fontSize:
                          14 *
                          escalaTexto,

                        lineHeight:
                          20 *
                          escalaTexto,
                      }}
                    >
                      {item.texto}
                    </Text>

                    {bot &&
                      !item.error && (
                        <>
                          <View
                            style={
                              styles.tools
                            }
                          >
                            <Pressable
                              style={[
                                styles.tool,

                                item.utilidad ===
                                  'Útil' &&
                                  styles.toolActive,
                              ]}
                              disabled={
                                !item.idMensaje
                              }
                              onPress={() =>
                                item.idMensaje &&
                                void valorar(
                                  item.idMensaje,
                                  'Útil'
                                )
                              }
                            >
                              <Ionicons
                                name={item.utilidad === 'Útil' ? 'thumbs-up' : 'thumbs-up-outline'}
                                size={18}
                                color={
                                  colores.primario
                                }
                              />
                            </Pressable>

                            <Pressable
                              style={[
                                styles.tool,

                                item.utilidad ===
                                  'No útil' &&
                                  styles.toolActive,
                              ]}
                              disabled={
                                !item.idMensaje
                              }
                              onPress={() =>
                                item.idMensaje &&
                                void valorar(
                                  item.idMensaje,
                                  'No útil'
                                )
                              }
                            >
                              <Ionicons
                                name={item.utilidad === 'No útil' ? 'thumbs-down' : 'thumbs-down-outline'}
                                size={18}
                                color={
                                  colores.primario
                                }
                              />
                            </Pressable>

                            <Pressable
                              style={
                                styles.tool
                              }
                              disabled={
                                !item.idMensaje ||
                                enviando
                              }
                              onPress={() =>
                                item.idMensaje &&
                                void regenerar(
                                  item.idMensaje
                                )
                              }
                            >
                              <Ionicons
                                name="refresh-outline"
                                size={19}
                                color={
                                  colores.primario
                                }
                              />
                            </Pressable>

                            <Pressable
                              style={
                                styles.tool
                              }
                              onPress={() =>
                                escuchar(
                                  item.texto
                                )
                              }
                            >
                              <Ionicons
                                name="volume-high-outline"
                                size={19}
                                color={
                                  colores.primario
                                }
                              />
                            </Pressable>
                          </View>

                          {(
                            item.acciones ||
                            []
                          ).length >
                            0 && (
                            <View
                              style={
                                styles.actions
                              }
                            >
                              {(
                                item.acciones ||
                                []
                              ).map(
                                (
                                  accion
                                ) => (
                                  <Pressable
                                    key={
                                      accion.clave
                                    }
                                    style={[
                                      styles.actionButton,

                                      {
                                        borderColor:
                                          colores.primario,
                                      },
                                    ]}
                                    onPress={() =>
                                      ejecutarAccion(
                                        accion
                                      )
                                    }
                                  >
                                    <Text
                                      style={{
                                        color:
                                          colores.primario,

                                        fontWeight:
                                          '700',

                                        fontSize:
                                          11 *
                                          escalaTexto,
                                      }}
                                    >
                                      {
                                        accion.texto
                                      }
                                    </Text>
                                  </Pressable>
                                )
                              )}
                            </View>
                          )}
                        </>
                      )}
                  </View>
                </View>
              );
            }
          )}

          {enviando && (
            <View
              style={[
                styles.messageRow,
                styles.botRow,
              ]}
            >
              <View
                style={[
                  styles.bubble,

                  {
                    backgroundColor:
                      colores.tarjeta,

                    borderColor:
                      colores.borde,
                  },
                ]}
              >
                <ActivityIndicator
                  size="small"
                  color={
                    colores.primario
                  }
                />

                <Text
                  style={{
                    marginTop:
                      7,

                    color:
                      colores.textoSecundario,
                  }}
                >
                  AulaBot está escribiendo...
                </Text>
              </View>
            </View>
          )}

          {ultimoFallido && (
            <Pressable
              style={[
                styles.retry,

                {
                  borderColor:
                    colores.primario,
                },
              ]}
              onPress={() =>
                void enviar(
                  ultimoFallido
                )
              }
            >
              <Text
                style={{
                  color:
                    colores.primario,

                  fontWeight:
                    '800',
                }}
              >
                Reintentar
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <View
          style={[
            styles.inputArea,

            {
              backgroundColor:
                colores.tarjeta,

              borderTopColor:
                colores.borde,
            },
          ]}
        >
          <TextInput
            value={
              texto
            }
            onChangeText={
              setTexto
            }
            placeholder="Escribe tu pregunta..."
            placeholderTextColor={
              colores.textoSecundario
            }
            multiline
            maxLength={
              1000
            }
            editable={
              !enviando &&
              !sincronizando
            }
            style={[
              styles.input,

              {
                backgroundColor:
                  colores.fondo,

                borderColor:
                  colores.borde,

                color:
                  colores.texto,

                fontSize:
                  14 *
                  escalaTexto,
              },
            ]}
          />

          <Pressable
            style={[
              styles.send,

              {
                backgroundColor:
                  colores.primario,
              },

              (
                !texto.trim() ||
                enviando ||
                sincronizando
              ) &&
                styles.disabled,
            ]}
            disabled={
              !texto.trim() ||
              enviando ||
              sincronizando
            }
            onPress={() =>
              void enviar()
            }
          >
            <Ionicons
              name="send"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        <Modal
          visible={
            historialVisible
          }
          transparent
          animationType="slide"
          onRequestClose={() =>
            setHistorialVisible(
              false
            )
          }
        >
          <View
            style={
              styles.modalBackdrop
            }
          >
            <View
              style={[
                styles.modal,

                {
                  backgroundColor:
                    colores.tarjeta,
                },
              ]}
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <Text
                  style={{
                    color:
                      colores.texto,

                    fontWeight:
                      '800',

                    fontSize:
                      18 *
                      escalaTexto,
                  }}
                >
                  Conversaciones
                </Text>

                <Pressable
                  onPress={() =>
                    setHistorialVisible(
                      false
                    )
                  }
                >
                  <Ionicons
                    name="close"
                    size={28}
                    color={
                      colores.texto
                    }
                  />
                </Pressable>
              </View>

              <Pressable
                style={[
                  styles.newButton,

                  {
                    backgroundColor:
                      colores.primario,
                  },
                ]}
                onPress={() => {
                  setHistorialVisible(
                    false
                  );

                  nuevaConversacion();
                }}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.newButtonText
                  }
                >
                  Nueva conversación
                </Text>
              </Pressable>

              {cargandoConversaciones ? (
                <ActivityIndicator
                  style={{
                    marginTop:
                      30,
                  }}
                  color={
                    colores.primario
                  }
                />
              ) : (
                <ScrollView>
                  {conversaciones.map(
                    (
                      conversacion
                    ) => (
                      <Pressable
                        key={
                          conversacion.idSesion
                        }
                        style={[
                          styles.conversation,

                          {
                            backgroundColor:
                              colores.fondo,

                            borderColor:
                              conversacion.activa
                                ? colores.primario
                                : colores.borde,
                          },
                        ]}
                        onPress={() =>
                          void abrirConversacion(
                            conversacion.idSesion
                          )
                        }
                      >
                        <Text
                          numberOfLines={
                            1
                          }
                          style={{
                            color:
                              colores.texto,

                            fontWeight:
                              '800',

                            fontSize:
                              14 *
                              escalaTexto,
                          }}
                        >
                          {
                            conversacion.titulo
                          }
                        </Text>

                        <Text
                          style={{
                            color:
                              colores.textoSecundario,

                            marginTop:
                              4,

                            fontSize:
                              11 *
                              escalaTexto,
                          }}
                        >
                          {
                            conversacion.totalMensajes
                          }{' '}
                          mensajes
                          {conversacion.activa
                            ? ' · Activa'
                            : ''}
                        </Text>
                      </Pressable>
                    )
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  contenedor: {
    flex: 1,
  },

  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
  },

  headerButton: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  headerStatus: {
    color: '#EBE7FF',
    marginTop: 1,
  },

  scrollContent: {
    padding: 15,
    paddingBottom: 25,
  },

  presentacion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
  },

  robot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  quickScroll: {
    marginBottom: 13,
  },

  quickButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 18,
    marginRight: 8,
  },

  cargando: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },

  messageRow: {
    width: '100%',
    marginBottom: 10,
  },

  botRow: {
    alignItems: 'flex-start',
  },

  userRow: {
    alignItems: 'flex-end',
  },

  bubble: {
    maxWidth: '88%',
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  tools: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 8,
  },

  tool: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  toolActive: {
    backgroundColor:
      'rgba(88,64,199,0.14)',
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },

  actionButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  retry: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 7,
  },

  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    padding: 10,
  },

  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
  },

  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabled: {
    opacity: 0.45,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },

  modal: {
    height: '78%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  newButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    marginBottom: 14,
  },

  newButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: 6,
  },

  conversation: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 13,
    marginBottom: 8,
  },
});