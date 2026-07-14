import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  TamanoTexto,
  useAccessibility,
} from '../contexts/AccessibilityContext';

type OpcionProps = {
  titulo: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
  valor: boolean;
  onChange: (valor: boolean) => void;
};

export default function AccesibilidadScreen() {
  const {
    preferencias,
    colores,
    escalaTexto,
    actualizarPreferencia,
    restablecerPreferencias,
    leerTexto,
  } = useAccessibility();

  const cambiarLectorPantalla = async (
    valor: boolean
  ) => {
    await actualizarPreferencia(
      'lectorPantalla',
      valor
    );

    if (valor) {
      leerTexto(
        'Lectura de pantalla activada. Aulamos leerá en voz alta el contenido compatible.'
      );
    }
  };

  const cambiarTamanoTexto = async (
    tamano: TamanoTexto
  ) => {
    await actualizarPreferencia(
      'tamanoTexto',
      tamano
    );
  };

  const confirmarRestablecimiento = () => {
    Alert.alert(
      'Restablecer accesibilidad',
      '¿Quieres regresar todas las opciones a sus valores originales?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: restablecerPreferencias,
        },
      ]
    );
  };

  const Opcion = ({
    titulo,
    descripcion,
    icono,
    valor,
    onChange,
  }: OpcionProps) => {
    return (
      <View
        style={[
          styles.optionCard,
          {
            backgroundColor: colores.tarjeta,
            borderColor: colores.borde,
          },
        ]}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor:
                colores.fondoPrimario,
            },
          ]}
        >
          <Ionicons
            name={icono}
            size={26}
            color={colores.primario}
          />
        </View>

        <View style={styles.optionContent}>
          <Text
            style={[
              styles.optionTitle,
              {
                color: colores.texto,
                fontSize: 15 * escalaTexto,
              },
            ]}
          >
            {titulo}
          </Text>

          <Text
            style={[
              styles.optionDescription,
              {
                color:
                  colores.textoSecundario,
                fontSize: 12 * escalaTexto,
              },
            ]}
          >
            {descripcion}
          </Text>
        </View>

        <Switch
          value={valor}
          onValueChange={onChange}
          trackColor={{
            false: '#94A3B8',
            true: colores.primario,
          }}
          thumbColor="#FFFFFF"
          accessibilityLabel={titulo}
          accessibilityHint={descripcion}
          accessibilityRole="switch"
          accessibilityState={{
            checked: valor,
          }}
        />
      </View>
    );
  };

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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
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

          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor:
                  colores.fondoPrimario,
              },
            ]}
          >
            <Ionicons
              name="accessibility"
              size={27}
              color={colores.primario}
            />
          </View>
        </View>

        <Text
          style={[
            styles.title,
            {
              color: colores.texto,
              fontSize: 28 * escalaTexto,
            },
          ]}
          accessibilityRole="header"
        >
          Accesibilidad
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: colores.textoSecundario,
              fontSize: 15 * escalaTexto,
            },
          ]}
        >
          Personaliza tu experiencia de
          aprendizaje.
        </Text>

        <Opcion
          titulo="Alto contraste"
          descripcion="Mejora la visibilidad del texto, botones y otros elementos."
          icono="contrast-outline"
          valor={preferencias.altoContraste}
          onChange={(valor) =>
            actualizarPreferencia(
              'altoContraste',
              valor
            )
          }
        />

        <Opcion
          titulo="Modo oscuro"
          descripcion="Utiliza colores oscuros para reducir el brillo de la pantalla."
          icono="moon"
          valor={preferencias.modoOscuro}
          onChange={(valor) =>
            actualizarPreferencia(
              'modoOscuro',
              valor
            )
          }
        />

        <View
          style={[
            styles.textSizeCard,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          <View style={styles.textSizeHeader}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor:
                    colores.fondoPrimario,
                },
              ]}
            >
              <Ionicons
                name="text"
                size={26}
                color={colores.primario}
              />
            </View>

            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionTitle,
                  {
                    color: colores.texto,
                    fontSize:
                      15 * escalaTexto,
                  },
                ]}
              >
                Tamaño del texto
              </Text>

              <Text
                style={[
                  styles.optionDescription,
                  {
                    color:
                      colores.textoSecundario,
                    fontSize:
                      12 * escalaTexto,
                  },
                ]}
              >
                Aumenta el tamaño del texto
                hasta un 200%.
              </Text>
            </View>
          </View>

          <View style={styles.sizeButtons}>
            {(
              [
                'Normal',
                'Grande',
                'Muy Grande',
              ] as TamanoTexto[]
            ).map((tamano) => {
              const seleccionado =
                preferencias.tamanoTexto ===
                tamano;

              return (
                <TouchableOpacity
                  key={tamano}
                  style={[
                    styles.sizeButton,
                    {
                      borderColor:
                        seleccionado
                          ? colores.primario
                          : colores.borde,
                      backgroundColor:
                        seleccionado
                          ? colores.fondoPrimario
                          : colores.tarjeta,
                    },
                  ]}
                  onPress={() =>
                    cambiarTamanoTexto(tamano)
                  }
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: seleccionado,
                  }}
                  accessibilityLabel={`Tamaño de texto ${tamano}`}
                >
                  <Text
                    style={[
                      styles.sizeButtonText,
                      {
                        color: seleccionado
                          ? colores.primario
                          : colores.texto,
                      },
                    ]}
                  >
                    {tamano}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Opcion
          titulo="Leer pantalla"
          descripcion="Escucha en voz alta el contenido compatible de Aulamos."
          icono="volume-high-outline"
          valor={preferencias.lectorPantalla}
          onChange={cambiarLectorPantalla}
        />

        <Opcion
          titulo="Subtítulos"
          descripcion="Activa los subtítulos cuando un video o audio los tenga disponibles."
          icono="logo-closed-captioning"
          valor={preferencias.subtitulos}
          onChange={(valor) =>
            actualizarPreferencia(
              'subtitulos',
              valor
            )
          }
        />

        <Opcion
          titulo="Navegación por teclado"
          descripcion="Permite desplazarse por la plataforma usando el teclado."
          icono="keypad-outline"
          valor={
            preferencias.navegacionTeclado
          }
          onChange={(valor) =>
            actualizarPreferencia(
              'navegacionTeclado',
              valor
            )
          }
        />

        {preferencias.lectorPantalla && (
          <TouchableOpacity
            style={[
              styles.testButton,
              {
                borderColor:
                  colores.primario,
              },
            ]}
            onPress={() =>
              leerTexto(
                'Prueba de lectura. La función de lectura de Aulamos está funcionando correctamente.'
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Probar lectura de pantalla"
          >
            <Ionicons
              name="play-circle-outline"
              size={22}
              color={colores.primario}
            />

            <Text
              style={[
                styles.testButtonText,
                {
                  color: colores.primario,
                  fontSize:
                    14 * escalaTexto,
                },
              ]}
            >
              Probar lectura
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.resetButton,
            {
              borderColor: colores.peligro,
            },
          ]}
          onPress={confirmarRestablecimiento}
          accessibilityRole="button"
          accessibilityLabel="Restablecer preferencias de accesibilidad"
        >
          <Ionicons
            name="refresh-outline"
            size={21}
            color={colores.peligro}
          />

          <Text
            style={[
              styles.resetText,
              {
                color: colores.peligro,
                fontSize: 14 * escalaTexto,
              },
            ]}
          >
            Restablecer preferencias
          </Text>
        </TouchableOpacity>

        <Text
          style={[
            styles.savedText,
            {
              color: colores.textoSecundario,
              fontSize: 12 * escalaTexto,
            },
          ]}
        >
          Los cambios se guardan
          automáticamente en este dispositivo.
        </Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 38,
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

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    marginTop: 24,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 25,
    lineHeight: 22,
  },

  optionCard: {
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionContent: {
    flex: 1,
    marginHorizontal: 12,
  },

  optionTitle: {
    fontWeight: '800',
    marginBottom: 4,
  },

  optionDescription: {
    lineHeight: 17,
    flexShrink: 1,
  },

  textSizeCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
  },

  textSizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sizeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },

  sizeButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sizeButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },

  testButton: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  testButtonText: {
    fontWeight: '800',
  },

  resetButton: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  resetText: {
    fontWeight: '800',
  },

  savedText: {
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
});