import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SANRA Internal Console",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div data-internal-console>{children}</div>;
}
