const pool = require("../config/database");

const PERIODOS_VALIDOS = new Set([
  "mes_actual",
  "mes_anterior",
  "ultimos_3_meses",
  "ciclo_actual",
]);

const obtenerIdDocente = (req) =>
  Number(
    req.usuario?.id_usuario ??
      req.usuario?.id ??
      req.usuario?.usuarioId ??
      0
  );

const esIdValido = (valor) =>
  Number.isInteger(Number(valor)) && Number(valor) > 0;

const crearFiltroReportes = (req, idDocente) => {
  const materia = String(req.query.materia ?? "todas").trim();
  const periodo = String(
    req.query.periodo ?? "mes_actual"
  ).trim();

  if (
    materia !== "todas" &&
    !esIdValido(materia)
  ) {
    return {
      error: "La materia seleccionada no es válida.",
    };
  }

  if (!PERIODOS_VALIDOS.has(periodo)) {
    return {
      error: "El periodo seleccionado no es válido.",
    };
  }

  const condiciones = [
    "a.id_docente = ?",
    "a.estado <> 'Borrador'",
  ];
  const valores = [idDocente];

  if (materia !== "todas") {
    condiciones.push("c.id_materia = ?");
    valores.push(Number(materia));
  }

  if (periodo === "mes_actual") {
    condiciones.push(`
      a.fecha_publicacion >=
        DATE_FORMAT(CURDATE(), '%Y-%m-01')
      AND a.fecha_publicacion <
        DATE_ADD(
          DATE_FORMAT(CURDATE(), '%Y-%m-01'),
          INTERVAL 1 MONTH
        )
    `);
  }

  if (periodo === "mes_anterior") {
    condiciones.push(`
      a.fecha_publicacion >=
        DATE_SUB(
          DATE_FORMAT(CURDATE(), '%Y-%m-01'),
          INTERVAL 1 MONTH
        )
      AND a.fecha_publicacion <
        DATE_FORMAT(CURDATE(), '%Y-%m-01')
    `);
  }

  if (periodo === "ultimos_3_meses") {
    condiciones.push(`
      a.fecha_publicacion >=
        DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      AND a.fecha_publicacion <
        DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    `);
  }

  if (periodo === "ciclo_actual") {
    condiciones.push(`
      EXISTS (
        SELECT 1
        FROM ciclos_escolares AS ce
        WHERE ce.id_ciclo = c.id_ciclo
          AND ce.estado = 'Activo'
      )
    `);
  }

  return {
    whereSql: condiciones.join(" AND "),
    valores,
  };
};

/*
 * GET /api/docente/materias
 *
 * Devuelve únicamente las materias asociadas a los cursos
 * del docente autenticado.
 */
const obtenerMateriasDocente = async (req, res) => {
  try {
    const idDocente = obtenerIdDocente(req);

    if (!esIdValido(idDocente)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al docente autenticado.",
      });
    }

    const [materias] = await pool.query(
      `
        SELECT DISTINCT
          m.id_materia,
          m.nombre
        FROM cursos AS c
        INNER JOIN materias AS m
          ON m.id_materia = c.id_materia
        WHERE c.id_docente = ?
        ORDER BY m.nombre ASC
      `,
      [idDocente]
    );

    return res.status(200).json({ materias });
  } catch (error) {
    console.error(
      "Error al consultar materias del docente:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron consultar las materias del docente.",
    });
  }
};

/*
 * GET /api/docente/reportes/resumen
 *
 * Parámetros opcionales:
 * - materia=todas | id_materia
 * - periodo=mes_actual | mes_anterior |
 *   ultimos_3_meses | ciclo_actual
 */
