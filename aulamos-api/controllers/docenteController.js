const pool = require('../config/database');

const obtenerInicioDocente = async (req, res) => {
  try {
    const idDocente = req.usuario.id_usuario;

    const [docentes] = await pool.query(
      `SELECT
          id_usuario,
          nombre,
          apellido_paterno,
          apellido_materno
       FROM usuarios
       WHERE id_usuario = ?`,
      [idDocente]
    );

    if (docentes.length === 0) {
      return res.status(404).json({
        mensaje: 'Docente no encontrado',
      });
    }

    const docente = docentes[0];

    const [clases] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM cursos
       WHERE id_docente = ?
         AND estado = 'Activo'`,
      [idDocente]
    );

    const [actividades] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM actividades
       WHERE id_docente = ?
         AND estado = 'Publicada'
         AND fecha_limite >= NOW()`,
      [idDocente]
    );

    const [evaluaciones] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM actividades
       WHERE id_docente = ?
         AND tipo = 'Evaluacion'
         AND estado = 'Publicada'`,
      [idDocente]
    );

    const [estudiantes] = await pool.query(
      `SELECT COUNT(DISTINCT i.id_alumno) AS total
       FROM inscripciones i
       INNER JOIN cursos c
          ON c.id_curso = i.id_curso
       WHERE c.id_docente = ?
         AND c.estado = 'Activo'
         AND i.estado = 'Activo'`,
      [idDocente]
    );

    const [recursosRecientes] = await pool.query(
      `SELECT
          r.id_recurso,
          r.titulo,
          r.tipo,
          r.fecha_publicacion,
          m.nombre AS materia
       FROM recursos_educativos r
       LEFT JOIN materias m
          ON m.id_materia = r.id_materia
       WHERE r.id_docente = ?
         AND r.estado = 'Activo'
       ORDER BY r.fecha_publicacion DESC
       LIMIT 1`,
      [idDocente]
    );

    const [actividadesRecientes] = await pool.query(
      `SELECT
          a.id_actividad,
          a.titulo,
          a.tipo,
          a.fecha_publicacion,
          m.nombre AS materia
       FROM actividades a
       INNER JOIN cursos c
          ON c.id_curso = a.id_curso
       INNER JOIN materias m
          ON m.id_materia = c.id_materia
       WHERE a.id_docente = ?
         AND a.estado = 'Publicada'
       ORDER BY a.fecha_publicacion DESC
       LIMIT 1`,
      [idDocente]
    );

    let actividadReciente = null;

    if (recursosRecientes.length > 0) {
      actividadReciente = {
        id: recursosRecientes[0].id_recurso,
        titulo: recursosRecientes[0].titulo,
        materia:
          recursosRecientes[0].materia ||
          'Sin materia',
        tipo: recursosRecientes[0].tipo,
        fecha_publicacion:
          recursosRecientes[0].fecha_publicacion,
        origen: 'Recurso',
      };
    } else if (actividadesRecientes.length > 0) {
      actividadReciente = {
        id: actividadesRecientes[0].id_actividad,
        id_actividad:
          actividadesRecientes[0].id_actividad,
        titulo: actividadesRecientes[0].titulo,
        materia:
          actividadesRecientes[0].materia ||
          'Sin materia',
        tipo: actividadesRecientes[0].tipo,
        fecha_publicacion:
          actividadesRecientes[0].fecha_publicacion,
        origen: 'Actividad',
      };
    }

    return res.status(200).json({
      mensaje:
        'Resumen del docente obtenido correctamente',

      docente: {
        id_usuario: docente.id_usuario,
        nombre: docente.nombre,
        apellido_paterno:
          docente.apellido_paterno,
        apellido_materno:
          docente.apellido_materno,
      },

      resumen: {
        clases_activas:
          Number(clases[0].total) || 0,

        actividades_pendientes:
          Number(actividades[0].total) || 0,

        evaluaciones:
          Number(evaluaciones[0].total) || 0,

        estudiantes:
          Number(estudiantes[0].total) || 0,
      },

      actividad_reciente: actividadReciente,
    });
  } catch (error) {
    console.error(
      'Error al obtener el inicio docente:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Error al obtener el resumen del docente',
      error: error.message,
    });
  }
};

const obtenerEstudiantesDocente = async (req, res) => {
  try {
    const idDocente = req.usuario.id_usuario;

    const [estudiantes] = await pool.query(
      `SELECT DISTINCT
          u.id_usuario AS id_alumno,
          u.nombre,
          u.apellido_paterno,
          u.apellido_materno,

          CONCAT_WS(
            ' ',
            u.nombre,
            u.apellido_paterno,
            u.apellido_materno
          ) AS nombre_completo,

          u.correo,

          g.id_grupo,
          g.nombre AS grupo,
          g.grado,

          c.id_curso,
          c.nombre AS curso,

          m.id_materia,
          m.nombre AS materia

       FROM cursos c

       INNER JOIN inscripciones i
          ON i.id_curso = c.id_curso

       INNER JOIN usuarios u
          ON u.id_usuario = i.id_alumno

       INNER JOIN grupos g
          ON g.id_grupo = c.id_grupo

       INNER JOIN materias m
          ON m.id_materia = c.id_materia

       WHERE c.id_docente = ?
         AND c.estado = 'Activo'
         AND i.estado = 'Activo'

       ORDER BY
          g.grado ASC,
          g.nombre ASC,
          u.apellido_paterno ASC,
          u.apellido_materno ASC,
          u.nombre ASC`,
      [idDocente]
    );

    return res.status(200).json({
      mensaje:
        'Estudiantes del docente obtenidos correctamente',
      total: estudiantes.length,
      estudiantes,
    });
  } catch (error) {
    console.error(
      'Error al obtener estudiantes del docente:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Error al obtener los estudiantes del docente',
      error: error.message,
    });
  }
};

const obtenerRecursosDocente = async (req, res) => {
  try {
    const idDocente = req.usuario.id_usuario;

    const [recursos] = await pool.query(
      `SELECT
          r.id_recurso,
          r.id_actividad,
          r.id_curso,
          r.id_materia,
          r.id_docente,
          r.titulo,
          r.descripcion,
          r.tipo,
          r.url_recurso,
          r.archivo,
          r.estado,
          r.fecha_publicacion,

          m.nombre AS materia,
          c.nombre AS curso,
          g.nombre AS grupo,

          a.titulo AS actividad_relacionada

       FROM recursos_educativos r

       LEFT JOIN materias m
          ON m.id_materia = r.id_materia

       LEFT JOIN cursos c
          ON c.id_curso = r.id_curso

       LEFT JOIN grupos g
          ON g.id_grupo = c.id_grupo

       LEFT JOIN actividades a
          ON a.id_actividad = r.id_actividad

       WHERE r.id_docente = ?
       

       ORDER BY
          r.fecha_publicacion DESC,
          r.id_recurso DESC`,
      [idDocente]
    );

    return res.status(200).json({
      mensaje:
        'Recursos del docente obtenidos correctamente',
      total: recursos.length,
      recursos,
    });
  } catch (error) {
    console.error(
      'Error al obtener recursos del docente:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron obtener los recursos del docente',
      error: error.message,
    });
  }
};

const obtenerProgresoEstudiante = async (
  req,
  res
) => {
  try {
    const idDocente = req.usuario.id_usuario;
    const { idAlumno } = req.params;

    const idAlumnoNumero = Number(idAlumno);

    if (
      !Number.isInteger(idAlumnoNumero) ||
      idAlumnoNumero <= 0
    ) {
      return res.status(400).json({
        mensaje:
          'El identificador del alumno no es válido',
      });
    }

    const [relacion] = await pool.query(
      `SELECT
          u.id_usuario AS id_alumno,

          CONCAT_WS(
            ' ',
            u.nombre,
            u.apellido_paterno,
            u.apellido_materno
          ) AS nombre_completo,

          u.correo,

          GROUP_CONCAT(
            DISTINCT g.nombre
            ORDER BY g.nombre
            SEPARATOR ', '
          ) AS grupos

       FROM usuarios u

       INNER JOIN inscripciones i
          ON i.id_alumno = u.id_usuario

       INNER JOIN cursos c
          ON c.id_curso = i.id_curso

       INNER JOIN grupos g
          ON g.id_grupo = c.id_grupo

       WHERE u.id_usuario = ?
         AND c.id_docente = ?
         AND c.estado = 'Activo'
         AND i.estado = 'Activo'

       GROUP BY
          u.id_usuario,
          u.nombre,
          u.apellido_paterno,
          u.apellido_materno,
          u.correo

       LIMIT 1`,
      [idAlumnoNumero, idDocente]
    );

    if (relacion.length === 0) {
      return res.status(404).json({
        mensaje:
          'El alumno no existe o no pertenece a los cursos del docente',
      });
    }

    const [resumenResultados] =
      await pool.query(
        `SELECT
            COUNT(
              DISTINCT a.id_actividad
            ) AS total_actividades,

            SUM(
              CASE
                WHEN ae.estado IN (
                  'Completada',
                  'Entregada',
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

            SUM(
              CASE
                WHEN ae.estado = 'En_proceso'
                OR (
                  COALESCE(
                    ae.porcentaje_avance,
                    0
                  ) > 0
                  AND COALESCE(
                    ae.porcentaje_avance,
                    0
                  ) < 100
                )
                THEN 1
                ELSE 0
              END
            ) AS en_progreso,

            SUM(
              CASE
                WHEN ae.estado IN (
                  'Pendiente',
                  'Atrasada'
                )
                AND COALESCE(
                  ae.porcentaje_avance,
                  0
                ) = 0
                THEN 1
                ELSE 0
              END
            ) AS pendientes,

            ROUND(
              COALESCE(
                AVG(
                  CASE
                    WHEN ae.estado IN (
                      'Completada',
                      'Entregada',
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
            ) AS progreso_general,

            ROUND(
              COALESCE(
                AVG(e.calificacion),
                0
              ),
              1
            ) AS promedio_calificaciones

         FROM actividad_estudiantes ae

         INNER JOIN actividades a
            ON a.id_actividad =
               ae.id_actividad

         LEFT JOIN entregas e
            ON e.id_actividad =
               a.id_actividad
           AND e.id_estudiante =
               ae.id_alumno

         WHERE ae.id_alumno = ?
           AND a.id_docente = ?
           AND a.estado = 'Publicada'`,
        [idAlumnoNumero, idDocente]
      );

    const [actividades] = await pool.query(
      `SELECT
          a.id_actividad,
          a.titulo,
          a.descripcion,
          a.tipo,
          a.fecha_publicacion,
          a.fecha_limite,
          a.puntaje_maximo,

          ae.estado AS estado_alumno,
          ae.porcentaje_avance,
          ae.fecha_inicio,
          ae.fecha_finalizacion,
          ae.ultimo_acceso,

          e.id_entrega,
          e.fecha_entrega,
          e.calificacion,
          e.retroalimentacion,

          m.id_materia,
          m.nombre AS materia,

          c.id_curso,
          c.nombre AS curso

       FROM actividad_estudiantes ae

       INNER JOIN actividades a
          ON a.id_actividad =
             ae.id_actividad

       INNER JOIN cursos c
          ON c.id_curso = a.id_curso

       INNER JOIN materias m
          ON m.id_materia = c.id_materia

       LEFT JOIN entregas e
          ON e.id_actividad =
             a.id_actividad
         AND e.id_estudiante =
             ae.id_alumno

       WHERE ae.id_alumno = ?
         AND a.id_docente = ?

       ORDER BY
          a.fecha_publicacion DESC,
          a.id_actividad DESC`,
      [idAlumnoNumero, idDocente]
    );

    const resumen =
      resumenResultados[0] || {};

    return res.status(200).json({
      mensaje:
        'Progreso del estudiante obtenido correctamente',

      alumno: relacion[0],

      resumen: {
        total_actividades: Number(
          resumen.total_actividades || 0
        ),

        completadas: Number(
          resumen.completadas || 0
        ),

        en_progreso: Number(
          resumen.en_progreso || 0
        ),

        pendientes: Number(
          resumen.pendientes || 0
        ),

        progreso_general: Number(
          resumen.progreso_general || 0
        ),

        promedio_calificaciones: Number(
          resumen.promedio_calificaciones || 0
        ),
      },

      actividades: actividades.map(
        (actividad) => ({
          ...actividad,

          porcentaje_avance: Number(
            actividad.porcentaje_avance || 0
          ),

          puntaje_maximo: Number(
            actividad.puntaje_maximo || 0
          ),

          calificacion:
            actividad.calificacion === null
              ? null
              : Number(
                  actividad.calificacion
                ),
        })
      ),
    });
  } catch (error) {
    console.error(
      'Error al obtener progreso del estudiante:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo obtener el progreso del estudiante',
      error: error.message,
    });
  }
};

module.exports = {
  obtenerInicioDocente,
  obtenerEstudiantesDocente,
  obtenerRecursosDocente,
  obtenerProgresoEstudiante,
};