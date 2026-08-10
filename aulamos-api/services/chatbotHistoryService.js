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

async function obtenerOCrearSesion(
  conexion,
  idUsuario,
  rol
) {
  const [sesiones] = await conexion.query(
    `
      SELECT
        s.id_sesion,
        s.fecha_fin,
        CASE
          WHEN COALESCE(
            (
              SELECT MAX(m.fecha_mensaje)
              FROM mensajes_chatbot m
              WHERE m.id_sesion = s.id_sesion
            ),
            s.fecha_inicio
          ) >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
          THEN 1
          ELSE 0
        END AS reciente
      FROM sesiones_chatbot s
      WHERE s.id_usuario = ?
      ORDER BY s.id_sesion DESC
      LIMIT 1
      FOR UPDATE
    `,
    [idUsuario]
  );

  const ultima = sesiones[0];

  if (
    ultima &&
    !ultima.fecha_fin &&
    Number(ultima.reciente) === 1
  ) {
    return ultima.id_sesion;
  }

  if (
    ultima &&
    !ultima.fecha_fin
  ) {
    await conexion.query(
      `
        UPDATE sesiones_chatbot
        SET fecha_fin = NOW()
        WHERE id_sesion = ?
      `,
      [ultima.id_sesion]
    );
  }

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
      `Movil ${rol}`,
    ]
  );

  return resultado.insertId;
}

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

    const idSesion =
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

    const [resultado] = await conexion.query(
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
        VALUES (?, ?, ?, ?, ?, ?, 'Texto', 'Intermedio', ?)
      `,
      [
        idSesion,
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
      idSesion,
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

module.exports = {
  registrarInteraccionChatbot,
};