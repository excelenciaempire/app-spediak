import React, { useEffect } from 'react';
import { ClerkProvider, SignedIn, SignedOut, useAuth } from "@clerk/clerk-expo";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, View } from 'react-native';
import Constants from 'expo-constants';
import AuthNavigator from '../src/navigation/AuthNavigator';

// Read key from app.config.js extra section
const CLERK_PUBLISHABLE_KEY = Constants.expoConfig?.extra?.clerkPublishableKey;

// Check if the key was loaded
if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key. Check app.config.js extra section.');
}

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
    console.log("[Layout] Checking auth state:", { isLoaded, isSignedIn, segments });
    if (!isLoaded) return;

    const inTabsGroup = segments[0] === "(tabs)";
    console.log("[Layout] In tabs group?", inTabsGroup);

    // If the user is signed in and the initial segment is not /drawer, redirect to drawer
    if (isSignedIn && segments[0] !== 'drawer') { // Check if not already in drawer group
      console.log("[Layout] User signed in, NOT in drawer. Redirecting to /drawer...");
      router.replace("/drawer"); // Redirect to the drawer group
    }
    // Removed the !isSignedIn && inTabsGroup check as InitialLayout now handles rendering AuthNav
    else {
      console.log("[Layout] No redirect needed based on useEffect.");
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

  if (isSignedIn) {
    console.log("[Layout] Rendering Slot (Authenticated)");
    return <Slot />;
  } else {
    console.log("[Layout] Rendering AuthNavigator (Unauthenticated)");
    return <AuthNavigator />;
  }
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