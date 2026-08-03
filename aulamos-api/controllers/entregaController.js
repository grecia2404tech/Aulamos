const fs = require("fs/promises");

const pool = require("../config/database");

const obtenerIdUsuario = (req) =>
  Number(
    req.usuario?.id_usuario ??
      req.usuario?.id ??
      req.usuario?.usuarioId ??
      0
  );

const esIdValido = (valor) => {
  const numero = Number(valor);

  return (
    Number.isInteger(numero) &&
    numero > 0
  );
};

const eliminarArchivoFisico = async (
  archivo
) => {
  if (!archivo?.path) {
    return;
  }

  try {
    await fs.unlink(archivo.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "No se pudo eliminar el archivo temporal:",
        error
      );
    }
  }
};

const construirUrlPublica = (
  req,
  ruta
) => {
  if (!ruta) {
    return null;
  }

  if (/^https?:\/\//i.test(ruta)) {
    return ruta;
  }

  const rutaNormalizada =
    ruta.startsWith("/")
      ? ruta
      : `/${ruta}`;

  return `${req.protocol}://${req.get(
    "host"
  )}${rutaNormalizada}`;
};

/*
 * POST /api/academico/actividades/:id/entrega
 *
 * Recibe multipart/form-data:
 * - archivo: Word, PDF, PNG, JPG o Excel (opcional)
 * - texto_entrega: comentario del alumno (opcional)
 *
 * Debe existir por lo menos uno de los dos campos.
 */
