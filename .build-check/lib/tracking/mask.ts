export const TRACKING_CODE_PATTERN = /^SANRA-[2-9A-HJ-NP-Z]{4}$/;

export function normalizeTrackingCode(value: string | null | undefined): string | null {
  if (!value) return null;

  let code = value.trim().toUpperCase().replace(/\s+/g, "");
  if (!code) return null;

  if (!code.startsWith("SANRA-")) {
    code = code.startsWith("SANRA") ? `SANRA-${code.slice(5)}` : `SANRA-${code}`;
  }

  return TRACKING_CODE_PATTERN.test(code) ? code : null;
}

export function normalizePhoneLast4(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

export function maskName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "***";
  if (trimmed.length <= 3) return `${trimmed.charAt(0)}***`;
  return `${trimmed.charAt(0)}***${trimmed.slice(-2)}`;
}

export function maskPhone(last4: string | null | undefined): string {
  const digits = (last4 ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "+91 ******";
  return `+91 ******${digits.slice(-4)}`;
}

export function normalizePhoneFull(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isValidIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value);
}
