import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type Actividad = {
  id_actividad: number;
  titulo: string;
  tipo: string;
  curso: string;
  materia: string;
  fecha_publicacion: string;
  fecha_limite: string;
  total_asignados: number;
  total_entregas: number;
  porcentaje_entregas: number;
  promedio: number;
};

const obtenerParametro = (
  valor: string | string[] | undefined,
  valorPredeterminado: string
) => {
  if (Array.isArray(valor)) {
    return valor[0] ?? valorPredeterminado;
  }

  return valor ?? valorPredeterminado;
};

const formatearFecha = (fecha: string) => {
  const valor = new Date(fecha);

  if (!fecha || Number.isNaN(valor.getTime())) {
    return 'Sin fecha';
  }

  return valor.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function ReporteRendimientoActividadScreen() {
  const {
    preferencias,
    colores,
    escalaTexto,
    leerTexto,
  } = useAccessibility();

  const parametrosRuta = useLocalSearchParams<{
    materia?: string | string[];
    periodo?: string | string[];
  }>();

  const materia = obtenerParametro(
    parametrosRuta.materia,
    'todas'
  );
  const periodo = obtenerParametro(
    parametrosRuta.periodo,
    'mes_actual'
  );

  const [actividades, setActividades] =
    useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const anunciar = useCallback(
    (mensaje: string) => {
      if (preferencias.lectorPantalla) {
        leerTexto(mensaje);
      }
    },
    [preferencias.lectorPantalla, leerTexto]
  );

  const cargarActividades = useCallback(
    async (mostrarCarga = true) => {
      try {
        if (mostrarCarga) {
          setCargando(true);
        }

        const token = await AsyncStorage.getItem('token');
        const query = new URLSearchParams({
          materia,
          periodo,
        });

        const respuesta = await fetch(
          `${API_URL}/docente/reportes/rendimiento-actividad?${query.toString()}`,
          {
            headers: {
              Accept: 'application/json',
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : {}),
            },
          }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            resultado.mensaje ||
              'No se pudo cargar el rendimiento de las actividades.'
          );
        }

        const nuevosDatos = Array.isArray(
          resultado.actividades
        )
          ? resultado.actividades.map(
              (item: Partial<Actividad>) => ({
                id_actividad: Number(
                  item.id_actividad ?? 0
                ),
                titulo:
                  item.titulo ?? 'Actividad sin título',
                tipo: item.tipo ?? 'Actividad',
                curso: item.curso ?? 'Sin curso',
                materia: item.materia ?? 'Sin materia',
                fecha_publicacion:
                  item.fecha_publicacion ?? '',
                fecha_limite: item.fecha_limite ?? '',
                total_asignados: Number(
                  item.total_asignados ?? 0
                ),
                total_entregas: Number(
                  item.total_entregas ?? 0
                ),
                porcentaje_entregas: Number(
                  item.porcentaje_entregas ?? 0
                ),
                promedio: Number(item.promedio ?? 0),
              })
            )
          : [];

        setActividades(nuevosDatos);
        anunciar(
          `Se cargaron ${nuevosDatos.length} actividades.`
        );
      } catch (error) {
        console.error(
          'Error al cargar rendimiento por actividad:',
          error
        );

        const mensaje =
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al cargar las actividades.';

        setActividades([]);
        Alert.alert('Error', mensaje);
        anunciar(`Error. ${mensaje}`);
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [anunciar, materia, periodo]
  );

  useFocusEffect(
    useCallback(() => {
      cargarActividades();
    }, [cargarActividades])
  );

  const resumen = useMemo(() => {
    if (actividades.length === 0) {
      return {
        promedio: 0,
        entregas: 0,
      };
    }

    return {
      promedio:
        actividades.reduce(
          (suma, item) => suma + item.promedio,
          0
        ) / actividades.length,
      entregas:
        actividades.reduce(
          (suma, item) =>
            suma + item.porcentaje_entregas,
          0
        ) / actividades.length,
    };
  }, [actividades]);

  const actualizar = () => {
    setActualizando(true);
    cargarActividades(false);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colores.fondo },
      ]}
    >
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
          style={styles.botonEncabezado}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
          accessibilityHint="Regresa a la pantalla de reportes"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colores.texto}
          />
        </TouchableOpacity>

        <View style={styles.encabezadoTexto}>
          <Text
            style={[
              styles.titulo,
              {
                color: colores.texto,
                fontSize: 19 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
          >
            Rendimiento por actividad
          </Text>
          <Text
            style={[
              styles.subtitulo,
              {
                color: colores.textoSecundario,
                fontSize: 11 * escalaTexto,
              },
            ]}
          >
            Entregas y calificaciones de las actividades
          </Text>
        </View>

        <BotonAccesibilidad />
      </View>

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizar}
            tintColor={colores.primario}
            colors={[colores.primario]}
          />
        }
      >
        {cargando ? (
          <View style={styles.estadoCentral}>
            <ActivityIndicator
              size="large"
              color={colores.primario}
            />
            <Text
              style={[
                styles.textoEstado,
                {
                  color: colores.textoSecundario,
                  fontSize: 13 * escalaTexto,
                },
              ]}
            >
              Cargando actividades...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.filaResumen}>
              <TarjetaResumen
                titulo="Actividades"
                valor={actividades.length.toString()}
                icono="list-outline"
                colores={colores}
                escalaTexto={escalaTexto}
              />
              <TarjetaResumen
                titulo="Promedio"
                valor={`${resumen.promedio.toFixed(1)}/10`}
                icono="stats-chart-outline"
                colores={colores}
                escalaTexto={escalaTexto}
              />
              <TarjetaResumen
                titulo="Entregadas"
                valor={`${Math.round(resumen.entregas)}%`}
                icono="checkmark-done-outline"
                colores={colores}
                escalaTexto={escalaTexto}
              />
            </View>

            <Text
              style={[
                styles.tituloSeccion,
                {
                  color: colores.texto,
                  fontSize: 15 * escalaTexto,
                },
              ]}
              accessibilityRole="header"
            >
              Detalle de actividades
            </Text>

            {actividades.length === 0 ? (
              <View
                style={[
                  styles.vacio,
                  {
                    backgroundColor: colores.tarjeta,
                    borderColor: colores.borde,
                  },
                ]}
              >
                <Ionicons
                  name="stats-chart-outline"
                  size={42}
                  color={colores.primario}
                />
                <Text
                  style={[
                    styles.tituloVacio,
                    {
                      color: colores.texto,
                      fontSize: 15 * escalaTexto,
                    },
                  ]}
                >
                  No hay actividades
                </Text>
                <Text
                  style={[
                    styles.descripcionVacio,
                    {
                      color: colores.textoSecundario,
                      fontSize: 12 * escalaTexto,
                    },
                  ]}
                >
                  No se encontraron resultados para la materia y el periodo seleccionados.
                </Text>
              </View>
            ) : (
              actividades.map((actividad) => (
                <View
                  key={actividad.id_actividad}
                  style={[
                    styles.tarjetaActividad,
                    {
                      backgroundColor: colores.tarjeta,
                      borderColor: colores.borde,
                    },
                  ]}
                  accessible
                  accessibilityLabel={`${actividad.titulo}. Promedio ${actividad.promedio.toFixed(
                    1
                  )} de 10. ${Math.round(
                    actividad.porcentaje_entregas
                  )} por ciento de entregas.`}
                >
                  <View style={styles.cabeceraTarjeta}>
                    <View
                      style={[
                        styles.iconoActividad,
                        {
                          backgroundColor:
                            colores.fondoPrimario,
                        },
                      ]}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={22}
                        color={colores.primario}
                      />
                    </View>
                    <View style={styles.textosTarjeta}>
                      <Text
                        style={[
                          styles.tituloActividad,
                          {
                            color: colores.texto,
                            fontSize: 14 * escalaTexto,
                          },
                        ]}
                      >
                        {actividad.titulo}
                      </Text>
                      <Text
                        style={[
                          styles.metaActividad,
                          {
                            color:
                              colores.textoSecundario,
                            fontSize: 11 * escalaTexto,
                          },
                        ]}
                      >
                        {actividad.tipo} · {actividad.materia} · {actividad.curso}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.metricas,
                      { borderTopColor: colores.borde },
                    ]}
                  >
                    <Metrica
                      etiqueta="Promedio"
                      valor={`${actividad.promedio.toFixed(
                        1
                      )}/10`}
                      colores={colores}
                      escalaTexto={escalaTexto}
                    />
                    <Metrica
                      etiqueta="Entregadas"
                      valor={`${Math.round(
                        actividad.porcentaje_entregas
                      )}%`}
                      colores={colores}
                      escalaTexto={escalaTexto}
                    />
                    <Metrica
                      etiqueta="Entregas"
                      valor={`${actividad.total_entregas}/${actividad.total_asignados}`}
                      colores={colores}
                      escalaTexto={escalaTexto}
                    />
                  </View>

                  <Text
                    style={[
                      styles.fecha,
                      {
                        color: colores.textoSecundario,
                        fontSize: 10.5 * escalaTexto,
                      },
                    ]}
                  >
                    Publicada {formatearFecha(
                      actividad.fecha_publicacion
                    )} · Límite {formatearFecha(
                      actividad.fecha_limite
                    )}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TarjetaResumen({
  titulo,
  valor,
  icono,
  colores,
  escalaTexto,
}: {
  titulo: string;
  valor: string;
  icono: keyof typeof Ionicons.glyphMap;
  colores: ReturnType<typeof useAccessibility>['colores'];
  escalaTexto: number;
}) {
  return (
    <View
      style={[
        styles.tarjetaResumen,
        {
          backgroundColor: colores.tarjeta,
          borderColor: colores.borde,
        },
      ]}
    >
      <Ionicons
        name={icono}
        size={21}
        color={colores.primario}
      />
      <Text
        style={[
          styles.valorResumen,
          {
            color: colores.texto,
            fontSize: 17 * escalaTexto,
          },
        ]}
      >
        {valor}
      </Text>
      <Text
        style={[
          styles.etiquetaResumen,
          {
            color: colores.textoSecundario,
            fontSize: 10 * escalaTexto,
          },
        ]}
      >
        {titulo}
      </Text>
    </View>
  );
}

function Metrica({
  etiqueta,
  valor,
  colores,
  escalaTexto,
}: {
  etiqueta: string;
  valor: string;
  colores: ReturnType<typeof useAccessibility>['colores'];
  escalaTexto: number;
}) {
  return (
    <View style={styles.metrica}>
      <Text
        style={[
          styles.valorMetrica,
          {
            color: colores.primario,
            fontSize: 14 * escalaTexto,
          },
        ]}
      >
        {valor}
      </Text>
      <Text
        style={[
          styles.etiquetaMetrica,
          {
            color: colores.textoSecundario,
            fontSize: 9.5 * escalaTexto,
          },
        ]}
      >
        {etiqueta}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  encabezado: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  botonEncabezado: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  encabezadoTexto: { flex: 1 },
  titulo: { fontWeight: '800' },
  subtitulo: { marginTop: 3 },
  contenido: {
    flexGrow: 1,
    padding: 14,
    paddingBottom: 30,
  },
  estadoCentral: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoEstado: { marginTop: 12 },
  filaResumen: {
    flexDirection: 'row',
    gap: 8,
  },
  tarjetaResumen: {
    flex: 1,
    minHeight: 105,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    justifyContent: 'space-between',
  },
  valorResumen: {
    fontWeight: '900',
    marginTop: 6,
  },
  etiquetaResumen: { fontWeight: '600' },
  tituloSeccion: {
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
  },
  vacio: {
    minHeight: 210,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloVacio: {
    marginTop: 12,
    fontWeight: '800',
  },
  descripcionVacio: {
    marginTop: 7,
    lineHeight: 18,
    textAlign: 'center',
  },
  tarjetaActividad: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cabeceraTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconoActividad: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  textosTarjeta: { flex: 1 },
  tituloActividad: { fontWeight: '800' },
  metaActividad: { marginTop: 3 },
  metricas: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metrica: {
    flex: 1,
    alignItems: 'center',
  },
  valorMetrica: { fontWeight: '900' },
  etiquetaMetrica: {
    marginTop: 2,
    fontWeight: '600',
  },
  fecha: {
    marginTop: 12,
    lineHeight: 16,
  },
});
