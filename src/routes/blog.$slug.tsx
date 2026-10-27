import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState, type MouseEvent } from "react";

import { NotFoundPage } from "@/components/NotFoundPage";
import { PostMetaLine, TagLink } from "@/components/PostList";
import { absUrl, getPost, pageHead, postsBySlug, SITE, type Post } from "@/lib/posts";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData)
      return pageHead({
        title: "Article not found",
        description: "Unavailable",
        path: `/blog/${params.slug}`,
        noindex: true,
      });
    const p = loaderData;
    const h = pageHead({
      title: p.title,
      description: p.description,
      path: `/blog/${p.slug}`,
      type: "article",
    });
    return {
      ...h,
      meta: [
        ...h.meta,
        { property: "article:published_time", content: p.date },
        ...(p.updated ? [{ property: "article:modified_time", content: p.updated }] : []),
        ...p.tags.map((t) => ({ property: "article:tag", content: t })),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: p.title,
            description: p.description,
            datePublished: p.date,
            dateModified: p.updated ?? p.date,
            author: { "@type": "Person", name: SITE.author, url: SITE.url + "/" },
            mainEntityOfPage: absUrl(`/blog/${p.slug}`),
            keywords: p.tags.join(", "),
          }),
        },
      ],
    };
  },
  component: Article,
  notFoundComponent: NotFoundPage,
});

/** Copy buttons are rendered into the HTML at build time; one delegated handler drives them. */
function onArticleClick(e: MouseEvent<HTMLDivElement>) {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-copy]");
  if (!btn) return;
  const code = btn.closest(".code-block")?.querySelector("pre")?.innerText ?? "";
  const done = (label: string) => {
    btn.textContent = label;
    window.setTimeout(() => (btn.textContent = "Copy"), 1600);
  };
  if (!navigator.clipboard) return done("Failed");
  navigator.clipboard.writeText(code).then(
    () => done("Copied"),
    () => done("Failed"),
  );
}

function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [ids]);
  return active;
}

function Toc({ toc, active }: { toc: Post["toc"]; active: string | null }) {
  return (
    <ol className="space-y-1.5 text-sm">
      {toc.map((h) => (
        <li key={h.id} className={h.depth === 3 ? "pl-4" : ""}>
          <a
            href={`#${h.id}`}
            className="toc-link"
            aria-current={active === h.id ? "location" : undefined}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

function Article() {
  const post = Route.useLoaderData();
  const active = useActiveHeading(post.toc.map((t) => t.id));
  const related = post.related.map((s) => postsBySlug.get(s)).filter((p) => !!p);
  const hasToc = post.toc.length > 1;

  return (
    <article className="container-wide pt-14">
      <div className="flex justify-center gap-16">
        <header className="min-w-0 max-w-[44rem] flex-1">
          <PostMetaLine post={post} />
          <h1 className="mt-3 text-2xl font-semibold leading-snug">
            {post.title}
          </h1>
          <p className="mt-4 text-muted-foreground">{post.description}</p>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
            {post.tags.map((t) => (
              <TagLink key={t} tag={t} />
            ))}
          </div>
          {post.updated && (
            <p className="mt-3 text-sm text-muted-foreground">Updated {post.updated}</p>
          )}
        </header>
        {hasToc && <div className="hidden w-60 shrink-0 lg:block" aria-hidden />}
      </div>

      <div className="mt-10 flex justify-center gap-16 border-t border-border pt-10">
        <div className="min-w-0 max-w-[44rem] flex-1">
          {hasToc && (
            <details className="toc-mobile mb-8 lg:hidden">
              <summary>On this page</summary>
              <div className="pt-3">
                <Toc toc={post.toc} active={active} />
              </div>
            </details>
          )}
          {/* Trusted HTML: rendered at build time from the repository's own Markdown. */}
          <div
            className="prose-article"
            onClick={onArticleClick}
            dangerouslySetInnerHTML={{ __html: post.html }}
          />

          {(post.prev || post.next) && (
            <nav
              aria-label="More articles"
              className="mt-16 grid gap-6 border-t border-border pt-8 sm:grid-cols-2"
            >
              {post.prev ? (
                <Link to="/blog/$slug/" params={{ slug: post.prev.slug }} className="pager-link">
                  <span className="eyebrow">← Previous</span>
                  <span className="mt-1 block font-display text-lg">{post.prev.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {post.next && (
                <Link
                  to="/blog/$slug/"
                  params={{ slug: post.next.slug }}
                  className="pager-link sm:text-right"
                >
                  <span className="eyebrow">Next →</span>
                  <span className="mt-1 block font-display text-lg">{post.next.title}</span>
                </Link>
              )}
            </nav>
          )}

          {related.length > 0 && (
            <section aria-labelledby="related" className="mt-14">
              <h2 id="related" className="eyebrow mb-4">
                Related articles
              </h2>
              <ul className="space-y-3">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      to="/blog/$slug/"
                      params={{ slug: r.slug }}
                      className="link-accent font-display text-lg"
                    >
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        {hasToc && (
          <aside aria-label="Table of contents" className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-8">
              <p className="eyebrow mb-3">On this page</p>
              <Toc toc={post.toc} active={active} />
            </div>
          </aside>
        )}
      </div>
    </article>
  );
}
