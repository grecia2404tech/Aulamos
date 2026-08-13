"use strict";

const {
  generarRespuestaIA,
} = require("./geminiService");

const {
  obtenerContextoChatbot,
} = require("./chatbotContextService");

const {
  registrarInteraccionChatbot,
  obtenerMemoriaChatbot,
} = require("./chatbotHistoryService");

const {
  obtenerInteraccionChatbot,
  obtenerMemoriaSesionChatbot,
  actualizarRespuestaChatbot,
} = require("./chatbotConversationService");

const ROLES_PERMITIDOS =
  new Set([
    "alumno",
    "docente",
    "admin",
    "investigador",
  ]);

/*
 * Mientras una pregunta idéntica del mismo
 * usuario esté siendo procesada, Web y Móvil
 * reutilizan la misma promesa.
 *
 * No requiere modificar MySQL.
 */
const solicitudesEnCurso =
  new Map();

function crearError(
  mensaje,
  codigoEstado = 500
) {
  const error =
    new Error(mensaje);

  error.statusCode =
    codigoEstado;

  return error;
}

function normalizarRol(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase();
}

function validarUsuarioRol({
  idUsuario,
  rol,
}) {
  const usuario =
    Number(idUsuario || 0);

  const rolNormalizado =
    normalizarRol(rol);

  if (
    !Number.isInteger(usuario) ||
    usuario <= 0
  ) {
    throw crearError(
      "Usuario no autenticado.",
      401
    );
  }

  if (
    !ROLES_PERMITIDOS.has(
      rolNormalizado
    )
  ) {
    throw crearError(
      "El rol autenticado no puede utilizar AulaBot.",
      403
    );
  }

  return {
    usuario,
    rolNormalizado,
  };
}

function obtenerAccionesPorRol(
  rol
) {
  const acciones = {
    alumno: [
      {
        clave:
          "mis_actividades",
        texto:
          "Ver mis actividades",
      },
      {
        clave:
          "mis_avances",
        texto:
          "Ver mis avances",
      },
      {
        clave:
          "biblioteca",
        texto:
          "Abrir biblioteca",
      },
    ],

    docente: [
      {
        clave:
          "crear_actividad",
        texto:
          "Crear actividad",
      },
      {
        clave:
          "estudiantes",
        texto:
          "Ver estudiantes",
      },
      {
        clave:
          "reportes",
        texto:
          "Abrir reportes",
      },
    ],

    admin: [
      {
        clave:
          "admin_cursos",
        texto:
          "Administrar cursos",
      },
      {
        clave:
          "admin_grupos",
        texto:
          "Administrar grupos",
      },
      {
        clave:
          "admin_inscripciones",
        texto:
          "Ver inscripciones",
      },
    ],

    investigador: [
      {
        clave:
          "metricas_chatbot",
        texto:
          "Métricas de AulaBot",
      },
      {
        clave:
          "metricas_uso",
        texto:
          "Uso de la plataforma",
      },
      {
        clave:
          "reportes_investigacion",
        texto:
          "Reportes de investigación",
      },
    ],
  };

  return acciones[rol] || [];
}

