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

const MAX_BODY_BYTES = 32_000;
const UPSTREAM_TIMEOUT_MS = 10_000;

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status });

/** Cloudflare's public "always passes" test secret. */
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

async function readBody(req: Request): Promise<{ text: string; tooLarge: boolean }> {
  if (!req.body) return { text: "", tooLarge: false };

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // The request is already over the limit. Preserve the 413 response
          // even if the runtime cannot cancel the incoming stream cleanly.
        }
        return { text: "", tooLarge: true };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { text, tooLarge: false };
  } finally {
    reader.releaseLock();
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  consume: (response: Response) => unknown | PromiseLike<unknown>,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    await consume(response);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyTurnstile(
  token: string | undefined,
  ip: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Fail CLOSED in production. This used to return true unconditionally, so
    // a deploy that lost TURNSTILE_SECRET_KEY silently disabled the captcha
    // while the form kept sending real mail: a misconfigured environment
    // variable turned the endpoint into an open relay to the owner's inbox.
    // Locally the captcha is genuinely optional, so dev still passes.
    return process.env.NODE_ENV !== "production";
  }
  if (!token) return false;
  // .env.example ships Cloudflare's documented always-passes test secret so the
  // form works out of the box locally. Deploying that copied file would leave a
  // captcha that verifies nothing, which looks configured and is not.
  if (secret === TURNSTILE_TEST_SECRET && process.env.NODE_ENV === "production") {
    return false;
  }
  try {
    let valid = false;
    await fetchWithTimeout(
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
      async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { success?: boolean };
        valid = data.success === true;
      },
    );
    return valid;
  } catch {
    return false;
  }
}

/** Newlines stripped so user text can never smuggle extra email headers. */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").slice(0, 120);

export async function POST(req: Request) {
  // check the declared size first, then the actual bytes: content-length can
  // be absent or lied about with chunked encoding
  const length = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return json(413, { error: "Message too large." });
  }

  let parsed: z.infer<typeof contactSchema>;
  try {
    const body = await readBody(req);
    if (body.tooLarge) {
      return json(413, { error: "Message too large." });
    }
    parsed = contactSchema.parse(JSON.parse(body.text));
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

  if (!z.email().safeParse(to).success) {
    return json(503, { error: "Contact form is temporarily unavailable." });
  }

  try {
    let accepted = false;
    await fetchWithTimeout("https://api.resend.com/emails", {
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
    }, (res) => {
      accepted = res.ok;
    });
    if (!accepted) {
      return json(502, { error: "Could not send the message. Please try again later." });
    }
  } catch {
    return json(502, { error: "Could not send the message. Please try again later." });
  }

  return json(200, { ok: true });
}
