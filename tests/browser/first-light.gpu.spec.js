import { expect, test } from "@playwright/test";

test("submits the First Light scene through WebGPU within fixture budgets", async ({ page }) => {
  test.skip(!process.env.LUMEN_REQUIRE_GPU, "Run through npm run test:gpu on a headed GPU lane");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await page.locator("#visual-mode").click();
  const result = await page.evaluate(async () => {
    for (let index = 0; index < 120; index += 1) window.firstLight.dispatch("wait");
    await window.firstLight.settled();
    return window.firstLight.diagnostics;
  });
  expect(result.renderer.status).toBe("ready");
  expect(result.renderer.projection).toBe("top-down-three-quarter-v1");
  expect(result.renderer.visualMode).toBe("enhanced");
  expect(result.renderer.gpuErrors).toEqual([]);
  expect(result.renderer.submittedFrames).toBeGreaterThan(0);
  expect(result.renderer.drawCalls).toBeLessThanOrEqual(4);
  expect(result.renderer.vertices).toBeGreaterThan(0);
  expect(result.renderer.uploadBytes).toBeLessThanOrEqual(256 * 1024);
  expect(result.renderer.submittedFrames).toBeGreaterThanOrEqual(120);
  expect(result.renderer.medianCpuSceneAndSubmitMs).toBeLessThan(4);
  expect(result.scene.itemCount).toBeGreaterThan(160);
  expect(result.scene.texturedItemCount).toBe(result.scene.itemCount);
  expect(result.scene.simple3dCount).toBe(1);
});
