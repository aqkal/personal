import { permanentRedirect } from "next/navigation";

// Folded into the one-pager (Experience section); full detail lives on /resume.
export default function ExperiencePage() {
  permanentRedirect("/?view=portfolio#experience");
}
