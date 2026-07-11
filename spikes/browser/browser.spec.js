import { expect, test } from "@playwright/test";

test("renders a deterministic fallback and reports capabilities", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");

  const result = await page.evaluate(() => window.spikeResult);
  console.log(`${testInfo.project.name} capabilities: ${JSON.stringify(result.capabilities)}`);
  expect(result.capabilities.canvas2d).toBe(true);
  expect(result.pixelSample[3]).toBe(255);

  await testInfo.attach("capabilities", {
    body: JSON.stringify(result.capabilities, null, 2),
    contentType: "application/json"
  });
});

test("layout remains usable at a narrow touch viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const box = await page.locator("#scene").boundingBox();
  if (!box) throw new Error("visible canvas has no layout box");
  expect(box.width).toBeLessThanOrEqual(390);
  expect(box.height).toBeGreaterThan(0);
});
