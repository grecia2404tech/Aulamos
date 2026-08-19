const express =
  require('express');

const multer =
  require('multer');

const path =
  require('path');

const verificarToken =
  require(
    '../middleware/authMiddleware'
  );

const {
  obtenerPerfil,
  actualizarPerfil,
  cambiarPassword,
  actualizarFotoPerfil,
} =
  require(
    '../controllers/perfilController'
  );


const router =
  express.Router();


// =====================================================
// CONFIGURACIÓN MULTER
// =====================================================

const almacenamiento =
  multer.diskStorage({

    // =================================================
    // CARPETA DONDE SE GUARDAN LAS FOTOS
    // =================================================

    destination: (
      _req,
      _file,
      cb
    ) => {

      cb(
        null,
        path.join(
          __dirname,
          '..',
          'uploads',
          'perfiles'
        )
      );
    },


    // =================================================
    // NOMBRE DEL ARCHIVO
    // =================================================

    filename: (
      req,
      file,
      cb
    ) => {

      const extension =
        path.extname(
          file.originalname
        )
          .toLowerCase();


      const idUsuario =
        req.usuario?.id_usuario
        || 'usuario';


      const nombreArchivo =
        `usuario_${idUsuario}_${Date.now()}${extension}`;


      cb(
        null,
        nombreArchivo
      );
    },
  });


// =====================================================
// FILTRO DE IMÁGENES
// =====================================================

const filtroImagen = (
  _req,
  file,
  cb
) => {

 const tiposPermitidos = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/bmp',
];

  if (
    tiposPermitidos.includes(
      file.mimetype
    )
  ) {

    cb(
      null,
      true
    );

    return;
  }


  cb(
    new Error(
      'Solo se permiten imágenes JPG, JPEG, PNG o WEBP.'
    )
  );
};


// =====================================================
// CONFIGURACIÓN DE SUBIDA
// =====================================================

const subirFoto =
  multer({

    storage:
      almacenamiento,

    fileFilter:
      filtroImagen,

    limits: {

      // Máximo 5 MB
      fileSize:
        5 * 1024 * 1024,
    },
  });


// =====================================================
// MIDDLEWARE PARA SUBIR FOTO
// =====================================================

const procesarFoto = (
  req,
  res,
  next
) => {

  subirFoto.single(
    'foto'
  )(
    req,
    res,
    (error) => {

      // ===============================================
      // TODO CORRECTO
      // ===============================================

      if (
        !error
      ) {

        next();

        return;
      }


      // ===============================================
      // ERROR POR TAMAÑO
      // ===============================================

      if (
        error instanceof
        multer.MulterError
      ) {

        if (
          error.code ===
          'LIMIT_FILE_SIZE'
        ) {

          return res.status(400).json({
            mensaje:
              'La imagen no debe superar los 5 MB.',
          });
        }


        return res.status(400).json({
          mensaje:
            `Error al subir la imagen: ${error.message}`,
        });
      }


      // ===============================================
      // ERROR DE FORMATO
      // ===============================================

      return res.status(400).json({
        mensaje:
          error.message
          ||
          'No se pudo procesar la imagen.',
      });
    }
  );
};


// =====================================================
// OBTENER PERFIL DEL USUARIO AUTENTICADO
// =====================================================

router.get(
  '/',
  verificarToken,
  obtenerPerfil
);


// =====================================================
// ACTUALIZAR DATOS DEL PERFIL
// =====================================================

router.put(
  '/',
  verificarToken,
  actualizarPerfil
);


// =====================================================
// CAMBIAR CONTRASEÑA
// =====================================================

router.put(
  '/password',
  verificarToken,
  cambiarPassword
);


// =====================================================
// CAMBIAR FOTO DE PERFIL
// =====================================================

router.put(
  '/foto',
  verificarToken,
  procesarFoto,
  actualizarFotoPerfil
);


// =====================================================
// EXPORTAR ROUTER
// =====================================================

module.exports =
  router;