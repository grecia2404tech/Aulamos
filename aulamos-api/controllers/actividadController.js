const pool = require("../config/database");

const TIPOS_VALIDOS = [
  "Tarea",
  "Ejercicio",
  "Lectura",
  "Proyecto",
  "Evaluacion",
];

const ESTADOS_CREACION = [
  "Borrador",
  "Publicada",
];

const obtenerIdDocente = (req) => {
  return Number(
    req.usuario?.id_usuario ??
    req.usuario?.id ??
    req.usuario?.usuarioId ??
    0
  );
};

const obtenerIdAlumno = (req) => {
  return Number(
    req.usuario?.id_usuario ??
    req.usuario?.id ??
    req.usuario?.usuarioId ??
    0
  );
};

const obtenerRolUsuario = (req) => {
  return String(
    req.usuario?.rol ?? ""
  )
    .trim()
    .toLowerCase();
};

const esIdValido = (valor) => {
  const numero = Number(valor);

  return (
    Number.isInteger(numero) &&
    numero > 0
  );
};

const convertirBooleano = (valor) => {
  return [
    true,
    1,
    "1",
    "true",
  ].includes(valor)
    ? 1
    : 0;
};

const fechaMySQLValida = (fecha) => {
  if (
    typeof fecha !== "string" ||
    !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
      fecha
    )
  ) {
    return false;
  }

  const fechaConvertida = new Date(
    fecha.replace(" ", "T")
  );

  return !Number.isNaN(
    fechaConvertida.getTime()
  );
};

/*
 * GET /api/academico/actividades/catalogos
 *
 * Devuelve los cursos asignados al docente
 * y los periodos activos.
 */
const obtenerCatalogosActividad = async (
  req,
  res
) => {
  try {
    const idDocente = obtenerIdDocente(req);

    if (!esIdValido(idDocente)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al docente autenticado.",
      });
    }

    const [cursos] = await pool.query(
      `
        SELECT
          c.id_curso,
          c.id_ciclo,
          c.nombre,
          m.nombre AS materia,

          CONCAT_WS(
            ' - ',
            g.grado,
            g.nombre
          ) AS grupo

        FROM cursos AS c

        INNER JOIN materias AS m
          ON m.id_materia = c.id_materia

        INNER JOIN grupos AS g
          ON g.id_grupo = c.id_grupo

        WHERE c.id_docente = ?
          AND c.estado = 'Activo'

        ORDER BY
          m.nombre,
          g.grado,
          g.nombre
      `,
      [idDocente]
    );

    const [periodos] = await pool.query(`
      SELECT
        id_periodo,
        id_ciclo,
        nombre,
        fecha_inicio,
        fecha_fin,
        estado
      FROM periodos_evaluacion
      WHERE estado = 'Activo'
      ORDER BY
        fecha_inicio,
        nombre
    `);

    return res.status(200).json({
      cursos,
      periodos,
    });
  } catch (error) {
    console.error(
      "Error al consultar catálogos de actividades:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron consultar los cursos y periodos.",
    });
  }
};

/*
 * POST /api/academico/actividades
 */
