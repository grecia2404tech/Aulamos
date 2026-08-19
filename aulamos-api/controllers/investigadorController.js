const pool = require('../config/database');

const entero = (valor) => Number(valor || 0);
const decimal = (valor) => Number(valor || 0);
const booleano = (valor) => Boolean(Number(valor || 0));

const nombreCompleto = (fila) => (
  [fila.nombre, fila.apellido_paterno, fila.apellido_materno]
    .filter(Boolean)
    .join(' ')
);

const formatearDuracion = (segundosRecibidos) => {
  const segundos = Math.max(0, entero(segundosRecibidos));
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;

  if (minutos === 0) {
    return `${resto} s`;
  }

  return resto > 0
    ? `${minutos} min ${resto} s`
    : `${minutos} min`;
};

const obtenerPrueba = async (req) => {
  const idRecibido = Number(req.query.id_prueba || 0);

  if (idRecibido > 0) {
    const [filas] = await pool.query(
      `SELECT
         id_prueba,
         nombre,
         descripcion,
         hipotesis,
         objetivo,
         version_wcag,
         fecha_inicio,
         fecha_fin,
         estado
       FROM pruebas_investigacion
       WHERE id_prueba = ?
       LIMIT 1`,
      [idRecibido]
    );

    return filas[0] || null;
  }

  const [filas] = await pool.query(
    `SELECT
       id_prueba,
       nombre,
       descripcion,
       hipotesis,
       objetivo,
       version_wcag,
       fecha_inicio,
       fecha_fin,
       estado
     FROM pruebas_investigacion
     ORDER BY
       CASE estado
         WHEN 'Activa' THEN 1
         WHEN 'Planeada' THEN 2
         ELSE 3
       END,
       fecha_inicio DESC,
       id_prueba DESC
     LIMIT 1`
  );

  return filas[0] || null;
};

const pruebaPublica = (prueba) => {
  if (!prueba) {
    return null;
  }

  return {
    ...prueba,
    id_prueba: entero(prueba.id_prueba),
  };
};

const responderSinPrueba = (res, datos) => res.status(200).json({
  mensaje: 'Aún no hay pruebas de investigación registradas.',
  prueba: null,
  ...datos,
});


// =====================================================
// RESUMEN INVESTIGADOR
// =====================================================
const obtenerResumenInvestigador = async (req, res) => {
  try {
    const prueba = await obtenerPrueba(req);

    if (!prueba) {
      return responderSinPrueba(res, {
        totalEstudiantes: 0,
        estudiantesConsentimiento: 0,
        totalAccesos: 0,
        erroresRegistrados: 0,
        interaccionesChatbot: 0,
      });
    }

    const [filas] = await pool.query(
      `SELECT

         (
           SELECT COUNT(DISTINCT pp.id_usuario)

           FROM participantes_prueba pp

           INNER JOIN usuario_roles ur
             ON ur.id_usuario = pp.id_usuario

           INNER JOIN roles r
             ON r.id_rol = ur.id_rol

           WHERE pp.id_prueba = ?
             AND LOWER(r.nombre) IN ('alumno', 'estudiante')
         ) AS total_estudiantes,


         (
           SELECT COUNT(DISTINCT pp.id_usuario)

           FROM participantes_prueba pp

           INNER JOIN usuario_roles ur
             ON ur.id_usuario = pp.id_usuario

           INNER JOIN roles r
             ON r.id_rol = ur.id_rol

           WHERE pp.id_prueba = ?
             AND LOWER(r.nombre) IN ('alumno', 'estudiante')
             AND pp.consentimiento = TRUE
         ) AS estudiantes_consentimiento,


         (
  SELECT COUNT(*)

  FROM eventos_investigacion e

  WHERE e.id_prueba = ?
) AS total_accesos,


         (
           SELECT COUNT(*)

           FROM eventos_investigacion e

           WHERE e.id_prueba = ?
             AND e.tipo_evento = 'Error'
         ) AS errores_registrados,


         (
           SELECT COUNT(*)

           FROM eventos_investigacion e

           WHERE e.id_prueba = ?
             AND e.tipo_evento = 'Chatbot'
         ) AS interacciones_chatbot`,
      [
        prueba.id_prueba,
        prueba.id_prueba,
        prueba.id_prueba,
        prueba.id_prueba,
        prueba.id_prueba,
      ]
    );

    const resumen = filas[0];

    return res.status(200).json({
      mensaje:
        'Resumen de investigación obtenido correctamente.',

      prueba:
        pruebaPublica(prueba),

      totalEstudiantes:
        entero(resumen.total_estudiantes),

      estudiantesConsentimiento:
        entero(resumen.estudiantes_consentimiento),

      totalAccesos:
        entero(resumen.total_accesos),

      erroresRegistrados:
        entero(resumen.errores_registrados),

      interaccionesChatbot:
        entero(resumen.interacciones_chatbot),
    });

  } catch (error) {
    console.error(
      'Error al obtener el resumen del investigador:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo obtener el resumen de investigación.',
    });
  }
};



// =====================================================
// MÉTRICAS DE USO
// =====================================================

const obtenerMetricasUso = async (req, res) => {
  try {
    const prueba = await obtenerPrueba(req);

    if (!prueba) {
      return responderSinPrueba(res, {
        totalAccesos: 0,
        totalEstudiantes: 0,
        promedioAccesos: 0,
        moduloMasVisitado: 'Sin datos',
        modulosVisitados: [],
        actividadReciente: [],
      });
    }

    const [
      [resumen],
      [modulos],
      [actividad],
    ] = await Promise.all([
      // =================================================
      // RESUMEN GENERAL
      // =================================================
      pool.query(
        `SELECT
           (
             SELECT COUNT(*)
             FROM eventos_investigacion e
             WHERE e.id_prueba = ?
           ) AS total_accesos,

           (
             SELECT COUNT(DISTINCT pp.id_usuario)

             FROM participantes_prueba pp

             INNER JOIN usuario_roles ur
               ON ur.id_usuario = pp.id_usuario

             INNER JOIN roles r
               ON r.id_rol = ur.id_rol

             WHERE pp.id_prueba = ?
               AND LOWER(r.nombre)
                   IN ('alumno', 'estudiante')
               AND pp.consentimiento = TRUE
           ) AS total_estudiantes`,
        [
          prueba.id_prueba,
          prueba.id_prueba,
        ]
      ),

      // =================================================
      // MÓDULOS VISITADOS
      // =================================================
      pool.query(
        `SELECT
           COALESCE(
             NULLIF(TRIM(e.modulo), ''),
             CASE
               WHEN e.tipo_evento = 'Accesibilidad'
                 THEN 'Accesibilidad'

               WHEN e.tipo_evento = 'Actividad'
                 THEN 'Actividades'

               WHEN e.tipo_evento = 'Chatbot'
                 THEN 'Chatbot'

               WHEN e.tipo_evento = 'Recurso'
                 THEN 'Biblioteca'

               WHEN e.tipo_evento = 'Busqueda'
                 THEN 'Búsqueda'

               WHEN e.tipo_evento = 'Entrega'
                 THEN 'Actividades'

               WHEN e.tipo_evento = 'Navegacion'
                 THEN 'Navegación'

               ELSE e.tipo_evento
             END
           ) AS nombre,

           COUNT(*) AS visitas

         FROM eventos_investigacion e

         WHERE e.id_prueba = ?

           AND e.tipo_evento IN (
             'Navegacion',
             'Actividad',
             'Entrega',
             'Chatbot',
             'Busqueda',
             'Recurso',
             'Accesibilidad'
           )

         GROUP BY
           COALESCE(
             NULLIF(TRIM(e.modulo), ''),
             CASE
               WHEN e.tipo_evento = 'Accesibilidad'
                 THEN 'Accesibilidad'

               WHEN e.tipo_evento = 'Actividad'
                 THEN 'Actividades'

               WHEN e.tipo_evento = 'Chatbot'
                 THEN 'Chatbot'

               WHEN e.tipo_evento = 'Recurso'
                 THEN 'Biblioteca'

               WHEN e.tipo_evento = 'Busqueda'
                 THEN 'Búsqueda'

               WHEN e.tipo_evento = 'Entrega'
                 THEN 'Actividades'

               WHEN e.tipo_evento = 'Navegacion'
                 THEN 'Navegación'

               ELSE e.tipo_evento
             END
           )

         ORDER BY
           visitas DESC,
           nombre ASC

         LIMIT 10`,
        [prueba.id_prueba]
      ),

      // =================================================
      // ACTIVIDAD RECIENTE
      // =================================================
      pool.query(
        `SELECT
           e.id_evento,

           u.nombre,
           u.apellido_paterno,
           u.apellido_materno,

           COALESCE(
             NULLIF(TRIM(e.modulo), ''),

             CASE
               WHEN e.tipo_evento = 'Accesibilidad'
                 THEN 'Accesibilidad'

               WHEN e.tipo_evento = 'Actividad'
                 THEN 'Actividades'

               WHEN e.tipo_evento = 'Chatbot'
                 THEN 'Chatbot'

               WHEN e.tipo_evento = 'Recurso'
                 THEN 'Biblioteca'

               WHEN e.tipo_evento = 'Busqueda'
                 THEN 'Búsqueda'

               WHEN e.tipo_evento = 'Entrega'
                 THEN 'Actividades'

               WHEN e.tipo_evento = 'Navegacion'
                 THEN 'Navegación'

               ELSE e.tipo_evento
             END
           ) AS modulo,

           e.tipo_evento,

           e.accion,

           DATE_FORMAT(
             e.fecha_hora,
             '%d/%m/%Y'
           ) AS fecha,

           DATE_FORMAT(
             e.fecha_hora,
             '%H:%i'
           ) AS hora

         FROM eventos_investigacion e

         INNER JOIN usuarios u
           ON u.id_usuario = e.id_usuario

         WHERE e.id_prueba = ?

         ORDER BY
           e.fecha_hora DESC,
           e.id_evento DESC

         LIMIT 20`,
        [prueba.id_prueba]
      ),
    ]);

    // =====================================================
    // TOTALES
    // =====================================================

    const totalAccesos =
      entero(
        resumen[0]?.total_accesos
      );

    const totalEstudiantes =
      entero(
        resumen[0]?.total_estudiantes
      );


    // =====================================================
    // LISTA DE MÓDULOS
    // =====================================================

    const listaModulos =
      modulos.map(
        (fila, indice) => ({
          id:
            indice + 1,

          nombre:
            fila.nombre || 'Sin módulo',

          visitas:
            entero(fila.visitas),
        })
      );


    // =====================================================
    // RESPUESTA
    // =====================================================

    return res.status(200).json({
      mensaje:
        'Métricas de uso obtenidas correctamente.',

      prueba:
        pruebaPublica(prueba),

      totalAccesos,

      totalEstudiantes,

      promedioAccesos:
        totalEstudiantes > 0
          ? Number(
              (
                totalAccesos /
                totalEstudiantes
              ).toFixed(1)
            )
          : 0,

      moduloMasVisitado:
        listaModulos[0]?.nombre ||
        'Sin datos',

      modulosVisitados:
        listaModulos,

      actividadReciente:
        actividad.map(
          (fila) => ({
            id:
              entero(
                fila.id_evento
              ),

            estudiante:
              nombreCompleto(fila),

            modulo:
              fila.modulo ||
              'Sin módulo',

            tipoEvento:
              fila.tipo_evento,

            accion:
              fila.accion,

            fecha:
              fila.fecha,

            hora:
              fila.hora,
          })
        ),
    });

  } catch (error) {
    console.error(
      'Error al obtener métricas de uso:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron obtener las métricas de uso.',
    });
  }
};


