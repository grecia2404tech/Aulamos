const pool = require('../config/database');

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


const convertirId = (valor) => {
  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero <= 0) {
    return null;
  }

  return numero;
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

const validarDatosCurso = async (
  conexion,
  datos,
  idCursoExcluir = null
) => {
  const idMateria = convertirId(
    datos.id_materia
  );

  const idGrupo = convertirId(
    datos.id_grupo
  );

  /*
   * id_docente corresponde a:
   * usuarios.id_usuario
   */
  const idDocente = convertirId(
    datos.id_docente
  );

  const idCiclo = convertirId(
    datos.id_ciclo
  );

  const nombre = limpiarTexto(
    datos.nombre
  );

  const descripcion = limpiarTexto(
    datos.descripcion
  );

  const estado =
    limpiarTexto(datos.estado) ||
    'Activo';

  if (!idMateria) {
    return {
      status: 400,
      campo: 'id_materia',
      mensaje:
        'Selecciona una materia válida',
    };
  }

  if (!idGrupo) {
    return {
      status: 400,
      campo: 'id_grupo',
      mensaje:
        'Selecciona un grupo válido',
    };
  }

  if (!idDocente) {
    return {
      status: 400,
      campo: 'id_docente',
      mensaje:
        'Selecciona un docente válido',
    };
  }

  if (!idCiclo) {
    return {
      status: 400,
      campo: 'id_ciclo',
      mensaje:
        'Selecciona un ciclo escolar válido',
    };
  }

  if (!nombre) {
    return {
      status: 400,
      campo: 'nombre',
      mensaje:
        'El nombre del curso es obligatorio',
    };
  }

  if (
    nombre.length < 2 ||
    nombre.length > 150
  ) {
    return {
      status: 400,
      campo: 'nombre',
      mensaje:
        'El nombre debe tener entre 2 y 150 caracteres',
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

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return {
      status: 400,
      campo: 'estado',
      mensaje:
        'El estado seleccionado no es válido',
    };
  }

  /*
   * Verificar ciclo escolar.
   */
  const [ciclos] = await conexion.query(
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
    return {
      status: 404,
      campo: 'id_ciclo',
      mensaje:
        'El ciclo escolar seleccionado no existe',
    };
  }

  if (ciclos[0].estado === 'Cerrado') {
    return {
      status: 400,
      campo: 'id_ciclo',
      mensaje:
        'No puedes asignar cursos a un ciclo cerrado',
    };
  }

  /*
   * Verificar materia.
   */
  const [materias] = await conexion.query(
    `SELECT
        id_materia,
        nombre,
        estado
     FROM materias
     WHERE id_materia = ?
     LIMIT 1`,
    [idMateria]
  );

  if (materias.length === 0) {
    return {
      status: 404,
      campo: 'id_materia',
      mensaje:
        'La materia seleccionada no existe',
    };
  }

  if (materias[0].estado !== 'Activa') {
    return {
      status: 400,
      campo: 'id_materia',
      mensaje:
        'Solo puedes asignar materias activas',
    };
  }

  /*
   * Verificar grupo y ciclo.
   */
  const [grupos] = await conexion.query(
    `SELECT
        id_grupo,
        id_ciclo,
        nombre,
        estado
     FROM grupos
     WHERE id_grupo = ?
     LIMIT 1`,
    [idGrupo]
  );

  if (grupos.length === 0) {
    return {
      status: 404,
      campo: 'id_grupo',
      mensaje:
        'El grupo seleccionado no existe',
    };
  }

  if (
    Number(grupos[0].id_ciclo) !==
    idCiclo
  ) {
    return {
      status: 400,
      campo: 'id_grupo',
      mensaje:
        'El grupo seleccionado no pertenece al ciclo escolar',
    };
  }

  if (grupos[0].estado !== 'Activo') {
    return {
      status: 400,
      campo: 'id_grupo',
      mensaje:
        'Solo puedes asignar cursos a grupos activos',
    };
  }

  /*
   * Verificar que el id_docente pertenezca
   * a un usuario con rol Docente.
   */
  const [docentes] = await conexion.query(
    `SELECT DISTINCT
        u.id_usuario,
        u.estado
     FROM usuarios u
     INNER JOIN usuario_roles ur
       ON ur.id_usuario = u.id_usuario
     INNER JOIN roles r
       ON r.id_rol = ur.id_rol
     WHERE u.id_usuario = ?
       AND u.estado = 'Activo'
       AND r.nombre = 'Docente'
     LIMIT 1`,
    [idDocente]
  );

  if (docentes.length === 0) {
    return {
      status: 400,
      campo: 'id_docente',
      mensaje:
        'El usuario seleccionado no es un docente activo',
    };
  }

  /*
   * Evitar que la misma materia se asigne
   * dos veces al mismo grupo y ciclo.
   */
  const parametrosDuplicado = [
    idMateria,
    idGrupo,
    idCiclo,
  ];

  let consultaDuplicado = `
    SELECT id_curso
    FROM cursos
    WHERE id_materia = ?
      AND id_grupo = ?
      AND id_ciclo = ?
  `;

  if (idCursoExcluir) {
    consultaDuplicado +=
      ' AND id_curso <> ?';

    parametrosDuplicado.push(
      idCursoExcluir
    );
  }

  consultaDuplicado += ' LIMIT 1';

  const [duplicados] =
    await conexion.query(
      consultaDuplicado,
      parametrosDuplicado
    );

  if (duplicados.length > 0) {
    return {
      status: 409,
      campo: 'id_materia',
      mensaje:
        'La materia ya está asignada a ese grupo dentro del ciclo escolar',
    };
  }

  return {
    datos: {
      idMateria,
      idGrupo,
      idDocente,
      idCiclo,
      nombre,
      descripcion:
        descripcion || null,
      estado,
    },
  };
};

const consultaBaseCursos = `
  SELECT
    c.id_curso,
    c.id_materia,
    c.id_grupo,
    c.id_docente,
    c.id_ciclo,
    c.nombre,
    c.descripcion,
    c.estado,

    m.nombre AS materia,
    m.campo_formativo,

    g.nombre AS grupo,
    g.grado,
    g.turno,
    g.modalidad,

    ce.nombre AS ciclo,

    CONCAT_WS(
      ' ',
      u.nombre,
      u.apellido_paterno,
      u.apellido_materno
    ) AS docente,

    u.correo AS correo_docente

  FROM cursos c

  INNER JOIN materias m
    ON m.id_materia = c.id_materia

  INNER JOIN grupos g
    ON g.id_grupo = c.id_grupo

  INNER JOIN ciclos_escolares ce
    ON ce.id_ciclo = c.id_ciclo

  INNER JOIN usuarios u
    ON u.id_usuario = c.id_docente
`;

const obtenerCursos = async (
  req,
  res
) => {
  try {
    const [cursos] = await pool.query(
      `${consultaBaseCursos}
       ORDER BY
         ce.fecha_inicio DESC,
         g.grado ASC,
         g.nombre ASC,
         m.nombre ASC`
    );

    return res.status(200).json({
      mensaje:
        'Cursos obtenidos correctamente',
      cursos,
    });
  } catch (error) {
    console.error(
      'Error al obtener cursos:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible obtener los cursos',
    });
  }
};

