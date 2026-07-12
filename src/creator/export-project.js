import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { validateCreatorProject } from "./validate-project.js";
import { verifyCreatorExport } from "./verify-export.js";
import { withCreatorReadLock } from "./write-lock.js";

const markerName = "lumen-export-manifest.json";
const exportFormat = "lumen-static-export-v1-experimental";

export async function exportCreatorProject(directory, outputDirectory, options = {}) {
  const source = path.resolve(directory);
  const output = path.resolve(outputDirectory);
  const canonicalSource = await prospectiveRealPath(source);
  const canonicalOutput = await prospectiveRealPath(output);
  if (
    output === source ||
    output.startsWith(`${source}${path.sep}`) ||
    canonicalOutput === canonicalSource ||
    canonicalOutput.startsWith(`${canonicalSource}${path.sep}`)
  ) {
    throw new CreatorExportError(
      "CREATOR_EXPORT_PATH_UNSAFE",
      "Export destination must be outside the source project."
    );
  }
  return withCreatorReadLock(source, () =>
    exportCreatorProjectUnlocked(source, output, canonicalOutput, options)
  );
}

async function prospectiveRealPath(target) {
  const missing = [];
  let candidate = target;
  while (true) {
    try {
      return path.join(await realpath(candidate), ...missing.reverse());
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT"))
        throw error;
      const parent = path.dirname(candidate);
      if (parent === candidate) throw error;
      missing.push(path.basename(candidate));
      candidate = parent;
    }
  }
}

async function exportCreatorProjectUnlocked(source, output, canonicalOutput, options) {
  const validation = await validateCreatorProject(source);
  if (!validation.valid || !validation.project) {
    throw new CreatorExportError(
      "CREATOR_EXPORT_INVALID_PROJECT",
      "Project validation failed.",
      validation.diagnostics
    );
  }
  const lock = `${canonicalOutput}.lumen-export-lock`;
  await mkdir(path.dirname(output), { recursive: true });
  try {
    await mkdir(lock);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
      throw new CreatorExportError(
        "CREATOR_EXPORT_DESTINATION_BUSY",
        `Destination '${output}' already has an export operation in progress.`
      );
    }
    throw error;
  }
  try {
    return await performCreatorExport(source, output, validation.project, options);
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}

