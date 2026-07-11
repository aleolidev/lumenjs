import { expect, test } from "@playwright/test";

test("loads validated First Light sources and reports renderer capability", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const result = await page.evaluate(() => ({
    project: window.firstLight.diagnostics.project,
    renderer: window.firstLight.diagnostics.renderer
  }));
  expect(result.project).toMatchObject({
    id: "first-light",
    version: "0.2.0",
    schemaVersion: 1,
    mapId: "lantern-vale"
  });
  expect(["ready", "unsupported"]).toContain(result.renderer.status);
  expect(result.renderer.projection).toBe("top-down-three-quarter-v1");
  if (result.renderer.status === "unsupported") {
    await expect(page.locator("#unsupported")).toBeVisible();
    expect(result.renderer.drawCalls).toBe(0);
  }
});

test("switches optional visual grading without changing simulation state", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const before = await page.evaluate(() => window.firstLight.state);
  const mode = page.locator("#visual-mode");
  await mode.click();
  await expect(mode).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.firstLight.settled());
  const result = await page.evaluate(() => ({
    state: window.firstLight.state,
    sceneMode: window.firstLight.diagnostics.scene.visualMode,
    rendererStatus: window.firstLight.diagnostics.renderer.status,
    rendererMode: window.firstLight.diagnostics.renderer.visualMode
  }));
  expect(result.state).toEqual(before);
  expect(result.sceneMode).toBe("enhanced");
  if (result.rendererStatus === "ready") expect(result.rendererMode).toBe("enhanced");
});

test("keyboard interaction opens validated companion dialogue", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await page.evaluate(() => window.firstLight.settled());
  const result = await page.evaluate(() => ({
    state: window.firstLight.state,
    campaign: window.firstLight.campaignState,
    input: window.firstLight.diagnostics.input,
    facts: window.firstLight.diagnostics.simulation.recentFacts
  }));
  expect(result.state.flags["beacon-lit"]).toBe(true);
  expect(result.input).toEqual({ type: "world", action: "interact" });
  expect(result.campaign.mode).toBe("dialogue");
  expect(result.facts.map((fact) => fact.type)).toEqual([
    "flag-changed",
    "character-spoke",
    "dialogue-opened"
  ]);
  await expect(page.locator("#dialogue-panel")).toBeVisible();
  await expect(page.locator("#dialogue-text")).toContainText("guardians");
});

test("canonical replay reaches its recorded state", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await page.locator("#replay").click();
  await expect(page.locator("#message")).toContainText("Campaign replay complete");
  const result = await page.evaluate(() => window.firstLight.diagnostics.simulation);
  expect(result.stateHash).not.toContain("pending");
  expect(result.state.flags["beacon-lit"]).toBe(true);
  expect(result.state.transitions).toBe(1);
  expect(result.campaign.outcome).toBe("victory");
  expect(result.campaign.party).toEqual(["embercub", "glintail"]);
});

test("plays the visible dialogue and deterministic battle controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await page.evaluate(() => {
    window.firstLight.dispatch("move-north");
    window.firstLight.dispatch("move-east");
    window.firstLight.dispatch("move-east");
    window.firstLight.dispatch("interact");
  });
  await page.getByRole("button", { name: /Embercub/ }).click();
  await page.getByRole("button", { name: "We are ready" }).click();
  await page.evaluate(() => {
    window.firstLight.dispatch("move-south");
    for (let index = 0; index < 10; index += 1) window.firstLight.dispatch("move-east");
  });
  await expect(page.locator("#battle-panel")).toBeVisible();
  await expect(page.locator("#ally-name")).toContainText("Embercub");
  const beforeModeChange = await page.evaluate(() => window.firstLight.campaignState);
  await page.locator("#visual-mode").click();
  await page.evaluate(() => window.firstLight.settled());
  expect(await page.evaluate(() => window.firstLight.campaignState)).toEqual(beforeModeChange);
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: /Spark Step/ }).click();
  }
  await expect(page.locator("#result-panel")).toBeVisible();
  await expect(page.locator("#result-title")).toContainText("Glintail");
  const campaign = await page.evaluate(() => window.firstLight.campaignState);
  expect(campaign.party).toEqual(["embercub", "glintail"]);
  await page.getByRole("button", { name: "Return to Lantern Vale" }).click();
  await expect(page.locator("#message")).toContainText("Glintail");
  expect((await page.evaluate(() => window.firstLight.campaignState)).mode).toBe("world");
});

test("the playtest remains usable at a narrow touch viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const viewport = await page.locator(".viewport").boundingBox();
  const button = await page.locator("#replay").boundingBox();
  expect(viewport?.width).toBeLessThanOrEqual(390);
  expect(viewport?.height).toBeGreaterThanOrEqual(280);
  expect(button?.width).toBeGreaterThan(0);
});
