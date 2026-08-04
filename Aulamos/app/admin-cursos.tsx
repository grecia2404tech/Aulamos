import AsyncStorage from
  '@react-native-async-storage/async-storage';

import { Ionicons } from
  '@expo/vector-icons';

import { router } from
  'expo-router';

import React, {
  useCallback,
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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import BotonAccesibilidad from
  '../components/BotonAccesibilidad';

import { useAccessibility } from
  '../contexts/AccessibilityContext';

import { API_URL } from
  '../services/api';

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
  materia?: string;
  grupo?: string;
  grado?: string;
  turno?: string;
  modalidad?: string;
  docente?: string;
  ciclo?: string;
};

type RegistroCatalogo = {
  [clave: string]: unknown;
};

type IoniconName =
  keyof typeof Ionicons.glyphMap;

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
    return respuesta;
  }

  if (
    respuesta &&
    typeof respuesta === 'object'
  ) {
    const objeto =
      respuesta as Record<
        string,
        unknown
      >;

    if (
      Array.isArray(objeto[clave])
    ) {
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

    textoSeguro(
      persona.apellidos
    ),
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
    await AsyncStorage.getItem(
      'token'
    );

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
      datos as Record<
        string,
        unknown
      >;

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
  const insets =
    useSafeAreaInsets();

  const accesibilidad =
    useAccessibility() as any;

  const colores =
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

  const dosColumnas =
    width >= 760;

  const tema = {
    fondo:
      colores.fondo ||
      (
        temaOscuro
          ? '#0F172A'
          : '#F8FAFC'
      ),

    tarjeta:
      colores.fondoTarjeta ||
      colores.tarjeta ||
      (
        temaOscuro
          ? '#1E293B'
          : '#FFFFFF'
      ),

    texto:
      colores.texto ||
      (
        temaOscuro
          ? '#F8FAFC'
          : '#0F172A'
      ),

    textoSecundario:
      colores.textoSecundario ||
      (
        temaOscuro
          ? '#CBD5E1'
          : '#64748B'
      ),

    borde:
      colores.borde ||
      (
        temaOscuro
          ? '#475569'
          : '#E2E8F0'
      ),

    primario:
      colores.primario ||
      '#2D5BFF',

    fondoPrimario:
      colores.fondoPrimario ||
      (
        temaOscuro
          ? '#172554'
          : '#EEF2FF'
      ),

    entrada:
      temaOscuro
        ? '#0F172A'
        : '#F8FAFC',
  };

  const tamano = (
    base: number
  ) => {
    return Math.round(
      base * escalaTexto
    );
  };

  const altoBarraInferior =
    escalaTexto > 1.2
      ? 94
      : 66;

  const [
    cursos,
    setCursos,
  ] = useState<Curso[]>([]);

  const [
    materias,
    setMaterias,
  ] = useState<
    RegistroCatalogo[]
  >([]);

  const [
    grupos,
    setGrupos,
  ] = useState<
    RegistroCatalogo[]
  >([]);

  const [
    docentes,
    setDocentes,
  ] = useState<
    RegistroCatalogo[]
  >([]);

  const [
    ciclos,
    setCiclos,
  ] = useState<
    RegistroCatalogo[]
  >([]);

  const [
    busqueda,
    setBusqueda,
  ] = useState('');

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    actualizando,
    setActualizando,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    formulario,
    setFormulario,
  ] = useState<FormularioCurso>(
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
    useCallback(
      async (
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
            hacerPeticion(
              '/academico/cursos'
            ),

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
              id_curso:
                numeroSeguro(
                  curso.id_curso
                ),

              id_materia:
                numeroSeguro(
                  curso.id_materia
                ),

              id_grupo:
                numeroSeguro(
                  curso.id_grupo
                ),

              id_docente:
                numeroSeguro(
                  curso.id_docente
                ),

              id_ciclo:
                numeroSeguro(
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

              materia:
                textoSeguro(
                  curso.materia
                ),

              grupo:
                textoSeguro(
                  curso.grupo
                ),

              grado:
                textoSeguro(
                  curso.grado
                ),

              turno:
                textoSeguro(
                  curso.turno
                ),

              modalidad:
                textoSeguro(
                  curso.modalidad
                ),

              docente:
                textoSeguro(
                  curso.docente
                ),

              ciclo:
                textoSeguro(
                  curso.ciclo
                ),
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
      },
      []
    );

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const nombreMateria = (
    curso: Curso
  ) => {
    if (curso.materia) {
      return curso.materia;
    }

    const materia = materias.find(
      (item) =>
        numeroSeguro(
          item.id_materia
        ) === curso.id_materia
    );

    return materia
      ? textoSeguro(
          materia.nombre
        )
      : `Materia #${curso.id_materia}`;
  };

  const nombreGrupo = (
    curso: Curso
  ) => {
    if (
      curso.grupo ||
      curso.grado
    ) {
      return [
        curso.grado,
        curso.grupo,
      ]
        .filter(Boolean)
        .join('° ');
    }

    const grupo = grupos.find(
      (item) =>
        numeroSeguro(
          item.id_grupo
        ) === curso.id_grupo
    );

    if (!grupo) {
      return (
        `Grupo #${curso.id_grupo}`
      );
    }

    return [
      textoSeguro(grupo.grado),
      textoSeguro(grupo.nombre),
    ]
      .filter(Boolean)
      .join(' - ');
  };

  const nombreDocente = (
    curso: Curso
  ) => {
    if (curso.docente) {
      return curso.docente;
    }

    const docente = docentes.find(
      (item) =>
        idDocenteDe(item) ===
        curso.id_docente
    );

    return docente
      ? nombrePersona(docente)
      : `Docente #${curso.id_docente}`;
  };

  const nombreCiclo = (
    curso: Curso
  ) => {
    if (curso.ciclo) {
      return curso.ciclo;
    }

    const ciclo = ciclos.find(
      (item) =>
        numeroSeguro(
          item.id_ciclo
        ) === curso.id_ciclo
    );

    return ciclo
      ? (
          textoSeguro(
            ciclo.nombre
          ) ||
          textoSeguro(
            ciclo.nombre_ciclo
          )
        )
      : `Ciclo #${curso.id_ciclo}`;
  };

  const cursosFiltrados =
    useMemo(() => {
      const termino = busqueda
        .trim()
        .toLowerCase();

      if (!termino) {
        return cursos;
      }

      return cursos.filter(
        (curso) => {
          const contenido = [
            curso.nombre,
            curso.descripcion || '',
            curso.estado,
            nombreMateria(curso),
            nombreGrupo(curso),
            nombreDocente(curso),
            nombreCiclo(curso),
          ]
            .join(' ')
            .toLowerCase();

          return contenido.includes(
            termino
          );
        }
      );
    }, [
      busqueda,
      cursos,
      materias,
      grupos,
      docentes,
      ciclos,
    ]);

  const totalActivos =
    cursos.filter(
      (curso) =>
        curso.estado === 'Activo'
    ).length;

  const abrirNuevoCurso = () => {
    const cicloActivo =
      ciclos.find(
        (ciclo) =>
          textoSeguro(
            ciclo.estado
          ) === 'Activo'
      );

    setFormulario({
      ...FORMULARIO_INICIAL,

      idCiclo: numeroSeguro(
        cicloActivo?.id_ciclo
      ),
    });

    setModalVisible(true);
  };

  const abrirEdicion = (
    curso: Curso
  ) => {
    setFormulario({
      idCurso:
        curso.id_curso,

      idMateria:
        curso.id_materia,

      idGrupo:
        curso.id_grupo,

      idDocente:
        curso.id_docente,

      idCiclo:
        curso.id_ciclo,

      nombre:
        curso.nombre,

      descripcion:
        curso.descripcion || '',

      estado:
        curso.estado,
    });

    setModalVisible(true);
  };

  const cerrarModal = () => {
    if (!guardando) {
      setModalVisible(false);
    }
  };

  const validarFormulario = () => {
    const nombre =
      formulario.nombre.trim();

    if (nombre.length < 2) {
      return (
        'Escribe el nombre del curso.'
      );
    }

    if (nombre.length > 150) {
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
      return (
        'Selecciona un grupo.'
      );
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
        .trim()
        .length > 1000
    ) {
      return (
        'La descripción no puede superar los 1000 caracteres.'
      );
    }

    return '';
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

      const respuesta =
        await hacerPeticion(
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

              /*
               * Este valor es
               * usuarios.id_usuario
               */
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
            respuesta as Record<
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

  const cambiarEstado = (
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

      `¿Deseas cambiar "${curso.nombre}" a ${nuevoEstado}?`,

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
                    estado:
                      nuevoEstado,
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

  const gruposDisponibles =
    formulario.idCiclo
      ? grupos.filter(
          (grupo) =>
            numeroSeguro(
              grupo.id_ciclo
            ) === formulario.idCiclo
        )
      : grupos;

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
              styles.mensajeVacio,
              {
                color:
                  tema.textoSecundario,

                borderColor:
                  tema.borde,

                fontSize:
                  tamano(13),
              },
            ]}
          >
            {mensajeVacio}
          </Text>
        ) : (
          <View
            style={
              styles.opciones
            }
          >
            {opciones.map(
              (item) => {
                const id =
                  obtenerId(item);

                const seleccionado =
                  valor === id;

                return (
                  <TouchableOpacity
                    key={
                      `${titulo}-${id}`
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      selected:
                        seleccionado,
                    }}
                    onPress={() =>
                      onSelect(item)
                    }
                    style={[
                      styles.opcion,
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

                        textAlign:
                          'center',
                      }}
                    >
                      {obtenerEtiqueta(
                        item
                      )}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        )}
      </View>
    );
  };

  if (cargando) {
    return (
      <SafeAreaView
        style={[
          styles.cargando,
          {
            backgroundColor:
              tema.fondo,
          },
        ]}
      >
        <ActivityIndicator
          color={tema.primario}
          size="large"
        />

        <Text
          style={{
            color:
              tema.textoSecundario,

            fontSize:
              tamano(15),

            marginTop: 14,
          }}
        >
          Cargando cursos...
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
        styles.pantalla,
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
      />

      <ScrollView
        contentContainerStyle={[
          styles.contenido,
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
        refreshControl={
          <RefreshControl
            refreshing={
              actualizando
            }
            onRefresh={() =>
              cargarDatos(true)
            }
            colors={[
              tema.primario,
            ]}
            tintColor={
              tema.primario
            }
          />
        }
      >
        <View
          style={
            styles.encabezado
          }
        >
          <TouchableOpacity
            accessibilityLabel="Regresar"
            accessibilityRole="button"
            onPress={() =>
              router.back()
            }
            style={[
              styles.botonIcono,
              {
                backgroundColor:
                  tema.tarjeta,

                borderColor:
                  tema.borde,
              },
            ]}
          >
            <Ionicons
              name="arrow-back"
              color={tema.texto}
              size={23}
            />
          </TouchableOpacity>

          <View
            style={
              styles.encabezadoTexto
            }
          >
            <Text
              style={[
                styles.titulo,
                {
                  color: tema.texto,
                  fontSize:
                    tamano(24),
                },
              ]}
            >
              Cursos
            </Text>

            <Text
              style={{
                color:
                  tema.textoSecundario,

                fontSize:
                  tamano(13),
              }}
            >
              Administra las asignaciones
              académicas
            </Text>
          </View>

          <BotonAccesibilidad />
        </View>

        <View
          style={[
            styles.resumen,
            {
              backgroundColor:
                tema.tarjeta,

              borderColor:
                tema.borde,
            },
          ]}
        >
          <View
            style={[
              styles.iconoResumen,
              {
                backgroundColor:
                  tema.fondoPrimario,
              },
            ]}
          >
            <Ionicons
              name="school-outline"
              color={tema.primario}
              size={27}
            />
          </View>

          <View
            style={
              styles.textoResumen
            }
          >
            <Text
              style={{
                color: tema.texto,
                fontSize: tamano(27),
                fontWeight: '900',
              }}
            >
              {cursos.length}
            </Text>

            <Text
              style={{
                color:
                  tema.textoSecundario,

                fontSize:
                  tamano(13),
              }}
            >
              {totalActivos} activos
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={abrirNuevoCurso}
            style={[
              styles.botonNuevo,
              {
                backgroundColor:
                  tema.primario,
              },
            ]}
          >
            <Ionicons
              name="add"
              color="#FFFFFF"
              size={21}
            />

            <Text
              style={[
                styles.textoBlanco,
                {
                  fontSize:
                    tamano(14),
                },
              ]}
            >
              Nuevo
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.buscador,
            {
              backgroundColor:
                tema.tarjeta,

              borderColor:
                tema.borde,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            color={
              tema.textoSecundario
            }
            size={21}
          />

          <TextInput
            accessibilityLabel="Buscar cursos"
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar curso, materia, grupo o docente"
            placeholderTextColor={
              tema.textoSecundario
            }
            style={{
              flex: 1,
              color: tema.texto,
              fontSize: tamano(14),
              marginLeft: 9,
            }}
          />
        </View>

        {cursosFiltrados.length === 0 ? (
          <View
            style={[
              styles.vacio,
              {
                backgroundColor:
                  tema.tarjeta,

                borderColor:
                  tema.borde,
              },
            ]}
          >
            <Ionicons
              name="library-outline"
              color={
                tema.textoSecundario
              }
              size={54}
            />

            <Text
              style={{
                color: tema.texto,
                fontSize: tamano(18),
                fontWeight: '900',
                marginTop: 13,
              }}
            >
              {busqueda
                ? 'No hay coincidencias'
                : 'Aún no hay cursos'}
            </Text>

            <Text
              style={{
                color:
                  tema.textoSecundario,

                fontSize:
                  tamano(14),

                textAlign:
                  'center',

                marginTop: 7,
              }}
            >
              Registra el primer curso
              relacionando materia, grupo,
              docente y ciclo escolar.
            </Text>
          </View>
        ) : (
          <View
            style={
              styles.lista
            }
          >
            {cursosFiltrados.map(
              (curso) => (
                <View
                  key={
                    curso.id_curso
                  }
                  style={[
                    styles.tarjeta,
                    dosColumnas &&
                      styles.tarjetaDoble,
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
                      styles.tarjetaEncabezado
                    }
                  >
                    <View
                      style={[
                        styles.iconoCurso,
                        {
                          backgroundColor:
                            tema.fondoPrimario,
                        },
                      ]}
                    >
                      <Ionicons
                        name="book-outline"
                        color={
                          tema.primario
                        }
                        size={24}
                      />
                    </View>

                    <View
                      style={{
                        flex: 1,
                        marginLeft: 11,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            tema.texto,

                          fontSize:
                            tamano(17),

                          fontWeight:
                            '900',
                        }}
                      >
                        {curso.nombre}
                      </Text>

                      <Text
                        style={{
                          color:
                            curso.estado ===
                            'Activo'
                              ? '#16A34A'
                              : curso.estado ===
                                'Finalizado'
                              ? '#D97706'
                              : '#DC3438',

                          fontSize:
                            tamano(12),

                          fontWeight:
                            '800',

                          marginTop: 4,
                        }}
                      >
                        {curso.estado}
                      </Text>
                    </View>
                  </View>

                  {curso.descripcion ? (
                    <Text
                      numberOfLines={3}
                      style={{
                        color:
                          tema.textoSecundario,

                        fontSize:
                          tamano(13),

                        lineHeight:
                          tamano(19),

                        marginTop: 12,
                      }}
                    >
                      {curso.descripcion}
                    </Text>
                  ) : null}

                  <View
                    style={[
                      styles.detalles,
                      {
                        backgroundColor:
                          tema.entrada,

                        borderColor:
                          tema.borde,
                      },
                    ]}
                  >
                    <Fila
                      icono="flask-outline"
                      etiqueta="Materia"
                      valor={
                        nombreMateria(
                          curso
                        )
                      }
                      tema={tema}
                      tamano={tamano}
                    />

                    <Fila
                      icono="people-outline"
                      etiqueta="Grupo"
                      valor={
                        nombreGrupo(
                          curso
                        )
                      }
                      tema={tema}
                      tamano={tamano}
                    />

                    <Fila
                      icono="person-outline"
                      etiqueta="Docente"
                      valor={
                        nombreDocente(
                          curso
                        )
                      }
                      tema={tema}
                      tamano={tamano}
                    />

                    <Fila
                      icono="calendar-outline"
                      etiqueta="Ciclo"
                      valor={
                        nombreCiclo(
                          curso
                        )
                      }
                      tema={tema}
                      tamano={tamano}
                    />
                  </View>

                  <View
                    style={
                      styles.acciones
                    }
                  >
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() =>
                        abrirEdicion(
                          curso
                        )
                      }
                      style={[
                        styles.botonAccion,
                        {
                          borderColor:
                            tema.borde,

                          backgroundColor:
                            tema.entrada,
                        },
                      ]}
                    >
                      <Ionicons
                        name="create-outline"
                        color={
                          tema.primario
                        }
                        size={18}
                      />

                      <Text
                        style={{
                          color:
                            tema.primario,

                          fontWeight:
                            '800',

                          marginLeft: 5,
                        }}
                      >
                        Editar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() =>
                        cambiarEstado(
                          curso
                        )
                      }
                      style={[
                        styles.botonAccion,
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
                    >
                      <Ionicons
                        name={
                          curso.estado ===
                          'Activo'
                            ? 'pause-circle-outline'
                            : 'play-circle-outline'
                        }
                        color={
                          curso.estado ===
                          'Activo'
                            ? '#DC3438'
                            : '#16A34A'
                        }
                        size={18}
                      />

                      <Text
                        style={{
                          color:
                            curso.estado ===
                            'Activo'
                              ? '#DC3438'
                              : '#16A34A',

                          fontWeight:
                            '800',

                          marginLeft: 5,
                        }}
                      >
                        {curso.estado ===
                        'Activo'
                          ? 'Desactivar'
                          : 'Activar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            )}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.navegacionInferior,
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
              tema.tarjeta,

            borderTopColor:
              tema.borde,
          },
        ]}
      >
        <View
          style={
            styles.contenidoNavegacion
          }
        >
          <BottomNavigationItem
            icon="home-outline"
            activeIcon="home"
            label="Inicio"
            onPress={() =>
              router.push(
                '/inicio-admin' as never
              )
            }
            tema={tema}
            tamano={tamano}
          />

          <BottomNavigationItem
            icon="calendar-outline"
            activeIcon="calendar"
            label="Ciclos"
            onPress={() =>
              router.push(
                '/admin-ciclos' as never
              )
            }
            tema={tema}
            tamano={tamano}
          />

          <BottomNavigationItem
            icon="book-outline"
            activeIcon="book"
            label="Materias"
            onPress={() =>
              router.push(
                '/admin-materias' as never
              )
            }
            tema={tema}
            tamano={tamano}
          />

          <BottomNavigationItem
            icon="people-outline"
            activeIcon="people"
            label="Grupos"
            onPress={() =>
              router.push(
                '/admin-grupos' as never
              )
            }
            tema={tema}
            tamano={tamano}
          />

          <BottomNavigationItem
            icon="grid-outline"
            activeIcon="grid"
            label="Cursos"
            active
            onPress={() => {}}
            tema={tema}
            tamano={tamano}
          />
        </View>
      </View>

      <Modal
        transparent
        animationType="slide"
        visible={modalVisible}
        onRequestClose={cerrarModal}
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
          style={
            styles.fondoModal
          }
        >
          <View
            style={[
              styles.modal,
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
                styles.modalEncabezado
              }
            >
              <View>
                <Text
                  style={{
                    color: tema.texto,
                    fontSize: tamano(21),
                    fontWeight: '900',
                  }}
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

                    marginTop: 3,
                  }}
                >
                  Completa la información
                  académica
                </Text>
              </View>

              <TouchableOpacity
                accessibilityLabel="Cerrar formulario"
                accessibilityRole="button"
                onPress={cerrarModal}
                style={[
                  styles.botonIcono,
                  {
                    backgroundColor:
                      tema.entrada,

                    borderColor:
                      tema.borde,
                  },
                ]}
              >
                <Ionicons
                  name="close"
                  color={tema.texto}
                  size={22}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingBottom: 28,
              }}
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
                Nombre del curso *
              </Text>

              <TextInput
                accessibilityLabel="Nombre del curso"
                value={
                  formulario.nombre
                }
                maxLength={150}
                placeholder="Ejemplo: Matemáticas 1° A"
                placeholderTextColor={
                  tema.textoSecundario
                }
                onChangeText={(
                  nombre
                ) =>
                  setFormulario(
                    (anterior) => ({
                      ...anterior,
                      nombre,
                    })
                  )
                }
                style={[
                  styles.entrada,
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
                Descripción
              </Text>

              <TextInput
                accessibilityLabel="Descripción del curso"
                value={
                  formulario.descripcion
                }
                maxLength={1000}
                multiline
                textAlignVertical="top"
                placeholder="Descripción opcional"
                placeholderTextColor={
                  tema.textoSecundario
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
                style={[
                  styles.areaTexto,
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
              />

              <Selector
                titulo="Ciclo escolar *"
                opciones={ciclos}
                valor={
                  formulario.idCiclo
                }
                obtenerId={(item) =>
                  numeroSeguro(
                    item.id_ciclo
                  )
                }
                obtenerEtiqueta={(
                  item
                ) =>
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

                      idGrupo: 0,
                    })
                  )
                }
                mensajeVacio="Primero registra un ciclo escolar."
              />

              <Selector
                titulo="Grupo *"
                opciones={
                  gruposDisponibles
                }
                valor={
                  formulario.idGrupo
                }
                obtenerId={(item) =>
                  numeroSeguro(
                    item.id_grupo
                  )
                }
                obtenerEtiqueta={(
                  item
                ) =>
                  [
                    textoSeguro(
                      item.grado
                    ),
                    textoSeguro(
                      item.nombre
                    ),
                  ]
                    .filter(Boolean)
                    .join(' - ')
                }
                onSelect={(item) =>
                  setFormulario(
                    (anterior) => ({
                      ...anterior,

                      idGrupo:
                        numeroSeguro(
                          item.id_grupo
                        ),

                      idCiclo:
                        numeroSeguro(
                          item.id_ciclo
                        ) ||
                        anterior.idCiclo,
                    })
                  )
                }
                mensajeVacio="No existen grupos activos para el ciclo seleccionado."
              />

              <Selector
                titulo="Materia *"
                opciones={materias}
                valor={
                  formulario.idMateria
                }
                obtenerId={(item) =>
                  numeroSeguro(
                    item.id_materia
                  )
                }
                obtenerEtiqueta={(
                  item
                ) =>
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
                titulo="Docente *"
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
                style={
                  styles.estados
                }
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
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked:
                          seleccionado,
                      }}
                      onPress={() =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,
                            estado,
                          })
                        )
                      }
                      style={[
                        styles.estado,
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
                    >
                      <Text
                        style={{
                          color:
                            seleccionado
                              ? tema.primario
                              : tema.texto,

                          fontSize:
                            tamano(12),

                          fontWeight:
                            '800',
                        }}
                      >
                        {estado}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                style={
                  styles.botonesModal
                }
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={guardando}
                  onPress={cerrarModal}
                  style={[
                    styles.botonCancelar,
                    {
                      borderColor:
                        tema.borde,

                      backgroundColor:
                        tema.entrada,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: tema.texto,
                      fontWeight: '800',
                    }}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={guardando}
                  onPress={guardarCurso}
                  style={[
                    styles.botonGuardar,
                    {
                      backgroundColor:
                        tema.primario,

                      opacity:
                        guardando
                          ? 0.65
                          : 1,
                    },
                  ]}
                >
                  {guardando ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="save-outline"
                        color="#FFFFFF"
                        size={19}
                      />

                      <Text
                        style={
                          styles.textoBlanco
                        }
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

type BottomNavigationItemProps = {
  icon: IoniconName;
  activeIcon: IoniconName;
  label: string;
  active?: boolean;
  onPress: () => void;

  tema: {
    textoSecundario: string;
    primario: string;
    fondoPrimario: string;
  };

  tamano: (
    base: number
  ) => number;
};

function BottomNavigationItem({
  icon,
  activeIcon,
  label,
  active = false,
  onPress,
  tema,
  tamano,
}: BottomNavigationItemProps) {
  return (
    <TouchableOpacity
      style={styles.itemNavegacion}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        selected: active,
      }}
    >
      <View
        style={[
          styles.contenedorIconoNavegacion,
          active && {
            backgroundColor:
              tema.fondoPrimario,
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
              ? tema.primario
              : tema.textoSecundario
          }
        />
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.etiquetaNavegacion,
          {
            color:
              active
                ? tema.primario
                : tema.textoSecundario,

            fontSize:
              Math.min(
                tamano(10),
                13
              ),
          },
          active &&
            styles.etiquetaNavegacionActiva,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Fila({
  icono,
  etiqueta,
  valor,
  tema,
  tamano,
}: {
  icono:
    React.ComponentProps<
      typeof Ionicons
    >['name'];

  etiqueta: string;
  valor: string;

  tema: {
    texto: string;
    textoSecundario: string;
  };

  tamano: (
    base: number
  ) => number;
}) {
  return (
    <View style={styles.fila}>
      <Ionicons
        name={icono}
        color={
          tema.textoSecundario
        }
        size={17}
      />

      <Text
        style={{
          color:
            tema.textoSecundario,

          fontSize:
            tamano(13),

          marginLeft: 7,
        }}
      >
        {etiqueta}:
      </Text>

      <Text
        numberOfLines={2}
        style={{
          flex: 1,
          color: tema.texto,
          fontSize: tamano(13),
          fontWeight: '700',
          marginLeft: 5,
        }}
      >
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
  },

  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  contenido: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 45,
  },

  encabezado: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  encabezadoTexto: {
    flex: 1,
    marginHorizontal: 13,
  },

  titulo: {
    fontWeight: '900',
  },

  botonIcono: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resumen: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoResumen: {
    width: 55,
    height: 55,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoResumen: {
    flex: 1,
    marginLeft: 13,
  },

  botonNuevo: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBlanco: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 6,
  },

  buscador: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  lista: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },

  tarjeta: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 20,
    padding: 17,
    marginHorizontal: 6,
    marginBottom: 12,
  },

  tarjetaDoble: {
    width: '48.5%',
    flexGrow: 1,
  },

  tarjetaEncabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconoCurso: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detalles: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },

  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },

  acciones: {
    flexDirection: 'row',
    marginTop: 14,
    marginHorizontal: -4,
  },

  botonAccion: {
    minHeight: 44,
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  vacio: {
    minHeight: 240,
    borderWidth: 1,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fondoModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor:
      'rgba(15,23,42,0.62)',
  },

  modal: {
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

  modalEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingBottom: 12,
  },

  label: {
    marginTop: 15,
    marginBottom: 8,
    fontWeight: '800',
  },

  entrada: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },

  areaTexto: {
    minHeight: 108,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  mensajeVacio: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },

  opciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },

  opcion: {
    minHeight: 46,
    minWidth: 115,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 13,
    margin: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  estados: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },

  estado: {
    minHeight: 46,
    flex: 1,
    borderWidth: 1,
    borderRadius: 13,
    marginHorizontal: 4,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botonesModal: {
    flexDirection: 'row',
    marginTop: 25,
  },

  botonCancelar: {
    minHeight: 52,
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botonGuardar: {
    minHeight: 52,
    flex: 1.35,
    borderRadius: 14,
    marginLeft: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navegacionInferior: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },

  contenidoNavegacion: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-around',
  },

  itemNavegacion: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  contenedorIconoNavegacion: {
    minWidth: 35,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  etiquetaNavegacion: {
    marginTop: 2,
    fontWeight: '600',
  },

  etiquetaNavegacionActiva: {
    fontWeight: '900',
  },
});