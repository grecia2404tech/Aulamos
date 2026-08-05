const express = require('express');

const {
  obtenerInicioAlumno,
  obtenerAvancesAlumno,
  obtenerDetalleActividadAlumno,
  obtenerBibliotecaAlumno,
} = require('../controllers/alumnoController');

const verificarToken = require(
  '../middleware/authMiddleware'
);

const {
  verificarRol,
} = require('../middleware/authMiddleware');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Inicio del alumno
|--------------------------------------------------------------------------
*/

router.get(
  '/inicio',
  verificarToken,
  verificarRol('Alumno'),
  obtenerInicioAlumno
);

/*
|--------------------------------------------------------------------------
| Avances
|--------------------------------------------------------------------------
*/

router.get(
  '/avances',
  verificarToken,
  verificarRol('Alumno'),
  obtenerAvancesAlumno
);

/*
|--------------------------------------------------------------------------
| Detalle de una actividad
|--------------------------------------------------------------------------
*/

router.get(
  '/actividades/:idActividad',
  verificarToken,
  verificarRol('Alumno'),
  obtenerDetalleActividadAlumno
);

/*
|--------------------------------------------------------------------------
| Biblioteca digital
|--------------------------------------------------------------------------
*/

router.get(
  '/biblioteca',
  verificarToken,
  verificarRol('Alumno'),
  obtenerBibliotecaAlumno
);

module.exports = router;