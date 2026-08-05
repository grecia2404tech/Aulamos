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
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

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
  | 'Documento'
  | 'Enlace'
  | 'Audio'
  | 'Otro';

const FILTROS: FiltroTipo[] = [
  'Todos',
  'Video',
  'PDF',
  'Documento',
  'Enlace',
  'Audio',
  'Otro',
];

export default function RecursosDocenteScreen() {
  const insets = useSafeAreaInsets();

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
  `${API_URL}/academico/recursos/mis-recursos-docente`,
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

        const disponibles = lista.filter(
          (recurso) => !recurso.id_actividad
        ).length;

        const enUso = lista.filter(
          (recurso) => Boolean(recurso.id_actividad)
        ).length;

        anunciar(
          `Se encontraron ${lista.length} recursos. ${disponibles} disponibles y ${enUso} en uso.`
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
    const textoBusqueda = busqueda
      .trim()
      .toLowerCase();

    return recursos.filter((recurso) => {
      const titulo =
        recurso.titulo?.toLowerCase() ?? '';

      const descripcion =
        recurso.descripcion?.toLowerCase() ?? '';

      const materia =
        recurso.materia?.toLowerCase() ?? '';

      const curso =
        recurso.curso?.toLowerCase() ?? '';

      const actividad =
        recurso.actividad_relacionada?.toLowerCase() ??
        '';

      const coincideTexto =
        !textoBusqueda ||
        titulo.includes(textoBusqueda) ||
        descripcion.includes(textoBusqueda) ||
        materia.includes(textoBusqueda) ||
        curso.includes(textoBusqueda) ||
        actividad.includes(textoBusqueda);

      const tipoNormalizado =
        recurso.tipo?.toLowerCase() ?? '';

      const tiposConocidos = [
        'video',
        'pdf',
        'documento',
        'enlace',
        'audio',
      ];

      const coincideFiltro =
        filtro === 'Todos' ||
        tipoNormalizado ===
          filtro.toLowerCase() ||
        (filtro === 'Otro' &&
          !tiposConocidos.includes(tipoNormalizado));

      return coincideTexto && coincideFiltro;
    });
  }, [recursos, busqueda, filtro]);

  const resumenRecursos = useMemo(() => {
    const disponibles = recursos.filter(
      (recurso) => !recurso.id_actividad
    ).length;

    const enUso = recursos.filter(
      (recurso) => Boolean(recurso.id_actividad)
    ).length;

    return {
      total: recursos.length,
      disponibles,
      enUso,
    };
  }, [recursos]);

  const obtenerIcono = (
    tipo: string
  ): keyof typeof Ionicons.glyphMap => {
    switch (tipo.toLowerCase()) {
      case 'video':
        return 'videocam-outline';

      case 'pdf':
        return 'document-text-outline';

      case 'documento':
        return 'document-outline';

      case 'enlace':
        return 'link-outline';

      case 'audio':
        return 'musical-notes-outline';

      default:
        return 'folder-open-outline';
    }
  };

  const formatearFecha = (
    fecha?: string | null
  ) => {
    if (!fecha) {
      return 'Fecha no disponible';
    }

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
      return 'Fecha no disponible';
    }

    return valor.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const abrirRecurso = async (
    recurso: RecursoDocente
  ) => {
    const direccion =
      recurso.url_recurso || recurso.archivo;

    if (!direccion) {
      Alert.alert(
        'Recurso no disponible',
        'Este recurso no tiene un archivo o una dirección disponible.'
      );

      anunciar(
        'El recurso seleccionado no está disponible.'
      );

      return;
    }

    try {
      anunciar(
        `Abriendo recurso ${recurso.titulo}.`
      );

      const tipoNormalizado =
        recurso.tipo.toLowerCase();

      if (tipoNormalizado === 'video') {
        router.push({
          pathname: '/reproductor-video',
          params: {
            url: direccion,
            titulo: recurso.titulo,
          },
        } as never);

        return;
      }

      if (tipoNormalizado === 'pdf') {
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
          'Este dispositivo no puede abrir el recurso.'
        );
      }

      await Linking.openURL(direccion);
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo abrir el recurso.';

      Alert.alert('Error', mensaje);
      anunciar(`Error. ${mensaje}`);
    }
  };

  const crearActividadConRecurso = (
    recurso: RecursoDocente
  ) => {
    if (recurso.id_actividad) {
      Alert.alert(
        'Recurso en uso',
        'Este recurso ya está relacionado con una actividad.'
      );

      anunciar(
        'Este recurso ya está relacionado con una actividad.'
      );

      return;
    }

    anunciar(
      `Creando una actividad con el recurso ${recurso.titulo}.`
    );

    router.push({
      pathname: '/crear-actividad',
      params: {
        id_recurso: String(recurso.id_recurso),
        id_curso: recurso.id_curso
          ? String(recurso.id_curso)
          : '',
        titulo_recurso: recurso.titulo,
      },
    } as never);
  };

  const actualizar = () => {
    setActualizando(true);
    cargarRecursos(false);
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
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
          accessibilityHint="Regresa a la pantalla anterior"
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
                lineHeight: 26 * escalaTexto,
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
                lineHeight: 16 * escalaTexto,
              },
            ]}
          >
            Consulta y administra tus materiales
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.contenido,
          {
            paddingBottom: 88 + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizar}
            colors={[colores.primario]}
            tintColor={colores.primario}
            progressBackgroundColor={
              colores.tarjeta
            }
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
          accessibilityHint="Abre el formulario para publicar un material de apoyo"
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

        <View style={styles.filaResumen}>
          <ResumenRecurso
            titulo="Total"
            valor={resumenRecursos.total}
            icono="folder-open-outline"
            color={colores.primario}
            fondo={colores.fondoPrimario}
            texto={colores.texto}
            textoSecundario={
              colores.textoSecundario
            }
            borde={colores.borde}
            tarjeta={colores.tarjeta}
            escalaTexto={escalaTexto}
          />

          <ResumenRecurso
            titulo="Disponibles"
            valor={resumenRecursos.disponibles}
            icono="time-outline"
            color="#D97706"
            fondo={
              temaOscuro
                ? colores.fondoPrimario
                : '#FFF7ED'
            }
            texto={colores.texto}
            textoSecundario={
              colores.textoSecundario
            }
            borde={colores.borde}
            tarjeta={colores.tarjeta}
            escalaTexto={escalaTexto}
          />

          <ResumenRecurso
            titulo="En uso"
            valor={resumenRecursos.enUso}
            icono="checkmark-circle-outline"
            color="#15803D"
            fondo={
              temaOscuro
                ? colores.fondoPrimario
                : '#ECFDF5'
            }
            texto={colores.texto}
            textoSecundario={
              colores.textoSecundario
            }
            borde={colores.borde}
            tarjeta={colores.tarjeta}
            escalaTexto={escalaTexto}
          />
        </View>

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
            accessibilityHint="Busca por título, materia, curso o actividad"
          />

          {busqueda.length > 0 && (
            <TouchableOpacity
              style={styles.botonLimpiar}
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
          accessibilityLabel="Filtros por tipo de recurso"
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

        <View style={styles.filaResultados}>
          <Text
            style={[
              styles.tituloResultados,
              {
                color: colores.texto,
                fontSize: 14 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Recursos publicados
          </Text>

          {!cargando && (
            <Text
              style={[
                styles.totalResultados,
                {
                  color:
                    colores.textoSecundario,
                  fontSize:
                    10 * escalaTexto,
                },
              ]}
            >
              {recursosFiltrados.length}{' '}
              encontrados
            </Text>
          )}
        </View>

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
            <View
              style={[
                styles.iconoVacio,
                {
                  backgroundColor:
                    colores.fondoPrimario,
                },
              ]}
            >
              <Ionicons
                name="folder-open-outline"
                size={39}
                color={
                  colores.textoSecundario
                }
              />
            </View>

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
              Crea un recurso nuevo o cambia los
              filtros seleccionados.
            </Text>
          </View>
        ) : (
          recursosFiltrados.map((recurso) => {
            const estaEnUso = Boolean(
              recurso.id_actividad
            );

            const colorEstado = estaEnUso
              ? '#15803D'
              : '#D97706';

            const fondoEstado = temaOscuro
              ? colores.fondoPrimario
              : estaEnUso
                ? '#ECFDF5'
                : '#FFF7ED';

            const etiquetaEstado = estaEnUso
              ? 'En uso'
              : 'Disponible';

            return (
              <View
                key={recurso.id_recurso}
                style={[
                  styles.tarjetaRecurso,
                  {
                    backgroundColor:
                      colores.tarjeta,
                    borderColor: colores.borde,
                  },
                ]}
                accessible={false}
              >
                <View style={styles.encabezadoRecurso}>
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
                      size={27}
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
                  </View>

                  <View
                    style={[
                      styles.insigniaEstado,
                      {
                        backgroundColor:
                          fondoEstado,
                        borderColor:
                          colorEstado,
                      },
                    ]}
                    accessible
                    accessibilityLabel={`Estado: ${etiquetaEstado}`}
                  >
                    <View
                      style={[
                        styles.puntoEstado,
                        {
                          backgroundColor:
                            colorEstado,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.textoEstado,
                        {
                          color: colorEstado,
                          fontSize:
                            9 * escalaTexto,
                        },
                      ]}
                    >
                      {etiquetaEstado}
                    </Text>
                  </View>
                </View>

                {recurso.descripcion ? (
                  <Text
                    style={[
                      styles.descripcionRecurso,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          11 * escalaTexto,
                      },
                    ]}
                    numberOfLines={3}
                  >
                    {recurso.descripcion}
                  </Text>
                ) : null}

                <View
                  style={[
                    styles.filaFecha,
                    {
                      borderTopColor:
                        colores.borde,
                    },
                  ]}
                  accessible
                  accessibilityLabel={`Publicado el ${formatearFecha(
                    recurso.fecha_publicacion
                  )}`}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={
                      colores.textoSecundario
                    }
                  />

                  <Text
                    style={[
                      styles.textoFecha,
                      {
                        color:
                          colores.textoSecundario,
                        fontSize:
                          10 * escalaTexto,
                      },
                    ]}
                  >
                    Publicado:{' '}
                    {formatearFecha(
                      recurso.fecha_publicacion
                    )}
                  </Text>
                </View>

                {estaEnUso ? (
                  <View
                    style={[
                      styles.actividadRelacionada,
                      {
                        backgroundColor:
                          colores.fondoPrimario,
                        borderColor:
                          colores.borde,
                      },
                    ]}
                    accessible
                    accessibilityLabel={`Actividad relacionada: ${
                      recurso.actividad_relacionada ??
                      'Actividad sin nombre'
                    }`}
                  >
                    <Ionicons
                      name="link-outline"
                      size={17}
                      color={colores.primario}
                    />

                    <View
                      style={
                        styles.datosActividad
                      }
                    >
                      <Text
                        style={[
                          styles.etiquetaActividad,
                          {
                            color:
                              colores.textoSecundario,
                            fontSize:
                              9 * escalaTexto,
                          },
                        ]}
                      >
                        Actividad relacionada
                      </Text>

                      <Text
                        style={[
                          styles.nombreActividad,
                          {
                            color:
                              colores.texto,
                            fontSize:
                              11 * escalaTexto,
                          },
                        ]}
                      >
                        {recurso.actividad_relacionada ??
                          'Actividad sin nombre'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.recursoDisponible,
                      {
                        backgroundColor:
                          fondoEstado,
                        borderColor:
                          colorEstado,
                      },
                    ]}
                    accessible
                    accessibilityLabel="Este recurso está disponible para relacionarlo con una actividad."
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={17}
                      color={colorEstado}
                    />

                    <Text
                      style={[
                        styles.textoDisponible,
                        {
                          color: colorEstado,
                          fontSize:
                            10 * escalaTexto,
                        },
                      ]}
                    >
                      Disponible para utilizarse en
                      una actividad
                    </Text>
                  </View>
                )}

                <View style={styles.accionesRecurso}>
                  <TouchableOpacity
                    style={[
                      styles.botonVer,
                      {
                        backgroundColor:
                          colores.fondoPrimario,
                        borderColor:
                          colores.primario,
                      },
                    ]}
                    onPress={() =>
                      abrirRecurso(recurso)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Ver recurso ${recurso.titulo}`}
                    accessibilityHint="Abre el archivo o material de apoyo"
                  >
                    <Ionicons
                      name="eye-outline"
                      size={19}
                      color={colores.primario}
                    />

                    <Text
                      style={[
                        styles.textoBotonVer,
                        {
                          color:
                            colores.primario,
                          fontSize:
                            11 * escalaTexto,
                        },
                      ]}
                    >
                      Ver recurso
                    </Text>
                  </TouchableOpacity>

                  {!estaEnUso && (
                    <TouchableOpacity
                      style={[
                        styles.botonActividad,
                        {
                          backgroundColor:
                            colores.primario,
                        },
                      ]}
                      onPress={() =>
                        crearActividadConRecurso(
                          recurso
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Crear actividad con el recurso ${recurso.titulo}`}
                      accessibilityHint="Abre el formulario de actividad con este recurso seleccionado"
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={19}
                        color="#FFFFFF"
                      />

                      <Text
                        style={[
                          styles.textoBotonActividad,
                          {
                            fontSize:
                              11 * escalaTexto,
                          },
                        ]}
                      >
                        Crear actividad
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomNavigation,
          {
            minHeight:
              68 + Math.max(insets.bottom, 5),
            paddingBottom: Math.max(
              insets.bottom,
              5
            ),
            backgroundColor: colores.tarjeta,
            borderTopColor: colores.borde,
          },
        ]}
        accessibilityRole="tablist"
      >
        <BottomItem
          icon="home-outline"
          activeIcon="home"
          label="Inicio"
          onPress={() =>
            router.replace(
              '/inicio-docente' as Href
            )
          }
        />

        <BottomItem
          icon="book-outline"
          activeIcon="book"
          label="Recursos"
          active
          onPress={() =>
            anunciar('Ya estás en Recursos.')
          }
        />

        <BottomItem
          icon="reader-outline"
          activeIcon="reader"
          label="Actividades"
          onPress={() =>
            router.push(
              '/actividades-docente' as Href
            )
          }
        />

        <BottomItem
          icon="document-text-outline"
          activeIcon="document-text"
          label="Evaluaciones"
          onPress={() =>
            router.push(
              '/evaluaciones-docente' as Href
            )
          }
        />

        <BottomItem
          icon="menu-outline"
          activeIcon="menu"
          label="Más"
          onPress={() =>
            router.push('/menu-docente' as Href)
          }
        />
      </View>
    </SafeAreaView>
  );
}

type ResumenRecursoProps = {
  titulo: string;
  valor: number;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  fondo: string;
  texto: string;
  textoSecundario: string;
  borde: string;
  tarjeta: string;
  escalaTexto: number;
};

function ResumenRecurso({
  titulo,
  valor,
  icono,
  color,
  fondo,
  texto,
  textoSecundario,
  borde,
  tarjeta,
  escalaTexto,
}: ResumenRecursoProps) {
  return (
    <View
      style={[
        styles.tarjetaResumen,
        {
          backgroundColor: tarjeta,
          borderColor: borde,
        },
      ]}
      accessible
      accessibilityLabel={`${titulo}: ${valor}`}
    >
      <View
        style={[
          styles.iconoResumen,
          {
            backgroundColor: fondo,
          },
        ]}
      >
        <Ionicons
          name={icono}
          size={20}
          color={color}
        />
      </View>

      <Text
        style={[
          styles.valorResumen,
          {
            color: texto,
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
            color: textoSecundario,
            fontSize: 9 * escalaTexto,
          },
        ]}
      >
        {titulo}
      </Text>
    </View>
  );
}

type BottomItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
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
    preferencias,
  } = useAccessibility();

  const colorActivo = preferencias.altoContraste
    ? colores.primario
    : preferencias.modoOscuro
      ? '#60A5FA'
      : '#2563EB';

  return (
    <TouchableOpacity
      style={styles.bottomItem}
      onPress={onPress}
      activeOpacity={0.7}
      focusable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
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
          name={active ? activeIcon : icon}
          size={21}
          color={
            active
              ? colorActivo
              : colores.textoSecundario
          }
        />
      </View>

      <Text
        style={[
          styles.bottomLabel,
          {
            color: active
              ? colorActivo
              : colores.textoSecundario,
            fontSize: 8 * escalaTexto,
            lineHeight: 10 * escalaTexto,
          },
          active && styles.bottomLabelActive,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  encabezado: {
    minHeight: 69,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
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
    minHeight: 51,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    marginBottom: 11,
  },

  textoCrear: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  filaResumen: {
    flexDirection: 'row',
    columnGap: 7,
    marginBottom: 12,
  },

  tarjetaResumen: {
    flex: 1,
    minHeight: 98,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 9,
  },

  iconoResumen: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  valorResumen: {
    marginTop: 5,
    fontWeight: '900',
  },

  textoResumen: {
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '700',
  },

  buscador: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputBusqueda: {
    flex: 1,
    minHeight: 46,
    marginHorizontal: 8,
  },

  botonLimpiar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filtros: {
    columnGap: 7,
    paddingVertical: 11,
  },

  filtro: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoFiltro: {
    fontWeight: '800',
  },

  filaResultados: {
    minHeight: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  tituloResultados: {
    fontWeight: '900',
  },

  totalResultados: {
    fontWeight: '600',
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
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    marginBottom: 12,
  },

  encabezadoRecurso: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoRecurso: {
    width: 52,
    height: 52,
    borderRadius: 16,
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

  insigniaEstado: {
    minHeight: 29,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 5,
  },

  puntoEstado: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  textoEstado: {
    fontWeight: '900',
  },

  descripcionRecurso: {
    marginTop: 11,
    lineHeight: 17,
  },

  filaFecha: {
    minHeight: 39,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    marginTop: 11,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },

  textoFecha: {
    flex: 1,
    textTransform: 'capitalize',
  },

  actividadRelacionada: {
    minHeight: 57,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 9,
  },

  datosActividad: {
    flex: 1,
  },

  etiquetaActividad: {
    fontWeight: '600',
  },

  nombreActividad: {
    marginTop: 3,
    fontWeight: '800',
  },

  recursoDisponible: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },

  textoDisponible: {
    flex: 1,
    fontWeight: '800',
  },

  accionesRecurso: {
    flexDirection: 'row',
    columnGap: 8,
    marginTop: 12,
  },

  botonVer: {
    flex: 1,
    minHeight: 45,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
  },

  textoBotonVer: {
    fontWeight: '900',
  },

  botonActividad: {
    flex: 1.25,
    minHeight: 45,
    borderRadius: 12,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
  },

  textoBotonActividad: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  estadoVacio: {
    minHeight: 220,
    borderWidth: 1,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  iconoVacio: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tituloVacio: {
    marginTop: 12,
    fontWeight: '900',
  },

  textoVacio: {
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },

  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 6,
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#111827',
        shadowOffset: {
          width: 0,
          height: -3,
        },
        shadowOpacity: 0.08,
        shadowRadius: 9,
      },
      android: {
        elevation: 10,
      },
    }),
  },

  bottomItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
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

  bottomLabel: {
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '700',
  },

  bottomLabelActive: {
    fontWeight: '900',
  },
});