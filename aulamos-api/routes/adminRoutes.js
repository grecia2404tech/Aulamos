const express = require('express');

const router = express.Router();

const {
  obtenerResumenAdmin,
} = require('../controllers/adminController');

const verificarToken = require(
  '../middleware/verificarToken'
);

const {
  verificarRol,
} = require(
  '../middleware/verificarToken'
);

router.get(
  '/inicio',
  verificarToken,
  verificarRol('Admin'),
  obtenerResumenAdmin
);

module.exports = router;