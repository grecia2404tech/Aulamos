const fs = require("fs");
const path = require("path");
const multer = require("multer");

const CARPETA_RECURSOS = path.join(
  __dirname,
  "..",
  "uploads",
  "recursos"
);

fs.mkdirSync(CARPETA_RECURSOS, {
  recursive: true,
});

const EXTENSIONES_RECURSO = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".mp4",
  ".mov",
  ".m4v",
  ".webm",
  ".mp3",
  ".wav",
  ".m4a",
  ".png",
  ".jpg",
  ".jpeg",
]);

const EXTENSIONES_SUBTITULOS = new Set([
  ".vtt",
  ".srt",
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
    callback(null, CARPETA_RECURSOS);
  },

  filename: (_req, file, callback) => {
    const { extension, base } =
      limpiarNombre(file.originalname);

    const unico = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}`;

    const prefijo =
      file.fieldname === "subtitulos"
        ? "subtitulos-"
        : "";

    callback(
      null,
      `${prefijo}${base}-${unico}${extension}`
    );
  },
});

const filtroArchivo = (_req, file, callback) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (file.fieldname === "archivo") {
    if (!EXTENSIONES_RECURSO.has(extension)) {
      const error = new Error(
        "Solo puedes subir PDF, Word, PowerPoint, video, audio o imagen."
      );
      error.code = "TIPO_RECURSO_NO_PERMITIDO";
      return callback(error);
    }

    return callback(null, true);
  }

  if (file.fieldname === "subtitulos") {
    if (!EXTENSIONES_SUBTITULOS.has(extension)) {
      const error = new Error(
        "Los subtítulos deben estar en formato .vtt o .srt."
      );
      error.code = "TIPO_SUBTITULO_NO_PERMITIDO";
      return callback(error);
    }

    return callback(null, true);
  }

  const error = new Error(
    "El nombre del campo de archivo no es válido."
  );
  error.code = "CAMPO_ARCHIVO_NO_PERMITIDO";
  return callback(error);
};

const upload = multer({
  storage: almacenamiento,
  fileFilter: filtroArchivo,
  limits: {
    fileSize: 200 * 1024 * 1024,
    files: 2,
  },
});

const obtenerArchivosSubidos = (req) => {
  const grupos = Object.values(req.files ?? {});

  return grupos
    .flat()
    .filter((archivo) => archivo?.path);
};

const eliminarArchivosSubidos = async (req) => {
  await Promise.all(
    obtenerArchivosSubidos(req).map(async (archivo) => {
      try {
        await fs.promises.unlink(archivo.path);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error(
            "No se pudo limpiar un archivo incompleto:",
            error
          );
        }
      }
    })
  );
};

const procesarArchivoRecurso = (req, res, next) => {
  upload.fields([
    { name: "archivo", maxCount: 1 },
    { name: "subtitulos", maxCount: 1 },
  ])(req, res, async (error) => {
    if (error) {
      await eliminarArchivosSubidos(req);

      if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          mensaje:
            "El recurso no puede superar los 200 MB.",
        });
      }

      if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_UNEXPECTED_FILE"
      ) {
        return res.status(400).json({
          mensaje:
            "Solo se permite un recurso y un archivo de subtítulos.",
        });
      }

      return res.status(400).json({
        mensaje:
          error.message ||
          "No se pudieron procesar los archivos del recurso.",
      });
    }

    const archivoSubtitulos =
      req.files?.subtitulos?.[0] ?? null;

    if (
      archivoSubtitulos &&
      archivoSubtitulos.size > 2 * 1024 * 1024
    ) {
      await eliminarArchivosSubidos(req);

      return res.status(400).json({
        mensaje:
          "Los subtítulos no pueden superar los 2 MB.",
      });
    }

    return next();
  });
};

module.exports = {
  procesarArchivoRecurso,
};
