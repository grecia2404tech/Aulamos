const pool = require('../config/database');

const TURNOS_VALIDOS = [
  'Matutino',
  'Vespertino',
  'Mixto',
];

const MODALIDADES_VALIDAS = [
  'Presencial',
  'Virtual',
  'Hibrida',
];

const ESTADOS_VALIDOS = [
  'Activo',
  'Inactivo',
  'Finalizado',
];

const limpiarTexto = (valor) => {
  if (typeof valor !== 'string') {
    return '';
  }

  return valor.trim().replace(/\s+/g, ' ');
};

const enviarError = (
  res,
  estadoHttp,
  campo,
  mensaje
) => {
  return res.status(estadoHttp).json({
    campo,
    mensaje,
  });
};

const leerDatosGrupo = (body) => ({
  idCiclo: Number(
    body.id_ciclo ?? body.idCiclo
  ),

  idDocente: Number(
    body.id_docente ?? body.idDocente
  ),

  nombre: limpiarTexto(body.nombre),

  grado: limpiarTexto(
    String(body.grado ?? '')
  ),

  turno:
    limpiarTexto(body.turno) ||
    'Matutino',

  modalidad:
    limpiarTexto(body.modalidad) ||
    'Presencial',

  cupo: Number(
    body.cupo ?? body.cupo_maximo
  ),

  estado:
    limpiarTexto(body.estado) ||
    'Activo',
});

const validarDatosGrupo = (datos) => {
  if (
    !Number.isInteger(datos.idCiclo) ||
    datos.idCiclo <= 0
  ) {
    return {
      campo: 'id_ciclo',
      mensaje:
        'Selecciona un ciclo escolar válido',
    };
  }

  if (
    !Number.isInteger(datos.idDocente) ||
    datos.idDocente <= 0
  ) {
    return {
      campo: 'id_docente',
      mensaje:
        'Selecciona un docente válido',
    };
  }

  if (!datos.nombre) {
    return {
      campo: 'nombre',
      mensaje:
        'El nombre del grupo es obligatorio',
    };
  }

  if (datos.nombre.length > 80) {
    return {
      campo: 'nombre',
      mensaje:
        'El nombre no puede superar los 80 caracteres',
    };
  }

  if (!datos.grado) {
    return {
      campo: 'grado',
      mensaje:
        'El grado es obligatorio',
    };
  }

  if (
    !TURNOS_VALIDOS.includes(
      datos.turno
    )
  ) {
    return {
      campo: 'turno',
      mensaje:
        'El turno seleccionado no es válido',
    };
  }

  if (
    !MODALIDADES_VALIDAS.includes(
      datos.modalidad
    )
  ) {
    return {
      campo: 'modalidad',
      mensaje:
        'La modalidad seleccionada no es válida',
    };
  }

  if (
    !Number.isInteger(datos.cupo) ||
    datos.cupo < 1 ||
    datos.cupo > 100
  ) {
    return {
      campo: 'cupo',
      mensaje:
        'El cupo debe estar entre 1 y 100',
    };
  }

  if (
    !ESTADOS_VALIDOS.includes(
      datos.estado
    )
  ) {
    return {
      campo: 'estado',
      mensaje:
        'El estado seleccionado no es válido',
    };
  }

  return null;
};

const validarReferencias = async (
  idCiclo,
  idDocente
) => {
  const [ciclos] = await pool.query(
    `
      SELECT id_ciclo
      FROM ciclos_escolares
      WHERE id_ciclo = ?
      LIMIT 1
    `,
    [idCiclo]
  );

  if (ciclos.length === 0) {
    return {
      campo: 'id_ciclo',
      mensaje:
        'El ciclo escolar seleccionado no existe',
    };
  }

  const [docentes] = await pool.query(
    `
      SELECT u.id_usuario
      FROM usuarios u
      INNER JOIN usuario_roles ur
        ON ur.id_usuario = u.id_usuario
      INNER JOIN roles r
        ON r.id_rol = ur.id_rol
      WHERE u.id_usuario = ?
        AND u.estado = 'Activo'
        AND r.nombre = 'Docente'
      LIMIT 1
    `,
    [idDocente]
  );

  if (docentes.length === 0) {
    return {
      campo: 'id_docente',
      mensaje:
        'El docente no existe, está inactivo o no tiene el rol Docente',
    };
  }

  return null;
};

/*
 * OBTENER TODOS LOS GRUPOS
 */
