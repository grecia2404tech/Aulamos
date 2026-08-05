const pool = require("../config/database");

const TIPOS_PREGUNTA = new Set([
  "OpcionMultiple",
  "VerdaderoFalso",
  "RespuestaCorta",
]);

const ESTADOS_ENTREGA_CONTABILIZABLES = [
  "Entregada",
  "Calificada",
  "Devuelta",
];

/*
 * Obtiene el ID guardado por el middleware de autenticación.
 */
const obtenerIdUsuario = (req) =>
  Number(
    req.usuario?.id_usuario ??
      req.usuario?.id ??
      req.usuario?.usuarioId ??
      req.user?.id_usuario ??
      req.user?.id ??
      0,
  );

const esIdValido = (valor) => {
  const numero = Number(valor);

  return Number.isInteger(numero) && numero > 0;
};

const convertirBooleano = (
  valor,
  predeterminado = false,
) => {
  if (valor === undefined || valor === null) {
    return predeterminado;
  }

  return [true, 1, "1", "true"].includes(valor);
};

const convertirEntero = (
  valor,
  predeterminado,
) => {
  const numero = Number(valor ?? predeterminado);

  return Number.isInteger(numero)
    ? numero
    : Number.NaN;
};

const fechaMySQLValida = (fecha) => {
  if (
    typeof fecha !== "string" ||
    !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
      fecha,
    )
  ) {
    return false;
  }

  return !Number.isNaN(
    new Date(fecha.replace(" ", "T")).getTime(),
  );
};

const obtenerTiempoFecha = (fecha) => {
  if (fecha instanceof Date) {
    return fecha.getTime();
  }

  if (typeof fecha !== "string") {
    return Number.NaN;
  }

  return new Date(
    fecha.includes("T")
      ? fecha
      : fecha.replace(" ", "T"),
  ).getTime();
};

/*
 * MySQL puede regresar el campo JSON como objeto
 * o como texto. Esta función acepta ambos casos.
 */
const normalizarConfiguracion = (
  configuracion,
) => {
  if (!configuracion) {
    return {};
  }

  if (typeof configuracion === "object") {
    return configuracion;
  }

  try {
    return JSON.parse(configuracion);
  } catch {
    return {};
  }
};

/*
 * Prepara y valida las preguntas antes de
 * guardarlas en configuracion_evaluacion.
 */
const prepararPreguntas = (
  preguntasRecibidas,
) => {
  if (
    !Array.isArray(preguntasRecibidas) ||
    preguntasRecibidas.length === 0
  ) {
    throw new Error(
      "Agrega por lo menos una pregunta a la evaluación.",
    );
  }

  if (preguntasRecibidas.length > 100) {
    throw new Error(
      "La evaluación no puede tener más de 100 preguntas.",
    );
  }

  let siguienteIdOpcion = 1;

  return preguntasRecibidas.map(
    (pregunta, indice) => {
      const texto = String(
        pregunta?.texto ?? "",
      ).trim();

      const tipo = String(
        pregunta?.tipo ?? "",
      ).trim();

      const puntaje = Number(
        pregunta?.puntaje,
      );

      const obligatoria = convertirBooleano(
        pregunta?.obligatoria,
        true,
      );

      if (!texto) {
        throw new Error(
          `Escribe el enunciado de la pregunta ${
            indice + 1
          }.`,
        );
      }

      if (texto.length > 2000) {
        throw new Error(
          `La pregunta ${
            indice + 1
          } no puede superar los 2000 caracteres.`,
        );
      }

      if (!TIPOS_PREGUNTA.has(tipo)) {
        throw new Error(
          `El tipo de la pregunta ${
            indice + 1
          } no es válido.`,
        );
      }

      if (
        !Number.isFinite(puntaje) ||
        puntaje <= 0 ||
        puntaje > 999.99
      ) {
        throw new Error(
          `El puntaje de la pregunta ${
            indice + 1
          } debe ser mayor que cero.`,
        );
      }

      let opciones = [];

      if (tipo !== "RespuestaCorta") {
        if (!Array.isArray(pregunta.opciones)) {
          throw new Error(
            `Agrega las opciones de la pregunta ${
              indice + 1
            }.`,
          );
        }

        opciones = pregunta.opciones.map(
          (opcion, indiceOpcion) => ({
            id_opcion: siguienteIdOpcion++,
            id_pregunta: indice + 1,
            texto: String(
              opcion?.texto ?? "",
            ).trim(),
            es_correcta: convertirBooleano(
              opcion?.es_correcta,
              false,
            ),
            orden: indiceOpcion + 1,
          }),
        );

        if (
          opciones.length < 2 ||
          opciones.some(
            (opcion) => !opcion.texto,
          )
        ) {
          throw new Error(
            `La pregunta ${
              indice + 1
            } necesita al menos dos opciones completas.`,
          );
        }

        const respuestasCorrectas =
          opciones.filter(
            (opcion) => opcion.es_correcta,
          );

        if (respuestasCorrectas.length !== 1) {
          throw new Error(
            `Marca una sola respuesta correcta en la pregunta ${
              indice + 1
            }.`,
          );
        }

        if (
          tipo === "VerdaderoFalso" &&
          opciones.length !== 2
        ) {
          throw new Error(
            `La pregunta ${
              indice + 1
            } debe tener únicamente Verdadero y Falso.`,
          );
        }
      }

      return {
        id_pregunta: indice + 1,
        texto,
        tipo,
        puntaje: Number(
          puntaje.toFixed(2),
        ),
        obligatoria,
        orden: indice + 1,
        opciones,
      };
    },
  );
};

