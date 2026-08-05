import AsyncStorage from
  '@react-native-async-storage/async-storage';
import { Ionicons } from
  '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import React, {
  useCallback,
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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from
  'react-native-safe-area-context';

import BotonAccesibilidad from
  '../components/BotonAccesibilidad';
import { API_URL } from
  '../services/api';
import { useAccessibility } from
  '../contexts/AccessibilityContext';

type EstadoCurso =
  | 'Activo'
  | 'Inactivo'
  | 'Finalizado';

type Curso = {
  id_curso: number;
  id_materia: number;
  id_grupo: number;
  id_docente: number;
  id_ciclo: number;
  nombre: string;
  descripcion: string | null;
  estado: EstadoCurso;
};

type RegistroCatalogo = {
  [clave: string]: unknown;
};

type FormularioCurso = {
  idCurso: number | null;
  idMateria: number;
  idGrupo: number;
  idDocente: number;
  idCiclo: number;
  nombre: string;
  descripcion: string;
  estado: EstadoCurso;
};

const FORMULARIO_INICIAL:
  FormularioCurso = {
    idCurso: null,
    idMateria: 0,
    idGrupo: 0,
    idDocente: 0,
    idCiclo: 0,
    nombre: '',
    descripcion: '',
    estado: 'Activo',
  };

const extraerLista = (
  respuesta: unknown,
  clave: string
): RegistroCatalogo[] => {
  if (Array.isArray(respuesta)) {
    return respuesta as RegistroCatalogo[];
  }

  if (
    respuesta &&
    typeof respuesta === 'object'
  ) {
    const objeto =
      respuesta as Record<string, unknown>;

    if (Array.isArray(objeto[clave])) {
      return objeto[
        clave
      ] as RegistroCatalogo[];
    }
  }

  return [];
};

const numeroSeguro = (
  valor: unknown
) => {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;
};

const textoSeguro = (
  valor: unknown
) => {
  return typeof valor === 'string'
    ? valor.trim()
    : '';
};

const nombrePersona = (
  persona: RegistroCatalogo
) => {
  const nombreCompleto =
    textoSeguro(
      persona.nombre_completo
    );

  if (nombreCompleto) {
    return nombreCompleto;
  }

  const partes = [
    textoSeguro(persona.nombre),
    textoSeguro(
      persona.apellido_paterno
    ),
    textoSeguro(
      persona.apellido_materno
    ),
    textoSeguro(persona.apellidos),
  ].filter(Boolean);

  if (partes.length > 0) {
    return partes.join(' ');
  }

  return (
    textoSeguro(persona.correo) ||
    'Docente'
  );
};

const hacerPeticion = async (
  ruta: string,
  opciones: RequestInit = {}
) => {
  const token =
    await AsyncStorage.getItem('token');

  if (!token) {
    throw new Error(
      'Tu sesión terminó. Inicia sesión nuevamente.'
    );
  }

  const respuesta = await fetch(
    `${API_URL}${ruta}`,
    {
      ...opciones,
      headers: {
        Accept: 'application/json',
        'Content-Type':
          'application/json',
        Authorization:
          `Bearer ${token}`,
        ...(opciones.headers || {}),
      },
    }
  );

  const datos = await respuesta
    .json()
    .catch(() => ({}));

  if (!respuesta.ok) {
    const objeto =
      datos as Record<string, unknown>;

    throw new Error(
      textoSeguro(objeto.mensaje) ||
      textoSeguro(objeto.detalle) ||
      `Error ${respuesta.status}`
    );
  }

  return datos;
};

