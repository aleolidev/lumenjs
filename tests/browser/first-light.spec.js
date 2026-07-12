import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const v1Fixture = JSON.parse(
  await readFile(new URL("../fixtures/first-light/save-v1.fixture.json", import.meta.url), "utf8")
);

test("loads validated First Light sources and reports renderer capability", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const result = await page.evaluate(() => ({
    project: window.firstLight.diagnostics.project,
    renderer: window.firstLight.diagnostics.renderer
  }));
  expect(result.project).toMatchObject({
    id: "first-light",
    version: "0.3.0",
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

test("rejected WebGPU adapter and device requests remain unsupported capabilities", async ({
  browser
}) => {
  for (const failure of ["adapter", "device"]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.addInitScript((kind) => {
        const gpu = {
          requestAdapter: () =>
            kind === "adapter"
              ? Promise.reject(new Error("injected adapter denial"))
              : Promise.resolve({
                  requestDevice: () => Promise.reject(new Error("injected device denial"))
                })
        };
        Object.defineProperty(Object.getPrototypeOf(navigator), "gpu", {
          configurable: true,
          get: () => gpu
        });
      }, failure);
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
      const renderer = await page.evaluate(() => window.firstLight.diagnostics.renderer);
      expect(renderer.status).toBe("unsupported");
      expect(renderer.reason).toContain(`WebGPU ${failure} request failed`);
    } finally {
      await context.close();
    }
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await page.addInitScript(() => {
      Object.defineProperty(globalThis, "indexedDB", {
        configurable: true,
        value: {
          open() {
            throw new Error("injected IndexedDB denial");
          }
        }
      });
    });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-ready", "error");
    await expect(page.locator("#status")).toContainText(
      "First Light startup failed: injected IndexedDB denial"
    );
    expect(pageErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("an invalid manifest root reports validation instead of a loader TypeError", async ({
  page
}) => {
  await page.route("**/first-light/project.lumen.json", (route) =>
    route.fulfill({ contentType: "application/json", body: "null" })
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "error");
  await expect(page.locator("#errors")).toBeVisible();
  await expect(page.locator("#errors")).toContainText("must be object");
});

test("unsafe manifest paths fail before source discovery", async ({ page }) => {
  let escapedRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("escape.lumen.json")) escapedRequests += 1;
  });
  await page.route("**/first-light/project.lumen.json", async (route) => {
    const response = await route.fetch();
    const manifest = await response.json();
    manifest.sources.campaign = "..\\escape.lumen.json";
    await route.fulfill({ response, json: manifest });
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "error");
  await expect(page.locator("#errors")).toContainText("/sources/campaign");
  expect(escapedRequests).toBe(0);
});

test("malformed JSON and HTTP source failures become source-linked diagnostics", async ({
  page
}) => {
  const manifestPattern = "**/first-light/project.lumen.json";
  await page.route(manifestPattern, (route) =>
    route.fulfill({ contentType: "application/json", body: "{" })
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "error");
  await expect(page.locator("#errors")).toContainText("Could not parse");
  await expect(page.locator("#errors")).toContainText("project.lumen.json");

  await page.unroute(manifestPattern);
  await page.route("**/first-light/campaign.lumen.json", (route) =>
    route.fulfill({ status: 503, body: "unavailable" })
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "error");
  await expect(page.locator("#errors")).toContainText("campaign.lumen.json");
  await expect(page.locator("#errors")).toContainText("HTTP 503");
});

test("storage capability query failures remain non-fatal diagnostics", async ({ page }) => {
  await page.addInitScript(() => {
    const rejectedStorage = {
      persisted: () => Promise.reject(new Error("denied")),
      estimate: () => Promise.reject(new Error("denied"))
    };
    Object.defineProperty(Object.getPrototypeOf(navigator), "storage", {
      configurable: true,
      get: () => rejectedStorage
    });
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  expect(await page.evaluate(() => window.firstLight.diagnostics.storage.capabilities)).toEqual({
    persisted: null,
    quota: null,
    usage: null
  });
});

test("switches optional visual grading without changing simulation state", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const before = await page.evaluate(() => window.firstLight.state);
  const mode = page.locator("#visual-mode");
  await mode.focus();
  await page.keyboard.press("Space");
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
  const beforeModifiedKey = await page.evaluate(() => window.firstLight.campaignState);
  const summary = page.locator("summary");
  await summary.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("details")).not.toHaveAttribute("open", "");
  expect(await page.evaluate(() => window.firstLight.campaignState)).toEqual(beforeModifiedKey);
  await page.evaluate(() => {
    const editable = document.createElement("div");
    editable.id = "editable-test";
    editable.setAttribute("contenteditable", "plaintext-only");
    document.body.append(editable);
    editable.focus();
  });
  await page.keyboard.press("ArrowUp");
  expect(await page.evaluate(() => window.firstLight.campaignState)).toEqual(beforeModifiedKey);
  await page.evaluate(() => {
    document.getElementById("editable-test")?.remove();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
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
  expect(await page.evaluate(() => window.firstLight.campaignState)).toEqual(beforeModifiedKey);
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
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  let attempts = 0;
  await page.route("**/first-light/continuity-replay.json", (route) => {
    attempts += 1;
    if (attempts === 1) return route.fulfill({ status: 503, body: "unavailable" });
    if (attempts === 2)
      return route.fulfill({ status: 200, contentType: "application/json", body: "{" });
    return route.continue();
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const before = await page.evaluate(() => window.firstLight.campaignState);
  await page.locator("#replay").click();
  await expect(page.locator("#save-status")).toContainText(
    "Continuity replay failed · HTTP 503 · no state was changed"
  );
  expect(await page.evaluate(() => window.firstLight.campaignState)).toEqual(before);
  await page.locator("#replay").click();
  await expect(page.locator("#save-status")).toContainText("Continuity replay failed");
  await expect(page.locator("#save-status")).toContainText("no state was changed");
  expect(await page.evaluate(() => window.firstLight.campaignState)).toEqual(before);
  await page.locator("#replay").click();
  await expect(page.locator("#save-status")).toContainText("Continuity replay complete");
  const result = await page.evaluate(() => window.firstLight.diagnostics.simulation);
  expect(result.stateHash).not.toContain("pending");
  expect(result.state.flags["beacon-lit"]).toBe(true);
  expect(result.state.transitions).toBe(1);
  expect(result.campaign.outcome).toBe("victory");
  expect(result.campaign.party).toEqual(["embercub", "glintail"]);
  expect(result.campaign.activeMapId).toBe("lantern-vale");
  expect(Object.keys(result.campaign.mapStates)).toEqual(["lantern-vale", "lantern-house"]);
  expect(pageErrors).toEqual([]);
});

test("save and load restore the complete multimap campaign", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await page.locator("#replay").click();
  await expect(page.locator("#save-status")).toContainText("Continuity replay complete");
  await page.evaluate(() => {
    for (const action of ["move-north", "move-north", "move-east", "move-north"]) {
      window.firstLight.dispatch(action);
    }
  });
  const saved = await page.evaluate(async () => {
    await window.firstLight.saveJourney();
    return window.firstLight.campaignState;
  });
  expect(saved.activeMapId).toBe("lantern-house");
  await page.evaluate(() => window.firstLight.dispatch("move-north"));
  await page.evaluate(() => window.firstLight.loadJourney());
  expect(await page.evaluate(() => window.firstLight.campaignState)).toEqual(saved);
  await expect(page.locator("#save-status")).toContainText("Journey loaded");
});

test("storage control failures reach diagnostics without changing state", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await page.evaluate(async () => {
    const originalClose = IDBDatabase.prototype.close;
    document.documentElement.dataset.idbCloseCountForTest = "0";
    IDBDatabase.prototype.close = function closeForTest() {
      document.documentElement.dataset.idbCloseCountForTest = String(
        Number(document.documentElement.dataset.idbCloseCountForTest) + 1
      );
      return originalClose.call(this);
    };
    dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    await window.firstLight.saveJourney();
    await window.firstLight.settled();
  });
  const before = await page.evaluate(() => window.firstLight.campaignState);
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error("Injected export failure");
    };
    document.querySelector("#export")?.dispatchEvent(new MouseEvent("click"));
  });
  await expect(page.locator("#save-status")).toContainText("Export failed · no state was changed");
  await expect
    .poll(() => page.evaluate(() => window.firstLight.diagnostics.storage.lastResult))
    .toMatchObject({
      operation: "export",
      ok: false,
      message: "Injected export failure"
    });
  expect(await page.evaluate(() => window.firstLight.campaignState)).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.dataset.idbCloseCountForTest)).toBe(
    "0"
  );
  expect(
    await page.evaluate(() => {
      dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
      dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false }));
      return document.documentElement.dataset.idbCloseCountForTest;
    })
  ).toBe("1");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("first-light-journey.lumen-save.json");
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Expected a completed export download");
  const envelope = JSON.parse(await readFile(downloadPath, "utf8"));
  expect(envelope).toMatchObject({
    format: "lumen-save-v2",
    projectId: "first-light",
    projectVersion: "0.3.0",
    saveId: "journey"
  });
  await expect(page.locator("#save-status")).toContainText("Export ready");
});

