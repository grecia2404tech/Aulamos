const express = require('express');

const {
  obtenerPreferencias,
  actualizarPreferencias,
} = require(
  '../controllers/accesibilidadController'
);

const verificarToken = require(
  '../middleware/verificarToken'
);

const router = express.Router();

router.get(
  '/preferencias',
  verificarToken,
  obtenerPreferencias
);

router.put(
  '/preferencias',
  verificarToken,
  actualizarPreferencias
);

module.exports = router;
