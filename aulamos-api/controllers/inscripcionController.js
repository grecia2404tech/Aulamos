const pool = require("../config/database");

const ESTADOS_VALIDOS = [
  "Activo",
  "Inactivo",
  "Finalizado",
];

/*
 * Ejecuta una consulta y devuelve solamente
 * las filas o el resultado de MySQL.
 *
 * No utiliza pool.promise() porque tu conexión
 * ya trabaja con promesas.
 */
const ejecutar = async (sql, parametros = []) => {
  const [resultado] = await pool.query(
    sql,
    parametros
  );

  return resultado;
};

const numeroPositivo = (valor) => {
  const numero = Number(valor);

  if (
    Number.isInteger(numero) &&
    numero > 0
  ) {
    return numero;
  }

  return 0;
};

const estadoValido = (estado) => {
  return ESTADOS_VALIDOS.includes(estado);
};

const responderError = (
  res,
  error,
  mensaje
) => {
  console.error(mensaje, error);

  if (error?.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      mensaje:
        "El estudiante ya está inscrito en ese curso.",
    });
  }

  if (
    error?.code ===
    "ER_NO_REFERENCED_ROW_2"
  ) {
    return res.status(400).json({
      mensaje:
        "El estudiante o el curso seleccionado ya no existe.",
    });
  }

  return res.status(500).json({
    mensaje,
  });
};

/*
 * Comprueba que el usuario tenga el rol
 * Alumno o Estudiante.
 */
const validarAlumno = async (
  idAlumno,
  exigirActivo = false
) => {
  const condicionEstado = exigirActivo
    ? "AND u.estado = 'Activo'"
    : "";

  const alumnos = await ejecutar(
    `
      SELECT DISTINCT
        u.id_usuario
      FROM usuarios AS u
      INNER JOIN usuario_roles AS ur
        ON ur.id_usuario = u.id_usuario
      INNER JOIN roles AS r
        ON r.id_rol = ur.id_rol
      WHERE u.id_usuario = ?
        AND LOWER(r.nombre) IN (
          'alumno',
          'estudiante'
        )
        ${condicionEstado}
      LIMIT 1
    `,
    [idAlumno]
  );

  return alumnos.length > 0;
};

/*
 * Comprueba que el curso exista.
 */
const validarCurso = async (
  idCurso,
  exigirActivo = false
) => {
  const condicionEstado = exigirActivo
    ? "AND estado = 'Activo'"
    : "";

  const cursos = await ejecutar(
    `
      SELECT id_curso
      FROM cursos
      WHERE id_curso = ?
        ${condicionEstado}
      LIMIT 1
    `,
    [idCurso]
  );

  return cursos.length > 0;
};

/*
 * Comprueba que el estudiante no esté
 * inscrito dos veces en el mismo curso.
 */
const existeDuplicado = async (
  idAlumno,
  idCurso,
  idInscripcion = 0
) => {
  const inscripciones = await ejecutar(
    `
      SELECT id_inscripcion
      FROM inscripciones
      WHERE id_alumno = ?
        AND id_curso = ?
        AND (
          ? = 0
          OR id_inscripcion <> ?
        )
      LIMIT 1
    `,
    [
      idAlumno,
      idCurso,
      idInscripcion,
      idInscripcion,
    ]
  );

  return inscripciones.length > 0;
};

/*
 * GET /api/academico/inscripciones
 */
