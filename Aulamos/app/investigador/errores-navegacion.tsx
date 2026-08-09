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

type TipoError =
  | 'Error de navegación'
  | 'Acceso fallido'
  | 'Acción incompleta';

type ErrorNavegacion = {
  id: number;
  estudiante: string;
  tipo: TipoError;
  pantalla: string;
  fecha: string;
  hora: string;
  descripcion: string;
};

// ==========================================
// DATOS DE PRUEBA
// Después se reemplazarán con datos de la API.
// ==========================================

const errores: ErrorNavegacion[] = [
  {
    id: 1,
    estudiante: 'Ana López',
    tipo: 'Error de navegación',
    pantalla: 'Detalle de actividad',
    fecha: '08/08/2026',
    hora: '10:32',
    descripcion:
      'El estudiante intentó regresar y la navegación no pudo completarse.',
  },
  {
    id: 2,
    estudiante: 'Carlos Díaz',
    tipo: 'Acceso fallido',
    pantalla: 'Biblioteca digital',
    fecha: '08/08/2026',
    hora: '09:54',
    descripcion:
      'No fue posible acceder al recurso seleccionado.',
  },
  {
    id: 3,
    estudiante: 'María Pérez',
    tipo: 'Acción incompleta',
    pantalla: 'Evaluación',
    fecha: '07/08/2026',
    hora: '13:42',
    descripcion:
      'La estudiante abandonó la acción antes de completar la evaluación.',
  },
  {
    id: 4,
    estudiante: 'José Hernández',
    tipo: 'Acceso fallido',
    pantalla: 'Chatbot',
    fecha: '07/08/2026',
    hora: '11:18',
    descripcion:
      'La pantalla no respondió correctamente al intentar abrir el chatbot.',
  },
  {
    id: 5,
    estudiante: 'Sofía Martínez',
    tipo: 'Error de navegación',
    pantalla: 'Mis actividades',
    fecha: '06/08/2026',
    hora: '12:16',
    descripcion:
      'Se presentó una dificultad al abrir el detalle de una actividad.',
  },
];

