import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { api } from '../services/api';

type TipoActividad =
  | 'Tarea'
  | 'Ejercicio'
  | 'Lectura'
  | 'Proyecto';

type Curso = {
  id_curso: number;
  id_ciclo?: number;
  nombre?: string;
  nombre_curso?: string;
  materia?: string;
  nombre_materia?: string;
  grupo?: string;
  nombre_grupo?: string;
};

type Periodo = {
  id_periodo: number;
  id_ciclo?: number;
  nombre?: string;
  nombre_periodo?: string;
  estado?: string;
};

type Recurso = {
  id_recurso: number;
  id_actividad?: number | null;
  id_curso?: number | null;
  titulo: string;
  tipo: string;
  estado: string;
};

type RespuestaCatalogos = {
  cursos?: Curso[];
  periodos?: Periodo[];
};

type RespuestaRecursos = {
  recursos?: Recurso[];
};

type RespuestaActividad = {
  mensaje?: string;
  id_actividad?: number;
  estado?: string;
  alumnos_asignados?: number;
};

type RespuestaError = {
  mensaje?: string;
  error?: string;
};

type OpcionSelector = {
  value: string;
  label: string;
};

type IoniconName =
  keyof typeof Ionicons.glyphMap;

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

const completarNumero = (
  numero: number
) =>
  String(numero).padStart(
    2,
    '0'
  );

