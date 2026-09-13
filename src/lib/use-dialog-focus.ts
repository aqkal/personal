"use client";

import { useEffect, type RefObject } from "react";

/** Keep keyboard navigation inside a modal and restore its invoking control. */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.focus({ preventScroll: true });
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = [
        ...dialog.querySelectorAll<HTMLElement>(
          'a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]',
        ),
      ].filter((el) =>
        el.tabIndex >= 0 &&
        !el.hasAttribute("disabled") &&
        !el.closest("fieldset:disabled") &&
        el.getClientRects().length > 0 &&
        getComputedStyle(el).visibility !== "hidden",
      );
      const first = items[0];
      const last = items.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault(); first.focus();
      }
    };
    dialog.addEventListener("keydown", trap);
    return () => {
      dialog.removeEventListener("keydown", trap);
      if (previous?.isConnected && !previous.closest("[inert],[aria-hidden='true']")) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [ref, open]);
}
