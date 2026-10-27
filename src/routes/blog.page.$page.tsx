import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { BlogArchive, pageCount } from "@/components/BlogArchive";
import { NotFoundPage } from "@/components/NotFoundPage";
import { pageHead } from "@/lib/posts";

export const Route = createFileRoute("/blog/page/$page")({
  loader: ({ params }) => {
    const page = Number(params.page);
    if (page === 1) throw redirect({ to: "/blog/" });
    if (!Number.isInteger(page) || page < 1 || page > pageCount()) throw notFound();
    return { page };
  },
  head: ({ params }) =>
    pageHead({
      title: `Blog, page ${params.page}`,
      description: `Older articles, page ${params.page}.`,
      path: `/blog/page/${params.page}`,
    }),
  component: BlogPage,
  notFoundComponent: NotFoundPage,
});

function BlogPage() {
  const { page } = Route.useLoaderData();
  return <BlogArchive page={page} />;
}
