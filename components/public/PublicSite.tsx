import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { company } from "@/lib/company";
import "./public.css";

export default function PublicSite({ children }: { children: React.ReactNode }) {
  return (
    <div className="sanra-site">
      <a className="sanra-skip" href="#main-content">Skip to content</a>
      <Navbar />
      <main id="main-content" className="sanra-main" tabIndex={-1}>{children}</main>
      <Footer />
      <FloatingWhatsApp whatsappNumber={company.whatsappNumber} />
    </div>
  );
}