async function procesarMensajeInterno({
  idUsuario,
  rol,
  mensaje,
}) {
  const {
    usuario,
    rolNormalizado,
  } =
    validarUsuarioRol({
      idUsuario,
      rol,
    });

  const texto =
    String(mensaje || "")
      .trim();

  if (!texto) {
    throw crearError(
      "Debes escribir una pregunta.",
      400
    );
  }

  if (texto.length > 1000) {
    throw crearError(
      "La pregunta no puede superar los 1000 caracteres.",
      422
    );
  }

  const contexto =
    await obtenerContextoChatbot({
      idUsuario: usuario,
      rol: rolNormalizado,
    });

  const historial =
    await obtenerMemoriaChatbot({
      idUsuario: usuario,
      rol: rolNormalizado,
      limite: 10,
    });

  const inicio =
    Date.now();

  const respuesta =
    await generarRespuestaIA({
      mensaje: texto,
      rol: rolNormalizado,
      contexto,
      historial,
    });

  const tiempoRespuestaMs =
    Date.now() - inicio;

  if (!respuesta) {
    throw crearError(
      "AulaBot no pudo generar una respuesta.",
      503
    );
  }

  const origenConocimiento =
    contexto &&
    contexto.trim()
      ? "Mixto"
      : "IA Generativa";

  const resultadoHistorial =
    await registrarInteraccionChatbot({
      idUsuario: usuario,
      rol: rolNormalizado,
      mensaje: texto,
      respuesta,
      tiempoRespuestaMs,
      origenConocimiento,
    });

  return {
    success: true,

    respuesta,

    tipoConsulta:
      resultadoHistorial.tipoConsulta,

    origenConocimiento,

    tiempoRespuestaMs,

    idSesion:
      resultadoHistorial.idSesion,

    idMensaje:
      resultadoHistorial.idMensaje,

    rol:
      rolNormalizado,

    acciones:
      obtenerAccionesPorRol(
        rolNormalizado
      ),
  };
}

async function procesarMensajeChatbot({
  idUsuario,
  rol,
  mensaje,
}) {
  const texto =
    String(mensaje || "")
      .trim();

  const clave =
    [
      Number(idUsuario || 0),
      normalizarRol(rol),
      texto.toLowerCase(),
    ].join("|");

  if (
    solicitudesEnCurso.has(
      clave
    )
  ) {
    return solicitudesEnCurso.get(
      clave
    );
  }

  const promesa =
    procesarMensajeInterno({
      idUsuario,
      rol,
      mensaje: texto,
    });

  solicitudesEnCurso.set(
    clave,
    promesa
  );

  try {
    return await promesa;
  } finally {
    solicitudesEnCurso.delete(
      clave
    );
  }
}

async function regenerarRespuestaChatbot({
  idUsuario,
  rol,
  idMensaje,
}) {
  const {
    usuario,
    rolNormalizado,
  } =
    validarUsuarioRol({
      idUsuario,
      rol,
    });

  const mensajeId =
    Number(idMensaje || 0);

  if (
    !Number.isInteger(
      mensajeId
    ) ||
    mensajeId <= 0
  ) {
    throw crearError(
      "La respuesta seleccionada no es válida.",
      422
    );
  }

  const interaccion =
    await obtenerInteraccionChatbot({
      idUsuario: usuario,
      idMensaje: mensajeId,
    });

  const contexto =
    await obtenerContextoChatbot({
      idUsuario: usuario,
      rol: rolNormalizado,
    });

  const historial =
    await obtenerMemoriaSesionChatbot({
      idUsuario: usuario,
      idSesion:
        Number(
          interaccion.id_sesion
        ),
      limite: 10,
      excluirIdMensaje:
        mensajeId,
    });

  const inicio =
    Date.now();

  const respuesta =
    await generarRespuestaIA({
      mensaje:
        String(
          interaccion.pregunta
        ),
      rol:
        rolNormalizado,
      contexto,
      historial,
    });

  const tiempoRespuestaMs =
    Date.now() - inicio;

  if (!respuesta) {
    throw crearError(
      "AulaBot no pudo regenerar la respuesta.",
      503
    );
  }

  const origenConocimiento =
    contexto &&
    contexto.trim()
      ? "Mixto"
      : "IA Generativa";

  const modelo =
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-3.1-flash-lite";

  await actualizarRespuestaChatbot({
    idUsuario: usuario,
    idMensaje:
      mensajeId,
    respuesta,
    modelo,
    origenConocimiento,
    tiempoRespuestaMs,
  });

  return {
    success: true,

    idMensaje:
      mensajeId,

    idSesion:
      Number(
        interaccion.id_sesion
      ),

    respuesta,

    tiempoRespuestaMs,

    origenConocimiento,

    acciones:
      obtenerAccionesPorRol(
        rolNormalizado
      ),
  };
}

module.exports = {
  procesarMensajeChatbot,
  regenerarRespuestaChatbot,
  normalizarRol,
  obtenerAccionesPorRol,
  ROLES_PERMITIDOS,
};