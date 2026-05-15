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
if (!run("node", ["scripts/prerender-seo.mjs"])) {
  console.warn("[build] Interactive SEO prerender failed. Falling back to static SEO pages.");
  if (!run("node", ["scripts/generate-static-seo-fallback.mjs"])) {
    process.exit(process.exitCode ?? 1);
  }
}
