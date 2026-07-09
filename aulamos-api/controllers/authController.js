const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const registrarUsuario = async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, correo, password, rol } = req.body;

    const password_hash = await bcrypt.hash(password, 10);

    const [resultado] = await pool.query(
      `INSERT INTO usuarios 
      (nombre, apellido_paterno, apellido_materno, correo, password_hash)
      VALUES (?, ?, ?, ?, ?)`,
      [nombre, apellido_paterno, apellido_materno, correo, password_hash]
    );

    const id_usuario = resultado.insertId;

    const [roles] = await pool.query(
      'SELECT id_rol FROM roles WHERE nombre = ?',
      [rol]
    );

    await pool.query(
      'INSERT INTO usuario_roles (id_usuario, id_rol) VALUES (?, ?)',
      [id_usuario, roles[0].id_rol]
    );

    await pool.query(
      'INSERT INTO preferencias_accesibilidad (id_usuario) VALUES (?)',
      [id_usuario]
    );

    res.status(201).json({
      mensaje: 'Usuario registrado correctamente',
      id_usuario,
      rol
    });

  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al registrar usuario',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    const [usuarios] = await pool.query(
      'SELECT * FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, correo: usuario.correo },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      mensaje: 'Inicio de sesión correcto',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo
      }
    });

  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

module.exports = {
  registrarUsuario,
  login
};