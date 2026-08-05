const express = require("express");

const {
  obtenerCatalogosEvaluacion,
  crearEvaluacion,
  obtenerEvaluacionesAlumno,
  obtenerEvaluacionAlumnoPorId,
  responderEvaluacion,
} = require("../controllers/evaluacionController");

// En tu proyecto verificarToken es la exportación principal y
// verificarRol es una propiedad del mismo middleware.
const verificarToken = require("../middleware/authMiddleware");

const {
  verificarRol,
} = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/evaluaciones/catalogos
router.get(
  "/catalogos",
  verificarToken,
  verificarRol("Docente"),
  obtenerCatalogosEvaluacion,
);

// POST /api/evaluaciones
router.post(
  "/",
  verificarToken,
  verificarRol("Docente"),
  crearEvaluacion,
);

// GET /api/evaluaciones/alumno
router.get(
  "/alumno",
  verificarToken,
  verificarRol("Alumno"),
  obtenerEvaluacionesAlumno,
);

// GET /api/evaluaciones/alumno/:id
// Abre las preguntas sin revelar cuál opción es correcta.
router.get(
  "/alumno/:id",
  verificarToken,
  verificarRol("Alumno"),
  obtenerEvaluacionAlumnoPorId,
);

// POST /api/evaluaciones/alumno/:id/respuestas
router.post(
  "/alumno/:id/respuestas",
  verificarToken,
  verificarRol("Alumno"),
  responderEvaluacion,
);

module.exports = router;
