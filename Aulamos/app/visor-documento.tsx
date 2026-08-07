import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

const obtenerParametro = (
  valor?: string | string[],
) => {
  if (Array.isArray(valor)) {
    return valor[0];
  }

  return valor;
};

const construirUrlPublica = (
  ruta?: string,
) => {
  if (!ruta) {
    return null;
  }

  if (/^https?:\/\//i.test(ruta)) {
    return ruta;
  }

  const servidor = API_URL.replace(
    /\/api\/?$/,
    '',
  );

  return `${servidor}${
    ruta.startsWith('/')
      ? ruta
      : `/${ruta}`
  }`;
};

export default function VisorDocumentoScreen() {
  const parametros =
    useLocalSearchParams<{
      url_archivo?:
        | string
        | string[];
      nombre_archivo?:
        | string
        | string[];
      titulo?:
        | string
        | string[];
    }>();

  const rutaArchivo = obtenerParametro(
    parametros.url_archivo,
  );

  const nombreArchivo =
    obtenerParametro(
      parametros.nombre_archivo,
    ) || 'Documento';

  const titulo =
    obtenerParametro(
      parametros.titulo,
    ) || 'Visor de documento';

  const urlDocumento =
    construirUrlPublica(rutaArchivo);

  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  const abrirDocumento = async () => {
    if (!urlDocumento) {
      Alert.alert(
        'Documento no disponible',
        'No se recibió la ruta del archivo.',
      );
      return;
    }

    try {
      const compatible =
        await Linking.canOpenURL(
          urlDocumento,
        );

      if (!compatible) {
        Alert.alert(
          'No se puede abrir',
          'No se encontró una aplicación compatible con este documento.',
        );
        return;
      }

      await Linking.openURL(
        urlDocumento,
      );
    } catch (error) {
      console.error(
        'Error al abrir documento:',
        error,
      );

      Alert.alert(
        'No se pudo abrir el documento',
        'Verifica que el backend esté encendido y que la ruta del archivo sea correcta.',
      );
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colores.fondo,
        },
      ]}
    >
      <View
        style={[
          styles.encabezado,
          {
            borderBottomColor:
              colores.borde,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.boton,
            {
              backgroundColor:
                colores.tarjeta,
              borderColor:
                colores.borde,
            },
          ]}
          onPress={() =>
            router.back()
          }
          accessibilityRole="button"
          accessibilityLabel="Regresar"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colores.texto}
          />
        </TouchableOpacity>

        <View style={styles.textosEncabezado}>
          <Text
            style={[
              styles.titulo,
              {
                color:
                  colores.texto,
                fontSize:
                  19 *
                  escalaTexto,
              },
            ]}
            accessibilityRole="header"
            numberOfLines={1}
          >
            {titulo}
          </Text>

          <Text
            style={[
              styles.subtitulo,
              {
                color:
                  colores.textoSecundario,
                fontSize:
                  10 *
                  escalaTexto,
              },
            ]}
            numberOfLines={1}
          >
            {nombreArchivo}
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <View style={styles.contenido}>
        <View
          style={[
            styles.iconoContenedor,
            {
              backgroundColor:
                colores.fondoPrimario,
              borderColor:
                colores.borde,
            },
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={56}
            color={colores.primario}
          />
        </View>

        <Text
          style={[
            styles.nombreArchivo,
            {
              color: colores.texto,
              fontSize:
                16 *
                escalaTexto,
            },
          ]}
        >
          {nombreArchivo}
        </Text>

        <Text
          style={[
            styles.texto,
            {
              color:
                colores.textoSecundario,
              fontSize:
                13 *
                escalaTexto,
            },
          ]}
        >
          Pulsa el botón para abrir el documento con una aplicación compatible.
        </Text>

        <TouchableOpacity
          style={[
            styles.botonAbrir,
            {
              backgroundColor:
                colores.primario,
            },
          ]}
          onPress={() =>
            void abrirDocumento()
          }
          accessibilityRole="button"
          accessibilityLabel={`Abrir documento ${nombreArchivo}`}
        >
          <Ionicons
            name="open-outline"
            size={20}
            color="#FFFFFF"
          />

          <Text
            style={[
              styles.textoBotonAbrir,
              {
                fontSize:
                  14 *
                  escalaTexto,
              },
            ]}
          >
            Abrir documento
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  encabezado: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
  },

  boton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textosEncabezado: {
    flex: 1,
    marginHorizontal: 11,
  },

  titulo: {
    fontWeight: '800',
  },

  subtitulo: {
    marginTop: 3,
  },

  contenido: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  iconoContenedor: {
    width: 100,
    height: 100,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nombreArchivo: {
    marginTop: 20,
    fontWeight: '900',
    textAlign: 'center',
  },

  texto: {
    maxWidth: 320,
    marginTop: 9,
    textAlign: 'center',
    lineHeight: 20,
  },

  botonAbrir: {
    minHeight: 50,
    marginTop: 22,
    paddingHorizontal: 22,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBotonAbrir: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '900',
  },
});