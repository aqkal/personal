/**
 * World boot stages, shared by the emitters (game shell, world) and the
 * boarding-pass loading screen so both sides agree on progress.
 */
export type WorldStage = "shell" | "chunk" | "context" | "compiled" | "frame";

export const STAGE_ORDER: readonly WorldStage[] = [
  "shell",
  "chunk",
  "context",
  "compiled",
  "frame",
];

export const STAGE_WEIGHT: Record<WorldStage, number> = {
  shell: 8,
  chunk: 38,
  context: 62,
  compiled: 88,
  frame: 100,
};

export const STAGE_LABEL: Record<WorldStage, string> = {
  shell: "CHECKING IN",
  chunk: "BOARDING",
  context: "TAXIING",
  compiled: "TAKING OFF",
  frame: "LANDING IN BRISBANE",
};
