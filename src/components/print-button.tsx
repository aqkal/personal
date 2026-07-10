"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-fx no-print rounded border border-neon/50 bg-neon/10 px-4 py-2 text-sm font-medium text-neon hover:bg-neon/20"
    >
      Print / Save as PDF
    </button>
  );
}
