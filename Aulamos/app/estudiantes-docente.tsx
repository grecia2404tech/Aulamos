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

type Estudiante = {
  id_alumno: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  nombre_completo: string;
  correo: string;

  id_grupo: number;
  grupo: string;
  grado?: string | null;

  id_curso: number;
  curso: string;

  id_materia: number;
  materia: string;
};

type TipoFiltro = 'materias' | 'cursos';

type OpcionFiltro = {
  id: number | 'todos';
  nombre: string;
  cantidad: number;
};

type RespuestaEstudiantes = {
  mensaje?: string;
  total?: number;
  estudiantes?: Estudiante[];
};

type ColoresPantalla = {
  fondo: string;
  tarjeta: string;
  texto: string;
  textoSecundario: string;
  borde: string;
  primario: string;
  fondoPrimario: string;
};

const RUTAS_DOCENTE = {
  inicio: '/inicio-docente' as Href,
  recursos: '/recursos-docente' as Href,
  actividades: '/actividades-docente' as Href,
  evaluaciones: '/crear-evaluacion' as Href,
  mas: '/menu-docente' as Href,
};

export default function EstudiantesDocenteScreen() {
  const {
    preferencias,
    colores,
    escalaTexto,
    leerTexto,
    detenerLectura,
  } = useAccessibility();

  const [estudiantes, setEstudiantes] =
    useState<Estudiante[]>([]);

  const [busqueda, setBusqueda] = useState('');

  const [tipoFiltro, setTipoFiltro] =
    useState<TipoFiltro>('materias');

  const [
    filtroSeleccionado,
    setFiltroSeleccionado,
  ] = useState<number | 'todos'>('todos');

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

  const cargarEstudiantes = useCallback(
    async (cargaPrincipal = true) => {
      try {
        if (cargaPrincipal) {
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

        const totalUnicos = new Set(
          lista.map(
            (estudiante) =>
              estudiante.id_alumno
          )
        ).size;

        anunciar(
          `Lista actualizada. Se encontraron ${totalUnicos} estudiantes.`
        );
      } catch (error) {
        console.error(
          'Error al cargar estudiantes:',
          error
        );

        setEstudiantes([]);

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
      cargarEstudiantes();

      return () => {
        detenerLectura();
      };
    }, [
      cargarEstudiantes,
      detenerLectura,
    ])
  );

  const filtros = useMemo<OpcionFiltro[]>(() => {
    const mapa = new Map<
      number,
      {
        nombre: string;
        estudiantes: Set<number>;
      }
    >();

    estudiantes.forEach((estudiante) => {
      const id =
        tipoFiltro === 'materias'
          ? estudiante.id_materia
          : estudiante.id_curso;

      const nombre =
        tipoFiltro === 'materias'
          ? estudiante.materia
          : estudiante.curso;

      const filtroActual = mapa.get(id);

      if (filtroActual) {
        filtroActual.estudiantes.add(
          estudiante.id_alumno
        );
      } else {
        mapa.set(id, {
          nombre,
          estudiantes: new Set([
            estudiante.id_alumno,
          ]),
        });
      }
    });

    const totalUnicos = new Set(
      estudiantes.map(
        (estudiante) =>
          estudiante.id_alumno
      )
    ).size;

    return [
      {
        id: 'todos',
        nombre: 'Todos',
        cantidad: totalUnicos,
      },
      ...Array.from(mapa.entries())
        .map(([id, datos]) => ({
          id,
          nombre: datos.nombre,
          cantidad:
            datos.estudiantes.size,
        }))
        .sort((a, b) =>
          a.nombre.localeCompare(
            b.nombre,
            'es'
          )
        ),
    ];
  }, [estudiantes, tipoFiltro]);

  const estudiantesFiltrados = useMemo(() => {
    const textoBusqueda = busqueda
      .trim()
      .toLowerCase();

    const coincidencias = estudiantes.filter(
      (estudiante) => {
        const perteneceFiltro =
          filtroSeleccionado === 'todos' ||
          (tipoFiltro === 'materias'
            ? estudiante.id_materia ===
              filtroSeleccionado
            : estudiante.id_curso ===
              filtroSeleccionado);

        const coincideBusqueda =
          !textoBusqueda ||
          estudiante.nombre_completo
            .toLowerCase()
            .includes(textoBusqueda) ||
          estudiante.correo
            .toLowerCase()
            .includes(textoBusqueda) ||
          estudiante.grupo
            .toLowerCase()
            .includes(textoBusqueda) ||
          estudiante.materia
            .toLowerCase()
            .includes(textoBusqueda) ||
          estudiante.curso
            .toLowerCase()
            .includes(textoBusqueda);

        return (
          perteneceFiltro &&
          coincideBusqueda
        );
      }
    );

    /*
     * Un estudiante puede estar inscrito
     * en varios cursos del mismo docente.
     * Aquí se muestra una sola tarjeta por alumno.
     */
    return Array.from(
      new Map(
        coincidencias.map(
          (estudiante) => [
            estudiante.id_alumno,
            estudiante,
          ]
        )
      ).values()
    ).sort((a, b) =>
      a.nombre_completo.localeCompare(
        b.nombre_completo,
        'es'
      )
    );
  }, [
    estudiantes,
    busqueda,
    filtroSeleccionado,
    tipoFiltro,
  ]);

  const cambiarTipoFiltro = (
    nuevoTipo: TipoFiltro
  ) => {
    setTipoFiltro(nuevoTipo);
    setFiltroSeleccionado('todos');

    anunciar(
      nuevoTipo === 'materias'
        ? 'Filtros por materia.'
        : 'Filtros por curso.'
    );
  };

  const seleccionarFiltro = (
    filtro: OpcionFiltro
  ) => {
    setFiltroSeleccionado(filtro.id);

    anunciar(
      `Filtro ${filtro.nombre}. ${filtro.cantidad} estudiantes.`
    );
  };

  const actualizar = () => {
    setActualizando(true);
    cargarEstudiantes(false);
  };

  const abrirEstudiante = (
    estudiante: Estudiante
  ) => {
    anunciar(
      `Abriendo el progreso de ${estudiante.nombre_completo}.`
    );

    router.push({
      pathname: '/detalle-estudiante',
      params: {
        id_alumno: String(
          estudiante.id_alumno
        ),
        nombre: estudiante.nombre_completo,
        correo: estudiante.correo,
      },
    } as never);
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
          accessibilityHint="Regresa a la pantalla anterior"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colores.texto}
          />
        </TouchableOpacity>

        <View style={styles.encabezadoTexto}>
          <Text
            style={[
              styles.tituloPantalla,
              {
                color: colores.texto,
                fontSize: 19 * escalaTexto,
                lineHeight: 25 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Estudiantes
          </Text>

          <Text
            style={[
              styles.subtituloPantalla,
              {
                color:
                  colores.textoSecundario,
                fontSize:
                  11 * escalaTexto,
                lineHeight:
                  16 * escalaTexto,
              },
            ]}
          >
            Selecciona un estudiante para
            consultar su progreso
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <ScrollView
        contentContainerStyle={styles.contenido}
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
            style={[
              styles.inputBusqueda,
              {
                color: colores.texto,
                fontSize: 13 * escalaTexto,
              },
            ]}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar estudiante, materia o curso..."
            placeholderTextColor={
              colores.textoSecundario
            }
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Buscar estudiante"
            accessibilityHint="Escribe el nombre, correo, grupo, materia o curso"
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

        <View
          style={styles.selectorTipo}
          accessibilityRole="tablist"
          accessibilityLabel="Tipo de filtro"
        >
          <BotonTipoFiltro
            texto="Materias"
            icono="library-outline"
            seleccionado={
              tipoFiltro === 'materias'
            }
            onPress={() =>
              cambiarTipoFiltro('materias')
            }
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <BotonTipoFiltro
            texto="Cursos"
            icono="school-outline"
            seleccionado={
              tipoFiltro === 'cursos'
            }
            onPress={() =>
              cambiarTipoFiltro('cursos')
            }
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.contenedorFiltros
          }
          accessibilityLabel={`Filtros por ${tipoFiltro}`}
        >
          {filtros.map((filtro) => {
            const seleccionado =
              filtroSeleccionado === filtro.id;

            return (
              <TouchableOpacity
                key={String(filtro.id)}
                style={[
                  styles.filtro,
                  {
                    borderColor: seleccionado
                      ? colores.primario
                      : colores.borde,
                    backgroundColor: seleccionado
                      ? colores.fondoPrimario
                      : colores.tarjeta,
                  },
                ]}
                onPress={() =>
                  seleccionarFiltro(filtro)
                }
                accessibilityRole="radio"
                accessibilityLabel={`${filtro.nombre}, ${filtro.cantidad} estudiantes`}
                accessibilityState={{
                  checked: seleccionado,
                  selected: seleccionado,
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
                  {filtro.nombre} (
                  {filtro.cantidad})
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
            Lista de estudiantes
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
              {estudiantesFiltrados.length}{' '}
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
              Cargando estudiantes...
            </Text>
          </View>
        ) : estudiantesFiltrados.length ===
          0 ? (
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
                name="people-outline"
                size={38}
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
              No se encontraron estudiantes con
              los filtros seleccionados.
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.lista,
              {
                backgroundColor:
                  colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            {estudiantesFiltrados.map(
              (estudiante, index) => (
                <TouchableOpacity
                  key={String(
                    estudiante.id_alumno
                  )}
                  style={[
                    styles.estudianteItem,
                    {
                      borderBottomColor:
                        colores.borde,
                      borderBottomWidth:
                        index ===
                        estudiantesFiltrados.length -
                          1
                          ? 0
                          : StyleSheet.hairlineWidth,
                    },
                  ]}
                  onPress={() =>
                    abrirEstudiante(estudiante)
                  }
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  accessibilityLabel={`${estudiante.nombre_completo}, materia ${estudiante.materia}, curso ${estudiante.curso}, grupo ${estudiante.grupo}`}
                  accessibilityHint="Abre el progreso académico del estudiante"
                >
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor:
                          colores.fondoPrimario,
                        borderColor:
                          colores.borde,
                      },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={27}
                      color={colores.primario}
                    />
                  </View>

                  <View
                    style={
                      styles.informacionEstudiante
                    }
                  >
                    <Text
                      style={[
                        styles.nombreEstudiante,
                        {
                          color: colores.texto,
                          fontSize:
                            13 * escalaTexto,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {
                        estudiante.nombre_completo
                      }
                    </Text>

                    <Text
                      style={[
                        styles.detalleEstudiante,
                        {
                          color:
                            colores.textoSecundario,
                          fontSize:
                            10 * escalaTexto,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {estudiante.materia}
                      {' · '}
                      {estudiante.curso}
                    </Text>

                    <View
                      style={
                        styles.insigniaGrupo
                      }
                    >
                      <Ionicons
                        name="school-outline"
                        size={12}
                        color={
                          colores.primario
                        }
                      />

                      <Text
                        style={[
                          styles.textoGrupo,
                          {
                            color:
                              colores.primario,
                            fontSize:
                              9 * escalaTexto,
                          },
                        ]}
                      >
                        {estudiante.grupo}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.botonDetalle,
                      {
                        backgroundColor:
                          colores.fondoPrimario,
                      },
                    ]}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={21}
                      color={colores.primario}
                    />
                  </View>
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.menuInferior,
          {
            backgroundColor: colores.tarjeta,
            borderTopColor: colores.borde,
          },
        ]}
        accessibilityRole="tablist"
      >
        <BottomItem
          icono="home-outline"
          iconoActivo="home"
          texto="Inicio"
          ruta={RUTAS_DOCENTE.inicio}
          activo={false}
          colores={colores}
          escalaTexto={escalaTexto}
        />

        <BottomItem
          icono="book-outline"
          iconoActivo="book"
          texto="Recursos"
          ruta={RUTAS_DOCENTE.recursos}
          activo={false}
          colores={colores}
          escalaTexto={escalaTexto}
        />

        <BottomItem
          icono="reader-outline"
          iconoActivo="reader"
          texto="Actividades"
          ruta={RUTAS_DOCENTE.actividades}
          activo={false}
          colores={colores}
          escalaTexto={escalaTexto}
        />

        <BottomItem
          icono="document-text-outline"
          iconoActivo="document-text"
          texto="Evaluaciones"
          ruta={RUTAS_DOCENTE.evaluaciones}
          activo={false}
          colores={colores}
          escalaTexto={escalaTexto}
        />

        <BottomItem
          icono="menu-outline"
          iconoActivo="menu"
          texto="Más"
          ruta={RUTAS_DOCENTE.mas}
          activo
          colores={colores}
          escalaTexto={escalaTexto}
        />
      </View>
    </SafeAreaView>
  );
}

type BotonTipoFiltroProps = {
  texto: string;
  icono: keyof typeof Ionicons.glyphMap;
  seleccionado: boolean;
  onPress: () => void;
  colores: ColoresPantalla;
  escalaTexto: number;
};

function BotonTipoFiltro({
  texto,
  icono,
  seleccionado,
  onPress,
  colores,
  escalaTexto,
}: BotonTipoFiltroProps) {
  return (
    <TouchableOpacity
      style={[
        styles.botonTipo,
        {
          borderColor: seleccionado
            ? colores.primario
            : colores.borde,
          backgroundColor: seleccionado
            ? colores.fondoPrimario
            : colores.tarjeta,
        },
      ]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={texto}
      accessibilityState={{
        selected: seleccionado,
      }}
    >
      <Ionicons
        name={icono}
        size={18}
        color={
          seleccionado
            ? colores.primario
            : colores.textoSecundario
        }
      />

      <Text
        style={[
          styles.textoTipo,
          {
            color: seleccionado
              ? colores.primario
              : colores.textoSecundario,
            fontSize: 12 * escalaTexto,
          },
        ]}
      >
        {texto}
      </Text>
    </TouchableOpacity>
  );
}

type BottomItemProps = {
  icono: keyof typeof Ionicons.glyphMap;
  iconoActivo: keyof typeof Ionicons.glyphMap;
  texto: string;
  ruta: Href;
  activo: boolean;
  colores: ColoresPantalla;
  escalaTexto: number;
};

function BottomItem({
  icono,
  iconoActivo,
  texto,
  ruta,
  activo,
  colores,
  escalaTexto,
}: BottomItemProps) {
  const color = activo
    ? colores.primario
    : colores.textoSecundario;

  return (
    <TouchableOpacity
      style={styles.itemMenu}
      onPress={() => {
        if (!activo) {
          router.replace(ruta);
        }
      }}
      accessibilityRole="tab"
      accessibilityLabel={texto}
      accessibilityState={{
        selected: activo,
      }}
    >
      <View
        style={[
          styles.fondoIconoMenu,
          activo && {
            backgroundColor:
              colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={
            activo
              ? iconoActivo
              : icono
          }
          size={21}
          color={color}
        />
      </View>

      <Text
        style={[
          styles.textoMenu,
          {
            color,
            fontSize: Math.min(
              9 * escalaTexto,
              12
            ),
            fontWeight: activo
              ? '800'
              : '600',
          },
        ]}
        numberOfLines={1}
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
    minHeight: 69,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
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

  encabezadoTexto: {
    flex: 1,
    marginHorizontal: 10,
  },

  tituloPantalla: {
    fontWeight: '900',
  },

  subtituloPantalla: {
    marginTop: 3,
  },

  contenido: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 30,
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
    marginLeft: 8,
  },

  botonLimpiar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectorTipo: {
    flexDirection: 'row',
    columnGap: 8,
    marginTop: 11,
  },

  botonTipo: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 7,
  },

  textoTipo: {
    fontWeight: '800',
  },

  contenedorFiltros: {
    columnGap: 7,
    paddingVertical: 10,
  },

  filtro: {
    minHeight: 33,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoFiltro: {
    fontWeight: '700',
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
    minHeight: 350,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoCargando: {
    marginTop: 11,
  },

  lista: {
    borderWidth: 1,
    borderRadius: 17,
    overflow: 'hidden',
  },

  estudianteItem: {
    minHeight: 81,
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  informacionEstudiante: {
    flex: 1,
    marginHorizontal: 11,
  },

  nombreEstudiante: {
    fontWeight: '900',
  },

  detalleEstudiante: {
    marginTop: 4,
  },

  insigniaGrupo: {
    alignSelf: 'flex-start',
    minHeight: 22,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },

  textoGrupo: {
    fontWeight: '800',
  },

  botonDetalle: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  estadoVacio: {
    minHeight: 220,
    borderWidth: 1,
    borderRadius: 17,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconoVacio: {
    width: 68,
    height: 68,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tituloVacio: {
    marginTop: 13,
    fontWeight: '900',
  },

  textoVacio: {
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },

  menuInferior: {
    minHeight: 69,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 3,
    paddingTop: 5,
    paddingBottom: 4,
  },

  itemMenu: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 1,
  },

  fondoIconoMenu: {
    width: 38,
    height: 29,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoMenu: {
    marginTop: 3,
    textAlign: 'center',
  },
});