import assert from "node:assert/strict";
import { POST } from "../src/app/api/contact/route";

const originalFetch = globalThis.fetch;
const env = process.env as Record<string, string | undefined>;
const originalEnv = {
  NODE_ENV: env.NODE_ENV,
  RESEND_API_KEY: env.RESEND_API_KEY,
  CONTACT_TO_EMAIL: env.CONTACT_TO_EMAIL,
  TURNSTILE_SECRET_KEY: env.TURNSTILE_SECRET_KEY,
};

const validPayload = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "I would like to discuss a software engineering opportunity.",
  website: "",
  turnstileToken: "test-token",
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setEnv(values: {
  NODE_ENV: string;
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
}) {
  env.NODE_ENV = values.NODE_ENV;
  env.RESEND_API_KEY = values.RESEND_API_KEY ?? "";
  env.CONTACT_TO_EMAIL = values.CONTACT_TO_EMAIL ?? "owner@example.com";
  env.TURNSTILE_SECRET_KEY = values.TURNSTILE_SECRET_KEY ?? "";
}

async function main() {
  const calls: string[] = [];
  let turnstileStatus = 200;
  let turnstileSuccess = true;
  let resendStatus = 200;
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    const isTurnstile = url.includes("challenges.cloudflare.com");
    return new Response(
      JSON.stringify(isTurnstile ? { success: turnstileSuccess } : { id: "mock-email" }),
      {
      status: isTurnstile ? turnstileStatus : resendStatus,
      headers: { "content-type": "application/json" },
      },
    );
  };

  setEnv({ NODE_ENV: "production", RESEND_API_KEY: "test-key" });
  const blocked = await POST(request(validPayload));
  assert.equal(blocked.status, 403, "production must require Turnstile");
  assert.equal(calls.length, 0, "captcha rejection must not call Resend");

  const honeypot = await POST(
    request({ ...validPayload, website: "https://bot.example" }),
  );
  assert.equal(honeypot.status, 200, "honeypot submissions should look successful");
  assert.equal(calls.length, 0, "honeypot submissions must not call upstreams");

  const oversizedStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(32_001)));
      controller.close();
    },
  });
  const oversized = await POST(
    new Request("http://localhost/api/contact", {
      method: "POST",
      body: oversizedStream,
      duplex: "half",
    } as RequestInit),
  );
  assert.equal(oversized.status, 413, "chunked bodies over 32 KB must be rejected");

  calls.length = 0;
  setEnv({
    NODE_ENV: "production",
    RESEND_API_KEY: "test-key",
    TURNSTILE_SECRET_KEY: "real-secret",
  });
  turnstileStatus = 503;
  turnstileSuccess = true;
  const rejectedCaptcha = await POST(request(validPayload));
  assert.equal(rejectedCaptcha.status, 403, "non-2xx captcha responses must fail closed");
  assert.deepEqual(calls, ["https://challenges.cloudflare.com/turnstile/v0/siteverify"]);

  calls.length = 0;
  turnstileStatus = 200;
  resendStatus = 502;
  const rejectedEmail = await POST(request(validPayload));
  assert.equal(rejectedEmail.status, 502, "email provider failures must be reported");
  assert.deepEqual(calls, [
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    "https://api.resend.com/emails",
  ]);

  calls.length = 0;
  setEnv({ NODE_ENV: "development", RESEND_API_KEY: "test-key", CONTACT_TO_EMAIL: "invalid" });
  const invalidRecipient = await POST(request(validPayload));
  assert.equal(invalidRecipient.status, 503, "invalid recipient configuration must fail safely");
  assert.equal(calls.length, 0, "invalid recipient configuration must not call upstreams");

  calls.length = 0;
  resendStatus = 200;
  setEnv({ NODE_ENV: "development", RESEND_API_KEY: "test-key" });
  const delivered = await POST(request(validPayload));
  assert.equal(delivered.status, 200, "development submissions should use mocked Resend");
  assert.deepEqual(calls, ["https://api.resend.com/emails"]);

  console.log("✓ Contact route checks passed");
}

function restore() {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(restore);