// =====================================================
// TIEMPOS DE ACTIVIDADES
// =====================================================

const obtenerTiemposActividades = async (req, res) => {
  try {
    const prueba = await obtenerPrueba(req);

    if (!prueba) {
      return responderSinPrueba(res, {
        tiempoPromedioGeneral: '0 s',
        actividadMasRapida: 'Sin datos',
        actividadMasLenta: 'Sin datos',
        resumenActividades: [],
        registrosTiempo: [],
      });
    }

    const expresionSegundos = `CASE
      WHEN ae.fecha_inicio IS NOT NULL
       AND ae.fecha_finalizacion IS NOT NULL
        THEN GREATEST(
          TIMESTAMPDIFF(
            SECOND,
            ae.fecha_inicio,
            ae.fecha_finalizacion
          ),
          0
        )

      WHEN en.tiempo_realizacion IS NOT NULL
        THEN GREATEST(
          en.tiempo_realizacion * 60,
          0
        )

      ELSE NULL
    END`;

    const [[resumen], [registros]] = await Promise.all([
      pool.query(
        `SELECT
           a.id_actividad,
           a.titulo AS nombre,
           ROUND(
             AVG(${expresionSegundos})
           ) AS promedio_segundos,
           COUNT(
             DISTINCT ae.id_alumno
           ) AS estudiantes

         FROM actividad_estudiantes ae

         INNER JOIN actividades a
           ON a.id_actividad =
              ae.id_actividad

         INNER JOIN participantes_prueba pp
           ON pp.id_usuario =
              ae.id_alumno
          AND pp.id_prueba = ?
          AND pp.consentimiento = TRUE

         LEFT JOIN (
           SELECT
             id_actividad_estudiante,
             MAX(tiempo_realizacion)
               AS tiempo_realizacion,
             MAX(fecha_entrega)
               AS fecha_entrega

           FROM entregas

           GROUP BY
             id_actividad_estudiante

         ) en
           ON en.id_actividad_estudiante =
              ae.id_actividad_estudiante

         WHERE
           ${expresionSegundos}
           IS NOT NULL

         GROUP BY
           a.id_actividad,
           a.titulo

         ORDER BY
           promedio_segundos ASC,
           a.titulo ASC`,
        [prueba.id_prueba]
      ),

      pool.query(
        `SELECT
           ae.id_actividad_estudiante AS id,

           u.nombre,
           u.apellido_paterno,
           u.apellido_materno,

           a.titulo AS actividad,

           DATE_FORMAT(
             ae.fecha_inicio,
             '%d/%m/%Y'
           ) AS fecha_inicio,

           DATE_FORMAT(
             ae.fecha_inicio,
             '%H:%i'
           ) AS hora_inicio,

           DATE_FORMAT(
             COALESCE(
               ae.fecha_finalizacion,
               en.fecha_entrega
             ),
             '%d/%m/%Y'
           ) AS fecha_fin,

           DATE_FORMAT(
             COALESCE(
               ae.fecha_finalizacion,
               en.fecha_entrega
             ),
             '%H:%i'
           ) AS hora_fin,

           ${expresionSegundos}
             AS segundos

         FROM actividad_estudiantes ae

         INNER JOIN actividades a
           ON a.id_actividad =
              ae.id_actividad

         INNER JOIN usuarios u
           ON u.id_usuario =
              ae.id_alumno

         INNER JOIN participantes_prueba pp
           ON pp.id_usuario =
              ae.id_alumno
          AND pp.id_prueba = ?
          AND pp.consentimiento = TRUE

         LEFT JOIN (
           SELECT
             id_actividad_estudiante,
             MAX(tiempo_realizacion)
               AS tiempo_realizacion,
             MAX(fecha_entrega)
               AS fecha_entrega

           FROM entregas

           GROUP BY
             id_actividad_estudiante

         ) en
           ON en.id_actividad_estudiante =
              ae.id_actividad_estudiante

         WHERE
           ${expresionSegundos}
           IS NOT NULL

         ORDER BY
           COALESCE(
             ae.fecha_finalizacion,
             en.fecha_entrega
           ) DESC

         LIMIT 100`,
        [prueba.id_prueba]
      ),
    ]);

    const resumenActividades =
      resumen.map((fila) => ({
        id: entero(fila.id_actividad),

        nombre: fila.nombre,

        promedio:
          formatearDuracion(
            fila.promedio_segundos
          ),

        promedioSegundos:
          entero(
            fila.promedio_segundos
          ),

        estudiantes:
          entero(fila.estudiantes),
      }));

    const totalSegundos =
      registros.reduce(
        (acumulado, fila) =>
          acumulado +
          entero(fila.segundos),
        0
      );

    const promedioGeneral =
      registros.length > 0
        ? Math.round(
            totalSegundos /
            registros.length
          )
        : 0;

    return res.status(200).json({
      mensaje:
        'Tiempos de actividades obtenidos correctamente.',

      prueba:
        pruebaPublica(prueba),

      tiempoPromedioGeneral:
        formatearDuracion(
          promedioGeneral
        ),

      actividadMasRapida:
        resumenActividades[0]?.nombre ||
        'Sin datos',

      actividadMasLenta:
        resumenActividades[
          resumenActividades.length - 1
        ]?.nombre ||
        'Sin datos',

      resumenActividades,

      registrosTiempo:
        registros.map((fila) => ({
          id: entero(fila.id),

          estudiante:
            nombreCompleto(fila),

          actividad:
            fila.actividad,

          fechaInicio:
            fila.fecha_inicio ||
            'Sin registrar',

          horaInicio:
            fila.hora_inicio ||
            '',

          fechaFin:
            fila.fecha_fin ||
            'Sin registrar',

          horaFin:
            fila.hora_fin ||
            '',

          tiempoTotal:
            formatearDuracion(
              fila.segundos
            ),

          minutos:
            Number(
              (
                entero(fila.segundos) /
                60
              ).toFixed(1)
            ),
        })),
    });
  } catch (error) {
    console.error(
      'Error al obtener tiempos de actividades:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron obtener los tiempos de actividades.',
    });
  }
};


// =====================================================
// TIEMPOS DE VISUALIZACIÓN DE RECURSOS
// =====================================================

