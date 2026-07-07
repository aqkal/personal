import { certifications as rawCertifications } from "./certifications";
import { education as rawEducation } from "./education";
import { experience as rawExperience } from "./experience";
import { profile as rawProfile } from "./profile";
import { projects as rawProjects } from "./projects";
import {
  certificationSchema,
  educationSchema,
  experienceSchema,
  profileSchema,
  projectSchema,
  skillCategorySchema,
} from "./schemas";
import { skills as rawSkills } from "./skills";

/**
 * Validated content — ALWAYS import from "@content" (this barrel), never from
 * the raw files. Zod parses everything at module init, so an invalid entry
 * fails the build/dev render immediately with a precise error instead of
 * silently rendering broken pages or a broken game world.
 */
export const profile = profileSchema.parse(rawProfile);
export const experience = rawExperience.map((e) => experienceSchema.parse(e));
export const projects = rawProjects.map((p) => projectSchema.parse(p));
export const education = rawEducation.map((e) => educationSchema.parse(e));
export const skills = rawSkills.map((s) => skillCategorySchema.parse(s));
export const certifications = rawCertifications.map((c) =>
  certificationSchema.parse(c),
);

export type {
  Certification,
  Education,
  Experience,
  Profile,
  Project,
  SkillCategory,
  WorldMeta,
  ZoneId,
} from "./schemas";
