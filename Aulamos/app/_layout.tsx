import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="crear-cuenta" />
      <Stack.Screen name="crear-cuenta-alumno" />
      <Stack.Screen name="crear-cuenta-docente" />
      <Stack.Screen name="inicio-alumno" />
      <Stack.Screen name="inicio-docente" />
    </Stack>
  );
}