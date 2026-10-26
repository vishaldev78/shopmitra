import type { Metadata, Viewport } from "next";
import { Inter, Dancing_Script, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/store/AppContext";
import { Layout } from "@/components/shop/Layout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ShopMitra — Your Shopping Friend",
    template: "%s | ShopMitra",
  },
  description:
    "ShopMitra — Your trusted shopping friend. Premium products at best prices with secure Dodo Payments, free shipping above ₹999 and easy 30-day returns.",
  keywords: ["ShopMitra", "online shopping", "ecommerce", "electronics", "fashion", "India", "Dodo Payments"],
  authors: [{ name: "ShopMitra" }],
  openGraph: {
    title: "ShopMitra — Your Shopping Friend",
    description: "Premium products at unbeatable prices with secure payments and fast delivery across India.",
    siteName: "ShopMitra",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopMitra — Your Shopping Friend",
    description: "Premium products at unbeatable prices with secure payments and fast delivery across India.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${dancingScript.variable} ${playfair.variable} antialiased bg-white text-navy-900`}
      >
        <AppProvider>
          <Layout>{children}</Layout>
        </AppProvider>
      </body>
    </html>
  );
}
