const pool = require('../config/database');


// =====================================================
// OBTENER ID DEL USUARIO AUTENTICADO
// =====================================================

const obtenerIdUsuario = (req) => {
  return Number(
    req.usuario?.id_usuario
  );
};


// =====================================================
// LISTAR NOTIFICACIONES
// =====================================================

const obtenerNotificaciones = async (
  req,
  res
) => {
  try {

    const idUsuario =
      obtenerIdUsuario(req);

    if (
      !Number.isInteger(idUsuario)
      ||
      idUsuario <= 0
    ) {
      return res.status(401).json({
        mensaje:
          'No se pudo identificar al usuario.',
      });
    }


    const [notificaciones] =
      await pool.query(
        `
          SELECT
            id_notificacion,
            titulo,
            mensaje,
            tipo,
            entidad_tipo,
            entidad_id,
            leida,
            fecha_envio
          FROM notificaciones
          WHERE id_usuario = ?
          ORDER BY
            leida ASC,
            fecha_envio DESC,
            id_notificacion DESC
        `,
        [
          idUsuario,
        ]
      );


    const [[resumen]] =
      await pool.query(
        `
          SELECT
            COUNT(*) AS total,

            SUM(
              CASE
                WHEN leida = 0
                THEN 1
                ELSE 0
              END
            ) AS no_leidas

          FROM notificaciones
          WHERE id_usuario = ?
        `,
        [
          idUsuario,
        ]
      );


    return res.status(200).json({

      notificaciones,

      resumen: {
        total:
          Number(
            resumen.total
            ?? 0
          ),

        no_leidas:
          Number(
            resumen.no_leidas
            ?? 0
          ),
      },
    });

  } catch (error) {

    console.error(
      'Error al obtener notificaciones:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron obtener las notificaciones.',
    });
  }
};


// =====================================================
// MARCAR UNA COMO LEÍDA
// =====================================================

const marcarComoLeida = async (
  req,
  res
) => {
  try {

    const idUsuario =
      obtenerIdUsuario(req);

    const idNotificacion =
      Number(
        req.params.id
      );


    if (
      !Number.isInteger(idNotificacion)
      ||
      idNotificacion <= 0
    ) {
      return res.status(400).json({
        mensaje:
          'La notificación no es válida.',
      });
    }


    const [resultado] =
      await pool.query(
        `
          UPDATE notificaciones
          SET leida = 1
          WHERE id_notificacion = ?
            AND id_usuario = ?
        `,
        [
          idNotificacion,
          idUsuario,
        ]
      );


    if (
      resultado.affectedRows === 0
    ) {
      return res.status(404).json({
        mensaje:
          'La notificación no existe.',
      });
    }


    return res.status(200).json({
      mensaje:
        'Notificación marcada como leída.',
    });

  } catch (error) {

    console.error(
      'Error al marcar notificación:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo actualizar la notificación.',
    });
  }
};


// =====================================================
// MARCAR TODAS COMO LEÍDAS
// =====================================================

const marcarTodasComoLeidas = async (
  req,
  res
) => {
  try {

    const idUsuario =
      obtenerIdUsuario(req);


    await pool.query(
      `
        UPDATE notificaciones
        SET leida = 1
        WHERE id_usuario = ?
          AND leida = 0
      `,
      [
        idUsuario,
      ]
    );


    return res.status(200).json({
      mensaje:
        'Todas las notificaciones fueron marcadas como leídas.',
    });

  } catch (error) {

    console.error(
      'Error al marcar notificaciones:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron actualizar las notificaciones.',
    });
  }
};


// =====================================================
// ELIMINAR NOTIFICACIÓN
// =====================================================

const eliminarNotificacion = async (
  req,
  res
) => {
  try {

    const idUsuario =
      obtenerIdUsuario(req);

    const idNotificacion =
      Number(
        req.params.id
      );


    if (
      !Number.isInteger(idNotificacion)
      ||
      idNotificacion <= 0
    ) {
      return res.status(400).json({
        mensaje:
          'La notificación no es válida.',
      });
    }


    const [resultado] =
      await pool.query(
        `
          DELETE FROM notificaciones
          WHERE id_notificacion = ?
            AND id_usuario = ?
        `,
        [
          idNotificacion,
          idUsuario,
        ]
      );


    if (
      resultado.affectedRows === 0
    ) {
      return res.status(404).json({
        mensaje:
          'La notificación no existe.',
      });
    }


    return res.status(200).json({
      mensaje:
        'Notificación eliminada.',
    });

  } catch (error) {

    console.error(
      'Error al eliminar notificación:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo eliminar la notificación.',
    });
  }
};


module.exports = {
  obtenerNotificaciones,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion,
};