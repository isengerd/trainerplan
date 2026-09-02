"use client";

import { useEffect } from "react";

export function NativeAppBridge() {
  useEffect(() => {
    let removeBackListener: (() => Promise<void>) | undefined;
    const pushCleanups: Array<() => Promise<void>> = [];

    async function savePushToken(token: string, platform: string) {
      try {
        window.localStorage.setItem("trainerplan-push-token", token);
        const response = await fetch("/api/v1/push-tokens", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, platform }) });
        if (response.ok) window.dispatchEvent(new CustomEvent("trainerplan:push-registered"));
      } catch { /* Beim nächsten App-Start wird das Token erneut übertragen. */ }
    }

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

      const auth = await fetch("/api/v1/auth/me", { credentials: "include" }).catch(() => null);
      if (!auth?.ok) return;
      const { PushNotifications } = await import("@capacitor/push-notifications");
      if (platform === "android") await PushNotifications.createChannel({ id: "trainerplan-termine", name: "Termine und Erinnerungen", description: "Neue und geänderte Mannschaftstermine", importance: 4, visibility: 1, vibration: true }).catch(() => undefined);
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === "prompt") permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;
      const registration = await PushNotifications.addListener("registration", ({ value }) => void savePushToken(value, platform));
      const registrationError = await PushNotifications.addListener("registrationError", () => undefined);
      const action = await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        const route = typeof notification.data?.route === "string" ? notification.data.route : "/app";
        window.location.assign(route.startsWith("/") ? route : "/app");
      });
      pushCleanups.push(() => registration.remove(), () => registrationError.remove(), () => action.remove());
      await PushNotifications.register();
    }

    void configureNativeShell();
    return () => { void removeBackListener?.(); pushCleanups.forEach((cleanup) => void cleanup()); };
  }, []);

  return null;
}
