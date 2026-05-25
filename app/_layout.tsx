import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PPEditorialNew: require('../assets/fonts/PPEditorialNew-Regular.otf'),
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#fff' }} />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#1a1a1a',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'My Recipes' }} />
        <Stack.Screen name="add" options={{ headerShown: false }} />
        <Stack.Screen name="processing" options={{ title: 'Extracting Recipe', headerBackVisible: false }} />
        <Stack.Screen name="recipe/[id]/index" options={{ title: 'Recipe' }} />
        <Stack.Screen name="recipe/[id]/edit" options={{ title: 'Edit Recipe' }} />
      </Stack>
    </>
  );
}
