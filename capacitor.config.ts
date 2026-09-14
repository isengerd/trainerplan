import "dotenv/config";
import type { CapacitorConfig } from "@capacitor/cli";

import { mobileEnvironment } from "./src/lib/mobile-environment";

const mobile = mobileEnvironment();
const serverUrl = mobile.serverUrl;

const config: CapacitorConfig = {
  appId: mobile.appId,
  appName: mobile.appName,
  appendUserAgent: "TrainerplanNative/1.0",
  webDir: ".capacitor-web",
  ...(serverUrl ? {
    server: {
      url: serverUrl,
      cleartext: serverUrl.startsWith("http://"),
    },
  } : {}),
  backgroundColor: "#0a1f0f",
  ios: {
    path: mobile.iosPath,
    contentInset: "never",
    scrollEnabled: true,
  },
  android: {
    path: mobile.androidPath,
    backgroundColor: "#0a1f0f",
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 500,
      backgroundColor: "#0a1f0f",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0a1f0f",
      overlaysWebView: true,
    },
  },
};

export default config;
