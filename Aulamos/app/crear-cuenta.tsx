import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';

type TarjetaRolProps = {
  titulo: 'Alumno' | 'Docente';
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
  ruta:
    | '/crear-cuenta-alumno'
    | '/crear-cuenta-docente';
  color: string;
  fondoIcono: string;
  fondoTarjeta: string;
  colorTexto: string;
  colorSecundario: string;
  colorBorde: string;
  escalaTexto: number;
  mostrarEnFila: boolean;
};

function TarjetaRol({
  titulo,
  descripcion,
  icono,
  ruta,
  color,
  fondoIcono,
  fondoTarjeta,
  colorTexto,
  colorSecundario,
  colorBorde,
  escalaTexto,
  mostrarEnFila,
}: TarjetaRolProps) {
  return (
    <Link href={ruta as any} asChild>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.card,
          mostrarEnFila && styles.cardEnFila,
          {
            backgroundColor: fondoTarjeta,
            borderColor: colorBorde,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Continuar como ${titulo}`}
        accessibilityHint={`Abre el formulario para crear una cuenta de ${titulo.toLowerCase()}`}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: fondoIcono,
            },
          ]}
        >
          <Ionicons
            name={icono}
            size={34}
            color={color}
          />
        </View>

        <View style={styles.cardContent}>
          <Text
            style={[
              styles.cardTitle,
              {
                color: colorTexto,
                fontSize: 19 * escalaTexto,
              },
            ]}
          >
            {titulo}
          </Text>

          <Text
            style={[
              styles.cardDescription,
              {
                color: colorSecundario,
                fontSize: 14 * escalaTexto,
                lineHeight: 20 * escalaTexto,
              },
            ]}
          >
            {descripcion}
          </Text>
        </View>

        <View
          style={[
            styles.arrowBox,
            {
              backgroundColor: fondoIcono,
            },
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={21}
            color={color}
          />
        </View>
      </TouchableOpacity>
    </Link>
  );
}

export default function CrearCuentaScreen() {
  const { width } = useWindowDimensions();

  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const altoContraste =
    preferencias.altoContraste;

  const modoOscuro =
    preferencias.modoOscuro;

  const temaOscuro =
    modoOscuro || altoContraste;

  const mostrarEnFila =
    width >= 720 && escalaTexto <= 1.15;

  const colorAlumno = altoContraste
    ? colores.primario
    : temaOscuro
      ? '#93C5FD'
      : '#3B82F6';

  const colorDocente = altoContraste
    ? colores.primario
    : temaOscuro
      ? '#86EFAC'
      : '#22A75A';

  const fondoAlumno = altoContraste
    ? colores.fondo
    : temaOscuro
      ? '#172554'
      : '#EAF2FF';

  const fondoDocente = altoContraste
    ? colores.fondo
    : temaOscuro
      ? '#052E16'
      : '#EAF8EF';

  const fondoIntroduccion = altoContraste
    ? colores.tarjeta
    : temaOscuro
      ? '#1E293B'
      : '#F1F5F9';

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colores.fondo,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            backgroundColor: colores.fondo,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[
                styles.topButton,
                {
                  backgroundColor:
                    colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Regresar"
            >
              <Ionicons
                name="arrow-back"
                size={23}
                color={colores.texto}
              />
            </TouchableOpacity>

            <BotonAccesibilidad />
          </View>

          <View
            style={[
              styles.introduction,
              {
                backgroundColor:
                  fondoIntroduccion,
                borderColor: colores.borde,
              },
            ]}
          >
            <View
              style={[
                styles.peopleIcon,
                {
                  backgroundColor:
                    colores.tarjeta,
                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={30}
                color={colores.primario}
              />
            </View>

            <Text
              style={[
                styles.title,
                {
                  color: colores.texto,
                  fontSize: 27 * escalaTexto,
                  lineHeight:
                    33 * escalaTexto,
                },
              ]}
              accessibilityRole="header"
            >
              Crear cuenta
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    colores.textoSecundario,
                  fontSize: 15 * escalaTexto,
                  lineHeight:
                    22 * escalaTexto,
                },
              ]}
            >
              Primero dinos cómo usarás
              AULAMOS.
            </Text>
          </View>

          <View style={styles.questionBox}>
            <Text
              style={[
                styles.question,
                {
                  color: colores.texto,
                  fontSize: 21 * escalaTexto,
                  lineHeight:
                    27 * escalaTexto,
                },
              ]}
            >
              ¿Eres alumno o docente?
            </Text>

            <Text
              style={[
                styles.instruction,
                {
                  color:
                    colores.textoSecundario,
                  fontSize: 14 * escalaTexto,
                  lineHeight:
                    20 * escalaTexto,
                },
              ]}
            >
              Toca una opción para continuar.
            </Text>
          </View>

          <View
            style={[
              styles.cards,
              mostrarEnFila &&
                styles.cardsEnFila,
            ]}
          >
            <TarjetaRol
              titulo="Alumno"
              descripcion="Quiero aprender y realizar mis actividades."
              icono="school-outline"
              ruta="/crear-cuenta-alumno"
              color={colorAlumno}
              fondoIcono={fondoAlumno}
              fondoTarjeta={colores.tarjeta}
              colorTexto={colores.texto}
              colorSecundario={
                colores.textoSecundario
              }
              colorBorde={colores.borde}
              escalaTexto={escalaTexto}
              mostrarEnFila={mostrarEnFila}
            />

            <TarjetaRol
              titulo="Docente"
              descripcion="Quiero enseñar y crear actividades para mis alumnos."
              icono="book-outline"
              ruta="/crear-cuenta-docente"
              color={colorDocente}
              fondoIcono={fondoDocente}
              fondoTarjeta={colores.tarjeta}
              colorTexto={colores.texto}
              colorSecundario={
                colores.textoSecundario
              }
              colorBorde={colores.borde}
              escalaTexto={escalaTexto}
              mostrarEnFila={mostrarEnFila}
            />
          </View>

          <View
            style={[
              styles.helpMessage,
              {
                backgroundColor:
                  colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={21}
              color={colores.primario}
            />

            <Text
              style={[
                styles.helpText,
                {
                  color:
                    colores.textoSecundario,
                  fontSize: 13 * escalaTexto,
                  lineHeight:
                    18 * escalaTexto,
                },
              ]}
            >
              Después podrás escribir tu
              nombre, correo y contraseña.
            </Text>
          </View>

          <View style={styles.loginRow}>
            <Text
              style={[
                styles.loginText,
                {
                  color:
                    colores.textoSecundario,
                  fontSize: 14 * escalaTexto,
                },
              ]}
            >
              ¿Ya tienes cuenta?
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.replace('/')
              }
              accessibilityRole="button"
              accessibilityLabel="Ir a iniciar sesión"
            >
              <Text
                style={[
                  styles.loginLink,
                  {
                    color:
                      colores.primario,
                    fontSize:
                      14 * escalaTexto,
                  },
                ]}
              >
                Iniciar sesión
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 35,
  },

  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  introduction: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 24,
    marginTop: 24,
  },

  peopleIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  title: {
    textAlign: 'center',
    fontWeight: '800',
  },

  subtitle: {
    maxWidth: 300,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 7,
  },

  questionBox: {
    marginTop: 28,
    marginBottom: 18,
  },

  question: {
    textAlign: 'center',
    fontWeight: '800',
  },

  instruction: {
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 6,
  },

  cards: {
    gap: 14,
  },

  cardsEnFila: {
    flexDirection: 'row',
  },

  card: {
    width: '100%',
    minHeight: 122,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 19,
    padding: 17,
  },

  cardEnFila: {
    flex: 1,
    width: undefined,
    minHeight: 145,
  },

  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardContent: {
    flex: 1,
    paddingHorizontal: 14,
  },

  cardTitle: {
    fontWeight: '800',
  },

  cardDescription: {
    marginTop: 5,
    fontWeight: '500',
  },

  arrowBox: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  helpMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginTop: 20,
  },

  helpText: {
    flex: 1,
    fontWeight: '500',
    marginLeft: 10,
  },

  loginRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 25,
  },

  loginText: {
    fontWeight: '500',
  },

  loginLink: {
    fontWeight: '800',
  },
});