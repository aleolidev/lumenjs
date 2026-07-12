import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const documentation = new URL("../../docs/", import.meta.url);

test("every numbered roadmap criterion has an explicit completion-audit row", async () => {
  const names = await readdir(documentation);
  const pairs = [["product-specification.md", "first-light-completion-audit.md"]];
  for (const specification of names.filter((name) => /^phase-.*-specification[.]md$/.test(name))) {
    const audit = specification.replace("-specification.md", "-completion-audit.md");
    if (names.includes(audit)) pairs.push([specification, audit]);
  }

  let mapped = 0;
  for (const [specification, audit] of pairs.sort(comparePair)) {
    const specificationText = await readFile(new URL(specification, documentation), "utf8");
    const auditText = await readFile(new URL(audit, documentation), "utf8");
    const criteria = [...specificationText.matchAll(/^([0-9]+)[.] /gm)].map((match) =>
      Number(match[1])
    );
    assert.ok(criteria.length > 0, `${specification} has no numbered criteria`);
    const last = Math.max(...criteria);
    const rows = new Map();
    for (const match of auditText.matchAll(/^\| ([0-9]+)(?:[a-z])? \|.*\| ([^|]+) \|$/gm)) {
      const criterion = Number(match[1]);
      const results = rows.get(criterion) ?? [];
      results.push(match[2]);
      rows.set(criterion, results);
    }
    for (let criterion = 1; criterion <= last; criterion += 1) {
      assert.ok(rows.has(criterion), `${audit} does not map criterion ${criterion}`);
      assert.ok(
        rows.get(criterion).every((result) => result.startsWith("Proven")),
        `${audit} does not prove criterion ${criterion}`
      );
      mapped += 1;
    }
  }

  assert.equal(pairs.length, 24);
  assert.equal(mapped, 310);
});

function comparePair(left, right) {
  return left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0;
}
