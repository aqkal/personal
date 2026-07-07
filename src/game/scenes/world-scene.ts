import Phaser from "phaser";
import { gameBus } from "../bus";
import { generateBaseTextures, T, TILE } from "../textures";
import {
  buildWorld,
  MAP_H,
  MAP_W,
  PLAYER_SPAWN,
  type WorldData,
} from "../world/map-data";

const PLAYER_SPEED = 95;

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private world!: WorldData;
  private waterFrame = 0;
  private facing: "down" | "up" | "left" | "right" = "down";
  private paused = false;
  /** Virtual joystick vector, set by the React HUD on touch devices. */
  public joystick = { x: 0, y: 0 };

  constructor() {
    super("world");
  }

  create() {
    generateBaseTextures(this);
    this.world = buildWorld();

    // --- terrain ---
    const map = this.make.tilemap({
      data: this.world.terrain,
      tileWidth: TILE,
      tileHeight: TILE,
    });
    const tileset = map.addTilesetImage("tiles", "tiles", TILE, TILE, 0, 0);
    if (!tileset) throw new Error("tileset failed to load");
    const ground = map.createLayer(0, tileset, 0, 0);
    if (!(ground instanceof Phaser.Tilemaps.TilemapLayer)) {
      throw new Error("ground layer failed");
    }
    this.groundLayer = ground;
    ground.setCollision([T.WATER_A, T.WATER_B]);

    // --- water animation (precomputed tile list, cheap flip) ---
    this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => this.animateWater(),
    });

    // --- trees (static bodies, depth-sorted) ---
    const trees = this.physics.add.staticGroup();
    for (const t of this.world.trees) {
      const tree = trees.create(t.x, t.y, "tree") as Phaser.Physics.Arcade.Sprite;
      tree.setOrigin(0.5, 1);
      tree.setDepth(t.y);
      // collide only with the trunk area
      tree.body?.setSize(10, 8);
      (tree.body as Phaser.Physics.Arcade.StaticBody).setOffset(5, 18);
      (tree.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    }

    // --- player ---
    this.player = this.physics.add.sprite(
      PLAYER_SPAWN.x,
      PLAYER_SPAWN.y,
      "player",
      "down-1",
    );
    this.player.setOrigin(0.5, 1);
    this.player.body!.setSize(10, 6);
    this.player.body!.setOffset(3, 14);
    this.player.setCollideWorldBounds(true);

    this.createPlayerAnims();

    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, trees);

    // --- camera ---
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    cam.startFollow(this.player, true, 0.12, 0.12);
    this.applyZoom();
    this.scale.on("resize", () => this.applyZoom());
    cam.fadeIn(600, 7, 11, 20);

    // --- input ---
    const kb = this.input.keyboard;
    if (kb) {
      this.cursors = kb.createCursorKeys();
      this.wasd = kb.addKeys("W,A,S,D") as WorldScene["wasd"];
    }

    // --- pause while a React panel is open ---
    gameBus.on("panel:open", this.onPanelOpen);
    gameBus.on("panel:close", this.onPanelClose);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameBus.off("panel:open", this.onPanelOpen);
      gameBus.off("panel:close", this.onPanelClose);
    });

    gameBus.emit("world:ready");
  }

  private onPanelOpen = () => {
    this.paused = true;
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
  };

  private onPanelClose = () => {
    this.paused = false;
  };

  private applyZoom() {
    const w = this.scale.width;
    const zoom = w < 520 ? 2.25 : w < 900 ? 2.75 : 3;
    this.cameras.main.setZoom(zoom);
  }

  private animateWater() {
    this.waterFrame = 1 - this.waterFrame;
    const idx = this.waterFrame === 0 ? T.WATER_A : T.WATER_B;
    for (const { x, y } of this.world.waterTiles) {
      const tile = this.groundLayer.getTileAt(x, y);
      if (tile) tile.index = idx;
    }
  }

  private createPlayerAnims() {
    const mk = (key: string, dir: string) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: [
          { key: "player", frame: `${dir}-0` },
          { key: "player", frame: `${dir}-1` },
          { key: "player", frame: `${dir}-2` },
          { key: "player", frame: `${dir}-1` },
        ],
        frameRate: 8,
        repeat: -1,
      });
    };
    mk("walk-down", "down");
    mk("walk-up", "up");
    mk("walk-right", "right");
  }

  update() {
    if (!this.player || this.paused) return;

    let vx = 0;
    let vy = 0;
    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -1;
      else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -1;
      else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = 1;
    }
    // virtual joystick (mobile) takes over when active
    if (this.joystick.x !== 0 || this.joystick.y !== 0) {
      vx = this.joystick.x;
      vy = this.joystick.y;
    }

    const len = Math.hypot(vx, vy);
    if (len > 0) {
      vx = (vx / len) * PLAYER_SPEED;
      vy = (vy / len) * PLAYER_SPEED;
    }
    this.player.setVelocity(vx, vy);

    // facing + animation
    if (len > 0) {
      if (Math.abs(vx) >= Math.abs(vy)) {
        this.facing = vx > 0 ? "right" : "left";
      } else {
        this.facing = vy > 0 ? "down" : "up";
      }
      const animDir = this.facing === "left" ? "right" : this.facing;
      this.player.setFlipX(this.facing === "left");
      this.player.anims.play(`walk-${animDir}`, true);
    } else {
      this.player.anims.stop();
      const dir = this.facing === "left" ? "right" : this.facing;
      this.player.setFrame(`${dir}-1`);
    }

    // painter's depth sort
    this.player.setDepth(this.player.y);
  }
}
