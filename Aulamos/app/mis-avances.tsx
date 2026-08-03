import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type EstadoActividad = {
  nombre: string;
  cantidad: number;
  color: string;
};

type ProgresoMateria = {
  id: number;
  nombre: string;
  porcentaje: number;
  color: string;
};

const COLORES = {
  primario: '#2D5BFF',
  morado: '#8057F5',
  turquesa: '#2BB8B6',
  verde: '#17A566',
  amarillo: '#FFB818',

  fondo: '#FFFFFF',
  fondoMensaje: '#F8F6FF',
  texto: '#182033',
  textoSecundario: '#667085',
  borde: '#E7E9EE',
  barraFondo: '#E6E8EC',
  grisIcono: '#98A2B3',
};

const ESTADOS: EstadoActividad[] = [
  {
    nombre: 'Completadas',
    cantidad: 18,
    color: COLORES.turquesa,
  },
  {
    nombre: 'En progreso',
    cantidad: 6,
    color: COLORES.primario,
  },
  {
    nombre: 'Pendientes',
    cantidad: 4,
    color: '#A99CF3',
  },
];

const MATERIAS: ProgresoMateria[] = [
  {
    id: 1,
    nombre: 'Lengua y Literatura',
    porcentaje: 80,
    color: COLORES.primario,
  },
  {
    id: 2,
    nombre: 'Matemáticas',
    porcentaje: 65,
    color: COLORES.verde,
  },
  {
    id: 3,
    nombre: 'Ciencias Naturales',
    porcentaje: 75,
    color: COLORES.amarillo,
  },
  {
    id: 4,
    nombre: 'Ciencias Sociales',
    porcentaje: 60,
    color: COLORES.morado,
  },
];

interface GraficaCircularProps {
  porcentaje: number;
}

