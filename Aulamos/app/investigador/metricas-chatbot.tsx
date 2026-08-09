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

type InteraccionChatbot = {
  id: number;
  estudiante: string;
  pregunta: string;
  respuesta: string;
  fecha: string;
  hora: string;
  duracion: string;
  materia: string;
};

// ==========================================
// DATOS DE PRUEBA
// Después se reemplazarán con datos de la API.
// ==========================================

const interacciones: InteraccionChatbot[] = [
  {
    id: 1,
    estudiante: 'Ana López',
    pregunta: '¿Qué es un ecosistema?',
    respuesta:
      'Un ecosistema está formado por los seres vivos y el ambiente en el que interactúan.',
    fecha: '08/08/2026',
    hora: '10:25',
    duracion: '1 min 42 s',
    materia: 'Biología',
  },
  {
    id: 2,
    estudiante: 'Carlos Díaz',
    pregunta: '¿Cómo puedo resolver una ecuación lineal?',
    respuesta:
      'Primero debes dejar la incógnita sola realizando la misma operación en ambos lados de la ecuación.',
    fecha: '08/08/2026',
    hora: '10:12',
    duracion: '2 min 18 s',
    materia: 'Matemáticas',
  },
  {
    id: 3,
    estudiante: 'María Pérez',
    pregunta: '¿Cuáles son los estados de la materia?',
    respuesta:
      'Los estados principales de la materia son sólido, líquido y gaseoso.',
    fecha: '08/08/2026',
    hora: '09:48',
    duracion: '1 min 15 s',
    materia: 'Química',
  },
  {
    id: 4,
    estudiante: 'José Hernández',
    pregunta: '¿Qué es la fuerza?',
    respuesta:
      'La fuerza es una interacción capaz de modificar el movimiento o la forma de un objeto.',
    fecha: '07/08/2026',
    hora: '13:20',
    duracion: '2 min 05 s',
    materia: 'Física',
  },
];

