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

type TiempoActividad = {
  id: number;
  estudiante: string;
  actividad: string;
  fechaInicio: string;
  horaInicio: string;
  fechaFin: string;
  horaFin: string;
  tiempoTotal: string;
  minutos: number;
};

type ResumenActividad = {
  id: number;
  nombre: string;
  promedio: string;
  estudiantes: number;
};

// ==========================================
// DATOS DE PRUEBA
// Después se reemplazarán con datos de la API.
// ==========================================

const resumenActividades: ResumenActividad[] = [
  {
    id: 1,
    nombre: 'Ecosistemas',
    promedio: '14 min 32 s',
    estudiantes: 10,
  },
  {
    id: 2,
    nombre: 'Ecuaciones lineales',
    promedio: '21 min 10 s',
    estudiantes: 11,
  },
  {
    id: 3,
    nombre: 'Sistema solar',
    promedio: '16 min 25 s',
    estudiantes: 9,
  },
  {
    id: 4,
    nombre: 'Estados de la materia',
    promedio: '19 min 08 s',
    estudiantes: 8,
  },
];

const registrosTiempo: TiempoActividad[] = [
  {
    id: 1,
    estudiante: 'Ana López',
    actividad: 'Ecosistemas',
    fechaInicio: '08/08/2026',
    horaInicio: '10:04',
    fechaFin: '08/08/2026',
    horaFin: '10:18',
    tiempoTotal: '14 min',
    minutos: 14,
  },
  {
    id: 2,
    estudiante: 'Carlos Díaz',
    actividad: 'Ecosistemas',
    fechaInicio: '08/08/2026',
    horaInicio: '10:07',
    fechaFin: '08/08/2026',
    horaFin: '10:25',
    tiempoTotal: '18 min',
    minutos: 18,
  },
  {
    id: 3,
    estudiante: 'María Pérez',
    actividad: 'Ecuaciones lineales',
    fechaInicio: '08/08/2026',
    horaInicio: '09:20',
    fechaFin: '08/08/2026',
    horaFin: '09:42',
    tiempoTotal: '22 min',
    minutos: 22,
  },
  {
    id: 4,
    estudiante: 'José Hernández',
    actividad: 'Sistema solar',
    fechaInicio: '07/08/2026',
    horaInicio: '12:30',
    fechaFin: '07/08/2026',
    horaFin: '12:47',
    tiempoTotal: '17 min',
    minutos: 17,
  },
];

