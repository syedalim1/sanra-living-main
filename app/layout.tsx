import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { company } from "@/lib/company";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const HOME_TITLE =
  "SANRA LIVING | Factory-Direct MS & SS Steel Furniture in SIDCO Coimbatore";
const HOME_DESCRIPTION =
  "Buy heavy-duty MS and Stainless Steel chairs, granite & wood top tables, and dining sets direct from Indian Make Steel Industries, SIDCO Coimbatore. GST invoice, 3-Yr warranty & Pan-India delivery.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  keywords: [
    "MS steel furniture Coimbatore",
    "SS steel furniture Tamil Nadu",
    "steel chairs Coimbatore",
    "steel dining tables",
    "granite top dining tables",
    "steel dining sets",
    "SIDCO Coimbatore furniture factory",
    "factory direct furniture India",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "SANRA LIVING factory-direct MS and SS steel furniture in SIDCO Coimbatore, Tamil Nadu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ["/og-default.png"],
  },
  verification: {
    google: "9X-EZn2twMUIDo4eh8IfxZRUuoNWBRmSPXvQWHP9MGI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-[#111111]">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingWhatsApp whatsappNumber={company.whatsappNumber} />
      </body>
    </html>
  );
}
