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
      partes[0] !== 'Bearer' ||
      !partes[1]
    ) {
      return res.status(401).json({
        mensaje: 'Formato de token inválido',
      });
    }

    const datosToken = jwt.verify(
      partes[1],
      process.env.JWT_SECRET
    );

    req.usuario = datosToken;

    next();
  } catch (error) {
    return res.status(401).json({
      mensaje: 'Token inválido o expirado',
    });
  }
};

const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensaje: 'Usuario no autenticado',
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        mensaje:
          'No tienes permiso para acceder a esta función',
      });
    }

    next();
  };
};

/*
 * Conserva la exportación principal para no romper
 * las rutas que ya utilizan:
 * const verificarToken = require(...)
 */
module.exports = verificarToken;

module.exports.verificarToken = verificarToken;
module.exports.verificarRol = verificarRol;