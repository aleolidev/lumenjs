import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { exportCreatorProject } from "../../src/creator/export-project.js";
import { scaffoldCreatorProject } from "../../src/creator/scaffold-project.js";

let output = "";
let tideglassOutput = "";
let secondOutput = "";
let optionalOutput = "";
let optionalProject = "";
let failedInstallOutput = "";
let failedRegistrationOutput = "";

test.beforeAll(async ({ browserName: _browserName }, workerInfo) => {
  output = path.resolve(`test-results/creator-export-${workerInfo.project.name}`);
  tideglassOutput = path.resolve(`test-results/tideglass-export-${workerInfo.project.name}`);
  secondOutput = path.resolve(`test-results/creator-export-second-${workerInfo.project.name}`);
  await exportCreatorProject("examples/willowbound", output);
  await exportCreatorProject("examples/tideglass-reach", tideglassOutput);
  await exportCreatorProject("examples/willowbound", secondOutput);
  optionalProject = path.resolve(
    `test-results/creator-project-optional-${workerInfo.project.name}`
  );
  optionalOutput = path.resolve(`test-results/creator-export-optional-${workerInfo.project.name}`);
  failedInstallOutput = path.resolve(
    `test-results/creator-export-failed-install-${workerInfo.project.name}`
  );
  failedRegistrationOutput = path.resolve(
    `test-results/creator-export-failed-registration-${workerInfo.project.name}`
  );
  await rm(optionalProject, { recursive: true, force: true });
  await rm(optionalOutput, { recursive: true, force: true });
  await scaffoldCreatorProject(optionalProject, { title: "Optional Context" });
  await rm(path.join(optionalProject, "modules/careful-traveler.json"));
  await exportCreatorProject(optionalProject, optionalOutput);
  await exportCreatorProject("examples/willowbound", failedInstallOutput);
  await writeFile(
    path.join(failedInstallOutput, "service-worker.js"),
    `self.addEventListener("install", (event) => {\n  event.waitUntil(Promise.reject(new Error("Injected install failure")));\n});\n`
  );
  await exportCreatorProject("examples/willowbound", failedRegistrationOutput);
  await writeFile(
    path.join(failedRegistrationOutput, "service-worker.js"),
    `throw new Error("Injected registration failure");\n`
  );
});

test.afterAll(async () => {
  await rm(output, { recursive: true, force: true });
  await rm(tideglassOutput, { recursive: true, force: true });
  await rm(secondOutput, { recursive: true, force: true });
  await rm(optionalOutput, { recursive: true, force: true });
  await rm(optionalProject, { recursive: true, force: true });
  await rm(failedInstallOutput, { recursive: true, force: true });
  await rm(failedRegistrationOutput, { recursive: true, force: true });
});

test("Tideglass Reach runs the same compiled core as a distinct web game", async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(
    `/test-results/tideglass-export-${test.info().project.name}/index.html?map=tideglass-shore&spawn=crossing-start&locale=es`
  );
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("#playtest-status")).toContainText("tideglass-reach");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(page.locator("#playtest-message")).toContainText("cristal marino");
  await page.keyboard.press("ArrowUp");
  for (let index = 0; index < 4; index += 1) await page.keyboard.press("ArrowRight");
  await expect(page.locator("#playtest-status")).toContainText("signal-tower · es");
  await expect(page.locator("#playtest-diagnostics")).toContainText("map-entered");
  expect(errors).toEqual([]);
});

test("focused creator export is localized, inspectable, and crosses maps", async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(
    `/test-results/creator-export-${test.info().project.name}/index.html?map=willow-crossing&spawn=crossing-start&locale=es`
  );
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator("#playtest-status")).toContainText("willow-crossing · es");
  const interact = page.getByRole("button", { name: "Interact" });
  await interact.focus();
  await page.keyboard.press("Space");
  expect(
    await page
      .locator("#playtest-diagnostics")
      .evaluate((element) => JSON.parse(element.textContent).state.tick)
  ).toBe(1);
  const summary = page.locator("summary");
  await summary.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("details")).toHaveAttribute("open", "");
  expect(
    await page
      .locator("#playtest-diagnostics")
      .evaluate((element) => JSON.parse(element.textContent).state.tick)
  ).toBe(1);
  await page.evaluate(() => {
    const editable = document.createElement("div");
    editable.id = "editable-test";
    editable.setAttribute("contenteditable", "");
    document.body.append(editable);
    editable.focus();
  });
  await page.keyboard.press("ArrowUp");
  expect(
    await page
      .locator("#playtest-diagnostics")
      .evaluate((element) => JSON.parse(element.textContent).state.tick)
  ).toBe(1);
  await page.evaluate(() => {
    for (const modifier of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { shiftKey: true }
    ])
      dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW", ...modifier, bubbles: true }));
    dispatchEvent(new KeyboardEvent("keydown", { code: "Space", shiftKey: true, bubbles: true }));
  });
  expect(
    await page
      .locator("#playtest-diagnostics")
      .evaluate((element) => JSON.parse(element.textContent).state.tick)
  ).toBe(1);
  await page.evaluate(() =>
    dispatchEvent(
      new KeyboardEvent("keydown", { code: "ArrowUp", isComposing: true, bubbles: true })
    )
  );
  expect(
    await page
      .locator("#playtest-diagnostics")
      .evaluate((element) => JSON.parse(element.textContent).state.tick)
  ).toBe(1);
  await page.getByRole("button", { name: "Move west" }).click();
  await expect(page.locator("#playtest-diagnostics")).toContainText("movement-blocked");
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(page.locator("#playtest-message")).toContainText("senderos de sauces");
  await expect(page.locator("#playtest-message")).toHaveAttribute("lang", "es");
  await page.keyboard.press("ArrowUp");
  for (let index = 0; index < 4; index += 1) await page.keyboard.press("ArrowRight");
  await expect(page.locator("#playtest-status")).toContainText("starglass-workshop · es");
  await expect(page.locator("#playtest-diagnostics")).toContainText("map-entered");
  await expect(page.locator("#playtest-diagnostics")).toContainText("workshop-atmosphere");
  await expect(page.locator("#playtest-diagnostics")).toContainText("careful-traveler");
  await page.goto(
    `/test-results/creator-export-${test.info().project.name}/index.html?map=constructor`
  );
  await expect(page.locator("html")).toHaveAttribute("data-ready", "error");
  await expect(page.locator("#playtest-status")).toContainText(
    "Focused map 'constructor' is not available"
  );
  await expect(page.locator("#playtest-diagnostics")).toBeEmpty();
  expect(errors).toEqual([]);
});

