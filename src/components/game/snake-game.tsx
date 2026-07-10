"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gameBus } from "@/game/bus";

/**
 * The arcade-cabinet easter egg: a fully playable Snake.
 * Rendered on a tiny canvas, upscaled with image-rendering: pixelated.
 */
const GRID = 18;
const CELL = 10;
const SIZE = GRID * CELL;
const TICK_MS = 110;
const BEST_KEY = "snake-best";

type Vec = { x: number; y: number };

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0;
    }
  });

  const state = useRef({
    snake: [{ x: 9, y: 9 }] as Vec[],
    dir: { x: 1, y: 0 } as Vec,
    nextDir: { x: 1, y: 0 } as Vec,
    food: { x: 13, y: 9 } as Vec,
    score: 0,
  });

  const placeFood = useCallback(() => {
    const s = state.current;
    let spot: Vec;
    do {
      spot = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID),
      };
    } while (s.snake.some((seg) => seg.x === spot.x && seg.y === spot.y));
    s.food = spot;
  }, []);

  const start = useCallback(() => {
    state.current = {
      snake: [
        { x: 9, y: 9 },
        { x: 8, y: 9 },
        { x: 7, y: 9 },
      ],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: { x: 13, y: 9 },
      score: 0,
    };
    setScore(0);
    setPhase("playing");
  }, []);

  const steer = useCallback(
    (d: Vec) => {
      const s = state.current;
      // no 180° turns
      if (d.x === -s.dir.x && d.y === -s.dir.y) return;
      s.nextDir = d;
      if (phase !== "playing") start();
    },
    [phase, start],
  );

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const s = state.current;
    ctx.fillStyle = "#04070d";
    ctx.fillRect(0, 0, SIZE, SIZE);
    // grid glow lines
    ctx.fillStyle = "#0a1420";
    for (let i = 0; i < GRID; i += 2) {
      ctx.fillRect(i * CELL, 0, 1, SIZE);
      ctx.fillRect(0, i * CELL, SIZE, 1);
    }
    // food
    ctx.fillStyle = "#ff6bd6";
    ctx.fillRect(s.food.x * CELL + 2, s.food.y * CELL + 2, CELL - 4, CELL - 4);
    // snake
    s.snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? "#c9ffe0" : "#4ef08a";
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, []);

  // keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, Vec> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        e.stopPropagation();
        steer(dir);
      }
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [steer]);

  // game loop
  useEffect(() => {
    if (phase !== "playing") return;
    const timer = setInterval(() => {
      const s = state.current;
      s.dir = s.nextDir;
      const head = {
        x: s.snake[0].x + s.dir.x,
        y: s.snake[0].y + s.dir.y,
      };
      const hitWall =
        head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
      const hitSelf = s.snake.some(
        (seg) => seg.x === head.x && seg.y === head.y,
      );
      if (hitWall || hitSelf) {
        setPhase("over");
        setBest((prev) => {
          const nb = Math.max(prev, s.score);
          try {
            localStorage.setItem(BEST_KEY, String(nb));
          } catch {
            // ignore
          }
          gameBus.emit("snake:score", { score: s.score, best: nb });
          return nb;
        });
        return;
      }
      s.snake.unshift(head);
      if (head.x === s.food.x && head.y === s.food.y) {
        s.score += 10;
        setScore(s.score);
        placeFood();
      } else {
        s.snake.pop();
      }
      draw();
    }, TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    draw();
  }, [draw, phase]);

  return (
    <div data-game className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-[280px] items-center justify-between font-pixel text-[9px]">
        <span className="text-neon">SCORE {score}</span>
        <span className="text-amber">BEST {best}</span>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="w-[260px] rounded border-2 border-cyan/40 shadow-[0_0_24px_-6px_rgba(83,216,255,0.6)] [image-rendering:pixelated] sm:w-[280px]"
        />
        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded bg-black/70">
            {phase === "over" && (
              <p className="font-pixel text-xs text-magenta">GAME OVER</p>
            )}
            <button
              type="button"
              onClick={start}
              className="btn-fx rounded border border-neon/60 bg-neon/15 px-4 py-2 font-pixel text-[9px] text-neon hover:bg-neon/25"
            >
              {phase === "over" ? "RETRY ▶" : "INSERT COIN ▶"}
            </button>
            <p className="font-pixel text-[8px] text-muted">
              ARROWS / WASD TO MOVE
            </p>
          </div>
        )}
      </div>

      {/* touch d-pad */}
      <div className="grid grid-cols-3 gap-1 sm:hidden">
        <span />
        <PadBtn label="▲" onPress={() => steer({ x: 0, y: -1 })} />
        <span />
        <PadBtn label="◀" onPress={() => steer({ x: -1, y: 0 })} />
        <PadBtn label="▼" onPress={() => steer({ x: 0, y: 1 })} />
        <PadBtn label="▶" onPress={() => steer({ x: 1, y: 0 })} />
      </div>
    </div>
  );
}

function PadBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className="size-11 rounded border border-line bg-raised text-sm text-ink active:bg-neon/20"
      aria-label={`Move ${label}`}
    >
      {label}
    </button>
  );
}
