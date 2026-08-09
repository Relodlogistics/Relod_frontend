import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { RegistrationProvider } from "@/lib/registration-context";
import { SessionProvider } from "@/lib/session-context";
import { AdminSessionProvider } from "@/lib/admin-session-context";
import { GlobalTopBar } from "@/components/GlobalTopBar";
import { SITE_URL } from "@/lib/site";
import { getServerLocale } from "@/lib/server-i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ReLod — Post a Load, Match a Truck, Track Every Mile",
    template: "%s | ReLod",
  },
  description:
    "ReLod is India's direct load-truck marketplace — ranked carrier matching, one-tap WhatsApp outreach, and live GPS tracking from pickup to delivery.",
  keywords: [
    "load board India",
    "truck booking",
    "freight marketplace India",
    "GPS truck tracking",
    "shipper carrier matching",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <I18nProvider>
          <SessionProvider>
            <AdminSessionProvider>
              <RegistrationProvider>
                <GlobalTopBar />
                {children}
              </RegistrationProvider>
            </AdminSessionProvider>
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
