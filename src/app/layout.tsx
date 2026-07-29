import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Toaster from "@/components/Toaster";
import { themeInitScript } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Creator Studio",
  description:
    "Rencanakan, jadwalkan, dan ukur performa konten kamu dalam satu tempat.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Creator Studio", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
      </body>
    </html>
  );
}
