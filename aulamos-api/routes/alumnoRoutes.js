const express = require('express');

const {
  obtenerInicioAlumno,
  obtenerAvancesAlumno,
} = require('../controllers/alumnoController');

const verificarToken = require(
  '../middleware/authMiddleware'
);

const {
  verificarRol,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.get(
  '/inicio',
  verificarToken,
  verificarRol('Alumno'),
  obtenerInicioAlumno
);

router.get(
  '/avances',
  verificarToken,
  verificarRol('Alumno'),
  obtenerAvancesAlumno
);

module.exports = router;