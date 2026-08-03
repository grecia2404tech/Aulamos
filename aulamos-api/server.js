const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

const pool = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const docenteRoutes = require("./routes/docenteRoutes");
const alumnoRoutes = require("./routes/alumnoRoutes");
const academicoRoutes = require("./routes/academicoRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");

const app = express();

app.disable("x-powered-by");

app.use(cors());

app.use(
  express.json({
    limit: "1mb",
  })
);

/*
 * Permite consultar los archivos guardados por Multer en:
 * uploads/entregas
 *
 * Debe colocarse antes de las rutas y del manejador 404.
 */
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads"),
    {
      index: false,
      fallthrough: true,
      setHeaders: (res) => {
        res.setHeader(
          "Cross-Origin-Resource-Policy",
          "cross-origin"
        );
      },
    }
  )
);

app.use("/api/auth", authRoutes);
app.use("/api/docente", docenteRoutes);
app.use("/api/alumno", alumnoRoutes);
app.use("/api/academico", academicoRoutes);
app.use("/api/chatbot", chatbotRoutes);

app.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT NOW() AS fecha_actual"
    );

    return res.status(200).json({
      mensaje:
        "API Aulamos funcionando correctamente",
      base_datos: "Conectada",
      fecha: rows[0].fecha_actual,
    });
  } catch (error) {
    console.error(
      "Error de conexión con MySQL:",
      error
    );

    return res.status(500).json({
      mensaje:
        "Error al conectar con la base de datos",
    });
  }
});

/*
 * Respuesta JSON para rutas que no existen.
 * Siempre debe estar después de todas las rutas.
 */
app.use((_req, res) => {
  return res.status(404).json({
    mensaje:
      "La ruta solicitada no existe",
  });
});

/*
 * Manejador general de errores.
 * Debe conservar los cuatro parámetros para que Express lo reconozca.
 */
app.use((error, _req, res, next) => {
  console.error(
    "Error no controlado:",
    error
  );

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    mensaje:
      "Ocurrió un error interno en el servidor",
  });
});

const PORT = Number(
  process.env.PORT || 3000
);

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Servidor Aulamos corriendo en el puerto ${PORT}`
    );
  }
);