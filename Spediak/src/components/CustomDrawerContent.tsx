import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { LogOut, UserCircle } from 'lucide-react-native';
import { COLORS } from '../styles/colors';

const CustomDrawerContent = (props: any) => {
  const { isLoaded, user } = useUser();
  const { signOut } = useAuth();

  // Extract state from metadata if available
  const userState = user?.publicMetadata?.state as string || 'N/A';

  const handleLogout = async () => {
    try {
      await signOut();
      // No need to explicitly navigate here, the root layout (_layout.tsx)
      // will detect the signOut and render the AuthNavigator.
    } catch (error) {
      console.error("Error signing out: ", error);
      // Optionally show an alert to the user
    }
  };

  if (!isLoaded || !user) {
    // Show a loading state or minimal content while user data loads
    return (
      <SafeAreaView style={styles.safeAreaLoading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollViewContent}>
        {/* User Info Section */}
        <View style={styles.userInfoSection}>
          {user.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
                 <UserCircle size={60} color={COLORS.primary} />
            </View>
          )}
          <Text style={styles.userName}>{user.fullName || 'User Name'}</Text>
          <Text style={styles.userEmail}>{user.primaryEmailAddress?.emailAddress}</Text>
          <Text style={styles.userState}>State: {userState}</Text>
        </View>

        {/* Navigation Items - Render all items passed from layout */}
        <DrawerItemList {...props} /> 

      </DrawerContentScrollView>

      {/* Logout Button Section */}
      <View style={styles.logoutSection}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
   safeAreaLoading: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
   },
  scrollViewContent: {
    paddingTop: 0, // Remove default padding if needed
  },
  userInfoSection: {
    paddingLeft: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'flex-start',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 4,
  },
   userState: {
     fontSize: 13,
     color: 'gray',
     fontStyle: 'italic',
   },
  logoutSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.danger,
  },
});

export default CustomDrawerContent; 