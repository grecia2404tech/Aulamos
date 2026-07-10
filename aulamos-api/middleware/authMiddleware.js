const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  try {
    const autorizacion = req.headers.authorization;

    if (!autorizacion) {
      return res.status(401).json({
        mensaje: 'Token no proporcionado',
      });
    }

    const partes = autorizacion.split(' ');

    if (
      partes.length !== 2 ||
      partes[0] !== 'Bearer'
    ) {
      return res.status(401).json({
        mensaje: 'Formato de token inválido',
      });
    }

    const token = partes[1];

    const datosToken = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.usuario = datosToken;

    next();
  } catch (error) {
    return res.status(401).json({
      mensaje: 'Token inválido o expirado',
      error: error.message,
    });
  }
};

module.exports = verificarToken;