import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { ArchiveFilters } from "@/components/ArchiveFilters";
import { NotFoundPage } from "@/components/NotFoundPage";
import { PageIntro, YearGroupedList } from "@/components/PostList";
import { pageHead, posts, tagLabel } from "@/lib/posts";

export const Route = createFileRoute("/tags/$tag")({
  loader: ({ params }) => {
    if (!posts.some((p) => p.tags.includes(params.tag))) throw notFound();
    return { tag: params.tag };
  },
  head: ({ params }) =>
    pageHead({
      title: `Tagged “${tagLabel(params.tag)}”`,
      description: `Articles tagged ${tagLabel(params.tag)}.`,
      path: `/tags/${params.tag}`,
    }),
  component: TagPage,
  notFoundComponent: NotFoundPage,
});

function TagPage() {
  const { tag } = Route.useLoaderData();
  const list = posts.filter((p) => p.tags.includes(tag));
  return (
    <div className="container-wide">
      <PageIntro eyebrow={`Tag · ${list.length} articles`} title={tagLabel(tag)}>
        <Link to="/tags/" className="link-accent text-base">
          ← All tags
        </Link>
      </PageIntro>
      <ArchiveFilters />
      <YearGroupedList posts={list} />
    </div>
  );
}
