import { createFileRoute, notFound } from "@tanstack/react-router";

import { ArchiveFilters } from "@/components/ArchiveFilters";
import { NotFoundPage } from "@/components/NotFoundPage";
import { PageIntro, YearGroupedList } from "@/components/PostList";
import { CATEGORIES, categoryLabel, pageHead, posts } from "@/lib/posts";

export const Route = createFileRoute("/categories/$category")({
  loader: ({ params }) => {
    const list = posts.filter((p) => p.category === params.category);
    if (list.length === 0) throw notFound();
    return { category: params.category };
  },
  head: ({ params }) =>
    pageHead({
      title: categoryLabel(params.category),
      description: CATEGORIES[params.category]?.blurb ?? `Articles in ${params.category}.`,
      path: `/categories/${params.category}`,
    }),
  component: CategoryPage,
  notFoundComponent: NotFoundPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const list = posts.filter((p) => p.category === category);
  return (
    <div className="container-wide">
      <PageIntro eyebrow={`Category · ${list.length} articles`} title={categoryLabel(category)}>
        {CATEGORIES[category]?.blurb}
      </PageIntro>
      <ArchiveFilters />
      <YearGroupedList posts={list} />
    </div>
  );
}
