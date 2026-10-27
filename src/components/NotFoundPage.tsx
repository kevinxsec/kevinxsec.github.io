import { Link } from "@tanstack/react-router";

import { posts } from "@/lib/posts";

export function NotFoundPage() {
  return (
    <div className="container-narrow pt-20">
      <p className="eyebrow mb-3">404</p>
      <h1 className="text-2xl font-semibold text-accent">
        This page doesn't exist.
      </h1>
      <p className="mt-4 text-muted-foreground">
        The link may be old, or the article may have moved. Try the archive or search.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/" className="btn-primary">
          Back to home
        </Link>
        <Link to="/blog/" className="btn-ghost">
          Browse the blog
        </Link>
        <Link to="/search/" className="btn-ghost">
          Search
        </Link>
      </div>
      {posts.length > 0 && (
        <div className="mt-16">
          <h2 className="eyebrow mb-3">Recent articles</h2>
          <ul className="space-y-2">
            {posts.slice(0, 3).map((p) => (
              <li key={p.slug}>
                <Link to="/blog/$slug/" params={{ slug: p.slug }} className="link-accent">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
