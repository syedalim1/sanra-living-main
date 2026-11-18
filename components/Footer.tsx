import Link from "next/link";
import {
  MessageSquare,
  MapPin,
  Phone,
  ShieldCheck,
  FileCheck,
  Mail,
} from "lucide-react";
import { InstagramIcon, FacebookIcon } from "@/components/SocialIcons";
import { company, whatsappHref, SOCIAL } from "@/lib/company";

export default function Footer() {
  return (
    <footer className="bg-[#111111] text-neutral-300 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Company Brief */}
          <div className="md:col-span-1 space-y-4">
            <h3 className="text-white text-lg font-black tracking-wider uppercase">
              SANRA LIVING
            </h3>
            <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
              Indian Make Steel Industries
            </p>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Direct steel furniture manufacturing unit in SIDCO Industrial Estate, Coimbatore. Heavy-gauge MS and stainless steel frames built for daily use.
            </p>
            <div className="pt-2">
              <span className="inline-block bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs px-2.5 py-1 rounded">
                GST Invoice Available
              </span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
              Factory Catalog
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  Products & Live Prices
                </Link>
              </li>
              <li>
                <Link href="/b2b" className="hover:text-white transition-colors">
                  B2B / Architect Portal
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-white transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Factory Location & Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>

          {/* Sourcing & Specs */}
          <div>
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
              Factory Materials
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral-400">
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                <span>Premium CR steel pipe & stainless steel</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                <span>100% Seasoned Grade-A Hardwood</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                <span>18mm Export-Grade Natural Granite</span>
              </li>
              <li className="flex items-start gap-2">
                <FileCheck className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                <span>10-Yr MIG Structural Warranty</span>
              </li>
            </ul>
          </div>

          {/* SIDCO Factory Contact */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
              Factory Unit
            </h4>
            <div className="text-sm text-neutral-400 space-y-2.5">
              {company.address && (
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                  {company.mapsUrl ? (
                    <a
                      href={company.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      {company.address}
                    </a>
                  ) : (
                    <span>{company.address}</span>
                  )}
                </p>
              )}
              {company.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-neutral-300 shrink-0" />
                  <a href={company.phoneHref} className="hover:text-white transition-colors">
                    {company.phone}
                  </a>
                </p>
              )}
              {company.email && (
                <p className="flex items-center gap-2 break-all">
                  <Mail className="w-4 h-4 text-neutral-300 shrink-0" />
                  <a
                    href={`mailto:${company.email}`}
                    className="hover:text-white transition-colors"
                  >
                    {company.email}
                  </a>
                </p>
              )}
              {company.whatsappNumber && (
                <div className="pt-2">
                  <a
                    href={whatsappHref("Hello SANRA LIVING Factory, I have an enquiry.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat on WhatsApp
                  </a>
                </div>
              )}

              <div className="pt-3 flex items-center gap-2">
                {SOCIAL.instagram && (
                  <a
                    href={SOCIAL.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="SANRA LIVING on Instagram"
                    className="p-2 rounded-md bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
                  >
                    <InstagramIcon className="w-4 h-4" />
                  </a>
                )}
                {SOCIAL.facebook && (
                  <a
                    href={SOCIAL.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="SANRA LIVING on Facebook"
                    className="p-2 rounded-md bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
                  >
                    <FacebookIcon className="w-4 h-4" />
                  </a>
                )}
                {SOCIAL.google_maps && (
                  <>
                    <a
                      href={SOCIAL.google_maps}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="SANRA LIVING on Google Maps"
                      className="p-2 rounded-md bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                    </a>
                    <a
                      href={SOCIAL.google_maps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-semibold text-neutral-300 underline underline-offset-2 hover:text-white transition-colors"
                    >
                      See our Google reviews
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-4">
          <p>© 2026 SANRA LIVING | Indian Make Steel Industries. All rights reserved.</p>
          <p className="text-neutral-400">Direct SIDCO Coimbatore Factory • Live Factory Pricing</p>
        </div>
      </div>
    </footer>
  );
}
