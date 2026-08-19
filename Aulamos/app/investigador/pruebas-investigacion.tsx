import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

import { useInvestigacion } from '../../contexts/InvestigacionContext';
import { useConsultaInvestigador } from '../../hooks/useConsultaInvestigador';

import {
  actualizarEstadoPruebaInvestigacion,
  crearPruebaInvestigacion,
  obtenerPruebasInvestigacion,
} from '../../services/investigadorService';


// =====================================================
// TIPOS
// =====================================================

type EstadoPrueba =
  | 'Planeada'
  | 'Activa'
  | 'Finalizada';


// =====================================================
// FORMATEAR FECHA
// =====================================================

const fecha = (
  valor?: string | null,
) => {
  if (!valor) {
    return 'Sin fecha';
  }

  const soloFecha =
    valor.substring(0, 10);

  const [
    anio,
    mes,
    dia,
  ] = soloFecha.split('-');

  if (
    !anio ||
    !mes ||
    !dia
  ) {
    return valor;
  }

  return `${dia}/${mes}/${anio}`;
};


// =====================================================
// PANTALLA
// =====================================================

export default function PruebasInvestigacionScreen() {
  // =====================================================
  // CONSULTA LOCAL
  // =====================================================

  const consulta =
    useConsultaInvestigador(
      obtenerPruebasInvestigacion,
    );

  const pruebas =
    consulta.datos || [];


  // =====================================================
  // CONTEXTO GLOBAL
  // =====================================================

  const {
    seleccionarPrueba,
    recargarPruebas,
  } = useInvestigacion();


  // =====================================================
  // ESTADOS GENERALES
  // =====================================================

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    actualizandoId,
    setActualizandoId,
  ] =
    useState<number | null>(
      null,
    );


  // =====================================================
  // FORMULARIO
  // =====================================================

  const [
    nombre,
    setNombre,
  ] = useState('');

  const [
    descripcion,
    setDescripcion,
  ] = useState('');

  const [
    hipotesis,
    setHipotesis,
  ] = useState('');

  const [
    objetivo,
    setObjetivo,
  ] = useState('');

  const [
    versionWcag,
    setVersionWcag,
  ] =
    useState('WCAG 2.1');

  const [
    fechaInicio,
    setFechaInicio,
  ] = useState('');

  const [
    fechaFin,
    setFechaFin,
  ] = useState('');


  // =====================================================
  // LIMPIAR FORMULARIO
  // =====================================================

  const limpiarFormulario = () => {
    setNombre('');
    setDescripcion('');
    setHipotesis('');
    setObjetivo('');

    setVersionWcag(
      'WCAG 2.1',
    );

    setFechaInicio('');
    setFechaFin('');
  };


  // =====================================================
  // CERRAR MODAL
  // =====================================================

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setModalVisible(false);

    limpiarFormulario();
  };


  // =====================================================
  // VALIDAR FECHA
  // =====================================================

  const validarFecha = (
    valor: string,
  ) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(
      valor,
    );
  };


  // =====================================================
  // CREAR PRUEBA
  // =====================================================

  const guardarPrueba =
    async () => {
      if (!nombre.trim()) {
        Alert.alert(
          'Campo obligatorio',
          'Escribe el nombre de la prueba.',
        );

        return;
      }

      if (!hipotesis.trim()) {
        Alert.alert(
          'Campo obligatorio',
          'Escribe la hipótesis de la prueba.',
        );

        return;
      }

      if (!fechaInicio.trim()) {
        Alert.alert(
          'Campo obligatorio',
          'Escribe la fecha de inicio.',
        );

        return;
      }

      if (
        !validarFecha(
          fechaInicio.trim(),
        )
      ) {
        Alert.alert(
          'Fecha inválida',
          'La fecha de inicio debe utilizar el formato AAAA-MM-DD.',
        );

        return;
      }

      if (
        fechaFin.trim() &&
        !validarFecha(
          fechaFin.trim(),
        )
      ) {
        Alert.alert(
          'Fecha inválida',
          'La fecha de fin debe utilizar el formato AAAA-MM-DD.',
        );

        return;
      }

      if (
        fechaFin.trim() &&
        fechaFin.trim() <
          fechaInicio.trim()
      ) {
        Alert.alert(
          'Fecha inválida',
          'La fecha de fin no puede ser anterior a la fecha de inicio.',
        );

        return;
      }

      try {
        setGuardando(true);

        /*
         * Todas las pruebas nuevas se crean
         * como Planeadas.
         *
         * El investigador deberá activarlas
         * explícitamente desde la tarjeta.
         */
        const respuesta =
          await crearPruebaInvestigacion({
            nombre:
              nombre.trim(),

            descripcion:
              descripcion.trim() ||
              undefined,

            hipotesis:
              hipotesis.trim(),

            objetivo:
              objetivo.trim() ||
              undefined,

            version_wcag:
              versionWcag.trim() ||
              'WCAG 2.1',

            fecha_inicio:
              fechaInicio.trim(),

            fecha_fin:
              fechaFin.trim() ||
              null,

            estado:
              'Planeada',
          });

        Alert.alert(
          'Prueba creada',
          respuesta.mensaje,
        );

        setModalVisible(false);

        limpiarFormulario();

        /*
         * Actualizamos tanto esta pantalla
         * como el contexto global.
         */
        await consulta.recargar();

        await recargarPruebas();

      } catch (error) {
        const mensaje =
          error instanceof Error
            ? error.message
            : 'No se pudo crear la prueba.';

        Alert.alert(
          'Error',
          mensaje,
        );

      } finally {
        setGuardando(false);
      }
    };


  // =====================================================
  // CAMBIAR ESTADO DE PRUEBA
  // =====================================================

  const cambiarEstadoPrueba = (
    idPrueba: number,
    nombrePrueba: string,
    estadoActual: EstadoPrueba,
  ) => {
    const nuevoEstado:
      EstadoPrueba =
      estadoActual === 'Activa'
        ? 'Finalizada'
        : 'Activa';


    // =================================================
    // MENSAJES
    // =================================================

    const titulo =
      nuevoEstado === 'Activa'
        ? 'Activar prueba'
        : 'Finalizar prueba';

    const mensaje =
      nuevoEstado === 'Activa'
        ? `¿Deseas activar "${nombrePrueba}"?\n\nSi existe otra prueba activa, se finalizará automáticamente.`
        : `¿Deseas finalizar "${nombrePrueba}"?\n\nLos datos registrados permanecerán disponibles para consulta.`;


    // =================================================
    // CONFIRMACIÓN
    // =================================================

    Alert.alert(
      titulo,
      mensaje,
      [
        {
          text:
            'Cancelar',

          style:
            'cancel',
        },

        {
          text:
            nuevoEstado ===
            'Activa'
              ? 'Activar'
              : 'Finalizar',

          style:
            nuevoEstado ===
            'Finalizada'
              ? 'destructive'
              : 'default',

          onPress: async () => {
            try {
              setActualizandoId(
                idPrueba,
              );


              // =========================================
              // ACTUALIZAR EN BACKEND
              // =========================================

              const respuesta =
                await actualizarEstadoPruebaInvestigacion(
                  idPrueba,
                  nuevoEstado,
                );


              // =========================================
              // ACTUALIZAR PANTALLA LOCAL
              // =========================================

              await consulta.recargar();


              // =========================================
              // ACTUALIZAR CONTEXTO GLOBAL
              // =========================================

              await recargarPruebas();


              // =========================================
              // SI SE ACTIVÓ, TAMBIÉN SELECCIONARLA
              // =========================================

              if (
                nuevoEstado ===
                'Activa'
              ) {
                const pruebaActivada =
                  pruebas.find(
                    (item) =>
                      item.id_prueba ===
                      idPrueba,
                  );

                if (
                  pruebaActivada
                ) {
                  await seleccionarPrueba({
                    ...pruebaActivada,

                    estado:
                      'Activa',
                  });
                }
              }


              // =========================================
              // MENSAJE
              // =========================================

              Alert.alert(
                'Estado actualizado',
                respuesta.mensaje,
              );

            } catch (error) {
              const mensajeError =
                error instanceof Error
                  ? error.message
                  : 'No se pudo actualizar la prueba.';

              Alert.alert(
                'Error',
                mensajeError,
              );

            } finally {
              setActualizandoId(
                null,
              );
            }
          },
        },
      ],
    );
  };


  // =====================================================
  // COLOR ESTADO
  // =====================================================

  const colorEstado = (
    estadoPrueba: string,
  ) => {
    switch (
      estadoPrueba
    ) {
      case 'Activa':
        return '#15803D';

      case 'Finalizada':
        return '#475569';

      default:
        return '#D97706';
    }
  };


  // =====================================================
  // VISTA
  // =====================================================

  return (
    <>
      <PantallaInvestigador
        titulo="Pruebas de investigación"
        descripcion="Crea y administra las pruebas utilizadas para analizar el uso de AULAMOS."
        loading={
          consulta.loading
        }
        refreshing={
          consulta.refreshing
        }
        error={
          consulta.error
        }
        onRetry={
          consulta.reintentar
        }
        onRefresh={
          consulta.recargar
        }
      >

        {/* =================================================
            ENCABEZADO
        ================================================= */}

        <View
          style={
            styles.encabezadoAcciones
          }
        >
          <View
            style={
              styles.textoEncabezado
            }
          >
            <Text
              style={
                styles.tituloCantidad
              }
            >
              {pruebas.length}{' '}

              {pruebas.length === 1
                ? 'prueba registrada'
                : 'pruebas registradas'}
            </Text>

            <Text
              style={
                styles.subtituloCantidad
              }
            >
              Administra los estudios realizados con los estudiantes.
            </Text>
          </View>


          {/* NUEVA PRUEBA */}

          <TouchableOpacity
            style={
              styles.botonNueva
            }
            onPress={() =>
              setModalVisible(
                true,
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Crear nueva prueba de investigación"
          >
            <Ionicons
              name="add"
              size={22}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.textoBotonNueva
              }
            >
              Nueva prueba
            </Text>
          </TouchableOpacity>
        </View>


        {/* =================================================
            PRUEBAS
        ================================================= */}

        <Seccion
          titulo="Pruebas registradas"
        >
          {pruebas.length ? (
            pruebas.map(
              (prueba) => (
                <Tarjeta
                  key={
                    prueba.id_prueba
                  }
                >

                  {/* =======================================
                      ENCABEZADO TARJETA
                  ======================================= */}

                  <View
                    style={
                      styles.encabezadoTarjeta
                    }
                  >
                    <View
                      style={
                        styles.iconoPrueba
                      }
                    >
                      <Ionicons
                        name="flask-outline"
                        size={24}
                        color="#2D5BFF"
                      />
                    </View>

                    <View
                      style={
                        styles.informacionPrueba
                      }
                    >
                      <TextoPrincipal>
                        {prueba.nombre}
                      </TextoPrincipal>

                      <View
                        style={[
                          styles.estado,

                          {
                            backgroundColor:
                              `${colorEstado(
                                prueba.estado,
                              )}15`,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.puntoEstado,

                            {
                              backgroundColor:
                                colorEstado(
                                  prueba.estado,
                                ),
                            },
                          ]}
                        />

                        <Text
                          style={[
                            styles.textoEstado,

                            {
                              color:
                                colorEstado(
                                  prueba.estado,
                                ),
                            },
                          ]}
                        >
                          {
                            prueba.estado
                          }
                        </Text>
                      </View>
                    </View>
                  </View>


                  {/* =======================================
                      DATOS
                  ======================================= */}

                  <View
                    style={
                      styles.contenedorDatos
                    }
                  >

                    {/* WCAG */}

                    <View
                      style={
                        styles.dato
                      }
                    >
                      <Ionicons
                        name="accessibility-outline"
                        size={18}
                        color="#64748B"
                      />

                      <TextoSecundario>
                        {
                          prueba.version_wcag
                        }
                      </TextoSecundario>
                    </View>


                    {/* FECHAS */}

                    <View
                      style={
                        styles.dato
                      }
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#64748B"
                      />

                      <TextoSecundario>
                        {fecha(
                          prueba.fecha_inicio,
                        )}

                        {' a '}

                        {fecha(
                          prueba.fecha_fin,
                        )}
                      </TextoSecundario>
                    </View>


                    {/* PARTICIPANTES */}

                    <View
                      style={
                        styles.dato
                      }
                    >
                      <Ionicons
                        name="people-outline"
                        size={18}
                        color="#64748B"
                      />

                      <TextoSecundario>
                        {
                          prueba.participantes
                        }{' '}

                        {prueba.participantes ===
                        1
                          ? 'participante'
                          : 'participantes'}
                      </TextoSecundario>
                    </View>


                    {/* CONSENTIMIENTOS */}

                    <View
                      style={
                        styles.dato
                      }
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#64748B"
                      />

                      <TextoSecundario>
                        {
                          prueba.consentimientos
                        }{' '}

                        {prueba.consentimientos ===
                        1
                          ? 'consentimiento'
                          : 'consentimientos'}
                      </TextoSecundario>
                    </View>
                  </View>


                  {/* =======================================
                      DETALLE
                  ======================================= */}

                  <View
                    style={
                      styles.separador
                    }
                  />

                  <Text
                    style={
                      styles.etiquetaDetalle
                    }
                  >
                    Hipótesis
                  </Text>

                  <TextoSecundario>
                    {
                      prueba.hipotesis
                    }
                  </TextoSecundario>


                  {/* OBJETIVO */}

                  {prueba.objetivo ? (
                    <>
                      <Text
                        style={[
                          styles.etiquetaDetalle,

                          {
                            marginTop: 12,
                          },
                        ]}
                      >
                        Objetivo
                      </Text>

                      <TextoSecundario>
                        {
                          prueba.objetivo
                        }
                      </TextoSecundario>
                    </>
                  ) : null}


                  {/* =======================================
                      BOTÓN ACTIVAR / FINALIZAR
                  ======================================= */}

                  <TouchableOpacity
                    style={[
                      styles.botonCambiarEstado,

                      prueba.estado ===
                      'Activa'
                        ? styles.botonFinalizar
                        : styles.botonActivar,

                      actualizandoId ===
                        prueba.id_prueba &&
                        styles.botonDeshabilitado,
                    ]}
                    onPress={() =>
                      cambiarEstadoPrueba(
                        prueba.id_prueba,
                        prueba.nombre,
                        prueba.estado,
                      )
                    }
                    disabled={
                      actualizandoId ===
                      prueba.id_prueba
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      prueba.estado ===
                      'Activa'
                        ? `Finalizar ${prueba.nombre}`
                        : `Activar ${prueba.nombre}`
                    }
                  >
                    {actualizandoId ===
                    prueba.id_prueba ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                      />
                    ) : (
                      <>
                        <Ionicons
                          name={
                            prueba.estado ===
                            'Activa'
                              ? 'stop-circle-outline'
                              : 'play-circle-outline'
                          }
                          size={21}
                          color="#FFFFFF"
                        />

                        <Text
                          style={
                            styles.textoCambiarEstado
                          }
                        >
                          {prueba.estado ===
                          'Activa'
                            ? 'Finalizar prueba'
                            : 'Activar prueba'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                </Tarjeta>
              ),
            )
          ) : (
            <SinDatos
              texto="No hay pruebas de investigación registradas."
            />
          )}
        </Seccion>
      </PantallaInvestigador>


      {/* =================================================
          MODAL CREAR PRUEBA
      ================================================= */}

      <Modal
        visible={
          modalVisible
        }
        transparent
        animationType="slide"
        onRequestClose={
          cerrarModal
        }
      >
        <View
          style={
            styles.fondoModal
          }
        >

          {/* CERRAR TOCANDO FONDO */}

          <Pressable
            style={
              styles.fondoCerrable
            }
            onPress={
              cerrarModal
            }
          />


          {/* MODAL */}

          <View
            style={
              styles.modal
            }
          >

            {/* ===========================================
                CABECERA
            =========================================== */}

            <View
              style={
                styles.cabeceraModal
              }
            >
              <View
                style={
                  styles.textoModal
                }
              >
                <Text
                  style={
                    styles.tituloModal
                  }
                >
                  Nueva prueba
                </Text>

                <Text
                  style={
                    styles.descripcionModal
                  }
                >
                  La nueva prueba se registrará como Planeada.
                  Después podrás activarla cuando esté lista.
                </Text>
              </View>

              <TouchableOpacity
                onPress={
                  cerrarModal
                }
                disabled={
                  guardando
                }
                accessibilityRole="button"
                accessibilityLabel="Cerrar formulario"
              >
                <Ionicons
                  name="close"
                  size={28}
                  color="#475569"
                />
              </TouchableOpacity>
            </View>


            {/* ===========================================
                FORMULARIO
            =========================================== */}

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >

              <Campo
                etiqueta="Nombre *"
                valor={
                  nombre
                }
                onChangeText={
                  setNombre
                }
                placeholder="Ej. Evaluación de accesibilidad 2026"
              />

              <Campo
                etiqueta="Descripción"
                valor={
                  descripcion
                }
                onChangeText={
                  setDescripcion
                }
                placeholder="Describe brevemente la prueba"
                multiline
              />

              <Campo
                etiqueta="Hipótesis *"
                valor={
                  hipotesis
                }
                onChangeText={
                  setHipotesis
                }
                placeholder="Escribe la hipótesis de investigación"
                multiline
              />

              <Campo
                etiqueta="Objetivo"
                valor={
                  objetivo
                }
                onChangeText={
                  setObjetivo
                }
                placeholder="Escribe el objetivo de la prueba"
                multiline
              />

              <Campo
                etiqueta="Versión WCAG"
                valor={
                  versionWcag
                }
                onChangeText={
                  setVersionWcag
                }
                placeholder="WCAG 2.1"
              />


              {/* ===========================================
                  ESTADO FIJO
              =========================================== */}

              <Text
                style={
                  styles.etiquetaCampo
                }
              >
                Estado inicial
              </Text>

              <View
                style={
                  styles.estadoInicial
                }
              >
                <View
                  style={
                    styles.puntoPlaneada
                  }
                />

                <Text
                  style={
                    styles.textoEstadoInicial
                  }
                >
                  Planeada
                </Text>
              </View>

              <Text
                style={
                  styles.ayudaEstado
                }
              >
                Cuando la prueba esté lista, podrás activarla desde la lista de pruebas.
              </Text>


              {/* ===========================================
                  FECHAS
              =========================================== */}

              <Campo
                etiqueta="Fecha de inicio *"
                valor={
                  fechaInicio
                }
                onChangeText={
                  setFechaInicio
                }
                placeholder="AAAA-MM-DD"
                keyboardType="numbers-and-punctuation"
              />

              <Campo
                etiqueta="Fecha de fin"
                valor={
                  fechaFin
                }
                onChangeText={
                  setFechaFin
                }
                placeholder="AAAA-MM-DD"
                keyboardType="numbers-and-punctuation"
              />

              <Text
                style={
                  styles.ayudaFecha
                }
              >
                Ejemplo: 2026-08-12
              </Text>


              {/* ===========================================
                  GUARDAR
              =========================================== */}

              <TouchableOpacity
                style={[
                  styles.botonGuardar,

                  guardando &&
                    styles.botonDeshabilitado,
                ]}
                onPress={
                  guardarPrueba
                }
                disabled={
                  guardando
                }
                accessibilityRole="button"
                accessibilityLabel="Guardar prueba de investigación"
              >
                {guardando ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="save-outline"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.textoGuardar
                      }
                    >
                      Crear prueba
                    </Text>
                  </>
                )}
              </TouchableOpacity>


              <View
                style={{
                  height: 24,
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}


// =====================================================
// COMPONENTE CAMPO
// =====================================================

type CampoProps = {
  etiqueta: string;

  valor: string;

  onChangeText: (
    texto: string,
  ) => void;

  placeholder: string;

  multiline?: boolean;

  keyboardType?:
    | 'default'
    | 'numbers-and-punctuation';
};


function Campo({
  etiqueta,
  valor,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
}: CampoProps) {
  return (
    <View
      style={
        styles.grupoCampo
      }
    >
      <Text
        style={
          styles.etiquetaCampo
        }
      >
        {etiqueta}
      </Text>

      <TextInput
        style={[
          styles.input,

          multiline &&
            styles.inputMultilinea,
        ]}
        value={
          valor
        }
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#94A3B8"
        multiline={
          multiline
        }
        textAlignVertical={
          multiline
            ? 'top'
            : 'center'
        }
        keyboardType={
          keyboardType
        }
        accessibilityLabel={
          etiqueta
        }
      />
    </View>
  );
}


// =====================================================
// ESTILOS
// =====================================================

const styles =
  StyleSheet.create({

    // ===================================================
    // ENCABEZADO
    // ===================================================

    encabezadoAcciones: {
      marginBottom: 18,
      gap: 14,
    },

    textoEncabezado: {
      gap: 4,
    },

    tituloCantidad: {
      fontSize: 18,
      fontWeight: '700',
      color: '#172033',
    },

    subtituloCantidad: {
      fontSize: 14,
      color: '#64748B',
      lineHeight: 20,
    },

    botonNueva: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#2D5BFF',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },

    textoBotonNueva: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },


    // ===================================================
    // TARJETA
    // ===================================================

    encabezadoTarjeta: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },

    iconoPrueba: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: '#EEF2FF',
      justifyContent: 'center',
      alignItems: 'center',
    },

    informacionPrueba: {
      flex: 1,
      gap: 8,
    },

    estado: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 6,
    },

    puntoEstado: {
      width: 7,
      height: 7,
      borderRadius: 999,
    },

    textoEstado: {
      fontSize: 12,
      fontWeight: '700',
    },

    contenedorDatos: {
      marginTop: 16,
      gap: 9,
    },

    dato: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    separador: {
      height: 1,
      backgroundColor: '#E2E8F0',
      marginVertical: 16,
    },

    etiquetaDetalle: {
      color: '#475569',
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 5,
      textTransform: 'uppercase',
    },


    // ===================================================
    // ACTIVAR / FINALIZAR
    // ===================================================

    botonCambiarEstado: {
      minHeight: 49,
      marginTop: 18,
      borderRadius: 13,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    botonActivar: {
      backgroundColor: '#15803D',
    },

    botonFinalizar: {
      backgroundColor: '#DC3438',
    },

    textoCambiarEstado: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },

    botonDeshabilitado: {
      opacity: 0.65,
    },


    // ===================================================
    // MODAL
    // ===================================================

    fondoModal: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor:
        'rgba(15, 23, 42, 0.40)',
    },

    fondoCerrable: {
      ...StyleSheet.absoluteFillObject,
    },

    modal: {
      maxHeight: '92%',
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingHorizontal: 20,
      paddingTop: 20,
    },

    cabeceraModal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 22,
    },

    textoModal: {
      flex: 1,
      marginRight: 12,
    },

    tituloModal: {
      fontSize: 23,
      fontWeight: '800',
      color: '#172033',
    },

    descripcionModal: {
      marginTop: 4,
      fontSize: 14,
      color: '#64748B',
      lineHeight: 20,
    },


    // ===================================================
    // CAMPOS
    // ===================================================

    grupoCampo: {
      marginBottom: 16,
    },

    etiquetaCampo: {
      fontSize: 14,
      fontWeight: '700',
      color: '#334155',
      marginBottom: 8,
    },

    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: '#CBD5E1',
      borderRadius: 12,
      paddingHorizontal: 14,
      color: '#172033',
      backgroundColor: '#FFFFFF',
      fontSize: 15,
    },

    inputMultilinea: {
      minHeight: 95,
      paddingTop: 13,
    },


    // ===================================================
    // ESTADO INICIAL
    // ===================================================

    estadoInicial: {
      alignSelf: 'flex-start',
      minHeight: 40,
      borderWidth: 1,
      borderColor: '#F59E0B',
      borderRadius: 999,
      backgroundColor: '#FFFBEB',
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },

    puntoPlaneada: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: '#D97706',
      marginRight: 7,
    },

    textoEstadoInicial: {
      color: '#B45309',
      fontSize: 13,
      fontWeight: '800',
    },

    ayudaEstado: {
      fontSize: 12,
      color: '#64748B',
      lineHeight: 17,
      marginBottom: 18,
    },


    // ===================================================
    // FECHAS
    // ===================================================

    ayudaFecha: {
      marginTop: -8,
      marginBottom: 18,
      fontSize: 12,
      color: '#64748B',
    },


    // ===================================================
    // GUARDAR
    // ===================================================

    botonGuardar: {
      minHeight: 52,
      borderRadius: 13,
      backgroundColor: '#2D5BFF',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },

    textoGuardar: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });