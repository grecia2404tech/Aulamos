const express = require('express');

const {
  obtenerCiclos,
  obtenerCicloActivo,
  crearCiclo,
  actualizarCiclo,
  cambiarEstadoCiclo,
} = require(
  '../controllers/cicloEscolarController'
);

const {
  verificarToken,
  verificarRol,
} = require(
  '../middleware/authMiddleware'
);

const router = express.Router();

/*
 * Cualquier usuario autenticado puede
 * consultar cuál es el ciclo activo.
 */
router.get(
  '/ciclos/activo',
  verificarToken,
  obtenerCicloActivo
);

/*
 * Solo un administrador puede consultar
 * el catálogo completo.
 */
router.get(
  '/ciclos',
  verificarToken,
  verificarRol('Admin'),
  obtenerCiclos
);

/*
 * Solo un administrador puede crear,
 * modificar o cambiar estados.
 */
router.post(
  '/ciclos',
  verificarToken,
  verificarRol('Admin'),
  crearCiclo
);

router.put(
  '/ciclos/:id',
  verificarToken,
  verificarRol('Admin'),
  actualizarCiclo
);

router.patch(
  '/ciclos/:id/estado',
  verificarToken,
  verificarRol('Admin'),
  cambiarEstadoCiclo
);

module.exports = router;