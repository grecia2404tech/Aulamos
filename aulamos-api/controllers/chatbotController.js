"use strict";

const {
  procesarMensajeChatbot,
  regenerarRespuestaChatbot,
  normalizarRol,
} = require(
  "../services/chatbotCoreService"
);

const {
  obtenerHistorialChatbot,
  cerrarConversacionesChatbot,
} = require(
  "../services/chatbotHistoryService"
);

const {
  listarConversacionesChatbot,
  obtenerHistorialSesionChatbot,
  activarConversacionChatbot,
  actualizarUtilidadChatbot,
} = require(
  "../services/chatbotConversationService"
);

function obtenerUsuarioAutenticado(
  req
) {
  return {
    idUsuario:
      Number(
        req.usuario?.id_usuario ||
        0
      ),

    rol:
      normalizarRol(
        req.usuario?.rol
      ),
  };
}

function codigoError(error) {
  const codigo =
    Number(
      error?.statusCode ||
      500
    );

  return (
    codigo >= 400 &&
    codigo <= 599
  )
    ? codigo
    : 500;
}

function textoError(error) {
  return (
    error instanceof Error &&
    error.message
  )
    ? error.message
    : "Ocurrió un error en AulaBot.";
}

function responderError(
  res,
  error
) {
  return res
    .status(
      codigoError(error)
    )
    .json({
      mensaje:
        textoError(error),
    });
}

async function enviarMensaje(
  req,
  res
) {
  try {
    const usuario =
      obtenerUsuarioAutenticado(
        req
      );

    const resultado =
      await procesarMensajeChatbot({
        ...usuario,
        mensaje:
          req.body?.mensaje,
      });

    return res
      .status(200)
      .json(resultado);
  } catch (error) {
    console.error(
      "Error de AulaBot:",
      error
    );

    return responderError(
      res,
      error
    );
  }
}

async function enviarMensajeWebInterno(
  req,
  res
) {
  try {
    const resultado =
      await procesarMensajeChatbot({
        idUsuario:
          Number(
            req.body?.idUsuario ||
            0
          ),

        rol:
          normalizarRol(
            req.body?.rol
          ),

        mensaje:
          req.body?.mensaje,
      });

    return res
      .status(200)
      .json(resultado);
  } catch (error) {
    console.error(
      "Error de AulaBot Web:",
      error
    );

    return responderError(
      res,
      error
    );
  }
}

async function obtenerHistorial(
  req,
  res
) {
  try {
    const usuario =
      obtenerUsuarioAutenticado(
        req
      );

    const historial =
      await obtenerHistorialChatbot({
        ...usuario,
        limite: 100,
      });

    return res.json({
      success: true,

      idSesion:
        historial.idSesion,

      moduloOrigen:
        historial.moduloOrigen,

      interacciones:
        historial.interacciones,
    });
  } catch (error) {
    console.error(
      "Error al obtener historial:",
      error
    );

    return responderError(
      res,
      error
    );
  }
}

async function nuevaConversacion(
  req,
  res
) {
  try {
    const {
      idUsuario,
    } =
      obtenerUsuarioAutenticado(
        req
      );

    const resultado =
      await cerrarConversacionesChatbot(
        idUsuario
      );

    return res.json({
      success: true,

      sesionesCerradas:
        resultado.sesionesCerradas,

      mensaje:
        "Conversación anterior cerrada.",
    });
  } catch (error) {
    return responderError(
      res,
      error
    );
  }
}

async function listarConversaciones(
  req,
  res
) {
  try {
    const {
      idUsuario,
    } =
      obtenerUsuarioAutenticado(
        req
      );

    const conversaciones =
      await listarConversacionesChatbot({
        idUsuario,
        limite: 30,
      });

    return res.json({
      success: true,
      conversaciones,
    });
  } catch (error) {
    return responderError(
      res,
      error
    );
  }
}

