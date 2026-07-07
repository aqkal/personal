import { z } from "zod";

/**
 * Contact form endpoint. Fetch-only (no Node-only SDKs) so it runs
 * identically on Vercel and Cloudflare Workers.
 *
 * Defense layers (see docs/SECURITY.md):
 * 1. size guard  2. Zod validation  3. honeypot  4. Turnstile server verify
 * 5. fixed email headers (user input never controls from/to/subject routing)
 * 6. generic error responses
 */

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(200),
  message: z.string().trim().min(10).max(5000),
  /** honeypot: humans never see this field, bots love it */
  website: z.string().max(200).optional(),
  turnstileToken: z.string().max(4096).optional(),
});

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status });

async function verifyTurnstile(
  token: string | undefined,
  ip: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // captcha not configured (e.g. local dev)
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      },
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/** Newlines stripped so user text can never smuggle extra email headers. */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").slice(0, 120);

export async function POST(req: Request) {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > 32_000) {
    return json(413, { error: "Message too large." });
  }

  let parsed: z.infer<typeof contactSchema>;
  try {
    parsed = contactSchema.parse(await req.json());
  } catch {
    return json(400, { error: "Invalid submission. Check the fields and try again." });
  }

  // honeypot tripped: pretend success, tell the bot nothing
  if (parsed.website && parsed.website.length > 0) {
    return json(200, { ok: true });
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  const human = await verifyTurnstile(parsed.turnstileToken, ip);
  if (!human) {
    return json(403, { error: "Captcha verification failed. Please try again." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    if (process.env.NODE_ENV === "development") {
      console.log("[contact] (email not configured) message:", {
        name: parsed.name,
        email: parsed.email,
        message: parsed.message.slice(0, 200),
      });
      return json(200, { ok: true });
    }
    return json(503, { error: "Contact form is temporarily unavailable." });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Portfolio Contact <onboarding@resend.dev>",
        to: [to],
        reply_to: parsed.email,
        subject: `Portfolio contact from ${oneLine(parsed.name)}`,
        text: `From: ${oneLine(parsed.name)} <${parsed.email}>\n\n${parsed.message}`,
      }),
    });
    if (!res.ok) {
      return json(502, { error: "Could not send the message. Please try again later." });
    }
  } catch {
    return json(502, { error: "Could not send the message. Please try again later." });
  }

  return json(200, { ok: true });
}