const obtenerResumenReportes = async (req, res) => {
  try {
    const idDocente = obtenerIdDocente(req);

    if (!esIdValido(idDocente)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al docente autenticado.",
      });
    }

    const filtro = crearFiltroReportes(
      req,
      idDocente
    );

    if (filtro.error) {
      return res.status(400).json({
        mensaje: filtro.error,
      });
    }

    const consultaUltimaEntrega = `
      WITH ultima_entrega AS (
        SELECT
          e.id_entrega,
          e.id_actividad_estudiante,
          e.estado,
          e.calificacion
        FROM entregas AS e
        INNER JOIN (
          SELECT
            id_actividad_estudiante,
            MAX(id_entrega) AS id_entrega
          FROM entregas
          GROUP BY id_actividad_estudiante
        ) AS ultima
          ON ultima.id_entrega = e.id_entrega
      )
    `;

    const [filasResumen] = await pool.query(
      `
        ${consultaUltimaEntrega}
        SELECT
          ROUND(
            COALESCE(
              AVG(
                CASE
                  WHEN ue.calificacion IS NOT NULL
                    AND a.puntaje_maximo > 0
                  THEN
                    (ue.calificacion / a.puntaje_maximo) * 10
                  ELSE NULL
                END
              ),
              0
            ),
            1
          ) AS promedio_general,

          ROUND(
            COALESCE(
              100 * SUM(
                CASE
                  WHEN ue.id_entrega IS NOT NULL
                    AND ue.estado IN (
                      'Entregada',
                      'Calificada',
                      'Devuelta'
                    )
                  THEN 1
                  ELSE 0
                END
              ) / NULLIF(
                COUNT(ae.id_actividad_estudiante),
                0
              ),
              0
            ),
            0
          ) AS porcentaje_entregadas,

          COUNT(
            DISTINCT CASE
              WHEN a.tipo = 'Evaluacion'
              THEN a.id_actividad
              ELSE NULL
            END
          ) AS evaluaciones_realizadas

        FROM actividades AS a
        INNER JOIN cursos AS c
          ON c.id_curso = a.id_curso
        LEFT JOIN actividad_estudiantes AS ae
          ON ae.id_actividad = a.id_actividad
        LEFT JOIN ultima_entrega AS ue
          ON ue.id_actividad_estudiante =
            ae.id_actividad_estudiante
        WHERE ${filtro.whereSql}
      `,
      filtro.valores
    );

    const [filasAprobados] = await pool.query(
      `
        ${consultaUltimaEntrega},
        promedios_alumno AS (
          SELECT
            ae.id_alumno,
            AVG(
              (ue.calificacion / a.puntaje_maximo) * 10
            ) AS promedio
          FROM actividades AS a
          INNER JOIN cursos AS c
            ON c.id_curso = a.id_curso
          INNER JOIN actividad_estudiantes AS ae
            ON ae.id_actividad = a.id_actividad
          INNER JOIN ultima_entrega AS ue
            ON ue.id_actividad_estudiante =
              ae.id_actividad_estudiante
          WHERE ${filtro.whereSql}
            AND ue.calificacion IS NOT NULL
            AND a.puntaje_maximo > 0
          GROUP BY ae.id_alumno
        )
        SELECT
          ROUND(
            COALESCE(
              100 * SUM(
                CASE
                  WHEN promedio >= 6 THEN 1
                  ELSE 0
                END
              ) / NULLIF(COUNT(*), 0),
              0
            ),
            0
          ) AS porcentaje_aprobados
        FROM promedios_alumno
      `,
      filtro.valores
    );

    const [rendimiento] = await pool.query(
      `
        ${consultaUltimaEntrega}
        SELECT
          a.id_actividad,
          a.titulo AS etiqueta,
          ROUND(
            COALESCE(
              AVG(
                CASE
                  WHEN ue.calificacion IS NOT NULL
                    AND a.puntaje_maximo > 0
                  THEN
                    (ue.calificacion / a.puntaje_maximo) * 10
                  ELSE NULL
                END
              ),
              0
            ),
            1
          ) AS valor,
          a.fecha_publicacion
        FROM actividades AS a
        INNER JOIN cursos AS c
          ON c.id_curso = a.id_curso
        LEFT JOIN actividad_estudiantes AS ae
          ON ae.id_actividad = a.id_actividad
        LEFT JOIN ultima_entrega AS ue
          ON ue.id_actividad_estudiante =
            ae.id_actividad_estudiante
        WHERE ${filtro.whereSql}
        GROUP BY
          a.id_actividad,
          a.titulo,
          a.fecha_publicacion
        ORDER BY
          a.fecha_publicacion DESC,
          a.id_actividad DESC
        LIMIT 6
      `,
      filtro.valores
    );

    const resumenBase = filasResumen[0] ?? {};
    const aprobadosBase = filasAprobados[0] ?? {};

    return res.status(200).json({
      resumen: {
        promedio_general: Number(
          resumenBase.promedio_general ?? 0
        ),
        porcentaje_aprobados: Number(
          aprobadosBase.porcentaje_aprobados ?? 0
        ),
        porcentaje_entregadas: Number(
          resumenBase.porcentaje_entregadas ?? 0
        ),
        evaluaciones_realizadas: Number(
          resumenBase.evaluaciones_realizadas ?? 0
        ),
      },
      rendimiento_actividades: rendimiento
        .slice()
        .reverse()
        .map((item) => ({
          etiqueta: item.etiqueta,
          valor: Number(item.valor ?? 0),
        })),
    });
  } catch (error) {
    console.error(
      "Error al generar el resumen de reportes:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo generar el resumen de reportes.",
    });
  }
};

