import { Platform } from 'react-native';

// Define Base URL based on Platform
// export const BASE_URL = Platform.select({...}); // << OLD CODE REMOVED

export const BASE_URL = Platform.select({
  web: 'http://localhost:5000',
  ios: 'http://172.20.5.8:5000',
  android: 'http://172.20.5.8:5000',
});

// Optional: Add a fallback or error if platform is not recognized
if (!BASE_URL) {
    console.error("Unsupported platform detected for API BASE_URL configuration.");
    // Optionally throw an error or set a default URL
    // throw new Error("Unsupported platform for API configuration");
} 