import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const sourceHeaders = await readFile(path.join(root, "public", "_headers"), "utf8");
const builtHeaders = await readFile(path.join(output, "_headers"), "utf8");
if (builtHeaders !== sourceHeaders) {
  throw new Error("Cloudflare Pages headers changed during the production build.");
}

const index = await readFile(path.join(output, "index.html"), "utf8");
const referencedAssets = [...index.matchAll(/(?:src|href)="(?:\.\/|\/)?(assets\/[^"]+)"/g)].map(
  (match) => match[1]
);
if (referencedAssets.length < 2) {
  throw new Error("Production index does not reference its hashed script and stylesheet assets.");
}
for (const asset of referencedAssets) {
  const metadata = await lstat(path.join(output, asset));
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`Cloudflare build asset is not a regular file: ${asset}`);
  }
}

const inventory = await listFiles(output);
for (const forbidden of [/\.env(?:\.|$)/, /\.map$/, /(^|\/)wrangler\.(?:toml|jsonc)$/]) {
  if (inventory.some((entry) => forbidden.test(entry))) {
    throw new Error(`Cloudflare build contains a forbidden deployment file matching ${forbidden}.`);
  }
}

process.stdout.write(
  `Verified Cloudflare Pages build: ${inventory.length} regular files and ${referencedAssets.length} hashed entry assets.\n`
);

async function listFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Cloudflare build contains a symlink: ${relative}`);
    if (entry.isDirectory())
      files.push(...(await listFiles(path.join(directory, entry.name), relative)));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Cloudflare build contains a non-regular entry: ${relative}`);
  }
  return files.sort();
}
