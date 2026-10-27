import { createFileRoute } from "@tanstack/react-router";

import { BlogArchive } from "@/components/BlogArchive";
import { pageHead } from "@/lib/posts";

export const Route = createFileRoute("/blog/")({
  head: () =>
    pageHead({
      title: "Blog",
      description:
        "Every article: HTB, TryHackMe and OffSec writeups, security research, tutorials and notes.",
      path: "/blog",
    }),
  component: () => <BlogArchive page={1} />,
});
