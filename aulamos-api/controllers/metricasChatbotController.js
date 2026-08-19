const pool = require('../config/database');

const DIAS_PREDETERMINADOS = 7;
const DIAS_MAXIMOS = 31;
const TODO_EL_HISTORIAL = 0;


// =====================================================
// OBTENER DÍAS
// =====================================================

const obtenerDias = (valor) => {
  if (
    String(valor) ===
    String(TODO_EL_HISTORIAL)
  ) {
    return TODO_EL_HISTORIAL;
  }

  const dias = Number(
    valor ?? DIAS_PREDETERMINADOS,
  );

  if (
    !Number.isInteger(dias) ||
    dias < 1
  ) {
    return DIAS_PREDETERMINADOS;
  }

  return Math.min(
    dias,
    DIAS_MAXIMOS,
  );
};


// =====================================================
// CONVERTIR A NÚMERO
// =====================================================

const convertirNumero = (valor) => {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;
};


// =====================================================
// CREAR SERIE COMPLETA DE FECHAS
// =====================================================

const crearSerieCompleta = (
  fechaInicio,
  fechaFin,
  registros,
) => {
  if (
    !fechaInicio ||
    !fechaFin
  ) {
    return [];
  }

  const cantidades = new Map(
    registros.map((registro) => [
      registro.fecha,
      convertirNumero(
        registro.cantidad,
      ),
    ]),
  );

  const crearFechaUtc = (fecha) => {
    const [
      anio,
      mes,
      dia,
    ] = fecha
      .split('-')
      .map(Number);

    return new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia,
      ),
    );
  };

  const actual =
    crearFechaUtc(
      fechaInicio,
    );

  const fin =
    crearFechaUtc(
      fechaFin,
    );

  const serie = [];

  while (actual <= fin) {
    const fecha = actual
      .toISOString()
      .slice(0, 10);

    serie.push({
      fecha,

      cantidad:
        cantidades.get(fecha) ?? 0,
    });

    actual.setUTCDate(
      actual.getUTCDate() + 1,
    );
  }

  return serie;
};


// =====================================================
// OBTENER MÉTRICAS DEL CHATBOT
// =====================================================