export default function ErroresNavegacionScreen() {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  const totalErrores = 17;
  const estudiantesConErrores = 6;
  const accesosFallidos = 7;
  const erroresNavegacion = 6;

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
            Errores de navegación
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
            HU28
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
          Dificultades detectadas
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
          Consulta los errores de navegación, accesos fallidos y
          acciones que dificultaron el uso de la plataforma.
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
          Resumen
        </Text>

        <View style={styles.gridResumen}>
          <TarjetaResumen
            icono="warning-outline"
            valor={totalErrores.toString()}
            etiqueta="Errores registrados"
            colorIcono="#DC3438"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="people-outline"
            valor={estudiantesConErrores.toString()}
            etiqueta="Estudiantes"
            colorIcono={colores.primario}
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="close-circle-outline"
            valor={accesosFallidos.toString()}
            etiqueta="Accesos fallidos"
            colorIcono="#DC3438"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="navigate-outline"
            valor={erroresNavegacion.toString()}
            etiqueta="De navegación"
            colorIcono={colores.primario}
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

        {/* DISTRIBUCIÓN */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Tipos de error
        </Text>

        <View
          style={[
            styles.tarjetaDistribucion,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          <BarraError
            titulo="Accesos fallidos"
            cantidad={7}
            porcentaje={100}
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <BarraError
            titulo="Errores de navegación"
            cantidad={6}
            porcentaje={86}
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <BarraError
            titulo="Acciones incompletas"
            cantidad={4}
            porcentaje={57}
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

        {/* ERRORES RECIENTES */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Errores recientes
        </Text>

        {errores.map((error) => (
          <TarjetaError
            key={error.id}
            error={error}
            colores={colores}
            escalaTexto={escalaTexto}
          />
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
            texto="Tipo de error"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Pantalla donde ocurrió"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Fecha y hora"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Estudiante que presentó el error"
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
            Los errores mostrados son datos de prueba. Posteriormente
            esta información será registrada automáticamente durante
            el uso de la plataforma.
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
  colorIcono,
  colores,
  escalaTexto,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  valor: string;
  etiqueta: string;
  colorIcono: string;
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
          color={colorIcono}
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

function BarraError({
  titulo,
  cantidad,
  porcentaje,
  colores,
  escalaTexto,
}: {
  titulo: string;
  cantidad: number;
  porcentaje: number;
  colores: any;
  escalaTexto: number;
}) {
  return (
    <View
      style={styles.barraErrorContenido}
      accessible
      accessibilityLabel={`${titulo}: ${cantidad}`}
    >
      <View style={styles.barraErrorEncabezado}>
        <Text
          style={[
            styles.barraErrorTitulo,
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
            styles.barraErrorCantidad,
            {
              color: colores.texto,
              fontSize: 13 * escalaTexto,
            },
          ]}
        >
          {cantidad}
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
              backgroundColor: '#DC3438',
            },
          ]}
        />
      </View>
    </View>
  );
}

function TarjetaError({
  error,
  colores,
  escalaTexto,
}: {
  error: ErrorNavegacion;
  colores: any;
  escalaTexto: number;
}) {
  const obtenerIcono = (): keyof typeof Ionicons.glyphMap => {
    switch (error.tipo) {
      case 'Acceso fallido':
        return 'close-circle-outline';

      case 'Acción incompleta':
        return 'alert-circle-outline';

      default:
        return 'warning-outline';
    }
  };

  return (
    <View
      style={[
        styles.tarjetaError,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
      accessible
      accessibilityLabel={`${error.tipo}, ${error.estudiante}, pantalla ${error.pantalla}, ${error.fecha} a las ${error.hora}`}
    >
      <View style={styles.errorEncabezado}>
        <View
          style={[
            styles.iconoError,
            {
              backgroundColor: colores.fondoPrimario,
            },
          ]}
        >
          <Ionicons
            name={obtenerIcono()}
            size={24}
            color="#DC3438"
          />
        </View>

        <View style={styles.errorEncabezadoContenido}>
          <Text
            style={[
              styles.tipoError,
              {
                color: '#DC3438',
                fontSize: 13 * escalaTexto,
              },
            ]}
          >
            {error.tipo}
          </Text>

          <Text
            style={[
              styles.estudiante,
              {
                color: colores.texto,
                fontSize: 15 * escalaTexto,
              },
            ]}
          >
            {error.estudiante}
          </Text>
        </View>

        <View style={styles.fechaContenido}>
          <Text
            style={[
              styles.fecha,
              {
                color: colores.textoSecundario,
                fontSize: 10 * escalaTexto,
              },
            ]}
          >
            {error.fecha}
          </Text>

          <Text
            style={[
              styles.hora,
              {
                color: colores.textoSecundario,
                fontSize: 10 * escalaTexto,
              },
            ]}
          >
            {error.hora}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.separador,
          {
            backgroundColor: colores.borde,
          },
        ]}
      />

      <View style={styles.datoError}>
        <Ionicons
          name="phone-portrait-outline"
          size={18}
          color={colores.primario}
        />

        <Text
          style={[
            styles.datoEtiqueta,
            {
              color: colores.textoSecundario,
              fontSize: 11 * escalaTexto,
            },
          ]}
        >
          Pantalla:
        </Text>

        <Text
          style={[
            styles.datoValor,
            {
              color: colores.texto,
              fontSize: 12 * escalaTexto,
            },
          ]}
        >
          {error.pantalla}
        </Text>
      </View>

      <Text
        style={[
          styles.descripcionError,
          {
            color: colores.textoSecundario,
            fontSize: 12 * escalaTexto,
          },
        ]}
      >
        {error.descripcion}
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

  gridResumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
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

  tarjetaDistribucion: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 16,
    marginBottom: 27,
  },

  barraErrorContenido: {
    marginBottom: 18,
  },

  barraErrorEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  barraErrorTitulo: {
    fontWeight: '600',
  },

  barraErrorCantidad: {
    fontWeight: '800',
  },

  barraFondo: {
    height: 9,
    borderRadius: 20,
    marginTop: 8,
    overflow: 'hidden',
  },

  barra: {
    height: '100%',
    borderRadius: 20,
  },

  tarjetaError: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
  },

  errorEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoError: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorEncabezadoContenido: {
    flex: 1,
    marginLeft: 12,
  },

  tipoError: {
    fontWeight: '700',
  },

  estudiante: {
    fontWeight: '700',
    marginTop: 3,
  },

  fechaContenido: {
    alignItems: 'flex-end',
  },

  fecha: {
    fontWeight: '500',
  },

  hora: {
    marginTop: 3,
  },

  separador: {
    height: 1,
    marginVertical: 13,
  },

  datoError: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  datoEtiqueta: {
    marginLeft: 7,
    fontWeight: '500',
  },

  datoValor: {
    flex: 1,
    marginLeft: 5,
    fontWeight: '700',
  },

  descripcionError: {
    marginTop: 11,
    lineHeight: 18,
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