import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type TipoPregunta =
  | 'OpcionMultiple'
  | 'VerdaderoFalso'
  | 'RespuestaCorta';

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

type OpcionLocal = {
  id_local: string;
  texto: string;
  es_correcta: boolean;
};

type PreguntaLocal = {
  id_local: string;
  texto: string;
  tipo: TipoPregunta;
  puntaje: string;
  obligatoria: boolean;
  opciones: OpcionLocal[];
};

type RespuestaCatalogos = {
  cursos?: Curso[];
  periodos?: Periodo[];
  mensaje?: string;
};

type RespuestaCrear = {
  mensaje?: string;
  id_evaluacion?: number;
  preguntas_guardadas?: number;
  alumnos_asignados?: number;
  error?: string;
};

const AZUL = '#2D5BFF';
const AZUL_OSCURO = '#1739B7';
const AZUL_SUAVE = '#EEF3FF';
const MORADO_ACCESIBILIDAD = '#6D28D9';
const VERDE = '#16865C';
const ROJO = '#D9363E';

let secuenciaLocal = 0;
const crearIdLocal = () => {
  secuenciaLocal += 1;
  return `${Date.now()}-${secuenciaLocal}`;
};

const opcionesIniciales = (): OpcionLocal[] => [
  { id_local: crearIdLocal(), texto: '', es_correcta: true },
  { id_local: crearIdLocal(), texto: '', es_correcta: false },
];

const crearPregunta = (): PreguntaLocal => ({
  id_local: crearIdLocal(),
  texto: '',
  tipo: 'OpcionMultiple',
  puntaje: '1',
  obligatoria: true,
  opciones: opcionesIniciales(),
});

const completarNumero = (numero: number) =>
  String(numero).padStart(2, '0');

const convertirFechaMySQL = (fecha: Date) =>
  `${fecha.getFullYear()}-${completarNumero(
    fecha.getMonth() + 1,
  )}-${completarNumero(fecha.getDate())} ${completarNumero(
    fecha.getHours(),
  )}:${completarNumero(fecha.getMinutes())}:00`;

const crearFechaInicial = () => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  fecha.setHours(23, 59, 0, 0);
  return fecha;
};

const mostrarFecha = (fecha: Date) =>
  fecha.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const leerRespuesta = async <T,>(respuesta: Response): Promise<T> => {
  const texto = await respuesta.text();
  if (!texto) return {} as T;

  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new Error('El servidor devolvió una respuesta no válida.');
  }
};

const mensajeDeError = (error: unknown) => {
  if (error instanceof TypeError) {
    return 'No se pudo conectar con el servidor. Comprueba que Node esté encendido y que el celular use la misma red Wi-Fi.';
  }
  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado.';
};

