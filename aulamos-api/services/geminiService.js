const axios = require('axios');

function obtenerTextoRespuesta(datos) {
  const partes =
    datos?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(partes)) {
    return null;
  }

  const texto = partes
    .map((parte) => parte?.text || '')
    .join('')
    .trim();

  return texto || null;
}

async function generarRespuestaIA({
  mensaje,
  rol = 'alumno',
  contexto = '',
}) {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim();

  const modelo =
    process.env.GEMINI_MODEL?.trim() ||
    'gemini-3.1-flash-lite';

  if (!apiKey) {
    return null;
  }

  const instrucciones = `
Eres AulaBot, el asistente educativo de Aulamos.

Reglas:
- Responde siempre en español.
- Usa lenguaje claro y sencillo.
- Da respuestas breves y útiles.
- Explica paso a paso cuando sea necesario.
- Incluye un ejemplo cuando ayude.
- No inventes actividades, fechas ni calificaciones.
- No solicites contraseñas ni datos privados.
- No uses símbolos Markdown como **, ## o \`\`\`.
- No superes las 250 palabras.

Rol del usuario: ${rol}

Contexto:
${contexto || 'No hay contexto adicional.'}

Pregunta:
${mensaje}
`;

  const url =
    `https://generativelanguage.googleapis.com/` +
    `v1beta/models/${modelo}:generateContent`;

  try {
    const respuesta = await axios.post(
      url,
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: instrucciones,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 500,
          thinkingConfig: {
            thinkingLevel: 'minimal',
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        timeout: 120000,
      }
    );

    const texto = obtenerTextoRespuesta(
      respuesta.data
    );

    if (!texto) {
      throw new Error(
        'Gemini no devolvió texto.'
      );
    }

    return texto;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const detalle =
        error.response?.data?.error?.message ||
        error.message;

      console.error(
        'Error de Gemini:',
        error.response?.status || 'sin estado',
        detalle
      );

      throw new Error(detalle);
    }

    throw error;
  }
}

module.exports = {
  generarRespuestaIA,
};