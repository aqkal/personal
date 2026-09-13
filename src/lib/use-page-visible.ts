"use client";

import { useSyncExternalStore } from "react";

const subscribe = (change: () => void) => {
  document.addEventListener("visibilitychange", change);
  return () => document.removeEventListener("visibilitychange", change);
};

/** Stop graphics work while another tab is in front. */
export function usePageVisible() {
  return useSyncExternalStore(subscribe, () => !document.hidden, () => true);
}