export default function CrearEvaluacionScreen() {
  const { width } = useWindowDimensions();
  const { preferencias, colores, escalaTexto, leerTexto } =
    useAccessibility();

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [idCurso, setIdCurso] = useState('');
  const [idPeriodo, setIdPeriodo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [preguntas, setPreguntas] = useState<PreguntaLocal[]>([
    crearPregunta(),
  ]);
  const [fechaLimite, setFechaLimite] = useState(crearFechaInicial);
  const [duracionMinutos, setDuracionMinutos] = useState('45');
  const [intentosPermitidos, setIntentosPermitidos] = useState('1');
  const [mostrarResultado, setMostrarResultado] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalCurso, setModalCurso] = useState(false);
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const [selectorFecha, setSelectorFecha] = useState(false);
  const [selectorHora, setSelectorHora] = useState(false);

  const margen = width < 370 ? 14 : 20;
  const anchoContenido = Math.min(width - margen * 2, 600);

  const anunciar = (texto: string) => {
    if (preferencias.lectorPantalla) leerTexto(texto);
  };

  const cursoSeleccionado = useMemo(
    () => cursos.find((curso) => String(curso.id_curso) === idCurso),
    [cursos, idCurso],
  );

  const periodosDisponibles = useMemo(
    () =>
      cursoSeleccionado
        ? periodos.filter(
            (periodo) =>
              Number(periodo.id_ciclo) ===
              Number(cursoSeleccionado.id_ciclo),
          )
        : [],
    [cursoSeleccionado, periodos],
  );

  const periodoSeleccionado = periodosDisponibles.find(
    (periodo) => String(periodo.id_periodo) === idPeriodo,
  );

  const puntajeTotal = useMemo(
    () =>
      preguntas.reduce((total, pregunta) => {
        const puntos = Number(pregunta.puntaje);
        return total + (Number.isFinite(puntos) ? puntos : 0);
      }, 0),
    [preguntas],
  );

  useEffect(() => {
    if (preferencias.lectorPantalla) {
      leerTexto(
        'Crear evaluación. Completa la información, agrega las preguntas y configura la publicación.',
      );
    }
  }, [preferencias.lectorPantalla]);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Inicia sesión nuevamente.');

        const respuesta = await fetch(
          `${API_URL}/evaluaciones/catalogos`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const datos = await leerRespuesta<RespuestaCatalogos>(respuesta);

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje || 'No se pudieron cargar los cursos.',
          );
        }

        setCursos(datos.cursos ?? []);
        setPeriodos(datos.periodos ?? []);
      } catch (error) {
        Alert.alert('No se pudieron cargar los datos', mensajeDeError(error));
      } finally {
        setCargando(false);
      }
    };

    void cargarCatalogos();
  }, []);

  const actualizarPregunta = (
    id: string,
    cambios: Partial<PreguntaLocal>,
  ) => {
    setPreguntas((actuales) =>
      actuales.map((pregunta) =>
        pregunta.id_local === id ? { ...pregunta, ...cambios } : pregunta,
      ),
    );
  };

  const cambiarTipo = (id: string, tipo: TipoPregunta) => {
    setPreguntas((actuales) =>
      actuales.map((pregunta) => {
        if (pregunta.id_local !== id) return pregunta;

        if (tipo === 'RespuestaCorta') {
          return { ...pregunta, tipo, opciones: [] };
        }

        if (tipo === 'VerdaderoFalso') {
          return {
            ...pregunta,
            tipo,
            opciones: [
              {
                id_local: crearIdLocal(),
                texto: 'Verdadero',
                es_correcta: true,
              },
              {
                id_local: crearIdLocal(),
                texto: 'Falso',
                es_correcta: false,
              },
            ],
          };
        }

        return {
          ...pregunta,
          tipo,
          opciones:
            pregunta.opciones.length >= 2
              ? pregunta.opciones
              : opcionesIniciales(),
        };
      }),
    );
  };

  const agregarPregunta = () => {
    setPreguntas((actuales) => [...actuales, crearPregunta()]);
    anunciar(`Pregunta ${preguntas.length + 1} agregada.`);
  };

  const duplicarPregunta = (id: string) => {
    setPreguntas((actuales) => {
      const indice = actuales.findIndex(
        (pregunta) => pregunta.id_local === id,
      );
      if (indice < 0) return actuales;

      const original = actuales[indice];
      const copia: PreguntaLocal = {
        ...original,
        id_local: crearIdLocal(),
        opciones: original.opciones.map((opcion) => ({
          ...opcion,
          id_local: crearIdLocal(),
        })),
      };
      const nuevas = [...actuales];
      nuevas.splice(indice + 1, 0, copia);
      return nuevas;
    });
  };

  const eliminarPregunta = (id: string) => {
    if (preguntas.length === 1) {
      Alert.alert(
        'Pregunta necesaria',
        'La evaluación debe tener por lo menos una pregunta.',
      );
      return;
    }

    Alert.alert('Eliminar pregunta', '¿Deseas eliminar esta pregunta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          setPreguntas((actuales) =>
            actuales.filter((pregunta) => pregunta.id_local !== id),
          ),
      },
    ]);
  };

  const actualizarOpcion = (
    idPregunta: string,
    idOpcion: string,
    texto: string,
  ) => {
    setPreguntas((actuales) =>
      actuales.map((pregunta) =>
        pregunta.id_local !== idPregunta
          ? pregunta
          : {
              ...pregunta,
              opciones: pregunta.opciones.map((opcion) =>
                opcion.id_local === idOpcion
                  ? { ...opcion, texto }
                  : opcion,
              ),
            },
      ),
    );
  };

  const marcarCorrecta = (idPregunta: string, idOpcion: string) => {
    setPreguntas((actuales) =>
      actuales.map((pregunta) =>
        pregunta.id_local !== idPregunta
          ? pregunta
          : {
              ...pregunta,
              opciones: pregunta.opciones.map((opcion) => ({
                ...opcion,
                es_correcta: opcion.id_local === idOpcion,
              })),
            },
      ),
    );
  };

  const agregarOpcion = (idPregunta: string) => {
    setPreguntas((actuales) =>
      actuales.map((pregunta) =>
        pregunta.id_local !== idPregunta || pregunta.opciones.length >= 10
          ? pregunta
          : {
              ...pregunta,
              opciones: [
                ...pregunta.opciones,
                {
                  id_local: crearIdLocal(),
                  texto: '',
                  es_correcta: false,
                },
              ],
            },
      ),
    );
  };

  const eliminarOpcion = (idPregunta: string, idOpcion: string) => {
    setPreguntas((actuales) =>
      actuales.map((pregunta) => {
        if (
          pregunta.id_local !== idPregunta ||
          pregunta.opciones.length <= 2
        ) {
          return pregunta;
        }

        const opciones = pregunta.opciones.filter(
          (opcion) => opcion.id_local !== idOpcion,
        );

        if (!opciones.some((opcion) => opcion.es_correcta)) {
          opciones[0] = { ...opciones[0], es_correcta: true };
        }

        return { ...pregunta, opciones };
      }),
    );
  };

  const validar = () => {
    if (!idCurso) return 'Selecciona el curso.';
    if (!titulo.trim()) return 'Escribe el título de la evaluación.';
    if (fechaLimite.getTime() <= Date.now()) {
      return 'La fecha límite debe ser posterior a la fecha actual.';
    }

    const duracion = Number(duracionMinutos);
    const intentos = Number(intentosPermitidos);
    if (!Number.isInteger(duracion) || duracion < 1 || duracion > 600) {
      return 'La duración debe estar entre 1 y 600 minutos.';
    }
    if (!Number.isInteger(intentos) || intentos < 1 || intentos > 10) {
      return 'Los intentos deben estar entre 1 y 10.';
    }

    for (let indice = 0; indice < preguntas.length; indice += 1) {
      const pregunta = preguntas[indice];
      if (!pregunta.texto.trim()) {
        return `Escribe el enunciado de la pregunta ${indice + 1}.`;
      }

      const puntos = Number(pregunta.puntaje);
      if (!Number.isFinite(puntos) || puntos <= 0) {
        return `Escribe un puntaje válido en la pregunta ${indice + 1}.`;
      }

      if (
        pregunta.tipo !== 'RespuestaCorta' &&
        (pregunta.opciones.length < 2 ||
          pregunta.opciones.some((opcion) => !opcion.texto.trim()))
      ) {
        return `Completa todas las opciones de la pregunta ${indice + 1}.`;
      }

      if (
        pregunta.tipo !== 'RespuestaCorta' &&
        pregunta.opciones.filter((opcion) => opcion.es_correcta).length !== 1
      ) {
        return `Marca una respuesta correcta en la pregunta ${indice + 1}.`;
      }
    }

    return null;
  };

  const publicar = async () => {
    if (guardando) return;

    const errorValidacion = validar();
    if (errorValidacion) {
      Alert.alert('Revisa la evaluación', errorValidacion);
      anunciar(`Error. ${errorValidacion}`);
      return;
    }

    try {
      setGuardando(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Inicia sesión nuevamente.');

      const respuesta = await fetch(`${API_URL}/evaluaciones`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_curso: Number(idCurso),
          id_periodo: idPeriodo ? Number(idPeriodo) : null,
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          instrucciones: instrucciones.trim() || null,
          fecha_limite: convertirFechaMySQL(fechaLimite),
          duracion_minutos: Number(duracionMinutos),
          intentos_permitidos: Number(intentosPermitidos),
          mostrar_resultado: mostrarResultado,
          preguntas: preguntas.map((pregunta) => ({
            texto: pregunta.texto.trim(),
            tipo: pregunta.tipo,
            puntaje: Number(pregunta.puntaje),
            obligatoria: pregunta.obligatoria,
            opciones: pregunta.opciones.map((opcion) => ({
              texto: opcion.texto.trim(),
              es_correcta: opcion.es_correcta,
            })),
          })),
        }),
      });

      const datos = await leerRespuesta<RespuestaCrear>(respuesta);
      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || datos.error || 'No se pudo publicar.',
        );
      }

      const alumnos = datos.alumnos_asignados ?? 0;
      Alert.alert(
        'Evaluación publicada',
        `${datos.preguntas_guardadas ?? preguntas.length} preguntas guardadas. Aparecerá a ${alumnos} alumno${alumnos === 1 ? '' : 's'}.`,
        [
          {
            text: 'Aceptar',
            onPress: () => router.replace('/inicio-docente' as never),
          },
        ],
      );
    } catch (error) {
      Alert.alert('No se pudo publicar', mensajeDeError(error));
    } finally {
      setGuardando(false);
    }
  };

  const alCambiarFecha = (
    evento: DateTimePickerEvent,
    nueva?: Date,
  ) => {
    if (Platform.OS === 'android') setSelectorFecha(false);
    if (evento.type === 'dismissed' || !nueva) return;

    const fecha = new Date(fechaLimite);
    fecha.setFullYear(
      nueva.getFullYear(),
      nueva.getMonth(),
      nueva.getDate(),
    );
    setFechaLimite(fecha);
    if (Platform.OS === 'android') setSelectorHora(true);
  };

  const alCambiarHora = (
    evento: DateTimePickerEvent,
    nueva?: Date,
  ) => {
    setSelectorHora(false);
    if (evento.type === 'dismissed' || !nueva) return;

    setFechaLimite((anterior) => {
      const fecha = new Date(anterior);
      fecha.setHours(nueva.getHours(), nueva.getMinutes(), 0, 0);
      return fecha;
    });
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colores.fondo }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: colores.fondo,
              borderBottomColor: colores.borde,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Regresar"
          >
            <Ionicons name="arrow-back" size={25} color={colores.texto} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text
              accessibilityRole="header"
              style={[
                styles.headerTitle,
                { color: colores.texto, fontSize: 19 * escalaTexto },
              ]}
            >
              Nueva evaluación
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                {
                  color: colores.textoSecundario,
                  fontSize: 11 * escalaTexto,
                },
              ]}
            >
              Crea preguntas y publícalas
            </Text>
          </View>

          <TouchableOpacity
            style={styles.accessibilityButton}
            onPress={() => router.push('/accesibilidad' as never)}
            accessibilityRole="button"
            accessibilityLabel="Configuración de accesibilidad"
          >
            <Ionicons name="accessibility" size={27} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={[styles.content, { width: anchoContenido }]}> 
            <View style={styles.introCard}>
              <View style={styles.introIcon}>
                <Ionicons name="create-outline" size={24} color={AZUL} />
              </View>
              <View style={styles.introText}>
                <Text
                  style={[
                    styles.introTitle,
                    { fontSize: 16 * escalaTexto },
                  ]}
                >
                  Crea tu evaluación paso a paso
                </Text>
                <Text
                  style={[
                    styles.introSubtitle,
                    { fontSize: 11 * escalaTexto },
                  ]}
                >
                  Agrega preguntas, marca respuestas correctas y asigna puntos.
                </Text>
              </View>
            </View>

            <StepTitle
              number="1"
              title="Información"
              subtitle="Curso, periodo y datos principales"
              textColor={colores.texto}
              secondaryColor={colores.textoSecundario}
              scale={escalaTexto}
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
            >
              {cargando ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={AZUL} />
                  <Text style={{ color: colores.textoSecundario }}>
                    Cargando cursos...
                  </Text>
                </View>
              ) : (
                <>
                  <Label text="Curso" required color={colores.texto} />
                  <Selector
                    value={
                      cursoSeleccionado
                        ? `${cursoSeleccionado.nombre_curso} · ${cursoSeleccionado.materia}`
                        : 'Selecciona un curso'
                    }
                    detail={
                      cursoSeleccionado
                        ? `${cursoSeleccionado.grado ?? ''} ${cursoSeleccionado.grupo} · ${cursoSeleccionado.alumnos_inscritos} alumnos`
                        : undefined
                    }
                    icon="people-outline"
                    onPress={() => setModalCurso(true)}
                    textColor={colores.texto}
                    secondaryColor={colores.textoSecundario}
                    backgroundColor={colores.fondo}
                    borderColor={idCurso ? AZUL : colores.borde}
                  />

                  <Label text="Periodo (opcional)" color={colores.texto} />
                  <Selector
                    value={
                      periodoSeleccionado?.nombre_periodo ?? 'Sin periodo'
                    }
                    icon="calendar-clear-outline"
                    onPress={() => idCurso && setModalPeriodo(true)}
                    disabled={!idCurso}
                    textColor={colores.texto}
                    secondaryColor={colores.textoSecundario}
                    backgroundColor={colores.fondo}
                    borderColor={colores.borde}
                  />
                </>
              )}

              <Label text="Título" required color={colores.texto} />
              <TextInput
                value={titulo}
                onChangeText={setTitulo}
                maxLength={150}
                placeholder="Ej. Evaluación de ecosistemas"
                placeholderTextColor={colores.textoSecundario}
                style={[
                  styles.input,
                  {
                    color: colores.texto,
                    backgroundColor: colores.fondo,
                    borderColor: colores.borde,
                    fontSize: 14 * escalaTexto,
                  },
                ]}
              />

              <Label text="Descripción" color={colores.texto} />
              <TextInput
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                maxLength={500}
                placeholder="Explica brevemente qué se evaluará"
                placeholderTextColor={colores.textoSecundario}
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: colores.texto,
                    backgroundColor: colores.fondo,
                    borderColor: colores.borde,
                    fontSize: 14 * escalaTexto,
                  },
                ]}
              />

              <Label text="Instrucciones" color={colores.texto} />
              <TextInput
                value={instrucciones}
                onChangeText={setInstrucciones}
                multiline
                maxLength={1000}
                placeholder="Ej. Lee con atención y selecciona una respuesta"
                placeholderTextColor={colores.textoSecundario}
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: colores.texto,
                    backgroundColor: colores.fondo,
                    borderColor: colores.borde,
                    fontSize: 14 * escalaTexto,
                  },
                ]}
              />
            </View>

            <StepTitle
              number="2"
              title="Preguntas"
              subtitle={`${preguntas.length} pregunta${
                preguntas.length === 1 ? '' : 's'
              } · ${puntajeTotal} puntos`}
              textColor={colores.texto}
              secondaryColor={colores.textoSecundario}
              scale={escalaTexto}
            />

            {preguntas.map((pregunta, indice) => (
              <QuestionCard
                key={pregunta.id_local}
                question={pregunta}
                index={indice}
                total={preguntas.length}
                textColor={colores.texto}
                secondaryColor={colores.textoSecundario}
                backgroundColor={colores.tarjeta}
                inputBackground={colores.fondo}
                borderColor={colores.borde}
                scale={escalaTexto}
                onChange={(changes) =>
                  actualizarPregunta(pregunta.id_local, changes)
                }
                onChangeType={(type) =>
                  cambiarTipo(pregunta.id_local, type)
                }
                onChangeOption={(idOption, text) =>
                  actualizarOpcion(pregunta.id_local, idOption, text)
                }
                onCorrect={(idOption) =>
                  marcarCorrecta(pregunta.id_local, idOption)
                }
                onAddOption={() => agregarOpcion(pregunta.id_local)}
                onRemoveOption={(idOption) =>
                  eliminarOpcion(pregunta.id_local, idOption)
                }
                onDuplicate={() => duplicarPregunta(pregunta.id_local)}
                onDelete={() => eliminarPregunta(pregunta.id_local)}
              />
            ))}

            <TouchableOpacity
              style={styles.addQuestionButton}
              onPress={agregarPregunta}
              accessibilityRole="button"
              accessibilityLabel="Agregar pregunta"
            >
              <Ionicons name="add-circle" size={22} color={AZUL} />
              <Text
                style={[
                  styles.addQuestionText,
                  { fontSize: 13 * escalaTexto },
                ]}
              >
                Agregar pregunta
              </Text>
            </TouchableOpacity>

            <StepTitle
              number="3"
              title="Configuración"
              subtitle="Fecha, duración e intentos"
              textColor={colores.texto}
              secondaryColor={colores.textoSecundario}
              scale={escalaTexto}
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
            >
              <Label text="Fecha y hora límite" required color={colores.texto} />
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: colores.fondo,
                    borderColor: colores.borde,
                  },
                ]}
                onPress={() => setSelectorFecha(true)}
              >
                <View style={styles.dateIcon}>
                  <Ionicons name="calendar-outline" size={20} color={AZUL} />
                </View>
                <Text style={[styles.dateText, { color: colores.texto }]}> 
                  {mostrarFecha(fechaLimite)}
                </Text>
                <Ionicons name="chevron-forward" size={19} color={AZUL} />
              </TouchableOpacity>

              {selectorFecha && (
                <DateTimePicker
                  value={fechaLimite}
                  mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
                  minimumDate={new Date()}
                  onChange={alCambiarFecha}
                />
              )}
              {selectorHora && (
                <DateTimePicker
                  value={fechaLimite}
                  mode="time"
                  onChange={alCambiarHora}
                />
              )}

              <View style={styles.settingsRow}>
                <NumberField
                  label="Duración"
                  value={duracionMinutos}
                  suffix="min"
                  onChange={setDuracionMinutos}
                  textColor={colores.texto}
                  secondaryColor={colores.textoSecundario}
                  backgroundColor={colores.fondo}
                  borderColor={colores.borde}
                />
                <NumberField
                  label="Intentos"
                  value={intentosPermitidos}
                  suffix="máx."
                  onChange={setIntentosPermitidos}
                  textColor={colores.texto}
                  secondaryColor={colores.textoSecundario}
                  backgroundColor={colores.fondo}
                  borderColor={colores.borde}
                />
                <View
                  style={[
                    styles.totalBox,
                    { backgroundColor: AZUL_SUAVE },
                  ]}
                >
                  <Text style={styles.totalLabel}>Puntaje</Text>
                  <Text style={styles.totalValue}>{puntajeTotal}</Text>
                  <Text style={styles.totalSuffix}>puntos</Text>
                </View>
              </View>

              <View
                style={[
                  styles.switchRow,
                  { borderTopColor: colores.borde },
                ]}
              >
                <View style={styles.switchText}>
                  <Text style={[styles.switchTitle, { color: colores.texto }]}> 
                    Mostrar resultado al terminar
                  </Text>
                  <Text
                    style={[
                      styles.switchSubtitle,
                      { color: colores.textoSecundario },
                    ]}
                  >
                    Las preguntas abiertas requieren revisión del docente
                  </Text>
                </View>
                <Switch
                  value={mostrarResultado}
                  onValueChange={setMostrarResultado}
                  trackColor={{ false: '#CBD5E1', true: '#AFC0FF' }}
                  thumbColor={mostrarResultado ? AZUL : '#FFFFFF'}
                />
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Ionicons name="checkmark-circle" size={23} color={VERDE} />
              <Text style={styles.summaryText}>
                Se publicarán <Text style={styles.bold}>{preguntas.length}</Text>{' '}
                preguntas para{' '}
                <Text style={styles.bold}>
                  {cursoSeleccionado?.alumnos_inscritos ?? 0} alumnos
                </Text>
                .
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: colores.tarjeta,
                    borderColor: colores.borde,
                  },
                ]}
                onPress={() => router.back()}
                disabled={guardando}
              >
                <Text style={[styles.cancelText, { color: colores.texto }]}> 
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.publishButton,
                  (guardando || cargando || cursos.length === 0) &&
                    styles.disabled,
                ]}
                onPress={publicar}
                disabled={guardando || cargando || cursos.length === 0}
                accessibilityRole="button"
              >
                {guardando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.publishText}>Publicar evaluación</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <SelectionModal
          visible={modalCurso}
          title="Selecciona un curso"
          onClose={() => setModalCurso(false)}
          backgroundColor={colores.tarjeta}
          textColor={colores.texto}
          borderColor={colores.borde}
        >
          {cursos.map((curso) => (
            <TouchableOpacity
              key={curso.id_curso}
              style={[styles.modalOption, { borderColor: colores.borde }]}
              onPress={() => {
                setIdCurso(String(curso.id_curso));
                setIdPeriodo('');
                setModalCurso(false);
              }}
            >
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalTitle, { color: colores.texto }]}> 
                  {curso.nombre_curso}
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: colores.textoSecundario },
                  ]}
                >
                  {curso.materia} · {curso.grado} {curso.grupo} ·{' '}
                  {curso.alumnos_inscritos} alumnos
                </Text>
              </View>
              {String(curso.id_curso) === idCurso && (
                <Ionicons name="checkmark-circle" size={23} color={AZUL} />
              )}
            </TouchableOpacity>
          ))}
        </SelectionModal>

        <SelectionModal
          visible={modalPeriodo}
          title="Selecciona un periodo"
          onClose={() => setModalPeriodo(false)}
          backgroundColor={colores.tarjeta}
          textColor={colores.texto}
          borderColor={colores.borde}
        >
          <TouchableOpacity
            style={[styles.modalOption, { borderColor: colores.borde }]}
            onPress={() => {
              setIdPeriodo('');
              setModalPeriodo(false);
            }}
          >
            <Text style={[styles.modalTitle, { color: colores.texto }]}> 
              Sin periodo
            </Text>
          </TouchableOpacity>
          {periodosDisponibles.map((periodo) => (
            <TouchableOpacity
              key={periodo.id_periodo}
              style={[styles.modalOption, { borderColor: colores.borde }]}
              onPress={() => {
                setIdPeriodo(String(periodo.id_periodo));
                setModalPeriodo(false);
              }}
            >
              <Text style={[styles.modalTitle, { color: colores.texto }]}> 
                {periodo.nombre_periodo}
              </Text>
              {String(periodo.id_periodo) === idPeriodo && (
                <Ionicons name="checkmark-circle" size={23} color={AZUL} />
              )}
            </TouchableOpacity>
          ))}
        </SelectionModal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepTitle({
  number,
  title,
  subtitle,
  textColor,
  secondaryColor,
  scale,
}: {
  number: string;
  title: string;
  subtitle: string;
  textColor: string;
  secondaryColor: string;
  scale: number;
}) {
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View>
        <Text
          style={[
            styles.stepTitle,
            { color: textColor, fontSize: 16 * scale },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.stepSubtitle,
            { color: secondaryColor, fontSize: 11 * scale },
          ]}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function Label({
  text,
  required = false,
  color,
}: {
  text: string;
  required?: boolean;
  color: string;
}) {
  return (
    <Text style={[styles.label, { color }]}> 
      {text}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

function Selector({
  value,
  detail,
  icon,
  onPress,
  disabled = false,
  textColor,
  secondaryColor,
  backgroundColor,
  borderColor,
}: {
  value: string;
  detail?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  textColor: string;
  secondaryColor: string;
  backgroundColor: string;
  borderColor: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.selector,
        { backgroundColor, borderColor, opacity: disabled ? 0.55 : 1 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.selectorIcon}>
        <Ionicons name={icon} size={19} color={AZUL} />
      </View>
      <View style={styles.selectorText}>
        <Text numberOfLines={1} style={[styles.selectorValue, { color: textColor }]}> 
          {value}
        </Text>
        {detail && (
          <Text
            numberOfLines={1}
            style={[styles.selectorDetail, { color: secondaryColor }]}
          >
            {detail}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-down" size={19} color={AZUL} />
    </TouchableOpacity>
  );
}

function QuestionCard({
  question,
  index,
  total,
  textColor,
  secondaryColor,
  backgroundColor,
  inputBackground,
  borderColor,
  scale,
  onChange,
  onChangeType,
  onChangeOption,
  onCorrect,
  onAddOption,
  onRemoveOption,
  onDuplicate,
  onDelete,
}: {
  question: PreguntaLocal;
  index: number;
  total: number;
  textColor: string;
  secondaryColor: string;
  backgroundColor: string;
  inputBackground: string;
  borderColor: string;
  scale: number;
  onChange: (changes: Partial<PreguntaLocal>) => void;
  onChangeType: (type: TipoPregunta) => void;
  onChangeOption: (id: string, text: string) => void;
  onCorrect: (id: string) => void;
  onAddOption: () => void;
  onRemoveOption: (id: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const typeOptions: Array<{
    type: TipoPregunta;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }> = [
    { type: 'OpcionMultiple', label: 'Opción', icon: 'radio-button-on' },
    { type: 'VerdaderoFalso', label: 'V/F', icon: 'git-compare-outline' },
    { type: 'RespuestaCorta', label: 'Abierta', icon: 'text-outline' },
  ];

  return (
    <View
      style={[
        styles.questionCard,
        { backgroundColor, borderColor },
      ]}
    >
      <View style={styles.questionHeader}>
        <View style={styles.questionBadge}>
          <Text style={styles.questionBadgeText}>Pregunta {index + 1}</Text>
        </View>
        <View style={styles.questionActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onDuplicate}
            accessibilityLabel={`Duplicar pregunta ${index + 1}`}
          >
            <Ionicons name="copy-outline" size={19} color={AZUL} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onDelete}
            accessibilityLabel={`Eliminar pregunta ${index + 1}`}
            disabled={total === 1}
          >
            <Ionicons
              name="trash-outline"
              size={19}
              color={total === 1 ? '#A8B0BF' : ROJO}
            />
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        value={question.texto}
        onChangeText={(texto) => onChange({ texto })}
        multiline
        maxLength={2000}
        placeholder="Escribe la pregunta"
        placeholderTextColor={secondaryColor}
        style={[
          styles.questionInput,
          {
            color: textColor,
            backgroundColor: inputBackground,
            borderColor,
            fontSize: 15 * scale,
          },
        ]}
      />

      <Text style={[styles.miniLabel, { color: secondaryColor }]}> 
        Tipo de respuesta
      </Text>
      <View style={styles.typeRow}>
        {typeOptions.map((option) => {
          const selected = option.type === question.tipo;
          return (
            <TouchableOpacity
              key={option.type}
              style={[
                styles.typeButton,
                {
                  backgroundColor: selected ? AZUL_SUAVE : inputBackground,
                  borderColor: selected ? AZUL : borderColor,
                },
              ]}
              onPress={() => onChangeType(option.type)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <Ionicons
                name={option.icon}
                size={16}
                color={selected ? AZUL : secondaryColor}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.typeText,
                  { color: selected ? AZUL_OSCURO : textColor },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {question.tipo === 'RespuestaCorta' ? (
        <View style={styles.openAnswerPreview}>
          <Ionicons name="create-outline" size={18} color={AZUL} />
          <Text style={[styles.openAnswerText, { color: secondaryColor }]}> 
            El alumno escribirá su respuesta. El docente deberá revisarla.
          </Text>
        </View>
      ) : (
        <View style={styles.optionsBox}>
          <Text style={[styles.correctHint, { color: VERDE }]}> 
            Toca el círculo para marcar la respuesta correcta
          </Text>
          {question.opciones.map((option, optionIndex) => (
            <View key={option.id_local} style={styles.optionRow}>
              <TouchableOpacity
                style={styles.correctButton}
                onPress={() => onCorrect(option.id_local)}
                accessibilityRole="radio"
                accessibilityState={{ checked: option.es_correcta }}
              >
                <Ionicons
                  name={
                    option.es_correcta
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={23}
                  color={option.es_correcta ? VERDE : '#94A3B8'}
                />
              </TouchableOpacity>
              <TextInput
                value={option.texto}
                onChangeText={(text) =>
                  onChangeOption(option.id_local, text)
                }
                editable={question.tipo !== 'VerdaderoFalso'}
                placeholder={`Opción ${optionIndex + 1}`}
                placeholderTextColor={secondaryColor}
                style={[
                  styles.optionInput,
                  {
                    color: textColor,
                    backgroundColor: inputBackground,
                    borderColor: option.es_correcta ? VERDE : borderColor,
                  },
                ]}
              />
              {question.tipo === 'OpcionMultiple' &&
                question.opciones.length > 2 && (
                  <TouchableOpacity
                    style={styles.removeOption}
                    onPress={() => onRemoveOption(option.id_local)}
                    accessibilityLabel={`Eliminar opción ${optionIndex + 1}`}
                  >
                    <Ionicons name="close" size={20} color={ROJO} />
                  </TouchableOpacity>
                )}
            </View>
          ))}

          {question.tipo === 'OpcionMultiple' &&
            question.opciones.length < 10 && (
              <TouchableOpacity
                style={styles.addOptionButton}
                onPress={onAddOption}
              >
                <Ionicons name="add" size={18} color={AZUL} />
                <Text style={styles.addOptionText}>Agregar opción</Text>
              </TouchableOpacity>
            )}
        </View>
      )}

      <View style={[styles.questionFooter, { borderTopColor: borderColor }]}> 
        <View style={styles.pointsBox}>
          <Text style={[styles.pointsLabel, { color: secondaryColor }]}>Puntos</Text>
          <TextInput
            value={question.puntaje}
            onChangeText={(puntaje) => onChange({ puntaje })}
            keyboardType="decimal-pad"
            style={[
              styles.pointsInput,
              {
                color: textColor,
                backgroundColor: inputBackground,
                borderColor,
              },
            ]}
          />
        </View>
        <View style={styles.requiredRow}>
          <Text style={[styles.requiredLabel, { color: textColor }]}>Obligatoria</Text>
          <Switch
            value={question.obligatoria}
            onValueChange={(obligatoria) => onChange({ obligatoria })}
            trackColor={{ false: '#CBD5E1', true: '#AFC0FF' }}
            thumbColor={question.obligatoria ? AZUL : '#FFFFFF'}
          />
        </View>
      </View>
    </View>
  );
}

function NumberField({
  label,
  value,
  suffix,
  onChange,
  textColor,
  secondaryColor,
  backgroundColor,
  borderColor,
}: {
  label: string;
  value: string;
  suffix: string;
  onChange: (value: string) => void;
  textColor: string;
  secondaryColor: string;
  backgroundColor: string;
  borderColor: string;
}) {
  return (
    <View style={styles.numberField}>
      <Text style={[styles.numberLabel, { color: textColor }]}>{label}</Text>
      <View
        style={[
          styles.numberInputBox,
          { backgroundColor, borderColor },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="number-pad"
          style={[styles.numberInput, { color: textColor }]}
        />
        <Text style={[styles.numberSuffix, { color: secondaryColor }]}> 
          {suffix}
        </Text>
      </View>
    </View>
  );
}

function SelectionModal({
  visible,
  title,
  onClose,
  backgroundColor,
  textColor,
  borderColor,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor }]}> 
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}> 
            <Text style={[styles.modalHeaderTitle, { color: textColor }]}> 
              {title}
            </Text>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, paddingHorizontal: 5 },
  headerTitle: { fontWeight: '900' },
  headerSubtitle: { marginTop: 2 },
  accessibilityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MORADO_ACCESIBILIDAD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 7,
    elevation: 6,
  },
  scroll: { alignItems: 'center', paddingVertical: 18, paddingBottom: 42 },
  content: { paddingHorizontal: 1 },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AZUL_SUAVE,
    borderWidth: 1,
    borderColor: '#CFDAFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  introIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  introText: { flex: 1 },
  introTitle: { color: AZUL_OSCURO, fontWeight: '900' },
  introSubtitle: { color: '#4961A4', lineHeight: 17, marginTop: 4 },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AZUL,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumberText: { color: '#FFFFFF', fontWeight: '900' },
  stepTitle: { fontWeight: '900' },
  stepSubtitle: { marginTop: 2 },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    marginBottom: 22,
  },
  loadingRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 7, marginTop: 9 },
  required: { color: ROJO },
  selector: {
    minHeight: 56,
    borderWidth: 1.2,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    marginBottom: 5,
  },
  selectorIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: AZUL_SUAVE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  selectorText: { flex: 1 },
  selectorValue: { fontSize: 13, fontWeight: '700' },
  selectorDetail: { fontSize: 10, marginTop: 3 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 11,
    textAlignVertical: 'top',
  },
  textArea: { minHeight: 82 },
  questionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: AZUL,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  questionBadge: {
    backgroundColor: AZUL_SUAVE,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  questionBadgeText: { color: AZUL_OSCURO, fontSize: 11, fontWeight: '900' },
  questionActions: { flexDirection: 'row' },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },
  questionInput: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    fontWeight: '700',
  },
  miniLabel: { fontSize: 10, fontWeight: '800', marginTop: 12, marginBottom: 7 },
  typeRow: { flexDirection: 'row', marginHorizontal: -3 },
  typeButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginHorizontal: 3,
  },
  typeText: { fontSize: 10, fontWeight: '800', marginLeft: 5 },
  optionsBox: { marginTop: 13 },
  correctHint: { fontSize: 10, fontWeight: '700', marginBottom: 7 },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  correctButton: { width: 34, alignItems: 'flex-start' },
  optionInput: {
    flex: 1,
    minHeight: 45,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 11,
    fontSize: 13,
  },
  removeOption: {
    width: 34,
    height: 42,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  addOptionButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
  },
  addOptionText: { color: AZUL, fontSize: 12, fontWeight: '800', marginLeft: 4 },
  openAnswerPreview: {
    minHeight: 58,
    borderRadius: 12,
    backgroundColor: AZUL_SUAVE,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 13,
  },
  openAnswerText: { flex: 1, fontSize: 11, lineHeight: 16, marginLeft: 8 },
  questionFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 12,
  },
  pointsBox: { width: 92 },
  pointsLabel: { fontSize: 10, fontWeight: '700', marginBottom: 5 },
  pointsInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontWeight: '800',
  },
  requiredRow: { flexDirection: 'row', alignItems: 'center' },
  requiredLabel: { fontSize: 11, fontWeight: '700', marginRight: 5 },
  addQuestionButton: {
    minHeight: 52,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: AZUL,
    borderRadius: 15,
    backgroundColor: AZUL_SUAVE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  addQuestionText: { color: AZUL, fontWeight: '900', marginLeft: 7 },
  dateButton: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
  },
  dateIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: AZUL_SUAVE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dateText: { flex: 1, fontSize: 12, fontWeight: '700' },
  settingsRow: { flexDirection: 'row', marginHorizontal: -4, marginTop: 14 },
  numberField: { flex: 1, marginHorizontal: 4 },
  numberLabel: { fontSize: 10, fontWeight: '800', marginBottom: 5 },
  numberInputBox: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  numberInput: { width: '100%', textAlign: 'center', fontSize: 15, fontWeight: '900' },
  numberSuffix: { fontSize: 9, marginTop: -3 },
  totalBox: {
    flex: 1,
    minHeight: 80,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  totalLabel: { color: AZUL_OSCURO, fontSize: 10, fontWeight: '800' },
  totalValue: { color: AZUL, fontSize: 18, fontWeight: '900', marginTop: 2 },
  totalSuffix: { color: '#4961A4', fontSize: 9 },
  switchRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 14,
  },
  switchText: { flex: 1, paddingRight: 8 },
  switchTitle: { fontSize: 12, fontWeight: '800' },
  switchSubtitle: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  summaryCard: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: '#EAF8F2',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    marginBottom: 14,
  },
  summaryText: { flex: 1, color: '#215C47', fontSize: 11, lineHeight: 17, marginLeft: 8 },
  bold: { fontWeight: '900' },
  actions: { flexDirection: 'row', marginHorizontal: -5 },
  cancelButton: {
    flex: 0.8,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  cancelText: { fontSize: 13, fontWeight: '800' },
  publishButton: {
    flex: 1.45,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: AZUL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    shadowColor: AZUL_OSCURO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  publishText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', marginLeft: 7 },
  disabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '76%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: {
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  modalHeaderTitle: { flex: 1, fontSize: 17, fontWeight: '900' },
  modalClose: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  modalContent: { padding: 15, paddingBottom: 30 },
  modalOption: {
    minHeight: 62,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalOptionText: { flex: 1 },
  modalTitle: { fontSize: 14, fontWeight: '800' },
  modalSubtitle: { fontSize: 11, marginTop: 4 },
});
