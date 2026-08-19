const express =
  require('express');

const {
  obtenerNotificaciones,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion,
} =
  require(
    '../controllers/notificacionController'
  );

const verificarToken =
  require(
    '../middleware/authMiddleware'
  );


const router =
  express.Router();


// =====================================================
// LISTAR
// =====================================================

router.get(
  '/',
  verificarToken,
  obtenerNotificaciones
);


// =====================================================
// MARCAR TODAS
// =====================================================

router.patch(
  '/leer-todas',
  verificarToken,
  marcarTodasComoLeidas
);


// =====================================================
// MARCAR UNA
// =====================================================

router.patch(
  '/:id/leida',
  verificarToken,
  marcarComoLeida
);


// =====================================================
// ELIMINAR
// =====================================================

router.delete(
  '/:id',
  verificarToken,
  eliminarNotificacion
);


module.exports =
  router;