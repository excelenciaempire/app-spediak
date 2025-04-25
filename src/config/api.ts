import { Platform } from 'react-native';

// Define Base URL based on Platform
export const BASE_URL = Platform.select({
    ios: 'http://localhost:5000',       // Use localhost for iOS simulator/local dev
    android: 'http://10.0.2.2:5000',    // Use special alias for Android emulator
    web: 'http://localhost:5000',       // Use localhost for web development
});

// Optional: Add a fallback or error if platform is not recognized
if (!BASE_URL) {
    console.error("Unsupported platform detected for API BASE_URL configuration.");
    // Optionally throw an error or set a default URL
    // throw new Error("Unsupported platform for API configuration");
} 