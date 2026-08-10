import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAccessibility } from '../contexts/AccessibilityContext';

export default function MenuInvestigador() {
  const pathname = usePathname();

  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  const esInicio =
    pathname === '/investigador';

  const esReportes =
    pathname ===
    '/investigador/reportes-investigacion';

  const esMas =
    pathname === '/investigador/mas';

  return (
    <View
      style={[
        styles.menu,
        {
          backgroundColor: colores.tarjeta,
          borderTopColor: colores.borde,
        },
      ]}
    >
      {/* INICIO */}
      <TouchableOpacity
        style={styles.item}
        onPress={() =>
          router.replace('/investigador/index')
        }
        accessibilityRole="button"
        accessibilityLabel="Inicio"
        accessibilityState={{
          selected: esInicio,
        }}
      >
        <Ionicons
          name={
            esInicio
              ? 'home'
              : 'home-outline'
          }
          size={24}
          color={
            esInicio
              ? colores.primario
              : colores.textoSecundario
          }
        />

        <Text
          style={[
            styles.texto,
            {
              color: esInicio
                ? colores.primario
                : colores.textoSecundario,

              fontSize:
                11 * escalaTexto,
            },
          ]}
        >
          Inicio
        </Text>
      </TouchableOpacity>

      {/* REPORTES */}
      <TouchableOpacity
        style={styles.item}
        onPress={() =>
          router.replace(
            '/investigador/reportes-investigacion'
          )
        }
        accessibilityRole="button"
        accessibilityLabel="Reportes"
        accessibilityState={{
          selected: esReportes,
        }}
      >
        <Ionicons
          name={
            esReportes
              ? 'bar-chart'
              : 'bar-chart-outline'
          }
          size={24}
          color={
            esReportes
              ? colores.primario
              : colores.textoSecundario
          }
        />

        <Text
          style={[
            styles.texto,
            {
              color: esReportes
                ? colores.primario
                : colores.textoSecundario,

              fontSize:
                11 * escalaTexto,
            },
          ]}
        >
          Reportes
        </Text>
      </TouchableOpacity>

      {/* MÃS */}
      <TouchableOpacity
        style={styles.item}
        onPress={() =>
          router.replace(
            '/investigador/mas'
          )
        }
        accessibilityRole="button"
        accessibilityLabel="MÃ¡s opciones"
        accessibilityState={{
          selected: esMas,
        }}
      >
        <Ionicons
          name={
            esMas
              ? 'menu'
              : 'menu-outline'
          }
          size={25}
          color={
            esMas
              ? colores.primario
              : colores.textoSecundario
          }
        />

        <Text
          style={[
            styles.texto,
            {
              color: esMas
                ? colores.primario
                : colores.textoSecundario,

              fontSize:
                11 * escalaTexto,
            },
          ]}
        >
          MÃ¡s
        </Text>
      </TouchableOpacity>

      {/* AULABOT */}
      <TouchableOpacity
        style={styles.item}
        onPress={() =>
          router.push('/chatbot')
        }
        accessibilityRole="button"
        accessibilityLabel="AulaBot"
        accessibilityHint="Abre el asistente de investigaciÃ³n de AulaMos"
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={24}
          color={colores.textoSecundario}
        />

        <Text
          style={[
            styles.texto,
            {
              color:
                colores.textoSecundario,

              fontSize:
                11 * escalaTexto,
            },
          ]}
        >
          AulaBot
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    minHeight: 67,
    borderTopWidth: 1,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'space-around',

    paddingBottom: 5,
    paddingTop: 5,
  },

  item: {
    flex: 1,

    minHeight: 52,

    alignItems: 'center',
    justifyContent: 'center',
  },

  texto: {
    fontWeight: '600',
    marginTop: 3,
  },
});