test("generation commit is atomic and retains the newest three", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const result = await page.evaluate(async (name) => {
    // @ts-expect-error Vite resolves this browser-only absolute module path.
    const { createGenerationStore } = await import("/src/persistence/generation-store.js");
    // @ts-expect-error Vite resolves this browser-only absolute module path.
    const { createSaveEnvelope, hashSnapshot } = await import("/src/persistence/save-envelope.js");
    const store = await createGenerationStore(name, window.firstLight.project);
    const make = async (tick) => {
      const state = window.firstLight.campaignState;
      state.mapStates[state.activeMapId].tick = tick;
      return createSaveEnvelope(window.firstLight.project, state, {
        saveId: "atomic",
        createdAt: "2026-07-11T00:00:00.000Z"
      });
    };
    await store.save("atomic", await make(1));
    const invalid = await make(2);
    invalid.snapshot.activeMapId = "missing-map";
    invalid.snapshotHash = await hashSnapshot(invalid.snapshot);
    let invalidRejected = false;
    try {
      await store.save("atomic", invalid);
    } catch {
      invalidRejected = true;
    }
    const afterInvalid = await store.inspect("atomic");
    try {
      await store.save("atomic", await make(2), { failBeforePointerForTest: true });
    } catch {}
    const afterFailure = await store.inspect("atomic");
    for (let tick = 2; tick <= 5; tick += 1) await store.save("atomic", await make(tick));
    const retained = await store.inspect("atomic");
    const concurrentEnvelopes = [];
    for (let tick = 10; tick <= 14; tick += 1) concurrentEnvelopes.push(await make(tick));
    await Promise.all(concurrentEnvelopes.map((envelope) => store.save("concurrent", envelope)));
    const concurrent = await store.inspect("concurrent");
    const concurrentLoad = await store.load("concurrent");
    const cleanupResult = await store.save("cleanup", await make(20), {
      failCleanupForTest: true
    });
    const cleanupLoad = await store.load("cleanup");
    await store.save("corrupt-cleanup", await make(30));
    const corruptCleanupResult = await store.save("corrupt-cleanup", await make(31), {
      corruptPointerBeforeCleanupForTest: true
    });
    const corruptCleanupInventory = await store.inspect("corrupt-cleanup");
    await store.destroy();
    return {
      invalidRejected,
      afterInvalid,
      afterFailure,
      retained,
      concurrent,
      concurrentLoad,
      cleanupResult,
      cleanupLoad,
      corruptCleanupResult,
      corruptCleanupInventory
    };
  }, `lumen-phase2b-${testInfo.project.name}-atomic`);
  expect(result.invalidRejected).toBe(true);
  expect(result.afterInvalid.pointer.generation).toBe(1);
  expect(result.afterInvalid.generations).toHaveLength(1);
  expect(result.afterFailure.pointer.generation).toBe(1);
  expect(result.afterFailure.generations).toHaveLength(1);
  expect(result.retained.pointer.generation).toBe(5);
  expect(result.retained.generations.map((item) => item.generation)).toEqual([3, 4, 5]);
  expect(result.concurrent.pointer.generation).toBe(5);
  expect(result.concurrent.generations.map((item) => item.generation)).toEqual([3, 4, 5]);
  expect(result.concurrentLoad.generation).toBe(5);
  expect(result.concurrentLoad.envelope.snapshot.mapStates["lantern-vale"].tick).toBe(14);
  expect(result.cleanupResult.retentionCleanup).toBe("deferred");
  expect(result.cleanupResult.retentionCleanupError).toContain(
    "Injected retention cleanup failure"
  );
  expect(result.cleanupLoad.generation).toBe(1);
  expect(result.cleanupLoad.envelope.snapshot.mapStates["lantern-vale"].tick).toBe(20);
  expect(result.corruptCleanupResult.retentionCleanup).toBe("deferred");
  expect(result.corruptCleanupResult.retentionCleanupError).toContain(
    "Generation pointer metadata is corrupt during cleanup"
  );
  expect(result.corruptCleanupInventory.generations.map((item) => item.generation)).toEqual([1, 2]);
});

