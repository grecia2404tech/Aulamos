const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const expresionNombre =
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

const expresionCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const contieneLetra = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
const contieneNumero = /\d/;

const limpiarTexto = (valor) => {
  if (typeof valor !== 'string') {
    return '';
  }

  return valor.trim().replace(/\s+/g, ' ');
};

const errorValidacion = (res, campo, mensaje) => {
  return res.status(400).json({
    mensaje,
    campo,
  });
};

const registrarUsuario = async (req, res) => {
  let conexion;
  let transaccionIniciada = false;

  try {
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      correo,
      password,
      confirmar_password,
      rol,
    } = req.body;

    const nombreLimpio = limpiarTexto(nombre);
    const paternoLimpio = limpiarTexto(apellido_paterno);
    const maternoLimpio = limpiarTexto(apellido_materno);
    const correoLimpio =
      typeof correo === 'string'
        ? correo.trim().toLowerCase()
        : '';

    if (!nombreLimpio) {
      return errorValidacion(
        res,
        'nombre',
        'El nombre es obligatorio'
      );
    }

    if (nombreLimpio.length < 2) {
      return errorValidacion(
        res,
        'nombre',
        'El nombre debe tener al menos 2 caracteres'
      );
    }

    if (nombreLimpio.length > 100) {
      return errorValidacion(
        res,
        'nombre',
        'El nombre no puede superar los 100 caracteres'
      );
    }

    if (!expresionNombre.test(nombreLimpio)) {
      return errorValidacion(
        res,
        'nombre',
        'El nombre solo puede contener letras'
      );
    }

    if (!paternoLimpio) {
      return errorValidacion(
        res,
        'apellido_paterno',
        'El apellido paterno es obligatorio'
      );
    }

    if (
      paternoLimpio.length > 100 ||
      !expresionNombre.test(paternoLimpio)
    ) {
      return errorValidacion(
        res,
        'apellido_paterno',
        'Ingresa un apellido paterno válido'
      );
    }

    if (!maternoLimpio) {
      return errorValidacion(
        res,
        'apellido_materno',
        'El apellido materno es obligatorio'
      );
    }

    if (
      maternoLimpio.length > 100 ||
      !expresionNombre.test(maternoLimpio)
    ) {
      return errorValidacion(
        res,
        'apellido_materno',
        'Ingresa un apellido materno válido'
      );
    }

    if (!correoLimpio) {
      return errorValidacion(
        res,
        'correo',
        'El correo electrónico es obligatorio'
      );
    }

    if (
      correoLimpio.length > 150 ||
      !expresionCorreo.test(correoLimpio)
    ) {
      return errorValidacion(
        res,
        'correo',
        'Ingresa un correo electrónico válido'
      );
    }

    if (typeof password !== 'string' || !password) {
      return errorValidacion(
        res,
        'password',
        'La contraseña es obligatoria'
      );
    }

    if (password.length < 8) {
      return errorValidacion(
        res,
        'password',
        'La contraseña debe tener al menos 8 caracteres'
      );
    }

    if (password.length > 64) {
      return errorValidacion(
        res,
        'password',
        'La contraseña no puede superar los 64 caracteres'
      );
    }

    if (
      !contieneLetra.test(password) ||
      !contieneNumero.test(password)
    ) {
      return errorValidacion(
        res,
        'password',
        'La contraseña debe contener letras y números'
      );
    }

    if (
      typeof confirmar_password !== 'string' ||
      !confirmar_password
    ) {
      return errorValidacion(
        res,
        'confirmar_password',
        'Debes confirmar la contraseña'
      );
    }

    if (password !== confirmar_password) {
      return errorValidacion(
        res,
        'confirmar_password',
        'Las contraseñas no coinciden'
      );
    }

    const rolesPublicos = {
      alumno: 'Alumno',
      docente: 'Docente',
    };

    const rolRecibido = limpiarTexto(rol).toLowerCase();
    const rolNormalizado = rolesPublicos[rolRecibido];

    if (!rolNormalizado) {
      return res.status(400).json({
        mensaje:
          'Solo se permite el registro de alumnos y docentes',
        campo: 'rol',
      });
    }

    const [usuariosExistentes] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1',
      [correoLimpio]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({
        mensaje: 'Este correo electrónico ya está registrado',
        campo: 'correo',
      });
    }

    const [roles] = await pool.query(
      'SELECT id_rol FROM roles WHERE nombre = ? LIMIT 1',
      [rolNormalizado]
    );

    if (roles.length === 0) {
      return res.status(400).json({
        mensaje: 'El rol seleccionado no está disponible',
        campo: 'rol',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    conexion = await pool.getConnection();
    await conexion.beginTransaction();
    transaccionIniciada = true;

    const [resultado] = await conexion.query(
      `INSERT INTO usuarios
        (
          nombre,
          apellido_paterno,
          apellido_materno,
          correo,
          password_hash
        )
       VALUES (?, ?, ?, ?, ?)`,
      [
        nombreLimpio,
        paternoLimpio,
        maternoLimpio,
        correoLimpio,
        passwordHash,
      ]
    );

    const idUsuario = resultado.insertId;

    await conexion.query(
      `INSERT INTO usuario_roles
        (id_usuario, id_rol)
       VALUES (?, ?)`,
      [idUsuario, roles[0].id_rol]
    );

    await conexion.query(
      `INSERT INTO preferencias_accesibilidad
        (id_usuario)
       VALUES (?)`,
      [idUsuario]
    );

    await conexion.commit();
    transaccionIniciada = false;

    return res.status(201).json({
      mensaje: 'Usuario registrado correctamente',
      usuario: {
        id_usuario: idUsuario,
        nombre: nombreLimpio,
        correo: correoLimpio,
        rol: rolNormalizado,
      },
    });
  } catch (error) {
    if (conexion && transaccionIniciada) {
      await conexion.rollback();
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Este correo electrónico ya está registrado',
        campo: 'correo',
      });
    }

    console.error('Error al registrar usuario:', error);

    return res.status(500).json({
      mensaje: 'Ocurrió un error al registrar al usuario',
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (
      typeof correo !== 'string' ||
      !correo.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        mensaje: 'El correo y la contraseña son obligatorios',
      });
    }

    const correoLimpio = correo.trim().toLowerCase();

    const [usuarios] = await pool.query(
      `SELECT
        u.id_usuario,
        u.nombre,
        u.apellido_paterno,
        u.apellido_materno,
        u.correo,
        u.password_hash,
        u.estado,
        r.nombre AS rol
      FROM usuarios u
      INNER JOIN usuario_roles ur
        ON ur.id_usuario = u.id_usuario
      INNER JOIN roles r
        ON r.id_rol = ur.id_rol
      WHERE u.correo = ?
      LIMIT 1`,
      [correoLimpio]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensaje: 'Correo o contraseña incorrectos',
      });
    }

    const usuario = usuarios[0];

    if (usuario.estado !== 'Activo') {
      return res.status(403).json({
        mensaje:
          usuario.estado === 'Bloqueado'
            ? 'Tu cuenta se encuentra bloqueada'
            : 'Tu cuenta se encuentra inactiva',
      });
    }

    const passwordValida = await bcrypt.compare(
      password,
      usuario.password_hash
    );

    if (!passwordValida) {
      return res.status(401).json({
        mensaje: 'Correo o contraseña incorrectos',
      });
    }

    await pool.query(
      `UPDATE usuarios
       SET ultimo_acceso = NOW()
       WHERE id_usuario = ?`,
      [usuario.id_usuario]
    );

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        correo: usuario.correo,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d',
      }
    );

    return res.status(200).json({
      mensaje: 'Inicio de sesión correcto',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido_paterno: usuario.apellido_paterno,
        apellido_materno: usuario.apellido_materno,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);

    return res.status(500).json({
      mensaje: 'Ocurrió un error al iniciar sesión',
    });
  }
};

module.exports = {
  registrarUsuario,
  login,
};