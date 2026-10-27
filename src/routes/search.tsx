import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import MiniSearch from "minisearch";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageIntro } from "@/components/PostList";
import { formatDate, pageHead, tagLabel } from "@/lib/posts";

type Doc = {
  id: string;
  title: string;
  description: string;
  category: string;
  platform: string;
  tags: string;
  date: string;
  text: string;
};

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {},
  head: () =>
    pageHead({
      title: "Search",
      description: "Search every article by title, content, category and tag.",
      path: "/search",
    }),
  component: SearchPage,
});

function snippet(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  const hit = terms
    .map((t) => lower.indexOf(t.toLowerCase()))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];
  if (hit === undefined) return text.slice(0, 160) + (text.length > 160 ? "…" : "");
  const start = Math.max(0, hit - 60);
  return (
    (start > 0 ? "…" : "") + text.slice(start, start + 180) + (start + 180 < text.length ? "…" : "")
  );
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const safe = terms.filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!safe.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${safe.join("|")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <mark key={i} className="search-mark">
            {p}
          </mark>
        ) : (
          p
        ),
      )}
    </>
  );
}

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [value, setValue] = useState(q);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [docs, setDocs] = useState<Map<string, Doc>>(new Map());
  const engine = useRef<MiniSearch<Doc> | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/search-index.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Doc[]>;
      })
      .then((data) => {
        if (cancelled) return;
        const ms = new MiniSearch<Doc>({
          fields: ["title", "description", "category", "platform", "tags", "text"],
          storeFields: [],
          searchOptions: {
            boost: { title: 4, tags: 3, category: 2, description: 2 },
            prefix: true,
            fuzzy: 0.2,
            combineWith: "AND",
          },
        });
        ms.addAll(data);
        engine.current = ms;
        setDocs(new Map(data.map((d) => [d.id, d])));
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    input.current?.focus();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the URL in sync so a search can be shared or bookmarked.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (value !== q) void navigate({ search: value ? { q: value } : {}, replace: true });
    }, 250);
    return () => window.clearTimeout(t);
  }, [value, q, navigate]);

  const terms = useMemo(() => value.trim().split(/\s+/).filter(Boolean), [value]);
  const results = useMemo(() => {
    if (state !== "ready" || !engine.current || !terms.length) return [];
    return engine.current.search(value.trim()).flatMap((r) => {
      const d = docs.get(String(r.id));
      return d ? [d] : [];
    });
  }, [state, docs, terms, value]);

  return (
    <div className="container-narrow">
      <PageIntro eyebrow="Search" title="Search articles" />
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="q" className="sr-only">
          Search articles
        </label>
        <input
          id="q"
          ref={input}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search titles, content, tags…"
          autoComplete="off"
          className="search-input"
        />
      </form>

      <div aria-live="polite" className="mt-8">
        {state === "loading" && <p className="text-muted-foreground">Loading search index…</p>}
        {state === "error" && (
          <p role="alert" className="text-destructive">
            The search index could not be loaded. Check your connection and{" "}
            <button
              type="button"
              className="link-accent underline"
              onClick={() => window.location.reload()}
            >
              reload the page
            </button>
            . You can still{" "}
            <Link to="/blog/" className="link-accent underline">
              browse the archive
            </Link>
            .
          </p>
        )}
        {state === "ready" && !terms.length && (
          <p className="text-muted-foreground">
            Type to search {docs.size} articles. Press <kbd className="kbd">/</kbd> on any page to
            jump here.
          </p>
        )}
        {state === "ready" && terms.length > 0 && results.length === 0 && (
          <p className="text-muted-foreground">
            No articles match “{value.trim()}”. Try a shorter term, or{" "}
            <Link to="/tags/" className="link-accent underline">
              browse tags
            </Link>
            .
          </p>
        )}
        {results.length > 0 && (
          <>
            <p className="mb-2 text-sm text-muted-foreground">
              {results.length} {results.length === 1 ? "result" : "results"}
            </p>
            <ul className="divide-y divide-border">
              {results.map((d) => (
                <li key={d.id} className="py-5">
                  <div className="meta-line">
                    <time dateTime={d.date}>{formatDate(d.date)}</time>
                    <span aria-hidden>·</span>
                    <span>{d.category}</span>
                    {d.tags && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{d.tags.split(" ").slice(0, 3).map(tagLabel).join(", ")}</span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-1 font-display text-xl font-medium">
                    <Link to="/blog/$slug/" params={{ slug: d.id }} className="post-title-link">
                      <Highlight text={d.title} terms={terms} />
                    </Link>
                  </h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    <Highlight text={snippet(d.text, terms)} terms={terms} />
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
