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

type ProgresoEstudiante = {
  id: number;
  estudiante: string;
  porcentaje: number;
  actividadesCompletadas: number;
  totalActividades: number;
  evaluacionesRealizadas: number;
  totalEvaluaciones: number;
  recursosUtilizados: number;
  fechaRegistro: string;
};

type RegistroProgreso = {
  id: number;
  fecha: string;
  porcentaje: number;
};

// ==========================================
// DATOS DE PRUEBA
// Posteriormente se reemplazarán por la API.
// ==========================================

const estudiantes: ProgresoEstudiante[] = [
  {
    id: 1,
    estudiante: 'Ana López',
    porcentaje: 85,
    actividadesCompletadas: 12,
    totalActividades: 14,
    evaluacionesRealizadas: 5,
    totalEvaluaciones: 6,
    recursosUtilizados: 8,
    fechaRegistro: '08/08/2026',
  },
  {
    id: 2,
    estudiante: 'Carlos Díaz',
    porcentaje: 72,
    actividadesCompletadas: 10,
    totalActividades: 14,
    evaluacionesRealizadas: 4,
    totalEvaluaciones: 6,
    recursosUtilizados: 6,
    fechaRegistro: '08/08/2026',
  },
  {
    id: 3,
    estudiante: 'María Pérez',
    porcentaje: 68,
    actividadesCompletadas: 9,
    totalActividades: 14,
    evaluacionesRealizadas: 4,
    totalEvaluaciones: 6,
    recursosUtilizados: 7,
    fechaRegistro: '08/08/2026',
  },
  {
    id: 4,
    estudiante: 'José Hernández',
    porcentaje: 79,
    actividadesCompletadas: 11,
    totalActividades: 14,
    evaluacionesRealizadas: 5,
    totalEvaluaciones: 6,
    recursosUtilizados: 5,
    fechaRegistro: '08/08/2026',
  },
];

const historialEjemplo: RegistroProgreso[] = [
  {
    id: 1,
    fecha: '01 Ago',
    porcentaje: 62,
  },
  {
    id: 2,
    fecha: '03 Ago',
    porcentaje: 68,
  },
  {
    id: 3,
    fecha: '05 Ago',
    porcentaje: 74,
  },
  {
    id: 4,
    fecha: '08 Ago',
    porcentaje: 76,
  },
];

