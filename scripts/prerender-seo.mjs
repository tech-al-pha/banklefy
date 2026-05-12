import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const distDir = path.resolve(repoRoot, "dist");

const preferredOrigin = process.env.PRERENDER_ORIGIN || "https://www.banklefy.site";

const routes = [
  "/",
  "/pricing",
  "/features",
  "/benefits",
  "/how-it-works",
  "/security",
  "/faqs",
  "/about",
  "/sample-report",
  "/privacy",
  "/terms",
  "/cancellation-and-refund",
  "/shipping-and-exchange",
  "/blog",
  "/blog/launch",
  "/blog/accuracy",
  "/blog/privacy",
  "/blog/multi-format-export",
  "/blog/bulk-conversion",
  "/blog/underwriting",
  "/blog/fraud-detection",
  "/blog/multi-language",
  "/blog/password-pdf",
];

const readFileSafe = async (filePath) => {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
};

const serveDist = async () => {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://localhost");
      const reqPath = decodeURIComponent(url.pathname);
      const filePath = path.join(distDir, reqPath);

      const tryFiles = [];
      if (reqPath.endsWith("/")) {
        tryFiles.push(path.join(filePath, "index.html"));
      } else {
        tryFiles.push(filePath);
        tryFiles.push(path.join(filePath, "index.html"));
      }

      for (const candidate of tryFiles) {
        const data = await readFileSafe(candidate);
        if (!data) continue;
        res.statusCode = 200;
        const ext = path.extname(candidate).toLowerCase();
        const contentType =
          ext === ".html"
            ? "text/html; charset=utf-8"
            : ext === ".xml"
              ? "application/xml"
              : ext === ".txt"
                ? "text/plain; charset=utf-8"
                : ext === ".css"
                  ? "text/css; charset=utf-8"
                  : ext === ".js" || ext === ".mjs"
                    ? "application/javascript; charset=utf-8"
                    : ext === ".json"
                      ? "application/json; charset=utf-8"
                      : ext === ".svg"
                        ? "image/svg+xml"
                        : ext === ".png"
                          ? "image/png"
                          : ext === ".jpg" || ext === ".jpeg"
                            ? "image/jpeg"
                            : ext === ".webmanifest"
                              ? "application/manifest+json; charset=utf-8"
                              : null;
        if (contentType) res.setHeader("Content-Type", contentType);
        res.end(data);
        return;
      }

      // SPA fallback
      const indexHtml = await readFileSafe(path.join(distDir, "index.html"));
      if (!indexHtml) {
        res.statusCode = 404;
        res.end("Not Found");
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(indexHtml);
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind prerender server.");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return { baseUrl, close: () => new Promise((resolve) => server.close(resolve)) };
};

const expectedCanonicalForRoute = (routePath) => {
  const normalized = routePath === "/" ? "/" : routePath.replace(/\/+$/, "");
  return `${preferredOrigin}${normalized === "/" ? "/" : normalized}`;
};

const writeRouteHtml = async (routePath, html) => {
  const targetDir =
    routePath === "/"
      ? distDir
      : path.join(distDir, routePath.replace(/^\//, ""));
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "index.html"), html, "utf8");
};

const sanitizeHtmlForSeo = (html) => {
  // Remove external scripts/iframes that can cause crawler variance or heavy payloads.
  const withoutExternalScripts = html.replace(
    /<script\b[^>]*\bsrc="https?:\/\/[^"]+"[^>]*>\s*<\/script>/gi,
    "",
  );
  const withoutIframes = withoutExternalScripts.replace(/<iframe\b[^>]*>.*?<\/iframe>/gis, "");
  return withoutIframes;
};

const main = async () => {
  const { baseUrl, close } = await serveDist();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Keep prerendered HTML deterministic and lightweight by blocking third-party requests.
  await page.route("**/*", async (route) => {
    const requestUrl = route.request().url();
    if (
      requestUrl.startsWith(baseUrl) ||
      requestUrl.startsWith("data:") ||
      requestUrl.startsWith("blob:")
    ) {
      await route.continue();
      return;
    }
    await route.abort();
  });

  try {
    for (const routePath of routes) {
      const url = `${baseUrl}${routePath}`;
      const expectedCanonical = expectedCanonicalForRoute(routePath);

      await page.goto(url, { waitUntil: "load" });
      await page.waitForTimeout(250);

      await page.waitForSelector('link[rel="canonical"]', { timeout: 30_000, state: "attached" });
      await page.waitForSelector("title", { timeout: 30_000, state: "attached" });
      await page.waitForSelector('meta[name="description"]', { timeout: 30_000, state: "attached" });

      const actualCanonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute("href");
      if (actualCanonical !== expectedCanonical) {
        throw new Error(
          `Canonical mismatch for ${routePath}: expected ${expectedCanonical} got ${actualCanonical}`,
        );
      }

      await page.evaluate(() => {
        document.querySelectorAll('script[src^="http://"],script[src^="https://"]').forEach((el) => el.remove());
        document.querySelectorAll("iframe").forEach((el) => el.remove());
        document.querySelectorAll(".razorpay-container,.grecaptcha-badge,.razorpay-backdrop").forEach((el) =>
          el.remove(),
        );
      });

      const content = await page.content();
      await writeRouteHtml(routePath, sanitizeHtmlForSeo(content));
    }
  } finally {
    await page.close().catch(() => null);
    await browser.close().catch(() => null);
    await close().catch(() => null);
  }
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
