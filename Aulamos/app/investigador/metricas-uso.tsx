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

// ==========================================
// TIPOS
// ==========================================

type ModuloVisitado = {
  id: number;
  nombre: string;
  visitas: number;
};

type ActividadReciente = {
  id: number;
  estudiante: string;
  modulo: string;
  fecha: string;
  hora: string;
  icono: keyof typeof Ionicons.glyphMap;
};

// ==========================================
// DATOS DE PRUEBA
// Posteriormente se reemplazarán por la API.
// ==========================================

const modulosVisitados: ModuloVisitado[] = [
  {
    id: 1,
    nombre: 'Actividades',
    visitas: 45,
  },
  {
    id: 2,
    nombre: 'Biblioteca digital',
    visitas: 31,
  },
  {
    id: 3,
    nombre: 'Chatbot',
    visitas: 22,
  },
  {
    id: 4,
    nombre: 'Mis avances',
    visitas: 15,
  },
  {
    id: 5,
    nombre: 'Evaluaciones',
    visitas: 11,
  },
];

const actividadReciente: ActividadReciente[] = [
  {
    id: 1,
    estudiante: 'Ana López',
    modulo: 'Actividades',
    fecha: '08/08/2026',
    hora: '10:25',
    icono: 'document-text-outline',
  },
  {
    id: 2,
    estudiante: 'Carlos Díaz',
    modulo: 'Biblioteca digital',
    fecha: '08/08/2026',
    hora: '10:18',
    icono: 'library-outline',
  },
  {
    id: 3,
    estudiante: 'María Pérez',
    modulo: 'Chatbot',
    fecha: '08/08/2026',
    hora: '09:52',
    icono: 'chatbubbles-outline',
  },
  {
    id: 4,
    estudiante: 'José Hernández',
    modulo: 'Evaluaciones',
    fecha: '07/08/2026',
    hora: '13:40',
    icono: 'clipboard-outline',
  },
];

