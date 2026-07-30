import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import ReaderScreen from './src/screens/ReaderScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#202124',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShadowVisible: false, // removes the border below the header
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Reader" 
          component={ReaderScreen}
          options={{ title: 'Reader' }} // The title gets dynamically updated in ReaderScreen
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
