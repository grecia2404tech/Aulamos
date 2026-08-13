const pool = require('../config/database');

function normalizarTexto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function clasificarTipoConsulta(mensaje, rol) {
  const texto = normalizarTexto(mensaje);

  if (
    texto.includes('accesibilidad') ||
    texto.includes('lector de pantalla') ||
    texto.includes('alto contraste') ||
    texto.includes('modo oscuro') ||
    texto.includes('dislexia') ||
    texto.includes('subtitulo')
  ) {
    return 'Accesibilidad';
  }

  if (
    texto.includes('actividad') ||
    texto.includes('tarea') ||
    texto.includes('entrega') ||
    texto.includes('evaluacion')
  ) {
    return 'Actividad';
  }

  if (
    texto.includes('aulamos') ||
    texto.includes('plataforma') ||
    texto.includes('pantalla') ||
    texto.includes('menu') ||
    texto.includes('boton') ||
    texto.includes('iniciar sesion')
  ) {
    return 'Plataforma';
  }

  if (
    rol === 'alumno' ||
    rol === 'docente'
  ) {
    return 'Académica';
  }

  return 'General';
}

/*
|--------------------------------------------------------------------------
| Obtener o crear la conversación activa
|--------------------------------------------------------------------------
| La conversación pertenece al usuario.
| No se separa por Web/Móvil.
|
| También cerramos sesiones abiertas antiguas para garantizar que cada
| usuario tenga solamente una conversación activa.
*/

async function obtenerOCrearSesion(
  conexion,
  idUsuario,
  rol
) {
  const [sesiones] = await conexion.query(
    `
      SELECT
        id_sesion,
        modulo_origen
      FROM sesiones_chatbot
      WHERE id_usuario = ?
        AND fecha_fin IS NULL
      ORDER BY id_sesion DESC
      LIMIT 1
      FOR UPDATE
    `,
    [idUsuario]
  );

  const sesionActual = sesiones[0];

  if (sesionActual) {
    await conexion.query(
      `
        UPDATE sesiones_chatbot
        SET fecha_fin = NOW()
        WHERE id_usuario = ?
          AND fecha_fin IS NULL
          AND id_sesion <> ?
      `,
      [
        idUsuario,
        sesionActual.id_sesion,
      ]
    );

    return {
      idSesion: Number(
        sesionActual.id_sesion
      ),
      moduloOrigen:
        sesionActual.modulo_origen,
      nuevaSesion: false,
    };
  }

  const moduloOrigen =
    `Movil ${rol}`;

  const [resultado] = await conexion.query(
    `
      INSERT INTO sesiones_chatbot
      (
        id_usuario,
        modulo_origen
      )
      VALUES (?, ?)
    `,
    [
      idUsuario,
      moduloOrigen,
    ]
  );

  return {
    idSesion: Number(resultado.insertId),
    moduloOrigen,
    nuevaSesion: true,
  };
}

/*
|--------------------------------------------------------------------------
| Obtener historial compartido
|--------------------------------------------------------------------------
*/

async function obtenerHistorialChatbot({
  idUsuario,
  rol,
  limite = 100,
}) {
  let conexion;

  try {
    conexion = await pool.getConnection();

    await conexion.beginTransaction();

    const sesion =
      await obtenerOCrearSesion(
        conexion,
        idUsuario,
        rol
      );

    const limiteSeguro = Math.max(
      1,
      Math.min(Number(limite) || 100, 100)
    );

    const [interacciones] =
      await conexion.query(
        `
          SELECT
            id_mensaje,
            pregunta,
            respuesta,
            tipo_consulta,
            modelo_ia,
            origen_conocimiento,
            tiempo_respuesta_ms,
            fecha_mensaje
          FROM mensajes_chatbot
          WHERE id_sesion = ?
          ORDER BY fecha_mensaje ASC,
                   id_mensaje ASC
          LIMIT ?
        `,
        [
          sesion.idSesion,
          limiteSeguro,
        ]
      );

    await conexion.commit();

    return {
      ...sesion,
      interacciones,
    };
  } catch (error) {
    if (conexion) {
      await conexion.rollback();
    }

    throw error;
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
}

/*
|--------------------------------------------------------------------------
| Memoria reciente para Gemini
|--------------------------------------------------------------------------
*/

async function obtenerMemoriaChatbot({
  idUsuario,
  rol,
  limite = 10,
}) {
  const historial =
    await obtenerHistorialChatbot({
      idUsuario,
      rol,
      limite,
    });

  if (
    !Array.isArray(historial.interacciones) ||
    historial.interacciones.length === 0
  ) {
    return '';
  }

  return historial.interacciones
    .slice(-limite)
    .map((interaccion, indice) => {
      return [
        `Interacción ${indice + 1}:`,
        `Usuario: ${interaccion.pregunta}`,
        `AulaBot: ${interaccion.respuesta}`,
      ].join('\n');
    })
    .join('\n\n');
}

/*
|--------------------------------------------------------------------------
| Guardar interacción
|--------------------------------------------------------------------------
*/

async function registrarInteraccionChatbot({
  idUsuario,
  rol,
  mensaje,
  respuesta,
  tiempoRespuestaMs,
  origenConocimiento,
}) {
  let conexion;

  try {
    conexion = await pool.getConnection();

    await conexion.beginTransaction();

    const sesion =
      await obtenerOCrearSesion(
        conexion,
        idUsuario,
        rol
      );

    const tipoConsulta =
      clasificarTipoConsulta(
        mensaje,
        rol
      );

    const modelo =
      process.env.GEMINI_MODEL?.trim() ||
      'gemini-3.1-flash-lite';

    const [resultado] =
      await conexion.query(
        `
          INSERT INTO mensajes_chatbot
          (
            id_sesion,
            pregunta,
            respuesta,
            tipo_consulta,
            modelo_ia,
            origen_conocimiento,
            tipo_respuesta,
            nivel_respuesta,
            tiempo_respuesta_ms
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            'Texto',
            'Intermedio',
            ?
          )
        `,
        [
          sesion.idSesion,
          mensaje,
          respuesta,
          tipoConsulta,
          modelo,
          origenConocimiento,
          tiempoRespuestaMs,
        ]
      );

    await conexion.commit();

    return {
      idSesion: sesion.idSesion,
      idMensaje: resultado.insertId,
      tipoConsulta,
    };
  } catch (error) {
    if (conexion) {
      await conexion.rollback();
    }

    throw error;
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
}

/*
|--------------------------------------------------------------------------
| Nueva conversación
|--------------------------------------------------------------------------
| Cerramos todas las conversaciones abiertas del usuario.
| Así una conversación vieja nunca vuelve a aparecer.
*/

async function cerrarConversacionesChatbot(
  idUsuario
) {
  const [resultado] = await pool.query(
    `
      UPDATE sesiones_chatbot
      SET fecha_fin = NOW()
      WHERE id_usuario = ?
        AND fecha_fin IS NULL
    `,
    [idUsuario]
  );

  return {
    sesionesCerradas:
      Number(resultado.affectedRows || 0),
  };
}

module.exports = {
  registrarInteraccionChatbot,
  obtenerHistorialChatbot,
  obtenerMemoriaChatbot,
  cerrarConversacionesChatbot,
};