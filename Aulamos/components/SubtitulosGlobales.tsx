import {
  usePathname,
} from 'expo-router';

import {
  useEffect,
  useRef,
} from 'react';

import {
  useAccessibility,
} from '../contexts/AccessibilityContext';


// =====================================================
// DESCRIPCIONES POR RUTA
// =====================================================

const DESCRIPCIONES: Record<
  string,
  string
> = {

  '/':
    'Pantalla de inicio de AULAMOS. Desde aquí puedes iniciar sesión o acceder a las opciones principales.',


  // ===================================================
  // AUTENTICACIÓN
  // ===================================================

  '/crear-cuenta':
    'Pantalla para seleccionar el tipo de cuenta que deseas crear.',

  '/crear-cuenta-alumno':
    'Pantalla para crear una nueva cuenta de alumno.',

  '/crear-cuenta-docente':
    'Pantalla para crear una nueva cuenta de docente.',

  '/recuperar-password':
    'Pantalla para recuperar la contraseña de tu cuenta.',

  '/restablecer-password':
    'Pantalla para establecer una nueva contraseña.',


  // ===================================================
  // ALUMNO
  // ===================================================

  '/inicio-alumno':
    'Inicio del alumno. Aquí puedes consultar tus actividades, biblioteca, avances y opciones de ayuda.',

  '/mis-actividades-alumno':
    'Mis actividades. Aquí puedes consultar actividades pendientes, completadas y próximas.',

  '/detalle-actividad':
    'Detalle de actividad. Aquí puedes consultar instrucciones, recursos y datos de la actividad.',

  '/bibloteca-alumno':
    'Biblioteca del alumno. Aquí puedes consultar los recursos educativos disponibles.',

  '/reproductor-video':
    'Reproductor de video. Aquí puedes visualizar un recurso audiovisual y consultar sus controles.',

  '/visor-documento':
    'Visor de documento. Aquí puedes consultar un recurso educativo en formato documento.',

  '/mis-avances':
    'Mis avances. Aquí puedes consultar tu progreso académico y actividades completadas.',

  '/evaluaciones-alumno':
    'Evaluaciones del alumno. Aquí puedes consultar y responder evaluaciones disponibles.',

  '/menu-alumno':
    'Menú del alumno. Desde aquí puedes acceder a las diferentes secciones de AULAMOS.',


  // ===================================================
  // DOCENTE
  // ===================================================

  '/inicio-docente':
    'Inicio del docente. Aquí puedes consultar tus clases, actividades, estudiantes y recursos.',

  '/clases-docente':
    'Clases del docente. Aquí puedes consultar los cursos y grupos asignados.',

  '/crear-recurso':
    'Crear recurso. Aquí puedes publicar un nuevo recurso educativo para tus estudiantes.',

  '/crear-actividad':
    'Crear actividad. Aquí puedes registrar una nueva actividad para tus estudiantes.',

  '/crear-evaluacion':
    'Crear evaluación. Aquí puedes crear una evaluación y agregar sus preguntas.',

  '/calificar-entrega':
    'Calificar entrega. Aquí puedes revisar y asignar una calificación al trabajo del estudiante.',

  '/estudiantes-docente':
    'Estudiantes del docente. Aquí puedes consultar los alumnos inscritos en tus cursos.',

  '/pasar-lista':
    'Pasar lista. Aquí puedes registrar la asistencia de tus estudiantes.',

  '/recursos-docente':
    'Recursos del docente. Aquí puedes consultar y administrar los recursos educativos publicados.',

  '/detalle-estudiante':
    'Detalle del estudiante. Aquí puedes consultar información académica y progreso del alumno.',

  '/menu-docente':
    'Menú del docente. Desde aquí puedes acceder a las funciones disponibles para tu rol.',

  '/reportes':
    'Reportes del docente. Aquí puedes consultar información sobre rendimiento y asistencia.',

  '/reporte-rendimiento-actividad':
    'Reporte de rendimiento por actividad.',

  '/reporte-rendimiento-evaluacion':
    'Reporte de rendimiento por evaluación.',

  '/reporte-asistencia':
    'Reporte de asistencia de estudiantes.',


  // ===================================================
  // ADMIN
  // ===================================================

  '/inicio-admin':
    'Panel de administración. Aquí puedes gestionar la información académica de AULAMOS.',

  '/admin-ciclos':
    'Administración de ciclos escolares.',

  '/admin-periodos':
    'Administración de periodos de evaluación.',

  '/admin-materias':
    'Administración de materias.',

  '/admin-grupos':
    'Administración de grupos.',

  '/admin-cursos':
    'Administración de cursos.',

  '/admin-inscripciones':
    'Administración de inscripciones de estudiantes.',


  // ===================================================
  // ACCESIBILIDAD
  // ===================================================

  '/accesibilidad':
    'Configuración de accesibilidad. Aquí puedes cambiar el contraste, tamaño del texto, lector, subtítulos y navegación.',


  // ===================================================
  // INVESTIGADOR
  // ===================================================

  '/investigador':
    'Panel de investigación. Aquí puedes consultar métricas y resultados de las pruebas de investigación.',

  '/investigador/metricas-uso':
    'Métricas de uso. Aquí puedes consultar accesos, módulos visitados y actividad reciente.',

  '/investigador/tiempos-actividades':
    'Tiempos de actividades. Aquí puedes consultar el tiempo empleado en actividades y recursos.',

  '/investigador/errores-navegacion':
    'Errores de navegación. Aquí puedes consultar los errores registrados durante la prueba.',

  '/investigador/metricas-chatbot':
    'Métricas del chatbot. Aquí puedes consultar las interacciones de los estudiantes con AulaBot.',

  '/investigador/progreso-investigacion':
    'Progreso académico de investigación. Aquí puedes consultar el avance de los estudiantes participantes.',

  '/investigador/metricas-accesibilidad':
    'Métricas de accesibilidad. Aquí puedes consultar las herramientas de accesibilidad utilizadas por los participantes.',

  '/investigador/reportes-investigacion':
    'Reportes de investigación. Aquí puedes consultar el resumen general de los resultados.',

  '/investigador/pruebas-investigacion':
    'Pruebas de investigación. Aquí puedes crear, seleccionar y administrar pruebas.',

  '/investigador/participantes':
    'Participantes de investigación. Aquí puedes seleccionar estudiantes y administrar su consentimiento.',

  '/investigador/estandares-accesibilidad':
    'Estándares de accesibilidad. Aquí puedes consultar los criterios y estándares relacionados con AULAMOS.',
};


