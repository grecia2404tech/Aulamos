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
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type RecursoDocente = {
  id_recurso: number;
  id_actividad?: number | null;
  id_curso?: number | null;
  id_materia?: number | null;
  titulo: string;
  descripcion?: string | null;
  tipo: string;
  url_recurso?: string | null;
  archivo?: string | null;
  estado: string;
  fecha_publicacion?: string | null;
  materia?: string | null;
  curso?: string | null;
  grupo?: string | null;
  actividad_relacionada?: string | null;
};

type RespuestaRecursos = {
  mensaje?: string;
  total?: number;
  recursos?: RecursoDocente[];
};

type FiltroTipo =
  | 'Todos'
  | 'Video'
  | 'PDF'
  | 'Enlace'
  | 'Audio'
  | 'Otro';

const FILTROS: FiltroTipo[] = [
  'Todos',
  'Video',
  'PDF',
  'Enlace',
  'Audio',
  'Otro',
];

export default function RecursosDocenteScreen() {
  const {
    colores,
    escalaTexto,
    preferencias,
    leerTexto,
    detenerLectura,
  } = useAccessibility();

  const [recursos, setRecursos] = useState<
    RecursoDocente[]
  >([]);

  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] =
    useState<FiltroTipo>('Todos');

  const [cargando, setCargando] = useState(true);
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

  const cargarRecursos = useCallback(
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
          `${API_URL}/docente/recursos`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const texto = await respuesta.text();

        let resultado: RespuestaRecursos = {};

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
              'No se pudieron obtener los recursos.'
          );
        }

        const lista = Array.isArray(
          resultado.recursos
        )
          ? resultado.recursos
          : [];

        setRecursos(lista);

        anunciar(
          `Se encontraron ${lista.length} recursos.`
        );
      } catch (error) {
        console.error(
          'Error al cargar recursos:',
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
    [anunciar]
  );

  useFocusEffect(
    useCallback(() => {
      cargarRecursos();

      return () => {
        detenerLectura();
      };
    }, [cargarRecursos, detenerLectura])
  );

  const recursosFiltrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    return recursos.filter((recurso) => {
      const coincideTexto =
        !texto ||
        recurso.titulo
          .toLowerCase()
          .includes(texto) ||
        recurso.descripcion
          ?.toLowerCase()
          .includes(texto) ||
        recurso.materia
          ?.toLowerCase()
          .includes(texto) ||
        recurso.curso
          ?.toLowerCase()
          .includes(texto);

      const tipoNormalizado =
        recurso.tipo?.toLowerCase() ?? '';

      const coincideFiltro =
        filtro === 'Todos' ||
        tipoNormalizado ===
          filtro.toLowerCase() ||
        (filtro === 'Otro' &&
          ![
            'video',
            'pdf',
            'enlace',
            'audio',
          ].includes(tipoNormalizado));

      return coincideTexto && coincideFiltro;
    });
  }, [recursos, busqueda, filtro]);

  const obtenerIcono = (
    tipo: string
  ): keyof typeof Ionicons.glyphMap => {
    switch (tipo.toLowerCase()) {
      case 'video':
        return 'videocam-outline';

      case 'pdf':
        return 'document-text-outline';

      case 'enlace':
        return 'link-outline';

      case 'audio':
        return 'musical-notes-outline';

      default:
        return 'folder-open-outline';
    }
  };

  const abrirRecurso = async (
    recurso: RecursoDocente
  ) => {
    const direccion =
      recurso.url_recurso ||
      recurso.archivo;

    if (!direccion) {
      Alert.alert(
        'Recurso no disponible',
        'Este recurso no tiene una dirección o archivo disponible.'
      );

      return;
    }

    try {
      if (
        recurso.tipo.toLowerCase() === 'video'
      ) {
        router.push({
          pathname: '/reproductor-video',
          params: {
            url: direccion,
            titulo: recurso.titulo,
          },
        } as never);

        return;
      }

      if (
        recurso.tipo.toLowerCase() === 'pdf'
      ) {
        router.push({
          pathname: '/visor-documento',
          params: {
            url: direccion,
            titulo: recurso.titulo,
          },
        } as never);

        return;
      }

      const puedeAbrirse =
        await Linking.canOpenURL(direccion);

      if (!puedeAbrirse) {
        throw new Error(
          'No se puede abrir este recurso.'
        );
      }

      await Linking.openURL(direccion);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo abrir el recurso.'
      );
    }
  };

  const actualizar = () => {
    setActualizando(true);
    cargarRecursos(false);
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
            Mis recursos
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
            Consulta los recursos que publicaste
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
        <TouchableOpacity
          style={[
            styles.botonCrear,
            {
              backgroundColor: colores.primario,
            },
          ]}
          onPress={() =>
            router.push('/crear-recurso' as Href)
          }
          accessibilityRole="button"
          accessibilityLabel="Crear nuevo recurso"
        >
          <Ionicons
            name="add-circle-outline"
            size={22}
            color="#FFFFFF"
          />

          <Text
            style={[
              styles.textoCrear,
              {
                fontSize: 13 * escalaTexto,
              },
            ]}
          >
            Crear nuevo recurso
          </Text>
        </TouchableOpacity>

        <View
          style={[
            styles.buscador,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={colores.textoSecundario}
          />

          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar recurso..."
            placeholderTextColor={
              colores.textoSecundario
            }
            style={[
              styles.inputBusqueda,
              {
                color: colores.texto,
                fontSize: 12 * escalaTexto,
              },
            ]}
            accessibilityLabel="Buscar recurso"
          />

          {busqueda.length > 0 && (
            <TouchableOpacity
              onPress={() => setBusqueda('')}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={
                  colores.textoSecundario
                }
              />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.filtros
          }
        >
          {FILTROS.map((opcion) => {
            const seleccionado =
              filtro === opcion;

            return (
              <TouchableOpacity
                key={opcion}
                style={[
                  styles.filtro,
                  {
                    backgroundColor: seleccionado
                      ? colores.fondoPrimario
                      : colores.tarjeta,

                    borderColor: seleccionado
                      ? colores.primario
                      : colores.borde,
                  },
                ]}
                onPress={() => {
                  setFiltro(opcion);
                  anunciar(
                    `Filtro ${opcion}.`
                  );
                }}
                accessibilityRole="radio"
                accessibilityLabel={opcion}
                accessibilityState={{
                  checked: seleccionado,
                }}
              >
                <Text
                  style={[
                    styles.textoFiltro,
                    {
                      color: seleccionado
                        ? colores.primario
                        : colores.textoSecundario,
                      fontSize:
                        10 * escalaTexto,
                    },
                  ]}
                >
                  {opcion}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
                  fontSize:
                    13 * escalaTexto,
                },
              ]}
            >
              Cargando recursos...
            </Text>
          </View>
        ) : recursosFiltrados.length === 0 ? (
          <View
            style={[
              styles.estadoVacio,
              {
                backgroundColor:
                  colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <Ionicons
              name="folder-open-outline"
              size={45}
              color={colores.textoSecundario}
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
              No hay recursos
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
              Crea un recurso o cambia los filtros.
            </Text>
          </View>
        ) : (
          recursosFiltrados.map((recurso) => (
            <TouchableOpacity
              key={recurso.id_recurso}
              style={[
                styles.tarjetaRecurso,
                {
                  backgroundColor:
                    colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
              onPress={() =>
                abrirRecurso(recurso)
              }
              accessibilityRole="button"
              accessibilityLabel={`${recurso.titulo}. Tipo ${recurso.tipo}. Materia ${recurso.materia ?? 'sin materia'}.`}
              accessibilityHint="Abre el recurso"
            >
              <View
                style={[
                  styles.iconoRecurso,
                  {
                    backgroundColor:
                      colores.fondoPrimario,
                  },
                ]}
              >
                <Ionicons
                  name={obtenerIcono(
                    recurso.tipo
                  )}
                  size={26}
                  color={colores.primario}
                />
              </View>

              <View
                style={
                  styles.informacionRecurso
                }
              >
                <Text
                  style={[
                    styles.tituloRecurso,
                    {
                      color: colores.texto,
                      fontSize:
                        14 * escalaTexto,
                    },
                  ]}
                >
                  {recurso.titulo}
                </Text>

                <Text
                  style={[
                    styles.detalleRecurso,
                    {
                      color:
                        colores.textoSecundario,
                      fontSize:
                        10 * escalaTexto,
                    },
                  ]}
                >
                  {recurso.tipo}
                  {recurso.materia
                    ? ` · ${recurso.materia}`
                    : ''}
                </Text>

                {recurso.curso && (
                  <Text
                    style={[
                      styles.detalleRecurso,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          10 * escalaTexto,
                      },
                    ]}
                  >
                    {recurso.curso}
                    {recurso.grupo
                      ? ` · ${recurso.grupo}`
                      : ''}
                  </Text>
                )}

                {recurso.actividad_relacionada ? (
                  <View
                    style={[
                      styles.insigniaActividad,
                      {
                        backgroundColor:
                          colores.fondoPrimario,
                      },
                    ]}
                  >
                    <Ionicons
                      name="link-outline"
                      size={13}
                      color={colores.primario}
                    />

                    <Text
                      style={[
                        styles.textoActividad,
                        {
                          color:
                            colores.primario,
                          fontSize:
                            9 * escalaTexto,
                        },
                      ]}
                    >
                      {
                        recurso.actividad_relacionada
                      }
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.sinActividad,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          9 * escalaTexto,
                      },
                    ]}
                  >
                    Sin actividad relacionada
                  </Text>
                )}
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={colores.textoSecundario}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
    borderBottomWidth:
      StyleSheet.hairlineWidth,
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
    padding: 14,
    paddingBottom: 35,
  },

  botonCrear: {
    minHeight: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    marginBottom: 13,
  },

  textoCrear: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  buscador: {
    minHeight: 47,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputBusqueda: {
    flex: 1,
    minHeight: 45,
    marginHorizontal: 8,
  },

  filtros: {
    columnGap: 7,
    paddingVertical: 11,
  },

  filtro: {
    minHeight: 33,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoFiltro: {
    fontWeight: '800',
  },

  cargando: {
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoCargando: {
    marginTop: 11,
  },

  tarjetaRecurso: {
    minHeight: 102,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoRecurso: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  informacionRecurso: {
    flex: 1,
    marginHorizontal: 11,
  },

  tituloRecurso: {
    fontWeight: '900',
  },

  detalleRecurso: {
    marginTop: 4,
  },

  insigniaActividad: {
    alignSelf: 'flex-start',
    minHeight: 25,
    borderRadius: 8,
    paddingHorizontal: 7,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },

  textoActividad: {
    fontWeight: '800',
  },

  sinActividad: {
    marginTop: 7,
    fontStyle: 'italic',
  },

  estadoVacio: {
    minHeight: 220,
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
});