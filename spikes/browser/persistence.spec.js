import { expect, test } from "@playwright/test";

test("commits a complete snapshot and pointer atomically", async ({ page }, testInfo) => {
  await page.goto("/");
  const result = await page.evaluate(
    async ({ name }) => {
      // @ts-expect-error Resolved by Vite inside the browser fixture.
      const { createSaveStore } = await import("/persistence.js");
      const store = await createSaveStore(name);
      await store.save("slot-a", { map: "town", x: 1 }, { durability: "strict" });
      const loaded = await store.load("slot-a");
      await store.destroy();
      return loaded;
    },
    { name: `lumen-${testInfo.project.name}-atomic` }
  );

  expect(result).toEqual({
    state: { map: "town", x: 1 },
    generation: 1,
    recovered: false
  });
});

test("falls back to the previous valid generation after logical corruption", async ({
  page
}, testInfo) => {
  await page.goto("/");
  const result = await page.evaluate(
    async ({ name }) => {
      // @ts-expect-error Resolved by Vite inside the browser fixture.
      const { createSaveStore } = await import("/persistence.js");
      const store = await createSaveStore(name);
      await store.save("slot-a", { step: 1 });
      await store.save("slot-a", { step: 2 });
      await store.corruptCurrentForTest("slot-a");
      const loaded = await store.load("slot-a");
      await store.destroy();
      return loaded;
    },
    { name: `lumen-${testInfo.project.name}-recovery` }
  );

  expect(result).toEqual({ state: { step: 1 }, generation: 1, recovered: true });
});

test("reports storage persistence and quota without assuming availability", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => ({
    persisted: await navigator.storage.persisted(),
    estimate: await navigator.storage.estimate()
  }));

  expect(typeof result.persisted).toBe("boolean");
  expect(result.estimate.quota).toBeGreaterThan(0);
});
