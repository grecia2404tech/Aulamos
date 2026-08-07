const pool = require('../config/database');

async function obtenerContextoAlumno(idUsuario) {
  const [resumenResultados] = await pool.query(
    `
      SELECT
        COUNT(*) AS total,

        SUM(
          CASE
            WHEN ae.estado = 'Pendiente'
              AND (
                a.fecha_limite IS NULL
                OR a.fecha_limite >= NOW()
              )
            THEN 1
            ELSE 0
          END
        ) AS pendientes,

        SUM(
          CASE
            WHEN ae.estado = 'En_proceso'
              AND (
                a.fecha_limite IS NULL
                OR a.fecha_limite >= NOW()
              )
            THEN 1
            ELSE 0
          END
        ) AS en_proceso,

        SUM(
          CASE
            WHEN ae.estado = 'Atrasada'
              OR (
                a.fecha_limite IS NOT NULL
                AND a.fecha_limite < NOW()
                AND ae.estado IN (
                  'Pendiente',
                  'En_proceso'
                )
              )
            THEN 1
            ELSE 0
          END
        ) AS atrasadas,

        SUM(
          CASE
            WHEN ae.estado IN (
              'Completada',
              'Calificada'
            )
            THEN 1
            ELSE 0
          END
        ) AS terminadas

      FROM actividad_estudiantes AS ae

      INNER JOIN actividades AS a
        ON a.id_actividad = ae.id_actividad

      WHERE ae.id_alumno = ?
        AND a.estado IN (
          'Publicada',
          'Cerrada'
        )
    `,
    [idUsuario]
  );

  const resumen = resumenResultados[0] || {};

  const [proximas] = await pool.query(
    `
      SELECT
        a.titulo,
        m.nombre AS materia,
        DATE_FORMAT(
          a.fecha_limite,
          '%Y-%m-%d %H:%i'
        ) AS fecha_limite

      FROM actividad_estudiantes AS ae

      INNER JOIN actividades AS a
        ON a.id_actividad = ae.id_actividad

      INNER JOIN cursos AS c
        ON c.id_curso = a.id_curso

      INNER JOIN materias AS m
        ON m.id_materia = c.id_materia

      WHERE ae.id_alumno = ?
        AND ae.estado IN (
          'Pendiente',
          'En_proceso'
        )
        AND a.estado = 'Publicada'
        AND a.fecha_limite >= NOW()

      ORDER BY a.fecha_limite ASC

      LIMIT 1
    `,
    [idUsuario]
  );

  const [atencion] = await pool.query(
    `
      SELECT
        a.titulo,
        m.nombre AS materia,

        CASE
          WHEN ae.estado = 'Atrasada'
            OR (
              a.fecha_limite IS NOT NULL
              AND a.fecha_limite < NOW()
              AND ae.estado IN (
                'Pendiente',
                'En_proceso'
              )
            )
          THEN 'Atrasada'
          ELSE ae.estado
        END AS estado,

        DATE_FORMAT(
          a.fecha_limite,
          '%Y-%m-%d %H:%i'
        ) AS fecha_limite

      FROM actividad_estudiantes AS ae

      INNER JOIN actividades AS a
        ON a.id_actividad = ae.id_actividad

      INNER JOIN cursos AS c
        ON c.id_curso = a.id_curso

      INNER JOIN materias AS m
        ON m.id_materia = c.id_materia

      WHERE ae.id_alumno = ?
        AND a.estado IN (
          'Publicada',
          'Cerrada'
        )
        AND ae.estado IN (
          'Pendiente',
          'En_proceso',
          'Atrasada'
        )

      ORDER BY
        CASE
          WHEN ae.estado = 'Atrasada'
            OR (
              a.fecha_limite IS NOT NULL
              AND a.fecha_limite < NOW()
              AND ae.estado IN (
                'Pendiente',
                'En_proceso'
              )
            )
          THEN 0
          ELSE 1
        END,
        a.fecha_limite ASC

      LIMIT 5
    `,
    [idUsuario]
  );

  const total = Number(resumen.total || 0);
  const pendientes =
    Number(resumen.pendientes || 0);
  const enProceso =
    Number(resumen.en_proceso || 0);
  const atrasadas =
    Number(resumen.atrasadas || 0);
  const terminadas =
    Number(resumen.terminadas || 0);

  const lineas = [
    'Datos reales de Aulamos para el alumno autenticado:',
    `- Actividades asignadas: ${total}.`,
    `- Actividades pendientes: ${pendientes}.`,
    `- Actividades en proceso: ${enProceso}.`,
    `- Actividades atrasadas: ${atrasadas}.`,
    `- Actividades terminadas o calificadas: ${terminadas}.`,
  ];

  if (proximas.length > 0) {
    const actividad = proximas[0];

    lineas.push(
      `- Próxima actividad: "${actividad.titulo}" de ${actividad.materia}, fecha límite ${actividad.fecha_limite}.`
    );
  } else {
    lineas.push(
      '- No hay una próxima actividad pendiente con fecha futura.'
    );
  }

  if (atencion.length > 0) {
    lineas.push(
      '- Actividades que requieren atención:'
    );

    atencion.forEach((actividad) => {
      lineas.push(
        `  - "${actividad.titulo}" | ${actividad.materia} | ${actividad.estado} | fecha límite: ${actividad.fecha_limite || 'sin fecha'}.`
      );
    });
  }

  if (total === 0) {
    lineas.push(
      '- Actualmente no hay actividades asignadas registradas para este alumno.'
    );
  }

  lineas.push(
    '- Usa estos datos como fuente principal cuando el alumno pregunte por sus actividades.'
  );

  lineas.push(
    '- No inventes actividades, cantidades, nombres de materias, fechas ni secciones de la plataforma.'
  );

  return lineas.join('\n');
}

async function obtenerContextoChatbot({
  idUsuario,
  rol,
}) {
  if (rol === 'alumno') {
    return obtenerContextoAlumno(idUsuario);
  }

  return '';
}

module.exports = {
  obtenerContextoChatbot,
};