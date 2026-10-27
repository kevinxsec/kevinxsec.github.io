import { Link } from "@tanstack/react-router";

import { allCategories, categoryLabel, PLATFORM_TAGS, posts, tagLabel } from "@/lib/posts";

/** Filter links: every option is a real, prerendered archive page. */
export function ArchiveFilters() {
  const platforms = PLATFORM_TAGS.filter((t) => posts.some((p) => p.tags.includes(t)));
  return (
    <nav aria-label="Filter articles" className="mb-10 flex flex-wrap items-center gap-2">
      <Link
        to="/blog/"
        className="chip"
        activeOptions={{ exact: true }}
        activeProps={{ "aria-current": "page" }}
      >
        All
      </Link>
      {allCategories().map(([c]) => (
        <Link
          key={c}
          to="/categories/$category/"
          params={{ category: c }}
          className="chip"
          activeProps={{ "aria-current": "page" }}
        >
          {categoryLabel(c)}
        </Link>
      ))}
      {platforms.length > 0 && <span className="mx-1 h-5 w-px bg-border" aria-hidden />}
      {platforms.map((t) => (
        <Link
          key={t}
          to="/tags/$tag/"
          params={{ tag: t }}
          className="chip"
          activeProps={{ "aria-current": "page" }}
        >
          {tagLabel(t)}
        </Link>
      ))}
    </nav>
  );
}