export default function MetricasUsoScreen() {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  // Datos temporales
  const totalAccesos = 124;
  const totalEstudiantes = 11;
  const promedioAccesos = 11.3;
  const moduloMasVisitado = 'Actividades';

  // Sirve para calcular visualmente las barras.
  const maxVisitas = Math.max(
    ...modulosVisitados.map((modulo) => modulo.visitas)
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colores.fondo,
        },
      ]}
    >
      {/* ======================================
          ENCABEZADO
      ====================================== */}
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
            Uso de la plataforma
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
            HU26
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contenido}
      >
        {/* ======================================
            DESCRIPCIÓN
        ====================================== */}
        <Text
          style={[
            styles.titulo,
            {
              color: colores.texto,
              fontSize: 26 * escalaTexto,
            },
          ]}
        >
          Métricas de uso
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
          Consulta cómo utilizan los estudiantes la plataforma durante
          las pruebas de uso.
        </Text>

        {/* ======================================
            PERIODO
        ====================================== */}
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
                Periodo analizado
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

        {/* ======================================
            RESUMEN
        ====================================== */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Resumen
        </Text>

        <View style={styles.gridResumen}>
          <TarjetaResumen
            icono="log-in-outline"
            valor={totalAccesos.toString()}
            etiqueta="Accesos"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="people-outline"
            valor={totalEstudiantes.toString()}
            etiqueta="Estudiantes"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="repeat-outline"
            valor={promedioAccesos.toString()}
            etiqueta="Promedio de accesos"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="star-outline"
            valor="45"
            etiqueta="Mayor frecuencia"
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

        {/* ======================================
            MÓDULOS VISITADOS
        ====================================== */}
        <View style={styles.encabezadoSeccion}>
          <Text
            style={[
              styles.tituloSeccionSinMargen,
              {
                color: colores.texto,
                fontSize: 18 * escalaTexto,
              },
            ]}
          >
            Módulos más visitados
          </Text>

          <Text
            style={[
              styles.totalVisitas,
              {
                color: colores.textoSecundario,
                fontSize: 12 * escalaTexto,
              },
            ]}
          >
            Número de visitas
          </Text>
        </View>

        <View
          style={[
            styles.tarjetaGrafica,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          {modulosVisitados.map((modulo, index) => {
            const porcentaje =
              maxVisitas > 0
                ? (modulo.visitas / maxVisitas) * 100
                : 0;

            return (
              <View
                key={modulo.id}
                style={[
                  styles.modulo,
                  index === modulosVisitados.length - 1 &&
                    styles.moduloUltimo,
                ]}
                accessible
                accessibilityLabel={`${modulo.nombre}, ${modulo.visitas} visitas`}
              >
                <View style={styles.filaModulo}>
                  <Text
                    style={[
                      styles.nombreModulo,
                      {
                        color: colores.texto,
                        fontSize: 14 * escalaTexto,
                      },
                    ]}
                  >
                    {modulo.nombre}
                  </Text>

                  <Text
                    style={[
                      styles.numeroVisitas,
                      {
                        color: colores.primario,
                        fontSize: 14 * escalaTexto,
                      },
                    ]}
                  >
                    {modulo.visitas}
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
                      styles.barraProgreso,
                      {
                        width: `${porcentaje}%`,
                        backgroundColor: colores.primario,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}

          <View
            style={[
              styles.destacado,
              {
                backgroundColor: colores.fondoPrimario,
              },
            ]}
          >
            <Ionicons
              name="trending-up-outline"
              size={20}
              color={colores.primario}
            />

            <Text
              style={[
                styles.destacadoTexto,
                {
                  color: colores.texto,
                  fontSize: 12 * escalaTexto,
                },
              ]}
            >
              El módulo con mayor frecuencia de uso es{' '}
              <Text style={styles.negrita}>
                {moduloMasVisitado}
              </Text>
              .
            </Text>
          </View>
        </View>

        {/* ======================================
            ACTIVIDAD RECIENTE
        ====================================== */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Actividad reciente
        </Text>

        <View
          style={[
            styles.tarjetaActividad,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          {actividadReciente.map((actividad, index) => (
            <View
              key={actividad.id}
              style={[
                styles.actividad,
                index !== actividadReciente.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colores.borde,
                },
              ]}
              accessible
              accessibilityLabel={`${actividad.estudiante} visitó ${actividad.modulo} el ${actividad.fecha} a las ${actividad.hora}`}
            >
              <View
                style={[
                  styles.iconoActividad,
                  {
                    backgroundColor: colores.fondoPrimario,
                  },
                ]}
              >
                <Ionicons
                  name={actividad.icono}
                  size={21}
                  color={colores.primario}
                />
              </View>

              <View style={styles.actividadContenido}>
                <Text
                  style={[
                    styles.estudiante,
                    {
                      color: colores.texto,
                      fontSize: 14 * escalaTexto,
                    },
                  ]}
                >
                  {actividad.estudiante}
                </Text>

                <Text
                  style={[
                    styles.moduloActividad,
                    {
                      color: colores.textoSecundario,
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  {actividad.modulo}
                </Text>
              </View>

              <View style={styles.fechaContenido}>
                <Text
                  style={[
                    styles.fecha,
                    {
                      color: colores.textoSecundario,
                      fontSize: 11 * escalaTexto,
                    },
                  ]}
                >
                  {actividad.fecha}
                </Text>

                <Text
                  style={[
                    styles.hora,
                    {
                      color: colores.textoSecundario,
                      fontSize: 11 * escalaTexto,
                    },
                  ]}
                >
                  {actividad.hora}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ======================================
            DATOS REGISTRADOS
        ====================================== */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Información registrada
        </Text>

        <View
          style={[
            styles.tarjetaInformacion,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          <FilaInformacion
            texto="Módulos visitados"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Número de accesos"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Frecuencia de uso"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Fecha y hora de acceso"
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

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
            Los datos mostrados en esta pantalla son de prueba. Más
            adelante serán sustituidos por las métricas registradas
            automáticamente por AULAMOS.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// TARJETA DE RESUMEN
// ==========================================

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
          size={22}
          color={colores.primario}
        />
      </View>

      <Text
        style={[
          styles.valorResumen,
          {
            color: colores.texto,
            fontSize: 23 * escalaTexto,
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
            fontSize: 11 * escalaTexto,
          },
        ]}
      >
        {etiqueta}
      </Text>
    </View>
  );
}

// ==========================================
// FILA DE INFORMACIÓN
// ==========================================

function FilaInformacion({
  texto,
  colores,
  escalaTexto,
}: {
  texto: string;
  colores: any;
  escalaTexto: number;
}) {
  return (
    <View style={styles.filaInformacion}>
      <Ionicons
        name="checkmark-circle"
        size={21}
        color={colores.exito}
      />

      <Text
        style={[
          styles.textoInformacion,
          {
            color: colores.texto,
            fontSize: 13 * escalaTexto,
          },
        ]}
      >
        {texto}
      </Text>
    </View>
  );
}

// ==========================================
// ESTILOS
// ==========================================

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
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 20,
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
    marginBottom: 13,
    marginTop: 4,
  },

  tituloSeccionSinMargen: {
    fontWeight: '700',
  },

  gridResumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  tarjetaResumen: {
    width: '48.5%',
    minHeight: 130,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 11,
  },

  iconoResumen: {
    width: 40,
    height: 40,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  valorResumen: {
    fontWeight: '800',
    marginTop: 10,
  },

  etiquetaResumen: {
    fontWeight: '500',
    marginTop: 3,
  },

  encabezadoSeccion: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  totalVisitas: {
    fontWeight: '500',
  },

  tarjetaGrafica: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 16,
    marginBottom: 27,
  },

  modulo: {
    marginBottom: 18,
  },

  moduloUltimo: {
    marginBottom: 8,
  },

  filaModulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  nombreModulo: {
    fontWeight: '600',
  },

  numeroVisitas: {
    fontWeight: '800',
  },

  barraFondo: {
    width: '100%',
    height: 9,
    borderRadius: 20,
    marginTop: 8,
    overflow: 'hidden',
  },

  barraProgreso: {
    height: '100%',
    borderRadius: 20,
  },

  destacado: {
    marginTop: 13,
    borderRadius: 13,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  destacadoTexto: {
    flex: 1,
    marginLeft: 9,
    lineHeight: 18,
  },

  negrita: {
    fontWeight: '800',
  },

  tarjetaActividad: {
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 15,
    marginBottom: 27,
  },

  actividad: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },

  iconoActividad: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actividadContenido: {
    flex: 1,
    marginLeft: 12,
  },

  estudiante: {
    fontWeight: '700',
  },

  moduloActividad: {
    marginTop: 3,
  },

  fechaContenido: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },

  fecha: {
    fontWeight: '500',
  },

  hora: {
    marginTop: 3,
  },

  tarjetaInformacion: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginBottom: 22,
  },

  filaInformacion: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 39,
  },

  textoInformacion: {
    marginLeft: 10,
    fontWeight: '500',
  },

  aviso: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  avisoTexto: {
    flex: 1,
    marginLeft: 9,
    lineHeight: 18,
  },
});