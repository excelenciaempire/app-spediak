import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import AuthNavigator from "./src/navigation/AuthNavigator"; // Revert path
import RootNavigator from "./src/navigation/RootNavigator"; // Import RootNavigator

const clerkPublishableKey = Constants.expoConfig?.extra?.clerkPublishableKey;

if (!clerkPublishableKey) {
  throw new Error("Missing Clerk Publishable Key. Please check your app.config.js and .env file.");
}

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


export default function App() {
  return (
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={clerkPublishableKey}
    >
      <SignedIn>
        {/* Replace with RootNavigator later */}
        {/* <View style={styles.container}>
          <Text>Signed In Area (Replace with Main App Navigator)</Text>
          <StatusBar style="auto" />
        </View> */}
        <RootNavigator /> {/* Render RootNavigator */}
      </SignedIn>
      <SignedOut>
         <AuthNavigator />
      </SignedOut>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  // container: {
  //   flex: 1,
  //   backgroundColor: '#fff',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },
});
