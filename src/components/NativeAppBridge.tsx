"use client";

import { useEffect } from "react";

export function NativeAppBridge() {
  useEffect(() => {
    let removeBackListener: (() => Promise<void>) | undefined;
    let removeUrlListener: (() => Promise<void>) | undefined;
    let disposed = false;
    let registering = false;
    let refreshPush = async () => {};
    const retryPush = () => { void refreshPush(); };
    window.addEventListener("trainerplan:auth-changed", retryPush);
    window.addEventListener("online", retryPush);
    const pushCleanups: Array<() => Promise<void>> = [];

    async function savePushToken(token: string, platform: string) {
      try {
        if (disposed) return;
        const previous = window.localStorage.getItem("trainerplan-push-token");
        const response = await fetch("/api/v1/push-tokens", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, platform }) });
        if (response.ok) {
          window.localStorage.setItem("trainerplan-push-token", token);
          if (previous && previous !== token) await fetch("/api/v1/push-tokens", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: previous }) }).catch(() => undefined);
          window.dispatchEvent(new CustomEvent("trainerplan:push-registered"));
        } else if (response.status !== 401) {
          window.dispatchEvent(new CustomEvent("trainerplan:push-error", { detail: "Das Gerät konnte nicht für Push gespeichert werden. Bitte öffne die App erneut." }));
        }
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

      const urlListener = await App.addListener("appUrlOpen", ({ url }) => {
        try {
          const incoming = new URL(url);
          if (incoming.protocol === "de.nextsession.kids:" && incoming.hostname === "login" && incoming.pathname === "/email-link") {
            window.location.assign(`/login/email-link${incoming.search}`);
          }
        } catch { /* Unbekannte oder fehlerhafte Deep Links werden ignoriert. */ }
      });
      removeUrlListener = () => urlListener.remove();

      const { PushNotifications } = await import("@capacitor/push-notifications");
      if (platform === "android") await PushNotifications.createChannel({ id: "trainerplan-termine", name: "Termine und Erinnerungen", description: "Neue und geänderte Mannschaftstermine", importance: 4, visibility: 1, vibration: true }).catch(() => undefined);
      const registration = await PushNotifications.addListener("registration", ({ value }) => void savePushToken(value, platform));
      const registrationError = await PushNotifications.addListener("registrationError", () => window.dispatchEvent(new CustomEvent("trainerplan:push-error", { detail: "Die Push-Registrierung ist fehlgeschlagen. Bitte prüfe die iPhone-App-Konfiguration." })));
      const action = await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        const route = typeof notification.data?.route === "string" ? notification.data.route : "/app";
        window.location.assign(route.startsWith("/") && !route.startsWith("//") ? route : "/app");
      });
      pushCleanups.push(() => registration.remove(), () => registrationError.remove(), () => action.remove());
      refreshPush = async () => {
        if (disposed || registering) return;
        registering = true;
        try {
          const auth = await fetch("/api/v1/auth/me", { credentials: "include", cache: "no-store" });
          if (disposed || !auth.ok) return;
          let permission = await PushNotifications.checkPermissions();
          if (permission.receive === "prompt") permission = await PushNotifications.requestPermissions();
          if (disposed || permission.receive !== "granted") return;
          await PushNotifications.register();
        } catch {
          window.dispatchEvent(new CustomEvent("trainerplan:push-error", { detail: "Push konnte nicht eingerichtet werden. Bitte prüfe die Verbindung und die Mitteilungserlaubnis." }));
        } finally { registering = false; }
      };
      const stateListener = await App.addListener("appStateChange", ({ isActive }) => { if (isActive) retryPush(); });
      pushCleanups.push(() => stateListener.remove());
      if (disposed) { await removeBackListener?.(); await removeUrlListener?.(); await Promise.all(pushCleanups.map((cleanup) => cleanup())); return; }
      await refreshPush();
    }

    void configureNativeShell().catch(() => window.dispatchEvent(new CustomEvent("trainerplan:push-error", { detail: "Die native App konnte Push nicht initialisieren." })));
    return () => { disposed = true; window.removeEventListener("trainerplan:auth-changed", retryPush); window.removeEventListener("online", retryPush); void removeBackListener?.(); void removeUrlListener?.(); pushCleanups.forEach((cleanup) => void cleanup()); };
  }, []);

  return null;
}
