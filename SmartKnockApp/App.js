/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useState } from 'react';
import type { Node } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from 'react-native-elements';
import { withTheme } from 'react-native-elements';

import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Button
} from 'react-native';

import BLEScan from './components/BLEScan.js';
import BLEConnect from './components/BLEConnect.js';
import Home from './components/Home.js';
import LockDetails from './components/LockDetails.js';
import AddLock from './components/AddLock.js';


const Colors = {
  light: {
    primary: '#00f',
    secondary: '#fff',
  },
  dark: {
    primary: '#fff',
    secondary: '#000',
  },
};

const Stack = createNativeStackNavigator();

const App: () => Node = () => {
  const isDarkMode = useColorScheme() === 'dark';
  isDarkMode ? console.log('Dark Mode') : console.log('Light Mode');

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const [count, setCount] = useState(0);

  
  return (
    <NavigationContainer>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Stack.Navigator>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="LockDetails" component={LockDetails} title="hi" />
        <Stack.Screen name="AddLock" component={AddLock} />
      </Stack.Navigator>
      <ThemeProvider useDark={isDarkMode}></ThemeProvider>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default withTheme(App);
