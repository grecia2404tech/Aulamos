import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';

export default function CrearCuentaScreen() {
  const {
    colores,
    escalaTexto,
    preferencias,
  } = useAccessibility();

  const altoContraste =
    preferencias.altoContraste;

  const temaOscuro =
    preferencias.modoOscuro ||
    altoContraste;

  const colorAlumno = altoContraste
    ? colores.primario
    : temaOscuro
      ? '#60A5FA'
      : '#2563EB';

  const colorDocente = altoContraste
    ? colores.primario
    : temaOscuro
      ? '#4ADE80'
      : '#16A34A';

  const fondoAlumno = temaOscuro
    ? colores.fondoPrimario
    : '#DBEAFE';

  const fondoDocente = temaOscuro
    ? colores.fondoPrimario
    : '#DCFCE7';

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
            backgroundColor:
              colores.fondo,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[
              styles.backButton,
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
              size={24}
              color={colores.texto}
            />
          </TouchableOpacity>

          <BotonAccesibilidad />
        </View>

        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: colores.texto,
                fontSize:
                  28 * escalaTexto,
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
                fontSize:
                  16 * escalaTexto,
              },
            ]}
          >
            Comienza tu aprendizaje en
            AULAMOS
          </Text>
        </View>

        <View style={styles.content}>
          <Text
            style={[
              styles.question,
              {
                color: colores.texto,
                fontSize:
                  24 * escalaTexto,
              },
            ]}
          >
            ¿Cuál es tu rol?
          </Text>

          <Text
            style={[
              styles.text,
              {
                color:
                  colores.textoSecundario,
                fontSize:
                  16 * escalaTexto,
              },
            ]}
          >
            Selecciona una opción para
            continuar
          </Text>

          <View style={styles.cards}>
            <Link
              href={
                '/crear-cuenta-alumno' as any
              }
              asChild
            >
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      colores.tarjeta,
                    borderColor:
                      colores.borde,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Crear cuenta de alumno"
                accessibilityHint="Abre el formulario de registro para alumnos"
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor:
                        fondoAlumno,
                    },
                  ]}
                >
                  <Ionicons
                    name="school"
                    size={42}
                    color={colorAlumno}
                  />
                </View>

                <Text
                  style={[
                    styles.roleTitle,
                    {
                      color: colorAlumno,
                      fontSize:
                        20 *
                        escalaTexto,
                    },
                  ]}
                >
                  Alumno
                </Text>

                <Text
                  style={[
                    styles.cardText,
                    {
                      color:
                        colores.textoSecundario,
                      fontSize:
                        15 *
                        escalaTexto,
                      lineHeight:
                        21 *
                        escalaTexto,
                    },
                  ]}
                >
                  Accede a tus clases,
                  tareas y recursos
                  educativos.
                </Text>

                <View
                  style={styles.nextButton}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={colorAlumno}
                  />
                </View>
              </TouchableOpacity>
            </Link>

            <Link
              href={
                '/crear-cuenta-docente' as any
              }
              asChild
            >
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      colores.tarjeta,
                    borderColor:
                      colores.borde,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Crear cuenta de docente"
                accessibilityHint="Abre el formulario de registro para docentes"
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor:
                        fondoDocente,
                    },
                  ]}
                >
                  <Ionicons
                    name="id-card-outline"
                    size={42}
                    color={colorDocente}
                  />
                </View>

                <Text
                  style={[
                    styles.roleTitle,
                    {
                      color:
                        colorDocente,
                      fontSize:
                        20 *
                        escalaTexto,
                    },
                  ]}
                >
                  Docente
                </Text>

                <Text
                  style={[
                    styles.cardText,
                    {
                      color:
                        colores.textoSecundario,
                      fontSize:
                        15 *
                        escalaTexto,
                      lineHeight:
                        21 *
                        escalaTexto,
                    },
                  ]}
                >
                  Crea clases, recursos y
                  evaluaciones para tus
                  alumnos.
                </Text>

                <View
                  style={styles.nextButton}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={colorDocente}
                  />
                </View>
              </TouchableOpacity>
            </Link>
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
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 35,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    marginTop: 45,
    marginBottom: 45,
  },

  title: {
    fontWeight: '800',
    marginBottom: 8,
  },

  subtitle: {
    fontWeight: '500',
    lineHeight: 23,
  },

  content: {
    flex: 1,
  },

  question: {
    fontWeight: '800',
    marginBottom: 8,
  },

  text: {
    marginBottom: 28,
    lineHeight: 23,
  },

  cards: {
    gap: 18,
  },

  card: {
    width: '100%',
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    paddingRight: 52,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  roleTitle: {
    fontWeight: '800',
    marginBottom: 6,
  },

  cardText: {
    flexShrink: 1,
  },

  nextButton: {
    position: 'absolute',
    right: 18,
    top: '50%',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});