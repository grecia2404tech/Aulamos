const fs = require("fs/promises");
const path = require("path");

const pool = require("../config/database");

const TIPOS_VALIDOS = new Set([
  "PDF",
  "Video",
  "Audio",
  "Imagen",
  "Enlace",
  "Presentación",
  "Documento",
]);

const ACCIONES_VALIDAS = new Set([
  "Visualizó",
  "Descargó",
  "Compartió",
  "Completó",
  "Abandonó",
]);

const UTILIDADES_VALIDAS = new Set([
  "Muy útil",
  "Útil",
  "Poco útil",
  "No útil",
]);

const EXTENSIONES_POR_TIPO = {
  PDF: new Set([".pdf"]),
  Video: new Set([".mp4", ".mov", ".m4v", ".webm"]),
  Audio: new Set([".mp3", ".wav", ".m4a"]),
  Imagen: new Set([".png", ".jpg", ".jpeg"]),
  Presentación: new Set([".ppt", ".pptx"]),
  Documento: new Set([".doc", ".docx", ".ppt", ".pptx"]),
};

const obtenerIdUsuario = (req) =>
  Number(
    req.usuario?.id_usuario ??
      req.usuario?.id ??
      req.usuario?.usuarioId ??
      0
  );

const esIdValido = (valor) => {
  const numero = Number(valor);

  return Number.isInteger(numero) && numero > 0;
};

const convertirBooleano = (valor) =>
  [true, 1, "1", "true"].includes(valor)
    ? 1
    : 0;

const eliminarArchivoFisico = async (archivo) => {
  if (!archivo?.path) {
    return;
  }

  try {
    await fs.unlink(archivo.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "No se pudo eliminar el archivo del recurso:",
        error
      );
    }
  }
};

const eliminarArchivosFisicos = async (...archivos) => {
  await Promise.all(
    archivos.filter(Boolean).map(eliminarArchivoFisico)
  );
};

const obtenerArchivosRecurso = (req) => ({
  archivoPrincipal:
    req.files?.archivo?.[0] ?? req.file ?? null,
  archivoSubtitulos:
    req.files?.subtitulos?.[0] ?? null,
});

const construirUrlPublica = (req, ruta) => {
  if (!ruta) {
    return null;
  }

  if (/^https?:\/\//i.test(ruta)) {
    return ruta;
  }

  const rutaNormalizada = ruta.startsWith("/")
    ? ruta
    : `/${ruta}`;

  return `${req.protocol}://${req.get(
    "host"
  )}${rutaNormalizada}`;
};

/*
 * GET /api/academico/recursos/catalogos
 *
 * Devuelve los cursos del docente y sus actividades
 * para decidir dónde se publicará el recurso.
 */
const obtenerCatalogosRecurso = async (req, res) => {
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
          c.id_materia,
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

    const [actividades] = await pool.query(
      `
        SELECT
          a.id_actividad,
          a.id_curso,
          c.id_materia,
          a.titulo,
          a.estado
        FROM actividades AS a
        INNER JOIN cursos AS c
          ON c.id_curso = a.id_curso
        WHERE a.id_docente = ?
          AND a.estado IN (
            'Borrador',
            'Publicada'
          )
        ORDER BY
          a.fecha_publicacion DESC,
          a.id_actividad DESC
      `,
      [idDocente]
    );

    return res.status(200).json({
      cursos,
      actividades,
    });
  } catch (error) {
    console.error(
      "Error al consultar catálogos de recursos:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron consultar los cursos y actividades.",
    });
  }
};

/*
 * POST /api/academico/recursos
 *
 * multipart/form-data:
 * - archivo
 * - id_curso
 * - id_actividad (opcional)
 * - titulo
 * - descripcion
 * - tipo
 * - accesible
 * - subtitulos_disponibles
 */
