import React from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/colors';

// Import Screens
import NewInspectionScreen from '../../app/(tabs)/newInspection';
import InspectionHistoryScreen from '../screens/InspectionHistoryScreen';
import ProfileSettingsScreen from '../screens/ProfileSettingsScreen';

// Define Drawer Param List
export type RootDrawerParamList = {
  NewInspection: undefined;
  InspectionHistory: undefined;
  ProfileSettings: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

// Custom Drawer Content Component (Step 18)
const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { signOut } = useAuth();
  const { user, isLoaded } = useUser();

  // Retrieve user state
  const userState = user?.unsafeMetadata?.inspectionState as string || 'North Carolina';

  if (!isLoaded) {
    // Render nothing while Clerk is loading user data
    return null;
  }

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={styles.drawerHeader}>
        <Image
          source={user?.imageUrl ? { uri: user.imageUrl } : require('../../assets/icon.png')} // Corrected path
          style={styles.profileImage}
        />
        <Text style={styles.userName}>{user?.fullName || 'User Name'}</Text>
        <Text style={styles.userEmail}>{user?.primaryEmailAddress?.emailAddress || 'Email Address'}</Text>
        <Text style={styles.userState}>{`State: ${userState}`}</Text>
      </View>

      <View style={styles.drawerListContainer}>
        <DrawerItemList {...props} />
      </View>

      {/* Logout Button */}
      <View style={styles.drawerFooter}>
        <DrawerItem
          label="Log Out"
          labelStyle={styles.logoutLabel}
          icon={({ color, size }: { color: string; size: number }) => (
            <Ionicons name="log-out-outline" color={COLORS.primary} size={size} />
          )}
          onPress={() => signOut()} // Call Clerk signout
          style={styles.logoutItem}
        />
      </View>
    </DrawerContentScrollView>
  );
};

// Root Navigator Setup
const RootNavigator: React.FC = () => {
  // Always render the Drawer Navigator now
  return (
    <Drawer.Navigator
        initialRouteName="NewInspection"
        drawerContent={(props: DrawerContentComponentProps) => <CustomDrawerContent {...props} />}
        screenOptions={{
            headerStyle: {
                backgroundColor: COLORS.primary,
            },
            headerTintColor: COLORS.white,
            headerTitleStyle: {
                fontWeight: 'bold',
            },
            drawerActiveTintColor: COLORS.primary,
            drawerInactiveTintColor: COLORS.darkText,
             drawerLabelStyle: {
                marginLeft: 0,
                fontSize: 16,
             }
        }}
        >
        <Drawer.Screen
            name="NewInspection"
            component={NewInspectionScreen}
            options={{
                title: 'New Inspection',
                drawerIcon: ({ color, size }: { color: string; size: number }) => (
                    <Ionicons name="add-circle-outline" color={color} size={size} />
                ),
            }}
        />
        <Drawer.Screen
            name="InspectionHistory"
            component={InspectionHistoryScreen}
            options={{
                title: 'Inspection History',
                drawerIcon: ({ color, size }: { color: string; size: number }) => (
                    <Ionicons name="time-outline" color={color} size={size} />
                ),
            }}
        />
        <Drawer.Screen
            name="ProfileSettings"
            component={ProfileSettingsScreen}
            options={{
                title: 'Profile',
                drawerIcon: ({ color, size }: { color: string; size: number }) => (
                    <Ionicons name="person-circle-outline" color={color} size={size} />
                ),
            }}
        />
    </Drawer.Navigator>
  );
};

// Styles for Custom Drawer
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    drawerHeader: {
        padding: 20,
        backgroundColor: COLORS.secondary, // Light background for header
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        alignItems: 'center',
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 10,
        backgroundColor: '#ccc', // Placeholder background
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.darkText,
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 14,
        color: COLORS.darkText,
        marginBottom: 4,
    },
    userState: {
        fontSize: 14,
        color: COLORS.darkText,
        fontStyle: 'italic',
    },
    drawerListContainer: {
       flex: 1, // Takes up remaining space
       paddingTop: 10,
    },
    drawerFooter: {
       borderTopWidth: 1,
       borderTopColor: '#ddd',
       paddingBottom: 10,
    },
    logoutItem: {
      // Add specific styles if needed, e.g., different background
    },
    logoutLabel: {
        fontWeight: 'bold',
        color: COLORS.primary,
        marginLeft: 0,
        fontSize: 16,
    },
});

export default RootNavigator; 