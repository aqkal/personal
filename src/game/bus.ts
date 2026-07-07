import mitt from "mitt";

/**
 * Typed event bus between the Phaser world and the React overlay UI.
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
  | "snake";

export type PanelPayload = {
  kind: PanelKind;
  /** Content id (e.g. "dsr-branding") - resolved against @content by React. */
  id: string;
  /** RPG dialog lines to type out before showing details. */
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
  /** World scene finished building. */
  "world:ready": undefined;
  /** Mobile HUD interact button pressed. */
  "input:interact": undefined;
  /** Snake cabinet: high score changed (for HUD toast). */
  "snake:score": { score: number; best: number };
};

export const gameBus = mitt<Events>();
