import { createFileRoute } from "@tanstack/react-router";

import { PageIntro } from "@/components/PostList";
import { pageHead } from "@/lib/posts";

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead({
      title: "About",
      description:
        "Who, what and why: a place for security notes, writeups, articles and tutorials.",
      path: "/about",
    }),
  component: About,
});

function About() {
  return (
    <div className="container-narrow">
      <PageIntro title="About" />
      <div className="prose-article">
        <h2>Who?</h2>
        <p>Security guy and stinky nerd.</p>
        <p>Knowing stuff is cool.</p>
        <h2>What?</h2>
        <p>
          A place where I’ll keep notes, writeups, articles and tutorials. This serves as an easy
          way for me to access this information from anywhere, without relying on services like
          SubStack or Medium as I previously did.
        </p>
        <p>
          Recent posts will appear below, these will consist of security research blogs, analysis
          and tutorials. The notes page holds all of my documentation from TryHackMe
          certifications and any other training courses I may do. None of this information is
          directly referencing any exam material, only study notes I used before and during the
          tests.
        </p>
        <h2>Why?</h2>
        <p>
          The goal of this site is both to help me understand a bit more about development, and to
          encourage myself to continue researching and learning. If this can help others along the
          way, that’s great.
        </p>
      </div>
    </div>
  );
}
