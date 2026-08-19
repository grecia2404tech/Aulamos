import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { api } from './api';


// =====================================================
// TIPOS GENERALES
// =====================================================

export type PruebaResumen = {
  id_prueba: number;
  nombre: string;
  descripcion?: string | null;
  hipotesis: string;
  objetivo?: string | null;
  version_wcag: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  estado: 'Planeada' | 'Activa' | 'Finalizada';
};

export type ResumenInvestigador = {
  prueba: PruebaResumen | null;

  totalEstudiantes: number;

  estudiantesConsentimiento: number;

  totalAccesos: number;

  erroresRegistrados: number;

  interaccionesChatbot: number;
};



// =====================================================
// MÉTRICAS DE USO
// =====================================================

export type MetricasUso = {
  prueba: PruebaResumen | null;

  totalAccesos: number;
  totalEstudiantes: number;
  promedioAccesos: number;

  moduloMasVisitado: string;

  modulosVisitados: Array<{
    id: number;
    nombre: string;
    visitas: number;
  }>;

  actividadReciente: Array<{
    id: number;
    estudiante: string;
    modulo: string;
    fecha: string;
    hora: string;
  }>;
};


// =====================================================
// TIEMPOS DE ACTIVIDADES
// =====================================================

export type TiemposActividades = {
  prueba: PruebaResumen | null;

  tiempoPromedioGeneral: string;
  actividadMasRapida: string;
  actividadMasLenta: string;

  resumenActividades: Array<{
    id: number;
    nombre: string;
    promedio: string;
    promedioSegundos: number;
    estudiantes: number;
  }>;

  registrosTiempo: Array<{
    id: number;
    estudiante: string;
    actividad: string;
    fechaInicio: string;
    horaInicio: string;
    fechaFin: string;
    horaFin: string;
    tiempoTotal: string;
    minutos: number;
  }>;
};

// =====================================================
// TIEMPOS DE RECURSOS
// =====================================================

export type TiemposRecursos = {
  prueba: PruebaResumen | null;

  tiempoTotalRecursos: string;

  tiempoPromedioRecursos: string;

  totalVisualizaciones: number;

  totalRecursos: number;

  recursoMasConsultado: string;

  resumenRecursos: Array<{
    idRecurso: number;

    titulo: string;

    tipo: string;

    visualizaciones: number;

    estudiantes: number;

    tiempoTotal: string;

    tiempoTotalSegundos: number;

    tiempoPromedio: string;

    tiempoPromedioSegundos: number;

    porcentajePromedio: number;
  }>;

  registrosRecursos: Array<{
    idUso: number;

    idUsuario: number;

    idRecurso: number;

    estudiante: string;

    recurso: string;

    tipo: string;

    tiempoVisualizacion: string;

    tiempoSegundos: number;

    porcentajeVisualizado: number;

    accion: string;

    vecesConsultado: number;

    fecha: string;

    hora: string;
  }>;
};

// =====================================================
// ERRORES DE NAVEGACIÓN
// =====================================================

export type TipoErrorInvestigador =
  | 'Error de navegación'
  | 'Acceso fallido'
  | 'Acción incompleta';


export type ErroresNavegacion = {
  prueba: PruebaResumen | null;

  totalErrores: number;
  estudiantesConErrores: number;
  accesosFallidos: number;
  erroresNavegacion: number;
  accionesIncompletas: number;

  errores: Array<{
    id: number;
    estudiante: string;
    tipo: TipoErrorInvestigador;
    pantalla: string;
    fecha: string;
    hora: string;
    descripcion: string;
  }>;
};


// =====================================================
// ACCESIBILIDAD
// =====================================================

export type TamanoTextoInvestigacion =
  | 'Pequeño'
  | 'Normal'
  | 'Grande'
  | 'Muy Grande';


export type MetricasAccesibilidad = {
  prueba: PruebaResumen | null;

  estudiantesAnalizados: number;
  usanAccesibilidad: number;
  usanAltoContraste: number;
  herramientaPrincipal: string;

  herramientas: Array<{
    id: number;
    nombre: string;
    estudiantes: number;
    porcentaje: number;
  }>;

  preferenciasEstudiantes: Array<{
    idPreferencia: number;
    idUsuario: number;
    estudiante: string;

    altoContraste: boolean;
    modoOscuro: boolean;
    tamanoTexto: TamanoTextoInvestigacion;
    fuenteDislexia: boolean;
    lectorPantalla: boolean;
    velocidadLectura: number;
    subtitulos: boolean;
    idioma: string;
    animaciones: boolean;
    navegacionTeclado: boolean;

    fechaActualizacion: string;
  }>;
};


