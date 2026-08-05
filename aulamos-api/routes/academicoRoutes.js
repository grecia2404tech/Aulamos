const express = require('express');

const {
  obtenerCiclos,
  obtenerCicloActivo,
  crearCiclo,
  actualizarCiclo,
  cambiarEstadoCiclo,
} = require('../controllers/cicloEscolarController');

const {
  obtenerPeriodos,
  obtenerPeriodoActivo,
  crearPeriodo,
  actualizarPeriodo,
  cambiarEstadoPeriodo,
} = require('../controllers/periodoEvaluacionController');

const {
  obtenerMaterias,
  obtenerMateriasActivas,
  crearMateria,
  actualizarMateria,
  cambiarEstadoMateria,
} = require('../controllers/materiaController');

const {
  obtenerGrupos,
  obtenerGruposActivos,
  obtenerDocentesActivos,
  crearGrupo,
  actualizarGrupo,
  cambiarEstadoGrupo,
} = require('../controllers/grupoController');

const {
  obtenerCursos,
  obtenerCursosActivos,
  crearCurso,
  actualizarCurso,
  cambiarEstadoCurso,
} = require('../controllers/cursoController');

const {
  listarInscripciones,
  listarAlumnosDisponibles,
  listarCursosDisponibles,
  crearInscripcion,
  actualizarInscripcion,
  cambiarEstadoInscripcion,
} = require('../controllers/inscripcionController');

const {
  obtenerCatalogosActividad,
  crearActividad,
  obtenerMisActividadesAlumno,
  obtenerMisActividadesDocente,
  obtenerDetalleActividad,
} = require('../controllers/actividadController');

const {
  crearEntregaActividad,
  listarEntregasActividad,
  obtenerRespuestasEvaluacionEntrega,
  calificarEntrega,
} = require('../controllers/entregaController');

const {
  obtenerCatalogosRecurso,
  crearRecurso,
  listarRecursosDocente,
  listarBibliotecaAlumno,
  obtenerRecursoParaReproductor,
  cambiarEstadoRecurso,
  registrarUsoRecurso,
} = require('../controllers/recursoController');

const {
  procesarArchivoEntrega,
} = require('../middleware/uploadEntrega');

const {
  procesarArchivoRecurso,
} = require('../middleware/uploadRecurso');

const {
  verificarToken,
  verificarRol,
} = require('../middleware/authMiddleware');

const router = express.Router();

/*
 * CICLOS ESCOLARES
 */

router.get(
  '/ciclos/activo',
  verificarToken,
  obtenerCicloActivo
);

router.get(
  '/ciclos',
  verificarToken,
  verificarRol('Admin'),
  obtenerCiclos
);

router.post(
  '/ciclos',
  verificarToken,
  verificarRol('Admin'),
  crearCiclo
);

router.put(
  '/ciclos/:id',
  verificarToken,
  verificarRol('Admin'),
  actualizarCiclo
);

router.patch(
  '/ciclos/:id/estado',
  verificarToken,
  verificarRol('Admin'),
  cambiarEstadoCiclo
);

/*
 * PERIODOS DE EVALUACIÓN
 */

router.get(
  '/periodos/activo',
  verificarToken,
  obtenerPeriodoActivo
);

router.get(
  '/periodos',
  verificarToken,
  verificarRol('Admin'),
  obtenerPeriodos
);

router.post(
  '/periodos',
  verificarToken,
  verificarRol('Admin'),
  crearPeriodo
);

router.put(
  '/periodos/:id',
  verificarToken,
  verificarRol('Admin'),
  actualizarPeriodo
);

router.patch(
  '/periodos/:id/estado',
  verificarToken,
  verificarRol('Admin'),
  cambiarEstadoPeriodo
);

/*
 * MATERIAS
 */

router.get(
  '/materias/activas',
  verificarToken,
  obtenerMateriasActivas
);

router.get(
  '/materias',
  verificarToken,
  verificarRol('Admin'),
  obtenerMaterias
);

router.post(
  '/materias',
  verificarToken,
  verificarRol('Admin'),
  crearMateria
);

router.put(
  '/materias/:id',
  verificarToken,
  verificarRol('Admin'),
  actualizarMateria
);

router.patch(
  '/materias/:id/estado',
  verificarToken,
  verificarRol('Admin'),
  cambiarEstadoMateria
);

/*
 * GRUPOS Y DOCENTES
 */

router.get(
  '/docentes/activos',
  verificarToken,
  verificarRol('Admin'),
  obtenerDocentesActivos
);

router.get(
  '/grupos/activos',
  verificarToken,
  obtenerGruposActivos
);

router.get(
  '/grupos',
  verificarToken,
  verificarRol('Admin'),
  obtenerGrupos
);