/*
 * GET /api/docente/reportes/rendimiento-actividad
 *
 * Devuelve el rendimiento de tareas, ejercicios, lecturas y
 * proyectos. Las evaluaciones se consultan en su propio reporte.
 */
const obtenerRendimientoActividades = async (req, res) => {
  try {
    const idDocente = obtenerIdDocente(req);

    if (!esIdValido(idDocente)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al docente autenticado.",
      });
    }

    const filtro = crearFiltroReportes(
      req,
      idDocente
    );

    if (filtro.error) {
      return res.status(400).json({
        mensaje: filtro.error,
      });
    }

    const [filas] = await pool.query(
      `
        WITH ultima_entrega AS (
          SELECT
            e.id_entrega,
            e.id_actividad_estudiante,
            e.estado,
            e.calificacion
          FROM entregas AS e
          INNER JOIN (
            SELECT
              id_actividad_estudiante,
              MAX(id_entrega) AS id_entrega
            FROM entregas
            GROUP BY id_actividad_estudiante
          ) AS ultima
            ON ultima.id_entrega = e.id_entrega
        )
        SELECT
          a.id_actividad,
          a.titulo,
          a.tipo,
          c.nombre AS curso,
          m.nombre AS materia,
          a.fecha_publicacion,
          a.fecha_limite,
          COUNT(
            ae.id_actividad_estudiante
          ) AS total_asignados,
          SUM(
            CASE
              WHEN ue.id_entrega IS NOT NULL
                AND ue.estado IN (
                  'Entregada',
                  'Calificada',
                  'Devuelta'
                )
              THEN 1
              ELSE 0
            END
          ) AS total_entregas,
          ROUND(
            COALESCE(
              100 * SUM(
                CASE
                  WHEN ue.id_entrega IS NOT NULL
                    AND ue.estado IN (
                      'Entregada',
                      'Calificada',
                      'Devuelta'
                    )
                  THEN 1
                  ELSE 0
                END
              ) / NULLIF(
                COUNT(ae.id_actividad_estudiante),
                0
              ),
              0
            ),
            0
          ) AS porcentaje_entregas,
          ROUND(
            COALESCE(
              AVG(
                CASE
                  WHEN ue.calificacion IS NOT NULL
                    AND a.puntaje_maximo > 0
                  THEN
                    (ue.calificacion / a.puntaje_maximo) * 10
                  ELSE NULL
                END
              ),
              0
            ),
            1
          ) AS promedio
        FROM actividades AS a
        INNER JOIN cursos AS c
          ON c.id_curso = a.id_curso
        INNER JOIN materias AS m
          ON m.id_materia = c.id_materia
        LEFT JOIN actividad_estudiantes AS ae
          ON ae.id_actividad = a.id_actividad
        LEFT JOIN ultima_entrega AS ue
          ON ue.id_actividad_estudiante =
            ae.id_actividad_estudiante
        WHERE ${filtro.whereSql}
          AND a.tipo <> 'Evaluacion'
        GROUP BY
          a.id_actividad,
          a.titulo,
          a.tipo,
          c.nombre,
          m.nombre,
          a.fecha_publicacion,
          a.fecha_limite
        ORDER BY
          a.fecha_publicacion DESC,
          a.id_actividad DESC
      `,
      filtro.valores
    );

    return res.status(200).json({
      actividades: filas.map((item) => ({
        id_actividad: Number(item.id_actividad),
        titulo: item.titulo,
        tipo: item.tipo,
        curso: item.curso,
        materia: item.materia,
        fecha_publicacion: item.fecha_publicacion,
        fecha_limite: item.fecha_limite,
        total_asignados: Number(
          item.total_asignados ?? 0
        ),
        total_entregas: Number(
          item.total_entregas ?? 0
        ),
        porcentaje_entregas: Number(
          item.porcentaje_entregas ?? 0
        ),
        promedio: Number(item.promedio ?? 0),
      })),
    });
  } catch (error) {
    console.error(
      "Error al generar el rendimiento por actividad:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo generar el rendimiento por actividad.",
    });
  }
};

/*
 * GET /api/docente/reportes/rendimiento-evaluacion
 *
 * Devuelve promedio, participación y porcentaje de aprobados
 * para cada actividad cuyo tipo sea Evaluacion.
 */
