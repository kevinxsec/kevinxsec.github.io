import { createFileRoute } from "@tanstack/react-router";

import { NotFoundPage } from "@/components/NotFoundPage";
import { pageHead } from "@/lib/posts";

// Prerendered and copied to 404.html, which GitHub Pages serves for unknown URLs.
export const Route = createFileRoute("/404")({
  head: () =>
    pageHead({
      title: "Page not found",
      description: "The page you were looking for doesn't exist.",
      path: "/404",
      noindex: true,
    }),
  component: NotFoundPage,
});
