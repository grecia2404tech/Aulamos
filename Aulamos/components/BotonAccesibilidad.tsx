import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

import { useAccessibility } from '../contexts/AccessibilityContext';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export default function BotonAccesibilidad({
  style,
}: Props) {
  const { colores } = useAccessibility();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        style,
        {
          backgroundColor:
            colores.fondoPrimario,
          borderColor: colores.borde,
        },
      ]}
      onPress={() =>
        router.push('/accesibilidad' as any)
      }
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Abrir configuración de accesibilidad"
      accessibilityHint="Permite cambiar el contraste, tamaño del texto y otras preferencias"
    >
      <Ionicons
        name="accessibility"
        size={24}
        color={colores.primario}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});