const obtenerTiemposRecursos = async (req, res) => {
  try {
    const prueba = await obtenerPrueba(req);

    if (!prueba) {
      return responderSinPrueba(res, {
        tiempoTotalRecursos: '0 s',
        tiempoPromedioRecursos: '0 s',
        totalVisualizaciones: 0,
        totalRecursos: 0,
        recursoMasConsultado: 'Sin datos',
        resumenRecursos: [],
        registrosRecursos: [],
      });
    }

    const [
      [resumen],
      [resumenRecursos],
      [registros],
    ] = await Promise.all([

      // =================================================
      // RESUMEN GENERAL
      // =================================================

      pool.query(
        `SELECT
           COALESCE(
             SUM(
               ur.tiempo_visualizacion_seg
             ),
             0
           ) AS tiempo_total_seg,

           COALESCE(
             ROUND(
               AVG(
                 ur.tiempo_visualizacion_seg
               )
             ),
             0
           ) AS tiempo_promedio_seg,

           COUNT(
             ur.id_uso_recurso
           ) AS total_visualizaciones,

           COUNT(
             DISTINCT ur.id_recurso
           ) AS total_recursos

         FROM uso_recursos ur

         INNER JOIN participantes_prueba pp
           ON pp.id_usuario = ur.id_usuario
          AND pp.id_prueba = ?
          AND pp.consentimiento = TRUE

         WHERE DATE(ur.fecha_acceso) >= DATE(?)

           AND (
             ? IS NULL

             OR DATE(ur.fecha_acceso) <= DATE(?)
           )`,
        [
          prueba.id_prueba,
          prueba.fecha_inicio,
          prueba.fecha_fin,
          prueba.fecha_fin,
        ]
      ),


      // =================================================
      // RESUMEN POR RECURSO
      // =================================================

      pool.query(
        `SELECT
           r.id_recurso,

           r.titulo,

           r.tipo,

           COUNT(
             ur.id_uso_recurso
           ) AS visualizaciones,

           COUNT(
             DISTINCT ur.id_usuario
           ) AS estudiantes,

           COALESCE(
             SUM(
               ur.tiempo_visualizacion_seg
             ),
             0
           ) AS tiempo_total_seg,

           COALESCE(
             ROUND(
               AVG(
                 ur.tiempo_visualizacion_seg
               )
             ),
             0
           ) AS tiempo_promedio_seg,

           COALESCE(
             ROUND(
               AVG(
                 ur.porcentaje_visualizado
               )
             ),
             0
           ) AS porcentaje_promedio

         FROM uso_recursos ur

         INNER JOIN recursos_educativos r
           ON r.id_recurso =
              ur.id_recurso

         INNER JOIN participantes_prueba pp
           ON pp.id_usuario =
              ur.id_usuario

          AND pp.id_prueba = ?

          AND pp.consentimiento =
              TRUE

         WHERE DATE(
                 ur.fecha_acceso
               ) >= DATE(?)

           AND (
             ? IS NULL

             OR DATE(
                  ur.fecha_acceso
                ) <= DATE(?)
           )

         GROUP BY
           r.id_recurso,
           r.titulo,
           r.tipo

         ORDER BY
           visualizaciones DESC,
           tiempo_total_seg DESC,
           r.titulo ASC`,
        [
          prueba.id_prueba,
          prueba.fecha_inicio,
          prueba.fecha_fin,
          prueba.fecha_fin,
        ]
      ),


      // =================================================
      // REGISTROS POR ESTUDIANTE
      // =================================================

      pool.query(
        `SELECT
           ur.id_uso_recurso,

           ur.id_usuario,

           ur.id_recurso,

           u.nombre,
           u.apellido_paterno,
           u.apellido_materno,

           r.titulo AS recurso,

           r.tipo,

           COALESCE(
             ur.tiempo_visualizacion_seg,
             0
           ) AS tiempo_segundos,

           COALESCE(
             ur.porcentaje_visualizado,
             0
           ) AS porcentaje_visualizado,

           COALESCE(
             ur.accion_realizada,
             'Visualizó'
           ) AS accion_realizada,

           COALESCE(
             ur.veces_consultado,
             1
           ) AS veces_consultado,

           DATE_FORMAT(
             ur.fecha_acceso,
             '%d/%m/%Y'
           ) AS fecha,

           DATE_FORMAT(
             ur.fecha_acceso,
             '%H:%i'
           ) AS hora

         FROM uso_recursos ur

         INNER JOIN recursos_educativos r
           ON r.id_recurso =
              ur.id_recurso

         INNER JOIN usuarios u
           ON u.id_usuario =
              ur.id_usuario

         INNER JOIN participantes_prueba pp
           ON pp.id_usuario =
              ur.id_usuario

          AND pp.id_prueba = ?

          AND pp.consentimiento =
              TRUE

         WHERE DATE(
                 ur.fecha_acceso
               ) >= DATE(?)

           AND (
             ? IS NULL

             OR DATE(
                  ur.fecha_acceso
                ) <= DATE(?)
           )

         ORDER BY
           ur.fecha_acceso DESC,
           ur.id_uso_recurso DESC

         LIMIT 200`,
        [
          prueba.id_prueba,
          prueba.fecha_inicio,
          prueba.fecha_fin,
          prueba.fecha_fin,
        ]
      ),
    ]);


    // =====================================================
    // RESUMEN GENERAL
    // =====================================================

    const filaResumen =
      resumen[0] || {};


    // =====================================================
    // RESUMEN POR RECURSO
    // =====================================================

    const listaResumenRecursos =
      resumenRecursos.map(
        (fila) => ({
          idRecurso:
            entero(
              fila.id_recurso
            ),

          titulo:
            fila.titulo,

          tipo:
            fila.tipo,

          visualizaciones:
            entero(
              fila.visualizaciones
            ),

          estudiantes:
            entero(
              fila.estudiantes
            ),

          tiempoTotal:
            formatearDuracion(
              fila.tiempo_total_seg
            ),

          tiempoTotalSegundos:
            entero(
              fila.tiempo_total_seg
            ),

          tiempoPromedio:
            formatearDuracion(
              fila.tiempo_promedio_seg
            ),

          tiempoPromedioSegundos:
            entero(
              fila.tiempo_promedio_seg
            ),

          porcentajePromedio:
            Number(
              fila.porcentaje_promedio ||
              0
            ),
        })
      );


    // =====================================================
    // RESPUESTA
    // =====================================================

    return res.status(200).json({
      mensaje:
        'Tiempos de recursos obtenidos correctamente.',

      prueba:
        pruebaPublica(
          prueba
        ),

      tiempoTotalRecursos:
        formatearDuracion(
          filaResumen.tiempo_total_seg
        ),

      tiempoPromedioRecursos:
        formatearDuracion(
          filaResumen.tiempo_promedio_seg
        ),

      totalVisualizaciones:
        entero(
          filaResumen.total_visualizaciones
        ),

      totalRecursos:
        entero(
          filaResumen.total_recursos
        ),

      recursoMasConsultado:
        listaResumenRecursos[0]
          ?.titulo ||
        'Sin datos',

      resumenRecursos:
        listaResumenRecursos,

      registrosRecursos:
        registros.map(
          (fila) => ({
            idUso:
              entero(
                fila.id_uso_recurso
              ),

            idUsuario:
              entero(
                fila.id_usuario
              ),

            idRecurso:
              entero(
                fila.id_recurso
              ),

            estudiante:
              nombreCompleto(
                fila
              ),

            recurso:
              fila.recurso,

            tipo:
              fila.tipo,

            tiempoVisualizacion:
              formatearDuracion(
                fila.tiempo_segundos
              ),

            tiempoSegundos:
              entero(
                fila.tiempo_segundos
              ),

            porcentajeVisualizado:
              Number(
                fila.porcentaje_visualizado ||
                0
              ),

            accion:
              fila.accion_realizada,

            vecesConsultado:
              entero(
                fila.veces_consultado
              ),

            fecha:
              fila.fecha,

            hora:
              fila.hora,
          })
        ),
    });

  } catch (error) {
    console.error(
      'Error al obtener tiempos de recursos:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron obtener los tiempos de visualización de recursos.',
    });
  }
};


// =====================================================
// SINCRONIZAR MÉTRICAS DE INVESTIGACIÓN
// =====================================================

