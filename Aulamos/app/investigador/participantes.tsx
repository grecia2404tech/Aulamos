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
} from '../../components/investigador/InvestigadorUI';

import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useInvestigacion } from '../../contexts/InvestigacionContext';

import {
  AlumnoDisponibleInvestigacion,
  guardarParticipantesInvestigacion,
  obtenerAlumnosDisponiblesInvestigacion,
  obtenerParticipantesInvestigacion,
  ParticipanteGuardarInvestigacion,
} from '../../services/investigadorService';


// =====================================================
// TIPOS
// =====================================================

type GrupoInvestigacion =
  | 'Control'
  | 'Experimental';

type AlumnoSeleccion =
  AlumnoDisponibleInvestigacion & {
    seleccionado: boolean;
    grupo: GrupoInvestigacion;
    consentimiento: boolean;
    yaRegistrado: boolean;
  };


// =====================================================
// PANTALLA
// =====================================================

export default function ParticipantesInvestigacionScreen() {
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
    alumnos,
    setAlumnos,
  ] = useState<AlumnoSeleccion[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | undefined>(
    undefined,
  );


  // =====================================================
  // SELECCIONADOS
  // =====================================================

  const seleccionados = useMemo(
    () =>
      alumnos.filter(
        (alumno) =>
          alumno.seleccionado,
      ),
    [alumnos],
  );


  // =====================================================
  // TODOS SELECCIONADOS
  // =====================================================

  const todosSeleccionados =
    alumnos.length > 0 &&
    alumnos.every(
      (alumno) =>
        alumno.seleccionado,
    );


  // =====================================================
  // TOTAL CON CONSENTIMIENTO
  // =====================================================

  const totalConsentimientos =
    useMemo(
      () =>
        seleccionados.filter(
          (alumno) =>
            alumno.consentimiento,
        ).length,
      [seleccionados],
    );


  // =====================================================
  // CARGAR ALUMNOS
  // =====================================================

  const cargarAlumnos =
    useCallback(
      async (
        mostrarIndicador = true,
      ) => {
        if (
          !idPruebaSeleccionada
        ) {
          setAlumnos([]);
          setLoading(false);
          setError(undefined);

          return;
        }

        try {
          if (
            mostrarIndicador
          ) {
            setLoading(true);
          }

          setError(undefined);

          const [
            alumnosDisponibles,
            participantesRespuesta,
          ] = await Promise.all([
            obtenerAlumnosDisponiblesInvestigacion(),

            obtenerParticipantesInvestigacion(
              idPruebaSeleccionada,
            ),
          ]);


          // =============================================
          // PARTICIPANTES YA GUARDADOS
          // =============================================

          const mapaParticipantes =
            new Map(
              participantesRespuesta
                .participantes
                .map(
                  (participante) => [
                    participante.idUsuario,
                    participante,
                  ],
                ),
            );


          // =============================================
          // COMBINAR TODOS LOS ALUMNOS
          // =============================================

          const lista:
            AlumnoSeleccion[] =
            alumnosDisponibles.map(
              (alumno) => {
                const participante =
                  mapaParticipantes.get(
                    alumno.idUsuario,
                  );

                return {
                  ...alumno,

                  seleccionado:
                    Boolean(
                      participante,
                    ),

                  grupo:
                    participante?.grupo
                    ?? 'Experimental',

                  consentimiento:
                    participante
                      ?.consentimiento
                    ?? false,

                  yaRegistrado:
                    Boolean(
                      participante,
                    ),
                };
              },
            );

          setAlumnos(lista);

        } catch (err) {
          const mensaje =
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los participantes.';

          setError(mensaje);

        } finally {
          if (
            mostrarIndicador
          ) {
            setLoading(false);
          }
        }
      },
      [
        idPruebaSeleccionada,
      ],
    );


  // =====================================================
  // CAMBIAR AUTOMÁTICAMENTE AL CAMBIAR LA PRUEBA
  // =====================================================

  useEffect(() => {
    cargarAlumnos();
  }, [
    cargarAlumnos,
  ]);


  // =====================================================
  // SELECCIONAR / DESELECCIONAR ALUMNO
  // =====================================================

  const alternarAlumno = (
    idUsuario: number,
  ) => {
    setAlumnos(
      (actuales) =>
        actuales.map(
          (alumno) =>
            alumno.idUsuario ===
            idUsuario
              ? {
                  ...alumno,

                  seleccionado:
                    !alumno.seleccionado,
                }
              : alumno,
        ),
    );
  };


  // =====================================================
  // SELECCIONAR TODOS
  // =====================================================

  const alternarTodos = () => {
    const nuevoEstado =
      !todosSeleccionados;

    setAlumnos(
      (actuales) =>
        actuales.map(
          (alumno) => ({
            ...alumno,

            seleccionado:
              nuevoEstado,
          }),
        ),
    );
  };


  // =====================================================
  // GRUPO
  // =====================================================

  const cambiarGrupo = (
    idUsuario: number,
    grupo: GrupoInvestigacion,
  ) => {
    setAlumnos(
      (actuales) =>
        actuales.map(
          (alumno) =>
            alumno.idUsuario ===
            idUsuario
              ? {
                  ...alumno,
                  grupo,
                }
              : alumno,
        ),
    );
  };


  // =====================================================
  // CONSENTIMIENTO
  // =====================================================

  const alternarConsentimiento = (
    idUsuario: number,
  ) => {
    setAlumnos(
      (actuales) =>
        actuales.map(
          (alumno) =>
            alumno.idUsuario ===
            idUsuario
              ? {
                  ...alumno,

                  consentimiento:
                    !alumno
                      .consentimiento,
                }
              : alumno,
        ),
    );
  };


  // =====================================================
  // GUARDAR
  // =====================================================
     const guardar = async () => {
  if (!idPruebaSeleccionada) {
    Alert.alert(
      'Sin prueba',
      'Debes seleccionar una prueba de investigación.',
    );

    return;
  }

  /*
   * Si no hay ningún alumno seleccionado,
   * también permitimos guardar.
   *
   * El backend recibirá participantes: []
   * y eliminará todos los participantes
   * actualmente registrados en esta prueba.
   */

  try {
    setGuardando(true);

    const participantes:
      ParticipanteGuardarInvestigacion[] =
      seleccionados.map(
        (alumno) => ({
          idUsuario:
            alumno.idUsuario,

          grupo:
            alumno.grupo,

          consentimiento:
            alumno.consentimiento,
        }),
      );

      console.log(
  'PARTICIPANTES A GUARDAR:',
  {
    id_prueba: idPruebaSeleccionada,
    participantes,
  },
);

    const respuesta =
      await guardarParticipantesInvestigacion(
        idPruebaSeleccionada,
        participantes,
      );

    Alert.alert(
      participantes.length === 0
        ? 'Participantes eliminados'
        : 'Participantes guardados',
      respuesta.mensaje,
    );

    await cargarAlumnos(false);

  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : 'No se pudieron guardar los participantes.';

    Alert.alert(
      'Error',
      mensaje,
    );

  } finally {
    setGuardando(false);
  }
};


  // =====================================================
  // ACTUALIZAR
  // =====================================================

  const recargar =
    async () => {
      try {
        setRefreshing(true);

        await cargarAlumnos(
          false,
        );

      } finally {
        setRefreshing(false);
      }
    };


  // =====================================================
  // VISTA
  // =====================================================

  return (
    <PantallaInvestigador
      titulo="Participantes"
      descripcion={
        pruebaSeleccionada
          ? `Participantes de: ${pruebaSeleccionada.nombre}`
          : 'Selecciona una prueba desde el panel de investigación.'
      }
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={() =>
        cargarAlumnos()
      }
      onRefresh={recargar}
    >

      {/* =================================================
          PRUEBA SELECCIONADA
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
              size={24}
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
                    colores
                      .textoSecundario,

                  fontSize:
                    10 *
                    escalaTexto,
                },
              ]}
            >
              PRUEBA SELECCIONADA
            </Text>

            <Text
              style={[
                styles.nombrePrueba,
                {
                  color:
                    colores.texto,

                  fontSize:
                    16 *
                    escalaTexto,
                },
              ]}
            >
              {
                pruebaSeleccionada
                  .nombre
              }
            </Text>

            <Text
              style={[
                styles.estadoPrueba,
                {
                  color:
                    colores
                      .textoSecundario,

                  fontSize:
                    11 *
                    escalaTexto,
                },
              ]}
            >
              {
                pruebaSeleccionada
                  .estado
              }

              {' · '}

              ID{' '}
              {
                pruebaSeleccionada
                  .id_prueba
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
          RESUMEN
      ================================================= */}

      {idPruebaSeleccionada ? (
        <>
          <Seccion
            titulo="Resumen de participantes"
          >
            <View
              style={
                styles.resumenGrid
              }
            >

              {/* SELECCIONADOS */}

              <View
                style={[
                  styles.tarjetaResumen,
                  {
                    backgroundColor:
                      colores.tarjeta,

                    borderColor:
                      colores.borde,
                  },
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={25}
                  color={
                    colores.primario
                  }
                />

                <Text
                  style={[
                    styles.numeroResumen,
                    {
                      color:
                        colores.texto,

                      fontSize:
                        22 *
                        escalaTexto,
                    },
                  ]}
                >
                  {
                    seleccionados.length
                  }
                </Text>

                <Text
                  style={[
                    styles.textoResumen,
                    {
                      color:
                        colores
                          .textoSecundario,

                      fontSize:
                        11 *
                        escalaTexto,
                    },
                  ]}
                >
                  Seleccionados
                </Text>
              </View>


              {/* DISPONIBLES */}

              <View
                style={[
                  styles.tarjetaResumen,
                  {
                    backgroundColor:
                      colores.tarjeta,

                    borderColor:
                      colores.borde,
                  },
                ]}
              >
                <Ionicons
                  name="school-outline"
                  size={25}
                  color="#7C3AED"
                />

                <Text
                  style={[
                    styles.numeroResumen,
                    {
                      color:
                        colores.texto,

                      fontSize:
                        22 *
                        escalaTexto,
                    },
                  ]}
                >
                  {alumnos.length}
                </Text>

                <Text
                  style={[
                    styles.textoResumen,
                    {
                      color:
                        colores
                          .textoSecundario,

                      fontSize:
                        11 *
                        escalaTexto,
                    },
                  ]}
                >
                  Disponibles
                </Text>
              </View>


              {/* CONSENTIMIENTOS */}

              <View
                style={[
                  styles.tarjetaResumen,
                  {
                    backgroundColor:
                      colores.tarjeta,

                    borderColor:
                      colores.borde,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={25}
                  color="#15803D"
                />

                <Text
                  style={[
                    styles.numeroResumen,
                    {
                      color:
                        colores.texto,

                      fontSize:
                        22 *
                        escalaTexto,
                    },
                  ]}
                >
                  {
                    totalConsentimientos
                  }
                </Text>

                <Text
                  style={[
                    styles.textoResumen,
                    {
                      color:
                        colores
                          .textoSecundario,

                      fontSize:
                        11 *
                        escalaTexto,
                    },
                  ]}
                >
                  Consentimientos
                </Text>
              </View>

            </View>
          </Seccion>


          {/* =================================================
              ALUMNOS
          ================================================= */}

          <Seccion
            titulo={`Estudiantes (${seleccionados.length}/${alumnos.length})`}
          >

            {/* SELECCIONAR TODOS */}

            {alumnos.length > 0 ? (
              <TouchableOpacity
                style={[
                  styles.botonTodos,
                  {
                    borderColor:
                      colores.primario,

                    backgroundColor:
                      colores.fondoPrimario,
                  },
                ]}
                onPress={
                  alternarTodos
                }
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked:
                    todosSeleccionados,
                }}
                accessibilityLabel={
                  todosSeleccionados
                    ? 'Deseleccionar todos los estudiantes'
                    : 'Seleccionar todos los estudiantes'
                }
              >
                <Ionicons
                  name={
                    todosSeleccionados
                      ? 'checkbox'
                      : 'square-outline'
                  }
                  size={22}
                  color={
                    colores.primario
                  }
                />

                <Text
                  style={[
                    styles.textoTodos,
                    {
                      color:
                        colores.primario,

                      fontSize:
                        13 *
                        escalaTexto,
                    },
                  ]}
                >
                  {todosSeleccionados
                    ? 'Deseleccionar todos'
                    : 'Seleccionar todos'}
                </Text>
              </TouchableOpacity>
            ) : null}


            {/* LISTADO */}

            {alumnos.length > 0 ? (
              alumnos.map(
                (alumno) => (
                  <View
                    key={
                      alumno.idUsuario
                    }
                    style={[
                      styles.tarjetaAlumno,

                      {
                        backgroundColor:
                          colores.tarjeta,

                        borderColor:
                          alumno
                            .seleccionado
                            ? colores.primario
                            : colores.borde,
                      },
                    ]}
                  >

                    {/* ENCABEZADO */}

                    <TouchableOpacity
                      style={
                        styles.encabezadoAlumno
                      }
                      onPress={() =>
                        alternarAlumno(
                          alumno.idUsuario,
                        )
                      }
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked:
                          alumno.seleccionado,
                      }}
                      accessibilityLabel={`Seleccionar a ${alumno.nombre}`}
                    >
                      <Ionicons
                        name={
                          alumno.seleccionado
                            ? 'checkbox'
                            : 'square-outline'
                        }
                        size={26}
                        color={
                          alumno.seleccionado
                            ? colores.primario
                            : colores
                                .textoSecundario
                        }
                      />

                      <View
                        style={
                          styles.infoAlumno
                        }
                      >
                        <Text
                          style={[
                            styles.nombreAlumno,
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
                            alumno.nombre
                          }
                        </Text>

                        <Text
                          style={[
                            styles.correoAlumno,
                            {
                              color:
                                colores
                                  .textoSecundario,

                              fontSize:
                                12 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {
                            alumno.correo
                          }
                        </Text>

                        <View
                          style={
                            styles.estadoFila
                          }
                        >
                          <View
                            style={[
                              styles.puntoEstado,
                              {
                                backgroundColor:
                                  alumno.estado ===
                                  'Activo'
                                    ? '#15803D'
                                    : '#D97706',
                              },
                            ]}
                          />

                          <Text
                            style={[
                              styles.estadoAlumno,
                              {
                                color:
                                  colores
                                    .textoSecundario,

                                fontSize:
                                  11 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            Cuenta{' '}
                            {
                              alumno.estado
                            }
                          </Text>

                          {alumno
                            .yaRegistrado ? (
                            <View
                              style={
                                styles.badgeRegistrado
                              }
                            >
                              <Text
                                style={
                                  styles.textoRegistrado
                                }
                              >
                                Registrado
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>


                    {/* CONFIGURACIÓN */}

                    {alumno.seleccionado ? (
                      <View
                        style={[
                          styles.configuracionAlumno,
                          {
                            borderTopColor:
                              colores.borde,
                          },
                        ]}
                      >

                        {/* GRUPO */}

                        <Text
                          style={[
                            styles.etiqueta,
                            {
                              color:
                                colores
                                  .textoSecundario,

                              fontSize:
                                11 *
                                escalaTexto,
                            },
                          ]}
                        >
                          GRUPO DE INVESTIGACIÓN
                        </Text>

                        <View
                          style={
                            styles.grupos
                          }
                        >

                          {/* EXPERIMENTAL */}

                          <TouchableOpacity
                            style={[
                              styles.botonGrupo,

                              {
                                borderColor:
                                  alumno.grupo ===
                                  'Experimental'
                                    ? colores.primario
                                    : colores.borde,

                                backgroundColor:
                                  alumno.grupo ===
                                  'Experimental'
                                    ? colores.fondoPrimario
                                    : colores.tarjeta,
                              },
                            ]}
                            onPress={() =>
                              cambiarGrupo(
                                alumno.idUsuario,
                                'Experimental',
                              )
                            }
                          >
                            <Ionicons
                              name="flask-outline"
                              size={17}
                              color={
                                alumno.grupo ===
                                'Experimental'
                                  ? colores.primario
                                  : colores
                                      .textoSecundario
                              }
                            />

                            <Text
                              style={[
                                styles.textoGrupo,
                                {
                                  color:
                                    alumno.grupo ===
                                    'Experimental'
                                      ? colores.primario
                                      : colores
                                          .textoSecundario,

                                  fontSize:
                                    12 *
                                    escalaTexto,
                                },
                              ]}
                            >
                              Experimental
                            </Text>
                          </TouchableOpacity>


                          {/* CONTROL */}

                          <TouchableOpacity
                            style={[
                              styles.botonGrupo,

                              {
                                borderColor:
                                  alumno.grupo ===
                                  'Control'
                                    ? colores.primario
                                    : colores.borde,

                                backgroundColor:
                                  alumno.grupo ===
                                  'Control'
                                    ? colores.fondoPrimario
                                    : colores.tarjeta,
                              },
                            ]}
                            onPress={() =>
                              cambiarGrupo(
                                alumno.idUsuario,
                                'Control',
                              )
                            }
                          >
                            <Ionicons
                              name="people-outline"
                              size={17}
                              color={
                                alumno.grupo ===
                                'Control'
                                  ? colores.primario
                                  : colores
                                      .textoSecundario
                              }
                            />

                            <Text
                              style={[
                                styles.textoGrupo,
                                {
                                  color:
                                    alumno.grupo ===
                                    'Control'
                                      ? colores.primario
                                      : colores
                                          .textoSecundario,

                                  fontSize:
                                    12 *
                                    escalaTexto,
                                },
                              ]}
                            >
                              Control
                            </Text>
                          </TouchableOpacity>

                        </View>


                        {/* CONSENTIMIENTO */}

                        <TouchableOpacity
                          style={[
                            styles.consentimiento,
                            {
                              backgroundColor:
                                alumno
                                  .consentimiento
                                  ? '#F0FDF4'
                                  : colores
                                      .fondoPrimario,

                              borderColor:
                                alumno
                                  .consentimiento
                                  ? '#86EFAC'
                                  : colores
                                      .borde,
                            },
                          ]}
                          onPress={() =>
                            alternarConsentimiento(
                              alumno.idUsuario,
                            )
                          }
                          accessibilityRole="checkbox"
                          accessibilityState={{
                            checked:
                              alumno
                                .consentimiento,
                          }}
                        >
                          <Ionicons
                            name={
                              alumno
                                .consentimiento
                                ? 'checkbox'
                                : 'square-outline'
                            }
                            size={24}
                            color={
                              alumno
                                .consentimiento
                                ? '#15803D'
                                : colores
                                    .textoSecundario
                            }
                          />

                          <View
                            style={{
                              flex: 1,
                            }}
                          >
                            <Text
                              style={[
                                styles.textoConsentimiento,
                                {
                                  color:
                                    colores.texto,

                                  fontSize:
                                    13 *
                                    escalaTexto,
                                },
                              ]}
                            >
                              Consentimiento
                            </Text>

                            <Text
                              style={[
                                styles.detalleConsentimiento,
                                {
                                  color:
                                    colores
                                      .textoSecundario,

                                  fontSize:
                                    11 *
                                    escalaTexto,
                                },
                              ]}
                            >
                              {alumno
                                .consentimiento
                                ? 'Consentimiento registrado'
                                : 'Consentimiento pendiente'}
                            </Text>
                          </View>
                        </TouchableOpacity>

                      </View>
                    ) : null}

                  </View>
                ),
              )
            ) : (
              <SinDatos
                texto="No hay estudiantes activos disponibles."
              />
            )}
          </Seccion>


          {/* =================================================
              GUARDAR
          ================================================= */}

          {alumnos.length > 0 ? (
            <View
              style={
                styles.contenedorGuardar
              }
            >
              <TouchableOpacity
                style={[
                  styles.botonGuardar,

                  {
                    backgroundColor:
                      colores.primario,
                  },

                  guardando &&
                    styles.botonGuardarDeshabilitado,
                ]}
                onPress={guardar}
                disabled={
                  guardando
                }
                accessibilityRole="button"
                accessibilityLabel="Guardar participantes"
              >
                {guardando ? (
                  <ActivityIndicator
                    color={
                      colores
                        .textoSobrePrimario
                    }
                  />
                ) : (
                  <>
                    <Ionicons
                      name="save-outline"
                      size={21}
                      color={
                        colores
                          .textoSobrePrimario
                      }
                    />

                    <Text
                      style={[
                        styles.textoGuardar,
                        {
                          color:
                            colores
                              .textoSobrePrimario,

                          fontSize:
                            15 *
                            escalaTexto,
                        },
                      ]}
                    >
                      Guardar participantes
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text
                style={[
                  styles.nota,
                  {
                    color:
                      colores
                        .textoSecundario,

                    fontSize:
                      11 *
                      escalaTexto,
                  },
                ]}
              >
                Los estudiantes seleccionados quedarán vinculados a esta prueba con el grupo y consentimiento indicados.
              </Text>
            </View>
          ) : null}

        </>
      ) : null}

    </PantallaInvestigador>
  );
}


// =====================================================
// ESTILOS
// =====================================================

const styles = StyleSheet.create({
  pruebaActual: {
    minHeight: 86,
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoPrueba: {
    width: 48,
    height: 48,
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
    letterSpacing: 0.5,
  },

  nombrePrueba: {
    fontWeight: '900',
    marginTop: 2,
  },

  estadoPrueba: {
    marginTop: 4,
    fontWeight: '600',
  },

  resumenGrid: {
    flexDirection: 'row',
    gap: 8,
  },

  tarjetaResumen: {
    flex: 1,
    minHeight: 105,
    borderWidth: 1,
    borderRadius: 15,
    padding: 11,
    justifyContent: 'center',
  },

  numeroResumen: {
    marginTop: 7,
    fontWeight: '900',
  },

  textoResumen: {
    marginTop: 2,
    lineHeight: 15,
  },

  botonTodos: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 13,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  textoTodos: {
    fontWeight: '800',
    marginLeft: 7,
  },

  tarjetaAlumno: {
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 17,
    overflow: 'hidden',
  },

  encabezadoAlumno: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
  },

  infoAlumno: {
    flex: 1,
    marginLeft: 11,
  },

  nombreAlumno: {
    fontWeight: '800',
  },

  correoAlumno: {
    marginTop: 3,
  },

  estadoFila: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  puntoEstado: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 5,
  },

  estadoAlumno: {
    fontWeight: '600',
  },

  badgeRegistrado: {
    marginLeft: 8,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  textoRegistrado: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },

  configuracionAlumno: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: 13,
    borderTopWidth: 1,
  },

  etiqueta: {
    marginBottom: 8,
    fontWeight: '700',
  },

  grupos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },

  botonGrupo: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  textoGrupo: {
    marginLeft: 6,
    fontWeight: '700',
  },

  consentimiento: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  textoConsentimiento: {
    fontWeight: '800',
    marginLeft: 9,
  },

  detalleConsentimiento: {
    marginTop: 2,
    marginLeft: 9,
  },

  contenedorGuardar: {
    marginTop: 4,
    marginBottom: 30,
  },

  botonGuardar: {
    minHeight: 54,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  botonGuardarDeshabilitado: {
    opacity: 0.6,
  },

  textoGuardar: {
    fontWeight: '800',
    marginLeft: 8,
  },

  nota: {
    marginTop: 9,
    textAlign: 'center',
    lineHeight: 17,
  },
});