module.exports = {
  "expo": {
    "name": "Spediak",
    "slug": "Spediak",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro",
      "output": "static"
    },
    "extra": {
      "clerkPublishableKey": "pk_test_cHJldHR5LWNyYXdkYWQtMTAuY2xlcmsuYWNjb3VudHMuZGV2JA",
      "apiUrl": process.env.EXPO_PUBLIC_API_URL,
      "eas": {
        "projectId": "733c67f6-d35b-434e-bd51-1b9e723e2135"
    }
    },
    "plugins": [
      "expo-router",
      [
        "expo-font",
        {
          "fonts": ["./assets/fonts/SpaceMono-Regular.ttf"]
        }
      ]
    ],
    "scheme": "spediak"
  }
};
