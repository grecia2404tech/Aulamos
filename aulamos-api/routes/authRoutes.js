const express = require('express');
const router = express.Router();

const {
  registrarUsuario,
  login,
} = require(
  '../controllers/authController'
);

const {
  solicitarRecuperacion,
  validarCodigoRecuperacion,
  restablecerPassword,
} = require(
  '../controllers/recuperacionController'
);

router.post(
  '/registro',
  registrarUsuario
);

router.post(
  '/login',
  login
);

router.post(
  '/solicitar-recuperacion',
  solicitarRecuperacion
);

router.post(
  '/validar-codigo-recuperacion',
  validarCodigoRecuperacion
);

router.post(
  '/restablecer-password',
  restablecerPassword
);

module.exports = router;