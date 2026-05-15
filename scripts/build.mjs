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

// Vercel build environment is not reliable for Playwright/Chromium.
// Generate deterministic static SEO pages there to keep production deploys stable.
if (process.env.VERCEL) {
  if (!run("node", ["scripts/generate-static-seo-fallback.mjs"])) process.exit(process.exitCode ?? 1);
  process.exit(0);
}

// Local/CI: try full prerender; fall back if it fails for any reason.
if (!run("node", ["scripts/prerender-seo.mjs"])) {
  console.warn("[build] Interactive SEO prerender failed. Falling back to static SEO pages.");
  if (!run("node", ["scripts/generate-static-seo-fallback.mjs"])) process.exit(process.exitCode ?? 1);
}
