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

// =====================================================
// TIPOS
// =====================================================

// Este tipo está preparado tomando como referencia
// los campos de la tabla preferencias_accesibilidad.
//
// La BD usa snake_case:
// alto_contraste, modo_oscuro, etc.
//
// En React Native usamos camelCase:
// altoContraste, modoOscuro, etc.
//
// Cuando conectemos la API simplemente haremos
// la conversión correspondiente.

type TamanoTexto =
  | 'Normal'
  | 'Grande'
  | 'Muy Grande';

type PreferenciaEstudiante = {
  idPreferencia: number;
  idUsuario: number;

  estudiante: string;

  altoContraste: boolean;
  modoOscuro: boolean;

  tamanoTexto: TamanoTexto;

  fuenteDislexia: boolean;

  lectorPantalla: boolean;
  velocidadLectura: number;

  subtitulos: boolean;

  idioma: string;

  animaciones: boolean;

  navegacionTeclado: boolean;

  fechaActualizacion: string;
};

type HerramientaUso = {
  id: number;
  nombre: string;
  estudiantes: number;
  porcentaje: number;
  icono: keyof typeof Ionicons.glyphMap;
};

// =====================================================
// DATOS DE PRUEBA
//
// Estos datos NO vienen todavía de la BD.
// Posteriormente serán sustituidos por la API.
// =====================================================

const preferenciasEstudiantes: PreferenciaEstudiante[] = [
  {
    idPreferencia: 1,
    idUsuario: 15,
    estudiante: 'Ana López',

    altoContraste: true,
    modoOscuro: false,

    tamanoTexto: 'Grande',

    fuenteDislexia: true,

    lectorPantalla: false,
    velocidadLectura: 1.0,

    subtitulos: true,

    idioma: 'Español',

    animaciones: false,

    navegacionTeclado: true,

    fechaActualizacion: '08/08/2026 10:25',
  },

  {
    idPreferencia: 2,
    idUsuario: 16,
    estudiante: 'Carlos Díaz',

    altoContraste: true,
    modoOscuro: true,

    tamanoTexto: 'Normal',

    fuenteDislexia: false,

    lectorPantalla: true,
    velocidadLectura: 0.9,

    subtitulos: false,

    idioma: 'Español',

    animaciones: true,

    navegacionTeclado: false,

    fechaActualizacion: '08/08/2026 09:52',
  },

  {
    idPreferencia: 3,
    idUsuario: 17,
    estudiante: 'María Pérez',

    altoContraste: false,
    modoOscuro: true,

    tamanoTexto: 'Muy Grande',

    fuenteDislexia: true,

    lectorPantalla: true,
    velocidadLectura: 0.8,

    subtitulos: true,

    idioma: 'Español',

    animaciones: false,

    navegacionTeclado: true,

    fechaActualizacion: '08/08/2026 09:40',
  },

  {
    idPreferencia: 4,
    idUsuario: 18,
    estudiante: 'José Hernández',

    altoContraste: true,
    modoOscuro: false,

    tamanoTexto: 'Grande',

    fuenteDislexia: false,

    lectorPantalla: false,
    velocidadLectura: 1.0,

    subtitulos: true,

    idioma: 'Español',

    animaciones: true,

    navegacionTeclado: false,

    fechaActualizacion: '07/08/2026 13:15',
  },
];

// =====================================================
// ESTADÍSTICAS DE PRUEBA
// =====================================================

const herramientas: HerramientaUso[] = [
  {
    id: 1,
    nombre: 'Alto contraste',
    estudiantes: 8,
    porcentaje: 73,
    icono: 'contrast-outline',
  },
  {
    id: 2,
    nombre: 'Tamaño de texto',
    estudiantes: 6,
    porcentaje: 55,
    icono: 'text-outline',
  },
  {
    id: 3,
    nombre: 'Fuente para dislexia',
    estudiantes: 4,
    porcentaje: 36,
    icono: 'book-outline',
  },
  {
    id: 4,
    nombre: 'Lector de pantalla',
    estudiantes: 3,
    porcentaje: 27,
    icono: 'volume-high-outline',
  },
  {
    id: 5,
    nombre: 'Subtítulos',
    estudiantes: 5,
    porcentaje: 45,
    icono: 'videocam-outline',
  },
  {
    id: 6,
    nombre: 'Navegación por teclado',
    estudiantes: 4,
    porcentaje: 36,
    icono: 'keypad-outline',
  },
  {
    id: 7,
    nombre: 'Modo oscuro',
    estudiantes: 4,
    porcentaje: 36,
    icono: 'moon-outline',
  },
];

