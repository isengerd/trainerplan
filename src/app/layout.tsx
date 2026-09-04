import type { Metadata, Viewport } from "next";
import { NativeAppBridge } from "@/components/NativeAppBridge";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NextSession Kids!",
    template: "%s | NextSession Kids!",
  },
  applicationName: "NextSession Kids!",
  description: "Training, Termine und Mannschaftsorganisation für den Kinderfußball",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1f0f" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `if(navigator.userAgent.includes("TrainerplanNative/")){document.documentElement.classList.add("native-app",/iPhone|iPad|iPod/.test(navigator.userAgent)?"native-ios":"native-android")}` }} />
      </head>
      <body><NativeAppBridge />{children}</body>
    </html>
  );
}
