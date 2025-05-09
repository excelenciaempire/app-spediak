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
    console.log("[Layout] Checking auth state:", { isLoaded, isSignedIn, segments });
    if (!isLoaded) return;

    const inTabsGroup = segments[0] === "tabs";
    console.log("[Layout] In tabs group?", inTabsGroup);

    if (isSignedIn && !inTabsGroup) {
      console.log("[Layout] User signed in, NOT in tabs. Redirecting to /tabs/index...");
      // Explicitly redirect to the index route file
      router.replace("/tabs/index");
    } else if (!isSignedIn && inTabsGroup) {
      console.log("[Layout] User NOT signed in, IS in tabs. Redirecting to /...");
      // Redirect unauthenticated users away from tabs
      router.replace("/");
    } else {
      console.log("[Layout] No redirect needed.");
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

  console.log("[Layout] Rendering Slot");
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