async function obtenerConversacion(
  req,
  res
) {
  try {
    const {
      idUsuario,
    } =
      obtenerUsuarioAutenticado(
        req
      );

    const resultado =
      await obtenerHistorialSesionChatbot({
        idUsuario,
        idSesion:
          Number(
            req.params.idSesion
          ),
      });

    return res.json({
      success: true,
      ...resultado,
    });
  } catch (error) {
    return responderError(
      res,
      error
    );
  }
}

async function activarConversacion(
  req,
  res
) {
  try {
    const {
      idUsuario,
    } =
      obtenerUsuarioAutenticado(
        req
      );

    const resultado =
      await activarConversacionChatbot({
        idUsuario,
        idSesion:
          Number(
            req.params.idSesion
          ),
      });

    return res.json(
      resultado
    );
  } catch (error) {
    return responderError(
      res,
      error
    );
  }
}

async function valorarRespuesta(
  req,
  res
) {
  try {
    const {
      idUsuario,
    } =
      obtenerUsuarioAutenticado(
        req
      );

    const resultado =
      await actualizarUtilidadChatbot({
        idUsuario,
        idMensaje:
          Number(
            req.params.idMensaje
          ),
        utilidad:
          String(
            req.body?.utilidad ||
            ""
          ),
      });

    return res.json(
      resultado
    );
  } catch (error) {
    return responderError(
      res,
      error
    );
  }
}

async function regenerarRespuesta(
  req,
  res
) {
  try {
    const usuario =
      obtenerUsuarioAutenticado(
        req
      );

    const resultado =
      await regenerarRespuestaChatbot({
        ...usuario,
        idMensaje:
          Number(
            req.params.idMensaje
          ),
      });

    return res.json(
      resultado
    );
  } catch (error) {
    return responderError(
      res,
      error
    );
  }
}

/*
|--------------------------------------------------------------------------
| PUENTE GENÉRICO WEB
|--------------------------------------------------------------------------
*/

async function ejecutarAccionWebInterna(
  req,
  res
) {
  try {
    const idUsuario =
      Number(
        req.body?.idUsuario ||
        0
      );

    const rol =
      normalizarRol(
        req.body?.rol
      );

    const accion =
      String(
        req.body?.accion ||
        ""
      );

    if (
      accion ===
      "listar_conversaciones"
    ) {
      const conversaciones =
        await listarConversacionesChatbot({
          idUsuario,
          limite: 30,
        });

      return res.json({
        success: true,
        conversaciones,
      });
    }

    if (
      accion ===
      "obtener_conversacion"
    ) {
      const resultado =
        await obtenerHistorialSesionChatbot({
          idUsuario,
          idSesion:
            Number(
              req.body?.idSesion
            ),
        });

      return res.json({
        success: true,
        ...resultado,
      });
    }

    if (
      accion ===
      "activar_conversacion"
    ) {
      const resultado =
        await activarConversacionChatbot({
          idUsuario,
          idSesion:
            Number(
              req.body?.idSesion
            ),
        });

      return res.json(
        resultado
      );
    }

    if (
      accion ===
      "utilidad"
    ) {
      const resultado =
        await actualizarUtilidadChatbot({
          idUsuario,
          idMensaje:
            Number(
              req.body?.idMensaje
            ),
          utilidad:
            String(
              req.body?.utilidad ||
              ""
            ),
        });

      return res.json(
        resultado
      );
    }

    if (
      accion ===
      "regenerar"
    ) {
      const resultado =
        await regenerarRespuestaChatbot({
          idUsuario,
          rol,
          idMensaje:
            Number(
              req.body?.idMensaje
            ),
        });

      return res.json(
        resultado
      );
    }

    return res
      .status(400)
      .json({
        mensaje:
          "Acción Web de AulaBot no reconocida.",
      });
  } catch (error) {
    console.error(
      "Error en acción Web de AulaBot:",
      error
    );

    return responderError(
      res,
      error
    );
  }
}

module.exports = {
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
};