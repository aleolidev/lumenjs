import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { exportCreatorProject } from "../../src/creator/export-project.js";
import { scaffoldCreatorProject } from "../../src/creator/scaffold-project.js";

let root = "";
let project = "";
let output = "";
let origin = "";
let server;

test.beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "lumen-update-browser-"));
  project = path.join(root, "project");
  output = path.join(root, "export");
  await scaffoldCreatorProject(project, { title: "Update Journey" });
  await exportCreatorProject(project, output);
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://local").pathname);
      const relative = pathname === "/" ? "index.html" : pathname.slice(1);
      if (
        path.isAbsolute(relative) ||
        relative !== relative.replaceAll("\\", "/") ||
        relative.startsWith("../") ||
        relative.includes("/../") ||
        path.posix.normalize(relative) !== relative
      ) {
        response.writeHead(400).end("unsafe path");
        return;
      }
      const bytes = await readFile(path.join(output, relative));
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentType(relative),
        "Service-Worker-Allowed": "/"
      });
      response.end(bytes);
    } catch {
      response.writeHead(404).end("not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected HTTP server address");
  origin = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
});

test("version update waits for its client then activates and cleans old cache", async ({
  browser
}) => {
  const context = await browser.newContext();
  let page = await context.newPage();
  try {
    await page.goto(`${origin}/index.html`);
    await expect(page.locator("html")).toHaveAttribute("data-offline-ready", "true");
    expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    const manifestFile = path.join(project, "project.lumen.json");
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    manifest.version = "0.1.1";
    await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await exportCreatorProject(project, output);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error("Expected service worker registration");
      await registration.update();
    });

    await expect
      .poll(() =>
        page.evaluate(async () =>
          Boolean((await navigator.serviceWorker.getRegistration())?.waiting)
        )
      )
      .toBe(true);
    const waitingKeys = await page.evaluate(() => caches.keys());
    expect(
      waitingKeys.filter((key) => key.startsWith("lumen-export-update-journey-"))
    ).toHaveLength(2);

    await page.close();
    await new Promise((resolve) => setTimeout(resolve, 100));
    page = await context.newPage();
    await page.goto(`${origin}/index.html`);
    await expect(page.locator("html")).toHaveAttribute("data-offline-ready", "true");
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const keys = await caches.keys();
          return keys.filter((key) => key.startsWith("lumen-export-update-journey-"));
        })
      )
      .toHaveLength(1);
    const activeKeys = await page.evaluate(() => caches.keys());
    expect(activeKeys.find((key) => key.startsWith("lumen-export-update-journey-"))).toContain(
      "lumen-static-export-v1-experimental-0.1.1-"
    );
  } finally {
    await page.close();
    await context.close();
  }
});

function contentType(relative) {
  if (relative.endsWith(".html")) return "text/html; charset=utf-8";
  if (relative.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (relative.endsWith(".json")) return "application/json; charset=utf-8";
  if (relative.endsWith(".md")) return "text/markdown; charset=utf-8";
  return "application/octet-stream";
}
