const express = require("express");

// Controlador del inicio del docente
const {
  obtenerInicioDocente,
} = require("../controllers/docenteController");

// Controlador para ver estudiantes
const {
  obtenerEstudiantesDocente,
} = require(
  "../controllers/docenteEstudiantesController"
);

// Controladores de reportes
const {
  obtenerMateriasDocente,
  obtenerResumenReportes,
  obtenerRendimientoActividades,
  obtenerRendimientoEvaluaciones,
} = require(
  "../controllers/reportesDocenteController"
);

// Middleware de autenticación
const verificarToken = require(
  "../middleware/authMiddleware"
);

const {
  verificarRol,
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// INICIO DEL DOCENTE
// GET /api/docente/inicio
// =====================================================
router.get(
  "/inicio",
  verificarToken,
  verificarRol("Docente"),
  obtenerInicioDocente
);

// =====================================================
// MATERIAS DEL DOCENTE
// GET /api/docente/materias
// =====================================================
router.get(
  "/materias",
  verificarToken,
  verificarRol("Docente"),
  obtenerMateriasDocente
);

// =====================================================
// ESTUDIANTES DE LOS CURSOS DEL DOCENTE
// GET /api/docente/estudiantes
// =====================================================
router.get(
  "/estudiantes",
  verificarToken,
  verificarRol("Docente"),
  obtenerEstudiantesDocente
);

// =====================================================
// RESUMEN DE REPORTES
// GET /api/docente/reportes/resumen
// =====================================================
router.get(
  "/reportes/resumen",
  verificarToken,
  verificarRol("Docente"),
  obtenerResumenReportes
);

// =====================================================
// RENDIMIENTO DE ACTIVIDADES
// =====================================================
router.get(
  "/reportes/rendimiento-actividad",
  verificarToken,
  verificarRol("Docente"),
  obtenerRendimientoActividades
);

// =====================================================
// RENDIMIENTO DE EVALUACIONES
// =====================================================
router.get(
  "/reportes/rendimiento-evaluacion",
  verificarToken,
  verificarRol("Docente"),
  obtenerRendimientoEvaluaciones
);

module.exports = router;