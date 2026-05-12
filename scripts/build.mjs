import { spawnSync } from "node:child_process";

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return false;
  }
  return true;
};

if (!run("vite", ["build"])) process.exit(process.exitCode ?? 1);

// Vercel build environment doesn't reliably support Playwright/Chromium prerendering.
// Keep prerendering for local/CI workflows where Playwright is available.
if (process.env.VERCEL) {
  console.log("[build] Skipping SEO prerender on Vercel.");
  process.exit(0);
}

if (!run("node", ["scripts/prerender-seo.mjs"])) process.exit(process.exitCode ?? 1);
