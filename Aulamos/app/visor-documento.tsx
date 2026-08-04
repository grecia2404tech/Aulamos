import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';

export default function VisorDocumentoScreen() {
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
            borderBottomColor: colores.borde,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.boton}
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
          Visor de documento
        </Text>

        <BotonAccesibilidad />
      </View>

      <View style={styles.contenido}>
        <Ionicons
          name="document-text-outline"
          size={52}
          color={colores.primario}
        />

        <Text
          style={[
            styles.texto,
            {
              color: colores.textoSecundario,
              fontSize: 14 * escalaTexto,
            },
          ]}
        >
          Aquí se mostrará el contenido del documento.
        </Text>
      </View>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  boton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titulo: {
    flex: 1,
    fontWeight: '800',
  },

  contenido: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  texto: {
    marginTop: 12,
    textAlign: 'center',
  },
});