const crearEntregaActividad = async (
  req,
  res
) => {
  let conexion;

  try {
    const idAlumno =
      obtenerIdUsuario(req);

    const idActividad = Number(
      req.params.id
    );

    const textoEntrega = String(
      req.body.texto_entrega ?? ""
    ).trim();

    if (!esIdValido(idAlumno)) {
      await eliminarArchivoFisico(
        req.file
      );

      return res.status(401).json({
        mensaje:
          "No se pudo identificar al alumno autenticado.",
      });
    }

    if (!esIdValido(idActividad)) {
      await eliminarArchivoFisico(
        req.file
      );

      return res.status(400).json({
        mensaje:
          "La actividad indicada no es válida.",
      });
    }

    if (!req.file && !textoEntrega) {
      return res.status(400).json({
        mensaje:
          "Adjunta un archivo o escribe un comentario para realizar la entrega.",
      });
    }

    if (textoEntrega.length > 5000) {
      await eliminarArchivoFisico(
        req.file
      );

      return res.status(400).json({
        mensaje:
          "El comentario no puede superar los 5000 caracteres.",
      });
    }

    const [asignaciones] =
      await pool.query(
        `
          SELECT
            ae.id_actividad_estudiante,
            ae.estado AS estado_alumno,
            a.estado AS estado_actividad,
            a.fecha_limite,
            a.permite_entrega_archivo,
            (
              SELECT e.estado
              FROM entregas AS e
              WHERE
                e.id_actividad_estudiante =
                  ae.id_actividad_estudiante
              ORDER BY e.id_entrega DESC
              LIMIT 1
            ) AS estado_ultima_entrega

          FROM actividad_estudiantes AS ae

          INNER JOIN actividades AS a
            ON a.id_actividad =
              ae.id_actividad

          WHERE ae.id_actividad = ?
            AND ae.id_alumno = ?

          LIMIT 1
        `,
        [idActividad, idAlumno]
      );

    if (asignaciones.length === 0) {
      await eliminarArchivoFisico(
        req.file
      );

      return res.status(404).json({
        mensaje:
          "La actividad no existe o no está asignada a este alumno.",
      });
    }

    const asignacion =
      asignaciones[0];

    if (
      asignacion.estado_actividad !==
      "Publicada"
    ) {
      await eliminarArchivoFisico(
        req.file
      );

      return res.status(409).json({
        mensaje:
          "Esta actividad ya no acepta entregas.",
      });
    }

    if (
      asignacion.estado_ultima_entrega ===
      "Calificada"
    ) {
      await eliminarArchivoFisico(
        req.file
      );

      return res.status(409).json({
        mensaje:
          "La entrega ya fue calificada y no puede reemplazarse.",
      });
    }

    if (
      req.file &&
      Number(
        asignacion.permite_entrega_archivo
      ) !== 1
    ) {
      await eliminarArchivoFisico(
        req.file
      );

      return res.status(400).json({
        mensaje:
          "Esta actividad no permite adjuntar archivos.",
      });
    }

    const fueraDeTiempo =
      new Date(
        asignacion.fecha_limite
      ).getTime() < Date.now();

    conexion =
      await pool.getConnection();

    await conexion.beginTransaction();

    const [resultadoEntrega] =
      await conexion.query(
        `
          INSERT INTO entregas (
            id_actividad_estudiante,
            texto_entrega,
            estado
          )
          VALUES (?, ?, 'Entregada')
        `,
        [
          asignacion.id_actividad_estudiante,
          textoEntrega || null,
        ]
      );

    let archivoRespuesta = null;

    if (req.file) {
      const rutaArchivo =
        `/uploads/entregas/${req.file.filename}`;

      const [resultadoAdjunto] =
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
              'Entrega',
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
            )
          `,
          [
            resultadoEntrega.insertId,
            req.file.originalname.slice(
              0,
              180
            ),
            req.file.mimetype || null,
            rutaArchivo,
            req.file.size,
            idAlumno,
          ]
        );

      archivoRespuesta = {
        id_adjunto:
          resultadoAdjunto.insertId,
        nombre_archivo:
          req.file.originalname,
        tipo_archivo:
          req.file.mimetype,
        tamano_bytes: req.file.size,
        url_archivo:
          construirUrlPublica(
            req,
            rutaArchivo
          ),
      };
    }

    await conexion.query(
      `
        UPDATE actividad_estudiantes
        SET
          estado = 'Completada',
          fecha_inicio =
            COALESCE(
              fecha_inicio,
              NOW()
            ),
          fecha_finalizacion = NOW(),
          ultimo_acceso = NOW(),
          porcentaje_avance = 100
        WHERE
          id_actividad_estudiante = ?
      `,
      [
        asignacion.id_actividad_estudiante,
      ]
    );

    await conexion.commit();

    return res.status(201).json({
      mensaje: fueraDeTiempo
        ? "La actividad se entregó fuera de tiempo."
        : "La actividad se entregó correctamente.",
      id_entrega:
        resultadoEntrega.insertId,
      estado: "Entregada",
      fuera_de_tiempo:
        fueraDeTiempo,
      archivo: archivoRespuesta,
    });
  } catch (error) {
    if (conexion) {
      await conexion.rollback();
    }

    await eliminarArchivoFisico(req.file);

    console.error(
      "Error al registrar la entrega:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo registrar la entrega.",
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

/*
 * GET /api/academico/actividades/:id/entregas
 *
 * Devuelve al docente todos los alumnos asignados,
 * el último intento de cada uno y su archivo.
 */
const listarEntregasActividad = async (
  req,
  res
) => {
  try {
    const idDocente =
      obtenerIdUsuario(req);

    const idActividad = Number(
      req.params.id
    );

    if (!esIdValido(idDocente)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al docente autenticado.",
      });
    }

    if (!esIdValido(idActividad)) {
      return res.status(400).json({
        mensaje:
          "La actividad indicada no es válida.",
      });
    }

    const [actividades] =
      await pool.query(
        `
          SELECT
            a.id_actividad,
            a.titulo,
            a.fecha_limite,
            a.puntaje_maximo,
            c.nombre AS nombre_curso,
            m.nombre AS materia,
            CONCAT_WS(
              ' - ',
              g.grado,
              g.nombre
            ) AS grupo

          FROM actividades AS a

          INNER JOIN cursos AS c
            ON c.id_curso = a.id_curso

          INNER JOIN materias AS m
            ON m.id_materia = c.id_materia

          INNER JOIN grupos AS g
            ON g.id_grupo = c.id_grupo

          WHERE a.id_actividad = ?
            AND a.id_docente = ?

          LIMIT 1
        `,
        [idActividad, idDocente]
      );

    if (actividades.length === 0) {
      return res.status(404).json({
        mensaje:
          "La actividad no existe o no pertenece a este docente.",
      });
    }

    const [filas] = await pool.query(
      `
        SELECT
          ae.id_actividad_estudiante,
          ae.id_alumno,
          ae.estado AS estado_alumno,
          ae.fecha_inicio,
          ae.fecha_finalizacion,
          ae.porcentaje_avance,

          u.nombre,
          u.apellido_paterno,
          u.apellido_materno,
          u.correo,

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
            WHEN e.id_entrega IS NOT NULL
              AND e.fecha_entrega > a.fecha_limite
            THEN 1
            ELSE 0
          END AS fuera_de_tiempo,

          CASE
            WHEN e.id_entrega IS NULL
              AND a.fecha_limite < NOW()
            THEN 1
            ELSE 0
          END AS vencida

        FROM actividad_estudiantes AS ae

        INNER JOIN actividades AS a
          ON a.id_actividad = ae.id_actividad

        INNER JOIN usuarios AS u
          ON u.id_usuario = ae.id_alumno

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
            WHERE
              ad2.entidad_tipo = 'Entrega'
              AND ad2.entidad_id = e.id_entrega
          )

        WHERE ae.id_actividad = ?

        ORDER BY
          e.id_entrega IS NULL ASC,
          u.apellido_paterno,
          u.apellido_materno,
          u.nombre
      `,
      [idActividad]
    );

    const resumen = filas.reduce(
      (acumulado, fila) => {
        acumulado.asignados += 1;

        if (fila.id_entrega) {
          acumulado.entregados += 1;

          if (
            fila.estado_entrega ===
            "Calificada"
          ) {
            acumulado.calificados += 1;
          }
        } else {
          acumulado.pendientes += 1;
        }

        return acumulado;
      },
      {
        asignados: 0,
        entregados: 0,
        pendientes: 0,
        calificados: 0,
      }
    );

    const entregas = filas.map(
      (fila) => ({
        ...fila,
        archivo: fila.id_adjunto
          ? {
              id_adjunto:
                fila.id_adjunto,
              nombre_archivo:
                fila.nombre_archivo,
              tipo_archivo:
                fila.tipo_archivo,
              tamano_bytes:
                fila.tamano_bytes,
              url_archivo:
                construirUrlPublica(
                  req,
                  fila.url_archivo
                ),
            }
          : null,
      })
    );

    return res.status(200).json({
      actividad: actividades[0],
      resumen,
      entregas,
    });
  } catch (error) {
    console.error(
      "Error al consultar las entregas:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron consultar las entregas de la actividad.",
    });
  }
};

/*
 * PATCH /api/academico/entregas/:id/calificar
 *
 * El docente califica la entrega más reciente de un alumno.
 * Recibe JSON:
 * - calificacion: número entre 0 y el puntaje máximo
 * - retroalimentacion: comentario opcional
 */
const calificarEntrega = async (req, res) => {
  try {
    const idDocente = obtenerIdUsuario(req);
    const idEntrega = Number(req.params.id);

    const valorRecibido =
      req.body.calificacion;

    const calificacion = Number(
      typeof valorRecibido === "string"
        ? valorRecibido.replace(",", ".")
        : valorRecibido
    );

    const retroalimentacion = String(
      req.body.retroalimentacion ?? ""
    ).trim();

    if (!esIdValido(idDocente)) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al docente autenticado.",
      });
    }

    if (!esIdValido(idEntrega)) {
      return res.status(400).json({
        mensaje:
          "La entrega indicada no es válida.",
      });
    }

    if (
      valorRecibido === undefined ||
      valorRecibido === null ||
      valorRecibido === "" ||
      !Number.isFinite(calificacion)
    ) {
      return res.status(400).json({
        mensaje:
          "Ingresa una calificación válida.",
      });
    }

    if (calificacion < 0) {
      return res.status(400).json({
        mensaje:
          "La calificación no puede ser menor que cero.",
      });
    }

    if (retroalimentacion.length > 5000) {
      return res.status(400).json({
        mensaje:
          "La retroalimentación no puede superar los 5000 caracteres.",
      });
    }

    const [entregas] = await pool.query(
      `
        SELECT
          e.id_entrega,
          e.estado,
          ae.id_actividad_estudiante,
          ae.id_alumno,
          a.id_actividad,
          a.titulo,
          a.puntaje_maximo,
          CONCAT_WS(
            ' ',
            u.nombre,
            u.apellido_paterno,
            u.apellido_materno
          ) AS nombre_alumno

        FROM entregas AS e

        INNER JOIN actividad_estudiantes AS ae
          ON ae.id_actividad_estudiante =
            e.id_actividad_estudiante

        INNER JOIN actividades AS a
          ON a.id_actividad = ae.id_actividad

        INNER JOIN usuarios AS u
          ON u.id_usuario = ae.id_alumno

        WHERE e.id_entrega = ?
          AND a.id_docente = ?
          AND e.id_entrega = (
            SELECT MAX(e2.id_entrega)
            FROM entregas AS e2
            WHERE e2.id_actividad_estudiante =
              e.id_actividad_estudiante
          )

        LIMIT 1
      `,
      [idEntrega, idDocente]
    );

    if (entregas.length === 0) {
      return res.status(404).json({
        mensaje:
          "La entrega no existe, no es la más reciente o no pertenece a una actividad de este docente.",
      });
    }

    const entrega = entregas[0];
    const puntajeMaximo = Number(
      entrega.puntaje_maximo ?? 100
    );

    if (calificacion > puntajeMaximo) {
      return res.status(400).json({
        mensaje:
          `La calificación no puede superar ${puntajeMaximo} puntos.`,
      });
    }

    if (entrega.estado === "Pendiente") {
      return res.status(409).json({
        mensaje:
          "La actividad todavía no ha sido entregada por el alumno.",
      });
    }

    const calificacionFinal = Number(
      calificacion.toFixed(2)
    );

    await pool.query(
      `
        UPDATE entregas
        SET
          calificacion = ?,
          retroalimentacion = ?,
          estado = 'Calificada',
          calificado_por = ?,
          calificado_en = NOW()
        WHERE id_entrega = ?
      `,
      [
        calificacionFinal,
        retroalimentacion || null,
        idDocente,
        idEntrega,
      ]
    );

    return res.status(200).json({
      mensaje:
        entrega.estado === "Calificada"
          ? "La calificación se actualizó correctamente."
          : "La entrega se calificó correctamente.",
      entrega: {
        id_entrega: idEntrega,
        id_actividad: entrega.id_actividad,
        id_alumno: entrega.id_alumno,
        nombre_alumno: entrega.nombre_alumno,
        calificacion: calificacionFinal,
        puntaje_maximo: puntajeMaximo,
        retroalimentacion:
          retroalimentacion || null,
        estado: "Calificada",
        calificado_por: idDocente,
      },
    });
  } catch (error) {
    console.error(
      "Error al calificar la entrega:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo guardar la calificación.",
    });
  }
};

module.exports = {
  crearEntregaActividad,
  listarEntregasActividad,
  calificarEntrega,
};