import type { Profile } from "./schemas";

/**
 * TODO(you): This is the ONLY file you must edit to personalize the site.
 * Replace name and social URLs with your real details.
 * Everything (hero, resume, SEO, game intro, terminal) reads from here.
 */
export const profile: Profile = {
  // TODO: your full display name
  name: "Your Name",
  tagline:
    "Software Engineering student at UQ - I build web experiences that feel alive.",
  location: "Brisbane, Australia",
  email: "abdulq0702@gmail.com",
  socials: {
    // TODO: your real profile URLs
    github: "https://github.com/your-username",
    linkedin: "https://www.linkedin.com/in/your-profile",
  },
  availability: "Open to internships and graduate software engineering roles.",
  funFacts: [
    "Maintains a 25% scholarship, every semester",
    "Shipped code with a 20-developer team before graduating",
    "Taught a computer to spot barnacles on ship hulls",
    "Built this site three times: pixels, night, then daylight",
    "Based in Brisbane, jacaranda season enjoyer",
    "Speaks TypeScript, Java, Python, and Haskell (yes, Haskell)",
  ],
  softSkills: [
    "Teamwork & Collaboration",
    "Communication",
    "Problem Solving",
    "Adaptability",
    "Time Management",
    "Attention to Detail",
  ],
};
