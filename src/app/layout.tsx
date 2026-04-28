import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { ViewModeProvider } from "@/context/ViewModeContext";
import { PwaRegister } from "@/components/PwaRegister";

const inter = Inter({ subsets: ["latin"] });
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "人生学び場 こころ道場",
  description: "AI×セルフマネジメント×伴走コーチングで、「なりたい自分」へ確実に歩むための場",
  appleWebApp: {
    capable: true,
    title: "こころ道場",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} ${notoSansJP.variable}`}>
        <PwaRegister />
        <AuthProvider>
          <SubscriptionProvider>
            <ViewModeProvider>
              {children}
            </ViewModeProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
