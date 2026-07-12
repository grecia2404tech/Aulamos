const pool = require('../config/database');

const obtenerInicioAlumno = async (req, res) => {
  try {
    const idAlumno = req.usuario.id_usuario;

    const [alumnos] = await pool.query(
      `SELECT
        u.id_usuario,
        u.nombre,
        u.apellido_paterno,
        u.apellido_materno,
        u.correo
      FROM usuarios u
      INNER JOIN usuario_roles ur
        ON ur.id_usuario = u.id_usuario
      INNER JOIN roles r
        ON r.id_rol = ur.id_rol
      WHERE u.id_usuario = ?
        AND u.estado = 'Activo'
        AND r.nombre = 'Alumno'
      LIMIT 1`,
      [idAlumno]
    );

    if (alumnos.length === 0) {
      return res.status(404).json({
        mensaje:
          'No se encontró la información del alumno',
      });
    }

    const alumno = alumnos[0];

    const [actividadesPendientes] =
      await pool.query(
        `SELECT COUNT(*) AS total
         FROM actividad_estudiantes ae
         INNER JOIN actividades a
           ON a.id_actividad = ae.id_actividad
         WHERE ae.id_alumno = ?
           AND ae.estado IN (
             'Pendiente',
             'Atrasada'
           )
           AND a.estado = 'Publicada'`,
        [idAlumno]
      );

    const [leccionesEnProgreso] =
      await pool.query(
        `SELECT COUNT(*) AS total
         FROM actividad_estudiantes ae
         INNER JOIN actividades a
           ON a.id_actividad = ae.id_actividad
         WHERE ae.id_alumno = ?
           AND ae.estado = 'En_proceso'
           AND a.estado = 'Publicada'`,
        [idAlumno]
      );

    const [actividadesProximas] =
      await pool.query(
        `SELECT
          a.id_actividad,
          a.titulo,
          a.tipo,
          a.fecha_limite,
          m.nombre AS materia
        FROM actividad_estudiantes ae
        INNER JOIN actividades a
          ON a.id_actividad = ae.id_actividad
        INNER JOIN cursos c
          ON c.id_curso = a.id_curso
        INNER JOIN materias m
          ON m.id_materia = c.id_materia
        WHERE ae.id_alumno = ?
          AND ae.estado IN (
            'Pendiente',
            'En_proceso'
          )
          AND a.estado = 'Publicada'
          AND a.fecha_limite >= NOW()
        ORDER BY a.fecha_limite ASC
        LIMIT 1`,
        [idAlumno]
      );

    let proximaActividad = null;

    if (actividadesProximas.length > 0) {
      proximaActividad = {
        id_actividad:
          actividadesProximas[0].id_actividad,
        titulo: actividadesProximas[0].titulo,
        tipo: actividadesProximas[0].tipo,
        materia: actividadesProximas[0].materia,
        fecha_limite:
          actividadesProximas[0].fecha_limite,
      };
    }

    return res.status(200).json({
      mensaje:
        'Resumen del alumno obtenido correctamente',

      alumno: {
        id_usuario: alumno.id_usuario,
        nombre: alumno.nombre,
        apellido_paterno:
          alumno.apellido_paterno,
        apellido_materno:
          alumno.apellido_materno,
        correo: alumno.correo,
      },

      resumen: {
        actividades_pendientes:
          Number(
            actividadesPendientes[0].total
          ) || 0,

        lecciones_en_progreso:
          Number(
            leccionesEnProgreso[0].total
          ) || 0,

        /*
         * Todavía no existe una tabla específica
         * para acumular puntos.
         */
        puntos_totales: 0,
      },

      proxima_actividad: proximaActividad,
    });
  } catch (error) {
    console.error(
      'Error al obtener inicio alumno:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Error al obtener el resumen del alumno',
    });
  }
};

module.exports = {
  obtenerInicioAlumno,
};