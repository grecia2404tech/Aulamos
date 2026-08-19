import { Ionicons } from '@expo/vector-icons';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  PantallaInvestigador,
  Seccion,
  SinDatos,
  Tarjeta,
  TextoPrincipal,
  TextoSecundario,
} from '../../components/investigador/InvestigadorUI';

import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useInvestigacion } from '../../contexts/InvestigacionContext';

import {
  EstandarInvestigacion,
  EstandaresAlumnoInvestigacion,
  obtenerEstandaresAlumnoInvestigacion,
  obtenerEstandaresInvestigacion,
  obtenerParticipantesInvestigacion,
  ParticipanteInvestigacion,
} from '../../services/investigadorService';


// =====================================================
// PANTALLA
// =====================================================

export default function EstandaresAccesibilidadScreen() {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  const {
    pruebaSeleccionada,
    idPruebaSeleccionada,
  } = useInvestigacion();


  // =====================================================
  // ESTADOS
  // =====================================================

  const [
    participantes,
    setParticipantes,
  ] =
    useState<ParticipanteInvestigacion[]>(
      [],
    );

  const [
    estandares,
    setEstandares,
  ] =
    useState<EstandarInvestigacion[]>(
      [],
    );

  const [
    idAlumno,
    setIdAlumno,
  ] =
    useState<number | null>(
      null,
    );

  const [
    detalleAlumno,
    setDetalleAlumno,
  ] =
    useState<EstandaresAlumnoInvestigacion | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loadingAlumno,
    setLoadingAlumno,
  ] =
    useState(false);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | undefined>(
      undefined,
    );

  const [
    mostrarAlumnos,
    setMostrarAlumnos,
  ] =
    useState(false);


  // =====================================================
  // ALUMNO SELECCIONADO
  // =====================================================

  const alumnoSeleccionado =
    useMemo(
      () =>
        participantes.find(
          (participante) =>
            participante.idUsuario ===
            idAlumno,
        ) || null,
      [
        participantes,
        idAlumno,
      ],
    );


  // =====================================================
  // CARGAR PARTICIPANTES
  // =====================================================

  const cargarParticipantes =
    useCallback(
      async (
        pruebaId: number,
      ) => {
        const respuesta =
          await obtenerParticipantesInvestigacion(
            pruebaId,
          );

        /*
         * Para estándares solo mostramos
         * participantes con consentimiento.
         */
        const lista =
          respuesta.participantes.filter(
            (participante) =>
              participante.consentimiento,
          );

        setParticipantes(
          lista,
        );

        setIdAlumno(
          null,
        );

        setDetalleAlumno(
          null,
        );

        setMostrarAlumnos(
          false,
        );
      },
      [],
    );


  // =====================================================
  // CARGAR DATOS
  // =====================================================

  const cargarDatos =
    useCallback(
      async (
        mostrarCarga = true,
      ) => {
        try {
          if (
            mostrarCarga
          ) {
            setLoading(true);
          }

          setError(
            undefined,
          );

          /*
           * El catálogo general no depende
           * de una prueba específica.
           */
          const estandaresRespuesta =
            await obtenerEstandaresInvestigacion();

          setEstandares(
            estandaresRespuesta,
          );


          /*
           * Los participantes sí dependen
           * de la prueba global seleccionada.
           */
          if (
            idPruebaSeleccionada
          ) {
            await cargarParticipantes(
              idPruebaSeleccionada,
            );
          } else {
            setParticipantes([]);
            setIdAlumno(null);
            setDetalleAlumno(null);
          }

        } catch (err) {
          const mensaje =
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los estándares.';

          setError(
            mensaje,
          );

        } finally {
          if (
            mostrarCarga
          ) {
            setLoading(false);
          }
        }
      },
      [
        idPruebaSeleccionada,
        cargarParticipantes,
      ],
    );


  // =====================================================
  // CAMBIAR CUANDO CAMBIA LA PRUEBA
  // =====================================================

  useEffect(() => {
    cargarDatos();
  }, [
    cargarDatos,
  ]);


  // =====================================================
  // SELECCIONAR ALUMNO
  // =====================================================

  const seleccionarAlumno =
    async (
      participante:
        ParticipanteInvestigacion,
    ) => {
      if (
        !idPruebaSeleccionada
      ) {
        return;
      }

      try {
        setLoadingAlumno(
          true,
        );

        setIdAlumno(
          participante.idUsuario,
        );

        setMostrarAlumnos(
          false,
        );

        const respuesta =
          await obtenerEstandaresAlumnoInvestigacion(
            participante.idUsuario,
            idPruebaSeleccionada,
          );

        setDetalleAlumno(
          respuesta,
        );

      } catch (err) {
        const mensaje =
          err instanceof Error
            ? err.message
            : 'No se pudieron consultar los estándares del alumno.';

        Alert.alert(
          'Error',
          mensaje,
        );

      } finally {
        setLoadingAlumno(
          false,
        );
      }
    };


  // =====================================================
  // ACTUALIZAR
  // =====================================================

  const recargar =
    async () => {
      try {
        setRefreshing(
          true,
        );

        await cargarDatos(
          false,
        );

      } finally {
        setRefreshing(
          false,
        );
      }
    };


  // =====================================================
  // COLOR NIVEL
  // =====================================================

  const colorNivel = (
    nivel?: string | null,
  ) => {
    switch (
      nivel
    ) {
      case 'AAA':
        return '#7C3AED';

      case 'AA':
        return '#2563EB';

      case 'A':
        return '#15803D';

      default:
        return '#64748B';
    }
  };


  // =====================================================
  // VISTA
  // =====================================================

  return (
    <PantallaInvestigador
      titulo="Estándares de accesibilidad"
      descripcion={
        pruebaSeleccionada
          ? `Criterios relacionados con los participantes de: ${pruebaSeleccionada.nombre}`
          : 'Selecciona una prueba de investigación.'
      }
      loading={
        loading
      }
      refreshing={
        refreshing
      }
      error={
        error
      }
      onRetry={() =>
        cargarDatos()
      }
      onRefresh={
        recargar
      }
    >

      {/* =================================================
          PRUEBA ANALIZADA
      ================================================= */}

      {pruebaSeleccionada ? (
        <View
          style={[
            styles.pruebaActual,
            {
              backgroundColor:
                colores.fondoPrimario,

              borderColor:
                colores.borde,
            },
          ]}
        >
          <View
            style={[
              styles.iconoPrueba,
              {
                backgroundColor:
                  colores.tarjeta,
              },
            ]}
          >
            <Ionicons
              name="flask-outline"
              size={23}
              color={
                colores.primario
              }
            />
          </View>

          <View
            style={
              styles.infoPrueba
            }
          >
            <Text
              style={[
                styles.etiquetaPrueba,
                {
                  color:
                    colores.textoSecundario,

                  fontSize:
                    10 *
                    escalaTexto,
                },
              ]}
            >
              PRUEBA ANALIZADA
            </Text>

            <Text
              style={[
                styles.nombrePrueba,
                {
                  color:
                    colores.texto,

                  fontSize:
                    15 *
                    escalaTexto,
                },
              ]}
            >
              {
                pruebaSeleccionada.nombre
              }
            </Text>

            <Text
              style={[
                styles.estadoPrueba,
                {
                  color:
                    colores.textoSecundario,

                  fontSize:
                    11 *
                    escalaTexto,
                },
              ]}
            >
              {
                pruebaSeleccionada.estado
              }

              {' · '}

              ID {
                pruebaSeleccionada.id_prueba
              }

              {' · '}

              {
                pruebaSeleccionada.participantes
              }{' '}
              {
                pruebaSeleccionada.participantes ===
                1
                  ? 'participante'
                  : 'participantes'
              }
            </Text>
          </View>
        </View>
      ) : (
        <SinDatos
          texto="No hay una prueba de investigación seleccionada."
        />
      )}


      {/* =================================================
          ESTUDIANTE
      ================================================= */}

      {idPruebaSeleccionada ? (
        <Seccion
          titulo="Estudiante"
        >
          {participantes.length ? (
            <View>

              {/* SELECTOR */}

              <TouchableOpacity
                style={[
                  styles.selector,

                  {
                    borderColor:
                      colores.borde,

                    backgroundColor:
                      colores.tarjeta,
                  },
                ]}
                onPress={() =>
                  setMostrarAlumnos(
                    (valor) =>
                      !valor,
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Seleccionar estudiante"
                accessibilityHint="Muestra los participantes con consentimiento de la prueba seleccionada"
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={[
                      styles.etiquetaSelector,

                      {
                        color:
                          colores.textoSecundario,

                        fontSize:
                          11 *
                          escalaTexto,
                      },
                    ]}
                  >
                    ALUMNO SELECCIONADO
                  </Text>

                  <Text
                    style={[
                      styles.valorSelector,

                      {
                        color:
                          colores.texto,

                        fontSize:
                          15 *
                          escalaTexto,
                      },
                    ]}
                  >
                    {
                      alumnoSeleccionado
                        ?.nombre
                      ??
                      'Seleccionar estudiante'
                    }
                  </Text>
                </View>

                <Ionicons
                  name={
                    mostrarAlumnos
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={22}
                  color={
                    colores.textoSecundario
                  }
                />
              </TouchableOpacity>


              {/* LISTA */}

              {mostrarAlumnos ? (
                <View
                  style={[
                    styles.listaOpciones,

                    {
                      borderColor:
                        colores.borde,

                      backgroundColor:
                        colores.tarjeta,
                    },
                  ]}
                >
                  {participantes.map(
                    (
                      participante,
                    ) => (
                      <TouchableOpacity
                        key={
                          participante.idUsuario
                        }
                        style={[
                          styles.opcion,

                          {
                            borderBottomColor:
                              colores.borde,
                          },
                        ]}
                        onPress={() =>
                          seleccionarAlumno(
                            participante,
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Seleccionar a ${participante.nombre}`}
                      >
                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={[
                              styles.nombreOpcion,

                              {
                                color:
                                  colores.texto,

                                fontSize:
                                  14 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            {
                              participante.nombre
                            }
                          </Text>

                          <Text
                            style={[
                              styles.detalleOpcion,

                              {
                                color:
                                  colores.textoSecundario,

                                fontSize:
                                  11 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            {
                              participante.correo
                            }

                            {' · '}

                            {
                              participante.grupo
                            }
                          </Text>
                        </View>

                        {participante.idUsuario ===
                        idAlumno ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={21}
                            color={
                              colores.primario
                            }
                          />
                        ) : null}
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              ) : null}
            </View>
          ) : (
            <SinDatos
              texto="La prueba seleccionada no tiene participantes con consentimiento."
            />
          )}
        </Seccion>
      ) : null}


      {/* =================================================
          CARGANDO ALUMNO
      ================================================= */}

      {loadingAlumno ? (
        <View
          style={
            styles.cargandoAlumno
          }
        >
          <ActivityIndicator
            size="large"
            color={
              colores.primario
            }
          />

          <Text
            style={[
              styles.textoCarga,

              {
                color:
                  colores.textoSecundario,

                fontSize:
                  13 *
                  escalaTexto,
              },
            ]}
          >
            Consultando estándares...
          </Text>
        </View>
      ) : null}


      {/* =================================================
          DETALLE DEL ALUMNO
      ================================================= */}

      {detalleAlumno?.alumno &&
      !loadingAlumno ? (
        <>

          {/* =============================================
              RESUMEN
          ============================================= */}

          <Seccion
            titulo="Resumen del estudiante"
          >
            <Tarjeta>
              <View
                style={
                  styles.cabeceraAlumno
                }
              >
                <View
                  style={[
                    styles.avatar,

                    {
                      backgroundColor:
                        colores.fondoPrimario,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={26}
                    color={
                      colores.primario
                    }
                  />
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <TextoPrincipal>
                    {
                      detalleAlumno
                        .alumno
                        .nombre
                    }
                  </TextoPrincipal>

                  <TextoSecundario>
                    {
                      detalleAlumno
                        .alumno
                        .correo
                    }
                  </TextoSecundario>
                </View>
              </View>
            </Tarjeta>
          </Seccion>


          {/* =============================================
              FUNCIONES UTILIZADAS
          ============================================= */}

          <Seccion
            titulo="Funciones de accesibilidad utilizadas"
          >
            {detalleAlumno
              .funcionesUtilizadas
              .length ? (
              detalleAlumno
                .funcionesUtilizadas
                .map(
                  (
                    funcion,
                  ) => (
                    <View
                      key={
                        funcion
                      }
                      style={
                        styles.funcionUtilizada
                      }
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={21}
                        color="#15803D"
                      />

                      <Text
                        style={[
                          styles.textoFuncion,

                          {
                            fontSize:
                              13 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {
                          funcion
                        }
                      </Text>
                    </View>
                  ),
                )
            ) : (
              <SinDatos
                texto="El alumno no tiene funciones de accesibilidad relacionadas activas."
              />
            )}
          </Seccion>


          {/* =============================================
              CRITERIOS RELACIONADOS
          ============================================= */}

          <Seccion
            titulo="Criterios relacionados"
          >
            {detalleAlumno
              .estandaresRelacionados
              .length ? (
              detalleAlumno
                .estandaresRelacionados
                .map(
                  (
                    estandar,
                    indice,
                  ) => (
                    <Tarjeta
                      key={`${estandar.idEstandar}-${estandar.funcionalidad}-${indice}`}
                    >
                      <View
                        style={
                          styles.cabeceraEstandar
                        }
                      >
                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={[
                              styles.codigoEstandar,

                              {
                                color:
                                  colores.primario,
                              },
                            ]}
                          >
                            {
                              estandar.norma
                            }

                            {' '}

                            {
                              estandar.criterio
                            }
                          </Text>

                          <TextoPrincipal>
                            {
                              estandar.nombre
                            }
                          </TextoPrincipal>
                        </View>

                        {estandar.nivel ? (
                          <View
                            style={[
                              styles.badgeNivel,

                              {
                                borderColor:
                                  colorNivel(
                                    estandar.nivel,
                                  ),
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.textoNivel,

                                {
                                  color:
                                    colorNivel(
                                      estandar.nivel,
                                    ),
                                },
                              ]}
                            >
                              Nivel {
                                estandar.nivel
                              }
                            </Text>
                          </View>
                        ) : null}
                      </View>


                      <TextoSecundario>
                        {
                          estandar.descripcion
                        }
                      </TextoSecundario>


                      {/* RELACIÓN */}

                      <View
                        style={[
                          styles.relacion,

                          {
                            backgroundColor:
                              colores.fondoPrimario,
                          },
                        ]}
                      >
                        <Ionicons
                          name="link-outline"
                          size={17}
                          color={
                            colores.primario
                          }
                        />

                        <Text
                          style={[
                            styles.textoRelacion,

                            {
                              color:
                                colores.texto,
                            },
                          ]}
                        >
                          Funcionalidad:{' '}
                          {
                            estandar.funcionalidad
                          }
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.modulo,

                          {
                            color:
                              colores.textoSecundario,
                          },
                        ]}
                      >
                        Módulo:{' '}
                        {
                          estandar.modulo
                        }
                      </Text>
                    </Tarjeta>
                  ),
                )
            ) : (
              <SinDatos
                texto="No existen criterios asociados a las funciones utilizadas por este alumno."
              />
            )}
          </Seccion>
        </>
      ) : null}


      {/* =================================================
          CATÁLOGO GENERAL
      ================================================= */}

      <Seccion
        titulo={`Catálogo general (${estandares.length})`}
      >
        {estandares.length ? (
          estandares.map(
            (
              estandar,
            ) => (
              <Tarjeta
                key={
                  estandar.idEstandar
                }
              >
                <View
                  style={
                    styles.cabeceraEstandar
                  }
                >
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={[
                        styles.codigoEstandar,

                        {
                          color:
                            colores.primario,
                        },
                      ]}
                    >
                      {
                        estandar.norma
                      }

                      {' '}

                      {
                        estandar.criterio
                      }
                    </Text>

                    <TextoPrincipal>
                      {
                        estandar.nombre
                      }
                    </TextoPrincipal>
                  </View>


                  {/* NIVEL */}

                  {estandar.nivel ? (
                    <View
                      style={[
                        styles.badgeNivel,

                        {
                          borderColor:
                            colorNivel(
                              estandar.nivel,
                            ),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.textoNivel,

                          {
                            color:
                              colorNivel(
                                estandar.nivel,
                              ),
                          },
                        ]}
                      >
                        {
                          estandar.nivel
                        }
                      </Text>
                    </View>
                  ) : null}
                </View>


                {/* DESCRIPCIÓN */}

                <TextoSecundario>
                  {
                    estandar.descripcion
                  }
                </TextoSecundario>


                {/* PRINCIPIO */}

                {estandar.principio ? (
                  <Text
                    style={[
                      styles.principio,

                      {
                        color:
                          colores.textoSecundario,
                      },
                    ]}
                  >
                    Principio:{' '}
                    {
                      estandar.principio
                    }
                  </Text>
                ) : null}


                <View
                  style={[
                    styles.separador,

                    {
                      backgroundColor:
                        colores.borde,
                    },
                  ]}
                />


                {/* FUNCIONALIDADES */}

                <Text
                  style={[
                    styles.subtitulo,

                    {
                      color:
                        colores.textoSecundario,
                    },
                  ]}
                >
                  FUNCIONALIDADES RELACIONADAS
                </Text>

                {estandar
                  .funcionalidades
                  .length ? (
                  estandar
                    .funcionalidades
                    .map(
                      (
                        funcionalidad,
                      ) => (
                        <View
                          key={
                            funcionalidad
                              .idFuncionalidadEstandar
                          }
                          style={
                            styles.funcionalidad
                          }
                        >
                          <Ionicons
                            name={
                              funcionalidad
                                .implementado
                                ? 'checkmark-circle-outline'
                                : 'close-circle-outline'
                            }
                            size={19}
                            color={
                              funcionalidad
                                .implementado
                                ? '#15803D'
                                : '#DC2626'
                            }
                          />

                          <View
                            style={{
                              flex: 1,
                            }}
                          >
                            <Text
                              style={[
                                styles.nombreFuncionalidad,

                                {
                                  color:
                                    colores.texto,
                                },
                              ]}
                            >
                              {
                                funcionalidad
                                  .funcionalidad
                              }
                            </Text>

                            <Text
                              style={[
                                styles.modulo,

                                {
                                  color:
                                    colores.textoSecundario,
                                },
                              ]}
                            >
                              {
                                funcionalidad
                                  .modulo
                              }
                            </Text>
                          </View>
                        </View>
                      ),
                    )
                ) : (
                  <TextoSecundario>
                    Sin funcionalidades relacionadas.
                  </TextoSecundario>
                )}
              </Tarjeta>
            ),
          )
        ) : (
          <SinDatos
            texto="El catálogo de estándares está vacío."
          />
        )}
      </Seccion>

    </PantallaInvestigador>
  );
}


// =====================================================
// ESTILOS
// =====================================================

const styles =
  StyleSheet.create({

    // ===================================================
    // PRUEBA
    // ===================================================

    pruebaActual: {
      minHeight: 84,
      borderWidth: 1,
      borderRadius: 17,
      padding: 14,
      marginBottom: 18,
      flexDirection: 'row',
      alignItems: 'center',
    },

    iconoPrueba: {
      width: 47,
      height: 47,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },

    infoPrueba: {
      flex: 1,
      marginLeft: 12,
    },

    etiquetaPrueba: {
      fontWeight: '700',
      letterSpacing: 0.4,
    },

    nombrePrueba: {
      fontWeight: '900',
      marginTop: 2,
    },

    estadoPrueba: {
      marginTop: 4,
      fontWeight: '600',
    },


    // ===================================================
    // SELECTOR ALUMNO
    // ===================================================

    selector: {
      minHeight: 65,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 15,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    etiquetaSelector: {
      fontWeight: '700',
      letterSpacing: 0.3,
    },

    valorSelector: {
      marginTop: 3,
      fontWeight: '800',
    },

    listaOpciones: {
      marginTop: 8,
      borderWidth: 1,
      borderRadius: 14,
      overflow: 'hidden',
    },

    opcion: {
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    nombreOpcion: {
      fontWeight: '700',
    },

    detalleOpcion: {
      marginTop: 3,
    },


    // ===================================================
    // CARGA
    // ===================================================

    cargandoAlumno: {
      paddingVertical: 30,
      alignItems: 'center',
      gap: 10,
    },

    textoCarga: {
      fontWeight: '600',
    },


    // ===================================================
    // ALUMNO
    // ===================================================

    cabeceraAlumno: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    avatar: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },


    // ===================================================
    // FUNCIONES
    // ===================================================

    funcionUtilizada: {
      minHeight: 48,
      marginBottom: 9,
      borderRadius: 12,
      paddingHorizontal: 13,
      backgroundColor: '#F0FDF4',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    textoFuncion: {
      flex: 1,
      color: '#166534',
      fontWeight: '600',
    },


    // ===================================================
    // ESTÁNDARES
    // ===================================================

    cabeceraEstandar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 8,
    },

    codigoEstandar: {
      marginBottom: 4,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },

    badgeNivel: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    textoNivel: {
      fontSize: 11,
      fontWeight: '800',
    },

    relacion: {
      marginTop: 13,
      padding: 11,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    textoRelacion: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },

    modulo: {
      marginTop: 6,
      fontSize: 12,
    },

    principio: {
      marginTop: 10,
      fontSize: 12,
      fontWeight: '600',
    },

    separador: {
      height: 1,
      marginVertical: 13,
    },

    subtitulo: {
      marginBottom: 9,
      fontSize: 12,
      fontWeight: '800',
    },

    funcionalidad: {
      marginBottom: 9,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },

    nombreFuncionalidad: {
      fontSize: 13,
      fontWeight: '700',
    },
  });