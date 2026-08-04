import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  type Href,
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Line,
  Polyline,
} from 'react-native-svg';

import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type Materia = {
  id_materia: number;
  nombre: string;
};

type PuntoGrafica = {
  etiqueta: string;
  valor: number;
};

type DatosReportes = {
  promedioGeneral: number;
  porcentajeAprobados: number;
  porcentajeEntregadas: number;
  evaluacionesRealizadas: number;
  rendimientoActividades: PuntoGrafica[];
};

type OpcionSelector = {
  valor: string;
  etiqueta: string;
};

const PERIODOS: OpcionSelector[] = [
  {
    valor: 'mes_actual',
    etiqueta: 'Este mes',
  },
  {
    valor: 'mes_anterior',
    etiqueta: 'Mes anterior',
  },
  {
    valor: 'ultimos_3_meses',
    etiqueta: 'Últimos 3 meses',
  },
  {
    valor: 'ciclo_actual',
    etiqueta: 'Ciclo actual',
  },
];

const DATOS_VACIOS: DatosReportes = {
  promedioGeneral: 0,
  porcentajeAprobados: 0,
  porcentajeEntregadas: 0,
  evaluacionesRealizadas: 0,
  rendimientoActividades: [],
};

export default function ReportesScreen() {
 

  const {
    preferencias,
    colores,
    escalaTexto,
    leerTexto,
  } = useAccessibility();

  const [materias, setMaterias] = useState<Materia[]>([]);
  const [materiaSeleccionada, setMateriaSeleccionada] =
    useState('todas');
  const [periodoSeleccionado, setPeriodoSeleccionado] =
    useState('mes_actual');

  const [datos, setDatos] =
    useState<DatosReportes>(DATOS_VACIOS);

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] =
    useState(false);

  const [selectorMateriaVisible, setSelectorMateriaVisible] =
    useState(false);
  const [selectorPeriodoVisible, setSelectorPeriodoVisible] =
    useState(false);

  const anunciar = useCallback(
    (mensaje: string) => {
      if (preferencias.lectorPantalla) {
        leerTexto(mensaje);
      }
    },
    [preferencias.lectorPantalla, leerTexto]
  );

  const nombreMateriaSeleccionada = useMemo(() => {
    if (materiaSeleccionada === 'todas') {
      return 'Todas las materias';
    }

    const materia = materias.find(
      (item) =>
        String(item.id_materia) ===
        materiaSeleccionada
    );

    return materia?.nombre ?? 'Todas las materias';
  }, [materiaSeleccionada, materias]);

  const nombrePeriodoSeleccionado = useMemo(() => {
    const periodo = PERIODOS.find(
      (item) =>
        item.valor === periodoSeleccionado
    );

    return periodo?.etiqueta ?? 'Este mes';
  }, [periodoSeleccionado]);

  const cargarMaterias = useCallback(async () => {
    try {
      const token =
        await AsyncStorage.getItem('token');

      const respuesta = await fetch(
        `${API_URL}/docente/materias`,
        {
          headers: {
            Accept: 'application/json',
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje ||
            'No se pudieron obtener las materias.'
        );
      }

      setMaterias(
        Array.isArray(resultado.materias)
          ? resultado.materias
          : []
      );
    } catch (error) {
      console.error(
        'Error al obtener materias:',
        error
      );

      /*
       * No se muestra una alerta aquí para que la pantalla
       * pueda continuar mostrando la opción:
       * "Todas las materias".
       */
      setMaterias([]);
    }
  }, []);

  const cargarReportes = useCallback(
    async (mostrarCargaPrincipal = true) => {
      try {
        if (mostrarCargaPrincipal) {
          setCargando(true);
        }

        const token =
          await AsyncStorage.getItem('token');

        const usuarioGuardado =
          await AsyncStorage.getItem('usuario');

        if (!usuarioGuardado) {
          throw new Error(
            'No se encontró la sesión del docente.'
          );
        }

        const usuario = JSON.parse(
          usuarioGuardado
        );

        const idDocente =
          usuario.id_usuario ??
          usuario.id_docente ??
          usuario.id;

        if (!idDocente) {
          throw new Error(
            'No se encontró el identificador del docente.'
          );
        }

        const parametros = new URLSearchParams({
          id_docente: String(idDocente),
          materia: materiaSeleccionada,
          periodo: periodoSeleccionado,
        });

        const respuesta = await fetch(
          `${API_URL}/docente/reportes/resumen?${parametros.toString()}`,
          {
            headers: {
              Accept: 'application/json',
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : {}),
            },
          }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje ||
              'No se pudieron cargar los reportes.'
          );
        }

        const nuevosDatos: DatosReportes = {
          promedioGeneral: Number(
            resultado.resumen?.promedio_general ?? 0
          ),
          porcentajeAprobados: Number(
            resultado.resumen
              ?.porcentaje_aprobados ?? 0
          ),
          porcentajeEntregadas: Number(
            resultado.resumen
              ?.porcentaje_entregadas ?? 0
          ),
          evaluacionesRealizadas: Number(
            resultado.resumen
              ?.evaluaciones_realizadas ?? 0
          ),
          rendimientoActividades: Array.isArray(
            resultado.rendimiento_actividades
          )
            ? resultado.rendimiento_actividades.map(
                (item: {
                  etiqueta?: string;
                  nombre?: string;
                  valor?: number;
                  promedio?: number;
                }) => ({
                  etiqueta:
                    item.etiqueta ??
                    item.nombre ??
                    '',
                  valor: Number(
                    item.valor ??
                      item.promedio ??
                      0
                  ),
                })
              )
            : [],
        };

        setDatos(nuevosDatos);

        anunciar(
          `Reportes actualizados. Promedio general ${nuevosDatos.promedioGeneral.toFixed(
            1
          )}. Estudiantes aprobados ${
            nuevosDatos.porcentajeAprobados
          } por ciento. Actividades entregadas ${
            nuevosDatos.porcentajeEntregadas
          } por ciento. Evaluaciones realizadas ${
            nuevosDatos.evaluacionesRealizadas
          }.`
        );
      } catch (error) {
        console.error(
          'Error al cargar reportes:',
          error
        );

        setDatos(DATOS_VACIOS);

        const mensaje =
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al cargar los reportes.';

        Alert.alert('Error', mensaje);
        anunciar(`Error. ${mensaje}`);
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [
      materiaSeleccionada,
      periodoSeleccionado,
      anunciar,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      cargarMaterias();
      cargarReportes();
    }, [cargarMaterias, cargarReportes])
  );

  useEffect(() => {
    cargarReportes();
  }, [
    materiaSeleccionada,
    periodoSeleccionado,
  ]);

  const actualizarPantalla = () => {
    setActualizando(true);
    cargarReportes(false);
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
            borderBottomColor: colores.borde,
            backgroundColor: colores.fondo,
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
              },
            ]}
            accessibilityRole="header"
          >
            Reportes
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
            Analiza el progreso de tus clases
          </Text>
        </View>

        <TouchableOpacity
          style={styles.botonEncabezado}
          onPress={() =>
            router.push('/accesibilidad')
          }
          accessibilityRole="button"
          accessibilityLabel="Configuración de accesibilidad"
          accessibilityHint="Abre las opciones de accesibilidad"
        >
          <Ionicons
            name="accessibility"
            size={27}
            color={colores.primario}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizarPantalla}
            tintColor={colores.primario}
          />
        }
      >
        <Text
          style={[
            styles.etiqueta,
            {
              color: colores.texto,
              fontSize: 11 * escalaTexto,
            },
          ]}
        >
          Seleccionar materia
        </Text>

        <SelectorButton
          texto={nombreMateriaSeleccionada}
          onPress={() =>
            setSelectorMateriaVisible(true)
          }
          colores={colores}
          escalaTexto={escalaTexto}
          accessibilityLabel={`Materia seleccionada: ${nombreMateriaSeleccionada}`}
          accessibilityHint="Abre la lista de materias"
        />

        <Text
          style={[
            styles.etiqueta,
            styles.etiquetaPeriodo,
            {
              color: colores.texto,
              fontSize: 11 * escalaTexto,
            },
          ]}
        >
          Periodo
        </Text>

        <SelectorButton
          texto={nombrePeriodoSeleccionado}
          onPress={() =>
            setSelectorPeriodoVisible(true)
          }
          colores={colores}
          escalaTexto={escalaTexto}
          accessibilityLabel={`Periodo seleccionado: ${nombrePeriodoSeleccionado}`}
          accessibilityHint="Abre la lista de periodos"
        />

        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 14 * escalaTexto,
            },
          ]}
          accessibilityRole="header"
        >
          Resumen general
        </Text>

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
                  color: colores.textoSecundario,
                  fontSize: 13 * escalaTexto,
                },
              ]}
            >
              Cargando reportes...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.filaTarjetas}>
              <TarjetaPromedio
                titulo="Promedio general"
                valor={datos.promedioGeneral}
                puntos={
                  datos.rendimientoActividades
                }
                colores={colores}
                escalaTexto={escalaTexto}
              />

              <TarjetaPorcentajeCircular
                titulo="Estudiantes aprobados"
                porcentaje={
                  datos.porcentajeAprobados
                }
                colores={colores}
                escalaTexto={escalaTexto}
              />
            </View>

            <View style={styles.filaTarjetas}>
              <TarjetaPorcentajeBarra
                titulo="Actividades entregadas"
                porcentaje={
                  datos.porcentajeEntregadas
                }
                colores={colores}
                escalaTexto={escalaTexto}
              />

              <TarjetaEvaluaciones
                titulo="Evaluaciones realizadas"
                cantidad={
                  datos.evaluacionesRealizadas
                }
                colores={colores}
                escalaTexto={escalaTexto}
              />
            </View>
          </>
        )}

        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 14 * escalaTexto,
            },
          ]}
          accessibilityRole="header"
        >
          Reportes disponibles
        </Text>

        <View
          style={[
            styles.listaReportes,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          

          <ReporteItem
  icono="stats-chart"
  titulo="Rendimiento por actividad"
  fondoIcono={colores.fondoPrimario}
  colores={colores}
  escalaTexto={escalaTexto}
  onPress={() =>
    router.push(
      '/reporte-rendimiento-actividad' as Href
    )
  }
/>

<ReporteItem
  icono="clipboard"
  titulo="Rendimiento por evaluación"
  fondoIcono={colores.fondoPrimario}
  colores={colores}
  escalaTexto={escalaTexto}
  onPress={() =>
    router.push(
      '/reporte-rendimiento-evaluacion' as Href
    )
  }
/>

<ReporteItem
  icono="trending-up"
  titulo="Asistencia y participación"
  fondoIcono={colores.fondoPrimario}
  colores={colores}
  escalaTexto={escalaTexto}
  onPress={() =>
    router.push(
      '/reporte-asistencia' as Href
    )
  }
  ultimo
/>
        </View>
      </ScrollView>

      <View
        style={[
          styles.menuInferior,
          {
            backgroundColor: colores.tarjeta,
            borderTopColor: colores.borde,
          },
        ]}
      >
        <BottomItem
  icono="home"
  texto="Inicio"
  ruta={'/inicio-docente' as Href}
  activo={false}
  colores={colores}
  escalaTexto={escalaTexto}
/>

<BottomItem
  icono="book"
  texto="Recursos"
  ruta={'/crear-recurso' as Href}
  activo={false}
  colores={colores}
  escalaTexto={escalaTexto}
/>

<BottomItem
  icono="list"
  texto="Actividades"
  ruta={'/crear-actividad' as Href}
  activo={false}
  colores={colores}
  escalaTexto={escalaTexto}
/>

<BottomItem
  icono="checkbox"
  texto="Evaluaciones"
  ruta={'/crear-evaluacion' as Href}
  activo={false}
  colores={colores}
  escalaTexto={escalaTexto}
/>

<BottomItem
  icono="menu"
  texto="Más"
  ruta={'/reportes' as Href}
  activo
  colores={colores}
  escalaTexto={escalaTexto}
/>
      </View>

      <SelectorModal
        visible={selectorMateriaVisible}
        titulo="Seleccionar materia"
        opciones={[
          {
            valor: 'todas',
            etiqueta: 'Todas las materias',
          },
          ...materias.map((materia) => ({
            valor: String(materia.id_materia),
            etiqueta: materia.nombre,
          })),
        ]}
        valorSeleccionado={materiaSeleccionada}
        onSeleccionar={(valor) => {
          setMateriaSeleccionada(valor);
          setSelectorMateriaVisible(false);

          const materia =
            valor === 'todas'
              ? 'Todas las materias'
              : materias.find(
                  (item) =>
                    String(item.id_materia) === valor
                )?.nombre ?? '';

          anunciar(
            `Materia seleccionada: ${materia}`
          );
        }}
        onCerrar={() =>
          setSelectorMateriaVisible(false)
        }
        colores={colores}
        escalaTexto={escalaTexto}
      />

      <SelectorModal
        visible={selectorPeriodoVisible}
        titulo="Seleccionar periodo"
        opciones={PERIODOS}
        valorSeleccionado={periodoSeleccionado}
        onSeleccionar={(valor) => {
          setPeriodoSeleccionado(valor);
          setSelectorPeriodoVisible(false);

          const periodo = PERIODOS.find(
            (item) => item.valor === valor
          );

          anunciar(
            `Periodo seleccionado: ${
              periodo?.etiqueta ?? ''
            }`
          );
        }}
        onCerrar={() =>
          setSelectorPeriodoVisible(false)
        }
        colores={colores}
        escalaTexto={escalaTexto}
      />
    </SafeAreaView>
  );
}

