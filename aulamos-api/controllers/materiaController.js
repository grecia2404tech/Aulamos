const pool = require('../config/database');

const ESTADOS_VALIDOS = [
  'Activa',
  'Inactiva',
];

const limpiarTexto = (valor) => {
  if (typeof valor !== 'string') {
    return '';
  }

  return valor.trim().replace(/\s+/g, ' ');
};

const enviarError = (
  res,
  status,
  campo,
  mensaje
) => {
  return res.status(status).json({
    mensaje,
    campo,
  });
};

const validarDatosMateria = async (
  conexion,
  datos,
  idMateriaExcluir = null
) => {
  const nombre = limpiarTexto(
    datos.nombre
  );

  const campoFormativo = limpiarTexto(
    datos.campo_formativo
  );

  const descripcion = limpiarTexto(
    datos.descripcion
  );

  const estado =
    limpiarTexto(datos.estado) || 'Activa';

  if (!nombre) {
    return {
      status: 400,
      campo: 'nombre',
      mensaje:
        'El nombre de la materia es obligatorio',
    };
  }

  if (
    nombre.length < 2 ||
    nombre.length > 120
  ) {
    return {
      status: 400,
      campo: 'nombre',
      mensaje:
        'El nombre debe tener entre 2 y 120 caracteres',
    };
  }

  if (!campoFormativo) {
    return {
      status: 400,
      campo: 'campo_formativo',
      mensaje:
        'El campo formativo es obligatorio',
    };
  }

  if (
    campoFormativo.length < 2 ||
    campoFormativo.length > 120
  ) {
    return {
      status: 400,
      campo: 'campo_formativo',
      mensaje:
        'El campo formativo debe tener entre 2 y 120 caracteres',
    };
  }

  if (descripcion.length > 1000) {
    return {
      status: 400,
      campo: 'descripcion',
      mensaje:
        'La descripción no puede superar los 1000 caracteres',
    };
  }

  if (
    !ESTADOS_VALIDOS.includes(estado)
  ) {
    return {
      status: 400,
      campo: 'estado',
      mensaje:
        'El estado de la materia no es válido',
    };
  }

  const parametros = [
    nombre,
    campoFormativo,
  ];

  let consulta = `
    SELECT id_materia
    FROM materias
    WHERE LOWER(nombre) = LOWER(?)
      AND LOWER(campo_formativo) = LOWER(?)
  `;

  if (idMateriaExcluir) {
    consulta +=
      ' AND id_materia <> ?';

    parametros.push(
      idMateriaExcluir
    );
  }

  consulta += ' LIMIT 1';

  const [duplicadas] =
    await conexion.query(
      consulta,
      parametros
    );

  if (duplicadas.length > 0) {
    return {
      status: 409,
      campo: 'nombre',
      mensaje:
        'Ya existe una materia con ese nombre y campo formativo',
    };
  }

  return {
    datos: {
      nombre,
      campoFormativo,
      descripcion:
        descripcion || null,
      estado,
    },
  };
};

const obtenerMaterias = async (
  req,
  res
) => {
  try {
    const [materias] =
      await pool.query(`
        SELECT
          m.id_materia,
          m.nombre,
          m.campo_formativo,
          m.descripcion,
          m.estado,
          COUNT(c.id_curso) AS total_cursos
        FROM materias m
        LEFT JOIN cursos c
          ON c.id_materia = m.id_materia
        GROUP BY
          m.id_materia,
          m.nombre,
          m.campo_formativo,
          m.descripcion,
          m.estado
        ORDER BY
          m.campo_formativo ASC,
          m.nombre ASC
      `);

    return res.status(200).json({
      mensaje:
        'Materias obtenidas correctamente',
      materias,
    });
  } catch (error) {
    console.error(
      'Error al obtener materias:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible obtener las materias',
    });
  }
};

const obtenerMateriasActivas = async (
  req,
  res
) => {
  try {
    const [materias] =
      await pool.query(`
        SELECT
          id_materia,
          nombre,
          campo_formativo,
          descripcion,
          estado
        FROM materias
        WHERE estado = 'Activa'
        ORDER BY
          campo_formativo ASC,
          nombre ASC
      `);

    return res.status(200).json({
      mensaje:
        'Materias activas obtenidas correctamente',
      materias,
    });
  } catch (error) {
    console.error(
      'Error al obtener materias activas:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible obtener las materias activas',
    });
  }
};

