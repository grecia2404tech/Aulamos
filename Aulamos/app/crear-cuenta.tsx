import { Link } from 'expo-router';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CrearCuentaScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.accessButton}>
          <Ionicons name="accessibility" size={24} color="#7C4DFF" />
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Comienza tu aprendizaje en AULAMOS</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.question}>¿Cuál es tu rol?</Text>
        <Text style={styles.text}>Selecciona una opción para continuar</Text>

        <View style={styles.cards}>
          <Link href={"/crear-cuenta-alumno" as any} asChild>
            <TouchableOpacity activeOpacity={0.85} style={styles.card}>
              <View style={styles.iconBoxAlumno}>
                <Ionicons name="school" size={42} color="#2563EB" />
              </View>

              <Text style={styles.alumno}>Alumno</Text>
              <Text style={styles.cardText}>
                Accede a tus clases, tareas y recursos educativos.
              </Text>

              <View style={styles.nextAlumno}>
                <Ionicons name="chevron-forward" size={22} color="#2563EB" />
              </View>
            </TouchableOpacity>
          </Link>

          <Link href={"/crear-cuenta-docente" as any} asChild>
            <TouchableOpacity activeOpacity={0.85} style={styles.card}>
              <View style={styles.iconBoxDocente}>
                <Ionicons name="id-card-outline" size={42} color="#16A34A" />
              </View>

              <Text style={styles.docente}>Docente</Text>
              <Text style={styles.cardText}>
                Crea clases, recursos y evaluaciones para tus alumnos.
              </Text>

              <View style={styles.nextDocente}>
                <Ionicons name="chevron-forward" size={22} color="#16A34A" />
              </View>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 55,
    paddingBottom: 35,
    backgroundColor: '#F8FAFC',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  accessButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    marginTop: 45,
    marginBottom: 45,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },

  content: {
    flex: 1,
  },

  question: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },

  text: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 28,
  },

  cards: {
    gap: 18,
  },

  card: {
    width: '100%',
    minHeight: 160,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  iconBoxAlumno: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  iconBoxDocente: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  alumno: {
    color: '#2563EB',
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 6,
  },

  docente: {
    color: '#16A34A',
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 6,
  },

  cardText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 21,
    paddingRight: 30,
  },

  nextAlumno: {
    position: 'absolute',
    right: 18,
    top: '50%',
  },

  nextDocente: {
    position: 'absolute',
    right: 18,
    top: '50%',
  },
});