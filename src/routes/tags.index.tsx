import { createFileRoute, Link } from "@tanstack/react-router";

import { PageIntro } from "@/components/PostList";
import { allTags, pageHead, tagLabel } from "@/lib/posts";

export const Route = createFileRoute("/tags/")({
  head: () =>
    pageHead({
      title: "Tags",
      description:
        "Every topic tag used across the blog, from platforms like HTB to techniques and tools.",
      path: "/tags",
    }),
  component: Tags,
});

function Tags() {
  return (
    <div className="container-wide">
      <PageIntro eyebrow="Archive" title="Tags" />
      <ul className="flex flex-wrap gap-x-6 gap-y-3">
        {allTags().map(([t, n]) => (
          <li key={t}>
            <Link to="/tags/$tag/" params={{ tag: t }} className="link-accent text-lg">
              {tagLabel(t)}
            </Link>{" "}
            <span className="font-mono text-sm text-muted-foreground">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