const crearRecurso = async (req, res) => {
  let conexion;
  const {
    archivoPrincipal,
    archivoSubtitulos,
  } = obtenerArchivosRecurso(req);

  try {
    const idDocente = obtenerIdUsuario(req);
    const idCurso = Number(req.body.id_curso);
    const idActividad =
      req.body.id_actividad === undefined ||
      req.body.id_actividad === null ||
      req.body.id_actividad === ""
        ? null
        : Number(req.body.id_actividad);

    const titulo = String(
      req.body.titulo ?? ""
    ).trim();

    const descripcion = String(
      req.body.descripcion ?? ""
    ).trim();

    const tipo = String(req.body.tipo ?? "").trim();
    const accesible = convertirBooleano(
      req.body.accesible ?? true
    );
    const subtitulosDisponibles =
      tipo === "Video" && archivoSubtitulos ? 1 : 0;
    const recursoAccesible =
      tipo === "Video" ? subtitulosDisponibles : accesible;

    if (!esIdValido(idDocente)) {
      await eliminarArchivosFisicos(archivoPrincipal, archivoSubtitulos);

      return res.status(401).json({
        mensaje:
          "No se pudo identificar al docente autenticado.",
      });
    }

    if (!esIdValido(idCurso)) {
      await eliminarArchivosFisicos(archivoPrincipal, archivoSubtitulos);

      return res.status(400).json({
        mensaje: "Selecciona un curso válido.",
      });
    }

    if (idActividad !== null && !esIdValido(idActividad)) {
      await eliminarArchivosFisicos(archivoPrincipal, archivoSubtitulos);

      return res.status(400).json({
        mensaje: "La actividad seleccionada no es válida.",
      });
    }

    if (!titulo || titulo.length > 150) {
      await eliminarArchivosFisicos(archivoPrincipal, archivoSubtitulos);

      return res.status(400).json({
        mensaje:
          "El título es obligatorio y no puede superar 150 caracteres.",
      });
    }

    if (descripcion.length > 2000) {
      await eliminarArchivosFisicos(archivoPrincipal, archivoSubtitulos);

      return res.status(400).json({
        mensaje:
          "La descripción no puede superar 2000 caracteres.",
      });
    }

    if (!TIPOS_VALIDOS.has(tipo)) {
      await eliminarArchivosFisicos(archivoPrincipal, archivoSubtitulos);

      return res.status(400).json({
        mensaje: "El tipo de recurso no es válido.",
      });
    }

    if (!archivoPrincipal) {
      await eliminarArchivosFisicos(archivoSubtitulos);

      return res.status(400).json({
        mensaje:
          "Selecciona un archivo antes de publicar el recurso.",
      });
    }

    const extensionPrincipal = path
      .extname(archivoPrincipal.originalname)
      .toLowerCase();

    if (
      tipo !== "Enlace" &&
      !EXTENSIONES_POR_TIPO[tipo]?.has(extensionPrincipal)
    ) {
      await eliminarArchivosFisicos(archivoPrincipal, archivoSubtitulos);

      return res.status(400).json({
        mensaje:
          "El archivo seleccionado no corresponde con el tipo de recurso.",
      });
    }

    if (archivoSubtitulos && tipo !== "Video") {
      await eliminarArchivosFisicos(archivoPrincipal, archivoSubtitulos);

      return res.status(400).json({
        mensaje:
          "Los subtítulos solo pueden adjuntarse a un video.",
      });
    }

    const [cursos] = await pool.query(
      `
        SELECT
          id_curso,
          id_materia
        FROM cursos
        WHERE id_curso = ?
          AND id_docente = ?
          AND estado = 'Activo'
        LIMIT 1
      `,
      [idCurso, idDocente]
    );

    if (cursos.length === 0) {
      await eliminarArchivosFisicos(archivoPrincipal, archivoSubtitulos);

      return res.status(403).json({
        mensaje:
          "El curso no existe o no pertenece a este docente.",
      });
    }

    const idMateria = cursos[0].id_materia;

    if (idActividad !== null) {
      const [actividades] = await pool.query(
        `
          SELECT id_actividad
          FROM actividades
          WHERE id_actividad = ?
            AND id_curso = ?
            AND id_docente = ?
            AND estado IN (
              'Borrador',
              'Publicada'
            )
          LIMIT 1
        `,
        [idActividad, idCurso, idDocente]
      );

      if (actividades.length === 0) {
        await eliminarArchivosFisicos(archivoPrincipal, archivoSubtitulos);

        return res.status(403).json({
          mensaje:
            "La actividad no pertenece al curso seleccionado.",
        });
      }
    }

    const rutaArchivo =
      `/uploads/recursos/${archivoPrincipal.filename}`;
    const rutaSubtitulos = archivoSubtitulos
      ? `/uploads/recursos/${archivoSubtitulos.filename}`
      : null;

    conexion = await pool.getConnection();
    await conexion.beginTransaction();

    const [resultadoRecurso] = await conexion.query(
      `
        INSERT INTO recursos_educativos (
          id_actividad,
          id_materia,
          id_docente,
          id_curso,
          titulo,
          descripcion,
          tipo,
          url_recurso,
          url_subtitulos,
          accesible,
          subtitulos_disponibles,
          compartido_tipo,
          estado
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          'Curso', 'Activo'
        )
      `,
      [
        idActividad,
        idMateria,
        idDocente,
        idCurso,
        titulo,
        descripcion || null,
        tipo,
        rutaArchivo,
        rutaSubtitulos,
        recursoAccesible,
        subtitulosDisponibles,
      ]
    );

    await conexion.query(
      `
        INSERT INTO adjuntos (
          entidad_tipo,
          entidad_id,
          nombre_archivo,
          tipo_archivo,
          url_archivo,
          tamano_bytes,
          id_usuario
        )
        VALUES (
          'Recurso', ?, ?, ?, ?, ?, ?
        )
      `,
      [
        resultadoRecurso.insertId,
        archivoPrincipal.originalname.slice(0, 180),
        archivoPrincipal.mimetype || null,
        rutaArchivo,
        archivoPrincipal.size,
        idDocente,
      ]
    );

    if (archivoSubtitulos) {
      await conexion.query(
        `
          INSERT INTO adjuntos (
            entidad_tipo,
            entidad_id,
            nombre_archivo,
            tipo_archivo,
            url_archivo,
            tamano_bytes,
            id_usuario
          )
          VALUES (
            'Recurso', ?, ?, ?, ?, ?, ?
          )
        `,
        [
          resultadoRecurso.insertId,
          archivoSubtitulos.originalname.slice(0, 180),
          archivoSubtitulos.mimetype || null,
          rutaSubtitulos,
          archivoSubtitulos.size,
          idDocente,
        ]
      );
    }

    await conexion.commit();

    return res.status(201).json({
      mensaje: "El recurso se publicó correctamente.",
      recurso: {
        id_recurso: resultadoRecurso.insertId,
        titulo,
        tipo,
        url_recurso: construirUrlPublica(
          req,
          rutaArchivo
        ),
        url_subtitulos: construirUrlPublica(
          req,
          rutaSubtitulos
        ),
      },
    });
  } catch (error) {
    if (conexion) {
      await conexion.rollback();
    }

    await eliminarArchivosFisicos(archivoPrincipal, archivoSubtitulos);

    console.error("Error al crear el recurso:", error);

    return res.status(500).json({
      mensaje: "No se pudo publicar el recurso.",
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

/*
 * GET /api/academico/recursos/mis-recursos-docente
 */
const listarRecursosDocente = async (req, res) => {
  try {
    const idDocente = obtenerIdUsuario(req);

    if (!esIdValido(idDocente)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al docente autenticado.",
      });
    }

    const [recursos] = await pool.query(
      `
        SELECT
          r.id_recurso,
          r.id_actividad,
          r.id_materia,
          r.id_curso,
          r.titulo,
          r.descripcion,
          r.tipo,
          r.url_recurso,
          r.url_subtitulos,
          r.accesible,
          r.subtitulos_disponibles,
          r.compartido_tipo,
          r.estado,
          r.fecha_publicacion,
          m.nombre AS materia,
          c.nombre AS curso,
          CONCAT_WS(
            ' - ',
            g.grado,
            g.nombre
          ) AS grupo,
          a.titulo AS actividad_relacionada,
          (
            SELECT COUNT(*)
            FROM uso_recursos AS ur
            WHERE ur.id_recurso = r.id_recurso
          ) AS total_accesos
        FROM recursos_educativos AS r
        LEFT JOIN materias AS m
          ON m.id_materia = r.id_materia
        LEFT JOIN actividades AS a
          ON a.id_actividad = r.id_actividad
        LEFT JOIN cursos AS c
          ON c.id_curso = r.id_curso
        LEFT JOIN grupos AS g
          ON g.id_grupo = c.id_grupo
        WHERE r.id_docente = ?
        ORDER BY
          r.fecha_publicacion DESC,
          r.id_recurso DESC
      `,
      [idDocente]
    );

    return res.status(200).json({
      recursos: recursos.map((recurso) => ({
        ...recurso,
        url_recurso: construirUrlPublica(
          req,
          recurso.url_recurso
        ),
        url_subtitulos: construirUrlPublica(
          req,
          recurso.url_subtitulos
        ),
      })),
    });
  } catch (error) {
    console.error(
      "Error al listar recursos del docente:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron consultar tus recursos.",
    });
  }
};

/*
 * GET /api/academico/recursos/biblioteca-alumno
 */
const listarBibliotecaAlumno = async (req, res) => {
  try {
    const idAlumno = obtenerIdUsuario(req);

    if (!esIdValido(idAlumno)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al alumno autenticado.",
      });
    }

    const [recursos] = await pool.query(
      `
        SELECT DISTINCT
          r.id_recurso,
          r.id_actividad,
          r.id_materia,
          r.id_curso,
          r.titulo,
          r.descripcion,
          r.tipo,
          r.url_recurso,
          r.url_subtitulos,
          r.accesible,
          r.subtitulos_disponibles,
          r.fecha_publicacion,
          m.nombre AS materia,
          rc.nombre AS curso,
          a.titulo AS actividad,
          CONCAT_WS(
            ' ',
            u.nombre,
            u.apellido_paterno
          ) AS docente
        FROM recursos_educativos AS r
        LEFT JOIN materias AS m
          ON m.id_materia = r.id_materia
        LEFT JOIN actividades AS a
          ON a.id_actividad = r.id_actividad
        LEFT JOIN cursos AS rc
          ON rc.id_curso = r.id_curso
        LEFT JOIN usuarios AS u
          ON u.id_usuario = r.id_docente
        WHERE r.estado = 'Activo'
          AND (
            r.compartido_tipo = 'Publico'
            OR EXISTS (
              SELECT 1
              FROM inscripciones AS i
              INNER JOIN cursos AS c
                ON c.id_curso = i.id_curso
              WHERE i.id_alumno = ?
                AND i.estado = 'Activo'
                AND c.estado = 'Activo'
                AND (
                  (
                    r.id_actividad IS NOT NULL
                    AND EXISTS (
                      SELECT 1
                      FROM actividades AS ar
                      WHERE ar.id_actividad = r.id_actividad
                        AND ar.id_curso = c.id_curso
                    )
                  )
                  OR (
                    r.id_actividad IS NULL
                    AND r.id_curso = c.id_curso
                  )
                )
            )
          )
        ORDER BY
          r.fecha_publicacion DESC,
          r.id_recurso DESC
      `,
      [idAlumno]
    );

    return res.status(200).json({
      recursos: recursos.map((recurso) => ({
        ...recurso,
        url_recurso: construirUrlPublica(
          req,
          recurso.url_recurso
        ),
        url_subtitulos: construirUrlPublica(
          req,
          recurso.url_subtitulos
        ),
      })),
    });
  } catch (error) {
    console.error(
      "Error al consultar la biblioteca del alumno:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo consultar la biblioteca digital.",
    });
  }
};

