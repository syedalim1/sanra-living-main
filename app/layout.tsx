import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SANRA LIVING | Indian Make Steel Industries • SIDCO Coimbatore",
  description:
    "Direct steel furniture factory in SIDCO Coimbatore, India. Heavy-duty MS and Jindal SS tables, workstations, cafe furniture, and utility stands with SANRA Zero-Shake Telescopic Lock™.",
  keywords: [
    "steel furniture factory",
    "SIDCO Coimbatore furniture",
    "direct factory furniture",
    "commercial cafe tables",
    "industrial steel workstation",
    "Jindal SS tables",
    "zero-shake telescopic lock",
  ],
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
      </body>
    </html>
  );
}
