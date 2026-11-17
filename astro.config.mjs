import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { loadEnv } from "vite";

const fileEnv = loadEnv(process.env.NODE_ENV ?? "", process.cwd(), "");
const site = process.env.PUBLIC_SITE_URL || fileEnv.PUBLIC_SITE_URL || "";

if (!site) {
  console.warn(
    "\n[demont] PUBLIC_SITE_URL is not set. Canonical URLs and the sitemap will use http://localhost:4321. Set the production origin before deploying.\n",
  );
}

export default defineConfig({
  site: site || "http://localhost:4321",
  output: "static",
  trailingSlash: "never",
  compressHTML: true,
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/blagodarim"),
    }),
  ],
});