const sincronizarMetricasInvestigacion = async (
  idPruebaRecibido
) => {
  try {
    const idPrueba =
      entero(
        idPruebaRecibido
      );

    if (idPrueba <= 0) {
      return {
        procesadas: 0,
      };
    }


    // =================================================
    // VERIFICAR PRUEBA
    // =================================================

    const [pruebas] =
      await pool.query(
        `SELECT
           id_prueba,
           fecha_inicio,
           fecha_fin

         FROM pruebas_investigacion

         WHERE id_prueba = ?

         LIMIT 1`,
        [
          idPrueba,
        ]
      );


    if (
      pruebas.length === 0
    ) {
      return {
        procesadas: 0,
      };
    }


    // =================================================
    // SINCRONIZAR
    // =================================================
    //
    // Cada registro representa:
    //
    // prueba + alumno + actividad
    //
    // La restricción UNIQUE que agregamos evita
    // que existan registros duplicados.
    // =================================================

    const [resultado] =
      await pool.query(
        `INSERT INTO metricas_investigacion (
           id_prueba,
           id_alumno,
           id_actividad,

           tiempo_realizacion_seg,
           porcentaje_avance,
           calificacion,

           veces_uso_accesibilidad,
           interacciones_chatbot,

           duracion_sesion_seg,

           total_clicks,
           total_scroll,
           total_interacciones_teclado,

           dispositivo,
           navegador,
           sistema_operativo,

           fecha_registro
         )

         SELECT
           pp.id_prueba,

           ae.id_alumno,

           ae.id_actividad,


           /* ============================================
              TIEMPO DE REALIZACIÓN
           ============================================ */

           CASE

             WHEN
               ae.fecha_inicio IS NOT NULL
               AND
               ae.fecha_finalizacion IS NOT NULL

             THEN
               GREATEST(
                 TIMESTAMPDIFF(
                   SECOND,
                   ae.fecha_inicio,
                   ae.fecha_finalizacion
                 ),
                 0
               )


             WHEN
               en.tiempo_realizacion IS NOT NULL

             THEN
               GREATEST(
                 en.tiempo_realizacion * 60,
                 0
               )


             ELSE NULL

           END
             AS tiempo_realizacion_seg,


           /* ============================================
              PORCENTAJE DE AVANCE
           ============================================ */

           COALESCE(
             ae.porcentaje_avance,
             0
           )
             AS porcentaje_avance,


           /* ============================================
              CALIFICACIÓN
           ============================================ */

           en.calificacion
             AS calificacion,


           /* ============================================
              USO DE ACCESIBILIDAD
           ============================================ */

           COALESCE(
             ev.veces_uso_accesibilidad,
             0
           )
             AS veces_uso_accesibilidad,


           /* ============================================
              CHATBOT
           ============================================ */

           COALESCE(
             ev.interacciones_chatbot,
             0
           )
             AS interacciones_chatbot,


           /* ============================================
              DURACIÓN DE INTERACCIONES
           ============================================ */

           COALESCE(
             ev.duracion_sesion_seg,
             0
           )
             AS duracion_sesion_seg,


           /* ============================================
              CLICS
           ============================================ */

           COALESCE(
             ev.total_clicks,
             0
           )
             AS total_clicks,


           /* ============================================
              SCROLL
           ============================================ */

           COALESCE(
             ev.total_scroll,
             0
           )
             AS total_scroll,


           /* ============================================
              TECLADO
           ============================================ */

           COALESCE(
             ev.total_teclado,
             0
           )
             AS total_interacciones_teclado,


           /* ============================================
              DISPOSITIVO
           ============================================ */

           ev.dispositivo
             AS dispositivo,


           /* ============================================
              NAVEGADOR
           ============================================ */

           ev.navegador
             AS navegador,


           /* ============================================
              SISTEMA OPERATIVO
              Aún no se registra directamente.
           ============================================ */

           NULL
             AS sistema_operativo,


           CURRENT_TIMESTAMP
             AS fecha_registro


         FROM participantes_prueba pp


         /* ==============================================
            PRUEBA
         ============================================== */

         INNER JOIN pruebas_investigacion p
           ON p.id_prueba =
              pp.id_prueba


         /* ==============================================
            ACTIVIDADES DEL ALUMNO
         ============================================== */

         INNER JOIN actividad_estudiantes ae
           ON ae.id_alumno =
              pp.id_usuario


         /* ==============================================
            ENTREGAS
         ============================================== */

         LEFT JOIN (
           SELECT
             id_actividad_estudiante,

             MAX(
               tiempo_realizacion
             ) AS tiempo_realizacion,

             MAX(
               calificacion
             ) AS calificacion,

             MAX(
               fecha_entrega
             ) AS fecha_entrega

           FROM entregas

           GROUP BY
             id_actividad_estudiante

         ) en
           ON en.id_actividad_estudiante =
              ae.id_actividad_estudiante


         /* ==============================================
            EVENTOS DE INVESTIGACIÓN POR ACTIVIDAD
         ============================================== */

         LEFT JOIN (
           SELECT
             e.id_prueba,

             e.id_usuario,

             e.id_actividad,


             /* ACCESIBILIDAD */

             SUM(
               CASE
                 WHEN
                   e.tipo_evento =
                   'Accesibilidad'

                 THEN 1

                 ELSE 0
               END
             )
               AS veces_uso_accesibilidad,


             /* CHATBOT */

             SUM(
               CASE
                 WHEN
                   e.tipo_evento =
                   'Chatbot'

                 THEN 1

                 ELSE 0
               END
             )
               AS interacciones_chatbot,


             /* DURACIÓN */

             SUM(
               COALESCE(
                 e.duracion_segundos,
                 0
               )
             )
               AS duracion_sesion_seg,


             /* CLICS */

             SUM(
               COALESCE(
                 e.cantidad_clicks,
                 0
               )
             )
               AS total_clicks,


             /* SCROLL */

             SUM(
               COALESCE(
                 e.cantidad_scroll,
                 0
               )
             )
               AS total_scroll,


             /* TECLADO */

             SUM(
               COALESCE(
                 e.cantidad_teclas,
                 0
               )
             )
               AS total_teclado,


             /* ÚLTIMO DISPOSITIVO REGISTRADO */

             SUBSTRING_INDEX(
               GROUP_CONCAT(
                 NULLIF(
                   TRIM(
                     e.dispositivo
                   ),
                   ''
                 )

                 ORDER BY
                   e.fecha_hora DESC

                 SEPARATOR '||'
               ),
               '||',
               1
             )
               AS dispositivo,


             /* ÚLTIMO NAVEGADOR REGISTRADO */

             SUBSTRING_INDEX(
               GROUP_CONCAT(
                 NULLIF(
                   TRIM(
                     e.navegador
                   ),
                   ''
                 )

                 ORDER BY
                   e.fecha_hora DESC

                 SEPARATOR '||'
               ),
               '||',
               1
             )
               AS navegador


           FROM eventos_investigacion e

           WHERE
             e.id_prueba = ?

             /*
              * Solo asociamos a una actividad
              * los eventos que realmente tienen
              * id_actividad.
              *
              * Esto evita copiar un evento global
              * de Chatbot o Accesibilidad en todas
              * las actividades del alumno.
              */

             AND e.id_actividad
                 IS NOT NULL


           GROUP BY
             e.id_prueba,
             e.id_usuario,
             e.id_actividad

         ) ev
           ON ev.id_prueba =
              pp.id_prueba

          AND ev.id_usuario =
              ae.id_alumno

          AND ev.id_actividad =
              ae.id_actividad


         /* ==============================================
            FILTRO DE PRUEBA
         ============================================== */

         WHERE
           pp.id_prueba = ?

           AND pp.consentimiento =
               TRUE


           /*
            * Solo guardamos actividades que tengan
            * alguna interacción dentro del periodo
            * de la prueba.
            */

           AND (
             /* INICIO */

             (
               ae.fecha_inicio
               IS NOT NULL

               AND DATE(
                     ae.fecha_inicio
                   ) >= DATE(
                     p.fecha_inicio
                   )

               AND (
                 p.fecha_fin IS NULL

                 OR DATE(
                      ae.fecha_inicio
                    ) <= DATE(
                      p.fecha_fin
                    )
               )
             )


             OR


             /* FINALIZACIÓN */

             (
               ae.fecha_finalizacion
               IS NOT NULL

               AND DATE(
                     ae.fecha_finalizacion
                   ) >= DATE(
                     p.fecha_inicio
                   )

               AND (
                 p.fecha_fin IS NULL

                 OR DATE(
                      ae.fecha_finalizacion
                    ) <= DATE(
                      p.fecha_fin
                    )
               )
             )


             OR


             /* ÚLTIMO ACCESO */

             (
               ae.ultimo_acceso
               IS NOT NULL

               AND DATE(
                     ae.ultimo_acceso
                   ) >= DATE(
                     p.fecha_inicio
                   )

               AND (
                 p.fecha_fin IS NULL

                 OR DATE(
                      ae.ultimo_acceso
                    ) <= DATE(
                      p.fecha_fin
                    )
               )
             )


             OR


             /* ENTREGA */

             (
               en.fecha_entrega
               IS NOT NULL

               AND DATE(
                     en.fecha_entrega
                   ) >= DATE(
                     p.fecha_inicio
                   )

               AND (
                 p.fecha_fin IS NULL

                 OR DATE(
                      en.fecha_entrega
                    ) <= DATE(
                      p.fecha_fin
                    )
               )
             )


             OR


             /* EVENTOS */

             ev.id_actividad
             IS NOT NULL
           )


         /* ==============================================
            ACTUALIZAR SI YA EXISTE
         ============================================== */

                  ON DUPLICATE KEY UPDATE

           tiempo_realizacion_seg =
             VALUES(
               tiempo_realizacion_seg
             ),

           porcentaje_avance =
             VALUES(
               porcentaje_avance
             ),

           calificacion =
             VALUES(
               calificacion
             ),

           veces_uso_accesibilidad =
             VALUES(
               veces_uso_accesibilidad
             ),

           interacciones_chatbot =
             VALUES(
               interacciones_chatbot
             ),

           duracion_sesion_seg =
             VALUES(
               duracion_sesion_seg
             ),

           total_clicks =
             VALUES(
               total_clicks
             ),

           total_scroll =
             VALUES(
               total_scroll
             ),

           total_interacciones_teclado =
             VALUES(
               total_interacciones_teclado
             ),

           dispositivo =
             COALESCE(
               VALUES(
                 dispositivo
               ),
               metricas_investigacion.dispositivo
             ),

           navegador =
             COALESCE(
               VALUES(
                 navegador
               ),
               metricas_investigacion.navegador
             ),

           sistema_operativo =
             COALESCE(
               VALUES(
                 sistema_operativo
               ),
               metricas_investigacion.sistema_operativo
             ),

           fecha_registro =
             CURRENT_TIMESTAMP`,
        [
          idPrueba,
          idPrueba,
        ]
      );


    // =================================================
    // CONTAR MÉTRICAS EXISTENTES
    // =================================================

    const [conteoMetricas] =
  await pool.query(
    `SELECT
       COUNT(*) AS total

     FROM metricas_investigacion

     WHERE id_prueba = ?`,
    [
      idPrueba,
    ]
  );

const total =
  entero(
    conteoMetricas[0]?.total
  );
  

    // =================================================
    // CONTAR MÉTRICAS EXISTENTES
    // =================================================

    const [conteo] =
      await pool.query(
        `SELECT
           COUNT(*) AS total

         FROM metricas_investigacion

         WHERE id_prueba = ?`,
        [
          idPrueba,
        ]
      );


    const totalMetricas =
  entero(
    conteoMetricas[0]?.total
  );

    console.log(
  `Métricas sincronizadas para prueba ${idPrueba}: ${totalMetricas}`
);

return {
  procesadas:
    entero(
      resultado.affectedRows
    ),

  total: totalMetricas,
};

  } catch (error) {
    console.error(
      'Error al sincronizar métricas de investigación:',
      error
    );

    /*
     * IMPORTANTE:
     *
     * Lanzamos el error para que el controlador
     * que hizo la consulta pueda informarlo.
     */
    throw error;
  }
};

// =====================================================
// ERRORES DE NAVEGACIÓN
// =====================================================

const clasificarError = (fila) => {
  const texto =
    `${fila.accion || ''} ${fila.descripcion || ''}`
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toLowerCase();

  if (
    texto.includes('acceso') ||
    texto.includes('sesion')
  ) {
    return 'Acceso fallido';
  }

  if (
    texto.includes('incomplet') ||
    texto.includes('abandon')
  ) {
    return 'Acción incompleta';
  }

  return 'Error de navegación';
};

const obtenerErroresNavegacion = async (req, res) => {
  try {
    const prueba = await obtenerPrueba(req);

    if (!prueba) {
      return responderSinPrueba(res, {
        totalErrores: 0,
        estudiantesConErrores: 0,
        accesosFallidos: 0,
        erroresNavegacion: 0,
        accionesIncompletas: 0,
        errores: [],
      });
    }

    const [filas] = await pool.query(
      `SELECT
         e.id_evento,
         e.accion,
         e.pantalla,
         e.descripcion,

         DATE_FORMAT(
           e.fecha_hora,
           '%d/%m/%Y'
         ) AS fecha,

         DATE_FORMAT(
           e.fecha_hora,
           '%H:%i'
         ) AS hora,

         u.nombre,
         u.apellido_paterno,
         u.apellido_materno

       FROM eventos_investigacion e

       INNER JOIN usuarios u
         ON u.id_usuario =
            e.id_usuario

       WHERE e.id_prueba = ?
         AND e.tipo_evento = 'Error'

       ORDER BY
         e.fecha_hora DESC,
         e.id_evento DESC

       LIMIT 200`,
      [prueba.id_prueba]
    );

    const errores = filas.map(
      (fila) => ({
        id:
          entero(fila.id_evento),

        estudiante:
          nombreCompleto(fila),

        tipo:
          clasificarError(fila),

        pantalla:
          fila.pantalla ||
          'Pantalla no registrada',

        fecha:
          fila.fecha,

        hora:
          fila.hora,

        descripcion:
          fila.descripcion ||
          fila.accion,
      })
    );

    const usuarios = new Set(
      filas.map(
        (fila) =>
          nombreCompleto(fila)
      )
    );

    return res.status(200).json({
      mensaje:
        'Errores de navegación obtenidos correctamente.',

      prueba:
        pruebaPublica(prueba),

      totalErrores:
        errores.length,

      estudiantesConErrores:
        usuarios.size,

      accesosFallidos:
        errores.filter(
          (item) =>
            item.tipo ===
            'Acceso fallido'
        ).length,

      erroresNavegacion:
        errores.filter(
          (item) =>
            item.tipo ===
            'Error de navegación'
        ).length,

      accionesIncompletas:
        errores.filter(
          (item) =>
            item.tipo ===
            'Acción incompleta'
        ).length,

      errores,
    });
  } catch (error) {
    console.error(
      'Error al obtener los errores de navegación:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron obtener los errores de navegación.',
    });
  }
};


// =====================================================
// MÉTRICAS DE ACCESIBILIDAD
// =====================================================

const usaAccesibilidad = (fila) => (
  booleano(
    fila.alto_contraste
  )
  ||
  booleano(
    fila.modo_oscuro
  )
  ||
  fila.tamano_texto !==
    'Normal'
  ||
  booleano(
    fila.fuente_dislexia
  )
  ||
  booleano(
    fila.lector_pantalla
  )
  ||
  booleano(
    fila.subtitulos
  )
  ||
  !booleano(
    fila.animaciones
  )
  ||
  booleano(
    fila.navegacion_teclado
  )
);

