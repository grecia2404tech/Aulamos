import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BotonAccesibilidad from '../BotonAccesibilidad';
import { useAccessibility } from '../../contexts/AccessibilityContext';

type PantallaProps = {
  titulo: string;
  descripcion?: string;
  loading?: boolean;
  refreshing?: boolean;
  error?: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  mostrarRegresar?: boolean;
  children: ReactNode;
};

export function PantallaInvestigador({
  titulo,
  descripcion,
  loading = false,
  refreshing = false,
  error,
  onRetry,
  onRefresh,
  mostrarRegresar = true,
  children,
}: PantallaProps) {
  const { colores, escalaTexto } = useAccessibility();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colores.fondo }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colores.tarjeta,
            borderBottomColor: colores.borde,
          },
        ]}
      >
        {mostrarRegresar ? (
          <TouchableOpacity
            style={styles.botonHeader}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Regresar"
          >
            <Ionicons name="arrow-back-outline" size={25} color={colores.texto} />
          </TouchableOpacity>
        ) : (
          <View style={styles.botonHeader} />
        )}

        <View style={styles.headerCentro}>
          <Text
            numberOfLines={2}
            style={[
              styles.headerTitulo,
              { color: colores.texto, fontSize: 17 * escalaTexto },
            ]}
          >
            {titulo}
          </Text>
          <Text
            style={[
              styles.headerRol,
              {
                color: colores.textoSecundario,
                fontSize: 10 * escalaTexto,
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
        contentContainerStyle={styles.contenido}
        refreshControl={onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colores.primario}
          />
        ) : undefined}
      >
        {descripcion ? (
          <Text
            style={[
              styles.descripcion,
              {
                color: colores.textoSecundario,
                fontSize: 13 * escalaTexto,
              },
            ]}
          >
            {descripcion}
          </Text>
        ) : null}

        {loading ? (
          <View style={styles.estado}>
            <ActivityIndicator size="large" color={colores.primario} />
            <Text
              style={[
                styles.estadoTexto,
                { color: colores.textoSecundario, fontSize: 13 * escalaTexto },
              ]}
            >
              Consultando la base de datos…
            </Text>
          </View>
        ) : error ? (
          <View
            style={[
              styles.estado,
              styles.estadoTarjeta,
              {
                backgroundColor: colores.tarjeta,
                borderColor: colores.borde,
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={38} color="#DC3438" />
            <Text
              style={[
                styles.errorTexto,
                { color: colores.texto, fontSize: 13 * escalaTexto },
              ]}
            >
              {error}
            </Text>
            {onRetry ? (
              <TouchableOpacity
                style={[styles.reintentar, { backgroundColor: colores.primario }]}
                onPress={onRetry}
                accessibilityRole="button"
                accessibilityLabel="Reintentar consulta"
              >
                <Text
                  style={[
                    styles.reintentarTexto,
                    { fontSize: 13 * escalaTexto },
                  ]}
                >
                  Reintentar
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          children
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type TarjetaMetricaProps = {
  icono: keyof typeof Ionicons.glyphMap;
  valor: string | number;
  etiqueta: string;
  color?: string;
};

export function TarjetaMetrica({
  icono,
  valor,
  etiqueta,
  color,
}: TarjetaMetricaProps) {
  const { colores, escalaTexto } = useAccessibility();
  const colorFinal = color || colores.primario;

  return (
    <View
      style={[
        styles.metrica,
        { backgroundColor: colores.tarjeta, borderColor: colores.borde },
      ]}
      accessible
      accessibilityLabel={`${etiqueta}: ${valor}`}
    >
      <View style={[styles.metricaIcono, { backgroundColor: `${colorFinal}18` }]}>
        <Ionicons name={icono} size={22} color={colorFinal} />
      </View>
      <Text
        style={[
          styles.metricaValor,
          { color: colores.texto, fontSize: 22 * escalaTexto },
        ]}
      >
        {valor}
      </Text>
      <Text
        style={[
          styles.metricaEtiqueta,
          { color: colores.textoSecundario, fontSize: 11 * escalaTexto },
        ]}
      >
        {etiqueta}
      </Text>
    </View>
  );
}

export function CuadriculaMetricas({ children }: { children: ReactNode }) {
  return <View style={styles.cuadricula}>{children}</View>;
}

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { colores, escalaTexto } = useAccessibility();
  return (
    <View style={styles.seccion}>
      <Text
        style={[
          styles.seccionTitulo,
          { color: colores.texto, fontSize: 17 * escalaTexto },
        ]}
      >
        {titulo}
      </Text>
      {children}
    </View>
  );
}

type TarjetaProps = {
  children: ReactNode;
  accessibilityLabel?: string;
};

export function Tarjeta({ children, accessibilityLabel }: TarjetaProps) {
  const { colores } = useAccessibility();
  return (
    <View
      style={[
        styles.tarjeta,
        { backgroundColor: colores.tarjeta, borderColor: colores.borde },
      ]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );
}

export function TextoPrincipal({ children }: { children: ReactNode }) {
  const { colores, escalaTexto } = useAccessibility();
  return (
    <Text
      style={[
        styles.textoPrincipal,
        { color: colores.texto, fontSize: 14 * escalaTexto },
      ]}
    >
      {children}
    </Text>
  );
}

export function TextoSecundario({ children }: { children: ReactNode }) {
  const { colores, escalaTexto } = useAccessibility();
  return (
    <Text
      style={[
        styles.textoSecundario,
        { color: colores.textoSecundario, fontSize: 11 * escalaTexto },
      ]}
    >
      {children}
    </Text>
  );
}

export function BarraProgreso({
  valor,
  etiqueta,
}: {
  valor: number;
  etiqueta?: string;
}) {
  const { colores, escalaTexto } = useAccessibility();
  const porcentaje = Math.max(0, Math.min(100, Number(valor || 0)));

  return (
    <View style={styles.barraBloque} accessible accessibilityLabel={`${etiqueta || 'Progreso'}: ${porcentaje}%`}>
      {etiqueta ? (
        <View style={styles.barraEncabezado}>
          <Text
            style={{ color: colores.texto, fontSize: 12 * escalaTexto }}
          >
            {etiqueta}
          </Text>
          <Text
            style={{
              color: colores.primario,
              fontSize: 12 * escalaTexto,
              fontWeight: '700',
            }}
          >
            {porcentaje}%
          </Text>
        </View>
      ) : null}
      <View style={[styles.barraFondo, { backgroundColor: colores.borde }]}> 
        <View
          style={[
            styles.barraRelleno,
            { backgroundColor: colores.primario, width: `${porcentaje}%` },
          ]}
        />
      </View>
    </View>
  );
}

export function SinDatos({ texto = 'No hay datos registrados.' }: { texto?: string }) {
  const { colores, escalaTexto } = useAccessibility();
  return (
    <View style={styles.sinDatos}>
      <Ionicons name="folder-open-outline" size={32} color={colores.textoSecundario} />
      <Text
        style={{
          color: colores.textoSecundario,
          fontSize: 12 * escalaTexto,
          textAlign: 'center',
          marginTop: 7,
        }}
      >
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  botonHeader: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCentro: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitulo: { fontWeight: '800', textAlign: 'center' },
  headerRol: { marginTop: 2, fontWeight: '500' },
  contenido: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 110 },
  descripcion: { lineHeight: 19, marginBottom: 18 },
  estado: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  estadoTarjeta: { borderWidth: 1, borderRadius: 16 },
  estadoTexto: { marginTop: 12, textAlign: 'center' },
  errorTexto: { marginTop: 10, lineHeight: 19, textAlign: 'center' },
  reintentar: { marginTop: 16, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12 },
  reintentarTexto: { color: '#FFFFFF', fontWeight: '800' },
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metrica: {
    width: '48%',
    minHeight: 135,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  metricaIcono: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metricaValor: { marginTop: 9, fontWeight: '800' },
  metricaEtiqueta: { marginTop: 3, lineHeight: 15 },
  seccion: { marginTop: 24 },
  seccionTitulo: { marginBottom: 11, fontWeight: '800' },
  tarjeta: { borderWidth: 1, borderRadius: 15, padding: 14, marginBottom: 10 },
  textoPrincipal: { fontWeight: '700', lineHeight: 20 },
  textoSecundario: { marginTop: 4, lineHeight: 17 },
  barraBloque: { marginTop: 10 },
  barraEncabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  barraFondo: { height: 9, borderRadius: 6, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 6 },
  sinDatos: { paddingVertical: 30, alignItems: 'center', justifyContent: 'center' },
});
