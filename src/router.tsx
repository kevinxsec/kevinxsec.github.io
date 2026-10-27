import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // GitHub Pages serves each page as <path>/index.html, i.e. with a trailing slash.
    trailingSlash: "always",
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
