import { Link } from "@tanstack/react-router";

import { categoryLabel, formatDate, PLATFORM_TAGS, tagLabel, type PostMeta } from "@/lib/posts";

export function TagLink({ tag }: { tag: string }) {
  return (
    <Link to="/tags/$tag/" params={{ tag }} className="tag">
      {PLATFORM_TAGS.includes(tag) ? tagLabel(tag) : `#${tagLabel(tag)}`}
    </Link>
  );
}

export function PostMetaLine({ post }: { post: PostMeta }) {
  return (
    <div className="meta-line">
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      <span aria-hidden>·</span>
      <Link to="/categories/$category/" params={{ category: post.category }} className="link-quiet">
        {categoryLabel(post.category)}
      </Link>
      {post.difficulty && (
        <>
          <span aria-hidden>·</span>
          <span>{post.difficulty}</span>
        </>
      )}
      <span aria-hidden>·</span>
      <span>{post.readingTime} min read</span>
    </div>
  );
}

export function PostItem({ post }: { post: PostMeta }) {
  return (
    <li className="post-item">
      <PostMetaLine post={post} />
      <h3 className="mt-1.5 text-lg font-medium leading-snug">
        <Link to="/blog/$slug/" params={{ slug: post.slug }} className="post-title-link">
          {post.title}
        </Link>
      </h3>
      <p className="mt-2 max-w-[65ch] text-muted-foreground">{post.description}</p>
      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {post.tags.map((t) => (
            <TagLink key={t} tag={t} />
          ))}
        </div>
      )}
    </li>
  );
}

export function PostList({ posts }: { posts: PostMeta[] }) {
  if (posts.length === 0)
    return <p className="py-8 text-muted-foreground">No articles here yet.</p>;
  return (
    <ul className="divide-y divide-border">
      {posts.map((p) => (
        <PostItem key={p.slug} post={p} />
      ))}
    </ul>
  );
}

/** Year-grouped list for archives. */
export function YearGroupedList({ posts }: { posts: PostMeta[] }) {
  const years = [...new Set(posts.map((p) => p.date.slice(0, 4)))];
  if (posts.length === 0) return <PostList posts={[]} />;
  return (
    <div className="space-y-12">
      {years.map((y) => (
        <section key={y} aria-labelledby={`y-${y}`}>
          <h2 id={`y-${y}`} className="eyebrow mb-2">
            {y}
          </h2>
          <PostList posts={posts.filter((p) => p.date.startsWith(y))} />
        </section>
      ))}
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-12 pt-14">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h1 className="text-2xl font-semibold text-accent">{title}</h1>
      {children && (
        <div className="mt-4 max-w-[60ch] text-muted-foreground">{children}</div>
      )}
    </div>
  );
}
