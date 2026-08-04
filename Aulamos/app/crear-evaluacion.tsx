import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccessibility } from '../contexts/AccessibilityContext';

type TipoEvaluacion =
  | 'Cuestionario'
  | 'Tarea'
  | 'Examen';

type OpcionEvaluacion = {
  tipo: TipoEvaluacion;
  descripcion: string;
};

const OPCIONES_EVALUACION: OpcionEvaluacion[] = [
  {
    tipo: 'Cuestionario',
    descripcion: 'Preguntas de opción múltiple',
  },
  {
    tipo: 'Tarea',
    descripcion: 'Entrega de archivos',
  },
  {
    tipo: 'Examen',
    descripcion: 'Preguntas y respuestas',
  },
];

export default function CrearEvaluacionScreen() {
  const {
    preferencias,
    colores,
    escalaTexto,
    leerTexto,
  } = useAccessibility();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] =
    useState('');
  const [fechaLimite, setFechaLimite] =
    useState<Date | null>(null);
  const [
    mostrarCalendario,
    setMostrarCalendario,
  ] = useState(false);
  const [
    tipoEvaluacion,
    setTipoEvaluacion,
  ] = useState<TipoEvaluacion>('Cuestionario');
  const [guardando, setGuardando] =
    useState(false);

  useEffect(() => {
    if (preferencias.lectorPantalla) {
      leerTexto(
        'Pantalla crear evaluación. Puedes escribir el título, agregar una descripción, seleccionar una fecha límite y elegir entre cuestionario, tarea o examen.'
      );
    }
  }, [preferencias.lectorPantalla]);

  const anunciarTexto = (texto: string) => {
    if (preferencias.lectorPantalla) {
      leerTexto(texto);
    }
  };

  const formatearFecha = (
    fecha: Date | null
  ) => {
    if (!fecha) {
      return 'Seleccione una fecha';
    }

    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const seleccionarFecha = (
    event: DateTimePickerEvent,
    fechaSeleccionada?: Date
  ) => {
    if (Platform.OS === 'android') {
      setMostrarCalendario(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    if (fechaSeleccionada) {
      setFechaLimite(fechaSeleccionada);

      anunciarTexto(
        `Fecha límite seleccionada: ${formatearFecha(
          fechaSeleccionada
        )}`
      );
    }
  };

  const validarFormulario = () => {
    if (!titulo.trim()) {
      const mensaje =
        'Escribe el título de la evaluación.';

      Alert.alert(
        'Título requerido',
        mensaje
      );

      anunciarTexto(`Error. ${mensaje}`);

      return false;
    }

    if (!fechaLimite) {
      const mensaje =
        'Selecciona una fecha límite para la evaluación.';

      Alert.alert(
        'Fecha requerida',
        mensaje
      );

      anunciarTexto(`Error. ${mensaje}`);

      return false;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaSeleccionada = new Date(
      fechaLimite
    );
    fechaSeleccionada.setHours(
      0,
      0,
      0,
      0
    );

    if (fechaSeleccionada < hoy) {
      const mensaje =
        'La fecha límite no puede ser anterior al día de hoy.';

      Alert.alert(
        'Fecha no válida',
        mensaje
      );

      anunciarTexto(`Error. ${mensaje}`);

      return false;
    }

    return true;
  };

  const crearEvaluacion = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setGuardando(true);

      const nuevaEvaluacion = {
        titulo: titulo.trim(),
        descripcion:
          descripcion.trim() || null,
        fecha_limite: fechaLimite
          ?.toISOString()
          .split('T')[0],
        tipo: tipoEvaluacion,
      };

      /*
        Cuando tengas listo el endpoint del backend,
        sustituye el console.log por tu petición fetch.

        Ejemplo:

        const respuesta = await fetch(
          `${API_URL}/docente/evaluaciones`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify(
              nuevaEvaluacion
            ),
          }
        );

        const resultado =
          await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje ||
              'No se pudo crear la evaluación.'
          );
        }
      */

      console.log(
        'Evaluación preparada:',
        nuevaEvaluacion
      );

      anunciarTexto(
        'Evaluación creada correctamente.'
      );

      Alert.alert(
        'Evaluación creada',
        'La evaluación se creó correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado.';

      Alert.alert('Error', mensaje);
      anunciarTexto(`Error. ${mensaje}`);
    } finally {
      setGuardando(false);
    }
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
      <View
        style={[
          styles.encabezado,
          {
            backgroundColor:
              colores.fondo,
            borderBottomColor:
              colores.borde,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.botonIcono}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
          accessibilityHint="Regresa a la pantalla anterior"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colores.texto}
          />
        </TouchableOpacity>

        <View
          style={styles.encabezadoTexto}
        >
          <Text
            style={[
              styles.tituloPantalla,
              {
                color: colores.texto,
                fontSize:
                  18 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Crear Evaluación
          </Text>

          <Text
            style={[
              styles.subtituloPantalla,
              {
                color:
                  colores.textoSecundario,
                fontSize:
                  11 * escalaTexto,
              },
            ]}
          >
            Crear evaluaciones para medir
            el aprendizaje
          </Text>
        </View>

        <TouchableOpacity
          onPress={() =>
            router.push(
              '/accesibilidad'
            )
          }
          onLongPress={() =>
            anunciarTexto(
              'Botón de accesibilidad. Abre las opciones de alto contraste, modo oscuro, tamaño de texto y lectura de pantalla.'
            )
          }
          style={styles.botonIcono}
          accessibilityRole="button"
          accessibilityLabel="Configuración de accesibilidad"
          accessibilityHint="Abre las opciones de accesibilidad de Aulamos"
        >
          <Ionicons
            name="accessibility"
            size={26}
            color={colores.primario}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.contenido
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
        accessibilityLabel="Formulario para crear una evaluación"
      >
        <Text
          style={[
            styles.etiqueta,
            {
              color: colores.texto,
              fontSize:
                12 * escalaTexto,
            },
          ]}
        >
          Título de la evaluación
        </Text>

        <TextInput
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ej. Evaluación de ecosistemas"
          placeholderTextColor={
            colores.textoSecundario
          }
          maxLength={150}
          autoCapitalize="sentences"
          style={[
            styles.input,
            {
              color: colores.texto,
              borderColor:
                colores.borde,
              backgroundColor:
                colores.tarjeta,
              fontSize:
                14 * escalaTexto,
            },
          ]}
          accessibilityLabel="Título de la evaluación"
          accessibilityHint="Escribe el nombre de la evaluación"
          accessibilityValue={{
            text:
              titulo || 'Campo vacío',
          }}
        />

        <Text
          style={[
            styles.etiqueta,
            {
              color: colores.texto,
              fontSize:
                12 * escalaTexto,
            },
          ]}
        >
          Descripción (opcional)
        </Text>

        <TextInput
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Describe la evaluación y las instrucciones para los estudiantes"
          placeholderTextColor={
            colores.textoSecundario
          }
          multiline
          maxLength={500}
          textAlignVertical="top"
          style={[
            styles.input,
            styles.inputDescripcion,
            {
              color: colores.texto,
              borderColor:
                colores.borde,
              backgroundColor:
                colores.tarjeta,
              fontSize:
                14 * escalaTexto,
            },
          ]}
          accessibilityLabel="Descripción de la evaluación"
          accessibilityHint="Escribe las instrucciones que recibirán los estudiantes"
          accessibilityValue={{
            text:
              descripcion ||
              'Campo vacío',
          }}
        />

        <Text
          style={[
            styles.etiqueta,
            {
              color: colores.texto,
              fontSize:
                12 * escalaTexto,
            },
          ]}
        >
          Fecha límite
        </Text>

        <TouchableOpacity
          onPress={() => {
            setMostrarCalendario(true);

            anunciarTexto(
              'Calendario abierto. Selecciona la fecha límite.'
            );
          }}
          style={[
            styles.selectorFecha,
            {
              borderColor:
                colores.borde,
              backgroundColor:
                colores.tarjeta,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar fecha límite"
          accessibilityHint="Abre el calendario"
          accessibilityValue={{
            text: formatearFecha(
              fechaLimite
            ),
          }}
        >
          <Text
            style={[
              styles.textoFecha,
              {
                color: fechaLimite
                  ? colores.texto
                  : colores.textoSecundario,
                fontSize:
                  14 * escalaTexto,
              },
            ]}
          >
            {formatearFecha(
              fechaLimite
            )}
          </Text>

          <Ionicons
            name="calendar-outline"
            size={20}
            color={colores.texto}
          />
        </TouchableOpacity>

        {mostrarCalendario && (
          <DateTimePicker
            value={
              fechaLimite ?? new Date()
            }
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={seleccionarFecha}
          />
        )}

        <Text
          style={[
            styles.etiqueta,
            styles.etiquetaTipo,
            {
              color: colores.texto,
              fontSize:
                12 * escalaTexto,
            },
          ]}
          accessibilityRole="header"
        >
          Tipo de evaluación
        </Text>

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Selecciona el tipo de evaluación"
        >
          {OPCIONES_EVALUACION.map(
            (opcion, index) => {
              const seleccionada =
                tipoEvaluacion ===
                opcion.tipo;

              return (
                <TouchableOpacity
                  key={opcion.tipo}
                  onPress={() => {
                    setTipoEvaluacion(
                      opcion.tipo
                    );

                    anunciarTexto(
                      `${opcion.tipo} seleccionado. ${opcion.descripcion}`
                    );
                  }}
                  style={[
                    styles.opcion,
                    {
                      borderColor:
                        seleccionada
                          ? colores.primario
                          : colores.borde,
                      backgroundColor:
                        seleccionada
                          ? colores.fondoPrimario
                          : colores.tarjeta,
                      borderTopLeftRadius:
                        index === 0
                          ? 7
                          : 0,
                      borderTopRightRadius:
                        index === 0
                          ? 7
                          : 0,
                      borderBottomLeftRadius:
                        index ===
                        OPCIONES_EVALUACION.length -
                          1
                          ? 7
                          : 0,
                      borderBottomRightRadius:
                        index ===
                        OPCIONES_EVALUACION.length -
                          1
                          ? 7
                          : 0,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={
                    opcion.tipo
                  }
                  accessibilityHint={
                    opcion.descripcion
                  }
                  accessibilityState={{
                    selected:
                      seleccionada,
                    checked:
                      seleccionada,
                  }}
                >
                  <View
                    style={
                      styles.opcionTexto
                    }
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
                      {opcion.tipo}
                    </Text>

                    <Text
                      style={[
                        styles.descripcionOpcion,
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
                        opcion.descripcion
                      }
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radioExterior,
                      {
                        borderColor:
                          seleccionada
                            ? colores.primario
                            : colores.texto,
                      },
                    ]}
                  >
                    {seleccionada && (
                      <View
                        style={[
                          styles.radioInterior,
                          {
                            backgroundColor:
                              colores.primario,
                          },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        <View style={styles.acciones}>
          <TouchableOpacity
            onPress={() =>
              router.back()
            }
            style={[
              styles.botonCancelar,
              {
                borderColor:
                  colores.texto,
                backgroundColor:
                  colores.tarjeta,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Cancelar creación de evaluación"
            accessibilityHint="Regresa sin guardar la evaluación"
          >
            <Text
              style={[
                styles.textoCancelar,
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
            onPress={crearEvaluacion}
            disabled={guardando}
            style={[
              styles.botonCrear,
              {
                backgroundColor:
                  colores.primario,
                opacity: guardando
                  ? 0.6
                  : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              guardando
                ? 'Creando evaluación'
                : 'Crear evaluación'
            }
            accessibilityHint="Guarda la evaluación para los estudiantes"
            accessibilityState={{
              disabled: guardando,
              busy: guardando,
            }}
          >
            <Text
              style={[
                styles.textoCrear,
                {
                  fontSize:
                    14 *
                    escalaTexto,
                },
              ]}
            >
              {guardando
                ? 'Creando...'
                : 'Crear Evaluación'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View
        style={[
          styles.menuInferior,
          {
            backgroundColor:
              colores.tarjeta,
            borderTopColor:
              colores.borde,
          },
        ]}
        accessibilityRole="tablist"
      >
        <BottomItem
          icono="home"
          texto="Inicio"
          ruta="/inicio-docente"
          activo={false}
          colorTexto={
            colores.textoSecundario
          }
          colorActivo={
            colores.primario
          }
          escalaTexto={escalaTexto}
        />

        <BottomItem
          icono="book"
          texto="Recursos"
          ruta="/crear-recurso"
          activo={false}
          colorTexto={
            colores.textoSecundario
          }
          colorActivo={
            colores.primario
          }
          escalaTexto={escalaTexto}
        />

        <BottomItem
          icono="list"
          texto="Actividades"
          ruta="/actividades-docente"
          activo={false}
          colorTexto={
            colores.textoSecundario
          }
          colorActivo={
            colores.primario
          }
          escalaTexto={escalaTexto}
        />

        <BottomItem
          icono="checkbox"
          texto="Evaluaciones"
          ruta="/crear-evaluacion"
          activo
          colorTexto={
            colores.textoSecundario
          }
          colorActivo={
            colores.primario
          }
          escalaTexto={escalaTexto}
        />

        <BottomItem
          icono="menu"
          texto="Más"
          ruta="/menu-docente"
          activo={false}
          colorTexto={
            colores.textoSecundario
          }
          colorActivo={
            colores.primario
          }
          escalaTexto={escalaTexto}
        />
      </View>
    </SafeAreaView>
  );
}

type BottomItemProps = {
  icono: keyof typeof Ionicons.glyphMap;
  texto: string;
  ruta: string;
  activo: boolean;
  colorTexto: string;
  colorActivo: string;
  escalaTexto: number;
};

function BottomItem({
  icono,
  texto,
  ruta,
  activo,
  colorTexto,
  colorActivo,
  escalaTexto,
}: BottomItemProps) {
  const color = activo
    ? colorActivo
    : colorTexto;

  return (
    <TouchableOpacity
      onPress={() =>
        router.replace(ruta as never)
      }
      style={styles.itemMenu}
      accessibilityRole="tab"
      accessibilityLabel={texto}
      accessibilityState={{
        selected: activo,
      }}
    >
      <Ionicons
        name={icono}
        size={20}
        color={color}
      />

      <Text
        numberOfLines={1}
        style={[
          styles.textoMenu,
          {
            color,
            fontSize:
              10 * escalaTexto,
            fontWeight: activo
              ? '700'
              : '500',
          },
        ]}
      >
        {texto}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  encabezado: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 7,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
  },

  botonIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  encabezadoTexto: {
    flex: 1,
    paddingTop: 2,
  },

  tituloPantalla: {
    fontWeight: '700',
  },

  subtituloPantalla: {
    marginTop: 5,
    lineHeight: 17,
  },

  contenido: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 35,
  },

  etiqueta: {
    marginBottom: 6,
    fontWeight: '700',
  },

  input: {
    width: '100%',
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  inputDescripcion: {
    minHeight: 68,
  },

  selectorFecha: {
    width: '100%',
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  textoFecha: {
    flex: 1,
  },

  etiquetaTipo: {
    marginTop: 2,
    marginBottom: 7,
  },

  opcion: {
    minHeight: 54,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -1,
  },

  opcionTexto: {
    flex: 1,
  },

  nombreOpcion: {
    fontWeight: '700',
  },

  descripcionOpcion: {
    marginTop: 2,
  },

  radioExterior: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  radioInterior: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  acciones: {
    marginTop: 26,
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    gap: 16,
  },

  botonCancelar: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textoCancelar: {
    fontWeight: '500',
  },

  botonCrear: {
    minHeight: 44,
    paddingHorizontal: 15,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textoCrear: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  menuInferior: {
    minHeight: 65,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 4,
  },

  itemMenu: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  textoMenu: {
    marginTop: 3,
    textAlign: 'center',
  },
});