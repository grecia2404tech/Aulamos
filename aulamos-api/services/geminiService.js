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
  historial = '',
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
- Cuando el contexto incluya datos reales de Aulamos, utilízalos como fuente principal.
- No inventes ni recomiendes secciones, menús, rutas, botones o funciones de Aulamos que no aparezcan en el contexto.
- Si los datos reales indican cero, ninguno o que no existe información, dilo directamente.
- Utiliza el historial reciente para comprender referencias como "eso", "la anterior", "esa actividad", "lo que te dije" o expresiones similares.
- El historial es solamente contexto conversacional.
- Si el historial contradice datos actuales de Aulamos, tienen prioridad los datos actuales.
- No inventes información que no aparezca en el contexto, historial o pregunta actual.

El rol indicado a continuación proviene de una sesión autenticada de Aulamos.
Debes considerarlo un dato confiable.
Si el usuario pregunta cuál es su rol, respóndelo directamente.
No le preguntes al usuario cuál es su rol.

Rol autenticado:
${rol}

Datos actuales de Aulamos:
${contexto || 'No hay contexto adicional.'}

Historial reciente de esta misma conversación:
${historial || 'No hay mensajes anteriores.'}

Pregunta actual:
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
          'Content-Type':
            'application/json',
          'x-goog-api-key':
            apiKey,
        },
        timeout: 120000,
      }
    );

    const texto =
      obtenerTextoRespuesta(
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
        error.response?.status ||
          'sin estado',
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