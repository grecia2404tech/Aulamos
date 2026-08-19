import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useAccessibility,
} from '../contexts/AccessibilityContext';

export default function SubtitulosLectura() {
  const {
    preferencias,
    textoSubtitulo,
    escalaTexto,
  } = useAccessibility();

  // Si los subtítulos están apagados,
  // no mostramos nada.
  if (!preferencias.subtitulos) {
    return null;
  }

  // Si en este momento no se está leyendo
  // ningún texto, tampoco mostramos la caja.
  if (!textoSubtitulo.trim()) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={styles.contenedor}
    >
      <View
        style={styles.cajaSubtitulo}
        accessible
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        accessibilityLabel={textoSubtitulo}
      >
        <Text
          style={[
            styles.texto,
            {
              fontSize:
                18 * escalaTexto,
            },
          ]}
        >
          {textoSubtitulo}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    position: 'absolute',

    left: 16,
    right: 16,
    bottom: 90,

    alignItems: 'center',

    zIndex: 99999,

    elevation: 20,
  },

  cajaSubtitulo: {
    maxWidth: '95%',

    backgroundColor:
      'rgba(0, 0, 0, 0.90)',

    borderWidth: 2,
    borderColor: '#6D5DFB',

    borderRadius: 14,

    paddingHorizontal: 18,
    paddingVertical: 12,

    shadowColor: '#000000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.3,

    shadowRadius: 6,

    elevation: 10,
  },

  texto: {
    color: '#FFFFFF',

    textAlign: 'center',

    fontWeight: '600',

    lineHeight: 27,
  },
});