const obtenerMetricasAccesibilidad = async (req, res) => {
  try {
    const prueba =
      await obtenerPrueba(req);

    if (!prueba) {
      return responderSinPrueba(
        res,
        {
          estudiantesAnalizados: 0,
          usanAccesibilidad: 0,
          usanAltoContraste: 0,
          herramientaPrincipal:
            'Sin datos',
          herramientas: [],
          preferenciasEstudiantes: [],
        }
      );
    }

    const [
      [conteo],
      [filas],
    ] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(
             DISTINCT pp.id_usuario
           ) AS total

         FROM participantes_prueba pp

         INNER JOIN usuario_roles ur
           ON ur.id_usuario =
              pp.id_usuario

         INNER JOIN roles r
           ON r.id_rol =
              ur.id_rol
          AND r.nombre =
              'Alumno'

         WHERE pp.id_prueba = ?
           AND pp.consentimiento =
               TRUE`,
        [prueba.id_prueba]
      ),

      pool.query(
        `SELECT
           pa.*,

           u.nombre,
           u.apellido_paterno,
           u.apellido_materno,

           DATE_FORMAT(
             pa.fecha_actualizacion,
             '%d/%m/%Y %H:%i'
           ) AS fecha_actualizacion_texto

         FROM participantes_prueba pp

         INNER JOIN preferencias_accesibilidad pa
           ON pa.id_usuario =
              pp.id_usuario

         INNER JOIN usuarios u
           ON u.id_usuario =
              pp.id_usuario

         INNER JOIN usuario_roles ur
           ON ur.id_usuario =
              pp.id_usuario

         INNER JOIN roles r
           ON r.id_rol =
              ur.id_rol
          AND r.nombre =
              'Alumno'

         WHERE pp.id_prueba = ?
           AND pp.consentimiento =
               TRUE

         ORDER BY
           u.apellido_paterno,
           u.nombre`,
        [prueba.id_prueba]
      ),
    ]);

    const estudiantesAnalizados =
      entero(conteo[0].total);

    const configuracionHerramientas = [
      [
        'Alto contraste',
        'alto_contraste',
      ],
      [
        'Tamaño de texto',
        'tamano_texto',
      ],
      [
        'Fuente para dislexia',
        'fuente_dislexia',
      ],
      [
        'Lector de pantalla',
        'lector_pantalla',
      ],
      [
        'Subtítulos',
        'subtitulos',
      ],
      [
        'Navegación por teclado',
        'navegacion_teclado',
      ],
      [
        'Modo oscuro',
        'modo_oscuro',
      ],
    ];

    const herramientas =
      configuracionHerramientas.map(
        (
          [nombre, campo],
          indice
        ) => {
          const estudiantes =
            filas.filter(
              (fila) => (
                campo ===
                  'tamano_texto'
                  ? fila.tamano_texto !==
                    'Normal'
                  : booleano(
                      fila[campo]
                    )
              )
            ).length;

          return {
            id:
              indice + 1,

            nombre,

            estudiantes,

            porcentaje:
              estudiantesAnalizados > 0
                ? Math.round(
                    (
                      estudiantes /
                      estudiantesAnalizados
                    ) *
                    100
                  )
                : 0,
          };
        }
      );

    const principal =
      [...herramientas]
        .sort(
          (a, b) =>
            b.estudiantes -
            a.estudiantes
        )[0];

    return res.status(200).json({
      mensaje:
        'Métricas de accesibilidad obtenidas correctamente.',

      prueba:
        pruebaPublica(prueba),

      estudiantesAnalizados,

      usanAccesibilidad:
        filas.filter(
          usaAccesibilidad
        ).length,

      usanAltoContraste:
        filas.filter(
          (fila) =>
            booleano(
              fila.alto_contraste
            )
        ).length,

      herramientaPrincipal:
        principal &&
        principal.estudiantes > 0
          ? principal.nombre
          : 'Sin datos',

      herramientas,

      preferenciasEstudiantes:
        filas.map((fila) => ({
          idPreferencia:
            entero(
              fila.id_preferencia
            ),

          idUsuario:
            entero(
              fila.id_usuario
            ),

          estudiante:
            nombreCompleto(fila),

          altoContraste:
            booleano(
              fila.alto_contraste
            ),

          modoOscuro:
            booleano(
              fila.modo_oscuro
            ),

          tamanoTexto:
            fila.tamano_texto,

          fuenteDislexia:
            booleano(
              fila.fuente_dislexia
            ),

          lectorPantalla:
            booleano(
              fila.lector_pantalla
            ),

          velocidadLectura:
            decimal(
              fila.velocidad_lectura
            ),

          subtitulos:
            booleano(
              fila.subtitulos
            ),

          idioma:
            fila.idioma,

          animaciones:
            booleano(
              fila.animaciones
            ),

          navegacionTeclado:
            booleano(
              fila.navegacion_teclado
            ),

          fechaActualizacion:
            fila.fecha_actualizacion_texto,
        })),
    });
  } catch (error) {
    console.error(
      'Error al obtener métricas de accesibilidad:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron obtener las métricas de accesibilidad.',
    });
  }
};


// =====================================================
// PROGRESO ACADÉMICO
// =====================================================

const consultarProgreso = async (idPrueba) => {

  // ===================================================
  // ACTUALIZAR MÉTRICAS ANTES DE CONSULTAR PROGRESO
  // ===================================================

  await sincronizarMetricasInvestigacion(
    idPrueba
  );


  const [estudiantes] =
    await pool.query(
      `SELECT
         u.id_usuario,
         u.nombre,
         u.apellido_paterno,
         u.apellido_materno,

         COALESCE(
           ap.porcentaje,
           0
         ) AS porcentaje,

         COALESCE(
           ap.actividades_completadas,
           0
         ) AS actividades_completadas,

         COALESCE(
           ap.total_actividades,
           0
         ) AS total_actividades,

         COALESCE(
           ap.evaluaciones_realizadas,
           0
         ) AS evaluaciones_realizadas,

         COALESCE(
           ap.total_evaluaciones,
           0
         ) AS total_evaluaciones,

         COALESCE(
           re.recursos_utilizados,
           0
         ) AS recursos_utilizados,

         DATE_FORMAT(
           GREATEST(
             COALESCE(
               ap.fecha_registro,
               '1000-01-01'
             ),
             COALESCE(
               re.fecha_registro,
               '1000-01-01'
             )
           ),
           '%d/%m/%Y'
         ) AS fecha_registro

       FROM participantes_prueba pp

       INNER JOIN usuarios u
         ON u.id_usuario =
            pp.id_usuario

       INNER JOIN usuario_roles ur
         ON ur.id_usuario =
            pp.id_usuario

       INNER JOIN roles r
         ON r.id_rol =
            ur.id_rol
        AND r.nombre =
            'Alumno'

       LEFT JOIN (
         SELECT
           ae.id_alumno,

           ROUND(
             AVG(
               ae.porcentaje_avance
             )
           ) AS porcentaje,

           SUM(
             ae.estado IN (
               'Completada',
               'Calificada'
             )
           ) AS actividades_completadas,

           COUNT(*)
             AS total_actividades,

           SUM(
             a.tipo =
               'Evaluacion'
             AND
             ae.estado IN (
               'Completada',
               'Calificada'
             )
           ) AS evaluaciones_realizadas,

           SUM(
             a.tipo =
               'Evaluacion'
           ) AS total_evaluaciones,

           MAX(
             COALESCE(
               ae.fecha_finalizacion,
               ae.ultimo_acceso
             )
           ) AS fecha_registro

         FROM actividad_estudiantes ae

         INNER JOIN actividades a
           ON a.id_actividad =
              ae.id_actividad

         GROUP BY
           ae.id_alumno

       ) ap
         ON ap.id_alumno =
            u.id_usuario

       LEFT JOIN (
         SELECT
           id_usuario,

           COUNT(
             DISTINCT id_recurso
           ) AS recursos_utilizados,

           MAX(
             fecha_acceso
           ) AS fecha_registro

         FROM uso_recursos

         GROUP BY
           id_usuario

       ) re
         ON re.id_usuario =
            u.id_usuario

       WHERE pp.id_prueba = ?
         AND pp.consentimiento =
             TRUE

       ORDER BY
         u.apellido_paterno,
         u.nombre`,
      [idPrueba]
    );

  const [historial] =
    await pool.query(
      `SELECT *
       FROM (
         SELECT
           DATE(
             fecha_registro
           ) AS fecha_orden,

           DATE_FORMAT(
             MIN(
               fecha_registro
             ),
             '%d %b'
           ) AS fecha,

           ROUND(
             AVG(
               porcentaje_avance
             )
           ) AS porcentaje

         FROM metricas_investigacion

         WHERE id_prueba = ?

         GROUP BY
           DATE(
             fecha_registro
           )

         ORDER BY
           fecha_orden DESC

         LIMIT 8

       ) datos

       ORDER BY
         fecha_orden ASC`,
      [idPrueba]
    );

  const lista =
    estudiantes.map((fila) => ({
      id:
        entero(
          fila.id_usuario
        ),

      estudiante:
        nombreCompleto(fila),

      porcentaje:
        entero(
          fila.porcentaje
        ),

      actividadesCompletadas:
        entero(
          fila.actividades_completadas
        ),

      totalActividades:
        entero(
          fila.total_actividades
        ),

      evaluacionesRealizadas:
        entero(
          fila.evaluaciones_realizadas
        ),

      totalEvaluaciones:
        entero(
          fila.total_evaluaciones
        ),

      recursosUtilizados:
        entero(
          fila.recursos_utilizados
        ),

      fechaRegistro:
        fila.fecha_registro ===
        '01/01/1000'
          ? 'Sin actividad'
          : fila.fecha_registro,
    }));

  const totales =
    lista.reduce(
      (acumulado, item) => ({
        progreso:
          acumulado.progreso +
          item.porcentaje,

        actividadesCompletadas:
          acumulado.actividadesCompletadas +
          item.actividadesCompletadas,

        totalActividades:
          acumulado.totalActividades +
          item.totalActividades,

        evaluacionesRealizadas:
          acumulado.evaluacionesRealizadas +
          item.evaluacionesRealizadas,

        totalEvaluaciones:
          acumulado.totalEvaluaciones +
          item.totalEvaluaciones,
      }),
      {
        progreso: 0,
        actividadesCompletadas: 0,
        totalActividades: 0,
        evaluacionesRealizadas: 0,
        totalEvaluaciones: 0,
      }
    );

  return {
    progresoPromedio:
      lista.length > 0
        ? Math.round(
            totales.progreso /
            lista.length
          )
        : 0,

    actividadesCompletadas:
      totales.actividadesCompletadas,

    totalActividades:
      totales.totalActividades,

    evaluacionesRealizadas:
      totales.evaluacionesRealizadas,

    totalEvaluaciones:
      totales.totalEvaluaciones,

    estudiantes:
      lista,

    historial:
      historial.map(
        (fila, indice) => ({
          id:
            indice + 1,

          fecha:
            fila.fecha,

          porcentaje:
            entero(
              fila.porcentaje
            ),
        })
      ),
  };
};

const obtenerProgresoAcademico = async (req, res) => {
  try {
    const prueba =
      await obtenerPrueba(req);

    if (!prueba) {
      return responderSinPrueba(
        res,
        {
          progresoPromedio: 0,
          actividadesCompletadas: 0,
          totalActividades: 0,
          evaluacionesRealizadas: 0,
          totalEvaluaciones: 0,
          estudiantes: [],
          historial: [],
        }
      );
    }

    const progreso =
      await consultarProgreso(
        prueba.id_prueba
      );

    return res.status(200).json({
      mensaje:
        'Progreso académico obtenido correctamente.',

      prueba:
        pruebaPublica(prueba),

      ...progreso,
    });
  } catch (error) {
    console.error(
      'Error al obtener el progreso académico:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo obtener el progreso académico.',
    });
  }
};


// =====================================================
// REPORTES
// =====================================================

const obtenerReportesInvestigacion = async (req, res) => {
  try {
    const prueba =
      await obtenerPrueba(req);

    if (!prueba) {
      return responderSinPrueba(
        res,
        {
          resumenes: [],

          barras: {
            altoContraste: 0,
            tamanoTexto: 0,
            lectorPantalla: 0,
            subtitulos: 0,
          },
        }
      );
    }

    const [
      [metricas],
      progreso,
    ] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(
             DISTINCT pp.id_usuario
           ) AS estudiantes,

           COUNT(
             DISTINCT CASE
               WHEN
                 pa.alto_contraste = TRUE
                 OR pa.modo_oscuro = TRUE
                 OR pa.tamano_texto <> 'Normal'
                 OR pa.fuente_dislexia = TRUE
                 OR pa.lector_pantalla = TRUE
                 OR pa.subtitulos = TRUE
                 OR pa.navegacion_teclado = TRUE
               THEN pp.id_usuario
             END
           ) AS usan_accesibilidad,

           COUNT(
             DISTINCT CASE
               WHEN pa.alto_contraste = TRUE
               THEN pp.id_usuario
             END
           ) AS alto_contraste,

           COUNT(
             DISTINCT CASE
               WHEN pa.tamano_texto <> 'Normal'
               THEN pp.id_usuario
             END
           ) AS tamano_texto,

           COUNT(
             DISTINCT CASE
               WHEN pa.lector_pantalla = TRUE
               THEN pp.id_usuario
             END
           ) AS lector_pantalla,

           COUNT(
             DISTINCT CASE
               WHEN pa.subtitulos = TRUE
               THEN pp.id_usuario
             END
           ) AS subtitulos,

           (
             SELECT COUNT(*)

             FROM eventos_investigacion e

             WHERE e.id_prueba = ?
               AND e.tipo_evento = 'Error'
           ) AS errores,

           (
             SELECT COUNT(*)

             FROM eventos_investigacion e

             WHERE e.id_prueba = ?
               AND e.tipo_evento = 'Chatbot'
           ) AS chatbot,

           (
             SELECT
               ROUND(
                 AVG(
                   CASE
                     WHEN
                       ae.fecha_inicio IS NOT NULL
                       AND ae.fecha_finalizacion IS NOT NULL
                     THEN
                       TIMESTAMPDIFF(
                         SECOND,
                         ae.fecha_inicio,
                         ae.fecha_finalizacion
                       )
                     ELSE NULL
                   END
                 )
               )

             FROM actividad_estudiantes ae

             INNER JOIN participantes_prueba px
               ON px.id_usuario =
                  ae.id_alumno

              AND px.id_prueba = ?

              AND px.consentimiento =
                  TRUE

           ) AS tiempo_promedio_seg

         FROM participantes_prueba pp

         INNER JOIN usuario_roles ur
           ON ur.id_usuario =
              pp.id_usuario

         INNER JOIN roles r
           ON r.id_rol =
              ur.id_rol

          AND LOWER(r.nombre)
              IN ('alumno', 'estudiante')

         LEFT JOIN preferencias_accesibilidad pa
           ON pa.id_usuario =
              pp.id_usuario

         WHERE pp.id_prueba = ?

           AND pp.consentimiento =
               TRUE`,
        [
          prueba.id_prueba,
          prueba.id_prueba,
          prueba.id_prueba,
          prueba.id_prueba,
        ]
      ),

      consultarProgreso(
        prueba.id_prueba
      ),
    ]);

    const fila =
      metricas[0] || {};

    const estudiantes =
      entero(
        fila.estudiantes
      );

    const porcentaje =
      (cantidad) =>
        estudiantes > 0
          ? Math.round(
              (
                entero(cantidad) /
                estudiantes
              ) *
              100
            )
          : 0;

    return res.status(200).json({
      mensaje:
        'Reporte de investigación obtenido correctamente.',

      prueba:
        pruebaPublica(prueba),

      resumenes: [
        {
          id: 1,

          titulo:
            'Accesibilidad',

          valor:
            `${entero(
              fila.usan_accesibilidad
            )} de ${estudiantes}`,

          descripcion:
            'Estudiantes utilizaron alguna función de accesibilidad.',
        },

        {
          id: 2,

          titulo:
            'Tiempo promedio',

          valor:
            formatearDuracion(
              fila.tiempo_promedio_seg
            ),

          descripcion:
            'Tiempo promedio empleado para completar actividades.',
        },

        {
          id: 3,

          titulo:
            'Errores registrados',

          valor:
            String(
              entero(
                fila.errores
              )
            ),

          descripcion:
            'Errores y dificultades de navegación detectados.',
        },

        {
          id: 4,

          titulo:
            'Uso del chatbot',

          valor:
            String(
              entero(
                fila.chatbot
              )
            ),

          descripcion:
            'Interacciones registradas como eventos del chatbot.',
        },

        {
          id: 5,

          titulo:
            'Progreso académico',

          valor:
            `${progreso.progresoPromedio}%`,

          descripcion:
            'Porcentaje promedio de avance de los estudiantes.',
        },
      ],

      barras: {
        altoContraste:
          porcentaje(
            fila.alto_contraste
          ),

        tamanoTexto:
          porcentaje(
            fila.tamano_texto
          ),

        lectorPantalla:
          porcentaje(
            fila.lector_pantalla
          ),

        subtitulos:
          porcentaje(
            fila.subtitulos
          ),
      },
    });

  } catch (error) {
    console.error(
      'Error al obtener el reporte de investigación:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo obtener el reporte de investigación.',
    });
  }
};

