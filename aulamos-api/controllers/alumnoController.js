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

const obtenerAvancesAlumno = async (req, res) => {
  try {
    const idAlumno = req.usuario.id_usuario;

    /*
     * Resumen general.
     *
     * Se utiliza ae.estado porque en tu propia
     * lógica ya manejas:
     * Pendiente, Atrasada, En_proceso, etc.
     *
     * También se toma porcentaje_avance para
     * calcular el progreso general.
     */
    const [resumenResultados] =
      await pool.query(
        `SELECT
          COUNT(*) AS total_actividades,

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
              OR COALESCE(
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
          ) AS progreso_general

        FROM actividad_estudiantes ae

        INNER JOIN actividades a
          ON a.id_actividad =
             ae.id_actividad

        WHERE ae.id_alumno = ?
          AND a.estado = 'Publicada'`,
        [idAlumno]
      );

    /*
     * Progreso agrupado por materia.
     */
    const [materiasResultados] =
      await pool.query(
        `SELECT
          m.id_materia,
          m.nombre,

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
          ) AS porcentaje

        FROM actividad_estudiantes ae

        INNER JOIN actividades a
          ON a.id_actividad =
             ae.id_actividad

        INNER JOIN cursos c
          ON c.id_curso =
             a.id_curso

        INNER JOIN materias m
          ON m.id_materia =
             c.id_materia

        WHERE ae.id_alumno = ?
          AND a.estado = 'Publicada'

        GROUP BY
          m.id_materia,
          m.nombre

        ORDER BY
          m.nombre ASC`,
        [idAlumno]
      );

    const resumen =
      resumenResultados[0] || {};

    return res.status(200).json({
      mensaje:
        'Avances del alumno obtenidos correctamente',

      resumen: {
        progreso_general: Number(
          resumen.progreso_general || 0
        ),

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
      },

      materias: materiasResultados.map(
        (materia) => ({
          id_materia:
            materia.id_materia,

          nombre:
            materia.nombre,

          porcentaje: Number(
            materia.porcentaje || 0
          ),

          total_actividades: Number(
            materia.total_actividades || 0
          ),

          completadas: Number(
            materia.completadas || 0
          ),
        })
      ),
    });
  } catch (error) {
    console.error(
      'Error al obtener avances del alumno:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Error al obtener los avances del alumno',
      error: error.message,
    });
  }
};

module.exports = {
  obtenerInicioAlumno,
  obtenerAvancesAlumno,
};