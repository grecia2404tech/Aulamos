import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../../components/BotonAccesibilidad';
import { useAccessibility } from '../../contexts/AccessibilityContext';

type OpcionInvestigacion = {
  titulo: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
  ruta:
    | '/investigador/metricas-uso'
    | '/investigador/tiempos-actividades'
    | '/investigador/errores-navegacion'
    | '/investigador/metricas-chatbot'
    | '/investigador/progreso-investigacion'
    | '/investigador/metricas-accesibilidad'
    | '/investigador/reportes-investigacion';
};

export default function InicioInvestigadorScreen() {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  // DATOS TEMPORALES
  // Después serán reemplazados por datos provenientes de la API.
  const totalEstudiantes = 11;
  const totalAccesos = 124;
  const erroresRegistrados = 17;
  const interaccionesChatbot = 42;

  const opciones: OpcionInvestigacion[] = [
    {
      titulo: 'Uso de la plataforma',
      descripcion:
        'Consulta accesos, frecuencia de uso y módulos visitados.',
      icono: 'stats-chart-outline',
      ruta: '/investigador/metricas-uso',
    },
    {
      titulo: 'Tiempos de actividades',
      descripcion:
        'Consulta cuánto tarda cada estudiante en completar actividades.',
      icono: 'time-outline',
      ruta: '/investigador/tiempos-actividades',
    },
    {
      titulo: 'Errores de navegación',
      descripcion:
        'Revisa errores, accesos fallidos y dificultades de navegación.',
      icono: 'warning-outline',
      ruta: '/investigador/errores-navegacion',
    },
    {
      titulo: 'Uso del chatbot',
      descripcion:
        'Consulta preguntas, respuestas y duración de las interacciones.',
      icono: 'chatbubbles-outline',
      ruta: '/investigador/metricas-chatbot',
    },
    {
      titulo: 'Progreso académico',
      descripcion:
        'Analiza avances en actividades, evaluaciones y recursos.',
      icono: 'trending-up-outline',
      ruta: '/investigador/progreso-investigacion',
    },
    {
      titulo: 'Accesibilidad',
      descripcion:
        'Consulta las herramientas de accesibilidad utilizadas.',
      icono: 'accessibility-outline',
      ruta: '/investigador/metricas-accesibilidad',
    },
  ];

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colores.fondo,
        },
      ]}
    >
      {/* ENCABEZADO */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colores.tarjeta,
            borderBottomColor: colores.borde,
          },
        ]}
      >
        <View>
          <Text
            style={[
              styles.logo,
              {
                color: colores.primario,
                fontSize: 23 * escalaTexto,
              },
            ]}
          >
            AULAMOS
          </Text>

          <Text
            style={[
              styles.rol,
              {
                color: colores.textoSecundario,
                fontSize: 12 * escalaTexto,
              },
            ]}
          >
            Investigador
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* BIENVENIDA */}
        <View style={styles.bienvenida}>
          <Text
            style={[
              styles.titulo,
              {
                color: colores.texto,
                fontSize: 28 * escalaTexto,
              },
            ]}
          >
            Panel de investigación
          </Text>

          <Text
            style={[
              styles.subtitulo,
              {
                color: colores.textoSecundario,
                fontSize: 14 * escalaTexto,
              },
            ]}
          >
            Consulta las métricas registradas durante las pruebas de uso
            de la plataforma.
          </Text>
        </View>

        {/* RESUMEN */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Resumen general
        </Text>

        <View style={styles.gridResumen}>
          <TarjetaResumen
            icono="people-outline"
            valor={totalEstudiantes.toString()}
            etiqueta="Estudiantes"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="log-in-outline"
            valor={totalAccesos.toString()}
            etiqueta="Accesos"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="warning-outline"
            valor={erroresRegistrados.toString()}
            etiqueta="Errores"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="chatbubble-ellipses-outline"
            valor={interaccionesChatbot.toString()}
            etiqueta="Chatbot"
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

        {/* MÉTRICAS */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Métricas de investigación
        </Text>

        <View>
          {opciones.map((opcion) => (
            <TouchableOpacity
              key={opcion.ruta}
              activeOpacity={0.8}
              style={[
                styles.opcion,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
              onPress={() => router.push(opcion.ruta)}
              accessibilityRole="button"
              accessibilityLabel={opcion.titulo}
              accessibilityHint={opcion.descripcion}
            >
              <View
                style={[
                  styles.iconoOpcion,
                  {
                    backgroundColor: colores.fondoPrimario,
                  },
                ]}
              >
                <Ionicons
                  name={opcion.icono}
                  size={25}
                  color={colores.primario}
                />
              </View>

              <View style={styles.contenidoOpcion}>
                <Text
                  style={[
                    styles.opcionTitulo,
                    {
                      color: colores.texto,
                      fontSize: 16 * escalaTexto,
                    },
                  ]}
                >
                  {opcion.titulo}
                </Text>

                <Text
                  style={[
                    styles.opcionDescripcion,
                    {
                      color: colores.textoSecundario,
                      fontSize: 13 * escalaTexto,
                    },
                  ]}
                >
                  {opcion.descripcion}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={22}
                color={colores.textoSecundario}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* REPORTES */}
        <View style={styles.seccionReporte}>
          <Text
            style={[
              styles.tituloSeccion,
              {
                color: colores.texto,
                fontSize: 18 * escalaTexto,
              },
            ]}
          >
            Reportes
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.botonReporte,
              {
                backgroundColor: colores.primario,
              },
            ]}
            onPress={() =>
              router.push('/investigador/reportes-investigacion')
            }
            accessibilityRole="button"
            accessibilityLabel="Generar reportes de investigación"
            accessibilityHint="Abre la pantalla de reportes consolidados"
          >
            <View style={styles.botonReporteIzquierda}>
              <Ionicons
                name="document-text-outline"
                size={25}
                color="#FFFFFF"
              />

              <View style={styles.textoReporte}>
                <Text
                  style={[
                    styles.botonReporteTitulo,
                    {
                      fontSize: 16 * escalaTexto,
                    },
                  ]}
                >
                  Reportes de investigación
                </Text>

                <Text
                  style={[
                    styles.botonReporteDescripcion,
                    {
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  Consulta y exporta las métricas recopiladas
                </Text>
              </View>
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* AVISO DE DATOS */}
        <View
          style={[
            styles.aviso,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={23}
            color={colores.primario}
          />

          <Text
            style={[
              styles.avisoTexto,
              {
                color: colores.textoSecundario,
                fontSize: 12 * escalaTexto,
              },
            ]}
          >
            Los valores mostrados actualmente son datos de prueba. Más
            adelante se conectarán con la información registrada por la
            plataforma.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TarjetaResumen({
  icono,
  valor,
  etiqueta,
  colores,
  escalaTexto,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  valor: string;
  etiqueta: string;
  colores: any;
  escalaTexto: number;
}) {
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
      accessibilityLabel={`${etiqueta}: ${valor}`}
    >
      <View
        style={[
          styles.iconoResumen,
          {
            backgroundColor: colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={icono}
          size={23}
          color={colores.primario}
        />
      </View>

      <Text
        style={[
          styles.valorResumen,
          {
            color: colores.texto,
            fontSize: 24 * escalaTexto,
          },
        ]}
      >
        {valor}
      </Text>

      <Text
        style={[
          styles.etiquetaResumen,
          {
            color: colores.textoSecundario,
            fontSize: 12 * escalaTexto,
          },
        ]}
      >
        {etiqueta}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    minHeight: 68,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  rol: {
    marginTop: 2,
    fontWeight: '500',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 45,
  },

  bienvenida: {
    marginBottom: 25,
  },

  titulo: {
    fontWeight: '800',
  },

  subtitulo: {
    marginTop: 7,
    lineHeight: 21,
  },

  tituloSeccion: {
    fontWeight: '700',
    marginBottom: 13,
  },

  gridResumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  tarjetaResumen: {
    width: '48.5%',
    minHeight: 135,
    borderRadius: 17,
    borderWidth: 1,
    padding: 15,
    marginBottom: 12,
  },

  iconoResumen: {
    width: 43,
    height: 43,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  valorResumen: {
    fontWeight: '800',
    marginTop: 12,
  },

  etiquetaResumen: {
    marginTop: 3,
    fontWeight: '500',
  },

  opcion: {
    width: '100%',
    minHeight: 86,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoOpcion: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  contenidoOpcion: {
    flex: 1,
    marginHorizontal: 13,
  },

  opcionTitulo: {
    fontWeight: '700',
  },

  opcionDescripcion: {
    marginTop: 4,
    lineHeight: 18,
  },

  seccionReporte: {
    marginTop: 17,
  },

  botonReporte: {
    minHeight: 86,
    borderRadius: 17,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  botonReporteIzquierda: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  textoReporte: {
    flex: 1,
    marginLeft: 13,
  },

  botonReporteTitulo: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  botonReporteDescripcion: {
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
    lineHeight: 17,
  },

  aviso: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
    marginTop: 23,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  avisoTexto: {
    flex: 1,
    marginLeft: 9,
    lineHeight: 18,
  },
});