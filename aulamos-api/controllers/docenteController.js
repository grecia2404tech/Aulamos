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
    const idDocente = Number(
      req.usuario?.id_usuario
    );

    const idAlumno = Number(
      req.params.idAlumno
    );

    if (
      !Number.isInteger(idDocente) ||
      idDocente <= 0
    ) {
      return res.status(401).json({
        mensaje:
          'No se pudo identificar al docente autenticado.',
      });
    }

    if (
      !Number.isInteger(idAlumno) ||
      idAlumno <= 0
    ) {
      return res.status(400).json({
        mensaje:
          'El estudiante indicado no es válido.',
      });
    }

    /*
     * Verifica que el alumno pertenezca por lo menos
     * a un curso activo del docente autenticado.
     */
    const [relacion] = await pool.query(
      `
        SELECT
          i.id_alumno
        FROM inscripciones AS i

        INNER JOIN cursos AS c
          ON c.id_curso = i.id_curso

        WHERE i.id_alumno = ?
          AND c.id_docente = ?
          AND i.estado = 'Activo'
          AND c.estado = 'Activo'

        LIMIT 1
      `,
      [
        idAlumno,
        idDocente,
      ]
    );

    if (relacion.length === 0) {
      return res.status(404).json({
        mensaje:
          'El estudiante no pertenece a los cursos activos de este docente.',
      });
    }

    /*
     * Información general del alumno.
     */
    const [alumnos] = await pool.query(
      `
        SELECT
          u.id_usuario AS id_alumno,

          CONCAT_WS(
            ' ',
            u.nombre,
            u.apellido_paterno,
            u.apellido_materno
          ) AS nombre_completo,

          u.correo,

          GROUP_CONCAT(
            DISTINCT CONCAT_WS(
              ' ',
              g.grado,
              g.nombre
            )
            ORDER BY
              g.grado,
              g.nombre
            SEPARATOR ', '
          ) AS grupos

        FROM usuarios AS u

        INNER JOIN inscripciones AS i
          ON i.id_alumno = u.id_usuario

        INNER JOIN cursos AS c
          ON c.id_curso = i.id_curso

        INNER JOIN grupos AS g
          ON g.id_grupo = c.id_grupo

        WHERE u.id_usuario = ?
          AND c.id_docente = ?
          AND i.estado = 'Activo'
          AND c.estado = 'Activo'

        GROUP BY
          u.id_usuario,
          u.nombre,
          u.apellido_paterno,
          u.apellido_materno,
          u.correo

        LIMIT 1
      `,
      [
        idAlumno,
        idDocente,
      ]
    );

    if (alumnos.length === 0) {
      return res.status(404).json({
        mensaje:
          'No se encontró la información del estudiante.',
      });
    }

    /*
     * Obtiene las actividades del alumno en los cursos
     * correspondientes al docente.
     *
     * La entrega se relaciona mediante:
     *
     * entregas.id_actividad_estudiante
     *         ↓
     * actividad_estudiantes.id_actividad_estudiante
     *
     * No se utiliza e.id_actividad porque esa columna
     * no existe en la tabla entregas.
     */
    const [actividades] = await pool.query(
      `
        SELECT
          a.id_actividad,
          a.titulo,
          a.descripcion,
          a.tipo,
          a.fecha_limite,

          ae.estado AS estado_alumno,

          COALESCE(
            ae.porcentaje_avance,
            0
          ) AS porcentaje_avance,

          e.calificacion,

          m.nombre AS materia,
          c.nombre AS curso

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

        LEFT JOIN entregas AS e
          ON e.id_entrega = (
            SELECT MAX(e2.id_entrega)
            FROM entregas AS e2
            WHERE
              e2.id_actividad_estudiante =
              ae.id_actividad_estudiante
          )

        WHERE ae.id_alumno = ?
          AND c.id_docente = ?
          AND a.estado IN (
            'Publicada',
            'Cerrada'
          )

        ORDER BY
          a.fecha_limite ASC,
          a.fecha_publicacion DESC,
          a.id_actividad DESC
      `,
      [
        idAlumno,
        idDocente,
      ]
    );

    /*
     * Calcula el resumen con los resultados obtenidos.
     */
    const resumen = actividades.reduce(
      (acumulado, actividad) => {
        const estado = String(
          actividad.estado_alumno ?? ''
        );

        let porcentaje = Number(
          actividad.porcentaje_avance ?? 0
        );

        if (
          estado === 'Completada' ||
          estado === 'Entregada' ||
          estado === 'Calificada'
        ) {
          porcentaje = 100;
        }

        acumulado.total_actividades += 1;

        acumulado.suma_avance += porcentaje;

        if (
          estado === 'Completada' ||
          estado === 'Entregada' ||
          estado === 'Calificada' ||
          porcentaje >= 100
        ) {
          acumulado.completadas += 1;
        } else if (
          estado === 'En_proceso' ||
          (porcentaje > 0 &&
            porcentaje < 100)
        ) {
          acumulado.en_progreso += 1;
        } else {
          acumulado.pendientes += 1;
        }

        if (
          actividad.calificacion !== null &&
          actividad.calificacion !== undefined
        ) {
          const calificacion = Number(
            actividad.calificacion
          );

          if (
            !Number.isNaN(calificacion)
          ) {
            acumulado.suma_calificaciones +=
              calificacion;

            acumulado.total_calificaciones +=
              1;
          }
        }

        return acumulado;
      },
      {
        total_actividades: 0,
        completadas: 0,
        en_progreso: 0,
        pendientes: 0,
        suma_avance: 0,
        suma_calificaciones: 0,
        total_calificaciones: 0,
      }
    );

    const progresoGeneral =
      resumen.total_actividades > 0
        ? Number(
            (
              resumen.suma_avance /
              resumen.total_actividades
            ).toFixed(1)
          )
        : 0;

    const promedioCalificaciones =
      resumen.total_calificaciones > 0
        ? Number(
            (
              resumen.suma_calificaciones /
              resumen.total_calificaciones
            ).toFixed(1)
          )
        : 0;

    return res.status(200).json({
      mensaje:
        'Progreso del estudiante obtenido correctamente',

      alumno: {
        id_alumno:
          alumnos[0].id_alumno,

        nombre_completo:
          alumnos[0].nombre_completo,

        correo:
          alumnos[0].correo,

        grupos:
          alumnos[0].grupos,
      },

      resumen: {
        total_actividades:
          resumen.total_actividades,

        completadas:
          resumen.completadas,

        en_progreso:
          resumen.en_progreso,

        pendientes:
          resumen.pendientes,

        progreso_general:
          progresoGeneral,

        promedio_calificaciones:
          promedioCalificaciones,
      },

      actividades: actividades.map(
        (actividad) => {
          const estado = String(
            actividad.estado_alumno ?? ''
          );

          const porcentaje =
            estado === 'Completada' ||
            estado === 'Entregada' ||
            estado === 'Calificada'
              ? 100
              : Number(
                  actividad
                    .porcentaje_avance ?? 0
                );

          return {
            id_actividad:
              actividad.id_actividad,

            titulo:
              actividad.titulo,

            descripcion:
              actividad.descripcion,

            tipo:
              actividad.tipo,

            fecha_limite:
              actividad.fecha_limite,

            estado_alumno:
              actividad.estado_alumno,

            porcentaje_avance:
              porcentaje,

            calificacion:
              actividad.calificacion ===
                null ||
              actividad.calificacion ===
                undefined
                ? null
                : Number(
                    actividad.calificacion
                  ),

            materia:
              actividad.materia,

            curso:
              actividad.curso,
          };
        }
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