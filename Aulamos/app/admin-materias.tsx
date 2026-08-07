import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
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
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type EstadoMateria =
  | 'Activa'
  | 'Inactiva';

type FiltroEstado =
  | 'Todas'
  | EstadoMateria;

type Materia = {
  id_materia: number;
  nombre: string;
  campo_formativo: string;
  descripcion: string | null;
  estado: EstadoMateria;
  total_cursos?: number | string;
};

type RespuestaApi = {
  mensaje?: string;
  campo?: string;
  materias?: Materia[];
  materia?: Materia;
};

type IoniconName =
  keyof typeof Ionicons.glyphMap;

const CAMPOS_FORMATIVOS = [
  'Lenguajes',
  'Saberes y Pensamiento Científico',
  'Naturaleza y Sociedades',
  'De lo Humano y lo Comunitario',
] as const;

type CampoFormativo =
  typeof CAMPOS_FORMATIVOS[number];

const leerRespuesta = async (
  respuesta: Response
): Promise<RespuestaApi> => {
  const texto =
    await respuesta.text();

  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(
      texto
    ) as RespuestaApi;
  } catch {
    return {
      mensaje:
        'El servidor envió una respuesta no válida.',
    };
  }
};

const limpiarTexto = (
  texto: string
) => {
  return texto
    .trim()
    .replace(/\s+/g, ' ');
};