const obtenerMetricasChatbot = async (
  req,
  res,
) => {
  try {

    // =================================================
    // PARÁMETROS
    // =================================================

    const dias =
      obtenerDias(
        req.query?.dias,
      );

    const idPrueba =
      Number(
        req.query?.id_prueba || 0,
      );


    // =================================================
    // VALIDAR ID DE PRUEBA
    // =================================================

    if (
      req.query?.id_prueba !== undefined &&
      (
        !Number.isInteger(
          idPrueba,
        ) ||
        idPrueba <= 0
      )
    ) {
      return res.status(400).json({
        mensaje:
          'El id_prueba no es válido.',
      });
    }


    // =================================================
    // VALIDAR QUE LA PRUEBA EXISTA
    // =================================================

    if (idPrueba > 0) {
      const [pruebas] =
        await pool.query(
          `SELECT
             id_prueba,
             nombre,
             estado
           FROM pruebas_investigacion
           WHERE id_prueba = ?
           LIMIT 1`,
          [idPrueba],
        );

      if (
        pruebas.length === 0
      ) {
        return res.status(404).json({
          mensaje:
            'La prueba de investigación no existe.',
        });
      }
    }


    // =================================================
    // PERIODO
    // =================================================

    const esTodoElHistorial =
      dias === TODO_EL_HISTORIAL;

    const diasAnteriores =
      esTodoElHistorial
        ? 0
        : dias - 1;


    // =================================================
    // FILTRO DE PERIODO
    // =================================================

    const filtroPeriodo =
      esTodoElHistorial
        ? '1 = 1'
        : `
            m.fecha_mensaje >= DATE_SUB(
              CURDATE(),
              INTERVAL ${diasAnteriores} DAY
            )

            AND m.fecha_mensaje < DATE_ADD(
              CURDATE(),
              INTERVAL 1 DAY
            )
          `;


    // =================================================
    // FECHA DE INICIO
    // =================================================

    const expresionFechaInicio =
      esTodoElHistorial
        ? `
            COALESCE(
              DATE_FORMAT(
                MIN(m.fecha_mensaje),
                '%Y-%m-%d'
              ),

              DATE_FORMAT(
                CURDATE(),
                '%Y-%m-%d'
              )
            )
          `
        : `
            DATE_FORMAT(
              DATE_SUB(
                CURDATE(),
                INTERVAL ${diasAnteriores} DAY
              ),
              '%Y-%m-%d'
            )
          `;


    // =================================================
    // JOINS GENERALES
    // =================================================

    /*
     * Aquí se filtra:
     *
     * - solamente usuarios Alumno/Estudiante
     * - participantes de la prueba seleccionada
     * - participantes con consentimiento
     */

    const joins = `
      FROM mensajes_chatbot AS m

      INNER JOIN sesiones_chatbot AS s
        ON s.id_sesion = m.id_sesion

      INNER JOIN usuarios AS u
        ON u.id_usuario = s.id_usuario

      INNER JOIN usuario_roles AS ur
        ON ur.id_usuario = u.id_usuario

      INNER JOIN roles AS r
        ON r.id_rol = ur.id_rol
       AND LOWER(r.nombre)
           IN ('alumno', 'estudiante')

      ${
        idPrueba > 0
          ? `
            INNER JOIN participantes_prueba AS pp
              ON pp.id_usuario = u.id_usuario
             AND pp.id_prueba = ?
             AND pp.consentimiento = TRUE
          `
          : ''
      }
    `;


    // =================================================
    // PARÁMETROS SQL
    // =================================================

    const parametrosPrueba =
      idPrueba > 0
        ? [idPrueba]
        : [];


    // =================================================
    // CONSULTAS
    // =================================================

    const [
      [filasResumen],
      [filasPorDia],
      [filasPorTipo],
      [filasInteracciones],
    ] = await Promise.all([

      // =================================================
      // RESUMEN
      // =================================================

      pool.query(
        `SELECT

           ${expresionFechaInicio}
             AS fecha_inicio,

           DATE_FORMAT(
             CURDATE(),
             '%Y-%m-%d'
           ) AS fecha_fin,

           COUNT(
             DISTINCT m.id_mensaje
           ) AS total_interacciones,

           COUNT(
             DISTINCT s.id_usuario
           ) AS estudiantes_usuarios,

           COUNT(
             DISTINCT s.id_sesion
           ) AS total_sesiones,

           COALESCE(
             ROUND(
               AVG(
                 m.tiempo_respuesta_ms
               )
             ),
             0
           ) AS promedio_tiempo_respuesta_ms,

           COALESCE(
             SUM(
               CASE
                 WHEN DATE(
                   m.fecha_mensaje
                 ) = CURDATE()
                 THEN 1
                 ELSE 0
               END
             ),
             0
           ) AS preguntas_hoy

         ${joins}

         WHERE
           ${filtroPeriodo}`,
        parametrosPrueba,
      ),


      // =================================================
      // INTERACCIONES POR DÍA
      // =================================================

      pool.query(
        `SELECT

           DATE_FORMAT(
             MIN(
               m.fecha_mensaje
             ),
             '%Y-%m-%d'
           ) AS fecha,

           COUNT(
             DISTINCT m.id_mensaje
           ) AS cantidad

         ${joins}

         WHERE
           ${filtroPeriodo}

         GROUP BY
           DATE(
             m.fecha_mensaje
           )

         ORDER BY
           MIN(
             m.fecha_mensaje
           ) ASC`,
        parametrosPrueba,
      ),


      // =================================================
      // CONSULTAS POR TIPO
      // =================================================

      pool.query(
        `SELECT

           COALESCE(
             NULLIF(
               TRIM(
                 m.tipo_consulta
               ),
               ''
             ),
             'General'
           ) AS tipo_consulta,

           COUNT(
             DISTINCT m.id_mensaje
           ) AS cantidad

         ${joins}

         WHERE
           ${filtroPeriodo}

         GROUP BY
           COALESCE(
             NULLIF(
               TRIM(
                 m.tipo_consulta
               ),
               ''
             ),
             'General'
           )

         ORDER BY
           cantidad DESC,
           tipo_consulta ASC`,
        parametrosPrueba,
      ),


      // =================================================
      // TODAS LAS INTERACCIONES
      // =================================================

      pool.query(
        `SELECT

           m.id_mensaje,

           s.id_sesion,

           u.id_usuario,

           CONCAT_WS(
             ' ',
             u.nombre,
             u.apellido_paterno,
             u.apellido_materno
           ) AS estudiante,

           m.pregunta,

           m.respuesta,

           COALESCE(
             NULLIF(
               TRIM(
                 m.tipo_consulta
               ),
               ''
             ),
             'General'
           ) AS tipo_consulta,

           DATE_FORMAT(
             m.fecha_mensaje,
             '%d/%m/%Y'
           ) AS fecha,

           DATE_FORMAT(
             m.fecha_mensaje,
             '%H:%i'
           ) AS hora,

           COALESCE(
             m.tiempo_respuesta_ms,
             0
           ) AS tiempo_respuesta_ms

         ${joins}

         WHERE
           ${filtroPeriodo}

         ORDER BY
           m.fecha_mensaje DESC,
           m.id_mensaje DESC`,
        parametrosPrueba,
      ),

    ]);


    // =================================================
    // RESUMEN
    // =================================================

    const filaResumen =
      filasResumen[0] || {};

    const fechaInicio =
      filaResumen.fecha_inicio;

    const fechaFin =
      filaResumen.fecha_fin;


    // =================================================
    // RESPUESTA
    // =================================================

    return res.status(200).json({

      // ===============================================
      // PRUEBA
      // ===============================================

      id_prueba:
        idPrueba > 0
          ? idPrueba
          : null,


      // ===============================================
      // PERIODO
      // ===============================================

      periodo: {
        fecha_inicio:
          fechaInicio,

        fecha_fin:
          fechaFin,

        dias,
      },


      // ===============================================
      // RESUMEN
      // ===============================================

      resumen: {

        total_interacciones:
          convertirNumero(
            filaResumen
              .total_interacciones,
          ),

        estudiantes_usuarios:
          convertirNumero(
            filaResumen
              .estudiantes_usuarios,
          ),

        total_sesiones:
          convertirNumero(
            filaResumen
              .total_sesiones,
          ),

        promedio_tiempo_respuesta_ms:
          convertirNumero(
            filaResumen
              .promedio_tiempo_respuesta_ms,
          ),

        preguntas_hoy:
          convertirNumero(
            filaResumen
              .preguntas_hoy,
          ),
      },


      // ===============================================
      // INTERACCIONES POR DÍA
      // ===============================================

      interacciones_por_dia:
        crearSerieCompleta(
          fechaInicio,
          fechaFin,
          filasPorDia,
        ),


      // ===============================================
      // CONSULTAS POR TIPO
      // ===============================================

      consultas_por_tipo:
        filasPorTipo.map(
          (fila) => ({
            tipo_consulta:
              fila.tipo_consulta,

            cantidad:
              convertirNumero(
                fila.cantidad,
              ),
          }),
        ),


      // ===============================================
      // INTERACCIONES
      // ===============================================

      interacciones_recientes:
        filasInteracciones.map(
          (fila) => ({

            id_mensaje:
              convertirNumero(
                fila.id_mensaje,
              ),

            id_sesion:
              convertirNumero(
                fila.id_sesion,
              ),

            id_usuario:
              convertirNumero(
                fila.id_usuario,
              ),

            estudiante:
              fila.estudiante,

            pregunta:
              fila.pregunta,

            respuesta:
              fila.respuesta,

            tipo_consulta:
              fila.tipo_consulta,

            fecha:
              fila.fecha,

            hora:
              fila.hora,

            tiempo_respuesta_ms:
              convertirNumero(
                fila.tiempo_respuesta_ms,
              ),
          }),
        ),
    });

  } catch (error) {
    console.error(
      'Error al obtener las métricas del chatbot:',
      error,
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron obtener las métricas del chatbot.',
    });
  }
};


// =====================================================
// EXPORTAR
// =====================================================

module.exports = {
  obtenerMetricasChatbot,
};