const crearMateria = async (
  req,
  res
) => {
  let conexion;

  try {
    conexion =
      await pool.getConnection();

    await conexion.beginTransaction();

    const validacion =
      await validarDatosMateria(
        conexion,
        req.body
      );

    if (validacion.status) {
      await conexion.rollback();

      return enviarError(
        res,
        validacion.status,
        validacion.campo,
        validacion.mensaje
      );
    }

    const {
      nombre,
      campoFormativo,
      descripcion,
      estado,
    } = validacion.datos;

    const [resultado] =
      await conexion.query(
        `
          INSERT INTO materias
          (
            nombre,
            campo_formativo,
            descripcion,
            estado
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          nombre,
          campoFormativo,
          descripcion,
          estado,
        ]
      );

    await conexion.commit();

    return res.status(201).json({
      mensaje:
        'Materia creada correctamente',
      materia: {
        id_materia:
          resultado.insertId,
        nombre,
        campo_formativo:
          campoFormativo,
        descripcion,
        estado,
      },
    });
  } catch (error) {
    if (conexion) {
      await conexion.rollback();
    }

    console.error(
      'Error al crear materia:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible crear la materia',
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

const actualizarMateria = async (
  req,
  res
) => {
  let conexion;

  try {
    const idMateria = Number(
      req.params.id
    );

    if (
      !Number.isInteger(idMateria) ||
      idMateria <= 0
    ) {
      return enviarError(
        res,
        400,
        'id_materia',
        'El identificador de la materia no es válido'
      );
    }

    conexion =
      await pool.getConnection();

    await conexion.beginTransaction();

    const [materias] =
      await conexion.query(
        `
          SELECT id_materia
          FROM materias
          WHERE id_materia = ?
          LIMIT 1
        `,
        [idMateria]
      );

    if (materias.length === 0) {
      await conexion.rollback();

      return enviarError(
        res,
        404,
        'id_materia',
        'La materia no existe'
      );
    }

    const validacion =
      await validarDatosMateria(
        conexion,
        req.body,
        idMateria
      );

    if (validacion.status) {
      await conexion.rollback();

      return enviarError(
        res,
        validacion.status,
        validacion.campo,
        validacion.mensaje
      );
    }

    const {
      nombre,
      campoFormativo,
      descripcion,
      estado,
    } = validacion.datos;

    await conexion.query(
      `
        UPDATE materias
        SET
          nombre = ?,
          campo_formativo = ?,
          descripcion = ?,
          estado = ?
        WHERE id_materia = ?
      `,
      [
        nombre,
        campoFormativo,
        descripcion,
        estado,
        idMateria,
      ]
    );

    await conexion.commit();

    return res.status(200).json({
      mensaje:
        'Materia actualizada correctamente',
    });
  } catch (error) {
    if (conexion) {
      await conexion.rollback();
    }

    console.error(
      'Error al actualizar materia:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible actualizar la materia',
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

const cambiarEstadoMateria = async (
  req,
  res
) => {
  try {
    const idMateria = Number(
      req.params.id
    );

    const estado = limpiarTexto(
      req.body.estado
    );

    if (
      !Number.isInteger(idMateria) ||
      idMateria <= 0
    ) {
      return enviarError(
        res,
        400,
        'id_materia',
        'El identificador de la materia no es válido'
      );
    }

    if (
      !ESTADOS_VALIDOS.includes(estado)
    ) {
      return enviarError(
        res,
        400,
        'estado',
        'El estado seleccionado no es válido'
      );
    }

    const [resultado] =
      await pool.query(
        `
          UPDATE materias
          SET estado = ?
          WHERE id_materia = ?
        `,
        [
          estado,
          idMateria,
        ]
      );

    if (
      resultado.affectedRows === 0
    ) {
      return enviarError(
        res,
        404,
        'id_materia',
        'La materia no existe'
      );
    }

    return res.status(200).json({
      mensaje:
        `La materia ahora está ${estado.toLowerCase()}`,
    });
  } catch (error) {
    console.error(
      'Error al cambiar estado de materia:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible cambiar el estado de la materia',
    });
  }
};

module.exports = {
  obtenerMaterias,
  obtenerMateriasActivas,
  crearMateria,
  actualizarMateria,
  cambiarEstadoMateria,
};