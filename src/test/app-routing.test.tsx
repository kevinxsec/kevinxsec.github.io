import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering.
describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
  const leaf = (path: string) => router.matchRoutes(path).at(-1)?.routeId;

  it.each([
    ["/", "/"],
    ["/blog/", "/blog/"],
    ["/blog/page/2/", "/blog/page/$page"],
    ["/blog/htb-sample-lantern/", "/blog/$slug"],
    ["/categories/", "/categories/"],
    ["/categories/writeup/", "/categories/$category"],
    ["/tags/", "/tags/"],
    ["/tags/htb/", "/tags/$tag"],
    ["/about/", "/about"],
    ["/search/", "/search"],
    ["/404/", "/404"],
  ])("matches %s to %s", (path, id) => {
    expect(leaf(path)).toBe(id);
  });

  it("falls back to not-found for unknown sections", () => {
    expect(leaf("/walkthroughs/")).toBe(rootRouteId);
  });
});
