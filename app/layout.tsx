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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SANRA LIVING | Indian Make Steel Industries • SIDCO Coimbatore",
    description:
      "Direct steel furniture factory in SIDCO Coimbatore, India. Heavy-duty MS and stainless steel tables, workstations, cafe furniture, and utility stands with SANRA Zero-Shake Telescopic Lock™.",
  keywords: [
    "steel furniture factory",
    "SIDCO Coimbatore furniture",
    "direct factory furniture",
    "commercial cafe tables",
    "industrial steel workstation",
    "stainless steel tables",
    "zero-shake telescopic lock",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "SANRA LIVING — direct factory steel furniture in SIDCO Coimbatore",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description:
      "Direct factory steel furniture for cafes, offices, hostels, hospitals and projects.",
    images: ["/og-default.png"],
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
