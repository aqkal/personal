import type { SkillCategory } from "./schemas";

/**
 * Skill categories - each spawns a glowing signpost in the Skills Garden.
 */
export const skills: SkillCategory[] = [
  {
    id: "languages",
    title: "Languages",
    skills: [
      "TypeScript",
      "JavaScript",
      "Python",
      "Java",
      "C",
      "C++",
      "Haskell",
    ],
    world: {
      zone: "garden",
      sprite: "signpost",
      dialog: ["Languages I speak fluently - from Python to Haskell."],
    },
  },
  {
    id: "web",
    title: "Web & Databases",
    skills: [
      "React",
      "Next.js",
      "HTML",
      "CSS",
      "REST APIs",
      "PostgreSQL",
      "Supabase",
      "WordPress",
      "FHIR Healthcare APIs",
    ],
    world: {
      zone: "garden",
      sprite: "signpost",
      dialog: ["The web garden - where this very site took root."],
    },
  },
  {
    id: "engineering",
    title: "AI & Computer Vision",
    skills: [
      "Retrieval-Augmented Generation (RAG)",
      "pgvector",
      "OpenCV",
    ],
    world: {
      zone: "garden",
      sprite: "signpost",
      dialog: ["From course-material retrieval to computer vision for ship hulls."],
    },
  },
  {
    id: "tools",
    title: "Engineering & Tools",
    skills: [
      "Git",
      "GitHub",
      "Docker",
      "Terraform",
      "Vercel",
      "Linux",
      "Playwright",
      "CI/CD",
      "Data Structures & Algorithms",
      "Object-Oriented Programming",
      "Software Architecture & System Design",
      "Microservices",
      "Software Testing",
      "Debugging",
      "Agile Workflows",
    ],
    world: {
      zone: "garden",
      sprite: "signpost",
      dialog: ["A well-worn toolbox - Git, Docker, Terraform, and friends."],
    },
  },
];
