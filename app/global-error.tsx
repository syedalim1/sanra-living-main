"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  const whatsappBase = number ? `https://wa.me/${number}` : "https://wa.me/";
  const whatsappHref = `${whatsappBase}?text=${encodeURIComponent(
    "Hi SANRA LIVING, I hit an error on your website."
  )}`;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#111111",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "520px", textAlign: "center" }}>
          <p
            style={{
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#b91c1c",
            }}
          >
            SANRA LIVING
          </p>
          <h1 style={{ fontSize: "30px", lineHeight: 1.15, margin: "12px 0" }}>
            We hit a temporary problem
          </h1>
          <p style={{ color: "#525252", fontSize: "14px", lineHeight: 1.6 }}>
            Please retry once. If it keeps happening, contact the factory desk
            on WhatsApp and we will help.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "10px",
              marginTop: "22px",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                border: 0,
                borderRadius: "8px",
                background: "#111111",
                color: "#ffffff",
                padding: "12px 18px",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                borderRadius: "8px",
                border: "1px solid #d4d4d8",
                color: "#111111",
                padding: "12px 18px",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Back to Home
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                borderRadius: "8px",
                background: "#059669",
                color: "#ffffff",
                padding: "12px 18px",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              WhatsApp
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
