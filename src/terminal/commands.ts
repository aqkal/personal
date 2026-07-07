import { education, experience, profile, projects, skills } from "@content";
import {
  allFiles,
  formatPath,
  nodeAt,
  resolvePath,
  type VDir,
} from "./fs";

/**
 * The command registry. Every command is a pure function from (args, cwd)
 * to printable lines plus an optional side-effect action that the Terminal
 * component executes (clear, exit, play, snake, vim, navigation).
 */

export type LineKind = "out" | "accent" | "dim" | "error" | "title";
export type TermLine = { text: string; kind: LineKind };

export type CommandAction =
  | { type: "clear" }
  | { type: "exit" }
  | { type: "play" }
  | { type: "snake" }
  | { type: "vim" }
  | { type: "theme"; name: "green" | "amber" | "paper" }
  | { type: "navigate"; href: string };

export interface CommandResult {
  lines: TermLine[];
  action?: CommandAction;
  newCwd?: string[];
}

const out = (text: string): TermLine => ({ text, kind: "out" });
const dim = (text: string): TermLine => ({ text, kind: "dim" });
const accent = (text: string): TermLine => ({ text, kind: "accent" });
const error = (text: string): TermLine => ({ text, kind: "error" });

function fileLines(content: string): TermLine[] {
  return content.split("\n").map((l) => {
    if (l.startsWith("# ")) return { text: l.slice(2), kind: "title" as const };
    if (l.startsWith("tech:") || l.startsWith("code:")) return accent(l);
    return out(l);
  });
}

const PAGES = ["about", "experience", "projects", "blog", "contact", "resume"];

const NEOFETCH_ART = [
  "    /\\      ",
  "   |==|     ",
  "   |()|     ",
  "   |[]|     ",
  "   |[]|     ",
  "  /|--|\\    ",
  " /_|__|_\\   ",
];

const ASCII_MAP = [
  "        ~ st lucia reach, brisbane ~",
  " +--------------------------------------+",
  " |  [UQ CAMPUS]         [CAREER]        |",
  " |   great court         towers         |",
  " |       |                  |           |",
  " |  [CAFE] ---- (PLAZA) ---- [POST]     |",
  " |   blog       fountain     contact    |",
  " |       |                  |           |",
  " |  [GARDEN]            [ARCADE]        |",
  " |   skills              projects       |",
  " |               |                      |",
  " | ~~~~~~~~~~ [BRIDGE] ~~~~~~~~~~~~~~~  |",
  " |             (lookout)    ~ river ~   |",
  " +--------------------------------------+",
  "        * brisbane cbd across the water",
];

export const COMMAND_NAMES = [
  "help", "ls", "cd", "cat", "tree", "grep", "pwd", "whoami", "neofetch",
  "map", "open", "play", "snake", "theme", "clear", "history", "contact",
  "exit", "sudo", "vim", "rm", "echo",
];