export default function MetricasChatbotScreen() {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  // DATOS TEMPORALES
  const totalInteracciones = 42;
  const estudiantesUsuarios = 9;
  const promedioDuracion = '2 min 15 s';
  const preguntasHoy = 14;

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
            Uso del chatbot
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
            HU29
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
          Interacciones con el chatbot
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
          Consulta las interacciones realizadas por los estudiantes con
          el chatbot educativo durante las pruebas de uso.
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
            icono="chatbubbles-outline"
            valor={totalInteracciones.toString()}
            etiqueta="Interacciones"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="people-outline"
            valor={estudiantesUsuarios.toString()}
            etiqueta="Estudiantes"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="time-outline"
            valor={promedioDuracion}
            etiqueta="Duración promedio"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="today-outline"
            valor={preguntasHoy.toString()}
            etiqueta="Preguntas hoy"
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

        {/* FRECUENCIA DE USO */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Interacciones durante la semana
        </Text>

        <View
          style={[
            styles.tarjetaGrafica,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          <BarraDia
            dia="Lun"
            cantidad={5}
            porcentaje={42}
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <BarraDia
            dia="Mar"
            cantidad={8}
            porcentaje={67}
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <BarraDia
            dia="Mié"
            cantidad={6}
            porcentaje={50}
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <BarraDia
            dia="Jue"
            cantidad={9}
            porcentaje={75}
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <BarraDia
            dia="Vie"
            cantidad={12}
            porcentaje={100}
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <BarraDia
            dia="Sáb"
            cantidad={2}
            porcentaje={17}
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

        {/* CONVERSACIONES RECIENTES */}
        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Interacciones recientes
        </Text>

        {interacciones.map((interaccion) => (
          <TarjetaInteraccion
            key={interaccion.id}
            interaccion={interaccion}
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
            texto="Estudiante que realizó la consulta"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Fecha y hora de la interacción"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Pregunta realizada"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Respuesta proporcionada"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Duración aproximada"
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
            Las conversaciones mostradas actualmente son datos de
            prueba. Posteriormente serán sustituidas por las
            interacciones registradas por el chatbot de AULAMOS.
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
            fontSize: 21 * escalaTexto,
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

function BarraDia({
  dia,
  cantidad,
  porcentaje,
  colores,
  escalaTexto,
}: {
  dia: string;
  cantidad: number;
  porcentaje: number;
  colores: any;
  escalaTexto: number;
}) {
  return (
    <View
      style={styles.filaDia}
      accessible
      accessibilityLabel={`${dia}: ${cantidad} interacciones`}
    >
      <Text
        style={[
          styles.dia,
          {
            color: colores.textoSecundario,
            fontSize: 12 * escalaTexto,
          },
        ]}
      >
        {dia}
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
            styles.barra,
            {
              width: `${porcentaje}%`,
              backgroundColor: colores.primario,
            },
          ]}
        />
      </View>

      <Text
        style={[
          styles.cantidadDia,
          {
            color: colores.texto,
            fontSize: 12 * escalaTexto,
          },
        ]}
      >
        {cantidad}
      </Text>
    </View>
  );
}

function TarjetaInteraccion({
  interaccion,
  colores,
  escalaTexto,
}: {
  interaccion: InteraccionChatbot;
  colores: any;
  escalaTexto: number;
}) {
  return (
    <View
      style={[
        styles.tarjetaInteraccion,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
    >
      {/* ESTUDIANTE */}
      <View style={styles.interaccionEncabezado}>
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
            {interaccion.estudiante}
          </Text>

          <Text
            style={[
              styles.materia,
              {
                color: colores.textoSecundario,
                fontSize: 11 * escalaTexto,
              },
            ]}
          >
            {interaccion.materia}
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
            {interaccion.fecha}
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
            {interaccion.hora}
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

      {/* PREGUNTA */}
      <View style={styles.bloqueMensaje}>
        <View style={styles.etiquetaMensaje}>
          <Ionicons
            name="help-circle-outline"
            size={17}
            color={colores.primario}
          />

          <Text
            style={[
              styles.tituloMensaje,
              {
                color: colores.primario,
                fontSize: 12 * escalaTexto,
              },
            ]}
          >
            Pregunta
          </Text>
        </View>

        <Text
          style={[
            styles.textoMensaje,
            {
              color: colores.texto,
              fontSize: 13 * escalaTexto,
            },
          ]}
        >
          {interaccion.pregunta}
        </Text>
      </View>

      {/* RESPUESTA */}
      <View
        style={[
          styles.respuestaContenedor,
          {
            backgroundColor: colores.fondoPrimario,
          },
        ]}
      >
        <View style={styles.etiquetaMensaje}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={17}
            color={colores.primario}
          />

          <Text
            style={[
              styles.tituloMensaje,
              {
                color: colores.primario,
                fontSize: 12 * escalaTexto,
              },
            ]}
          >
            Respuesta
          </Text>
        </View>

        <Text
          style={[
            styles.textoMensaje,
            {
              color: colores.texto,
              fontSize: 13 * escalaTexto,
            },
          ]}
        >
          {interaccion.respuesta}
        </Text>
      </View>

      {/* DURACIÓN */}
      <View style={styles.duracion}>
        <Ionicons
          name="time-outline"
          size={17}
          color={colores.textoSecundario}
        />

        <Text
          style={[
            styles.duracionEtiqueta,
            {
              color: colores.textoSecundario,
              fontSize: 11 * escalaTexto,
            },
          ]}
        >
          Duración aproximada:
        </Text>

        <Text
          style={[
            styles.duracionValor,
            {
              color: colores.texto,
              fontSize: 11 * escalaTexto,
            },
          ]}
        >
          {interaccion.duracion}
        </Text>
      </View>
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

  tarjetaGrafica: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 16,
    marginBottom: 27,
  },

  filaDia: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  dia: {
    width: 34,
    fontWeight: '600',
  },

  barraFondo: {
    flex: 1,
    height: 9,
    borderRadius: 20,
    overflow: 'hidden',
  },

  barra: {
    height: '100%',
    borderRadius: 20,
  },

  cantidadDia: {
    width: 30,
    textAlign: 'right',
    fontWeight: '700',
  },

  tarjetaInteraccion: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
  },

  interaccionEncabezado: {
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

  estudianteContenido: {
    flex: 1,
    marginLeft: 12,
  },

  estudiante: {
    fontWeight: '700',
  },

  materia: {
    marginTop: 3,
    fontWeight: '500',
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
    marginVertical: 14,
  },

  bloqueMensaje: {
    marginBottom: 13,
  },

  etiquetaMensaje: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  tituloMensaje: {
    marginLeft: 6,
    fontWeight: '700',
  },

  textoMensaje: {
    marginTop: 7,
    lineHeight: 19,
  },

  respuestaContenedor: {
    borderRadius: 13,
    padding: 12,
  },

  duracion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
  },

  duracionEtiqueta: {
    marginLeft: 6,
  },

  duracionValor: {
    marginLeft: 5,
    fontWeight: '700',
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