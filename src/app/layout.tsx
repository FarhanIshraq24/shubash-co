import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#FFFCED",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Shubash & Co. — Authentic Perfume Decants & Full Bottles | সুবাস & Co.",
    template: "%s | Shubash & Co.",
  },
  description:
    "Explore 100% authentic perfume decants and full bottles in Bangladesh. Smell good everyday with Shubash & Co. (সুবাস & Co.).",
  keywords: [
    "perfume decants bangladesh",
    "authentic perfumes bd",
    "shubash & co",
    "সুবাস & co",
    "perfume decants dhaka",
    "fragrances bangladesh",
  ],
  authors: [{ name: "Shubash & Co." }],
  openGraph: {
    type: "website",
    locale: "en_BD",
    url: "/",
    siteName: "Shubash & Co. — সুবাস & Co.",
    title: "Shubash & Co. — Authentic Perfume Decants & Full Bottles",
    description: "Your next favourite scent starts here. Explore perfumes in decant sizes and full bottles.",
    images: [
      {
        url: "/images/logo-bengali.png",
        width: 502,
        height: 252,
        alt: "Shubash & Co. — সুবাস & Co.",
      },
    ],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${notoBengali.variable}`}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased font-sans selection:bg-[var(--primary)] selection:text-[var(--primary-foreground)]">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
