const express = require('express');

const {
  obtenerInicioAlumno,
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

module.exports = router;