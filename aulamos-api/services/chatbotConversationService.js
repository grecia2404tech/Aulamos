"use strict";

const pool = require("../config/database");

const UTILIDADES_PERMITIDAS = new Set([
  "Útil",
  "Parcialmente útil",
  "No útil",
]);

function crearError(
  mensaje,
  statusCode = 500
) {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  return error;
}

async function listarConversacionesChatbot({
  idUsuario,
  limite = 30,
}) {
  const limiteSeguro = Math.max(
    1,
    Math.min(Number(limite) || 30, 50)
  );

  const [filas] = await pool.query(
    `
      SELECT
        s.id_sesion,
        s.modulo_origen,
        s.fecha_inicio,
        s.fecha_fin,

        COALESCE(
          NULLIF(
            (
              SELECT LEFT(
                TRIM(m2.pregunta),
                80
              )
              FROM mensajes_chatbot AS m2
              WHERE m2.id_sesion = s.id_sesion
              ORDER BY m2.id_mensaje ASC
              LIMIT 1
            ),
            ''
          ),
          'Nueva conversación'
        ) AS titulo,

        COUNT(m.id_mensaje) AS total_mensajes,
        MAX(m.fecha_mensaje) AS ultima_actividad

      FROM sesiones_chatbot AS s

      LEFT JOIN mensajes_chatbot AS m
        ON m.id_sesion = s.id_sesion

      WHERE s.id_usuario = ?

      GROUP BY
        s.id_sesion,
        s.modulo_origen,
        s.fecha_inicio,
        s.fecha_fin

      ORDER BY
        (s.fecha_fin IS NULL) DESC,
        COALESCE(
          MAX(m.fecha_mensaje),
          s.fecha_inicio
        ) DESC,
        s.id_sesion DESC

      LIMIT ?
    `,
    [
      idUsuario,
      limiteSeguro,
    ]
  );

  return filas.map((fila) => ({
    idSesion: Number(fila.id_sesion),

    titulo: String(
      fila.titulo ||
      "Nueva conversación"
    ),

    moduloOrigen:
      fila.modulo_origen || null,

    fechaInicio:
      fila.fecha_inicio || null,

    fechaFin:
      fila.fecha_fin || null,

    ultimaActividad:
      fila.ultima_actividad ||
      fila.fecha_inicio ||
      null,

    totalMensajes:
      Number(
        fila.total_mensajes || 0
      ),

    activa:
      fila.fecha_fin === null,
  }));
}

async function verificarSesionUsuario(
  conexion,
  idUsuario,
  idSesion,
  bloquear = false
) {
  const bloqueo =
    bloquear
      ? " FOR UPDATE"
      : "";

  const [sesiones] =
    await conexion.query(
      `
        SELECT
          id_sesion,
          modulo_origen,
          fecha_inicio,
          fecha_fin

        FROM sesiones_chatbot

        WHERE id_sesion = ?
          AND id_usuario = ?

        LIMIT 1
        ${bloqueo}
      `,
      [
        idSesion,
        idUsuario,
      ]
    );

  const sesion =
    sesiones[0];

  if (!sesion) {
    throw crearError(
      "La conversación no existe o no pertenece al usuario.",
      404
    );
  }

  return sesion;
}

