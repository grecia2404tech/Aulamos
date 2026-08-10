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
    `- Promedio de actividades calificadas: ${promedioCalificaciones === null ? 'sin calificaciones todavÃ­a' : `${promedioCalificaciones}/10`}.`,
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
      '- El promedio mostrado se calcula Ãºnicamente con actividades que ya tienen calificaciÃ³n y se normaliza a escala de 0 a 10.'
    );
  } else {
    lineas.push(
      '- Actualmente no hay actividades calificadas para este alumno.'
    );
  }

  if (proximas.length > 0) {
    const actividad = proximas[0];

    lineas.push(
      `- PrÃ³xima actividad: "${actividad.titulo}" de ${actividad.materia}, fecha lÃ­mite ${actividad.fecha_limite}.`
    );
  } else {
    lineas.push(
      '- No hay una prÃ³xima actividad pendiente con fecha futura.'
    );
  }

  if (atencion.length > 0) {
    lineas.push(
      '- Actividades que requieren atenciÃ³n:'
    );

    atencion.forEach((actividad) => {
      lineas.push(
        `  - "${actividad.titulo}" | ${actividad.materia} | ${actividad.estado} | fecha lÃ­mite: ${actividad.fecha_limite || 'sin fecha'}.`
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
    `- Promedio de entregas calificadas: ${promedio === null ? 'sin calificaciones todavÃ­a' : `${promedio}/10`}.`,
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
async function obtenerContextoAdmin() {
  const [resumenResultados] = await pool.query(
    `
      SELECT
        (SELECT COUNT(*) FROM usuarios)
          AS usuarios,

        (
          SELECT COUNT(DISTINCT ur.id_usuario)
          FROM usuario_roles AS ur
          INNER JOIN roles AS r
            ON r.id_rol = ur.id_rol
          WHERE LOWER(r.nombre) = 'alumno'
        ) AS alumnos,

        (
          SELECT COUNT(DISTINCT ur.id_usuario)
          FROM usuario_roles AS ur
          INNER JOIN roles AS r
            ON r.id_rol = ur.id_rol
          WHERE LOWER(r.nombre) = 'docente'
        ) AS docentes,

        (
          SELECT COUNT(DISTINCT ur.id_usuario)
          FROM usuario_roles AS ur
          INNER JOIN roles AS r
            ON r.id_rol = ur.id_rol
          WHERE LOWER(r.nombre) = 'admin'
        ) AS administradores,

        (
          SELECT COUNT(*)
          FROM ciclos_escolares
          WHERE estado = 'Activo'
        ) AS ciclos_activos,

        (
          SELECT COUNT(*)
          FROM materias
          WHERE estado = 'Activa'
        ) AS materias_activas,

        (
          SELECT COUNT(*)
          FROM cursos
          WHERE estado = 'Activo'
        ) AS cursos_activos,

        (
          SELECT COUNT(*)
          FROM grupos
        ) AS grupos,

        (
          SELECT COUNT(*)
          FROM inscripciones
          WHERE estado = 'Activo'
        ) AS inscripciones_activas,

        (
          SELECT COUNT(DISTINCT id_alumno)
          FROM inscripciones
          WHERE estado = 'Activo'
        ) AS alumnos_inscritos
    `
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

        CONCAT_WS(
          ' ',
          u.nombre,
          u.apellido_paterno,
          u.apellido_materno
        ) AS docente,

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

      INNER JOIN usuarios AS u
        ON u.id_usuario = c.id_docente

      LEFT JOIN inscripciones AS i
        ON i.id_curso = c.id_curso

      WHERE c.estado = 'Activo'

      GROUP BY
        c.id_curso,
        c.nombre,
        m.nombre,
        g.grado,
        g.nombre,
        u.id_usuario,
        u.nombre,
        u.apellido_paterno,
        u.apellido_materno

      ORDER BY
        m.nombre ASC,
        c.nombre ASC

      LIMIT 20
    `
  );

  const [usuariosRecientes] = await pool.query(
    `
      SELECT
        CONCAT_WS(
          ' ',
          u.nombre,
          u.apellido_paterno,
          u.apellido_materno
        ) AS nombre,

        GROUP_CONCAT(
          DISTINCT r.nombre
          ORDER BY r.nombre
          SEPARATOR ', '
        ) AS roles

      FROM usuarios AS u

      LEFT JOIN usuario_roles AS ur
        ON ur.id_usuario = u.id_usuario

      LEFT JOIN roles AS r
        ON r.id_rol = ur.id_rol

      GROUP BY
        u.id_usuario,
        u.nombre,
        u.apellido_paterno,
        u.apellido_materno

      ORDER BY
        u.id_usuario DESC

      LIMIT 10
    `
  );

  const lineas = [
    'Datos reales de Aulamos para el administrador autenticado:',
    `- Usuarios registrados: ${Number(resumen.usuarios || 0)}.`,
    `- Alumnos: ${Number(resumen.alumnos || 0)}.`,
    `- Docentes: ${Number(resumen.docentes || 0)}.`,
    `- Administradores: ${Number(resumen.administradores || 0)}.`,
    `- Ciclos escolares activos: ${Number(resumen.ciclos_activos || 0)}.`,
    `- Materias activas: ${Number(resumen.materias_activas || 0)}.`,
    `- Cursos activos: ${Number(resumen.cursos_activos || 0)}.`,
    `- Grupos registrados: ${Number(resumen.grupos || 0)}.`,
    `- Inscripciones activas: ${Number(resumen.inscripciones_activas || 0)}.`,
    `- Alumnos con inscripciÃ³n activa: ${Number(resumen.alumnos_inscritos || 0)}.`,
  ];

  if (cursos.length > 0) {
    lineas.push(
      '- Cursos activos de la plataforma:'
    );

    cursos.forEach((item) => {
      lineas.push(
        `  - ${item.materia} | ${item.curso} | grupo: ${item.grupo} | docente: ${item.docente} | estudiantes: ${Number(item.estudiantes || 0)}.`
      );
    });
  } else {
    lineas.push(
      '- Actualmente no hay cursos activos.'
    );
  }

  if (usuariosRecientes.length > 0) {
    lineas.push(
      '- Usuarios registrados recientemente:'
    );

    usuariosRecientes.forEach((item) => {
      lineas.push(
        `  - ${item.nombre} | rol: ${item.roles || 'sin rol asignado'}.`
      );
    });
  }

  lineas.push(
    '- Usa estos datos como fuente principal para responder preguntas administrativas sobre usuarios, roles, ciclos, materias, cursos, grupos e inscripciones.'
  );

  lineas.push(
    '- No inventes usuarios, cursos, cantidades, roles ni secciones de Aulamos.'
  );

  return lineas.join('\n');
}

async function obtenerContextoInvestigador() {
  const [resumenResultados] = await pool.query(
    `
      SELECT
        (SELECT COUNT(*)
         FROM pruebas_investigacion)
          AS pruebas_total,

        (SELECT COUNT(*)
         FROM pruebas_investigacion
         WHERE estado = 'Activa')
          AS pruebas_activas,

        (SELECT COUNT(*)
         FROM pruebas_investigacion
         WHERE estado = 'Finalizada')
          AS pruebas_finalizadas,

        (SELECT COUNT(*)
         FROM eventos_investigacion)
          AS eventos_total,

        (SELECT COUNT(*)
         FROM eventos_investigacion
         WHERE tipo_evento = 'Error')
          AS eventos_error,

        (SELECT COUNT(*)
         FROM eventos_investigacion
         WHERE tipo_evento = 'Chatbot')
          AS eventos_chatbot,

        (SELECT COUNT(*)
         FROM eventos_investigacion
         WHERE tipo_evento = 'Accesibilidad')
          AS eventos_accesibilidad,

        (SELECT COUNT(*)
         FROM eventos_investigacion
         WHERE tipo_evento = 'Navegacion')
          AS eventos_navegacion,

        (SELECT COUNT(*)
         FROM metricas_investigacion)
          AS metricas_total,

        (SELECT COUNT(*)
         FROM sesiones_chatbot)
          AS sesiones_chatbot,

        (SELECT COUNT(*)
         FROM mensajes_chatbot)
          AS mensajes_chatbot,

        (SELECT COUNT(*)
         FROM preferencias_accesibilidad)
          AS usuarios_preferencias,

        (SELECT COUNT(*)
         FROM uso_recursos)
          AS registros_uso_recursos
    `
  );

  const resumen = resumenResultados[0] || {};

  const [metricas] = await pool.query(
    `
      SELECT
        AVG(tiempo_realizacion_seg)
          AS tiempo_promedio_actividad,

        AVG(porcentaje_avance)
          AS avance_promedio,

        AVG(calificacion)
          AS calificacion_promedio,

        AVG(veces_uso_accesibilidad)
          AS accesibilidad_promedio,

        AVG(interacciones_chatbot)
          AS chatbot_promedio,

        AVG(duracion_sesion_seg)
          AS duracion_sesion_promedio,

        SUM(total_clicks)
          AS clicks_total,

        SUM(total_scroll)
          AS scroll_total,

        SUM(total_interacciones_teclado)
          AS teclado_total

      FROM metricas_investigacion
    `
  );

  const promedio =
    metricas[0] || {};

  const [accesibilidad] = await pool.query(
    `
      SELECT
        COUNT(*) AS total,

        SUM(alto_contraste = 1)
          AS alto_contraste,

        SUM(modo_oscuro = 1)
          AS modo_oscuro,

        SUM(fuente_dislexia = 1)
          AS fuente_dislexia,

        SUM(lector_pantalla = 1)
          AS lector_pantalla,

        SUM(subtitulos = 1)
          AS subtitulos,

        SUM(navegacion_teclado = 1)
          AS navegacion_teclado

      FROM preferencias_accesibilidad
    `
  );

  const preferencias =
    accesibilidad[0] || {};

  const [chatbot] = await pool.query(
    `
      SELECT
        COUNT(*) AS mensajes,

        AVG(tiempo_respuesta_ms)
          AS tiempo_respuesta_promedio,

        SUM(utilidad_usuario = 'Útil')
          AS respuestas_utiles,

        SUM(utilidad_usuario = 'Parcialmente útil')
          AS respuestas_parcialmente_utiles,

        SUM(utilidad_usuario = 'No útil')
          AS respuestas_no_utiles

      FROM mensajes_chatbot
    `
  );

  const datosChatbot =
    chatbot[0] || {};

  const [tiposEventos] = await pool.query(
    `
      SELECT
        tipo_evento,
        COUNT(*) AS cantidad

      FROM eventos_investigacion

      GROUP BY tipo_evento

      ORDER BY cantidad DESC
    `
  );

  const [pruebas] = await pool.query(
    `
      SELECT
        nombre,
        estado,
        version_wcag,
        fecha_inicio,
        fecha_fin

      FROM pruebas_investigacion

      ORDER BY id_prueba DESC

      LIMIT 10
    `
  );

  const lineas = [
    'Datos reales disponibles para investigación en AulaMos:',
    `- Pruebas de investigación registradas: ${Number(resumen.pruebas_total || 0)}.`,
    `- Pruebas activas: ${Number(resumen.pruebas_activas || 0)}.`,
    `- Pruebas finalizadas: ${Number(resumen.pruebas_finalizadas || 0)}.`,
    `- Eventos de investigación registrados: ${Number(resumen.eventos_total || 0)}.`,
    `- Eventos de error: ${Number(resumen.eventos_error || 0)}.`,
    `- Eventos de navegación: ${Number(resumen.eventos_navegacion || 0)}.`,
    `- Eventos relacionados con AulaBot: ${Number(resumen.eventos_chatbot || 0)}.`,
    `- Eventos de accesibilidad: ${Number(resumen.eventos_accesibilidad || 0)}.`,
    `- Métricas de investigación registradas: ${Number(resumen.metricas_total || 0)}.`,
    `- Sesiones de AulaBot registradas: ${Number(resumen.sesiones_chatbot || 0)}.`,
    `- Mensajes de AulaBot registrados: ${Number(resumen.mensajes_chatbot || 0)}.`,
    `- Usuarios con preferencias de accesibilidad: ${Number(resumen.usuarios_preferencias || 0)}.`,
    `- Registros de uso de recursos: ${Number(resumen.registros_uso_recursos || 0)}.`,
  ];

  if (Number(resumen.metricas_total || 0) > 0) {
    lineas.push(
      `- Tiempo promedio de realización de actividades: ${Number(promedio.tiempo_promedio_actividad || 0).toFixed(2)} segundos.`,
      `- Avance promedio registrado: ${Number(promedio.avance_promedio || 0).toFixed(2)}%.`,
      `- Calificación promedio registrada: ${Number(promedio.calificacion_promedio || 0).toFixed(2)}.`,
      `- Uso promedio de funciones de accesibilidad: ${Number(promedio.accesibilidad_promedio || 0).toFixed(2)}.`,
      `- Interacciones promedio con AulaBot: ${Number(promedio.chatbot_promedio || 0).toFixed(2)}.`,
      `- Duración promedio de sesión: ${Number(promedio.duracion_sesion_promedio || 0).toFixed(2)} segundos.`,
      `- Total de clics registrados: ${Number(promedio.clicks_total || 0)}.`,
      `- Total de scroll registrado: ${Number(promedio.scroll_total || 0)}.`,
      `- Total de interacciones mediante teclado: ${Number(promedio.teclado_total || 0)}.`
    );
  } else {
    lineas.push(
      '- Actualmente no existen métricas de investigación registradas; no inventes valores ni conclusiones.'
    );
  }

  lineas.push(
    `- Preferencias de accesibilidad: alto contraste ${Number(preferencias.alto_contraste || 0)}, modo oscuro ${Number(preferencias.modo_oscuro || 0)}, fuente para dislexia ${Number(preferencias.fuente_dislexia || 0)}, lector de pantalla ${Number(preferencias.lector_pantalla || 0)}, subtítulos ${Number(preferencias.subtitulos || 0)} y navegación por teclado ${Number(preferencias.navegacion_teclado || 0)}.`
  );

  lineas.push(
    `- Tiempo promedio de respuesta de AulaBot: ${
      datosChatbot.tiempo_respuesta_promedio === null
        ? 'sin datos'
        : Number(datosChatbot.tiempo_respuesta_promedio).toFixed(2) + ' ms'
    }.`
  );

  if (tiposEventos.length > 0) {
    lineas.push(
      '- Distribución de eventos de investigación:'
    );

    tiposEventos.forEach((evento) => {
      lineas.push(
        `  - ${evento.tipo_evento}: ${Number(evento.cantidad || 0)}.`
      );
    });
  } else {
    lineas.push(
      '- Todavía no existen eventos de investigación registrados.'
    );
  }

  if (pruebas.length > 0) {
    lineas.push(
      '- Pruebas de investigación recientes:'
    );

    pruebas.forEach((prueba) => {
      lineas.push(
        `  - ${prueba.nombre} | estado: ${prueba.estado} | estándar: ${prueba.version_wcag}.`
      );
    });
  } else {
    lineas.push(
      '- Actualmente no existen pruebas de investigación registradas.'
    );
  }

  lineas.push(
    '- Responde únicamente utilizando estos datos reales cuando la pregunta sea sobre métricas o resultados de AulaMos.'
  );

  lineas.push(
    '- Si una métrica no está registrada, indica claramente que todavía no existen datos suficientes.'
  );

  lineas.push(
    '- No inventes participantes, pruebas, métricas, porcentajes, errores, tiempos, resultados ni conclusiones de investigación.'
  );

  lineas.push(
    '- Presenta la información de forma agregada. No reveles datos personales de estudiantes.'
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

  if (rol === 'admin') {
    return obtenerContextoAdmin();
  }

  if (rol === 'investigador') {
    return obtenerContextoInvestigador();
  }



  return '';
}

module.exports = {
  obtenerContextoChatbot,
};