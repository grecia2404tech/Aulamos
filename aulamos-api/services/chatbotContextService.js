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

  const [cursos] = await pool.query(
    `
      SELECT DISTINCT
        c.id_curso,
        c.nombre AS curso,
        m.nombre AS materia

      FROM inscripciones AS i

      INNER JOIN cursos AS c
        ON c.id_curso = i.id_curso

      INNER JOIN materias AS m
        ON m.id_materia = c.id_materia

      WHERE i.id_alumno = ?
        AND i.estado = 'Activo'
        AND c.estado = 'Activo'
        AND m.estado = 'Activa'

      ORDER BY
        m.nombre ASC,
        c.nombre ASC
    `,
    [idUsuario]
  );

  const [progresoResultados] = await pool.query(
    `
      SELECT
        ROUND(
          COALESCE(
            AVG(
              CASE
                WHEN ae.estado IN (
                  'Completada',
                  'Calificada'
                )
                THEN 100
                ELSE COALESCE(
                  ae.porcentaje_avance,
                  0
                )
              END
            ),
            0
          ),
          1
        ) AS progreso_general

      FROM actividad_estudiantes AS ae

      INNER JOIN actividades AS a
        ON a.id_actividad = ae.id_actividad

      WHERE ae.id_alumno = ?
        AND a.estado = 'Publicada'
    `,
    [idUsuario]
  );

  const [progresoMaterias] = await pool.query(
    `
      SELECT
        m.nombre AS materia,

        COUNT(
          DISTINCT a.id_actividad
        ) AS total_actividades,

        SUM(
          CASE
            WHEN ae.estado IN (
              'Completada',
              'Calificada'
            )
            OR COALESCE(
              ae.porcentaje_avance,
              0
            ) >= 100
            THEN 1
            ELSE 0
          END
        ) AS completadas,

        ROUND(
          COALESCE(
            AVG(
              CASE
                WHEN ae.estado IN (
                  'Completada',
                  'Calificada'
                )
                THEN 100
                ELSE COALESCE(
                  ae.porcentaje_avance,
                  0
                )
              END
            ),
            0
          ),
          1
        ) AS porcentaje

      FROM actividad_estudiantes AS ae

      INNER JOIN actividades AS a
        ON a.id_actividad = ae.id_actividad

      INNER JOIN cursos AS c
        ON c.id_curso = a.id_curso

      INNER JOIN materias AS m
        ON m.id_materia = c.id_materia

      WHERE ae.id_alumno = ?
        AND a.estado = 'Publicada'

      GROUP BY
        m.id_materia,
        m.nombre

      ORDER BY
        m.nombre ASC
    `,
    [idUsuario]
  );

  const progresoGeneral = Number(
    progresoResultados[0]?.progreso_general || 0
  );

  const [calificaciones] = await pool.query(
    `
      SELECT
        a.titulo,
        m.nombre AS materia,
        e.calificacion,
        a.puntaje_maximo

      FROM actividad_estudiantes AS ae

      INNER JOIN actividades AS a
        ON a.id_actividad = ae.id_actividad

      INNER JOIN cursos AS c
        ON c.id_curso = a.id_curso

      INNER JOIN materias AS m
        ON m.id_materia = c.id_materia

      INNER JOIN entregas AS e
        ON e.id_entrega = (
          SELECT MAX(e2.id_entrega)
          FROM entregas AS e2
          WHERE e2.id_actividad_estudiante =
            ae.id_actividad_estudiante
        )

      WHERE ae.id_alumno = ?
        AND e.calificacion IS NOT NULL

      ORDER BY
        e.calificado_en DESC,
        e.id_entrega DESC

      LIMIT 10
    `,
    [idUsuario]
  );

  const [promedioResultados] = await pool.query(
    `
      SELECT
        ROUND(
          AVG(
            CASE
              WHEN e.calificacion IS NOT NULL
                AND a.puntaje_maximo > 0
              THEN
                (
                  e.calificacion /
                  a.puntaje_maximo
                ) * 10
              ELSE NULL
            END
          ),
          2
        ) AS promedio

      FROM actividad_estudiantes AS ae

      INNER JOIN actividades AS a
        ON a.id_actividad = ae.id_actividad

      INNER JOIN entregas AS e
        ON e.id_entrega = (
          SELECT MAX(e2.id_entrega)
          FROM entregas AS e2
          WHERE e2.id_actividad_estudiante =
            ae.id_actividad_estudiante
        )

      WHERE ae.id_alumno = ?
        AND e.calificacion IS NOT NULL
    `,
    [idUsuario]
  );

  const promedioCalificaciones =
    promedioResultados[0]?.promedio === null ||
    promedioResultados[0]?.promedio === undefined
      ? null
      : Number(
          promedioResultados[0].promedio
        );

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
    `- Cursos activos inscritos: ${cursos.length}.`,
    `- Progreso general: ${progresoGeneral}%.`,
    `- Promedio de actividades calificadas: ${promedioCalificaciones === null ? 'sin calificaciones todavía' : `${promedioCalificaciones}/10`}.`,
    `- Actividades asignadas: ${total}.`,
    `- Actividades pendientes: ${pendientes}.`,
    `- Actividades en proceso: ${enProceso}.`,
    `- Actividades atrasadas: ${atrasadas}.`,
    `- Actividades terminadas o calificadas: ${terminadas}.`,
  ];

  if (cursos.length > 0) {
    lineas.push(
      '- Materias y cursos activos:'
    );

    cursos.forEach((item) => {
      lineas.push(
        `  - ${item.materia} | curso: ${item.curso}.`
      );
    });
  } else {
    lineas.push(
      '- Actualmente el alumno no tiene cursos activos inscritos.'
    );
  }

  if (progresoMaterias.length > 0) {
    lineas.push(
      '- Progreso por materia:'
    );

    progresoMaterias.forEach((item) => {
      lineas.push(
        `  - ${item.materia}: ${Number(item.porcentaje || 0)}% | ${Number(item.completadas || 0)} de ${Number(item.total_actividades || 0)} actividades completadas.`
      );
    });
  } else {
    lineas.push(
      '- No hay progreso por materia registrado actualmente.'
    );
  }

  if (calificaciones.length > 0) {
    lineas.push(
      '- Calificaciones recientes:'
    );

    calificaciones.forEach((item) => {
      lineas.push(
        `  - "${item.titulo}" | ${item.materia} | ${Number(item.calificacion)} de ${Number(item.puntaje_maximo)} puntos.`
      );
    });

    lineas.push(
      '- El promedio mostrado se calcula únicamente con actividades que ya tienen calificación y se normaliza a escala de 0 a 10.'
    );
  } else {
    lineas.push(
      '- Actualmente no hay actividades calificadas para este alumno.'
    );
  }

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