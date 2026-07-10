"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          theme?: "dark" | "light";
          callback: (token: string) => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const tokenRef = useRef<string>("");
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!scriptReady || !SITE_KEY || !widgetRef.current || !window.turnstile)
      return;
    if (widgetIdRef.current !== null) return;
    widgetIdRef.current = window.turnstile.render(widgetRef.current, {
      sitekey: SITE_KEY,
      theme: "dark",
      callback: (token) => {
        tokenRef.current = token;
      },
      "expired-callback": () => {
        tokenRef.current = "";
      },
    });
  }, [scriptReady]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrorMsg(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
          website: data.get("website"), // honeypot - humans never fill this
          turnstileToken: tokenRef.current,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Something went wrong.");
      }
      setStatus("sent");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      if (widgetIdRef.current !== null) {
        window.turnstile?.reset(widgetIdRef.current);
        tokenRef.current = "";
      }
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="rounded-lg border border-neon/40 bg-neon/10 p-6 text-center"
      >
        <p className="font-pixel text-xs text-neon">MESSAGE DELIVERED ✓</p>
        <p className="mt-3 text-sm text-muted">
          Thanks for reaching out - I&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      {SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="lazyOnload"
          onReady={() => setScriptReady(true)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Name</span>
          <input
            name="name"
            required
            maxLength={100}
            autoComplete="name"
            className="w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-neon"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            className="w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-neon"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">Message</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="w-full resize-y rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-neon"
        />
      </label>

      {/* Honeypot - visually hidden, screen-reader hidden, tab-skipped. Bots fill it, humans can't. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
      >
        <label>
          Leave this field empty
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {SITE_KEY ? (
        <div ref={widgetRef} className="min-h-[65px]" />
      ) : (
        <p className="text-xs text-muted">
          (Captcha disabled - no NEXT_PUBLIC_TURNSTILE_SITE_KEY configured.)
        </p>
      )}

      {status === "error" && errorMsg && (
        <p role="alert" className="text-sm text-magenta">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-fx rounded border border-neon/50 bg-neon/10 px-6 py-2.5 text-sm font-medium text-neon hover:bg-neon/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Send message ▶"}
      </button>
    </form>
  );
}