async function obtenerHistorialSesionChatbot({
  idUsuario,
  idSesion,
  limite = 100,
}) {
  const conexion =
    await pool.getConnection();

  try {
    const sesion =
      await verificarSesionUsuario(
        conexion,
        idUsuario,
        idSesion
      );

    const limiteSeguro = Math.max(
      1,
      Math.min(
        Number(limite) || 100,
        100
      )
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
            tipo_respuesta,
            nivel_respuesta,
            utilidad_usuario,
            tiempo_respuesta_ms,
            fecha_mensaje

          FROM mensajes_chatbot

          WHERE id_sesion = ?

          ORDER BY
            fecha_mensaje ASC,
            id_mensaje ASC

          LIMIT ?
        `,
        [
          idSesion,
          limiteSeguro,
        ]
      );

    return {
      idSesion:
        Number(sesion.id_sesion),

      moduloOrigen:
        sesion.modulo_origen,

      activa:
        sesion.fecha_fin === null,

      interacciones,
    };
  } finally {
    conexion.release();
  }
}

async function activarConversacionChatbot({
  idUsuario,
  idSesion,
}) {
  const conexion =
    await pool.getConnection();

  try {
    await conexion.beginTransaction();

    await verificarSesionUsuario(
      conexion,
      idUsuario,
      idSesion,
      true
    );

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
        idSesion,
      ]
    );

    await conexion.query(
      `
        UPDATE sesiones_chatbot
        SET fecha_fin = NULL

        WHERE id_usuario = ?
          AND id_sesion = ?
      `,
      [
        idUsuario,
        idSesion,
      ]
    );

    await conexion.commit();

    return {
      success: true,
      idSesion:
        Number(idSesion),
    };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

async function actualizarUtilidadChatbot({
  idUsuario,
  idMensaje,
  utilidad,
}) {
  if (
    !UTILIDADES_PERMITIDAS.has(
      utilidad
    )
  ) {
    throw crearError(
      "La valoración enviada no es válida.",
      422
    );
  }

  const [resultado] =
    await pool.query(
      `
        UPDATE mensajes_chatbot AS m

        INNER JOIN sesiones_chatbot AS s
          ON s.id_sesion = m.id_sesion

        SET
          m.utilidad_usuario = ?

        WHERE m.id_mensaje = ?
          AND s.id_usuario = ?
      `,
      [
        utilidad,
        idMensaje,
        idUsuario,
      ]
    );

  if (
    Number(
      resultado.affectedRows || 0
    ) === 0
  ) {
    const [filas] =
      await pool.query(
        `
          SELECT m.id_mensaje

          FROM mensajes_chatbot AS m

          INNER JOIN sesiones_chatbot AS s
            ON s.id_sesion = m.id_sesion

          WHERE m.id_mensaje = ?
            AND s.id_usuario = ?

          LIMIT 1
        `,
        [
          idMensaje,
          idUsuario,
        ]
      );

    if (!filas[0]) {
      throw crearError(
        "La respuesta no existe o no pertenece al usuario.",
        404
      );
    }
  }

  return {
    success: true,
    idMensaje:
      Number(idMensaje),
    utilidad,
  };
}

async function obtenerInteraccionChatbot({
  idUsuario,
  idMensaje,
}) {
  const [filas] =
    await pool.query(
      `
        SELECT
          m.id_mensaje,
          m.id_sesion,
          m.pregunta,
          m.respuesta,
          m.utilidad_usuario

        FROM mensajes_chatbot AS m

        INNER JOIN sesiones_chatbot AS s
          ON s.id_sesion = m.id_sesion

        WHERE m.id_mensaje = ?
          AND s.id_usuario = ?

        LIMIT 1
      `,
      [
        idMensaje,
        idUsuario,
      ]
    );

  const interaccion =
    filas[0];

  if (!interaccion) {
    throw crearError(
      "La interacción no existe o no pertenece al usuario.",
      404
    );
  }

  return interaccion;
}

async function obtenerMemoriaSesionChatbot({
  idUsuario,
  idSesion,
  limite = 10,
  excluirIdMensaje = null,
}) {
  const conexion =
    await pool.getConnection();

  try {
    await verificarSesionUsuario(
      conexion,
      idUsuario,
      idSesion
    );

    const limiteSeguro = Math.max(
      1,
      Math.min(
        Number(limite) || 10,
        20
      )
    );

    let sql = `
      SELECT
        id_mensaje,
        pregunta,
        respuesta

      FROM mensajes_chatbot

      WHERE id_sesion = ?
    `;

    const parametros = [
      idSesion,
    ];

    if (
      Number.isInteger(
        Number(excluirIdMensaje)
      ) &&
      Number(excluirIdMensaje) > 0
    ) {
      sql += `
        AND id_mensaje <> ?
      `;

      parametros.push(
        Number(excluirIdMensaje)
      );
    }

    sql += `
      ORDER BY id_mensaje DESC
      LIMIT ?
    `;

    parametros.push(
      limiteSeguro
    );

    const [filas] =
      await conexion.query(
        sql,
        parametros
      );

    return filas
      .reverse()
      .map(
        (
          interaccion,
          indice
        ) => [
          `Interacción ${indice + 1}:`,
          `Usuario: ${interaccion.pregunta}`,
          `AulaBot: ${interaccion.respuesta}`,
        ].join("\n")
      )
      .join("\n\n");
  } finally {
    conexion.release();
  }
}

async function actualizarRespuestaChatbot({
  idUsuario,
  idMensaje,
  respuesta,
  modelo,
  origenConocimiento,
  tiempoRespuestaMs,
}) {
  const [resultado] =
    await pool.query(
      `
        UPDATE mensajes_chatbot AS m

        INNER JOIN sesiones_chatbot AS s
          ON s.id_sesion = m.id_sesion

        SET
          m.respuesta = ?,
          m.modelo_ia = ?,
          m.origen_conocimiento = ?,
          m.tiempo_respuesta_ms = ?

        WHERE m.id_mensaje = ?
          AND s.id_usuario = ?
      `,
      [
        respuesta,
        modelo,
        origenConocimiento,
        tiempoRespuestaMs,
        idMensaje,
        idUsuario,
      ]
    );

  if (
    Number(
      resultado.affectedRows || 0
    ) === 0
  ) {
    throw crearError(
      "No se pudo actualizar la respuesta.",
      404
    );
  }

  return {
    success: true,
    idMensaje:
      Number(idMensaje),
    respuesta,
  };
}

module.exports = {
  listarConversacionesChatbot,
  obtenerHistorialSesionChatbot,
  activarConversacionChatbot,
  actualizarUtilidadChatbot,
  obtenerInteraccionChatbot,
  obtenerMemoriaSesionChatbot,
  actualizarRespuestaChatbot,
};