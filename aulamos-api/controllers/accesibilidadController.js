const pool = require('../config/database');

const TAMANOS_TEXTO = new Set([
  'Pequeño',
  'Normal',
  'Grande',
  'Muy Grande',
]);

const CAMPOS_BOOLEANOS = new Set([
  'alto_contraste',
  'modo_oscuro',
  'fuente_dislexia',
  'lector_pantalla',
  'subtitulos',
  'animaciones',
  'navegacion_teclado',
]);

const CAMPOS_PERMITIDOS = [
  'alto_contraste',
  'modo_oscuro',
  'tamano_texto',
  'fuente_dislexia',
  'lector_pantalla',
  'velocidad_lectura',
  'subtitulos',
  'idioma',
  'animaciones',
  'navegacion_teclado',
];

const CONSULTA_PREFERENCIAS = `
  SELECT
    id_preferencia,
    id_usuario,
    alto_contraste,
    modo_oscuro,
    tamano_texto,
    fuente_dislexia,
    lector_pantalla,
    velocidad_lectura,
    subtitulos,
    idioma,
    animaciones,
    navegacion_teclado,
    fecha_actualizacion
  FROM preferencias_accesibilidad
  WHERE id_usuario = ?
  LIMIT 1
`;

const asegurarFilaPreferencias = async (
  idUsuario
) => {
  await pool.query(
    `
      INSERT IGNORE INTO preferencias_accesibilidad
        (id_usuario)
      VALUES (?)
    `,
    [idUsuario]
  );
};

const normalizarBooleano = (valor) => {
  if (
    valor === true ||
    valor === 1 ||
    valor === '1'
  ) {
    return 1;
  }

  if (
    valor === false ||
    valor === 0 ||
    valor === '0'
  ) {
    return 0;
  }

  return null;
};

const validarYNormalizarCampo = (
  campo,
  valor
) => {
  if (CAMPOS_BOOLEANOS.has(campo)) {
    const valorNormalizado =
      normalizarBooleano(valor);

    if (valorNormalizado === null) {
      return {
        error: `${campo} debe ser verdadero o falso`,
      };
    }

    return { valor: valorNormalizado };
  }

  if (campo === 'tamano_texto') {
    if (!TAMANOS_TEXTO.has(valor)) {
      return {
        error:
          'tamano_texto debe ser Pequeño, Normal, Grande o Muy Grande',
      };
    }

    return { valor };
  }

  if (campo === 'velocidad_lectura') {
    const numero = Number(valor);

    if (
      !Number.isFinite(numero) ||
      numero <= 0 ||
      numero > 9.9
    ) {
      return {
        error:
          'velocidad_lectura debe ser un número mayor que 0 y menor o igual que 9.9',
      };
    }

    return {
      valor: Number(numero.toFixed(1)),
    };
  }

  if (campo === 'idioma') {
    if (
      typeof valor !== 'string' ||
      !valor.trim() ||
      valor.trim().length > 50
    ) {
      return {
        error:
          'idioma debe contener entre 1 y 50 caracteres',
      };
    }

    return { valor: valor.trim() };
  }

  return {
    error: `El campo ${campo} no es válido`,
  };
};

const obtenerPreferencias = async (
  req,
  res
) => {
  try {
    const idUsuario =
      req.usuario.id_usuario;

    await asegurarFilaPreferencias(
      idUsuario
    );

    const [filas] = await pool.query(
      CONSULTA_PREFERENCIAS,
      [idUsuario]
    );

    return res.status(200).json({
      preferencias: filas[0],
    });
  } catch (error) {
    console.error(
      'Error al obtener preferencias de accesibilidad:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible obtener las preferencias de accesibilidad',
    });
  }
};

const actualizarPreferencias = async (
  req,
  res
) => {
  try {
    const idUsuario =
      req.usuario.id_usuario;

    const asignaciones = [];
    const valores = [];

    for (const campo of CAMPOS_PERMITIDOS) {
      if (req.body[campo] === undefined) {
        continue;
      }

      const resultado =
        validarYNormalizarCampo(
          campo,
          req.body[campo]
        );

      if (resultado.error) {
        return res.status(400).json({
          mensaje: resultado.error,
        });
      }

      asignaciones.push(`${campo} = ?`);
      valores.push(resultado.valor);
    }

    if (asignaciones.length === 0) {
      return res.status(400).json({
        mensaje:
          'No se proporcionaron preferencias válidas para actualizar',
      });
    }

    await asegurarFilaPreferencias(
      idUsuario
    );

    valores.push(idUsuario);

    await pool.query(
      `
        UPDATE preferencias_accesibilidad
        SET ${asignaciones.join(', ')}
        WHERE id_usuario = ?
      `,
      valores
    );

    const [filas] = await pool.query(
      CONSULTA_PREFERENCIAS,
      [idUsuario]
    );

    return res.status(200).json({
      mensaje:
        'Preferencias actualizadas correctamente',
      preferencias: filas[0],
    });
  } catch (error) {
    console.error(
      'Error al actualizar preferencias de accesibilidad:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible actualizar las preferencias de accesibilidad',
    });
  }
};

module.exports = {
  obtenerPreferencias,
  actualizarPreferencias,
};
