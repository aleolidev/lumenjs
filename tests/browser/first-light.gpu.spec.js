import { expect, test } from "@playwright/test";

test("renders both continuity maps through WebGPU within fixture budgets", async ({ page }) => {
  test.skip(!process.env.LUMEN_REQUIRE_GPU, "Run through npm run test:gpu on a headed GPU lane");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await page.locator("#visual-mode").click();
  await page.locator("#replay").click();
  await expect(page.locator("#save-status")).toContainText("Continuity replay complete");
  const result = await page.evaluate(async () => {
    for (const action of ["move-north", "move-north", "move-east", "move-north"]) {
      window.firstLight.dispatch(action);
    }
    for (let index = 0; index < 60; index += 1) window.firstLight.dispatch("wait");
    await window.firstLight.settled();
    const interior = structuredClone(window.firstLight.diagnostics);
    for (const action of ["move-south", "move-west", "move-south", "move-south"]) {
      window.firstLight.dispatch(action);
    }
    for (let index = 0; index < 60; index += 1) window.firstLight.dispatch("wait");
    await window.firstLight.settled();
    return { interior, vale: window.firstLight.diagnostics };
  });
  expect(result.interior.continuity.activeMapId).toBe("lantern-house");
  expect(result.interior.scene.mapKind).toBe("interior");
  expect(result.vale.continuity.activeMapId).toBe("lantern-vale");
  for (const diagnostics of [result.interior, result.vale]) {
    expect(diagnostics.renderer.status).toBe("ready");
    expect(diagnostics.renderer.projection).toBe("top-down-three-quarter-v1");
    expect(diagnostics.renderer.visualMode).toBe("enhanced");
    expect(diagnostics.renderer.gpuErrors).toEqual([]);
    expect(diagnostics.renderer.drawCalls).toBeLessThanOrEqual(4);
    expect(diagnostics.renderer.vertices).toBeGreaterThan(0);
    expect(diagnostics.renderer.uploadBytes).toBeLessThanOrEqual(256 * 1024);
    expect(diagnostics.renderer.medianCpuSceneAndSubmitMs).toBeLessThan(4);
    expect(diagnostics.scene.texturedItemCount).toBe(diagnostics.scene.itemCount);
  }
  expect(result.interior.renderer.submittedFrames).toBeGreaterThanOrEqual(60);
  expect(result.vale.renderer.submittedFrames).toBeGreaterThanOrEqual(120);
  expect(
    result.vale.renderer.submittedFrames - result.interior.renderer.submittedFrames
  ).toBeGreaterThanOrEqual(60);
  expect(result.vale.scene.itemCount).toBeGreaterThan(160);
  expect(result.vale.scene.simple3dCount).toBe(1);
});
