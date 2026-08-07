import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type ModalidadEvaluacion =
  | 'Cuestionario'
  | 'Tarea'
  | 'Examen';

type Curso = {
  id_curso: number;
  id_ciclo: number;
  nombre_curso: string;
  materia: string;
  grupo: string;
  grado: string | null;
  alumnos_inscritos: number | string;
};

type Periodo = {
  id_periodo: number;
  id_ciclo: number;
  nombre_periodo: string;
};

type RespuestaCatalogos = {
  cursos?: Curso[];
  periodos?: Periodo[];
  mensaje?: string;
};

type RespuestaCrear = {
  mensaje?: string;
  id_evaluacion?: number;
  alumnos_asignados?: number;
};

type RespuestaError = {
  mensaje?: string;
  error?: string;
};

type IoniconName =
  keyof typeof Ionicons.glyphMap;

const MORADO = '#7C3AED';
const MORADO_OSCURO = '#5B21B6';
const MORADO_SUAVE = '#F3E8FF';

const MODALIDADES: Array<{
  tipo: ModalidadEvaluacion;
  descripcion: string;
  icono: IoniconName;
}> = [
  {
    tipo: 'Cuestionario',
    descripcion:
      'Preguntas rápidas con calificación',
    icono: 'list-circle-outline',
  },
  {
    tipo: 'Tarea',
    descripcion:
      'Respuesta escrita o archivo adjunto',
    icono: 'cloud-upload-outline',
  },
  {
    tipo: 'Examen',
    descripcion:
      'Evaluación formal con tiempo limitado',
    icono: 'document-text-outline',
  },
];

const completarNumero = (
  numero: number
) =>
  String(numero).padStart(2, '0');

const convertirFechaMySQL = (
  fecha: Date
) => {
  const fechaTexto = [
    fecha.getFullYear(),
    completarNumero(
      fecha.getMonth() + 1
    ),
    completarNumero(
      fecha.getDate()
    ),
  ].join('-');

  const horaTexto = [
    completarNumero(
      fecha.getHours()
    ),
    completarNumero(
      fecha.getMinutes()
    ),
    '00',
  ].join(':');

  return `${fechaTexto} ${horaTexto}`;
};

const crearFechaInicial = () => {
  const fecha = new Date();

  fecha.setDate(
    fecha.getDate() + 1
  );

  fecha.setHours(
    23,
    59,
    0,
    0
  );

  return fecha;
};

const mostrarFecha = (
  fecha: Date
) =>
  fecha.toLocaleString(
    'es-MX',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );

const leerRespuesta = async <T,>(
  respuesta: Response
): Promise<T> => {
  const texto =
    await respuesta.text();

  if (!texto) {
    return {} as T;
  }

  try {
    return JSON.parse(
      texto
    ) as T;
  } catch {
    throw new Error(
      'El servidor devolvió una respuesta no válida.'
    );
  }
};