/*
 * Obtiene las preguntas guardadas dentro del JSON.
 */
const obtenerPreguntasConfiguracion = (
  configuracion,
) => {
  const preguntas = Array.isArray(
    configuracion?.preguntas,
  )
    ? configuracion.preguntas
    : [];

  let siguienteIdOpcion = 1;

  return preguntas.map(
    (pregunta, indicePregunta) => {
      const idPregunta = esIdValido(
        pregunta?.id_pregunta,
      )
        ? Number(pregunta.id_pregunta)
        : indicePregunta + 1;

      const opcionesRecibidas = Array.isArray(
        pregunta?.opciones,
      )
        ? pregunta.opciones
        : [];

      const opciones = opcionesRecibidas.map(
        (opcion, indiceOpcion) => {
          const idOpcion = esIdValido(
            opcion?.id_opcion,
          )
            ? Number(opcion.id_opcion)
            : siguienteIdOpcion;

          siguienteIdOpcion = Math.max(
            siguienteIdOpcion + 1,
            idOpcion + 1,
          );

          return {
            id_opcion: idOpcion,
            id_pregunta: idPregunta,
            texto: String(
              opcion?.texto ?? "",
            ).trim(),
            es_correcta: convertirBooleano(
              opcion?.es_correcta,
              false,
            ),
            orden: convertirEntero(
              opcion?.orden,
              indiceOpcion + 1,
            ),
          };
        },
      );

      return {
        id_pregunta: idPregunta,
        texto: String(
          pregunta?.texto ?? "",
        ).trim(),
        tipo: String(
          pregunta?.tipo ?? "",
        ),
        puntaje: Number(
          pregunta?.puntaje ?? 0,
        ),
        obligatoria: convertirBooleano(
          pregunta?.obligatoria,
          true,
        ),
        orden: convertirEntero(
          pregunta?.orden,
          indicePregunta + 1,
        ),
        opciones,
      };
    },
  );
};

/*
 * Elimina es_correcta antes de enviar las
 * preguntas al alumno.
 */
const ocultarRespuestasCorrectas = (
  preguntas,
) =>
  preguntas.map((pregunta) => ({
    id_pregunta: pregunta.id_pregunta,
    texto: pregunta.texto,
    tipo: pregunta.tipo,
    puntaje: pregunta.puntaje,
    obligatoria: pregunta.obligatoria,
    orden: pregunta.orden,

    opciones: pregunta.opciones.map(
      (opcion) => ({
        id_opcion: opcion.id_opcion,
        id_pregunta:
          pregunta.id_pregunta,
        texto: opcion.texto,
        orden: opcion.orden,
      }),
    ),
  }));

const obtenerConfiguracionPublica = (
  configuracion,
) => ({
  modalidad:
    configuracion?.modalidad ??
    "Cuestionario",

  duracion_minutos: Number(
    configuracion?.duracion_minutos ?? 60,
  ),

  intentos_permitidos: Number(
    configuracion?.intentos_permitidos ?? 1,
  ),

  mostrar_resultado: convertirBooleano(
    configuracion?.mostrar_resultado,
    true,
  ),

  total_preguntas: Number(
    configuracion?.total_preguntas ??
      (Array.isArray(
        configuracion?.preguntas,
      )
        ? configuracion.preguntas.length
        : 0),
  ),
});

