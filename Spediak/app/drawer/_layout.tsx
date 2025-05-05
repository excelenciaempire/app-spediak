import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { withLayoutContext } from 'expo-router';

const { Navigator } = createDrawerNavigator();
const Drawer = withLayoutContext(Navigator);

export default function DrawerLayout() {
  // TODO: Add screens for History, Profile etc.
  // TODO: Add custom drawer content component if needed

  return (
    <Drawer screenOptions={{ headerShown: false /* Or true based on design */ }}>
      {/* The primary screen will be the nested Tabs navigator */}
      <Drawer.Screen 
        name="tabs" // This name MUST match the directory name inside drawer
        options={{
          drawerLabel: 'Home / Inspections', 
          title: 'Spediak', // Header title if shown
        }} 
      /> 
      {/* Add other drawer screens here, linking to files */}
      {/* Example: assumes app/drawer/profile.tsx exists */}
      {/* <Drawer.Screen 
        name="profile" 
        options={{ drawerLabel: 'Profile', title: 'Profile' }}
      /> */}
      {/* Example: assumes app/drawer/history.tsx exists */}
      {/* <Drawer.Screen 
        name="history" 
        options={{ drawerLabel: 'History', title: 'History' }}
      /> */}
    </Drawer>
  );
} 