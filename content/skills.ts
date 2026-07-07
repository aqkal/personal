import type { SkillCategory } from "./schemas";

/**
 * Skill categories — each spawns a glowing signpost in the Skills Garden.
 */
export const skills: SkillCategory[] = [
  {
    id: "languages",
    title: "Programming Languages",
    skills: [
      "Python",
      "Java",
      "C",
      "C++",
      "JavaScript",
      "TypeScript",
      "Haskell",
    ],
    world: {
      zone: "garden",
      sprite: "signpost",
      dialog: ["Languages I speak fluently — from Python to Haskell."],
    },
  },
  {
    id: "web",
    title: "Web Development",
    skills: [
      "HTML",
      "CSS",
      "JavaScript",
      "Next.js",
      "REST APIs",
      "WordPress",
      "Supabase",
      "Vercel",
    ],
    world: {
      zone: "garden",
      sprite: "signpost",
      dialog: ["The web garden — where this very site took root."],
    },
  },
  {
    id: "engineering",
    title: "Software Engineering",
    skills: [
      "Data Structures & Algorithms",
      "Object-Oriented Programming",
      "Software Architecture & System Design",
      "Microservices",
      "Software Testing",
      "Debugging",
    ],
    world: {
      zone: "garden",
      sprite: "signpost",
      dialog: ["Engineering fundamentals — the roots under everything else."],
    },
  },
  {
    id: "tools",
    title: "Tools & Technologies",
    skills: [
      "Git",
      "GitHub",
      "Docker",
      "Terraform",
      "Linux",
      "OpenCV",
      "FHIR Healthcare APIs",
      "CI/CD",
      "Agile Workflows",
    ],
    world: {
      zone: "garden",
      sprite: "signpost",
      dialog: ["A well-worn toolbox — Git, Docker, Terraform, and friends."],
    },
  },
];
