import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { withLayoutContext } from 'expo-router';
import CustomDrawerContent from '../../src/components/CustomDrawerContent';
import { useAuth } from '@clerk/clerk-expo';

// Import screen components (adjust paths if necessary)
import InspectionHistoryScreen from '../../src/screens/InspectionHistoryScreen';
import ProfileSettingsScreen from '../../src/screens/ProfileSettingsScreen';
import AdminDashboardScreen from '../../src/screens/AdminDashboardScreen';

const { Navigator } = createDrawerNavigator();
const Drawer = withLayoutContext(Navigator);

export default function DrawerLayout() {
  const { sessionClaims } = useAuth();
  const isAdmin = sessionClaims?.user_role === 'admin';

  return (
    <Drawer 
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{ 
         headerShown: true,
         drawerActiveTintColor: '#0D47A1',
         drawerInactiveTintColor: 'gray',
      }}
    >
      <Drawer.Screen 
        name="tabs"
        options={{
          drawerLabel: 'New Inspection',
          title: 'Spediak Inspections',
        }} 
      /> 
      <Drawer.Screen 
        name="history"
        options={{ 
          drawerLabel: 'Inspection History', 
          title: 'Inspection History' 
        }}
      />
      <Drawer.Screen 
        name="profile"
        options={{ 
          drawerLabel: 'Profile', 
          title: 'Profile Settings' 
        }}
      />
    </Drawer>
  );
} 