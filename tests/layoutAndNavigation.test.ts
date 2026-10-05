import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("shared shell uses Review Desk visual tokens and typography", async () => {
  const css = await read("../app/globals.css");

  assert.match(css, /Inter/);
  assert.match(css, /system-ui/);
  assert.match(css, /--navy:\s*#122c3d/i);
  assert.match(css, /--teal:\s*#087d98/i);
  assert.match(css, /--canvas:\s*#eff3f7/i);
  assert.match(css, /--line:\s*#d8e1ea/i);
});

test("History belongs to Manage and Image Studio belongs to Connected workspaces", async () => {
  const source = await read("../components/Sidebar.tsx");
  const manageStart = source.indexOf('<div className="nav-label">Manage</div>');
  const referenceStart = source.indexOf('<div className="nav-label">Reference</div>');
  const connectedStart = source.indexOf('<nav className="sidebar-workspaces"');
  assert.ok(manageStart >= 0);
  assert.ok(referenceStart > manageStart);
  assert.ok(connectedStart > referenceStart);

  const manage = source.slice(manageStart, referenceStart);
  const reference = source.slice(referenceStart, connectedStart);
  const connected = source.slice(connectedStart);

  assert.match(manage, /History/);
  assert.doesNotMatch(reference, /Image studio/);
  assert.ok(connected.indexOf("Image studio") < connected.indexOf("Review Desk"));
  assert.ok(connected.indexOf("Review Desk") < connected.indexOf("RankScope"));
});

test("settings owns Voice bank and Advisor interview is no longer a studio destination", async () => {
  const sidebar = await read("../components/Sidebar.tsx");
  const page = await read("../app/page.tsx");
  const referenceStart = sidebar.indexOf('<div className="nav-label">Reference</div>');
  const settingsStart = sidebar.indexOf('<div className="nav-label">Settings</div>');
  const connectedStart = sidebar.indexOf('<nav className="sidebar-workspaces"');

  assert.ok(referenceStart >= 0);
  assert.ok(settingsStart > referenceStart);
  assert.ok(connectedStart > settingsStart);

  const reference = sidebar.slice(referenceStart, settingsStart);
  const settings = sidebar.slice(settingsStart, connectedStart);
  assert.doesNotMatch(sidebar, /Advisor interview|ICONS\.interview|view === "interview"/);
  assert.doesNotMatch(sidebar, /<div className="nav-label">Craft<\/div>/);
  assert.doesNotMatch(reference, /Voice bank/);
  assert.match(settings, /Voice bank/);
  assert.ok(settings.indexOf("Brand settings") < settings.indexOf("Voice bank"));
  assert.ok(settings.indexOf("Voice bank") < settings.indexOf("Setup"));
  assert.match(page, /view === "voice" && <VoiceBank/);
  assert.doesNotMatch(page, /view === "interview"/);
});

test("the main view registry names History", async () => {
  const source = await read("../app/page.tsx");
  assert.match(source, /history:\s*["']History["']/);
});

test("view and workspace changes return the shell to the top", async () => {
  const source = await read("../app/page.tsx");
  assert.match(source, /window\.scrollTo\(\{\s*top:\s*0/);
  assert.match(source, /\[view,\s*brandId\]/);
});

test("mobile shell exposes accessible drawer and touch-safe controls", async () => {
  const source = await read("../app/page.tsx");
  const css = await read("../app/globals.css");

  assert.match(source, /aria-controls="studio-sidebar"/);
  assert.match(css, /\.btn\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /input,\s*textarea,\s*select\s*\{[^}]*font-size:\s*16px/s);
  assert.match(css, /\.workspace\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.column\.ledger-col\s*\{[^}]*position:\s*static/s);
  assert.match(css, /\.brand-switcher select\s*\{[^}]*min-width:\s*0[^}]*text-overflow:\s*ellipsis/s);
});

test("responsive layouts prevent cramped desktop columns", async () => {
  const css = await read("../app/globals.css");

  assert.match(css, /@media\s*\(max-width:\s*1100px\)/);
  assert.match(css, /\.sidebar\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /\.topbar-actions\s*\{[^}]*flex-wrap:\s*wrap/s);
});

test("mobile content and image controls reflow without clipping", async () => {
  const css = await read("../app/globals.css");
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.grid-2\s*\{\s*grid-template-columns:\s*1fr/s);
  assert.match(css, /\.column\.ledger-col\s*\{[^}]*position:\s*static/s);
  assert.match(css, /\.image-studio[^{}]*\.btn[^{}]*\{[^}]*width:\s*100%/s);
  assert.match(css, /\.field\s*\{[^}]*min-width:\s*0/s);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});

test("desktop shell and connected workspaces retain a compact wide-screen layout", async () => {
  const css = await read("../app/globals.css");
  assert.match(css, /\.workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+360px/s);
  assert.match(css, /\.column\.ledger-col\s*\{[^}]*position:\s*sticky/s);
  assert.match(css, /@media\s*\(max-width:\s*1100px\)[\s\S]*?\.workspace\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.rankscope-tabs\s*\{[^}]*overflow:\s*visible/);
  assert.match(css, /\.rankscope-frame-wrap iframe\.measured/);
});

test("mobile drawer closes when resizing into desktop navigation", async () => {
  const source = await read("../app/page.tsx");

  assert.match(source, /matchMedia\(["']\(min-width:\s*761px\)["']\)/);
  assert.match(source, /addEventListener\(["']change["'],\s*closeDrawerOnDesktop/);
  assert.match(source, /function closeDrawerOnDesktop\(\)[\s\S]*?setMobileNavOpen\(false\)/);
  assert.match(source, /hadMobileNavOpen\.current\s*&&\s*window\.matchMedia\(["\']\(max-width:\s*760px\)["\']\)\.matches/);
});

test("mobile brand selector retains touch-sized text", async () => {
  const css = await read("../app/globals.css");

  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.brand-switcher select\s*\{[^}]*font-size:\s*16px/s);
});
