import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("History exposes the five requested channel tabs and accessible selection", async () => {
  const source = await readFile(new URL("../components/History.tsx", import.meta.url), "utf8");

  for (const [id, label] of [
    ["email", "Email"],
    ["linkedin", "LinkedIn"],
    ["instagram", "Instagram"],
    ["website", "Web Article"],
    ["print", "Print Article"],
  ]) {
    assert.match(source, new RegExp(`['\"]${id}['\"]`));
    assert.match(source, new RegExp(`label:\\s*["']${label}["']`));
  }
  assert.match(source, /role=["']tablist["']/);
  assert.match(source, /aria-selected=/);
  assert.match(source, /role=["']tab["']/);
});

test("History supports full text inspection, copying, and recovery states", async () => {
  const source = await readFile(new URL("../components/History.tsx", import.meta.url), "utf8");

  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /<details/);
  assert.match(source, /No saved/);
  assert.match(source, /Could not load|Unable to load|error/i);
  assert.match(source, /onCreate\(/);
});

test("History layout uses shared spacing and prevents mobile tab overflow", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /\.history-tabs[^{}]*\{/);
  assert.match(css, /\.history-tabs\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(css, /\.history-card[^{}]*\{/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.history-tabs/);
  assert.match(css, /\.history-card[^{}]*\{[^}]*min-width:\s*0/s);
  assert.match(css, /\.history-excerpt[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.history-actions \.btn\s*\{\s*width:\s*100%/);
});