export default function AdminMateriasScreen() {
  const insets =
    useSafeAreaInsets();

  const { width } =
    useWindowDimensions();

  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const [materias, setMaterias] =
    useState<Materia[]>([]);

  const [busqueda, setBusqueda] =
    useState('');

  const [
    filtroEstado,
    setFiltroEstado,
  ] = useState<FiltroEstado>(
    'Todas'
  );

  const [cargando, setCargando] =
    useState(true);

  const [
    actualizando,
    setActualizando,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    cambiandoEstado,
    setCambiandoEstado,
  ] = useState<number | null>(
    null
  );

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    materiaEditando,
    setMateriaEditando,
  ] = useState<Materia | null>(
    null
  );

  const [nombre, setNombre] =
    useState('');

  const [
    campoFormativo,
    setCampoFormativo,
  ] = useState('');

  const [
    mostrarCamposFormativos,
    setMostrarCamposFormativos,
  ] = useState(false);

  const [
    descripcion,
    setDescripcion,
  ] = useState('');

  const [estado, setEstado] =
    useState<EstadoMateria>(
      'Activa'
    );

  const altoContraste =
    preferencias.altoContraste;

  const temaOscuro =
    preferencias.modoOscuro ||
    altoContraste;

  const altoBarraInferior =
    escalaTexto > 1.2
      ? 94
      : 66;

  const dosColumnas =
    width >= 760 &&
    escalaTexto <= 1.15;

  const colorPrincipal =
    altoContraste
      ? colores.primario
      : temaOscuro
        ? '#93C5FD'
        : '#2563EB';

  const fondoSuave =
    altoContraste
      ? colores.tarjeta
      : temaOscuro
        ? '#172554'
        : '#EFF6FF';

  const materiasFiltradas =
    useMemo(() => {
      const termino =
        busqueda
          .trim()
          .toLocaleLowerCase(
            'es'
          );

      return materias.filter(
        (materia) => {
          const coincideEstado =
            filtroEstado ===
              'Todas' ||
            materia.estado ===
              filtroEstado;

          if (
            !coincideEstado
          ) {
            return false;
          }

          if (!termino) {
            return true;
          }

          return (
            materia.nombre
              .toLocaleLowerCase(
                'es'
              )
              .includes(
                termino
              ) ||
            materia.campo_formativo
              .toLocaleLowerCase(
                'es'
              )
              .includes(
                termino
              ) ||
            (
              materia.descripcion ??
              ''
            )
              .toLocaleLowerCase(
                'es'
              )
              .includes(
                termino
              )
          );
        }
      );
    }, [
      materias,
      busqueda,
      filtroEstado,
    ]);

  const resumen = useMemo(
    () => ({
      total:
        materias.length,

      activas:
        materias.filter(
          (materia) =>
            materia.estado ===
            'Activa'
        ).length,

      inactivas:
        materias.filter(
          (materia) =>
            materia.estado ===
            'Inactiva'
        ).length,
    }),
    [materias]
  );

  const manejarSesionInvalida =
    async () => {
      await AsyncStorage.multiRemove(
        [
          'token',
          'usuario',
        ]
      );

      Alert.alert(
        'Sesión vencida',
        'Inicia sesión nuevamente.'
      );

      router.replace(
        '/' as any
      );
    };

  const cargarMaterias =
    async (
      mostrarCarga = true
    ) => {
      try {
        if (
          mostrarCarga
        ) {
          setCargando(
            true
          );
        }

        const token =
          await AsyncStorage.getItem(
            'token'
          );

        if (!token) {
          await manejarSesionInvalida();
          return;
        }

        const respuesta =
          await fetch(
            `${API_URL}/academico/materias`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const datos =
          await leerRespuesta(
            respuesta
          );

        if (
          respuesta.status ===
          401
        ) {
          await manejarSesionInvalida();
          return;
        }

        if (
          respuesta.status ===
          403
        ) {
          Alert.alert(
            'Acceso restringido',
            datos.mensaje ||
              'Solo un administrador puede consultar las materias.'
          );

          router.back();
          return;
        }

        if (
          !respuesta.ok
        ) {
          throw new Error(
            datos.mensaje ||
              'No fue posible cargar las materias.'
          );
        }

        setMaterias(
          datos.materias ??
            []
        );
      } catch (
        error
      ) {
        console.error(
          'Error al cargar materias:',
          error
        );

        Alert.alert(
          'No se pudieron cargar las materias',
          error instanceof
            Error
            ? error.message
            : 'Verifica la conexión con la API.'
        );
      } finally {
        setCargando(
          false
        );
        setActualizando(
          false
        );
      }
    };

  useEffect(() => {
    cargarMaterias();
  }, []);

  const actualizar =
    () => {
      setActualizando(
        true
      );
      cargarMaterias(
        false
      );
    };

  const limpiarFormulario =
    () => {
      setNombre('');
      setCampoFormativo(
        ''
      );
      setMostrarCamposFormativos(
        false
      );
      setDescripcion('');
      setEstado(
        'Activa'
      );
      setMateriaEditando(
        null
      );
    };

  const abrirNuevaMateria =
    () => {
      limpiarFormulario();
      setModalVisible(
        true
      );
    };

  const abrirEdicion = (
    materia: Materia
  ) => {
    setMateriaEditando(
      materia
    );

    setNombre(
      materia.nombre
    );

    setCampoFormativo(
      materia.campo_formativo
    );

    setMostrarCamposFormativos(
      false
    );

    setDescripcion(
      materia.descripcion ??
        ''
    );

    setEstado(
      materia.estado
    );

    setModalVisible(
      true
    );
  };

  const cerrarModal =
    () => {
      if (
        guardando
      ) {
        return;
      }

      setModalVisible(
        false
      );

      setMostrarCamposFormativos(
        false
      );

      limpiarFormulario();
    };

  const validarFormulario =
    () => {
      const nombreLimpio =
        limpiarTexto(
          nombre
        );

      const campoLimpio =
        limpiarTexto(
          campoFormativo
        );

      const descripcionLimpia =
        limpiarTexto(
          descripcion
        );

      if (
        !nombreLimpio
      ) {
        Alert.alert(
          'Nombre requerido',
          'Escribe el nombre de la materia.'
        );

        return false;
      }

      if (
        nombreLimpio.length <
          2 ||
        nombreLimpio.length >
          120
      ) {
        Alert.alert(
          'Nombre no válido',
          'El nombre debe tener entre 2 y 120 caracteres.'
        );

        return false;
      }

      if (
        !campoLimpio
      ) {
        Alert.alert(
          'Campo formativo requerido',
          'Selecciona un campo formativo.'
        );

        return false;
      }

      if (
        !CAMPOS_FORMATIVOS.includes(
          campoLimpio as CampoFormativo
        )
      ) {
        Alert.alert(
          'Campo formativo no válido',
          'Selecciona uno de los cuatro campos formativos disponibles.'
        );

        return false;
      }

      if (
        descripcionLimpia.length >
        1000
      ) {
        Alert.alert(
          'Descripción no válida',
          'La descripción no puede superar los 1000 caracteres.'
        );

        return false;
      }

      return true;
    };

  const guardarMateria =
    async () => {
      if (
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
          await manejarSesionInvalida();
          return;
        }

        const esEdicion =
          materiaEditando !==
          null;

        const url =
          esEdicion
            ? `${API_URL}/academico/materias/${materiaEditando.id_materia}`
            : `${API_URL}/academico/materias`;

        const respuesta =
          await fetch(
            url,
            {
              method:
                esEdicion
                  ? 'PUT'
                  : 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify(
                {
                  nombre:
                    limpiarTexto(
                      nombre
                    ),

                  campo_formativo:
                    limpiarTexto(
                      campoFormativo
                    ),

                  descripcion:
                    limpiarTexto(
                      descripcion
                    ),

                  estado,
                }
              ),
            }
          );

        const datos =
          await leerRespuesta(
            respuesta
          );

        if (
          respuesta.status ===
          401
        ) {
          await manejarSesionInvalida();
          return;
        }

        if (
          !respuesta.ok
        ) {
          Alert.alert(
            'No se pudo guardar',
            datos.mensaje ||
              'Revisa la información.'
          );

          return;
        }

        setModalVisible(
          false
        );

        limpiarFormulario();

        Alert.alert(
          'Operación correcta',
          datos.mensaje ||
            'La materia fue guardada.'
        );

        await cargarMaterias(
          false
        );
      } catch (
        error
      ) {
        console.error(
          'Error al guardar materia:',
          error
        );

        Alert.alert(
          'Error de conexión',
          'No fue posible comunicarse con la API.'
        );
      } finally {
        setGuardando(
          false
        );
      }
    };

  const cambiarEstadoMateria =
    async (
      materia: Materia,
      nuevoEstado:
        EstadoMateria
    ) => {
      try {
        setCambiandoEstado(
          materia.id_materia
        );

        const token =
          await AsyncStorage.getItem(
            'token'
          );

        if (!token) {
          await manejarSesionInvalida();
          return;
        }

        const respuesta =
          await fetch(
            `${API_URL}/academico/materias/${materia.id_materia}/estado`,
            {
              method:
                'PATCH',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify(
                {
                  estado:
                    nuevoEstado,
                }
              ),
            }
          );

        const datos =
          await leerRespuesta(
            respuesta
          );

        if (
          respuesta.status ===
          401
        ) {
          await manejarSesionInvalida();
          return;
        }

        if (
          !respuesta.ok
        ) {
          Alert.alert(
            'No se pudo cambiar el estado',
            datos.mensaje ||
              'Inténtalo nuevamente.'
          );

          return;
        }

        await cargarMaterias(
          false
        );
      } catch (
        error
      ) {
        console.error(
          'Error al cambiar estado:',
          error
        );

        Alert.alert(
          'Error de conexión',
          'No fue posible comunicarse con la API.'
        );
      } finally {
        setCambiandoEstado(
          null
        );
      }
    };

  const confirmarCambioEstado =
    (
      materia: Materia
    ) => {
      const nuevoEstado:
        EstadoMateria =
        materia.estado ===
        'Activa'
          ? 'Inactiva'
          : 'Activa';

      Alert.alert(
        nuevoEstado ===
          'Activa'
          ? 'Activar materia'
          : 'Desactivar materia',

        `¿Deseas cambiar “${materia.nombre}” al estado ${nuevoEstado}?`,

        [
          {
            text:
              'Cancelar',
            style:
              'cancel',
          },

          {
            text:
              'Confirmar',

            style:
              nuevoEstado ===
              'Inactiva'
                ? 'destructive'
                : 'default',

            onPress:
              () =>
                cambiarEstadoMateria(
                  materia,
                  nuevoEstado
                ),
          },
        ]
      );
    };

  if (cargando) {
    return (
      <SafeAreaView
        style={[
          styles.loading,
          {
            backgroundColor:
              colores.fondo,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={
            colorPrincipal
          }
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                colores.textoSecundario,

              fontSize:
                14 *
                escalaTexto,
            },
          ]}
        >
          Cargando materias...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={[
        'top',
        'left',
        'right',
      ]}
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colores.fondo,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom:
              altoBarraInferior +
              Math.max(
                insets.bottom,
                5
              ) +
              30,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              actualizando
            }
            onRefresh={
              actualizar
            }
            colors={[
              colorPrincipal,
            ]}
            tintColor={
              colorPrincipal
            }
          />
        }
      >
        <View
          style={
            styles.content
          }
        >
          <View
            style={
              styles.topBar
            }
          >
            <TouchableOpacity
              style={[
                styles.circleButton,
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
                size={23}
                color={
                  colores.texto
                }
              />
            </TouchableOpacity>

            <BotonAccesibilidad />
          </View>

          <View
            style={
              styles.header
            }
          >
            <View
              style={[
                styles.headerIcon,
                {
                  backgroundColor:
                    fondoSuave,

                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <Ionicons
                name="book-outline"
                size={34}
                color={
                  colorPrincipal
                }
              />
            </View>

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
                      27 *
                      escalaTexto,
                  },
                ]}
              >
                Materias
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color:
                      colores.textoSecundario,

                    fontSize:
                      14 *
                      escalaTexto,
                  },
                ]}
              >
                Administra el
                catálogo y sus
                campos formativos.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor:
                  fondoSuave,

                borderColor:
                  colores.borde,
              },
            ]}
          >
            <View
              style={
                styles.summaryItem
              }
            >
              <Text
                style={[
                  styles.summaryNumber,
                  {
                    color:
                      colorPrincipal,

                    fontSize:
                      23 *
                      escalaTexto,
                  },
                ]}
              >
                {
                  resumen.total
                }
              </Text>

              <Text
                style={[
                  styles.summaryLabel,
                  {
                    color:
                      colores.textoSecundario,

                    fontSize:
                      11 *
                      escalaTexto,
                  },
                ]}
              >
                Total
              </Text>
            </View>

            <View
              style={[
                styles.divider,
                {
                  backgroundColor:
                    colores.borde,
                },
              ]}
            />

            <View
              style={
                styles.summaryItem
              }
            >
              <Text
                style={[
                  styles.summaryNumber,
                  {
                    color:
                      colores.exito,

                    fontSize:
                      23 *
                      escalaTexto,
                  },
                ]}
              >
                {
                  resumen.activas
                }
              </Text>

              <Text
                style={[
                  styles.summaryLabel,
                  {
                    color:
                      colores.textoSecundario,

                    fontSize:
                      11 *
                      escalaTexto,
                  },
                ]}
              >
                Activas
              </Text>
            </View>

            <View
              style={[
                styles.divider,
                {
                  backgroundColor:
                    colores.borde,
                },
              ]}
            />

            <View
              style={
                styles.summaryItem
              }
            >
              <Text
                style={[
                  styles.summaryNumber,
                  {
                    color:
                      colores.textoSecundario,

                    fontSize:
                      23 *
                      escalaTexto,
                  },
                ]}
              >
                {
                  resumen.inactivas
                }
              </Text>

              <Text
                style={[
                  styles.summaryLabel,
                  {
                    color:
                      colores.textoSecundario,

                    fontSize:
                      11 *
                      escalaTexto,
                  },
                ]}
              >
                Inactivas
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.newButton,
              {
                backgroundColor:
                  colorPrincipal,
              },
            ]}
            onPress={
              abrirNuevaMateria
            }
            accessibilityRole="button"
            accessibilityLabel="Nueva materia"
          >
            <Ionicons
              name="add-circle-outline"
              size={23}
              color="#FFFFFF"
            />

            <Text
              style={[
                styles.newButtonText,
                {
                  fontSize:
                    14 *
                    escalaTexto,
                },
              ]}
            >
              Nueva materia
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.searchBox,
              {
                backgroundColor:
                  colores.tarjeta,

                borderColor:
                  colores.borde,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={21}
              color={
                colores.textoSecundario
              }
            />

            <TextInput
              style={[
                styles.searchInput,
                {
                  color:
                    colores.texto,

                  fontSize:
                    14 *
                    escalaTexto,
                },
              ]}
              value={
                busqueda
              }
              onChangeText={
                setBusqueda
              }
              placeholder="Buscar materia"
              placeholderTextColor={
                colores.textoSecundario
              }
            />

            {busqueda ? (
              <TouchableOpacity
                onPress={() =>
                  setBusqueda(
                    ''
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
              >
                <Ionicons
                  name="close-circle"
                  size={21}
                  color={
                    colores.textoSecundario
                  }
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filters
            }
          >
            {(
              [
                'Todas',
                'Activa',
                'Inactiva',
              ] as FiltroEstado[]
            ).map(
              (
                opcion
              ) => {
                const seleccionada =
                  filtroEstado ===
                  opcion;

                return (
                  <TouchableOpacity
                    key={
                      opcion
                    }
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor:
                          seleccionada
                            ? fondoSuave
                            : colores.tarjeta,

                        borderColor:
                          seleccionada
                            ? colorPrincipal
                            : colores.borde,
                      },
                    ]}
                    onPress={() =>
                      setFiltroEstado(
                        opcion
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.filterText,
                        {
                          color:
                            seleccionada
                              ? colorPrincipal
                              : colores.textoSecundario,

                          fontSize:
                            12 *
                            escalaTexto,
                        },
                      ]}
                    >
                      {
                        opcion
                      }
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </ScrollView>

          <View
            style={
              styles.sectionHeader
            }
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    colores.texto,

                  fontSize:
                    19 *
                    escalaTexto,
                },
              ]}
            >
              Catálogo
            </Text>

            <Text
              style={[
                styles.resultText,
                {
                  color:
                    colores.textoSecundario,

                  fontSize:
                    12 *
                    escalaTexto,
                },
              ]}
            >
              {
                materiasFiltradas.length
              }{' '}
              resultados
            </Text>
          </View>

          {materiasFiltradas.length ===
          0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor:
                    colores.tarjeta,

                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <Ionicons
                name="library-outline"
                size={42}
                color={
                  colorPrincipal
                }
              />

              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color:
                      colores.texto,

                    fontSize:
                      17 *
                      escalaTexto,
                  },
                ]}
              >
                No hay materias
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      colores.textoSecundario,

                    fontSize:
                      13 *
                      escalaTexto,
                  },
                ]}
              >
                Registra una
                materia o cambia
                los filtros.
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.cardsGrid,

                dosColumnas &&
                  styles.cardsColumns,
              ]}
            >
              {materiasFiltradas.map(
                (
                  materia
                ) => {
                  const activa =
                    materia.estado ===
                    'Activa';

                  const procesando =
                    cambiandoEstado ===
                    materia.id_materia;

                  const totalCursos =
                    Number(
                      materia.total_cursos ??
                        0
                    );

                  return (
                    <View
                      key={
                        materia.id_materia
                      }
                      style={[
                        styles.card,

                        dosColumnas &&
                          styles.cardColumn,

                        {
                          backgroundColor:
                            colores.tarjeta,

                          borderColor:
                            activa
                              ? colorPrincipal
                              : colores.borde,
                        },
                      ]}
                    >
                      <View
                        style={
                          styles.cardTop
                        }
                      >
                        <View
                          style={[
                            styles.cardIcon,
                            {
                              backgroundColor:
                                fondoSuave,

                              borderColor:
                                colores.borde,
                            },
                          ]}
                        >
                          <Ionicons
                            name="book-outline"
                            size={
                              25
                            }
                            color={
                              colorPrincipal
                            }
                          />
                        </View>

                        <View
                          style={[
                            styles.badge,
                            {
                              borderColor:
                                activa
                                  ? colores.exito
                                  : colores.borde,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color:
                                  activa
                                    ? colores.exito
                                    : colores.textoSecundario,

                                fontSize:
                                  10 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            {
                              materia.estado
                            }
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.cardTitle,
                          {
                            color:
                              colores.texto,

                            fontSize:
                              18 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {
                          materia.nombre
                        }
                      </Text>

                      <View
                        style={
                          styles.fieldRow
                        }
                      >
                        <Ionicons
                          name="shapes-outline"
                          size={
                            17
                          }
                          color={
                            colorPrincipal
                          }
                        />

                        <Text
                          style={[
                            styles.fieldText,
                            {
                              color:
                                colores.textoSecundario,

                              fontSize:
                                12 *
                                escalaTexto,
                            },
                          ]}
                        >
                          {
                            materia.campo_formativo
                          }
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.description,
                          {
                            color:
                              colores.textoSecundario,

                            fontSize:
                              12 *
                              escalaTexto,
                          },
                        ]}
                        numberOfLines={
                          3
                        }
                      >
                        {materia.descripcion ||
                          'Sin descripción registrada.'}
                      </Text>

                      <View
                        style={[
                          styles.courseBox,
                          {
                            backgroundColor:
                              colores.fondo,

                            borderColor:
                              colores.borde,
                          },
                        ]}
                      >
                        <Ionicons
                          name="albums-outline"
                          size={
                            17
                          }
                          color={
                            colores.textoSecundario
                          }
                        />

                        <Text
                          style={[
                            styles.courseText,
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
                            totalCursos
                          }{' '}
                          cursos
                          relacionados
                        </Text>
                      </View>

                      <View
                        style={
                          styles.actions
                        }
                      >
                        <TouchableOpacity
                          style={[
                            styles.editButton,
                            {
                              backgroundColor:
                                fondoSuave,

                              borderColor:
                                colorPrincipal,
                            },
                          ]}
                          onPress={() =>
                            abrirEdicion(
                              materia
                            )
                          }
                        >
                          <Ionicons
                            name="create-outline"
                            size={
                              18
                            }
                            color={
                              colorPrincipal
                            }
                          />

                          <Text
                            style={[
                              styles.actionText,
                              {
                                color:
                                  colorPrincipal,

                                fontSize:
                                  12 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            Editar
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.stateButton,
                            {
                              borderColor:
                                activa
                                  ? colores.peligro
                                  : colores.exito,
                            },
                          ]}
                          disabled={
                            procesando
                          }
                          onPress={() =>
                            confirmarCambioEstado(
                              materia
                            )
                          }
                        >
                          {procesando ? (
                            <ActivityIndicator
                              size="small"
                              color={
                                activa
                                  ? colores.peligro
                                  : colores.exito
                              }
                            />
                          ) : (
                            <>
                              <Ionicons
                                name={
                                  activa
                                    ? 'pause-circle-outline'
                                    : 'checkmark-circle-outline'
                                }
                                size={
                                  18
                                }
                                color={
                                  activa
                                    ? colores.peligro
                                    : colores.exito
                                }
                              />

                              <Text
                                style={[
                                  styles.actionText,
                                  {
                                    color:
                                      activa
                                        ? colores.peligro
                                        : colores.exito,

                                    fontSize:
                                      12 *
                                      escalaTexto,
                                  },
                                ]}
                              >
                                {activa
                                  ? 'Desactivar'
                                  : 'Activar'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomNavigation,
          {
            height:
              altoBarraInferior +
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
          style={
            styles.bottomContent
          }
        >
          <BottomNavigationItem
            icon="home-outline"
            activeIcon="home"
            label="Inicio"
            onPress={() =>
              router.push(
                '/inicio-admin' as any
              )
            }
          />

          <BottomNavigationItem
            icon="calendar-outline"
            activeIcon="calendar"
            label="Ciclos"
            onPress={() =>
              router.push(
                '/admin-ciclos' as any
              )
            }
          />

          <BottomNavigationItem
            icon="book-outline"
            activeIcon="book"
            label="Materias"
            active
            onPress={() => {}}
          />

          <BottomNavigationItem
            icon="people-outline"
            activeIcon="people"
            label="Grupos"
            onPress={() =>
              router.push(
                '/admin-grupos' as any
              )
            }
          />

          <BottomNavigationItem
            icon="grid-outline"
            activeIcon="grid"
            label="Cursos"
            onPress={() =>
              router.push(
                '/admin-cursos' as any
              )
            }
          />
        </View>
      </View>

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
        <KeyboardAvoidingView
          style={
            styles.modalKeyboard
          }
          behavior={
            Platform.OS ===
            'ios'
              ? 'padding'
              : 'height'
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <View
              style={[
                styles.modalCard,
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
                  styles.modalHeader
                }
              >
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      {
                        color:
                          colores.texto,

                        fontSize:
                          21 *
                          escalaTexto,
                      },
                    ]}
                  >
                    {materiaEditando
                      ? 'Editar materia'
                      : 'Nueva materia'}
                  </Text>

                  <Text
                    style={[
                      styles.modalSubtitle,
                      {
                        color:
                          colores.textoSecundario,

                        fontSize:
                          12 *
                          escalaTexto,
                      },
                    ]}
                  >
                    Completa los
                    campos.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor:
                        colores.fondo,

                      borderColor:
                        colores.borde,
                    },
                  ]}
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
                    size={23}
                    color={
                      colores.texto
                    }
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.formContent
                }
              >
                <Text
                  style={[
                    styles.label,
                    {
                      color:
                        colores.texto,

                      fontSize:
                        13 *
                        escalaTexto,
                    },
                  ]}
                >
                  Nombre de la
                  materia
                </Text>

                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor:
                        colores.fondo,

                      borderColor:
                        colores.borde,
                    },
                  ]}
                >
                  <Ionicons
                    name="book-outline"
                    size={20}
                    color={
                      colorPrincipal
                    }
                  />

                  <TextInput
                    style={[
                      styles.input,
                      {
                        color:
                          colores.texto,

                        fontSize:
                          14 *
                          escalaTexto,
                      },
                    ]}
                    value={
                      nombre
                    }
                    onChangeText={
                      setNombre
                    }
                    placeholder="Ej. Matemáticas"
                    placeholderTextColor={
                      colores.textoSecundario
                    }
                    maxLength={
                      120
                    }
                    editable={
                      !guardando
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.label,
                    {
                      color:
                        colores.texto,

                      fontSize:
                        13 *
                        escalaTexto,
                    },
                  ]}
                >
                  Campo formativo
                </Text>

                <TouchableOpacity
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor:
                        colores.fondo,

                      borderColor:
                        mostrarCamposFormativos
                          ? colorPrincipal
                          : colores.borde,
                    },
                  ]}
                  onPress={() =>
                    setMostrarCamposFormativos(
                      !mostrarCamposFormativos
                    )
                  }
                  disabled={
                    guardando
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Seleccionar campo formativo"
                  accessibilityHint="Abre la lista de campos formativos disponibles"
                  accessibilityState={{
                    expanded:
                      mostrarCamposFormativos,
                  }}
                >
                  <Ionicons
                    name="shapes-outline"
                    size={20}
                    color={
                      colorPrincipal
                    }
                  />

                  <Text
                    style={[
                      styles.selectText,
                      {
                        color:
                          campoFormativo
                            ? colores.texto
                            : colores.textoSecundario,

                        fontSize:
                          14 *
                          escalaTexto,
                      },
                    ]}
                    numberOfLines={
                      2
                    }
                  >
                    {campoFormativo ||
                      'Selecciona un campo formativo'}
                  </Text>

                  <Ionicons
                    name={
                      mostrarCamposFormativos
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={
                      20
                    }
                    color={
                      colores.textoSecundario
                    }
                  />
                </TouchableOpacity>

                {mostrarCamposFormativos && (
                  <View
                    style={[
                      styles.dropdown,
                      {
                        backgroundColor:
                          colores.tarjeta,

                        borderColor:
                          colores.borde,
                      },
                    ]}
                  >
                    {CAMPOS_FORMATIVOS.map(
                      (
                        campo,
                        index
                      ) => {
                        const seleccionado =
                          campoFormativo ===
                          campo;

                        return (
                          <TouchableOpacity
                            key={
                              campo
                            }
                            style={[
                              styles.dropdownOption,

                              index <
                                CAMPOS_FORMATIVOS.length -
                                  1 && {
                                borderBottomWidth:
                                  1,

                                borderBottomColor:
                                  colores.borde,
                              },

                              seleccionado && {
                                backgroundColor:
                                  fondoSuave,
                              },
                            ]}
                            onPress={() => {
                              setCampoFormativo(
                                campo
                              );

                              setMostrarCamposFormativos(
                                false
                              );
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={
                              campo
                            }
                            accessibilityState={{
                              selected:
                                seleccionado,
                            }}
                          >
                            <Text
                              style={[
                                styles.dropdownOptionText,
                                {
                                  color:
                                    seleccionado
                                      ? colorPrincipal
                                      : colores.texto,

                                  fontSize:
                                    13 *
                                    escalaTexto,
                                },
                              ]}
                            >
                              {
                                campo
                              }
                            </Text>

                            {seleccionado && (
                              <Ionicons
                                name="checkmark-circle"
                                size={
                                  21
                                }
                                color={
                                  colorPrincipal
                                }
                              />
                            )}
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                )}

                <View
                  style={
                    styles.labelRow
                  }
                >
                  <Text
                    style={[
                      styles.label,
                      {
                        color:
                          colores.texto,

                        fontSize:
                          13 *
                          escalaTexto,
                      },
                    ]}
                  >
                    Descripción
                  </Text>

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
                    {
                      descripcion.length
                    }
                    /1000
                  </Text>
                </View>

                <View
                  style={[
                    styles.textAreaBox,
                    {
                      backgroundColor:
                        colores.fondo,

                      borderColor:
                        colores.borde,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.textArea,
                      {
                        color:
                          colores.texto,

                        fontSize:
                          14 *
                          escalaTexto,
                      },
                    ]}
                    value={
                      descripcion
                    }
                    onChangeText={
                      setDescripcion
                    }
                    placeholder="Descripción de la materia"
                    placeholderTextColor={
                      colores.textoSecundario
                    }
                    maxLength={
                      1000
                    }
                    multiline
                    textAlignVertical="top"
                    editable={
                      !guardando
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.label,
                    {
                      color:
                        colores.texto,

                      fontSize:
                        13 *
                        escalaTexto,
                    },
                  ]}
                >
                  Estado
                </Text>

                <View
                  style={
                    styles.stateOptions
                  }
                >
                  {(
                    [
                      'Activa',
                      'Inactiva',
                    ] as EstadoMateria[]
                  ).map(
                    (
                      opcion
                    ) => {
                      const seleccionada =
                        estado ===
                        opcion;

                      const colorOpcion =
                        opcion ===
                        'Activa'
                          ? colores.exito
                          : colores.textoSecundario;

                      return (
                        <TouchableOpacity
                          key={
                            opcion
                          }
                          style={[
                            styles.stateOption,
                            {
                              backgroundColor:
                                seleccionada
                                  ? colores.fondo
                                  : colores.tarjeta,

                              borderColor:
                                seleccionada
                                  ? colorOpcion
                                  : colores.borde,
                            },
                          ]}
                          onPress={() =>
                            setEstado(
                              opcion
                            )
                          }
                          disabled={
                            guardando
                          }
                        >
                          <Ionicons
                            name={
                              opcion ===
                              'Activa'
                                ? 'checkmark-circle-outline'
                                : 'pause-circle-outline'
                            }
                            size={
                              20
                            }
                            color={
                              seleccionada
                                ? colorOpcion
                                : colores.textoSecundario
                            }
                          />

                          <Text
                            style={[
                              styles.stateOptionText,
                              {
                                color:
                                  seleccionada
                                    ? colorOpcion
                                    : colores.textoSecundario,

                                fontSize:
                                  12 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            {
                              opcion
                            }
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>

                <View
                  style={
                    styles.modalActions
                  }
                >
                  <TouchableOpacity
                    style={[
                      styles.cancelButton,
                      {
                        backgroundColor:
                          colores.fondo,

                        borderColor:
                          colores.borde,
                      },
                    ]}
                    onPress={
                      cerrarModal
                    }
                    disabled={
                      guardando
                    }
                  >
                    <Text
                      style={[
                        styles.cancelText,
                        {
                          color:
                            colores.texto,

                          fontSize:
                            13 *
                            escalaTexto,
                        },
                      ]}
                    >
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      {
                        backgroundColor:
                          colorPrincipal,

                        opacity:
                          guardando
                            ? 0.7
                            : 1,
                      },
                    ]}
                    onPress={
                      guardarMateria
                    }
                    disabled={
                      guardando
                    }
                  >
                    {guardando ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="save-outline"
                          size={
                            20
                          }
                          color="#FFFFFF"
                        />

                        <Text
                          style={[
                            styles.saveText,
                            {
                              fontSize:
                                13 *
                                escalaTexto,
                            },
                          ]}
                        >
                          Guardar
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

type BottomNavigationItemProps = {
  icon: IoniconName;
  activeIcon: IoniconName;
  label: string;
  active?: boolean;
  onPress: () => void;
};

function BottomNavigationItem({
  icon,
  activeIcon,
  label,
  active = false,
  onPress,
}: BottomNavigationItemProps) {
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
      accessibilityRole="button"
      accessibilityLabel={
        label
      }
      accessibilityState={{
        selected:
          active,
      }}
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
          size={22}
          color={
            active
              ? colores.primario
              : colores.textoSecundario
          }
        />
      </View>

      <Text
        numberOfLines={
          1
        }
        style={[
          styles.bottomLabel,

          {
            color:
              active
                ? colores.primario
                : colores.textoSecundario,

            fontSize:
              Math.min(
                10 *
                  escalaTexto,
                13
              ),
          },

          active &&
            styles.bottomLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },

    loading: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    loadingText: {
      marginTop:
        12,
      fontWeight:
        '600',
    },

    container: {
      flexGrow: 1,
      paddingHorizontal:
        20,
      paddingTop: 14,
      paddingBottom:
        42,
    },

    content: {
      width: '100%',
      maxWidth:
        980,
      alignSelf:
        'center',
    },

    topBar: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom:
        24,
    },

    circleButton: {
      width: 44,
      height: 44,
      borderRadius:
        22,
      borderWidth:
        1,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    header: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom:
        22,
    },

    headerIcon: {
      width: 66,
      height: 66,
      borderRadius:
        20,
      borderWidth:
        1,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight:
        15,
    },

    headerText: {
      flex: 1,
    },

    title: {
      fontWeight:
        '900',
    },

    subtitle: {
      marginTop:
        5,
      fontWeight:
        '500',
    },

    summaryCard: {
      minHeight:
        96,
      flexDirection:
        'row',
      alignItems:
        'center',
      borderWidth:
        1,
      borderRadius:
        20,
      paddingVertical:
        15,
      marginBottom:
        16,
    },

    summaryItem: {
      flex: 1,
      alignItems:
        'center',
    },

    summaryNumber: {
      fontWeight:
        '900',
    },

    summaryLabel: {
      marginTop:
        3,
      fontWeight:
        '700',
    },

    divider: {
      width: 1,
      height: 47,
    },

    newButton: {
      minHeight:
        54,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      borderRadius:
        15,
      marginBottom:
        15,
    },

    newButtonText: {
      color:
        '#FFFFFF',
      fontWeight:
        '900',
      marginLeft:
        8,
    },

    searchBox: {
      minHeight:
        52,
      flexDirection:
        'row',
      alignItems:
        'center',
      borderWidth:
        1,
      borderRadius:
        14,
      paddingHorizontal:
        14,
      marginBottom:
        12,
    },

    searchInput: {
      flex: 1,
      minHeight:
        48,
      marginHorizontal:
        10,
    },

    filters: {
      paddingBottom:
        18,
    },

    filterButton: {
      minHeight:
        40,
      justifyContent:
        'center',
      borderWidth:
        1,
      borderRadius:
        20,
      paddingHorizontal:
        18,
      marginRight:
        9,
    },

    filterText: {
      fontWeight:
        '800',
    },

    sectionHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginBottom:
        13,
    },

    sectionTitle: {
      fontWeight:
        '900',
    },

    resultText: {
      fontWeight:
        '600',
    },

    cardsGrid: {
      width:
        '100%',
    },

    cardsColumns: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      justifyContent:
        'space-between',
    },

    card: {
      width:
        '100%',
      borderWidth:
        1,
      borderRadius:
        19,
      padding:
        17,
      marginBottom:
        14,
    },

    cardColumn: {
      width:
        '49%',
    },

    cardTop: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginBottom:
        13,
    },

    cardIcon: {
      width:
        48,
      height:
        48,
      borderRadius:
        15,
      borderWidth:
        1,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    badge: {
      minHeight:
        30,
      justifyContent:
        'center',
      borderWidth:
        1,
      borderRadius:
        15,
      paddingHorizontal:
        10,
    },

    badgeText: {
      fontWeight:
        '900',
    },

    cardTitle: {
      fontWeight:
        '900',
      marginBottom:
        9,
    },

    fieldRow: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      marginBottom:
        10,
    },

    fieldText: {
      flex: 1,
      marginLeft:
        7,
      fontWeight:
        '700',
    },

    description: {
      minHeight:
        50,
      lineHeight:
        18,
      marginBottom:
        13,
    },

    courseBox: {
      minHeight:
        38,
      flexDirection:
        'row',
      alignItems:
        'center',
      borderWidth:
        1,
      borderRadius:
        11,
      paddingHorizontal:
        11,
      marginBottom:
        14,
    },

    courseText: {
      marginLeft:
        7,
      fontWeight:
        '700',
    },

    actions: {
      flexDirection:
        'row',
    },

    editButton: {
      minHeight:
        43,
      flex: 1,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      borderWidth:
        1,
      borderRadius:
        12,
      marginRight:
        5,
    },

    stateButton: {
      minHeight:
        43,
      flex: 1,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      borderWidth:
        1,
      borderRadius:
        12,
      marginLeft:
        5,
    },

    actionText: {
      marginLeft:
        5,
      fontWeight:
        '900',
    },

    emptyCard: {
      minHeight:
        220,
      alignItems:
        'center',
      justifyContent:
        'center',
      borderWidth:
        1,
      borderRadius:
        20,
      padding:
        25,
    },

    emptyTitle: {
      marginTop:
        14,
      fontWeight:
        '900',
    },

    emptyText: {
      marginTop:
        7,
      textAlign:
        'center',
    },

    modalKeyboard: {
      flex: 1,
    },

    modalOverlay: {
      flex: 1,
      justifyContent:
        'flex-end',
      backgroundColor:
        'rgba(15,23,42,0.58)',
    },

    modalCard: {
      width:
        '100%',
      maxWidth:
        680,
      maxHeight:
        '92%',
      alignSelf:
        'center',
      borderWidth:
        1,
      borderTopLeftRadius:
        27,
      borderTopRightRadius:
        27,
      paddingHorizontal:
        20,
      paddingTop:
        20,
    },

    modalHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      paddingBottom:
        14,
    },

    modalTitle: {
      fontWeight:
        '900',
    },

    modalSubtitle: {
      marginTop:
        4,
      fontWeight:
        '500',
    },

    closeButton: {
      width:
        42,
      height:
        42,
      borderWidth:
        1,
      borderRadius:
        21,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    formContent: {
      paddingBottom:
        28,
    },

    label: {
      marginTop:
        14,
      marginBottom:
        8,
      fontWeight:
        '800',
    },

    labelRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    counter: {
      marginTop:
        14,
      fontWeight:
        '600',
    },

    inputBox: {
      minHeight:
        54,
      flexDirection:
        'row',
      alignItems:
        'center',
      borderWidth:
        1,
      borderRadius:
        14,
      paddingHorizontal:
        14,
    },

    input: {
      flex: 1,
      minHeight:
        50,
      marginLeft:
        10,
    },

    selectText: {
      flex: 1,
      marginLeft:
        10,
      marginRight:
        8,
      paddingVertical:
        14,
      fontWeight:
        '500',
    },

    dropdown: {
      width:
        '100%',
      borderWidth:
        1,
      borderRadius:
        14,
      marginTop:
        7,
      overflow:
        'hidden',
    },

    dropdownOption: {
      minHeight:
        54,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      paddingHorizontal:
        15,
      paddingVertical:
        10,
    },

    dropdownOptionText: {
      flex: 1,
      fontWeight:
        '600',
      marginRight:
        10,
    },

    textAreaBox: {
      minHeight:
        120,
      borderWidth:
        1,
      borderRadius:
        14,
      paddingHorizontal:
        14,
      paddingVertical:
        10,
    },

    textArea: {
      minHeight:
        95,
    },

    stateOptions: {
      flexDirection:
        'row',
      marginTop:
        2,
    },

    stateOption: {
      flex: 1,
      minHeight:
        48,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      borderWidth:
        1,
      borderRadius:
        13,
      marginHorizontal:
        4,
    },

    stateOptionText: {
      marginLeft:
        7,
      fontWeight:
        '800',
    },

    modalActions: {
      flexDirection:
        'row',
      marginTop:
        25,
    },

    cancelButton: {
      minHeight:
        52,
      flex: 1,
      borderWidth:
        1,
      borderRadius:
        14,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight:
        5,
    },

    cancelText: {
      fontWeight:
        '900',
    },

    saveButton: {
      minHeight:
        52,
      flex:
        1.3,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      borderRadius:
        14,
      marginLeft:
        5,
    },

    saveText: {
      color:
        '#FFFFFF',
      fontWeight:
        '900',
      marginLeft:
        6,
    },

    bottomNavigation: {
      position:
        'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth:
        1,
      shadowColor:
        '#000000',
      shadowOffset: {
        width: 0,
        height: -3,
      },
      shadowOpacity:
        0.08,
      shadowRadius:
        10,
      elevation:
        12,
    },

    bottomContent: {
      flex: 1,
      width:
        '100%',
      maxWidth:
        520,
      alignSelf:
        'center',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-around',
    },

    bottomItem: {
      flex: 1,
      height:
        '100%',
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal:
        2,
    },

    bottomIconContainer: {
      minWidth:
        35,
      height:
        28,
      borderRadius:
        14,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    bottomLabel: {
      marginTop:
        2,
      fontWeight:
        '600',
    },

    bottomLabelActive: {
      fontWeight:
        '900',
    },
  });