const convertirFechaMySQL = (
  fecha: Date
) => {
  const parteFecha = [
    fecha.getFullYear(),
    completarNumero(
      fecha.getMonth() + 1
    ),
    completarNumero(
      fecha.getDate()
    ),
  ].join('-');

  const parteHora = [
    completarNumero(
      fecha.getHours()
    ),
    completarNumero(
      fecha.getMinutes()
    ),
    '00',
  ].join(':');

  return `${parteFecha} ${parteHora}`;
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

const obtenerMensajeError = (
  error: unknown
) => {
  if (
    axios.isAxiosError<RespuestaError>(
      error
    )
  ) {
    if (
      error.response?.data
        ?.mensaje
    ) {
      return error.response
        .data.mensaje;
    }

    if (
      error.response?.data?.error
    ) {
      return error.response
        .data.error;
    }

    if (!error.response) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté encendido y que el celular y la computadora estén en la misma red Wi-Fi.';
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Ocurrió un error inesperado.';
};

const obtenerNombreCurso = (
  curso: Curso
) => {
  const nombre =
    curso.nombre_curso ||
    curso.nombre ||
    `Curso ${curso.id_curso}`;

  const materia =
    curso.nombre_materia ||
    curso.materia;

  const grupo =
    curso.nombre_grupo ||
    curso.grupo;

  return [
    nombre,
    materia,
    grupo,
  ]
    .filter(Boolean)
    .join(' · ');
};

const obtenerNombrePeriodo = (
  periodo: Periodo
) =>
  periodo.nombre_periodo ||
  periodo.nombre ||
  `Periodo ${periodo.id_periodo}`;

const obtenerParametro = (
  valor?: string | string[]
) =>
  Array.isArray(valor)
    ? valor[0] ?? ''
    : valor ?? '';

const obtenerNombreRecurso = (
  recurso: Recurso
) =>
  `${recurso.titulo} · ${recurso.tipo}`;

export default function CrearActividadScreen() {
  const { width } =
    useWindowDimensions();

  const insets =
    useSafeAreaInsets();

  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  /*
   * Cuando el usuario selecciona blanco
   * como color de alto contraste,
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

  const parametros =
    useLocalSearchParams<{
      id_recurso?:
        | string
        | string[];
      id_curso?:
        | string
        | string[];
    }>();

  const idRecursoParametro =
    obtenerParametro(
      parametros.id_recurso
    );

  const idCursoParametro =
    obtenerParametro(
      parametros.id_curso
    );

  const [cursos, setCursos] =
    useState<Curso[]>([]);

  const [periodos, setPeriodos] =
    useState<Periodo[]>([]);

  const [recursos, setRecursos] =
    useState<Recurso[]>([]);

  const [idCurso, setIdCurso] =
    useState('');

  const [
    idPeriodo,
    setIdPeriodo,
  ] = useState('');

  const [
    idRecurso,
    setIdRecurso,
  ] = useState('');

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
    tipoActividad,
    setTipoActividad,
  ] =
    useState<TipoActividad>(
      'Tarea'
    );

  const [
    fechaLimite,
    setFechaLimite,
  ] =
    useState(
      crearFechaInicial
    );

  const [
    puntajeMaximo,
    setPuntajeMaximo,
  ] = useState('100');

  const [
    permiteEntregaArchivo,
    setPermiteEntregaArchivo,
  ] = useState(true);

  const [
    cargandoCatalogos,
    setCargandoCatalogos,
  ] = useState(true);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    selectorFechaVisible,
    setSelectorFechaVisible,
  ] = useState(false);

  const [
    selectorHoraVisible,
    setSelectorHoraVisible,
  ] = useState(false);

  const margenHorizontal =
    width < 360
      ? 14
      : width < 400
        ? 18
        : 22;

  const anchoContenido =
    Math.min(
      width -
        margenHorizontal * 2,
      520
    );

  const cursoSeleccionado =
    cursos.find(
      (curso) =>
        String(
          curso.id_curso
        ) === idCurso
    );

  const periodosDisponibles =
    useMemo(() => {
      if (
        !cursoSeleccionado
          ?.id_ciclo
      ) {
        return periodos;
      }

      return periodos.filter(
        (periodo) =>
          !periodo.id_ciclo ||
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

  const opcionesCursos =
    useMemo<
      OpcionSelector[]
    >(
      () =>
        cursos.map(
          (curso) => ({
            value:
              String(
                curso.id_curso
              ),

            label:
              obtenerNombreCurso(
                curso
              ),
          })
        ),
      [cursos]
    );

  const opcionesPeriodos =
    useMemo<
      OpcionSelector[]
    >(
      () =>
        periodosDisponibles.map(
          (periodo) => ({
            value:
              String(
                periodo.id_periodo
              ),

            label:
              obtenerNombrePeriodo(
                periodo
              ),
          })
        ),
      [
        periodosDisponibles,
      ]
    );

  const recursosDisponibles =
    useMemo(
      () =>
        recursos.filter(
          (recurso) =>
            !recurso.id_actividad &&
            recurso.estado ===
              'Activo' &&
            Boolean(idCurso) &&
            String(
              recurso.id_curso
            ) === idCurso
        ),
      [
        recursos,
        idCurso,
      ]
    );

  const opcionesRecursos =
    useMemo<
      OpcionSelector[]
    >(
      () =>
        recursosDisponibles.map(
          (recurso) => ({
            value:
              String(
                recurso.id_recurso
              ),

            label:
              obtenerNombreRecurso(
                recurso
              ),
          })
        ),
      [
        recursosDisponibles,
      ]
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
            'No se encontró la sesión del docente. Inicia sesión nuevamente.'
          );
        }

        const configuracion = {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        };

        const [
          respuesta,
          respuestaRecursos,
        ] =
          await Promise.all([
            api.get<RespuestaCatalogos>(
              '/academico/actividades/catalogos',
              configuracion
            ),

            api.get<RespuestaRecursos>(
              '/academico/recursos/mis-recursos-docente',
              configuracion
            ),
          ]);

        setCursos(
          respuesta.data
            .cursos ?? []
        );

        setPeriodos(
          respuesta.data
            .periodos ?? []
        );

        const listaRecursos =
          respuestaRecursos
            .data.recursos ?? [];

        setRecursos(
          listaRecursos
        );

        if (
          idCursoParametro
        ) {
          setIdCurso(
            idCursoParametro
          );
        }

        const recursoInicial =
          listaRecursos.find(
            (recurso) =>
              String(
                recurso.id_recurso
              ) ===
                idRecursoParametro &&
              !recurso.id_actividad &&
              recurso.estado ===
                'Activo' &&
              String(
                recurso.id_curso
              ) ===
                idCursoParametro
          );

        if (
          recursoInicial
        ) {
          setIdRecurso(
            String(
              recursoInicial.id_recurso
            )
          );
        }
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

  const cambiarCurso = (
    nuevoIdCurso: string
  ) => {
    setIdCurso(
      nuevoIdCurso
    );

    setIdPeriodo('');
    setIdRecurso('');
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
      (fechaAnterior) => {
        const nuevaFecha =
          new Date(
            fechaAnterior
          );

        nuevaFecha.setHours(
          fecha.getHours(),
          fecha.getMinutes(),
          0,
          0
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
          'Selecciona el curso al que pertenece la actividad.'
        );

        return false;
      }

      if (
        !titulo.trim()
      ) {
        Alert.alert(
          'Título requerido',
          'Escribe el título de la actividad.'
        );

        return false;
      }

      if (
        titulo.trim()
          .length > 150
      ) {
        Alert.alert(
          'Título demasiado largo',
          'El título no puede tener más de 150 caracteres.'
        );

        return false;
      }

      if (
        idRecurso &&
        !recursosDisponibles.some(
          (recurso) =>
            String(
              recurso.id_recurso
            ) ===
            idRecurso
        )
      ) {
        Alert.alert(
          'Recurso no disponible',
          'Selecciona un recurso disponible para el curso elegido.'
        );

        return false;
      }

      if (
        fechaLimite.getTime() <=
        Date.now()
      ) {
        Alert.alert(
          'Fecha límite incorrecta',
          'La fecha límite debe ser posterior a la fecha y hora actual.'
        );

        return false;
      }

      const puntaje =
        Number(
          puntajeMaximo
        );

      if (
        !Number.isFinite(
          puntaje
        ) ||
        puntaje < 0 ||
        puntaje > 999.99
      ) {
        Alert.alert(
          'Puntaje incorrecto',
          'El puntaje máximo debe estar entre 0 y 999.99.'
        );

        return false;
      }

      return true;
    };

  const guardarActividad =
    async () => {
      if (
        guardando ||
        !validarFormulario()
      ) {
        return;
      }

      try {
        setGuardando(
          true
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
          await api.post<RespuestaActividad>(
            '/academico/actividades',
            {
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

              id_recurso:
                idRecurso
                  ? Number(
                      idRecurso
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

              tipo:
                tipoActividad,

              fecha_limite:
                convertirFechaMySQL(
                  fechaLimite
                ),

              puntaje_maximo:
                Number(
                  puntajeMaximo
                ),

              permite_entrega_archivo:
                permiteEntregaArchivo,

              estado:
                'Publicada',
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const cantidadAsignada =
          respuesta.data
            .alumnos_asignados;

        const textoAsignacion =
          typeof cantidadAsignada ===
          'number'
            ? `\n\nEstudiantes asignados: ${cantidadAsignada}.`
            : '';

        const idActividadCreada =
          Number(
            respuesta.data
              .id_actividad
          );

        Alert.alert(
          'Actividad publicada',
          (respuesta.data
            .mensaje ||
            'La actividad se publicó correctamente.') +
            textoAsignacion,
          [
            {
              text:
                'Aceptar',

              onPress: () => {
                if (
                  Number.isInteger(
                    idActividadCreada
                  ) &&
                  idActividadCreada >
                    0
                ) {
                  router.replace({
                    pathname:
                      '/detalle-actividad',

                    params: {
                      id_actividad:
                        String(
                          idActividadCreada
                        ),
                    },
                  } as any);

                  return;
                }

                router.replace(
                  '/inicio-docente' as never
                );
              },
            },
          ]
        );
      } catch (error) {
        Alert.alert(
          'No se pudo crear la actividad',
          obtenerMensajeError(
            error
          )
        );
      } finally {
        setGuardando(
          false
        );
      }
    };

  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        {
          backgroundColor:
            colores.fondo,
        },
      ]}
      behavior={
        Platform.OS ===
        'ios'
          ? 'padding'
          : undefined
      }
    >
      <View
        style={[
          styles.screen,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
      >
        <ScrollView
          style={
            styles.scroll
          }
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop:
                insets.top + 8,

              paddingBottom:
                100 +
                Math.max(
                  insets.bottom,
                  8
                ),
            },
          ]}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View
            style={[
              styles.contentContainer,
              {
                width:
                  anchoContenido,
              },
            ]}
          >
            {/* HEADER */}
            <View
              style={
                styles.header
              }
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
                activeOpacity={
                  0.7
                }
                accessibilityRole="button"
                accessibilityLabel="Regresar"
              >
                <Ionicons
                  name="arrow-back"
                  size={23}
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
                  style={[
                    styles.title,
                    {
                      color:
                        colores.texto,

                      fontSize:
                        20 *
                        escalaTexto,
                    },
                  ]}
                  accessibilityRole="header"
                >
                  Crear Actividad
                </Text>

                <Text
                  style={[
                    styles.subtitle,
                    {
                      color:
                        colores.textoSecundario,

                      fontSize:
                        11 *
                        escalaTexto,
                    },
                  ]}
                >
                  Diseña actividades
                  para tus estudiantes
                </Text>
              </View>

              <BotonAccesibilidad />
            </View>

            {/* TIPO */}
            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    colores.texto,

                  fontSize:
                    12 *
                    escalaTexto,
                },
              ]}
            >
              Tipo de actividad
            </Text>

            <ActivityOption
              title="Tarea"
              description="Actividad para entregar"
              icon="clipboard"
              selected={
                tipoActividad ===
                'Tarea'
              }
              onPress={() =>
                setTipoActividad(
                  'Tarea'
                )
              }
            />

            <ActivityOption
              title="Ejercicio"
              description="Práctica para reforzar un tema"
              icon="create"
              selected={
                tipoActividad ===
                'Ejercicio'
              }
              onPress={() =>
                setTipoActividad(
                  'Ejercicio'
                )
              }
            />

            <ActivityOption
              title="Lectura"
              description="Lectura o material de consulta"
              icon="book"
              selected={
                tipoActividad ===
                'Lectura'
              }
              onPress={() =>
                setTipoActividad(
                  'Lectura'
                )
              }
            />

            <ActivityOption
              title="Proyecto"
              description="Trabajo individual o en equipo"
              icon="folder-open"
              selected={
                tipoActividad ===
                'Proyecto'
              }
              onPress={() =>
                setTipoActividad(
                  'Proyecto'
                )
              }
            />

            {/* INFORMACIÓN */}
            <Text
              style={[
                styles.sectionTitle,
                styles.informationTitle,
                {
                  color:
                    colores.texto,

                  fontSize:
                    12 *
                    escalaTexto,
                },
              ]}
            >
              Información de la
              actividad
            </Text>

            {cargandoCatalogos ? (
              <View
                style={[
                  styles.loadingBox,
                  {
                    backgroundColor:
                      colores.tarjeta,

                    borderColor:
                      colores.borde,
                  },
                ]}
              >
                <ActivityIndicator
                  color={
                    colores.primario
                  }
                  size="small"
                />

                <Text
                  style={[
                    styles.loadingText,
                    {
                      color:
                        colores.textoSecundario,

                      fontSize:
                        9 *
                        escalaTexto,
                    },
                  ]}
                >
                  Cargando cursos,
                  periodos y
                  recursos...
                </Text>
              </View>
            ) : (
              <>
                <Selector
                  label="Curso"
                  value={
                    idCurso
                  }
                  placeholder="Selecciona un curso"
                  options={
                    opcionesCursos
                  }
                  onChange={
                    cambiarCurso
                  }
                />

                <Selector
                  label="Periodo de evaluación (opcional)"
                  value={
                    idPeriodo
                  }
                  placeholder={
                    idCurso
                      ? 'Selecciona un periodo'
                      : 'Primero selecciona un curso'
                  }
                  options={
                    opcionesPeriodos
                  }
                  onChange={
                    setIdPeriodo
                  }
                  disabled={
                    !idCurso
                  }
                  allowEmpty
                  emptyLabel="Sin periodo"
                />

                <Selector
                  label="Recurso de apoyo (opcional)"
                  value={
                    idRecurso
                  }
                  placeholder={
                    !idCurso
                      ? 'Primero selecciona un curso'
                      : opcionesRecursos.length >
                          0
                        ? 'Selecciona un recurso disponible'
                        : 'No hay recursos disponibles para este curso'
                  }
                  options={
                    opcionesRecursos
                  }
                  onChange={
                    setIdRecurso
                  }
                  disabled={
                    !idCurso
                  }
                  allowEmpty
                  emptyLabel="Sin recurso"
                />
              </>
            )}

            <Text
              style={[
                styles.label,
                {
                  color:
                    colores.texto,

                  fontSize:
                    11 *
                    escalaTexto,
                },
              ]}
            >
              Título de la
              actividad
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    colores.tarjeta,

                  borderColor:
                    colores.borde,

                  color:
                    colores.texto,

                  fontSize:
                    12 *
                    escalaTexto,
                },
              ]}
              placeholder="Ej. Ejercicios de fracciones"
              placeholderTextColor={
                colores.textoSecundario
              }
              value={
                titulo
              }
              onChangeText={
                setTitulo
              }
              maxLength={
                150
              }
              returnKeyType="next"
              accessibilityLabel="Título de la actividad"
            />

            <Text
              style={[
                styles.label,
                {
                  color:
                    colores.texto,

                  fontSize:
                    11 *
                    escalaTexto,
                },
              ]}
            >
              Descripción
              (opcional)
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
                {
                  backgroundColor:
                    colores.tarjeta,

                  borderColor:
                    colores.borde,

                  color:
                    colores.texto,

                  fontSize:
                    12 *
                    escalaTexto,
                },
              ]}
              placeholder="Describe brevemente la actividad"
              placeholderTextColor={
                colores.textoSecundario
              }
              value={
                descripcion
              }
              onChangeText={
                setDescripcion
              }
              multiline
              textAlignVertical="top"
              accessibilityLabel="Descripción de la actividad"
            />

            <Text
              style={[
                styles.label,
                {
                  color:
                    colores.texto,

                  fontSize:
                    11 *
                    escalaTexto,
                },
              ]}
            >
              Instrucciones
              (opcional)
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.instructionsInput,
                {
                  backgroundColor:
                    colores.tarjeta,

                  borderColor:
                    colores.borde,

                  color:
                    colores.texto,

                  fontSize:
                    12 *
                    escalaTexto,
                },
              ]}
              placeholder="Escribe las instrucciones para los estudiantes"
              placeholderTextColor={
                colores.textoSecundario
              }
              value={
                instrucciones
              }
              onChangeText={
                setInstrucciones
              }
              multiline
              textAlignVertical="top"
              accessibilityLabel="Instrucciones de la actividad"
            />

            {/* FECHA */}
            <Text
              style={[
                styles.label,
                {
                  color:
                    colores.texto,

                  fontSize:
                    11 *
                    escalaTexto,
                },
              ]}
            >
              Fecha y hora
              límite
            </Text>

            <TouchableOpacity
              style={[
                styles.dateButton,
                {
                  backgroundColor:
                    colores.tarjeta,

                  borderColor:
                    colores.borde,
                },
              ]}
              onPress={() =>
                setSelectorFechaVisible(
                  true
                )
              }
              activeOpacity={
                0.8
              }
              accessibilityRole="button"
              accessibilityLabel="Seleccionar fecha y hora límite"
            >
              <Text
                style={[
                  styles.dateText,
                  {
                    color:
                      colores.texto,

                    fontSize:
                      12 *
                      escalaTexto,
                  },
                ]}
              >
                {mostrarFecha(
                  fechaLimite
                )}
              </Text>

              <Ionicons
                name="calendar-outline"
                size={20}
                color={
                  colores.primario
                }
              />
            </TouchableOpacity>

            {selectorFechaVisible && (
              <View
                style={[
                  styles.pickerContainer,
                  {
                    backgroundColor:
                      colores.tarjeta,

                    borderColor:
                      colores.borde,
                  },
                ]}
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
                      styles.pickerDoneButton,
                      {
                        backgroundColor:
                          colores.primario,
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

            {/* PUNTAJE */}
            <Text
              style={[
                styles.label,
                {
                  color:
                    colores.texto,

                  fontSize:
                    11 *
                    escalaTexto,
                },
              ]}
            >
              Puntaje máximo
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    colores.tarjeta,

                  borderColor:
                    colores.borde,

                  color:
                    colores.texto,

                  fontSize:
                    12 *
                    escalaTexto,
                },
              ]}
              placeholder="100"
              placeholderTextColor={
                colores.textoSecundario
              }
              value={
                puntajeMaximo
              }
              onChangeText={
                setPuntajeMaximo
              }
              keyboardType="decimal-pad"
              accessibilityLabel="Puntaje máximo"
            />

            {/* SWITCH */}
            <View
              style={[
                styles.switchCard,
                {
                  backgroundColor:
                    colores.tarjeta,

                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <View
                style={
                  styles.switchTextContainer
                }
              >
                <Text
                  style={[
                    styles.switchTitle,
                    {
                      color:
                        colores.texto,

                      fontSize:
                        11 *
                        escalaTexto,
                    },
                  ]}
                >
                  Permitir entrega
                  de archivo
                </Text>

                <Text
                  style={[
                    styles.switchDescription,
                    {
                      color:
                        colores.textoSecundario,

                      fontSize:
                        9 *
                        escalaTexto,
                    },
                  ]}
                >
                  El estudiante podrá
                  adjuntar un archivo
                </Text>
              </View>

              <Switch
                value={
                  permiteEntregaArchivo
                }
                onValueChange={
                  setPermiteEntregaArchivo
                }
                trackColor={{
                  false:
                    preferencias.altoContraste
                      ? '#FFFFFF'
                      : '#CBD2DC',

                  true:
                    colores.primario,
                }}
                thumbColor={
                  preferencias.altoContraste
                    ? '#000000'
                    : '#FFFFFF'
                }
                accessibilityLabel="Permitir entrega de archivo"
                accessibilityRole="switch"
                accessibilityState={{
                  checked:
                    permiteEntregaArchivo,
                }}
              />
            </View>

            {/* INFORMACIÓN */}
            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor:
                    colores.fondoPrimario,

                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={19}
                color={
                  colores.primario
                }
              />

              <Text
                style={[
                  styles.infoText,
                  {
                    color:
                      colores.textoSecundario,

                    fontSize:
                      9 *
                      escalaTexto,
                  },
                ]}
              >
                El docente se obtiene
                de la sesión y la
                fecha de publicación
                se registra
                automáticamente. Si
                eliges un recurso,
                quedará asociado a
                esta actividad.
              </Text>
            </View>

            {/* ACCIONES */}
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
                      colores.tarjeta,

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
                activeOpacity={
                  0.8
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
                        11 *
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

                  guardando &&
                    styles.disabledButton,
                ]}
                onPress={
                  guardarActividad
                }
                disabled={
                  guardando
                }
                activeOpacity={
                  0.8
                }
                accessibilityRole="button"
                accessibilityLabel="Publicar actividad"
                accessibilityState={{
                  disabled:
                    guardando,

                  busy:
                    guardando,
                }}
              >
                {guardando ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      colorSobrePrimario
                    }
                  />
                ) : (
                  <>
                    <Ionicons
                      name="send-outline"
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
                            11 *
                            escalaTexto,
                        },
                      ]}
                    >
                      Publicar
                      actividad
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* NAVEGACIÓN INFERIOR */}
        <View
          style={[
            styles.bottomNavigation,
            {
              height:
                66 +
                Math.max(
                  insets.bottom,
                  5
                ),

              paddingBottom:
                Math.max(
                  insets.bottom,
                  5
                ),

              backgroundColor:
                colores.tarjeta,

              borderTopColor:
                colores.borde,
            },
          ]}
        >
          <View
            style={[
              styles.bottomContent,
              {
                width:
                  anchoContenido,
              },
            ]}
          >
            <BottomItem
              icon="home-outline"
              activeIcon="home"
              label="Inicio"
              onPress={() =>
                router.replace(
                  '/inicio-docente' as never
                )
              }
            />

            <BottomItem
              icon="book-outline"
              activeIcon="book"
              label="Recursos"
              onPress={() =>
                router.push(
                  '/crear-recurso' as never
                )
              }
            />

            <BottomItem
              icon="reader-outline"
              activeIcon="reader"
              label="Actividades"
              active
              onPress={() => {
                // Ya estamos aquí.
              }}
            />

            <BottomItem
              icon="document-text-outline"
              activeIcon="document-text"
              label="Evaluaciones"
              onPress={() =>
                router.push(
                  '/crear-evaluacion' as never
                )
              }
            />

            <BottomItem
              icon="menu-outline"
              activeIcon="menu"
              label="Más"
              onPress={() =>
                router.push(
                  '/menu-docente' as never
                )
              }
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* =====================================================
   TIPO DE ACTIVIDAD
