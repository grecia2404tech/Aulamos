import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from './api';

export type ResumenMetricasChatbot = {
  total_interacciones: number;
  estudiantes_usuarios: number;
  total_sesiones: number;
  promedio_tiempo_respuesta_ms: number;
  preguntas_hoy: number;
};

export type InteraccionChatbotDia = {
  fecha: string;
  cantidad: number;
};

export type TipoConsultaChatbot = {
  tipo_consulta: string;
  cantidad: number;
};

export type InteraccionChatbotReciente = {
  id_mensaje: number;
  id_sesion: number;
  id_usuario: number;
  estudiante: string;
  pregunta: string;
  respuesta: string;
  tipo_consulta: string;
  fecha: string;
  hora: string;
  tiempo_respuesta_ms: number;
};

export type RespuestaMetricasChatbot = {
  periodo: {
    fecha_inicio: string;
    fecha_fin: string;
    dias: number;
  };
  resumen: ResumenMetricasChatbot;
  interacciones_por_dia: InteraccionChatbotDia[];
  consultas_por_tipo: TipoConsultaChatbot[];
  interacciones_recientes: InteraccionChatbotReciente[];
};

export async function obtenerMetricasChatbot(
  dias = 7,
): Promise<RespuestaMetricasChatbot> {
  const token = await AsyncStorage.getItem('token');

  if (!token) {
    throw new Error(
      'Tu sesión terminó. Inicia sesión nuevamente.',
    );
  }

  const resultado = await api.get<RespuestaMetricasChatbot>(
    '/investigacion/metricas-chatbot',
    {
      params: { dias },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return resultado.data;
}
