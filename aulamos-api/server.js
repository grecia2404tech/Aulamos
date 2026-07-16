const express = require('express');
const cors = require('cors');

require('dotenv').config();

const pool = require(
  './config/database'
);

const authRoutes = require(
  './routes/authRoutes'
);

const docenteRoutes = require(
  './routes/docenteRoutes'
);

const alumnoRoutes = require(
  './routes/alumnoRoutes'
);

const academicoRoutes = require(
  './routes/academicoRoutes'
);

const chatbotRoutes = require(
  './routes/chatbotRoutes'
);

const app = express();

app.use(cors());

app.use(
  express.json({
    limit: '1mb',
  })
);

app.use('/api/auth', authRoutes);

app.use(
  '/api/docente',
  docenteRoutes
);

app.use(
  '/api/alumno',
  alumnoRoutes
);

app.use(
  '/api/academico',
  academicoRoutes
);

app.use(
  '/api/chatbot',
  chatbotRoutes
);

app.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT NOW() AS fecha_actual'
    );

    return res.status(200).json({
      mensaje:
        'API Aulamos funcionando correctamente',
      base_datos: 'Conectada',
      fecha: rows[0].fecha_actual,
    });
  } catch (error) {
    console.error(
      'Error de conexión con MySQL:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Error al conectar con la base de datos',
    });
  }
});

/*
 * Respuesta JSON para rutas que no existen.
 * Siempre debe estar después de todas las rutas.
 */
app.use((req, res) => {
  return res.status(404).json({
    mensaje:
      'La ruta solicitada no existe',
  });
});

/*
 * Manejador general de errores.
 */
app.use((error, req, res, next) => {
  console.error(
    'Error no controlado:',
    error
  );

  return res.status(500).json({
    mensaje:
      'Ocurrió un error interno en el servidor',
  });
});

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `Servidor Aulamos corriendo en el puerto ${PORT}`
    );
  }
);