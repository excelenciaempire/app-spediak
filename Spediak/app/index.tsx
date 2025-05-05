import React from 'react';
import { View } from 'react-native';

// This root route renders nothing.
// The root layout (_layout.tsx) handles auth state checking
// and redirects either to the sign-in screen or the main app (/tabs).
export default function RootIndex() {
  return null; // Or <View />; Let the layout handle the initial render/redirect.
}
