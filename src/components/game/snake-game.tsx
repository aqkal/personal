"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gameBus } from "@/game/bus";
import { createSnake, steerSnake, stepSnake, type Cell } from "@/game/snake-engine";
import { useMediaQuery } from "@/lib/use-media-query";

const GRID = 18;
const CELL = 10;
const SIZE = GRID * CELL;
const BEST_KEY = "snake-best";
type Phase = "idle" | "playing" | "paused" | "over" | "won";

/** A self-contained arcade break. The 3D renderer stays paused behind it. */
export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const isTouch = useMediaQuery("(pointer: coarse)");
  const [best, setBest] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(BEST_KEY));
      return Number.isFinite(saved) && saved > 0 ? saved : 0;
    } catch { return 0; }
  });
  const state = useRef(createSnake(GRID));
  const start = useCallback((direction: Cell = { x: 1, y: 0 }) => {
    state.current = createSnake(GRID, direction);
    setScore(0);
    setPhase("playing");
  }, []);
  const steer = useCallback((direction: Cell) => {
    if (phase === "idle" || phase === "over" || phase === "won") { start(direction); return; }
    steerSnake(state.current, direction);
    if (phase === "paused") setPhase("playing");
  }, [phase, start]);
  const togglePause = useCallback(() => {
    setPhase((current) => current === "playing" ? "paused" : current === "paused" ? "playing" : current);
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const s = state.current;
    ctx.fillStyle = "#0a181d";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#14262c";
    for (let i = 0; i < GRID; i++) {
      ctx.fillRect(i * CELL, 0, 0.5, SIZE);
      ctx.fillRect(0, i * CELL, SIZE, 0.5);
    }
    if (s.food) {
      ctx.fillStyle = "#f3bf73";
      ctx.fillRect(s.food.x * CELL + 2, s.food.y * CELL + 2, CELL - 4, CELL - 4);
    }
    s.snake.forEach((segment, i) => {
      ctx.fillStyle = i === 0 ? "#e3ffe9" : "#72c9a4";
      ctx.fillRect(segment.x * CELL + 1, segment.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, []);

  useEffect(() => {
    const directions: Record<string, Cell> = {
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      KeyW: { x: 0, y: -1 }, KeyS: { x: 0, y: 1 },
      KeyA: { x: -1, y: 0 }, KeyD: { x: 1, y: 0 },
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (directions[event.code]) {
        event.preventDefault();
        event.stopPropagation();
        steer(directions[event.code]);
      } else if (event.code === "KeyP" && !event.repeat) {
        event.preventDefault(); togglePause();
      }
    };
    const pause = () => setPhase((current) => current === "playing" ? "paused" : current);
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [steer, togglePause]);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = setInterval(() => {
      const result = stepSnake(state.current, GRID);
      setScore(state.current.score);
      draw();
      if (result !== "playing") {
        clearInterval(timer);
        setPhase(result);
        const record = Math.max(best, state.current.score);
        setBest(record);
        try { localStorage.setItem(BEST_KEY, String(record)); } catch { /* Optional local score. */ }
        gameBus.emit("snake:score", { score: state.current.score, best: record });
      }
    }, Math.max(70, 130 - score * 0.3));
    return () => clearInterval(timer);
  }, [phase, score, best, draw]);
  useEffect(() => { draw(); }, [draw, phase]);

  return (
    <div data-game className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-[300px] items-center justify-between font-mono text-xs">
        <span className="text-accent">SCORE {String(score).padStart(3, "0")}</span>
        <span className="text-muted">BEST {String(best).padStart(3, "0")}</span>
      </div>
      <div className="relative w-full max-w-[300px] overflow-hidden rounded-xl border border-accent/30">
        <canvas ref={canvasRef} width={SIZE} height={SIZE} role="img" aria-label="Snake arcade board. Use arrow keys or WASD to collect gold food and avoid walls and your body." className="block w-full [image-rendering:pixelated]" />
        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#071218]/90 p-5 text-center">
            <p className="font-display text-2xl text-white">{phase === "over" ? "One more round?" : phase === "won" ? "Campus champion." : phase === "paused" ? "Take a breather." : "A little study break."}</p>
            <p className="text-sm text-white/65">{phase === "won" ? "Every square. A perfect run." : phase === "over" ? `${score} points. Your best is saved.` : "Collect the gold. Give yourself room."}</p>
            <button type="button" onClick={() => phase === "paused" ? setPhase("playing") : start()} className="primary-action">{phase === "paused" ? "Continue →" : phase === "idle" ? "Play Snake →" : "Play again →"}</button>
          </div>
        )}
      </div>
      <div className="flex w-full max-w-[300px] items-center justify-between gap-3 text-xs text-muted">
        <span>{isTouch ? "Use the arrows below" : "WASD / arrows · P to pause"}</span>
        {(phase === "playing" || phase === "paused") && <button onClick={togglePause} className="min-h-11 px-3 text-accent">{phase === "paused" ? "Resume" : "Pause"}</button>}
      </div>
      <span className="sr-only" role="status">{phase === "over" ? `Game over. ${score} points.` : phase === "won" ? `You won with ${score} points.` : phase === "paused" ? "Snake paused." : ""}</span>
      {isTouch && <div className="grid grid-cols-3 gap-2">
        <span /><PadBtn label="↑" direction="up" onPress={() => steer({ x: 0, y: -1 })} /><span />
        <PadBtn label="←" direction="left" onPress={() => steer({ x: -1, y: 0 })} />
        <PadBtn label="↓" direction="down" onPress={() => steer({ x: 0, y: 1 })} />
        <PadBtn label="→" direction="right" onPress={() => steer({ x: 1, y: 0 })} />
      </div>}
    </div>
  );
}

function PadBtn({ label, direction, onPress }: { label: string; direction: string; onPress: () => void }) {
  return <button type="button" onClick={onPress} className="size-12 touch-manipulation rounded-xl border border-line bg-raised text-lg text-ink active:bg-accent/20" aria-label={`Move ${direction}`}>{label}</button>;
}