test("optional encounter context can be absent without changing the focused boundary", async ({
  page
}) => {
  await page.goto(`/test-results/creator-export-optional-${test.info().project.name}/index.html`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("#playtest-diagnostics")).toContainText("workshop-atmosphere");
  await expect(page.locator("#playtest-diagnostics")).not.toContainText("careful-traveler");
});

test("focused creator controls remain usable at a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/test-results/creator-export-${test.info().project.name}/index.html`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.getByRole("group", { name: "Playtest controls" })).toBeVisible();
  const map = await page.locator("#map-view").boundingBox();
  const interact = await page.getByRole("button", { name: "Interact" }).boundingBox();
  expect(map?.width).toBeLessThanOrEqual(350);
  expect(interact?.height).toBeGreaterThanOrEqual(44);
});

test("focused creator export installs and exercises its versioned offline cache", async ({
  context,
  page
}) => {
  await page.goto(`/test-results/creator-export-${test.info().project.name}/index.html`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("html")).toHaveAttribute("data-offline-ready", "true");
  const browserName = test.info().project.name;
  if (browserName === "webkit") {
    const cached = await page.evaluate(async () => {
      const cache = await caches.match("index.html");
      const project = await caches.match("project.lumen.json");
      return Boolean(navigator.serviceWorker.controller && cache?.ok && project?.ok);
    });
    expect(cached).toBe(true);
    return;
  }
  await context.setOffline(true);
  try {
    if (browserName === "firefox") {
      await page.goto(`/test-results/creator-export-${test.info().project.name}/`);
      await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
      return;
    }
    const cached = await page.evaluate(async () => {
      const responses = await Promise.all(
        ["index.html", "project.lumen.json", "playtest-browser.js"].map((relative) =>
          fetch(relative)
        )
      );
      return responses.every((response) => response.ok);
    });
    expect(cached).toBe(true);
  } finally {
    await context.setOffline(false);
  }
});

test("failed service-worker registration and installation remain observable", async ({ page }) => {
  await page.goto(
    `/test-results/creator-export-failed-install-${test.info().project.name}/index.html`
  );
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("html")).toHaveAttribute("data-offline-ready", "error");
  await page.getByRole("button", { name: "Move west" }).click();
  await expect(page.locator("#playtest-diagnostics")).toContainText("movement-blocked");

  await page.goto(
    `/test-results/creator-export-failed-registration-${test.info().project.name}/index.html`
  );
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("html")).toHaveAttribute("data-offline-ready", "error");
  await page.getByRole("button", { name: "Move west" }).click();
  await expect(page.locator("#playtest-diagnostics")).toContainText("movement-blocked");
});

test("same-project deployments keep offline cache ownership scoped", async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const firstPage = await context.newPage();
    await firstPage.goto(`/test-results/creator-export-${test.info().project.name}/index.html`);
    await expect(firstPage.locator("html")).toHaveAttribute("data-offline-ready", "true");
    const firstKeys = await firstPage.evaluate(() => caches.keys());

    const secondPage = await context.newPage();
    await secondPage.goto(
      `/test-results/creator-export-second-${test.info().project.name}/index.html`
    );
    await expect(secondPage.locator("html")).toHaveAttribute("data-offline-ready", "true");
    const secondKeys = await secondPage.evaluate(() => caches.keys());
    const projectKeys = secondKeys.filter((key) => key.startsWith("lumen-export-willowbound-"));

    expect(projectKeys).toHaveLength(2);
    expect(firstKeys.every((key) => secondKeys.includes(key))).toBe(true);
    expect(projectKeys[0]).not.toBe(projectKeys[1]);
  } finally {
    await context.close();
  }
});

test("touch-capable narrow context taps the shared deterministic action boundary", async ({
  browser
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();
  try {
    await page.goto(`/test-results/creator-export-${test.info().project.name}/index.html`);
    await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
    const west = page.getByRole("button", { name: "Move west" });
    const box = await west.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await west.tap();
    await expect(page.locator("#playtest-diagnostics")).toContainText("movement-blocked");
  } finally {
    await context.close();
  }
});
