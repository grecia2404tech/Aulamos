import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import {
  api,
} from './api';


// =====================================================
// PERFIL
// =====================================================

export type PerfilUsuario = {
  idUsuario: number;

  nombre: string;

  apellidoPaterno: string;

  apellidoMaterno: string;

  nombreCompleto: string;

  correo: string;

  fotoPerfil: string | null;

  rol: string;

  roles: string[];

  estado:
    | 'Activo'
    | 'Inactivo'
    | 'Bloqueado';

  fechaRegistro:
    string | null;

  fechaActualizacion:
    string | null;

  ultimoAcceso:
    string | null;

  datosPerfil:
    Record<string, unknown>;
};


// =====================================================
// DATOS PARA ACTUALIZAR PERFIL
// =====================================================

export type DatosActualizarPerfil = {
  nombre: string;

  apellido_paterno: string;

  apellido_materno?: string;

  correo: string;

  datos_perfil?: Record<
    string,
    unknown
  >;
};


// =====================================================
// CAMBIAR CONTRASEÑA
// =====================================================

export type DatosCambiarPassword = {
  password_actual: string;

  password_nuevo: string;

  password_confirmar: string;
};


// =====================================================
// ARCHIVO DE FOTO
// =====================================================

export type FotoPerfilArchivo = {
  uri: string;

  nombre?: string;

  tipo?: string;
};


// =====================================================
// RESPUESTA FOTO
// =====================================================

export type RespuestaFotoPerfil = {
  mensaje: string;

  fotoPerfil: string;
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
// MANEJO DE ERRORES
// =====================================================

const obtenerMensajeError = (
  error: unknown
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
// OBTENER PERFIL
// =====================================================

export const obtenerPerfil =
  async (): Promise<PerfilUsuario> => {

    try {

      const token =
        await obtenerToken();


      const respuesta =
        await api.get<{
          mensaje: string;

          perfil: PerfilUsuario;
        }>(
          '/perfil',

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      return respuesta.data.perfil;

    } catch (error) {

      throw new Error(
        obtenerMensajeError(
          error
        )
      );
    }
  };


// =====================================================
// ACTUALIZAR PERFIL
// =====================================================

export const actualizarPerfil =
  async (
    datos:
      DatosActualizarPerfil
  ) => {

    try {

      const token =
        await obtenerToken();


      const respuesta =
        await api.put(
          '/perfil',

          datos,

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      return respuesta.data;

    } catch (error) {

      throw new Error(
        obtenerMensajeError(
          error
        )
      );
    }
  };


// =====================================================
// CAMBIAR CONTRASEÑA
// =====================================================

export const cambiarPassword =
  async (
    datos:
      DatosCambiarPassword
  ) => {

    try {

      const token =
        await obtenerToken();


      const respuesta =
        await api.put(
          '/perfil/password',

          datos,

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      return respuesta.data;

    } catch (error) {

      throw new Error(
        obtenerMensajeError(
          error
        )
      );
    }
  };


// =====================================================
// ACTUALIZAR FOTO DE PERFIL
// =====================================================

export const actualizarFotoPerfil =
  async (
    archivo: FotoPerfilArchivo
  ): Promise<RespuestaFotoPerfil> => {

    try {
      const token =
        await obtenerToken();

      if (!archivo.uri) {
        throw new Error(
          'No se recibió la imagen seleccionada.'
        );
      }

      // =================================================
      // OBTENER NOMBRE
      // =================================================

      let nombreArchivo =
        archivo.nombre
        ||
        archivo.uri
          .split('/')
          .pop()
        ||
        `foto_${Date.now()}.jpg`;

      // =================================================
      // DETERMINAR MIME
      // =================================================

      const extension =
        nombreArchivo
          .split('.')
          .pop()
          ?.toLowerCase();

      let tipoMime =
        archivo.tipo;

      if (
        !tipoMime
        ||
        !tipoMime.startsWith('image/')
      ) {
        switch (extension) {
          case 'png':
            tipoMime = 'image/png';
            break;

          case 'webp':
            tipoMime = 'image/webp';
            break;

          case 'gif':
            tipoMime = 'image/gif';
            break;

          case 'heic':
            tipoMime = 'image/heic';
            break;

          case 'heif':
            tipoMime = 'image/heif';
            break;

          case 'avif':
            tipoMime = 'image/avif';
            break;

          case 'bmp':
            tipoMime = 'image/bmp';
            break;

          case 'jpeg':
          case 'jpg':
          default:
            tipoMime = 'image/jpeg';
            break;
        }
      }

      // Si el nombre no trae extensión,
      // añadimos una.
      if (
        !nombreArchivo.includes('.')
      ) {
        nombreArchivo += '.jpg';
      }

      // =================================================
      // FORMDATA
      // =================================================

      const formData =
        new FormData();

      formData.append(
        'foto',
        {
          uri: archivo.uri,
          name: nombreArchivo,
          type: tipoMime,
        } as any
      );

      // =================================================
      // ENVIAR
      // =================================================

      const respuesta =
        await api.put<RespuestaFotoPerfil>(
          '/perfil/foto',
          formData,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,

              // IMPORTANTE:
              // tu API probablemente utiliza
              // application/json por defecto.
              'Content-Type':
                'multipart/form-data',
            },
          }
        );

      return respuesta.data;

    } catch (error) {
      throw new Error(
        obtenerMensajeError(error)
      );
    }
  };