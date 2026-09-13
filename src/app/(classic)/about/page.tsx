import { permanentRedirect } from "next/navigation";

// Folded into the one-pager (About section); the site has two modes now.
export default function AboutPage() {
  permanentRedirect("/?view=portfolio#about");
}
