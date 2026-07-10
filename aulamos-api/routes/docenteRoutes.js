const express = require('express');

const {
  obtenerInicioDocente,
} = require('../controllers/docenteController');

const verificarToken = require(
  '../middleware/authMiddleware'
);

const router = express.Router();

router.get(
  '/inicio',
  verificarToken,
  obtenerInicioDocente
);

module.exports = router;