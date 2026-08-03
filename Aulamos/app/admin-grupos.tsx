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

import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type EstadoGrupo =
  | 'Activo'
  | 'Inactivo';

type FiltroEstado =
  | 'Todos'
  | EstadoGrupo;

type Turno =
  | 'Matutino'
  | 'Vespertino'
  | 'Mixto';

type Modalidad =
  | 'Presencial'
  | 'Hibrida'
  | 'Virtual';

type Grupo = {
  id_grupo: number;
  nombre: string;
  grado: number;
  turno: Turno;
  modalidad: Modalidad;
  cupo: number;
  estado: EstadoGrupo;
  total_cursos?: number | string;
};

type RespuestaApi = {
  mensaje?: string;
  campo?: string;
  grupos?: Grupo[];
  grupo?: Grupo;
};

const TURNOS: Turno[] = [
  'Matutino',
  'Vespertino',
  'Mixto',
];

const MODALIDADES: Modalidad[] = [
  'Presencial',
  'Hibrida',
  'Virtual',
];

const GRADOS = [1, 2, 3];

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

export default function AdminGruposScreen() {
  const { width } =
    useWindowDimensions();

  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const [grupos, setGrupos] =
    useState<Grupo[]>([]);

  const [busqueda, setBusqueda] =
    useState('');

  const [
    filtroEstado,
    setFiltroEstado,
  ] = useState<FiltroEstado>(
    'Todos'
  );

  const [cargando, setCargando] =
    useState(true);

  const [
    actualizando,
    setActualizando,
  ] = useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [
    cambiandoEstado,
    setCambiandoEstado,
  ] = useState<number | null>(null);

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    grupoEditando,
    setGrupoEditando,
  ] = useState<Grupo | null>(null);

  const [nombre, setNombre] =
    useState('');

  const [grado, setGrado] =
    useState(1);

  const [turno, setTurno] =
    useState<Turno>('Matutino');

  const [
    modalidad,
    setModalidad,
  ] = useState<Modalidad>(
    'Presencial'
  );

  const [cupo, setCupo] =
    useState('30');

  const [estado, setEstado] =
    useState<EstadoGrupo>(
      'Activo'
    );

  const altoContraste =
    preferencias.altoContraste;

  const temaOscuro =
    preferencias.modoOscuro ||
    altoContraste;

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

  const gruposFiltrados =
    useMemo(() => {
      const termino = busqueda
        .trim()
        .toLocaleLowerCase('es');

      return grupos.filter(
        (grupo) => {
          const coincideEstado =
            filtroEstado ===
              'Todos' ||
            grupo.estado ===
              filtroEstado;

          if (!coincideEstado) {
            return false;
          }

          if (!termino) {
            return true;
          }

          const informacion = [
            grupo.nombre,
            `${grupo.grado}`,
            grupo.turno,
            grupo.modalidad,
          ]
            .join(' ')
            .toLocaleLowerCase('es');

          return informacion.includes(
            termino
          );
        }
      );
    }, [
      grupos,
      busqueda,
      filtroEstado,
    ]);

  const resumen = useMemo(
    () => ({
      total: grupos.length,

      activos:
        grupos.filter(
          (grupo) =>
            grupo.estado ===
            'Activo'
        ).length,

      inactivos:
        grupos.filter(
          (grupo) =>
            grupo.estado ===
            'Inactivo'
        ).length,
    }),
    [grupos]
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

      router.replace('/' as any);
    };

  const cargarGrupos = async (
    mostrarCarga = true
  ) => {
    try {
      if (mostrarCarga) {
        setCargando(true);
      }

      const token =
        await AsyncStorage.getItem(
          'token'
        );

      if (!token) {
        await manejarSesionInvalida();
        return;
      }

      const respuesta = await fetch(
        `${API_URL}/academico/grupos`,
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
        respuesta.status === 401
      ) {
        await manejarSesionInvalida();
        return;
      }

      if (
        respuesta.status === 403
      ) {
        Alert.alert(
          'Acceso restringido',
          datos.mensaje ||
            'Solo un administrador puede consultar los grupos.'
        );

        router.back();
        return;
      }

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            'No fue posible cargar los grupos.'
        );
      }

      setGrupos(
        datos.grupos ?? []
      );
    } catch (error) {
      console.error(
        'Error al cargar grupos:',
        error
      );

      Alert.alert(
        'No se pudieron cargar los grupos',
        error instanceof Error
          ? error.message
          : 'Verifica la conexión con la API.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    cargarGrupos();
  }, []);

  const actualizar = () => {
    setActualizando(true);
    cargarGrupos(false);
  };

  const limpiarFormulario = () => {
    setNombre('');
    setGrado(1);
    setTurno('Matutino');
    setModalidad('Presencial');
    setCupo('30');
    setEstado('Activo');
    setGrupoEditando(null);
  };

  const abrirNuevoGrupo = () => {
    limpiarFormulario();
    setModalVisible(true);
  };

  const abrirEdicion = (
    grupo: Grupo
  ) => {
    setGrupoEditando(grupo);
    setNombre(grupo.nombre);
    setGrado(Number(grupo.grado));
    setTurno(grupo.turno);
    setModalidad(grupo.modalidad);
    setCupo(String(grupo.cupo));
    setEstado(grupo.estado);
    setModalVisible(true);
  };

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setModalVisible(false);
    limpiarFormulario();
  };

  const validarFormulario = () => {
    const nombreLimpio =
      limpiarTexto(nombre);

    const cupoNumero =
      Number(cupo);

    if (!nombreLimpio) {
      Alert.alert(
        'Nombre requerido',
        'Escribe el nombre del grupo.'
      );

      return false;
    }

    if (
      nombreLimpio.length > 50
    ) {
      Alert.alert(
        'Nombre no válido',
        'El nombre no puede superar los 50 caracteres.'
      );

      return false;
    }

    if (
      !Number.isInteger(cupoNumero) ||
      cupoNumero < 1 ||
      cupoNumero > 100
    ) {
      Alert.alert(
        'Cupo no válido',
        'El cupo debe ser un número entre 1 y 100.'
      );

      return false;
    }

    return true;
  };

  const guardarGrupo = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setGuardando(true);

      const token =
        await AsyncStorage.getItem(
          'token'
        );

      if (!token) {
        await manejarSesionInvalida();
        return;
      }

      const esEdicion =
        grupoEditando !== null;

      const url = esEdicion
        ? `${API_URL}/academico/grupos/${grupoEditando.id_grupo}`
        : `${API_URL}/academico/grupos`;

      const respuesta =
        await fetch(url, {
          method: esEdicion
            ? 'PUT'
            : 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            nombre:
              limpiarTexto(nombre),

            grado,
            turno,
            modalidad,
            cupo: Number(cupo),
            estado,
          }),
        });

      const datos =
        await leerRespuesta(
          respuesta
        );

      if (
        respuesta.status === 401
      ) {
        await manejarSesionInvalida();
        return;
      }

      if (!respuesta.ok) {
        Alert.alert(
          'No se pudo guardar',
          datos.mensaje ||
            'Revisa la información ingresada.'
        );

        return;
      }

      setModalVisible(false);
      limpiarFormulario();

      Alert.alert(
        'Operación correcta',
        datos.mensaje ||
          'El grupo fue guardado.'
      );

      await cargarGrupos(false);
    } catch (error) {
      console.error(
        'Error al guardar grupo:',
        error
      );

      Alert.alert(
        'Error de conexión',
        'No fue posible comunicarse con la API.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoGrupo =
    async (
      grupo: Grupo,
      nuevoEstado: EstadoGrupo
    ) => {
      try {
        setCambiandoEstado(
          grupo.id_grupo
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
            `${API_URL}/academico/grupos/${grupo.id_grupo}/estado`,
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                estado:
                  nuevoEstado,
              }),
            }
          );

        const datos =
          await leerRespuesta(
            respuesta
          );

        if (
          respuesta.status === 401
        ) {
          await manejarSesionInvalida();
          return;
        }

        if (!respuesta.ok) {
          Alert.alert(
            'No se pudo cambiar el estado',
            datos.mensaje ||
              'Inténtalo nuevamente.'
          );

          return;
        }

        await cargarGrupos(false);
      } catch (error) {
        console.error(
          'Error al cambiar estado:',
          error
        );

        Alert.alert(
          'Error de conexión',
          'No fue posible comunicarse con la API.'
        );
      } finally {
        setCambiandoEstado(null);
      }
    };

  const confirmarCambioEstado = (
    grupo: Grupo
  ) => {
    const nuevoEstado:
      EstadoGrupo =
        grupo.estado === 'Activo'
          ? 'Inactivo'
          : 'Activo';

    Alert.alert(
      nuevoEstado === 'Activo'
        ? 'Activar grupo'
        : 'Desactivar grupo',

      `¿Deseas cambiar el grupo “${grupo.grado}° ${grupo.nombre}” al estado ${nuevoEstado}?`,

      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',

          style:
            nuevoEstado ===
            'Inactivo'
              ? 'destructive'
              : 'default',

          onPress: () =>
            cambiarEstadoGrupo(
              grupo,
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
          color={colorPrincipal}
        />

        <Text
          style={{
            color:
              colores.textoSecundario,

            fontSize:
              14 * escalaTexto,

            marginTop: 12,
          }}
        >
          Cargando grupos...
        </Text>
      </SafeAreaView>
    );
  }

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
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizar}
            colors={[colorPrincipal]}
            tintColor={colorPrincipal}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.topBar}>
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
                color={colores.texto}
              />
            </TouchableOpacity>

            <BotonAccesibilidad />
          </View>

          <View style={styles.header}>
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
                name="people-outline"
                size={34}
                color={colorPrincipal}
              />
            </View>

            <View style={{ flex: 1 }}>
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
                Grupos
              </Text>

              <Text
                style={{
                  color:
                    colores.textoSecundario,

                  fontSize:
                    14 *
                    escalaTexto,

                  marginTop: 5,
                }}
              >
                Administra los grupos,
                turnos y cupos escolares.
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
            {[
              {
                etiqueta: 'Total',
                valor: resumen.total,
                color: colorPrincipal,
              },
              {
                etiqueta: 'Activos',
                valor: resumen.activos,
                color: colores.exito,
              },
              {
                etiqueta: 'Inactivos',
                valor:
                  resumen.inactivos,

                color:
                  colores.textoSecundario,
              },
            ].map(
              (elemento, indice) => (
                <View
                  key={
                    elemento.etiqueta
                  }
                  style={
                    styles.summarySection
                  }
                >
                  {indice > 0 ? (
                    <View
                      style={[
                        styles.divider,
                        {
                          backgroundColor:
                            colores.borde,
                        },
                      ]}
                    />
                  ) : null}

                  <View
                    style={
                      styles.summaryItem
                    }
                  >
                    <Text
                      style={{
                        color:
                          elemento.color,

                        fontSize:
                          23 *
                          escalaTexto,

                        fontWeight:
                          '900',
                      }}
                    >
                      {elemento.valor}
                    </Text>

                    <Text
                      style={{
                        color:
                          colores.textoSecundario,

                        fontSize:
                          11 *
                          escalaTexto,

                        fontWeight:
                          '700',
                      }}
                    >
                      {
                        elemento.etiqueta
                      }
                    </Text>
                  </View>
                </View>
              )
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.newButton,
              {
                backgroundColor:
                  colorPrincipal,
              },
            ]}
            onPress={abrirNuevoGrupo}
            accessibilityRole="button"
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
              Nuevo grupo
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
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar grupo, turno o modalidad"
              placeholderTextColor={
                colores.textoSecundario
              }
            />

            {busqueda ? (
              <TouchableOpacity
                onPress={() =>
                  setBusqueda('')
                }
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
                'Todos',
                'Activo',
                'Inactivo',
              ] as FiltroEstado[]
            ).map((opcion) => {
              const seleccionada =
                filtroEstado === opcion;

              return (
                <TouchableOpacity
                  key={opcion}
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
                    style={{
                      color:
                        seleccionada
                          ? colorPrincipal
                          : colores.textoSecundario,

                      fontSize:
                        12 *
                        escalaTexto,

                      fontWeight:
                        '800',
                    }}
                  >
                    {opcion}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View
            style={
              styles.sectionHeader
            }
          >
            <Text
              style={{
                color: colores.texto,
                fontSize:
                  19 * escalaTexto,
                fontWeight: '900',
              }}
            >
              Grupos registrados
            </Text>

            <Text
              style={{
                color:
                  colores.textoSecundario,

                fontSize:
                  12 * escalaTexto,
              }}
            >
              {
                gruposFiltrados.length
              }{' '}
              resultados
            </Text>
          </View>

          {gruposFiltrados.length ===
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
                name="people-outline"
                size={44}
                color={colorPrincipal}
              />

              <Text
                style={{
                  color: colores.texto,
                  fontSize:
                    17 * escalaTexto,
                  fontWeight: '900',
                  marginTop: 13,
                }}
              >
                No hay grupos
              </Text>

              <Text
                style={{
                  color:
                    colores.textoSecundario,

                  fontSize:
                    13 * escalaTexto,

                  marginTop: 7,
                  textAlign: 'center',
                }}
              >
                Registra un grupo o
                cambia los filtros.
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
              {gruposFiltrados.map(
                (grupo) => {
                  const activo =
                    grupo.estado ===
                    'Activo';

                  const procesando =
                    cambiandoEstado ===
                    grupo.id_grupo;

                  return (
                    <View
                      key={grupo.id_grupo}
                      style={[
                        styles.card,

                        dosColumnas &&
                          styles.cardColumn,

                        {
                          backgroundColor:
                            colores.tarjeta,

                          borderColor:
                            activo
                              ? colorPrincipal
                              : colores.borde,
                        },
                      ]}
                    >
                      <View
                        style={styles.cardTop}
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
                            name="school-outline"
                            size={25}
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
                                activo
                                  ? colores.exito
                                  : colores.borde,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color:
                                activo
                                  ? colores.exito
                                  : colores.textoSecundario,

                              fontSize:
                                10 *
                                escalaTexto,

                              fontWeight:
                                '900',
                            }}
                          >
                            {grupo.estado}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={{
                          color:
                            colores.texto,

                          fontSize:
                            20 *
                            escalaTexto,

                          fontWeight:
                            '900',

                          marginBottom: 12,
                        }}
                      >
                        {grupo.grado}°{' '}
                        {grupo.nombre}
                      </Text>

                      <View
                        style={
                          styles.dataRow
                        }
                      >
                        <Ionicons
                          name="time-outline"
                          size={18}
                          color={
                            colorPrincipal
                          }
                        />

                        <Text
                          style={[
                            styles.dataText,
                            {
                              color:
                                colores.textoSecundario,

                              fontSize:
                                12 *
                                escalaTexto,
                            },
                          ]}
                        >
                          Turno:{' '}
                          {grupo.turno}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.dataRow
                        }
                      >
                        <Ionicons
                          name="business-outline"
                          size={18}
                          color={
                            colorPrincipal
                          }
                        />

                        <Text
                          style={[
                            styles.dataText,
                            {
                              color:
                                colores.textoSecundario,

                              fontSize:
                                12 *
                                escalaTexto,
                            },
                          ]}
                        >
                          Modalidad:{' '}
                          {grupo.modalidad}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.dataRow
                        }
                      >
                        <Ionicons
                          name="person-add-outline"
                          size={18}
                          color={
                            colorPrincipal
                          }
                        />

                        <Text
                          style={[
                            styles.dataText,
                            {
                              color:
                                colores.textoSecundario,

                              fontSize:
                                12 *
                                escalaTexto,
                            },
                          ]}
                        >
                          Cupo: {grupo.cupo}{' '}
                          estudiantes
                        </Text>
                      </View>

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
                          size={17}
                          color={
                            colores.textoSecundario
                          }
                        />

                        <Text
                          style={{
                            color:
                              colores.textoSecundario,

                            fontSize:
                              11 *
                              escalaTexto,

                            fontWeight:
                              '700',

                            marginLeft: 7,
                          }}
                        >
                          {Number(
                            grupo.total_cursos ??
                              0
                          )}{' '}
                          cursos relacionados
                        </Text>
                      </View>

                      <View
                        style={styles.actions}
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
                              grupo
                            )
                          }
                        >
                          <Ionicons
                            name="create-outline"
                            size={18}
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
                                activo
                                  ? colores.peligro
                                  : colores.exito,
                            },
                          ]}
                          disabled={
                            procesando
                          }
                          onPress={() =>
                            confirmarCambioEstado(
                              grupo
                            )
                          }
                        >
                          {procesando ? (
                            <ActivityIndicator
                              size="small"
                              color={
                                activo
                                  ? colores.peligro
                                  : colores.exito
                              }
                            />
                          ) : (
                            <>
                              <Ionicons
                                name={
                                  activo
                                    ? 'pause-circle-outline'
                                    : 'checkmark-circle-outline'
                                }
                                size={18}
                                color={
                                  activo
                                    ? colores.peligro
                                    : colores.exito
                                }
                              />

                              <Text
                                style={[
                                  styles.actionText,
                                  {
                                    color:
                                      activo
                                        ? colores.peligro
                                        : colores.exito,

                                    fontSize:
                                      12 *
                                      escalaTexto,
                                  },
                                ]}
                              >
                                {activo
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

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.OS === 'ios'
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
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color:
                        colores.texto,

                      fontSize:
                        21 *
                        escalaTexto,

                      fontWeight:
                        '900',
                    }}
                  >
                    {grupoEditando
                      ? 'Editar grupo'
                      : 'Nuevo grupo'}
                  </Text>

                  <Text
                    style={{
                      color:
                        colores.textoSecundario,

                      fontSize:
                        12 *
                        escalaTexto,

                      marginTop: 4,
                    }}
                  >
                    Completa la información
                    escolar.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.circleButton,
                    {
                      backgroundColor:
                        colores.fondo,

                      borderColor:
                        colores.borde,
                    },
                  ]}
                  onPress={cerrarModal}
                  disabled={guardando}
                >
                  <Ionicons
                    name="close"
                    size={23}
                    color={colores.texto}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={{
                  paddingBottom: 28,
                }}
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
                  Nombre del grupo
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
                    name="people-outline"
                    size={20}
                    color={colorPrincipal}
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
                    value={nombre}
                    onChangeText={setNombre}
                    placeholder="Ej. A"
                    placeholderTextColor={
                      colores.textoSecundario
                    }
                    maxLength={50}
                    editable={!guardando}
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
                  Grado escolar
                </Text>

                <View
                  style={
                    styles.optionsRow
                  }
                >
                  {GRADOS.map(
                    (opcion) => (
                      <TouchableOpacity
                        key={opcion}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor:
                              grado ===
                              opcion
                                ? fondoSuave
                                : colores.fondo,

                            borderColor:
                              grado ===
                              opcion
                                ? colorPrincipal
                                : colores.borde,
                          },
                        ]}
                        onPress={() =>
                          setGrado(
                            opcion
                          )
                        }
                        disabled={guardando}
                      >
                        <Text
                          style={{
                            color:
                              grado ===
                              opcion
                                ? colorPrincipal
                                : colores.textoSecundario,

                            fontSize:
                              13 *
                              escalaTexto,

                            fontWeight:
                              '900',
                          }}
                        >
                          {opcion}°
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
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
                  Turno
                </Text>

                <View
                  style={
                    styles.optionsWrap
                  }
                >
                  {TURNOS.map(
                    (opcion) => (
                      <TouchableOpacity
                        key={opcion}
                        style={[
                          styles.selectionButton,
                          {
                            backgroundColor:
                              turno ===
                              opcion
                                ? fondoSuave
                                : colores.fondo,

                            borderColor:
                              turno ===
                              opcion
                                ? colorPrincipal
                                : colores.borde,
                          },
                        ]}
                        onPress={() =>
                          setTurno(
                            opcion
                          )
                        }
                        disabled={guardando}
                      >
                        <Text
                          style={{
                            color:
                              turno ===
                              opcion
                                ? colorPrincipal
                                : colores.textoSecundario,

                            fontSize:
                              12 *
                              escalaTexto,

                            fontWeight:
                              '800',
                          }}
                        >
                          {opcion}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
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
                  Modalidad
                </Text>

                <View
                  style={
                    styles.optionsWrap
                  }
                >
                  {MODALIDADES.map(
                    (opcion) => (
                      <TouchableOpacity
                        key={opcion}
                        style={[
                          styles.selectionButton,
                          {
                            backgroundColor:
                              modalidad ===
                              opcion
                                ? fondoSuave
                                : colores.fondo,

                            borderColor:
                              modalidad ===
                              opcion
                                ? colorPrincipal
                                : colores.borde,
                          },
                        ]}
                        onPress={() =>
                          setModalidad(
                            opcion
                          )
                        }
                        disabled={guardando}
                      >
                        <Text
                          style={{
                            color:
                              modalidad ===
                              opcion
                                ? colorPrincipal
                                : colores.textoSecundario,

                            fontSize:
                              12 *
                              escalaTexto,

                            fontWeight:
                              '800',
                          }}
                        >
                          {opcion}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
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
                  Cupo máximo
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
                    name="person-add-outline"
                    size={20}
                    color={colorPrincipal}
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
                    value={cupo}
                    onChangeText={(valor) =>
                      setCupo(
                        valor.replace(
                          /[^0-9]/g,
                          ''
                        )
                      )
                    }
                    placeholder="Ej. 30"
                    placeholderTextColor={
                      colores.textoSecundario
                    }
                    keyboardType="number-pad"
                    maxLength={3}
                    editable={!guardando}
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
                    styles.optionsRow
                  }
                >
                  {(
                    [
                      'Activo',
                      'Inactivo',
                    ] as EstadoGrupo[]
                  ).map((opcion) => {
                    const seleccionada =
                      estado === opcion;

                    const color =
                      opcion === 'Activo'
                        ? colores.exito
                        : colores.textoSecundario;

                    return (
                      <TouchableOpacity
                        key={opcion}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor:
                              seleccionada
                                ? colores.fondo
                                : colores.tarjeta,

                            borderColor:
                              seleccionada
                                ? color
                                : colores.borde,
                          },
                        ]}
                        onPress={() =>
                          setEstado(opcion)
                        }
                        disabled={guardando}
                      >
                        <Text
                          style={{
                            color:
                              seleccionada
                                ? color
                                : colores.textoSecundario,

                            fontSize:
                              12 *
                              escalaTexto,

                            fontWeight:
                              '900',
                          }}
                        >
                          {opcion}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
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
                    onPress={cerrarModal}
                    disabled={guardando}
                  >
                    <Text
                      style={{
                        color:
                          colores.texto,

                        fontSize:
                          13 *
                          escalaTexto,

                        fontWeight:
                          '900',
                      }}
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
                    onPress={guardarGrupo}
                    disabled={guardando}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 42,
  },

  content: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 24,
  },

  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  headerIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  title: {
    fontWeight: '900',
  },

  summaryCard: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 15,
    marginBottom: 16,
  },

  summarySection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  divider: {
    width: 1,
    height: 47,
  },

  newButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    marginBottom: 15,
  },

  newButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 8,
  },

  searchBox: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    minHeight: 48,
    marginHorizontal: 10,
  },

  filters: {
    paddingBottom: 18,
  },

  filterButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    marginRight: 9,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  cardsGrid: {
    width: '100%',
  },

  cardsColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent:
      'space-between',
  },

  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 19,
    padding: 17,
    marginBottom: 14,
  },

  cardColumn: {
    width: '49%',
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    minHeight: 30,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 10,
  },

  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  dataText: {
    flex: 1,
    marginLeft: 8,
    fontWeight: '700',
  },

  courseBox: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 11,
    marginTop: 5,
    marginBottom: 14,
  },

  actions: {
    flexDirection: 'row',
  },

  editButton: {
    minHeight: 43,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginRight: 5,
  },

  stateButton: {
    minHeight: 43,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginLeft: 5,
  },

  actionText: {
    marginLeft: 5,
    fontWeight: '900',
  },

  emptyCard: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 25,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor:
      'rgba(15,23,42,0.58)',
  },

  modalCard: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '92%',
    alignSelf: 'center',
    borderWidth: 1,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingBottom: 14,
  },

  label: {
    marginTop: 15,
    marginBottom: 8,
    fontWeight: '800',
  },

  inputBox: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },

  input: {
    flex: 1,
    minHeight: 50,
    marginLeft: 10,
  },

  optionsRow: {
    flexDirection: 'row',
  },

  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  optionButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
    marginHorizontal: 4,
  },

  selectionButton: {
    minHeight: 46,
    minWidth: 105,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
    margin: 4,
    paddingHorizontal: 12,
  },

  modalActions: {
    flexDirection: 'row',
    marginTop: 25,
  },

  cancelButton: {
    minHeight: 52,
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },

  saveButton: {
    minHeight: 52,
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    marginLeft: 5,
  },

  saveText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 6,
  },
});