// =====================================================
// COMPONENTE
// =====================================================

export default function SubtitulosGlobales() {

  const pathname =
    usePathname();

  const {
    preferencias,
    mostrarSubtitulo,
    ocultarSubtitulo,
  } =
    useAccessibility();


  const ultimaRutaRef =
    useRef<string | null>(
      null
    );


  useEffect(() => {

    // =================================================
    // SUBTÍTULOS DESACTIVADOS
    // =================================================

    if (
      !preferencias.subtitulos
    ) {

      ocultarSubtitulo();

      ultimaRutaRef.current =
        null;

      return;
    }


    // =================================================
    // EVITAR REPETIR EN LA MISMA RUTA
    // =================================================

    if (
      ultimaRutaRef.current ===
      pathname
    ) {
      return;
    }


    ultimaRutaRef.current =
      pathname;


    // =================================================
    // BUSCAR DESCRIPCIÓN
    // =================================================

    const descripcion =
      DESCRIPCIONES[
        pathname
      ];


    if (
      descripcion
    ) {

      mostrarSubtitulo(
        descripcion,
        6500
      );

      return;
    }


    // =================================================
    // RUTAS DINÁMICAS DE INVESTIGADOR
    // =================================================

    if (
      pathname.startsWith(
        '/investigador'
      )
    ) {

      mostrarSubtitulo(
        'Sección del módulo de investigación de AULAMOS.',
        6500
      );

      return;
    }


    // =================================================
    // RUTA SIN DESCRIPCIÓN
    // =================================================

    mostrarSubtitulo(
      'Nueva pantalla de AULAMOS.',
      4500
    );

  }, [
    pathname,
    preferencias.subtitulos,
    mostrarSubtitulo,
    ocultarSubtitulo,
  ]);


  return null;
}