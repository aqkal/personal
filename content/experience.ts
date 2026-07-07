import type { Experience } from "./schemas";

/**
 * Work experience — one entry = one office building in the Career District
 * + one card on /experience + one section on /resume.
 * Newest first. See docs/ADDING_CONTENT.md to add an entry.
 */
export const experience: Experience[] = [
  {
    id: "dsr-branding",
    company: "DSR Branding",
    role: "Web Development Intern",
    location: "Brisbane",
    start: "2025-05",
    end: null,
    summary:
      "Building and shipping responsive, production-ready client websites with custom WordPress themes built from the ground up.",
    highlights: [
      "Designed and developed responsive client websites using modern web technologies, ensuring cross-device compatibility.",
      "Built and customized website layouts, pages, and user interfaces to meet client requirements.",
      "Developed custom WordPress themes from the ground up to match client branding.",
      "Collaborated with the design team to implement new features and improve user experience.",
      "Built and deployed production-ready websites tailored to client needs.",
    ],
    tech: ["WordPress", "PHP", "JavaScript", "HTML", "CSS"],
    world: {
      zone: "career",
      sprite: "office",
      dialog: [
        "DSR Branding — my current internship!",
        "Inside, I craft custom WordPress themes and pixel-perfect client sites.",
      ],
    },
  },
  {
    id: "bucklerx",
    company: "BucklerX",
    role: "Software Development Intern",
    team: "Application Development Department",
    start: "2024-10",
    end: "2025-01",
    summary:
      "Developed and tested mobile and web applications for secure community management solutions.",
    highlights: [
      "Contributed to the development and testing of mobile and web applications for secure community management solutions.",
      "Supported debugging, bug tracking, and troubleshooting to improve application reliability and performance.",
      "Conducted user feedback and data analysis to identify usability improvements and system enhancements.",
      "Collaborated with the development team on feature enhancement and product improvement initiatives.",
      "Improved application performance and user experience through systematic testing and technical support.",
    ],
    tech: ["Mobile", "Web", "Testing", "Debugging", "Data Analysis"],
    world: {
      zone: "career",
      sprite: "office",
      dialog: [
        "BucklerX — where I cut my teeth on real-world software.",
        "Debugging, testing, and shipping secure community management apps.",
      ],
    },
  },
];
