import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
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
import { API_URL } from '../services/api';

type ClaseDocente = {
  id_curso: number;
  nombre: string;
  descripcion?: string | null;
  estado: string;
  id_materia: number;
  materia: string;
  campo_formativo?: string | null;
  id_grupo: number;
  grupo: string;
  grado?: string | null;
  turno?: string | null;
  modalidad?: string | null;
  ciclo: string;
  ciclo_fecha_inicio?: string | null;
  ciclo_fecha_fin?: string | null;
  estudiantes: number;
  actividades: number;
  evaluaciones: number;
};

type RespuestaClases = {
  mensaje?: string;
  total?: number;
  clases?: ClaseDocente[];
};

type IoniconName = keyof typeof Ionicons.glyphMap;

const obtenerGradoVisible = (
  grado?: string | null,
  grupo?: string | null
) => {
  const gradoRecibido = grado?.trim();

  if (gradoRecibido) {
    return gradoRecibido;
  }

  /*
   * Si el backend no envía el campo grado, se obtiene
   * desde nombres de grupo como "1° A", "2° B" o "3 C".
   */
  const coincidencia = grupo
    ?.trim()
    .match(/^(\d+\s*[°º]?)/);

  return coincidencia?.[1]?.replace(/\s+/g, '') || 'Sin grado';
};

