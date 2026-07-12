const express = require('express');
const cors = require('cors');

require('dotenv').config();

const pool = require('./config/database');

const authRoutes = require(
  './routes/authRoutes'
);

const docenteRoutes = require(
  './routes/docenteRoutes'
);

const alumnoRoutes = require(
  './routes/alumnoRoutes'
);

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/docente', docenteRoutes);
app.use('/api/alumno', alumnoRoutes);

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Servidor Aulamos corriendo en el puerto ${PORT}`
  );
});