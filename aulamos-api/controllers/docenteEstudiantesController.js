const pool = require("../config/database");

// =====================================================
// ESTUDIANTES INSCRITOS EN LOS CURSOS DEL DOCENTE
// GET /api/docente/estudiantes
// =====================================================
const obtenerEstudiantesDocente = async (req, res) => {
  try {
    const idDocente = Number(
      req.usuario?.id_usuario ??
      req.usuario?.id ??
      req.usuario?.usuarioId ??
      req.user?.id_usuario ??
      req.user?.id ??
      0
    );

    if (
      !Number.isInteger(idDocente) ||
      idDocente <= 0
    ) {
      return res.status(401).json({
        ok: false,
        mensaje:
          "No se pudo identificar al docente autenticado.",
      });
    }

    console.log(
      "Consultando estudiantes del docente:",
      idDocente
    );

    const [estudiantes] = await pool.query(
      `
        SELECT DISTINCT
          alumno.id_usuario AS id_alumno,
          alumno.nombre,
          alumno.apellido_paterno,
          alumno.apellido_materno,

          CONCAT_WS(
            ' ',
            alumno.nombre,
            alumno.apellido_paterno,
            alumno.apellido_materno
          ) AS nombre_completo,

          alumno.correo,

          g.id_grupo,
          g.nombre AS grupo,
          g.grado,

          c.id_curso,
          c.nombre AS curso,

          m.id_materia,
          m.nombre AS materia

        FROM inscripciones AS i

        INNER JOIN cursos AS c
          ON c.id_curso = i.id_curso

        INNER JOIN usuarios AS alumno
          ON alumno.id_usuario = i.id_alumno

        INNER JOIN materias AS m
          ON m.id_materia = c.id_materia

        INNER JOIN grupos AS g
          ON g.id_grupo = c.id_grupo

        WHERE c.id_docente = ?
          AND i.estado = 'Activo'
          AND c.estado = 'Activo'
          AND alumno.estado = 'Activo'

        ORDER BY
          m.nombre ASC,
          c.nombre ASC,
          alumno.apellido_paterno ASC,
          alumno.apellido_materno ASC,
          alumno.nombre ASC
      `,
      [idDocente]
    );

    const totalEstudiantes = new Set(
      estudiantes.map(
        (estudiante) => estudiante.id_alumno
      )
    ).size;

    console.log(
      "Estudiantes encontrados:",
      totalEstudiantes
    );

    return res.status(200).json({
      ok: true,
      total: totalEstudiantes,
      estudiantes,
    });
  } catch (error) {
    console.error(
      "Error al obtener estudiantes del docente:",
      error
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "No se pudieron obtener los estudiantes.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

module.exports = {
  obtenerEstudiantesDocente,
};