import { Ionicons } from '@expo/vector-icons';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useState,
} from 'react';

import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import {
  useAccessibility,
} from '../contexts/AccessibilityContext';

import {
  obtenerCantidadNoLeidas,
} from '../services/notificacionService';


// =====================================================
// PROPS
// =====================================================

type Props = {
  style?:
    StyleProp<ViewStyle>;
};


// =====================================================
// COMPONENTE
// =====================================================

export default function CampanaNotificaciones({
  style,
}: Props) {

  const {
    colores,
    escalaTexto,
  } =
    useAccessibility();


  const [
    cantidad,
    setCantidad,
  ] =
    useState(
      0
    );


  // ===================================================
  // CARGAR CANTIDAD
  // ===================================================

  const cargarCantidad =
    useCallback(
      async () => {

        try {

          const total =
            await obtenerCantidadNoLeidas();


          setCantidad(
            Number(
              total
              ??
              0
            )
          );

        } catch (
          error
        ) {

          // No bloqueamos la pantalla si falla.
          console.warn(
            'No se pudo obtener el número de notificaciones:',
            error
          );


          setCantidad(
            0
          );
        }
      },
      []
    );


  // ===================================================
  // ACTUALIZAR CUANDO LA PANTALLA RECUPERA FOCO
  // ===================================================

  useFocusEffect(
    useCallback(
      () => {

        void cargarCantidad();

      },
      [
        cargarCantidad,
      ]
    )
  );


  // ===================================================
  // TEXTO CONTADOR
  // ===================================================

  const textoCantidad =
    cantidad > 99
      ? '99+'
      : String(
          cantidad
        );


  // ===================================================
  // VISTA
  // ===================================================

  return (
    <TouchableOpacity
      style={[
        styles.boton,

        style,

        {
          backgroundColor:
            colores.tarjeta,

          borderColor:
            colores.borde,
        },
      ]}

      onPress={
        () =>
          router.push(
            '/notificaciones' as never
          )
      }

      activeOpacity={
        0.8
      }

      accessibilityRole="button"

      accessibilityLabel={
        cantidad > 0
          ? `Notificaciones. ${cantidad} sin leer.`
          : 'Notificaciones. No tienes notificaciones sin leer.'
      }

      accessibilityHint="Abre la lista de notificaciones"
    >

      <Ionicons
        name={
          cantidad > 0
            ? 'notifications'
            : 'notifications-outline'
        }

        size={
          24
        }

        color={
          colores.primario
        }
      />


      {/* =================================================
          CONTADOR
      ================================================= */}

      {cantidad > 0 && (

        <View
          style={[
            styles.badge,

            cantidad > 9
            &&
            styles.badgeGrande,
          ]}
        >

          <Text
            numberOfLines={
              1
            }

            style={[
              styles.badgeTexto,

              {
                fontSize:
                  Math.min(
                    9 *
                    escalaTexto,
                    10
                  ),
              },
            ]}
          >
            {
              textoCantidad
            }
          </Text>

        </View>
      )}

    </TouchableOpacity>
  );
}


// =====================================================
// ESTILOS
// =====================================================

const styles =
  StyleSheet.create({

    boton: {
      width:
        44,

      height:
        44,

      borderRadius:
        22,

      borderWidth:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      position:
        'relative',
    },


    badge: {
      position:
        'absolute',

      top:
        -4,

      right:
        -4,

      minWidth:
        19,

      height:
        19,

      borderRadius:
        10,

      paddingHorizontal:
        4,

      backgroundColor:
        '#DC3438',

      borderWidth:
        2,

      borderColor:
        '#FFFFFF',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    badgeGrande: {
      minWidth:
        25,

      paddingHorizontal:
        4,
    },


    badgeTexto: {
      color:
        '#FFFFFF',

      fontWeight:
        '900',

      textAlign:
        'center',
    },
  });