export default function TiemposActividadesScreen() {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  const tiempoPromedioGeneral = '18 min 42 s';
  const actividadMasRapida = 'Ecosistemas';
  const actividadMasLenta = 'Ecuaciones lineales';

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
            Tiempos de actividades
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
            HU27
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
          Tiempo de realización
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
          Consulta cuánto tiempo tarda cada estudiante en completar
          una actividad durante las pruebas de uso.
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

        {/* TIEMPO PROMEDIO */}
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

        <View
          style={[
            styles.tarjetaPromedio,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
          accessible
          accessibilityLabel={`Tiempo promedio general: ${tiempoPromedioGeneral}`}
        >
          <View
            style={[
              styles.iconoPromedio,
              {
                backgroundColor: colores.fondoPrimario,
              },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={29}
              color={colores.primario}
            />
          </View>

          <View style={styles.promedioContenido}>
            <Text
              style={[
                styles.promedioEtiqueta,
                {
                  color: colores.textoSecundario,
                  fontSize: 12 * escalaTexto,
                },
              ]}
            >
              Tiempo promedio
            </Text>

            <Text
              style={[
                styles.promedioValor,
                {
                  color: colores.texto,
                  fontSize: 28 * escalaTexto,
                },
              ]}
            >
              {tiempoPromedioGeneral}
            </Text>
          </View>
        </View>

        {/* DESTACADOS */}
        <View style={styles.gridDestacados}>
          <View
            style={[
              styles.tarjetaDestacada,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <Ionicons
              name="flash-outline"
              size={22}
              color={colores.exito}
            />

            <Text
              style={[
                styles.destacadoEtiqueta,
                {
                  color: colores.textoSecundario,
                  fontSize: 11 * escalaTexto,
                },
              ]}
            >
              Menor tiempo
            </Text>

            <Text
              numberOfLines={2}
              style={[
                styles.destacadoValor,
                {
                  color: colores.texto,
                  fontSize: 14 * escalaTexto,
                },
              ]}
            >
              {actividadMasRapida}
            </Text>
          </View>

          <View
            style={[
              styles.tarjetaDestacada,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <Ionicons
              name="hourglass-outline"
              size={22}
              color={colores.primario}
            />

            <Text
              style={[
                styles.destacadoEtiqueta,
                {
                  color: colores.textoSecundario,
                  fontSize: 11 * escalaTexto,
                },
              ]}
            >
              Mayor tiempo
            </Text>

            <Text
              numberOfLines={2}
              style={[
                styles.destacadoValor,
                {
                  color: colores.texto,
                  fontSize: 14 * escalaTexto,
                },
              ]}
            >
              {actividadMasLenta}
            </Text>
          </View>
        </View>

        {/* PROMEDIO POR ACTIVIDAD */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Promedio por actividad
        </Text>

        <View
          style={[
            styles.tarjetaActividades,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          {resumenActividades.map((actividad, index) => (
            <View
              key={actividad.id}
              style={[
                styles.actividadResumen,
                index !== resumenActividades.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colores.borde,
                },
              ]}
              accessible
              accessibilityLabel={`${actividad.nombre}, promedio ${actividad.promedio}, ${actividad.estudiantes} estudiantes`}
            >
              <View
                style={[
                  styles.iconoActividadResumen,
                  {
                    backgroundColor: colores.fondoPrimario,
                  },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colores.primario}
                />
              </View>

              <View style={styles.actividadResumenContenido}>
                <Text
                  style={[
                    styles.nombreActividad,
                    {
                      color: colores.texto,
                      fontSize: 14 * escalaTexto,
                    },
                  ]}
                >
                  {actividad.nombre}
                </Text>

                <Text
                  style={[
                    styles.estudiantesActividad,
                    {
                      color: colores.textoSecundario,
                      fontSize: 11 * escalaTexto,
                    },
                  ]}
                >
                  {actividad.estudiantes} estudiantes
                </Text>
              </View>

              <View style={styles.promedioActividadContenido}>
                <Text
                  style={[
                    styles.promedioActividad,
                    {
                      color: colores.primario,
                      fontSize: 14 * escalaTexto,
                    },
                  ]}
                >
                  {actividad.promedio}
                </Text>

                <Text
                  style={[
                    styles.textoPromedio,
                    {
                      color: colores.textoSecundario,
                      fontSize: 10 * escalaTexto,
                    },
                  ]}
                >
                  promedio
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* REGISTROS POR ESTUDIANTE */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Registros por estudiante
        </Text>

        {registrosTiempo.map((registro) => (
          <View
            key={registro.id}
            style={[
              styles.tarjetaRegistro,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
            accessible
            accessibilityLabel={`${registro.estudiante}, actividad ${registro.actividad}, inició ${registro.fechaInicio} a las ${registro.horaInicio}, finalizó ${registro.fechaFin} a las ${registro.horaFin}, tiempo total ${registro.tiempoTotal}`}
          >
            {/* Encabezado */}
            <View style={styles.registroEncabezado}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: colores.fondoPrimario,
                  },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={22}
                  color={colores.primario}
                />
              </View>

              <View style={styles.estudianteContenido}>
                <Text
                  style={[
                    styles.estudiante,
                    {
                      color: colores.texto,
                      fontSize: 15 * escalaTexto,
                    },
                  ]}
                >
                  {registro.estudiante}
                </Text>

                <Text
                  style={[
                    styles.actividadNombre,
                    {
                      color: colores.textoSecundario,
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  {registro.actividad}
                </Text>
              </View>

              <View
                style={[
                  styles.badgeTiempo,
                  {
                    backgroundColor: colores.fondoPrimario,
                  },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={colores.primario}
                />

                <Text
                  style={[
                    styles.badgeTiempoTexto,
                    {
                      color: colores.primario,
                      fontSize: 11 * escalaTexto,
                    },
                  ]}
                >
                  {registro.tiempoTotal}
                </Text>
              </View>
            </View>

            {/* Línea de tiempo */}
            <View style={styles.lineaTiempo}>
              <View style={styles.puntoTiempoContenido}>
                <View
                  style={[
                    styles.puntoTiempo,
                    {
                      backgroundColor: colores.exito,
                    },
                  ]}
                />

                <View>
                  <Text
                    style={[
                      styles.tiempoEtiqueta,
                      {
                        color: colores.textoSecundario,
                        fontSize: 10 * escalaTexto,
                      },
                    ]}
                  >
                    Inicio
                  </Text>

                  <Text
                    style={[
                      styles.tiempoValor,
                      {
                        color: colores.texto,
                        fontSize: 12 * escalaTexto,
                      },
                    ]}
                  >
                    {registro.fechaInicio}
                  </Text>

                  <Text
                    style={[
                      styles.tiempoHora,
                      {
                        color: colores.textoSecundario,
                        fontSize: 11 * escalaTexto,
                      },
                    ]}
                  >
                    {registro.horaInicio}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.lineaHorizontal,
                  {
                    backgroundColor: colores.borde,
                  },
                ]}
              />

              <View style={styles.puntoTiempoContenido}>
                <View
                  style={[
                    styles.puntoTiempo,
                    {
                      backgroundColor: colores.primario,
                    },
                  ]}
                />

                <View>
                  <Text
                    style={[
                      styles.tiempoEtiqueta,
                      {
                        color: colores.textoSecundario,
                        fontSize: 10 * escalaTexto,
                      },
                    ]}
                  >
                    Finalización
                  </Text>

                  <Text
                    style={[
                      styles.tiempoValor,
                      {
                        color: colores.texto,
                        fontSize: 12 * escalaTexto,
                      },
                    ]}
                  >
                    {registro.fechaFin}
                  </Text>

                  <Text
                    style={[
                      styles.tiempoHora,
                      {
                        color: colores.textoSecundario,
                        fontSize: 11 * escalaTexto,
                      },
                    ]}
                  >
                    {registro.horaFin}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* INFORMACIÓN REGISTRADA */}
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
            texto="Fecha y hora de inicio"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Fecha y hora de finalización"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Tiempo total empleado"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Actividad realizada"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Estudiante correspondiente"
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
            Los tiempos mostrados son datos de prueba. Posteriormente
            serán calculados automáticamente desde el inicio hasta la
            finalización de cada actividad.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    marginTop: 5,
    marginBottom: 13,
  },

  tarjetaPromedio: {
    minHeight: 105,
    borderWidth: 1,
    borderRadius: 17,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  iconoPromedio: {
    width: 57,
    height: 57,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  promedioContenido: {
    marginLeft: 15,
    flex: 1,
  },

  promedioEtiqueta: {
    fontWeight: '500',
  },

  promedioValor: {
    fontWeight: '800',
    marginTop: 3,
  },

  gridDestacados: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 27,
  },

  tarjetaDestacada: {
    width: '48.5%',
    minHeight: 115,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },

  destacadoEtiqueta: {
    marginTop: 9,
    fontWeight: '500',
  },

  destacadoValor: {
    marginTop: 4,
    fontWeight: '700',
    lineHeight: 19,
  },

  tarjetaActividades: {
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 15,
    marginBottom: 28,
  },

  actividadResumen: {
    minHeight: 78,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoActividadResumen: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actividadResumenContenido: {
    flex: 1,
    marginLeft: 12,
  },

  nombreActividad: {
    fontWeight: '700',
  },

  estudiantesActividad: {
    marginTop: 3,
  },

  promedioActividadContenido: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },

  promedioActividad: {
    fontWeight: '800',
  },

  textoPromedio: {
    marginTop: 2,
  },

  tarjetaRegistro: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
  },

  registroEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  estudianteContenido: {
    flex: 1,
    marginLeft: 12,
  },

  estudiante: {
    fontWeight: '700',
  },

  actividadNombre: {
    marginTop: 3,
  },

  badgeTiempo: {
    minHeight: 32,
    borderRadius: 18,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  badgeTiempoTexto: {
    fontWeight: '700',
    marginLeft: 4,
  },

  lineaTiempo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },

  puntoTiempoContenido: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  puntoTiempo: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    marginRight: 8,
  },

  lineaHorizontal: {
    flex: 1,
    height: 2,
    marginHorizontal: 10,
  },

  tiempoEtiqueta: {
    fontWeight: '500',
  },

  tiempoValor: {
    fontWeight: '700',
    marginTop: 2,
  },

  tiempoHora: {
    marginTop: 1,
  },

  tarjetaInformacion: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginBottom: 22,
  },

  filaInformacion: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
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