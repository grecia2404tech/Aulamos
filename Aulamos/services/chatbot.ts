import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export type RolChatbot = 'alumno' | 'docente' | 'admin' | 'investigador';

export type AccionChatbot = {
  texto: string;
  ruta: string;
};

export type RespuestaChatbot = {
  respuesta: string;
  tipoConsulta?: string;
  origenConocimiento?: string;
  acciones?: AccionChatbot[];
};

export type SolicitudChatbot = {
  mensaje: string;
  rol: RolChatbot;
};

export async function enviarMensajeChatbot(
  mensaje: string,
  rol: RolChatbot = 'alumno'
): Promise<RespuestaChatbot> {
  const textoLimpio = mensaje.trim();

  if (!textoLimpio) {
    throw new Error('El mensaje no puede estar vacÃ­o.');
  }

  const token = await AsyncStorage.getItem('token');

  if (!token) {
    throw new Error(
      'Tu sesiÃ³n terminÃ³. Inicia sesiÃ³n nuevamente.'
    );
  }
  const resultado = await api.post<RespuestaChatbot>(
    '/chatbot/mensaje',
    {
      mensaje: textoLimpio,
      rol,
    } satisfies SolicitudChatbot,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return resultado.data;
}