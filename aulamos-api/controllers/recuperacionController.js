const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const pool = require('../config/database');

const {
  enviarCodigoRecuperacion,
} = require('../services/emailService');

const expresionCorreo =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const contieneLetra =
  /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;

const contieneNumero = /\d/;

const respuestaGenerica = {
  mensaje:
    'Si el correo está registrado, recibirás un código de recuperación.',
};

const crearHashCodigo = (codigo) => {
  return crypto
    .createHash('sha256')
    .update(codigo)
    .digest('hex');
};

const solicitarRecuperacion = async (
  req,
  res
) => {
  let idTokenCreado = null;

  try {
    const { correo } = req.body;

    const correoLimpio =
      typeof correo === 'string'
        ? correo.trim().toLowerCase()
        : '';

    if (
      !correoLimpio ||
      !expresionCorreo.test(correoLimpio)
    ) {
      return res.status(400).json({
        mensaje:
          'Ingresa un correo electrónico válido',
        campo: 'correo',
      });
    }

    const [usuarios] = await pool.query(
      `SELECT
        id_usuario,
        nombre,
        estado
      FROM usuarios
      WHERE correo = ?
      LIMIT 1`,
      [correoLimpio]
    );

    /*
     * No indicamos si el correo existe.
     * Así evitamos revelar qué cuentas
     * están registradas.
     */
    if (
      usuarios.length === 0 ||
      usuarios[0].estado !== 'Activo'
    ) {
      return res.status(200).json(
        respuestaGenerica
      );
    }

    const usuario = usuarios[0];

    const codigo = crypto
      .randomInt(100000, 1000000)
      .toString();

    const codigoHash =
      crearHashCodigo(codigo);

    /*
     * Invalidar códigos anteriores.
     */
    await pool.query(
      `UPDATE tokens_recuperacion
       SET usado = TRUE
       WHERE id_usuario = ?
         AND usado = FALSE`,
      [usuario.id_usuario]
    );

    const [resultado] = await pool.query(
      `INSERT INTO tokens_recuperacion (
        id_usuario,
        token_hash,
        expira_en,
        usado
      )
      VALUES (
        ?,
        ?,
        DATE_ADD(NOW(), INTERVAL 15 MINUTE),
        FALSE
      )`,
      [
        usuario.id_usuario,
        codigoHash,
      ]
    );

    idTokenCreado = resultado.insertId;

    try {
      await enviarCodigoRecuperacion({
        correo: correoLimpio,
        nombre: usuario.nombre,
        codigo,
      });
    } catch (errorCorreo) {
      /*
       * Si el correo no se pudo enviar,
       * eliminamos el token creado.
       */
      await pool.query(
        `DELETE FROM tokens_recuperacion
         WHERE id_token = ?`,
        [idTokenCreado]
      );

      throw errorCorreo;
    }

    return res.status(200).json(
      respuestaGenerica
    );
  } catch (error) {
    console.error(
      'Error al solicitar recuperación:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible enviar el código de recuperación',
    });
  }
};
const validarCodigoRecuperacion = async (
  req,
  res
) => {
  try {
    const {
      correo,
      codigo,
    } = req.body;

    const correoLimpio =
      typeof correo === 'string'
        ? correo.trim().toLowerCase()
        : '';

    const codigoLimpio =
      typeof codigo === 'string'
        ? codigo.trim()
        : '';

    if (
      !correoLimpio ||
      !expresionCorreo.test(correoLimpio)
    ) {
      return res.status(400).json({
        valido: false,
        mensaje:
          'Ingresa un correo electrónico válido',
        campo: 'correo',
      });
    }

    if (!/^\d{6}$/.test(codigoLimpio)) {
      return res.status(400).json({
        valido: false,
        mensaje:
          'El código debe contener 6 dígitos',
        campo: 'codigo',
      });
    }

    const codigoHash =
      crearHashCodigo(codigoLimpio);

    const [tokens] = await pool.query(
      `SELECT
        tr.id_token
      FROM tokens_recuperacion tr
      INNER JOIN usuarios u
        ON u.id_usuario = tr.id_usuario
      WHERE u.correo = ?
        AND u.estado = 'Activo'
        AND tr.token_hash = ?
        AND tr.usado = FALSE
        AND tr.expira_en > NOW()
      ORDER BY tr.fecha_creacion DESC
      LIMIT 1`,
      [
        correoLimpio,
        codigoHash,
      ]
    );

    if (tokens.length === 0) {
      return res.status(400).json({
        valido: false,
        mensaje:
          'El código es incorrecto, expiró o ya fue utilizado',
        campo: 'codigo',
      });
    }

    return res.status(200).json({
      valido: true,
      mensaje:
        'Código validado correctamente',
    });
  } catch (error) {
    console.error(
      'Error al validar código:',
      error
    );

    return res.status(500).json({
      valido: false,
      mensaje:
        'No fue posible validar el código',
    });
  }
};
const restablecerPassword = async (
  req,
  res
) => {
  let conexion;
  let transaccionActiva = false;

  try {
    const {
      correo,
      codigo,
      nueva_password,
      confirmar_password,
    } = req.body;

    const correoLimpio =
      typeof correo === 'string'
        ? correo.trim().toLowerCase()
        : '';

    const codigoLimpio =
      typeof codigo === 'string'
        ? codigo.trim()
        : '';

    if (
      !correoLimpio ||
      !expresionCorreo.test(correoLimpio)
    ) {
      return res.status(400).json({
        mensaje:
          'Ingresa un correo electrónico válido',
        campo: 'correo',
      });
    }

    if (!/^\d{6}$/.test(codigoLimpio)) {
      return res.status(400).json({
        mensaje:
          'El código debe contener 6 dígitos',
        campo: 'codigo',
      });
    }

    if (
      typeof nueva_password !== 'string' ||
      !nueva_password
    ) {
      return res.status(400).json({
        mensaje:
          'Ingresa la nueva contraseña',
        campo: 'nueva_password',
      });
    }

    if (nueva_password.length < 8) {
      return res.status(400).json({
        mensaje:
          'La contraseña debe tener al menos 8 caracteres',
        campo: 'nueva_password',
      });
    }

    if (nueva_password.length > 64) {
      return res.status(400).json({
        mensaje:
          'La contraseña no puede superar los 64 caracteres',
        campo: 'nueva_password',
      });
    }

    if (
      !contieneLetra.test(nueva_password) ||
      !contieneNumero.test(nueva_password)
    ) {
      return res.status(400).json({
        mensaje:
          'La contraseña debe contener letras y números',
        campo: 'nueva_password',
      });
    }

    if (
      typeof confirmar_password !== 'string' ||
      !confirmar_password
    ) {
      return res.status(400).json({
        mensaje:
          'Confirma la nueva contraseña',
        campo: 'confirmar_password',
      });
    }

    if (
      nueva_password !==
      confirmar_password
    ) {
      return res.status(400).json({
        mensaje:
          'Las contraseñas no coinciden',
        campo: 'confirmar_password',
      });
    }

    const codigoHash =
      crearHashCodigo(codigoLimpio);

    conexion = await pool.getConnection();

    await conexion.beginTransaction();
    transaccionActiva = true;

    const [tokens] = await conexion.query(
      `SELECT
        tr.id_token,
        tr.id_usuario
      FROM tokens_recuperacion tr
      INNER JOIN usuarios u
        ON u.id_usuario = tr.id_usuario
      WHERE u.correo = ?
        AND u.estado = 'Activo'
        AND tr.token_hash = ?
        AND tr.usado = FALSE
        AND tr.expira_en > NOW()
      ORDER BY tr.fecha_creacion DESC
      LIMIT 1
      FOR UPDATE`,
      [
        correoLimpio,
        codigoHash,
      ]
    );

    if (tokens.length === 0) {
      await conexion.rollback();
      transaccionActiva = false;

      return res.status(400).json({
        mensaje:
          'El código es incorrecto, expiró o ya fue utilizado',
        campo: 'codigo',
      });
    }

    const token = tokens[0];

    const passwordHash =
      await bcrypt.hash(
        nueva_password,
        10
      );

    await conexion.query(
      `UPDATE usuarios
       SET password_hash = ?
       WHERE id_usuario = ?`,
      [
        passwordHash,
        token.id_usuario,
      ]
    );

    /*
     * Marcar todos los tokens pendientes
     * del usuario como utilizados.
     */
    await conexion.query(
      `UPDATE tokens_recuperacion
       SET usado = TRUE
       WHERE id_usuario = ?
         AND usado = FALSE`,
      [token.id_usuario]
    );

    await conexion.commit();
    transaccionActiva = false;

    return res.status(200).json({
      mensaje:
        'La contraseña se actualizó correctamente',
    });
  } catch (error) {
    if (
      conexion &&
      transaccionActiva
    ) {
      await conexion.rollback();
    }

    console.error(
      'Error al restablecer contraseña:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No fue posible actualizar la contraseña',
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

module.exports = {
  solicitarRecuperacion,
  validarCodigoRecuperacion,
  restablecerPassword,
};