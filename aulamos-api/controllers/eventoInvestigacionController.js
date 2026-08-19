const pool = require('../config/database');

const TIPOS_EVENTO = [
  'InicioSesion',
  'CerrarSesion',
  'Navegacion',
  'Actividad',
  'Entrega',
  'Chatbot',
  'Accesibilidad',
  'Error',
  'Busqueda',
  'Recurso',
];

const TIPOS_INTERACCION = [
  'Mouse',
  'Teclado',
  'Touch',
  'Voz',
];

const obtenerIdUsuario = (req) => {
  const idUsuario = Number(req.usuario?.id_usuario);

  return Number.isInteger(idUsuario) && idUsuario > 0
    ? idUsuario
    : null;
};

const obtenerPruebasActivas = async (
  idUsuario,
  idPrueba = null
) => {
  const parametros = [idUsuario];

  let filtroPrueba = '';

  if (idPrueba !== null) {
    filtroPrueba = 'AND p.id_prueba = ?';
    parametros.push(idPrueba);
  }

  const [pruebas] = await pool.query(
    `SELECT
        p.id_prueba,
        p.nombre,
        p.fecha_inicio,
        p.fecha_fin,
        pp.grupo_experimental,
        pp.consentimiento
     FROM pruebas_investigacion AS p
     INNER JOIN participantes_prueba AS pp
        ON pp.id_prueba = p.id_prueba
     WHERE pp.id_usuario = ?
       AND pp.consentimiento = TRUE
       AND p.estado = 'Activa'
       AND p.fecha_inicio <= CURDATE()
       AND (
         p.fecha_fin IS NULL
         OR p.fecha_fin >= CURDATE()
       )
       ${filtroPrueba}
     ORDER BY p.fecha_inicio DESC,
              p.id_prueba DESC`,
    parametros
  );

  return pruebas;
};

const obtenerPruebaActivaUsuario = async (req, res) => {
  try {
    const idUsuario = obtenerIdUsuario(req);

    if (!idUsuario) {
      return res.status(401).json({
        mensaje:
          'No se pudo identificar al usuario autenticado.',
      });
    }

    const pruebas = await obtenerPruebasActivas(idUsuario);

    if (pruebas.length === 0) {
      return res.status(404).json({
        mensaje:
          'El usuario no pertenece a una prueba activa con consentimiento registrado.',
      });
    }

    return res.status(200).json({
      mensaje:
        'Pruebas activas obtenidas correctamente.',
      total: pruebas.length,
      pruebas: pruebas.map((prueba) => ({
        ...prueba,
        id_prueba: Number(prueba.id_prueba),
        consentimiento: Boolean(prueba.consentimiento),
      })),
    });
  } catch (error) {
    console.error(
      'Error al obtener la prueba activa del usuario:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo consultar la prueba de investigación activa.',
    });
  }
};