router.post(
  '/grupos',
  verificarToken,
  verificarRol('Admin'),
  crearGrupo
);

router.put(
  '/grupos/:id',
  verificarToken,
  verificarRol('Admin'),
  actualizarGrupo
);

router.patch(
  '/grupos/:id/estado',
  verificarToken,
  verificarRol('Admin'),
  cambiarEstadoGrupo
);

/*
 * CURSOS
 */

router.get(
  '/cursos/activos',
  verificarToken,
  obtenerCursosActivos
);

router.get(
  '/cursos',
  verificarToken,
  verificarRol('Admin'),
  obtenerCursos
);

router.post(
  '/cursos',
  verificarToken,
  verificarRol('Admin'),
  crearCurso
);

router.put(
  '/cursos/:id',
  verificarToken,
  verificarRol('Admin'),
  actualizarCurso
);

router.patch(
  '/cursos/:id/estado',
  verificarToken,
  verificarRol('Admin'),
  cambiarEstadoCurso
);

/*
 * INSCRIPCIONES
 */

router.get(
  '/inscripciones',
  verificarToken,
  verificarRol('Admin'),
  listarInscripciones
);

router.get(
  '/inscripciones/alumnos-disponibles',
  verificarToken,
  verificarRol('Admin'),
  listarAlumnosDisponibles
);

router.get(
  '/inscripciones/cursos-disponibles',
  verificarToken,
  verificarRol('Admin'),
  listarCursosDisponibles
);

router.post(
  '/inscripciones',
  verificarToken,
  verificarRol('Admin'),
  crearInscripcion
);

router.put(
  '/inscripciones/:id',
  verificarToken,
  verificarRol('Admin'),
  actualizarInscripcion
);

router.patch(
  '/inscripciones/:id/estado',
  verificarToken,
  verificarRol('Admin'),
  cambiarEstadoInscripcion
);

/*
 * RECURSOS EDUCATIVOS
 */

router.get(
  '/recursos/catalogos',
  verificarToken,
  verificarRol('Docente'),
  obtenerCatalogosRecurso
);

router.get(
  '/recursos/mis-recursos-docente',
  verificarToken,
  verificarRol('Docente'),
  listarRecursosDocente
);

router.get(
  '/recursos/biblioteca-alumno',
  verificarToken,
  verificarRol('Alumno'),
  listarBibliotecaAlumno
);

/*
 * Obtiene la información y las URLs necesarias para
 * reproducir un video y mostrar sus subtítulos.
 */
router.get(
  '/recursos/:id/reproductor',
  verificarToken,
  verificarRol('Alumno'),
  obtenerRecursoParaReproductor
);

router.post(
  '/recursos',
  verificarToken,
  verificarRol('Docente'),
  procesarArchivoRecurso,
  crearRecurso
);

router.patch(
  '/recursos/:id/estado',
  verificarToken,
  verificarRol('Docente'),
  cambiarEstadoRecurso
);

router.post(
  '/recursos/:id/uso',
  verificarToken,
  verificarRol('Alumno'),
  registrarUsoRecurso
);

/*
 * ACTIVIDADES Y ENTREGAS
 */

router.get(
  '/actividades/catalogos',
  verificarToken,
  verificarRol('Docente'),
  obtenerCatalogosActividad
);

router.get(
  '/actividades/mis-actividades-alumno',
  verificarToken,
  verificarRol('Alumno'),
  obtenerMisActividadesAlumno
);

router.get(
  '/actividades/mis-actividades-docente',
  verificarToken,
  verificarRol('Docente'),
  obtenerMisActividadesDocente
);

router.post(
  '/actividades/:id/entrega',
  verificarToken,
  verificarRol('Alumno'),
  procesarArchivoEntrega,
  crearEntregaActividad
);

router.get(
  '/actividades/:id/entregas',
  verificarToken,
  verificarRol('Docente'),
  listarEntregasActividad
);

/*
 * Permite al docente consultar las respuestas
 * que el alumno envió en una evaluación.
 */
router.get(
  '/entregas/:id/respuestas-evaluacion',
  verificarToken,
  verificarRol('Docente'),
  obtenerRespuestasEvaluacionEntrega
);

router.patch(
  '/entregas/:id/calificar',
  verificarToken,
  verificarRol('Docente'),
  calificarEntrega
);

/*
 * Esta ruta debe permanecer después de las rutas
 * específicas para evitar conflictos con el parámetro :id.
 */
router.get(
  '/actividades/:id',
  verificarToken,
  obtenerDetalleActividad
);

router.post(
  '/actividades',
  verificarToken,
  verificarRol('Docente'),
  crearActividad
);

module.exports = router;