export default function MetricasAccesibilidadScreen() {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  // ===================================================
  // DATOS GENERALES DE PRUEBA
  // ===================================================

  const estudiantesAnalizados = 11;
  const usanAccesibilidad = 9;
  const usanAltoContraste = 8;
  const herramientaPrincipal = 'Alto contraste';

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colores.fondo,
        },
      ]}
    >
      {/* =================================================
          ENCABEZADO
      ================================================= */}

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
            Accesibilidad
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
            HU32
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contenido}
      >
        {/* =================================================
            TÍTULO
        ================================================= */}

        <Text
          style={[
            styles.titulo,
            {
              color: colores.texto,
              fontSize: 26 * escalaTexto,
            },
          ]}
        >
          Uso de accesibilidad
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
          Consulta las herramientas y preferencias de accesibilidad
          utilizadas por los estudiantes durante las pruebas de
          AULAMOS.
        </Text>

        {/* =================================================
            PERIODO
        ================================================= */}

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

        {/* =================================================
            RESUMEN
        ================================================= */}

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
            icono="people-outline"
            valor={estudiantesAnalizados.toString()}
            etiqueta="Estudiantes analizados"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="accessibility-outline"
            valor={usanAccesibilidad.toString()}
            etiqueta="Usan accesibilidad"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="contrast-outline"
            valor={usanAltoContraste.toString()}
            etiqueta="Usan alto contraste"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <TarjetaResumen
            icono="star-outline"
            valor="73%"
            etiqueta="Mayor uso"
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

        {/* =================================================
            DESTACADO
        ================================================= */}

        <View
          style={[
            styles.destacado,
            {
              backgroundColor: colores.fondoPrimario,
            },
          ]}
          accessible
          accessibilityLabel={`La herramienta más utilizada es ${herramientaPrincipal}`}
        >
          <Ionicons
            name="accessibility"
            size={27}
            color={colores.primario}
          />

          <View style={styles.destacadoContenido}>
            <Text
              style={[
                styles.destacadoEtiqueta,
                {
                  color: colores.textoSecundario,
                  fontSize: 11 * escalaTexto,
                },
              ]}
            >
              Herramienta más utilizada
            </Text>

            <Text
              style={[
                styles.destacadoValor,
                {
                  color: colores.texto,
                  fontSize: 16 * escalaTexto,
                },
              ]}
            >
              {herramientaPrincipal}
            </Text>
          </View>
        </View>

        {/* =================================================
            FUNCIONES MÁS UTILIZADAS
        ================================================= */}

        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Funciones más utilizadas
        </Text>

        <View
          style={[
            styles.tarjetaHerramientas,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          {herramientas.map((herramienta) => (
            <View
              key={herramienta.id}
              style={styles.herramienta}
              accessible
              accessibilityLabel={`${herramienta.nombre}, ${herramienta.estudiantes} estudiantes, ${herramienta.porcentaje} por ciento`}
            >
              <View style={styles.herramientaEncabezado}>
                <View style={styles.nombreHerramientaContenedor}>
                  <View
                    style={[
                      styles.iconoHerramienta,
                      {
                        backgroundColor: colores.fondoPrimario,
                      },
                    ]}
                  >
                    <Ionicons
                      name={herramienta.icono}
                      size={19}
                      color={colores.primario}
                    />
                  </View>

                  <View style={styles.herramientaTexto}>
                    <Text
                      style={[
                        styles.nombreHerramienta,
                        {
                          color: colores.texto,
                          fontSize: 13 * escalaTexto,
                        },
                      ]}
                    >
                      {herramienta.nombre}
                    </Text>

                    <Text
                      style={[
                        styles.estudiantesHerramienta,
                        {
                          color: colores.textoSecundario,
                          fontSize: 10 * escalaTexto,
                        },
                      ]}
                    >
                      {herramienta.estudiantes} estudiantes
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.porcentajeHerramienta,
                    {
                      color: colores.primario,
                      fontSize: 13 * escalaTexto,
                    },
                  ]}
                >
                  {herramienta.porcentaje}%
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
                      width: `${herramienta.porcentaje}%`,
                      backgroundColor: colores.primario,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* =================================================
            PREFERENCIAS POR ESTUDIANTE
        ================================================= */}

        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize: 18 * escalaTexto,
            },
          ]}
        >
          Preferencias por estudiante
        </Text>

        {preferenciasEstudiantes.map((estudiante) => (
          <View
            key={estudiante.idPreferencia}
            style={[
              styles.tarjetaEstudiante,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            {/* DATOS DEL ESTUDIANTE */}

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

              <View style={styles.estudianteContenido}>
                <Text
                  style={[
                    styles.nombreEstudiante,
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
                    styles.idUsuario,
                    {
                      color: colores.textoSecundario,
                      fontSize: 10 * escalaTexto,
                    },
                  ]}
                >
                  Usuario #{estudiante.idUsuario}
                </Text>
              </View>

              <Ionicons
                name="accessibility-outline"
                size={23}
                color={colores.primario}
              />
            </View>

            <View
              style={[
                styles.separador,
                {
                  backgroundColor: colores.borde,
                },
              ]}
            />

            {/* ALTO CONTRASTE */}

            <PreferenciaBoolean
              icono="contrast-outline"
              titulo="Alto contraste"
              activa={estudiante.altoContraste}
              colores={colores}
              escalaTexto={escalaTexto}
            />

            {/* MODO OSCURO */}

            <PreferenciaBoolean
              icono="moon-outline"
              titulo="Modo oscuro"
              activa={estudiante.modoOscuro}
              colores={colores}
              escalaTexto={escalaTexto}
            />

            {/* TAMAÑO DE TEXTO */}

            <PreferenciaTexto
              icono="text-outline"
              titulo="Tamaño de texto"
              valor={estudiante.tamanoTexto}
              colores={colores}
              escalaTexto={escalaTexto}
            />

            {/* FUENTE PARA DISLEXIA */}

            <PreferenciaBoolean
              icono="book-outline"
              titulo="Fuente para dislexia"
              activa={estudiante.fuenteDislexia}
              colores={colores}
              escalaTexto={escalaTexto}
            />

            {/* LECTOR DE PANTALLA */}

            <PreferenciaBoolean
              icono="volume-high-outline"
              titulo="Lector de pantalla"
              activa={estudiante.lectorPantalla}
              colores={colores}
              escalaTexto={escalaTexto}
            />

            {/* VELOCIDAD DE LECTURA */}

            <PreferenciaTexto
              icono="speedometer-outline"
              titulo="Velocidad de lectura"
              valor={`${estudiante.velocidadLectura.toFixed(1)}x`}
              colores={colores}
              escalaTexto={escalaTexto}
            />

            {/* SUBTÍTULOS */}

            <PreferenciaBoolean
              icono="videocam-outline"
              titulo="Subtítulos"
              activa={estudiante.subtitulos}
              colores={colores}
              escalaTexto={escalaTexto}
            />

            {/* IDIOMA */}

            <PreferenciaTexto
              icono="language-outline"
              titulo="Idioma"
              valor={estudiante.idioma}
              colores={colores}
              escalaTexto={escalaTexto}
            />

            {/* ANIMACIONES */}

            <PreferenciaBoolean
              icono="sparkles-outline"
              titulo="Animaciones"
              activa={estudiante.animaciones}
              colores={colores}
              escalaTexto={escalaTexto}
            />

            {/* NAVEGACIÓN POR TECLADO */}

            <PreferenciaBoolean
              icono="keypad-outline"
              titulo="Navegación por teclado"
              activa={estudiante.navegacionTeclado}
              colores={colores}
              escalaTexto={escalaTexto}
            />

            {/* FECHA */}

            <View
              style={[
                styles.fechaActualizacion,
                {
                  borderTopColor: colores.borde,
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={17}
                color={colores.textoSecundario}
              />

              <Text
                style={[
                  styles.fechaActualizacionTexto,
                  {
                    color: colores.textoSecundario,
                    fontSize: 10 * escalaTexto,
                  },
                ]}
              >
                Última actualización:{' '}
                {estudiante.fechaActualizacion}
              </Text>
            </View>
          </View>
        ))}

        {/* =================================================
            INFORMACIÓN REGISTRADA
        ================================================= */}

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
            texto="Alto contraste"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Modo oscuro"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Tamaño de texto"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Fuente para dislexia"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Lector de pantalla"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Velocidad de lectura"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Subtítulos"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Idioma"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Animaciones"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Navegación por teclado"
            colores={colores}
            escalaTexto={escalaTexto}
          />

          <FilaInformacion
            texto="Fecha de actualización"
            colores={colores}
            escalaTexto={escalaTexto}
          />
        </View>

        {/* =================================================
            AVISO
        ================================================= */}

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
            Los datos mostrados actualmente son de prueba.
            Posteriormente esta pantalla utilizará las preferencias
            almacenadas en la plataforma para generar las métricas
            reales de accesibilidad.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// TARJETA DE RESUMEN
// =====================================================

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

// =====================================================
// PREFERENCIA BOOLEAN
// =====================================================

function PreferenciaBoolean({
  icono,
  titulo,
  activa,
  colores,
  escalaTexto,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  activa: boolean;
  colores: any;
  escalaTexto: number;
}) {
  return (
    <View
      style={styles.preferencia}
      accessible
      accessibilityLabel={`${titulo}: ${
        activa ? 'Activo' : 'Desactivado'
      }`}
    >
      <View style={styles.preferenciaIzquierda}>
        <Ionicons
          name={icono}
          size={19}
          color={colores.primario}
        />

        <Text
          style={[
            styles.preferenciaTitulo,
            {
              color: colores.texto,
              fontSize: 12 * escalaTexto,
            },
          ]}
        >
          {titulo}
        </Text>
      </View>

      <View style={styles.preferenciaDerecha}>
        <Text
          style={[
            styles.preferenciaValor,
            {
              color: activa
                ? colores.exito
                : colores.textoSecundario,
              fontSize: 11 * escalaTexto,
            },
          ]}
        >
          {activa ? 'Activo' : 'Desactivado'}
        </Text>

        <Ionicons
          name={
            activa
              ? 'checkmark-circle'
              : 'ellipse-outline'
          }
          size={19}
          color={
            activa
              ? colores.exito
              : colores.textoSecundario
          }
        />
      </View>
    </View>
  );
}

// =====================================================
// PREFERENCIA CON TEXTO
// =====================================================

function PreferenciaTexto({
  icono,
  titulo,
  valor,
  colores,
  escalaTexto,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  valor: string;
  colores: any;
  escalaTexto: number;
}) {
  return (
    <View
      style={styles.preferencia}
      accessible
      accessibilityLabel={`${titulo}: ${valor}`}
    >
      <View style={styles.preferenciaIzquierda}>
        <Ionicons
          name={icono}
          size={19}
          color={colores.primario}
        />

        <Text
          style={[
            styles.preferenciaTitulo,
            {
              color: colores.texto,
              fontSize: 12 * escalaTexto,
            },
          ]}
        >
          {titulo}
        </Text>
      </View>

      <Text
        style={[
          styles.valorTexto,
          {
            color: colores.textoSecundario,
            fontSize: 11 * escalaTexto,
          },
        ]}
      >
        {valor}
      </Text>
    </View>
  );
}

// =====================================================
// FILA INFORMACIÓN
// =====================================================

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

// =====================================================
// ESTILOS
// =====================================================

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
    marginBottom: 17,
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
    lineHeight: 15,
  },

  destacado: {
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },

  destacadoContenido: {
    marginLeft: 12,
  },

  destacadoEtiqueta: {
    fontWeight: '500',
  },

  destacadoValor: {
    fontWeight: '800',
    marginTop: 3,
  },

  tarjetaHerramientas: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 16,
    marginBottom: 27,
  },

  herramienta: {
    marginBottom: 20,
  },

  herramientaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  nombreHerramientaContenedor: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  herramientaTexto: {
    flex: 1,
  },

  iconoHerramienta: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  nombreHerramienta: {
    fontWeight: '700',
  },

  estudiantesHerramienta: {
    marginTop: 2,
  },

  porcentajeHerramienta: {
    fontWeight: '800',
    marginLeft: 10,
  },

  barraFondo: {
    height: 8,
    borderRadius: 20,
    marginTop: 9,
    overflow: 'hidden',
  },

  barra: {
    height: '100%',
    borderRadius: 20,
  },

  tarjetaEstudiante: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginBottom: 13,
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

  estudianteContenido: {
    flex: 1,
    marginLeft: 12,
  },

  nombreEstudiante: {
    fontWeight: '700',
  },

  idUsuario: {
    marginTop: 3,
  },

  separador: {
    width: '100%',
    height: 1,
    marginVertical: 13,
  },

  preferencia: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  preferenciaIzquierda: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },

  preferenciaTitulo: {
    flex: 1,
    marginLeft: 8,
    fontWeight: '600',
  },

  preferenciaDerecha: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  preferenciaValor: {
    marginRight: 7,
    fontWeight: '600',
  },

  valorTexto: {
    maxWidth: '42%',
    textAlign: 'right',
    fontWeight: '600',
  },

  fechaActualizacion: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  fechaActualizacionTexto: {
    marginLeft: 7,
    flex: 1,
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
    flex: 1,
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