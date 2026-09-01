"use client";

import { useEffect } from "react";

export function NativeAppBridge() {
  useEffect(() => {
    let removeBackListener: (() => Promise<void>) | undefined;

    async function configureNativeShell() {
      const { Capacitor } = await import("@capacitor/core");
      const markedAsNative = navigator.userAgent.includes("TrainerplanNative/");
      if (!Capacitor.isNativePlatform() && !markedAsNative) return;

      const platform = Capacitor.isNativePlatform()
        ? Capacitor.getPlatform()
        : /iPhone|iPad|iPod/.test(navigator.userAgent) ? "ios" : "android";
      document.documentElement.classList.add("native-app", `native-${platform}`);

      if (!Capacitor.isNativePlatform()) return;

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