const listarInscripciones = async (
  req,
  res
) => {
  try {
    const inscripciones = await ejecutar(`
      SELECT
        i.id_inscripcion,
        i.id_alumno,
        i.id_curso,
        i.fecha_inscripcion,
        i.estado,

        CONCAT_WS(
          ' ',
          u.nombre,
          u.apellido_paterno,
          u.apellido_materno
        ) AS alumno,

        u.correo AS correo_alumno,
        c.nombre AS curso,
        m.nombre AS materia,

        CONCAT_WS(
          ' - ',
          g.grado,
          g.nombre
        ) AS grupo,

        ce.nombre AS ciclo

      FROM inscripciones AS i

      INNER JOIN usuarios AS u
        ON u.id_usuario = i.id_alumno

      INNER JOIN cursos AS c
        ON c.id_curso = i.id_curso

      INNER JOIN materias AS m
        ON m.id_materia = c.id_materia

      INNER JOIN grupos AS g
        ON g.id_grupo = c.id_grupo

      INNER JOIN ciclos_escolares AS ce
        ON ce.id_ciclo = c.id_ciclo

      ORDER BY
        i.fecha_inscripcion DESC,
        i.id_inscripcion DESC
    `);

    return res.status(200).json({
      inscripciones,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "No se pudieron consultar las inscripciones."
    );
  }
};

/*
 * GET
 * /api/academico/inscripciones/alumnos-disponibles
 */
const listarAlumnosDisponibles = async (
  req,
  res
) => {
  try {
    const alumnos = await ejecutar(`
      SELECT DISTINCT
        u.id_usuario,
        u.nombre,
        u.apellido_paterno,
        u.apellido_materno,
        u.correo,
        u.estado

      FROM usuarios AS u

      INNER JOIN usuario_roles AS ur
        ON ur.id_usuario = u.id_usuario

      INNER JOIN roles AS r
        ON r.id_rol = ur.id_rol

      WHERE LOWER(r.nombre) IN (
        'alumno',
        'estudiante'
      )
        AND u.estado = 'Activo'

      ORDER BY
        u.nombre,
        u.apellido_paterno,
        u.apellido_materno
    `);

    return res.status(200).json({
      alumnos,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "No se pudieron consultar los estudiantes."
    );
  }
};

/*
 * GET
 * /api/academico/inscripciones/cursos-disponibles
 */
const listarCursosDisponibles = async (
  req,
  res
) => {
  try {
    const cursos = await ejecutar(`
      SELECT
        c.id_curso,
        c.nombre,
        c.estado,
        m.nombre AS materia,

        CONCAT_WS(
          ' - ',
          g.grado,
          g.nombre
        ) AS grupo,

        ce.nombre AS ciclo

      FROM cursos AS c

      INNER JOIN materias AS m
        ON m.id_materia = c.id_materia

      INNER JOIN grupos AS g
        ON g.id_grupo = c.id_grupo

      INNER JOIN ciclos_escolares AS ce
        ON ce.id_ciclo = c.id_ciclo

      WHERE c.estado = 'Activo'

      ORDER BY
        ce.nombre DESC,
        c.nombre
    `);

    return res.status(200).json({
      cursos,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "No se pudieron consultar los cursos disponibles."
    );
  }
};

/*
 * POST /api/academico/inscripciones
 */
const crearInscripcion = async (
  req,
  res
) => {
  try {
    const idAlumno = numeroPositivo(
      req.body.id_alumno
    );

    const idCurso = numeroPositivo(
      req.body.id_curso
    );

    const estado =
      req.body.estado || "Activo";

    if (!idAlumno) {
      return res.status(400).json({
        mensaje:
          "Selecciona un estudiante válido.",
      });
    }

    if (!idCurso) {
      return res.status(400).json({
        mensaje:
          "Selecciona un curso válido.",
      });
    }

    if (!estadoValido(estado)) {
      return res.status(400).json({
        mensaje:
          "El estado de la inscripción no es válido.",
      });
    }

    const alumnoValido =
      await validarAlumno(idAlumno, true);

    if (!alumnoValido) {
      return res.status(400).json({
        mensaje:
          "El usuario seleccionado no es un estudiante activo.",
      });
    }

    const cursoValido =
      await validarCurso(idCurso, true);

    if (!cursoValido) {
      return res.status(400).json({
        mensaje:
          "El curso seleccionado no existe o no está activo.",
      });
    }

    const duplicado =
      await existeDuplicado(
        idAlumno,
        idCurso
      );

    if (duplicado) {
      return res.status(409).json({
        mensaje:
          "El estudiante ya está inscrito en ese curso.",
      });
    }

    const resultado = await ejecutar(
      `
        INSERT INTO inscripciones (
          id_alumno,
          id_curso,
          estado
        )
        VALUES (?, ?, ?)
      `,
      [
        idAlumno,
        idCurso,
        estado,
      ]
    );

    return res.status(201).json({
      mensaje:
        "La inscripción se registró correctamente.",
      id_inscripcion: resultado.insertId,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "No se pudo registrar la inscripción."
    );
  }
};

/*
 * PUT /api/academico/inscripciones/:id
 */
const actualizarInscripcion = async (
  req,
  res
) => {
  try {
    const idInscripcion =
      numeroPositivo(req.params.id);

    const idAlumno =
      numeroPositivo(
        req.body.id_alumno
      );

    const idCurso =
      numeroPositivo(
        req.body.id_curso
      );

    const estado = req.body.estado;

    if (!idInscripcion) {
      return res.status(400).json({
        mensaje:
          "La inscripción indicada no es válida.",
      });
    }

    if (!idAlumno || !idCurso) {
      return res.status(400).json({
        mensaje:
          "Selecciona un estudiante y un curso válidos.",
      });
    }

    if (!estadoValido(estado)) {
      return res.status(400).json({
        mensaje:
          "El estado de la inscripción no es válido.",
      });
    }

    const existente = await ejecutar(
      `
        SELECT id_inscripcion
        FROM inscripciones
        WHERE id_inscripcion = ?
        LIMIT 1
      `,
      [idInscripcion]
    );

    if (existente.length === 0) {
      return res.status(404).json({
        mensaje:
          "La inscripción ya no existe.",
      });
    }

    const alumnoValido =
      await validarAlumno(idAlumno);

    if (!alumnoValido) {
      return res.status(400).json({
        mensaje:
          "El usuario seleccionado no tiene el rol de estudiante.",
      });
    }

    const cursoValido =
      await validarCurso(idCurso);

    if (!cursoValido) {
      return res.status(400).json({
        mensaje:
          "El curso seleccionado ya no existe.",
      });
    }

    const duplicado =
      await existeDuplicado(
        idAlumno,
        idCurso,
        idInscripcion
      );

    if (duplicado) {
      return res.status(409).json({
        mensaje:
          "El estudiante ya está inscrito en ese curso.",
      });
    }

    await ejecutar(
      `
        UPDATE inscripciones
        SET
          id_alumno = ?,
          id_curso = ?,
          estado = ?
        WHERE id_inscripcion = ?
      `,
      [
        idAlumno,
        idCurso,
        estado,
        idInscripcion,
      ]
    );

    return res.status(200).json({
      mensaje:
        "La inscripción se actualizó correctamente.",
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "No se pudo actualizar la inscripción."
    );
  }
};

/*
 * PATCH
 * /api/academico/inscripciones/:id/estado
 */
const cambiarEstadoInscripcion = async (
  req,
  res
) => {
  try {
    const idInscripcion =
      numeroPositivo(req.params.id);

    const estado = req.body.estado;

    if (!idInscripcion) {
      return res.status(400).json({
        mensaje:
          "La inscripción indicada no es válida.",
      });
    }

    if (!estadoValido(estado)) {
      return res.status(400).json({
        mensaje:
          "El estado de la inscripción no es válido.",
      });
    }

    const resultado = await ejecutar(
      `
        UPDATE inscripciones
        SET estado = ?
        WHERE id_inscripcion = ?
      `,
      [
        estado,
        idInscripcion,
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje:
          "La inscripción ya no existe.",
      });
    }

    return res.status(200).json({
      mensaje:
        "El estado de la inscripción se actualizó correctamente.",
    });
  } catch (error) {
    return responderError(
      res,
      error,
      "No se pudo cambiar el estado de la inscripción."
    );
  }
};

module.exports = {
  listarInscripciones,
  listarAlumnosDisponibles,
  listarCursosDisponibles,
  crearInscripcion,
  actualizarInscripcion,
  cambiarEstadoInscripcion,
};