import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  type Href,
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type EstadoAsistencia =
  | 'Presente'
  | 'Falta'
  | 'Retardo';

type Estudiante = {
  id_alumno: number;
  nombre: string;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  nombre_completo: string;
  correo?: string;
  id_grupo: number;
  grupo: string;
  grado?: string | null;
  id_curso: number;
  curso: string;
  id_materia?: number;
  materia?: string;
};

type CursoFiltro = {
  id_curso: number;
  nombre: string;
  grupo: string;
  materia: string;
};

type RegistroAsistencia = {
  id_alumno: number;
  nombre: string;
  estado: EstadoAsistencia;
};

type ListaGuardada = {
  fecha: string;
  id_curso: number;
  curso: string;
  registros: RegistroAsistencia[];
  fecha_guardado: string;
};

type RespuestaEstudiantes = {
  mensaje?: string;
  estudiantes?: Estudiante[];
};

const ESTADOS: EstadoAsistencia[] = [
  'Presente',
  'Falta',
  'Retardo',
];

export default function PasarListaScreen() {
  const {
    colores,
    escalaTexto,
    preferencias,
    leerTexto,
    detenerLectura,
  } = useAccessibility();

  const [estudiantes, setEstudiantes] = useState<
    Estudiante[]
  >([]);

  const [cursoSeleccionado, setCursoSeleccionado] =
    useState<number | null>(null);

  const [asistencias, setAsistencias] = useState<
    Record<number, EstadoAsistencia>
  >({});

  const [selectorVisible, setSelectorVisible] =
    useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [actualizando, setActualizando] =
    useState(false);

  const temaOscuro =
    preferencias.modoOscuro ||
    preferencias.altoContraste;

  const anunciar = useCallback(
    (mensaje: string) => {
      if (preferencias.lectorPantalla) {
        leerTexto(mensaje);
      }
    },
    [
      preferencias.lectorPantalla,
      leerTexto,
    ]
  );

  const fechaActual = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const fechaVisible = useMemo(() => {
    return new Date(
      `${fechaActual}T12:00:00`
    ).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [fechaActual]);

  const cursos = useMemo<CursoFiltro[]>(() => {
    const mapa = new Map<number, CursoFiltro>();

    estudiantes.forEach((estudiante) => {
      if (!mapa.has(estudiante.id_curso)) {
        mapa.set(estudiante.id_curso, {
          id_curso: estudiante.id_curso,
          nombre:
            estudiante.curso ||
            `Curso ${estudiante.id_curso}`,
          grupo: estudiante.grupo || 'Sin grupo',
          materia:
            estudiante.materia || 'Sin materia',
        });
      }
    });

    return Array.from(mapa.values());
  }, [estudiantes]);

  const cursoActual = useMemo(() => {
    return cursos.find(
      (curso) =>
        curso.id_curso === cursoSeleccionado
    );
  }, [cursos, cursoSeleccionado]);

  const estudiantesCurso = useMemo(() => {
    if (!cursoSeleccionado) {
      return [];
    }

    const mapa = new Map<number, Estudiante>();

    estudiantes
      .filter(
        (estudiante) =>
          estudiante.id_curso ===
          cursoSeleccionado
      )
      .forEach((estudiante) => {
        mapa.set(
          estudiante.id_alumno,
          estudiante
        );
      });

    return Array.from(mapa.values()).sort(
      (a, b) =>
        a.nombre_completo.localeCompare(
          b.nombre_completo,
          'es'
        )
    );
  }, [estudiantes, cursoSeleccionado]);

  const resumen = useMemo(() => {
    let presentes = 0;
    let faltas = 0;
    let retardos = 0;

    estudiantesCurso.forEach((estudiante) => {
      const estado =
        asistencias[estudiante.id_alumno];

      if (estado === 'Presente') {
        presentes += 1;
      } else if (estado === 'Falta') {
        faltas += 1;
      } else if (estado === 'Retardo') {
        retardos += 1;
      }
    });

    return {
      presentes,
      faltas,
      retardos,
      total: estudiantesCurso.length,
      registrados:
        presentes + faltas + retardos,
    };
  }, [asistencias, estudiantesCurso]);

  const claveLista = useCallback(
    (idCurso: number) =>
      `asistencia:${fechaActual}:${idCurso}`,
    [fechaActual]
  );

  const cargarListaGuardada = useCallback(
    async (idCurso: number) => {
      try {
        const valor = await AsyncStorage.getItem(
          claveLista(idCurso)
        );

        if (!valor) {
          const nuevosEstados: Record<
            number,
            EstadoAsistencia
          > = {};

          estudiantes
            .filter(
              (estudiante) =>
                estudiante.id_curso === idCurso
            )
            .forEach((estudiante) => {
              nuevosEstados[
                estudiante.id_alumno
              ] = 'Presente';
            });

          setAsistencias(nuevosEstados);
          return;
        }

        const lista = JSON.parse(
          valor
        ) as ListaGuardada;

        const estadosGuardados: Record<
          number,
          EstadoAsistencia
        > = {};

        lista.registros.forEach((registro) => {
          estadosGuardados[
            registro.id_alumno
          ] = registro.estado;
        });

        setAsistencias(estadosGuardados);

        anunciar(
          `Se cargó la lista guardada del curso ${lista.curso}.`
        );
      } catch (error) {
        console.error(
          'Error al cargar lista:',
          error
        );

        setAsistencias({});
      }
    },
    [anunciar, claveLista, estudiantes]
  );

  const cargarEstudiantes = useCallback(
    async (mostrarCarga = true) => {
      try {
        if (mostrarCarga) {
          setCargando(true);
        }

        const token =
          await AsyncStorage.getItem('token');

        if (!token) {
          Alert.alert(
            'Sesión no encontrada',
            'Inicia sesión nuevamente.'
          );

          router.replace('/' as Href);
          return;
        }

        const respuesta = await fetch(
          `${API_URL}/docente/estudiantes`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const texto = await respuesta.text();

        let resultado: RespuestaEstudiantes = {};

        if (texto) {
          try {
            resultado = JSON.parse(texto);
          } catch {
            throw new Error(
              'El servidor envió una respuesta incorrecta.'
            );
          }
        }

        if (
          respuesta.status === 401 ||
          respuesta.status === 403
        ) {
          await AsyncStorage.multiRemove([
            'token',
            'usuario',
          ]);

          Alert.alert(
            'Sesión vencida',
            'Inicia sesión nuevamente.'
          );

          router.replace('/' as Href);
          return;
        }

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje ||
              'No se pudieron obtener los estudiantes.'
          );
        }

        const lista = Array.isArray(
          resultado.estudiantes
        )
          ? resultado.estudiantes
          : [];

        setEstudiantes(lista);

        if (lista.length === 0) {
          setCursoSeleccionado(null);
          setAsistencias({});
          return;
        }

        const primerCurso =
          cursoSeleccionado &&
          lista.some(
            (estudiante) =>
              estudiante.id_curso ===
              cursoSeleccionado
          )
            ? cursoSeleccionado
            : lista[0].id_curso;

        setCursoSeleccionado(primerCurso);

        anunciar(
          `Se encontraron ${lista.length} registros de estudiantes.`
        );
      } catch (error) {
        console.error(
          'Error al cargar estudiantes:',
          error
        );

        const mensaje =
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado.';

        Alert.alert('Error', mensaje);
        anunciar(`Error. ${mensaje}`);
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [anunciar, cursoSeleccionado]
  );

  useFocusEffect(
    useCallback(() => {
      cargarEstudiantes();

      return () => {
        detenerLectura();
      };
    }, [cargarEstudiantes, detenerLectura])
  );

  useFocusEffect(
    useCallback(() => {
      if (cursoSeleccionado) {
        cargarListaGuardada(
          cursoSeleccionado
        );
      }
    }, [
      cursoSeleccionado,
      cargarListaGuardada,
    ])
  );

  const seleccionarCurso = (
    curso: CursoFiltro
  ) => {
    setCursoSeleccionado(curso.id_curso);
    setSelectorVisible(false);

    anunciar(
      `Curso seleccionado: ${curso.nombre}, grupo ${curso.grupo}.`
    );
  };

  const cambiarEstado = (
    idAlumno: number,
    estado: EstadoAsistencia,
    nombre: string
  ) => {
    setAsistencias((estadoAnterior) => ({
      ...estadoAnterior,
      [idAlumno]: estado,
    }));

    anunciar(`${nombre}: ${estado}.`);
  };

  const marcarTodosPresentes = () => {
    const nuevosEstados: Record<
      number,
      EstadoAsistencia
    > = {};

    estudiantesCurso.forEach((estudiante) => {
      nuevosEstados[estudiante.id_alumno] =
        'Presente';
    });

    setAsistencias(nuevosEstados);

    anunciar(
      'Todos los estudiantes fueron marcados como presentes.'
    );
  };

  const guardarLista = async () => {
    if (!cursoSeleccionado || !cursoActual) {
      Alert.alert(
        'Curso requerido',
        'Selecciona un curso antes de guardar la lista.'
      );

      return;
    }

    if (estudiantesCurso.length === 0) {
      Alert.alert(
        'Sin estudiantes',
        'El curso seleccionado no tiene estudiantes.'
      );

      return;
    }

    if (
      resumen.registrados !==
      estudiantesCurso.length
    ) {
      Alert.alert(
        'Lista incompleta',
        'Debes seleccionar un estado para todos los estudiantes.'
      );

      return;
    }

    try {
      setGuardando(true);

      const registros: RegistroAsistencia[] =
        estudiantesCurso.map(
          (estudiante) => ({
            id_alumno: estudiante.id_alumno,
            nombre: estudiante.nombre_completo,
            estado:
              asistencias[
                estudiante.id_alumno
              ],
          })
        );

      const lista: ListaGuardada = {
        fecha: fechaActual,
        id_curso: cursoSeleccionado,
        curso: cursoActual.nombre,
        registros,
        fecha_guardado:
          new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        claveLista(cursoSeleccionado),
        JSON.stringify(lista)
      );

      anunciar(
        `Lista guardada. ${resumen.presentes} presentes, ${resumen.faltas} faltas y ${resumen.retardos} retardos.`
      );

      Alert.alert(
        'Lista guardada',
        `La lista del ${fechaVisible} se guardó en este dispositivo.\n\nPresentes: ${resumen.presentes}\nFaltas: ${resumen.faltas}\nRetardos: ${resumen.retardos}`
      );
    } catch (error) {
      console.error(
        'Error al guardar lista:',
        error
      );

      Alert.alert(
        'Error',
        'No se pudo guardar la lista.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const actualizar = () => {
    setActualizando(true);
    cargarEstudiantes(false);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colores.fondo,
        },
      ]}
    >
      <StatusBar
        barStyle={
          temaOscuro
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={colores.fondo}
      />

      <View
        style={[
          styles.encabezado,
          {
            backgroundColor: colores.fondo,
            borderBottomColor: colores.borde,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.botonEncabezado,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colores.texto}
          />
        </TouchableOpacity>

        <View style={styles.textoEncabezado}>
          <Text
            style={[
              styles.tituloPantalla,
              {
                color: colores.texto,
                fontSize: 20 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Pasar lista
          </Text>

          <Text
            style={[
              styles.subtituloPantalla,
              {
                color:
                  colores.textoSecundario,
                fontSize: 11 * escalaTexto,
              },
            ]}
          >
            Registra la asistencia del grupo
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizar}
            colors={[colores.primario]}
            tintColor={colores.primario}
          />
        }
      >
        <View
          style={[
            styles.tarjetaFecha,
            {
              backgroundColor:
                colores.fondoPrimario,
              borderColor: colores.borde,
            },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={22}
            color={colores.primario}
          />

          <View style={styles.datosFecha}>
            <Text
              style={[
                styles.etiquetaFecha,
                {
                  color:
                    colores.textoSecundario,
                  fontSize: 10 * escalaTexto,
                },
              ]}
            >
              Fecha de asistencia
            </Text>

            <Text
              style={[
                styles.fecha,
                {
                  color: colores.texto,
                  fontSize: 13 * escalaTexto,
                },
              ]}
            >
              {fechaVisible}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.etiqueta,
            {
              color: colores.texto,
              fontSize: 12 * escalaTexto,
            },
          ]}
        >
          Seleccionar curso
        </Text>

        <TouchableOpacity
          style={[
            styles.selectorCurso,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
          onPress={() =>
            setSelectorVisible(true)
          }
          accessibilityRole="button"
          accessibilityLabel={
            cursoActual
              ? `Curso seleccionado: ${cursoActual.nombre}`
              : 'Seleccionar curso'
          }
        >
          <View style={styles.datosCurso}>
            <Text
              style={[
                styles.nombreCurso,
                {
                  color: colores.texto,
                  fontSize: 13 * escalaTexto,
                },
              ]}
            >
              {cursoActual?.nombre ??
                'Selecciona un curso'}
            </Text>

            {cursoActual && (
              <Text
                style={[
                  styles.detalleCurso,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize: 10 * escalaTexto,
                  },
                ]}
              >
                {cursoActual.materia} ·{' '}
                {cursoActual.grupo}
              </Text>
            )}
          </View>

          <Ionicons
            name="chevron-down"
            size={20}
            color={colores.textoSecundario}
          />
        </TouchableOpacity>

        {cargando ? (
          <View style={styles.cargando}>
            <ActivityIndicator
              size="large"
              color={colores.primario}
            />

            <Text
              style={[
                styles.textoCargando,
                {
                  color:
                    colores.textoSecundario,
                  fontSize: 13 * escalaTexto,
                },
              ]}
            >
              Cargando estudiantes...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.filaTitulo}>
              <View>
                <Text
                  style={[
                    styles.tituloSeccion,
                    {
                      color: colores.texto,
                      fontSize:
                        15 * escalaTexto,
                    },
                  ]}
                  accessibilityRole="header"
                >
                  Estudiantes
                </Text>

                <Text
                  style={[
                    styles.totalEstudiantes,
                    {
                      color:
                        colores.textoSecundario,
                      fontSize:
                        10 * escalaTexto,
                    },
                  ]}
                >
                  {estudiantesCurso.length}{' '}
                  estudiantes registrados
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.botonTodos,
                  {
                    backgroundColor:
                      colores.fondoPrimario,
                    borderColor:
                      colores.primario,
                  },
                ]}
                onPress={marcarTodosPresentes}
                accessibilityRole="button"
                accessibilityLabel="Marcar todos presentes"
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={18}
                  color={colores.primario}
                />

                <Text
                  style={[
                    styles.textoTodos,
                    {
                      color: colores.primario,
                      fontSize:
                        10 * escalaTexto,
                    },
                  ]}
                >
                  Todos presentes
                </Text>
              </TouchableOpacity>
            </View>

            {estudiantesCurso.length === 0 ? (
              <View
                style={[
                  styles.estadoVacio,
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
                  size={45}
                  color={
                    colores.textoSecundario
                  }
                />

                <Text
                  style={[
                    styles.tituloVacio,
                    {
                      color: colores.texto,
                      fontSize:
                        15 * escalaTexto,
                    },
                  ]}
                >
                  No hay estudiantes
                </Text>

                <Text
                  style={[
                    styles.textoVacio,
                    {
                      color:
                        colores.textoSecundario,
                      fontSize:
                        12 * escalaTexto,
                    },
                  ]}
                >
                  Selecciona otro curso o verifica
                  las inscripciones.
                </Text>
              </View>
            ) : (
              estudiantesCurso.map(
                (estudiante) => {
                  const estado =
                    asistencias[
                      estudiante.id_alumno
                    ];

                  return (
                    <View
                      key={estudiante.id_alumno}
                      style={[
                        styles.tarjetaAlumno,
                        {
                          backgroundColor:
                            colores.tarjeta,
                          borderColor:
                            colores.borde,
                        },
                      ]}
                      accessible
                      accessibilityLabel={`${estudiante.nombre_completo}. Estado ${estado ?? 'sin registrar'}.`}
                    >
                      <View style={styles.filaAlumno}>
                        <View
                          style={[
                            styles.avatar,
                            {
                              backgroundColor:
                                colores
                                  .fondoPrimario,
                            },
                          ]}
                        >
                          <Ionicons
                            name="person-outline"
                            size={24}
                            color={
                              colores.primario
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.datosAlumno
                          }
                        >
                          <Text
                            style={[
                              styles.nombreAlumno,
                              {
                                color:
                                  colores.texto,
                                fontSize:
                                  13 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            {
                              estudiante.nombre_completo
                            }
                          </Text>

                          <Text
                            style={[
                              styles.grupoAlumno,
                              {
                                color:
                                  colores.textoSecundario,
                                fontSize:
                                  10 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            {estudiante.grupo}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.estadosAlumno
                        }
                      >
                        {ESTADOS.map(
                          (opcionEstado) => {
                            const seleccionado =
                              estado ===
                              opcionEstado;

                            const configuracion =
                              obtenerConfiguracionEstado(
                                opcionEstado,
                                colores
                              );

                            return (
                              <TouchableOpacity
                                key={
                                  opcionEstado
                                }
                                style={[
                                  styles.botonEstado,
                                  {
                                    borderColor:
                                      seleccionado
                                        ? configuracion.color
                                        : colores.borde,
                                    backgroundColor:
                                      seleccionado
                                        ? configuracion.fondo
                                        : colores.fondo,
                                  },
                                ]}
                                onPress={() =>
                                  cambiarEstado(
                                    estudiante.id_alumno,
                                    opcionEstado,
                                    estudiante.nombre_completo
                                  )
                                }
                                accessibilityRole="radio"
                                accessibilityLabel={`${opcionEstado} para ${estudiante.nombre_completo}`}
                                accessibilityState={{
                                  checked:
                                    seleccionado,
                                }}
                              >
                                <Ionicons
                                  name={
                                    configuracion.icono
                                  }
                                  size={17}
                                  color={
                                    seleccionado
                                      ? configuracion.color
                                      : colores.textoSecundario
                                  }
                                />

                                <Text
                                  style={[
                                    styles.textoEstado,
                                    {
                                      color:
                                        seleccionado
                                          ? configuracion.color
                                          : colores.textoSecundario,
                                      fontSize:
                                        9 *
                                        escalaTexto,
                                    },
                                  ]}
                                >
                                  {
                                    opcionEstado
                                  }
                                </Text>
                              </TouchableOpacity>
                            );
                          }
                        )}
                      </View>
                    </View>
                  );
                }
              )
            )}

            <View
              style={[
                styles.resumen,
                {
                  backgroundColor:
                    colores.fondoPrimario,
                  borderColor: colores.borde,
                },
              ]}
            >
              <ResumenItem
                titulo="Presentes"
                valor={resumen.presentes}
                icono="checkmark-circle"
                color="#16A34A"
                escalaTexto={escalaTexto}
              />

              <ResumenItem
                titulo="Faltas"
                valor={resumen.faltas}
                icono="close-circle"
                color="#DC2626"
                escalaTexto={escalaTexto}
              />

              <ResumenItem
                titulo="Retardos"
                valor={resumen.retardos}
                icono="time"
                color="#D97706"
                escalaTexto={escalaTexto}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.botonGuardar,
                {
                  backgroundColor:
                    colores.primario,
                  opacity: guardando ? 0.65 : 1,
                },
              ]}
              onPress={guardarLista}
              disabled={guardando}
              accessibilityRole="button"
              accessibilityLabel="Guardar lista de asistencia"
              accessibilityState={{
                disabled: guardando,
                busy: guardando,
              }}
            >
              {guardando ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="save-outline"
                    size={21}
                    color="#FFFFFF"
                  />

                  <Text
                    style={[
                      styles.textoGuardar,
                      {
                        fontSize:
                          14 * escalaTexto,
                      },
                    ]}
                  >
                    Guardar lista
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal
        visible={selectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSelectorVisible(false)
        }
      >
        <View style={styles.fondoModal}>
          <View
            style={[
              styles.contenidoModal,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <View style={styles.encabezadoModal}>
              <Text
                style={[
                  styles.tituloModal,
                  {
                    color: colores.texto,
                    fontSize:
                      17 * escalaTexto,
                  },
                ]}
              >
                Seleccionar curso
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setSelectorVisible(false)
                }
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Ionicons
                  name="close"
                  size={25}
                  color={colores.texto}
                />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {cursos.map((curso) => {
                const seleccionado =
                  curso.id_curso ===
                  cursoSeleccionado;

                return (
                  <TouchableOpacity
                    key={curso.id_curso}
                    style={[
                      styles.opcionCurso,
                      {
                        borderBottomColor:
                          colores.borde,
                        backgroundColor:
                          seleccionado
                            ? colores
                                .fondoPrimario
                            : colores.tarjeta,
                      },
                    ]}
                    onPress={() =>
                      seleccionarCurso(curso)
                    }
                  >
                    <View style={styles.datosCurso}>
                      <Text
                        style={[
                          styles.nombreCurso,
                          {
                            color:
                              colores.texto,
                            fontSize:
                              13 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {curso.nombre}
                      </Text>

                      <Text
                        style={[
                          styles.detalleCurso,
                          {
                            color:
                              colores.textoSecundario,
                            fontSize:
                              10 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {curso.materia} ·{' '}
                        {curso.grupo}
                      </Text>
                    </View>

                    {seleccionado && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={
                          colores.primario
                        }
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function obtenerConfiguracionEstado(
  estado: EstadoAsistencia,
  colores: {
    fondoPrimario: string;
  }
) {
  switch (estado) {
    case 'Presente':
      return {
        color: '#16A34A',
        fondo: '#DCFCE7',
        icono:
          'checkmark-circle-outline' as const,
      };

    case 'Falta':
      return {
        color: '#DC2626',
        fondo: '#FEE2E2',
        icono:
          'close-circle-outline' as const,
      };

    case 'Retardo':
      return {
        color: '#D97706',
        fondo: '#FEF3C7',
        icono: 'time-outline' as const,
      };

    default:
      return {
        color: '#64748B',
        fondo: colores.fondoPrimario,
        icono:
          'ellipse-outline' as const,
      };
  }
}

type ResumenItemProps = {
  titulo: string;
  valor: number;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  escalaTexto: number;
};

function ResumenItem({
  titulo,
  valor,
  icono,
  color,
  escalaTexto,
}: ResumenItemProps) {
  return (
    <View
      style={styles.itemResumen}
      accessible
      accessibilityLabel={`${titulo}: ${valor}`}
    >
      <Ionicons
        name={icono}
        size={22}
        color={color}
      />

      <Text
        style={[
          styles.numeroResumen,
          {
            color,
            fontSize: 18 * escalaTexto,
          },
        ]}
      >
        {valor}
      </Text>

      <Text
        style={[
          styles.textoResumen,
          {
            fontSize: 9 * escalaTexto,
          },
        ]}
      >
        {titulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  encabezado: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  botonEncabezado: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoEncabezado: {
    flex: 1,
    marginHorizontal: 11,
  },

  tituloPantalla: {
    fontWeight: '900',
  },

  subtituloPantalla: {
    marginTop: 3,
  },

  contenido: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 35,
  },

  tarjetaFecha: {
    minHeight: 67,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },

  datosFecha: {
    flex: 1,
    marginLeft: 11,
  },

  etiquetaFecha: {
    fontWeight: '600',
  },

  fecha: {
    marginTop: 3,
    fontWeight: '800',
    textTransform: 'capitalize',
  },

  etiqueta: {
    marginBottom: 6,
    fontWeight: '800',
  },

  selectorCurso: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 19,
  },

  datosCurso: {
    flex: 1,
  },

  nombreCurso: {
    fontWeight: '800',
  },

  detalleCurso: {
    marginTop: 4,
  },

  cargando: {
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoCargando: {
    marginTop: 11,
  },

  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  tituloSeccion: {
    fontWeight: '900',
  },

  totalEstudiantes: {
    marginTop: 3,
  },

  botonTodos: {
    minHeight: 39,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 5,
  },

  textoTodos: {
    fontWeight: '800',
  },

  tarjetaAlumno: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },

  filaAlumno: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  datosAlumno: {
    flex: 1,
    marginLeft: 11,
  },

  nombreAlumno: {
    fontWeight: '800',
  },

  grupoAlumno: {
    marginTop: 3,
  },

  estadosAlumno: {
    flexDirection: 'row',
    columnGap: 6,
    marginTop: 12,
  },

  botonEstado: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 4,
  },

  textoEstado: {
    fontWeight: '800',
  },

  resumen: {
    minHeight: 101,
    borderWidth: 1,
    borderRadius: 17,
    marginTop: 8,
    padding: 12,
    flexDirection: 'row',
  },

  itemResumen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  numeroResumen: {
    marginTop: 3,
    fontWeight: '900',
  },

  textoResumen: {
    color: '#667085',
    marginTop: 2,
    fontWeight: '700',
  },

  botonGuardar: {
    minHeight: 53,
    borderRadius: 14,
    marginTop: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },

  textoGuardar: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  estadoVacio: {
    minHeight: 200,
    borderWidth: 1,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  tituloVacio: {
    marginTop: 11,
    fontWeight: '900',
  },

  textoVacio: {
    marginTop: 6,
    textAlign: 'center',
  },

  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  contenidoModal: {
    maxHeight: '70%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
  },

  encabezadoModal: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  tituloModal: {
    flex: 1,
    fontWeight: '900',
  },

  opcionCurso: {
    minHeight: 63,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
});