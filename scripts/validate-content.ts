/**
 * Validates every content file against its Zod schema.
 * Run: npm run validate:content  (also runs in CI)
 *
 * Importing the barrel triggers schema.parse() on all content; any invalid
 * entry throws a ZodError with the exact path of the offending field.
 */
async function main() {
  const content = await import("../content/index");
  const counts = {
    experience: content.experience.length,
    projects: content.projects.length,
    education: content.education.length,
    skillCategories: content.skills.length,
    certifications: content.certifications.length,
  };
  console.log("✓ All content valid:", JSON.stringify(counts));

  const todo: string[] = [];
  if (content.profile.name === "Your Name") todo.push("profile.name");
  if (content.profile.socials.github.includes("your-username"))
    todo.push("profile.socials.github");
  if (content.profile.socials.linkedin.includes("your-profile"))
    todo.push("profile.socials.linkedin");
  if (todo.length > 0) {
    console.warn(
      `⚠ Placeholders still present in content/profile.ts: ${todo.join(", ")}`,
    );
  }
}

main().catch((err) => {
  console.error("✗ Content validation failed:\n", err);
  process.exit(1);
});
