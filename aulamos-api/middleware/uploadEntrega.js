const fs = require("fs");
const path = require("path");
const multer = require("multer");

const CARPETA_ENTREGAS = path.join(
  __dirname,
  "..",
  "uploads",
  "entregas"
);

fs.mkdirSync(CARPETA_ENTREGAS, {
  recursive: true,
});

const EXTENSIONES_PERMITIDAS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
]);

const TIPOS_MIME_PERMITIDOS = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const limpiarNombre = (nombre) => {
  const extension = path
    .extname(nombre)
    .toLowerCase();

  const base = path
    .basename(nombre, extension)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return {
    extension,
    base: base || "archivo",
  };
};

const almacenamiento = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, CARPETA_ENTREGAS);
  },

  filename: (_req, file, callback) => {
    const { extension, base } =
      limpiarNombre(file.originalname);

    const numeroUnico = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}`;

    callback(
      null,
      `${base}-${numeroUnico}${extension}`
    );
  },
});

const filtroArchivo = (
  _req,
  file,
  callback
) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const extensionValida =
    EXTENSIONES_PERMITIDAS.has(extension);

  const mimeValido =
    TIPOS_MIME_PERMITIDOS.has(file.mimetype) ||
    file.mimetype === "application/octet-stream";

  if (!extensionValida || !mimeValido) {
    const error = new Error(
      "Solo puedes adjuntar archivos Word, PDF, PNG, JPG o Excel."
    );

    error.code =
      "TIPO_ARCHIVO_NO_PERMITIDO";

    return callback(error);
  }

  return callback(null, true);
};

const upload = multer({
  storage: almacenamiento,
  fileFilter: filtroArchivo,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

const procesarArchivoEntrega = (
  req,
  res,
  next
) => {
  upload.single("archivo")(
    req,
    res,
    (error) => {
      if (!error) {
        return next();
      }

      if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          mensaje:
            "El archivo no puede superar los 10 MB.",
        });
      }

      return res.status(400).json({
        mensaje:
          error.message ||
          "No se pudo procesar el archivo.",
      });
    }
  );
};

module.exports = {
  procesarArchivoEntrega,
};