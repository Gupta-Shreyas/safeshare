import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Toaster from "@/components/Toaster";

export const metadata: Metadata = {
  title: {
    default: "SafeShare | Building trust when it matters most",
    template: "%s | SafeShare",
  },
  description:
    "SafeShare is a blockchain-based community emergency resource network. Share generators, pumps and first-aid kits with verified neighbours. Trust in every transaction, help in every crisis.",
  applicationName: "SafeShare",
  openGraph: {
    title: "SafeShare",
    description: "Building trust when it matters most.",
    type: "website",
  },
  appleWebApp: { capable: true, title: "SafeShare", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#003049",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}