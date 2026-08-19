import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

import { api } from './api';


// =====================================================
// TIPOS DE EVENTO
// =====================================================

export type TipoEventoInvestigacion =
  | 'InicioSesion'
  | 'CerrarSesion'
  | 'Navegacion'
  | 'Actividad'
  | 'Entrega'
  | 'Chatbot'
  | 'Accesibilidad'
  | 'Error'
  | 'Busqueda'
  | 'Recurso';


// =====================================================
// TIPOS DE INTERACCIÓN
// =====================================================

export type TipoInteraccion =
  | 'Mouse'
  | 'Teclado'
  | 'Touch'
  | 'Voz';


// =====================================================
// DATOS DE EVENTO
// =====================================================

export interface DatosEventoInvestigacion {
  id_prueba?: number;
  id_actividad?: number;

  tipo_evento: TipoEventoInvestigacion;

  accion: string;

  modulo?: string;

  pantalla?: string;

  descripcion?: string;

  navegador?: string;

  dispositivo?: string;

  tipo_interaccion?: TipoInteraccion;

  cantidad_clicks?: number;

  cantidad_scroll?: number;

  cantidad_teclas?: number;

  duracion_segundos?: number;
}


// =====================================================
// DATOS DE ERROR
// =====================================================

export interface DatosErrorInvestigacion {
  accion: string;

  error: unknown;

  modulo?: string;

  pantalla?: string;

  descripcionAdicional?: string;
}


// =====================================================
// USUARIO GUARDADO
// =====================================================

type UsuarioGuardado = {
  id_usuario?: number;

  rol?: string;

  nombre?: string;

  correo?: string;
};


// =====================================================
// DISPOSITIVO
// =====================================================

const obtenerDispositivo = () => {
  switch (Platform.OS) {
    case 'android':
      return 'Android';

    case 'ios':
      return 'iOS';

    case 'web':
      return 'Web';

    default:
      return Platform.OS;
  }
};


// =====================================================
// DESCRIPCIÓN DE ERROR
// =====================================================

const obtenerDescripcionError = (
  error: unknown,
) => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return (
      JSON.stringify(error) ??
      'Error desconocido'
    );
  } catch {
    return 'Error desconocido';
  }
};


// =====================================================
// VALIDAR SI EL USUARIO ES PARTICIPANTE POTENCIAL
//
// SOLO ALUMNOS / ESTUDIANTES PUEDEN GENERAR
// EVENTOS DE INVESTIGACIÓN.
//
// DOCENTE, ADMIN E INVESTIGADOR NO DEBEN
// INTENTAR ENVIAR EVENTOS.
// =====================================================

const usuarioPuedeRegistrarInvestigacion =
  async (): Promise<boolean> => {

    try {
      const usuarioTexto =
        await AsyncStorage.getItem(
          'usuario',
        );

      if (!usuarioTexto) {
        return false;
      }

      const usuario =
        JSON.parse(
          usuarioTexto,
        ) as UsuarioGuardado;

      const rol =
        String(
          usuario.rol ?? '',
        )
          .trim()
          .toLowerCase();

      return (
        rol === 'alumno' ||
        rol === 'estudiante'
      );
    } catch (error) {
      if (__DEV__) {
        console.warn(
          'No se pudo identificar el rol para investigación:',
          error,
        );
      }

      return false;
    }
  };


// =====================================================
// REGISTRAR EVENTO
// =====================================================

export const registrarEventoInvestigacion =
  async (
    evento:
      DatosEventoInvestigacion,
  ): Promise<boolean> => {

    try {

      // =================================================
      // 1. VALIDAR ROL
      // =================================================

      const puedeRegistrar =
        await usuarioPuedeRegistrarInvestigacion();

      if (!puedeRegistrar) {

        // No es error.
        // Docente, Admin e Investigador
        // simplemente no participan en las pruebas.

        return false;
      }


      // =================================================
      // 2. VALIDAR TOKEN
      // =================================================

      const token =
        await AsyncStorage.getItem(
          'token',
        );

      if (!token) {
        return false;
      }


      // =================================================
      // 3. ENVIAR EVENTO
      // =================================================

      await api.post(
        '/investigacion/eventos',

        {
          ...evento,

          dispositivo:
            evento.dispositivo ??
            obtenerDispositivo(),

          cantidad_clicks:
            evento.cantidad_clicks ??
            0,

          cantidad_scroll:
            evento.cantidad_scroll ??
            0,

          cantidad_teclas:
            evento.cantidad_teclas ??
            0,

          duracion_segundos:
            evento.duracion_segundos ??
            0,
        },

        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      );


      return true;

    } catch (error) {

      // =================================================
      // ALUMNO SIN PRUEBA ACTIVA
      // =================================================
      //
      // Esto tampoco debe ensuciar la consola.
      //
      // El backend responde 403 cuando:
      // - el alumno no está en participantes_prueba
      // - no tiene consentimiento
      // - la prueba no está activa
      // - la prueba está fuera de fechas
      // =================================================

      if (
        axios.isAxiosError(error)
        &&
        error.response?.status === 403
      ) {
        return false;
      }


      // =================================================
      // ALUMNO CON VARIAS PRUEBAS ACTIVAS
      // =================================================

      if (
        axios.isAxiosError(error)
        &&
        error.response?.status === 409
      ) {
        if (__DEV__) {
          console.warn(
            'El alumno pertenece a más de una prueba activa. Se requiere id_prueba.',
            error.response?.data,
          );
        }

        return false;
      }


      // =================================================
      // OTROS ERRORES
      // =================================================

      if (__DEV__) {
        if (
          axios.isAxiosError(error)
        ) {
          console.warn(
            'No se registró el evento de investigación:',
            error.response?.status,
            error.response?.data ??
              error.message,
          );
        } else {
          console.warn(
            'Error desconocido al registrar el evento:',
            error,
          );
        }
      }

      return false;
    }
  };


// =====================================================
// REGISTRAR ERROR
// =====================================================

export const registrarErrorInvestigacion =
  async (
    datos:
      DatosErrorInvestigacion,
  ): Promise<boolean> => {

    const detalleError =
      obtenerDescripcionError(
        datos.error,
      );


    const descripcion = [
      datos.descripcionAdicional,

      detalleError,
    ]
      .filter(Boolean)
      .join(' | ')
      .slice(0, 8000);


    return registrarEventoInvestigacion({
      tipo_evento:
        'Error',

      accion:
        datos.accion,

      modulo:
        datos.modulo ??
        'Aplicación',

      pantalla:
        datos.pantalla ??
        'Desconocida',

      descripcion,

      cantidad_clicks:
        0,

      cantidad_scroll:
        0,

      cantidad_teclas:
        0,

      duracion_segundos:
        0,
    });
  };