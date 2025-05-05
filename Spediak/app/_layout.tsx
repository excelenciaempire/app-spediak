import React, { useEffect } from 'react';
import { ClerkProvider, SignedIn, SignedOut, useAuth } from "@clerk/clerk-expo";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, View } from 'react-native';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Token cache for Clerk
const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

// Initial layout: Handles auth redirection
const InitialLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    // Check if the current route segment is within the 'tabs' group
    // Note: Expo Router normalizes segment names, removing parentheses
    const inTabsGroup = segments[0] === "tabs";

    if (isSignedIn && !inTabsGroup) {
      // Redirect authenticated users to the default screen of the tabs group
      router.replace("/tabs"); // <-- Corrected path
    } else if (!isSignedIn && inTabsGroup) {
      // Redirect unauthenticated users away from tabs
      router.replace("/");
    }
  }, [isSignedIn, isLoaded, segments, router]);

  // Show loading indicator while Clerk is loading
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Render the currently matched route
  return <Slot />;
};

// Root layout component
const RootLayout = () => {
  return (
    <ClerkProvider 
      tokenCache={tokenCache} 
      publishableKey={CLERK_PUBLISHABLE_KEY!}
    >
      <InitialLayout />
    </ClerkProvider>
  );
}

export default RootLayout; 