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

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';

export default function ReporteRendimientoEvaluacionScreen() {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colores.fondo,
        },
      ]}
    >
      <View
        style={[
          styles.encabezado,
          {
            backgroundColor: colores.fondo,
            borderBottomColor: colores.borde,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.botonEncabezado}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
          accessibilityHint="Regresa a la pantalla de reportes"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colores.texto}
          />
        </TouchableOpacity>

        <View style={styles.encabezadoTexto}>
          <Text
            style={[
              styles.titulo,
              {
                color: colores.texto,
                fontSize: 19 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Rendimiento por evaluación
          </Text>

          <Text
            style={[
              styles.subtitulo,
              {
                color: colores.textoSecundario,
                fontSize: 11 * escalaTexto,
              },
            ]}
          >
            Consulta los resultados de las evaluaciones
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.tarjeta,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          <Ionicons
            name="clipboard-outline"
            size={45}
            color={colores.primario}
          />

          <Text
            style={[
              styles.textoPrincipal,
              {
                color: colores.texto,
                fontSize: 16 * escalaTexto,
              },
            ]}
          >
            Rendimiento de evaluaciones
          </Text>

          <Text
            style={[
              styles.textoSecundario,
              {
                color: colores.textoSecundario,
                fontSize: 13 * escalaTexto,
              },
            ]}
          >
            Aquí se mostrarán los resultados de las evaluaciones realizadas por
            los estudiantes.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  encabezado: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  botonEncabezado: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  encabezadoTexto: {
    flex: 1,
  },

  titulo: {
    fontWeight: '800',
  },

  subtitulo: {
    marginTop: 4,
  },

  contenido: {
    flexGrow: 1,
    padding: 18,
  },

  tarjeta: {
    minHeight: 220,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoPrincipal: {
    marginTop: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  textoSecundario: {
    marginTop: 8,
    lineHeight: 20,
    textAlign: 'center',
  },
});