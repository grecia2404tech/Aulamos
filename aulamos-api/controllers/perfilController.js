const bcrypt = require('bcryptjs');

const pool = require('../config/database');

const fs = require('fs');
const path = require('path');

// =====================================================
// OBTENER ID DEL USUARIO AUTENTICADO
// =====================================================

const obtenerIdUsuario = (req) => {
  const idUsuario =
    Number(
      req.usuario?.id_usuario
    );

  return Number.isInteger(idUsuario)
    && idUsuario > 0
    ? idUsuario
    : null;
};


// =====================================================
// OBTENER PERFIL
// =====================================================

const obtenerPerfil = async (
  req,
  res
) => {
  try {
    const idUsuario =
      obtenerIdUsuario(req);

    if (!idUsuario) {
      return res.status(401).json({
        mensaje:
          'No se pudo identificar al usuario autenticado.',
      });
    }

    const [usuarios] =
      await pool.query(
        `
        SELECT
          u.id_usuario,
          u.nombre,
          u.apellido_paterno,
          u.apellido_materno,
          u.correo,
          u.datos_perfil,
          u.estado,
          u.foto_perfil,

          DATE_FORMAT(
            u.fecha_registro,
            '%Y-%m-%d %H:%i:%s'
          ) AS fecha_registro,

          DATE_FORMAT(
            u.fecha_actualizacion,
            '%Y-%m-%d %H:%i:%s'
          ) AS fecha_actualizacion,

          DATE_FORMAT(
            u.ultimo_acceso,
            '%Y-%m-%d %H:%i:%s'
          ) AS ultimo_acceso,

          GROUP_CONCAT(
            DISTINCT r.nombre
            ORDER BY r.nombre
            SEPARATOR ', '
          ) AS roles

        FROM usuarios u

        LEFT JOIN usuario_roles ur
          ON ur.id_usuario =
             u.id_usuario

        LEFT JOIN roles r
          ON r.id_rol =
             ur.id_rol

        WHERE u.id_usuario = ?

        GROUP BY
          u.id_usuario,
          u.nombre,
          u.apellido_paterno,
          u.apellido_materno,
          u.correo,
          u.datos_perfil,
          u.estado,
          u.fecha_registro,
          u.fecha_actualizacion,
          u.ultimo_acceso

        LIMIT 1
        `,
        [
          idUsuario,
        ]
      );

    if (
      usuarios.length === 0
    ) {
      return res.status(404).json({
        mensaje:
          'No se encontró el perfil del usuario.',
      });
    }

    const usuario =
      usuarios[0];

    let datosPerfil = {};

    if (
      usuario.datos_perfil
    ) {
      try {
        datosPerfil =
          typeof usuario.datos_perfil ===
          'string'
            ? JSON.parse(
                usuario.datos_perfil
              )
            : usuario.datos_perfil;
      } catch {
        datosPerfil = {};
      }
    }

    return res.status(200).json({
      mensaje:
        'Perfil obtenido correctamente.',

      perfil: {
        idUsuario:
          Number(
            usuario.id_usuario
          ),

        nombre:
          usuario.nombre,

        apellidoPaterno:
          usuario.apellido_paterno,

        apellidoMaterno:
          usuario.apellido_materno,

        nombreCompleto:
          [
            usuario.nombre,
            usuario.apellido_paterno,
            usuario.apellido_materno,
          ]
            .filter(Boolean)
            .join(' '),

        correo:
          usuario.correo,
        
           fotoPerfil:
            usuario.foto_perfil,


        rol:
          req.usuario?.rol
          || usuario.roles
          || '',

        roles:
          usuario.roles
            ? usuario.roles
                .split(',')
                .map(
                  (rol) =>
                    rol.trim()
                )
            : [],

        estado:
          usuario.estado,

        fechaRegistro:
          usuario.fecha_registro,

        fechaActualizacion:
          usuario.fecha_actualizacion,

        ultimoAcceso:
          usuario.ultimo_acceso,

        datosPerfil,
      },
    });

  } catch (error) {
    console.error(
      'Error al obtener perfil:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo obtener el perfil.',
    });
  }
};


// =====================================================
// ACTUALIZAR PERFIL
// =====================================================

