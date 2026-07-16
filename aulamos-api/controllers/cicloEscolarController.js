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

const idValido = (valor) => {
  const id = Number(valor);

  return (
    Number.isInteger(id) &&
    id > 0
  );
};

const fechaValida = (valor) => {
  if (
    typeof valor !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false;
  }

  const [anio, mes, dia] = valor
    .split('-')
    .map(Number);

  const fecha = new Date(
    Date.UTC(anio, mes - 1, dia)
  );

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
};

const validarCiclo = ({
  nombre,
  fecha_inicio,
  fecha_fin,
  estado,
}) => {
  const nombreLimpio =
    limpiarTexto(nombre);

  if (!nombreLimpio) {
    return {
      valido: false,
      campo: 'nombre',
      mensaje:
        'El nombre del ciclo escolar es obligatorio',
    };
  }

  if (nombreLimpio.length < 4) {
    return {
      valido: false,
      campo: 'nombre',
      mensaje:
        'El nombre del ciclo debe tener al menos 4 caracteres',
    };
  }

  if (nombreLimpio.length > 100) {
    return {
      valido: false,
      campo: 'nombre',
      mensaje:
        'El nombre del ciclo no puede superar los 100 caracteres',
    };
  }

  if (!fechaValida(fecha_inicio)) {
    return {
      valido: false,
      campo: 'fecha_inicio',
      mensaje:
        'La fecha de inicio no es válida. Utiliza el formato AAAA-MM-DD',
    };
  }

  if (!fechaValida(fecha_fin)) {
    return {
      valido: false,
      campo: 'fecha_fin',
      mensaje:
        'La fecha final no es válida. Utiliza el formato AAAA-MM-DD',
    };
  }

  if (fecha_inicio >= fecha_fin) {
    return {
      valido: false,
      campo: 'fecha_fin',
      mensaje:
        'La fecha final debe ser posterior a la fecha de inicio',
    };
  }

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return {
      valido: false,
      campo: 'estado',
      mensaje:
        'El estado debe ser Activo, Inactivo o Cerrado',
    };
  }

  return {
    valido: true,
    datos: {
      nombre: nombreLimpio,
      fecha_inicio,
      fecha_fin,
      estado,
    },
  };
};

const buscarNombreDuplicado = async (
  nombre,
  idExcluir = 0
) => {
  const [resultados] = await pool.query(
    `SELECT id_ciclo
     FROM ciclos_escolares
     WHERE LOWER(nombre) = LOWER(?)
       AND id_ciclo <> ?
     LIMIT 1`,
    [nombre, idExcluir]
  );

  return resultados.length > 0;
};

const buscarCicloSuperpuesto = async (
  fechaInicio,
  fechaFin,
  idExcluir = 0
) => {
  const [resultados] = await pool.query(
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
        ) AS fecha_fin
     FROM ciclos_escolares
     WHERE id_ciclo <> ?
       AND fecha_inicio <= ?
       AND fecha_fin >= ?
     LIMIT 1`,
    [
      idExcluir,
      fechaFin,
      fechaInicio,
    ]
  );

  return resultados[0] || null;
};

const buscarOtroCicloActivo = async (
  idExcluir = 0
) => {
  const [resultados] = await pool.query(
    `SELECT id_ciclo, nombre
     FROM ciclos_escolares
     WHERE estado = 'Activo'
       AND id_ciclo <> ?
     LIMIT 1`,
    [idExcluir]
  );

  return resultados[0] || null;
};

const obtenerCiclos = async (
  req,
  res
) => {
  try {
    const [ciclos] = await pool.query(
      `SELECT
          c.id_ciclo,
          c.nombre,
          DATE_FORMAT(
            c.fecha_inicio,
            '%Y-%m-%d'
          ) AS fecha_inicio,
          DATE_FORMAT(
            c.fecha_fin,
            '%Y-%m-%d'
          ) AS fecha_fin,
          c.estado,
          COUNT(
            DISTINCT p.id_periodo
          ) AS total_periodos,
          COUNT(
            DISTINCT g.id_grupo
          ) AS total_grupos,
          COUNT(
            DISTINCT cu.id_curso
          ) AS total_cursos
       FROM ciclos_escolares c
       LEFT JOIN periodos_evaluacion p
         ON p.id_ciclo = c.id_ciclo
       LEFT JOIN grupos g
         ON g.id_ciclo = c.id_ciclo
       LEFT JOIN cursos cu
         ON cu.id_ciclo = c.id_ciclo
       GROUP BY
          c.id_ciclo,
          c.nombre,
          c.fecha_inicio,
          c.fecha_fin,
          c.estado
       ORDER BY
          c.fecha_inicio DESC`
    );

    return res.status(200).json({
      mensaje:
        'Ciclos escolares obtenidos correctamente',
      total: ciclos.length,
      ciclos,
    });
  } catch (error) {
    console.error(
      'Error al consultar ciclos:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Ocurrió un error al consultar los ciclos escolares',
    });
  }
};

const obtenerCicloActivo = async (
  req,
  res
) => {
  try {
    const [ciclos] = await pool.query(
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
       WHERE estado = 'Activo'
       ORDER BY fecha_inicio DESC
       LIMIT 1`
    );

    if (ciclos.length === 0) {
      return res.status(404).json({
        mensaje:
          'No existe un ciclo escolar activo',
        ciclo: null,
      });
    }

    return res.status(200).json({
      mensaje:
        'Ciclo escolar activo obtenido correctamente',
      ciclo: ciclos[0],
    });
  } catch (error) {
    console.error(
      'Error al consultar ciclo activo:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Ocurrió un error al consultar el ciclo activo',
    });
  }
};

