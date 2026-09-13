import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SHORE_ACCESS_GAPS,
  SHORE_RAIL_POSTS,
  SHORE_RAIL_SEGMENTS,
  SHORE_RAIL_STYLE,
} from "../../src/game3d/shore-boundary";

const output = resolve("assets-source/shore-rails-layout.json");
writeFileSync(output, `${JSON.stringify({
  segments: SHORE_RAIL_SEGMENTS,
  posts: SHORE_RAIL_POSTS,
  style: SHORE_RAIL_STYLE,
  gaps: SHORE_ACCESS_GAPS,
}, null, 2)}\n`);
console.log(`Wrote ${output}`);
