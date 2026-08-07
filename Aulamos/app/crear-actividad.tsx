import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router } from 'expo-router';
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
import { api } from '../services/api';

type TipoActividad =
  | 'Tarea'
  | 'Ejercicio'
  | 'Lectura'
  | 'Proyecto'
  | 'Evaluacion';

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

type RespuestaCatalogos = {
  cursos?: Curso[];
  periodos?: Periodo[];
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

  fecha.setDate(fecha.getDate() + 1);
  fecha.setHours(23, 59, 0, 0);

  return fecha;
};

const completarNumero = (
  numero: number,
) => String(numero).padStart(2, '0');

const convertirFechaMySQL = (
  fecha: Date,
) => {
  const parteFecha = [
    fecha.getFullYear(),
    completarNumero(
      fecha.getMonth() + 1,
    ),
    completarNumero(fecha.getDate()),
  ].join('-');

  const parteHora = [
    completarNumero(fecha.getHours()),
    completarNumero(
      fecha.getMinutes(),
    ),
    '00',
  ].join(':');

  return `${parteFecha} ${parteHora}`;
};

const mostrarFecha = (fecha: Date) =>
  fecha.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const obtenerMensajeError = (
  error: unknown,
) => {
  if (
    axios.isAxiosError<RespuestaError>(
      error,
    )
  ) {
    if (
      error.response?.data?.mensaje
    ) {
      return error.response.data.mensaje;
    }

    if (error.response?.data?.error) {
      return error.response.data.error;
    }

    if (!error.response) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté encendido y que el celular y la computadora estén en la misma red Wi-Fi.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado.';
};

const obtenerNombreCurso = (
  curso: Curso,
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
  periodo: Periodo,
) =>
  periodo.nombre_periodo ||
  periodo.nombre ||
  `Periodo ${periodo.id_periodo}`;

export default function CrearActividadScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

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

  const [descripcion, setDescripcion] =
    useState('');

  const [
    instrucciones,
    setInstrucciones,
  ] = useState('');

  const [
    tipoActividad,
    setTipoActividad,
  ] = useState<TipoActividad>('Tarea');

  const [
    fechaLimite,
    setFechaLimite,
  ] = useState(crearFechaInicial);

  const [
    puntajeMaximo,
    setPuntajeMaximo,
  ] = useState('100');

  const [
    permiteEntregaArchivo,
    setPermiteEntregaArchivo,
  ] = useState(true);

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
    cargandoCatalogos,
    setCargandoCatalogos,
  ] = useState(true);

  const [guardando, setGuardando] =
    useState(false);

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

  const anchoContenido = Math.min(
    width - margenHorizontal * 2,
    520,
  );

  const cursoSeleccionado =
    cursos.find(
      (curso) =>
        String(curso.id_curso) ===
        idCurso,
    );

  const periodosDisponibles =
    useMemo(() => {
      if (
        !cursoSeleccionado?.id_ciclo
      ) {
        return periodos;
      }

      return periodos.filter(
        (periodo) =>
          !periodo.id_ciclo ||
          Number(periodo.id_ciclo) ===
            Number(
              cursoSeleccionado.id_ciclo,
            ),
      );
    }, [
      cursoSeleccionado,
      periodos,
    ]);

  const opcionesCursos =
    useMemo<OpcionSelector[]>(
      () =>
        cursos.map((curso) => ({
          value: String(
            curso.id_curso,
          ),
          label:
            obtenerNombreCurso(curso),
        })),
      [cursos],
    );

  const opcionesPeriodos =
    useMemo<OpcionSelector[]>(
      () =>
        periodosDisponibles.map(
          (periodo) => ({
            value: String(
              periodo.id_periodo,
            ),
            label:
              obtenerNombrePeriodo(
                periodo,
              ),
          }),
        ),
      [periodosDisponibles],
    );

  const cargarCatalogos =
    async () => {
      try {
        setCargandoCatalogos(true);

        const token =
          await AsyncStorage.getItem(
            'token',
          );

        if (!token) {
          throw new Error(
            'No se encontró la sesión del docente. Inicia sesión nuevamente.',
          );
        }

        const respuesta =
          await api.get<RespuestaCatalogos>(
            '/academico/actividades/catalogos',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        setCursos(
          respuesta.data.cursos ?? [],
        );

        setPeriodos(
          respuesta.data.periodos ??
            [],
        );
      } catch (error) {
        Alert.alert(
          'No se pudieron cargar los datos',
          obtenerMensajeError(error),
        );
      } finally {
        setCargandoCatalogos(false);
      }
    };

  useEffect(() => {
    void cargarCatalogos();
  }, []);

  const cambiarCurso = (
    nuevoIdCurso: string,
  ) => {
    setIdCurso(nuevoIdCurso);
    setIdPeriodo('');
  };

  const alSeleccionarFecha = (
    evento: DateTimePickerEvent,
    fecha?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setSelectorFechaVisible(false);
    }

    if (
      evento.type === 'dismissed' ||
      !fecha
    ) {
      return;
    }

    const nuevaFecha = new Date(
      fechaLimite,
    );

    nuevaFecha.setFullYear(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate(),
    );

    setFechaLimite(nuevaFecha);

    if (Platform.OS === 'android') {
      setSelectorHoraVisible(true);
    }
  };

  const alSeleccionarHora = (
    evento: DateTimePickerEvent,
    fecha?: Date,
  ) => {
    setSelectorHoraVisible(false);

    if (
      evento.type === 'dismissed' ||
      !fecha
    ) {
      return;
    }

    setFechaLimite(
      (fechaAnterior) => {
        const nuevaFecha = new Date(
          fechaAnterior,
        );

        nuevaFecha.setHours(
          fecha.getHours(),
          fecha.getMinutes(),
          0,
          0,
        );

        return nuevaFecha;
      },
    );
  };

  const validarFormulario = () => {
    if (!idCurso) {
      Alert.alert(
        'Curso requerido',
        'Selecciona el curso al que pertenece la actividad.',
      );

      return false;
    }

    if (!titulo.trim()) {
      Alert.alert(
        'Título requerido',
        'Escribe el título de la actividad.',
      );

      return false;
    }

    if (titulo.trim().length > 150) {
      Alert.alert(
        'Título demasiado largo',
        'El título no puede tener más de 150 caracteres.',
      );

      return false;
    }

    if (
      fechaLimite.getTime() <=
      Date.now()
    ) {
      Alert.alert(
        'Fecha límite incorrecta',
        'La fecha límite debe ser posterior a la fecha y hora actual.',
      );

      return false;
    }

    const puntaje = Number(
      puntajeMaximo,
    );

    if (
      !Number.isFinite(puntaje) ||
      puntaje < 0 ||
      puntaje > 999.99
    ) {
      Alert.alert(
        'Puntaje incorrecto',
        'El puntaje máximo debe estar entre 0 y 999.99.',
      );

      return false;
    }

    if (
      tipoActividad ===
      'Evaluacion'
    ) {
      const duracion = Number(
        duracionMinutos,
      );

      const intentos = Number(
        intentosPermitidos,
      );

      if (
        !Number.isInteger(duracion) ||
        duracion <= 0
      ) {
        Alert.alert(
          'Duración incorrecta',
          'Escribe una duración válida en minutos.',
        );

        return false;
      }

      if (
        !Number.isInteger(intentos) ||
        intentos <= 0
      ) {
        Alert.alert(
          'Intentos incorrectos',
          'Escribe una cantidad válida de intentos.',
        );

        return false;
      }
    }

    return true;
  };

  const guardarActividad = async () => {
    if (
      guardando ||
      !validarFormulario()
    ) {
      return;
    }

    try {
      setGuardando(true);

      const token =
        await AsyncStorage.getItem(
          'token',
        );

      if (!token) {
        throw new Error(
          'Tu sesión terminó. Inicia sesión nuevamente.',
        );
      }

      const configuracionEvaluacion =
        tipoActividad ===
        'Evaluacion'
          ? {
              duracion_minutos:
                Number(
                  duracionMinutos,
                ),
              intentos_permitidos:
                Number(
                  intentosPermitidos,
                ),
              mostrar_resultado:
                mostrarResultado,
            }
          : null;

      const respuesta =
        await api.post<RespuestaActividad>(
          '/academico/actividades',
          {
            id_curso:
              Number(idCurso),

            id_periodo: idPeriodo
              ? Number(idPeriodo)
              : null,

            titulo: titulo.trim(),

            descripcion:
              descripcion.trim() ||
              null,

            instrucciones:
              instrucciones.trim() ||
              null,

            tipo: tipoActividad,

            configuracion_evaluacion:
              configuracionEvaluacion,

            fecha_limite:
              convertirFechaMySQL(
                fechaLimite,
              ),

            puntaje_maximo:
              Number(puntajeMaximo),

            permite_entrega_archivo:
              permiteEntregaArchivo,

            estado: 'Publicada',
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
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
          respuesta.data.id_actividad,
        );

      Alert.alert(
        'Actividad publicada',
        (respuesta.data.mensaje ||
          'La actividad se publicó correctamente.') +
          textoAsignacion,
        [
          {
            text: 'Aceptar',
            onPress: () => {
              if (
                Number.isInteger(
                  idActividadCreada,
                ) &&
                idActividadCreada > 0
              ) {
                router.replace({
                  pathname:
                    '/detalle-actividad',
                  params: {
                    id_actividad:
                      String(
                        idActividadCreada,
                      ),
                  },
                } as any);
                return;
              }

              router.replace(
                '/inicio-docente' as never,
              );
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'No se pudo crear la actividad',
        obtenerMensajeError(error),
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop:
                insets.top + 8,
              paddingBottom:
                100 +
                Math.max(
                  insets.bottom,
                  8,
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
                width: anchoContenido,
              },
            ]}
          >
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() =>
                  router.back()
                }
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Regresar"
              >
                <Ionicons
                  name="arrow-back"
                  size={23}
                  color="#273449"
                />
              </TouchableOpacity>

              <View style={styles.headerText}>
                <Text style={styles.title}>
                  Crear Actividad
                </Text>

                <Text
                  style={styles.subtitle}
                >
                  Diseña actividades para
                  tus estudiantes
                </Text>
              </View>

              <BotonAccesibilidad />
            </View>

            <Text
              style={styles.sectionTitle}
            >
              Tipo de actividad
            </Text>

            <ActivityOption
              title="Tarea"
              description="Actividad para entregar"
              icon="clipboard"
              iconBackground="#EAF1FF"
              iconColor="#4A7CFF"
              selected={
                tipoActividad ===
                'Tarea'
              }
              onPress={() =>
                setTipoActividad(
                  'Tarea',
                )
              }
            />

            <ActivityOption
              title="Ejercicio"
              description="Práctica para reforzar un tema"
              icon="create"
              iconBackground="#DDF8F4"
              iconColor="#34C8BA"
              selected={
                tipoActividad ===
                'Ejercicio'
              }
              onPress={() =>
                setTipoActividad(
                  'Ejercicio',
                )
              }
            />

            <ActivityOption
              title="Lectura"
              description="Lectura o material de consulta"
              icon="book"
              iconBackground="#FFF3D7"
              iconColor="#F2A900"
              selected={
                tipoActividad ===
                'Lectura'
              }
              onPress={() =>
                setTipoActividad(
                  'Lectura',
                )
              }
            />

            <ActivityOption
              title="Proyecto"
              description="Trabajo individual o en equipo"
              icon="folder-open"
              iconBackground="#ECE8FF"
              iconColor="#7059F5"
              selected={
                tipoActividad ===
                'Proyecto'
              }
              onPress={() =>
                setTipoActividad(
                  'Proyecto',
                )
              }
            />

            <ActivityOption
              title="Evaluación"
              description="Actividad con configuración de evaluación"
              icon="document-text"
              iconBackground="#FFE5E8"
              iconColor="#FF5263"
              selected={
                tipoActividad ===
                'Evaluacion'
              }
              onPress={() =>
                setTipoActividad(
                  'Evaluacion',
                )
              }
            />

            <Text
              style={[
                styles.sectionTitle,
                styles.informationTitle,
              ]}
            >
              Información de la actividad
            </Text>

            {cargandoCatalogos ? (
              <View
                style={styles.loadingBox}
              >
                <ActivityIndicator
                  color="#4A7CFF"
                  size="small"
                />

                <Text
                  style={styles.loadingText}
                >
                  Cargando cursos y
                  periodos...
                </Text>
              </View>
            ) : (
              <>
                <Selector
                  label="Curso"
                  value={idCurso}
                  placeholder="Selecciona un curso"
                  options={opcionesCursos}
                  onChange={cambiarCurso}
                />

                <Selector
                  label="Periodo de evaluación (opcional)"
                  value={idPeriodo}
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
                  disabled={!idCurso}
                  allowEmpty
                  emptyLabel="Sin periodo"
                />
              </>
            )}

            <Text style={styles.label}>
              Título de la actividad
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ej. Ejercicios de fracciones"
              placeholderTextColor="#9CA3AF"
              value={titulo}
              onChangeText={setTitulo}
              maxLength={150}
              returnKeyType="next"
              accessibilityLabel="Título de la actividad"
            />

            <Text style={styles.label}>
              Descripción (opcional)
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
              ]}
              placeholder="Describe brevemente la actividad"
              placeholderTextColor="#9CA3AF"
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Descripción de la actividad"
            />

            <Text style={styles.label}>
              Instrucciones (opcional)
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.instructionsInput,
              ]}
              placeholder="Escribe las instrucciones para los estudiantes"
              placeholderTextColor="#9CA3AF"
              value={instrucciones}
              onChangeText={
                setInstrucciones
              }
              multiline
              textAlignVertical="top"
              accessibilityLabel="Instrucciones de la actividad"
            />

            <Text style={styles.label}>
              Fecha y hora límite
            </Text>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() =>
                setSelectorFechaVisible(
                  true,
                )
              }
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Seleccionar fecha y hora límite"
            >
              <Text
                style={styles.dateText}
              >
                {mostrarFecha(
                  fechaLimite,
                )}
              </Text>

              <Ionicons
                name="calendar-outline"
                size={20}
                color="#4A7CFF"
              />
            </TouchableOpacity>

            {selectorFechaVisible && (
              <View
                style={
                  styles.pickerContainer
                }
              >
                <DateTimePicker
                  value={fechaLimite}
                  mode={
                    Platform.OS === 'ios'
                      ? 'datetime'
                      : 'date'
                  }
                  display={
                    Platform.OS === 'ios'
                      ? 'spinner'
                      : 'default'
                  }
                  minimumDate={new Date()}
                  onChange={
                    alSeleccionarFecha
                  }
                />

                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={
                      styles.pickerDoneButton
                    }
                    onPress={() =>
                      setSelectorFechaVisible(
                        false,
                      )
                    }
                  >
                    <Text
                      style={
                        styles.pickerDoneText
                      }
                    >
                      Listo
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {selectorHoraVisible && (
              <DateTimePicker
                value={fechaLimite}
                mode="time"
                display="default"
                onChange={
                  alSeleccionarHora
                }
              />
            )}

            <Text style={styles.label}>
              Puntaje máximo
            </Text>

            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor="#9CA3AF"
              value={puntajeMaximo}
              onChangeText={
                setPuntajeMaximo
              }
              keyboardType="decimal-pad"
              accessibilityLabel="Puntaje máximo"
            />

            <View style={styles.switchCard}>
              <View
                style={
                  styles.switchTextContainer
                }
              >
                <Text
                  style={styles.switchTitle}
                >
                  Permitir entrega de
                  archivo
                </Text>

                <Text
                  style={
                    styles.switchDescription
                  }
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
                  false: '#CBD2DC',
                  true: '#AFC5FF',
                }}
                thumbColor={
                  permiteEntregaArchivo
                    ? '#4A7CFF'
                    : '#F4F4F5'
                }
                accessibilityLabel="Permitir entrega de archivo"
              />
            </View>

            {tipoActividad ===
              'Evaluacion' && (
              <View
                style={
                  styles.evaluationBox
                }
              >
                <Text
                  style={
                    styles.evaluationTitle
                  }
                >
                  Configuración de la
                  evaluación
                </Text>

                <Text
                  style={styles.label}
                >
                  Duración en minutos
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="60"
                  placeholderTextColor="#9CA3AF"
                  value={duracionMinutos}
                  onChangeText={
                    setDuracionMinutos
                  }
                  keyboardType="number-pad"
                  accessibilityLabel="Duración en minutos"
                />

                <Text
                  style={styles.label}
                >
                  Intentos permitidos
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor="#9CA3AF"
                  value={
                    intentosPermitidos
                  }
                  onChangeText={
                    setIntentosPermitidos
                  }
                  keyboardType="number-pad"
                  accessibilityLabel="Intentos permitidos"
                />

                <View
                  style={[
                    styles.switchCard,
                    styles.evaluationSwitch,
                  ]}
                >
                  <View
                    style={
                      styles.switchTextContainer
                    }
                  >
                    <Text
                      style={
                        styles.switchTitle
                      }
                    >
                      Mostrar resultado
                    </Text>

                    <Text
                      style={
                        styles.switchDescription
                      }
                    >
                      Mostrar el resultado
                      al terminar
                    </Text>
                  </View>

                  <Switch
                    value={
                      mostrarResultado
                    }
                    onValueChange={
                      setMostrarResultado
                    }
                    trackColor={{
                      false:
                        '#CBD2DC',
                      true: '#AFC5FF',
                    }}
                    thumbColor={
                      mostrarResultado
                        ? '#4A7CFF'
                        : '#F4F4F5'
                    }
                    accessibilityLabel="Mostrar resultado al terminar"
                  />
                </View>
              </View>
            )}

            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle-outline"
                size={19}
                color="#4A7CFF"
              />

              <Text style={styles.infoText}>
                El docente se obtiene de
                la sesión y la fecha de
                publicación se registra
                automáticamente.
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={
                  styles.cancelButton
                }
                onPress={() =>
                  router.back()
                }
                disabled={guardando}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.publishButton,
                  guardando &&
                    styles.disabledButton,
                ]}
                onPress={
                  guardarActividad
                }
                disabled={guardando}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Publicar actividad"
              >
                {guardando ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={
                      styles.publishButtonText
                    }
                  >
                    Publicar actividad
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomNavigation,
            {
              height:
                66 +
                Math.max(
                  insets.bottom,
                  5,
                ),

              paddingBottom:
                Math.max(
                  insets.bottom,
                  5,
                ),
            },
          ]}
        >
          <View
            style={[
              styles.bottomContent,
              {
                width: anchoContenido,
              },
            ]}
          >
            <BottomItem
              icon="home-outline"
              activeIcon="home"
              label="Inicio"
              onPress={() =>
                router.replace(
                  '/inicio-docente' as never,
                )
              }
            />

            <BottomItem
              icon="book-outline"
              activeIcon="book"
              label="Recursos"
              onPress={() =>
                router.push(
                  '/crear-recurso' as never,
                )
              }
            />

            <BottomItem
              icon="reader-outline"
              activeIcon="reader"
              label="Actividades"
              active
              onPress={() => {
                // Ya se encuentra en Actividades.
              }}
            />

            <BottomItem
              icon="document-text-outline"
              activeIcon="document-text"
              label="Evaluaciones"
              onPress={() =>
                router.push(
                  '/crear-evaluacion' as never,
                )
              }
            />

            <BottomItem
              icon="menu-outline"
              activeIcon="menu"
              label="Más"
              onPress={() =>
                router.push(
                  '/menu-docente' as never,
                )
              }
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