export function execute(
  input: string,
  cwd: string[],
  history: string[],
): CommandResult {
  const trimmed = input.trim();
  if (!trimmed) return { lines: [] };
  const [cmd, ...args] = trimmed.split(/\s+/);
  const arg = args.join(" ");

  switch (cmd) {
    case "help":
      return {
        lines: [
          accent("UQ-OS command reference"),
          out("  ls / cd / cat / tree     browse the resume filesystem"),
          out("  grep <word>              search everything at once"),
          out("  whoami / neofetch        who runs this machine"),
          out("  map                      where everything is"),
          out("  open <page>              jump to a classic page (open projects)"),
          out("  play                     switch to the 3D campus"),
          out("  snake                    the arcade follows you everywhere"),
          out("  theme <green|amber|paper>  change the phosphor"),
          out("  clear / history / exit   housekeeping"),
          dim("  tab completes, arrows recall history. try `cat about.md`"),
        ],
      };

    case "pwd":
      return { lines: [out(formatPath(cwd))] };

    case "ls": {
      const path = resolvePath(cwd, arg || ".");
      const node = path && nodeAt(path);
      if (!node) return { lines: [error(`ls: no such path: ${arg}`)] };
      if (node.type === "file") return { lines: [out(arg)] };
      const entries = Object.entries((node as VDir).children).map(([name, child]) =>
        child.type === "dir" ? accent(`${name}/`) : out(name),
      );
      return { lines: entries.length ? entries : [dim("(empty)")] };
    }

    case "cd": {
      const path = resolvePath(cwd, arg || "");
      const node = path && nodeAt(path);
      if (!node) return { lines: [error(`cd: no such directory: ${arg}`)] };
      if (node.type !== "dir")
        return { lines: [error(`cd: not a directory: ${arg}`)] };
      return { lines: [], newCwd: path };
    }

    case "cat": {
      if (!arg) return { lines: [error("cat: which file? try `ls` first")] };
      const path = resolvePath(cwd, arg);
      const node = path && nodeAt(path);
      if (!node) return { lines: [error(`cat: no such file: ${arg}`)] };
      if (node.type === "dir")
        return { lines: [error(`cat: ${arg} is a directory`)] };
      return { lines: fileLines(node.content) };
    }

    case "tree": {
      const lines: TermLine[] = [accent("~")];
      const walk = (dirNode: VDir, prefix: string) => {
        const entries = Object.entries(dirNode.children);
        entries.forEach(([name, child], i) => {
          const last = i === entries.length - 1;
          const branch = last ? "`-- " : "|-- ";
          lines.push(
            child.type === "dir"
              ? accent(`${prefix}${branch}${name}/`)
              : out(`${prefix}${branch}${name}`),
          );
          if (child.type === "dir") {
            walk(child, prefix + (last ? "    " : "|   "));
          }
        });
      };
      const root = nodeAt([]);
      if (root && root.type === "dir") walk(root, " ");
      return { lines };
    }

    case "grep": {
      if (!arg) return { lines: [error("grep: give me a word to hunt for")] };
      const needle = arg.toLowerCase();
      const hits: TermLine[] = [];
      for (const f of allFiles()) {
        for (const line of f.content.split("\n")) {
          if (line.toLowerCase().includes(needle)) {
            hits.push(accent(`~/${f.path.join("/")}`));
            hits.push(out(`  ${line.trim()}`));
          }
        }
      }
      return {
        lines: hits.length ? hits : [dim(`grep: nothing matches "${arg}"`)],
      };
    }

    case "whoami":
      return {
        lines: [
          accent(profile.name),
          out(profile.tagline),
          dim(profile.availability ?? ""),
        ],
      };

    case "neofetch": {
      const uni = education[0];
      const current = experience.find((e) => e.end === null);
      const langCount = skills.reduce((n, s) => n + s.skills.length, 0);
      const info = [
        `${profile.name}@uq-campus`,
        "-".repeat(Math.min(30, profile.name.length + 10)),
        `OS       : UQ-OS 2.0 (Brisbane)`,
        `Host     : ${uni ? uni.institution : "University of Queensland"}`,
        `Kernel   : software-engineering`,
        `Shell    : uq-sh`,
        `Role     : ${current ? `${current.role} @ ${current.company}` : "Student"}`,
        `Packages : ${projects.length} projects, ${langCount} skills`,
        `Scholar  : 25% scholarship, every semester`,
        `Contact  : ${profile.email}`,
      ];
      const lines: TermLine[] = [];
      const rows = Math.max(NEOFETCH_ART.length, info.length);
      for (let i = 0; i < rows; i++) {
        const art = NEOFETCH_ART[i] ?? " ".repeat(12);
        lines.push({
          text: `${art}${info[i] ?? ""}`,
          kind: i === 0 ? "accent" : "out",
        });
      }
      return { lines };
    }

    case "map":
      return {
        lines: [
          ...ASCII_MAP.map((l) => out(l)),
          dim("run `play` to walk it in 3D"),
        ],
      };

    case "open": {
      const page = arg.replace(/^\//, "").toLowerCase();
      if (!PAGES.includes(page)) {
        return {
          lines: [error(`open: unknown page "${arg}". pages: ${PAGES.join(", ")}`)],
        };
      }
      return {
        lines: [dim(`opening /${page} ...`)],
        action: { type: "navigate", href: `/${page}` },
      };
    }

    case "play":
      return {
        lines: [accent("switching interface: game world loading ...")],
        action: { type: "play" },
      };

    case "snake":
      return {
        lines: [accent("SNAKE '84 found a serial port. Q quits.")],
        action: { type: "snake" },
      };

    case "contact": {
      const node = nodeAt(["contact.txt"]);
      return {
        lines: node && node.type === "file" ? fileLines(node.content) : [],
      };
    }

    case "theme": {
      const name = arg.toLowerCase();
      if (name !== "green" && name !== "amber" && name !== "paper") {
        return { lines: [error("theme: pick one of green, amber, paper")] };
      }
      return {
        lines: [dim(`phosphor set to ${name}`)],
        action: { type: "theme", name },
      };
    }

    case "history":
      return { lines: history.map((h, i) => dim(`${String(i + 1).padStart(3)}  ${h}`)) };

    case "clear":
      return { lines: [], action: { type: "clear" } };

    case "exit":
      return {
        lines: [dim("logging out ...")],
        action: { type: "exit" },
      };

    case "vim":
      return { lines: [], action: { type: "vim" } };

    case "sudo":
      return {
        lines: [
          error(`${profile.name.split(" ")[0].toLowerCase()} is not in the sudoers file.`),
          dim("this incident will be reported (to the careers page)."),
        ],
      };

    case "rm":
      if (args.includes("-rf") && (args.includes("/") || args.includes("/*"))) {
        return {
          lines: [
            error("removing /experience ... just kidding."),
            out("the resume is version controlled. nice try though."),
          ],
        };
      }
      return { lines: [error("rm: this filesystem is read-only (it is a resume)")] };

    case "echo":
      return { lines: [out(arg)] };

    default:
      return {
        lines: [
          error(`uq-sh: command not found: ${cmd}`),
          dim("type `help` for the command list"),
        ],
      };
  }
}

/** Tab-completion candidates for the current input. */
export function complete(input: string, cwd: string[]): string[] {
  const parts = input.split(/\s+/);
  if (parts.length <= 1) {
    return COMMAND_NAMES.filter((c) => c.startsWith(parts[0] ?? ""));
  }
  const last = parts[parts.length - 1];
  const slash = last.lastIndexOf("/");
  const dirPart = slash >= 0 ? last.slice(0, slash + 1) : "";
  const stem = slash >= 0 ? last.slice(slash + 1) : last;
  const dirPath = resolvePath(cwd, dirPart || ".");
  const node = dirPath && nodeAt(dirPath);
  if (!node || node.type !== "dir") return [];
  return Object.entries(node.children)
    .filter(([name]) => name.startsWith(stem))
    .map(([name, child]) =>
      `${dirPart}${name}${child.type === "dir" ? "/" : ""}`,
    );
}
