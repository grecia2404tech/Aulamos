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

async function obtenerContextoDocente(idUsuario) {
  const [resumenResultados] = await pool.query(
    `
      SELECT
        (
          SELECT COUNT(*)
          FROM cursos AS c
          WHERE c.id_docente = ?
            AND c.estado = 'Activo'
        ) AS cursos_activos,

        (
          SELECT COUNT(DISTINCT c.id_grupo)
          FROM cursos AS c
          WHERE c.id_docente = ?
            AND c.estado = 'Activo'
        ) AS grupos_activos,

        (
          SELECT COUNT(DISTINCT i.id_alumno)
          FROM inscripciones AS i
          INNER JOIN cursos AS c
            ON c.id_curso = i.id_curso
          WHERE c.id_docente = ?
            AND c.estado = 'Activo'
            AND i.estado = 'Activo'
        ) AS estudiantes,

        (
          SELECT COUNT(*)
          FROM actividades AS a
          WHERE a.id_docente = ?
            AND a.estado = 'Publicada'
        ) AS actividades_publicadas,

        (
          SELECT COUNT(*)
          FROM actividades AS a
          WHERE a.id_docente = ?
            AND a.estado = 'Borrador'
        ) AS borradores,

        (
          SELECT COUNT(*)
          FROM actividades AS a
          WHERE a.id_docente = ?
            AND a.estado = 'Cerrada'
        ) AS cerradas
    `,
    [
      idUsuario,
      idUsuario,
      idUsuario,
      idUsuario,
      idUsuario,
      idUsuario,
    ]
  );

  const resumen = resumenResultados[0] || {};

  const [cursos] = await pool.query(
    `
      SELECT
        c.nombre AS curso,
        m.nombre AS materia,

        CONCAT_WS(
          ' - ',
          g.grado,
          g.nombre
        ) AS grupo,

        COUNT(
          DISTINCT CASE
            WHEN i.estado = 'Activo'
            THEN i.id_alumno
            ELSE NULL
          END
        ) AS estudiantes

      FROM cursos AS c

      INNER JOIN materias AS m
        ON m.id_materia = c.id_materia

      INNER JOIN grupos AS g
        ON g.id_grupo = c.id_grupo

      LEFT JOIN inscripciones AS i
        ON i.id_curso = c.id_curso

      WHERE c.id_docente = ?
        AND c.estado = 'Activo'

      GROUP BY
        c.id_curso,
        c.nombre,
        m.nombre,
        g.grado,
        g.nombre

      ORDER BY
        m.nombre ASC,
        c.nombre ASC

      LIMIT 15
    `,
    [idUsuario]
  );

  const [estudiantes] = await pool.query(
    `
      SELECT DISTINCT
        CONCAT_WS(
          ' ',
          u.nombre,
          u.apellido_paterno,
          u.apellido_materno
        ) AS nombre,

        m.nombre AS materia,
        c.nombre AS curso,

        CONCAT_WS(
          ' - ',
          g.grado,
          g.nombre
        ) AS grupo

      FROM cursos AS c

      INNER JOIN inscripciones AS i
        ON i.id_curso = c.id_curso

      INNER JOIN usuarios AS u
        ON u.id_usuario = i.id_alumno

      INNER JOIN materias AS m
        ON m.id_materia = c.id_materia

      INNER JOIN grupos AS g
        ON g.id_grupo = c.id_grupo

      WHERE c.id_docente = ?
        AND c.estado = 'Activo'
        AND i.estado = 'Activo'

      ORDER BY
        nombre ASC

      LIMIT 20
    `,
    [idUsuario]
  );

  const [actividades] = await pool.query(
    `
      SELECT
        a.titulo,
        a.tipo,
        a.estado,
        a.fecha_limite,
        m.nombre AS materia,
        c.nombre AS curso,

        (
          SELECT COUNT(*)
          FROM actividad_estudiantes AS ae
          WHERE ae.id_actividad = a.id_actividad
            AND EXISTS (
              SELECT 1
              FROM entregas AS e
              WHERE e.id_entrega = (
                SELECT MAX(e2.id_entrega)
                FROM entregas AS e2
                WHERE e2.id_actividad_estudiante =
                  ae.id_actividad_estudiante
              )
                AND e.calificacion IS NULL
                AND e.estado IN (
                  'Pendiente',
                  'Entregada'
                )
            )
        ) AS por_calificar

      FROM actividades AS a

      INNER JOIN cursos AS c
        ON c.id_curso = a.id_curso

      INNER JOIN materias AS m
        ON m.id_materia = c.id_materia

      WHERE a.id_docente = ?

      ORDER BY
        CASE a.estado
          WHEN 'Publicada' THEN 0
          WHEN 'Borrador' THEN 1
          WHEN 'Cerrada' THEN 2
          ELSE 3
        END,
        a.fecha_publicacion DESC

      LIMIT 10
    `,
    [idUsuario]
  );

  const [rendimientoResultados] = await pool.query(
    `
      SELECT
        COUNT(*) AS entregas_calificadas,

        ROUND(
          AVG(
            CASE
              WHEN a.puntaje_maximo > 0
                AND e.calificacion IS NOT NULL
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

      WHERE a.id_docente = ?
        AND e.calificacion IS NOT NULL
    `,
    [idUsuario]
  );

  const cursosActivos =
    Number(resumen.cursos_activos || 0);

  const gruposActivos =
    Number(resumen.grupos_activos || 0);

  const totalEstudiantes =
    Number(resumen.estudiantes || 0);

  const publicadas =
    Number(resumen.actividades_publicadas || 0);

  const borradores =
    Number(resumen.borradores || 0);

  const cerradas =
    Number(resumen.cerradas || 0);

  const porCalificar = actividades.reduce(
    (total, actividad) =>
      total + Number(
        actividad.por_calificar || 0
      ),
    0
  );

  const rendimiento =
    rendimientoResultados[0] || {};

  const entregasCalificadas =
    Number(
      rendimiento.entregas_calificadas || 0
    );

  const promedio =
    rendimiento.promedio === null ||
    rendimiento.promedio === undefined
      ? null
      : Number(rendimiento.promedio);

  const lineas = [
    'Datos reales de Aulamos para el docente autenticado:',
    `- Cursos activos: ${cursosActivos}.`,
    `- Grupos activos: ${gruposActivos}.`,
    `- Estudiantes distintos: ${totalEstudiantes}.`,
    `- Actividades publicadas: ${publicadas}.`,
    `- Actividades en borrador: ${borradores}.`,
    `- Actividades cerradas: ${cerradas}.`,
    `- Entregas pendientes de calificar: ${porCalificar}.`,
    `- Entregas ya calificadas: ${entregasCalificadas}.`,
    `- Promedio de entregas calificadas: ${promedio === null ? 'sin calificaciones todavía' : `${promedio}/10`}.`,
  ];

  if (cursos.length > 0) {
    lineas.push(
      '- Cursos, materias y grupos del docente:'
    );

    cursos.forEach((item) => {
      lineas.push(
        `  - ${item.materia} | curso: ${item.curso} | grupo: ${item.grupo} | estudiantes: ${Number(item.estudiantes || 0)}.`
      );
    });
  } else {
    lineas.push(
      '- Actualmente el docente no tiene cursos activos.'
    );
  }

  if (estudiantes.length > 0) {
    lineas.push(
      '- Estudiantes de sus cursos:'
    );

    estudiantes.forEach((item) => {
      lineas.push(
        `  - ${item.nombre} | ${item.materia} | ${item.curso} | ${item.grupo}.`
      );
    });
  } else {
    lineas.push(
      '- Actualmente no hay estudiantes activos en sus cursos.'
    );
  }

  if (actividades.length > 0) {
    lineas.push(
      '- Actividades del docente:'
    );

    actividades.forEach((item) => {
      lineas.push(
        `  - "${item.titulo}" | ${item.materia} | ${item.estado} | por calificar: ${Number(item.por_calificar || 0)}.`
      );
    });
  } else {
    lineas.push(
      '- Actualmente el docente no tiene actividades registradas.'
    );
  }

  lineas.push(
    '- Usa estos datos como fuente principal para responder preguntas sobre cursos, grupos, alumnos, actividades, entregas y rendimiento.'
  );

  lineas.push(
    '- No inventes cursos, alumnos, actividades, calificaciones ni secciones de Aulamos.'
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

  if (rol === 'docente') {
    return obtenerContextoDocente(idUsuario);
  }

  return '';
}

module.exports = {
  obtenerContextoChatbot,
};