/*
 * GET /api/academico/recursos/:id/reproductor
 *
 * Devuelve al alumno un video de su biblioteca y la ruta de sus
 * subtítulos. La misma consulta valida que esté inscrito en el curso.
 */
const obtenerRecursoParaReproductor = async (req, res) => {
  try {
    const idAlumno = obtenerIdUsuario(req);
    const idRecurso = Number(req.params.id);

    if (!esIdValido(idAlumno) || !esIdValido(idRecurso)) {
      return res.status(400).json({
        mensaje: "El recurso indicado no es válido.",
      });
    }

    const [recursos] = await pool.query(
      `
        SELECT
          r.id_recurso,
          r.titulo,
          r.descripcion,
          r.tipo,
          r.url_recurso,
          r.url_subtitulos,
          r.subtitulos_disponibles,
          m.nombre AS materia,
          c.nombre AS curso,
          CONCAT_WS(
            ' ',
            u.nombre,
            u.apellido_paterno
          ) AS docente
        FROM recursos_educativos AS r
        LEFT JOIN materias AS m
          ON m.id_materia = r.id_materia
        LEFT JOIN cursos AS c
          ON c.id_curso = r.id_curso
        LEFT JOIN usuarios AS u
          ON u.id_usuario = r.id_docente
        WHERE r.id_recurso = ?
          AND r.tipo = 'Video'
          AND r.estado = 'Activo'
          AND (
            r.compartido_tipo = 'Publico'
            OR EXISTS (
              SELECT 1
              FROM inscripciones AS i
              INNER JOIN cursos AS ci
                ON ci.id_curso = i.id_curso
              WHERE i.id_alumno = ?
                AND i.estado = 'Activo'
                AND ci.estado = 'Activo'
                AND (
                  (
                    r.id_actividad IS NOT NULL
                    AND EXISTS (
                      SELECT 1
                      FROM actividades AS ar
                      WHERE ar.id_actividad = r.id_actividad
                        AND ar.id_curso = ci.id_curso
                    )
                  )
                  OR (
                    r.id_actividad IS NULL
                    AND r.id_curso = ci.id_curso
                  )
                )
            )
          )
        LIMIT 1
      `,
      [idRecurso, idAlumno]
    );

    if (recursos.length === 0) {
      return res.status(404).json({
        mensaje:
          "El video no existe o no está disponible para este alumno.",
      });
    }

    const recurso = recursos[0];

    return res.status(200).json({
      recurso: {
        ...recurso,
        url_recurso: construirUrlPublica(
          req,
          recurso.url_recurso
        ),
        url_subtitulos: construirUrlPublica(
          req,
          recurso.url_subtitulos
        ),
      },
    });
  } catch (error) {
    console.error(
      "Error al consultar el video del alumno:",
      error
    );

    return res.status(500).json({
      mensaje: "No se pudo consultar el video.",
    });
  }
};