const crearCiclo = async (
  req,
  res
) => {
  try {
    const estadoRecibido =
      limpiarTexto(req.body.estado) ||
      'Inactivo';

    const validacion = validarCiclo({
      nombre: req.body.nombre,
      fecha_inicio:
        req.body.fecha_inicio,
      fecha_fin: req.body.fecha_fin,
      estado: estadoRecibido,
    });

    if (!validacion.valido) {
      return res.status(400).json({
        mensaje: validacion.mensaje,
        campo: validacion.campo,
      });
    }

    const {
      nombre,
      fecha_inicio,
      fecha_fin,
      estado,
    } = validacion.datos;

    const nombreDuplicado =
      await buscarNombreDuplicado(
        nombre
      );

    if (nombreDuplicado) {
      return res.status(409).json({
        mensaje:
          'Ya existe un ciclo escolar con ese nombre',
        campo: 'nombre',
      });
    }

    const cicloSuperpuesto =
      await buscarCicloSuperpuesto(
        fecha_inicio,
        fecha_fin
      );

    if (cicloSuperpuesto) {
      return res.status(409).json({
        mensaje:
          `Las fechas coinciden con el ciclo ${cicloSuperpuesto.nombre}`,
        campo: 'fecha_inicio',
        ciclo_conflicto:
          cicloSuperpuesto,
      });
    }

    if (estado === 'Activo') {
      const cicloActivo =
        await buscarOtroCicloActivo();

      if (cicloActivo) {
        return res.status(409).json({
          mensaje:
            `Ya existe un ciclo activo: ${cicloActivo.nombre}`,
          campo: 'estado',
        });
      }
    }

    const [resultado] =
      await pool.query(
        `INSERT INTO ciclos_escolares
          (
            nombre,
            fecha_inicio,
            fecha_fin,
            estado
          )
         VALUES (?, ?, ?, ?)`,
        [
          nombre,
          fecha_inicio,
          fecha_fin,
          estado,
        ]
      );

    return res.status(201).json({
      mensaje:
        'Ciclo escolar creado correctamente',
      ciclo: {
        id_ciclo:
          resultado.insertId,
        nombre,
        fecha_inicio,
        fecha_fin,
        estado,
      },
    });
  } catch (error) {
    console.error(
      'Error al crear ciclo:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Ocurrió un error al crear el ciclo escolar',
    });
  }
};

