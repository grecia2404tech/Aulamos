const express = require('express');

const {
  enviarMensaje,
} = require('../controllers/chatbotController');

const router = express.Router();

router.post('/mensaje', enviarMensaje);

module.exports = router;