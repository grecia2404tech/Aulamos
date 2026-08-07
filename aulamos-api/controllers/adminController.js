const pool = require('../config/database');

const obtenerResumenAdmin = async (req, res) => {
  try {
    const [[ciclos]] = await pool.query(
      'SELECT COUNT(*) AS total FROM ciclos_escolares'
    );

    const [[periodos]] = await pool.query(
      'SELECT COUNT(*) AS total FROM periodos_evaluacion'
    );

    const [[materias]] = await pool.query(
      'SELECT COUNT(*) AS total FROM materias'
    );

    const [[grupos]] = await pool.query(
      'SELECT COUNT(*) AS total FROM grupos'
    );

    const [[cursos]] = await pool.query(
      'SELECT COUNT(*) AS total FROM cursos'
    );

    const [[estudiantes]] = await pool.query(`
      SELECT COUNT(DISTINCT u.id_usuario) AS total
      FROM usuarios u
      INNER JOIN usuario_roles ur
        ON ur.id_usuario = u.id_usuario
      INNER JOIN roles r
        ON r.id_rol = ur.id_rol
      WHERE r.nombre = 'Alumno'
    `);

    return res.status(200).json({
      planeacion:
        Number(ciclos.total) +
        Number(periodos.total),

      academico:
        Number(materias.total) +
        Number(grupos.total) +
        Number(cursos.total),

      estudiantes:
        Number(estudiantes.total),

      modulos: 6,

      detalle: {
        ciclos: Number(ciclos.total),
        periodos: Number(periodos.total),
        materias: Number(materias.total),
        grupos: Number(grupos.total),
        cursos: Number(cursos.total),
        estudiantes: Number(estudiantes.total),
      },
    });
  } catch (error) {
    console.error(
      'Error al obtener resumen administrativo:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible obtener el resumen administrativo',
    });
  }
};

module.exports = {
  obtenerResumenAdmin,
};