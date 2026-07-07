"use client";

import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import { gameBus } from "@/game/bus";
import { INTERACTABLES, type WorldInteractable } from "./layout";
import { activeTarget, playerPos, runtime } from "./state";
import type { ControlName } from "./player";

/**
 * Proximity system: shows a hint chip for the nearest interactable and opens
 * its panel on E/Enter/Space or the mobile interact button.
 */
export function Interactions() {
  const current = useRef<WorldInteractable | null>(null);
  const [subscribeKeys] = useKeyboardControls<ControlName>();

  const tryInteract = useCallback(() => {
    if (runtime.paused || !current.current?.payload) return;
    gameBus.emit("panel:open", current.current.payload);
  }, []);

  useEffect(() => {
    gameBus.on("input:interact", tryInteract);
    const unsub = subscribeKeys(
      (s) => s.interact,
      (pressed) => {
        if (pressed) tryInteract();
      },
    );
    return () => {
      gameBus.off("input:interact", tryInteract);
      unsub();
    };
  }, [subscribeKeys, tryInteract]);

  useFrame(() => {
    if (runtime.paused) return;
    let nearest: WorldInteractable | null = null;
    let best = Infinity;
    for (const item of INTERACTABLES) {
      const dx = item.x - playerPos.x;
      const dz = item.z - playerPos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < item.radius * item.radius && d2 < best) {
        best = d2;
        nearest = item;
      }
    }
    if (nearest !== current.current) {
      current.current = nearest;
      if (nearest) {
        activeTarget.x = nearest.x;
        activeTarget.z = nearest.z;
        activeTarget.active = nearest.payload !== null;
        gameBus.emit("hint:show", {
          label: nearest.payload ? `[E] ${nearest.hint}` : nearest.hint,
        });
      } else {
        activeTarget.active = false;
        gameBus.emit("hint:hide");
      }
    }
  });

  return null;
}
