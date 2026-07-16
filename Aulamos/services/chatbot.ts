import { api } from './api';

export type RolChatbot = 'alumno' | 'docente';

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
    throw new Error('El mensaje no puede estar vacío.');
  }

  const resultado = await api.post<RespuestaChatbot>(
    '/chatbot/mensaje',
    {
      mensaje: textoLimpio,
      rol,
    } satisfies SolicitudChatbot
  );

  return resultado.data;
}