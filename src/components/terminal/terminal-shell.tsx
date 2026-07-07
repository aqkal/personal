"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  complete,
  execute,
  type LineKind,
  type TermLine,
} from "@/terminal/commands";
import { formatPath } from "@/terminal/fs";
import { SnakeGame } from "@/components/game/snake-game";

/**
 * UQ-OS: a lightweight custom terminal (no xterm, no PTY) over the same
 * content model as the 3D world. Scrollback is a plain array; the only
 * re-renders are on submitted commands.
 */

type RowInput =
  | { kind: LineKind; text: string }
  | { kind: "echo"; path: string; input: string }
  | { kind: "snake" };
type Row = RowInput & { id: number };

const BOOT_LINES: TermLine[] = [
  { text: "UQ-OS BIOS v2.6 - tty initialized", kind: "dim" },
  { text: "mounting /home/visitor ............ ok", kind: "dim" },
  { text: "hydrating content model ........... ok", kind: "dim" },
  { text: "+--------------------------------+", kind: "accent" },
  { text: "|   U Q - O S   ::   v i s i t o r   |".replace(/ {2}/g, " "), kind: "accent" },
  { text: "+--------------------------------+", kind: "accent" },
  { text: "the same resume as the 3D campus, one prompt away.", kind: "out" },
  { text: "type `help` to get started, tab completes.", kind: "dim" },
];

const SUGGESTIONS = ["help", "cat about.md", "ls projects", "neofetch", "map", "snake", "play"];

const THEMES = {
  green: { bg: "#04070d", fg: "#cfe8d8", accent: "#4ef08a", dim: "#5f7a6c", error: "#ff6b8a", title: "#a8ffce" },
  amber: { bg: "#0c0700", fg: "#f0dcc0", accent: "#ffb000", dim: "#8f7a55", error: "#ff7a5c", title: "#ffd47a" },
  paper: { bg: "#f2ede2", fg: "#3a352c", accent: "#1f6e43", dim: "#8a8272", error: "#b03030", title: "#14532d" },
} as const;

function TermSnake({ onQuit }: { onQuit: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "q" || e.key === "Q" || e.key === "Escape") {
        e.preventDefault();
        onQuit();
      }
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onQuit]);
  return (
    <div className="my-2 flex flex-col items-start gap-2" data-game>
      <SnakeGame />
      <button
        type="button"
        onClick={onQuit}
        className="rounded border border-current px-2 py-0.5 text-xs opacity-70 hover:opacity-100"
      >
        Q · unplug cabinet
      </button>
    </div>
  );
}

