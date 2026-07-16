const {
  generarRespuestaIA,
} = require('../services/geminiService');

async function enviarMensaje(req, res) {
  try {
    const mensaje = String(
      req.body.mensaje || ''
    ).trim();

    const rol = String(
      req.body.rol || 'alumno'
    ).trim();

    if (!mensaje) {
      return res.status(400).json({
        mensaje: 'Debes escribir una pregunta.',
      });
    }

    const respuesta = await generarRespuestaIA({
      mensaje,
      rol,
    });

    if (!respuesta) {
      return res.status(503).json({
        mensaje:
          'Gemini todavía no está configurado. Revisa GEMINI_API_KEY en el archivo .env.',
      });
    }

    return res.status(200).json({
      respuesta,
      tipoConsulta: 'Académica',
      origenConocimiento: 'IA Generativa',
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