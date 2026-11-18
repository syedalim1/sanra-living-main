import { company } from "@/lib/company";
import { SITE_URL } from "@/lib/site";

export function GET() {
  const lines = [
    ...(company.email ? [`Contact: mailto:${company.email}`] : []),
    "Expires: 2027-12-31T23:59:59Z",
    "Preferred-Languages: en",
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
  ];

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
