const {
  generarRespuestaIA,
} = require('../services/geminiService');

const {
  obtenerContextoChatbot,
} = require('../services/chatbotContextService');

const {
  registrarInteraccionChatbot,
} = require('../services/chatbotHistoryService');

async function enviarMensaje(req, res) {
  try {
    const mensaje = String(
      req.body.mensaje || ''
    ).trim();

    const idUsuario = Number(
      req.usuario?.id_usuario || 0
    );

    const rol = String(
      req.usuario?.rol || ''
    )
      .trim()
      .toLowerCase();

    if (!idUsuario || !rol) {
      return res.status(401).json({
        mensaje: 'Usuario no autenticado.',
      });
    }

    if (!mensaje) {
      return res.status(400).json({
        mensaje: 'Debes escribir una pregunta.',
      });
    }

    const contexto =
      await obtenerContextoChatbot({
        idUsuario,
        rol,
      });

    const inicio = Date.now();

    const respuesta =
      await generarRespuestaIA({
        mensaje,
        rol,
        contexto,
      });

    const tiempoRespuestaMs =
      Date.now() - inicio;

    if (!respuesta) {
      return res.status(503).json({
        mensaje:
          'Gemini todavía no está configurado. Revisa GEMINI_API_KEY en el archivo .env.',
      });
    }

    const origenConocimiento =
      contexto
        ? 'Mixto'
        : 'IA Generativa';

    let tipoConsulta = 'General';

    try {
      const historial =
        await registrarInteraccionChatbot({
          idUsuario,
          rol,
          mensaje,
          respuesta,
          tiempoRespuestaMs,
          origenConocimiento,
        });

      tipoConsulta =
        historial.tipoConsulta;
    } catch (errorHistorial) {
      console.error(
        'AulaBot respondió, pero no se pudo guardar el historial:',
        errorHistorial
      );
    }

    return res.status(200).json({
      respuesta,
      tipoConsulta,
      origenConocimiento,
      tiempoRespuestaMs,
      acciones: [],
    });
  } catch (error) {
    console.error(
      'Error del chatbot:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Ocurrió un error al consultar AulaBot.',
      detalle: error.message,
    });
  }
}

module.exports = {
  enviarMensaje,
};