export default function ClasesDocenteScreen() {
  const { width } = useWindowDimensions();

  const {
    colores,
    escalaTexto,
    preferencias,
    leerTexto,
    detenerLectura,
  } = useAccessibility();

  const [clases, setClases] = useState<ClaseDocente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const altoContraste = preferencias.altoContraste;
  const temaOscuro = preferencias.modoOscuro || altoContraste;
  const textoGrande = escalaTexto > 1.2;

  const colorPrincipal = altoContraste
    ? colores.primario
    : temaOscuro
      ? '#60A5FA'
      : '#2563EB';

  const anchoContenido = Math.min(width - 32, 620);
  const altoMenu = textoGrande ? 94 : 68;

  const estilosResponsive = useMemo(
    () => ({
      contenido: {
        width: anchoContenido,
      },
      scroll: {
        paddingBottom: altoMenu + 34,
      },
      menu: {
        minHeight: altoMenu,
      },
    }),
    [altoMenu, anchoContenido]
  );

  const anunciar = useCallback(
    (mensaje: string) => {
      if (preferencias.lectorPantalla) {
        leerTexto(mensaje);
      }
    },
    [leerTexto, preferencias.lectorPantalla]
  );

  const cargarClases = useCallback(
    async (mostrarCarga = true) => {
      try {
        if (mostrarCarga) {
          setCargando(true);
        }

        const token = await AsyncStorage.getItem('token');

        if (!token) {
          Alert.alert(
            'Sesión no encontrada',
            'Inicia sesión nuevamente.'
          );
          router.replace('/' as any);
          return;
        }

        const respuesta = await fetch(
          `${API_URL}/docente/clases`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const texto = await respuesta.text();
        let resultado: RespuestaClases = {};

        if (texto) {
          try {
            resultado = JSON.parse(texto);
          } catch {
            throw new Error(
              'El servidor envió una respuesta incorrecta.'
            );
          }
        }

        if (respuesta.status === 401 || respuesta.status === 403) {
          await AsyncStorage.multiRemove(['token', 'usuario']);
          Alert.alert(
            'Sesión vencida',
            resultado.mensaje || 'Inicia sesión nuevamente.'
          );
          router.replace('/' as any);
          return;
        }

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje ||
              'No se pudieron consultar las clases.'
          );
        }

        const lista = Array.isArray(resultado.clases)
          ? resultado.clases.map((clase) => ({
              ...clase,
              id_curso: Number(clase.id_curso),
              estudiantes: Number(clase.estudiantes) || 0,
              actividades: Number(clase.actividades) || 0,
              evaluaciones: Number(clase.evaluaciones) || 0,
            }))
          : [];

        setClases(lista);
        anunciar(
          `Se encontraron ${lista.length} clases activas.`
        );
      } catch (error) {
        console.error('Error al consultar las clases:', error);

        const mensaje =
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado.';

        setClases([]);
        Alert.alert('No se pudieron cargar las clases', mensaje);
        anunciar(`Error. ${mensaje}`);
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [anunciar]
  );

  useFocusEffect(
    useCallback(() => {
      cargarClases();

      return () => {
        detenerLectura();
      };
    }, [cargarClases, detenerLectura])
  );

  const actualizar = () => {
    setActualizando(true);
    cargarClases(false);
  };

  const navegar = (ruta: string) => {
    router.push(ruta as any);
  };

  const formatearFecha = (fecha?: string | null) => {
    if (!fecha) {
      return '';
    }

    const valor = new Date(`${fecha}T12:00:00`);

    if (Number.isNaN(valor.getTime())) {
      return fecha;
    }

    return valor.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (cargando) {
    return (
      <SafeAreaView
        style={[
          styles.loading,
          { backgroundColor: colores.fondo },
        ]}
      >
        <ActivityIndicator size="large" color={colorPrincipal} />
        <Text
          style={[
            styles.loadingText,
            {
              color: colores.texto,
              fontSize: 15 * escalaTexto,
            },
          ]}
        >
          Cargando tus clases...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colores.fondo },
      ]}
    >
      <StatusBar
        barStyle={temaOscuro ? 'light-content' : 'dark-content'}
        backgroundColor={colores.fondo}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          estilosResponsive.scroll,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizar}
            colors={[colorPrincipal]}
            tintColor={colorPrincipal}
          />
        }
      >
        <View
          style={[
            styles.content,
            estilosResponsive.contenido,
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Regresar al inicio docente"
            >
              <Ionicons
                name="arrow-back"
                size={23}
                color={colores.texto}
              />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text
                style={[
                  styles.title,
                  {
                    color: colores.texto,
                    fontSize: Math.min(22 * escalaTexto, 32),
                  },
                ]}
                accessibilityRole="header"
              >
                Detalles de clases
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: colores.textoSecundario,
                    fontSize: 11 * escalaTexto,
                  },
                ]}
              >
                Clases que impartes actualmente
              </Text>
            </View>

            <BotonAccesibilidad />
          </View>

          <View
            style={[
              styles.summaryBanner,
              {
                backgroundColor: temaOscuro
                  ? colores.fondoPrimario
                  : '#EEF4FF',
                borderColor: colores.borde,
              },
            ]}
            accessible
            accessibilityLabel={`${clases.length} clases activas`}
          >
            <View
              style={[
                styles.bannerIcon,
                {
                  backgroundColor: temaOscuro
                    ? colores.tarjeta
                    : '#DCE8FF',
                },
              ]}
            >
              <Ionicons name="school" size={28} color={colorPrincipal} />
            </View>
            <View style={styles.bannerText}>
              <Text
                style={[
                  styles.bannerNumber,
                  {
                    color: colores.texto,
                    fontSize: 23 * escalaTexto,
                  },
                ]}
              >
                {clases.length}
              </Text>
              <Text
                style={[
                  styles.bannerLabel,
                  {
                    color: colores.textoSecundario,
                    fontSize: 11 * escalaTexto,
                  },
                ]}
              >
                Clases activas asignadas
              </Text>
            </View>
          </View>

          {clases.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colores.tarjeta,
                  borderColor: colores.borde,
                },
              ]}
            >
              <Ionicons
                name="school-outline"
                size={46}
                color={colores.textoSecundario}
              />
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: colores.texto,
                    fontSize: 16 * escalaTexto,
                  },
                ]}
              >
                No tienes clases activas
              </Text>
              <Text
                style={[
                  styles.emptyDescription,
                  {
                    color: colores.textoSecundario,
                    fontSize: 12 * escalaTexto,
                    lineHeight: 18 * escalaTexto,
                  },
                ]}
              >
                Cuando el administrador te asigne un curso activo,
                aparecerá en esta pantalla.
              </Text>
            </View>
          ) : (
            clases.map((clase) => {
              const periodo = [
                formatearFecha(clase.ciclo_fecha_inicio),
                formatearFecha(clase.ciclo_fecha_fin),
              ]
                .filter(Boolean)
                .join(' al ');

              return (
                <View
                  key={clase.id_curso}
                  style={[
                    styles.classCard,
                    {
                      backgroundColor: colores.tarjeta,
                      borderColor: colores.borde,
                    },
                  ]}
                >
                  <View style={styles.classHeader}>
                    <View
                      style={[
                        styles.classIcon,
                        {
                          backgroundColor: temaOscuro
                            ? colores.fondoPrimario
                            : '#F0E9FF',
                        },
                      ]}
                    >
                      <Ionicons
                        name="book"
                        size={24}
                        color={
                          altoContraste
                            ? colorPrincipal
                            : '#7C3AED'
                        }
                      />
                    </View>

                    <View style={styles.classTitleBox}>
                      <Text
                        style={[
                          styles.className,
                          {
                            color: colores.texto,
                            fontSize: 16 * escalaTexto,
                          },
                        ]}
                      >
                        {clase.nombre}
                      </Text>
                      <Text
                        style={[
                          styles.subject,
                          {
                            color: colorPrincipal,
                            fontSize: 11 * escalaTexto,
                          },
                        ]}
                      >
                        {clase.materia}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: temaOscuro
                            ? colores.fondoPrimario
                            : '#DCFCE7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: altoContraste
                              ? colores.texto
                              : '#15803D',
                            fontSize: 9 * escalaTexto,
                          },
                        ]}
                      >
                        {clase.estado}
                      </Text>
                    </View>
                  </View>

                  {clase.descripcion ? (
                    <Text
                      style={[
                        styles.description,
                        {
                          color: colores.textoSecundario,
                          fontSize: 11 * escalaTexto,
                          lineHeight: 17 * escalaTexto,
                        },
                      ]}
                    >
                      {clase.descripcion}
                    </Text>
                  ) : null}

                  <View style={styles.detailsGrid}>
                    <DetailItem
                      icon="people-outline"
                      label="Grupo"
                      value={clase.grupo || 'Sin grupo'}
                    />
                    <DetailItem
                      icon="ribbon-outline"
                      label="Grado"
                      value={obtenerGradoVisible(
                        clase.grado,
                        clase.grupo
                      )}
                    />
                    <DetailItem
                      icon="time-outline"
                      label="Turno"
                      value={clase.turno || 'Sin turno'}
                    />
                    <DetailItem
                      icon="desktop-outline"
                      label="Modalidad"
                      value={clase.modalidad || 'Sin modalidad'}
                    />
                    <DetailItem
                      icon="calendar-outline"
                      label="Ciclo escolar"
                      value={clase.ciclo || 'Sin ciclo'}
                      fullWidth
                    />
                    {periodo ? (
                      <DetailItem
                        icon="calendar-number-outline"
                        label="Periodo del ciclo"
                        value={periodo}
                        fullWidth
                      />
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.metrics,
                      textoGrande && styles.metricsColumn,
                      {
                        borderTopColor: colores.borde,
                      },
                    ]}
                  >
                    <Metric
                      icon="people"
                      value={clase.estudiantes}
                      label="Estudiantes"
                      color="#16A34A"
                    />
                    <Metric
                      icon="clipboard"
                      value={clase.actividades}
                      label="Actividades"
                      color="#2563EB"
                    />
                    <Metric
                      icon="documents"
                      value={clase.evaluaciones}
                      label="Evaluaciones"
                      color="#E11D48"
                    />
                  </View>

                  <View
                    style={[
                      styles.actions,
                      textoGrande && styles.actionsColumn,
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        {
                          borderColor: colorPrincipal,
                        },
                      ]}
                      onPress={() => navegar('/estudiantes-docente')}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver estudiantes de ${clase.nombre}`}
                    >
                      <Ionicons
                        name="people-outline"
                        size={18}
                        color={colorPrincipal}
                      />
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          {
                            color: colorPrincipal,
                            fontSize: 10 * escalaTexto,
                          },
                        ]}
                      >
                        Ver estudiantes
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,
                        { backgroundColor: colorPrincipal },
                      ]}
                      onPress={() => navegar('/actividades-docente')}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver actividades de ${clase.nombre}`}
                    >
                      <Ionicons
                        name="reader-outline"
                        size={18}
                        color={altoContraste ? '#000000' : '#FFFFFF'}
                      />
                      <Text
                        style={[
                          styles.primaryButtonText,
                          {
                            color: altoContraste
                              ? '#000000'
                              : '#FFFFFF',
                            fontSize: 10 * escalaTexto,
                          },
                        ]}
                      >
                        Ver actividades
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomNavigation,
          estilosResponsive.menu,
          {
            backgroundColor: colores.tarjeta,
            borderTopColor: colores.borde,
          },
        ]}
      >
        <View
          style={[
            styles.bottomContent,
            estilosResponsive.contenido,
          ]}
        >
          <MenuItem
            icon="home-outline"
            label="Inicio"
            onPress={() => router.replace('/inicio-docente' as any)}
          />
          <MenuItem
            icon="book-outline"
            label="Recursos"
            onPress={() => navegar('/recursos-docente')}
          />
          <MenuItem
            icon="reader-outline"
            label="Actividades"
            onPress={() => navegar('/actividades-docente')}
          />
          <MenuItem
            icon="document-text-outline"
            label="Evaluaciones"
            onPress={() => navegar('/crear-evaluacion')}
          />
          <MenuItem
            icon="menu-outline"
            label="Más"
            onPress={() => navegar('/menu-docente')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function DetailItem({
  icon,
  label,
  value,
  fullWidth = false,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  const { colores, escalaTexto } = useAccessibility();
  const textoGrande = escalaTexto > 1.2;

  return (
    <View
      style={[
        styles.detailItem,
        (fullWidth || textoGrande) &&
          styles.detailItemFull,
      ]}
    >
      <Ionicons
        name={icon}
        size={17}
        color={colores.textoSecundario}
      />
      <View style={styles.detailText}>
        <Text
          style={[
            styles.detailLabel,
            {
              color: colores.textoSecundario,
              fontSize: 9 * escalaTexto,
            },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.detailValue,
            {
              color: colores.texto,
              fontSize: 11 * escalaTexto,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function Metric({
  icon,
  value,
  label,
  color,
}: {
  icon: IoniconName;
  value: number;
  label: string;
  color: string;
}) {
  const { colores, escalaTexto, preferencias } = useAccessibility();
  const finalColor = preferencias.altoContraste
    ? colores.primario
    : color;

  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={19} color={finalColor} />
      <Text
        style={[
          styles.metricValue,
          {
            color: colores.texto,
            fontSize: 16 * escalaTexto,
          },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.metricLabel,
          {
            color: colores.textoSecundario,
            fontSize: 9 * escalaTexto,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
}) {
  const { colores, escalaTexto } = useAccessibility();

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons
        name={icon}
        size={21}
        color={colores.textoSecundario}
      />
      <Text
        style={[
          styles.menuLabel,
          {
            color: colores.textoSecundario,
            fontSize: 8 * escalaTexto,
          },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontWeight: '700',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 6,
  },
  content: {
    alignSelf: 'center',
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 3,
  },
  summaryBanner: {
    marginTop: 18,
    marginBottom: 14,
    minHeight: 88,
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    marginLeft: 13,
  },
  bannerNumber: {
    fontWeight: '900',
  },
  bannerLabel: {
    marginTop: 2,
    fontWeight: '600',
  },
  emptyCard: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: 8,
    textAlign: 'center',
  },
  classCard: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#334155',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classTitleBox: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 10,
  },
  className: {
    fontWeight: '900',
  },
  subject: {
    marginTop: 3,
    fontWeight: '800',
  },
  statusBadge: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontWeight: '900',
  },
  description: {
    marginTop: 13,
  },
  detailsGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  detailItem: {
    width: '50%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  detailItemFull: {
    width: '100%',
  },
  detailText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 7,
  },
  detailLabel: {
    fontWeight: '600',
  },
  detailValue: {
    marginTop: 2,
    fontWeight: '800',
  },
  metrics: {
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  metricsColumn: {
    flexDirection: 'column',
    rowGap: 10,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  metricValue: {
    marginTop: 3,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: {
    marginTop: 15,
    flexDirection: 'row',
    columnGap: 10,
  },
  actionsColumn: {
    flexDirection: 'column',
    rowGap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
  },
  secondaryButtonText: {
    fontWeight: '900',
    textAlign: 'center',
  },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
  },
  primaryButtonText: {
    fontWeight: '900',
    textAlign: 'center',
  },
  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  bottomContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  menuLabel: {
    marginTop: 4,
    fontWeight: '700',
    textAlign: 'center',
  },
});