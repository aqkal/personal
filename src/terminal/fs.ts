import {
  certifications,
  education,
  experience,
  profile,
  projects,
  skills,
} from "@content";
import { formatRange } from "@/lib/dates";

/**
 * The terminal's virtual filesystem, generated from the same content model
 * that builds the 3D world and the classic pages. Add an entry to
 * content/*.ts and it appears here as a file, no terminal changes needed.
 */

export type VFile = { type: "file"; content: string };
export type VDir = { type: "dir"; children: Record<string, VNode> };
export type VNode = VFile | VDir;

const file = (content: string): VFile => ({ type: "file", content });
const dir = (children: Record<string, VNode>): VDir => ({ type: "dir", children });

function bullets(items: readonly string[]): string {
  return items.map((h) => `  * ${h}`).join("\n");
}

const aboutFile = file(
  [
    `# ${profile.name}`,
    profile.tagline,
    "",
    `location : ${profile.location}`,
    `email    : ${profile.email}`,
    `github   : ${profile.socials.github}`,
    `linkedin : ${profile.socials.linkedin}`,
    "",
    profile.availability ?? "",
    "",
    "soft skills:",
    bullets(profile.softSkills),
  ].join("\n"),
);

const experienceDir = dir(
  Object.fromEntries(
    experience.map((e) => [
      `${e.id}.md`,
      file(
        [
          `# ${e.company} - ${e.role}`,
          `${formatRange(e.start, e.end)}${e.location ? ` | ${e.location}` : ""}${e.team ? ` | ${e.team}` : ""}`,
          "",
          e.summary,
          "",
          bullets(e.highlights),
          "",
          `tech: ${e.tech.join(", ")}`,
        ].join("\n"),
      ),
    ]),
  ),
);

const projectsDir = dir(
  Object.fromEntries(
    projects.map((p) => [
      `${p.id}.md`,
      file(
        [
          `# ${p.name} (${p.year})`,
          p.tagline,
          `${p.context}`,
          "",
          p.description,
          "",
          bullets(p.highlights),
          "",
          `tech: ${p.tech.join(", ")}`,
          p.links?.github ? `code: ${p.links.github}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ]),
  ),
);

const skillsDir = dir(
  Object.fromEntries(
    skills.map((s) => [
      `${s.id}.txt`,
      file(`# ${s.title}\n${bullets(s.skills)}`),
    ]),
  ),
);

const educationDir = dir(
  Object.fromEntries(
    education.map((e) => [
      `${e.id}.md`,
      file(
        [
          `# ${e.institution}`,
          e.degree,
          `${formatRange(e.start, e.end)}${e.location ? ` | ${e.location}` : ""}`,
          "",
          bullets(e.highlights),
        ].join("\n"),
      ),
    ]),
  ),
);

const certsFile = file(
  certifications
    .map((c) => `* ${c.name}${c.description ? `\n    ${c.description}` : ""}`)
    .join("\n"),
);

export const FS_ROOT: VDir = dir({
  "about.md": aboutFile,
  experience: experienceDir,
  projects: projectsDir,
  skills: skillsDir,
  education: educationDir,
  "certifications.txt": certsFile,
  blog: dir({
    "README.md": file(
      "Posts are served fresh at /blog (they are MDX, too rich for this tty).\nRun `open blog` to read them.",
    ),
  }),
  "contact.txt": file(
    [
      "Fastest ways to reach me:",
      "",
      `  email    : ${profile.email}`,
      `  github   : ${profile.socials.github}`,
      `  linkedin : ${profile.socials.linkedin}`,
      "",
      "Or run `open contact` for the message form (captcha-protected).",
    ].join("\n"),
  ),
});

/** Normalize a path string against a cwd, resolving ., .., ~ and /. */
export function resolvePath(cwd: string[], input: string): string[] | null {
  const parts = input.trim() === "" ? [] : input.trim().split("/");
  const stack: string[] =
    input.startsWith("/") || input.startsWith("~") ? [] : [...cwd];
  for (const part of parts) {
    if (part === "" || part === "." || part === "~") continue;
    if (part === "..") {
      if (stack.length === 0) return null;
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack;
}

export function nodeAt(path: string[]): VNode | null {
  let node: VNode = FS_ROOT;
  for (const part of path) {
    if (node.type !== "dir") return null;
    const next: VNode | undefined = node.children[part];
    if (!next) return null;
    node = next;
  }
  return node;
}

export function formatPath(path: string[]): string {
  return `~/${path.join("/")}`.replace(/\/$/, "") || "~";
}

/** All file paths, for grep and tab completion. */
export function allFiles(): Array<{ path: string[]; content: string }> {
  const out: Array<{ path: string[]; content: string }> = [];
  const walk = (node: VNode, path: string[]) => {
    if (node.type === "file") {
      out.push({ path, content: node.content });
    } else {
      for (const [name, child] of Object.entries(node.children)) {
        walk(child, [...path, name]);
      }
    }
  };
  walk(FS_ROOT, []);
  return out;
}