test("newest corruption recovers the preceding valid generation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await page.evaluate(async () => {
    await window.firstLight.saveJourney();
    window.firstLight.dispatch("move-north");
    await window.firstLight.saveJourney();
    await window.firstLight.corruptCurrentForTest();
    await window.firstLight.loadJourney();
  });
  const storage = await page.evaluate(() => window.firstLight.diagnostics.storage.lastResult);
  if (!storage?.failures) throw new Error("Expected recovery diagnostics");
  expect(storage.recovered).toBe(true);
  expect(storage.failures[0].reason).toBe("checksum");
  await expect(page.locator("#save-status")).toContainText("Recovered journey");
});

test("malformed generation metadata returns structured failures", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const result = await page.evaluate(async (prefix) => {
    // @ts-expect-error Vite resolves this browser-only absolute module path.
    const { createGenerationStore } = await import("/src/persistence/generation-store.js");
    // @ts-expect-error Vite resolves this browser-only absolute module path.
    const { createSaveEnvelope } = await import("/src/persistence/save-envelope.js");
    const envelope = await createSaveEnvelope(
      window.firstLight.project,
      window.firstLight.campaignState,
      { saveId: "metadata", createdAt: "2026-07-12T00:00:00.000Z" }
    );
    const values = /** @type {Record<string, unknown>} */ ({});
    for (const kind of ["pointer", "pointer-order", "record", "record-generation"]) {
      const store = await createGenerationStore(`${prefix}-${kind}`, window.firstLight.project);
      await store.save("metadata", envelope);
      if (kind === "pointer-order") {
        await store.save("metadata", envelope);
        await store.save("metadata", envelope);
      }
      await store.corruptCurrentForTest("metadata", kind);
      const load = await store.load("metadata");
      if (kind.startsWith("pointer")) {
        const beforeSave = await store.inspect("metadata");
        let saveRejected = false;
        try {
          await store.save("metadata", envelope);
        } catch {
          saveRejected = true;
        }
        values[kind] = {
          load,
          saveRejected,
          unchanged: JSON.stringify(await store.inspect("metadata")) === JSON.stringify(beforeSave)
        };
      } else values[kind] = load;
      await store.destroy();
    }
    return values;
  }, `lumen-phase2b-${testInfo.project.name}-metadata`);
  expect(result.pointer).toEqual({
    load: {
      envelope: null,
      generation: null,
      recovered: false,
      failures: [{ snapshotId: null, reason: "pointer" }]
    },
    saveRejected: true,
    unchanged: true
  });
  expect(result.record).toEqual({
    envelope: null,
    generation: null,
    recovered: false,
    failures: [{ snapshotId: "metadata:1", reason: "record" }]
  });
  expect(result["record-generation"]).toEqual({
    envelope: null,
    generation: null,
    recovered: false,
    failures: [{ snapshotId: "metadata:1", reason: "record" }]
  });
  expect(result["pointer-order"]).toEqual({
    load: {
      envelope: null,
      generation: null,
      recovered: false,
      failures: [{ snapshotId: null, reason: "pointer" }]
    },
    saveRejected: true,
    unchanged: true
  });
});