const obtenerMensajeError = (
  error: unknown
) => {
  if (
    error instanceof TypeError
  ) {
    return 'No se pudo conectar con el servidor. Verifica que Node esté encendido y que el celular y la computadora estén en la misma red Wi-Fi.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado.';
};

export default function CrearEvaluacionScreen() {
  const { width } =
    useWindowDimensions();

  const {
    preferencias,
    colores,
    escalaTexto,
    leerTexto,
  } = useAccessibility();

  /*
   * Si el usuario selecciona blanco
   * como color del alto contraste,
   * los botones blancos necesitan
   * texto e iconos negros.
   */
  const altoContrasteBlanco =
    preferencias.altoContraste &&
    preferencias.colorContraste ===
      'Blanco';

  const colorSobrePrimario =
    altoContrasteBlanco
      ? '#000000'
      : '#FFFFFF';

  const temaAltoContraste =
    preferencias.altoContraste;

  const colorDestacado =
    temaAltoContraste
      ? colores.primario
      : MORADO;

  const fondoDestacadoSuave =
    temaAltoContraste
      ? colores.fondoPrimario
      : MORADO_SUAVE;

  const textoDestacado =
    temaAltoContraste
      ? colores.texto
      : MORADO_OSCURO;

  const [cursos, setCursos] =
    useState<Curso[]>([]);

  const [periodos, setPeriodos] =
    useState<Periodo[]>([]);

  const [idCurso, setIdCurso] =
    useState('');

  const [idPeriodo, setIdPeriodo] =
    useState('');

  const [titulo, setTitulo] =
    useState('');

  const [
    descripcion,
    setDescripcion,
  ] = useState('');

  const [
    instrucciones,
    setInstrucciones,
  ] = useState('');

  const [
    fechaLimite,
    setFechaLimite,
  ] =
    useState(
      crearFechaInicial
    );

  const [
    modalidad,
    setModalidad,
  ] =
    useState<ModalidadEvaluacion>(
      'Cuestionario'
    );

  const [
    puntajeMaximo,
    setPuntajeMaximo,
  ] = useState('100');

  const [
    duracionMinutos,
    setDuracionMinutos,
  ] = useState('60');

  const [
    intentosPermitidos,
    setIntentosPermitidos,
  ] = useState('1');

  const [
    mostrarResultado,
    setMostrarResultado,
  ] = useState(true);

  const [
    permiteEntregaArchivo,
    setPermiteEntregaArchivo,
  ] = useState(false);

  const [
    cargandoCatalogos,
    setCargandoCatalogos,
  ] = useState(true);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    selectorCursoVisible,
    setSelectorCursoVisible,
  ] = useState(false);

  const [
    selectorPeriodoVisible,
    setSelectorPeriodoVisible,
  ] = useState(false);

  const [
    selectorFechaVisible,
    setSelectorFechaVisible,
  ] = useState(false);

  const [
    selectorHoraVisible,
    setSelectorHoraVisible,
  ] = useState(false);

  const margen =
    width < 370
      ? 14
      : 20;

  const anchoContenido =
    Math.min(
      width - margen * 2,
      560
    );

  const anunciar = (
    texto: string
  ) => {
    if (
      preferencias.lectorPantalla
    ) {
      leerTexto(texto);
    }
  };

  useEffect(() => {
    if (
      preferencias.lectorPantalla
    ) {
      leerTexto(
        'Pantalla crear evaluación. Selecciona el curso, completa la información y publica para que aparezca a los alumnos inscritos.'
      );
    }
  }, [
    preferencias.lectorPantalla,
  ]);

  useEffect(() => {
    if (
      modalidad !== 'Tarea'
    ) {
      setPermiteEntregaArchivo(
        false
      );
    }
  }, [modalidad]);

  const cursoSeleccionado =
    useMemo(
      () =>
        cursos.find(
          (curso) =>
            String(
              curso.id_curso
            ) === idCurso
        ),
      [
        cursos,
        idCurso,
      ]
    );

  const periodosDisponibles =
    useMemo(() => {
      if (
        !cursoSeleccionado
      ) {
        return [];
      }

      return periodos.filter(
        (periodo) =>
          Number(
            periodo.id_ciclo
          ) ===
          Number(
            cursoSeleccionado.id_ciclo
          )
      );
    }, [
      cursoSeleccionado,
      periodos,
    ]);

  const periodoSeleccionado =
    periodosDisponibles.find(
      (periodo) =>
        String(
          periodo.id_periodo
        ) === idPeriodo
    );

  const cargarCatalogos =
    async () => {
      try {
        setCargandoCatalogos(
          true
        );

        const token =
          await AsyncStorage.getItem(
            'token'
          );

        if (!token) {
          throw new Error(
            'No se encontró tu sesión. Inicia sesión nuevamente.'
          );
        }

        const respuesta =
          await fetch(
            `${API_URL}/evaluaciones/catalogos`,
            {
              headers: {
                Accept:
                  'application/json',
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const datos =
          await leerRespuesta<RespuestaCatalogos>(
            respuesta
          );

        if (
          !respuesta.ok
        ) {
          throw new Error(
            datos.mensaje ||
              'No se pudieron cargar los cursos.'
          );
        }

        setCursos(
          datos.cursos ?? []
        );

        setPeriodos(
          datos.periodos ?? []
        );
      } catch (error) {
        Alert.alert(
          'No se pudieron cargar los datos',
          obtenerMensajeError(
            error
          )
        );
      } finally {
        setCargandoCatalogos(
          false
        );
      }
    };

  useEffect(() => {
    void cargarCatalogos();
  }, []);

  const seleccionarCurso = (
    curso: Curso
  ) => {
    setIdCurso(
      String(
        curso.id_curso
      )
    );

    setIdPeriodo('');

    setSelectorCursoVisible(
      false
    );

    anunciar(
      `${curso.nombre_curso}, ${curso.materia}, seleccionado. ${curso.alumnos_inscritos} alumnos inscritos.`
    );
  };

  const seleccionarPeriodo = (
    periodo: Periodo | null
  ) => {
    setIdPeriodo(
      periodo
        ? String(
            periodo.id_periodo
          )
        : ''
    );

    setSelectorPeriodoVisible(
      false
    );

    anunciar(
      periodo
        ? `Periodo ${periodo.nombre_periodo} seleccionado.`
        : 'La evaluación se publicará sin periodo.'
    );
  };

  const alSeleccionarFecha = (
    evento: DateTimePickerEvent,
    fecha?: Date
  ) => {
    if (
      Platform.OS ===
      'android'
    ) {
      setSelectorFechaVisible(
        false
      );
    }

    if (
      evento.type ===
        'dismissed' ||
      !fecha
    ) {
      return;
    }

    const nuevaFecha =
      new Date(
        fechaLimite
      );

    nuevaFecha.setFullYear(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate()
    );

    setFechaLimite(
      nuevaFecha
    );

    if (
      Platform.OS ===
      'android'
    ) {
      setSelectorHoraVisible(
        true
      );
    }
  };

  const alSeleccionarHora = (
    evento: DateTimePickerEvent,
    fecha?: Date
  ) => {
    setSelectorHoraVisible(
      false
    );

    if (
      evento.type ===
        'dismissed' ||
      !fecha
    ) {
      return;
    }

    setFechaLimite(
      (anterior) => {
        const nuevaFecha =
          new Date(
            anterior
          );

        nuevaFecha.setHours(
          fecha.getHours(),
          fecha.getMinutes(),
          0,
          0
        );

        anunciar(
          `Fecha límite: ${mostrarFecha(
            nuevaFecha
          )}.`
        );

        return nuevaFecha;
      }
    );
  };

  const validarFormulario =
    () => {
      if (!idCurso) {
        Alert.alert(
          'Curso requerido',
          'Selecciona un curso.'
        );

        anunciar(
          'Error. Debes seleccionar un curso.'
        );

        return false;
      }

      if (
        !titulo.trim()
      ) {
        Alert.alert(
          'Título requerido',
          'Escribe el título de la evaluación.'
        );

        anunciar(
          'Error. Escribe el título de la evaluación.'
        );

        return false;
      }

      if (
        fechaLimite.getTime() <=
        Date.now()
      ) {
        Alert.alert(
          'Fecha incorrecta',
          'La fecha límite debe ser posterior a la fecha actual.'
        );

        return false;
      }

      const puntaje =
        Number(
          puntajeMaximo
        );

      const duracion =
        Number(
          duracionMinutos
        );

      const intentos =
        Number(
          intentosPermitidos
        );

      if (
        !Number.isFinite(
          puntaje
        ) ||
        puntaje <= 0 ||
        puntaje > 999.99
      ) {
        Alert.alert(
          'Puntaje incorrecto',
          'El puntaje debe estar entre 0.01 y 999.99.'
        );

        return false;
      }

      if (
        !Number.isInteger(
          duracion
        ) ||
        duracion < 1 ||
        duracion > 600
      ) {
        Alert.alert(
          'Duración incorrecta',
          'La duración debe estar entre 1 y 600 minutos.'
        );

        return false;
      }

      if (
        !Number.isInteger(
          intentos
        ) ||
        intentos < 1 ||
        intentos > 10
      ) {
        Alert.alert(
          'Intentos incorrectos',
          'Los intentos deben estar entre 1 y 10.'
        );

        return false;
      }

      return true;
    };

  const publicarEvaluacion =
    async () => {
      if (
        guardando ||
        !validarFormulario()
      ) {
        return;
      }

      try {
        setGuardando(true);

        anunciar(
          'Publicando evaluación.'
        );

        const token =
          await AsyncStorage.getItem(
            'token'
          );

        if (!token) {
          throw new Error(
            'Tu sesión terminó. Inicia sesión nuevamente.'
          );
        }

        const respuesta =
          await fetch(
            `${API_URL}/evaluaciones`,
            {
              method: 'POST',
              headers: {
                Accept:
                  'application/json',
                'Content-Type':
                  'application/json',
                Authorization:
                  `Bearer ${token}`,
              },
              body:
                JSON.stringify({
                  id_curso:
                    Number(
                      idCurso
                    ),

                  id_periodo:
                    idPeriodo
                      ? Number(
                          idPeriodo
                        )
                      : null,

                  titulo:
                    titulo.trim(),

                  descripcion:
                    descripcion.trim() ||
                    null,

                  instrucciones:
                    instrucciones.trim() ||
                    null,

                  modalidad,

                  fecha_limite:
                    convertirFechaMySQL(
                      fechaLimite
                    ),

                  puntaje_maximo:
                    Number(
                      puntajeMaximo
                    ),

                  duracion_minutos:
                    Number(
                      duracionMinutos
                    ),

                  intentos_permitidos:
                    Number(
                      intentosPermitidos
                    ),

                  mostrar_resultado:
                    mostrarResultado,

                  permite_entrega_archivo:
                    modalidad ===
                      'Tarea' &&
                    permiteEntregaArchivo,
                }),
            }
          );

        const datos =
          await leerRespuesta<
            RespuestaCrear &
              RespuestaError
          >(respuesta);

        if (
          !respuesta.ok
        ) {
          throw new Error(
            datos.mensaje ||
              datos.error ||
              'No se pudo publicar.'
          );
        }

        const asignados =
          datos.alumnos_asignados ??
          0;

        const mensaje = `${
          datos.mensaje ||
          'La evaluación se publicó correctamente.'
        }\n\nAparecerá a ${asignados} alumno${
          asignados === 1
            ? ''
            : 's'
        } inscrito${
          asignados === 1
            ? ''
            : 's'
        }.`;

        anunciar(
          `Evaluación publicada. Se asignó a ${asignados} alumnos.`
        );

        Alert.alert(
          'Evaluación publicada',
          mensaje,
          [
            {
              text: 'Aceptar',
              onPress: () =>
                router.replace(
                  '/inicio-docente' as never
                ),
            },
          ]
        );
      } catch (error) {
        const mensaje =
          obtenerMensajeError(
            error
          );

        Alert.alert(
          'No se pudo publicar',
          mensaje
        );

        anunciar(
          `Error. ${mensaje}`
        );
      } finally {
        setGuardando(
          false
        );
      }
    };

  const fondoTarjeta =
    colores.tarjeta;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colores.fondo,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }
      >
        {/* ENCABEZADO */}
        <View
          style={[
            styles.header,
            {
              backgroundColor:
                colores.fondo,
              borderBottomColor:
                colores.borde,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.headerButton,
              {
                backgroundColor:
                  colores.tarjeta,
                borderColor:
                  colores.borde,
              },
            ]}
            onPress={() =>
              router.back()
            }
            accessibilityRole="button"
            accessibilityLabel="Regresar"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={
                colores.texto
              }
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerText
            }
          >
            <Text
              accessibilityRole="header"
              style={[
                styles.headerTitle,
                {
                  color:
                    colores.texto,
                  fontSize:
                    19 *
                    escalaTexto,
                },
              ]}
            >
              Crear evaluación
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                {
                  color:
                    colores.textoSecundario,
                  fontSize:
                    11 *
                    escalaTexto,
                },
              ]}
            >
              Publica y asigna a
              tus estudiantes
            </Text>
          </View>

          <BotonAccesibilidad />
        </View>

        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          <View
            style={[
              styles.content,
              {
                width:
                  anchoContenido,
              },
            ]}
          >
            {/* TARJETA INFORMATIVA */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor:
                    temaAltoContraste
                      ? colores.tarjeta
                      : MORADO,
                  borderColor:
                    temaAltoContraste
                      ? colores.borde
                      : MORADO,
                },
              ]}
            >
              <View
                style={[
                  styles.heroIcon,
                  {
                    backgroundColor:
                      temaAltoContraste
                        ? colores.fondoPrimario
                        : 'rgba(255,255,255,0.18)',
                    borderColor:
                      temaAltoContraste
                        ? colores.borde
                        : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name="school-outline"
                  size={25}
                  color={
                    temaAltoContraste
                      ? colores.primario
                      : '#FFFFFF'
                  }
                />
              </View>

              <View
                style={
                  styles.heroText
                }
              >
                <Text
                  style={[
                    styles.heroTitle,
                    {
                      color:
                        temaAltoContraste
                          ? colores.texto
                          : '#FFFFFF',
                      fontSize:
                        17 *
                        escalaTexto,
                    },
                  ]}
                >
                  Nueva evaluación
                </Text>

                <Text
                  style={[
                    styles.heroSubtitle,
                    {
                      color:
                        temaAltoContraste
                          ? colores.textoSecundario
                          : '#F5F3FF',
                      fontSize:
                        12 *
                        escalaTexto,
                    },
                  ]}
                >
                  Al publicar, se
                  guardará en MySQL y
                  aparecerá a los
                  alumnos inscritos.
                </Text>
              </View>
            </View>

            <SectionTitle
              numero="1"
              titulo="¿Para quién es?"
              subtitulo="Selecciona el curso y el periodo"
              colorTexto={
                colores.texto
              }
              colorSecundario={
                colores.textoSecundario
              }
              colorDestacado={
                colorDestacado
              }
              colorSobreDestacado={
                colorSobrePrimario
              }
              escalaTexto={
                escalaTexto
              }
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor:
                    fondoTarjeta,
                  borderColor:
                    colores.borde,
                },
              ]}
            >
              {cargandoCatalogos ? (
                <View
                  style={
                    styles.loadingRow
                  }
                >
                  <ActivityIndicator
                    color={
                      colorDestacado
                    }
                  />

                  <Text
                    style={[
                      styles.loadingText,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          13 *
                          escalaTexto,
                      },
                    ]}
                  >
                    Cargando tus
                    cursos...
                  </Text>
                </View>
              ) : (
                <>
                  <FieldLabel
                    texto="Curso"
                    requerido
                    color={
                      colores.texto
                    }
                    escalaTexto={
                      escalaTexto
                    }
                  />

                  <TouchableOpacity
                    style={[
                      styles.selector,
                      {
                        backgroundColor:
                          colores.fondo,
                        borderColor:
                          idCurso
                            ? colorDestacado
                            : colores.borde,
                      },
                    ]}
                    onPress={() =>
                      setSelectorCursoVisible(
                        true
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Seleccionar curso"
                    accessibilityValue={{
                      text:
                        cursoSeleccionado
                          ? `${cursoSeleccionado.nombre_curso}, ${cursoSeleccionado.materia}`
                          : 'Sin curso seleccionado',
                    }}
                  >
                    <View
                      style={[
                        styles.selectorIcon,
                        {
                          backgroundColor:
                            fondoDestacadoSuave,
                        },
                      ]}
                    >
                      <Ionicons
                        name="people-outline"
                        size={20}
                        color={
                          colorDestacado
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.selectorTextBox
                      }
                    >
                      <Text
                        numberOfLines={
                          1
                        }
                        style={[
                          styles.selectorTitle,
                          {
                            color:
                              cursoSeleccionado
                                ? colores.texto
                                : colores.textoSecundario,
                            fontSize:
                              13 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {cursoSeleccionado
                          ?.nombre_curso ||
                          'Selecciona un curso'}
                      </Text>

                      {cursoSeleccionado && (
                        <Text
                          numberOfLines={
                            1
                          }
                          style={[
                            styles.selectorSubtitle,
                            {
                              color:
                                colores.textoSecundario,
                              fontSize:
                                10 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {
                            cursoSeleccionado.materia
                          }{' '}
                          ·{' '}
                          {
                            cursoSeleccionado.grado
                          }{' '}
                          {
                            cursoSeleccionado.grupo
                          }{' '}
                          ·{' '}
                          {
                            cursoSeleccionado.alumnos_inscritos
                          }{' '}
                          alumnos
                        </Text>
                      )}
                    </View>

                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={
                        colorDestacado
                      }
                    />
                  </TouchableOpacity>

                  <FieldLabel
                    texto="Periodo (opcional)"
                    color={
                      colores.texto
                    }
                    escalaTexto={
                      escalaTexto
                    }
                  />

                  <TouchableOpacity
                    style={[
                      styles.selector,
                      {
                        backgroundColor:
                          colores.fondo,
                        borderColor:
                          colores.borde,
                        opacity:
                          idCurso
                            ? 1
                            : 0.55,
                      },
                    ]}
                    onPress={() =>
                      setSelectorPeriodoVisible(
                        true
                      )
                    }
                    disabled={
                      !idCurso
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Seleccionar periodo"
                    accessibilityState={{
                      disabled:
                        !idCurso,
                    }}
                  >
                    <View
                      style={[
                        styles.selectorIcon,
                        {
                          backgroundColor:
                            fondoDestacadoSuave,
                        },
                      ]}
                    >
                      <Ionicons
                        name="calendar-number-outline"
                        size={20}
                        color={
                          colorDestacado
                        }
                      />
                    </View>

                    <Text
                      numberOfLines={
                        1
                      }
                      style={[
                        styles.selectorTitle,
                        styles.selectorTextBox,
                        {
                          color:
                            periodoSeleccionado
                              ? colores.texto
                              : colores.textoSecundario,
                          fontSize:
                            13 *
                            escalaTexto,
                        },
                      ]}
                    >
                      {periodoSeleccionado
                        ?.nombre_periodo ||
                        (idCurso
                          ? 'Sin periodo'
                          : 'Primero selecciona un curso')}
                    </Text>

                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={
                        colorDestacado
                      }
                    />
                  </TouchableOpacity>

                  {cursos.length ===
                    0 && (
                    <View
                      style={[
                        styles.warningBox,
                        {
                          backgroundColor:
                            temaAltoContraste
                              ? colores.tarjeta
                              : '#FFFBEB',
                          borderColor:
                            temaAltoContraste
                              ? colores.borde
                              : '#FDE68A',
                        },
                      ]}
                    >
                      <Ionicons
                        name="alert-circle-outline"
                        size={20}
                        color={
                          temaAltoContraste
                            ? colores.primario
                            : '#B45309'
                        }
                      />

                      <Text
                        style={[
                          styles.warningText,
                          {
                            color:
                              temaAltoContraste
                                ? colores.texto
                                : '#92400E',
                          },
                        ]}
                      >
                        No tienes cursos
                        activos asignados.
                        El administrador
                        debe asignarte uno
                        antes de publicar.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <SectionTitle
              numero="2"
              titulo="Información"
              subtitulo="Describe claramente la evaluación"
              colorTexto={
                colores.texto
              }
              colorSecundario={
                colores.textoSecundario
              }
              colorDestacado={
                colorDestacado
              }
              colorSobreDestacado={
                colorSobrePrimario
              }
              escalaTexto={
                escalaTexto
              }
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor:
                    fondoTarjeta,
                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <FieldLabel
                texto="Título de la evaluación"
                requerido
                color={
                  colores.texto
                }
                escalaTexto={
                  escalaTexto
                }
              />

              <TextInput
                value={titulo}
                onChangeText={
                  setTitulo
                }
                placeholder="Ej. Evaluación de ecosistemas"
                placeholderTextColor={
                  colores.textoSecundario
                }
                maxLength={150}
                style={[
                  styles.input,
                  {
                    color:
                      colores.texto,
                    backgroundColor:
                      colores.fondo,
                    borderColor:
                      colores.borde,
                    fontSize:
                      14 *
                      escalaTexto,
                  },
                ]}
                accessibilityLabel="Título de la evaluación"
              />

              <Text
                style={[
                  styles.counter,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      10 *
                      escalaTexto,
                  },
                ]}
              >
                {titulo.length}/150
              </Text>

              <FieldLabel
                texto="Descripción"
                color={
                  colores.texto
                }
                escalaTexto={
                  escalaTexto
                }
              />

              <TextInput
                value={
                  descripcion
                }
                onChangeText={
                  setDescripcion
                }
                placeholder="Explica qué conocimientos se evaluarán"
                placeholderTextColor={
                  colores.textoSecundario
                }
                multiline
                maxLength={500}
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color:
                      colores.texto,
                    backgroundColor:
                      colores.fondo,
                    borderColor:
                      colores.borde,
                    fontSize:
                      14 *
                      escalaTexto,
                  },
                ]}
                accessibilityLabel="Descripción de la evaluación"
              />

              <FieldLabel
                texto="Instrucciones"
                color={
                  colores.texto
                }
                escalaTexto={
                  escalaTexto
                }
              />

              <TextInput
                value={
                  instrucciones
                }
                onChangeText={
                  setInstrucciones
                }
                placeholder="Ej. Lee cada pregunta antes de responder"
                placeholderTextColor={
                  colores.textoSecundario
                }
                multiline
                maxLength={1000}
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color:
                      colores.texto,
                    backgroundColor:
                      colores.fondo,
                    borderColor:
                      colores.borde,
                    fontSize:
                      14 *
                      escalaTexto,
                  },
                ]}
                accessibilityLabel="Instrucciones para los alumnos"
              />
            </View>

            <SectionTitle
              numero="3"
              titulo="Modalidad"
              subtitulo="Elige cómo trabajará el alumno"
              colorTexto={
                colores.texto
              }
              colorSecundario={
                colores.textoSecundario
              }
              colorDestacado={
                colorDestacado
              }
              colorSobreDestacado={
                colorSobrePrimario
              }
              escalaTexto={
                escalaTexto
              }
            />

            <View accessibilityRole="radiogroup">
              {MODALIDADES.map(
                (opcion) => {
                  const seleccionada =
                    modalidad ===
                    opcion.tipo;

                  return (
                    <TouchableOpacity
                      key={
                        opcion.tipo
                      }
                      style={[
                        styles.optionCard,
                        {
                          backgroundColor:
                            seleccionada
                              ? fondoDestacadoSuave
                              : fondoTarjeta,

                          borderColor:
                            seleccionada
                              ? colorDestacado
                              : colores.borde,
                        },
                      ]}
                      onPress={() => {
                        setModalidad(
                          opcion.tipo
                        );

                        anunciar(
                          `${opcion.tipo} seleccionado.`
                        );
                      }}
                      accessibilityRole="radio"
                      accessibilityLabel={
                        opcion.tipo
                      }
                      accessibilityHint={
                        opcion.descripcion
                      }
                      accessibilityState={{
                        checked:
                          seleccionada,
                        selected:
                          seleccionada,
                      }}
                    >
                      <View
                        style={[
                          styles.optionIcon,
                          {
                            backgroundColor:
                              seleccionada
                                ? colorDestacado
                                : fondoDestacadoSuave,

                            borderColor:
                              seleccionada
                                ? colorDestacado
                                : colores.borde,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            opcion.icono
                          }
                          size={22}
                          color={
                            seleccionada
                              ? colorSobrePrimario
                              : colorDestacado
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.optionText
                        }
                      >
                        <Text
                          style={[
                            styles.optionTitle,
                            {
                              color:
                                seleccionada
                                  ? textoDestacado
                                  : colores.texto,

                              fontSize:
                                14 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {
                            opcion.tipo
                          }
                        </Text>

                        <Text
                          style={[
                            styles.optionSubtitle,
                            {
                              color:
                                seleccionada
                                  ? colores.textoSecundario
                                  : colores.textoSecundario,

                              fontSize:
                                11 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {
                            opcion.descripcion
                          }
                        </Text>
                      </View>

                      <Ionicons
                        name={
                          seleccionada
                            ? 'checkmark-circle'
                            : 'ellipse-outline'
                        }
                        size={23}
                        color={
                          seleccionada
                            ? colorDestacado
                            : colores.borde
                        }
                      />
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            <SectionTitle
              numero="4"
              titulo="Configuración"
              subtitulo="Define fecha, puntaje e intentos"
              colorTexto={
                colores.texto
              }
              colorSecundario={
                colores.textoSecundario
              }
              colorDestacado={
                colorDestacado
              }
              colorSobreDestacado={
                colorSobrePrimario
              }
              escalaTexto={
                escalaTexto
              }
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor:
                    fondoTarjeta,
                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <FieldLabel
                texto="Fecha y hora límite"
                requerido
                color={
                  colores.texto
                }
                escalaTexto={
                  escalaTexto
                }
              />

              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor:
                      colores.fondo,
                    borderColor:
                      colores.borde,
                  },
                ]}
                onPress={() =>
                  setSelectorFechaVisible(
                    true
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Seleccionar fecha y hora límite"
                accessibilityValue={{
                  text:
                    mostrarFecha(
                      fechaLimite
                    ),
                }}
              >
                <View
                  style={
                    styles.flex
                  }
                >
                  <Text
                    style={[
                      styles.dateTitle,
                      {
                        color:
                          colores.texto,
                        fontSize:
                          13 *
                          escalaTexto,
                      },
                    ]}
                  >
                    {mostrarFecha(
                      fechaLimite
                    )}
                  </Text>

                  <Text
                    style={[
                      styles.dateHint,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          10 *
                          escalaTexto,
                      },
                    ]}
                  >
                    Toca para cambiar
                  </Text>
                </View>

                <View
                  style={[
                    styles.calendarIcon,
                    {
                      backgroundColor:
                        colorDestacado,
                    },
                  ]}
                >
                  <Ionicons
                    name="calendar"
                    size={21}
                    color={
                      colorSobrePrimario
                    }
                  />
                </View>
              </TouchableOpacity>

              {selectorFechaVisible && (
                <View
                  style={
                    styles.pickerBox
                  }
                >
                  <DateTimePicker
                    value={
                      fechaLimite
                    }
                    mode={
                      Platform.OS ===
                      'ios'
                        ? 'datetime'
                        : 'date'
                    }
                    display={
                      Platform.OS ===
                      'ios'
                        ? 'spinner'
                        : 'default'
                    }
                    minimumDate={
                      new Date()
                    }
                    onChange={
                      alSeleccionarFecha
                    }
                  />

                  {Platform.OS ===
                    'ios' && (
                    <TouchableOpacity
                      style={[
                        styles.pickerDone,
                        {
                          backgroundColor:
                            colorDestacado,
                        },
                      ]}
                      onPress={() =>
                        setSelectorFechaVisible(
                          false
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.pickerDoneText,
                          {
                            color:
                              colorSobrePrimario,
                          },
                        ]}
                      >
                        Listo
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {selectorHoraVisible && (
                <DateTimePicker
                  value={
                    fechaLimite
                  }
                  mode="time"
                  display="default"
                  onChange={
                    alSeleccionarHora
                  }
                />
              )}

              <View
                style={
                  styles.inputRow
                }
              >
                <CompactInput
                  label="Puntaje"
                  value={
                    puntajeMaximo
                  }
                  onChangeText={
                    setPuntajeMaximo
                  }
                  suffix="pts"
                  keyboardType="decimal-pad"
                  colorTexto={
                    colores.texto
                  }
                  colorSecundario={
                    colores.textoSecundario
                  }
                  colorFondo={
                    colores.fondo
                  }
                  colorBorde={
                    colores.borde
                  }
                  escalaTexto={
                    escalaTexto
                  }
                />

                <CompactInput
                  label="Duración"
                  value={
                    duracionMinutos
                  }
                  onChangeText={
                    setDuracionMinutos
                  }
                  suffix="min"
                  keyboardType="number-pad"
                  colorTexto={
                    colores.texto
                  }
                  colorSecundario={
                    colores.textoSecundario
                  }
                  colorFondo={
                    colores.fondo
                  }
                  colorBorde={
                    colores.borde
                  }
                  escalaTexto={
                    escalaTexto
                  }
                />

                <CompactInput
                  label="Intentos"
                  value={
                    intentosPermitidos
                  }
                  onChangeText={
                    setIntentosPermitidos
                  }
                  suffix="máx."
                  keyboardType="number-pad"
                  colorTexto={
                    colores.texto
                  }
                  colorSecundario={
                    colores.textoSecundario
                  }
                  colorFondo={
                    colores.fondo
                  }
                  colorBorde={
                    colores.borde
                  }
                  escalaTexto={
                    escalaTexto
                  }
                />
              </View>

              <SwitchRow
                icon="eye-outline"
                title="Mostrar resultado"
                description="El alumno verá su resultado al terminar"
                value={
                  mostrarResultado
                }
                onChange={
                  setMostrarResultado
                }
                colorTexto={
                  colores.texto
                }
                colorSecundario={
                  colores.textoSecundario
                }
                colorBorde={
                  colores.borde
                }
                colorPrimario={
                  colorDestacado
                }
                fondoIcono={
                  fondoDestacadoSuave
                }
                altoContraste={
                  preferencias.altoContraste
                }
                escalaTexto={
                  escalaTexto
                }
              />

              {modalidad ===
                'Tarea' && (
                <SwitchRow
                  icon="attach-outline"
                  title="Permitir archivo"
                  description="El alumno podrá adjuntar su evidencia"
                  value={
                    permiteEntregaArchivo
                  }
                  onChange={
                    setPermiteEntregaArchivo
                  }
                  colorTexto={
                    colores.texto
                  }
                  colorSecundario={
                    colores.textoSecundario
                  }
                  colorBorde={
                    colores.borde
                  }
                  colorPrimario={
                    colorDestacado
                  }
                  fondoIcono={
                    fondoDestacadoSuave
                  }
                  altoContraste={
                    preferencias.altoContraste
                  }
                  escalaTexto={
                    escalaTexto
                  }
                />
              )}
            </View>

            {/* RESUMEN */}
            <View
              style={[
                styles.summaryBox,
                {
                  backgroundColor:
                    fondoDestacadoSuave,
                  borderColor:
                    colorDestacado,
                },
              ]}
            >
              <Ionicons
                name="information-circle"
                size={22}
                color={
                  colorDestacado
                }
              />

              <Text
                style={[
                  styles.summaryText,
                  {
                    color:
                      temaAltoContraste
                        ? colores.texto
                        : MORADO_OSCURO,
                    fontSize:
                      12 *
                      escalaTexto,
                  },
                ]}
              >
                Se publicará para{' '}
                <Text
                  style={
                    styles.bold
                  }
                >
                  {cursoSeleccionado
                    ?.alumnos_inscritos ??
                    0}{' '}
                  alumnos
                </Text>
                . También aparecerá en
                “Mis actividades” como
                evaluación.
              </Text>
            </View>

            {/* BOTONES */}
            <View
              style={
                styles.actions
              }
            >
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor:
                      fondoTarjeta,
                    borderColor:
                      colores.borde,
                  },
                ]}
                onPress={() =>
                  router.back()
                }
                disabled={
                  guardando
                }
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    {
                      color:
                        colores.texto,
                      fontSize:
                        14 *
                        escalaTexto,
                    },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.publishButton,
                  {
                    backgroundColor:
                      colores.primario,
                    borderColor:
                      colores.primario,
                  },
                  (
                    guardando ||
                    cargandoCatalogos ||
                    cursos.length ===
                      0
                  ) &&
                    styles.disabledButton,
                ]}
                onPress={
                  publicarEvaluacion
                }
                disabled={
                  guardando ||
                  cargandoCatalogos ||
                  cursos.length ===
                    0
                }
                accessibilityRole="button"
                accessibilityLabel={
                  guardando
                    ? 'Publicando evaluación'
                    : 'Publicar evaluación'
                }
                accessibilityState={{
                  disabled:
                    guardando ||
                    cargandoCatalogos ||
                    cursos.length ===
                      0,
                  busy:
                    guardando,
                }}
              >
                {guardando ? (
                  <ActivityIndicator
                    color={
                      colorSobrePrimario
                    }
                  />
                ) : (
                  <>
                    <Ionicons
                      name="send"
                      size={18}
                      color={
                        colorSobrePrimario
                      }
                    />

                    <Text
                      style={[
                        styles.publishButtonText,
                        {
                          color:
                            colorSobrePrimario,
                          fontSize:
                            14 *
                            escalaTexto,
                        },
                      ]}
                    >
                      Publicar evaluación
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* MODAL CURSO */}
        <SelectionModal
          visible={
            selectorCursoVisible
          }
          title="Selecciona un curso"
          onClose={() =>
            setSelectorCursoVisible(
              false
            )
          }
          backgroundColor={
            colores.tarjeta
          }
          textColor={
            colores.texto
          }
          secondaryTextColor={
            colores.textoSecundario
          }
          borderColor={
            colores.borde
          }
        >
          {cursos.map(
            (curso) => {
              const seleccionado =
                String(
                  curso.id_curso
                ) === idCurso;

              return (
                <TouchableOpacity
                  key={
                    curso.id_curso
                  }
                  style={[
                    styles.modalOption,
                    {
                      borderColor:
                        seleccionado
                          ? colorDestacado
                          : colores.borde,
                      backgroundColor:
                        seleccionado
                          ? fondoDestacadoSuave
                          : colores.tarjeta,
                    },
                  ]}
                  onPress={() =>
                    seleccionarCurso(
                      curso
                    )
                  }
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked:
                      seleccionado,
                  }}
                >
                  <View
                    style={
                      styles.modalOptionText
                    }
                  >
                    <Text
                      style={[
                        styles.modalOptionTitle,
                        {
                          color:
                            colores.texto,
                        },
                      ]}
                    >
                      {
                        curso.nombre_curso
                      }
                    </Text>

                    <Text
                      style={[
                        styles.modalOptionSubtitle,
                        {
                          color:
                            colores.textoSecundario,
                        },
                      ]}
                    >
                      {curso.materia}{' '}
                      · {curso.grado}{' '}
                      {curso.grupo} ·{' '}
                      {
                        curso.alumnos_inscritos
                      }{' '}
                      alumnos
                    </Text>
                  </View>

                  {seleccionado && (
                    <Ionicons
                      name="checkmark-circle"
                      size={23}
                      color={
                        colorDestacado
                      }
                    />
                  )}
                </TouchableOpacity>
              );
            }
          )}
        </SelectionModal>

        {/* MODAL PERIODO */}
        <SelectionModal
          visible={
            selectorPeriodoVisible
          }
          title="Selecciona un periodo"
          onClose={() =>
            setSelectorPeriodoVisible(
              false
            )
          }
          backgroundColor={
            colores.tarjeta
          }
          textColor={
            colores.texto
          }
          secondaryTextColor={
            colores.textoSecundario
          }
          borderColor={
            colores.borde
          }
        >
          <TouchableOpacity
            style={[
              styles.modalOption,
              {
                borderColor:
                  !idPeriodo
                    ? colorDestacado
                    : colores.borde,

                backgroundColor:
                  !idPeriodo
                    ? fondoDestacadoSuave
                    : colores.tarjeta,
              },
            ]}
            onPress={() =>
              seleccionarPeriodo(
                null
              )
            }
          >
            <Text
              style={[
                styles.modalOptionTitle,
                styles.modalOptionText,
                {
                  color:
                    colores.texto,
                },
              ]}
            >
              Sin periodo
            </Text>

            {!idPeriodo && (
              <Ionicons
                name="checkmark-circle"
                size={23}
                color={
                  colorDestacado
                }
              />
            )}
          </TouchableOpacity>

          {periodosDisponibles.map(
            (periodo) => {
              const seleccionado =
                String(
                  periodo.id_periodo
                ) === idPeriodo;

              return (
                <TouchableOpacity
                  key={
                    periodo.id_periodo
                  }
                  style={[
                    styles.modalOption,
                    {
                      borderColor:
                        seleccionado
                          ? colorDestacado
                          : colores.borde,

                      backgroundColor:
                        seleccionado
                          ? fondoDestacadoSuave
                          : colores.tarjeta,
                    },
                  ]}
                  onPress={() =>
                    seleccionarPeriodo(
                      periodo
                    )
                  }
                >
                  <Text
                    style={[
                      styles.modalOptionTitle,
                      styles.modalOptionText,
                      {
                        color:
                          colores.texto,
                      },
                    ]}
                  >
                    {
                      periodo.nombre_periodo
                    }
                  </Text>

                  {seleccionado && (
                    <Ionicons
                      name="checkmark-circle"
                      size={23}
                      color={
                        colorDestacado
                      }
                    />
                  )}
                </TouchableOpacity>
              );
            }
          )}
        </SelectionModal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =====================================================
   TÍTULO DE SECCIÓN
===================================================== */

type SectionTitleProps = {
  numero: string;
  titulo: string;
  subtitulo: string;
  colorTexto: string;
  colorSecundario: string;
  colorDestacado: string;
  colorSobreDestacado: string;
  escalaTexto: number;
};

function SectionTitle({
  numero,
  titulo,
  subtitulo,
  colorTexto,
  colorSecundario,
  colorDestacado,
  colorSobreDestacado,
  escalaTexto,
}: SectionTitleProps) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <View
        style={[
          styles.stepCircle,
          {
            backgroundColor:
              colorDestacado,
          },
        ]}
      >
        <Text
          style={[
            styles.stepText,
            {
              color:
                colorSobreDestacado,
            },
          ]}
        >
          {numero}
        </Text>
      </View>

      <View
        style={
          styles.sectionText
        }
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colorTexto,
              fontSize:
                16 *
                escalaTexto,
            },
          ]}
        >
          {titulo}
        </Text>

        <Text
          style={[
            styles.sectionSubtitle,
            {
              color:
                colorSecundario,
              fontSize:
                11 *
                escalaTexto,
            },
          ]}
        >
          {subtitulo}
        </Text>
      </View>
    </View>
  );
}

/* =====================================================
   ETIQUETA
===================================================== */

function FieldLabel({
  texto,
  requerido = false,
  color,
  escalaTexto,
}: {
  texto: string;
  requerido?: boolean;
  color: string;
  escalaTexto: number;
}) {
  return (
    <Text
      style={[
        styles.label,
        {
          color,
          fontSize:
            12 *
            escalaTexto,
        },
      ]}
    >
      {texto}

      {requerido ? (
        <Text
          style={{
            color: '#DC2626',
          }}
        >
          {' '}
          *
        </Text>
      ) : null}
    </Text>
  );
}

/* =====================================================
   INPUT COMPACTO
===================================================== */

type CompactInputProps = {
  label: string;
  value: string;
  onChangeText: (
    value: string
  ) => void;
  suffix: string;
  keyboardType:
    | 'decimal-pad'
    | 'number-pad';
  colorTexto: string;
  colorSecundario: string;
  colorFondo: string;
  colorBorde: string;
  escalaTexto: number;
};

function CompactInput({
  label,
  value,
  onChangeText,
  suffix,
  keyboardType,
  colorTexto,
  colorSecundario,
  colorFondo,
  colorBorde,
  escalaTexto,
}: CompactInputProps) {
  return (
    <View
      style={
        styles.compactGroup
      }
    >
      <Text
        style={[
          styles.compactLabel,
          {
            color:
              colorTexto,
            fontSize:
              11 *
              escalaTexto,
          },
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.compactInputBox,
          {
            backgroundColor:
              colorFondo,
            borderColor:
              colorBorde,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={
            onChangeText
          }
          keyboardType={
            keyboardType
          }
          style={[
            styles.compactInput,
            {
              color:
                colorTexto,
              fontSize:
                14 *
                escalaTexto,
            },
          ]}
          accessibilityLabel={
            label
          }
        />

        <Text
          style={[
            styles.compactSuffix,
            {
              color:
                colorSecundario,
              fontSize:
                9 *
                escalaTexto,
            },
          ]}
        >
          {suffix}
        </Text>
      </View>
    </View>
  );
}

/* =====================================================
   FILA SWITCH
===================================================== */

type SwitchRowProps = {
  icon: IoniconName;
  title: string;
  description: string;
  value: boolean;
  onChange: (
    value: boolean
  ) => void;
  colorTexto: string;
  colorSecundario: string;
  colorBorde: string;
  colorPrimario: string;
  fondoIcono: string;
  altoContraste: boolean;
  escalaTexto: number;
};

function SwitchRow({
  icon,
  title,
  description,
  value,
  onChange,
  colorTexto,
  colorSecundario,
  colorBorde,
  colorPrimario,
  fondoIcono,
  altoContraste,
  escalaTexto,
}: SwitchRowProps) {
  return (
    <View
      style={[
        styles.switchRow,
        {
          borderTopColor:
            colorBorde,
        },
      ]}
    >
      <View
        style={[
          styles.switchIcon,
          {
            backgroundColor:
              fondoIcono,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            colorPrimario
          }
        />
      </View>

      <View
        style={
          styles.switchText
        }
      >
        <Text
          style={[
            styles.switchTitle,
            {
              color:
                colorTexto,
              fontSize:
                12 *
                escalaTexto,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.switchDescription,
            {
              color:
                colorSecundario,
              fontSize:
                10 *
                escalaTexto,
            },
          ]}
        >
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={
          onChange
        }
        trackColor={{
          false:
            altoContraste
              ? '#FFFFFF'
              : '#CBD5E1',

          true:
            colorPrimario,
        }}
        thumbColor={
          altoContraste
            ? '#000000'
            : '#FFFFFF'
        }
        accessibilityRole="switch"
        accessibilityLabel={
          title
        }
        accessibilityState={{
          checked:
            value,
        }}
      />
    </View>
  );
}

/* =====================================================
   MODAL DE SELECCIÓN
===================================================== */

type SelectionModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  backgroundColor: string;
  textColor: string;
  secondaryTextColor: string;
  borderColor: string;
  children: ReactNode;
};

function SelectionModal({
  visible,
  title,
  onClose,
  backgroundColor,
  textColor,
  secondaryTextColor,
  borderColor,
  children,
}: SelectionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <Pressable
        style={
          styles.modalOverlay
        }
        onPress={
          onClose
        }
      >
        <Pressable
          style={[
            styles.modalCard,
            {
              backgroundColor,
              borderColor,
            },
          ]}
          onPress={(
            event
          ) =>
            event.stopPropagation()
          }
        >
          <View
            style={
              styles.modalHeader
            }
          >
            <View>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color:
                      textColor,
                  },
                ]}
              >
                {title}
              </Text>

              <Text
                style={[
                  styles.modalSubtitle,
                  {
                    color:
                      secondaryTextColor,
                  },
                ]}
              >
                Selecciona una opción
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.modalClose,
                {
                  borderColor,
                },
              ]}
              onPress={
                onClose
              }
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons
                name="close"
                size={22}
                color={
                  textColor
                }
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* =====================================================
   ESTILOS
===================================================== */

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },

    flex: {
      flex: 1,
    },

    header: {
      minHeight: 66,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    headerText: {
      flex: 1,
      marginHorizontal: 11,
    },

    headerTitle: {
      fontWeight: '900',
    },

    headerSubtitle: {
      marginTop: 2,
      fontWeight: '600',
    },

    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 40,
    },

    content: {
      alignSelf: 'center',
    },

    heroCard: {
      minHeight: 100,
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 22,
    },

    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 15,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 13,
    },

    heroText: {
      flex: 1,
    },

    heroTitle: {
      fontWeight: '900',
    },

    heroSubtitle: {
      marginTop: 5,
      lineHeight: 17,
      fontWeight: '600',
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 5,
      marginBottom: 10,
    },

    stepCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 10,
    },

    stepText: {
      fontWeight: '900',
    },

    sectionText: {
      flex: 1,
    },

    sectionTitle: {
      fontWeight: '900',
    },

    sectionSubtitle: {
      marginTop: 2,
      fontWeight: '600',
    },

    card: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      marginBottom: 21,
    },

    loadingRow: {
      minHeight: 80,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    loadingText: {
      marginTop: 8,
      fontWeight: '600',
    },

    label: {
      fontWeight: '800',
      marginBottom: 7,
      marginTop: 6,
    },

    selector: {
      minHeight: 58,
      borderWidth: 1,
      borderRadius: 13,
      paddingHorizontal: 11,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },

    selectorIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 10,
    },

    selectorTextBox: {
      flex: 1,
    },

    selectorTitle: {
      fontWeight: '800',
    },

    selectorSubtitle: {
      marginTop: 3,
      fontWeight: '600',
    },

    warningBox: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 11,
      flexDirection: 'row',
      alignItems:
        'flex-start',
      marginTop: 6,
    },

    warningText: {
      flex: 1,
      marginLeft: 8,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '700',
    },

    input: {
      minHeight: 50,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },

    textArea: {
      minHeight: 90,
      marginBottom: 9,
    },

    counter: {
      textAlign: 'right',
      marginTop: 4,
      marginBottom: 8,
      fontWeight: '600',
    },

    optionCard: {
      minHeight: 76,
      borderWidth: 1.5,
      borderRadius: 15,
      padding: 12,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },

    optionIcon: {
      width: 43,
      height: 43,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 11,
    },

    optionText: {
      flex: 1,
      paddingRight: 8,
    },

    optionTitle: {
      fontWeight: '900',
    },

    optionSubtitle: {
      marginTop: 3,
      lineHeight: 16,
      fontWeight: '600',
    },

    dateButton: {
      minHeight: 62,
      borderWidth: 1,
      borderRadius: 13,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },

    dateTitle: {
      fontWeight: '800',
    },

    dateHint: {
      marginTop: 3,
      fontWeight: '600',
    },

    calendarIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent:
        'center',
      marginLeft: 10,
    },

    pickerBox: {
      marginBottom: 12,
    },

    pickerDone: {
      alignSelf: 'flex-end',
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 10,
    },

    pickerDoneText: {
      fontWeight: '800',
    },

    inputRow: {
      flexDirection: 'row',
      marginHorizontal: -4,
      marginBottom: 10,
    },

    compactGroup: {
      flex: 1,
      marginHorizontal: 4,
    },

    compactLabel: {
      fontWeight: '700',
      marginBottom: 6,
    },

    compactInputBox: {
      minHeight: 61,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 9,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    compactInput: {
      width: '100%',
      textAlign: 'center',
      fontWeight: '800',
      paddingVertical: 1,
    },

    compactSuffix: {
      marginTop: 1,
    },

    switchRow: {
      minHeight: 70,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 10,
      marginTop: 7,
    },

    switchIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 10,
    },

    switchText: {
      flex: 1,
      paddingRight: 8,
    },

    switchTitle: {
      fontWeight: '800',
    },

    switchDescription: {
      marginTop: 3,
      lineHeight: 15,
    },

    summaryBox: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      alignItems:
        'flex-start',
      marginBottom: 20,
    },

    summaryText: {
      flex: 1,
      lineHeight: 18,
      marginLeft: 9,
    },

    bold: {
      fontWeight: '800',
    },

    actions: {
      flexDirection: 'row',
      marginHorizontal: -5,
    },

    cancelButton: {
      flex: 1,
      minHeight: 51,
      borderWidth: 1,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent:
        'center',
      marginHorizontal: 5,
    },

    cancelButtonText: {
      fontWeight: '700',
    },

    publishButton: {
      flex: 1.55,
      minHeight: 51,
      borderWidth: 1,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      marginHorizontal: 5,
    },

    disabledButton: {
      opacity: 0.55,
    },

    publishButtonText: {
      fontWeight: '800',
      marginLeft: 8,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(15,23,42,0.6)',
      alignItems: 'center',
      justifyContent:
        'center',
      padding: 20,
    },

    modalCard: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '76%',
      borderWidth: 1,
      borderRadius: 18,
      padding: 15,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 14,
    },

    modalTitle: {
      fontSize: 18,
      fontWeight: '900',
    },

    modalSubtitle: {
      marginTop: 3,
      fontSize: 11,
      fontWeight: '600',
    },

    modalClose: {
      width: 40,
      height: 40,
      borderWidth: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    modalOption: {
      minHeight: 61,
      borderWidth: 1,
      borderRadius: 13,
      padding: 11,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },

    modalOptionText: {
      flex: 1,
    },

    modalOptionTitle: {
      fontSize: 13,
      fontWeight: '800',
    },

    modalOptionSubtitle: {
      marginTop: 3,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '600',
    },
  });