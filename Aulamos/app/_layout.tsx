import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="crear-cuenta" />
      <Stack.Screen name="crear-alumno" />
      <Stack.Screen name="crear-docente" />
    </Stack>
  );
}