const actualizarPerfil = async (
  req,
  res
) => {
  try {
    const idUsuario =
      obtenerIdUsuario(req);

    if (!idUsuario) {
      return res.status(401).json({
        mensaje:
          'No se pudo identificar al usuario autenticado.',
      });
    }

    const {
      nombre,
      apellido_paterno,
      apellido_materno = '',
      correo,
      datos_perfil,
    } = req.body || {};


    // =================================================
    // VALIDACIONES
    // =================================================

    if (
      typeof nombre !== 'string'
      ||
      !nombre.trim()
    ) {
      return res.status(400).json({
        mensaje:
          'El nombre es obligatorio.',
      });
    }

    if (
      typeof apellido_paterno
        !== 'string'
      ||
      !apellido_paterno.trim()
    ) {
      return res.status(400).json({
        mensaje:
          'El apellido paterno es obligatorio.',
      });
    }

    if (
      typeof correo !== 'string'
      ||
      !correo.trim()
    ) {
      return res.status(400).json({
        mensaje:
          'El correo es obligatorio.',
      });
    }


    const correoLimpio =
      correo
        .trim()
        .toLowerCase();


    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !correoValido.test(
        correoLimpio
      )
    ) {
      return res.status(400).json({
        mensaje:
          'El correo electrónico no es válido.',
      });
    }


    // =================================================
    // VERIFICAR CORREO DUPLICADO
    // =================================================

    const [correoExistente] =
      await pool.query(
        `
        SELECT id_usuario
        FROM usuarios
        WHERE correo = ?
          AND id_usuario <> ?
        LIMIT 1
        `,
        [
          correoLimpio,
          idUsuario,
        ]
      );

    if (
      correoExistente.length > 0
    ) {
      return res.status(409).json({
        mensaje:
          'El correo ya está registrado por otro usuario.',
      });
    }


    // =================================================
    // PREPARAR DATOS PERFIL
    // =================================================

    let datosPerfilJson =
      null;

    if (
      datos_perfil !== undefined
    ) {
      datosPerfilJson =
        JSON.stringify(
          datos_perfil || {}
        );
    }


    // =================================================
    // ACTUALIZAR
    // =================================================

    if (
      datos_perfil !== undefined
    ) {
      await pool.query(
        `
        UPDATE usuarios

        SET
          nombre = ?,
          apellido_paterno = ?,
          apellido_materno = ?,
          correo = ?,
          datos_perfil = ?

        WHERE id_usuario = ?
        `,
        [
          nombre.trim(),
          apellido_paterno.trim(),
          String(
            apellido_materno || ''
          ).trim(),
          correoLimpio,
          datosPerfilJson,
          idUsuario,
        ]
      );

    } else {
      await pool.query(
        `
        UPDATE usuarios

        SET
          nombre = ?,
          apellido_paterno = ?,
          apellido_materno = ?,
          correo = ?

        WHERE id_usuario = ?
        `,
        [
          nombre.trim(),
          apellido_paterno.trim(),
          String(
            apellido_materno || ''
          ).trim(),
          correoLimpio,
          idUsuario,
        ]
      );
    }


    // =================================================
    // OBTENER ACTUALIZADO
    // =================================================

    const [usuarios] =
      await pool.query(
        `
        SELECT
          id_usuario,
          nombre,
          apellido_paterno,
          apellido_materno,
          correo,
          estado,

          DATE_FORMAT(
            fecha_actualizacion,
            '%Y-%m-%d %H:%i:%s'
          ) AS fecha_actualizacion

        FROM usuarios

        WHERE id_usuario = ?

        LIMIT 1
        `,
        [
          idUsuario,
        ]
      );


    return res.status(200).json({
      mensaje:
        'Perfil actualizado correctamente.',

      perfil: {
        idUsuario:
          Number(
            usuarios[0].id_usuario
          ),

        nombre:
          usuarios[0].nombre,

        apellidoPaterno:
          usuarios[0]
            .apellido_paterno,

        apellidoMaterno:
          usuarios[0]
            .apellido_materno,

        correo:
          usuarios[0].correo,

        estado:
          usuarios[0].estado,

        fechaActualizacion:
          usuarios[0]
            .fecha_actualizacion,
      },
    });

  } catch (error) {
    console.error(
      'Error al actualizar perfil:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo actualizar el perfil.',
    });
  }
};


// =====================================================
// CAMBIAR CONTRASEÑA
// =====================================================