// =====================================================
// PERFIL INVESTIGADOR
// =====================================================

const obtenerPerfilInvestigador = async (req, res) => {
  try {
    const idUsuario =
      entero(
        req.usuario?.id_usuario
      );

    const [filas] =
      await pool.query(
        `SELECT
           u.id_usuario,
           u.nombre,
           u.apellido_paterno,
           u.apellido_materno,
           u.correo,
           u.estado,
           u.ultimo_acceso,
           u.fecha_registro,

           GROUP_CONCAT(
             DISTINCT r.nombre
             ORDER BY r.nombre
             SEPARATOR ', '
           ) AS roles

         FROM usuarios u

         LEFT JOIN usuario_roles ur
           ON ur.id_usuario =
              u.id_usuario

         LEFT JOIN roles r
           ON r.id_rol =
              ur.id_rol

         WHERE u.id_usuario = ?

         GROUP BY
           u.id_usuario

         LIMIT 1`,
        [idUsuario]
      );

    if (filas.length === 0) {
      return res.status(404).json({
        mensaje:
          'No se encontró el perfil.',
      });
    }

    const fila =
      filas[0];

    return res.status(200).json({
      mensaje:
        'Perfil obtenido correctamente.',

      perfil: {
        idUsuario:
          entero(
            fila.id_usuario
          ),

        nombre:
          nombreCompleto(fila),

        correo:
          fila.correo,

        estado:
          fila.estado,

        roles:
          fila.roles ||
          'Investigador',

        ultimoAcceso:
          fila.ultimo_acceso,

        fechaRegistro:
          fila.fecha_registro,
      },
    });
  } catch (error) {
    console.error(
      'Error al obtener el perfil del investigador:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo obtener el perfil.',
    });
  }
};


// =====================================================
// CREAR PRUEBA DE INVESTIGACIÓN
// =====================================================