const crearActividad = async (
  req,
  res
) => {
  let conexion;

  try {
    const idDocente = obtenerIdDocente(req);

    const idCurso = Number(
      req.body.id_curso
    );

    const idPeriodo =
      req.body.id_periodo === null ||
      req.body.id_periodo === undefined ||
      req.body.id_periodo === ""
        ? null
        : Number(req.body.id_periodo);

    const titulo = String(
      req.body.titulo ?? ""
    ).trim();

    const descripcion = String(
      req.body.descripcion ?? ""
    ).trim();

    const instrucciones = String(
      req.body.instrucciones ?? ""
    ).trim();

    const tipo = req.body.tipo;

    const fechaLimite =
      req.body.fecha_limite;

    const puntajeMaximo = Number(
      req.body.puntaje_maximo ?? 100
    );

    const permiteEntregaArchivo =
      convertirBooleano(
        req.body.permite_entrega_archivo
      );

    const estado =
      req.body.estado ?? "Borrador";

    if (!esIdValido(idDocente)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al docente autenticado.",
      });
    }

    if (!esIdValido(idCurso)) {
      return res.status(400).json({
        mensaje:
          "Selecciona un curso válido.",
      });
    }

    if (
      idPeriodo !== null &&
      !esIdValido(idPeriodo)
    ) {
      return res.status(400).json({
        mensaje:
          "El periodo seleccionado no es válido.",
      });
    }

    if (!titulo) {
      return res.status(400).json({
        mensaje:
          "Escribe el título de la actividad.",
      });
    }

    if (titulo.length > 150) {
      return res.status(400).json({
        mensaje:
          "El título no puede superar los 150 caracteres.",
      });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({
        mensaje:
          "El tipo de actividad no es válido.",
      });
    }

    if (
      !ESTADOS_CREACION.includes(estado)
    ) {
      return res.status(400).json({
        mensaje:
          "La actividad solamente puede crearse como Borrador o Publicada.",
      });
    }

    if (!fechaMySQLValida(fechaLimite)) {
      return res.status(400).json({
        mensaje:
          "La fecha límite no tiene un formato válido.",
      });
    }

    const fechaLimiteObjeto = new Date(
      fechaLimite.replace(" ", "T")
    );

    if (
      fechaLimiteObjeto.getTime() <=
      Date.now()
    ) {
      return res.status(400).json({
        mensaje:
          "La fecha límite debe ser posterior a la fecha actual.",
      });
    }

    if (
      Number.isNaN(puntajeMaximo) ||
      puntajeMaximo < 0 ||
      puntajeMaximo > 999.99
    ) {
      return res.status(400).json({
        mensaje:
          "El puntaje máximo debe estar entre 0 y 999.99.",
      });
    }

    let configuracionEvaluacion = null;

    if (tipo === "Evaluacion") {
      const configuracion =
        req.body.configuracion_evaluacion;

      if (
        !configuracion ||
        typeof configuracion !== "object" ||
        Array.isArray(configuracion)
      ) {
        return res.status(400).json({
          mensaje:
            "Completa la configuración de la evaluación.",
        });
      }

      configuracionEvaluacion =
        JSON.stringify(configuracion);
    }

    /*
     * Comprueba que el curso pertenezca
     * al docente autenticado.
     */
    const [cursos] = await pool.query(
      `
        SELECT
          id_curso,
          id_ciclo
        FROM cursos
        WHERE id_curso = ?
          AND id_docente = ?
          AND estado = 'Activo'
        LIMIT 1
      `,
      [
        idCurso,
        idDocente,
      ]
    );

    if (cursos.length === 0) {
      return res.status(403).json({
        mensaje:
          "El curso no existe, no está activo o no está asignado a este docente.",
      });
    }

    /*
     * Comprueba que el periodo corresponda
     * al mismo ciclo escolar del curso.
     */
    if (idPeriodo !== null) {
      const [periodos] = await pool.query(
        `
          SELECT id_periodo
          FROM periodos_evaluacion
          WHERE id_periodo = ?
            AND id_ciclo = ?
            AND estado = 'Activo'
          LIMIT 1
        `,
        [
          idPeriodo,
          cursos[0].id_ciclo,
        ]
      );

      if (periodos.length === 0) {
        return res.status(400).json({
          mensaje:
            "El periodo no corresponde al ciclo escolar del curso.",
        });
      }
    }

    conexion = await pool.getConnection();

    await conexion.beginTransaction();

    const [resultado] =
      await conexion.query(
        `
          INSERT INTO actividades (
            id_curso,
            id_periodo,
            id_docente,
            titulo,
            descripcion,
            instrucciones,
            tipo,
            configuracion_evaluacion,
            fecha_limite,
            puntaje_maximo,
            permite_entrega_archivo,
            estado
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          idCurso,
          idPeriodo,
          idDocente,
          titulo,
          descripcion || null,
          instrucciones || null,
          tipo,
          configuracionEvaluacion,
          fechaLimite,
          puntajeMaximo,
          permiteEntregaArchivo,
          estado,
        ]
      );

    let alumnosAsignados = 0;

    /*
     * Si se publica, se asigna automáticamente
     * a todos los alumnos activos del curso.
     */
    if (estado === "Publicada") {
      const [asignacion] =
        await conexion.query(
          `
            INSERT IGNORE INTO actividad_estudiantes (
              id_actividad,
              id_alumno,
              estado
            )
            SELECT
              ?,
              i.id_alumno,
              'Pendiente'
            FROM inscripciones AS i
            WHERE i.id_curso = ?
              AND i.estado = 'Activo'
          `,
          [
            resultado.insertId,
            idCurso,
          ]
        );

      alumnosAsignados =
        asignacion.affectedRows;
    }

    await conexion.commit();

    return res.status(201).json({
      mensaje:
        estado === "Publicada"
          ? "La actividad se publicó correctamente."
          : "La actividad se guardó como borrador.",
      id_actividad: resultado.insertId,
      estado,
      alumnos_asignados: alumnosAsignados,
    });
  } catch (error) {
    if (conexion) {
      await conexion.rollback();
    }

    console.error(
      "Error al crear la actividad:",
      error
    );

    if (
      error.code ===
      "ER_NO_REFERENCED_ROW_2"
    ) {
      return res.status(400).json({
        mensaje:
          "El curso, periodo o docente seleccionado ya no existe.",
      });
    }

    return res.status(500).json({
      mensaje:
        "No se pudo crear la actividad.",
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

const obtenerMisActividadesAlumno = async (
  req,
  res
) => {
  try {
    const idAlumno = obtenerIdAlumno(req);

    if (!esIdValido(idAlumno)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al alumno autenticado.",
      });
    }

    const [actividades] = await pool.query(
      `
        SELECT
          a.id_actividad,
          a.id_curso,
          a.id_periodo,
          a.titulo,
          a.descripcion,
          a.instrucciones,
          a.tipo,
          a.configuracion_evaluacion,
          a.fecha_publicacion,
          a.fecha_limite,
          a.puntaje_maximo,
          a.permite_entrega_archivo,
          a.estado AS estado_actividad,

          ae.estado AS estado_alumno,

          c.nombre AS nombre_curso,
          m.nombre AS materia,

          CONCAT_WS(
            ' - ',
            g.grado,
            g.nombre
          ) AS grupo,

          pe.nombre AS periodo,

          CASE
            WHEN a.fecha_limite < NOW()
              AND ae.estado NOT IN (
                'Entregada',
                'Calificada',
                'Completada'
              )
            THEN 1
            ELSE 0
          END AS vencida

        FROM actividad_estudiantes AS ae

        INNER JOIN actividades AS a
          ON a.id_actividad = ae.id_actividad

        INNER JOIN cursos AS c
          ON c.id_curso = a.id_curso

        INNER JOIN materias AS m
          ON m.id_materia = c.id_materia

        INNER JOIN grupos AS g
          ON g.id_grupo = c.id_grupo

        LEFT JOIN periodos_evaluacion AS pe
          ON pe.id_periodo = a.id_periodo

        WHERE ae.id_alumno = ?
          AND a.estado IN (
            'Publicada',
            'Cerrada'
          )

        ORDER BY
          CASE
            WHEN ae.estado IN (
              'Entregada',
              'Calificada',
              'Completada'
            )
            THEN 1
            ELSE 0
          END,
          a.fecha_limite ASC,
          a.fecha_publicacion DESC
      `,
      [idAlumno]
    );

    const estadosTerminados = new Set([
      "Entregada",
      "Calificada",
      "Completada",
    ]);

    const resumen = actividades.reduce(
      (acumulado, actividad) => {
        acumulado.total += 1;

        if (Number(actividad.vencida) === 1) {
          acumulado.vencidas += 1;
        } else if (
          estadosTerminados.has(
            actividad.estado_alumno
          )
        ) {
          acumulado.entregadas += 1;
        } else {
          acumulado.pendientes += 1;
        }

        return acumulado;
      },
      {
        total: 0,
        pendientes: 0,
        entregadas: 0,
        vencidas: 0,
      }
    );

    return res.status(200).json({
      actividades,
      resumen,
    });
  } catch (error) {
    console.error(
      "Error al consultar las actividades del alumno:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron consultar tus actividades.",
    });
  }
};

/*
 * GET
 * /api/academico/actividades/mis-actividades-docente
 *
 * Devuelve todas las actividades creadas por el
 * docente autenticado junto con el avance de sus
 * estudiantes y las entregas pendientes de calificar.
 */
const obtenerMisActividadesDocente = async (
  req,
  res
) => {
  try {
    const idDocente = obtenerIdDocente(req);

    if (!esIdValido(idDocente)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al docente autenticado.",
      });
    }

    const [actividades] = await pool.query(
      `
        SELECT
          a.id_actividad,
          a.id_curso,
          a.id_periodo,
          a.titulo,
          a.descripcion,
          a.tipo,
          a.fecha_publicacion,
          a.fecha_limite,
          a.puntaje_maximo,
          a.permite_entrega_archivo,
          a.estado AS estado_actividad,

          c.nombre AS nombre_curso,
          m.nombre AS materia,

          CONCAT_WS(
            ' - ',
            g.grado,
            g.nombre
          ) AS grupo,

          pe.nombre AS periodo,

          (
            SELECT COUNT(*)
            FROM actividad_estudiantes AS ae
            WHERE
              ae.id_actividad = a.id_actividad
          ) AS alumnos_asignados,

          (
            SELECT COUNT(*)
            FROM actividad_estudiantes AS ae
            WHERE
              ae.id_actividad = a.id_actividad
              AND EXISTS (
                SELECT 1
                FROM entregas AS e
                WHERE
                  e.id_actividad_estudiante =
                    ae.id_actividad_estudiante
              )
          ) AS alumnos_entregados,

          (
            SELECT COUNT(*)
            FROM actividad_estudiantes AS ae
            WHERE
              ae.id_actividad = a.id_actividad
              AND NOT EXISTS (
                SELECT 1
                FROM entregas AS e
                WHERE
                  e.id_actividad_estudiante =
                    ae.id_actividad_estudiante
              )
          ) AS alumnos_pendientes,

          (
            SELECT COUNT(*)
            FROM actividad_estudiantes AS ae
            WHERE
              ae.id_actividad = a.id_actividad
              AND EXISTS (
                SELECT 1
                FROM entregas AS e
                WHERE
                  e.id_entrega = (
                    SELECT MAX(e2.id_entrega)
                    FROM entregas AS e2
                    WHERE
                      e2.id_actividad_estudiante =
                        ae.id_actividad_estudiante
                  )
                  AND e.calificacion IS NOT NULL
              )
          ) AS alumnos_calificados,

          (
            SELECT COUNT(*)
            FROM actividad_estudiantes AS ae
            WHERE
              ae.id_actividad = a.id_actividad
              AND EXISTS (
                SELECT 1
                FROM entregas AS e
                WHERE
                  e.id_entrega = (
                    SELECT MAX(e2.id_entrega)
                    FROM entregas AS e2
                    WHERE
                      e2.id_actividad_estudiante =
                        ae.id_actividad_estudiante
                  )
                  AND e.calificacion IS NULL
              )
          ) AS alumnos_por_calificar

        FROM actividades AS a

        INNER JOIN cursos AS c
          ON c.id_curso = a.id_curso

        INNER JOIN materias AS m
          ON m.id_materia = c.id_materia

        INNER JOIN grupos AS g
          ON g.id_grupo = c.id_grupo

        LEFT JOIN periodos_evaluacion AS pe
          ON pe.id_periodo = a.id_periodo

        WHERE a.id_docente = ?

        ORDER BY
          CASE a.estado
            WHEN 'Publicada' THEN 0
            WHEN 'Borrador' THEN 1
            WHEN 'Cerrada' THEN 2
            ELSE 3
          END,
          a.fecha_publicacion DESC,
          a.id_actividad DESC
      `,
      [idDocente]
    );

    const resumen = actividades.reduce(
      (acumulado, actividad) => {
        acumulado.total += 1;

        switch (actividad.estado_actividad) {
          case "Publicada":
            acumulado.publicadas += 1;
            break;
          case "Borrador":
            acumulado.borradores += 1;
            break;
          case "Cerrada":
            acumulado.cerradas += 1;
            break;
          case "Archivada":
            acumulado.archivadas += 1;
            break;
          default:
            break;
        }

        acumulado.por_calificar += Number(
          actividad.alumnos_por_calificar ?? 0
        );

        return acumulado;
      },
      {
        total: 0,
        publicadas: 0,
        borradores: 0,
        cerradas: 0,
        archivadas: 0,
        por_calificar: 0,
      }
    );

    return res.status(200).json({
      actividades,
      resumen,
    });
  } catch (error) {
    console.error(
      "Error al consultar las actividades del docente:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron consultar las actividades del docente.",
    });
  }
};

/*
 * GET /api/academico/actividades/:id
 *
 * El alumno solamente puede consultar actividades
 * que le fueron asignadas. El docente solamente
 * puede consultar actividades creadas por él.
 */
const obtenerDetalleActividad = async (
  req,
  res
) => {
  try {
    const idActividad = Number(
      req.params.id
    );

    const idUsuario = Number(
      req.usuario?.id_usuario ??
      req.usuario?.id ??
      req.usuario?.usuarioId ??
      0
    );

    const rol =
      obtenerRolUsuario(req);

    if (!esIdValido(idActividad)) {
      return res.status(400).json({
        mensaje:
          "La actividad indicada no es válida.",
      });
    }

    if (!esIdValido(idUsuario)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al usuario autenticado.",
      });
    }

    if (
      rol !== "alumno" &&
      rol !== "docente"
    ) {
      return res.status(403).json({
        mensaje:
          "Tu rol no tiene permiso para consultar esta actividad.",
      });
    }

    if (rol === "alumno") {
      /*
       * Al abrir la actividad se registra el acceso
       * y Pendiente cambia a En_proceso.
       */
      await pool.query(
        `
          UPDATE actividad_estudiantes AS ae

          INNER JOIN actividades AS a
            ON a.id_actividad = ae.id_actividad

          SET
            ae.ultimo_acceso = NOW(),
            ae.fecha_inicio =
              COALESCE(
                ae.fecha_inicio,
                NOW()
              ),
            ae.estado =
              CASE
                WHEN ae.estado = 'Pendiente'
                  THEN 'En_proceso'
                ELSE ae.estado
              END

          WHERE ae.id_actividad = ?
            AND ae.id_alumno = ?
            AND a.estado IN (
              'Publicada',
              'Cerrada'
            )
        `,
        [
          idActividad,
          idUsuario,
        ]
      );

      const [actividades] =
        await pool.query(
          `
            SELECT
              a.id_actividad,
              a.id_curso,
              a.id_periodo,
              a.id_docente,
              a.titulo,
              a.descripcion,
              a.instrucciones,
              a.tipo,
              a.configuracion_evaluacion,
              a.fecha_publicacion,
              a.fecha_limite,
              a.puntaje_maximo,
              a.permite_entrega_archivo,
              a.estado AS estado_actividad,

              ae.id_actividad_estudiante,
              ae.estado AS estado_alumno,
              ae.fecha_inicio,
              ae.fecha_finalizacion,
              ae.ultimo_acceso,
              ae.porcentaje_avance,

              c.nombre AS nombre_curso,
              m.nombre AS materia,

              CONCAT_WS(
                ' - ',
                g.grado,
                g.nombre
              ) AS grupo,

              pe.nombre AS periodo,

              e.id_entrega,
              e.texto_entrega,
              e.fecha_entrega,
              e.estado AS estado_entrega,
              e.calificacion,
              e.retroalimentacion,

              ad.id_adjunto,
              ad.nombre_archivo,
              ad.tipo_archivo,
              ad.url_archivo,
              ad.tamano_bytes,

              CASE
                WHEN a.fecha_limite < NOW()
                  AND ae.estado NOT IN (
                    'Completada',
                    'Calificada'
                  )
                THEN 1
                ELSE 0
              END AS vencida

            FROM actividad_estudiantes AS ae

            INNER JOIN actividades AS a
              ON a.id_actividad = ae.id_actividad

            INNER JOIN cursos AS c
              ON c.id_curso = a.id_curso

            INNER JOIN materias AS m
              ON m.id_materia = c.id_materia

            INNER JOIN grupos AS g
              ON g.id_grupo = c.id_grupo

            LEFT JOIN periodos_evaluacion AS pe
              ON pe.id_periodo = a.id_periodo

            LEFT JOIN entregas AS e
              ON e.id_entrega = (
                SELECT MAX(e2.id_entrega)
                FROM entregas AS e2
                WHERE
                  e2.id_actividad_estudiante =
                    ae.id_actividad_estudiante
              )

            LEFT JOIN adjuntos AS ad
              ON ad.id_adjunto = (
                SELECT MAX(ad2.id_adjunto)
                FROM adjuntos AS ad2
                WHERE ad2.entidad_tipo = 'Entrega'
                  AND ad2.entidad_id = e.id_entrega
              )

            WHERE a.id_actividad = ?
              AND ae.id_alumno = ?
              AND a.estado IN (
                'Publicada',
                'Cerrada'
              )

            LIMIT 1
          `,
          [
            idActividad,
            idUsuario,
          ]
        );

      if (actividades.length === 0) {
        return res.status(404).json({
          mensaje:
            "La actividad no existe o no está asignada a este alumno.",
        });
      }

      return res.status(200).json({
        vista: "Alumno",
        actividad: actividades[0],
      });
    }

    const [actividades] =
      await pool.query(
        `
          SELECT
            a.id_actividad,
            a.id_curso,
            a.id_periodo,
            a.id_docente,
            a.titulo,
            a.descripcion,
            a.instrucciones,
            a.tipo,
            a.configuracion_evaluacion,
            a.fecha_publicacion,
            a.fecha_limite,
            a.puntaje_maximo,
            a.permite_entrega_archivo,
            a.estado AS estado_actividad,

            c.nombre AS nombre_curso,
            m.nombre AS materia,

            CONCAT_WS(
              ' - ',
              g.grado,
              g.nombre
            ) AS grupo,

            pe.nombre AS periodo,

            (
              SELECT COUNT(*)
              FROM actividad_estudiantes AS ae
              WHERE
                ae.id_actividad =
                  a.id_actividad
            ) AS alumnos_asignados,

            (
              SELECT COUNT(*)
              FROM actividad_estudiantes AS ae
              WHERE
                ae.id_actividad =
                  a.id_actividad
                AND ae.estado IN (
                  'Completada',
                  'Calificada'
                )
            ) AS alumnos_finalizados,

            (
              SELECT COUNT(*)
              FROM actividad_estudiantes AS ae
              WHERE
                ae.id_actividad =
                  a.id_actividad
                AND EXISTS (
                  SELECT 1
                  FROM entregas AS e
                  WHERE
                    e.id_actividad_estudiante =
                      ae.id_actividad_estudiante
                )
            ) AS alumnos_entregados,

            (
              SELECT COUNT(*)
              FROM actividad_estudiantes AS ae
              WHERE
                ae.id_actividad =
                  a.id_actividad
                AND ae.estado IN (
                  'Pendiente',
                  'En_proceso',
                  'Atrasada'
                )
            ) AS alumnos_pendientes

          FROM actividades AS a

          INNER JOIN cursos AS c
            ON c.id_curso = a.id_curso

          INNER JOIN materias AS m
            ON m.id_materia = c.id_materia

          INNER JOIN grupos AS g
            ON g.id_grupo = c.id_grupo

          LEFT JOIN periodos_evaluacion AS pe
            ON pe.id_periodo = a.id_periodo

          WHERE a.id_actividad = ?
            AND a.id_docente = ?

          LIMIT 1
        `,
        [
          idActividad,
          idUsuario,
        ]
      );

    if (actividades.length === 0) {
      return res.status(404).json({
        mensaje:
          "La actividad no existe o no pertenece a este docente.",
      });
    }

    return res.status(200).json({
      vista: "Docente",
      actividad: actividades[0],
    });
  } catch (error) {
    console.error(
      "Error al consultar el detalle de la actividad:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo consultar el detalle de la actividad.",
    });
  }
};

module.exports = {
  obtenerCatalogosActividad,
  crearActividad,
  obtenerMisActividadesAlumno,
  obtenerMisActividadesDocente,
  obtenerDetalleActividad,
};