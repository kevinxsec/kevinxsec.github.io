import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { PostList, PostMetaLine } from "@/components/PostList";
import { allCategories, categoryLabel, pageHead, posts, SITE } from "@/lib/posts";

export const Route = createFileRoute("/")({
  head: () => {
    const h = pageHead({ title: SITE.title, description: SITE.description, path: "/" });
    return {
      ...h,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE.title,
            url: SITE.url + "/",
          }),
        },
      ],
    };
  },
  component: Home,
});

function Home() {
  const featured = posts.filter((p) => p.featured).slice(0, 3);
  const latest = posts.slice(0, 6);
  return (
    <div className="container-wide">
      <section className="grid gap-10 pb-12 pt-12 lg:grid-cols-[1fr_16rem]">
        <div>
          <p className="eyebrow mb-4">{SITE.tagline}</p>
          <h1 className="text-2xl font-semibold text-accent">~/kevinxsec</h1>
          <p className="mt-4 max-w-[64ch] text-muted-foreground">{SITE.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/blog/" className="btn-primary">
              Read the blog <ArrowRight size={16} />
            </Link>
            <Link to="/about/" className="btn-ghost">
              About me
            </Link>
            <a href={SITE.github} className="btn-ghost" target="_blank" rel="me noopener">
              GitHub
            </a>
          </div>
        </div>
        <aside aria-label="Browse by topic" className="lg:border-l lg:border-border lg:pl-8">
          <h2 className="eyebrow mb-3">Topics</h2>
          <ul className="space-y-1.5">
            {allCategories().map(([c, n]) => (
              <li key={c} className="flex justify-between gap-4">
                <Link to="/categories/$category/" params={{ category: c }} className="link-accent">
                  {categoryLabel(c)}
                </Link>
                <span className="font-mono text-sm text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      {featured.length > 0 && (
        <section aria-labelledby="featured" className="border-t border-border py-12">
          <h2 id="featured" className="eyebrow mb-6">
            Featured
          </h2>
          <div className="grid gap-10 md:grid-cols-3">
            {featured.map((p) => (
              <article key={p.slug}>
                <PostMetaLine post={p} />
                <h3 className="mt-2 font-medium leading-snug">
                  <Link to="/blog/$slug/" params={{ slug: p.slug }} className="post-title-link">
                    {p.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="latest" className="border-t border-border pt-12">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="latest" className="eyebrow">
            Latest writing
          </h2>
          <Link to="/blog/" className="link-accent text-sm">
            All articles →
          </Link>
        </div>
        <PostList posts={latest} />
      </section>
    </div>
  );
}