type ActivityOptionProps = {
  title: string;
  description: string;
  icon: IoniconName;
  iconBackground: string;
  iconColor: string;
  selected: boolean;
  onPress: () => void;
};

function ActivityOption({
  title,
  description,
  icon,
  iconBackground,
  iconColor,
  selected,
  onPress,
}: ActivityOptionProps) {
  return (
    <TouchableOpacity
      style={[
        styles.activityCard,
        selected &&
          styles.activityCardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{
        selected,
      }}
      accessibilityLabel={`${title}. ${description}`}
    >
      <View
        style={[
          styles.activityIconBox,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={iconColor}
        />
      </View>

      <View
        style={
          styles.activityTextContainer
        }
      >
        <Text
          style={styles.activityTitle}
        >
          {title}
        </Text>

        <Text
          style={
            styles.activityDescription
          }
        >
          {description}
        </Text>
      </View>

      {selected && (
        <Ionicons
          name="checkmark-circle"
          size={21}
          color="#4A7CFF"
        />
      )}
    </TouchableOpacity>
  );
}

type SelectorProps = {
  label: string;
  value: string;
  placeholder: string;
  options: OpcionSelector[];
  onChange: (value: string) => void;
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
  const [visible, setVisible] =
    useState(false);

  const selectedOption =
    options.find(
      (option) =>
        option.value === value,
    );

  const seleccionar = (
    nuevoValor: string,
  ) => {
    onChange(nuevoValor);
    setVisible(false);
  };

  return (
    <View style={styles.selectorGroup}>
      <Text style={styles.label}>
        {label}
      </Text>

      <TouchableOpacity
        style={[
          styles.selector,
          disabled &&
            styles.selectorDisabled,
        ]}
        onPress={() =>
          setVisible(true)
        }
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{
          disabled,
        }}
      >
        <Text
          style={[
            styles.selectorText,
            !selectedOption &&
              styles.selectorPlaceholder,
          ]}
          numberOfLines={1}
        >
          {selectedOption?.label ||
            placeholder}
        </Text>

        <Ionicons
          name="chevron-down"
          size={18}
          color="#7C8798"
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={
              StyleSheet.absoluteFill
            }
            onPress={() =>
              setVisible(false)
            }
          />

          <View style={styles.modalContent}>
            <Text
              style={styles.modalTitle}
            >
              {label}
            </Text>

            <ScrollView
              style={styles.modalList}
            >
              {allowEmpty && (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    value === '' &&
                      styles.modalOptionSelected,
                  ]}
                  onPress={() =>
                    seleccionar('')
                  }
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      value === '' &&
                        styles.modalOptionTextSelected,
                    ]}
                  >
                    {emptyLabel}
                  </Text>

                  {value === '' && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#4A7CFF"
                    />
                  )}
                </TouchableOpacity>
              )}

              {options.map((option) => {
                const selected =
                  value ===
                  option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.modalOption,
                      selected &&
                        styles.modalOptionSelected,
                    ]}
                    onPress={() =>
                      seleccionar(
                        option.value,
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        selected &&
                          styles.modalOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>

                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4A7CFF"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}

              {options.length === 0 &&
                !allowEmpty && (
                  <Text
                    style={styles.emptyText}
                  >
                    No hay opciones
                    disponibles.
                  </Text>
                )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() =>
                setVisible(false)
              }
            >
              <Text
                style={
                  styles.modalCloseText
                }
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
  return (
    <TouchableOpacity
      style={styles.bottomItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{
        selected: active,
      }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.bottomIconContainer,
          active &&
            styles.bottomIconContainerActive,
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
              ? '#2563EB'
              : '#8B98AA'
          }
        />
      </View>

      <Text
        style={[
          styles.bottomLabel,
          active &&
            styles.bottomLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    alignItems: 'center',
  },

  contentContainer: {
    alignSelf: 'center',
  },

  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 18,
  },

  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerText: {
    flex: 1,
    paddingHorizontal: 8,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
    color: '#64748B',
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 9,
  },

  activityCard: {
    width: '100%',
    minHeight: 62,
    borderWidth: 1,
    borderColor: '#C9CED7',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },

  activityCardSelected: {
    borderColor: '#4A7CFF',
    backgroundColor: '#F7F9FF',
  },

  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activityTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  activityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },

  activityDescription: {
    marginTop: 3,
    fontSize: 9,
    lineHeight: 13,
    color: '#7C8798',
  },

  informationTitle: {
    marginTop: 13,
  },

  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 7,
  },

  input: {
    width: '100%',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D5DAE2',
    borderRadius: 8,
    paddingHorizontal: 13,
    fontSize: 12,
    color: '#1F2937',
    marginBottom: 13,
    backgroundColor: '#FFFFFF',
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
    borderColor: '#D5DAE2',
    borderRadius: 8,
    paddingHorizontal: 13,
    marginBottom: 13,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectorDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.65,
  },

  selectorText: {
    flex: 1,
    paddingRight: 8,
    fontSize: 12,
    color: '#1F2937',
  },

  selectorPlaceholder: {
    color: '#9CA3AF',
  },

  dateButton: {
    width: '100%',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D5DAE2',
    borderRadius: 8,
    paddingHorizontal: 13,
    marginBottom: 13,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  dateText: {
    flex: 1,
    paddingRight: 8,
    fontSize: 12,
    color: '#1F2937',
  },

  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D5DAE2',
    borderRadius: 8,
    marginBottom: 13,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },

  pickerDoneButton: {
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EAF1FF',
  },

  pickerDoneText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '800',
  },

  switchCard: {
    width: '100%',
    minHeight: 64,
    borderWidth: 1,
    borderColor: '#D5DAE2',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 13,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  switchTextContainer: {
    flex: 1,
    paddingRight: 10,
  },

  switchTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F2937',
  },

  switchDescription: {
    marginTop: 3,
    fontSize: 9,
    lineHeight: 13,
    color: '#7C8798',
  },

  evaluationBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#D8D0FF',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingTop: 13,
    marginBottom: 13,
    backgroundColor: '#F9F8FF',
  },

  evaluationTitle: {
    marginBottom: 12,
    color: '#7059F5',
    fontSize: 12,
    fontWeight: '800',
  },

  evaluationSwitch: {
    marginBottom: 13,
  },

  infoBox: {
    width: '100%',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 3,
    backgroundColor: '#EEF4FF',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 9,
    lineHeight: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  loadingBox: {
    width: '100%',
    minHeight: 72,
    borderWidth: 1,
    borderColor: '#D5DAE2',
    borderRadius: 8,
    marginBottom: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  loadingText: {
    marginTop: 8,
    fontSize: 9,
    color: '#7C8798',
  },

  actions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginTop: 14,
  },

  cancelButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  cancelButtonText: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '600',
  },

  publishButton: {
    flex: 1.7,
    minHeight: 44,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4A7CFF',
  },

  disabledButton: {
    opacity: 0.6,
  },

  publishButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor:
      'rgba(15, 23, 42, 0.38)',
  },

  modalContent: {
    maxHeight: '70%',
    borderRadius: 14,
    padding: 17,
    backgroundColor: '#FFFFFF',
  },

  modalTitle: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },

  modalList: {
    maxHeight: 340,
  },

  modalOption: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F3',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalOptionSelected: {
    backgroundColor: '#F7F9FF',
  },

  modalOptionText: {
    flex: 1,
    paddingRight: 8,
    fontSize: 12,
    color: '#1F2937',
  },

  modalOptionTextSelected: {
    color: '#2563EB',
    fontWeight: '800',
  },

  emptyText: {
    paddingVertical: 24,
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
  },

  modalCloseButton: {
    height: 42,
    borderRadius: 7,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },

  modalCloseText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#111827',
        shadowOffset: {
          width: 0,
          height: -4,
        },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },

      android: {
        elevation: 10,
      },
    }),
  },

  bottomContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  bottomItem: {
    flex: 1,
    minWidth: 54,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomIconContainer: {
    width: 36,
    height: 29,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomIconContainerActive: {
    backgroundColor: '#EAF1FF',
  },

  bottomLabel: {
    marginTop: 2,
    fontSize: 8,
    color: '#8B98AA',
    fontWeight: '700',
  },

  bottomLabelActive: {
    color: '#2563EB',
    fontWeight: '900',
  },
});