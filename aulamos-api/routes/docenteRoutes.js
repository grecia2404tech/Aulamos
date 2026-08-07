const express = require('express');

const {
  obtenerInicioDocente,
  obtenerEstudiantesDocente,
  obtenerRecursosDocente,
  obtenerProgresoEstudiante,
  obtenerAsistenciaDocente,
  obtenerClasesDocente,
} = require('../controllers/docenteController');

const {
  obtenerMateriasDocente,
  obtenerResumenReportes,
  obtenerRendimientoActividades,
  obtenerRendimientoEvaluaciones,
} = require(
  '../controllers/reportesDocenteController'
);

const {
  verificarToken,
  verificarRol,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.get(
  '/inicio',
  verificarToken,
  verificarRol('Docente'),
  obtenerInicioDocente
);

/*
 * Clases activas asignadas al docente autenticado.
 */
router.get(
  '/clases',
  verificarToken,
  verificarRol('Docente'),
  obtenerClasesDocente
);

router.get(
  '/estudiantes',
  verificarToken,
  verificarRol('Docente'),
  obtenerEstudiantesDocente
);

router.get(
  '/materias',
  verificarToken,
  verificarRol('Docente'),
  obtenerMateriasDocente
);

router.get(
  '/reportes/resumen',
  verificarToken,
  verificarRol('Docente'),
  obtenerResumenReportes
);

router.get(
  '/reportes/rendimiento-actividad',
  verificarToken,
  verificarRol('Docente'),
  obtenerRendimientoActividades
);

router.get(
  '/reportes/rendimiento-evaluacion',
  verificarToken,
  verificarRol('Docente'),
  obtenerRendimientoEvaluaciones
);

/*
 * Reporte calculado con la participación
 * de los estudiantes en las actividades.
 */
router.get(
  '/reportes/asistencia',
  verificarToken,
  verificarRol('Docente'),
  obtenerAsistenciaDocente
);

router.get(
  '/recursos',
  verificarToken,
  verificarRol('Docente'),
  obtenerRecursosDocente
);

router.get(
  '/estudiantes/:idAlumno/progreso',
  verificarToken,
  verificarRol('Docente'),
  obtenerProgresoEstudiante
);

module.exports = router;