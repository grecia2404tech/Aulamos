const pool = require('../config/database');

const obtenerInicioDocente = async (req, res) => {
  try {
    const idDocente = req.usuario.id_usuario;

    // Obtener datos del docente
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

    // Total de clases o cursos activos
    const [clases] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM cursos
       WHERE id_docente = ?
       AND estado = 'Activo'`,
      [idDocente]
    );

    // Actividades publicadas que todavía no han vencido
    const [actividades] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM actividades
       WHERE id_docente = ?
       AND estado = 'Publicada'
       AND fecha_limite >= NOW()`,
      [idDocente]
    );

    // Evaluaciones publicadas
    const [evaluaciones] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM actividades
       WHERE id_docente = ?
       AND tipo = 'Evaluacion'
       AND estado = 'Publicada'`,
      [idDocente]
    );

    // Alumnos inscritos en los cursos del docente
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

    // Recurso más reciente publicado por el docente
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

    // Actividad más reciente, por si no existen recursos
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

    res.json({
      mensaje: 'Resumen del docente obtenido correctamente',

      docente: {
        id_usuario: docente.id_usuario,
        nombre: docente.nombre,
        apellido_paterno: docente.apellido_paterno,
        apellido_materno: docente.apellido_materno,
      },

      resumen: {
        clases_activas: clases[0].total,
        actividades_pendientes: actividades[0].total,
        evaluaciones: evaluaciones[0].total,
        estudiantes: estudiantes[0].total,
      },

      actividad_reciente: actividadReciente,
    });
  } catch (error) {
    console.error(
      'Error al obtener el inicio docente:',
      error
    );

    res.status(500).json({
      mensaje:
        'Error al obtener el resumen del docente',
      error: error.message,
    });
  }
};

module.exports = {
  obtenerInicioDocente,
};