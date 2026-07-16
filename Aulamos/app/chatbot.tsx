import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { enviarMensajeChatbot } from '../services/chatbot';

type AutorMensaje = 'usuario' | 'bot';

type Mensaje = {
  id: string;
  autor: AutorMensaje;
  texto: string;
};

const PREGUNTAS_RAPIDAS: string[] = [
  '¿Cómo veo mis actividades?',
  '¿Cómo entrego una tarea?',
  'Explícame la fotosíntesis',
  'Necesito ayuda con matemáticas',
];

function generarId(prefijo: string): string {
  return `${prefijo}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function obtenerMensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const datos = error.response?.data as
      | {
          mensaje?: string;
          detalle?: string;
        }
      | undefined;

    if (datos?.mensaje) {
      return datos.mensaje;
    }

    if (error.code === 'ECONNABORTED') {
      return 'AulaBot tardó demasiado en responder. Inténtalo nuevamente.';
    }

    if (!error.response) {
      return (
        'No pude conectarme con el servidor. Revisa que ' +
        'XAMPP, Node.js y Expo estén encendidos.'
      );
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Ocurrió un problema inesperado al consultar AulaBot.';
}

export default function ChatbotScreen() {
  const [mensaje, setMensaje] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(false);

  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: 'mensaje-bienvenida',
      autor: 'bot',
      texto:
        '¡Hola! Soy AulaBot, tu asistente educativo. ' +
        'Puedo ayudarte con tus actividades, dudas ' +
        'académicas y el uso de Aulamos.',
    },
  ]);

  const scrollRef = useRef<ScrollView | null>(null);

  const bajarAlFinal = (): void => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }, 150);
  };

  const enviarMensaje = async (
    textoSeleccionado?: string
  ): Promise<void> => {
    const texto = (textoSeleccionado ?? mensaje).trim();

    if (!texto || cargando) {
      return;
    }

    const mensajeUsuario: Mensaje = {
      id: generarId('usuario'),
      autor: 'usuario',
      texto,
    };

    setMensajes((anteriores: Mensaje[]) => [
      ...anteriores,
      mensajeUsuario,
    ]);

    setMensaje('');
    setCargando(true);
    bajarAlFinal();

    try {
      const resultado = await enviarMensajeChatbot(
        texto,
        'alumno'
      );

      const mensajeBot: Mensaje = {
        id: generarId('bot'),
        autor: 'bot',
        texto:
          resultado.respuesta ||
          'No recibí una respuesta válida.',
      };

      setMensajes((anteriores: Mensaje[]) => [
        ...anteriores,
        mensajeBot,
      ]);
    } catch (error: unknown) {
      console.error(
        'Error al consultar AulaBot:',
        error
      );

      const mensajeError: Mensaje = {
        id: generarId('error'),
        autor: 'bot',
        texto: obtenerMensajeError(error),
      };

      setMensajes((anteriores: Mensaje[]) => [
        ...anteriores,
        mensajeError,
      ]);
    } finally {
      setCargando(false);
      bajarAlFinal();
    }
  };

  const escucharRespuesta = (texto: string): void => {
    Speech.stop();

    Speech.speak(texto, {
      language: 'es-MX',
      rate: 0.9,
      pitch: 1,
    });
  };

  const detenerLectura = (): void => {
    Speech.stop();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.contenedor}
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
        keyboardVerticalOffset={0}
      >
        <View style={styles.encabezado}>
          <Pressable
            style={styles.botonEncabezado}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Regresar"
          >
            <Ionicons
              name="arrow-back"
              size={25}
              color="#FFFFFF"
            />
          </Pressable>

          <View style={styles.tituloContenedor}>
            <Text style={styles.titulo}>
              Chatbot educativo
            </Text>

            <Text style={styles.subtitulo}>
              AulaBot
            </Text>
          </View>

          <Pressable
            style={styles.botonEncabezado}
            onPress={detenerLectura}
            accessibilityRole="button"
            accessibilityLabel="Detener lectura"
          >
            <Ionicons
              name="volume-mute-outline"
              size={25}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.conversacion}
          contentContainerStyle={
            styles.conversacionContenido
          }
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={bajarAlFinal}
        >
          <View style={styles.presentacion}>
            <View style={styles.robot}>
              <Ionicons
                name="chatbubble-ellipses"
                size={34}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.presentacionTexto}>
              <Text style={styles.presentacionTitulo}>
                ¿En qué puedo ayudarte?
              </Text>

              <Text
                style={styles.presentacionDescripcion}
              >
                Pregúntame sobre actividades, materias,
                calificaciones o cómo utilizar Aulamos.
              </Text>
            </View>
          </View>

          <Text style={styles.tituloSugerencias}>
            Preguntas rápidas
          </Text>

          <View style={styles.preguntasRapidas}>
            {PREGUNTAS_RAPIDAS.map(
              (pregunta: string) => (
                <Pressable
                  key={pregunta}
                  style={styles.preguntaRapida}
                  onPress={() =>
                    enviarMensaje(pregunta)
                  }
                  disabled={cargando}
                  accessibilityRole="button"
                  accessibilityLabel={pregunta}
                >
                  <Text
                    style={
                      styles.preguntaRapidaTexto
                    }
                  >
                    {pregunta}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          <View style={styles.listaMensajes}>
            {mensajes.map((item: Mensaje) => {
              const esBot = item.autor === 'bot';

              return (
                <View
                  key={item.id}
                  style={[
                    styles.filaMensaje,
                    esBot
                      ? styles.filaBot
                      : styles.filaUsuario,
                  ]}
                >
                  <View
                    style={[
                      styles.burbuja,
                      esBot
                        ? styles.burbujaBot
                        : styles.burbujaUsuario,
                    ]}
                  >
                    <Text
                      style={[
                        styles.textoMensaje,
                        !esBot &&
                          styles.textoUsuario,
                      ]}
                    >
                      {item.texto}
                    </Text>

                    {esBot && (
                      <Pressable
                        style={styles.botonEscuchar}
                        onPress={() =>
                          escucharRespuesta(
                            item.texto
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Escuchar respuesta"
                      >
                        <Ionicons
                          name="volume-high-outline"
                          size={19}
                          color="#5840C7"
                        />

                        <Text
                          style={
                            styles.textoEscuchar
                          }
                        >
                          Escuchar
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}

            {cargando && (
              <View
                style={[
                  styles.filaMensaje,
                  styles.filaBot,
                ]}
              >
                <View
                  style={[
                    styles.burbuja,
                    styles.burbujaBot,
                    styles.escribiendo,
                  ]}
                >
                  <ActivityIndicator
                    size="small"
                    color="#5840C7"
                  />

                  <Text
                    style={styles.textoEscribiendo}
                  >
                    AulaBot está escribiendo...
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.areaEntrada}>
          <TextInput
            value={mensaje}
            onChangeText={setMensaje}
            style={styles.input}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor="#777777"
            multiline
            maxLength={800}
            editable={!cargando}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => {
              if (!cargando && mensaje.trim()) {
                enviarMensaje();
              }
            }}
            accessibilityLabel="Mensaje para AulaBot"
          />

          <Pressable
            style={[
              styles.botonEnviar,
              (!mensaje.trim() || cargando) &&
                styles.botonEnviarDesactivado,
            ]}
            onPress={() => enviarMensaje()}
            disabled={!mensaje.trim() || cargando}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
          >
            {cargando ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="send"
                size={22}
                color="#FFFFFF"
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#5840C7',
  },

  contenedor: {
    flex: 1,
    backgroundColor: '#F6F6FB',
  },

  encabezado: {
    backgroundColor: '#5840C7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  botonEncabezado: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },

  tituloContenedor: {
    flex: 1,
    alignItems: 'center',
  },

  titulo: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
  },

  subtitulo: {
    color: '#E9E4FF',
    fontSize: 13,
    marginTop: 2,
  },

  conversacion: {
    flex: 1,
  },

  conversacionContenido: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 26,
  },

  presentacion: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E5F5',
  },

  robot: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#5840C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  presentacionTexto: {
    flex: 1,
  },

  presentacionTitulo: {
    color: '#292343',
    fontSize: 17,
    fontWeight: '700',
  },

  presentacionDescripcion: {
    color: '#68647A',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },

  tituloSugerencias: {
    color: '#292343',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },

  preguntasRapidas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
  },

  preguntaRapida: {
    backgroundColor: '#EEEaff',
    borderColor: '#C8BEF7',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginRight: 8,
    marginBottom: 8,
  },

  preguntaRapidaTexto: {
    color: '#4934A8',
    fontSize: 13,
    fontWeight: '600',
  },

  listaMensajes: {
    width: '100%',
  },

  filaMensaje: {
    width: '100%',
    marginBottom: 12,
  },

  filaBot: {
    alignItems: 'flex-start',
  },

  filaUsuario: {
    alignItems: 'flex-end',
  },

  burbuja: {
    maxWidth: '86%',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },

  burbujaBot: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E0EC',
    borderBottomLeftRadius: 5,
  },

  burbujaUsuario: {
    backgroundColor: '#5840C7',
    borderBottomRightRadius: 5,
  },

  textoMensaje: {
    color: '#302D3B',
    fontSize: 15,
    lineHeight: 22,
  },

  textoUsuario: {
    color: '#FFFFFF',
  },

  botonEscuchar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },

  textoEscuchar: {
    color: '#5840C7',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 5,
  },

  escribiendo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  textoEscribiendo: {
    color: '#68647A',
    fontSize: 14,
    marginLeft: 9,
  },

  areaEntrada: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E1EB',
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  input: {
    flex: 1,
    minHeight: 47,
    maxHeight: 115,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#D6D2DF',
    backgroundColor: '#F8F7FB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#292634',
    fontSize: 15,
    marginRight: 9,
  },

  botonEnviar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5840C7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  botonEnviarDesactivado: {
    opacity: 0.45,
  },
});