const actualizarCiclo = async (
  req,
  res
) => {
  try {
    if (!idValido(req.params.id)) {
      return res.status(400).json({
        mensaje:
          'El identificador del ciclo no es válido',
      });
    }

    const idCiclo =
      Number(req.params.id);

    const [ciclos] =
      await pool.query(
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
      return res.status(404).json({
        mensaje:
          'Ciclo escolar no encontrado',
      });
    }

    const cicloActual = ciclos[0];

    const validacion = validarCiclo({
      nombre:
        req.body.nombre ??
        cicloActual.nombre,
      fecha_inicio:
        req.body.fecha_inicio ??
        cicloActual.fecha_inicio,
      fecha_fin:
        req.body.fecha_fin ??
        cicloActual.fecha_fin,
      estado:
        req.body.estado ??
        cicloActual.estado,
    });

    if (!validacion.valido) {
      return res.status(400).json({
        mensaje: validacion.mensaje,
        campo: validacion.campo,
      });
    }

    const {
      nombre,
      fecha_inicio,
      fecha_fin,
      estado,
    } = validacion.datos;

    const nombreDuplicado =
      await buscarNombreDuplicado(
        nombre,
        idCiclo
      );

    if (nombreDuplicado) {
      return res.status(409).json({
        mensaje:
          'Ya existe otro ciclo escolar con ese nombre',
        campo: 'nombre',
      });
    }

    const cicloSuperpuesto =
      await buscarCicloSuperpuesto(
        fecha_inicio,
        fecha_fin,
        idCiclo
      );

    if (cicloSuperpuesto) {
      return res.status(409).json({
        mensaje:
          `Las fechas coinciden con el ciclo ${cicloSuperpuesto.nombre}`,
        campo: 'fecha_inicio',
        ciclo_conflicto:
          cicloSuperpuesto,
      });
    }

    if (estado === 'Activo') {
      const cicloActivo =
        await buscarOtroCicloActivo(
          idCiclo
        );

      if (cicloActivo) {
        return res.status(409).json({
          mensaje:
            `Ya existe un ciclo activo: ${cicloActivo.nombre}`,
          campo: 'estado',
        });
      }
    }

    await pool.query(
      `UPDATE ciclos_escolares
       SET
          nombre = ?,
          fecha_inicio = ?,
          fecha_fin = ?,
          estado = ?
       WHERE id_ciclo = ?`,
      [
        nombre,
        fecha_inicio,
        fecha_fin,
        estado,
        idCiclo,
      ]
    );

    return res.status(200).json({
      mensaje:
        'Ciclo escolar actualizado correctamente',
      ciclo: {
        id_ciclo: idCiclo,
        nombre,
        fecha_inicio,
        fecha_fin,
        estado,
      },
    });
  } catch (error) {
    console.error(
      'Error al actualizar ciclo:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Ocurrió un error al actualizar el ciclo escolar',
    });
  }
};

const cambiarEstadoCiclo = async (
  req,
  res
) => {
  try {
    if (!idValido(req.params.id)) {
      return res.status(400).json({
        mensaje:
          'El identificador del ciclo no es válido',
      });
    }

    const idCiclo =
      Number(req.params.id);

    const estado =
      limpiarTexto(req.body.estado);

    if (
      !ESTADOS_VALIDOS.includes(
        estado
      )
    ) {
      return res.status(400).json({
        mensaje:
          'El estado debe ser Activo, Inactivo o Cerrado',
        campo: 'estado',
      });
    }

    const [ciclos] =
      await pool.query(
        `SELECT
            id_ciclo,
            nombre,
            estado
         FROM ciclos_escolares
         WHERE id_ciclo = ?
         LIMIT 1`,
        [idCiclo]
      );

    if (ciclos.length === 0) {
      return res.status(404).json({
        mensaje:
          'Ciclo escolar no encontrado',
      });
    }

    if (estado === 'Activo') {
      const cicloActivo =
        await buscarOtroCicloActivo(
          idCiclo
        );

      if (cicloActivo) {
        return res.status(409).json({
          mensaje:
            `No se puede activar porque ya existe el ciclo activo ${cicloActivo.nombre}`,
          campo: 'estado',
        });
      }
    }

    await pool.query(
      `UPDATE ciclos_escolares
       SET estado = ?
       WHERE id_ciclo = ?`,
      [estado, idCiclo]
    );

    return res.status(200).json({
      mensaje:
        'Estado del ciclo actualizado correctamente',
      ciclo: {
        id_ciclo: idCiclo,
        nombre: ciclos[0].nombre,
        estado,
      },
    });
  } catch (error) {
    console.error(
      'Error al cambiar estado:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Ocurrió un error al cambiar el estado del ciclo',
    });
  }
};

module.exports = {
  obtenerCiclos,
  obtenerCicloActivo,
  crearCiclo,
  actualizarCiclo,
  cambiarEstadoCiclo,
};