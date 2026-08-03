const pool = require('../config/database');

const ESTADOS_VALIDOS = [
  'Activo',
  'Inactivo',
  'Cerrado',
];

const limpiarTexto = (valor) => {
  if (typeof valor !== 'string') {
    return '';
  }

  return valor.trim().replace(/\s+/g, ' ');
};

const convertirId = (valor) => {
  const numero = Number(valor);

  return Number.isInteger(numero) &&
    numero > 0
    ? numero
    : null;
};

const esFechaValida = (valor) => {
  if (
    typeof valor !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false;
  }

  const fecha = new Date(
    `${valor}T00:00:00Z`
  );

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) ===
      valor
  );
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

const validarPeriodo = async (
  conexion,
  datos,
  idPeriodoExcluir = null
) => {
  const idCiclo = convertirId(
    datos.id_ciclo
  );

  const nombre = limpiarTexto(
    datos.nombre
  );

  const fechaInicio = limpiarTexto(
    datos.fecha_inicio
  );

  const fechaFin = limpiarTexto(
    datos.fecha_fin
  );

  const estado =
    limpiarTexto(datos.estado) ||
    'Inactivo';

  if (!idCiclo) {
    return {
      status: 400,
      campo: 'id_ciclo',
      mensaje:
        'Selecciona un ciclo escolar válido.',
    };
  }

  if (
    nombre.length < 2 ||
    nombre.length > 100
  ) {
    return {
      status: 400,
      campo: 'nombre',
      mensaje:
        'El nombre debe tener entre 2 y 100 caracteres.',
    };
  }

  if (!esFechaValida(fechaInicio)) {
    return {
      status: 400,
      campo: 'fecha_inicio',
      mensaje:
        'La fecha de inicio no es válida. Usa AAAA-MM-DD.',
    };
  }

  if (!esFechaValida(fechaFin)) {
    return {
      status: 400,
      campo: 'fecha_fin',
      mensaje:
        'La fecha final no es válida. Usa AAAA-MM-DD.',
    };
  }

  if (fechaInicio >= fechaFin) {
    return {
      status: 400,
      campo: 'fecha_fin',
      mensaje:
        'La fecha final debe ser posterior a la fecha de inicio.',
    };
  }

  if (
    !ESTADOS_VALIDOS.includes(estado)
  ) {
    return {
      status: 400,
      campo: 'estado',
      mensaje:
        'El estado seleccionado no es válido.',
    };
  }

  const [ciclos] =
    await conexion.query(
      `SELECT
         id_ciclo,
         nombre,
         DATE_FORMAT(
           fecha_inicio,
           '%Y-%m-%d'
         ) AS fecha_inicio,
         DATE_FORMAT(
           fecha_fin,
           '%Y-%m-%d'
         ) AS fecha_fin,
         estado
       FROM ciclos_escolares
       WHERE id_ciclo = ?
       LIMIT 1`,
      [idCiclo]
    );

  if (ciclos.length === 0) {
    return {
      status: 404,
      campo: 'id_ciclo',
      mensaje:
        'El ciclo escolar seleccionado no existe.',
    };
  }

  const ciclo = ciclos[0];

  if (ciclo.estado === 'Cerrado') {
    return {
      status: 400,
      campo: 'id_ciclo',
      mensaje:
        'No puedes modificar periodos de un ciclo cerrado.',
    };
  }

  if (
    fechaInicio < ciclo.fecha_inicio ||
    fechaFin > ciclo.fecha_fin
  ) {
    return {
      status: 400,
      campo: 'fecha_inicio',
      mensaje:
        `Las fechas deben estar entre ${ciclo.fecha_inicio} y ${ciclo.fecha_fin}.`,
    };
  }

  const parametrosCruce = [
    idCiclo,
    fechaFin,
    fechaInicio,
  ];

  let consultaCruce = `
    SELECT
      id_periodo,
      nombre
    FROM periodos_evaluacion
    WHERE id_ciclo = ?
      AND fecha_inicio <= ?
      AND fecha_fin >= ?
  `;

  if (idPeriodoExcluir) {
    consultaCruce +=
      ' AND id_periodo <> ?';

    parametrosCruce.push(
      idPeriodoExcluir
    );
  }

  consultaCruce += ' LIMIT 1';

  const [periodosCruzados] =
    await conexion.query(
      consultaCruce,
      parametrosCruce
    );

  if (periodosCruzados.length > 0) {
    return {
      status: 409,
      campo: 'fecha_inicio',
      mensaje:
        `Las fechas se cruzan con el periodo "${periodosCruzados[0].nombre}".`,
    };
  }

  const parametrosNombre = [
    idCiclo,
    nombre,
  ];

  let consultaNombre = `
    SELECT id_periodo
    FROM periodos_evaluacion
    WHERE id_ciclo = ?
      AND LOWER(nombre) = LOWER(?)
  `;

  if (idPeriodoExcluir) {
    consultaNombre +=
      ' AND id_periodo <> ?';

    parametrosNombre.push(
      idPeriodoExcluir
    );
  }

  consultaNombre += ' LIMIT 1';

  const [nombresDuplicados] =
    await conexion.query(
      consultaNombre,
      parametrosNombre
    );

  if (nombresDuplicados.length > 0) {
    return {
      status: 409,
      campo: 'nombre',
      mensaje:
        'Ya existe un periodo con ese nombre en el ciclo.',
    };
  }

  return {
    datos: {
      idCiclo,
      nombre,
      fechaInicio,
      fechaFin,
      estado,
    },
  };
};

