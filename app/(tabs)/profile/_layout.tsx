import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerBackTitle: 'Назад',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Профиль' }} />
    </Stack>
  );
}
