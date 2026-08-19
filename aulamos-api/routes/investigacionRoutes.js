const express = require('express');

const verificarToken = require('../middleware/authMiddleware');
const { verificarRol } = require('../middleware/authMiddleware');

const {
  obtenerPruebaActivaUsuario,
  registrarEventoInvestigacion,
} = require('../controllers/eventoInvestigacionController');

const {
  obtenerMetricasChatbot,
} = require('../controllers/metricasChatbotController');

const {
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
} = require('../controllers/investigadorController');

const router = express.Router();



// =====================================================
// EVENTOS DE INVESTIGACIÓN
// =====================================================

router.get(
  '/prueba-activa',
  verificarToken,
  obtenerPruebaActivaUsuario
);

router.post(
  '/eventos',
  verificarToken,
  registrarEventoInvestigacion
);


// =====================================================
// PROTECCIÓN PARA INVESTIGADOR
// =====================================================

const soloInvestigador = [
  verificarToken,
  verificarRol('Investigador'),
];


// =====================================================
// DASHBOARD Y MÉTRICAS
// =====================================================

router.get(
  '/resumen',
  ...soloInvestigador,
  obtenerResumenInvestigador
);

router.get(
  '/metricas-uso',
  ...soloInvestigador,
  obtenerMetricasUso
);

router.get(
  '/tiempos-actividades',
  ...soloInvestigador,
  obtenerTiemposActividades
);

router.get(
  '/tiempos-recursos',
  ...soloInvestigador,
  obtenerTiemposRecursos
);

router.get(
  '/errores-navegacion',
  ...soloInvestigador,
  obtenerErroresNavegacion
);

router.get(
  '/metricas-accesibilidad',
  ...soloInvestigador,
  obtenerMetricasAccesibilidad
);

router.get(
  '/progreso-academico',
  ...soloInvestigador,
  obtenerProgresoAcademico
);

router.get(
  '/reportes',
  ...soloInvestigador,
  obtenerReportesInvestigacion
);


// =====================================================
// PERFIL
// =====================================================

router.get(
  '/perfil',
  ...soloInvestigador,
  obtenerPerfilInvestigador
);


// =====================================================
// PRUEBAS DE INVESTIGACIÓN
// =====================================================

router.get(
  '/pruebas',
  ...soloInvestigador,
  obtenerPruebasInvestigacion
);

router.post(
  '/pruebas',
  ...soloInvestigador,
  crearPruebaInvestigacion
);


// =====================================================
// PARTICIPANTES
// =====================================================

router.get(
  '/alumnos-disponibles',
  ...soloInvestigador,
  obtenerAlumnosDisponiblesInvestigacion
);

router.get(
  '/participantes',
  ...soloInvestigador,
  obtenerParticipantesInvestigacion
);

router.put(
  '/pruebas/:idPrueba/estado',
  ...soloInvestigador,
  actualizarEstadoPruebaInvestigacion
);

router.post(
  '/participantes',
  ...soloInvestigador,
  guardarParticipantesInvestigacion
);


// =====================================================
// ESTÁNDARES DE ACCESIBILIDAD
// =====================================================

router.get(
  '/estandares',
  ...soloInvestigador,
  obtenerEstandaresInvestigacion
);

router.get(
  '/estandares/alumno/:idUsuario',
  ...soloInvestigador,
  obtenerEstandaresAlumnoInvestigacion
);


// =====================================================
// AYUDA
// =====================================================

router.get(
  '/ayuda',
  ...soloInvestigador,
  obtenerAyudaInvestigador
);


// =====================================================
// CHATBOT - HU29
// =====================================================

router.get(
  '/metricas-chatbot',
  ...soloInvestigador,
  obtenerMetricasChatbot
);


// =====================================================
// EXPORTAR ROUTER
// =====================================================

module.exports = router;