function GraficaCircular({
  porcentaje,
}: GraficaCircularProps) {
  const tamaño = 124;
  const grosor = 25;
  const radio = (tamaño - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;

  const progresoLimitado = Math.min(
    Math.max(porcentaje, 0),
    100,
  );

  const desplazamiento =
    circunferencia -
    (progresoLimitado / 100) * circunferencia;

  return (
    <View
      style={styles.contenedorGrafica}
      accessible
      accessibilityLabel={`Progreso general del ${progresoLimitado} por ciento`}
    >
      <Svg
        width={tamaño}
        height={tamaño}
        viewBox={`0 0 ${tamaño} ${tamaño}`}
      >
        <Circle
          cx={tamaño / 2}
          cy={tamaño / 2}
          r={radio}
          stroke="#E7E9EE"
          strokeWidth={grosor}
          fill="none"
        />

        <Circle
          cx={tamaño / 2}
          cy={tamaño / 2}
          r={radio}
          stroke={COLORES.turquesa}
          strokeWidth={grosor}
          fill="none"
          strokeLinecap="butt"
          strokeDasharray={`${circunferencia} ${circunferencia}`}
          strokeDashoffset={desplazamiento}
          rotation="-90"
          origin={`${tamaño / 2}, ${tamaño / 2}`}
        />
      </Svg>

      <View style={styles.centroGrafica}>
        <Text style={styles.porcentajeGrafica}>
          {progresoLimitado}%
        </Text>
      </View>
    </View>
  );
}

interface BarraMateriaProps {
  materia: ProgresoMateria;
}

function BarraMateria({
  materia,
}: BarraMateriaProps) {
  const porcentaje = Math.min(
    Math.max(materia.porcentaje, 0),
    100,
  );

  return (
    <View
      style={styles.contenedorMateria}
      accessible
      accessibilityLabel={`${materia.nombre}, progreso del ${porcentaje} por ciento`}
    >
      <View style={styles.encabezadoMateria}>
        <Text style={styles.nombreMateria}>
          {materia.nombre}
        </Text>

        <Text style={styles.porcentajeMateria}>
          {porcentaje}%
        </Text>
      </View>

      <View style={styles.fondoBarra}>
        <View
          style={[
            styles.progresoBarra,
            {
              width: `${porcentaje}%`,
              backgroundColor: materia.color,
            },
          ]}
        />
      </View>
    </View>
  );
}

type SeccionAlumno =
  | 'inicio'
  | 'actividades'
  | 'biblioteca'
  | 'avances'
  | 'chatbot';

interface OpcionNavegacion {
  id: SeccionAlumno;
  titulo: string;
  icono: keyof typeof Ionicons.glyphMap;
  ruta?: string;
}

const OPCIONES_NAVEGACION: OpcionNavegacion[] = [
  {
    id: 'inicio',
    titulo: 'Inicio',
    icono: 'home',
    ruta: '/inicio-alumno',
  },
  {
    id: 'actividades',
    titulo: 'Actividades',
    icono: 'document-text-outline',
    ruta: '/resumen-actividades',
  },
  {
    id: 'biblioteca',
    titulo: 'Biblioteca',
    icono: 'book-outline',
    ruta: '/biblioteca-alumno',
  },
  {
    id: 'avances',
    titulo: 'Mis Avances',
    icono: 'stats-chart',
    ruta: '/mis-avances',
  },
  {
    id: 'chatbot',
    titulo: 'Chatbot',
    icono: 'help-circle',
    ruta: '/chatbot',
  },
];

function BarraNavegacion() {
  const navegar = (opcion: OpcionNavegacion) => {
    if (!opcion.ruta) {
      return;
    }

    router.navigate(opcion.ruta as never);
  };

  return (
    <View style={styles.barraNavegacion}>
      {OPCIONES_NAVEGACION.map((opcion) => {
        const seleccionada = opcion.id === 'avances';

        return (
          <Pressable
            key={opcion.id}
            onPress={() => navegar(opcion)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${opcion.titulo}`}
            accessibilityState={{
              selected: seleccionada,
            }}
            style={({ pressed }) => [
              styles.opcionNavegacion,
              pressed && styles.opcionPresionada,
            ]}
          >
            <Ionicons
              name={opcion.icono}
              size={22}
              color={
                seleccionada
                  ? COLORES.primario
                  : COLORES.grisIcono
              }
            />

            <Text
              style={[
                styles.textoNavegacion,
                seleccionada &&
                  styles.textoNavegacionSeleccionado,
              ]}
              numberOfLines={1}
            >
              {opcion.titulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MisAvancesScreen() {
  const porcentajeGeneral = 72;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORES.fondo}
      />

      <View style={styles.pantalla}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contenido}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.encabezado}>
            <Text style={styles.titulo}>
              Mis avances
            </Text>

            <Pressable
              onPress={() =>
                router.navigate('/accesibilidad')
              }
              accessibilityRole="button"
              accessibilityLabel="Abrir opciones de accesibilidad"
              hitSlop={12}
              style={({ pressed }) => [
                styles.botonAccesibilidad,
                pressed && styles.opcionPresionada,
              ]}
            >
              <Ionicons
                name="accessibility"
                size={25}
                color={COLORES.morado}
              />
            </Pressable>
          </View>

          <View style={styles.mensajeMotivacional}>
            <View style={styles.informacionMensaje}>
              <Text style={styles.tituloMensaje}>
                ¡Vas muy bien!
              </Text>

              <Text style={styles.descripcionMensaje}>
                Sigue así, tú puedes lograrlo.
              </Text>
            </View>

            <Ionicons
              name="trophy"
              size={48}
              color={COLORES.amarillo}
            />
          </View>

          <View style={styles.resumen}>
            <GraficaCircular
              porcentaje={porcentajeGeneral}
            />

            <View style={styles.leyenda}>
              {ESTADOS.map((estado) => (
                <View
                  key={estado.nombre}
                  style={styles.elementoLeyenda}
                >
                  <View
                    style={[
                      styles.puntoLeyenda,
                      {
                        backgroundColor: estado.color,
                      },
                    ]}
                  />

                  <Text style={styles.nombreEstado}>
                    {estado.nombre}
                  </Text>

                  <Text style={styles.cantidadEstado}>
                    {estado.cantidad}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.subtitulo}>
            Progreso por materia
          </Text>

          <View style={styles.listaMaterias}>
            {MATERIAS.map((materia) => (
              <BarraMateria
                key={materia.id}
                materia={materia}
              />
            ))}
          </View>
        </ScrollView>

        <BarraNavegacion />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },

  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },

  scroll: {
    flex: 1,
  },

  contenido: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 32,
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 23,
  },

  titulo: {
    color: COLORES.texto,
    fontSize: 21,
    fontWeight: '700',
  },

  botonAccesibilidad: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  opcionPresionada: {
    opacity: 0.65,
  },

  mensajeMotivacional: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORES.fondoMensaje,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 32,
  },

  informacionMensaje: {
    flex: 1,
    paddingRight: 14,
  },

  tituloMensaje: {
    color: COLORES.morado,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },

  descripcionMensaje: {
    color: COLORES.textoSecundario,
    fontSize: 11,
    lineHeight: 16,
  },

  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },

  contenedorGrafica: {
    width: 124,
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centroGrafica: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  porcentajeGrafica: {
    color: COLORES.texto,
    fontSize: 23,
    fontWeight: '700',
  },

  leyenda: {
    flex: 1,
    marginLeft: 28,
  },

  elementoLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 7,
  },

  puntoLeyenda: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 7,
  },

  nombreEstado: {
    flex: 1,
    color: COLORES.textoSecundario,
    fontSize: 11,
  },

  cantidadEstado: {
    minWidth: 20,
    color: COLORES.texto,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },

  subtitulo: {
    color: COLORES.texto,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 25,
  },

  listaMaterias: {
    width: '100%',
  },

  contenedorMateria: {
    marginBottom: 28,
  },

  encabezadoMateria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  nombreMateria: {
    color: COLORES.texto,
    fontSize: 11,
    fontWeight: '500',
  },

  porcentajeMateria: {
    color: COLORES.textoSecundario,
    fontSize: 10,
  },

  fondoBarra: {
    width: '100%',
    height: 7,
    backgroundColor: COLORES.barraFondo,
    borderRadius: 10,
    overflow: 'hidden',
  },

  progresoBarra: {
    height: '100%',
    borderRadius: 10,
  },

  barraNavegacion: {
    minHeight: 70,
    flexDirection: 'row',
    backgroundColor: COLORES.fondo,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 5,
  },

  opcionNavegacion: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  textoNavegacion: {
    color: COLORES.grisIcono,
    fontSize: 8,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },

  textoNavegacionSeleccionado: {
    color: COLORES.primario,
    fontWeight: '700',
  },
});