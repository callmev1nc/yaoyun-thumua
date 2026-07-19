import { Inter, Geist_Mono, Noto_Sans_TC, Noto_Sans_SC } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const notoTC = Noto_Sans_TC({
  variable: "--font-cjk-tc",
  weight: ["400", "500", "700"],
  display: "swap",
});

const notoSC = Noto_Sans_SC({
  variable: "--font-cjk-sc",
  weight: ["400", "500", "700"],
  display: "swap",
});

export async function generateMetadata() {
  const t = await getTranslations("metadata");
  return { title: t("title"), description: t("description") };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      className={`${inter.variable} ${geistMono.variable} ${notoTC.variable} ${notoSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