const obtenerGrupos = async (
  req,
  res
) => {
  try {
    const [grupos] = await pool.query(`
      SELECT
        g.id_grupo,
        g.id_ciclo,
        g.id_docente,
        g.nombre,
        g.grado,
        g.turno,
        g.modalidad,
        g.cupo_maximo AS cupo,
        g.estado,

        ce.nombre AS nombre_ciclo,

        CONCAT_WS(
          ' ',
          u.nombre,
          u.apellido_paterno,
          u.apellido_materno
        ) AS nombre_docente,

        (
          SELECT COUNT(*)
          FROM cursos c
          WHERE c.id_grupo = g.id_grupo
        ) AS total_cursos

      FROM grupos g

      LEFT JOIN ciclos_escolares ce
        ON ce.id_ciclo = g.id_ciclo

      LEFT JOIN usuarios u
        ON u.id_usuario = g.id_docente

      ORDER BY
        g.grado ASC,
        g.nombre ASC
    `);

    return res.status(200).json({
      grupos,
    });
  } catch (error) {
    console.error(
      'Error al consultar grupos:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible consultar los grupos',
      detalle:
        error.sqlMessage || error.message,
    });
  }
};

/*
 * OBTENER GRUPOS ACTIVOS
 */
const obtenerGruposActivos = async (
  req,
  res
) => {
  try {
    const [grupos] = await pool.query(`
      SELECT
        g.id_grupo,
        g.id_ciclo,
        g.id_docente,
        g.nombre,
        g.grado,
        g.turno,
        g.modalidad,
        g.cupo_maximo AS cupo,
        g.estado
      FROM grupos g
      WHERE g.estado = 'Activo'
      ORDER BY
        g.grado ASC,
        g.nombre ASC
    `);

    return res.status(200).json({
      grupos,
    });
  } catch (error) {
    console.error(
      'Error al consultar grupos activos:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible consultar los grupos activos',
      detalle:
        error.sqlMessage || error.message,
    });
  }
};

/*
 * OBTENER DOCENTES ACTIVOS
 */
const obtenerDocentesActivos = async (
  req,
  res
) => {
  try {
    const [docentes] = await pool.query(`
      SELECT DISTINCT
        u.id_usuario AS id_docente,
        u.nombre,
        u.apellido_paterno,
        u.apellido_materno,
        u.correo,

        CONCAT_WS(
          ' ',
          u.nombre,
          u.apellido_paterno,
          u.apellido_materno
        ) AS nombre_completo

      FROM usuarios u

      INNER JOIN usuario_roles ur
        ON ur.id_usuario = u.id_usuario

      INNER JOIN roles r
        ON r.id_rol = ur.id_rol

      WHERE u.estado = 'Activo'
        AND r.nombre = 'Docente'

      ORDER BY
        u.apellido_paterno ASC,
        u.apellido_materno ASC,
        u.nombre ASC
    `);

    return res.status(200).json({
      docentes,
    });
  } catch (error) {
    console.error(
      'Error al consultar docentes activos:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible consultar los docentes activos',
      detalle:
        error.sqlMessage || error.message,
    });
  }
};

/*
 * CREAR GRUPO
 */
