import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

test("preserves legacy rows as Omega while adding brand-scoped storage", async () => {
  const db = new DatabaseSync(":memory:");
  const baseMigration = await readFile(new URL("../drizzle/0000_young_karnak.sql", import.meta.url), "utf8");
  const brandMigration = await readFile(new URL("../drizzle/0001_short_apocalypse.sql", import.meta.url), "utf8");
  const logoMigration = await readFile(new URL("../drizzle/0002_nosy_eternals.sql", import.meta.url), "utf8");
  for (const statement of baseMigration.split("--> statement-breakpoint")) if (statement.trim()) db.exec(statement);
  db.exec("CREATE TABLE brand_facts (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, fact_key TEXT NOT NULL UNIQUE, label TEXT NOT NULL, value TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'verified', note TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  db.exec("CREATE TABLE activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id INTEGER, actor TEXT, detail TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");

  db.exec("INSERT INTO pieces (channel, format, profession, topic, ai_draft, final_text, approved_by) VALUES ('linkedin','short','gp','legacy topic','draft','approved text','Andrew')");
  db.exec("INSERT INTO campaigns (name, profession) VALUES ('Legacy campaign','gp')");
  db.exec("INSERT INTO brand_facts (fact_key, label, value) VALUES ('phone','Phone','legacy fact')");
  db.exec("INSERT INTO activity_log (action, entity_type, detail) VALUES ('approved','piece','legacy activity')");

  for (const statement of brandMigration.split("--> statement-breakpoint")) if (statement.trim()) db.exec(statement);
  db.exec(logoMigration);

  assert.deepEqual({ ...db.prepare("SELECT brand_id, topic, final_text FROM pieces").get() }, {
    brand_id: "omega-financial", topic: "legacy topic", final_text: "approved text",
  });
  assert.equal(db.prepare("SELECT brand_id FROM campaigns").get().brand_id, "omega-financial");
  assert.deepEqual({ ...db.prepare("SELECT brand_id, fact_key, value FROM brand_facts").get() }, {
    brand_id: "omega-financial", fact_key: "phone", value: "legacy fact",
  });
  assert.equal(db.prepare("SELECT brand_id FROM activity_log").get().brand_id, "omega-financial");
  assert.equal(db.prepare("SELECT logo_object_key FROM brand_profiles").columns()[0].name, "logo_object_key");
  db.prepare("INSERT INTO brand_facts (brand_id, fact_key, label, value) VALUES (?, ?, ?, ?)").run("eco-car-wash", "phone", "Contact", "configured separately");
  assert.equal(db.prepare("SELECT count(*) AS n FROM brand_facts WHERE fact_key='phone'").get().n, 2);
  db.close();
});

test("also installs brand tables when the runtime bootstrap has not run yet", async () => {
  const db = new DatabaseSync(":memory:");
  const baseMigration = await readFile(new URL("../drizzle/0000_young_karnak.sql", import.meta.url), "utf8");
  const brandMigration = await readFile(new URL("../drizzle/0001_short_apocalypse.sql", import.meta.url), "utf8");
  const logoMigration = await readFile(new URL("../drizzle/0002_nosy_eternals.sql", import.meta.url), "utf8");
  for (const statement of baseMigration.split("--> statement-breakpoint")) if (statement.trim()) db.exec(statement);
  for (const statement of brandMigration.split("--> statement-breakpoint")) if (statement.trim()) db.exec(statement);
  db.exec(logoMigration);
  assert.equal(db.prepare("SELECT count(*) AS n FROM brand_facts").get().n, 0);
  assert.equal(db.prepare("SELECT brand_id FROM activity_log").columns().some((column) => column.name === "brand_id"), true);
  db.close();
});
