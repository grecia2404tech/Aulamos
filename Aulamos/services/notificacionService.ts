import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import {
  api,
} from './api';


// =====================================================
// TIPOS
// =====================================================

export type TipoNotificacion =
  | 'Sistema'
  | 'Actividad'
  | 'Recurso'
  | 'Evaluacion'
  | 'Chatbot'
  | 'Soporte'
  | 'Accesibilidad';


export type Notificacion = {
  id_notificacion: number;

  titulo: string;

  mensaje: string;

  tipo:
    TipoNotificacion;

  entidad_tipo:
    string | null;

  entidad_id:
    number | null;

  leida:
    boolean | number;

  fecha_envio:
    string;
};


export type ResumenNotificaciones = {
  total: number;

  no_leidas: number;
};


export type RespuestaNotificaciones = {
  notificaciones:
    Notificacion[];

  resumen:
    ResumenNotificaciones;
};


// =====================================================
// TOKEN
// =====================================================

const obtenerToken =
  async () => {

    const token =
      await AsyncStorage.getItem(
        'token'
      );


    if (
      !token
    ) {

      throw new Error(
        'Tu sesión terminó. Inicia sesión nuevamente.'
      );
    }


    return token;
  };


// =====================================================
// MENSAJE ERROR
// =====================================================

const obtenerMensajeError = (
  error:
    unknown
) => {

  if (
    axios.isAxiosError(
      error
    )
  ) {

    return (
      error.response?.data
        ?.mensaje
      ||
      error.message
      ||
      'No se pudo conectar con el servidor.'
    );
  }


  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado.';
};


// =====================================================
// OBTENER NOTIFICACIONES
// =====================================================

export const obtenerNotificaciones =
  async (): Promise<
    RespuestaNotificaciones
  > => {

    try {

      const token =
        await obtenerToken();


      const respuesta =
        await api.get<
          RespuestaNotificaciones
        >(
          '/notificaciones',

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      return {
        notificaciones:
          Array.isArray(
            respuesta.data
              .notificaciones
          )
            ? respuesta.data
                .notificaciones
            : [],

        resumen: {
          total:
            Number(
              respuesta.data
                .resumen
                ?.total
              ??
              0
            ),

          no_leidas:
            Number(
              respuesta.data
                .resumen
                ?.no_leidas
              ??
              0
            ),
        },
      };

    } catch (
      error
    ) {

      throw new Error(
        obtenerMensajeError(
          error
        )
      );
    }
  };


// =====================================================
// OBTENER SOLO CANTIDAD NO LEÍDAS
// =====================================================

export const obtenerCantidadNoLeidas =
  async (): Promise<number> => {

    const datos =
      await obtenerNotificaciones();


    return Number(
      datos.resumen.no_leidas
      ??
      0
    );
  };


// =====================================================
// MARCAR UNA COMO LEÍDA
// =====================================================

export const marcarNotificacionComoLeida =
  async (
    idNotificacion:
      number
  ) => {

    try {

      const token =
        await obtenerToken();


      const respuesta =
        await api.patch(
          `/notificaciones/${idNotificacion}/leida`,

          {},

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      return respuesta.data;

    } catch (
      error
    ) {

      throw new Error(
        obtenerMensajeError(
          error
        )
      );
    }
  };


// =====================================================
// MARCAR TODAS
// =====================================================

export const marcarTodasLasNotificaciones =
  async () => {

    try {

      const token =
        await obtenerToken();


      const respuesta =
        await api.patch(
          '/notificaciones/leer-todas',

          {},

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      return respuesta.data;

    } catch (
      error
    ) {

      throw new Error(
        obtenerMensajeError(
          error
        )
      );
    }
  };


// =====================================================
// ELIMINAR
// =====================================================

export const eliminarNotificacion =
  async (
    idNotificacion:
      number
  ) => {

    try {

      const token =
        await obtenerToken();


      const respuesta =
        await api.delete(
          `/notificaciones/${idNotificacion}`,

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      return respuesta.data;

    } catch (
      error
    ) {

      throw new Error(
        obtenerMensajeError(
          error
        )
      );
    }
  };