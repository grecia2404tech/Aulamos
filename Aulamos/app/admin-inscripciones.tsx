import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  useWindowDimensions,
  View,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import AsyncStorage from
  "@react-native-async-storage/async-storage";

import { Ionicons } from
  "@expo/vector-icons";

import { router } from
  "expo-router";

import BotonAccesibilidad from
  "../components/BotonAccesibilidad";

import { useAccessibility } from
  "../contexts/AccessibilityContext";

import { API_URL } from
  "../services/api";

type EstadoInscripcion =
  | "Activo"
  | "Inactivo"
  | "Finalizado";

type RegistroCatalogo =
  Record<string, unknown>;

type IoniconName =
  keyof typeof Ionicons.glyphMap;

type Inscripcion = {
  id_inscripcion: number;
  id_alumno: number;
  id_curso: number;
  fecha_inscripcion: string;
  estado: EstadoInscripcion;
  alumno: string;
  correo_alumno: string;
  curso: string;
  materia: string;
  grupo: string;
  ciclo: string;
};

type FormularioInscripcion = {
  idInscripcion: number | null;
  idAlumno: number;
  idCurso: number;
  estado: EstadoInscripcion;
};

const FORMULARIO_INICIAL:
  FormularioInscripcion = {
    idInscripcion: null,
    idAlumno: 0,
    idCurso: 0,
    estado: "Activo",
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
  return typeof valor === "string"
    ? valor.trim()
    : "";
};

const extraerLista = (
  respuesta: unknown,
  propiedad: string
): RegistroCatalogo[] => {
  if (Array.isArray(respuesta)) {
    return respuesta as
      RegistroCatalogo[];
  }

  if (
    respuesta &&
    typeof respuesta === "object"
  ) {
    const objeto =
      respuesta as Record<
        string,
        unknown
      >;

    if (
      Array.isArray(
        objeto[propiedad]
      )
    ) {
      return objeto[
        propiedad
      ] as RegistroCatalogo[];
    }
  }

  return [];
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
  ].filter(Boolean);

  return (
    partes.join(" ") ||
    textoSeguro(persona.correo) ||
    "Estudiante"
  );
};

const etiquetaCurso = (
  curso: RegistroCatalogo
) => {
  const nombre =
    textoSeguro(curso.nombre) ||
    textoSeguro(curso.curso) ||
    `Curso #${numeroSeguro(
      curso.id_curso
    )}`;

  const detalles = [
    textoSeguro(curso.materia),
    textoSeguro(curso.grupo),
    textoSeguro(curso.ciclo),
  ].filter(Boolean);

  return detalles.length > 0
    ? `${nombre} · ${detalles.join(
        " · "
      )}`
    : nombre;
};

