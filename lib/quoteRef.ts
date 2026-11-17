import { randomInt } from "node:crypto";

export const QUOTE_REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const QUOTE_REF_LENGTH = 6;

export function generateQuoteRef(): string {
  let body = "";
  for (let index = 0; index < QUOTE_REF_LENGTH; index += 1) {
    body += QUOTE_REF_ALPHABET[randomInt(0, QUOTE_REF_ALPHABET.length)];
  }
  return `Q-${body}`;
}

export function isValidQuoteRef(value: string): boolean {
  return new RegExp(`^Q-[${QUOTE_REF_ALPHABET}]{${QUOTE_REF_LENGTH}}$`).test(value);
}
