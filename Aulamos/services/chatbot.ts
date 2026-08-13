import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  api,
} from './api';

export type RolChatbot =
  | 'alumno'
  | 'docente'
  | 'admin'
  | 'investigador';

export type AccionChatbot = {
  clave: string;
  texto: string;
};

export type UtilidadChatbot =
  | 'Útil'
  | 'Parcialmente útil'
  | 'No útil';

export type RespuestaChatbot = {
  success?: boolean;
  respuesta: string;
  tipoConsulta?: string;
  origenConocimiento?: string;
  tiempoRespuestaMs?: number;
  idSesion?: number | null;
  idMensaje?: number | null;
  acciones?: AccionChatbot[];
};

export type InteraccionChatbot = {
  id_mensaje: number;
  pregunta: string;
  respuesta: string;
  tipo_consulta?: string | null;
  modelo_ia?: string | null;
  origen_conocimiento?: string | null;
  tipo_respuesta?: string | null;
  nivel_respuesta?: string | null;
  utilidad_usuario?: UtilidadChatbot | null;
  tiempo_respuesta_ms?: number | null;
  fecha_mensaje?: string | null;
};

export type HistorialChatbot = {
  success: boolean;
  idSesion: number;
  moduloOrigen?: string | null;
  activa?: boolean;
  interacciones: InteraccionChatbot[];
};

export type ConversacionChatbot = {
  idSesion: number;
  titulo: string;
  moduloOrigen?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  ultimaActividad?: string | null;
  totalMensajes: number;
  activa: boolean;
};

export type ListaConversacionesChatbot = {
  success: boolean;
  conversaciones: ConversacionChatbot[];
};

async function obtenerToken():
  Promise<string> {
  const token =
    await AsyncStorage.getItem(
      'token'
    );

  if (!token) {
    throw new Error(
      'Tu sesión terminó. Inicia sesión nuevamente.'
    );
  }

  return token;
}

async function cabeceras() {
  const token =
    await obtenerToken();

  return {
    Authorization:
      `Bearer ${token}`,
  };
}

export async function enviarMensajeChatbot(
  mensaje: string,
  rol: RolChatbot = 'alumno'
): Promise<RespuestaChatbot> {
  const texto =
    mensaje.trim();

  if (!texto) {
    throw new Error(
      'El mensaje no puede estar vacío.'
    );
  }

  const resultado =
    await api.post<RespuestaChatbot>(
      '/chatbot/mensaje',
      {
        mensaje: texto,
        rol,
      },
      {
        headers:
          await cabeceras(),
      }
    );

  return resultado.data;
}

export async function obtenerHistorialChatbot():
  Promise<HistorialChatbot> {
  const resultado =
    await api.get<HistorialChatbot>(
      '/chatbot/historial',
      {
        headers:
          await cabeceras(),
      }
    );

  return resultado.data;
}

export async function iniciarNuevaConversacionChatbot():
  Promise<void> {
  await api.post(
    '/chatbot/nueva-conversacion',
    {},
    {
      headers:
        await cabeceras(),
    }
  );
}

export async function listarConversacionesChatbot():
  Promise<ListaConversacionesChatbot> {
  const resultado =
    await api.get<ListaConversacionesChatbot>(
      '/chatbot/conversaciones',
      {
        headers:
          await cabeceras(),
      }
    );

  return resultado.data;
}

export async function obtenerConversacionChatbot(
  idSesion: number
): Promise<HistorialChatbot> {
  const resultado =
    await api.get<HistorialChatbot>(
      `/chatbot/conversaciones/${idSesion}`,
      {
        headers:
          await cabeceras(),
      }
    );

  return resultado.data;
}

export async function activarConversacionChatbot(
  idSesion: number
): Promise<void> {
  await api.post(
    `/chatbot/conversaciones/${idSesion}/activar`,
    {},
    {
      headers:
        await cabeceras(),
    }
  );
}

export async function valorarRespuestaChatbot(
  idMensaje: number,
  utilidad: UtilidadChatbot
): Promise<void> {
  await api.post(
    `/chatbot/mensajes/${idMensaje}/utilidad`,
    {
      utilidad,
    },
    {
      headers:
        await cabeceras(),
    }
  );
}

export async function regenerarRespuestaChatbot(
  idMensaje: number
): Promise<RespuestaChatbot> {
  const resultado =
    await api.post<RespuestaChatbot>(
      `/chatbot/mensajes/${idMensaje}/regenerar`,
      {},
      {
        headers:
          await cabeceras(),
      }
    );

  return resultado.data;
}