/*
 * PATCH /api/academico/recursos/:id/estado
 */
const cambiarEstadoRecurso = async (req, res) => {
  try {
    const idDocente = obtenerIdUsuario(req);
    const idRecurso = Number(req.params.id);
    const estado = String(req.body.estado ?? "").trim();

    if (!esIdValido(idDocente) || !esIdValido(idRecurso)) {
      return res.status(400).json({
        mensaje: "El recurso indicado no es válido.",
      });
    }

    if (!["Activo", "Inactivo", "Archivado"].includes(estado)) {
      return res.status(400).json({
        mensaje: "El estado indicado no es válido.",
      });
    }

    const [resultado] = await pool.query(
      `
        UPDATE recursos_educativos
        SET estado = ?
        WHERE id_recurso = ?
          AND id_docente = ?
      `,
      [estado, idRecurso, idDocente]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje:
          "El recurso no existe o no pertenece a este docente.",
      });
    }

    return res.status(200).json({
      mensaje:
        estado === "Archivado"
          ? "El recurso se archivó correctamente."
          : "El estado del recurso se actualizó correctamente.",
    });
  } catch (error) {
    console.error(
      "Error al cambiar el estado del recurso:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo actualizar el recurso.",
    });
  }
};

/*
 * POST /api/academico/recursos/:id/uso
 */
