export type InterfaceMode = "game" | "portfolio";

export const INTERFACE_KEY = "interface";

/** Persist which of the two interfaces "/" should open. */
export function setStoredInterface(mode: InterfaceMode) {
  try {
    localStorage.setItem(INTERFACE_KEY, mode);
  } catch {}
}