const crearPruebaInvestigacion = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      hipotesis,
      objetivo,
      version_wcag,
      fecha_inicio,
      fecha_fin,
      estado,
    } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({
        mensaje:
          'El nombre de la prueba es obligatorio.',
      });
    }

    if (!hipotesis?.trim()) {
      return res.status(400).json({
        mensaje:
          'La hipótesis es obligatoria.',
      });
    }

    if (!fecha_inicio) {
      return res.status(400).json({
        mensaje:
          'La fecha de inicio es obligatoria.',
      });
    }

    const estadosPermitidos = [
      'Planeada',
      'Activa',
      'Finalizada',
    ];

    const estadoFinal =
      estadosPermitidos.includes(
        estado
      )
        ? estado
        : 'Planeada';

    if (
      fecha_fin &&
      fecha_fin < fecha_inicio
    ) {
      return res.status(400).json({
        mensaje:
          'La fecha de fin no puede ser anterior a la fecha de inicio.',
      });
    }

    const [resultado] =
      await pool.query(
        `INSERT INTO pruebas_investigacion (
           nombre,
           descripcion,
           hipotesis,
           objetivo,
           version_wcag,
           fecha_inicio,
           fecha_fin,
           estado
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre.trim(),

          descripcion?.trim() ||
          null,

          hipotesis.trim(),

          objetivo?.trim() ||
          null,

          version_wcag?.trim() ||
          'WCAG 2.1',

          fecha_inicio,

          fecha_fin ||
          null,

          estadoFinal,
        ]
      );

    const [filas] =
      await pool.query(
        `SELECT *
         FROM pruebas_investigacion
         WHERE id_prueba = ?`,
        [
          resultado.insertId,
        ]
      );

    return res.status(201).json({
      mensaje:
        'Prueba de investigación creada correctamente.',

      prueba:
        filas[0],
    });
  } catch (error) {
    console.error(
      'Error al crear prueba de investigación:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo crear la prueba de investigación.',
    });
  }
};

const actualizarEstadoPruebaInvestigacion = async (req, res) => {
  let conexion;

  try {
    const idPrueba = entero(req.params.idPrueba);
    const { estado } = req.body;

    if (idPrueba <= 0) {
      return res.status(400).json({
        mensaje: 'El identificador de la prueba no es válido.',
      });
    }

    const estadosPermitidos = [
      'Planeada',
      'Activa',
      'Finalizada',
    ];

    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        mensaje:
          'El estado debe ser Planeada, Activa o Finalizada.',
      });
    }

    conexion = await pool.getConnection();

    const [pruebas] = await conexion.query(
      `SELECT
         id_prueba,
         nombre,
         estado
       FROM pruebas_investigacion
       WHERE id_prueba = ?
       LIMIT 1`,
      [idPrueba]
    );

    if (pruebas.length === 0) {
      return res.status(404).json({
        mensaje:
          'La prueba de investigación no existe.',
      });
    }

    await conexion.beginTransaction();

    /*
     * Si se va a activar esta prueba,
     * finalizamos cualquier otra que esté Activa.
     */
    if (estado === 'Activa') {
      await conexion.query(
        `UPDATE pruebas_investigacion
         SET estado = 'Finalizada'
         WHERE estado = 'Activa'
           AND id_prueba <> ?`,
        [idPrueba]
      );
    }

    await conexion.query(
      `UPDATE pruebas_investigacion
       SET estado = ?
       WHERE id_prueba = ?`,
      [
        estado,
        idPrueba,
      ]
    );

    await conexion.commit();

    const [actualizada] = await conexion.query(
      `SELECT
         id_prueba,
         nombre,
         descripcion,
         hipotesis,
         objetivo,
         version_wcag,
         fecha_inicio,
         fecha_fin,
         estado
       FROM pruebas_investigacion
       WHERE id_prueba = ?
       LIMIT 1`,
      [idPrueba]
    );

    return res.status(200).json({
      mensaje:
        estado === 'Activa'
          ? 'Prueba activada correctamente.'
          : estado === 'Finalizada'
            ? 'Prueba finalizada correctamente.'
            : 'Prueba actualizada correctamente.',

      prueba: actualizada[0],
    });

  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback();
      } catch (rollbackError) {
        console.error(
          'Error al revertir la transacción:',
          rollbackError
        );
      }
    }

    console.error(
      'Error al actualizar el estado de la prueba:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo actualizar el estado de la prueba.',
    });

  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

// =====================================================
// OBTENER PRUEBAS DE INVESTIGACIÓN
// =====================================================

const obtenerPruebasInvestigacion = async (_req, res) => {
  try {
    const [filas] =
      await pool.query(
        `SELECT
           p.*,

           COUNT(
             pp.id_participante
           ) AS participantes,

           SUM(
             pp.consentimiento =
             TRUE
           ) AS consentimientos

         FROM pruebas_investigacion p

         LEFT JOIN participantes_prueba pp
           ON pp.id_prueba =
              p.id_prueba

         GROUP BY
           p.id_prueba

         ORDER BY
           p.fecha_inicio DESC,
           p.id_prueba DESC`
      );

    return res.status(200).json({
      mensaje:
        'Pruebas obtenidas correctamente.',

      pruebas:
        filas.map((fila) => ({
          ...fila,

          id_prueba:
            entero(
              fila.id_prueba
            ),

          participantes:
            entero(
              fila.participantes
            ),

          consentimientos:
            entero(
              fila.consentimientos
            ),
        })),
    });
  } catch (error) {
    console.error(
      'Error al obtener las pruebas:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron obtener las pruebas de investigación.',
    });
  }
};


// =====================================================
// ALUMNOS DISPONIBLES PARA INVESTIGACIÓN
// =====================================================

const obtenerAlumnosDisponiblesInvestigacion = async (_req, res) => {
  try {
    const [filas] =
      await pool.query(
        `SELECT DISTINCT
           u.id_usuario,
           u.nombre,
           u.apellido_paterno,
           u.apellido_materno,
           u.correo,
           u.estado

         FROM usuarios u

         INNER JOIN usuario_roles ur
           ON ur.id_usuario =
              u.id_usuario

         INNER JOIN roles r
           ON r.id_rol =
              ur.id_rol

         WHERE
           LOWER(r.nombre)
           IN (
             'alumno',
             'estudiante'
           )

           AND u.estado =
               'Activo'

         ORDER BY
           u.apellido_paterno,
           u.apellido_materno,
           u.nombre`
      );

    return res.status(200).json({
      mensaje:
        'Alumnos disponibles obtenidos correctamente.',

      alumnos:
        filas.map((fila) => ({
          idUsuario:
            entero(
              fila.id_usuario
            ),

          nombre:
            nombreCompleto(fila),

          correo:
            fila.correo,

          estado:
            fila.estado,
        })),
    });
  } catch (error) {
    console.error(
      'Error al obtener alumnos disponibles para investigación:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron obtener los alumnos disponibles.',
    });
  }
};


// =====================================================
// OBTENER PARTICIPANTES
// =====================================================

const obtenerParticipantesInvestigacion = async (req, res) => {
  try {
    const prueba =
      await obtenerPrueba(req);

    if (!prueba) {
      return responderSinPrueba(
        res,
        {
          participantes: [],
        }
      );
    }

    const [filas] =
      await pool.query(
        `SELECT
           pp.id_participante,
           pp.id_usuario,
           pp.grupo_experimental,
           pp.consentimiento,
           pp.fecha_registro,

           u.nombre,
           u.apellido_paterno,
           u.apellido_materno,
           u.correo,
           u.estado

         FROM participantes_prueba pp

         INNER JOIN usuarios u
           ON u.id_usuario =
              pp.id_usuario

         WHERE pp.id_prueba = ?

         ORDER BY
           u.apellido_paterno,
           u.apellido_materno,
           u.nombre`,
        [
          prueba.id_prueba,
        ]
      );

    return res.status(200).json({
      mensaje:
        'Participantes obtenidos correctamente.',

      prueba:
        pruebaPublica(prueba),

      participantes:
        filas.map((fila) => ({
          idParticipante:
            entero(
              fila.id_participante
            ),

          idUsuario:
            entero(
              fila.id_usuario
            ),

          nombre:
            nombreCompleto(fila),

          correo:
            fila.correo,

          grupo:
            fila.grupo_experimental,

          consentimiento:
            booleano(
              fila.consentimiento
            ),

          estado:
            fila.estado,

          fechaRegistro:
            fila.fecha_registro,
        })),
    });
  } catch (error) {
    console.error(
      'Error al obtener participantes:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron obtener participantes.',
    });
  }
};


// =====================================================
// GUARDAR / ACTUALIZAR PARTICIPANTES
// =====================================================

const guardarParticipantesInvestigacion = async (req, res) => {
  let conexion;

  try {
    const {
      id_prueba,
      participantes,
    } = req.body;

    const idPrueba =
      entero(
        id_prueba
      );

    if (idPrueba <= 0) {
      return res.status(400).json({
        mensaje:
          'Debes seleccionar una prueba de investigación.',
      });
    }

    if (!Array.isArray(participantes)) {
      return res.status(400).json({
        mensaje:
          'La lista de participantes no es válida.',
      });
    }

    conexion =
      await pool.getConnection();

    // Verificar existencia de la prueba
    const [pruebas] =
      await conexion.query(
        `SELECT
           id_prueba

         FROM pruebas_investigacion

         WHERE id_prueba = ?

         LIMIT 1`,
        [
          idPrueba,
        ]
      );

    if (pruebas.length === 0) {
      return res.status(404).json({
        mensaje:
          'La prueba de investigación no existe.',
      });
    }

    // IDs enviados por la aplicación
    const idsParticipantes = [
      ...new Set(
        participantes
          .map(
            (participante) =>
              entero(
                participante.idUsuario
              )
          )
          .filter(
            (idUsuario) =>
              idUsuario > 0
          )
      ),
    ];

    // Validar que sean alumnos activos
    if (
      idsParticipantes.length > 0
    ) {
      const placeholders =
        idsParticipantes
          .map(() => '?')
          .join(',');

      const [alumnosValidos] =
        await conexion.query(
          `SELECT DISTINCT
             u.id_usuario

           FROM usuarios u

           INNER JOIN usuario_roles ur
             ON ur.id_usuario =
                u.id_usuario

           INNER JOIN roles r
             ON r.id_rol =
                ur.id_rol

           WHERE
             u.id_usuario IN (
               ${placeholders}
             )

             AND u.estado =
                 'Activo'

             AND LOWER(r.nombre)
                 IN (
                   'alumno',
                   'estudiante'
                 )`,
          idsParticipantes
        );

      const idsValidos =
        new Set(
          alumnosValidos.map(
            (fila) =>
              entero(
                fila.id_usuario
              )
          )
        );

      const existeUsuarioInvalido =
        idsParticipantes.some(
          (idUsuario) =>
            !idsValidos.has(
              idUsuario
            )
        );

      if (
        existeUsuarioInvalido
      ) {
        return res.status(400).json({
          mensaje:
            'Uno o más participantes no son alumnos activos.',
        });
      }
    }

    await conexion.beginTransaction();

    // Eliminar participantes desmarcados
    if (
      idsParticipantes.length === 0
    ) {
      await conexion.query(
        `DELETE
         FROM participantes_prueba
         WHERE id_prueba = ?`,
        [
          idPrueba,
        ]
      );
    } else {
      const placeholders =
        idsParticipantes
          .map(() => '?')
          .join(',');

      await conexion.query(
        `DELETE
         FROM participantes_prueba

         WHERE id_prueba = ?

           AND id_usuario
               NOT IN (
                 ${placeholders}
               )`,
        [
          idPrueba,
          ...idsParticipantes,
        ]
      );
    }

    // Insertar o actualizar seleccionados
    for (
      const participante
      of participantes
    ) {
      const idUsuario =
        entero(
          participante.idUsuario
        );

      if (
        idUsuario <= 0
      ) {
        continue;
      }

      const grupo =
        participante.grupo ===
        'Control'
          ? 'Control'
          : 'Experimental';

      const consentimiento =
        participante.consentimiento ===
        true;

      await conexion.query(
        `INSERT INTO participantes_prueba (
           id_prueba,
           id_usuario,
           grupo_experimental,
           consentimiento
         )
         VALUES (?, ?, ?, ?)

         ON DUPLICATE KEY UPDATE

           grupo_experimental =
             VALUES(
               grupo_experimental
             ),

           consentimiento =
             VALUES(
               consentimiento
             )`,
        [
          idPrueba,
          idUsuario,
          grupo,
          consentimiento,
        ]
      );
    }

    await conexion.commit();

    return res.status(200).json({
      mensaje:
        'Participantes guardados correctamente.',

      totalParticipantes:
        idsParticipantes.length,
    });
  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback();
      } catch (rollbackError) {
        console.error(
          'Error al revertir la transacción:',
          rollbackError
        );
      }
    }

    console.error(
      'Error al guardar participantes de investigación:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron guardar los participantes.',
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

// =====================================================
// CATÁLOGO DE ESTÁNDARES
// =====================================================

const obtenerEstandaresInvestigacion = async (_req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT
         ce.id_estandar,
         ce.norma,
         ce.criterio,
         ce.nombre,
         ce.descripcion,
         ce.principio,
         ce.nivel,
         ce.referencia_oficial,

         fe.id_funcionalidad_estandar,
         fe.modulo,
         fe.funcionalidad,
         fe.descripcion AS descripcion_funcionalidad,
         fe.implementado

       FROM catalogo_estandares ce

       LEFT JOIN funcionalidades_estandares fe
         ON fe.id_estandar = ce.id_estandar

       ORDER BY
         ce.norma,
         ce.criterio,
         fe.modulo,
         fe.funcionalidad`
    );

    const mapa = new Map();

    for (const fila of filas) {
      const idEstandar = entero(fila.id_estandar);

      if (!mapa.has(idEstandar)) {
        mapa.set(idEstandar, {
          idEstandar,
          norma: fila.norma,
          criterio: fila.criterio,
          nombre: fila.nombre,
          descripcion: fila.descripcion,
          principio: fila.principio,
          nivel: fila.nivel,
          referenciaOficial: fila.referencia_oficial,
          funcionalidades: [],
        });
      }

      if (fila.id_funcionalidad_estandar) {
        mapa.get(idEstandar).funcionalidades.push({
          idFuncionalidadEstandar:
            entero(fila.id_funcionalidad_estandar),

          modulo:
            fila.modulo,

          funcionalidad:
            fila.funcionalidad,

          descripcion:
            fila.descripcion_funcionalidad,

          implementado:
            booleano(fila.implementado),
        });
      }
    }

    return res.status(200).json({
      mensaje:
        'Catálogo de estándares obtenido correctamente.',

      estandares:
        Array.from(mapa.values()),
    });
  } catch (error) {
    console.error(
      'Error al obtener estándares de investigación:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo obtener el catálogo de estándares.',
    });
  }
};