const obtenerCursosActivos = async (
  req,
  res
) => {
  try {
    const [cursos] = await pool.query(
      `${consultaBaseCursos}
       WHERE c.estado = 'Activo'
       ORDER BY
         ce.fecha_inicio DESC,
         g.grado ASC,
         g.nombre ASC,
         m.nombre ASC`
    );

    return res.status(200).json({
      mensaje:
        'Cursos activos obtenidos correctamente',
      cursos,
    });
  } catch (error) {
    console.error(
      'Error al obtener cursos activos:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible obtener los cursos activos',
    });
  }
};

const crearCurso = async (
  req,
  res
) => {
  let conexion;
  let transaccionActiva = false;

  try {
    conexion =
      await pool.getConnection();

    await conexion.beginTransaction();

    transaccionActiva = true;

    const validacion =
      await validarDatosCurso(
        conexion,
        req.body
      );

    if (validacion.status) {
      await conexion.rollback();

      transaccionActiva = false;

      return enviarError(
        res,
        validacion.status,
        validacion.campo,
        validacion.mensaje
      );
    }

    const {
      idMateria,
      idGrupo,
      idDocente,
      idCiclo,
      nombre,
      descripcion,
      estado,
    } = validacion.datos;

    const [resultado] =
      await conexion.query(
        `INSERT INTO cursos (
          id_materia,
          id_grupo,
          id_docente,
          id_ciclo,
          nombre,
          descripcion,
          estado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          idMateria,
          idGrupo,
          idDocente,
          idCiclo,
          nombre,
          descripcion,
          estado,
        ]
      );

    await conexion.commit();

    transaccionActiva = false;

    return res.status(201).json({
      mensaje:
        'Curso creado correctamente',

      curso: {
        id_curso:
          resultado.insertId,

        id_materia:
          idMateria,

        id_grupo:
          idGrupo,

        id_docente:
          idDocente,

        id_ciclo:
          idCiclo,

        nombre,
        descripcion,
        estado,
      },
    });
  } catch (error) {
    if (
      conexion &&
      transaccionActiva
    ) {
      await conexion.rollback();
    }

    console.error(
      'Error al crear curso:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible crear el curso',
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

const actualizarCurso = async (
  req,
  res
) => {
  let conexion;
  let transaccionActiva = false;

  try {
    const idCurso = convertirId(
      req.params.id
    );

    if (!idCurso) {
      return enviarError(
        res,
        400,
        'id_curso',
        'El identificador del curso no es válido'
      );
    }

    conexion =
      await pool.getConnection();

    await conexion.beginTransaction();

    transaccionActiva = true;

    const [cursos] =
      await conexion.query(
        `SELECT id_curso
         FROM cursos
         WHERE id_curso = ?
         LIMIT 1`,
        [idCurso]
      );

    if (cursos.length === 0) {
      await conexion.rollback();

      transaccionActiva = false;

      return enviarError(
        res,
        404,
        'id_curso',
        'El curso no existe'
      );
    }

    const validacion =
      await validarDatosCurso(
        conexion,
        req.body,
        idCurso
      );

    if (validacion.status) {
      await conexion.rollback();

      transaccionActiva = false;

      return enviarError(
        res,
        validacion.status,
        validacion.campo,
        validacion.mensaje
      );
    }

    const {
      idMateria,
      idGrupo,
      idDocente,
      idCiclo,
      nombre,
      descripcion,
      estado,
    } = validacion.datos;

    await conexion.query(
      `UPDATE cursos
       SET
         id_materia = ?,
         id_grupo = ?,
         id_docente = ?,
         id_ciclo = ?,
         nombre = ?,
         descripcion = ?,
         estado = ?
       WHERE id_curso = ?`,
      [
        idMateria,
        idGrupo,
        idDocente,
        idCiclo,
        nombre,
        descripcion,
        estado,
        idCurso,
      ]
    );

    await conexion.commit();

    transaccionActiva = false;

    return res.status(200).json({
      mensaje:
        'Curso actualizado correctamente',
    });
  } catch (error) {
    if (
      conexion &&
      transaccionActiva
    ) {
      await conexion.rollback();
    }

    console.error(
      'Error al actualizar curso:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible actualizar el curso',
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

const cambiarEstadoCurso = async (
  req,
  res
) => {
  try {
    const idCurso = convertirId(
      req.params.id
    );

    const estado = limpiarTexto(
      req.body.estado
    );

    if (!idCurso) {
      return enviarError(
        res,
        400,
        'id_curso',
        'El identificador del curso no es válido'
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

    const [cursos] = await pool.query(
      `SELECT
          c.id_curso,
          m.estado AS estado_materia,
          g.estado AS estado_grupo,
          ce.estado AS estado_ciclo,
          u.estado AS estado_docente
       FROM cursos c
       INNER JOIN materias m
         ON m.id_materia = c.id_materia
       INNER JOIN grupos g
         ON g.id_grupo = c.id_grupo
       INNER JOIN ciclos_escolares ce
         ON ce.id_ciclo = c.id_ciclo
       INNER JOIN usuarios u
         ON u.id_usuario = c.id_docente
       WHERE c.id_curso = ?
       LIMIT 1`,
      [idCurso]
    );

    if (cursos.length === 0) {
      return enviarError(
        res,
        404,
        'id_curso',
        'El curso no existe'
      );
    }

    if (estado === 'Activo') {
      const curso = cursos[0];

      if (
        curso.estado_ciclo ===
        'Cerrado'
      ) {
        return enviarError(
          res,
          400,
          'estado',
          'No puedes activar un curso de un ciclo cerrado'
        );
      }

      if (
        curso.estado_materia !==
        'Activa'
      ) {
        return enviarError(
          res,
          400,
          'estado',
          'No puedes activar un curso con una materia inactiva'
        );
      }

      if (
        curso.estado_grupo !==
        'Activo'
      ) {
        return enviarError(
          res,
          400,
          'estado',
          'No puedes activar un curso de un grupo inactivo'
        );
      }

      if (
        curso.estado_docente !==
        'Activo'
      ) {
        return enviarError(
          res,
          400,
          'estado',
          'No puedes activar un curso cuyo docente está inactivo'
        );
      }
    }

    await pool.query(
      `UPDATE cursos
       SET estado = ?
       WHERE id_curso = ?`,
      [
        estado,
        idCurso,
      ]
    );

    return res.status(200).json({
      mensaje:
        `El curso ahora está ${estado.toLowerCase()}`,
    });
  } catch (error) {
    console.error(
      'Error al cambiar estado de curso:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible cambiar el estado del curso',
    });
  }
};

module.exports = {
  obtenerCursos,
  obtenerCursosActivos,
  crearCurso,
  actualizarCurso,
  cambiarEstadoCurso,
};