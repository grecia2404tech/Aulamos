import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CrearCuentaScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="arrow-back" size={18} color="#111827" style={styles.back} />
      <Ionicons name="accessibility" size={22} color="#7C4DFF" style={styles.accessIcon} />

      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Comienza tu aprendizaje</Text>

      <Text style={styles.question}>¿Cuál es tu rol?</Text>
      <Text style={styles.text}>Selecciona una opción para continuar</Text>

      <View style={styles.cards}>
        <Link href={"/crear-cuenta-alumno" as any} asChild>
          <TouchableOpacity style={styles.card}>
            <Ionicons name="school" size={42} color="#2563EB" />
            <Text style={styles.alumno}>Alumno</Text>
            <Text style={styles.cardText}>Accede a tus clases,{'\n'}tareas y recursos.</Text>
            <Ionicons name="chevron-forward" size={19} color="#2563EB" />
          </TouchableOpacity>
        </Link>

        <Link href={"/crear-cuenta-docente" as any} asChild>
          <TouchableOpacity style={styles.card}>
            <Ionicons name="id-card-outline" size={42} color="#16A34A" />
            <Text style={styles.docente}>Docente</Text>
            <Text style={styles.cardText}>Crea y gestiona tus{'\n'}clases, recursos y{'\n'}evaluaciones.</Text>
            <Ionicons name="chevron-forward" size={19} color="#16A34A" />
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    top: 55,
    left: 32,
  },
  accessIcon: {
    position: 'absolute',
    top: 55,
    right: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 48,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 38,
  },
  question: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 30,
  },
  text: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 45,
  },
  cards: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    height: 165,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  alumno: {
    color: '#2563EB',
    fontWeight: '800',
    fontSize: 16,
    marginTop: 8,
  },
  docente: {
    color: '#16A34A',
    fontWeight: '800',
    fontSize: 16,
    marginTop: 8,
  },
  cardText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 10,
    marginVertical: 9,
  },
});