import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  type Href,
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';

type UsuarioDocente = {
  id_usuario: number;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  correo: string;
  rol: string;
};

type AccionMenu =
  | 'perfil'
  | 'notificaciones'
  | 'cerrar-sesion';

type OpcionMenu = {
  id: string;
  titulo: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
  ruta?: Href;
  accion?: AccionMenu;
};

type ColoresAccesibilidad = {
  fondo: string;
  tarjeta: string;
  texto: string;
  textoSecundario: string;
  borde: string;
  primario: string;
  fondoPrimario: string;
  peligro: string;
};

const OPCIONES_MENU: OpcionMenu[] = [
  {
    id: 'perfil',
    titulo: 'Ver perfil',
    descripcion: 'Consulta tus datos personales',
    icono: 'person-outline',
    accion: 'perfil',
  },
  {
    id: 'estudiantes',
    titulo: 'Ver estudiantes',
    descripcion: 'Consulta estudiantes y avances',
    icono: 'people-outline',
    ruta: '/estudiantes-docente',
  },
  {
  id: 'asistencia',
  titulo: 'Pasar lista',
  descripcion: 'Registra asistencia, faltas y retardos',
  icono: 'checkbox-outline',
  ruta: '/pasar-lista' as Href,
  },
  {
    id: 'reportes',
    titulo: 'Reportes',
    descripcion: 'Revisa resultados y rendimiento',
    icono: 'bar-chart-outline',
    ruta: '/reportes',
  },
  {
    id: 'chatbot',
    titulo: 'Chatbot',
    descripcion: 'Consulta al asistente virtual de Aulamos',
    icono: 'chatbubble-ellipses-outline',
    ruta: '/chatbot',
  },
  {
    id: 'notificaciones',
    titulo: 'Notificaciones',
    descripcion: 'Consulta avisos y novedades',
    icono: 'notifications-outline',
    accion: 'notificaciones',
  },
  {
    id: 'configuracion',
    titulo: 'Configuración',
    descripcion: 'Personaliza la accesibilidad de Aulamos',
    icono: 'settings-outline',
    ruta: '/accesibilidad',
  },
  {
    id: 'cerrar-sesion',
    titulo: 'Cerrar sesión',
    descripcion: 'Salir de tu cuenta de forma segura',
    icono: 'log-out-outline',
    accion: 'cerrar-sesion',
  },
];

