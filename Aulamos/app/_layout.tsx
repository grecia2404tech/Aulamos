import { Stack } from 'expo-router';

import { AccessibilityProvider } from '../contexts/AccessibilityContext';

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
        <Stack.Screen name="crear-recurso"/>

        <Stack.Screen name="accesibilidad" />
      </Stack>
    </AccessibilityProvider>
  );
}