// =====================================================
// ESTÁNDARES RELACIONADOS CON UN ALUMNO
// =====================================================

const obtenerEstandaresAlumnoInvestigacion = async (req, res) => {
  try {
    const idUsuario =
      entero(req.params.idUsuario);

    if (idUsuario <= 0) {
      return res.status(400).json({
        mensaje:
          'El alumno indicado no es válido.',
      });
    }

    const prueba =
      await obtenerPrueba(req);

    if (!prueba) {
      return responderSinPrueba(res, {
        alumno: null,
        funcionesUtilizadas: [],
        estandaresRelacionados: [],
      });
    }

    // Verificar que el alumno pertenezca a la prueba
    const [participantes] = await pool.query(
      `SELECT
         u.id_usuario,
         u.nombre,
         u.apellido_paterno,
         u.apellido_materno,
         u.correo

       FROM participantes_prueba pp

       INNER JOIN usuarios u
         ON u.id_usuario = pp.id_usuario

       WHERE pp.id_prueba = ?
         AND pp.id_usuario = ?

       LIMIT 1`,
      [
        prueba.id_prueba,
        idUsuario,
      ]
    );

    if (participantes.length === 0) {
      return res.status(404).json({
        mensaje:
          'El alumno no pertenece a la prueba seleccionada.',
      });
    }

    const alumno =
      participantes[0];

    // Consultar preferencias actuales
    const [preferencias] = await pool.query(
      `SELECT
         alto_contraste,
         modo_oscuro,
         tamano_texto,
         fuente_dislexia,
         lector_pantalla,
         subtitulos,
         navegacion_teclado,
         animaciones,
         idioma,
         velocidad_lectura,
         fecha_actualizacion

       FROM preferencias_accesibilidad

       WHERE id_usuario = ?

       LIMIT 1`,
      [
        idUsuario,
      ]
    );

    const preferencia =
      preferencias[0] || null;

    const funcionesUtilizadas = [];

    if (preferencia) {
      if (
        booleano(
          preferencia.alto_contraste
        )
      ) {
        funcionesUtilizadas.push(
          'Alto contraste'
        );
      }

      if (
        preferencia.tamano_texto &&
        preferencia.tamano_texto !== 'Normal'
      ) {
        funcionesUtilizadas.push(
          'Tamaño de texto'
        );
      }

      if (
        booleano(
          preferencia.lector_pantalla
        )
      ) {
        funcionesUtilizadas.push(
          'Compatibilidad con lector de pantalla'
        );
      }

      if (
        booleano(
          preferencia.subtitulos
        )
      ) {
        funcionesUtilizadas.push(
          'Subtítulos'
        );
      }

      if (
        booleano(
          preferencia.navegacion_teclado
        )
      ) {
        funcionesUtilizadas.push(
          'Navegación por teclado'
        );
      }
    }

    let estandaresRelacionados = [];

    if (funcionesUtilizadas.length > 0) {
      const placeholders =
        funcionesUtilizadas
          .map(() => '?')
          .join(',');

      const [filas] = await pool.query(
        `SELECT DISTINCT
           ce.id_estandar,
           ce.norma,
           ce.criterio,
           ce.nombre,
           ce.descripcion,
           ce.principio,
           ce.nivel,
           ce.referencia_oficial,

           fe.modulo,
           fe.funcionalidad,
           fe.descripcion
             AS descripcion_funcionalidad

         FROM funcionalidades_estandares fe

         INNER JOIN catalogo_estandares ce
           ON ce.id_estandar =
              fe.id_estandar

         WHERE fe.funcionalidad
               IN (${placeholders})

           AND fe.implementado = TRUE

         ORDER BY
           ce.norma,
           ce.criterio`,
        funcionesUtilizadas
      );

      estandaresRelacionados =
        filas.map((fila) => ({
          idEstandar:
            entero(fila.id_estandar),

          norma:
            fila.norma,

          criterio:
            fila.criterio,

          nombre:
            fila.nombre,

          descripcion:
            fila.descripcion,

          principio:
            fila.principio,

          nivel:
            fila.nivel,

          referenciaOficial:
            fila.referencia_oficial,

          modulo:
            fila.modulo,

          funcionalidad:
            fila.funcionalidad,

          descripcionFuncionalidad:
            fila.descripcion_funcionalidad,
        }));
    }

    return res.status(200).json({
      mensaje:
        'Estándares del alumno obtenidos correctamente.',

      prueba:
        pruebaPublica(prueba),

      alumno: {
        idUsuario:
          entero(alumno.id_usuario),

        nombre:
          nombreCompleto(alumno),

        correo:
          alumno.correo,
      },

      preferencias: preferencia
        ? {
            altoContraste:
              booleano(
                preferencia.alto_contraste
              ),

            modoOscuro:
              booleano(
                preferencia.modo_oscuro
              ),

            tamanoTexto:
              preferencia.tamano_texto,

            fuenteDislexia:
              booleano(
                preferencia.fuente_dislexia
              ),

            lectorPantalla:
              booleano(
                preferencia.lector_pantalla
              ),

            subtitulos:
              booleano(
                preferencia.subtitulos
              ),

            navegacionTeclado:
              booleano(
                preferencia.navegacion_teclado
              ),

            animaciones:
              booleano(
                preferencia.animaciones
              ),

            idioma:
              preferencia.idioma,

            velocidadLectura:
              decimal(
                preferencia.velocidad_lectura
              ),

            fechaActualizacion:
              preferencia.fecha_actualizacion,
          }
        : null,

      funcionesUtilizadas,

      estandaresRelacionados,
    });
  } catch (error) {
    console.error(
      'Error al obtener estándares del alumno:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudieron obtener los estándares relacionados con el alumno.',
    });
  }
};

// =====================================================
// AYUDA
// =====================================================

const obtenerAyudaInvestigador = async (_req, res) => {
  try {
    const [filas] =
      await pool.query(
        `SELECT
           id_contenido,
           tipo,
           titulo,
           contenido,
           url_audio,
           palabras_clave,
           fecha_publicacion

         FROM centro_ayuda

         WHERE activo =
               TRUE

         ORDER BY
           fecha_publicacion DESC,
           id_contenido DESC`
      );

    return res.status(200).json({
      mensaje:
        'Contenido de ayuda obtenido correctamente.',

      contenidos:
        filas.map((fila) => ({
          idContenido:
            entero(
              fila.id_contenido
            ),

          tipo:
            fila.tipo,

          titulo:
            fila.titulo,

          contenido:
            fila.contenido,

          urlAudio:
            fila.url_audio,

          palabrasClave:
            fila.palabras_clave,

          fechaPublicacion:
            fila.fecha_publicacion,
        })),
    });
  } catch (error) {
    console.error(
      'Error al obtener el centro de ayuda:',
      error
    );

    return res.status(500).json({
      mensaje:
        'No se pudo obtener la ayuda.',
    });
  }
};


// =====================================================
// EXPORTACIONES
// =====================================================

module.exports = {
  obtenerResumenInvestigador,
  obtenerMetricasUso,
  obtenerTiemposActividades,
  obtenerTiemposRecursos,
  obtenerErroresNavegacion,
  obtenerMetricasAccesibilidad,
  obtenerProgresoAcademico,
  obtenerReportesInvestigacion,
  obtenerPerfilInvestigador,

  crearPruebaInvestigacion,
  obtenerPruebasInvestigacion,
  actualizarEstadoPruebaInvestigacion,

  obtenerAlumnosDisponiblesInvestigacion,
  obtenerParticipantesInvestigacion,
  guardarParticipantesInvestigacion,

  obtenerEstandaresInvestigacion,
  obtenerEstandaresAlumnoInvestigacion,

  obtenerAyudaInvestigador,
};