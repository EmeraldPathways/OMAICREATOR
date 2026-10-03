import { readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const directory = path.dirname(fileURLToPath(import.meta.url));
const files = (await readdir(directory)).filter((file) => file.endsWith(".test.ts")).sort();
for (const file of files) await import(pathToFileURL(path.join(directory, file)));