===================================================== */

type ActivityOptionProps = {
  title: string;
  description: string;
  icon: IoniconName;
  selected: boolean;
  onPress: () => void;
};

function ActivityOption({
  title,
  description,
  icon,
  selected,
  onPress,
}: ActivityOptionProps) {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  return (
    <TouchableOpacity
      style={[
        styles.activityCard,
        {
          backgroundColor:
            selected
              ? colores.fondoPrimario
              : colores.tarjeta,

          borderColor:
            selected
              ? colores.primario
              : colores.borde,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{
        checked: selected,
        selected,
      }}
      accessibilityLabel={`${title}. ${description}`}
    >
      <View
        style={[
          styles.activityIconBox,
          {
            backgroundColor:
              colores.fondoPrimario,

            borderColor:
              selected
                ? colores.primario
                : colores.borde,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={
            colores.primario
          }
        />
      </View>

      <View
        style={
          styles.activityTextContainer
        }
      >
        <Text
          style={[
            styles.activityTitle,
            {
              color:
                colores.texto,

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
            styles.activityDescription,
            {
              color:
                colores.textoSecundario,

              fontSize:
                9 *
                escalaTexto,
            },
          ]}
        >
          {description}
        </Text>
      </View>

      <Ionicons
        name={
          selected
            ? 'checkmark-circle'
            : 'ellipse-outline'
        }
        size={21}
        color={
          selected
            ? colores.primario
            : colores.textoSecundario
        }
      />
    </TouchableOpacity>
  );
}

/* =====================================================
   SELECTOR
===================================================== */

type SelectorProps = {
  label: string;
  value: string;
  placeholder: string;
  options: OpcionSelector[];
  onChange: (
    value: string
  ) => void;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

function Selector({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
  allowEmpty = false,
  emptyLabel = 'Ninguno',
}: SelectorProps) {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  const [visible, setVisible] =
    useState(false);

  const selectedOption =
    options.find(
      (option) =>
        option.value === value
    );

  const seleccionar = (
    nuevoValor: string
  ) => {
    onChange(
      nuevoValor
    );

    setVisible(
      false
    );
  };

  return (
    <View
      style={
        styles.selectorGroup
      }
    >
      <Text
        style={[
          styles.label,
          {
            color:
              colores.texto,

            fontSize:
              11 *
              escalaTexto,
          },
        ]}
      >
        {label}
      </Text>

      <TouchableOpacity
        style={[
          styles.selector,
          {
            backgroundColor:
              colores.tarjeta,

            borderColor:
              colores.borde,
          },

          disabled &&
            styles.selectorDisabled,
        ]}
        onPress={() =>
          setVisible(
            true
          )
        }
        disabled={
          disabled
        }
        activeOpacity={
          0.8
        }
        accessibilityRole="button"
        accessibilityLabel={
          label
        }
        accessibilityState={{
          disabled,
        }}
      >
        <Text
          style={[
            styles.selectorText,
            {
              color:
                selectedOption
                  ? colores.texto
                  : colores.textoSecundario,

              fontSize:
                12 *
                escalaTexto,
            },
          ]}
          numberOfLines={
            1
          }
        >
          {selectedOption
            ?.label ||
            placeholder}
        </Text>

        <Ionicons
          name="chevron-down"
          size={18}
          color={
            colores.primario
          }
        />
      </TouchableOpacity>

      <Modal
        visible={
          visible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <Pressable
            style={
              StyleSheet.absoluteFill
            }
            onPress={() =>
              setVisible(
                false
              )
            }
          />

          <View
            style={[
              styles.modalContent,
              {
                backgroundColor:
                  colores.tarjeta,

                borderColor:
                  colores.borde,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                {
                  color:
                    colores.texto,

                  fontSize:
                    16 *
                    escalaTexto,
                },
              ]}
            >
              {label}
            </Text>

            <ScrollView
              style={
                styles.modalList
              }
            >
              {allowEmpty && (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    {
                      borderBottomColor:
                        colores.borde,

                      backgroundColor:
                        value === ''
                          ? colores.fondoPrimario
                          : colores.tarjeta,
                    },
                  ]}
                  onPress={() =>
                    seleccionar('')
                  }
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked:
                      value === '',
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      {
                        color:
                          value === ''
                            ? colores.primario
                            : colores.texto,

                        fontWeight:
                          value === ''
                            ? '800'
                            : '600',

                        fontSize:
                          12 *
                          escalaTexto,
                      },
                    ]}
                  >
                    {emptyLabel}
                  </Text>

                  {value ===
                    '' && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={
                        colores.primario
                      }
                    />
                  )}
                </TouchableOpacity>
              )}

              {options.map(
                (option) => {
                  const selected =
                    value ===
                    option.value;

                  return (
                    <TouchableOpacity
                      key={
                        option.value
                      }
                      style={[
                        styles.modalOption,
                        {
                          borderBottomColor:
                            colores.borde,

                          backgroundColor:
                            selected
                              ? colores.fondoPrimario
                              : colores.tarjeta,
                        },
                      ]}
                      onPress={() =>
                        seleccionar(
                          option.value
                        )
                      }
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked:
                          selected,
                      }}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          {
                            color:
                              selected
                                ? colores.primario
                                : colores.texto,

                            fontWeight:
                              selected
                                ? '800'
                                : '600',

                            fontSize:
                              12 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {
                          option.label
                        }
                      </Text>

                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={
                            colores.primario
                          }
                        />
                      )}
                    </TouchableOpacity>
                  );
                }
              )}

              {options.length ===
                0 &&
                !allowEmpty && (
                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color:
                          colores.textoSecundario,

                        fontSize:
                          11 *
                          escalaTexto,
                      },
                    ]}
                  >
                    No hay opciones
                    disponibles.
                  </Text>
                )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.modalCloseButton,
                {
                  backgroundColor:
                    colores.fondoPrimario,

                  borderColor:
                    colores.borde,
                },
              ]}
              onPress={() =>
                setVisible(
                  false
                )
              }
            >
              <Text
                style={[
                  styles.modalCloseText,
                  {
                    color:
                      colores.texto,

                    fontSize:
                      11 *
                      escalaTexto,
                  },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =====================================================
   NAVEGACIÓN INFERIOR
===================================================== */

type BottomItemProps = {
  icon: IoniconName;
  activeIcon: IoniconName;
  label: string;
  active?: boolean;
  onPress: () => void;
};

function BottomItem({
  icon,
  activeIcon,
  label,
  active = false,
  onPress,
}: BottomItemProps) {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  return (
    <TouchableOpacity
      style={
        styles.bottomItem
      }
      onPress={
        onPress
      }
      activeOpacity={
        0.7
      }
      accessibilityRole="tab"
      accessibilityState={{
        selected:
          active,
      }}
      accessibilityLabel={
        label
      }
    >
      <View
        style={[
          styles.bottomIconContainer,
          active && {
            backgroundColor:
              colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={
            active
              ? activeIcon
              : icon
          }
          size={21}
          color={
            active
              ? colores.primario
              : colores.textoSecundario
          }
        />
      </View>

      <Text
        style={[
          styles.bottomLabel,
          {
            color:
              active
                ? colores.primario
                : colores.textoSecundario,

            fontSize:
              8 *
              escalaTexto,

            fontWeight:
              active
                ? '900'
                : '700',
          },
        ]}
        numberOfLines={
          1
        }
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      alignItems:
        'center',
    },

    contentContainer: {
      alignSelf:
        'center',
    },

    header: {
      minHeight: 58,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom:
        18,
    },

    headerButton: {
      width: 44,
      height: 44,
      borderWidth: 1,
      borderRadius: 14,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    headerText: {
      flex: 1,
      paddingHorizontal:
        8,
    },

    title: {
      fontWeight:
        '800',
    },

    subtitle: {
      marginTop: 5,
      lineHeight: 16,
      fontWeight:
        '600',
    },

    sectionTitle: {
      fontWeight:
        '800',
      marginBottom: 9,
    },

    activityCard: {
      width: '100%',
      minHeight: 62,
      borderWidth: 1,
      borderRadius: 10,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal:
        13,
      paddingVertical:
        10,
      marginBottom:
        10,
    },

    activityIconBox: {
      width: 36,
      height: 36,
      borderWidth: 1,
      borderRadius: 7,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    activityTextContainer: {
      flex: 1,
      marginLeft: 12,
    },

    activityTitle: {
      fontWeight:
        '800',
    },

    activityDescription: {
      marginTop: 3,
      lineHeight: 13,
    },

    informationTitle: {
      marginTop: 13,
    },

    label: {
      fontWeight:
        '800',
      marginBottom: 7,
    },

    input: {
      width: '100%',
      minHeight: 48,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal:
        13,
      marginBottom: 13,
    },

    descriptionInput: {
      minHeight: 82,
      paddingTop: 12,
    },

    instructionsInput: {
      minHeight: 105,
      paddingTop: 12,
    },

    selectorGroup: {
      width: '100%',
    },

    selector: {
      width: '100%',
      minHeight: 48,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal:
        13,
      marginBottom: 13,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    selectorDisabled: {
      opacity: 0.55,
    },

    selectorText: {
      flex: 1,
      paddingRight: 8,
    },

    dateButton: {
      width: '100%',
      minHeight: 48,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal:
        13,
      marginBottom: 13,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    dateText: {
      flex: 1,
      paddingRight: 8,
    },

    pickerContainer: {
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 13,
      overflow: 'hidden',
    },

    pickerDoneButton: {
      height: 38,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    pickerDoneText: {
      fontSize: 11,
      fontWeight:
        '800',
    },

    switchCard: {
      width: '100%',
      minHeight: 64,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal:
        13,
      paddingVertical:
        10,
      marginBottom: 13,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    switchTextContainer: {
      flex: 1,
      paddingRight: 10,
    },

    switchTitle: {
      fontWeight:
        '800',
    },

    switchDescription: {
      marginTop: 3,
      lineHeight: 13,
    },

    infoBox: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal:
        12,
      paddingVertical:
        11,
      marginTop: 3,
      flexDirection:
        'row',
      alignItems:
        'flex-start',
    },

    infoText: {
      flex: 1,
      marginLeft: 8,
      lineHeight: 14,
      fontWeight:
        '600',
    },

    loadingBox: {
      width: '100%',
      minHeight: 72,
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 13,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    loadingText: {
      marginTop: 8,
    },

    actions: {
      width: '100%',
      flexDirection:
        'row',
      alignItems:
        'center',
      columnGap: 12,
      marginTop: 14,
    },

    cancelButton: {
      flex: 1,
      minHeight: 44,
      borderWidth: 1,
      borderRadius: 7,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    cancelButtonText: {
      fontWeight:
        '600',
    },

    publishButton: {
      flex: 1.7,
      minHeight: 44,
      borderWidth: 1,
      borderRadius: 7,
      justifyContent:
        'center',
      alignItems:
        'center',
      flexDirection:
        'row',
      columnGap: 7,
    },

    disabledButton: {
      opacity: 0.6,
    },

    publishButtonText: {
      fontWeight:
        '700',
    },

    modalOverlay: {
      flex: 1,
      justifyContent:
        'center',
      paddingHorizontal:
        22,
      backgroundColor:
        'rgba(0,0,0,0.65)',
    },

    modalContent: {
      maxHeight: '70%',
      borderWidth: 1,
      borderRadius: 14,
      padding: 17,
    },

    modalTitle: {
      marginBottom:
        12,
      fontWeight:
        '800',
    },

    modalList: {
      maxHeight: 340,
    },

    modalOption: {
      minHeight: 48,
      borderBottomWidth:
        1,
      paddingHorizontal:
        8,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    modalOptionText: {
      flex: 1,
      paddingRight: 8,
    },

    emptyText: {
      paddingVertical:
        24,
      textAlign:
        'center',
    },

    modalCloseButton: {
      height: 42,
      borderWidth: 1,
      borderRadius: 7,
      marginTop: 12,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    modalCloseText: {
      fontWeight:
        '700',
    },

    bottomNavigation: {
      position:
        'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      alignItems:
        'center',

      ...Platform.select({
        ios: {
          shadowColor:
            '#111827',

          shadowOffset: {
            width: 0,
            height: -4,
          },

          shadowOpacity:
            0.07,

          shadowRadius:
            10,
        },

        android: {
          elevation: 10,
        },
      }),
    },

    bottomContent: {
      flex: 1,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    bottomItem: {
      flex: 1,
      minWidth: 54,
      height: 58,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    bottomIconContainer: {
      width: 36,
      height: 29,
      borderRadius: 10,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    bottomLabel: {
      marginTop: 2,
    },
  });