// =====================================================
// PROGRESO ACADÉMICO
// =====================================================

export type ProgresoAcademico = {
  prueba: PruebaResumen | null;

  progresoPromedio: number;

  actividadesCompletadas: number;
  totalActividades: number;

  evaluacionesRealizadas: number;
  totalEvaluaciones: number;

  estudiantes: Array<{
    id: number;
    estudiante: string;
    porcentaje: number;

    actividadesCompletadas: number;
    totalActividades: number;

    evaluacionesRealizadas: number;
    totalEvaluaciones: number;

    recursosUtilizados: number;
    fechaRegistro: string;
  }>;

  historial: Array<{
    id: number;
    fecha: string;
    porcentaje: number;
  }>;
};


// =====================================================
// REPORTES
// =====================================================

export type ReportesInvestigacion = {
  prueba: PruebaResumen | null;

  resumenes: Array<{
    id: number;
    titulo: string;
    valor: string;
    descripcion: string;
  }>;

  barras: {
    altoContraste: number;
    tamanoTexto: number;
    lectorPantalla: number;
    subtitulos: number;
  };
};


// =====================================================
// PERFIL
// =====================================================

export type PerfilInvestigador = {
  idUsuario: number;
  nombre: string;
  correo: string;
  estado: string;
  roles: string;
  ultimoAcceso?: string | null;
  fechaRegistro: string;
};


// =====================================================
// PRUEBAS DE INVESTIGACIÓN
// =====================================================

export type PruebaInvestigacion = PruebaResumen & {
  participantes: number;
  consentimientos: number;
};


export type CrearPruebaInvestigacion = {
  nombre: string;
  descripcion?: string;
  hipotesis: string;
  objetivo?: string;

  version_wcag?: string;

  fecha_inicio: string;
  fecha_fin?: string | null;

  estado:
    | 'Planeada'
    | 'Activa'
    | 'Finalizada';
};

