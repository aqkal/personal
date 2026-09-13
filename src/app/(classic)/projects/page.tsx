import { permanentRedirect } from "next/navigation";

// Folded into the one-pager (Projects section); case studies keep their URLs.
export default function ProjectsIndexPage() {
  permanentRedirect("/?view=portfolio#projects");
}
