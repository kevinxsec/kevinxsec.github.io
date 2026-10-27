import { createFileRoute, Link } from "@tanstack/react-router";

import { PageIntro } from "@/components/PostList";
import { allCategories, CATEGORIES, categoryLabel, pageHead } from "@/lib/posts";

export const Route = createFileRoute("/categories/")({
  head: () =>
    pageHead({
      title: "Categories",
      description:
        "Browse articles by category: writeups, research, tutorials, projects and notes.",
      path: "/categories",
    }),
  component: Categories,
});

function Categories() {
  return (
    <div className="container-wide">
      <PageIntro eyebrow="Archive" title="Categories" />
      <ul className="divide-y divide-border border-y border-border">
        {allCategories().map(([c, n]) => (
          <li
            key={c}
            className="grid gap-1 py-6 sm:grid-cols-[14rem_1fr_auto] sm:items-baseline sm:gap-6"
          >
            <Link
              to="/categories/$category/"
              params={{ category: c }}
              className="text-lg font-medium post-title-link"
            >
              {categoryLabel(c)}
            </Link>
            <p className="text-muted-foreground">{CATEGORIES[c]?.blurb}</p>
            <span className="font-mono text-sm text-muted-foreground">
              {n} {n === 1 ? "article" : "articles"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