const crearGrupo = async (
  req,
  res
) => {
  try {
    const datos = leerDatosGrupo(
      req.body
    );

    const errorValidacion =
      validarDatosGrupo(datos);

    if (errorValidacion) {
      return enviarError(
        res,
        400,
        errorValidacion.campo,
        errorValidacion.mensaje
      );
    }

    const errorReferencia =
      await validarReferencias(
        datos.idCiclo,
        datos.idDocente
      );

    if (errorReferencia) {
      return enviarError(
        res,
        400,
        errorReferencia.campo,
        errorReferencia.mensaje
      );
    }

    const [duplicados] =
      await pool.query(
        `
          SELECT id_grupo
          FROM grupos
          WHERE id_ciclo = ?
            AND LOWER(nombre) = LOWER(?)
            AND grado = ?
            AND turno = ?
          LIMIT 1
        `,
        [
          datos.idCiclo,
          datos.nombre,
          datos.grado,
          datos.turno,
        ]
      );

    if (duplicados.length > 0) {
      return enviarError(
        res,
        409,
        'nombre',
        'Ya existe ese grupo en el ciclo, grado y turno seleccionados'
      );
    }

    const [resultado] =
      await pool.query(
        `
          INSERT INTO grupos (
            id_ciclo,
            id_docente,
            nombre,
            grado,
            turno,
            modalidad,
            cupo_maximo,
            estado
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          datos.idCiclo,
          datos.idDocente,
          datos.nombre,
          datos.grado,
          datos.turno,
          datos.modalidad,
          datos.cupo,
          datos.estado,
        ]
      );

    const [gruposCreados] =
      await pool.query(
        `
          SELECT
            id_grupo,
            id_ciclo,
            id_docente,
            nombre,
            grado,
            turno,
            modalidad,
            cupo_maximo AS cupo,
            estado
          FROM grupos
          WHERE id_grupo = ?
        `,
        [resultado.insertId]
      );

    return res.status(201).json({
      mensaje:
        'El grupo fue registrado correctamente',
      grupo: gruposCreados[0],
    });
  } catch (error) {
    console.error(
      'Error al crear grupo:',
      error
    );

    if (
      error.code === 'ER_DUP_ENTRY'
    ) {
      return enviarError(
        res,
        409,
        'nombre',
        'Ya existe un grupo con esos datos'
      );
    }

    return res.status(500).json({
      mensaje:
        'No fue posible registrar el grupo',
      detalle:
        error.sqlMessage || error.message,
    });
  }
};

/*
 * ACTUALIZAR GRUPO
 */
const actualizarGrupo = async (
  req,
  res
) => {
  try {
    const idGrupo = Number(
      req.params.id
    );

    if (
      !Number.isInteger(idGrupo) ||
      idGrupo <= 0
    ) {
      return enviarError(
        res,
        400,
        'id_grupo',
        'El identificador del grupo no es válido'
      );
    }

    const datos = leerDatosGrupo(
      req.body
    );

    const errorValidacion =
      validarDatosGrupo(datos);

    if (errorValidacion) {
      return enviarError(
        res,
        400,
        errorValidacion.campo,
        errorValidacion.mensaje
      );
    }

    const [gruposEncontrados] =
      await pool.query(
        `
          SELECT id_grupo
          FROM grupos
          WHERE id_grupo = ?
          LIMIT 1
        `,
        [idGrupo]
      );

    if (
      gruposEncontrados.length === 0
    ) {
      return enviarError(
        res,
        404,
        'id_grupo',
        'El grupo no existe'
      );
    }

    const errorReferencia =
      await validarReferencias(
        datos.idCiclo,
        datos.idDocente
      );

    if (errorReferencia) {
      return enviarError(
        res,
        400,
        errorReferencia.campo,
        errorReferencia.mensaje
      );
    }

    const [duplicados] =
      await pool.query(
        `
          SELECT id_grupo
          FROM grupos
          WHERE id_ciclo = ?
            AND LOWER(nombre) = LOWER(?)
            AND grado = ?
            AND turno = ?
            AND id_grupo <> ?
          LIMIT 1
        `,
        [
          datos.idCiclo,
          datos.nombre,
          datos.grado,
          datos.turno,
          idGrupo,
        ]
      );

    if (duplicados.length > 0) {
      return enviarError(
        res,
        409,
        'nombre',
        'Ya existe otro grupo con esos datos'
      );
    }

    await pool.query(
      `
        UPDATE grupos
        SET
          id_ciclo = ?,
          id_docente = ?,
          nombre = ?,
          grado = ?,
          turno = ?,
          modalidad = ?,
          cupo_maximo = ?,
          estado = ?
        WHERE id_grupo = ?
      `,
      [
        datos.idCiclo,
        datos.idDocente,
        datos.nombre,
        datos.grado,
        datos.turno,
        datos.modalidad,
        datos.cupo,
        datos.estado,
        idGrupo,
      ]
    );

    const [gruposActualizados] =
      await pool.query(
        `
          SELECT
            id_grupo,
            id_ciclo,
            id_docente,
            nombre,
            grado,
            turno,
            modalidad,
            cupo_maximo AS cupo,
            estado
          FROM grupos
          WHERE id_grupo = ?
        `,
        [idGrupo]
      );

    return res.status(200).json({
      mensaje:
        'El grupo fue actualizado correctamente',
      grupo: gruposActualizados[0],
    });
  } catch (error) {
    console.error(
      'Error al actualizar grupo:',
      error
    );

    if (
      error.code === 'ER_DUP_ENTRY'
    ) {
      return enviarError(
        res,
        409,
        'nombre',
        'Ya existe otro grupo con esos datos'
      );
    }

    return res.status(500).json({
      mensaje:
        'No fue posible actualizar el grupo',
      detalle:
        error.sqlMessage || error.message,
    });
  }
};

/*
 * CAMBIAR ESTADO DEL GRUPO
 */
const cambiarEstadoGrupo = async (
  req,
  res
) => {
  try {
    const idGrupo = Number(
      req.params.id
    );

    const estado = limpiarTexto(
      req.body.estado
    );

    if (
      !Number.isInteger(idGrupo) ||
      idGrupo <= 0
    ) {
      return enviarError(
        res,
        400,
        'id_grupo',
        'El identificador del grupo no es válido'
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
          UPDATE grupos
          SET estado = ?
          WHERE id_grupo = ?
        `,
        [
          estado,
          idGrupo,
        ]
      );

    if (
      resultado.affectedRows === 0
    ) {
      return enviarError(
        res,
        404,
        'id_grupo',
        'El grupo no existe'
      );
    }

    return res.status(200).json({
      mensaje:
        `El grupo ahora está ${estado.toLowerCase()}`,
    });
  } catch (error) {
    console.error(
      'Error al cambiar estado del grupo:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible cambiar el estado del grupo',
      detalle:
        error.sqlMessage || error.message,
    });
  }
};

module.exports = {
  obtenerGrupos,
  obtenerGruposActivos,
  obtenerDocentesActivos,
  crearGrupo,
  actualizarGrupo,
  cambiarEstadoGrupo,
};