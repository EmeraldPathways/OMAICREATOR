import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseFrameHeightMessage } from "../hooks/useEmbeddedFrameHeight.ts";

test("accepts only bounded frame heights for the requested workspace", () => {
  assert.equal(parseFrameHeightMessage({ type: "studio:frame-height", workspace: "rankscope", height: 480 }, "rankscope"), 480);
  assert.equal(parseFrameHeightMessage({ type: "studio:frame-height", workspace: "review-desk", height: 1234.2 }, "review-desk"), 1235);
  assert.equal(parseFrameHeightMessage({ type: "studio:frame-height", workspace: "review-desk", height: 1234 }, "rankscope"), null);
  assert.equal(parseFrameHeightMessage({ type: "other", workspace: "rankscope", height: 800 }, "rankscope"), null);
  assert.equal(parseFrameHeightMessage({ type: "studio:frame-height", workspace: "rankscope", height: "800" }, "rankscope"), null);
  assert.equal(parseFrameHeightMessage({ type: "studio:frame-height", workspace: "rankscope", height: Number.NaN }, "rankscope"), null);
  assert.equal(parseFrameHeightMessage({ type: "studio:frame-height", workspace: "rankscope", height: -1 }, "rankscope"), null);
  assert.equal(parseFrameHeightMessage({ type: "studio:frame-height", workspace: "rankscope", height: 20001 }, "rankscope"), null);
});

test("embedded documents report layout-only height after render and resize", async () => {
  const rankScope = await readFile(fileURLToPath(new URL("../app/rankscope/page.tsx", import.meta.url)), "utf8");
  const ui = await readFile(fileURLToPath(new URL("../lib/reviewDesk/ui.js", import.meta.url)), "utf8");

  assert.match(rankScope, /new ResizeObserver/);
  assert.match(rankScope, /type:\s*["']studio:frame-height["']/);
  assert.match(rankScope, /workspace:\s*["']rankscope["']/);
  assert.match(ui, /new ResizeObserver/);
  assert.match(ui, /type:\s*["']studio:frame-height["']/);
  assert.match(ui, /workspace:\s*["']review-desk["']/);
  assert.match(ui, /addEventListener\(['"]resize['"]/);
});

test("embedded workspaces measure natural content instead of the iframe viewport", async () => {
  const rankScope = await readFile(fileURLToPath(new URL("../app/rankscope/page.tsx", import.meta.url)), "utf8");
  const rankCss = await readFile(fileURLToPath(new URL("../app/rankscope/rankscope.css", import.meta.url)), "utf8");
  const ui = await readFile(fileURLToPath(new URL("../lib/reviewDesk/ui.js", import.meta.url)), "utf8");

  assert.match(rankScope, /querySelector(?:<HTMLElement>)?\(['"]\.topbar['"]\)/);
  assert.match(rankScope, /querySelector(?:<HTMLElement>)?\(['"]\.content['"]\)/);
  assert.doesNotMatch(rankScope, /document\.documentElement\.scrollHeight/);
  assert.match(rankCss, /\.rankscope-root\.embedded\s+\.workspace\s*\{[^}]*min-height:\s*0/s);
  assert.match(ui, /querySelector\(['"]\.top['"]\)/);
  assert.match(ui, /querySelector\(['"]\.shell['"]\)/);
  assert.doesNotMatch(ui, /document\.documentElement\.scrollHeight/);
});