export default function MenuDocenteScreen() {
  const { width } = useWindowDimensions();

  const {
    colores,
    escalaTexto,
    preferencias,
    leerTexto,
    detenerLectura,
  } = useAccessibility();

  const [usuario, setUsuario] =
    useState<UsuarioDocente | null>(null);

  const textoGrande = escalaTexto > 1.2;
  const pantallaEstrecha = width < 360;

  const temaOscuro =
    preferencias.modoOscuro ||
    preferencias.altoContraste;

  const estiloStatusBar = temaOscuro
    ? 'light-content'
    : 'dark-content';

  const nombreCompleto = useMemo(() => {
    if (!usuario) {
      return 'Docente';
    }

    return [
      usuario.nombre,
      usuario.apellido_paterno,
      usuario.apellido_materno,
    ]
      .filter(Boolean)
      .join(' ');
  }, [usuario]);

  const anunciar = useCallback(
    (mensaje: string) => {
      if (preferencias.lectorPantalla) {
        leerTexto(mensaje);
      }
    },
    [
      preferencias.lectorPantalla,
      leerTexto,
    ]
  );

  const cargarUsuario = useCallback(async () => {
    try {
      const usuarioGuardado =
        await AsyncStorage.getItem('usuario');

      if (!usuarioGuardado) {
        Alert.alert(
          'Sesión no encontrada',
          'Inicia sesión nuevamente.'
        );

        router.replace('/' as Href);
        return;
      }

      const datosUsuario = JSON.parse(
        usuarioGuardado
      ) as UsuarioDocente;

      setUsuario(datosUsuario);

      anunciar(
        `Menú del docente. Usuario ${[
          datosUsuario.nombre,
          datosUsuario.apellido_paterno,
        ]
          .filter(Boolean)
          .join(' ')}.`
      );
    } catch (error) {
      console.error(
        'Error al cargar usuario:',
        error
      );

      Alert.alert(
        'Error',
        'No se pudo obtener la información del usuario.'
      );
    }
  }, [anunciar]);

  useFocusEffect(
    useCallback(() => {
      cargarUsuario();

      return () => {
        detenerLectura();
      };
    }, [cargarUsuario, detenerLectura])
  );

  const mostrarPerfil = () => {
    if (!usuario) {
      Alert.alert(
        'Perfil',
        'No se encontró la información del docente.'
      );

      return;
    }

    const mensaje = [
      `Nombre: ${nombreCompleto}`,
      `Correo: ${usuario.correo}`,
      `Rol: ${usuario.rol}`,
    ].join('\n');

    anunciar(
      `Perfil del docente. Nombre ${nombreCompleto}. Correo ${usuario.correo}. Rol ${usuario.rol}.`
    );

    Alert.alert(
      'Perfil del docente',
      mensaje
    );
  };

  const mostrarNotificaciones = () => {
    anunciar(
      'La función de notificaciones estará disponible próximamente.'
    );

    Alert.alert(
      'Notificaciones',
      'Esta función estará disponible próximamente.'
    );
  };

  const cerrarSesion = async () => {
    try {
      detenerLectura();

      await AsyncStorage.multiRemove([
        'token',
        'usuario',
      ]);

      router.replace('/' as Href);
    } catch (error) {
      console.error(
        'Error al cerrar sesión:',
        error
      );

      Alert.alert(
        'Error',
        'No se pudo cerrar la sesión. Intenta nuevamente.'
      );
    }
  };

  const confirmarCerrarSesion = () => {
    detenerLectura();

    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que deseas cerrar tu sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: cerrarSesion,
        },
      ]
    );
  };

  const ejecutarOpcion = (
    opcion: OpcionMenu
  ) => {
    if (opcion.ruta) {
      anunciar(
        `Abriendo ${opcion.titulo}.`
      );

      router.push(opcion.ruta);
      return;
    }

    switch (opcion.accion) {
      case 'perfil':
        mostrarPerfil();
        break;

      case 'notificaciones':
        mostrarNotificaciones();
        break;

      case 'cerrar-sesion':
        confirmarCerrarSesion();
        break;
    }
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
      <StatusBar
        barStyle={estiloStatusBar}
        backgroundColor={colores.fondo}
      />

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
          style={[
            styles.botonEncabezado,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
          accessibilityHint="Regresa a la pantalla anterior"
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colores.texto}
          />
        </TouchableOpacity>

        <View style={styles.textoEncabezado}>
          <Text
            style={[
              styles.tituloPantalla,
              {
                color: colores.texto,
                fontSize: 21 * escalaTexto,
                lineHeight:
                  27 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Más
          </Text>

          <Text
            style={[
              styles.subtituloPantalla,
              {
                color:
                  colores.textoSecundario,
                fontSize:
                  11 * escalaTexto,
                lineHeight:
                  16 * escalaTexto,
              },
            ]}
          >
            Opciones de tu cuenta docente
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.contenido,
          {
            paddingHorizontal:
              pantallaEstrecha ? 14 : 19,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.tarjetaPerfil,
            {
              backgroundColor:
                colores.fondoPrimario,
              borderColor: colores.borde,
            },
            textoGrande &&
              styles.tarjetaPerfilGrande,
          ]}
          accessible
          accessibilityLabel={`Docente ${nombreCompleto}. ${
            usuario?.correo ??
            'Correo no disponible'
          }`}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor:
                  colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <Ionicons
              name="person"
              size={35}
              color={colores.primario}
            />
          </View>

          <View
            style={[
              styles.datosPerfil,
              textoGrande &&
                styles.datosPerfilGrande,
            ]}
          >
            <Text
              style={[
                styles.nombrePerfil,
                {
                  color: colores.texto,
                  fontSize:
                    16 * escalaTexto,
                  lineHeight:
                    22 * escalaTexto,
                },
              ]}
              numberOfLines={
                textoGrande ? undefined : 2
              }
            >
              {nombreCompleto}
            </Text>

            <Text
              style={[
                styles.correoPerfil,
                {
                  color:
                    colores.textoSecundario,
                  fontSize:
                    11 * escalaTexto,
                },
              ]}
              numberOfLines={1}
            >
              {usuario?.correo ??
                'Correo no disponible'}
            </Text>

            <View
              style={[
                styles.insigniaRol,
                {
                  backgroundColor:
                    colores.tarjeta,
                  borderColor:
                    colores.borde,
                },
              ]}
            >
              <Ionicons
                name="school-outline"
                size={14}
                color={colores.primario}
              />

              <Text
                style={[
                  styles.textoRol,
                  {
                    color:
                      colores.primario,
                    fontSize:
                      9 * escalaTexto,
                  },
                ]}
              >
                Docente
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.tituloSeccion,
            {
              color: colores.texto,
              fontSize:
                14 * escalaTexto,
            },
          ]}
          accessibilityRole="header"
        >
          Cuenta y herramientas
        </Text>

        <View
          style={[
            styles.listaOpciones,
            {
              backgroundColor:
                colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
        >
          {OPCIONES_MENU.map(
            (opcion, index) => {
              const esCerrarSesion =
                opcion.accion ===
                'cerrar-sesion';

              const esChatbot =
                opcion.id === 'chatbot';

              const colorTitulo =
                esCerrarSesion
                  ? colores.peligro
                  : colores.texto;

              return (
                <TouchableOpacity
                  key={opcion.id}
                  style={[
                    styles.opcionMenu,
                    {
                      borderBottomColor:
                        colores.borde,
                      borderBottomWidth:
                        index ===
                        OPCIONES_MENU.length -
                          1
                          ? 0
                          : StyleSheet.hairlineWidth,
                    },
                    textoGrande &&
                      styles.opcionMenuGrande,
                  ]}
                  onPress={() =>
                    ejecutarOpcion(opcion)
                  }
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  accessibilityLabel={
                    opcion.titulo
                  }
                  accessibilityHint={
                    opcion.descripcion
                  }
                >
                  <View
                    style={[
                      styles.cajaIcono,
                      {
                        backgroundColor:
                          esCerrarSesion
                            ? `${colores.peligro}18`
                            : colores.fondoPrimario,
                      },
                    ]}
                  >
                    <Ionicons
                      name={opcion.icono}
                      size={23}
                      color={
                        esCerrarSesion
                          ? colores.peligro
                          : colores.primario
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.informacionOpcion
                    }
                  >
                    <View
                      style={
                        styles.filaTituloOpcion
                      }
                    >
                      <Text
                        style={[
                          styles.tituloOpcion,
                          {
                            color:
                              colorTitulo,
                            fontSize:
                              14 *
                              escalaTexto,
                            lineHeight:
                              19 *
                              escalaTexto,
                          },
                        ]}
                      >
                        {opcion.titulo}
                      </Text>

                      {esChatbot && (
                        <View
                          style={[
                            styles.insigniaChatbot,
                            {
                              backgroundColor:
                                colores
                                  .fondoPrimario,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.textoInsignia,
                              {
                                color:
                                  colores.primario,
                                fontSize:
                                  8 *
                                  escalaTexto,
                              },
                            ]}
                          >
                            Asistente
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={[
                        styles.descripcionOpcion,
                        {
                          color:
                            colores.textoSecundario,
                          fontSize:
                            10 *
                            escalaTexto,
                          lineHeight:
                            15 *
                            escalaTexto,
                        },
                      ]}
                    >
                      {opcion.descripcion}
                    </Text>
                  </View>

                  {!esCerrarSesion && (
                    <Ionicons
                      name="chevron-forward"
                      size={21}
                      color={
                        colores.textoSecundario
                      }
                    />
                  )}
                </TouchableOpacity>
              );
            }
          )}
        </View>

        <View
          style={[
            styles.mensajeAyuda,
            {
              backgroundColor:
                colores.fondoPrimario,
              borderColor: colores.borde,
            },
          ]}
          accessible
          accessibilityLabel="El chatbot puede ser utilizado por alumnos y docentes para consultar dudas dentro de Aulamos."
        >
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={colores.primario}
          />

          <Text
            style={[
              styles.textoAyuda,
              {
                color:
                  colores.textoSecundario,
                fontSize:
                  10 * escalaTexto,
                lineHeight:
                  16 * escalaTexto,
              },
            ]}
          >
            El chatbot puede ser utilizado por
            alumnos y docentes para consultar
            dudas dentro de Aulamos.
          </Text>
        </View>
      </ScrollView>

      <BarraInferior
        colores={colores}
        escalaTexto={escalaTexto}
      />
    </SafeAreaView>
  );
}

type BarraInferiorProps = {
  colores: ColoresAccesibilidad;
  escalaTexto: number;
};

function BarraInferior({
  colores,
  escalaTexto,
}: BarraInferiorProps) {
  return (
    <View
      style={[
        styles.barraInferior,
        {
          backgroundColor:
            colores.tarjeta,
          borderTopColor:
            colores.borde,
        },
      ]}
      accessibilityRole="tablist"
    >
      <ItemBarra
        icono="home-outline"
        iconoActivo="home"
        texto="Inicio"
        ruta="/inicio-docente"
        activo={false}
        colores={colores}
        escalaTexto={escalaTexto}
      />

      <ItemBarra
        icono="book-outline"
        iconoActivo="book"
        texto="Recursos"
        ruta="/crear-recurso"
        activo={false}
        colores={colores}
        escalaTexto={escalaTexto}
      />

      <ItemBarra
        icono="reader-outline"
        iconoActivo="reader"
        texto="Actividades"
        ruta="/actividades-docente"
        activo={false}
        colores={colores}
        escalaTexto={escalaTexto}
      />

      <ItemBarra
        icono="document-text-outline"
        iconoActivo="document-text"
        texto="Evaluaciones"
        ruta="/crear-evaluacion"
        activo={false}
        colores={colores}
        escalaTexto={escalaTexto}
      />

      <ItemBarra
        icono="menu-outline"
        iconoActivo="menu"
        texto="Más"
        ruta="/menu-docente"
        activo
        colores={colores}
        escalaTexto={escalaTexto}
      />
    </View>
  );
}

type ItemBarraProps = {
  icono: keyof typeof Ionicons.glyphMap;
  iconoActivo: keyof typeof Ionicons.glyphMap;
  texto: string;
  ruta: Href;
  activo: boolean;
  colores: ColoresAccesibilidad;
  escalaTexto: number;
};

function ItemBarra({
  icono,
  iconoActivo,
  texto,
  ruta,
  activo,
  colores,
  escalaTexto,
}: ItemBarraProps) {
  const color = activo
    ? colores.primario
    : colores.textoSecundario;

  return (
    <TouchableOpacity
      style={styles.itemBarra}
      onPress={() => {
        if (!activo) {
          router.replace(ruta);
        }
      }}
      accessibilityRole="tab"
      accessibilityLabel={texto}
      accessibilityState={{
        selected: activo,
      }}
    >
      <View
        style={[
          styles.fondoIconoBarra,
          activo && {
            backgroundColor:
              colores.fondoPrimario,
          },
        ]}
      >
        <Ionicons
          name={
            activo
              ? iconoActivo
              : icono
          }
          size={21}
          color={color}
        />
      </View>

      <Text
        style={[
          styles.textoBarra,
          {
            color,
            fontSize: Math.min(
              8 * escalaTexto,
              11
            ),
            fontWeight: activo
              ? '900'
              : '600',
          },
        ]}
        numberOfLines={2}
      >
        {texto}
      </Text>
    </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
  },

  botonEncabezado: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoEncabezado: {
    flex: 1,
    marginHorizontal: 11,
  },

  tituloPantalla: {
    fontWeight: '900',
  },

  subtituloPantalla: {
    marginTop: 2,
  },

  contenido: {
    paddingTop: 17,
    paddingBottom: 28,
  },

  tarjetaPerfil: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: 21,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#111827',
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.07,
        shadowRadius: 12,
      },

      android: {
        elevation: 2,
      },
    }),
  },

  tarjetaPerfilGrande: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  datosPerfil: {
    flex: 1,
    marginLeft: 14,
  },

  datosPerfilGrande: {
    width: '100%',
    marginLeft: 0,
    marginTop: 12,
  },

  nombrePerfil: {
    fontWeight: '900',
  },

  correoPerfil: {
    marginTop: 5,
  },

  insigniaRol: {
    alignSelf: 'flex-start',
    minHeight: 27,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 8,
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 5,
  },

  textoRol: {
    fontWeight: '800',
  },

  tituloSeccion: {
    marginTop: 23,
    marginBottom: 9,
    paddingHorizontal: 2,
    fontWeight: '900',
  },

  listaOpciones: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',

    ...Platform.select({
      android: {
        elevation: 1,
      },
    }),
  },

  opcionMenu: {
    minHeight: 78,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  opcionMenuGrande: {
    minHeight: 96,
  },

  cajaIcono: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  informacionOpcion: {
    flex: 1,
    marginHorizontal: 12,
  },

  filaTituloOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  tituloOpcion: {
    fontWeight: '800',
  },

  descripcionOpcion: {
    marginTop: 4,
  },

  insigniaChatbot: {
    minHeight: 22,
    borderRadius: 8,
    paddingHorizontal: 7,
    marginLeft: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoInsignia: {
    fontWeight: '900',
  },

  mensajeAyuda: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 10,
  },

  textoAyuda: {
    flex: 1,
  },

  barraInferior: {
    minHeight: 68,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 3,
    paddingTop: 5,
    paddingBottom: 4,

    ...Platform.select({
      android: {
        elevation: 10,
      },
    }),
  },

  itemBarra: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },

  fondoIconoBarra: {
    width: 38,
    height: 29,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBarra: {
    marginTop: 3,
    textAlign: 'center',
  },
});