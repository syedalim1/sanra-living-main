import Link from "next/link";
import Brand from "@/components/public/Brand";
import { company, SOCIAL, whatsappHref } from "@/lib/company";

const collectionLinks = [
  ["/collections/steel-chairs", "Steel Chairs"],
  ["/collections/steel-tables", "Steel Tables"],
  ["/collections/granite-dining-tables", "Granite Dining Tables"],
  ["/collections/dining-sets", "Dining Sets"],
  ["/sets", "Configurable Sets"],
];

const serviceLinks = [
  ["/industries/restaurants", "Restaurant Furniture"],
  ["/industries/industrial-canteens", "Canteen Furniture"],
  ["/projects", "Our Projects"],
  ["/b2b", "Trade & Bulk Orders"],
  ["/enquiry", "Enquiry List"],
  ["/track", "Track Order"],
  ["/contact", "Contact & Directions"],
];

export default function Footer() {
  return (
    <footer className="sanra-footer">
      <div className="sanra-container">
        <div className="sanra-footer-grid">
          <div className="sanra-footer-brand">
            <Brand />
            <p>
              {company.manufacturer}
              <br />
              {company.address}
            </p>
          </div>
          <nav aria-label="Furniture collections">
            <h2>Collections</h2>
            {collectionLinks.map(([href, title]) => (
              <Link key={href} href={href}>
                {title}
              </Link>
            ))}
          </nav>
          <nav aria-label="Customer services">
            <h2>Services &amp; Industries</h2>
            {serviceLinks.map(([href, title]) => (
              <Link key={href} href={href}>
                {title}
              </Link>
            ))}
          </nav>
          <div className="sanra-footer-contact">
            <h2>Factory desk</h2>
            {company.phone && <a href={company.phoneHref}>{company.phone}</a>}
            {company.secondaryPhone && (
              <a href={company.secondaryPhoneHref}>{company.secondaryPhone}</a>
            )}
            {company.email && <a href={`mailto:${company.email}`}>{company.email}</a>}
            {company.whatsappNumber && (
              <a
                href={whatsappHref(
                  "Hello SANRA LIVING, I have an enquiry about steel furniture."
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chat on WhatsApp
              </a>
            )}
            {company.mapsUrl && (
              <a href={company.mapsUrl} target="_blank" rel="noopener noreferrer">
                Factory directions
              </a>
            )}
          </div>
        </div>
        <div className="sanra-footer-legal">
          <p>© 2026 {company.brand} · {company.manufacturer}</p>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
            {SOCIAL.google_maps && (
              <a href={SOCIAL.google_maps} target="_blank" rel="noopener noreferrer">
                Google reviews
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
