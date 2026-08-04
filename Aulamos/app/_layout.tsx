import { Stack } from "expo-router";

import { AccessibilityProvider } from "../contexts/AccessibilityContext";

export default function RootLayout() {
  return (
    <AccessibilityProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />

        <Stack.Screen name="crear-cuenta" />
        <Stack.Screen name="crear-cuenta-alumno" />
        <Stack.Screen name="crear-cuenta-docente" />

        <Stack.Screen name="recuperar-password" />
        <Stack.Screen name="restablecer-password" />

        <Stack.Screen name="inicio-alumno" />
        <Stack.Screen name="inicio-docente" />
        <Stack.Screen name="inicio-admin" />
        <Stack.Screen name="admin-ciclos" />
        <Stack.Screen name="admin-periodos" />
        <Stack.Screen name="admin-materias" />
        <Stack.Screen name="admin-grupos" />
        <Stack.Screen name="admin-cursos" />
        <Stack.Screen name="admin-inscripciones" />
        <Stack.Screen name="crear-recurso" />
        <Stack.Screen name="crear-actividad" />
        <Stack.Screen name="mis-actividades-alumno" />
        <Stack.Screen name="detalle-actividad" />
        <Stack.Screen name="calificar-entrega" />
        <Stack.Screen name="visor-documento" />

        <Stack.Screen name="bibloteca-alumno" />
        <Stack.Screen name="reproductor-video" />

        <Stack.Screen name="accesibilidad" />
        <Stack.Screen name="mis-avances" />
        <Stack.Screen name="reportes" />
        <Stack.Screen name="reporte-rendimiento-actividad" />
        <Stack.Screen name="reporte-rendimiento-evaluacion" />
        <Stack.Screen name="reporte-asistencia" />
      </Stack>
    </AccessibilityProvider>
  );
}
