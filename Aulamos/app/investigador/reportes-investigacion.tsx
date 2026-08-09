import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../../components/BotonAccesibilidad';
import { useAccessibility } from '../../contexts/AccessibilityContext';

type ResumenReporte = {
  id: number;
  titulo: string;
  valor: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
};

const resumenes: ResumenReporte[] = [
  {
    id: 1,
    titulo: 'Accesibilidad',
    valor: '9 de 11',
    descripcion: 'Estudiantes utilizaron alguna función de accesibilidad.',
    icono: 'accessibility-outline',
  },
  {
    id: 2,
    titulo: 'Tiempo promedio',
    valor: '18 min 42 s',
    descripcion: 'Tiempo promedio empleado para completar actividades.',
    icono: 'time-outline',
  },
  {
    id: 3,
    titulo: 'Errores registrados',
    valor: '17',
    descripcion: 'Errores y dificultades de navegación detectados.',
    icono: 'warning-outline',
  },
  {
    id: 4,
    titulo: 'Uso del chatbot',
    valor: '42',
    descripcion: 'Interacciones realizadas con el chatbot educativo.',
    icono: 'chatbubbles-outline',
  },
  {
    id: 5,
    titulo: 'Progreso académico',
    valor: '76%',
    descripcion: 'Porcentaje promedio de avance de los estudiantes.',
    icono: 'trending-up-outline',
  },
];

