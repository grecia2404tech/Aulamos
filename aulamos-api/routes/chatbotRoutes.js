const express = require('express');

const {
  enviarMensaje,
} = require('../controllers/chatbotController');

const verificarToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/mensaje', verificarToken, enviarMensaje);

module.exports = router;