async function performCreatorExport(source, output, project, options) {
  const destinationState = await inspectDestination(output);
  if (destinationState.state === "unowned") {
    throw new CreatorExportError(
      "CREATOR_EXPORT_DESTINATION_UNOWNED",
      `Destination '${output}' is non-empty and not owned by LumenJS.`
    );
  }
  if (
    destinationState.state === "owned" &&
    destinationState.projectId !== project.manifest.projectId
  ) {
    throw new CreatorExportError(
      "CREATOR_EXPORT_DESTINATION_PROJECT_MISMATCH",
      `Destination belongs to project '${destinationState.projectId}', not '${project.manifest.projectId}'.`
    );
  }

  const operationId = randomUUID();
  const staging = `${output}.lumen-export-${operationId}`;
  const backup = `${output}.lumen-backup-${operationId}`;
  let manifest;
  let backupCreated = false;
  let committed = false;
  try {
    await mkdir(staging, { recursive: true });
    const declared = [
      ...new Set(
        project.declared
          .filter(
            ([kind, relative]) => kind !== "optional-context" || Boolean(project.loaded[relative])
          )
          .map(([, relative]) => relative)
      )
    ].sort();
    for (const relative of declared) {
      const target = path.join(staging, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(path.join(source, relative), target);
    }
    const generated = await generatedRuntime(project.manifest);
    for (const [relative, content] of Object.entries(generated)) {
      await writeFile(path.join(staging, relative), content, "utf8");
    }
    const baseFiles = [...declared, ...Object.keys(generated)].sort();
    const hashes = Object.create(null);
    for (const relative of baseFiles)
      hashes[relative] = await fileHash(path.join(staging, relative));
    const worker = generatedServiceWorker(project.manifest, hashes);
    await writeFile(path.join(staging, "service-worker.js"), worker, "utf8");
    hashes["service-worker.js"] = await fileHash(path.join(staging, "service-worker.js"));
    manifest = {
      format: exportFormat,
      projectId: project.manifest.projectId,
      projectVersion: project.manifest.version,
      files: hashes
    };
    await writeFile(path.join(staging, markerName), json(manifest), "utf8");
    if (destinationState.state === "owned" || destinationState.state === "empty") {
      await rename(output, backup);
      backupCreated = true;
    }
    if (options.failBeforeCommitForTest) throw new Error("Injected pre-commit export failure");
    await rename(staging, output);
    committed = true;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    if (!committed && (await exists(backup))) {
      await rm(output, { recursive: true, force: true });
      await rename(backup, output);
    }
    throw error;
  }
  try {
    if (options.failBackupCleanupForTest) throw new Error("Injected export backup cleanup failure");
    if (backupCreated) await rm(backup, { recursive: true, force: true });
    return { output, manifest, backupCleanup: "complete", backupCleanupError: null };
  } catch (error) {
    return {
      output,
      manifest,
      backupCleanup: "deferred",
      backupCleanupError: error instanceof Error ? error.message : String(error)
    };
  }
}

export class CreatorExportError extends Error {
  constructor(code, message, diagnostics = []) {
    super(message);
    this.name = "CreatorExportError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

async function generatedRuntime(manifest) {
  const title = escapeHtml(manifest.title);
  return {
    "index.html": `<!doctype html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px system-ui;max-width:900px;margin:auto;padding:20px;background:#0b1720;color:#eef8ee}button{min-width:48px;min-height:44px;margin:3px}pre{overflow:auto;padding:16px;background:#071117;border-radius:8px}.controls{display:grid;grid-template-columns:repeat(3,54px);width:max-content}.up{grid-column:2}.left{grid-column:1}.down{grid-column:2}.right{grid-column:3}.interact{grid-column:1/4}#dialogue-panel,#battle-panel{border:1px solid #789;padding:12px;margin:12px 0}#dialogue-choices,#battle-actions{display:flex;flex-wrap:wrap;gap:6px}</style></head>\n<body><main><h1>${title}</h1><p id="playtest-status" role="status">Loading focused playtest…</p><pre id="map-view" aria-label="Focused map"></pre><p id="playtest-message" aria-live="polite"></p><section id="dialogue-panel" aria-label="Dialogue" hidden><strong id="dialogue-speaker"></strong><div id="dialogue-choices"></div></section><section id="battle-panel" aria-label="Battle" aria-live="polite" hidden><strong id="battle-status"></strong><p id="battle-health"></p><div id="battle-actions"></div><button id="battle-finish" type="button" hidden>Continue</button></section><div class="controls" role="group" aria-label="Playtest controls"><button class="up" type="button" data-action="move-north" aria-label="Move north">↑</button><button class="left" type="button" data-action="move-west" aria-label="Move west">←</button><button class="down" type="button" data-action="move-south" aria-label="Move south">↓</button><button class="right" type="button" data-action="move-east" aria-label="Move east">→</button><button class="interact" type="button" data-action="interact">Interact</button></div><details><summary>Runtime inspector</summary><pre id="playtest-diagnostics"></pre></details></main><script type="module" src="./offline.js"></script><script type="module" src="./playtest-browser.js"></script></body>\n</html>\n`,
    "offline.js": `function waitForActiveWorker(registration) {\n  if (registration.active) return Promise.resolve();\n  const worker = registration.installing || registration.waiting;\n  if (!worker) return Promise.reject(new Error("No service worker is installing."));\n  return new Promise((resolve, reject) => {\n    const inspect = () => {\n      if (worker.state === "activated") settle(resolve);\n      else if (worker.state === "redundant") settle(() => reject(new Error("Service worker installation failed.")));\n    };\n    const settle = (finish) => {\n      worker.removeEventListener("statechange", inspect);\n      finish();\n    };\n    worker.addEventListener("statechange", inspect);\n    inspect();\n  });\n}\n\nif ("serviceWorker" in navigator && ["http:", "https:"].includes(location.protocol)) {\n  navigator.serviceWorker.register("./service-worker.js")\n    .then(waitForActiveWorker)\n    .then(() => navigator.serviceWorker.ready)\n    .then(() => new Promise((resolve) => {\n      if (navigator.serviceWorker.controller) resolve();\n      else navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });\n    }))\n    .then(() => { document.documentElement.dataset.offlineReady = "true"; })\n    .catch((error) => {\n      document.documentElement.dataset.offlineReady = "error";\n      console.warn("Offline cache unavailable:", error);\n    });\n}\n`,
    "lumen-core.js": (
      await readFile(new URL("../../dist-package/index.js", import.meta.url), "utf8")
    ).replace(/\n\/\/# sourceMappingURL=.*\n?$/, "\n"),
    "playtest-browser.js": (
      await readFile(new URL("./playtest-browser.js", import.meta.url), "utf8")
    ).replace('"../modules/resolve-context.js"', '"./resolve-context.js"'),
    "resolve-context.js": await readFile(
      new URL("../modules/resolve-context.js", import.meta.url),
      "utf8"
    )
  };
}

function generatedServiceWorker(manifest, hashes) {
  const revisionPlaceholder = "__LUMEN_CACHE_REVISION__";
  const projectPrefix = `lumen-export-${manifest.projectId}-`;
  const files = [
    "./lumen-export-manifest.json",
    "./service-worker.js",
    ...Object.keys(hashes).map((relative) => `./${relative}`)
  ].sort();
  const source = `const FORMAT = ${JSON.stringify(exportFormat)};\nconst PREFIX = ${JSON.stringify(projectPrefix)} + encodeURIComponent(self.registration.scope) + "-";\nconst CACHE = PREFIX + FORMAT + "-" + ${JSON.stringify(`${manifest.version}-${revisionPlaceholder}`)};\nconst FILES = ${JSON.stringify(files, null, 2)};\n\nself.addEventListener("install", (event) => {\n  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));\n});\n\nself.addEventListener("activate", (event) => {\n  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));\n});\n\nself.addEventListener("fetch", (event) => {\n  const url = new URL(event.request.url);\n  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;\n  const rootNavigation = event.request.mode === "navigate" && url.pathname === new URL(self.registration.scope).pathname;\n  event.respondWith(caches.open(CACHE).then(async (cache) => {\n    const cached = await cache.match(event.request, { ignoreSearch: event.request.mode === "navigate" });\n    if (cached) return cached;\n    if (rootNavigation) return cache.match(new URL("./index.html", self.registration.scope));\n    return fetch(event.request);\n  }));\n});\n`;
  const revision = createHash("sha256")
    .update(JSON.stringify(hashes))
    .update("\0")
    .update(source)
    .digest("hex")
    .slice(0, 16);
  return source.replace(revisionPlaceholder, revision);
}

async function inspectDestination(destination) {
  try {
    const info = await lstat(destination);
    if (info.isSymbolicLink() || !info.isDirectory()) return { state: "unowned" };
    const entries = await readdir(destination);
    if (entries.length === 0) return { state: "empty" };
    try {
      const verification = await verifyCreatorExport(destination);
      return { state: "owned", projectId: verification.projectId };
    } catch {
      return { state: "unowned" };
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT")
      return { state: "missing" };
    throw error;
  }
}

async function fileHash(file) {
  return `sha256-v1:${createHash("sha256")
    .update(await readFile(file))
    .digest("hex")}`;
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
