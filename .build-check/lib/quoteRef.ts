export const QUOTE_REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const QUOTE_REF_LENGTH = 6;

function randomIndex(max: number): number {
  const cryptoObject = globalThis.crypto;

  if (cryptoObject?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoObject.getRandomValues(values);
    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}

export function generateQuoteRef(): string {
  let body = "";
  for (let index = 0; index < QUOTE_REF_LENGTH; index += 1) {
    body += QUOTE_REF_ALPHABET[randomIndex(QUOTE_REF_ALPHABET.length)];
  }
  return `Q-${body}`;
}

export function isValidQuoteRef(value: string): boolean {
  return new RegExp(`^Q-[${QUOTE_REF_ALPHABET}]{${QUOTE_REF_LENGTH}}$`).test(value);
}
