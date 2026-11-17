import { describe, expect, it } from "vitest";

const baseUrl =
  process.env.SANRA_TEST_BASE_URL || process.env.ADMIN_TEST_BASE_URL;
const describeHttp = baseUrl ? describe : describe.skip;

describeHttp("tracking API failure responses", () => {
  it("returns the identical generic response for wrong code, wrong phone and unknown code", async () => {
    const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    const randomCode = () =>
      `SANRA-${Array.from(
        { length: 4 },
        () => alphabet[Math.floor(Math.random() * alphabet.length)]
      ).join("")}`;
    const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;

    const payloads = [
      { tracking_code: randomCode(), phone_last_4: "5303" },
      { tracking_code: randomCode(), phone_last_4: "1111" },
      { tracking_code: randomCode(), phone_last_4: "9999" },
    ];

    const responses = [];
    for (const payload of payloads) {
      responses.push(
        await fetch(`${baseUrl}/api/track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": testIp,
          },
          body: JSON.stringify(payload),
        })
      );
    }

    const bodies = await Promise.all(responses.map((response) => response.text()));

    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }

    expect(new Set(bodies).size).toBe(1);
    expect(JSON.parse(bodies[0] as string)).toEqual({
      error: "No order found. Please check your code and phone digits.",
    });
  }, 90000);
});