const registrarEventoInvestigacion = async (req, res) => {
  try {
    const idUsuario = obtenerIdUsuario(req);

    console.log(
  'EVENTO INVESTIGACIÓN -> usuario:',
  idUsuario,
  'body:',
  req.body
);
    if (!idUsuario) {
      return res.status(401).json({
        mensaje:
          'No se pudo identificar al usuario autenticado.',
      });
    }

    const {
      id_prueba: idPruebaRecibido,
      id_actividad: idActividadRecibido,
      tipo_evento: tipoEvento,
      accion,
      modulo = null,
      pantalla = null,
      descripcion = null,
      navegador = null,
      dispositivo = null,
      tipo_interaccion: tipoInteraccion = null,
      cantidad_clicks: cantidadClicks = 0,
      cantidad_scroll: cantidadScroll = 0,
      cantidad_teclas: cantidadTeclas = 0,
      duracion_segundos: duracionSegundos = 0,
    } = req.body || {};

    if (!TIPOS_EVENTO.includes(tipoEvento)) {
      return res.status(400).json({
        mensaje: 'El tipo de evento no es válido.',
        tipos_permitidos: TIPOS_EVENTO,
      });
    }

    if (
      typeof accion !== 'string' ||
      accion.trim().length === 0 ||
      accion.trim().length > 150
    ) {
      return res.status(400).json({
        mensaje:
          'La acción es obligatoria y debe tener como máximo 150 caracteres.',
      });
    }

    if (
      tipoInteraccion !== null &&
      !TIPOS_INTERACCION.includes(tipoInteraccion)
    ) {
      return res.status(400).json({
        mensaje:
          'El tipo de interacción no es válido.',
        tipos_permitidos: TIPOS_INTERACCION,
      });
    }

    const valoresNumericos = {
      cantidad_clicks: Number(cantidadClicks),
      cantidad_scroll: Number(cantidadScroll),
      cantidad_teclas: Number(cantidadTeclas),
      duracion_segundos: Number(duracionSegundos),
    };

    const campoNumericoInvalido = Object.entries(
      valoresNumericos
    ).find(([, valor]) => (
      !Number.isInteger(valor) || valor < 0
    ));

    if (campoNumericoInvalido) {
      return res.status(400).json({
        mensaje:
          `${campoNumericoInvalido[0]} debe ser un número entero igual o mayor que cero.`,
      });
    }

    let idPrueba = null;

    if (
      idPruebaRecibido !== undefined &&
      idPruebaRecibido !== null &&
      idPruebaRecibido !== ''
    ) {
      idPrueba = Number(idPruebaRecibido);

      if (
        !Number.isInteger(idPrueba) ||
        idPrueba <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'El id_prueba no es válido.',
        });
      }
    }

    const pruebas = await obtenerPruebasActivas(
      idUsuario,
      idPrueba
    );

    if (pruebas.length === 0) {
      return res.status(403).json({
        mensaje:
          'No existe una prueba activa autorizada para este usuario.',
      });
    }

    if (
      idPrueba === null &&
      pruebas.length > 1
    ) {
      return res.status(409).json({
        mensaje:
          'El usuario participa en más de una prueba activa. Envía id_prueba para indicar dónde registrar el evento.',
        pruebas: pruebas.map((prueba) => ({
          id_prueba: Number(prueba.id_prueba),
          nombre: prueba.nombre,
        })),
      });
    }

    idPrueba = Number(pruebas[0].id_prueba);

    let idActividad = null;

    if (
      idActividadRecibido !== undefined &&
      idActividadRecibido !== null &&
      idActividadRecibido !== ''
    ) {
      idActividad = Number(idActividadRecibido);

      if (
        !Number.isInteger(idActividad) ||
        idActividad <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'El id_actividad no es válido.',
        });
      }

      const [actividades] = await pool.query(
        `SELECT a.id_actividad
         FROM actividades AS a
         LEFT JOIN actividad_estudiantes AS ae
            ON ae.id_actividad = a.id_actividad
           AND ae.id_alumno = ?
         WHERE a.id_actividad = ?
           AND (
             ae.id_alumno = ?
             OR a.id_docente = ?
           )
         LIMIT 1`,
        [
          idUsuario,
          idActividad,
          idUsuario,
          idUsuario,
        ]
      );

      if (actividades.length === 0) {
        return res.status(403).json({
          mensaje:
            'La actividad no pertenece al usuario autenticado.',
        });
      }
    }

    const direccionIp = String(
      req.ip ||
      req.socket?.remoteAddress ||
      ''
    ).slice(0, 45) || null;

    const navegadorFinal = navegador
      ? String(navegador)
          .trim()
          .slice(0, 100)
      : String(
          req.headers['user-agent'] || ''
        )
          .trim()
          .slice(0, 100) || null;

    const dispositivoFinal = dispositivo
      ? String(dispositivo)
          .trim()
          .slice(0, 100)
      : null;

    const [resultado] = await pool.query(
      `INSERT INTO eventos_investigacion (
         id_prueba,
         id_usuario,
         id_actividad,
         tipo_evento,
         accion,
         modulo,
         pantalla,
         descripcion,
         direccion_ip,
         navegador,
         dispositivo,
         tipo_interaccion,
         cantidad_clicks,
         cantidad_scroll,
         cantidad_teclas,
         duracion_segundos
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idPrueba,
        idUsuario,
        idActividad,
        tipoEvento,
        accion.trim(),
        modulo
          ? String(modulo)
              .trim()
              .slice(0, 100)
          : null,
        pantalla
          ? String(pantalla)
              .trim()
              .slice(0, 100)
          : null,
        descripcion
          ? String(descripcion).trim()
          : null,
        direccionIp,
        navegadorFinal,
        dispositivoFinal,
        tipoInteraccion,
        valoresNumericos.cantidad_clicks,
        valoresNumericos.cantidad_scroll,
        valoresNumericos.cantidad_teclas,
        valoresNumericos.duracion_segundos,
      ]
    );

    return res.status(201).json({
      mensaje:
        'Evento de investigación registrado correctamente.',
      evento: {
        id_evento: Number(resultado.insertId),
        id_prueba: idPrueba,
        id_usuario: idUsuario,
        id_actividad: idActividad,
        tipo_evento: tipoEvento,
        accion: accion.trim(),
      },
    });
  } catch (error) {
    console.error(
      'Error al registrar el evento de investigación:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo registrar el evento de investigación.',
    });
  }
};

module.exports = {
  obtenerPruebaActivaUsuario,
  registrarEventoInvestigacion,
};