/*
 * GET /api/evaluaciones/catalogos
 *
 * Esta ruta no consulta una tabla llamada
 * catalogos. Obtiene los cursos y periodos
 * que necesita la pantalla.
 */
const obtenerCatalogosEvaluacion = async (
  req,
  res,
) => {
  try {
    const idDocente = obtenerIdUsuario(req);

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
          c.nombre AS nombre_curso,
          m.nombre AS materia,
          g.nombre AS grupo,
          g.grado,
          COUNT(
            DISTINCT i.id_alumno
          ) AS alumnos_inscritos
        FROM cursos AS c
        INNER JOIN materias AS m
          ON m.id_materia = c.id_materia
        INNER JOIN grupos AS g
          ON g.id_grupo = c.id_grupo
        LEFT JOIN inscripciones AS i
          ON i.id_curso = c.id_curso
         AND i.estado = 'Activo'
        WHERE c.id_docente = ?
          AND c.estado = 'Activo'
        GROUP BY
          c.id_curso,
          c.id_ciclo,
          c.nombre,
          m.nombre,
          g.nombre,
          g.grado
        ORDER BY
          m.nombre,
          g.grado,
          g.nombre,
          c.nombre
      `,
      [idDocente],
    );

    const [periodos] = await pool.query(
      `
        SELECT
          id_periodo,
          id_ciclo,
          nombre AS nombre_periodo,
          fecha_inicio,
          fecha_fin
        FROM periodos_evaluacion
        WHERE estado = 'Activo'
        ORDER BY fecha_inicio, nombre
      `,
    );

    return res.status(200).json({
      cursos,
      periodos,
    });
  } catch (error) {
    console.error(
      "Error al obtener datos para crear la evaluación:",
      error,
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron cargar los cursos y periodos.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

/*
 * POST /api/evaluaciones
 *
 * Guarda la evaluación y las preguntas
 * en la tabla actividades.
 */
const crearEvaluacion = async (
  req,
  res,
) => {
  let conexion;

  try {
    const idDocente =
      obtenerIdUsuario(req);

    const idCurso = Number(
      req.body.id_curso,
    );

    const idPeriodo =
      req.body.id_periodo === null ||
      req.body.id_periodo === undefined ||
      req.body.id_periodo === ""
        ? null
        : Number(req.body.id_periodo);

    const titulo = String(
      req.body.titulo ?? "",
    ).trim();

    const descripcion = String(
      req.body.descripcion ?? "",
    ).trim();

    const instrucciones = String(
      req.body.instrucciones ?? "",
    ).trim();

    const fechaLimite =
      req.body.fecha_limite;

    const duracionMinutos =
      convertirEntero(
        req.body.duracion_minutos,
        60,
      );

    const intentosPermitidos =
      convertirEntero(
        req.body.intentos_permitidos,
        1,
      );

    const mostrarResultado =
      convertirBooleano(
        req.body.mostrar_resultado,
        true,
      );

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

    if (
      !titulo ||
      titulo.length > 150
    ) {
      return res.status(400).json({
        mensaje: titulo
          ? "El título no puede superar los 150 caracteres."
          : "Escribe el título de la evaluación.",
      });
    }

    if (!fechaMySQLValida(fechaLimite)) {
      return res.status(400).json({
        mensaje:
          "La fecha límite no tiene un formato válido.",
      });
    }

    if (
      obtenerTiempoFecha(fechaLimite) <=
      Date.now()
    ) {
      return res.status(400).json({
        mensaje:
          "La fecha límite debe ser posterior a la fecha actual.",
      });
    }

    if (
      Number.isNaN(duracionMinutos) ||
      duracionMinutos < 1 ||
      duracionMinutos > 600
    ) {
      return res.status(400).json({
        mensaje:
          "La duración debe estar entre 1 y 600 minutos.",
      });
    }

    if (
      Number.isNaN(intentosPermitidos) ||
      intentosPermitidos < 1 ||
      intentosPermitidos > 10
    ) {
      return res.status(400).json({
        mensaje:
          "Los intentos deben estar entre 1 y 10.",
      });
    }

    const preguntas = prepararPreguntas(
      req.body.preguntas,
    );

    const puntajeMaximo =
      preguntas.reduce(
        (total, pregunta) =>
          total + pregunta.puntaje,
        0,
      );

    if (puntajeMaximo > 999.99) {
      return res.status(400).json({
        mensaje:
          "La suma de puntos no puede superar 999.99.",
      });
    }

    /*
     * Verifica que el curso pertenezca
     * al docente autenticado.
     */
    const [cursos] = await pool.query(
      `
        SELECT
          id_curso,
          id_ciclo,
          nombre
        FROM cursos
        WHERE id_curso = ?
          AND id_docente = ?
          AND estado = 'Activo'
        LIMIT 1
      `,
      [idCurso, idDocente],
    );

    if (cursos.length === 0) {
      return res.status(403).json({
        mensaje:
          "El curso no existe, está inactivo o no está asignado a este docente.",
      });
    }

    if (idPeriodo !== null) {
      const [periodos] =
        await pool.query(
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
          ],
        );

      if (periodos.length === 0) {
        return res.status(400).json({
          mensaje:
            "El periodo seleccionado no pertenece al ciclo escolar del curso.",
        });
      }
    }

    /*
     * Las preguntas se convierten a JSON
     * y se guardan en actividades.
     */
    const configuracionEvaluacion =
      JSON.stringify({
        version: 1,
        modalidad: "Cuestionario",
        duracion_minutos:
          duracionMinutos,
        intentos_permitidos:
          intentosPermitidos,
        mostrar_resultado:
          mostrarResultado,
        total_preguntas:
          preguntas.length,
        preguntas,
      });

    conexion =
      await pool.getConnection();

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
            'Evaluacion',
            ?,
            ?,
            ?,
            0,
            'Publicada'
          )
        `,
        [
          idCurso,
          idPeriodo,
          idDocente,
          titulo,
          descripcion || null,
          instrucciones || null,
          configuracionEvaluacion,
          fechaLimite,
          Number(
            puntajeMaximo.toFixed(2),
          ),
        ],
      );

    const idEvaluacion =
      resultado.insertId;

    /*
     * Asigna la evaluación a todos
     * los alumnos inscritos.
     */
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
          INNER JOIN usuarios AS alumno
            ON alumno.id_usuario =
               i.id_alumno
          WHERE i.id_curso = ?
            AND i.estado = 'Activo'
            AND alumno.estado = 'Activo'
        `,
        [idEvaluacion, idCurso],
      );

    /*
     * Crea una notificación para
     * cada alumno inscrito.
     */
    await conexion.query(
      `
        INSERT INTO notificaciones (
          id_usuario,
          titulo,
          mensaje,
          tipo,
          entidad_tipo,
          entidad_id,
          leida
        )
        SELECT
          i.id_alumno,
          'Nueva evaluación',
          CONCAT(?, ' · ', ?),
          'Evaluacion',
          'Actividad',
          ?,
          FALSE
        FROM inscripciones AS i
        INNER JOIN usuarios AS alumno
          ON alumno.id_usuario =
             i.id_alumno
        WHERE i.id_curso = ?
          AND i.estado = 'Activo'
          AND alumno.estado = 'Activo'
      `,
      [
        titulo,
        cursos[0].nombre,
        idEvaluacion,
        idCurso,
      ],
    );

    await conexion.commit();

    return res.status(201).json({
      mensaje:
        "La evaluación se publicó correctamente.",

      id_evaluacion: idEvaluacion,

      preguntas_guardadas:
        preguntas.length,

      puntaje_total: Number(
        puntajeMaximo.toFixed(2),
      ),

      alumnos_asignados:
        asignacion.affectedRows,
    });
  } catch (error) {
    if (conexion) {
      await conexion.rollback();
    }

    console.error(
      "Error al crear la evaluación:",
      error,
    );

    const esValidacion =
      error instanceof Error &&
      !error.code;

    return res
      .status(esValidacion ? 400 : 500)
      .json({
        mensaje: esValidacion
          ? error.message
          : "No se pudo crear la evaluación.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

/*
 * GET /api/evaluaciones/alumno
 *
 * Muestra al alumno las evaluaciones
 * que tiene asignadas.
 */
const obtenerEvaluacionesAlumno = async (
  req,
  res,
) => {
  try {
    const idAlumno =
      obtenerIdUsuario(req);

    if (!esIdValido(idAlumno)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al alumno autenticado.",
      });
    }

    const [evaluaciones] =
      await pool.query(
        `
          SELECT
            a.id_actividad
              AS id_evaluacion,

            a.id_curso,
            a.id_periodo,
            a.titulo,
            a.descripcion,
            a.instrucciones,
            a.configuracion_evaluacion,
            a.fecha_publicacion,
            a.fecha_limite,
            a.puntaje_maximo,

            ae.estado
              AS estado_alumno,

            ae.porcentaje_avance,

            c.nombre
              AS nombre_curso,

            m.nombre
              AS materia,

            g.nombre
              AS grupo,

            g.grado,

            pe.nombre
              AS periodo,

            intentos.calificacion,

            COALESCE(
              intentos.intentos_realizados,
              0
            ) AS intentos_realizados,

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
            ON a.id_actividad =
               ae.id_actividad

          INNER JOIN cursos AS c
            ON c.id_curso =
               a.id_curso

          INNER JOIN materias AS m
            ON m.id_materia =
               c.id_materia

          INNER JOIN grupos AS g
            ON g.id_grupo =
               c.id_grupo

          LEFT JOIN periodos_evaluacion AS pe
            ON pe.id_periodo =
               a.id_periodo

          LEFT JOIN (
            SELECT
              ae_intento.id_actividad,
              ae_intento.id_alumno,
              MAX(e.calificacion)
                AS calificacion,
              COUNT(e.id_entrega)
                AS intentos_realizados

            FROM actividad_estudiantes
              AS ae_intento

            INNER JOIN entregas AS e
              ON e.id_actividad_estudiante =
                 ae_intento.id_actividad_estudiante

            WHERE e.estado IN (
              'Entregada',
              'Calificada',
              'Devuelta'
            )

            GROUP BY
              ae_intento.id_actividad,
              ae_intento.id_alumno
          ) AS intentos
            ON intentos.id_actividad =
               a.id_actividad
           AND intentos.id_alumno =
               ae.id_alumno

          WHERE ae.id_alumno = ?
            AND a.tipo = 'Evaluacion'
            AND a.estado IN (
              'Publicada',
              'Cerrada'
            )

          ORDER BY
            CASE
              WHEN ae.estado IN (
                'Completada',
                'Calificada'
              )
              THEN 1
              ELSE 0
            END,

            a.fecha_limite,
            a.fecha_publicacion DESC
        `,
        [idAlumno],
      );

    const normalizadas =
      evaluaciones.map(
        (evaluacion) => {
          const configuracion =
            normalizarConfiguracion(
              evaluacion
                .configuracion_evaluacion,
            );

          return {
            ...evaluacion,

            configuracion_evaluacion:
              obtenerConfiguracionPublica(
                configuracion,
              ),
          };
        },
      );

    const resumen =
      normalizadas.reduce(
        (acumulado, evaluacion) => {
          acumulado.total += 1;

          if (
            [
              "Completada",
              "Calificada",
            ].includes(
              evaluacion.estado_alumno,
            )
          ) {
            acumulado.completadas += 1;
          } else if (
            Number(evaluacion.vencida) === 1
          ) {
            acumulado.vencidas += 1;
          } else {
            acumulado.pendientes += 1;
          }

          return acumulado;
        },
        {
          total: 0,
          pendientes: 0,
          completadas: 0,
          vencidas: 0,
        },
      );

    return res.status(200).json({
      evaluaciones: normalizadas,
      resumen,
    });
  } catch (error) {
    console.error(
      "Error al obtener evaluaciones del alumno:",
      error,
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron consultar tus evaluaciones.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

/*
 * GET /api/evaluaciones/alumno/:id
 *
 * Abre una evaluación sin revelar
 * cuáles opciones son correctas.
 */
const obtenerEvaluacionAlumnoPorId =
  async (req, res) => {
    try {
      const idAlumno =
        obtenerIdUsuario(req);

      const idEvaluacion = Number(
        req.params.id,
      );

      if (
        !esIdValido(idAlumno) ||
        !esIdValido(idEvaluacion)
      ) {
        return res.status(400).json({
          mensaje:
            "La evaluación no es válida.",
        });
      }

      const [evaluaciones] =
        await pool.query(
          `
            SELECT
              a.id_actividad
                AS id_evaluacion,

              a.titulo,
              a.descripcion,
              a.instrucciones,
              a.fecha_limite,
              a.puntaje_maximo,
              a.configuracion_evaluacion,

              a.estado
                AS estado_evaluacion,

              ae.id_actividad_estudiante,

              ae.estado
                AS estado_alumno,

              c.nombre AS curso,
              m.nombre AS materia,
              g.nombre AS grupo,
              g.grado

            FROM actividad_estudiantes AS ae

            INNER JOIN actividades AS a
              ON a.id_actividad =
                 ae.id_actividad

            INNER JOIN cursos AS c
              ON c.id_curso =
                 a.id_curso

            INNER JOIN materias AS m
              ON m.id_materia =
                 c.id_materia

            INNER JOIN grupos AS g
              ON g.id_grupo =
                 c.id_grupo

            WHERE ae.id_alumno = ?
              AND a.id_actividad = ?
              AND a.tipo = 'Evaluacion'
              AND a.estado IN (
                'Publicada',
                'Cerrada'
              )

            LIMIT 1
          `,
          [idAlumno, idEvaluacion],
        );

      if (evaluaciones.length === 0) {
        return res.status(404).json({
          mensaje:
            "La evaluación no existe o no está asignada a este alumno.",
        });
      }

      const evaluacion =
        evaluaciones[0];

      const configuracion =
        normalizarConfiguracion(
          evaluacion
            .configuracion_evaluacion,
        );

      const preguntasInternas =
        obtenerPreguntasConfiguracion(
          configuracion,
        );

      const preguntasAlumno =
        ocultarRespuestasCorrectas(
          preguntasInternas,
        );

      const [conteoIntentos] =
        await pool.query(
          `
            SELECT COUNT(*) AS total
            FROM entregas
            WHERE id_actividad_estudiante = ?
              AND estado IN (?, ?, ?)
          `,
          [
            evaluacion
              .id_actividad_estudiante,

            ...ESTADOS_ENTREGA_CONTABILIZABLES,
          ],
        );

      const intentosRealizados =
        Number(
          conteoIntentos[0].total,
        );

      const intentosPermitidos =
        Number(
          configuracion
            .intentos_permitidos ?? 1,
        );

      const vencida =
        obtenerTiempoFecha(
          evaluacion.fecha_limite,
        ) < Date.now();

      const publicada =
        evaluacion.estado_evaluacion ===
        "Publicada";

      delete evaluacion
        .id_actividad_estudiante;

      return res.status(200).json({
        evaluacion: {
          ...evaluacion,

          configuracion_evaluacion:
            obtenerConfiguracionPublica(
              configuracion,
            ),

          preguntas: preguntasAlumno,
        },

        intentos_realizados:
          intentosRealizados,

        intentos_disponibles: Math.max(
          intentosPermitidos -
            intentosRealizados,
          0,
        ),

        puede_responder:
          publicada &&
          !vencida &&
          preguntasAlumno.length > 0 &&
          intentosRealizados <
            intentosPermitidos,

        vencida,
      });
    } catch (error) {
      console.error(
        "Error al abrir la evaluación:",
        error,
      );

      return res.status(500).json({
        mensaje:
          "No se pudo abrir la evaluación.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };

/*
 * POST /api/evaluaciones/alumno/:id/respuestas
 *
 * Guarda las respuestas en
 * entregas.respuestas_evaluacion.
 */
const responderEvaluacion = async (
  req,
  res,
) => {
  let conexion;

  try {
    const idAlumno =
      obtenerIdUsuario(req);

    const idEvaluacion = Number(
      req.params.id,
    );

    const respuestasRecibidas =
      Array.isArray(req.body.respuestas)
        ? req.body.respuestas
        : [];

    if (
      !esIdValido(idAlumno) ||
      !esIdValido(idEvaluacion)
    ) {
      return res.status(400).json({
        mensaje:
          "La evaluación no es válida.",
      });
    }

    conexion =
      await pool.getConnection();

    await conexion.beginTransaction();

    /*
     * Permite cancelar la transacción y
     * responder inmediatamente.
     */
    const responderYCancelar = async (
      estado,
      datos,
    ) => {
      await conexion.rollback();

      return res
        .status(estado)
        .json(datos);
    };

    /*
     * Bloquea temporalmente la evaluación
     * para impedir intentos duplicados.
     */
    const [evaluaciones] =
      await conexion.query(
        `
          SELECT
            a.id_actividad,
            a.fecha_limite,
            a.puntaje_maximo,
            a.configuracion_evaluacion,

            a.estado
              AS estado_evaluacion,

            ae.id_actividad_estudiante

          FROM actividades AS a

          INNER JOIN actividad_estudiantes AS ae
            ON ae.id_actividad =
               a.id_actividad

          WHERE a.id_actividad = ?
            AND ae.id_alumno = ?
            AND a.tipo = 'Evaluacion'
            AND a.estado IN (
              'Publicada',
              'Cerrada'
            )

          LIMIT 1
          FOR UPDATE
        `,
        [idEvaluacion, idAlumno],
      );

    if (evaluaciones.length === 0) {
      return await responderYCancelar(
        404,
        {
          mensaje:
            "La evaluación no existe o no está asignada a este alumno.",
        },
      );
    }

    const evaluacion =
      evaluaciones[0];

    const configuracion =
      normalizarConfiguracion(
        evaluacion
          .configuracion_evaluacion,
      );

    if (
      evaluacion.estado_evaluacion !==
      "Publicada"
    ) {
      return await responderYCancelar(
        409,
        {
          mensaje:
            "Esta evaluación ya no acepta respuestas.",
        },
      );
    }

    if (
      obtenerTiempoFecha(
        evaluacion.fecha_limite,
      ) < Date.now()
    ) {
      return await responderYCancelar(
        409,
        {
          mensaje:
            "La fecha límite de esta evaluación ya terminó.",
        },
      );
    }

    const [intentos] =
      await conexion.query(
        `
          SELECT COUNT(*) AS total
          FROM entregas
          WHERE id_actividad_estudiante = ?
            AND estado IN (?, ?, ?)
        `,
        [
          evaluacion
            .id_actividad_estudiante,

          ...ESTADOS_ENTREGA_CONTABILIZABLES,
        ],
      );

    const intentosRealizados =
      Number(intentos[0].total);

    const intentosPermitidos =
      Number(
        configuracion
          .intentos_permitidos ?? 1,
      );

    if (
      intentosRealizados >=
      intentosPermitidos
    ) {
      return await responderYCancelar(
        409,
        {
          mensaje:
            "Ya utilizaste todos los intentos permitidos.",
        },
      );
    }

    const preguntas =
      obtenerPreguntasConfiguracion(
        configuracion,
      );

    if (preguntas.length === 0) {
      return await responderYCancelar(
        409,
        {
          mensaje:
            "Esta evaluación todavía no tiene preguntas.",
        },
      );
    }

    const respuestasPorPregunta =
      new Map(
        respuestasRecibidas.map(
          (respuesta) => [
            Number(
              respuesta.id_pregunta,
            ),
            respuesta,
          ],
        ),
      );

    let puntajeAutomatico = 0;
    let requiereRevision = false;

    const respuestasPreparadas = [];

    for (const pregunta of preguntas) {
      const respuesta =
        respuestasPorPregunta.get(
          pregunta.id_pregunta,
        );

      const esTexto =
        pregunta.tipo ===
        "RespuestaCorta";

      const respuestaTexto = String(
        respuesta?.respuesta_texto ?? "",
      ).trim();

      const idOpcion = Number(
        respuesta?.id_opcion ?? 0,
      );

      if (
        pregunta.obligatoria &&
        (
          (esTexto &&
            !respuestaTexto) ||
          (!esTexto &&
            !esIdValido(idOpcion))
        )
      ) {
        return await responderYCancelar(
          400,
          {
            mensaje:
              `Responde la pregunta ${pregunta.orden}.`,
          },
        );
      }

      /*
       * Las respuestas cortas necesitan
       * revisión manual del docente.
       */
      if (esTexto) {
        requiereRevision =
          requiereRevision ||
          Boolean(respuestaTexto);

        respuestasPreparadas.push({
          id_pregunta:
            pregunta.id_pregunta,

          tipo: pregunta.tipo,

          id_opcion: null,

          respuesta_texto:
            respuestaTexto || null,

          es_correcta: null,

          puntaje_obtenido: null,
        });

        continue;
      }

      /*
       * Una pregunta no obligatoria puede
       * enviarse sin respuesta.
       */
      if (!esIdValido(idOpcion)) {
        respuestasPreparadas.push({
          id_pregunta:
            pregunta.id_pregunta,

          tipo: pregunta.tipo,

          id_opcion: null,

          respuesta_texto: null,

          es_correcta: null,

          puntaje_obtenido: 0,
        });

        continue;
      }

      const opcion =
        pregunta.opciones.find(
          (fila) =>
            fila.id_opcion === idOpcion,
        );

      if (!opcion) {
        return await responderYCancelar(
          400,
          {
            mensaje:
              `La respuesta de la pregunta ${pregunta.orden} no es válida.`,
          },
        );
      }

      const esCorrecta = Boolean(
        opcion.es_correcta,
      );

      const puntos = esCorrecta
        ? Number(pregunta.puntaje)
        : 0;

      puntajeAutomatico += puntos;

      respuestasPreparadas.push({
        id_pregunta:
          pregunta.id_pregunta,

        tipo: pregunta.tipo,

        id_opcion: idOpcion,

        respuesta_texto: null,

        es_correcta: esCorrecta,

        puntaje_obtenido: puntos,
      });
    }

    const puntajeTotal = Number(
      evaluacion.puntaje_maximo,
    );

    const calificacion =
      requiereRevision
        ? null
        : Number(
            (
              (puntajeAutomatico /
                puntajeTotal) *
              100
            ).toFixed(2),
          );

    const estadoEntrega =
      requiereRevision
        ? "Entregada"
        : "Calificada";

    const estadoAlumno =
      requiereRevision
        ? "Completada"
        : "Calificada";

    const numeroIntento =
      intentosRealizados + 1;

    /*
     * Las respuestas se guardan en el
     * campo JSON de la tabla entregas.
     */
    const respuestasEvaluacion =
      JSON.stringify({
        version: 1,

        numero_intento:
          numeroIntento,

        fecha_envio:
          new Date().toISOString(),

        requiere_revision:
          requiereRevision,

        puntaje_obtenido_automatico:
          Number(
            puntajeAutomatico.toFixed(2),
          ),

        puntaje_total: puntajeTotal,

        respuestas:
          respuestasPreparadas,
      });

    const [resultadoEntrega] =
      await conexion.query(
        `
          INSERT INTO entregas (
            id_actividad_estudiante,
            estado,
            calificacion,
            respuestas_evaluacion
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          evaluacion
            .id_actividad_estudiante,

          estadoEntrega,

          calificacion,

          respuestasEvaluacion,
        ],
      );

    await conexion.query(
      `
        UPDATE actividad_estudiantes
        SET
          estado = ?,

          fecha_inicio =
            COALESCE(
              fecha_inicio,
              NOW()
            ),

          fecha_finalizacion = NOW(),

          ultimo_acceso = NOW(),

          porcentaje_avance = 100

        WHERE id_actividad_estudiante = ?
      `,
      [
        estadoAlumno,

        evaluacion
          .id_actividad_estudiante,
      ],
    );

    await conexion.commit();

    const mostrarResultado =
      convertirBooleano(
        configuracion
          .mostrar_resultado,
        true,
      );

    return res.status(201).json({
      mensaje: requiereRevision
        ? "Tus respuestas se enviaron. El docente revisará las preguntas abiertas."
        : "Tus respuestas se enviaron y calificaron correctamente.",

      id_entrega:
        resultadoEntrega.insertId,

      id_intento:
        resultadoEntrega.insertId,

      numero_intento: numeroIntento,

      requiere_revision:
        requiereRevision,

      resultado:
        mostrarResultado &&
        !requiereRevision
          ? {
              puntaje_obtenido:
                Number(
                  puntajeAutomatico.toFixed(
                    2,
                  ),
                ),

              puntaje_total:
                puntajeTotal,

              calificacion,
            }
          : null,
    });
  } catch (error) {
    if (conexion) {
      await conexion.rollback();
    }

    console.error(
      "Error al responder evaluación:",
      error,
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron enviar las respuestas.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

module.exports = {
  obtenerCatalogosEvaluacion,
  crearEvaluacion,
  obtenerEvaluacionesAlumno,
  obtenerEvaluacionAlumnoPorId,
  responderEvaluacion,
};