export function TerminalShell({
  onExit,
  onPlayGame,
}: {
  onExit: () => void;
  onPlayGame: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [booted, setBooted] = useState(false);
  const [value, setValue] = useState("");
  const [cwd, setCwd] = useState<string[]>([]);
  const [theme, setTheme] = useState<keyof typeof THEMES>("green");
  const [vimMode, setVimMode] = useState(false);
  const history = useRef<string[]>([]);
  const histIdx = useRef(-1);
  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = useCallback((newRows: RowInput[]) => {
    setRows((prev) => [
      ...prev,
      ...newRows.map((r) => ({ ...r, id: nextId.current++ })),
    ]);
  }, []);

  // boot sequence (instant under reduced motion)
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = reduced ? 0 : 170;
    let i = 0;
    const timer = setInterval(() => {
      if (reduced) {
        push(BOOT_LINES.map((l) => ({ kind: l.kind, text: l.text })));
        i = BOOT_LINES.length;
      } else {
        const line = BOOT_LINES[i];
        push([{ kind: line.kind, text: line.text }]);
        i++;
      }
      if (i >= BOOT_LINES.length) {
        clearInterval(timer);
        setBooted(true);
      }
    }, step);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep scrolled to the latest output
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rows]);

  useEffect(() => {
    if (booted) inputRef.current?.focus();
  }, [booted]);

  const run = useCallback(
    (raw: string) => {
      const input = raw.trim();
      push([{ kind: "echo", path: formatPath(cwd), input }]);
      if (!input) return;
      history.current.push(input);
      histIdx.current = -1;

      if (vimMode) {
        if (["q", "q!", ":q", ":q!", ":wq", "wq"].includes(input)) {
          setVimMode(false);
          push([
            { kind: "out", text: "you escaped vim. put it on the resume." },
          ]);
        } else {
          push([
            { kind: "error", text: `E492: not an editor command: ${input}` },
            { kind: "dim", text: "hint: the answer is :q" },
          ]);
        }
        return;
      }

      const result = execute(input, cwd, history.current);
      if (result.newCwd) setCwd(result.newCwd);
      push(result.lines.map((l) => ({ kind: l.kind, text: l.text })));

      switch (result.action?.type) {
        case "clear":
          setRows([]);
          break;
        case "exit":
          setTimeout(onExit, 350);
          break;
        case "play":
          setTimeout(onPlayGame, 450);
          break;
        case "snake":
          push([{ kind: "snake" }]);
          break;
        case "vim":
          setVimMode(true);
          push([
            { kind: "dim", text: '"resume.md" [readonly] 42L' },
            { kind: "out", text: "~" },
            { kind: "out", text: "~   welcome to vim. you live here now." },
            { kind: "out", text: "~" },
          ]);
          break;
        case "theme":
          setTheme(result.action.name);
          break;
        case "navigate":
          router.push(result.action.href);
          break;
      }
    },
    [cwd, onExit, onPlayGame, push, router, vimMode],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      run(value);
      setValue("");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const options = complete(value, cwd);
      if (options.length === 1) {
        const parts = value.split(/\s+/);
        parts[parts.length - 1] = options[0];
        setValue(parts.join(" ") + (options[0].endsWith("/") ? "" : " "));
      } else if (options.length > 1) {
        push(options.map((o) => ({ kind: "dim" as const, text: o })));
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = history.current;
      if (h.length === 0) return;
      histIdx.current = histIdx.current < 0 ? h.length - 1 : Math.max(0, histIdx.current - 1);
      setValue(h[histIdx.current]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const h = history.current;
      if (histIdx.current < 0) return;
      histIdx.current++;
      if (histIdx.current >= h.length) {
        histIdx.current = -1;
        setValue("");
      } else {
        setValue(h[histIdx.current]);
      }
    }
  }

  const t = THEMES[theme];
  const kindColor: Record<LineKind, string> = {
    out: t.fg,
    accent: t.accent,
    dim: t.dim,
    error: t.error,
    title: t.title,
  };
  const prompt = `${formatPath(cwd)} $`;

  return (
    <div
      className="flex h-dvh flex-col font-mono text-[13px] leading-relaxed sm:text-sm"
      style={{ backgroundColor: t.bg, color: t.fg }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* window chrome */}
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        style={{ borderColor: `${t.dim}55` }}
      >
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: t.error }} />
          <span className="size-2.5 rounded-full" style={{ background: "#ffc857" }} />
          <span className="size-2.5 rounded-full" style={{ background: t.accent }} />
          <span className="ml-2 text-xs" style={{ color: t.dim }}>
            uq-os :: visitor tty
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/about" className="hover:underline" style={{ color: t.dim }}>
            classic site
          </Link>
          <button
            type="button"
            onClick={onExit}
            title="Back to interface select"
            className="hover:opacity-70"
            style={{ color: t.dim }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* scrollback */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        className="crt-scanlines relative flex-1 overflow-y-auto px-4 py-3"
      >
        {rows.map((row) => {
          if (row.kind === "snake") {
            return (
              <TermSnake
                key={row.id}
                onQuit={() =>
                  setRows((prev) => prev.filter((r) => r.id !== row.id))
                }
              />
            );
          }
          if (row.kind === "echo") {
            return (
              <div key={row.id} className="whitespace-pre-wrap break-words">
                <span style={{ color: t.accent }}>{row.path} $ </span>
                <span>{row.input}</span>
              </div>
            );
          }
          return (
            <div
              key={row.id}
              className="whitespace-pre-wrap break-words"
              style={{ color: kindColor[row.kind] }}
            >
              {row.text.length ? row.text : " "}
            </div>
          );
        })}
      </div>

      {/* suggestions (until the visitor finds their feet) */}
      {booted && rows.length < 14 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                run(s);
                inputRef.current?.focus();
              }}
              className="rounded border px-2 py-0.5 text-xs transition-opacity hover:opacity-100"
              style={{ borderColor: `${t.dim}66`, color: t.dim, opacity: 0.85 }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* prompt */}
      <div
        className="flex items-center gap-2 border-t px-4 py-3"
        style={{ borderColor: `${t.dim}55` }}
      >
        <span style={{ color: vimMode ? t.error : t.accent }}>
          {vimMode ? ":" : prompt}
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!booted}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="Terminal command input"
          className="flex-1 bg-transparent outline-none"
          style={{ color: t.fg, caretColor: t.accent }}
        />
      </div>
    </div>
  );
}