const obtenerRendimientoEvaluaciones = async (req, res) => {
  try {
    const idDocente = obtenerIdDocente(req);

    if (!esIdValido(idDocente)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al docente autenticado.",
      });
    }

    const filtro = crearFiltroReportes(
      req,
      idDocente
    );

    if (filtro.error) {
      return res.status(400).json({
        mensaje: filtro.error,
      });
    }

    const [filas] = await pool.query(
      `
        WITH ultima_entrega AS (
          SELECT
            e.id_entrega,
            e.id_actividad_estudiante,
            e.estado,
            e.calificacion
          FROM entregas AS e
          INNER JOIN (
            SELECT
              id_actividad_estudiante,
              MAX(id_entrega) AS id_entrega
            FROM entregas
            GROUP BY id_actividad_estudiante
          ) AS ultima
            ON ultima.id_entrega = e.id_entrega
        )
        SELECT
          a.id_actividad AS id_evaluacion,
          a.titulo,
          c.nombre AS curso,
          m.nombre AS materia,
          a.fecha_publicacion,
          a.fecha_limite,
          COUNT(
            ae.id_actividad_estudiante
          ) AS total_alumnos,
          SUM(
            CASE
              WHEN ue.id_entrega IS NOT NULL
                AND ue.estado IN (
                  'Entregada',
                  'Calificada',
                  'Devuelta'
                )
              THEN 1
              ELSE 0
            END
          ) AS total_entregas,
          ROUND(
            COALESCE(
              100 * SUM(
                CASE
                  WHEN ue.id_entrega IS NOT NULL
                    AND ue.estado IN (
                      'Entregada',
                      'Calificada',
                      'Devuelta'
                    )
                  THEN 1
                  ELSE 0
                END
              ) / NULLIF(
                COUNT(ae.id_actividad_estudiante),
                0
              ),
              0
            ),
            0
          ) AS porcentaje_participacion,
          ROUND(
            COALESCE(
              AVG(
                CASE
                  WHEN ue.calificacion IS NOT NULL
                    AND a.puntaje_maximo > 0
                  THEN
                    (ue.calificacion / a.puntaje_maximo) * 10
                  ELSE NULL
                END
              ),
              0
            ),
            1
          ) AS promedio,
          ROUND(
            COALESCE(
              100 * SUM(
                CASE
                  WHEN ue.calificacion IS NOT NULL
                    AND a.puntaje_maximo > 0
                    AND (
                      ue.calificacion / a.puntaje_maximo
                    ) * 10 >= 6
                  THEN 1
                  ELSE 0
                END
              ) / NULLIF(
                SUM(
                  CASE
                    WHEN ue.calificacion IS NOT NULL
                      AND a.puntaje_maximo > 0
                    THEN 1
                    ELSE 0
                  END
                ),
                0
              ),
              0
            ),
            0
          ) AS porcentaje_aprobados
        FROM actividades AS a
        INNER JOIN cursos AS c
          ON c.id_curso = a.id_curso
        INNER JOIN materias AS m
          ON m.id_materia = c.id_materia
        LEFT JOIN actividad_estudiantes AS ae
          ON ae.id_actividad = a.id_actividad
        LEFT JOIN ultima_entrega AS ue
          ON ue.id_actividad_estudiante =
            ae.id_actividad_estudiante
        WHERE ${filtro.whereSql}
          AND a.tipo = 'Evaluacion'
        GROUP BY
          a.id_actividad,
          a.titulo,
          c.nombre,
          m.nombre,
          a.fecha_publicacion,
          a.fecha_limite
        ORDER BY
          a.fecha_publicacion DESC,
          a.id_actividad DESC
      `,
      filtro.valores
    );

    return res.status(200).json({
      evaluaciones: filas.map((item) => ({
        id_evaluacion: Number(item.id_evaluacion),
        titulo: item.titulo,
        curso: item.curso,
        materia: item.materia,
        fecha_publicacion: item.fecha_publicacion,
        fecha_limite: item.fecha_limite,
        total_alumnos: Number(
          item.total_alumnos ?? 0
        ),
        total_entregas: Number(
          item.total_entregas ?? 0
        ),
        porcentaje_participacion: Number(
          item.porcentaje_participacion ?? 0
        ),
        promedio: Number(item.promedio ?? 0),
        porcentaje_aprobados: Number(
          item.porcentaje_aprobados ?? 0
        ),
      })),
    });
  } catch (error) {
    console.error(
      "Error al generar el rendimiento por evaluación:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo generar el rendimiento por evaluación.",
    });
  }
};

module.exports = {
  obtenerMateriasDocente,
  obtenerResumenReportes,
  obtenerRendimientoActividades,
  obtenerRendimientoEvaluaciones,
};