const obtenerPeriodos = async (
  req,
  res
) => {
  try {
    const idCiclo = req.query.id_ciclo
      ? convertirId(req.query.id_ciclo)
      : null;

    if (
      req.query.id_ciclo &&
      !idCiclo
    ) {
      return enviarError(
        res,
        400,
        'id_ciclo',
        'El ciclo indicado no es válido.'
      );
    }

    const parametros = [];

    let consulta = `
      SELECT
        p.id_periodo,
        p.id_ciclo,
        p.nombre,
        DATE_FORMAT(
          p.fecha_inicio,
          '%Y-%m-%d'
        ) AS fecha_inicio,
        DATE_FORMAT(
          p.fecha_fin,
          '%Y-%m-%d'
        ) AS fecha_fin,
        p.estado,
        c.nombre AS ciclo,
        c.estado AS estado_ciclo
      FROM periodos_evaluacion p
      INNER JOIN ciclos_escolares c
        ON c.id_ciclo = p.id_ciclo
    `;

    if (idCiclo) {
      consulta +=
        ' WHERE p.id_ciclo = ?';

      parametros.push(idCiclo);
    }

    consulta += `
      ORDER BY
        c.fecha_inicio DESC,
        p.fecha_inicio ASC
    `;

    const [periodos] =
      await pool.query(
        consulta,
        parametros
      );

    return res.status(200).json({
      periodos,
    });
  } catch (error) {
    console.error(
      'Error al obtener periodos:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible obtener los periodos de evaluación.',
    });
  }
};

const obtenerPeriodoActivo = async (
  req,
  res
) => {
  try {
    const [periodos] =
      await pool.query(
        `SELECT
           p.id_periodo,
           p.id_ciclo,
           p.nombre,
           DATE_FORMAT(
             p.fecha_inicio,
             '%Y-%m-%d'
           ) AS fecha_inicio,
           DATE_FORMAT(
             p.fecha_fin,
             '%Y-%m-%d'
           ) AS fecha_fin,
           p.estado,
           c.nombre AS ciclo
         FROM periodos_evaluacion p
         INNER JOIN ciclos_escolares c
           ON c.id_ciclo = p.id_ciclo
         WHERE p.estado = 'Activo'
           AND c.estado = 'Activo'
         ORDER BY
           p.fecha_inicio DESC
         LIMIT 1`
      );

    return res.status(200).json({
      periodo: periodos[0] || null,
    });
  } catch (error) {
    console.error(
      'Error al obtener periodo activo:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible obtener el periodo activo.',
    });
  }
};

const crearPeriodo = async (
  req,
  res
) => {
  const conexion =
    await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const validacion =
      await validarPeriodo(
        conexion,
        req.body
      );

    if (!validacion.datos) {
      await conexion.rollback();

      return enviarError(
        res,
        validacion.status,
        validacion.campo,
        validacion.mensaje
      );
    }

    const datos = validacion.datos;

    if (datos.estado === 'Activo') {
      await conexion.query(
        `UPDATE periodos_evaluacion
         SET estado = 'Inactivo'
         WHERE id_ciclo = ?
           AND estado = 'Activo'`,
        [datos.idCiclo]
      );
    }

    const [resultado] =
      await conexion.query(
        `INSERT INTO periodos_evaluacion
         (
           id_ciclo,
           nombre,
           fecha_inicio,
           fecha_fin,
           estado
         )
         VALUES (?, ?, ?, ?, ?)`,
        [
          datos.idCiclo,
          datos.nombre,
          datos.fechaInicio,
          datos.fechaFin,
          datos.estado,
        ]
      );

    await conexion.commit();

    return res.status(201).json({
      mensaje:
        'El periodo de evaluación fue creado correctamente.',
      id_periodo:
        resultado.insertId,
    });
  } catch (error) {
    await conexion.rollback();

    console.error(
      'Error al crear periodo:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible crear el periodo de evaluación.',
    });
  } finally {
    conexion.release();
  }
};