const registrarUsoRecurso = async (req, res) => {
  try {
    const idAlumno = obtenerIdUsuario(req);
    const idRecurso = Number(req.params.id);

    if (!esIdValido(idAlumno) || !esIdValido(idRecurso)) {
      return res.status(400).json({
        mensaje: "El recurso indicado no es válido.",
      });
    }

    const [recursos] = await pool.query(
      `
        SELECT
          r.id_recurso,
          r.tipo
        FROM recursos_educativos AS r
        WHERE r.id_recurso = ?
          AND r.estado = 'Activo'
          AND (
            r.compartido_tipo = 'Publico'
            OR EXISTS (
              SELECT 1
              FROM inscripciones AS i
              INNER JOIN cursos AS c
                ON c.id_curso = i.id_curso
              WHERE i.id_alumno = ?
                AND i.estado = 'Activo'
                AND c.estado = 'Activo'
                AND (
                  (
                    r.id_actividad IS NOT NULL
                    AND EXISTS (
                      SELECT 1
                      FROM actividades AS ar
                      WHERE ar.id_actividad = r.id_actividad
                        AND ar.id_curso = c.id_curso
                    )
                  )
                  OR (
                    r.id_actividad IS NULL
                    AND r.id_curso = c.id_curso
                  )
                )
            )
          )
        LIMIT 1
      `,
      [idRecurso, idAlumno]
    );

    if (recursos.length === 0) {
      return res.status(404).json({
        mensaje:
          "El recurso no existe o no está disponible para este alumno.",
      });
    }

    const tiempo = Math.max(
      0,
      Math.round(
        Number(req.body.tiempo_visualizacion_seg ?? 0)
      ) || 0
    );

    const porcentaje = Math.min(
      100,
      Math.max(
        0,
        Number(req.body.porcentaje_visualizado ?? 0) || 0
      )
    );

    const accionSolicitada = String(
      req.body.accion_realizada ?? "Visualizó"
    ).trim();

    const accion = ACCIONES_VALIDAS.has(accionSolicitada)
      ? accionSolicitada
      : "Visualizó";

    const utilidadSolicitada = String(
      req.body.utilidad_percibida ?? ""
    ).trim();

    const utilidad = UTILIDADES_VALIDAS.has(utilidadSolicitada)
      ? utilidadSolicitada
      : null;

    await pool.query(
      `
        INSERT INTO uso_recursos (
          id_usuario,
          id_recurso,
          tiempo_visualizacion_seg,
          porcentaje_visualizado,
          formato_recurso,
          utilidad_percibida,
          accion_realizada,
          veces_consultado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [
        idAlumno,
        idRecurso,
        tiempo,
        porcentaje,
        recursos[0].tipo,
        utilidad,
        accion,
      ]
    );

    return res.status(201).json({
      mensaje: "El uso del recurso quedó registrado.",
    });
  } catch (error) {
    console.error(
      "Error al registrar el uso del recurso:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo registrar el uso del recurso.",
    });
  }
};

module.exports = {
  obtenerCatalogosRecurso,
  crearRecurso,
  listarRecursosDocente,
  listarBibliotecaAlumno,
  obtenerRecursoParaReproductor,
  cambiarEstadoRecurso,
  registrarUsoRecurso,
};