test("invalid import is inert and valid import creates a recoverable backup", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const result = await page.evaluate(async () => {
    await window.firstLight.saveJourney();
    const beforeState = window.firstLight.campaignState;
    const beforeStore = await window.firstLight.inspectStore();
    const exported = await window.firstLight.exportJourney({ download: false });
    const invalid = structuredClone(exported.envelope);
    invalid.snapshot.activeMapId = "missing-map";
    let rejected = false;
    try {
      await window.firstLight.prepareImport(invalid);
    } catch {
      rejected = true;
    }
    const afterInvalidState = window.firstLight.campaignState;
    const afterInvalidStore = await window.firstLight.inspectStore();
    window.firstLight.dispatch("move-north");
    await window.firstLight.saveJourney();
    await window.firstLight.prepareImport(exported.envelope);
    await window.firstLight.confirmImport();
    const afterValid = await window.firstLight.inspectStore();
    await window.firstLight.corruptCurrentForTest();
    const recovery = await window.firstLight.loadJourney();
    return {
      rejected,
      beforeState,
      beforeStore,
      afterInvalidState,
      afterInvalidStore,
      afterValid,
      recovery
    };
  });
  expect(result.rejected).toBe(true);
  expect(result.afterInvalidState).toEqual(result.beforeState);
  expect(result.afterInvalidStore).toEqual(result.beforeStore);
  if (!result.afterValid.pointer || !result.beforeStore.pointer || !result.recovery) {
    throw new Error("Expected committed generations and recovery result");
  }
  expect(result.afterValid.pointer.generation).toBe(result.beforeStore.pointer.generation + 2);
  expect(result.recovery.recovered).toBe(true);
});

