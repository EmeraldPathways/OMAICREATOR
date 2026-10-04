import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("Content Studio renders History with the selected brand and composer callback", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /import History from ["']@\/components\/History["']/);
  assert.match(source, /view === ["']history["']/);
  assert.match(source, /<History[\s\S]*brandId=\{brandId\}/);
  assert.match(source, /brandName=\{profile\.name\}/);
  assert.match(source, /onCreate=\{(?:\(channel\)\s*=>|openHistoryComposer)\}/);
  assert.match(source, /selectedChannels\.find/);
});

test("existing connected workspace routes remain mounted alongside History", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /view === ["']images["'][\s\S]*ImageStudio/);
  assert.match(source, /view === ["']review-desk["'][\s\S]*ReviewDeskFrame/);
  assert.match(source, /view === ["']rankscope["'][\s\S]*RankScopeWorkspace/);
});
