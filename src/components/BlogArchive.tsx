import { Link } from "@tanstack/react-router";

import { ArchiveFilters } from "@/components/ArchiveFilters";
import { PageIntro, PostList } from "@/components/PostList";
import { PAGE_SIZE, posts } from "@/lib/posts";

export const pageCount = () => Math.max(1, Math.ceil(posts.length / PAGE_SIZE));

export function BlogArchive({ page }: { page: number }) {
  const total = pageCount();
  const slice = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <div className="container-wide">
      <PageIntro eyebrow={`${posts.length} articles`} title="Blog">
        Writeups, research, tutorials and notes, newest first.
      </PageIntro>
      <ArchiveFilters />
      <PostList posts={slice} />
      {total > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-12 flex items-center justify-between border-t border-border pt-6 text-sm"
        >
          {page > 1 ? (
            page === 2 ? (
              <Link to="/blog/" className="link-accent">
                ← Newer
              </Link>
            ) : (
              <Link
                to="/blog/page/$page/"
                params={{ page: String(page - 1) }}
                className="link-accent"
              >
                ← Newer
              </Link>
            )
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {page} of {total}
          </span>
          {page < total ? (
            <Link
              to="/blog/page/$page/"
              params={{ page: String(page + 1) }}
              className="link-accent"
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