test("v1 import presents migration preview before replacement", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await page.evaluate(async (fixture) => {
    await window.firstLight.prepareImport(fixture);
  }, v1Fixture);
  await expect(page.locator("#import-dialog")).toBeVisible();
  await expect(page.locator("#import-preview")).toContainText("lumen-save-v1 → lumen-save-v2");
  await expect(page.locator("#import-preview")).toContainText("Migration: required");
  const beforeModalInput = await page.evaluate(() => window.firstLight.campaignState);
  await page.keyboard.press("ArrowUp");
  await page.evaluate(() => window.firstLight.settled());
  expect(await page.evaluate(() => window.firstLight.campaignState)).toEqual(beforeModalInput);
  await page.keyboard.press("Escape");
  await expect(page.locator("#import-dialog")).toBeHidden();
  expect(
    await page.evaluate(() =>
      window.firstLight.confirmImport().then(
        () => null,
        (error) => (error instanceof Error ? error.message : String(error))
      )
    )
  ).toBe("No validated import is pending");
  await page.evaluate(async (fixture) => {
    await window.firstLight.prepareImport(fixture);
  }, v1Fixture);
  const confirmation = await page.evaluate(async () => {
    const first = window.firstLight.confirmImport();
    const confirm = document.querySelector("#confirm-import");
    const cancel = document.querySelector("#cancel-import");
    const dialog = document.querySelector("#import-dialog");
    if (!(confirm instanceof HTMLButtonElement)) throw new Error("Missing confirm button");
    if (!(cancel instanceof HTMLButtonElement)) throw new Error("Missing cancel button");
    if (!(dialog instanceof HTMLDialogElement)) throw new Error("Missing import dialog");
    const controlsDisabled = confirm.disabled && cancel.disabled;
    const cancelAccepted = dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    const remainedOpen = dialog.open;
    const results = await Promise.allSettled([first, window.firstLight.confirmImport()]);
    return {
      controlsDisabled,
      cancelAccepted,
      remainedOpen,
      results: results.map((result) =>
        result.status === "fulfilled"
          ? { status: result.status }
          : {
              status: result.status,
              message:
                result.reason instanceof Error ? result.reason.message : String(result.reason)
            }
      )
    };
  });
  expect(confirmation.controlsDisabled).toBe(true);
  expect(confirmation.cancelAccepted).toBe(false);
  expect(confirmation.remainedOpen).toBe(true);
  expect(confirmation.results).toEqual([
    { status: "fulfilled" },
    { status: "rejected", message: "No validated import is pending" }
  ]);
  await expect(page.locator("#save-status")).toContainText("Imported journey");
  expect((await page.evaluate(() => window.firstLight.campaignState)).party).toEqual([
    "embercub",
    "glintail"
  ]);
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

test("touch-capable First Light uses the keyboard simulation boundary", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect(page.getByRole("group", { name: "World movement controls" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
    const west = page.getByRole("button", { name: "Move west" });
    const box = await west.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await west.tap();
    await page.evaluate(() => window.firstLight.settled());
    await expect(page.locator("#diagnostics")).toContainText('"type": "world"');
    await expect(page.locator("#diagnostics")).toContainText('"action": "move-west"');
  } finally {
    await context.close();
  }
});
