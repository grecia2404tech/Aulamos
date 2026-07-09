import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CrearCuentaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Comienza tu aprendizaje</Text>

      <Text style={styles.question}>¿Cuál es tu rol?</Text>
      <Text style={styles.text}>Selecciona una opción para continuar</Text>

      <View style={styles.cards}>
        <Link href={"/crear-alumno" as any} asChild>
          <TouchableOpacity style={styles.card}>
            <Ionicons name="school" size={48} color="#2563EB" />
            <Text style={styles.alumno}>Alumno</Text>
            <Text style={styles.cardText}>Accede a tus clases, tareas y recursos.</Text>
            <Ionicons name="chevron-forward" size={22} color="#2965e6" />
          </TouchableOpacity>
        </Link>

        <Link href={"/crear-docente" as any} asChild>
          <TouchableOpacity style={styles.card}>
            <Ionicons name="id-card-outline" size={48} color="#16A34A" />
            <Text style={styles.docente}>Docente</Text>
            <Text style={styles.cardText}>Crea y gestiona tus clases, recursos y evaluaciones.</Text>
            <Ionicons name="chevron-forward" size={22} color="#16A34A" />
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 35,
  },
  subtitle: {
    color: '#64748B',
    marginBottom: 35,
  },
  question: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  text: {
    color: '#64748B',
    marginBottom: 45,
  },
  cards: {
    flexDirection: 'row',
    gap: 14,
  },
  card: {
    flex: 1,
    height: 190,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    backgroundColor: '#FFFFFF',
  },
  alumno: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 10,
  },
  docente: {
    color: '#16A34A',
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 10,
  },
  cardText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
    marginVertical: 10,
  },
});