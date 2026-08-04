import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BotonAccesibilidad from "../components/BotonAccesibilidad";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { API_URL } from "../services/api";

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

type TipoFiltro = "materias" | "cursos";

type OpcionFiltro = {
  id: number | "todos";
  nombre: string;
  cantidad: number;
};

type RespuestaEstudiantes = {
  ok?: boolean;
  mensaje?: string;
  estudiantes?: Estudiante[];
};

export default function EstudiantesDocenteScreen() {
  const { preferencias, colores, escalaTexto, leerTexto } = useAccessibility();

  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("materias");
  const [filtroSeleccionado, setFiltroSeleccionado] = useState<
    number | "todos"
  >("todos");

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const anunciar = useCallback(
    (mensaje: string) => {
      if (preferencias.lectorPantalla) {
        leerTexto(mensaje);
      }
    },
    [preferencias.lectorPantalla, leerTexto],
  );

  const cargarEstudiantes = useCallback(
    async (cargaPrincipal = true) => {
      try {
        if (cargaPrincipal) {
          setCargando(true);
        }

        const token = await AsyncStorage.getItem("token");

        if (!token) {
          throw new Error("No se encontró la sesión del docente.");
        }

        const respuesta = await fetch(`${API_URL}/docente/estudiantes`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const resultado = (await respuesta.json()) as RespuestaEstudiantes;

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje || "No se pudieron obtener los estudiantes.",
          );
        }

        const lista = Array.isArray(resultado.estudiantes)
          ? resultado.estudiantes
          : [];

        setEstudiantes(lista);

        const totalUnicos = new Set(
          lista.map((estudiante) => estudiante.id_alumno),
        ).size;

        anunciar(
          `Lista actualizada. Se encontraron ${totalUnicos} estudiantes.`,
        );
      } catch (error) {
        console.error("Error al cargar estudiantes:", error);

        setEstudiantes([]);

        const mensaje =
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.";

        Alert.alert("Error", mensaje);
        anunciar(`Error. ${mensaje}`);
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [anunciar],
  );

  useFocusEffect(
    useCallback(() => {
      cargarEstudiantes();
    }, [cargarEstudiantes]),
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
        tipoFiltro === "materias" ? estudiante.id_materia : estudiante.id_curso;

      const nombre =
        tipoFiltro === "materias" ? estudiante.materia : estudiante.curso;

      const filtroActual = mapa.get(id);

      if (filtroActual) {
        filtroActual.estudiantes.add(estudiante.id_alumno);
      } else {
        mapa.set(id, {
          nombre,
          estudiantes: new Set([estudiante.id_alumno]),
        });
      }
    });

    const totalUnicos = new Set(
      estudiantes.map((estudiante) => estudiante.id_alumno),
    ).size;

    return [
      {
        id: "todos",
        nombre: "Todos",
        cantidad: totalUnicos,
      },
      ...Array.from(mapa.entries())
        .map(([id, datos]) => ({
          id,
          nombre: datos.nombre,
          cantidad: datos.estudiantes.size,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    ];
  }, [estudiantes, tipoFiltro]);

  const estudiantesFiltrados = useMemo(() => {
    const textoBusqueda = busqueda.trim().toLowerCase();

    const coincidencias = estudiantes.filter((estudiante) => {
      const perteneceFiltro =
        filtroSeleccionado === "todos" ||
        (tipoFiltro === "materias"
          ? estudiante.id_materia === filtroSeleccionado
          : estudiante.id_curso === filtroSeleccionado);

      const coincideBusqueda =
        !textoBusqueda ||
        estudiante.nombre_completo.toLowerCase().includes(textoBusqueda) ||
        estudiante.correo.toLowerCase().includes(textoBusqueda) ||
        estudiante.grupo.toLowerCase().includes(textoBusqueda) ||
        estudiante.materia.toLowerCase().includes(textoBusqueda) ||
        estudiante.curso.toLowerCase().includes(textoBusqueda);

      return perteneceFiltro && coincideBusqueda;
    });

    /* Un alumno puede estar inscrito en más de un curso.
     * Para que no aparezca repetido, se conserva una sola
     * tarjeta por alumno dentro del filtro seleccionado.
     */
    return Array.from(
      new Map(
        coincidencias.map((estudiante) => [estudiante.id_alumno, estudiante]),
      ).values(),
    );
  }, [estudiantes, busqueda, filtroSeleccionado, tipoFiltro]);

  const cambiarTipoFiltro = (nuevoTipo: TipoFiltro) => {
    setTipoFiltro(nuevoTipo);
    setFiltroSeleccionado("todos");

    anunciar(
      nuevoTipo === "materias" ? "Filtros por materia." : "Filtros por curso.",
    );
  };

  const seleccionarFiltro = (filtro: OpcionFiltro) => {
    setFiltroSeleccionado(filtro.id);

    anunciar(`Filtro ${filtro.nombre}. ${filtro.cantidad} estudiantes.`);
  };

  const actualizar = () => {
    setActualizando(true);
    cargarEstudiantes(false);
  };

  const abrirEstudiante = (estudiante: Estudiante) => {
    router.push({
      pathname: "/detalle-estudiante",
      params: {
        id_alumno: String(estudiante.id_alumno),
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
          style={styles.botonEncabezado}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
          accessibilityHint="Regresa a la pantalla anterior"
        >
          <Ionicons name="arrow-back" size={24} color={colores.texto} />
        </TouchableOpacity>

        <View style={styles.encabezadoTexto}>
          <Text
            style={[
              styles.tituloPantalla,
              {
                color: colores.texto,
                fontSize: 19 * escalaTexto,
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
                color: colores.textoSecundario,
                fontSize: 11 * escalaTexto,
              },
            ]}
          >
            Gestiona tu lista de estudiantes
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
            tintColor={colores.primario}
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
            placeholderTextColor={colores.textoSecundario}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Buscar estudiante"
            accessibilityHint="Escribe el nombre, correo, grupo, materia o curso"
          />

          {busqueda.length > 0 && (
            <TouchableOpacity
              style={styles.botonLimpiar}
              onPress={() => setBusqueda("")}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colores.textoSecundario}
              />
            </TouchableOpacity>
          )}
        </View>

        <View
          style={styles.selectorTipo}
          accessibilityRole="tablist"
          accessibilityLabel="Tipo de filtro"
        >
          <TouchableOpacity
            style={[
              styles.botonTipo,
              {
                borderColor:
                  tipoFiltro === "materias" ? colores.primario : colores.borde,
                backgroundColor:
                  tipoFiltro === "materias"
                    ? colores.fondoPrimario
                    : colores.tarjeta,
              },
            ]}
            onPress={() => cambiarTipoFiltro("materias")}
            accessibilityRole="tab"
            accessibilityState={{
              selected: tipoFiltro === "materias",
            }}
          >
            <Ionicons
              name="library-outline"
              size={18}
              color={
                tipoFiltro === "materias"
                  ? colores.primario
                  : colores.textoSecundario
              }
            />
            <Text
              style={[
                styles.textoTipo,
                {
                  color:
                    tipoFiltro === "materias"
                      ? colores.primario
                      : colores.textoSecundario,
                  fontSize: 12 * escalaTexto,
                },
              ]}
            >
              Materias
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botonTipo,
              {
                borderColor:
                  tipoFiltro === "cursos" ? colores.primario : colores.borde,
                backgroundColor:
                  tipoFiltro === "cursos"
                    ? colores.fondoPrimario
                    : colores.tarjeta,
              },
            ]}
            onPress={() => cambiarTipoFiltro("cursos")}
            accessibilityRole="tab"
            accessibilityState={{
              selected: tipoFiltro === "cursos",
            }}
          >
            <Ionicons
              name="school-outline"
              size={18}
              color={
                tipoFiltro === "cursos"
                  ? colores.primario
                  : colores.textoSecundario
              }
            />
            <Text
              style={[
                styles.textoTipo,
                {
                  color:
                    tipoFiltro === "cursos"
                      ? colores.primario
                      : colores.textoSecundario,
                  fontSize: 12 * escalaTexto,
                },
              ]}
            >
              Cursos
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contenedorFiltros}
          accessibilityLabel={`Filtros por ${tipoFiltro}`}
        >
          {filtros.map((filtro) => {
            const seleccionado = filtroSeleccionado === filtro.id;

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
                onPress={() => seleccionarFiltro(filtro)}
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
                      fontSize: 10 * escalaTexto,
                    },
                  ]}
                >
                  {filtro.nombre} ({filtro.cantidad})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {cargando ? (
          <View style={styles.cargando}>
            <ActivityIndicator size="large" color={colores.primario} />

            <Text
              style={[
                styles.textoCargando,
                {
                  color: colores.textoSecundario,
                  fontSize: 13 * escalaTexto,
                },
              ]}
            >
              Cargando estudiantes...
            </Text>
          </View>
        ) : estudiantesFiltrados.length === 0 ? (
          <View
            style={[
              styles.estadoVacio,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <Ionicons
              name="people-outline"
              size={47}
              color={colores.textoSecundario}
            />

            <Text
              style={[
                styles.tituloVacio,
                {
                  color: colores.texto,
                  fontSize: 15 * escalaTexto,
                },
              ]}
            >
              No hay estudiantes
            </Text>

            <Text
              style={[
                styles.textoVacio,
                {
                  color: colores.textoSecundario,
                  fontSize: 12 * escalaTexto,
                },
              ]}
            >
              No se encontraron estudiantes con los filtros seleccionados.
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.lista,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            {estudiantesFiltrados.map((estudiante, index) => (
              <TouchableOpacity
                key={String(estudiante.id_alumno)}
                style={[
                  styles.estudianteItem,
                  {
                    borderBottomColor: colores.borde,
                    borderBottomWidth:
                      index === estudiantesFiltrados.length - 1
                        ? 0
                        : StyleSheet.hairlineWidth,
                  },
                ]}
                onPress={() => abrirEstudiante(estudiante)}
                accessibilityRole="button"
                accessibilityLabel={`${estudiante.nombre_completo}, materia ${estudiante.materia}, curso ${estudiante.curso}, grupo ${estudiante.grupo}`}
                accessibilityHint="Abre la información y el avance del estudiante"
              >
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: colores.tarjeta,
                      borderColor: colores.texto,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={27}
                    color={colores.texto}
                  />
                </View>

                <View style={styles.informacionEstudiante}>
                  <Text
                    style={[
                      styles.nombreEstudiante,
                      {
                        color: colores.texto,
                        fontSize: 13 * escalaTexto,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {estudiante.nombre_completo}
                  </Text>

                  <Text
                    style={[
                      styles.grupoEstudiante,
                      {
                        color: colores.textoSecundario,
                        fontSize: 10 * escalaTexto,
                      },
                    ]}
                  >
                    {estudiante.materia}
                    {" · "}
                    {estudiante.curso}
                    {" · "}
                    {estudiante.grupo}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={23}
                  color={colores.textoSecundario}
                />
              </TouchableOpacity>
            ))}
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
          icono="home"
          texto="Inicio"
          ruta="/inicio-docente"
          activo={false}
          colores={colores}
          escalaTexto={escalaTexto}
        />

        <BottomItem
          icono="book-outline"
          texto="Recursos"
          ruta="/crear-recurso"
          activo={false}
          colores={colores}
          escalaTexto={escalaTexto}
        />

        <BottomItem
          icono="reader-outline"
          texto="Actividades"
          ruta="/actividades-docente"
          activo={false}
          colores={colores}
          escalaTexto={escalaTexto}
        />

        <BottomItem
          icono="checkbox"
          texto="Evaluaciones"
          ruta="/crear-evaluacion"
          activo={false}
          colores={colores}
          escalaTexto={escalaTexto}
        />

        <BottomItem
          icono="menu"
          texto="Más"
          ruta="/reportes"
          activo
          colores={colores}
          escalaTexto={escalaTexto}
        />
      </View>
    </SafeAreaView>
  );
}

type ColoresPantalla = {
  tarjeta: string;
  texto: string;
  textoSecundario: string;
  primario: string;
};

type BottomItemProps = {
  icono: keyof typeof Ionicons.glyphMap;
  texto: string;
  ruta: string;
  activo: boolean;
  colores: ColoresPantalla;
  escalaTexto: number;
};

function BottomItem({
  icono,
  texto,
  ruta,
  activo,
  colores,
  escalaTexto,
}: BottomItemProps) {
  const color = activo ? colores.primario : colores.textoSecundario;

  return (
    <TouchableOpacity
      style={styles.itemMenu}
      onPress={() => router.replace(ruta as never)}
      accessibilityRole="tab"
      accessibilityLabel={texto}
      accessibilityState={{
        selected: activo,
      }}
    >
      <Ionicons name={icono} size={21} color={color} />

      <Text
        style={[
          styles.textoMenu,
          {
            color,
            fontSize: 10 * escalaTexto,
            fontWeight: activo ? "800" : "500",
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
    minHeight: 67,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  botonEncabezado: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  encabezadoTexto: {
    flex: 1,
  },

  tituloPantalla: {
    fontWeight: "800",
  },

  subtituloPantalla: {
    marginTop: 4,
  },

  contenido: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 30,
  },

  buscador: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  inputBusqueda: {
    flex: 1,
    minHeight: 44,
    marginLeft: 8,
  },

  botonLimpiar: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  selectorTipo: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  botonTipo: {
    flex: 1,
    minHeight: 43,
    borderWidth: 1,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  textoTipo: {
    fontWeight: "700",
  },

  contenedorFiltros: {
    gap: 7,
    paddingVertical: 9,
  },

  filtro: {
    minHeight: 30,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  textoFiltro: {
    fontWeight: "600",
  },

  cargando: {
    minHeight: 350,
    alignItems: "center",
    justifyContent: "center",
  },

  textoCargando: {
    marginTop: 11,
  },

  lista: {
    borderWidth: 1,
    borderRadius: 5,
    overflow: "hidden",
  },

  estudianteItem: {
    minHeight: 64,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 42,
    height: 42,
    borderWidth: 1.5,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  informacionEstudiante: {
    flex: 1,
    marginHorizontal: 10,
  },

  nombreEstudiante: {
    fontWeight: "800",
  },

  grupoEstudiante: {
    marginTop: 3,
  },

  estadoVacio: {
    minHeight: 210,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  tituloVacio: {
    marginTop: 12,
    fontWeight: "800",
  },

  textoVacio: {
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },

  menuInferior: {
    minHeight: 65,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    paddingHorizontal: 3,
    paddingTop: 5,
    paddingBottom: 3,
  },

  itemMenu: {
    flex: 1,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },

  textoMenu: {
    marginTop: 3,
    textAlign: "center",
  },
});
