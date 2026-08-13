"use strict";

const express =
  require("express");

const {
  enviarMensaje,
  enviarMensajeWebInterno,
  ejecutarAccionWebInterna,
  obtenerHistorial,
  nuevaConversacion,
  listarConversaciones,
  obtenerConversacion,
  activarConversacion,
  valorarRespuesta,
  regenerarRespuesta,
} = require(
  "../controllers/chatbotController"
);

const verificarToken =
  require(
    "../middleware/authMiddleware"
  );

const soloLocalhost =
  require(
    "../middleware/soloLocalhost"
  );

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| PUENTE WEB
|--------------------------------------------------------------------------
*/

router.post(
  "/web/mensaje",
  soloLocalhost,
  enviarMensajeWebInterno
);

router.post(
  "/web/accion",
  soloLocalhost,
  ejecutarAccionWebInterna
);

/*
|--------------------------------------------------------------------------
| MÓVIL
|--------------------------------------------------------------------------
*/

router.get(
  "/historial",
  verificarToken,
  obtenerHistorial
);

router.get(
  "/conversaciones",
  verificarToken,
  listarConversaciones
);

router.get(
  "/conversaciones/:idSesion",
  verificarToken,
  obtenerConversacion
);

router.post(
  "/conversaciones/:idSesion/activar",
  verificarToken,
  activarConversacion
);

router.post(
  "/mensajes/:idMensaje/utilidad",
  verificarToken,
  valorarRespuesta
);

router.post(
  "/mensajes/:idMensaje/regenerar",
  verificarToken,
  regenerarRespuesta
);

router.post(
  "/mensaje",
  verificarToken,
  enviarMensaje
);

router.post(
  "/nueva-conversacion",
  verificarToken,
  nuevaConversacion
);

module.exports =
  router;