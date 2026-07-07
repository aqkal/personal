import Phaser from "phaser";
import { WorldScene } from "./scenes/world-scene";

/**
 * Boots the Phaser game into `parent`. This module (and Phaser itself) is
 * only ever loaded via dynamic import after the visitor chooses Game mode —
 * it must never end up in the initial bundle.
 */
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#070b14",
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: "100%",
      height: "100%",
    },
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
    input: {
      activePointers: 3, // multi-touch: joystick + interact button
    },
    scene: [WorldScene],
  });
}
