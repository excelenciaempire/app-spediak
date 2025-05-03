import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, History, User, ShieldCheck /* Or appropriate icons */ } from 'lucide-react-native';
import { COLORS } from '../../src/styles/colors'; // Adjust path if needed
import { useAuth } from '@clerk/clerk-expo';

// Define the type for the route prop in screenOptions
interface TabScreenOptionsProps {
  route: { name: string };
}

export default function TabLayout() {
  const { userId, sessionClaims } = useAuth(); // Get sessionClaims

  // Check admin role from session claims
  const isAdmin = sessionClaims?.user_role === 'admin'; 

  return (
    <Tabs
      screenOptions={({ route }: TabScreenOptionsProps) => ({
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false, // Assuming you have headers within each screen or a different layout strategy
        tabBarStyle: {
          // Add any common tab bar styles
          paddingBottom: Platform.OS === 'ios' ? 10 : 5, 
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 70 : 60,
        },
        tabBarLabelStyle: {
            fontSize: 11, 
            marginBottom: Platform.OS === 'ios' ? -5 : 5,
        },
        // Dynamically show/hide Admin Dashboard tab
        tabBarButton: (
          (route.name === 'adminDashboard' && !isAdmin) ? 
          () => null : // Render nothing if not admin
          undefined // Use default button otherwise
        ),
      })}
    >
      <Tabs.Screen
        name="index" // Corresponds to index.tsx (previously newInspection.tsx)
        options={{
          title: 'New Inspection',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="inspectionHistory"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <History color={color} size={size} />,
        }}
      />
       <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <User color={color} size={size} />,
        }}
      />
       {/* Conditionally render Admin tab - ensure file exists at adminDashboard.tsx */}
      {isAdmin && (
          <Tabs.Screen
            name="adminDashboard"
            options={{
              title: 'Admin',
              tabBarIcon: ({ color, size }: { color: string; size: number }) => <ShieldCheck color={color} size={size} />,
            }}
          />
      )}
    </Tabs>
  );
} 