type ColoresAccesibilidad = {
  fondo: string;
  tarjeta: string;
  texto: string;
  textoSecundario: string;
  borde: string;
  primario: string;
  fondoPrimario: string;
  peligro: string;
};

type SelectorButtonProps = {
  texto: string;
  onPress: () => void;
  colores: ColoresAccesibilidad;
  escalaTexto: number;
  accessibilityLabel: string;
  accessibilityHint: string;
};

function SelectorButton({
  texto,
  onPress,
  colores,
  escalaTexto,
  accessibilityLabel,
  accessibilityHint,
}: SelectorButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.selector,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Text
        style={[
          styles.textoSelector,
          {
            color: colores.texto,
            fontSize: 13 * escalaTexto,
          },
        ]}
        numberOfLines={1}
      >
        {texto}
      </Text>

      <Ionicons
        name="chevron-down"
        size={18}
        color={colores.textoSecundario}
      />
    </TouchableOpacity>
  );
}

type TarjetaBaseProps = {
  titulo: string;
  colores: ColoresAccesibilidad;
  escalaTexto: number;
};

type TarjetaPromedioProps = TarjetaBaseProps & {
  valor: number;
  puntos: PuntoGrafica[];
};

function TarjetaPromedio({
  titulo,
  valor,
  puntos,
  colores,
  escalaTexto,
}: TarjetaPromedioProps) {
  return (
    <View
      style={[
        styles.tarjetaResumen,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${titulo}: ${valor.toFixed(
        1
      )}`}
    >
      <Text
        style={[
          styles.tituloTarjeta,
          {
            color: colores.texto,
            fontSize: 10 * escalaTexto,
          },
        ]}
      >
        {titulo}
      </Text>

      <View style={styles.contenidoPromedio}>
        <Text
          style={[
            styles.valorGrande,
            {
              color: colores.texto,
              fontSize: 25 * escalaTexto,
            },
          ]}
        >
          {valor.toFixed(1)}
        </Text>

        <GraficaLinea
          puntos={puntos}
          color={colores.primario}
          colorLineaBase={colores.borde}
        />
      </View>
    </View>
  );
}

type TarjetaPorcentajeCircularProps =
  TarjetaBaseProps & {
    porcentaje: number;
  };

function TarjetaPorcentajeCircular({
  titulo,
  porcentaje,
  colores,
  escalaTexto,
}: TarjetaPorcentajeCircularProps) {
  return (
    <View
      style={[
        styles.tarjetaResumen,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${titulo}: ${porcentaje} por ciento`}
    >
      <Text
        style={[
          styles.tituloTarjeta,
          {
            color: colores.texto,
            fontSize: 10 * escalaTexto,
          },
        ]}
      >
        {titulo}
      </Text>

      <View style={styles.contenidoPromedio}>
        <Text
          style={[
            styles.valorPorcentaje,
            {
              color: colores.texto,
              fontSize: 23 * escalaTexto,
            },
          ]}
        >
          {Math.round(porcentaje)}%
        </Text>

        <GraficaCircular
          porcentaje={porcentaje}
          color={colores.primario}
          colorFondo={colores.borde}
        />
      </View>
    </View>
  );
}

type TarjetaPorcentajeBarraProps =
  TarjetaBaseProps & {
    porcentaje: number;
  };

function TarjetaPorcentajeBarra({
  titulo,
  porcentaje,
  colores,
  escalaTexto,
}: TarjetaPorcentajeBarraProps) {
  const porcentajeSeguro = Math.min(
    100,
    Math.max(0, porcentaje)
  );

  return (
    <View
      style={[
        styles.tarjetaResumen,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${titulo}: ${porcentajeSeguro} por ciento`}
    >
      <Text
        style={[
          styles.tituloTarjeta,
          {
            color: colores.texto,
            fontSize: 10 * escalaTexto,
          },
        ]}
      >
        {titulo}
      </Text>

      <Text
        style={[
          styles.valorPorcentaje,
          {
            color: colores.texto,
            fontSize: 23 * escalaTexto,
          },
        ]}
      >
        {Math.round(porcentajeSeguro)}%
      </Text>

      <View
        style={[
          styles.barraFondo,
          {
            backgroundColor: colores.borde,
          },
        ]}
      >
        <View
          style={[
            styles.barraValor,
            {
              backgroundColor: colores.primario,
              width: `${porcentajeSeguro}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

type TarjetaEvaluacionesProps =
  TarjetaBaseProps & {
    cantidad: number;
  };

function TarjetaEvaluaciones({
  titulo,
  cantidad,
  colores,
  escalaTexto,
}: TarjetaEvaluacionesProps) {
  return (
    <View
      style={[
        styles.tarjetaResumen,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${titulo}: ${cantidad}`}
    >
      <Text
        style={[
          styles.tituloTarjeta,
          {
            color: colores.texto,
            fontSize: 10 * escalaTexto,
          },
        ]}
      >
        {titulo}
      </Text>

      <View style={styles.filaEvaluaciones}>
        <Text
          style={[
            styles.valorGrande,
            {
              color: colores.texto,
              fontSize: 25 * escalaTexto,
            },
          ]}
        >
          {cantidad}
        </Text>

        <Text
          style={[
            styles.textoMes,
            {
              color: colores.textoSecundario,
              fontSize: 10 * escalaTexto,
            },
          ]}
        >
          este mes
        </Text>
      </View>
    </View>
  );
}

type GraficaLineaProps = {
  puntos: PuntoGrafica[];
  color: string;
  colorLineaBase: string;
};

function GraficaLinea({
  puntos,
  color,
  colorLineaBase,
}: GraficaLineaProps) {
  const ancho = 75;
  const alto = 38;

  const valores =
    puntos.length > 0
      ? puntos.map((item) => item.valor)
      : [0, 0, 0, 0, 0];

  const maximo = Math.max(...valores, 1);
  const minimo = Math.min(...valores, 0);
  const rango = Math.max(maximo - minimo, 1);

  const coordenadas = valores
    .map((valor, index) => {
      const x =
        valores.length === 1
          ? ancho / 2
          : (index / (valores.length - 1)) *
            ancho;

      const y =
        alto -
        ((valor - minimo) / rango) *
          (alto - 7) -
        3;

      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg
      width={ancho}
      height={alto}
      accessible
      accessibilityLabel="Gráfica del rendimiento por actividades"
    >
      <Line
        x1="0"
        y1={alto - 2}
        x2={ancho}
        y2={alto - 2}
        stroke={colorLineaBase}
        strokeWidth="1"
      />

      <Polyline
        points={coordenadas}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  );
}

type GraficaCircularProps = {
  porcentaje: number;
  color: string;
  colorFondo: string;
};

function GraficaCircular({
  porcentaje,
  color,
  colorFondo,
}: GraficaCircularProps) {
  const tamano = 47;
  const grosor = 9;
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;

  const porcentajeSeguro = Math.min(
    100,
    Math.max(0, porcentaje)
  );

  const desplazamiento =
    circunferencia -
    (porcentajeSeguro / 100) * circunferencia;

  return (
    <Svg
      width={tamano}
      height={tamano}
      accessibilityLabel={`Gráfica circular de ${porcentajeSeguro} por ciento`}
    >
      <Circle
        cx={tamano / 2}
        cy={tamano / 2}
        r={radio}
        stroke={colorFondo}
        strokeWidth={grosor}
        fill="none"
      />

      <Circle
        cx={tamano / 2}
        cy={tamano / 2}
        r={radio}
        stroke={color}
        strokeWidth={grosor}
        fill="none"
        strokeDasharray={`${circunferencia} ${circunferencia}`}
        strokeDashoffset={desplazamiento}
        strokeLinecap="round"
        rotation="-90"
        origin={`${tamano / 2}, ${tamano / 2}`}
      />
    </Svg>
  );
}

type ReporteItemProps = {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  fondoIcono: string;
  colores: ColoresAccesibilidad;
  escalaTexto: number;
  onPress: () => void;
  ultimo?: boolean;
};

function ReporteItem({
  icono,
  titulo,
  fondoIcono,
  colores,
  escalaTexto,
  onPress,
  ultimo = false,
}: ReporteItemProps) {
  return (
    <TouchableOpacity
      style={[
        styles.reporteItem,
        {
          backgroundColor: fondoIcono,
          marginBottom: ultimo ? 0 : 7,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={`Abre el reporte ${titulo}`}
    >
      <Ionicons
        name={icono}
        size={20}
        color={colores.primario}
      />

      <Text
        style={[
          styles.textoReporte,
          {
            color: colores.texto,
            fontSize: 12 * escalaTexto,
          },
        ]}
      >
        {titulo}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colores.textoSecundario}
      />
    </TouchableOpacity>
  );
}

type SelectorModalProps = {
  visible: boolean;
  titulo: string;
  opciones: OpcionSelector[];
  valorSeleccionado: string;
  onSeleccionar: (valor: string) => void;
  onCerrar: () => void;
  colores: ColoresAccesibilidad;
  escalaTexto: number;
};

function SelectorModal({
  visible,
  titulo,
  opciones,
  valorSeleccionado,
  onSeleccionar,
  onCerrar,
  colores,
  escalaTexto,
}: SelectorModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
    >
      <View style={styles.fondoModal}>
        <View
          style={[
            styles.contenidoModal,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          <View style={styles.encabezadoModal}>
            <Text
              style={[
                styles.tituloModal,
                {
                  color: colores.texto,
                  fontSize: 18 * escalaTexto,
                },
              ]}
              accessibilityRole="header"
            >
              {titulo}
            </Text>

            <TouchableOpacity
              onPress={onCerrar}
              style={styles.botonCerrar}
              accessibilityRole="button"
              accessibilityLabel="Cerrar selector"
            >
              <Ionicons
                name="close"
                size={24}
                color={colores.texto}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.listaModal}
            keyboardShouldPersistTaps="handled"
          >
            {opciones.map((opcion) => {
              const seleccionado =
                opcion.valor ===
                valorSeleccionado;

              return (
                <TouchableOpacity
                  key={opcion.valor}
                  style={[
                    styles.opcionModal,
                    {
                      borderBottomColor:
                        colores.borde,
                      backgroundColor: seleccionado
                        ? colores.fondoPrimario
                        : colores.tarjeta,
                    },
                  ]}
                  onPress={() =>
                    onSeleccionar(opcion.valor)
                  }
                  accessibilityRole="radio"
                  accessibilityLabel={
                    opcion.etiqueta
                  }
                  accessibilityState={{
                    checked: seleccionado,
                    selected: seleccionado,
                  }}
                >
                  <Text
                    style={[
                      styles.textoOpcionModal,
                      {
                        color: seleccionado
                          ? colores.primario
                          : colores.texto,
                        fontSize:
                          14 * escalaTexto,
                      },
                    ]}
                  >
                    {opcion.etiqueta}
                  </Text>

                  {seleccionado && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colores.primario}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type BottomItemProps = {
  icono: keyof typeof Ionicons.glyphMap;
  texto: string;
  ruta: Href;
  activo: boolean;
  colores: ColoresAccesibilidad;
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
  const color = activo
    ? colores.primario
    : colores.textoSecundario;

  return (
    <TouchableOpacity
      style={styles.itemMenu}
      onPress={() => router.replace(ruta)}
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
        style={[
          styles.textoMenu,
          {
            color,
            fontSize: 10 * escalaTexto,
            fontWeight: activo ? '700' : '500',
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
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  botonEncabezado: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },

  encabezadoTexto: {
    flex: 1,
    paddingTop: 2,
  },

  tituloPantalla: {
    fontWeight: '800',
  },

  subtituloPantalla: {
    marginTop: 4,
  },

  contenido: {
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 30,
  },

  etiqueta: {
    fontWeight: '600',
    marginBottom: 4,
  },

  etiquetaPeriodo: {
    marginTop: 10,
  },

  selector: {
    minHeight: 45,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  textoSelector: {
    flex: 1,
  },

  tituloSeccion: {
    marginTop: 15,
    marginBottom: 8,
    fontWeight: '800',
  },

  filaTarjetas: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },

  tarjetaResumen: {
    flex: 1,
    minHeight: 91,
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  tituloTarjeta: {
    fontWeight: '600',
    marginBottom: 6,
  },

  contenidoPromedio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  valorGrande: {
    fontWeight: '800',
  },

  valorPorcentaje: {
    fontWeight: '800',
  },

  barraFondo: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },

  barraValor: {
    height: '100%',
    borderRadius: 3,
  },

  filaEvaluaciones: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  textoMes: {
    marginBottom: 4,
  },

  cargando: {
    minHeight: 195,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoCargando: {
    marginTop: 10,
  },

  listaReportes: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 5,
  },

  reporteItem: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  textoReporte: {
    flex: 1,
    marginLeft: 10,
    fontWeight: '600',
  },

  menuInferior: {
    minHeight: 65,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 3,
    paddingHorizontal: 3,
  },

  itemMenu: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textoMenu: {
    marginTop: 3,
  },

  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  contenidoModal: {
    maxHeight: '70%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
  },

  encabezadoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  tituloModal: {
    flex: 1,
    fontWeight: '800',
  },

  botonCerrar: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listaModal: {
    maxHeight: 340,
  },

  opcionModal: {
    minHeight: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  textoOpcionModal: {
    flex: 1,
    fontWeight: '600',
  },
});