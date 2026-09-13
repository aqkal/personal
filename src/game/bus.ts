import mitt from "mitt";
import type { WorldStage } from "./progress";
import type { AudioMix } from "./audio-settings";

/**
 * Typed event bus between the Three.js world and the React overlay UI.
 * Frame-level data NEVER crosses this bus - only discrete UI events, so the
 * React tree re-renders only when a panel actually opens/closes.
 */
export type PanelKind =
  | "experience"
  | "project"
  | "education"
  | "skills"
  | "blog"
  | "contact"
  | "landmark"
  | "snake";

export type PanelPayload = {
  kind: PanelKind;
  /** Content id (e.g. "dsr-branding") - resolved against @content by React. */
  id: string;
  /** Short introduction displayed above the entry details. */
  dialog: string[];
  /** Zone/entry title for the dialog header. */
  title: string;
};

type Events = {
  /** Player interacted with a world object -> React opens the panel. */
  "panel:open": PanelPayload;
  /** React closed the panel -> world resumes. */
  "panel:close": undefined;
  /** Player stepped on/off an interactable -> HUD hint. */
  "hint:show": { label: string };
  "hint:hide": undefined;
  /** World boot progress: drives the boarding-pass loading screen. */
  "world:progress": { stage: WorldStage };
  "world:error": undefined;
  /** Mobile HUD interact button pressed. */
  "input:interact": undefined;
  "travel:change": { mode: "walking" | "driving" | "scooter" | "ferry"; label?: string };
  /** Only drift start/end transitions cross into the HUD, never frame telemetry. */
  "travel:drift": { active: boolean };
  "travel:request": { id: string };
  "travel:complete": { id: string; success: boolean };
  "ferry:skip": undefined;
  "audio:change": { enabled: boolean };
  "audio:state": { enabled: boolean; unavailable?: boolean };
  "audio:mix": AudioMix;
  "exhibit:change": { id: string | null; step: number };
  "navigation:select": { id: string };
  "navigation:change": { id: string | null; arrived: boolean; failed?: boolean };
  "campus:visit": { id: string };
  /** Snake cabinet: high score changed (for HUD toast). */
  "snake:score": { score: number; best: number };
};

export const gameBus = mitt<Events>();
