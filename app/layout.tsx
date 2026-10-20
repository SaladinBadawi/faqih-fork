import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations";
import type { Metadata, Viewport } from "next";
import { Amiri_Quran, Noto_Naskh_Arabic, Nunito } from "next/font/google";

import { LocaleProvider } from "@/components/locale-provider";
import { ModeProvider } from "@/components/mode-provider";
import { ExitModal } from "@/components/modals/exit-modal";
import { HeartsModal } from "@/components/modals/hearts-modal";
import { PracticeModal } from "@/components/modals/practice-modal";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME, features, siteConfig } from "@/config";
import { dir, messages } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getMode } from "@/lib/preferences";
import { cn } from "@/lib/utils";

import "./globals.css";

const font = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

// Quranic text (Uthmani-style) and general Arabic text.
const quranFont = Amiri_Quran({
  subsets: ["arabic"],
  weight: "400",
  variable: "--font-quran",
});
const arabicFont = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
});

export const viewport: Viewport = {
  themeColor: "#22C55E",
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = messages[await getLocale()];
  return {
    ...siteConfig,
    title: `${APP_NAME}: ${t.app.tagline}`,
    description: t.app.hero,
  };
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, mode] = await Promise.all([getLocale(), getMode()]);

  const app = (
    <html lang={locale} dir={dir(locale)}>
      <body
        className={cn(
          // Nunito's fallback font has Arabic glyphs, so Arabic needs its own stack.
          locale === "ar" ? "font-arabic" : "font-sans",
          font.variable,
          quranFont.variable,
          arabicFont.variable
        )}
      >
        <LocaleProvider locale={locale}>
          <ModeProvider mode={mode}>
            <Toaster theme="light" richColors closeButton />
            <ExitModal />
            <HeartsModal />
            <PracticeModal />
            {children}
          </ModeProvider>
        </LocaleProvider>
      </body>
    </html>
  );

  // Local dev login (NEXT_PUBLIC_DEV_AUTH=local) runs without Clerk.
  if (features.localAuth) return app;

  return (
    <ClerkProvider
      // Clerk's sign-in and sign-up screens follow the app language.
      localization={locale === "ar" ? arSA : undefined}
      appearance={{
        layout: {
          logoImageUrl: "/favicon.ico",
        },
        variables: {
          colorPrimary: "#22C55E",
        },
      }}
      afterSignOutUrl="/"
    >
      {app}
    </ClerkProvider>
  );
}
