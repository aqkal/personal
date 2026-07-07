"use client";

/**
 * Placeholder — replaced by the real Phaser game shell in the game-core phase.
 */
export function GameShell({ onExit }: { onExit: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg">
      <p className="font-pixel text-xs text-neon">WORLD UNDER CONSTRUCTION</p>
      <button
        type="button"
        onClick={onExit}
        className="rounded border border-line px-4 py-2 text-sm text-muted hover:text-ink"
      >
        ← back to interface select
      </button>
    </div>
  );
}