const cambiarPassword = async (
  req,
  res
) => {
  try {
    const idUsuario =
      obtenerIdUsuario(req);

    if (!idUsuario) {
      return res.status(401).json({
        mensaje:
          'No se pudo identificar al usuario autenticado.',
      });
    }

    const {
      password_actual,
      password_nuevo,
      password_confirmar,
    } = req.body || {};


    if (
      !password_actual
      ||
      !password_nuevo
      ||
      !password_confirmar
    ) {
      return res.status(400).json({
        mensaje:
          'Todos los campos de contraseña son obligatorios.',
      });
    }


    if (
      password_nuevo !==
      password_confirmar
    ) {
      return res.status(400).json({
        mensaje:
          'Las contraseñas nuevas no coinciden.',
      });
    }


    // Mantenemos la regla
    // de AULAMOS de mínimo 8.

    if (
      password_nuevo.length < 8
    ) {
      return res.status(400).json({
        mensaje:
          'La nueva contraseña debe tener al menos 8 caracteres.',
      });
    }


    const [usuarios] =
      await pool.query(
        `
        SELECT password_hash

        FROM usuarios

        WHERE id_usuario = ?

        LIMIT 1
        `,
        [
          idUsuario,
        ]
      );


    if (
      usuarios.length === 0
    ) {
      return res.status(404).json({
        mensaje:
          'Usuario no encontrado.',
      });
    }


    const coincide =
      await bcrypt.compare(
        password_actual,
        usuarios[0].password_hash
      );


    if (
      !coincide
    ) {
      return res.status(400).json({
        mensaje:
          'La contraseña actual es incorrecta.',
      });
    }


    const esMismaPassword =
      await bcrypt.compare(
        password_nuevo,
        usuarios[0].password_hash
      );


    if (
      esMismaPassword
    ) {
      return res.status(400).json({
        mensaje:
          'La nueva contraseña debe ser diferente a la actual.',
      });
    }


    const nuevoHash =
      await bcrypt.hash(
        password_nuevo,
        10
      );


    await pool.query(
      `
      UPDATE usuarios

      SET password_hash = ?

      WHERE id_usuario = ?
      `,
      [
        nuevoHash,
        idUsuario,
      ]
    );


    return res.status(200).json({
      mensaje:
        'Contraseña actualizada correctamente.',
    });

  } catch (error) {
    console.error(
      'Error al cambiar contraseña:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo cambiar la contraseña.',
    });
  }
};


// =====================================================
// EXPORTAR
// =====================================================


// =====================================================
// ACTUALIZAR FOTO DE PERFIL
// =====================================================

const actualizarFotoPerfil = async (
  req,
  res
) => {
  try {
    const idUsuario =
      obtenerIdUsuario(req);

    if (!idUsuario) {
      return res.status(401).json({
        mensaje:
          'No se pudo identificar al usuario autenticado.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        mensaje:
          'Debes seleccionar una imagen.',
      });
    }

    const rutaNueva =
      `/uploads/perfiles/${req.file.filename}`;

    // Obtener foto anterior
    const [usuarios] =
      await pool.query(
        `
        SELECT foto_perfil
        FROM usuarios
        WHERE id_usuario = ?
        LIMIT 1
        `,
        [
          idUsuario,
        ]
      );

    if (
      usuarios.length === 0
    ) {
      return res.status(404).json({
        mensaje:
          'Usuario no encontrado.',
      });
    }

    const fotoAnterior =
      usuarios[0].foto_perfil;

    // Guardar nueva ruta
    await pool.query(
      `
      UPDATE usuarios
      SET foto_perfil = ?
      WHERE id_usuario = ?
      `,
      [
        rutaNueva,
        idUsuario,
      ]
    );

    // Eliminar foto anterior
    if (
      fotoAnterior &&
      fotoAnterior.startsWith(
        '/uploads/perfiles/'
      )
    ) {
      const nombreAnterior =
        path.basename(
          fotoAnterior
        );

      const rutaFisicaAnterior =
        path.join(
          __dirname,
          '..',
          'uploads',
          'perfiles',
          nombreAnterior
        );

      if (
        fs.existsSync(
          rutaFisicaAnterior
        )
      ) {
        fs.unlinkSync(
          rutaFisicaAnterior
        );
      }
    }

    return res.status(200).json({
      mensaje:
        'Foto de perfil actualizada correctamente.',

      fotoPerfil:
        rutaNueva,
    });

  } catch (error) {
    console.error(
      'Error al actualizar foto de perfil:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo actualizar la foto de perfil.',
    });
  }
};

module.exports = {
  obtenerPerfil,
  actualizarFotoPerfil,
  actualizarPerfil,
  cambiarPassword,
};