const formatoFecha = (
  fecha: string
) => {
  if (!fecha) {
    return "Sin fecha";
  }

  const valor = new Date(fecha);

  if (
    Number.isNaN(valor.getTime())
  ) {
    return fecha;
  }

  return valor.toLocaleString(
    "es-MX",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
};

const hacerPeticion = async (
  ruta: string,
  opciones: RequestInit = {}
) => {
  const token =
    await AsyncStorage.getItem(
      "token"
    );

  if (!token) {
    throw new Error(
      "Tu sesión terminó. Inicia sesión nuevamente."
    );
  }

  const respuesta = await fetch(
    `${API_URL}${ruta}`,
    {
      ...opciones,

      headers: {
        Accept: "application/json",

        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,

        ...(opciones.headers || {}),
      },
    }
  );

  const datos =
    await respuesta
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
AdminInscripcionesScreen() {
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

  const insets =
    useSafeAreaInsets();

  const altoBarraInferior = 68;

  const dosColumnas =
    width >= 760;

  const tema = {
    fondo:
      colores.fondo ||
      (
        temaOscuro
          ? "#0F172A"
          : "#F8FAFC"
      ),

    tarjeta:
      colores.fondoTarjeta ||
      colores.tarjeta ||
      (
        temaOscuro
          ? "#1E293B"
          : "#FFFFFF"
      ),

    texto:
      colores.texto ||
      (
        temaOscuro
          ? "#F8FAFC"
          : "#0F172A"
      ),

    textoSecundario:
      colores.textoSecundario ||
      (
        temaOscuro
          ? "#CBD5E1"
          : "#64748B"
      ),

    borde:
      colores.borde ||
      (
        temaOscuro
          ? "#475569"
          : "#E2E8F0"
      ),

    primario:
      colores.primario ||
      "#2D5BFF",

    fondoPrimario:
      colores.fondoPrimario ||
      (
        temaOscuro
          ? "#172554"
          : "#EEF2FF"
      ),

    entrada:
      temaOscuro
        ? "#0F172A"
        : "#F8FAFC",
  };

  const tamano = (
    base: number
  ) => {
    return Math.round(
      base * escalaTexto
    );
  };

  const [
    inscripciones,
    setInscripciones,
  ] = useState<Inscripcion[]>([]);

  const [
    alumnos,
    setAlumnos,
  ] = useState<
    RegistroCatalogo[]
  >([]);

  const [
    cursos,
    setCursos,
  ] = useState<
    RegistroCatalogo[]
  >([]);

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

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
  ] =
    useState<FormularioInscripcion>(
      FORMULARIO_INICIAL
    );

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
            respuestaInscripciones,
            respuestaAlumnos,
            respuestaCursos,
          ] = await Promise.all([
            hacerPeticion(
              "/academico/inscripciones"
            ),

            hacerPeticion(
              "/academico/inscripciones/alumnos-disponibles"
            ),

            hacerPeticion(
              "/academico/inscripciones/cursos-disponibles"
            ),
          ]);

          const lista =
            extraerLista(
              respuestaInscripciones,
              "inscripciones"
            ).map((item) => ({
              id_inscripcion:
                numeroSeguro(
                  item.id_inscripcion
                ),

              id_alumno:
                numeroSeguro(
                  item.id_alumno
                ),

              id_curso:
                numeroSeguro(
                  item.id_curso
                ),

              fecha_inscripcion:
                textoSeguro(
                  item.fecha_inscripcion
                ),

              estado: (
                textoSeguro(
                  item.estado
                ) || "Activo"
              ) as EstadoInscripcion,

              alumno:
                textoSeguro(
                  item.alumno
                ),

              correo_alumno:
                textoSeguro(
                  item.correo_alumno
                ),

              curso:
                textoSeguro(
                  item.curso
                ),

              materia:
                textoSeguro(
                  item.materia
                ),

              grupo:
                textoSeguro(
                  item.grupo
                ),

              ciclo:
                textoSeguro(
                  item.ciclo
                ),
            }));

          setInscripciones(lista);

          setAlumnos(
            extraerLista(
              respuestaAlumnos,
              "alumnos"
            )
          );

          setCursos(
            extraerLista(
              respuestaCursos,
              "cursos"
            )
          );
        } catch (error) {
          Alert.alert(
            "No se pudieron cargar las inscripciones",

            error instanceof Error
              ? error.message
              : "Ocurrió un error inesperado."
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

  const inscripcionesFiltradas =
    useMemo(() => {
      const termino = busqueda
        .trim()
        .toLowerCase();

      if (!termino) {
        return inscripciones;
      }

      return inscripciones.filter(
        (inscripcion) => {
          const contenido = [
            inscripcion.alumno,
            inscripcion.correo_alumno,
            inscripcion.curso,
            inscripcion.materia,
            inscripcion.grupo,
            inscripcion.ciclo,
            inscripcion.estado,
          ]
            .join(" ")
            .toLowerCase();

          return contenido.includes(
            termino
          );
        }
      );
    }, [
      busqueda,
      inscripciones,
    ]);

  const totalActivas =
    inscripciones.filter(
      (item) =>
        item.estado === "Activo"
    ).length;

  const abrirNueva = () => {
    setFormulario(
      FORMULARIO_INICIAL
    );

    setModalVisible(true);
  };

  const abrirEdicion = (
    inscripcion: Inscripcion
  ) => {
    setFormulario({
      idInscripcion:
        inscripcion.id_inscripcion,

      idAlumno:
        inscripcion.id_alumno,

      idCurso:
        inscripcion.id_curso,

      estado:
        inscripcion.estado,
    });

    setModalVisible(true);
  };

  const cerrarModal = () => {
    if (!guardando) {
      setModalVisible(false);
    }
  };

  const validarFormulario = () => {
    if (!formulario.idAlumno) {
      return (
        "Selecciona un estudiante."
      );
    }

    if (!formulario.idCurso) {
      return (
        "Selecciona un curso."
      );
    }

    const duplicada =
      inscripciones.some(
        (item) =>
          item.id_alumno ===
            formulario.idAlumno &&
          item.id_curso ===
            formulario.idCurso &&
          item.id_inscripcion !==
            formulario.idInscripcion
      );

    if (duplicada) {
      return (
        "El estudiante ya está inscrito en ese curso."
      );
    }

    return "";
  };

  const guardarInscripcion =
    async () => {
      const error =
        validarFormulario();

      if (error) {
        Alert.alert(
          "Revisa la información",
          error
        );

        return;
      }

      setGuardando(true);

      try {
        const esEdicion =
          formulario.idInscripcion !==
          null;

        const ruta = esEdicion
          ? `/academico/inscripciones/${formulario.idInscripcion}`
          : "/academico/inscripciones";

        const respuesta =
          await hacerPeticion(
            ruta,
            {
              method:
                esEdicion
                  ? "PUT"
                  : "POST",

              body: JSON.stringify({
                id_alumno:
                  formulario.idAlumno,

                id_curso:
                  formulario.idCurso,

                estado:
                  formulario.estado,
              }),
            }
          );

        setModalVisible(false);

        Alert.alert(
          esEdicion
            ? "Inscripción actualizada"
            : "Inscripción registrada",

          textoSeguro(
            (
              respuesta as Record<
                string,
                unknown
              >
            ).mensaje
          ) ||
          "La información se guardó correctamente."
        );

        await cargarDatos(true);
      } catch (error) {
        Alert.alert(
          "No se pudo guardar",

          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado."
        );
      } finally {
        setGuardando(false);
      }
    };

  const cambiarEstado = (
    inscripcion: Inscripcion
  ) => {
    const nuevoEstado:
      EstadoInscripcion =
      inscripcion.estado ===
      "Activo"
        ? "Inactivo"
        : "Activo";

    Alert.alert(
      nuevoEstado === "Activo"
        ? "Activar inscripción"
        : "Desactivar inscripción",

      `¿Deseas cambiar la inscripción de "${inscripcion.alumno}" a ${nuevoEstado}?`,

      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text:
            nuevoEstado ===
            "Activo"
              ? "Activar"
              : "Desactivar",

          style:
            nuevoEstado ===
            "Activo"
              ? "default"
              : "destructive",

          onPress: async () => {
            try {
              await hacerPeticion(
                `/academico/inscripciones/${inscripcion.id_inscripcion}/estado`,
                {
                  method: "PATCH",

                  body:
                    JSON.stringify({
                      estado:
                        nuevoEstado,
                    }),
                }
              );

              await cargarDatos(
                true
              );
            } catch (error) {
              Alert.alert(
                "No se cambió el estado",

                error instanceof Error
                  ? error.message
                  : "Ocurrió un error inesperado."
              );
            }
          },
        },
      ]
    );
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
    opciones:
      RegistroCatalogo[];
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
                            ? "800"
                            : "600",

                        fontSize:
                          tamano(13),

                        textAlign:
                          "center",
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
          Cargando inscripciones...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
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
            ? "light-content"
            : "dark-content"
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
            refreshing={actualizando}
            onRefresh={() =>
              cargarDatos(true)
            }
            colors={[tema.primario]}
            tintColor={tema.primario}
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
              Inscripciones
            </Text>

            <Text
              style={{
                color:
                  tema.textoSecundario,

                fontSize:
                  tamano(13),
              }}
            >
              Asigna estudiantes a sus
              cursos
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
              name="person-add-outline"
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
                fontWeight: "900",
              }}
            >
              {inscripciones.length}
            </Text>

            <Text
              style={{
                color:
                  tema.textoSecundario,

                fontSize:
                  tamano(13),
              }}
            >
              {totalActivas} activas
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={abrirNueva}
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
              Nueva
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
            accessibilityLabel="Buscar inscripciones"
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar estudiante, curso, materia o grupo"
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

        {inscripcionesFiltradas
          .length === 0 ? (
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
              name="people-outline"
              color={
                tema.textoSecundario
              }
              size={54}
            />

            <Text
              style={{
                color: tema.texto,
                fontSize: tamano(18),
                fontWeight: "900",
                marginTop: 13,
              }}
            >
              {busqueda
                ? "No hay coincidencias"
                : "Aún no hay inscripciones"}
            </Text>

            <Text
              style={{
                color:
                  tema.textoSecundario,

                fontSize:
                  tamano(14),

                textAlign:
                  "center",

                marginTop: 7,
              }}
            >
              Registra la primera
              inscripción seleccionando
              un estudiante y un curso.
            </Text>
          </View>
        ) : (
          <View
            style={styles.lista}
          >
            {inscripcionesFiltradas.map(
              (inscripcion) => (
                <View
                  key={
                    inscripcion
                      .id_inscripcion
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
                      styles
                        .tarjetaEncabezado
                    }
                  >
                    <View
                      style={[
                        styles
                          .iconoInscripcion,
                        {
                          backgroundColor:
                            tema
                              .fondoPrimario,
                        },
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
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
                            "900",
                        }}
                      >
                        {
                          inscripcion
                            .alumno
                        }
                      </Text>

                      <Text
                        style={{
                          color:
                            inscripcion
                              .estado ===
                            "Activo"
                              ? "#16A34A"
                              : inscripcion
                                  .estado ===
                                "Finalizado"
                              ? "#D97706"
                              : "#DC3438",

                          fontSize:
                            tamano(12),

                          fontWeight:
                            "800",

                          marginTop: 4,
                        }}
                      >
                        {
                          inscripcion
                            .estado
                        }
                      </Text>
                    </View>
                  </View>

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
                      icono="mail-outline"
                      etiqueta="Correo"
                      valor={
                        inscripcion
                          .correo_alumno ||
                        "Sin correo"
                      }
                      tema={tema}
                      tamano={tamano}
                    />

                    <Fila
                      icono="school-outline"
                      etiqueta="Curso"
                      valor={
                        inscripcion
                          .curso
                      }
                      tema={tema}
                      tamano={tamano}
                    />

                    <Fila
                      icono="book-outline"
                      etiqueta="Materia"
                      valor={
                        inscripcion
                          .materia
                      }
                      tema={tema}
                      tamano={tamano}
                    />

                    <Fila
                      icono="people-outline"
                      etiqueta="Grupo"
                      valor={
                        inscripcion
                          .grupo
                      }
                      tema={tema}
                      tamano={tamano}
                    />

                    <Fila
                      icono="calendar-outline"
                      etiqueta="Ciclo"
                      valor={
                        inscripcion
                          .ciclo
                      }
                      tema={tema}
                      tamano={tamano}
                    />

                    <Fila
                      icono="time-outline"
                      etiqueta="Inscripción"
                      valor={formatoFecha(
                        inscripcion
                          .fecha_inscripcion
                      )}
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
                          inscripcion
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
                            "800",

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
                          inscripcion
                        )
                      }
                      style={[
                        styles.botonAccion,
                        {
                          borderColor:
                            inscripcion
                              .estado ===
                            "Activo"
                              ? "#DC3438"
                              : "#16A34A",

                          backgroundColor:
                            tema.entrada,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          inscripcion
                            .estado ===
                          "Activo"
                            ? "pause-circle-outline"
                            : "play-circle-outline"
                        }
                        color={
                          inscripcion
                            .estado ===
                          "Activo"
                            ? "#DC3438"
                            : "#16A34A"
                        }
                        size={18}
                      />

                      <Text
                        style={{
                          color:
                            inscripcion
                              .estado ===
                            "Activo"
                              ? "#DC3438"
                              : "#16A34A",

                          fontWeight:
                            "800",

                          marginLeft: 5,
                        }}
                      >
                        {inscripcion
                          .estado ===
                        "Activo"
                          ? "Desactivar"
                          : "Activar"}
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
                "/inicio-admin" as never
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
                "/admin-ciclos" as never
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
                "/admin-materias" as never
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
                "/admin-grupos" as never
              )
            }
            tema={tema}
            tamano={tamano}
          />

          <BottomNavigationItem
            icon="grid-outline"
            activeIcon="grid"
            label="Cursos"
            onPress={() =>
              router.push(
                "/admin-cursos" as never
              )
            }
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
            Platform.OS === "ios"
              ? "padding"
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
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: tema.texto,
                    fontSize: tamano(21),
                    fontWeight: "900",
                  }}
                >
                  {formulario.idInscripcion
                    ? "Editar inscripción"
                    : "Nueva inscripción"}
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
                  Relaciona un estudiante
                  con uno de los cursos
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
              <Selector
                titulo="Estudiante *"
                opciones={alumnos}
                valor={
                  formulario.idAlumno
                }
                obtenerId={(item) =>
                  numeroSeguro(
                    item.id_usuario
                  )
                }
                obtenerEtiqueta={
                  nombrePersona
                }
                onSelect={(item) =>
                  setFormulario(
                    (anterior) => ({
                      ...anterior,

                      idAlumno:
                        numeroSeguro(
                          item.id_usuario
                        ),
                    })
                  )
                }
                mensajeVacio="Primero registra un usuario activo con rol Alumno."
              />

              <Selector
                titulo="Curso *"
                opciones={cursos}
                valor={
                  formulario.idCurso
                }
                obtenerId={(item) =>
                  numeroSeguro(
                    item.id_curso
                  )
                }
                obtenerEtiqueta={
                  etiquetaCurso
                }
                onSelect={(item) =>
                  setFormulario(
                    (anterior) => ({
                      ...anterior,

                      idCurso:
                        numeroSeguro(
                          item.id_curso
                        ),
                    })
                  )
                }
                mensajeVacio="Primero registra un curso activo."
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
                    "Activo",
                    "Inactivo",
                    "Finalizado",
                  ] as EstadoInscripcion[]
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
                            "800",
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
                      fontWeight: "800",
                    }}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={guardando}
                  onPress={
                    guardarInscripcion
                  }
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
                        Guardar
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
      style={
        styles.itemNavegacion
      }
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
    >["name"];

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
          fontWeight: "700",
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
    alignItems: "center",
    justifyContent: "center",
  },

  contenido: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 45,
  },

  encabezado: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  encabezadoTexto: {
    flex: 1,
    marginHorizontal: 13,
  },

  titulo: {
    fontWeight: "900",
  },

  botonIcono: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  resumen: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  iconoResumen: {
    width: 55,
    height: 55,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  textoResumen: {
    flex: 1,
    marginLeft: 13,
  },

  botonNuevo: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  textoBlanco: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginLeft: 6,
  },

  buscador: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  lista: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },

  tarjeta: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    padding: 17,
    marginHorizontal: 6,
    marginBottom: 12,
  },

  tarjetaDoble: {
    width: "48.5%",
    flexGrow: 1,
  },

  tarjetaEncabezado: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  iconoInscripcion: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  detalles: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },

  fila: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 4,
  },

  acciones: {
    flexDirection: "row",
    marginTop: 14,
    marginHorizontal: -4,
  },

  botonAccion: {
    minHeight: 44,
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  vacio: {
    minHeight: 240,
    borderWidth: 1,
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  fondoModal: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor:
      "rgba(15,23,42,0.62)",
  },

  modal: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "94%",
    alignSelf: "center",
    borderWidth: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  modalEncabezado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    paddingBottom: 12,
  },

  label: {
    marginTop: 15,
    marginBottom: 8,
    fontWeight: "800",
  },

  mensajeVacio: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },

  opciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },

  opcion: {
    minHeight: 50,
    minWidth: 150,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 13,
    margin: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  estados: {
    flexDirection: "row",
    marginHorizontal: -4,
  },

  estado: {
    minHeight: 46,
    flex: 1,
    borderWidth: 1,
    borderRadius: 13,
    marginHorizontal: 4,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  botonesModal: {
    flexDirection: "row",
    marginTop: 25,
  },

  botonCancelar: {
    minHeight: 52,
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    marginRight: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  botonGuardar: {
    minHeight: 52,
    flex: 1.35,
    borderRadius: 14,
    marginLeft: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  navegacionInferior: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    shadowColor: "#000000",
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
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },

  itemNavegacion: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },

  contenedorIconoNavegacion: {
    minWidth: 35,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  etiquetaNavegacion: {
    marginTop: 2,
    fontWeight: "600",
  },

  etiquetaNavegacionActiva: {
    fontWeight: "900",
  },
});