export const actualizarEstadoPruebaInvestigacion = async (
  idPrueba: number,
  estado: 'Planeada' | 'Activa' | 'Finalizada',
) => {
  try {
    const token = await obtenerToken();

    const respuesta = await api.put<{
      mensaje: string;
      prueba: PruebaResumen;
    }>(
      `/investigacion/pruebas/${idPrueba}/estado`,
      {
        estado,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return respuesta.data;
  } catch (error) {
    throw new Error(obtenerMensajeError(error));
  }
};

// =====================================================
// PARTICIPANTES
// =====================================================

export type AlumnoDisponibleInvestigacion = {
  idUsuario: number;
  nombre: string;
  correo: string;
  estado: string;
};


export type ParticipanteInvestigacion = {
  idParticipante: number;
  idUsuario: number;

  nombre: string;
  correo: string;

  grupo:
    | 'Control'
    | 'Experimental';

  consentimiento: boolean;

  estado: string;

  fechaRegistro: string;
};


export type ParticipanteGuardarInvestigacion = {
  idUsuario: number;

  grupo:
    | 'Control'
    | 'Experimental';

  consentimiento: boolean;
};


// =====================================================
// ESTÁNDARES DE ACCESIBILIDAD
// =====================================================

export type FuncionalidadEstandar = {
  idFuncionalidadEstandar: number;

  modulo: string;

  funcionalidad: string;

  descripcion?: string | null;

  implementado: boolean;
};


export type EstandarInvestigacion = {
  idEstandar: number;

  norma:
    | 'WCAG'
    | 'ISO 9241'
    | 'EN 301549';

  criterio: string;

  nombre: string;

  descripcion: string;

  principio?: string | null;

  nivel?:
    | 'A'
    | 'AA'
    | 'AAA'
    | null;

  referenciaOficial?: string | null;

  funcionalidades: FuncionalidadEstandar[];
};


export type EstandarRelacionadoAlumno = {
  idEstandar: number;

  norma: string;

  criterio: string;

  nombre: string;

  descripcion: string;

  principio?: string | null;

  nivel?: string | null;

  referenciaOficial?: string | null;

  modulo: string;

  funcionalidad: string;

  descripcionFuncionalidad?: string | null;
};


export type PreferenciasEstandaresAlumno = {
  altoContraste: boolean;

  modoOscuro: boolean;

  tamanoTexto: string;

  fuenteDislexia: boolean;

  lectorPantalla: boolean;

  subtitulos: boolean;

  navegacionTeclado: boolean;

  animaciones: boolean;

  idioma: string;

  velocidadLectura: number;

  fechaActualizacion: string;
};


export type EstandaresAlumnoInvestigacion = {
  prueba: PruebaResumen | null;

  alumno: {
    idUsuario: number;
    nombre: string;
    correo: string;
  } | null;

  preferencias:
    | PreferenciasEstandaresAlumno
    | null;

  funcionesUtilizadas: string[];

  estandaresRelacionados:
    EstandarRelacionadoAlumno[];
};


// =====================================================
// AYUDA
// =====================================================

export type ContenidoAyuda = {
  idContenido: number;

  tipo:
    | 'Faq'
    | 'Guia'
    | 'Audio';

  titulo: string;
  contenido: string;

  urlAudio?: string | null;

  palabrasClave?: string | null;

  fechaPublicacion: string;
};


// =====================================================
// CHATBOT
// =====================================================

export type MetricasChatbot = {
  periodo: {
    fecha_inicio: string;
    fecha_fin: string;
    dias: number;
  };

  resumen: {
    total_interacciones: number;
    estudiantes_usuarios: number;
    total_sesiones: number;
    promedio_tiempo_respuesta_ms: number;
    preguntas_hoy: number;
  };

  interacciones_por_dia: Array<{
    fecha: string;
    cantidad: number;
  }>;

  consultas_por_tipo: Array<{
    tipo_consulta: string;
    cantidad: number;
  }>;

  interacciones_recientes: Array<{
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
  }>;
};


// =====================================================
// TOKEN
// =====================================================

const obtenerToken = async () => {
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
};


// =====================================================
// MANEJO DE ERRORES
// =====================================================

const obtenerMensajeError = (
  error: unknown,
) => {
  if (
    axios.isAxiosError(error)
  ) {
    return (
      error.response?.data?.mensaje
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
// FUNCIÓN GENERAL GET
// =====================================================

const consultar = async <T>(
  ruta: string,
  idPrueba?: number,
): Promise<T> => {
  try {
    const token =
      await obtenerToken();

    const respuesta =
      await api.get<T>(
        ruta,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          params:
            idPrueba
              ? {
                  id_prueba:
                    idPrueba,
                }
              : undefined,
        },
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
// RESUMEN
// =====================================================

export const obtenerResumenInvestigador =
  (idPrueba?: number) =>
    consultar<ResumenInvestigador>(
      '/investigacion/resumen',
      idPrueba,
    );


// =====================================================
// MÉTRICAS DE USO
// =====================================================

export const obtenerMetricasUso =
  (idPrueba?: number) =>
    consultar<MetricasUso>(
      '/investigacion/metricas-uso',
      idPrueba,
    );


// =====================================================
// TIEMPOS DE ACTIVIDADES
// =====================================================

export const obtenerTiemposActividades =
  (idPrueba?: number) =>
    consultar<TiemposActividades>(
      '/investigacion/tiempos-actividades',
      idPrueba,
    );


// =====================================================
// TIEMPOS DE RECURSOS
// =====================================================

export const obtenerTiemposRecursos =
  (idPrueba?: number) =>
    consultar<TiemposRecursos>(
      '/investigacion/tiempos-recursos',
      idPrueba,
    );


// =====================================================
// ERRORES
// =====================================================

export const obtenerErroresNavegacion =
  (idPrueba?: number) =>
    consultar<ErroresNavegacion>(
      '/investigacion/errores-navegacion',
      idPrueba,
    );


// =====================================================
// ACCESIBILIDAD
// =====================================================

export const obtenerMetricasAccesibilidad =
  (idPrueba?: number) =>
    consultar<MetricasAccesibilidad>(
      '/investigacion/metricas-accesibilidad',
      idPrueba,
    );


// =====================================================
// PROGRESO
// =====================================================

export const obtenerProgresoAcademico =
  (idPrueba?: number) =>
    consultar<ProgresoAcademico>(
      '/investigacion/progreso-academico',
      idPrueba,
    );


// =====================================================
// REPORTES
// =====================================================

export const obtenerReportesInvestigacion =
  (idPrueba?: number) =>
    consultar<ReportesInvestigacion>(
      '/investigacion/reportes',
      idPrueba,
    );


// =====================================================
// PERFIL
// =====================================================

export const obtenerPerfilInvestigador =
  async () => {
    const respuesta =
      await consultar<{
        perfil: PerfilInvestigador;
      }>(
        '/investigacion/perfil',
      );

    return respuesta.perfil;
  };


// =====================================================
// PRUEBAS
// =====================================================

export const obtenerPruebasInvestigacion =
  async () => {
    const respuesta =
      await consultar<{
        pruebas:
          PruebaInvestigacion[];
      }>(
        '/investigacion/pruebas',
      );

    return respuesta.pruebas;
  };


export const crearPruebaInvestigacion =
  async (
    datos:
      CrearPruebaInvestigacion,
  ) => {
    try {
      const token =
        await obtenerToken();

      const respuesta =
        await api.post<{
          mensaje: string;
          prueba:
            PruebaInvestigacion;
        }>(
          '/investigacion/pruebas',

          datos,

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
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
// ALUMNOS DISPONIBLES
// =====================================================

export const obtenerAlumnosDisponiblesInvestigacion =
  async () => {
    try {
      const token =
        await obtenerToken();

      const respuesta =
        await api.get<{
          mensaje: string;

          alumnos:
            AlumnoDisponibleInvestigacion[];
        }>(
          '/investigacion/alumnos-disponibles',

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      return respuesta.data.alumnos;
    } catch (error) {
      throw new Error(
        obtenerMensajeError(
          error
        )
      );
    }
  };


// =====================================================
// OBTENER PARTICIPANTES
// =====================================================

export const obtenerParticipantesInvestigacion =
  async (
    idPrueba?: number,
  ) => {
    return consultar<{
      prueba:
        PruebaResumen | null;

      participantes:
        ParticipanteInvestigacion[];
    }>(
      '/investigacion/participantes',
      idPrueba,
    );
  };


// =====================================================
// GUARDAR PARTICIPANTES
// =====================================================

export const guardarParticipantesInvestigacion =
  async (
    idPrueba: number,

    participantes:
      ParticipanteGuardarInvestigacion[],
  ) => {
    try {
      const token =
        await obtenerToken();

      const respuesta =
        await api.post<{
          mensaje: string;
          totalParticipantes: number;
        }>(
          '/investigacion/participantes',

          {
            id_prueba:
              idPrueba,

            participantes,
          },

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
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
// CATÁLOGO DE ESTÁNDARES
// =====================================================

export const obtenerEstandaresInvestigacion =
  async () => {
    try {
      const respuesta =
        await consultar<{
          mensaje: string;
          estandares:
            EstandarInvestigacion[];
        }>(
          '/investigacion/estandares',
        );

      return respuesta.estandares;
    } catch (error) {
      throw new Error(
        obtenerMensajeError(
          error
        )
      );
    }
  };


// =====================================================
// ESTÁNDARES DE UN ALUMNO
// =====================================================

export const obtenerEstandaresAlumnoInvestigacion =
  async (
    idUsuario: number,
    idPrueba?: number,
  ): Promise<EstandaresAlumnoInvestigacion> => {
    try {
      const token =
        await obtenerToken();

      const respuesta =
        await api.get<EstandaresAlumnoInvestigacion>(
          `/investigacion/estandares/alumno/${idUsuario}`,

          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            params:
              idPrueba
                ? {
                    id_prueba:
                      idPrueba,
                  }
                : undefined,
          },
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
// AYUDA
// =====================================================

export const obtenerAyudaInvestigador =
  async () => {
    const respuesta =
      await consultar<{
        contenidos:
          ContenidoAyuda[];
      }>(
        '/investigacion/ayuda',
      );

    return respuesta.contenidos;
  };


// =====================================================
// CHATBOT
// =====================================================

export const obtenerMetricasChatbot = async (
  dias: number = 7,
  idPrueba?: number,
): Promise<MetricasChatbot> => {
  try {
    const token = await obtenerToken();

    const respuesta = await api.get<MetricasChatbot>(
      '/investigacion/metricas-chatbot',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },

        params: {
          dias,

          ...(idPrueba
            ? {
                id_prueba: idPrueba,
              }
            : {}),
        },
      },
    );

    return respuesta.data;

  } catch (error) {
    throw new Error(
      obtenerMensajeError(error),
    );
  }
};