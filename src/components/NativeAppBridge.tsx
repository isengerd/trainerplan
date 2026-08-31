"use client";

import { useEffect } from "react";

export function NativeAppBridge() {
  useEffect(() => {
    let removeBackListener: (() => Promise<void>) | undefined;

    async function configureNativeShell() {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      document.documentElement.classList.add("native-app", `native-${Capacitor.getPlatform()}`);

      const [{ App }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/splash-screen"),
        import("@capacitor/status-bar"),
      ]);

      await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
      await StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
      await SplashScreen.hide().catch(() => undefined);

      const listener = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else void App.minimizeApp();
      });
      removeBackListener = () => listener.remove();
    }

    void configureNativeShell();
    return () => { void removeBackListener?.(); };
  }, []);

  return null;
}
