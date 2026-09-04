import "dotenv/config";
import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim() || process.env.PUBLIC_APP_URL?.trim();

const config: CapacitorConfig = {
  appId: "de.trainerplan.app",
  appName: "NextSession Kids!",
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
    contentInset: "automatic",
    scrollEnabled: true,
  },
  android: {
    backgroundColor: "#0a1f0f",
    allowMixedContent: false,
  },
  plugins: {
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
