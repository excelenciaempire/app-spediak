import React from 'react';
import { useAuth } from "@clerk/clerk-expo";
import { ActivityIndicator, View } from 'react-native';

// This component might not be strictly necessary anymore if app/_layout handles the main navigation logic and auth.
// Expo Router will automatically render the correct screen based on the URL/route.

// We might just need a simple component that checks auth state if needed
// outside the main layout, or this file could potentially be removed if
// app/_layout handles everything.

const RootNavigator: React.FC = () => {
  const { isLoaded, isSignedIn } = useAuth();

  // Still useful to show a loading indicator while Clerk initializes
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If app/_layout handles redirection and rendering the Slot,
  // this component might just render null or be removed entirely.
  // For now, let's return null, assuming app/_layout takes over.
  return null;

  // --- Original Logic (Likely redundant with Expo Router) ---
  /*
  return (
      <NavigationContainer independent={true}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
              {isSignedIn ? (
                  // Screens for logged-in users
                  <Stack.Group>
                      <Stack.Screen name="MainTabs" component={IndexScreen} options={{ title: 'Home' }} />
                  </Stack.Group>
              ) : (
                  // Screens for logged-out users (AuthNavigator)
                  <Stack.Group>
                      <Stack.Screen name="Auth" component={AuthNavigator} />
                  </Stack.Group>
              )}
          </Stack.Navigator>
      </NavigationContainer>
  );
  */
  // --- End Original Logic ---
};

export default RootNavigator; 