export default function
AdminCursosScreen() {
  const accesibilidad =
    useAccessibility() as any;

  const coloresAccesibilidad =
    accesibilidad.colores || {};

  const escalaTexto =
    Number(
      accesibilidad.escalaTexto
    ) || 1;

  const temaOscuro = Boolean(
    accesibilidad.temaOscuro ??
    accesibilidad.preferencias
      ?.modoOscuro ??
    accesibilidad.preferencias
      ?.temaOscuro
  );

  const { width } =
    useWindowDimensions();

  const dosColumnas = width >= 760;

  const tema = {
    fondo:
      coloresAccesibilidad.fondo ||
      (temaOscuro
        ? '#0F172A'
        : '#F8FAFC'),

    tarjeta:
      coloresAccesibilidad
        .fondoTarjeta ||
      coloresAccesibilidad.tarjeta ||
      (temaOscuro
        ? '#1E293B'
        : '#FFFFFF'),

    texto:
      coloresAccesibilidad.texto ||
      (temaOscuro
        ? '#F8FAFC'
        : '#0F172A'),

    textoSecundario:
      coloresAccesibilidad
        .textoSecundario ||
      (temaOscuro
        ? '#CBD5E1'
        : '#64748B'),

    borde:
      coloresAccesibilidad.borde ||
      (temaOscuro
        ? '#475569'
        : '#E2E8F0'),

    primario:
      coloresAccesibilidad.primario ||
      '#2D5BFF',

    fondoPrimario:
      coloresAccesibilidad
        .fondoPrimario ||
      (temaOscuro
        ? '#172554'
        : '#EEF2FF'),

    entrada:
      temaOscuro
        ? '#0F172A'
        : '#F8FAFC',
  };

  const tamano = (base: number) =>
    Math.round(base * escalaTexto);

  const [cursos, setCursos] =
    useState<Curso[]>([]);

  const [materias, setMaterias] =
    useState<RegistroCatalogo[]>([]);

  const [grupos, setGrupos] =
    useState<RegistroCatalogo[]>([]);

  const [docentes, setDocentes] =
    useState<RegistroCatalogo[]>([]);

  const [ciclos, setCiclos] =
    useState<RegistroCatalogo[]>([]);

  const [busqueda, setBusqueda] =
    useState('');

  const [cargando, setCargando] =
    useState(true);

  const [actualizando, setActualizando] =
    useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [formulario, setFormulario] =
    useState<FormularioCurso>(
      FORMULARIO_INICIAL
    );

  const idDocenteDe = (
    docente: RegistroCatalogo
  ) => {
    return numeroSeguro(
      docente.id_usuario ??
      docente.id_docente
    );
  };

  const cargarDatos =
    useCallback(async (
      esActualizacion = false
    ) => {
      if (esActualizacion) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      try {
        const [
          respuestaCursos,
          respuestaMaterias,
          respuestaGrupos,
          respuestaDocentes,
          respuestaCiclos,
        ] = await Promise.all([
          hacerPeticion('/academico/cursos'),
          hacerPeticion(
            '/academico/materias/activas'
          ),
          hacerPeticion(
            '/academico/grupos/activos'
          ),
          hacerPeticion(
            '/academico/docentes/activos'
          ),
          hacerPeticion(
            '/academico/ciclos'
          ),
        ]);

        const listaCursos =
          extraerLista(
            respuestaCursos,
            'cursos'
          ).map((curso) => ({
            id_curso: numeroSeguro(
              curso.id_curso
            ),
            id_materia: numeroSeguro(
              curso.id_materia
            ),
            id_grupo: numeroSeguro(
              curso.id_grupo
            ),
            id_docente: numeroSeguro(
              curso.id_docente
            ),
            id_ciclo: numeroSeguro(
              curso.id_ciclo
            ),
            nombre:
              textoSeguro(
                curso.nombre
              ),
            descripcion:
              textoSeguro(
                curso.descripcion
              ) || null,
            estado: (
              textoSeguro(
                curso.estado
              ) || 'Activo'
            ) as EstadoCurso,
          }));

        setCursos(listaCursos);

        setMaterias(
          extraerLista(
            respuestaMaterias,
            'materias'
          )
        );

        setGrupos(
          extraerLista(
            respuestaGrupos,
            'grupos'
          )
        );

        const listaDocentes =
          extraerLista(
            respuestaDocentes,
            'docentes'
          );

        setDocentes(
          listaDocentes.length > 0
            ? listaDocentes
            : extraerLista(
                respuestaDocentes,
                'usuarios'
              )
        );

        setCiclos(
          extraerLista(
            respuestaCiclos,
            'ciclos'
          )
        );
      } catch (error) {
        Alert.alert(
          'No se pudieron cargar los cursos',
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado.'
        );
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      void cargarDatos(true);
    }, [cargarDatos])
  );

  const nombreMateria = (
    idMateria: number
  ) => {
    const materia = materias.find(
      (item) =>
        numeroSeguro(
          item.id_materia
        ) === idMateria
    );

    return materia
      ? textoSeguro(materia.nombre) ||
          `Materia #${idMateria}`
      : `Materia #${idMateria}`;
  };

  const nombreGrupo = (
    idGrupo: number
  ) => {
    const grupo = grupos.find(
      (item) =>
        numeroSeguro(
          item.id_grupo
        ) === idGrupo
    );

    if (!grupo) {
      return `Grupo #${idGrupo}`;
    }

    const nombre =
      textoSeguro(grupo.nombre);

    const grado =
      textoSeguro(grupo.grado);

    return [grado, nombre]
      .filter(Boolean)
      .join(' - ') ||
      `Grupo #${idGrupo}`;
  };

  const nombreDocente = (
    idDocente: number
  ) => {
    const docente = docentes.find(
      (item) =>
        idDocenteDe(item) ===
        idDocente
    );

    return docente
      ? nombrePersona(docente)
      : `Docente #${idDocente}`;
  };

  const nombreCiclo = (
    idCiclo: number
  ) => {
    const ciclo = ciclos.find(
      (item) =>
        numeroSeguro(
          item.id_ciclo
        ) === idCiclo
    );

    if (!ciclo) {
      return `Ciclo #${idCiclo}`;
    }

    return (
      textoSeguro(ciclo.nombre) ||
      textoSeguro(
        ciclo.nombre_ciclo
      ) ||
      [
        textoSeguro(
          ciclo.fecha_inicio
        ),
        textoSeguro(
          ciclo.fecha_fin
        ),
      ]
        .filter(Boolean)
        .join(' a ') ||
      `Ciclo #${idCiclo}`
    );
  };

  const cursosFiltrados =
    useMemo(() => {
      const termino = busqueda
        .trim()
        .toLowerCase();

      if (!termino) {
        return cursos;
      }

      return cursos.filter((curso) => {
        const contenido = [
          curso.nombre,
          curso.descripcion || '',
          curso.estado,
          nombreMateria(
            curso.id_materia
          ),
          nombreGrupo(
            curso.id_grupo
          ),
          nombreDocente(
            curso.id_docente
          ),
          nombreCiclo(
            curso.id_ciclo
          ),
        ]
          .join(' ')
          .toLowerCase();

        return contenido.includes(
          termino
        );
      });
    }, [
      busqueda,
      cursos,
      materias,
      grupos,
      docentes,
      ciclos,
    ]);

  const totalActivos = cursos.filter(
    (curso) =>
      curso.estado === 'Activo'
  ).length;

  const abrirNuevoCurso = () => {
    setFormulario({
      ...FORMULARIO_INICIAL,
      idCiclo:
        ciclos.length === 1
          ? numeroSeguro(
              ciclos[0].id_ciclo
            )
          : 0,
    });

    setModalVisible(true);
  };

  const abrirEdicion = (
    curso: Curso
  ) => {
    setFormulario({
      idCurso: curso.id_curso,
      idMateria: curso.id_materia,
      idGrupo: curso.id_grupo,
      idDocente: curso.id_docente,
      idCiclo: curso.id_ciclo,
      nombre: curso.nombre,
      descripcion:
        curso.descripcion || '',
      estado: curso.estado,
    });

    setModalVisible(true);
  };

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setModalVisible(false);
  };

  const seleccionarGrupo = (
    grupo: RegistroCatalogo
  ) => {
    const idGrupo = numeroSeguro(
      grupo.id_grupo
    );

    const idCiclo = numeroSeguro(
      grupo.id_ciclo
    );

    setFormulario((anterior) => ({
      ...anterior,
      idGrupo,
      idCiclo:
        idCiclo ||
        anterior.idCiclo,
    }));
  };

  const validarFormulario = () => {
    if (!formulario.nombre.trim()) {
      return (
        'Escribe el nombre del curso.'
      );
    }

    if (
      formulario.nombre.trim()
        .length > 150
    ) {
      return (
        'El nombre no puede superar los 150 caracteres.'
      );
    }

    if (!formulario.idMateria) {
      return (
        'Selecciona una materia.'
      );
    }

    if (!formulario.idGrupo) {
      return 'Selecciona un grupo.';
    }

    if (!formulario.idDocente) {
      return (
        'Selecciona un docente.'
      );
    }

    if (!formulario.idCiclo) {
      return (
        'Selecciona un ciclo escolar.'
      );
    }

    if (
      formulario.descripcion
        .trim().length > 1000
    ) {
      return (
        'La descripción no puede superar los 1000 caracteres.'
      );
    }

    return null;
  };

  const guardarCurso = async () => {
    const error =
      validarFormulario();

    if (error) {
      Alert.alert(
        'Revisa la información',
        error
      );

      return;
    }

    setGuardando(true);

    try {
      const esEdicion =
        formulario.idCurso !== null;

      const ruta = esEdicion
        ? `/academico/cursos/${formulario.idCurso}`
        : '/academico/cursos';

      const datos = await hacerPeticion(
        ruta,
        {
          method:
            esEdicion
              ? 'PUT'
              : 'POST',
          body: JSON.stringify({
            id_materia:
              formulario.idMateria,
            id_grupo:
              formulario.idGrupo,
            id_docente:
              formulario.idDocente,
            id_ciclo:
              formulario.idCiclo,
            nombre:
              formulario.nombre.trim(),
            descripcion:
              formulario.descripcion
                .trim() || null,
            estado:
              formulario.estado,
          }),
        }
      );

      setModalVisible(false);

      Alert.alert(
        esEdicion
          ? 'Curso actualizado'
          : 'Curso creado',
        textoSeguro(
          (
            datos as Record<
              string,
              unknown
            >
          ).mensaje
        ) ||
          'La información se guardó correctamente.'
      );

      await cargarDatos(true);
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const solicitarCambioEstado = (
    curso: Curso
  ) => {
    const nuevoEstado:
      EstadoCurso =
      curso.estado === 'Activo'
        ? 'Inactivo'
        : 'Activo';

    Alert.alert(
      nuevoEstado === 'Activo'
        ? 'Activar curso'
        : 'Desactivar curso',
      `¿Deseas cambiar el curso "${curso.nombre}" a ${nuevoEstado.toLowerCase()}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text:
            nuevoEstado === 'Activo'
              ? 'Activar'
              : 'Desactivar',
          style:
            nuevoEstado === 'Activo'
              ? 'default'
              : 'destructive',
          onPress: async () => {
            try {
              await hacerPeticion(
                `/academico/cursos/${curso.id_curso}/estado`,
                {
                  method: 'PATCH',
                  body: JSON.stringify({
                    estado: nuevoEstado,
                  }),
                }
              );

              await cargarDatos(true);
            } catch (error) {
              Alert.alert(
                'No se cambió el estado',
                error instanceof Error
                  ? error.message
                  : 'Ocurrió un error inesperado.'
              );
            }
          },
        },
      ]
    );
  };

  const colorEstado = (
    estado: EstadoCurso
  ) => {
    if (estado === 'Activo') {
      return {
        fondo: temaOscuro
          ? '#14532D'
          : '#DCFCE7',
        texto: temaOscuro
          ? '#BBF7D0'
          : '#166534',
      };
    }

    if (estado === 'Finalizado') {
      return {
        fondo: temaOscuro
          ? '#713F12'
          : '#FEF3C7',
        texto: temaOscuro
          ? '#FDE68A'
          : '#92400E',
      };
    }

    return {
      fondo: temaOscuro
        ? '#450A0A'
        : '#FEE2E2',
      texto: temaOscuro
        ? '#FECACA'
        : '#991B1B',
    };
  };

  const Selector = ({
    titulo,
    opciones,
    valor,
    obtenerId,
    obtenerEtiqueta,
    onSelect,
    mensajeVacio,
  }: {
    titulo: string;
    opciones: RegistroCatalogo[];
    valor: number;
    obtenerId: (
      item: RegistroCatalogo
    ) => number;
    obtenerEtiqueta: (
      item: RegistroCatalogo
    ) => string;
    onSelect: (
      item: RegistroCatalogo
    ) => void;
    mensajeVacio: string;
  }) => {
    return (
      <View>
        <Text
          style={[
            styles.label,
            {
              color: tema.texto,
              fontSize: tamano(14),
            },
          ]}
        >
          {titulo}
        </Text>

        {opciones.length === 0 ? (
          <Text
            style={[
              styles.emptyOptionText,
              {
                color:
                  tema.textoSecundario,
                fontSize: tamano(13),
              },
            ]}
          >
            {mensajeVacio}
          </Text>
        ) : (
          <View
            style={styles.optionsWrap}
          >
            {opciones.map((item) => {
              const id =
                obtenerId(item);

              const seleccionado =
                valor === id;

              return (
                <TouchableOpacity
                  key={`${titulo}-${id}`}
                  style={[
                    styles.selectionButton,
                    {
                      borderColor:
                        seleccionado
                          ? tema.primario
                          : tema.borde,
                      backgroundColor:
                        seleccionado
                          ? tema.fondoPrimario
                          : tema.entrada,
                    },
                  ]}
                  onPress={() =>
                    onSelect(item)
                  }
                  accessibilityRole="button"
                  accessibilityState={{
                    selected:
                      seleccionado,
                  }}
                  accessibilityLabel={`${titulo}: ${obtenerEtiqueta(
                    item
                  )}`}
                >
                  <Text
                    style={{
                      color:
                        seleccionado
                          ? tema.primario
                          : tema.texto,
                      fontWeight:
                        seleccionado
                          ? '800'
                          : '600',
                      fontSize:
                        tamano(13),
                      textAlign: 'center',
                    }}
                  >
                    {obtenerEtiqueta(
                      item
                    )}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  if (cargando) {
    return (
      <SafeAreaView
        style={[
          styles.loadingScreen,
          {
            backgroundColor:
              tema.fondo,
          },
        ]}
      >
        <StatusBar
          barStyle={
            temaOscuro
              ? 'light-content'
              : 'dark-content'
          }
          backgroundColor={tema.fondo}
        />

        <ActivityIndicator
          size="large"
          color={tema.primario}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                tema.textoSecundario,
              fontSize: tamano(15),
            },
          ]}
        >
          Cargando cursos...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: tema.fondo,
        },
      ]}
    >
      <StatusBar
        barStyle={
          temaOscuro
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={tema.fondo}
      />

      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() =>
              cargarDatos(true)
            }
            tintColor={tema.primario}
            colors={[tema.primario]}
          />
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                borderColor: tema.borde,
                backgroundColor:
                  tema.tarjeta,
              },
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Regresar al inicio de administración"
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={tema.texto}
            />
          </TouchableOpacity>

          <View
            style={styles.titleContainer}
          >
            <Text
              style={[
                styles.title,
                {
                  color: tema.texto,
                  fontSize: tamano(24),
                },
              ]}
            >
              Cursos
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    tema.textoSecundario,
                  fontSize: tamano(13),
                },
              ]}
            >
              Administra las asignaciones
              académicas
            </Text>
          </View>

          <BotonAccesibilidad />
        </View>

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor:
                tema.tarjeta,
              borderColor: tema.borde,
            },
          ]}
        >
          <View
            style={[
              styles.summaryIcon,
              {
                backgroundColor:
                  tema.fondoPrimario,
              },
            ]}
          >
            <Ionicons
              name="school-outline"
              size={28}
              color={tema.primario}
            />
          </View>

          <View style={styles.summaryText}>
            <Text
              style={[
                styles.summaryNumber,
                {
                  color: tema.texto,
                  fontSize: tamano(27),
                },
              ]}
            >
              {cursos.length}
            </Text>

            <Text
              style={{
                color:
                  tema.textoSecundario,
                fontSize: tamano(13),
              }}
            >
              {totalActivos} activos
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.newButton,
              {
                backgroundColor:
                  tema.primario,
              },
            ]}
            onPress={abrirNuevoCurso}
            accessibilityRole="button"
            accessibilityLabel="Crear un curso"
          >
            <Ionicons
              name="add"
              size={21}
              color="#FFFFFF"
            />

            <Text
              style={[
                styles.newButtonText,
                {
                  fontSize: tamano(14),
                },
              ]}
            >
              Nuevo
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor:
                tema.tarjeta,
              borderColor: tema.borde,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={21}
            color={tema.textoSecundario}
          />

          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar curso, materia, grupo o docente"
            placeholderTextColor={
              tema.textoSecundario
            }
            style={[
              styles.searchInput,
              {
                color: tema.texto,
                fontSize: tamano(14),
              },
            ]}
            accessibilityLabel="Buscar cursos"
          />

          {busqueda.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                setBusqueda('')
              }
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
            >
              <Ionicons
                name="close-circle"
                size={21}
                color={
                  tema.textoSecundario
                }
              />
            </TouchableOpacity>
          )}
        </View>

        {cursosFiltrados.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor:
                  tema.tarjeta,
                borderColor: tema.borde,
              },
            ]}
          >
            <Ionicons
              name="library-outline"
              size={54}
              color={tema.textoSecundario}
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color: tema.texto,
                  fontSize: tamano(18),
                },
              ]}
            >
              {busqueda
                ? 'No hay coincidencias'
                : 'Aún no hay cursos'}
            </Text>

            <Text
              style={{
                color:
                  tema.textoSecundario,
                fontSize: tamano(14),
                textAlign: 'center',
              }}
            >
              {busqueda
                ? 'Prueba con otro término de búsqueda.'
                : 'Presiona “Nuevo” para registrar el primer curso.'}
            </Text>
          </View>
        ) : (
          <View style={styles.cardsWrap}>
            {cursosFiltrados.map(
              (curso) => {
                const estadoColor =
                  colorEstado(
                    curso.estado
                  );

                return (
                  <View
                    key={curso.id_curso}
                    style={[
                      styles.courseCard,
                      dosColumnas &&
                        styles.cardTwoColumns,
                      {
                        backgroundColor:
                          tema.tarjeta,
                        borderColor:
                          tema.borde,
                      },
                    ]}
                  >
                    <View
                      style={
                        styles.cardHeader
                      }
                    >
                      <View
                        style={[
                          styles.courseIcon,
                          {
                            backgroundColor:
                              tema.fondoPrimario,
                          },
                        ]}
                      >
                        <Ionicons
                          name="book-outline"
                          size={24}
                          color={
                            tema.primario
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.cardTitleArea
                        }
                      >
                        <Text
                          style={[
                            styles.courseName,
                            {
                              color:
                                tema.texto,
                              fontSize:
                                tamano(17),
                            },
                          ]}
                        >
                          {curso.nombre}
                        </Text>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                estadoColor.fondo,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color:
                                estadoColor.texto,
                              fontSize:
                                tamano(11),
                              fontWeight:
                                '800',
                            }}
                          >
                            {curso.estado}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {curso.descripcion && (
                      <Text
                        numberOfLines={3}
                        style={[
                          styles.description,
                          {
                            color:
                              tema.textoSecundario,
                            fontSize:
                              tamano(13),
                          },
                        ]}
                      >
                        {curso.descripcion}
                      </Text>
                    )}

                    <View
                      style={[
                        styles.infoBox,
                        {
                          backgroundColor:
                            tema.entrada,
                          borderColor:
                            tema.borde,
                        },
                      ]}
                    >
                      <InfoRow
                        icon="flask-outline"
                        label="Materia"
                        value={nombreMateria(
                          curso.id_materia
                        )}
                        color={tema.texto}
                        muted={
                          tema.textoSecundario
                        }
                        fontSize={
                          tamano(13)
                        }
                      />

                      <InfoRow
                        icon="people-outline"
                        label="Grupo"
                        value={nombreGrupo(
                          curso.id_grupo
                        )}
                        color={tema.texto}
                        muted={
                          tema.textoSecundario
                        }
                        fontSize={
                          tamano(13)
                        }
                      />

                      <InfoRow
                        icon="person-outline"
                        label="Docente"
                        value={nombreDocente(
                          curso.id_docente
                        )}
                        color={tema.texto}
                        muted={
                          tema.textoSecundario
                        }
                        fontSize={
                          tamano(13)
                        }
                      />

                      <InfoRow
                        icon="calendar-outline"
                        label="Ciclo"
                        value={nombreCiclo(
                          curso.id_ciclo
                        )}
                        color={tema.texto}
                        muted={
                          tema.textoSecundario
                        }
                        fontSize={
                          tamano(13)
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.cardActions
                      }
                    >
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          {
                            borderColor:
                              tema.borde,
                            backgroundColor:
                              tema.entrada,
                          },
                        ]}
                        onPress={() =>
                          abrirEdicion(
                            curso
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Editar el curso ${curso.nombre}`}
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={
                            tema.primario
                          }
                        />

                        <Text
                          style={[
                            styles.actionText,
                            {
                              color:
                                tema.primario,
                              fontSize:
                                tamano(13),
                            },
                          ]}
                        >
                          Editar
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          {
                            borderColor:
                              curso.estado ===
                              'Activo'
                                ? '#DC3438'
                                : '#16A34A',
                            backgroundColor:
                              tema.entrada,
                          },
                        ]}
                        onPress={() =>
                          solicitarCambioEstado(
                            curso
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={
                          curso.estado ===
                          'Activo'
                            ? `Desactivar el curso ${curso.nombre}`
                            : `Activar el curso ${curso.nombre}`
                        }
                      >
                        <Ionicons
                          name={
                            curso.estado ===
                            'Activo'
                              ? 'pause-circle-outline'
                              : 'play-circle-outline'
                          }
                          size={18}
                          color={
                            curso.estado ===
                            'Activo'
                              ? '#DC3438'
                              : '#16A34A'
                          }
                        />

                        <Text
                          style={[
                            styles.actionText,
                            {
                              color:
                                curso.estado ===
                                'Activo'
                                  ? '#DC3438'
                                  : '#16A34A',
                              fontSize:
                                tamano(13),
                            },
                          ]}
                        >
                          {curso.estado ===
                          'Activo'
                            ? 'Desactivar'
                            : 'Activar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  tema.tarjeta,
                borderColor: tema.borde,
              },
            ]}
          >
            <View
              style={styles.modalHeader}
            >
              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: tema.texto,
                      fontSize:
                        tamano(21),
                    },
                  ]}
                >
                  {formulario.idCurso
                    ? 'Editar curso'
                    : 'Nuevo curso'}
                </Text>

                <Text
                  style={{
                    color:
                      tema.textoSecundario,
                    fontSize:
                      tamano(13),
                  }}
                >
                  Completa la información
                  académica
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.iconButton,
                  {
                    borderColor:
                      tema.borde,
                    backgroundColor:
                      tema.entrada,
                  },
                ]}
                onPress={cerrarModal}
                accessibilityRole="button"
                accessibilityLabel="Cerrar formulario"
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={tema.texto}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.modalContent
              }
            >
              <Text
                style={[
                  styles.label,
                  {
                    color: tema.texto,
                    fontSize:
                      tamano(14),
                  },
                ]}
              >
                Nombre del curso
              </Text>

              <View
                style={[
                  styles.inputBox,
                  {
                    borderColor:
                      tema.borde,
                    backgroundColor:
                      tema.entrada,
                  },
                ]}
              >
                <Ionicons
                  name="school-outline"
                  size={20}
                  color={
                    tema.textoSecundario
                  }
                />

                <TextInput
                  value={formulario.nombre}
                  onChangeText={(nombre) =>
                    setFormulario(
                      (anterior) => ({
                        ...anterior,
                        nombre,
                      })
                    )
                  }
                  maxLength={150}
                  placeholder="Ejemplo: Matemáticas 1° A"
                  placeholderTextColor={
                    tema.textoSecundario
                  }
                  style={[
                    styles.input,
                    {
                      color: tema.texto,
                      fontSize:
                        tamano(14),
                    },
                  ]}
                  accessibilityLabel="Nombre del curso"
                />
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: tema.texto,
                    fontSize:
                      tamano(14),
                  },
                ]}
              >
                Descripción
              </Text>

              <TextInput
                value={
                  formulario.descripcion
                }
                onChangeText={(
                  descripcion
                ) =>
                  setFormulario(
                    (anterior) => ({
                      ...anterior,
                      descripcion,
                    })
                  )
                }
                maxLength={1000}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Descripción opcional del curso"
                placeholderTextColor={
                  tema.textoSecundario
                }
                style={[
                  styles.textArea,
                  {
                    color: tema.texto,
                    borderColor:
                      tema.borde,
                    backgroundColor:
                      tema.entrada,
                    fontSize:
                      tamano(14),
                  },
                ]}
                accessibilityLabel="Descripción del curso"
              />

              <Selector
                titulo="Materia"
                opciones={materias}
                valor={
                  formulario.idMateria
                }
                obtenerId={(item) =>
                  numeroSeguro(
                    item.id_materia
                  )
                }
                obtenerEtiqueta={(item) =>
                  textoSeguro(
                    item.nombre
                  ) ||
                  `Materia #${numeroSeguro(
                    item.id_materia
                  )}`
                }
                onSelect={(item) =>
                  setFormulario(
                    (anterior) => ({
                      ...anterior,
                      idMateria:
                        numeroSeguro(
                          item.id_materia
                        ),
                    })
                  )
                }
                mensajeVacio="Primero registra una materia activa."
              />

              <Selector
                titulo="Grupo"
                opciones={grupos}
                valor={
                  formulario.idGrupo
                }
                obtenerId={(item) =>
                  numeroSeguro(
                    item.id_grupo
                  )
                }
                obtenerEtiqueta={(item) =>
                  [
                    textoSeguro(
                      item.grado
                    ),
                    textoSeguro(
                      item.nombre
                    ),
                  ]
                    .filter(Boolean)
                    .join(' - ') ||
                  `Grupo #${numeroSeguro(
                    item.id_grupo
                  )}`
                }
                onSelect={
                  seleccionarGrupo
                }
                mensajeVacio="Primero registra un grupo activo."
              />

              <Selector
                titulo="Docente"
                opciones={docentes}
                valor={
                  formulario.idDocente
                }
                obtenerId={
                  idDocenteDe
                }
                obtenerEtiqueta={
                  nombrePersona
                }
                onSelect={(item) =>
                  setFormulario(
                    (anterior) => ({
                      ...anterior,
                      idDocente:
                        idDocenteDe(
                          item
                        ),
                    })
                  )
                }
                mensajeVacio="Primero registra un docente activo."
              />

              <Selector
                titulo="Ciclo escolar"
                opciones={ciclos}
                valor={
                  formulario.idCiclo
                }
                obtenerId={(item) =>
                  numeroSeguro(
                    item.id_ciclo
                  )
                }
                obtenerEtiqueta={(item) =>
                  textoSeguro(
                    item.nombre
                  ) ||
                  textoSeguro(
                    item.nombre_ciclo
                  ) ||
                  `Ciclo #${numeroSeguro(
                    item.id_ciclo
                  )}`
                }
                onSelect={(item) =>
                  setFormulario(
                    (anterior) => ({
                      ...anterior,
                      idCiclo:
                        numeroSeguro(
                          item.id_ciclo
                        ),
                    })
                  )
                }
                mensajeVacio="Primero registra un ciclo escolar."
              />

              <Text
                style={[
                  styles.label,
                  {
                    color: tema.texto,
                    fontSize:
                      tamano(14),
                  },
                ]}
              >
                Estado
              </Text>

              <View
                style={styles.optionsRow}
              >
                {(
                  [
                    'Activo',
                    'Inactivo',
                    'Finalizado',
                  ] as EstadoCurso[]
                ).map((estado) => {
                  const seleccionado =
                    formulario.estado ===
                    estado;

                  return (
                    <TouchableOpacity
                      key={estado}
                      style={[
                        styles.stateOption,
                        {
                          borderColor:
                            seleccionado
                              ? tema.primario
                              : tema.borde,
                          backgroundColor:
                            seleccionado
                              ? tema.fondoPrimario
                              : tema.entrada,
                        },
                      ]}
                      onPress={() =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,
                            estado,
                          })
                        )
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        selected:
                          seleccionado,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            seleccionado
                              ? tema.primario
                              : tema.texto,
                          fontWeight: '700',
                          fontSize:
                            tamano(12),
                        }}
                      >
                        {estado}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                style={styles.modalActions}
              >
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    {
                      borderColor:
                        tema.borde,
                      backgroundColor:
                        tema.entrada,
                    },
                  ]}
                  onPress={cerrarModal}
                  disabled={guardando}
                  accessibilityRole="button"
                >
                  <Text
                    style={{
                      color: tema.texto,
                      fontWeight: '800',
                      fontSize:
                        tamano(14),
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
                        tema.primario,
                      opacity: guardando
                        ? 0.7
                        : 1,
                    },
                  ]}
                  onPress={guardarCurso}
                  disabled={guardando}
                  accessibilityRole="button"
                >
                  {guardando ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="save-outline"
                        size={19}
                        color="#FFFFFF"
                      />

                      <Text
                        style={[
                          styles.saveText,
                          {
                            fontSize:
                              tamano(14),
                          },
                        ]}
                      >
                        Guardar curso
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  color,
  muted,
  fontSize,
}: {
  icon: React.ComponentProps<
    typeof Ionicons
  >['name'];
  label: string;
  value: string;
  color: string;
  muted: string;
  fontSize: number;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={17}
        color={muted}
      />

      <Text
        style={[
          styles.infoLabel,
          {
            color: muted,
            fontSize,
          },
        ]}
      >
        {label}:
      </Text>

      <Text
        numberOfLines={2}
        style={[
          styles.infoValue,
          {
            color,
            fontSize,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 14,
  },

  container: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 40,
  },

  topBar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
  },

  titleContainer: {
    flex: 1,
    marginHorizontal: 13,
  },

  title: {
    fontWeight: '900',
  },

  subtitle: {
    marginTop: 2,
  },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },

  summaryIcon: {
    width: 55,
    height: 55,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryText: {
    flex: 1,
    marginLeft: 13,
  },

  summaryNumber: {
    fontWeight: '900',
  },

  newButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
  },

  newButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 5,
  },

  searchBox: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 16,
  },

  searchInput: {
    flex: 1,
    minHeight: 50,
    marginHorizontal: 9,
  },

  cardsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },

  courseCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 20,
    padding: 17,
    marginHorizontal: 6,
    marginBottom: 12,
  },

  cardTwoColumns: {
    width: '48.5%',
    flexGrow: 1,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitleArea: {
    flex: 1,
    marginLeft: 11,
    alignItems: 'flex-start',
  },

  courseName: {
    fontWeight: '900',
    marginBottom: 6,
  },

  statusBadge: {
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },

  description: {
    lineHeight: 20,
    marginTop: 13,
  },

  infoBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },

  infoLabel: {
    marginLeft: 7,
    marginRight: 5,
  },

  infoValue: {
    flex: 1,
    fontWeight: '700',
  },

  cardActions: {
    flexDirection: 'row',
    marginTop: 14,
    marginHorizontal: -4,
  },

  actionButton: {
    minHeight: 44,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 4,
  },

  actionText: {
    marginLeft: 5,
    fontWeight: '900',
  },

  emptyCard: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 25,
  },

  emptyTitle: {
    fontWeight: '900',
    marginTop: 13,
    marginBottom: 7,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor:
      'rgba(15,23,42,0.62)',
  },

  modalCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '94%',
    alignSelf: 'center',
    borderWidth: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },

  modalTitle: {
    fontWeight: '900',
    marginBottom: 3,
  },

  modalContent: {
    paddingBottom: 28,
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

  textArea: {
    minHeight: 108,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  emptyOptionText: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 12,
  },

  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },

  selectionButton: {
    minHeight: 46,
    minWidth: 115,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
    margin: 4,
    paddingHorizontal: 12,
  },

  optionsRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },

  stateOption: {
    minHeight: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
    marginHorizontal: 4,
    paddingHorizontal: 5,
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
    flex: 1.35,
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