const express = require("express");

const {
  obtenerInicioDocente,
} = require("../controllers/docenteController");

const {
  obtenerMateriasDocente,
  obtenerResumenReportes,
  obtenerRendimientoActividades,
  obtenerRendimientoEvaluaciones,
} = require(
  "../controllers/reportesDocenteController"
);

const verificarToken = require(
  "../middleware/authMiddleware"
);

const {
  verificarRol,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/inicio",
  verificarToken,
  verificarRol("Docente"),
  obtenerInicioDocente
);

router.get(
  "/materias",
  verificarToken,
  verificarRol("Docente"),
  obtenerMateriasDocente
);

router.get(
  "/reportes/resumen",
  verificarToken,
  verificarRol("Docente"),
  obtenerResumenReportes
);

router.get(
  "/reportes/rendimiento-actividad",
  verificarToken,
  verificarRol("Docente"),
  obtenerRendimientoActividades
);

router.get(
  "/reportes/rendimiento-evaluacion",
  verificarToken,
  verificarRol("Docente"),
  obtenerRendimientoEvaluaciones
);

module.exports = router;
