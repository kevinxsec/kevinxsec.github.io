import path from "node:path";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import type { Plugin } from "vite";

import { buildContent, loadPosts, sitePaths } from "./scripts/content.mjs";

const root = process.cwd();

/** Regenerates src/generated + feeds from content/ on startup, build, and content edits. */
function contentPlugin(): Plugin {
  return {
    name: "kevinxsec-content",
    async buildStart() {
      await buildContent(root);
    },
    configureServer(server) {
      const dir = path.join(root, "content");
      server.watcher.add(dir);
      const rebuild = (file: string) => {
        if (!file.startsWith(dir)) return;
        buildContent(root).catch((e: Error) => server.config.logger.error(e.message));
      };
      server.watcher.on("change", rebuild);
      server.watcher.on("add", rebuild);
      server.watcher.on("unlink", rebuild);
    },
  };
}

// Every page is prerendered to static HTML so GitHub Pages can serve direct links.
const published = loadPosts(path.join(root, "content"), path.join(root, "public")).filter(
  (p) => p.published,
);

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    pages: sitePaths(published).map((p) => ({ path: p })),
    // crawlLinks off: `pages` is the complete list. Following footer links made CI fetch
    // /rss.xml and /sitemap.xml as HTML routes (404). Those files ship from public/.
    prerender: {
      enabled: true,
      autoStaticPathsDiscovery: false,
      crawlLinks: false,
      failOnError: true,
      filter: (page: { path: string }) => !/\.[a-z0-9]+\/?$/i.test(page.path),
    },
    }),
    viteReact(),
    contentPlugin(),
  ],
});