export default function ProgresoInvestigacionScreen() {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  // DATOS TEMPORALES
  const progresoPromedio = 76;
  const actividadesCompletadas = 38;
  const totalActividades = 50;
  const evaluacionesRealizadas = 18;
  const totalEvaluaciones = 22;

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
            Progreso académico
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
            HU31
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
          Seguimiento académico
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
          Consulta el avance de los estudiantes en actividades,
          evaluaciones y recursos durante el periodo de prueba.
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

        {/* PROGRESO GENERAL */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Progreso general
        </Text>

        <View
          style={[
            styles.tarjetaProgresoGeneral,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
          accessible
          accessibilityLabel={`Progreso promedio ${progresoPromedio} por ciento`}
        >
          <View style={styles.progresoEncabezado}>
            <View
              style={[
                styles.iconoPrincipal,
                {
                  backgroundColor: colores.fondoPrimario,
                },
              ]}
            >
              <Ionicons
                name="trending-up-outline"
                size={30}
                color={colores.primario}
              />
            </View>

            <View style={styles.progresoTexto}>
              <Text
                style={[
                  styles.progresoEtiqueta,
                  {
                    color: colores.textoSecundario,
                    fontSize: 12 * escalaTexto,
                  },
                ]}
              >
                Progreso promedio
              </Text>

              <Text
                style={[
                  styles.progresoValor,
                  {
                    color: colores.texto,
                    fontSize: 30 * escalaTexto,
                  },
                ]}
              >
                {progresoPromedio}%
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.barraFondoGrande,
              {
                backgroundColor: colores.borde,
              },
            ]}
          >
            <View
              style={[
                styles.barraGrande,
                {
                  width: `${progresoPromedio}%`,
                  backgroundColor: colores.primario,
                },
              ]}
            />
          </View>
        </View>

        {/* RESUMEN */}
        <View style={styles.gridResumen}>
          <TarjetaResumen
            icono="checkmark-circle-outline"
            valor={`${actividadesCompletadas}/${totalActividades}`}
            etiqueta="Actividades completadas"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="clipboard-outline"
            valor={`${evaluacionesRealizadas}/${totalEvaluaciones}`}
            etiqueta="Evaluaciones realizadas"
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

        {/* EVOLUCIÓN */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Evolución del progreso
        </Text>

        <View
          style={[
            styles.tarjetaHistorial,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          {historialEjemplo.map((registro, index) => (
            <View
              key={registro.id}
              style={[
                styles.historialFila,
                index !== historialEjemplo.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colores.borde,
                },
              ]}
              accessible
              accessibilityLabel={`${registro.fecha}: ${registro.porcentaje} por ciento de progreso`}
            >
              <View
                style={[
                  styles.iconoHistorial,
                  {
                    backgroundColor: colores.fondoPrimario,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-clear-outline"
                  size={19}
                  color={colores.primario}
                />
              </View>

              <Text
                style={[
                  styles.historialFecha,
                  {
                    color: colores.texto,
                    fontSize: 13 * escalaTexto,
                  },
                ]}
              >
                {registro.fecha}
              </Text>

              <View
                style={[
                  styles.historialBarraFondo,
                  {
                    backgroundColor: colores.borde,
                  },
                ]}
              >
                <View
                  style={[
                    styles.historialBarra,
                    {
                      width: `${registro.porcentaje}%`,
                      backgroundColor: colores.primario,
                    },
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.historialPorcentaje,
                  {
                    color: colores.primario,
                    fontSize: 13 * escalaTexto,
                  },
                ]}
              >
                {registro.porcentaje}%
              </Text>
            </View>
          ))}
        </View>

        {/* ESTUDIANTES */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Progreso por estudiante
        </Text>

        {estudiantes.map((estudiante) => (
          <View
            key={estudiante.id}
            style={[
              styles.tarjetaEstudiante,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
            accessible
            accessibilityLabel={`${estudiante.estudiante}, ${estudiante.porcentaje} por ciento de progreso`}
          >
            {/* NOMBRE Y PORCENTAJE */}
            <View style={styles.estudianteEncabezado}>
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

              <View style={styles.estudianteNombreContenido}>
                <Text
                  style={[
                    styles.estudianteNombre,
                    {
                      color: colores.texto,
                      fontSize: 15 * escalaTexto,
                    },
                  ]}
                >
                  {estudiante.estudiante}
                </Text>

                <Text
                  style={[
                    styles.fechaRegistro,
                    {
                      color: colores.textoSecundario,
                      fontSize: 10 * escalaTexto,
                    },
                  ]}
                >
                  Actualizado: {estudiante.fechaRegistro}
                </Text>
              </View>

              <Text
                style={[
                  styles.porcentajeEstudiante,
                  {
                    color: colores.primario,
                    fontSize: 19 * escalaTexto,
                  },
                ]}
              >
                {estudiante.porcentaje}%
              </Text>
            </View>

            {/* BARRA */}
            <View
              style={[
                styles.barraEstudianteFondo,
                {
                  backgroundColor: colores.borde,
                },
              ]}
            >
              <View
                style={[
                  styles.barraEstudiante,
                  {
                    width: `${estudiante.porcentaje}%`,
                    backgroundColor: colores.primario,
                  },
                ]}
              />
            </View>

            {/* DATOS */}
            <View
              style={[
                styles.separador,
                {
                  backgroundColor: colores.borde,
                },
              ]}
            />

            <View style={styles.datosEstudiante}>
              <DatoEstudiante
                icono="checkmark-done-outline"
                valor={`${estudiante.actividadesCompletadas}/${estudiante.totalActividades}`}
                etiqueta="Actividades"
                colores={colores}
                escalaTexto={escalaTexto}
              />

              <View
                style={[
                  styles.separadorVertical,
                  {
                    backgroundColor: colores.borde,
                  },
                ]}
              />

              <DatoEstudiante
                icono="clipboard-outline"
                valor={`${estudiante.evaluacionesRealizadas}/${estudiante.totalEvaluaciones}`}
                etiqueta="Evaluaciones"
                colores={colores}
                escalaTexto={escalaTexto}
              />

              <View
                style={[
                  styles.separadorVertical,
                  {
                    backgroundColor: colores.borde,
                  },
                ]}
              />

              <DatoEstudiante
                icono="library-outline"
                valor={estudiante.recursosUtilizados.toString()}
                etiqueta="Recursos"
                colores={colores}
                escalaTexto={escalaTexto}
              />
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
            texto="Porcentaje de avance"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Actividades completadas"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Evaluaciones realizadas"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Recursos utilizados"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Fecha de cada registro"
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
            Los avances mostrados actualmente son datos de prueba.
            Posteriormente se obtendrán automáticamente a partir del
            desempeño académico registrado en AULAMOS.
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
          size={22}
          color={colores.primario}
        />
      </View>

      <Text
        style={[
          styles.valorResumen,
          {
            color: colores.texto,
            fontSize: 22 * escalaTexto,
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

function DatoEstudiante({
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
    <View style={styles.datoEstudiante}>
      <Ionicons
        name={icono}
        size={19}
        color={colores.primario}
      />

      <Text
        style={[
          styles.datoValor,
          {
            color: colores.texto,
            fontSize: 14 * escalaTexto,
          },
        ]}
      >
        {valor}
      </Text>

      <Text
        style={[
          styles.datoEtiqueta,
          {
            color: colores.textoSecundario,
            fontSize: 9 * escalaTexto,
          },
        ]}
      >
        {etiqueta}
      </Text>
    </View>
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
    marginTop: 5,
    marginBottom: 13,
  },

  tarjetaProgresoGeneral: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 17,
    marginBottom: 12,
  },

  progresoEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoPrincipal: {
    width: 58,
    height: 58,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  progresoTexto: {
    marginLeft: 15,
  },

  progresoEtiqueta: {
    fontWeight: '500',
  },

  progresoValor: {
    fontWeight: '800',
    marginTop: 2,
  },

  barraFondoGrande: {
    width: '100%',
    height: 11,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 17,
  },

  barraGrande: {
    height: '100%',
    borderRadius: 20,
  },

  gridResumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  tarjetaResumen: {
    width: '48.5%',
    minHeight: 125,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
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
    marginTop: 3,
    fontWeight: '500',
    lineHeight: 15,
  },

  tarjetaHistorial: {
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 15,
    marginBottom: 27,
  },

  historialFila: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoHistorial: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  historialFecha: {
    width: 58,
    marginLeft: 10,
    fontWeight: '600',
  },

  historialBarraFondo: {
    flex: 1,
    height: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },

  historialBarra: {
    height: '100%',
    borderRadius: 20,
  },

  historialPorcentaje: {
    width: 43,
    textAlign: 'right',
    fontWeight: '800',
    marginLeft: 8,
  },

  tarjetaEstudiante: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
  },

  estudianteEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  estudianteNombreContenido: {
    flex: 1,
    marginLeft: 12,
  },

  estudianteNombre: {
    fontWeight: '700',
  },

  fechaRegistro: {
    marginTop: 3,
  },

  porcentajeEstudiante: {
    fontWeight: '800',
  },

  barraEstudianteFondo: {
    width: '100%',
    height: 9,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 14,
  },

  barraEstudiante: {
    height: '100%',
    borderRadius: 20,
  },

  separador: {
    width: '100%',
    height: 1,
    marginVertical: 15,
  },

  datosEstudiante: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  datoEstudiante: {
    flex: 1,
    alignItems: 'center',
  },

  datoValor: {
    marginTop: 4,
    fontWeight: '800',
  },

  datoEtiqueta: {
    marginTop: 2,
    textAlign: 'center',
  },

  separadorVertical: {
    width: 1,
    height: 38,
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