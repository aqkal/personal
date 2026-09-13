import sharp from "sharp";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const names = ["Idle", "WalkA", "WalkB", "RunA", "RunB", "Jump", "Land", "TurnLeft", "TurnRight", "Wave", "Seated", "Driver"];
const width = 440;
const height = 560;
const tiles = await Promise.all(names.map(async (name, index) => ({
  input: await sharp(path.join(root, "assets-source", "character-clips", `${name}.png`))
    .extend({ bottom: 40, background: "#231c2c" })
    .composite([{ input: Buffer.from(`<svg width="${width}" height="40"><text x="220" y="28" text-anchor="middle" font-family="Arial" font-size="22" fill="#f3dfae">${name}</text></svg>`), top: 520, left: 0 }])
    .png().toBuffer(),
  left: (index % 4) * width,
  top: Math.floor(index / 4) * height,
})));

await sharp({ create: { width: width * 4, height: height * 3, channels: 4, background: "#231c2c" } })
  .composite(tiles)
  .png()
  .toFile(path.join(root, "assets-source", "character-review.png"));