export default function ReportesInvestigacionScreen() {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  const mostrarExportacion = (tipo: 'CSV' | 'Excel') => {
    Alert.alert(
      `Exportar ${tipo}`,
      `La exportación a ${tipo} estará disponible cuando se conecte el módulo de investigación con la información real.`
    );
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
        <TouchableOpacity
          style={styles.botonRegresar}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
          accessibilityHint="Regresa al panel de investigación"
        >
          <Ionicons
            name="arrow-back-outline"
            size={25}
            color={colores.texto}
          />
        </TouchableOpacity>

        <View style={styles.headerCentro}>
          <Text
            style={[
              styles.headerTitulo,
              {
                color: colores.texto,
                fontSize: 18 * escalaTexto,
              },
            ]}
          >
            Reportes de investigación
          </Text>

          <Text
            style={[
              styles.headerSubtitulo,
              {
                color: colores.textoSecundario,
                fontSize: 11 * escalaTexto,
              },
            ]}
          >
            HU30
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contenido}
      >
        {/* INTRODUCCIÓN */}
        <Text
          style={[
            styles.titulo,
            {
              color: colores.texto,
              fontSize: 26 * escalaTexto,
            },
          ]}
        >
          Reporte consolidado
        </Text>

        <Text
          style={[
            styles.descripcion,
            {
              color: colores.textoSecundario,
              fontSize: 14 * escalaTexto,
            },
          ]}
        >
          Consulta un resumen de las métricas recopiladas durante las
          pruebas de uso de la plataforma.
        </Text>

        {/* PERIODO */}
        <View
          style={[
            styles.periodo,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          <View style={styles.periodoIzquierda}>
            <View
              style={[
                styles.iconoPeriodo,
                {
                  backgroundColor: colores.fondoPrimario,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={22}
                color={colores.primario}
              />
            </View>

            <View>
              <Text
                style={[
                  styles.periodoEtiqueta,
                  {
                    color: colores.textoSecundario,
                    fontSize: 11 * escalaTexto,
                  },
                ]}
              >
                Periodo del reporte
              </Text>

              <Text
                style={[
                  styles.periodoValor,
                  {
                    color: colores.texto,
                    fontSize: 14 * escalaTexto,
                  },
                ]}
              >
                01 Ago - 08 Ago 2026
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-down-outline"
            size={20}
            color={colores.textoSecundario}
          />
        </View>

        {/* RESUMEN GENERAL */}
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

        {resumenes.map((item) => (
          <View
            key={item.id}
            style={[
              styles.tarjetaResumen,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
            accessible
            accessibilityLabel={`${item.titulo}: ${item.valor}. ${item.descripcion}`}
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
                name={item.icono}
                size={24}
                color={colores.primario}
              />
            </View>

            <View style={styles.resumenContenido}>
              <Text
                style={[
                  styles.resumenTitulo,
                  {
                    color: colores.texto,
                    fontSize: 14 * escalaTexto,
                  },
                ]}
              >
                {item.titulo}
              </Text>

              <Text
                style={[
                  styles.resumenValor,
                  {
                    color: colores.primario,
                    fontSize: 20 * escalaTexto,
                  },
                ]}
              >
                {item.valor}
              </Text>

              <Text
                style={[
                  styles.resumenDescripcion,
                  {
                    color: colores.textoSecundario,
                    fontSize: 11 * escalaTexto,
                  },
                ]}
              >
                {item.descripcion}
              </Text>
            </View>
          </View>
        ))}

        {/* ESTADÍSTICAS DE ACCESIBILIDAD */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Estadísticas de accesibilidad
        </Text>

        <View
          style={[
            styles.tarjetaEstadisticas,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          <BarraEstadistica
            titulo="Alto contraste"
            porcentaje={73}
            texto="8 estudiantes"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <BarraEstadistica
            titulo="Tamaño de texto"
            porcentaje={55}
            texto="6 estudiantes"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <BarraEstadistica
            titulo="Lector de pantalla"
            porcentaje={27}
            texto="3 estudiantes"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <BarraEstadistica
            titulo="Subtítulos"
            porcentaje={45}
            texto="5 estudiantes"
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

        {/* MÉTRICAS INCLUIDAS */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Métricas incluidas
        </Text>

        <View
          style={[
            styles.tarjetaIncluidas,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          <FilaIncluida
            icono="accessibility-outline"
            texto="Estadísticas de accesibilidad"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaIncluida
            icono="time-outline"
            texto="Tiempos de realización"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaIncluida
            icono="warning-outline"
            texto="Errores de navegación"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaIncluida
            icono="chatbubbles-outline"
            texto="Uso del chatbot"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaIncluida
            icono="trending-up-outline"
            texto="Progreso académico"
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

        {/* EXPORTACIÓN */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Exportar reporte
        </Text>

        <Text
          style={[
            styles.descripcionExportacion,
            {
              color: colores.textoSecundario,
              fontSize: 12 * escalaTexto,
            },
          ]}
        >
          Selecciona el formato en el que deseas obtener la información
          recopilada.
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.botonExportar,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
          onPress={() => mostrarExportacion('CSV')}
          accessibilityRole="button"
          accessibilityLabel="Exportar reporte en CSV"
        >
          <View
            style={[
              styles.iconoExportar,
              {
                backgroundColor: colores.fondoPrimario,
              },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={25}
              color={colores.primario}
            />
          </View>

          <View style={styles.exportarContenido}>
            <Text
              style={[
                styles.exportarTitulo,
                {
                  color: colores.texto,
                  fontSize: 15 * escalaTexto,
                },
              ]}
            >
              Exportar CSV
            </Text>

            <Text
              style={[
                styles.exportarDescripcion,
                {
                  color: colores.textoSecundario,
                  fontSize: 11 * escalaTexto,
                },
              ]}
            >
              Archivo compatible con hojas de cálculo
            </Text>
          </View>

          <Ionicons
            name="download-outline"
            size={23}
            color={colores.primario}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.botonExportarPrincipal,
            {
              backgroundColor: colores.primario,
            },
          ]}
          onPress={() => mostrarExportacion('Excel')}
          accessibilityRole="button"
          accessibilityLabel="Exportar reporte en Excel"
        >
          <View style={styles.iconoExportarExcel}>
            <Ionicons
              name="grid-outline"
              size={25}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.exportarContenido}>
            <Text
              style={[
                styles.exportarTituloExcel,
                {
                  fontSize: 15 * escalaTexto,
                },
              ]}
            >
              Exportar Excel
            </Text>

            <Text
              style={[
                styles.exportarDescripcionExcel,
                {
                  fontSize: 11 * escalaTexto,
                },
              ]}
            >
              Reporte organizado en formato de hoja de cálculo
            </Text>
          </View>

          <Ionicons
            name="download-outline"
            size={23}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* AVISO */}
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
            size={22}
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
            Los resultados mostrados son datos de prueba. La generación
            real de archivos CSV y Excel se implementará posteriormente
            al conectar el módulo con la información registrada por
            AULAMOS.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BarraEstadistica({
  titulo,
  porcentaje,
  texto,
  colores,
  escalaTexto,
}: {
  titulo: string;
  porcentaje: number;
  texto: string;
  colores: any;
  escalaTexto: number;
}) {
  return (
    <View
      style={styles.estadistica}
      accessible
      accessibilityLabel={`${titulo}: ${porcentaje} por ciento, ${texto}`}
    >
      <View style={styles.estadisticaEncabezado}>
        <Text
          style={[
            styles.estadisticaTitulo,
            {
              color: colores.texto,
              fontSize: 13 * escalaTexto,
            },
          ]}
        >
          {titulo}
        </Text>

        <Text
          style={[
            styles.estadisticaTexto,
            {
              color: colores.textoSecundario,
              fontSize: 11 * escalaTexto,
            },
          ]}
        >
          {texto}
        </Text>
      </View>

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
            styles.barra,
            {
              width: `${porcentaje}%`,
              backgroundColor: colores.primario,
            },
          ]}
        />
      </View>
    </View>
  );
}

function FilaIncluida({
  icono,
  texto,
  colores,
  escalaTexto,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  texto: string;
  colores: any;
  escalaTexto: number;
}) {
  return (
    <View style={styles.filaIncluida}>
      <View
        style={[
          styles.iconoIncluido,
          {
            backgroundColor: colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={icono}
          size={19}
          color={colores.primario}
        />
      </View>

      <Text
        style={[
          styles.textoIncluido,
          {
            color: colores.texto,
            fontSize: 13 * escalaTexto,
          },
        ]}
      >
        {texto}
      </Text>

      <Ionicons
        name="checkmark-circle"
        size={21}
        color={colores.exito}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    minHeight: 65,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  botonRegresar: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  headerCentro: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitulo: {
    fontWeight: '700',
  },

  headerSubtitulo: {
    marginTop: 2,
    fontWeight: '500',
  },

  contenido: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 45,
  },

  titulo: {
    fontWeight: '800',
  },

  descripcion: {
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 21,
  },

  periodo: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 27,
  },

  periodoIzquierda: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoPeriodo: {
    width: 43,
    height: 43,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  periodoEtiqueta: {
    fontWeight: '500',
  },

  periodoValor: {
    fontWeight: '700',
    marginTop: 3,
  },

  tituloSeccion: {
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 13,
  },

  tarjetaResumen: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoResumen: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  resumenContenido: {
    flex: 1,
    marginLeft: 13,
  },

  resumenTitulo: {
    fontWeight: '700',
  },

  resumenValor: {
    fontWeight: '800',
    marginTop: 3,
  },

  resumenDescripcion: {
    lineHeight: 16,
    marginTop: 3,
  },

  tarjetaEstadisticas: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 16,
    marginBottom: 27,
  },

  estadistica: {
    marginBottom: 18,
  },

  estadisticaEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  estadisticaTitulo: {
    fontWeight: '700',
  },

  estadisticaTexto: {
    fontWeight: '500',
  },

  barraFondo: {
    width: '100%',
    height: 9,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
  },

  barra: {
    height: '100%',
    borderRadius: 20,
  },

  tarjetaIncluidas: {
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 15,
    marginBottom: 27,
  },

  filaIncluida: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoIncluido: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textoIncluido: {
    flex: 1,
    marginLeft: 11,
    fontWeight: '600',
  },

  descripcionExportacion: {
    marginTop: -5,
    marginBottom: 13,
    lineHeight: 18,
  },

  botonExportar: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },

  botonExportarPrincipal: {
    minHeight: 78,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoExportar: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconoExportarExcel: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  exportarContenido: {
    flex: 1,
    marginLeft: 12,
  },

  exportarTitulo: {
    fontWeight: '700',
  },

  exportarDescripcion: {
    marginTop: 3,
  },

  exportarTituloExcel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  exportarDescripcionExcel: {
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 3,
  },

  aviso: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  avisoTexto: {
    flex: 1,
    marginLeft: 9,
    lineHeight: 18,
  },
});