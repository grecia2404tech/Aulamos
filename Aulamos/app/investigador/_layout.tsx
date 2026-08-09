import { Slot } from 'expo-router';
import {
  StyleSheet,
  View,
} from 'react-native';

import MenuInvestigador from '../../components/MenuInvestigador';
import { useAccessibility } from '../../contexts/AccessibilityContext';

export default function InvestigadorLayout() {
  const {
    colores,
  } = useAccessibility();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colores.fondo,
        },
      ]}
    >
      {/* AQUÍ SE MUESTRA
          LA PANTALLA ACTUAL */}
      <View style={styles.contenido}>
        <Slot />
      </View>

      {/* MENÚ PERMANENTE */}
      <MenuInvestigador />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  contenido: {
    flex: 1,
  },
});