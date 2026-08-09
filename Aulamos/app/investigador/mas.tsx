import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../../components/BotonAccesibilidad';
import { useAccessibility } from '../../contexts/AccessibilityContext';

export default function MasInvestigadorScreen() {
  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Deseas cerrar tu sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            router.replace('/');
          },
        },
      ]
    );
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
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            backgroundColor:
              colores.tarjeta,

            borderBottomColor:
              colores.borde,
          },
        ]}
      >
        <View>
          <Text
            style={[
              styles.logo,
              {
                color:
                  colores.primario,

                fontSize:
                  22 * escalaTexto,
              },
            ]}
          >
            AULAMOS
          </Text>

          <Text
            style={[
              styles.rol,
              {
                color:
                  colores.textoSecundario,

                fontSize:
                  11 * escalaTexto,
              },
            ]}
          >
            Investigador
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.contenido
        }
      >
        <Text
          style={[
            styles.titulo,
            {
              color: colores.texto,

              fontSize:
                27 * escalaTexto,
            },
          ]}
        >
          Más
        </Text>

        <Text
          style={[
            styles.descripcion,
            {
              color:
                colores.textoSecundario,

              fontSize:
                14 * escalaTexto,
            },
          ]}
        >
          Consulta otras opciones del
          módulo de investigación.
        </Text>

        {/* PERFIL */}
        <Opcion
          icono="person-outline"
          titulo="Mi perfil"
          descripcion="Consulta la información de tu cuenta"
          colores={colores}
          escalaTexto={escalaTexto}
          onPress={() => {
            Alert.alert(
              'Mi perfil',
              'Esta pantalla se agregará posteriormente.'
            );
          }}
        />

        {/* PRUEBAS */}
        <Opcion
          icono="flask-outline"
          titulo="Pruebas de investigación"
          descripcion="Consulta las pruebas realizadas en la plataforma"
          colores={colores}
          escalaTexto={escalaTexto}
          onPress={() => {
            Alert.alert(
              'Pruebas de investigación',
              'Esta opción se implementará posteriormente.'
            );
          }}
        />

        {/* PARTICIPANTES */}
        <Opcion
          icono="people-outline"
          titulo="Participantes"
          descripcion="Consulta los estudiantes participantes"
          colores={colores}
          escalaTexto={escalaTexto}
          onPress={() => {
            Alert.alert(
              'Participantes',
              'Esta opción se implementará posteriormente.'
            );
          }}
        />

        {/* CONFIGURACIÓN */}
        <Opcion
          icono="settings-outline"
          titulo="Configuración"
          descripcion="Configura tus preferencias"
          colores={colores}
          escalaTexto={escalaTexto}
          onPress={() => {
            Alert.alert(
              'Configuración',
              'Esta opción se implementará posteriormente.'
            );
          }}
        />

        {/* AYUDA */}
        <Opcion
          icono="help-circle-outline"
          titulo="Ayuda"
          descripcion="Consulta información de ayuda"
          colores={colores}
          escalaTexto={escalaTexto}
          onPress={() => {
            Alert.alert(
              'Ayuda',
              'Esta opción se implementará posteriormente.'
            );
          }}
        />

        {/* CERRAR SESIÓN */}
        <TouchableOpacity
          style={[
            styles.cerrarSesion,
            {
              backgroundColor:
                colores.tarjeta,

              borderColor:
                colores.borde,
            },
          ]}
          onPress={cerrarSesion}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <View
            style={
              styles.cerrarIzquierda
            }
          >
            <View
              style={[
                styles.iconoCerrar,
                {
                  backgroundColor:
                    '#FDECEC',
                },
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={23}
                color="#DC3438"
              />
            </View>

            <Text
              style={[
                styles.cerrarTexto,
                {
                  fontSize:
                    15 * escalaTexto,
                },
              ]}
            >
              Cerrar sesión
            </Text>
          </View>

          <Ionicons
            name="chevron-forward-outline"
            size={21}
            color="#DC3438"
          />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Opcion({
  icono,
  titulo,
  descripcion,
  colores,
  escalaTexto,
  onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descripcion: string;
  colores: any;
  escalaTexto: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.opcion,
        {
          backgroundColor:
            colores.tarjeta,

          borderColor:
            colores.borde,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={
        descripcion
      }
    >
      <View
        style={[
          styles.iconoOpcion,
          {
            backgroundColor:
              colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={icono}
          size={23}
          color={colores.primario}
        />
      </View>

      <View
        style={
          styles.opcionContenido
        }
      >
        <Text
          style={[
            styles.opcionTitulo,
            {
              color: colores.texto,

              fontSize:
                15 * escalaTexto,
            },
          ]}
        >
          {titulo}
        </Text>

        <Text
          style={[
            styles.opcionDescripcion,
            {
              color:
                colores.textoSecundario,

              fontSize:
                11 * escalaTexto,
            },
          ]}
        >
          {descripcion}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward-outline"
        size={21}
        color={
          colores.textoSecundario
        }
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    minHeight: 68,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  logo: {
    fontWeight: '800',
  },

  rol: {
    marginTop: 2,
    fontWeight: '500',
  },

  contenido: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 35,
  },

  titulo: {
    fontWeight: '800',
  },

  descripcion: {
    marginTop: 6,
    marginBottom: 23,
    lineHeight: 20,
  },

  opcion: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 16,

    paddingHorizontal: 14,
    paddingVertical: 12,

    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 11,
  },

  iconoOpcion: {
    width: 46,
    height: 46,
    borderRadius: 13,

    alignItems: 'center',
    justifyContent: 'center',
  },

  opcionContenido: {
    flex: 1,
    marginHorizontal: 12,
  },

  opcionTitulo: {
    fontWeight: '700',
  },

  opcionDescripcion: {
    marginTop: 3,
    lineHeight: 16,
  },

  cerrarSesion: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 16,

    paddingHorizontal: 14,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',

    marginTop: 15,
  },

  cerrarIzquierda: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoCerrar: {
    width: 45,
    height: 45,
    borderRadius: 13,

    alignItems: 'center',
    justifyContent: 'center',
  },

  cerrarTexto: {
    color: '#DC3438',
    fontWeight: '700',
    marginLeft: 12,
  },
});