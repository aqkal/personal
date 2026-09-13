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
      remove?: (id: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const MISSING_SITE_KEY_IN_PRODUCTION =
  process.env.NODE_ENV === "production" && !SITE_KEY;

type ContactFormProps = {
  email: string;
  fallbackTitle: string;
  fallbackDescription: string;
};

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm({
  email,
  fallbackTitle,
  fallbackDescription,
}: ContactFormProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [captchaLoadError, setCaptchaLoadError] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const tokenRef = useRef<string>("");
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!scriptReady || !SITE_KEY || !widgetRef.current || !window.turnstile)
      return;
    if (widgetIdRef.current !== null) return;
    try {
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: SITE_KEY,
        theme:
          document.documentElement.dataset.theme === "dark" ? "dark" : "light",
        callback: (token) => {
          tokenRef.current = token;
        },
        "expired-callback": () => {
          tokenRef.current = "";
        },
      });
    } catch {
      window.setTimeout(() => setCaptchaLoadError(true), 0);
    }

    return () => {
      const widgetId = widgetIdRef.current;
      if (widgetId !== null) {
        window.turnstile?.remove?.(widgetId);
        widgetIdRef.current = null;
        tokenRef.current = "";
      }
    };
  }, [scriptReady]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrorMsg(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    if (SITE_KEY && !tokenRef.current) {
      setStatus("error");
      setErrorMsg("Please complete the captcha and try again.");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
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
      setErrorMsg(
        err instanceof DOMException && err.name === "AbortError"
          ? "The request timed out. It may still have been delivered. Please wait a moment before trying again."
          : err instanceof Error
            ? err.message
            : "Something went wrong.",
      );
      if (widgetIdRef.current !== null) {
        window.turnstile?.reset(widgetIdRef.current);
        tokenRef.current = "";
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="rounded-lg border border-accent/40 bg-accent/10 p-6 text-center"
      >
        <p className="font-pixel text-xs text-accent">MESSAGE DELIVERED ✓</p>
        <p className="mt-3 text-sm text-muted">
          Thanks for reaching out - I&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  if (MISSING_SITE_KEY_IN_PRODUCTION) {
    return (
      <div
        role="status"
        className="rounded-lg border border-line bg-raised/40 p-6"
      >
        <p className="font-pixel text-xs text-accent">{fallbackTitle}</p>
        <p className="mt-3 text-sm text-muted">{fallbackDescription}</p>
        <a
          href={`mailto:${email}`}
          className="mt-4 inline-flex text-sm text-accent underline underline-offset-4"
        >
          {email}
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      noValidate={false}
      aria-busy={status === "sending"}
    >
      {SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="lazyOnload"
          onReady={() => setScriptReady(true)}
          onError={() => setCaptchaLoadError(true)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Name</span>
          <input
            id="contact-name"
            name="name"
            required
            maxLength={100}
            autoComplete="name"
            className="w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Email</span>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            spellCheck={false}
            className="w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">Message</span>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="w-full resize-y rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
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
        <div
          ref={widgetRef}
          className="min-h-[65px]"
          aria-label="Captcha verification"
        />
      ) : (
        <p className="text-xs text-muted">
          (Captcha disabled - no NEXT_PUBLIC_TURNSTILE_SITE_KEY configured.)
        </p>
      )}

      {captchaLoadError && (
        <p role="alert" className="text-sm text-accent">
          The captcha could not load. Please refresh the page and try again.
        </p>
      )}

      {status === "error" && errorMsg && (
        <p role="alert" className="text-sm text-accent">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-fx rounded border border-accent/50 bg-accent/10 px-6 py-2.5 text-sm font-medium text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Send message ▶"}
      </button>
    </form>
  );
}