const actualizarPeriodo = async (
  req,
  res
) => {
  const idPeriodo = convertirId(
    req.params.id
  );

  if (!idPeriodo) {
    return enviarError(
      res,
      400,
      'id_periodo',
      'El periodo indicado no es válido.'
    );
  }

  const conexion =
    await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const [existentes] =
      await conexion.query(
        `SELECT id_periodo
         FROM periodos_evaluacion
         WHERE id_periodo = ?
         LIMIT 1`,
        [idPeriodo]
      );

    if (existentes.length === 0) {
      await conexion.rollback();

      return enviarError(
        res,
        404,
        'id_periodo',
        'El periodo de evaluación no existe.'
      );
    }

    const validacion =
      await validarPeriodo(
        conexion,
        req.body,
        idPeriodo
      );

    if (!validacion.datos) {
      await conexion.rollback();

      return enviarError(
        res,
        validacion.status,
        validacion.campo,
        validacion.mensaje
      );
    }

    const datos = validacion.datos;

    if (datos.estado === 'Activo') {
      await conexion.query(
        `UPDATE periodos_evaluacion
         SET estado = 'Inactivo'
         WHERE id_ciclo = ?
           AND estado = 'Activo'
           AND id_periodo <> ?`,
        [
          datos.idCiclo,
          idPeriodo,
        ]
      );
    }

    await conexion.query(
      `UPDATE periodos_evaluacion
       SET
         id_ciclo = ?,
         nombre = ?,
         fecha_inicio = ?,
         fecha_fin = ?,
         estado = ?
       WHERE id_periodo = ?`,
      [
        datos.idCiclo,
        datos.nombre,
        datos.fechaInicio,
        datos.fechaFin,
        datos.estado,
        idPeriodo,
      ]
    );

    await conexion.commit();

    return res.status(200).json({
      mensaje:
        'El periodo de evaluación fue actualizado correctamente.',
    });
  } catch (error) {
    await conexion.rollback();

    console.error(
      'Error al actualizar periodo:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible actualizar el periodo de evaluación.',
    });
  } finally {
    conexion.release();
  }
};

const cambiarEstadoPeriodo = async (
  req,
  res
) => {
  const idPeriodo = convertirId(
    req.params.id
  );

  const estado = limpiarTexto(
    req.body.estado
  );

  if (!idPeriodo) {
    return enviarError(
      res,
      400,
      'id_periodo',
      'El periodo indicado no es válido.'
    );
  }

  if (
    !ESTADOS_VALIDOS.includes(estado)
  ) {
    return enviarError(
      res,
      400,
      'estado',
      'El estado seleccionado no es válido.'
    );
  }

  const conexion =
    await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const [periodos] =
      await conexion.query(
        `SELECT
           p.id_ciclo,
           c.estado AS estado_ciclo
         FROM periodos_evaluacion p
         INNER JOIN ciclos_escolares c
           ON c.id_ciclo = p.id_ciclo
         WHERE p.id_periodo = ?
         LIMIT 1`,
        [idPeriodo]
      );

    if (periodos.length === 0) {
      await conexion.rollback();

      return enviarError(
        res,
        404,
        'id_periodo',
        'El periodo de evaluación no existe.'
      );
    }

    if (
      estado === 'Activo' &&
      periodos[0].estado_ciclo !==
        'Activo'
    ) {
      await conexion.rollback();

      return enviarError(
        res,
        400,
        'estado',
        'Solo puedes activar periodos de un ciclo escolar activo.'
      );
    }

    if (estado === 'Activo') {
      await conexion.query(
        `UPDATE periodos_evaluacion
         SET estado = 'Inactivo'
         WHERE id_ciclo = ?
           AND estado = 'Activo'
           AND id_periodo <> ?`,
        [
          periodos[0].id_ciclo,
          idPeriodo,
        ]
      );
    }

    await conexion.query(
      `UPDATE periodos_evaluacion
       SET estado = ?
       WHERE id_periodo = ?`,
      [estado, idPeriodo]
    );

    await conexion.commit();

    return res.status(200).json({
      mensaje:
        `El periodo ahora está ${estado.toLowerCase()}.`,
    });
  } catch (error) {
    await conexion.rollback();

    console.error(
      'Error al cambiar estado del periodo:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible cambiar el estado del periodo.',
    });
  } finally {
    conexion.release();
  }
};

module.exports = {
  obtenerPeriodos,
  obtenerPeriodoActivo,
  crearPeriodo,
  actualizarPeriodo,
  cambiarEstadoPeriodo,
};